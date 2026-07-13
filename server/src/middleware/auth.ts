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
    }
  }
}

const USER_STATUS_CACHE_TTL_SECONDS = 30;
const LOGOUT_ALL_TTL_SECONDS = 7 * 24 * 60 * 60; // matches max refresh token lifetime

export async function recordLogoutAll(userId: string): Promise<void> {
  try {
    await redis.set(`auth:logoutall:${userId}`, Date.now().toString(), 'EX', LOGOUT_ALL_TTL_SECONDS);
  } catch {
    // Redis unavailable — tokens will expire naturally
  }
}

async function wasLoggedOutAll(userId: string, iatSeconds: number): Promise<boolean> {
  try {
    const val = await redis.get(`auth:logoutall:${userId}`);
    if (!val) return false;
    return iatSeconds * 1000 < parseInt(val, 10);
  } catch {
    return false;
  }
}

async function assertUserActive(userId: string): Promise<boolean> {
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
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload & { iat: number };
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

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    next();
    return;
  }

  void (async () => {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
      const active = await assertUserActive(payload.userId);
      if (active) {
        req.user = payload;
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
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Pick<AuthPayload, 'userId'>): string {
  return jwt.sign({ ...payload, jti: randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): Pick<AuthPayload, 'userId'> {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as Pick<AuthPayload, 'userId'>;
}

export async function getUserFromRequest(req: Request) {
  if (!req.user) return null;
  return prisma.user.findUnique({
    where: { id: req.user.userId, deletedAt: null },
  });
}
