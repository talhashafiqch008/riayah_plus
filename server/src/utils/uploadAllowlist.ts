/** Shared upload MIME / size policy (H-5, M-6, M-7). */

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB centralized

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export function isAllowedUploadMime(mime: string | undefined | null): mime is AllowedUploadMime {
  return Boolean(mime && (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime));
}

export function assertAllowedUploadMime(mime: string | undefined | null): asserts mime is AllowedUploadMime {
  if (!isAllowedUploadMime(mime)) {
    throw new Error('Unsupported file type. Use PDF, Word, JPEG, PNG, or WebP.');
  }
}

/** Strip path separators and unsafe characters from original filenames. */
export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
}

/** Strict intake S3/local key: intake/{userId}/{uuid}-{safeName} */
export function isValidIntakeFileKey(key: string, userId: string): boolean {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  const prefix = `intake/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return /^[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/i.test(rest);
}
