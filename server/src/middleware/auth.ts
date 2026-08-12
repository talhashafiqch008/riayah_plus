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

/** M1: pin JWT algorithms — reject alg=none / unexpected algs. */
const ACCESS_VERIFY_OPTS: jwt.VerifyOptions = { algorithms: ['HS256'] };
const REFRESH_VERIFY_OPTS: jwt.VerifyOptions = { algorithms: ['HS256'] };

export async function recordLogoutAll(userId: string): Promise<void> {
  try {
    await redis.set(`auth:logoutall:${userId}`, Date.now().toString(), 'EX', LOGOUT_ALL_TTL_SECONDS);
  } catch {
    // Redis unavailable — tokens will expire naturally
  }
}

export async function wasLoggedOutAll(userId: string, iatSeconds: number): Promise<boolean> {
  try {
    const val = await redis.get(`auth:logoutall:${userId}`);
    if (!val) return false;
    return iatSeconds * 1000 < parseInt(val, 10);
  } catch {
    return false;
  }
}

export async function assertUserActive(userId: string): Promise<boolean> {
  const cacheKey = `auth:active:${userId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached === '1') return true;
    if (cached === '0') return false;
  } catch {
    // Redis unavailable — fall through to DB
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true, deletedAt: null },
    select: { id: true },
  });

  const active = Boolean(user);
  try {
    await redis.set(cacheKey, active ? '1' : '0', 'EX', USER_STATUS_CACHE_TTL_SECONDS);
  } catch {
    // ignore cache write failures
  }
  return active;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }

  void (async () => {
    try {
      const payload = jwt.verify(
        token,
        env.JWT_ACCESS_SECRET,
        ACCESS_VERIFY_OPTS,
      ) as AuthPayload & { iat: number };
      const [active, terminated] = await Promise.all([
        assertUserActive(payload.userId),
        wasLoggedOutAll(payload.userId, payload.iat),
      ]);
      if (terminated) {
        res.status(401).json({ message: 'Session terminated.' });
        return;
      }
      if (!active) {
        res.status(403).json({ message: 'Account suspended or deleted.' });
        return;
      }
      req.user = payload;

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
      const payload = jwt.verify(
        token,
        env.JWT_ACCESS_SECRET,
        ACCESS_VERIFY_OPTS,
      ) as AuthPayload & { iat: number };

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
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Pick<AuthPayload, 'userId'>): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AuthPayload & { iat: number } {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, ACCESS_VERIFY_OPTS) as AuthPayload & {
    iat: number;
  };
}

export function verifyRefreshToken(token: string): Pick<AuthPayload, 'userId'> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, REFRESH_VERIFY_OPTS) as Pick<
    AuthPayload,
    'userId'
  >;
}

export async function getUserFromRequest(req: Request) {
  if (!req.user) return null;
  return prisma.user.findUnique({
    where: { id: req.user.userId, deletedAt: null },
  });
}
