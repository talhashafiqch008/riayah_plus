import type { NextFunction, Request, Response } from 'express';

function passthrough(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

// Temporary: disable all rate limiting for local/demo usage.
// Re-enable by restoring express-rate-limit + RedisStore configuration.
export const apiLimiter = passthrough;
export const loginLimiter = passthrough;
export const otpLimiter = passthrough;
export const registerLimiter = passthrough;
export const aiLimiter = passthrough;
export const publicAiLimiter = passthrough;
export const adminLimiter = passthrough;
export const bookingLimiter = passthrough;
export const paymentLimiter = passthrough;
export const documentLimiter = passthrough;
export const avatarUploadLimiter = passthrough;
export const webhookLimiter = passthrough;
