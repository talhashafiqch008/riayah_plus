import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ScreenHeader } from '../../components/ui';
import { getShiftHistory, listMyTasks } from '../../lib/api/shifts';
import { apiErrorMessage } from '../../lib/format';

type ShellStat = { label: string; value: string };

const NEXT_STEPS = [
  'Check in to your next visit',
  'Complete assigned tasks',
  'Submit shift notes after visits',
];

const QUICK_LINKS = [
  {
    name: 'Visits',
    href: '/(support)/visits',
    hint: 'GPS check-in at the patient address',
    icon: 'location-outline' as const,
  },
  {
    name: 'My Shifts',
    href: '/(support)/shifts',
    hint: 'Start or end your shift',
    icon: 'time-outline' as const,
  },
  {
    name: 'Tasks',
    href: '/(support)/tasks',
    hint: 'Complete assigned care tasks',
    icon: 'checkmark-circle-outline' as const,
  },
] as const;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfWeek(d = new Date()) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

function endOfWeek(d = new Date()) {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 7);
  return x;
}

async function fetchSupportStats(): Promise<ShellStat[]> {
  const [shiftsThisWeek, openTasks] = await Promise.all([
    (async () => {
      try {
        const rows = await getShiftHistory();
        const from = startOfWeek().getTime();
        const to = endOfWeek().getTime();
        return rows.filter((s) => {
          const t = new Date(s.startedAt ?? s.createdAt ?? 0).getTime();
          return t >= from && t < to;
        }).length;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const res = await listMyTasks({ status: 'pending', limit: 1 });
        return res.meta?.total ?? res.data.length;
      } catch {
        return 0;
      }
    })(),
  ]);

  return [
    { label: 'Shifts this week', value: String(shiftsThisWeek) },
    { label: 'Open tasks', value: String(openTasks) },
    { label: 'Notes pending', value: '0' },
  ];
}

export default function SupportHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['support-shell-stats'],
    queryFn: fetchSupportStats,
  });

  const stats = statsQuery.data ?? [
    { label: 'Shifts this week', value: '—' },
    { label: 'Open tasks', value: '—' },
    { label: 'Notes pending', value: '—' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Support Worker"
        showBack={false}
        rightAction={
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => router.push('/(support)/notifications')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color="#1C1917" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(support)/more')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="More"
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#1C1917" />
            </Pressable>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={statsQuery.isFetching}
            onRefresh={() => void statsQuery.refetch()}
            tintColor="#0D9488"
          />
        }
      >
        <View className="px-4 pt-2">
          <Text className="text-2xl font-semibold text-stone-900">Support Worker Dashboard</Text>
          <Text className="mt-2 text-stone-600">
            View assigned shifts and tasks, document visits, and stay connected with your care team.
          </Text>
        </View>

        <View className="mt-6 flex-row gap-3 px-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="flex-1 p-4">
              <Text className="text-xs text-stone-500">{stat.label}</Text>
              <Text className="mt-1 text-2xl font-semibold text-stone-900">
                {statsQuery.isLoading && !statsQuery.data ? '…' : stat.value}
              </Text>
            </Card>
          ))}
        </View>

        {statsQuery.isError ? (
          <View className="mt-4 items-center px-4">
            <Text className="mb-2 text-center text-sm text-stone-500">
              {apiErrorMessage(statsQuery.error, 'Could not refresh stats')}
            </Text>
            <Button size="sm" variant="secondary" onPress={() => void statsQuery.refetch()}>
              Try again
            </Button>
          </View>
        ) : null}

        <View className="mt-8 px-4">
          <Card className="p-5">
            <Text className="mb-4 font-semibold text-stone-900">Suggested next steps</Text>
            <View className="gap-3">
              {NEXT_STEPS.map((step) => (
                <View key={step} className="flex-row items-start gap-2">
                  <Ionicons name="arrow-forward" size={16} color="#0D9488" />
                  <Text className="flex-1 text-sm text-stone-600">{step}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <View className="mt-6 px-4">
          <Card className="p-5">
            <Text className="mb-4 font-semibold text-stone-900">Quick links</Text>
            <View className="gap-2">
              {QUICK_LINKS.map((link) => (
                <Pressable
                  key={link.href}
                  onPress={() => router.push(link.href as never)}
                  className="flex-row items-center justify-between rounded-xl border border-stone-100 px-4 py-3"
                >
                  <View className="flex-row items-center gap-3 flex-1">
                    <Ionicons name={link.icon} size={20} color="#0D9488" />
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-stone-800">{link.name}</Text>
                      <Text className="text-xs text-stone-500">{link.hint}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#0D9488" />
                </Pressable>
              ))}
            </View>
          </Card>
        </View>

        {statsQuery.isLoading && !statsQuery.data ? (
          <ActivityIndicator size="large" color="#0D9488" className="mt-8" />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
