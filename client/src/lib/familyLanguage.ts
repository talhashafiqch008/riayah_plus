/**
 * Family-facing language map for M2 revision (R1 / R2).
 * Staff portals keep clinical terms; family routes use these labels.
 * When Arabic is active, labels resolve via the `family` i18n namespace.
 */

import i18n from '@/i18n/config';

export const FAMILY_EPISODE_STATUS: Record<string, string> = {
  intake_submitted: 'Request received',
  under_review: 'Care team reviewing',
  validated: 'Care journey started',
  active: 'Active care',
  on_hold: 'On hold',
  closed: 'Closed',
};

export const FAMILY_ASSESSMENT_STATUS: Record<string, string> = {
  scheduled: 'Consultation booked',
  completed: 'Consultation completed',
  cancelled: 'Cancelled',
  no_show: 'Missed',
};

export const FAMILY_INTAKE_STATUS: Record<string, string> = {
  submitted: 'Request received',
  under_review: 'Care team reviewing',
  validated: 'Care journey ready',
  episode_created: 'Care journey started',
  withdrawn: 'Withdrawn',
};

function tStatus(group: 'episode' | 'assessment' | 'intake', status: string, fallback: string): string {
  const key = `status.${group}.${status}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  return fallback;
}

export function familyEpisodeStatusLabel(status: string): string {
  const en = FAMILY_EPISODE_STATUS[status] ?? status.replace(/_/g, ' ');
  return tStatus('episode', status, en);
}

export function familyAssessmentStatusLabel(status: string): string {
  const en = FAMILY_ASSESSMENT_STATUS[status] ?? status.replace(/_/g, ' ');
  return tStatus('assessment', status, en);
}

export function familyIntakeStatusLabel(status: string): string {
  const en = FAMILY_INTAKE_STATUS[status] ?? status.replace(/_/g, ' ');
  return tStatus('intake', status, en);
}

/** Shorten IDs for staff; family should not see these as primary UI. */
export function shortId(id: string, chars = 8): string {
  if (!id) return '';
  return id.length <= chars ? id : `${id.slice(0, chars)}…`;
}

export function familyDateLocale(): string {
  return i18n.language?.startsWith('ar') ? 'ar-QA' : 'en-QA';
}

/**
 * Family-facing date+time. Avoids dense locale strings like "م ٥:٠٠:٠٠، ٢٠٢٦/٨/٢٥"
 * that look like unexplained "dots" between numbers.
 */
export function formatFamilyDateTime(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  const locale = familyDateLocale();
  const date = d.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} — ${time}`;
}

export function formatFamilyDate(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(familyDateLocale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function familySessionStatusLabel(status: string): string {
  const key = `status.session.${status}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  return status.replace(/_/g, ' ');
}

/** Map stored wizard/enum tokens to family locale labels when available. */
export function familyEnumLabel(group: string, value: string): string {
  if (!value) return value;
  const slug = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const key = `enums.${group}.${slug}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  return value.replace(/_/g, ' ');
}

export function familyStaffRoleLabel(role: string): string {
  return familyEnumLabel('role', role);
}

export function familySessionTypeLabel(type: string): string {
  return familyEnumLabel('sessionType', type || 'session');
}

export function familyConversationTypeLabel(type: string): string {
  const key = `messages.threadType.${type}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  if (type === 'family_coordinator') return 'Care coordinator';
  if (type === 'family_clinical') return 'Clinician';
  if (type === 'coordinator_clinical') return 'Care team';
  if (type === 'internal_staff') return 'Internal';
  return 'Message';
}
