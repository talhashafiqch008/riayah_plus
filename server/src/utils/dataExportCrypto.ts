import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

const EXPORT_DIR = path.join(process.cwd(), 'uploads', 'exports');
const ALGO = 'aes-256-gcm' as const;

function exportMasterKey(): Buffer {
  const raw = env.DATA_EXPORT_ENCRYPTION_KEY || env.JWT_ACCESS_SECRET;
  return crypto.createHash('sha256').update(`riayah-data-export:${raw}`).digest();
}

export async function ensureExportDir(): Promise<void> {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
}

export function exportFilePath(requestId: string): string {
  return path.join(EXPORT_DIR, `${requestId}.enc`);
}

/** AES-256-GCM: file layout = iv(12) || authTag(16) || ciphertext */
export function encryptExportJson(payload: unknown): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, exportMasterKey(), iv);
  const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]);
}

export function decryptExportFile(blob: Buffer): Buffer {
  if (blob.length < 28) {
    throw new Error('Corrupt export file.');
  }
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(12, 28);
  const ciphertext = blob.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, exportMasterKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function writeEncryptedExport(requestId: string, payload: unknown): Promise<string> {
  await ensureExportDir();
  const rel = path.join('uploads', 'exports', `${requestId}.enc`);
  const abs = exportFilePath(requestId);
  await fs.writeFile(abs, encryptExportJson(payload), { mode: 0o600 });
  return rel;
}

export async function readAndDecryptExport(requestId: string): Promise<Buffer> {
  const abs = exportFilePath(requestId);
  const blob = await fs.readFile(abs);
  return decryptExportFile(blob);
}

export async function deleteExportFile(requestId: string): Promise<void> {
  try {
    await fs.unlink(exportFilePath(requestId));
  } catch {
    // already gone
  }
}
