import { Text, View } from 'react-native';

export type ChipTone = 'stone' | 'teal' | 'amber' | 'green' | 'sky' | 'orange' | 'red';

const TONES: Record<ChipTone, { bg: string; text: string }> = {
  stone: { bg: 'bg-stone-100', text: 'text-stone-700' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700' },
  green: { bg: 'bg-green-50', text: 'text-green-700' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
};

interface ChipProps {
  label: string;
  tone?: ChipTone;
  className?: string;
}

export function Chip({ label, tone = 'stone', className = '' }: ChipProps) {
  const style = TONES[tone];
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${style.bg} ${className}`}>
      <Text className={`text-xs font-medium ${style.text}`}>{label}</Text>
    </View>
  );
}
