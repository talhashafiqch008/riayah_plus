import crypto from 'crypto';
import { env } from '../config/env';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm' as const;

function transcriptMasterKey(): Buffer {
  const raw = env.RECORDING_TRANSCRIPT_ENCRYPTION_KEY?.trim();
  if (!raw) {
    if (env.isProd) {
      throw new Error(
        'RECORDING_TRANSCRIPT_ENCRYPTION_KEY is not configured. Set a dedicated secret for telehealth transcripts.',
      );
    }
    return crypto.createHash('sha256').update('riayah-recording-transcript:local-dev-only').digest();
  }
  return crypto.createHash('sha256').update(`riayah-recording-transcript:${raw}`).digest();
}

/** AES-256-GCM ciphertext stored in sessions.recordingTranscript (prefixed for version detection). */
export function encryptRecordingTranscript(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, transcriptMasterKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptRecordingTranscript(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    if (env.isProd) {
      throw new Error('Unencrypted recording transcript found in production.');
    }
    return stored;
  }

  const blob = Buffer.from(stored.slice(PREFIX.length), 'base64url');
  if (blob.length < 28) {
    throw new Error('Corrupt recording transcript ciphertext.');
  }

  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, transcriptMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

export function isEncryptedRecordingTranscript(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
