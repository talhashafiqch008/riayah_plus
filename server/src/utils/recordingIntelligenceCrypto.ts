import crypto from 'crypto';
import { env } from '../config/env';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm' as const;

function intelligenceMasterKey(): Buffer {
  const raw = env.RECORDING_TRANSCRIPT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (env.isProd) {
      throw new Error(
        'RECORDING_TRANSCRIPT_ENCRYPTION_KEY is not configured. Set a dedicated secret for recording intelligence PHI at rest.',
      );
    }
    return crypto.createHash('sha256').update('riayah-recording-intelligence:local-dev-only').digest();
  }
  return crypto.createHash('sha256').update(`riayah-recording-intelligence:${raw}`).digest();
}

/** AES-256-GCM ciphertext for recording-intelligence artifact JSON (prefixed for version detection). */
export function encryptJson(value: unknown): string {
  const plaintext = JSON.stringify(value);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, intelligenceMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptJson<T = unknown>(stored: string): T {
  if (!stored.startsWith(PREFIX)) {
    if (env.isProd) {
      throw new Error('Unencrypted recording intelligence payload found in production.');
    }
    return JSON.parse(stored) as T;
  }

  const blob = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  if (blob.length < 28) {
    throw new Error('Corrupt recording intelligence ciphertext.');
  }

  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, intelligenceMasterKey(), iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  return JSON.parse(plaintext) as T;
}

export function isEncryptedRecordingIntelligencePayload(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
