import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { UserRole } from '@prisma/client';
import { getAccessTokenFromRequest } from '../utils/authCookies';

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

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ message: 'Unauthenticated.' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: 'Token expired or invalid.' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = getAccessTokenFromRequest(req);
  if (token) {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
      req.user = payload;
    } catch {
      // silently ignore — route is publicly accessible
    }
  }
  next();
}

export function generateAccessToken(payload: AuthPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: Pick<AuthPayload, 'userId'>): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
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
