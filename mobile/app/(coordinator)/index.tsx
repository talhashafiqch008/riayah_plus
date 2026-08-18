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
import { listCarePlans, listEpisodes, listIntakeQueue } from '../../lib/api/care';
import { apiErrorMessage } from '../../lib/format';

type ShellStat = { label: string; value: string };

const NEXT_STEPS = [
  'Review new intake requests',
  'Request missing documents from families',
  'Schedule consultations after episode creation',
  'Escalate urgency when clinically indicated',
];

const QUICK_LINKS = [
  {
    name: 'Intake Queue',
    href: '/(coordinator)/intake',
    hint: 'Review submitted requests',
    icon: 'document-text-outline' as const,
  },
  {
    name: 'Patients',
    href: '/(coordinator)/patients',
    hint: 'Care units in your organization',
    icon: 'people-outline' as const,
  },
  {
    name: 'Episodes',
    href: '/(coordinator)/episodes',
    hint: 'Advance status and schedule',
    icon: 'heart-outline' as const,
  },
  {
    name: 'Care Plans',
    href: '/(coordinator)/plans',
    hint: 'Build and submit plans',
    icon: 'clipboard-outline' as const,
  },
] as const;

async function fetchCoordinatorStats(): Promise<ShellStat[]> {
  const [submitted, underReview, activeEpisodes, plansAwaiting] = await Promise.all([
    (async () => {
      try {
        const res = await listIntakeQueue({ status: 'submitted', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const res = await listIntakeQueue({ status: 'under_review', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const res = await listEpisodes({ status: 'active', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const plans = await listCarePlans();
        return plans.filter(
          (p) => p.status === 'submitted_for_approval' || p.status === 'revision_requested',
        ).length;
      } catch {
        return 0;
      }
    })(),
  ]);

  return [
    { label: 'Pending intake', value: String(submitted + underReview) },
    { label: 'Active episodes', value: String(activeEpisodes) },
    { label: 'Plans awaiting review', value: String(plansAwaiting) },
  ];
}

export default function CoordinatorHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['coordinator-shell-stats'],
    queryFn: fetchCoordinatorStats,
  });

  const stats = statsQuery.data ?? [
    { label: 'Pending intake', value: '—' },
    { label: 'Active episodes', value: '—' },
    { label: 'Plans awaiting review', value: '—' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Coordinator"
        showBack={false}
        rightAction={{
          icon: 'notifications-outline',
          onPress: () => router.push('/(coordinator)/notifications'),
        }}
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
          <Text className="text-2xl font-semibold text-stone-900">Coordinator Dashboard</Text>
          <Text className="mt-2 text-stone-600">
            Review intake submissions, assign clinicians, and manage care episodes for your panel.
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
            <View className="mt-5">
              <Button onPress={() => router.push('/(coordinator)/intake')}>Open intake queue</Button>
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
