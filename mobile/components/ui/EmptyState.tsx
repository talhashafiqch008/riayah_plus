import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Ionicons name={icon} size={48} color="#A8A29E" />
      <Text className="mt-4 text-center text-base font-semibold text-stone-900">{title}</Text>
      {subtitle ? (
        <Text className="mt-2 text-center text-sm text-stone-400">{subtitle}</Text>
      ) : null}
      {action ? (
        <View className="mt-6 w-full max-w-xs">
          <Button onPress={action.onPress}>{action.label}</Button>
        </View>
      ) : null}
    </View>
  );
}
