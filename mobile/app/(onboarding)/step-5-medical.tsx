import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { Button } from '../../components/ui';
import { apiClient } from '../../lib/api/client';
import { submitFamilyCareRequest } from '../../lib/api/familyOnboarding';
import { CATEGORY_LABELS } from '../../lib/familyCareseekerIntake';
import { useAuthStore } from '../../stores/authStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { toastError } from '../../lib/toast';

const CONSENTS = [
  {
    id: 'independentProviderAcknowledged' as const,
    title: 'Independent Providers',
    description:
      'I understand providers on Raiyah Plus operate independently. Raiyah Plus connects you with providers but does not employ them.',
    required: true,
  },
  {
    id: 'termsAccepted' as const,
    title: 'Terms & Privacy',
    description: 'I agree to the Terms of Service and Privacy Policy.',
    required: true,
  },
  {
    id: 'marketingConsentGranted' as const,
    title: 'Updates & Tips',
    description: 'Send me helpful care tips and provider updates. (Optional)',
    required: false,
  },
];

export default function Step5Consent() {
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
      ? 'Family Guardian'
      : data.careRecipientType === 'myself'
        ? 'Individual'
        : data.careRecipientType === 'support_coordinator'
          ? 'Support Coordinator'
          : null;

  const categories = data.careCategories.map((c) => CATEGORY_LABELS[c] ?? c);

  const onSubmit = async () => {
    if (!user) {
      toast.show('Please log in to continue.', { type: 'danger' });
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
      // Re-hydrate care unit id from API
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
      toast.show('Request received — our care team will review it soon.', { type: 'success' });
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
        <Text className="text-2xl font-bold text-stone-900">Review & Confirm</Text>
        <Text className="mb-6 mt-1 text-sm text-stone-500">
          Review your request, then accept the terms to finish.
        </Text>

        <View className="mb-6 rounded-2xl border border-teal-100 bg-teal-50 p-4">
          <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-teal-700">
            Your request summary
          </Text>
          {roleLabel ? (
            <Text className="text-sm text-stone-700">
              Account: <Text className="font-semibold">{roleLabel}</Text>
            </Text>
          ) : null}
          {data.country ? (
            <Text className="text-sm text-stone-700">
              Location: <Text className="font-semibold">{data.country}</Text>
            </Text>
          ) : null}
          {categories.length > 0 ? (
            <Text className="text-sm text-stone-700">
              Support: <Text className="font-semibold">{categories.join(', ')}</Text>
            </Text>
          ) : null}
          {data.scheduleType ? (
            <Text className="text-sm text-stone-700">
              Schedule:{' '}
              <Text className="font-semibold">{data.scheduleType.replace(/_/g, ' ')}</Text>
            </Text>
          ) : null}
          <Text className="mt-3 text-xs text-teal-800">
            After you submit, our care team will review your request before your consultation.
          </Text>
        </View>

        <View className="gap-3">
          {CONSENTS.map((consent) => {
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
                    <Text className="font-semibold text-stone-900">{consent.title}</Text>
                    {consent.required ? (
                      <Text className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                        Required
                      </Text>
                    ) : null}
                  </View>
                  <Text className="text-sm text-stone-500">{consent.description}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6 rounded-2xl bg-stone-50 p-4">
          <Text className="mb-2 font-semibold text-stone-900">Your Data Protection</Text>
          <Text className="text-xs text-stone-600">
            Encrypted & secure · Withdraw anytime · You control access · PDPL compliant
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
            Back
          </Button>
        </View>
        <View className="flex-[1.4]">
          <Button onPress={onSubmit} disabled={!isValid || submitting} isLoading={submitting}>
            Finish & Submit Request
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
