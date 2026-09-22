/**
 * Port of mern/client/src/lib/familyLanguage.ts — keep in sync with web.
 * Staff portals keep clinical terms; family routes use these labels.
 * When Arabic is active, labels resolve via the `family` i18n namespace.
 */

import i18n from '../i18n/config';

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

function tStatus(group: 'episode' | 'assessment' | 'intake' | 'carePlan' | 'session', status: string, fallback: string): string {
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

export function familyCarePlanStatusLabel(status: string): string {
  return tStatus('carePlan', status, status.replace(/_/g, ' '));
}

/** Shorten IDs for staff; family should not see these as primary UI. */
export function shortId(id: string, chars = 8): string {
  if (!id) return '';
  return id.length <= chars ? id : `${id.slice(0, chars)}…`;
}

export function familyDateLocale(): string {
  return i18n.language?.startsWith('ar') ? 'ar-QA' : 'en-QA';
}

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
  return tStatus('session', status, status.replace(/_/g, ' '));
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

export function familyConversationTypeLabel(type: string): string {
  const key = `messages.threadType.${type}`;
  const translated = i18n.t(key, { ns: 'family', defaultValue: '' });
  if (translated && translated !== key) return translated;
  if (type === 'family_coordinator') return i18n.t('messages.threadType.family_coordinator', { ns: 'family', defaultValue: 'Care coordinator' });
  if (type === 'family_clinical') return i18n.t('messages.threadType.family_clinical', { ns: 'family', defaultValue: 'Clinician' });
  if (type === 'coordinator_clinical') return i18n.t('messages.threadType.coordinator_clinical', { ns: 'family', defaultValue: 'Care team' });
  if (type === 'internal_staff') return i18n.t('messages.threadType.internal_staff', { ns: 'family', defaultValue: 'Internal' });
  if (type === 'episode') return i18n.t('messages.threadType.episode', { ns: 'family', defaultValue: 'Care journey' });
  return i18n.t('messages.threadType.default', { ns: 'family', defaultValue: 'Message' });
}

/** Status filter chips for the family care journey list (mirrors web select options). */
export function familyEpisodeStatusFilters(): { value: string; label: string }[] {
  return [
    { value: '', label: i18n.t('episodes.all', { ns: 'family' }) },
    { value: 'intake_submitted', label: familyEpisodeStatusLabel('intake_submitted') },
    { value: 'under_review', label: familyEpisodeStatusLabel('under_review') },
    { value: 'validated', label: familyEpisodeStatusLabel('validated') },
    { value: 'active', label: familyEpisodeStatusLabel('active') },
    { value: 'on_hold', label: familyEpisodeStatusLabel('on_hold') },
    { value: 'closed', label: familyEpisodeStatusLabel('closed') },
  ];
}

/** @deprecated Prefer familyEpisodeStatusFilters() so labels follow active locale. */
export const FAMILY_EPISODE_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'intake_submitted', label: 'Request received' },
  { value: 'under_review', label: 'Care team reviewing' },
  { value: 'validated', label: 'Care journey started' },
  { value: 'active', label: 'Active care' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'closed', label: 'Closed' },
];

export const FAMILY_ASSESSMENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Consultation booked' },
  { value: 'completed', label: 'Consultation completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
