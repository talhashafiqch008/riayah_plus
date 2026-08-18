/** Port of mern/client/src/lib/familyCareseekerIntake.ts — keep in sync with web. */

export type ServiceCategory =
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'behavioral_support'
  | 'physiotherapy'
  | 'nursing'
  | 'companion_care';

export const PENDING_DIAGNOSIS = 'PENDING_CLINICAL_REVIEW';

const COUNTRY_TO_ISO2: Record<string, string> = {
  QAT: 'QA',
  SAU: 'SA',
  EGY: 'EG',
  AUS: 'AU',
  PAK: 'PK',
};

const NEED_TO_SERVICE: Record<string, ServiceCategory> = {
  physiotherapy: 'physiotherapy',
  occupational: 'occupational_therapy',
  speech_therapy: 'speech_therapy',
  mental_wellness: 'behavioral_support',
  nursing_aged: 'nursing',
  nursing_disability: 'nursing',
  companionship: 'companion_care',
  personal_care: 'companion_care',
  support_worker: 'companion_care',
  daily_living: 'companion_care',
  community_access: 'companion_care',
  skill_building: 'behavioral_support',
  special_needs_child: 'behavioral_support',
};

const CATEGORY_TO_SERVICE: Record<string, ServiceCategory> = {
  aged_care: 'companion_care',
  disability_support: 'behavioral_support',
  child_family: 'companion_care',
  allied_health: 'physiotherapy',
  home_support: 'companion_care',
};

export const CATEGORY_LABELS: Record<string, string> = {
  aged_care: 'Home Care',
  disability_support: 'Disability',
  child_family: 'Babysitting',
  allied_health: 'Therapy',
  home_support: 'Home Visit',
};

const COUNTRY_LABELS: Record<string, string> = {
  QAT: 'Qatar',
  SAU: 'Saudi Arabia',
  EGY: 'Egypt',
  AUS: 'Australia',
  PAK: 'Pakistan',
  QA: 'Qatar',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  AU: 'Australia',
  PK: 'Pakistan',
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  myself: 'Individual (for myself)',
  family_member: 'Family Guardian',
  support_coordinator: 'Support Coordinator',
};

const SCHEDULE_LABELS: Record<string, string> = {
  one_time: 'One-time',
  weekly: 'Weekly',
  daily: 'Daily',
  flexible: 'As needed',
  as_needed: 'As needed',
};

const CARE_LOCATION_LABELS: Record<string, string> = {
  in_person: 'In-person',
  virtual: 'Virtual',
  flexible: 'Flexible',
  home: 'In-person / at home',
  clinic: 'Clinic',
  telehealth: 'Virtual',
};

const GENDER_PREF_LABELS: Record<string, string> = {
  female: 'Female provider only',
  male: 'Male provider only',
  no_preference: 'No preference',
  any: 'No preference',
};

const PLAN_TYPE_LABELS: Record<string, string> = {
  ndia_managed: 'NDIA Managed',
  plan_managed: 'Plan Managed',
  self_managed: 'Self Managed',
};

export function labelCareCategory(id: string): string {
  return CATEGORY_LABELS[id] ?? id.replace(/_/g, ' ');
}

export type FamilyWizardSummary = {
  isFamilyCareseekerSource: boolean;
  accountType: string | null;
  country: string | null;
  preferredLanguage: string | null;
  supportCategories: string[];
  specificNeeds: string[];
  practitionerGender: string | null;
  providerLanguages: string[];
  careLocation: string | null;
  address: string | null;
  scheduleType: string | null;
  preferredDays: string[];
  preferredTimeSlots: string[];
  startTiming: string | null;
  ndisPlanType: string | null;
  ndisNumber: string | null;
  planManagerEmail: string | null;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Parse intake.wizardPayload into a family-friendly care request summary. */
export function parseFamilyWizardSummary(
  wizardPayload: Record<string, unknown> | null | undefined,
): FamilyWizardSummary | null {
  if (!wizardPayload || typeof wizardPayload !== 'object') return null;

  const source = asString(wizardPayload.source);
  const hasCareseekerShape =
    source === 'family_careseeker_onboarding' ||
    Array.isArray(wizardPayload.careCategories) ||
    Boolean(wizardPayload.careRecipientType);

  if (!hasCareseekerShape) return null;

  const careCategories = asStringArray(wizardPayload.careCategories);
  const careNeeds =
    wizardPayload.careNeeds && typeof wizardPayload.careNeeds === 'object'
      ? (wizardPayload.careNeeds as Record<string, unknown>)
      : {};

  const specificNeeds: string[] = [];
  for (const cat of careCategories) {
    for (const need of asStringArray(careNeeds[cat])) {
      specificNeeds.push(`${labelCareCategory(cat)}: ${need.replace(/_/g, ' ')}`);
    }
  }

  const countryCode = asString(wizardPayload.country);
  const accountType = asString(wizardPayload.careRecipientType);
  const scheduleType = asString(wizardPayload.scheduleType);
  const careLocation = asString(wizardPayload.careLocation);
  const gender = asString(wizardPayload.practitionerGender);
  const planType = asString(wizardPayload.supportPlanType);

  return {
    isFamilyCareseekerSource: hasCareseekerShape,
    accountType: accountType ? ACCOUNT_TYPE_LABELS[accountType] ?? accountType : null,
    country: countryCode ? COUNTRY_LABELS[countryCode] ?? countryCode : null,
    preferredLanguage: asString(wizardPayload.preferredLanguage),
    supportCategories: careCategories.map(labelCareCategory),
    specificNeeds,
    practitionerGender: gender ? GENDER_PREF_LABELS[gender] ?? gender.replace(/_/g, ' ') : null,
    providerLanguages: asStringArray(
      wizardPayload.providerLanguages ?? wizardPayload.languages,
    ),
    careLocation: careLocation
      ? CARE_LOCATION_LABELS[careLocation] ?? careLocation.replace(/_/g, ' ')
      : null,
    address: asString(wizardPayload.address),
    scheduleType: scheduleType
      ? SCHEDULE_LABELS[scheduleType] ?? scheduleType.replace(/_/g, ' ')
      : null,
    preferredDays: asStringArray(wizardPayload.preferredDays),
    preferredTimeSlots: asStringArray(wizardPayload.preferredTimeSlots).map((s) =>
      s.replace(/_/g, ' '),
    ),
    startTiming: asString(wizardPayload.startTiming)?.replace(/_/g, ' ') ?? null,
    ndisPlanType: planType ? PLAN_TYPE_LABELS[planType] ?? planType : null,
    ndisNumber: asString(wizardPayload.ndisNumber),
    planManagerEmail: asString(wizardPayload.planManagerEmail),
  };
}

export function countryToIso2(countryCode: unknown): string {
  if (typeof countryCode !== 'string' || !countryCode) return 'QA';
  return COUNTRY_TO_ISO2[countryCode] ?? countryCode.slice(0, 2).toUpperCase();
}

export function mapCareCategoriesToServices(
  careCategories: unknown,
  careNeeds: unknown,
): ServiceCategory[] {
  const categories = Array.isArray(careCategories) ? (careCategories as string[]) : [];
  const needs = (careNeeds && typeof careNeeds === 'object' ? careNeeds : {}) as Record<
    string,
    string[]
  >;
  const out = new Set<ServiceCategory>();

  for (const cat of categories) {
    const selected = needs[cat] ?? [];
    for (const needId of selected) {
      const mapped = NEED_TO_SERVICE[needId];
      if (mapped) out.add(mapped);
    }
    if (selected.length === 0) {
      const fallback = CATEGORY_TO_SERVICE[cat];
      if (fallback) out.add(fallback);
    }
  }

  return Array.from(out);
}

export function buildReasonForCare(formData: Record<string, unknown>): string {
  const categories = Array.isArray(formData.careCategories)
    ? (formData.careCategories as string[])
    : [];
  const needs = (formData.careNeeds && typeof formData.careNeeds === 'object'
    ? formData.careNeeds
    : {}) as Record<string, string[]>;

  const parts: string[] = [];
  if (categories.length > 0) {
    parts.push(
      `Support requested: ${categories.map((c) => CATEGORY_LABELS[c] ?? c).join(', ')}.`,
    );
  }

  for (const cat of categories) {
    const selected = needs[cat] ?? [];
    if (selected.length > 0) {
      parts.push(`${CATEGORY_LABELS[cat] ?? cat}: ${selected.join(', ')}.`);
    }
  }

  if (formData.scheduleType) {
    parts.push(`Preferred schedule: ${String(formData.scheduleType)}.`);
  }
  if (formData.careLocation) {
    parts.push(`Care location preference: ${String(formData.careLocation)}.`);
  }
  if (formData.practitionerGender) {
    parts.push(`Provider gender preference: ${String(formData.practitionerGender)}.`);
  }
  if (Array.isArray(formData.languages) && formData.languages.length > 0) {
    parts.push(`Provider languages: ${(formData.languages as string[]).join(', ')}.`);
  }

  const text = parts.join(' ').trim();
  return text.length >= 5
    ? text
    : 'Family requested care support via simple onboarding. Clinical details pending coordinator review.';
}

export function derivePatientName(
  formData: Record<string, unknown>,
  userName: string,
): { patientName: string; relationship: string } {
  const type = String(formData.careRecipientType || '');
  if (type === 'myself') {
    return { patientName: userName || 'Care recipient', relationship: 'self' };
  }
  if (type === 'family_member') {
    return {
      patientName: userName ? `${userName}'s family member` : 'Family care recipient',
      relationship: 'family',
    };
  }
  if (type === 'support_coordinator') {
    return {
      patientName: userName ? `${userName}'s client` : 'NDIS participant',
      relationship: 'client',
    };
  }
  return { patientName: userName || 'Care recipient', relationship: 'other' };
}

export function deriveCareUnitName(userName: string, careRecipientType: unknown): string {
  const type = String(careRecipientType || '');
  if (type === 'family_member') {
    return userName ? `${userName}'s Family Care` : 'Family Care Unit';
  }
  return userName ? `${userName}'s Care` : 'Care Unit';
}

export function detectCountryFromTimezone(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (timeZone.includes('Karachi') || timeZone.includes('Pakistan')) return 'PAK';
  if (timeZone.includes('Qatar') || timeZone.includes('Manama')) return 'QAT';
  if (
    timeZone.includes('Riyadh') ||
    timeZone.includes('Saudi') ||
    timeZone.includes('Jeddah')
  ) {
    return 'SAU';
  }
  if (timeZone.includes('Cairo') || timeZone.includes('Egypt')) return 'EGY';
  if (
    timeZone.includes('Australia') ||
    timeZone.includes('Sydney') ||
    timeZone.includes('Melbourne') ||
    timeZone.includes('Brisbane') ||
    timeZone.includes('Perth') ||
    timeZone.includes('Adelaide') ||
    timeZone.includes('Hobart') ||
    timeZone.includes('Darwin')
  ) {
    return 'AUS';
  }
  return 'QAT';
}
