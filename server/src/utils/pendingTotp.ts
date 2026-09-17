import { redis } from '../config/redis';
import { AppError } from '../middleware/errorHandler';

const PENDING_KEY_PREFIX = 'auth:2fa:pending:';
const PENDING_TTL_SECONDS = 10 * 60; // 10 minutes

function pendingKey(userId: string): string {
  return `${PENDING_KEY_PREFIX}${userId}`;
}

/** AUTH-03: stage TOTP secret in Redis until verify-setup confirms it. */
export async function stagePendingTotpSecret(userId: string, secretBase32: string): Promise<void> {
  try {
    await redis.set(pendingKey(userId), secretBase32, 'EX', PENDING_TTL_SECONDS);
  } catch {
    throw new AppError('Unable to start 2FA setup. Please try again shortly.', 503);
  }
}

export async function getPendingTotpSecret(userId: string): Promise<string | null> {
  try {
    return await redis.get(pendingKey(userId));
  } catch {
    throw new AppError('Unable to verify 2FA setup. Please try again shortly.', 503);
  }
}

export async function clearPendingTotpSecret(userId: string): Promise<void> {
  try {
    await redis.del(pendingKey(userId));
  } catch {
    // best-effort
  }
}
