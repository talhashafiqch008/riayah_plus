/**
 * Display-only localization for family wizard summary strings (English labels stored at onboarding).
 * Port of mern/client FamilyCareRequestPanel localizeSummaryToken / localizeChip (trimmed).
 */

import i18n from '../i18n/config';
import { familyEnumLabel } from './familyLanguage';

const SUPPORT_EN_TO_ID: Record<string, string> = {
  'Home Care': 'aged_care',
  Disability: 'disability_support',
  Babysitting: 'child_family',
  Therapy: 'allied_health',
  'Home Visit': 'home_support',
};

const GENDER_EN_TO_ID: Record<string, string> = {
  Female: 'female',
  Male: 'male',
  'No Preference': 'no_preference',
  'Female provider only': 'female_only',
  'Male provider only': 'male_only',
  'No preference': 'no_preference',
};

const CARE_LOCATION_EN_TO_ID: Record<string, string> = {
  'In-person / at home': 'home',
  Clinic: 'clinic',
  Virtual: 'telehealth',
  Flexible: 'flexible',
  'In-person': 'home',
};

const SCHEDULE_EN_TO_ID: Record<string, string> = {
  'One-time': 'one_time',
  Weekly: 'weekly',
  Daily: 'daily',
  'As needed': 'flexible',
};

const TOKEN_GROUPS = ['support', 'need', 'schedule', 'careLocation', 'gender', 'day', 'time'] as const;

function localizeToken(token: string): string {
  const trimmed = token.trim();
  if (!trimmed) return trimmed;
  for (const group of TOKEN_GROUPS) {
    const via = familyEnumLabel(group, trimmed);
    if (via !== trimmed.replace(/_/g, ' ') && via !== trimmed) return via;
  }
  const slug = trimmed.toLowerCase().replace(/[\s-]+/g, '_');
  const lang = i18n.t(`onboarding.languages.${slug.toUpperCase()}`, {
    ns: 'family',
    defaultValue: '',
  });
  if (lang && lang !== `onboarding.languages.${slug.toUpperCase()}`) return lang;
  return trimmed.replace(/_/g, ' ');
}

export function localizeSummaryToken(group: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  let slug = trimmed;
  if (group === 'support' && SUPPORT_EN_TO_ID[trimmed]) slug = SUPPORT_EN_TO_ID[trimmed];
  if (group === 'gender' && GENDER_EN_TO_ID[trimmed]) slug = GENDER_EN_TO_ID[trimmed];
  if (group === 'careLocation' && CARE_LOCATION_EN_TO_ID[trimmed]) {
    slug = CARE_LOCATION_EN_TO_ID[trimmed];
  }
  if (group === 'schedule' && SCHEDULE_EN_TO_ID[trimmed]) slug = SCHEDULE_EN_TO_ID[trimmed];
  const translated = familyEnumLabel(group, slug);
  return translated !== slug.replace(/_/g, ' ') ? translated : trimmed;
}

export function localizeChip(raw: string): string {
  return localizeToken(raw);
}

export function localizeAccountTypeLabel(label?: string | null): string {
  if (!label) return '';
  const map: Record<string, string> = {
    'Family Guardian': 'family_member',
    'Individual (for myself)': 'myself',
    'Support Coordinator': 'support_coordinator',
    myself: 'myself',
    family_member: 'family_member',
    support_coordinator: 'support_coordinator',
  };
  const slug = map[label] ?? label;
  const via = familyEnumLabel('account', slug);
  return via !== slug.replace(/_/g, ' ') ? via : label;
}
