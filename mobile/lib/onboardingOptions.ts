/** Option lists mirrored from mern/client careseeker onboarding steps (IDs/icons only). */

export const COUNTRIES = [
  { code: 'QAT', flag: '🇶🇦' },
  { code: 'SAU', flag: '🇸🇦' },
  { code: 'EGY', flag: '🇪🇬' },
  { code: 'AUS', flag: '🇦🇺' },
  { code: 'PAK', flag: '🇵🇰' },
] as const;

export const PREFERRED_LANGUAGES = [
  { code: 'ENGLISH' },
  { code: 'ARABIC' },
  { code: 'TAGALOG' },
  { code: 'HINDI' },
  { code: 'URDU' },
  { code: 'MALAYALAM' },
  { code: 'BENGALI' },
] as const;

export const ACCOUNT_TYPES = [
  {
    id: 'myself',
    icon: 'person-outline' as const,
    detailKeys: [] as readonly string[],
  },
  {
    id: 'family_member',
    icon: 'people-outline' as const,
    detailKeys: ['0', '1', '2'] as const,
  },
  {
    id: 'support_coordinator',
    icon: 'briefcase-outline' as const,
    detailKeys: [] as readonly string[],
  },
] as const;

export const CARE_CATEGORIES = [
  {
    id: 'aged_care',
    icon: 'person-add-outline' as const,
    options: [
      { id: 'personal_care' },
      { id: 'companionship' },
      { id: 'mobility_assistance' },
      { id: 'meal_preparation' },
      { id: 'medication_reminders' },
      { id: 'nursing_aged' },
    ],
  },
  {
    id: 'disability_support',
    icon: 'accessibility-outline' as const,
    options: [
      { id: 'support_worker' },
      { id: 'cleaner' },
      { id: 'gardener' },
      { id: 'daily_living' },
      { id: 'community_access' },
      { id: 'skill_building' },
      { id: 'nursing_disability' },
    ],
  },
  {
    id: 'child_family',
    icon: 'happy-outline' as const,
    options: [
      { id: 'childcare' },
      { id: 'special_needs_child' },
      { id: 'newborn_support' },
      { id: 'school_pickup' },
    ],
  },
  {
    id: 'allied_health',
    icon: 'medkit-outline' as const,
    options: [
      { id: 'physiotherapy' },
      { id: 'occupational' },
      { id: 'speech_therapy' },
      { id: 'mental_wellness' },
    ],
  },
  {
    id: 'home_support',
    icon: 'home-outline' as const,
    options: [
      { id: 'cleaning' },
      { id: 'laundry' },
      { id: 'meal_prep_home' },
      { id: 'shopping_errands' },
    ],
  },
] as const;

export const GENDER_OPTIONS = [
  { id: 'female_only' },
  { id: 'male_only' },
  { id: 'no_preference' },
] as const;

export const PROVIDER_LANGUAGES = [
  { code: 'Arabic', flag: '🇸🇦' },
  { code: 'English', flag: '🇬🇧' },
  { code: 'Tagalog', flag: '🇵🇭' },
  { code: 'Hindi', flag: '🇮🇳' },
  { code: 'Urdu', flag: '🇵🇰' },
  { code: 'Bengali', flag: '🇧🇩' },
  { code: 'Malayalam', flag: '🇮🇳' },
] as const;

/** Maps provider language codes (stored in form) to onboarding.languages keys. */
export const PROVIDER_LANG_I18N: Record<string, string> = {
  Arabic: 'ARABIC',
  English: 'ENGLISH',
  Tagalog: 'TAGALOG',
  Hindi: 'HINDI',
  Urdu: 'URDU',
  Bengali: 'BENGALI',
  Malayalam: 'MALAYALAM',
};

export function careLocationEnumKey(id: string): string {
  if (id === 'remote') return 'telehealth';
  if (id === 'both') return 'flexible';
  return id;
}

export const LOCATION_OPTIONS = [
  { id: 'home', icon: 'home-outline' as const },
  { id: 'remote', icon: 'videocam-outline' as const },
  { id: 'both', icon: 'location-outline' as const },
] as const;

export const FREQUENCY_OPTIONS = [
  { id: 'one_time' },
  { id: 'weekly' },
  { id: 'daily' },
  { id: 'flexible' },
] as const;

export const DAYS_OF_WEEK = [
  { id: 'sun' },
  { id: 'mon' },
  { id: 'tue' },
  { id: 'wed' },
  { id: 'thu' },
  { id: 'fri' },
  { id: 'sat' },
] as const;

export const TIME_SLOTS = [
  { id: 'morning', icon: 'sunny-outline' as const },
  { id: 'afternoon', icon: 'partly-sunny-outline' as const },
  { id: 'evening', icon: 'moon-outline' as const },
  { id: 'overnight', icon: 'cloudy-night-outline' as const },
] as const;

export const ONBOARDING_STEP_KEYS = [
  'location',
  'support',
  'preferences',
  'schedule',
  'confirm',
] as const;
