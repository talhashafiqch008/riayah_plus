import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
import { CARE_CATEGORIES } from '../../lib/onboardingOptions';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function Step2CareNeeds() {
  const data = useOnboardingStore((s) => s.data);
  const updateData = useOnboardingStore((s) => s.updateData);
  const setStep = useOnboardingStore((s) => s.setStep);
  const persistDraft = useOnboardingStore((s) => s.persistDraft);
  const [activeDetailId, setActiveDetailId] = useState<string | null>(
    data.careCategories[0] ?? null,
  );

  const selectedCategories = data.careCategories;
  const selectedNeeds = data.careNeeds;

  const toggleCategory = (categoryId: string) => {
    let newCategories: string[];
    const newNeeds = { ...selectedNeeds };

    if (selectedCategories.includes(categoryId)) {
      if (activeDetailId !== categoryId) {
        setActiveDetailId(categoryId);
        return;
      }
      newCategories = selectedCategories.filter((c) => c !== categoryId);
      if (activeDetailId === categoryId) setActiveDetailId(null);
      delete newNeeds[categoryId];
    } else {
      newCategories = [...selectedCategories, categoryId];
      setActiveDetailId(categoryId);
    }
    updateData({ careCategories: newCategories, careNeeds: newNeeds });
  };

  const toggleNeed = (categoryId: string, needId: string) => {
    const categoryNeeds = selectedNeeds[categoryId] || [];
    const next = categoryNeeds.includes(needId)
      ? categoryNeeds.filter((n) => n !== needId)
      : [...categoryNeeds, needId];
    updateData({ careNeeds: { ...selectedNeeds, [categoryId]: next } });
  };

  const isValid = selectedCategories.length > 0;

  const onNext = async () => {
    setStep(3);
    await persistDraft();
    router.push('/(onboarding)/step-3-caregiver');
  };

  const active = CARE_CATEGORIES.find((c) => c.id === activeDetailId);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['bottom']}>
      <ScrollView className="flex-1 px-5 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        <Text className="text-2xl font-bold text-stone-900">What support do you need?</Text>
        <Text className="mb-6 mt-1 text-sm text-stone-500">Select all categories that apply.</Text>

        <View className="flex-row flex-wrap gap-3">
          {CARE_CATEGORIES.map((category) => {
            const isSelected = selectedCategories.includes(category.id);
            const needsCount = (selectedNeeds[category.id] || []).length;
            return (
              <Pressable
                key={category.id}
                onPress={() => toggleCategory(category.id)}
                className={`w-[47%] rounded-2xl border-2 p-4 ${
                  isSelected ? 'border-stone-900 bg-stone-50' : 'border-stone-200 bg-white'
                }`}
              >
                {needsCount > 0 ? (
                  <View className="absolute left-2 top-2 rounded-full bg-teal-600 px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-white">{needsCount} selected</Text>
                  </View>
                ) : null}
                <View
                  className={`mb-2 h-12 w-12 items-center justify-center self-center rounded-full ${
                    isSelected ? 'bg-teal-600' : 'bg-teal-100'
                  }`}
                >
                  <Ionicons
                    name={category.icon}
                    size={24}
                    color={isSelected ? '#fff' : '#0D9488'}
                  />
                </View>
                <Text className="text-center font-semibold text-stone-900">{category.label}</Text>
                <Text className="text-center text-xs text-stone-500">{category.description}</Text>
              </Pressable>
            );
          })}
        </View>

        {active && selectedCategories.includes(active.id) ? (
          <View className="mt-6 rounded-2xl bg-stone-50 p-4 ring-1 ring-stone-200">
            <Text className="mb-3 font-semibold text-stone-900">
              Specific needs for {active.label}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {active.options.map((option) => {
                const selected = (selectedNeeds[active.id] || []).includes(option.id);
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => toggleNeed(active.id, option.id)}
                    className={`w-[47%] rounded-xl border p-3 ${
                      selected ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                    }`}
                  >
                    <Text className="text-sm font-bold text-stone-800">{option.label}</Text>
                    <Text className="text-[10px] text-stone-400">{option.hint}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
      <View className="flex-row gap-3 border-t border-stone-100 bg-white px-5 py-4">
        <View className="flex-1">
          <Button
            variant="secondary"
            onPress={() => {
              setStep(1);
              router.back();
            }}
          >
            Back
          </Button>
        </View>
        <View className="flex-1">
          <Button onPress={onNext} disabled={!isValid}>
            Continue
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
