import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useToast } from 'react-native-toast-notifications';
import { Button } from '../../components/ui';
import { apiClient } from '../../lib/api/client';
import { submitFamilyCareRequest } from '../../lib/api/familyOnboarding';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { toastError } from '../../lib/toast';

const CONSENT_META = [
  { id: 'independentProviderAcknowledged' as const, i18nKey: 'independent' as const, required: true },
  { id: 'termsAccepted' as const, i18nKey: 'terms' as const, required: true },
  { id: 'marketingConsentGranted' as const, i18nKey: 'marketing' as const, required: false },
];

const DATA_BADGE_KEYS = ['encrypted', 'withdraw', 'controlAccess', 'pdpl'] as const;

export default function Step5Consent() {
  const { t } = useTranslation('family');
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const setStep = useOnboardingStore((s) => s.setStep);
  const reset = useOnboardingStore((s) => s.reset);
  const clearDraft = useOnboardingStore((s) => s.clearDraft);
  const user = useAuthStore((s) => s.user);
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const isValid = Boolean(data.independentProviderAcknowledged && data.termsAccepted);

  const roleLabel =
    data.careRecipientType === 'family_member'
      ? t('onboarding.accounts.family_member.title')
      : data.careRecipientType === 'myself'
        ? t('onboarding.accounts.myself.title')
        : data.careRecipientType === 'support_coordinator'
          ? t('onboarding.accounts.support_coordinator.title')
          : null;

  const categories = data.careCategories.map((c) => t(`onboarding.categories.${c}.label`));

  const scheduleLabel = data.scheduleType
    ? t(`enums.schedule.${data.scheduleType}`)
    : null;

  const countryDisplay = data.country ? t(`onboarding.countries.${data.country}`) : null;

  const onSubmit = async () => {
    if (!user) {
      toast.show(t('onboarding.mobile.loginRequired'), { type: 'danger' });
      return;
    }
    setSubmitting(true);
    try {
      await submitFamilyCareRequest(data, {
        firstName: user.name?.split(' ')[0] ?? '',
        lastName: user.name?.split(' ').slice(1).join(' ') ?? '',
        email: user.email,
      });
      useAuthStore.getState().setUser({ ...user, careUnitId: user.careUnitId ?? 'pending' });
      try {
        const units = await apiClient.get('/api/care-units');
        const list = (units.data.data ?? units.data) as { id: string }[];
        if (Array.isArray(list) && list[0]?.id) {
          useAuthStore.getState().setUser({ ...user, careUnitId: String(list[0].id) });
        }
      } catch {
        // ignore
      }
      await clearDraft();
      reset();
      toast.show(t('onboarding.mobile.submitSuccessToast'), { type: 'success' });
      router.replace('/(family)');
    } catch (e) {
      toastError(toast, e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['bottom']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-stone-900">{t('onboarding.stepTitles.review')}</Text>
        <Text className="mb-6 mt-1 text-sm text-stone-500">{t('onboarding.reviewHint')}</Text>

        <View className="mb-6 rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            {t('onboarding.requestSummary')}
          </Text>
          {roleLabel ? (
            <Text className="text-sm text-stone-700">
              {t('onboarding.accountLabel')}: <Text className="font-semibold">{roleLabel}</Text>
            </Text>
          ) : null}
          {countryDisplay ? (
            <Text className="text-sm text-stone-700">
              {t('onboarding.locationLabel')}: <Text className="font-semibold">{countryDisplay}</Text>
            </Text>
          ) : null}
          {categories.length > 0 ? (
            <Text className="text-sm text-stone-700">
              {t('onboarding.supportLabel')}:{' '}
              <Text className="font-semibold">{categories.join(', ')}</Text>
            </Text>
          ) : null}
          {scheduleLabel ? (
            <Text className="text-sm text-stone-700">
              {t('onboarding.scheduleLabel')}:{' '}
              <Text className="font-semibold">{scheduleLabel}</Text>
            </Text>
          ) : null}
          <Text className="mt-3 text-xs text-teal-800">{t('onboarding.afterSubmit')}</Text>
        </View>

        <View className="gap-3">
          {CONSENT_META.map((consent) => {
            const checked = Boolean(data[consent.id]);
            return (
              <Pressable
                key={consent.id}
                onPress={() => updateData({ [consent.id]: !checked })}
                className={`flex-row gap-3 rounded-2xl border-2 p-4 ${
                  checked ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={checked ? '#1C1917' : '#D6D3D1'}
                />
                <View className="flex-1">
                  <View className="mb-1 flex-row items-center gap-2">
                    <Text className="font-semibold text-stone-900">
                      {t(`onboarding.consent.${consent.i18nKey}.title`)}
                    </Text>
                    {consent.required ? (
                      <Text className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        {t('onboarding.consent.required')}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-sm text-stone-500">
                    {t(`onboarding.consent.${consent.i18nKey}.description`)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6 rounded-2xl bg-stone-50 p-4">
          <Text className="mb-2 font-semibold text-stone-900">
            {t('onboarding.consent.dataProtection')}
          </Text>
          <Text className="text-xs text-stone-600">
            {DATA_BADGE_KEYS.map((key) => t(`onboarding.consent.${key}`)).join(' · ')}
          </Text>
        </View>
      </ScrollView>
      <View className="flex-row gap-3 border-t border-stone-100 bg-white px-5 py-4">
        <View className="flex-1">
          <Button
            variant="secondary"
            disabled={submitting}
            onPress={() => {
              setStep(4);
              router.back();
            }}
          >
            {t('onboarding.back')}
          </Button>
        </View>
        <View className="flex-[1.4]">
          <Button onPress={onSubmit} disabled={!isValid || submitting} isLoading={submitting}>
            {t('onboarding.finishSubmit')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
