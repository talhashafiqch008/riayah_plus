import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../../components/ui';
import {
  careLocationEnumKey,
  GENDER_OPTIONS,
  LOCATION_OPTIONS,
  PROVIDER_LANG_I18N,
  PROVIDER_LANGUAGES,
} from '../../lib/onboardingOptions';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function Step3Preferences() {
  const { t } = useTranslation('family');
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const setStep = useOnboardingStore((s) => s.setStep);
  const persistDraft = useOnboardingStore((s) => s.persistDraft);

  const toggleLanguage = (lang: string) => {
    const langs = data.languages.includes(lang)
      ? data.languages.filter((l) => l !== lang)
      : [...data.languages, lang];
    updateData({ languages: langs });
  };

  const isValid = Boolean(data.practitionerGender && data.careLocation);

  const onNext = async () => {
    setStep(4);
    await persistDraft();
    router.push('/(onboarding)/step-4-reason');
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['bottom']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-stone-900">{t('onboarding.stepTitles.preferences')}</Text>
        <Text className="mb-6 mt-1 text-sm text-stone-500">{t('onboarding.preferencesHint')}</Text>

        <Text className="mb-2 font-semibold text-stone-900">{t('onboarding.providerGender')}</Text>
        <View className="mb-6 gap-3">
          {GENDER_OPTIONS.map((option) => {
            const selected = data.practitionerGender === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => updateData({ practitionerGender: option.id })}
                className={`rounded-2xl border-2 p-4 ${
                  selected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text className="font-bold text-stone-900">{t(`enums.gender.${option.id}`)}</Text>
                <Text className="text-xs text-stone-400">{t(`enums.genderHint.${option.id}`)}</Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 font-semibold text-stone-900">{t('onboarding.spokenLanguages')}</Text>
        <Text className="mb-2 text-xs uppercase text-stone-400">{t('onboarding.optional')}</Text>
        <View className="mb-6 flex-row flex-wrap gap-2">
          {PROVIDER_LANGUAGES.map((lang) => {
            const selected = data.languages.includes(lang.code);
            const langKey = PROVIDER_LANG_I18N[lang.code];
            const label = langKey ? t(`onboarding.languages.${langKey}`) : lang.code;
            return (
              <Pressable
                key={lang.code}
                onPress={() => toggleLanguage(lang.code)}
                className={`flex-row items-center gap-2 rounded-2xl border-2 px-4 py-3 ${
                  selected ? 'border-teal-500 bg-teal-600' : 'border-stone-200 bg-white'
                }`}
              >
                <Text>{lang.flag}</Text>
                <Text className={`font-medium ${selected ? 'text-white' : 'text-stone-700'}`}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mb-2 font-semibold text-stone-900">{t('onboarding.careLocation')}</Text>
        <View className="mb-4 gap-3">
          {LOCATION_OPTIONS.map((option) => {
            const selected = data.careLocation === option.id;
            const locKey = careLocationEnumKey(option.id);
            return (
              <Pressable
                key={option.id}
                onPress={() => updateData({ careLocation: option.id })}
                className={`rounded-2xl border-2 p-4 ${
                  selected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Ionicons name={option.icon} size={22} color="#0D9488" />
                  <View>
                    <Text className="font-bold text-stone-900">
                      {t(`enums.careLocation.${locKey}`)}
                    </Text>
                    <Text className="text-xs text-stone-500">
                      {t(`enums.careLocationHint.${locKey}`)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {data.careLocation === 'home' ? (
          <Input
            label={t('onboarding.streetAddress')}
            placeholder={t('onboarding.streetAddressPlaceholder')}
            value={data.address}
            onChangeText={(address) => updateData({ address })}
          />
        ) : null}
      </ScrollView>
      <View className="flex-row gap-3 border-t border-stone-100 bg-white px-5 py-4">
        <View className="flex-1">
          <Button
            variant="secondary"
            onPress={() => {
              setStep(2);
              router.back();
            }}
          >
            {t('onboarding.back')}
          </Button>
        </View>
        <View className="flex-1">
          <Button onPress={onNext} disabled={!isValid}>
            {t('onboarding.continue')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
