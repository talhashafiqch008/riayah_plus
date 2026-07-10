import crypto from 'crypto';
import { env } from '../config/env';

/** HMAC-SHA256 of the refresh JWT — deterministic for indexed DB lookup; plain token never stored. */
export function hashRefreshToken(plainToken: string): string {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(plainToken).digest('hex');
}

/** True when a DB row still holds a legacy pre-hash plain JWT (contains `.` segments). */
export function isLegacyPlainRefreshToken(stored: string): boolean {
  return stored.includes('.');
}
