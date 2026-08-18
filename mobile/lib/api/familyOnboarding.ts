import { apiClient } from './client';
import {
  PENDING_DIAGNOSIS,
  buildReasonForCare,
  countryToIso2,
  deriveCareUnitName,
  derivePatientName,
  mapCareCategoriesToServices,
} from '../familyCareseekerIntake';
import type { OnboardingFormData } from '../../stores/onboardingStore';

function unwrap<T>(payload: { data?: T } | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload && (payload as { data?: T }).data != null) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export function buildWizardProfilePayload(form: OnboardingFormData, user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return {
    country: form.country,
    preferredLanguage: form.preferredLanguage,
    careRecipientType: form.careRecipientType,
    careCategories: form.careCategories,
    careNeeds: form.careNeeds,
    practitionerGender: form.practitionerGender,
    providerLanguages: form.languages,
    languages: form.languages,
    careLocation: form.careLocation,
    address: form.address,
    scheduleType: form.scheduleType,
    preferredDays: form.preferredDays,
    preferredTimeSlots: form.isCustomTime
      ? [
          form.customStartTime && form.customEndTime
            ? `${form.customStartTime}-${form.customEndTime}`
            : 'custom',
        ].filter(Boolean)
      : form.preferredTimeSlots,
    startTiming: form.startTiming || undefined,
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    independentProviderAcknowledged: form.independentProviderAcknowledged,
    termsAccepted: form.termsAccepted,
    marketingConsentGranted: form.marketingConsentGranted,
    onboardingComplete: true,
  };
}

/** Same side-effects as mern/client CareOnboardingWizard.submitFamilyIntake */
export async function submitFamilyCareRequest(
  form: OnboardingFormData,
  user: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
  },
) {
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || 'Family user';

  const unitsRes = await apiClient.get('/api/care-units').catch(() => ({ data: { data: [] } }));
  const unitsRaw = unitsRes.data?.data ?? unitsRes.data;
  const units = Array.isArray(unitsRaw) ? unitsRaw : [];
  let careUnitId = units[0]?.id as string | undefined;

  const unitName = deriveCareUnitName(displayName, form.careRecipientType);
  const country = countryToIso2(form.country);
  const address = form.address.trim() || undefined;

  if (careUnitId) {
    await apiClient.patch(`/api/care-units/${careUnitId}`, {
      name: unitName,
      address,
      country,
      primaryCaregiverName: displayName,
    });
  } else {
    const created = await apiClient.post('/api/care-units', {
      name: unitName,
      address,
      country,
      primaryCaregiverName: displayName,
    });
    const unit = unwrap<{ id: string }>(created.data);
    careUnitId = unit.id;
  }

  const { patientName, relationship } = derivePatientName(form, displayName);
  const patientRes = await apiClient.post(`/api/care-units/${careUnitId}/patients`, {
    name: patientName,
    relationship,
    pocName: displayName,
    notes: 'Created from family simple onboarding. Clinical details pending coordinator review.',
  });
  const patient = unwrap<{ id: string }>(patientRes.data);

  const serviceInterests = mapCareCategoriesToServices(form.careCategories, form.careNeeds);
  const reasonForCare = buildReasonForCare(form as unknown as Record<string, unknown>);
  const consented = Boolean(form.termsAccepted && form.independentProviderAcknowledged);
  const profile = buildWizardProfilePayload(form, user);

  await apiClient.post('/api/intake', {
    careUnitId,
    careRecipientId: patient.id,
    reasonForCare,
    diagnoses: [PENDING_DIAGNOSIS],
    serviceInterests:
      serviceInterests.length > 0 ? serviceInterests : (['companion_care'] as const),
    urgencyLevel: 'medium',
    primaryCaregiverName: displayName,
    wizardPayload: {
      source: 'family_careseeker_onboarding',
      steps: ['Location', 'Support', 'Preferences', 'Schedule', 'Account', 'Confirm'],
      ...profile,
    },
    privacyConsent: consented,
    treatmentConsent: consented,
  });

  try {
    await apiClient.post('/api/client-onboarding/complete', {});
  } catch {
    // Some tenants may not expose this route; intake is the critical path.
  }

  return { careUnitId, careRecipientId: patient.id };
}
