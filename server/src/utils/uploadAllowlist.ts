/** Shared upload MIME / size policy (H-5, M-6, M-7, IV-01). */

export const UPLOAD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB centralized
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB profile photos
export const VOICE_RECORDING_MAX_BYTES = 25 * 1024 * 1024; // ~25 MB voice notes

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

/** Browser MediaRecorder outputs — kept separate from document uploads. */
export const ALLOWED_VOICE_MIME_TYPES = [
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/3gpp',
] as const;

/** Profile avatars: images only (no PDF/Word — IV-01 / upload section 7.2). */
export const ALLOWED_AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];
export type AllowedAvatarMime = (typeof ALLOWED_AVATAR_MIME_TYPES)[number];
export type AllowedVoiceMime = (typeof ALLOWED_VOICE_MIME_TYPES)[number];

export function isAllowedUploadMime(mime: string | undefined | null): mime is AllowedUploadMime {
  return Boolean(mime && (ALLOWED_UPLOAD_MIME_TYPES as readonly string[]).includes(mime));
}

export function isAllowedAvatarMime(mime: string | undefined | null): mime is AllowedAvatarMime {
  return Boolean(mime && (ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(mime));
}

export function isAllowedVoiceMime(mime: string | undefined | null): boolean {
  if (!mime) return false;
  const normalized = mime.toLowerCase().split(';')[0]!.trim();
  return (ALLOWED_VOICE_MIME_TYPES as readonly string[]).some((allowed) => {
    const base = allowed.split(';')[0]!.trim();
    return allowed === mime.toLowerCase() || base === normalized;
  });
}

export function assertAllowedUploadMime(mime: string | undefined | null): asserts mime is AllowedUploadMime {
  if (!isAllowedUploadMime(mime)) {
    throw new Error('Unsupported file type. Use PDF, Word, JPEG, PNG, or WebP.');
  }
}

export function assertAllowedAvatarMime(mime: string | undefined | null): asserts mime is AllowedAvatarMime {
  if (!isAllowedAvatarMime(mime)) {
    throw new Error('Unsupported profile photo. Use JPEG, PNG, or WebP only.');
  }
}

export function assertAllowedVoiceMime(mime: string | undefined | null): void {
  if (!isAllowedVoiceMime(mime)) {
    throw new Error('Unsupported audio type. Use WebM, OGG, MP4, MPEG, or WAV.');
  }
}

/** Strip path separators and unsafe characters from original filenames. */
export function sanitizeUploadFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'file';
}

/**
 * Detect image type from magic bytes (IV-01). Do not trust client Content-Type.
 * Returns null if the buffer is not a supported image.
 */
export function detectAvatarMimeFromMagic(buffer: Buffer): AllowedAvatarMime | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export function avatarExtForMime(mime: AllowedAvatarMime): 'jpg' | 'png' | 'webp' {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

export function avatarContentTypeForFilename(filename: string): AllowedAvatarMime | null {
  const lower = filename.toLowerCase();
  if (lower === 'profile.png') return 'image/png';
  if (lower === 'profile.webp') return 'image/webp';
  if (lower === 'profile.jpg' || lower === 'profile.jpeg') return 'image/jpeg';
  return null;
}

/** Safe avatar user-id segment (cuid / uuid-like). Rejects path traversal. */
export function isValidAvatarUserId(userId: string): boolean {
  if (!userId || userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
    return false;
  }
  return /^[a-zA-Z0-9_-]{8,64}$/.test(userId);
}

/** Only allow fixed profile.* names under the avatar store (M-32 path hardening). */
export function isValidAvatarFilename(filename: string): boolean {
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return false;
  }
  return /^profile\.(jpg|jpeg|png|webp)$/i.test(filename);
}

/** Strict intake S3/local key: intake/{userId}/{uuid}-{safeName} */
export function isValidIntakeFileKey(key: string, userId: string): boolean {
  if (!key || key.includes('..') || key.startsWith('/') || key.includes('\\')) return false;
  const prefix = `intake/${userId}/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return /^[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/i.test(rest);
}
