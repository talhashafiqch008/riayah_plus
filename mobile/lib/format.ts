import i18n from '../i18n/config';

/** BCP-47 tag for date/time formatting from the active UI language. */
export function activeDateLocale(): string {
  return i18n.language?.startsWith('ar') ? 'ar-QA' : 'en-AU';
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(activeDateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(activeDateLocale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(activeDateLocale(), {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function greetingForNow() {
  const h = new Date().getHours();
  if (h < 12) return i18n.t('mobile.greeting.morning', { ns: 'family' });
  if (h < 17) return i18n.t('mobile.greeting.afternoon', { ns: 'family' });
  return i18n.t('mobile.greeting.evening', { ns: 'family' });
}

export function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase();
}

const FIELD_LABELS: Record<string, string> = {
  completionEvidence: 'Evidence',
  notes: 'Notes',
  email: 'Email',
  password: 'Password',
  name: 'Name',
  title: 'Title',
  phone: 'Phone',
  otp: 'Code',
  content: 'Note',
  reportUrl: 'Report URL',
  recommendations: 'Recommendations',
  findings: 'Findings',
};

const GENERIC_SERVER_MESSAGES = new Set([
  'validation failed.',
  'validation failed',
  'request failed',
  'an unexpected error occurred',
  'internal server error.',
  'internal server error',
  'unauthorized',
  'unauthorized.',
  'forbidden',
  'forbidden.',
]);

function fieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const spaced = field.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isGenericMessage(msg: string): boolean {
  return GENERIC_SERVER_MESSAGES.has(msg.trim().toLowerCase());
}

function humanizeIssue(field: string, message: string): string {
  const label = fieldLabel(field);
  const m = message.trim();
  const lower = m.toLowerCase();
  if (lower === 'invalid url' || lower.includes('invalid url')) {
    return `${label} must be a valid URL`;
  }
  if (lower === 'required' || lower === 'invalid_type' || lower.startsWith('required')) {
    return `${label} is required`;
  }
  if (lower.includes('invalid email')) return 'Enter a valid email address';
  if (lower === 'invalid string') return `${label} is invalid`;
  if (lower.startsWith(label.toLowerCase())) return m;
  return `${label}: ${m}`;
}

function collectIssueMessages(value: unknown, field = ''): string[] {
  if (typeof value === 'string' && value.trim()) {
    return [field ? humanizeIssue(field, value) : value.trim()];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectIssueMessages(item, field));
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) {
      const path = Array.isArray(obj.path)
        ? String(obj.path[obj.path.length - 1] ?? field)
        : field;
      return [path ? humanizeIssue(path, obj.message) : obj.message.trim()];
    }
    if (Array.isArray(obj._errors) && obj._errors.length) {
      return collectIssueMessages(obj._errors, field);
    }
    return Object.entries(obj).flatMap(([k, v]) => collectIssueMessages(v, k));
  }
  return [];
}

function formatFieldErrors(errors: unknown): string | null {
  const msgs = collectIssueMessages(errors).filter(Boolean);
  return msgs.length ? msgs.join('. ') : null;
}

function messageFromBody(data: unknown): string | null {
  if (typeof data === 'string' && data.trim() && !data.trim().startsWith('<')) {
    return data.trim();
  }
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  const fieldHint =
    formatFieldErrors(d.errors) ??
    formatFieldErrors(d.fieldErrors) ??
    formatFieldErrors(d.formErrors);
  if (fieldHint) return fieldHint;

  if (Array.isArray(d.details)) {
    const fromDetails = formatFieldErrors(d.details);
    if (fromDetails) return fromDetails;
  }

  if (typeof d.message === 'string' && d.message.trim() && !isGenericMessage(d.message)) {
    return d.message.trim();
  }
  if (typeof d.error === 'string' && d.error.trim() && !isGenericMessage(d.error)) {
    return d.error.trim();
  }
  if (typeof d.details === 'string' && d.details.trim()) return d.details.trim();
  if (typeof d.message === 'string' && d.message.trim()) return d.message.trim();
  return null;
}

export function apiErrorMessage(e: unknown, fallback?: string): string {
  const resolvedFallback =
    fallback ?? i18n.t('errors.generic', { ns: 'common' });
  if (e == null) return resolvedFallback;
  if (typeof e === 'string' && e.trim()) {
    return isGenericMessage(e) ? resolvedFallback : e.trim();
  }

  const err = e as {
    response?: { data?: unknown; status?: number };
    message?: string;
    code?: string;
  };

  const fromBody = messageFromBody(err.response?.data);
  if (fromBody && !isGenericMessage(fromBody)) return fromBody;

  if (!err.response) {
    if (err.code === 'ECONNABORTED' || /timeout/i.test(err.message ?? '')) {
      return i18n.t('errors.timeout', { ns: 'common' });
    }
    if (/network error/i.test(err.message ?? '')) {
      return i18n.t('errors.network', { ns: 'common' });
    }
  }

  if (
    typeof err.message === 'string' &&
    err.message.trim() &&
    !/^Request failed with status code \d+$/i.test(err.message) &&
    !isGenericMessage(err.message)
  ) {
    return err.message.trim();
  }

  if (fromBody) return fromBody;
  return resolvedFallback;
}
