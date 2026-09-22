import type { i18n as I18nInstance } from 'i18next';

type ClinicalT = (key: string, options?: Record<string, unknown>) => string;

const NS = 'clinical';

function exists(i18n: I18nInstance, key: string): boolean {
  return i18n.exists(key, { ns: NS });
}

export function clinicalRoleLabel(t: ClinicalT, i18n: I18nInstance, role?: string | null): string {
  if (!role) return '';
  const slug = role.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const key = `common.roles.${slug}`;
  if (exists(i18n, key)) return t(key);
  return t('telehealthJoin.participant');
}

export function clinicalEpisodeStatus(t: ClinicalT, i18n: I18nInstance, status: string): string {
  const key = `episodes.status.${status}`;
  if (exists(i18n, key)) return t(key);
  return t('common.statusUnknown');
}

export function clinicalPlanStatus(t: ClinicalT, i18n: I18nInstance, status: string): string {
  const key = `plans.status.${status}`;
  if (exists(i18n, key)) return t(key);
  return t('common.statusUnknown');
}

export function clinicalScheduleStatus(t: ClinicalT, i18n: I18nInstance, status: string): string {
  const key = `schedule.status.${status}`;
  if (exists(i18n, key)) return t(key);
  return t('common.statusUnknown');
}

export function clinicalSessionStatus(t: ClinicalT, i18n: I18nInstance, status: string): string {
  const key = `common.sessionStatus.${status}`;
  if (exists(i18n, key)) return t(key);
  return t('common.statusUnknown');
}

export function clinicalAssessmentType(t: ClinicalT, i18n: I18nInstance, type?: string | null): string {
  const id = (type ?? 'initial').trim();
  const key = `assessmentTypes.${id}`;
  if (exists(i18n, key)) return t(key);
  return t('mobile.detail.assessmentTypeFallback');
}

export function clinicalPlanAction(t: ClinicalT, i18n: I18nInstance, action: string): string {
  const actionsKey = `plans.actions.${action}`;
  if (exists(i18n, actionsKey)) return t(actionsKey);
  const statusKey = `plans.status.${action}`;
  if (exists(i18n, statusKey)) return t(statusKey);
  return t('common.statusUnknown');
}

export function clinicalEmDash(t: ClinicalT): string {
  return t('common.emDash');
}

export function clinicalUrgency(t: ClinicalT, i18n: I18nInstance, level: string): string {
  const key = `urgency.${level}`;
  if (exists(i18n, key)) return t(key);
  return t('common.statusUnknown');
}
