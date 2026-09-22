import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { UserRole } from '@prisma/client';
import { getAccessTokenFromRequest } from '../utils/authCookies';
import { attachTenantContext } from './tenantScope';

export interface AuthPayload {
  userId: string;
  role: UserRole;
  email: string;
  sessionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      processingRestricted?: boolean;
    }
  }
}

const USER_STATUS_CACHE_TTL_SECONDS = 30;
const LOGOUT_ALL_TTL_SECONDS = 7 * 24 * 60 * 60; // matches max refresh token lifetime

/** M1 + AUTH-24: pin alg and require iss/aud. */
const ACCESS_VERIFY_OPTS: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};
const REFRESH_VERIFY_OPTS: jwt.VerifyOptions = {
  algorithms: ['HS256'],
  issuer: env.JWT_ISSUER,
  audience: env.JWT_AUDIENCE,
};

function accessVerifySecrets(): string[] {
  const secrets = [env.JWT_ACCESS_SECRET];
  if (env.JWT_ACCESS_SECRET_PREVIOUS.trim()) secrets.push(env.JWT_ACCESS_SECRET_PREVIOUS.trim());
  return secrets;
}

function refreshVerifySecrets(): string[] {
  const secrets = [env.JWT_REFRESH_SECRET];
  if (env.JWT_REFRESH_SECRET_PREVIOUS.trim()) secrets.push(env.JWT_REFRESH_SECRET_PREVIOUS.trim());
  return secrets;
}

/** Verify with current secret, then previous (zero-downtime rotation window). */
function verifyJwtWithSecrets<T>(
  token: string,
  secrets: string[],
  opts: jwt.VerifyOptions,
): T {
  let lastError: unknown;
  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret, opts) as T;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

export async function recordLogoutAll(userId: string): Promise<void> {
  const now = new Date();
  // AUTH-07: DB is source of truth; Redis is a fast cache
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { tokensInvalidBefore: now },
    });
  } catch {
    // User may already be deleted — continue to Redis best-effort
  }
  try {
    await redis.set(
      `auth:logoutall:${userId}`,
      now.getTime().toString(),
      'EX',
      LOGOUT_ALL_TTL_SECONDS,
    );
  } catch {
    // Redis unavailable — DB watermark still enforces revocation
  }
}

export async function wasLoggedOutAll(userId: string, iatSeconds: number): Promise<boolean> {
  const iatMs = iatSeconds * 1000;

  try {
    const val = await redis.get(`auth:logoutall:${userId}`);
    if (val) return iatMs < parseInt(val, 10);
  } catch {
    // fall through to DB
  }

  // AUTH-07: fail to DB watermark (not open). If DB also fails, fail closed.
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tokensInvalidBefore: true },
    });
    if (user?.tokensInvalidBefore) {
      return iatMs < user.tokensInvalidBefore.getTime();
    }
    return false;
  } catch {
    return true; // fail closed for revocation-sensitive checks
  }
}

export async function assertUserActive(userId: string): Promise<boolean> {
  const claims = await getFreshUserClaims(userId);
  return Boolean(claims);
}

/** AUTH-13: re-read role/email from DB (30s cache) so demotions take effect quickly. */
export async function getFreshUserClaims(
  userId: string,
): Promise<{ role: UserRole; email: string } | null> {
  const cacheKey = `auth:claims:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached === '0') return null;
    if (cached) {
      const parsed = JSON.parse(cached) as { role: UserRole; email: string };
      if (parsed?.role && parsed?.email) return parsed;
    }
  } catch {
    // fall through
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: { role: true, email: true },
  });

  try {
    if (!user) {
      await redis.set(cacheKey, '0', 'EX', USER_STATUS_CACHE_TTL_SECONDS);
      // Keep legacy active cache in sync
      await redis.set(`auth:active:${userId}`, '0', 'EX', USER_STATUS_CACHE_TTL_SECONDS);
    } else {
      await redis.set(cacheKey, JSON.stringify(user), 'EX', USER_STATUS_CACHE_TTL_SECONDS);
      await redis.set(`auth:active:${userId}`, '1', 'EX', USER_STATUS_CACHE_TTL_SECONDS);
    }
  } catch {
    // ignore cache write failures
  }

  return user;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }

  void (async () => {
    try {
      const payload = verifyJwtWithSecrets<AuthPayload & { iat: number }>(
        token,
        accessVerifySecrets(),
        ACCESS_VERIFY_OPTS,
      );
      const [claims, terminated] = await Promise.all([
        getFreshUserClaims(payload.userId),
        wasLoggedOutAll(payload.userId, payload.iat),
      ]);
      if (terminated) {
        res.status(401).json({ message: 'Session terminated.' });
        return;
      }
      if (!claims) {
        res.status(403).json({ message: 'Account suspended or deleted.' });
        return;
      }
      // AUTH-13: overwrite stale JWT role/email with fresh DB claims
      req.user = {
        ...payload,
        role: claims.role,
        email: claims.email,
      };

      // G-1: attach processing restriction and block mutating processing
      const restrictedUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { processingRestricted: true },
      });
      req.processingRestricted = Boolean(restrictedUser?.processingRestricted);
      if (
        req.processingRestricted &&
        ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method.toUpperCase())
      ) {
        const path = (req.originalUrl || req.url || '').split('?')[0];
        const allowed = [
          '/api/privacy/',
          '/api/consents',
          '/api/consent/',
          '/api/logout',
          '/api/auth/logout',
          '/api/auth/logout-all',
          '/api/logout-all',
          '/api/me',
          '/api/auth/session',
          '/api/auth/refresh',
        ].some((p) => path === p || path.startsWith(p));
        if (!allowed) {
          res.status(409).json({
            message:
              'Processing of your personal data is currently restricted. You may still manage privacy settings, export data, or request erasure.',
            code: 'PROCESSING_RESTRICTED',
          });
          return;
        }
      }

      await new Promise<void>((resolve, reject) => {
        attachTenantContext(req, res, (err?: unknown) => {
          if (err) reject(err);
          else resolve();
        });
      });
      next();
    } catch {
      res.status(401).json({ message: 'Token expired or invalid.' });
    }
  })();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }

  void (async () => {
    try {
      const payload = verifyJwtWithSecrets<AuthPayload & { iat: number }>(
        token,
        accessVerifySecrets(),
        ACCESS_VERIFY_OPTS,
      );

      const [active, terminated] = await Promise.all([
        assertUserActive(payload.userId),
        wasLoggedOutAll(payload.userId, payload.iat),
      ]);

      // Treat revoked / inactive tokens as anonymous on optional routes
      if (!terminated && active) {
        req.user = payload;
        await new Promise<void>((resolve, reject) => {
          attachTenantContext(req, res, (err?: unknown) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    } catch {
      // silently ignore — route is publicly accessible
    }
    next();
  })();
}

export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(
    { ...payload, sub: payload.userId, typ: 'access' },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    } as jwt.SignOptions,
  );
}

export function generateRefreshToken(payload: Pick<AuthPayload, 'userId'>): string {
  return jwt.sign(
    { ...payload, sub: payload.userId, typ: 'refresh', jti: randomUUID() },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      algorithm: 'HS256',
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    } as jwt.SignOptions,
  );
}

export function verifyAccessToken(token: string): AuthPayload & { iat: number } {
  const decoded = verifyJwtWithSecrets<AuthPayload & { iat: number; typ?: string }>(
    token,
    accessVerifySecrets(),
    ACCESS_VERIFY_OPTS,
  );
  if (decoded.typ && decoded.typ !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): Pick<AuthPayload, 'userId'> {
  const decoded = verifyJwtWithSecrets<
    Pick<AuthPayload, 'userId'> & { typ?: string }
  >(token, refreshVerifySecrets(), REFRESH_VERIFY_OPTS);
  if (decoded.typ && decoded.typ !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return decoded;
}

export async function getUserFromRequest(req: Request) {
  if (!req.user) return null;
  return prisma.user.findUnique({
    where: { id: req.user.userId, deletedAt: null },
  });
}
