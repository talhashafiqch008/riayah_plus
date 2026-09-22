import { Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { ONBOARDING_STEP_KEYS } from '../../lib/onboardingOptions';
import { FAMILY_ROLES } from '../../stores/authStore';
import { TOTAL_STEPS, useOnboardingStore } from '../../stores/onboardingStore';

export default function OnboardingLayout() {
  const { t } = useTranslation('family');
  const step = useOnboardingStore((s) => s.currentStep);
  const clamped = Math.min(Math.max(step, 1), TOTAL_STEPS);
  const progress = clamped / TOTAL_STEPS;
  const stepKey = ONBOARDING_STEP_KEYS[clamped - 1];
  const label = stepKey ? t(`onboarding.steps.${stepKey}`) : t('nav.onboarding');

  return (
    <RequireAuth roles={FAMILY_ROLES}>
      <View className="flex-1 bg-stone-50">
        <View className="border-b border-stone-100 bg-white px-4 pb-3 pt-12">
          <Text className="mb-1 text-sm font-medium text-stone-600">
            {t('onboarding.stepOf', { current: clamped, total: TOTAL_STEPS })} · {label}
          </Text>
          <View className="h-2 overflow-hidden rounded-full bg-stone-100">
            <View className="h-full bg-teal-600" style={{ width: `${progress * 100}%` }} />
          </View>
        </View>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: step > 1,
          }}
        />
      </View>
    </RequireAuth>
  );
}
