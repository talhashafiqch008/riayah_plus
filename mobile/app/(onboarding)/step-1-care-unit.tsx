import { useEffect } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { detectCountryFromTimezone } from '../../lib/familyCareseekerIntake';
import { ACCOUNT_TYPES, COUNTRIES, PREFERRED_LANGUAGES } from '../../lib/onboardingOptions';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function Step1Location() {
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const setStep = useOnboardingStore((s) => s.setStep);
  const hydrateDraft = useOnboardingStore((s) => s.hydrateDraft);
  const persistDraft = useOnboardingStore((s) => s.persistDraft);
  const draftHydrated = useOnboardingStore((s) => s.draftHydrated);

  useEffect(() => {
    void hydrateDraft();
  }, [hydrateDraft]);

  useEffect(() => {
    if (!draftHydrated) return;
    if (data.countryManual) return;
    const detected = detectCountryFromTimezone();
    if (data.country !== detected) updateData({ country: detected });
  }, [draftHydrated, data.countryManual, data.country, updateData]);

  const visibleTypes = ACCOUNT_TYPES.filter((t) =>
    t.id === 'support_coordinator' ? data.country === 'AUS' : true,
  );

  const isValid = Boolean(data.country && data.preferredLanguage && data.careRecipientType);
  const selectedCountry = COUNTRIES.find((c) => c.code === data.country) ?? COUNTRIES[0];

  const onNext = async () => {
    setStep(2);
    await persistDraft();
    router.push('/(onboarding)/step-2-patient');
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['bottom']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-stone-900">Where are you?</Text>
        <Text className="mb-6 mt-1 text-sm text-stone-500">
          Location, language, and who needs care.
        </Text>

        <Text className="mb-2 text-sm font-semibold text-stone-900">Location</Text>
        <View className="mb-4 rounded-2xl border-2 border-teal-500 bg-teal-50 p-4">
          <Text className="text-2xl">
            {selectedCountry.flag}{' '}
            <Text className="text-base font-bold uppercase text-stone-900">
              {selectedCountry.label}
            </Text>
          </Text>
          <Text className="mt-1 text-xs text-stone-500">Detected from your device — tap to change</Text>
        </View>
        <View className="mb-6 flex-row flex-wrap gap-2">
          {COUNTRIES.map((c) => {
            const selected = data.country === c.code;
            return (
              <Pressable
                key={c.code}
                onPress={() => {
                  const patch: { country: string; countryManual: boolean; careRecipientType?: string } = {
                    country: c.code,
                    countryManual: true,
                  };
                  if (c.code !== 'AUS' && data.careRecipientType === 'support_coordinator') {
                    patch.careRecipientType = '';
                  }
                  updateData(patch);
                }}
                className={`rounded-xl border-2 px-3 py-2 ${
                  selected ? 'border-teal-600 bg-teal-600' : 'border-stone-200 bg-white'
                }`}
              >
                <Text className={selected ? 'text-white' : 'text-stone-700'}>
                  {c.flag} {c.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 text-sm font-semibold text-stone-900">Language</Text>
        <View className="mb-6 flex-row flex-wrap gap-2">
          {PREFERRED_LANGUAGES.map((lang) => {
            const selected = data.preferredLanguage === lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => updateData({ preferredLanguage: lang.code })}
                className={`rounded-xl border-2 px-4 py-2 ${
                  selected ? 'border-teal-500 bg-teal-600' : 'border-stone-200 bg-white'
                }`}
              >
                <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-stone-700'}`}>
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-1 text-xl font-semibold text-stone-900">Who needs care?</Text>
        <Text className="mb-4 text-sm text-stone-500">Select the type of account.</Text>
        <View className="gap-3">
          {visibleTypes.map((type) => {
            const selected = data.careRecipientType === type.id;
            return (
              <Pressable
                key={type.id}
                onPress={() => updateData({ careRecipientType: type.id })}
                className={`rounded-2xl border-2 p-4 ${
                  selected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white'
                }`}
              >
                <View className="mb-2 flex-row items-center gap-3">
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-2xl ${
                      selected ? 'bg-teal-600' : 'bg-teal-100'
                    }`}
                  >
                    <Ionicons
                      name={type.icon}
                      size={24}
                      color={selected ? '#fff' : '#0D9488'}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold uppercase text-stone-400">{type.subtitle}</Text>
                    <Text className="text-lg font-semibold text-stone-900">{type.title}</Text>
                  </View>
                  {selected ? <Ionicons name="checkmark" size={22} color="#1C1917" /> : null}
                </View>
                <Text className="text-sm text-stone-500">{type.description}</Text>
                {type.details.map((line) => (
                  <Text key={line} className="mt-1 text-xs text-stone-500">
                    • {line}
                  </Text>
                ))}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View className="border-t border-stone-100 bg-white px-5 py-4">
        <Button onPress={onNext} disabled={!isValid}>
          Continue
        </Button>
      </View>
    </SafeAreaView>
  );
}
