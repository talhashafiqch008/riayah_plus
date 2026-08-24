import { Text, View } from 'react-native';

type Size = 'sm' | 'md';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-green-50', text: 'text-green-600' },
  approved: { bg: 'bg-green-50', text: 'text-green-600' },
  completed: { bg: 'bg-green-50', text: 'text-green-600' },
  checked_in: { bg: 'bg-green-50', text: 'text-green-600' },
  accepted: { bg: 'bg-green-50', text: 'text-green-600' },
  in_progress: { bg: 'bg-teal-50', text: 'text-teal-600' },
  pending: { bg: 'bg-amber-50', text: 'text-amber-500' },
  in_review: { bg: 'bg-amber-50', text: 'text-amber-500' },
  scheduled: { bg: 'bg-amber-50', text: 'text-amber-500' },
  under_review: { bg: 'bg-teal-50', text: 'text-teal-600' },
  submitted_for_approval: { bg: 'bg-teal-50', text: 'text-teal-600' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-600' },
  rejected: { bg: 'bg-red-50', text: 'text-red-600' },
  inactive: { bg: 'bg-red-50', text: 'text-red-600' },
  overdue: { bg: 'bg-red-50', text: 'text-red-600' },
  on_hold: { bg: 'bg-orange-50', text: 'text-orange-600' },
  draft: { bg: 'bg-stone-100', text: 'text-stone-600' },
  intake_submitted: { bg: 'bg-amber-50', text: 'text-amber-600' },
  validated: { bg: 'bg-teal-50', text: 'text-teal-600' },
  closed: { bg: 'bg-stone-100', text: 'text-stone-600' },
  revision_requested: { bg: 'bg-orange-50', text: 'text-orange-600' },
  no_show: { bg: 'bg-orange-50', text: 'text-orange-600' },
  withdrawn: { bg: 'bg-stone-100', text: 'text-stone-600' },
  episode_created: { bg: 'bg-green-50', text: 'text-green-600' },
};

interface StatusBadgeProps {
  status: string;
  size?: Size;
  /** Override the derived text — used for family-facing status language. */
  label?: string;
}

export function StatusBadge({ status, size = 'sm', label: labelOverride }: StatusBadgeProps) {
  const key = status.toLowerCase();
  const style = STATUS_STYLES[key] ?? { bg: 'bg-stone-100', text: 'text-stone-600' };
  const label =
    labelOverride ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <View className={`shrink-0 rounded-full px-2.5 py-1 ${style.bg}`}>
      <Text
        className={`font-medium ${style.text} ${size === 'sm' ? 'text-xs' : 'text-sm'}`}
        numberOfLines={1}
        style={{ includeFontPadding: false }}
      >
        {label}
      </Text>
    </View>
  );
}
