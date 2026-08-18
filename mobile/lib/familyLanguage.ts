/**
 * Port of mern/client/src/lib/familyLanguage.ts — keep in sync with web.
 * Staff portals keep clinical terms; family routes use these labels.
 */

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

export function familyEpisodeStatusLabel(status: string): string {
  return FAMILY_EPISODE_STATUS[status] ?? status.replace(/_/g, ' ');
}

export function familyAssessmentStatusLabel(status: string): string {
  return FAMILY_ASSESSMENT_STATUS[status] ?? status.replace(/_/g, ' ');
}

export function familyIntakeStatusLabel(status: string): string {
  return FAMILY_INTAKE_STATUS[status] ?? status.replace(/_/g, ' ');
}

/** Shorten IDs for staff; family should not see these as primary UI. */
export function shortId(id: string, chars = 8): string {
  if (!id) return '';
  return id.length <= chars ? id : `${id.slice(0, chars)}…`;
}

/** Status filter chips for the family care journey list (mirrors web select options). */
export const FAMILY_EPISODE_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'intake_submitted', label: 'Request received' },
  { value: 'under_review', label: 'Care team reviewing' },
  { value: 'validated', label: 'Care journey started' },
  { value: 'active', label: 'Active care' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'closed', label: 'Closed' },
];

/** Status filter chips for the family appointments list. */
export const FAMILY_ASSESSMENT_STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'scheduled', label: 'Consultation booked' },
  { value: 'completed', label: 'Consultation completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
