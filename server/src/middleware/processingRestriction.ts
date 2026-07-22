import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      processingRestricted?: boolean;
    }
  }
}

/** Paths still allowed when Art 18 restriction is active (exercise rights / legal claims). */
const ALLOWED_PREFIXES = [
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
];

function isAllowedWhileRestricted(url: string): boolean {
  const path = url.split('?')[0];
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/** Load restriction flag onto the request (call after auth). */
export async function attachProcessingRestriction(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      next();
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { processingRestricted: true },
    });
    req.processingRestricted = Boolean(user?.processingRestricted);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * G-1 / Art 18 — block mutating processing when the subject has restricted processing.
 * GET/HEAD/OPTIONS remain allowed so subjects can still access/export their data.
 */
export function enforceProcessingRestriction(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    next();
    return;
  }
  if (!req.processingRestricted) {
    next();
    return;
  }
  if (isAllowedWhileRestricted(req.originalUrl || req.url)) {
    next();
    return;
  }
  res.status(409).json({
    message:
      'Processing of your personal data is currently restricted. You may still manage privacy settings, export data, or request erasure.',
    code: 'PROCESSING_RESTRICTED',
  });
}

/** Helper for service-layer checks. */
export async function assertProcessingAllowed(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { processingRestricted: true },
  });
  if (user?.processingRestricted) {
    throw new AppError(
      'Processing of this user\'s personal data is restricted (GDPR Art 18).',
      409,
    );
  }
}
