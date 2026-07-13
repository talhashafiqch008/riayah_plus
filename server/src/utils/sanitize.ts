import sanitizeHtml from 'sanitize-html';
import { z } from 'zod';

/** Strip all HTML/script tags from free-text input (GDPR Art 5.1.f / Art 32 — stored XSS). */
export function sanitizePlainText(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
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
