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
import { listAssessments } from '../../lib/api/assessments';
import { apiErrorMessage } from '../../lib/format';

type ShellStat = { label: string; value: string };

const NEXT_STEPS = [
  'Review today’s schedule',
  'Complete session notes',
  'Update patient assessments',
];

const QUICK_LINKS = [
  {
    name: 'Schedule',
    href: '/(clinical)/schedule',
    hint: 'Assessments assigned to you',
    icon: 'calendar-outline' as const,
  },
  {
    name: 'Patients',
    href: '/(clinical)/patients',
    hint: 'Care episodes in your organization',
    icon: 'people-outline' as const,
  },
  {
    name: 'Session Notes',
    href: '/(clinical)/notes',
    hint: 'Document visits',
    icon: 'medkit-outline' as const,
  },
] as const;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isSameDay(iso: string, day: Date) {
  const t = new Date(iso).getTime();
  return t >= startOfDay(day).getTime() && t <= endOfDay(day).getTime();
}

async function fetchClinicalStats(): Promise<ShellStat[]> {
  const scheduled = await listAssessments({ status: 'scheduled', limit: 100 }).catch(() => ({
    data: [] as Awaited<ReturnType<typeof listAssessments>>['data'],
    total: 0,
  }));
  const rows = scheduled.data ?? [];
  const now = new Date();
  const todaySessions = rows.filter((a) => isSameDay(a.scheduledAt, now)).length;
  const assignedPatients = new Set(rows.map((a) => a.patientId).filter(Boolean)).size;
  const notesDue = rows.filter((a) => new Date(a.scheduledAt).getTime() < now.getTime()).length;

  return [
    { label: "Today's sessions", value: String(todaySessions) },
    { label: 'Assigned patients', value: String(assignedPatients) },
    { label: 'Notes due', value: String(notesDue) },
  ];
}

export default function ClinicalHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['clinical-shell-stats'],
    queryFn: fetchClinicalStats,
  });

  const stats = statsQuery.data ?? [
    { label: "Today's sessions", value: '—' },
    { label: 'Assigned patients', value: '—' },
    { label: 'Notes due', value: '—' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Clinical"
        showBack={false}
        rightAction={
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => router.push('/(clinical)/notifications')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={22} color="#1C1917" />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(clinical)/more')}
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
          <Text className="text-2xl font-semibold text-stone-900">Clinical Dashboard</Text>
          <Text className="mt-2 text-stone-600">
            Your daily clinical workspace — schedule, assigned patients, and session documentation.
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
