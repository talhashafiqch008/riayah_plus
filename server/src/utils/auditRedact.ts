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
]);

export function redactForAudit(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactForAudit(item, depth + 1));
  }
  if (typeof value !== 'object') return value;

  const output: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      output[key] = '[REDACTED]';
    } else {
      output[key] = redactForAudit(nested, depth + 1);
    }
  }
  return output;
}
