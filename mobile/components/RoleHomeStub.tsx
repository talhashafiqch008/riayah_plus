import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, EmptyState, ScreenHeader } from './ui';
import { useAuthStore } from '../stores/authStore';

interface RoleHomeStubProps {
  title: string;
  stats?: { label: string; value: string }[];
}

export function RoleHomeStub({ title, stats }: RoleHomeStubProps) {
  const name = useAuthStore((s) => s.user?.name ?? 'there');
  const defaults = stats ?? [
    { label: 'Today', value: '—' },
    { label: 'This week', value: '—' },
    { label: 'Alerts', value: '—' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={title} showBack={false} />
      <View className="flex-1 px-4 pt-4">
        <Text className="mb-4 text-base text-stone-700">
          Hello, <Text className="font-semibold text-stone-900">{name}</Text>
        </Text>
        <View className="mb-4 flex-row gap-3">
          {defaults.map((s) => (
            <Card key={s.label} className="flex-1 items-center py-3" shadow={false}>
              <Text className="text-lg font-bold text-teal-600">{s.value}</Text>
              <Text className="text-xs text-stone-400">{s.label}</Text>
            </Card>
          ))}
        </View>
        <EmptyState
          icon="construct-outline"
          title="Phase 1 shell"
          subtitle="Live data and full workflows land in Phase 2+. Navigation and auth are ready."
        />
      </View>
    </SafeAreaView>
  );
}
