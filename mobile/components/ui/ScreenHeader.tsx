import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';

interface Action {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: Action;
  rightAction?: Action | ReactNode;
  showBack?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  leftAction,
  rightAction,
  showBack,
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();
  const shouldBack = showBack ?? canGoBack;

  const left = leftAction ?? (shouldBack
    ? { icon: 'chevron-back' as const, onPress: () => router.back() }
    : undefined);

  return (
    <View className="h-14 flex-row items-center border-b border-stone-100 bg-white px-3">
      <View className="w-10 items-start">
        {left ? (
          <Pressable
            onPress={left.onPress}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name={left.icon} size={24} color="#1C1917" />
          </Pressable>
        ) : null}
      </View>
      <View className="flex-1 items-center">
        <Text className="text-lg font-semibold text-stone-900" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-stone-500" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="w-10 items-end">
        {rightAction && typeof rightAction === 'object' && 'icon' in rightAction ? (
          <Pressable onPress={rightAction.onPress} hitSlop={12} accessibilityRole="button">
            <Ionicons name={rightAction.icon} size={22} color="#1C1917" />
          </Pressable>
        ) : (
          (rightAction as ReactNode) ?? null
        )}
      </View>
    </View>
  );
}
