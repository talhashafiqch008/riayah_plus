import { createHash, timingSafeEqual } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { AppError } from './errorHandler';
import { redis } from '../config/redis';

const MAX_TIMESTAMP_DRIFT_SECONDS = 300; // 5 minutes
const NONCE_TTL_SECONDS = 600;           // 10 minutes — longer than drift window

function apiKeysEqual(provided: string, configured: string): boolean {
  // Hash both sides to a fixed-length digest so length cannot be inferred via timing.
  const hash = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(hash(provided), hash(configured));
}

/**
 * Validates `X-API-Key` against `AI_SERVICE_API_KEY` for Riayah AI → our callbacks.
 * Also enforces:
 *   - `X-Request-Timestamp`: Unix seconds, must be within ±5 min of server time (AI-01)
 *   - `X-Nonce`: per-request unique string stored in Redis to prevent replay (AI-01)
 *   - Timing-safe key comparison that does not leak key length (AI-02)
 */
export async function requireAiServiceApiKey(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const configured = env.AI_SERVICE_API_KEY?.trim();
    if (!configured) {
      throw new AppError('AI callback auth is not configured on this server.', 503);
    }

    const provided =
      (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : undefined)?.trim() ?? '';

    if (!provided || !apiKeysEqual(provided, configured)) {
      throw new AppError('Unauthorized.', 401);
    }

    // Timestamp validation — reject if too old or in the future
    const tsHeader = typeof req.headers['x-request-timestamp'] === 'string'
      ? req.headers['x-request-timestamp']
      : undefined;
    if (!tsHeader) {
      throw new AppError('Missing X-Request-Timestamp header.', 401);
    }
    const tsSeconds = Number(tsHeader);
    if (!Number.isFinite(tsSeconds)) {
      throw new AppError('Invalid X-Request-Timestamp header.', 401);
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - tsSeconds) > MAX_TIMESTAMP_DRIFT_SECONDS) {
      throw new AppError('Request timestamp is too old or too far in the future.', 401);
    }

    // Nonce validation — prevent replays within the TTL window
    const nonce = typeof req.headers['x-nonce'] === 'string' ? req.headers['x-nonce'] : undefined;
    if (!nonce || nonce.length < 16) {
      throw new AppError('Missing or invalid X-Nonce header.', 401);
    }
    const nonceKey = `ai_nonce:${nonce}`;
    const stored = await redis.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS, 'NX');
    if (stored === null) {
      throw new AppError('Replayed request — nonce already used.', 401);
    }

    next();
  } catch (err) {
    next(err);
  }
}
