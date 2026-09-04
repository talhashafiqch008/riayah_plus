import crypto from 'crypto';
import { env } from '../config/env';

const EXPORT_ID_SALT =
  env.DATA_EXPORT_ENCRYPTION_KEY?.trim() || 'riayah-export-redact:local-dev-only';

/** One-way pseudonym for foreign user IDs in GDPR exports (G1). */
export function hashForeignUserId(foreignUserId: string, exportRequestId: string): string {
  return crypto
    .createHmac('sha256', EXPORT_ID_SALT)
    .update(`export:${exportRequestId}:${foreignUserId}`)
    .digest('hex')
    .slice(0, 16);
}

export function redactForeignUserId(
  value: string | null | undefined,
  subjectUserId: string,
  exportRequestId: string,
): string | null | undefined {
  if (!value || value === subjectUserId) return value;
  return `user_${hashForeignUserId(value, exportRequestId)}`;
}

export function redactBookingRows<T extends { clientId?: string; providerId?: string }>(
  rows: T[],
  subjectUserId: string,
  exportRequestId: string,
): T[] {
  return rows.map((row) => ({
    ...row,
    clientId: redactForeignUserId(row.clientId, subjectUserId, exportRequestId) as string,
    providerId: redactForeignUserId(row.providerId, subjectUserId, exportRequestId) as string,
  }));
}

export function redactMessageRows<T extends { receiverId?: string | null }>(
  rows: T[],
  subjectUserId: string,
  exportRequestId: string,
): T[] {
  return rows.map((row) => ({
    ...row,
    receiverId: redactForeignUserId(row.receiverId ?? undefined, subjectUserId, exportRequestId) ?? null,
  }));
}
