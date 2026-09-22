import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { DAYS_OF_WEEK, FREQUENCY_OPTIONS, TIME_SLOTS } from '../../lib/onboardingOptions';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function Step4Schedule() {
  const { t } = useTranslation('family');
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const setStep = useOnboardingStore((s) => s.setStep);
  const persistDraft = useOnboardingStore((s) => s.persistDraft);

  const toggleDay = (dayId: string) => {
    const preferredDays = data.preferredDays.includes(dayId)
      ? data.preferredDays.filter((d) => d !== dayId)
      : [...data.preferredDays, dayId];
    updateData({ preferredDays });
  };

  const toggleTimeSlot = (slotId: string) => {
    const preferredTimeSlots = data.preferredTimeSlots.includes(slotId)
      ? data.preferredTimeSlots.filter((s) => s !== slotId)
      : [...data.preferredTimeSlots, slotId];
    updateData({ preferredTimeSlots, isCustomTime: false });
  };

  const isValid = Boolean(data.scheduleType);

  const onNext = async () => {
    setStep(5);
    await persistDraft();
    router.push('/(onboarding)/step-5-medical');
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['bottom']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-stone-900">{t('onboarding.stepTitles.whenCare')}</Text>
        <Text className="mb-6 mt-1 text-sm text-stone-500">{t('onboarding.scheduleHint')}</Text>

        <Text className="mb-2 font-semibold text-stone-900">{t('onboarding.howOften')}</Text>
        <View className="mb-6 gap-3">
          {FREQUENCY_OPTIONS.map((option) => {
            const selected = data.scheduleType === option.id;
            return (
              <Pressable
                key={option.id}
                onPress={() => updateData({ scheduleType: option.id })}
                className={`rounded-2xl border-2 p-4 ${
                  selected ? 'border-teal-500 bg-teal-600' : 'border-stone-200 bg-white'
                }`}
              >
                <Text className={`text-lg font-bold ${selected ? 'text-white' : 'text-stone-900'}`}>
                  {t(`enums.schedule.${option.id}`)}
                </Text>
                <Text className={`text-xs ${selected ? 'text-teal-100' : 'text-stone-500'}`}>
                  {t(`enums.scheduleHint.${option.id}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {data.scheduleType && data.scheduleType !== 'one_time' ? (
          <View className="mb-6">
            <Text className="mb-2 font-semibold text-stone-900">{t('onboarding.whichDays')}</Text>
            <View className="flex-row justify-between">
              {DAYS_OF_WEEK.map((day) => {
                const selected = data.preferredDays.includes(day.id);
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => toggleDay(day.id)}
                    className={`h-12 w-10 items-center justify-center rounded-2xl border-2 ${
                      selected ? 'border-teal-500 bg-teal-600' : 'border-stone-200 bg-white'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${selected ? 'text-white' : 'text-stone-400'}`}
                    >
                      {t(`enums.day.${day.id}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text className="mb-2 font-semibold text-stone-900">{t('onboarding.whatTimes')}</Text>
        <View className="mb-4 flex-row flex-wrap gap-3">
          {TIME_SLOTS.map((slot) => {
            const selected = data.preferredTimeSlots.includes(slot.id) && !data.isCustomTime;
            return (
              <Pressable
                key={slot.id}
                onPress={() => toggleTimeSlot(slot.id)}
                className={`w-[47%] flex-row items-center gap-2 rounded-2xl border-2 p-3 ${
                  selected ? 'border-teal-500 bg-teal-600' : 'border-stone-200 bg-white'
                }`}
              >
                <Ionicons name={slot.icon} size={18} color={selected ? '#fff' : '#A8A29E'} />
                <View>
                  <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-stone-900'}`}>
                    {t(`enums.time.${slot.id}`)}
                  </Text>
                  <Text className={`text-[10px] ${selected ? 'text-teal-100' : 'text-stone-400'}`}>
                    {t(`onboarding.mobile.timeRange.${slot.id}`)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() =>
            updateData({
              isCustomTime: !data.isCustomTime,
              preferredTimeSlots: !data.isCustomTime ? [] : data.preferredTimeSlots,
            })
          }
          className={`mb-3 rounded-2xl border-2 p-4 ${
            data.isCustomTime ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white'
          }`}
        >
          <Text className="font-bold text-stone-900">{t('onboarding.customHours')}</Text>
          <Text className="text-xs text-stone-500">{t('onboarding.customHoursHint')}</Text>
        </Pressable>

        {data.isCustomTime ? (
          <View className="gap-3 rounded-2xl bg-stone-50 p-4">
            <Text className="text-xs font-bold uppercase text-stone-500">
              {t('onboarding.mobile.startTimeHm')}
            </Text>
            <TextInput
              className="rounded-xl border border-stone-200 bg-white px-3 py-3 font-bold text-stone-900"
              placeholder="09:00"
              value={data.customStartTime}
              onChangeText={(customStartTime) => updateData({ customStartTime })}
            />
            <Text className="text-xs font-bold uppercase text-stone-500">
              {t('onboarding.mobile.endTimeHm')}
            </Text>
            <TextInput
              className="rounded-xl border border-stone-200 bg-white px-3 py-3 font-bold text-stone-900"
              placeholder="17:00"
              value={data.customEndTime}
              onChangeText={(customEndTime) => updateData({ customEndTime })}
            />
          </View>
        ) : null}
      </ScrollView>
      <View className="flex-row gap-3 border-t border-stone-100 bg-white px-5 py-4">
        <View className="flex-1">
          <Button
            variant="secondary"
            onPress={() => {
              setStep(3);
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
