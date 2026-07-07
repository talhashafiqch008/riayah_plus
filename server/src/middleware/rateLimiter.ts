import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from '../config/redis';

function makeStore(prefix: string) {
  return new RedisStore({
    sendCommand: (...args: string[]) => redis.call(...(args as [string, ...string[]])) as Promise<any>,
    prefix: `rl:${prefix}:`,
  });
}

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('api'),
  message: { message: 'Too many requests, please try again later.' },
});

export const loginLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  store: makeStore('login'),
  message: { message: 'Too many login attempts.' },
});

export const otpLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  store: makeStore('otp'),
  message: { message: 'Too many OTP requests.' },
});

export const registerLimiter = rateLimit({
  windowMs: 60_000,
  max: 3,
  store: makeStore('register'),
  message: { message: 'Too many registration attempts.' },
});

export const aiLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  store: makeStore('ai'),
  message: { message: 'AI rate limit exceeded.' },
});

export const adminLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  store: makeStore('admin'),
  message: { message: 'Admin rate limit exceeded.' },
});

export const bookingLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  store: makeStore('booking'),
  message: { message: 'Booking rate limit exceeded.' },
});

export const paymentLimiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  store: makeStore('payment'),
  message: { message: 'Payment rate limit exceeded.' },
});

export const documentLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  store: makeStore('document'),
  message: { message: 'Document rate limit exceeded.' },
});

export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: 100,
  store: makeStore('webhook'),
  message: { message: 'Webhook rate limit exceeded.' },
});
