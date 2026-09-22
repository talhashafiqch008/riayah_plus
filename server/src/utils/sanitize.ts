import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

/** Strip all HTML/script tags from free-text input (GDPR Art 5.1.f / Art 32 — stored XSS). */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}

/** Escape for HTML email / template interpolation (INJ-07). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Zod string that strips HTML before validation continues. */
export const sanitizedString = (schema: z.ZodString = z.string()) =>
  z.preprocess(
    (val) => (typeof val === 'string' ? sanitizePlainText(val) : val),
    schema,
  );

export const optionalSanitizedString = (schema: z.ZodString = z.string()) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      return typeof val === 'string' ? sanitizePlainText(val) : val;
    },
    schema.optional(),
  );

/** Nullable free text from AI / optional fields — strip tags, preserve null. */
export const nullableSanitizedString = (schema: z.ZodString = z.string()) =>
  z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null || val === '') return null;
      return typeof val === 'string' ? sanitizePlainText(val) : val;
    },
    schema.nullable().optional(),
  );

/** http(s) URLs only — Zod `.url()` alone accepts javascript:/data: (INJ-06). */
export const httpUrl = z
  .string()
  .url()
  .refine((u) => {
    try {
      const protocol = new URL(u).protocol;
      return protocol === 'http:' || protocol === 'https:';
    } catch {
      return false;
    }
  }, { message: 'URL must use http or https' });

/** Profile avatar: relative avatar path or http(s) URL. */
export const avatarUrlSchema = z.string().refine((u) => {
  if (u.startsWith('/api/avatars/')) return true;
  try {
    const protocol = new URL(u).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'Avatar must be an http(s) URL or /api/avatars/ path' });
