import { timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';

function apiKeysEqual(provided: string, configured: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  if (a.length !== b.length) {
    // Keep roughly constant work on length mismatch.
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Validates `X-API-Key` against `AI_SERVICE_API_KEY` for Riayah AI → our callbacks.
 * Do not use session auth here — Momen's service calls this server-to-server.
 */
export function requireAiServiceApiKey(req: Request, _res: Response, next: NextFunction): void {
  const configured = env.AI_SERVICE_API_KEY?.trim();
  if (!configured) {
    throw new AppError('AI callback auth is not configured on this server.', 503);
  }

  const provided =
    (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : undefined)?.trim() ??
    '';

  if (!provided || !apiKeysEqual(provided, configured)) {
    throw new AppError('Unauthorized.', 401);
  }

  next();
}
