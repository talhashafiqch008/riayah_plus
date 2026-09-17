import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore, type RedisReply } from 'rate-limit-redis';
import { redis } from '../config/redis';
import { env } from '../config/env';

/** Looser caps in local dev to avoid blocking manual/E2E flows; production uses audit baselines. */
function scaleMax(max: number): number {
  if (env.isDev) return max * 20;
  if (process.env.NODE_ENV === 'test') return max * 100;
  return max;
}

function clientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** AUTH-17: composite key — IP + identifier (email/phone) when present. */
function authCompositeKey(req: Request): string {
  const ip = clientKey(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const identifier =
    (typeof body.email === 'string' && body.email) ||
    (typeof body.phone === 'string' && body.phone) ||
    (typeof body.identifier === 'string' && body.identifier) ||
    '';
  return identifier ? `${ip}:${identifier.toLowerCase().trim()}` : ip;
}

function createLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) {
  const useRedis = process.env.NODE_ENV !== 'test';

  return rateLimit({
    windowMs: options.windowMs,
    max: scaleMax(options.max),
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator ?? clientKey,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
    message: { message: options.message ?? 'Too many requests. Please try again later.' },
    ...(useRedis
      ? {
          store: new RedisStore({
            sendCommand: (...args: string[]) =>
              redis.call(...(args as [string, ...string[]])) as Promise<RedisReply>,
          }),
        }
      : {}),
  });
}

const FIFTEEN_MIN = 15 * 60 * 1000;
const FIVE_MIN = 5 * 60 * 1000;
const ONE_MIN = 60 * 1000;

/** Global API cap — 100 req/min per IP (M4 baseline). */
export const apiLimiter = createLimiter({
  windowMs: ONE_MIN,
  max: 100,
  message: 'Too many API requests. Please slow down.',
});

/** Login / register — 5 attempts per 15 min per IP+identifier. */
export const loginLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 5,
  skipSuccessfulRequests: true,
  keyGenerator: authCompositeKey,
  message: 'Too many login attempts. Please try again in 15 minutes.',
});

export const registerLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 5,
  keyGenerator: authCompositeKey,
  message: 'Too many registration attempts. Please try again later.',
});

/** OTP send/verify — 5 per 15 min per IP+identifier. */
export const otpLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 5,
  keyGenerator: authCompositeKey,
  message: 'Too many OTP requests. Please wait before trying again.',
});

/** AUTH-17: refresh rotation — tighter budget than global API. */
export const refreshLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 30,
  message: 'Too many refresh attempts. Please try again later.',
});

/** Authenticated AI — 60 per 5 min per IP. */
export const aiLimiter = createLimiter({
  windowMs: FIVE_MIN,
  max: 60,
  message: 'AI request limit reached. Please wait a few minutes.',
});

/** Public AI — 30 per 5 min per IP. */
export const publicAiLimiter = createLimiter({
  windowMs: FIVE_MIN,
  max: 30,
  message: 'Public AI chat limit reached. Please sign in or try again later.',
});

export const adminLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 60,
  message: 'Too many admin requests. Please slow down.',
});

export const bookingLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 30,
  message: 'Too many booking requests. Please try again later.',
});

export const paymentLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 20,
  message: 'Too many payment attempts. Please wait before retrying.',
});

export const documentLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 30,
  message: 'Too many document uploads. Please try again later.',
});

export const avatarUploadLimiter = createLimiter({
  windowMs: FIFTEEN_MIN,
  max: 10,
  message: 'Too many avatar uploads. Please try again later.',
});

/** Webhooks — 50 per minute per IP. */
export const webhookLimiter = createLimiter({
  windowMs: ONE_MIN,
  max: 50,
  message: 'Webhook rate limit exceeded.',
});
