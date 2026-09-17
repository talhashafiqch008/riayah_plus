const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'current_password',
  'password_confirmation',
  'token',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'otp',
  'code', // AUTH-06: TOTP / verification codes
  'totp',
  'secret',
  'twofactorsecret',
  'two_factor_secret',
  'authorization',
  // G-26 — health / special-category fields
  'medicalinfo',
  'medical_info',
  'medicalhistory',
  'medical_history',
  'currentmeds',
  'current_meds',
  'diagnoses',
  'diagnosiscodes',
  'diagnosis_codes',
  'findings',
  'recommendations',
  'intakesummary',
  'intake_summary',
  'reviewsummary',
  'review_summary',
  'wizardpayload',
  'wizard_payload',
  'clinicalimpressions',
  'clinical_impressions',
  'flaggedriskfactors',
  'notes',
  'phone',
  'email',
  'address',
  'latitude',
  'longitude',
  'dateofbirth',
  'date_of_birth',
  'pocname',
  'poc_name',
  'pocphone',
  'poc_phone',
]);

function isDecimalLike(value: object): boolean {
  return (
    typeof (value as { toFixed?: unknown }).toFixed === 'function' &&
    's' in value &&
    'e' in value &&
    'd' in value
  );
}

export function redactForAudit(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value !== 'object') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactForAudit(item, depth + 1));
  }
  // Prisma Decimal / decimal.js — Object.entries would expose non-JSON fields (e.g. constructor).
  if (isDecimalLike(value)) {
    try {
      return Number((value as { toString: () => string }).toString());
    } catch {
      return String(value);
    }
  }

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (typeof nested === 'function') continue;
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redactForAudit(nested, depth + 1);
    }
  }
  return output;
}

/** Strip query strings from URLs before logging (tokens, reset codes, emails). */
export function redactUrlForLog(originalUrl: string): string {
  const q = originalUrl.indexOf('?');
  return q < 0 ? originalUrl : originalUrl.slice(0, q);
}

/** Redact email addresses in log metadata. */
export function redactEmailForLog(value: string | string[]): string | string[] {
  const mask = (email: string) => {
    const at = email.indexOf('@');
    if (at <= 1) return '[REDACTED_EMAIL]';
    return `${email[0]}***${email.slice(at)}`;
  };
  if (Array.isArray(value)) return value.map(mask);
  return mask(value);
}
