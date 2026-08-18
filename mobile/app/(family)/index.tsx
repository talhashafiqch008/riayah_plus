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
import { apiClient } from '../../lib/api/client';
import { listAssessments, listEpisodes } from '../../lib/api/care';

type ShellStat = { label: string; value: string };

const PRIMARY_LINKS = [
  {
    name: 'Care request',
    href: '/(onboarding)/step-1-care-unit',
    hint: 'Start or update a request',
    icon: 'clipboard-outline' as const,
  },
  {
    name: 'Care Journey',
    href: '/(family)/episodes',
    hint: 'See where you are',
    icon: 'heart-outline' as const,
  },
  {
    name: 'Appointments',
    href: '/(family)/bookings',
    hint: 'Consultations & bookings',
    icon: 'calendar-outline' as const,
  },
  {
    name: 'Documents',
    href: '/(family)/documents',
    hint: 'Upload or review files',
    icon: 'folder-outline' as const,
  },
] as const;

const LATER_LINKS = [
  {
    name: 'Messages',
    href: '/(family)/messages',
    hint: 'Secure messaging later',
  },
] as const;

async function fetchFamilyShellStats(): Promise<ShellStat[]> {
  const [activeEpisodes, upcomingVisits, unread] = await Promise.all([
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
        const res = await listAssessments({ status: 'scheduled', limit: 50 });
        const now = Date.now();
        return (res.data ?? []).filter((a) => new Date(a.scheduledAt).getTime() >= now).length;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const { data } = await apiClient.get('/api/notifications/unread-count');
        const count = data?.count ?? data?.data?.count ?? 0;
        return typeof count === 'number' ? count : 0;
      } catch {
        return 0;
      }
    })(),
  ]);

  return [
    { label: 'Active care journeys', value: String(activeEpisodes) },
    { label: 'Upcoming appointments', value: String(upcomingVisits) },
    { label: 'Unread alerts', value: String(unread) },
  ];
}

export default function FamilyHomeScreen() {
  const statsQuery = useQuery({
    queryKey: ['family-shell-stats'],
    queryFn: fetchFamilyShellStats,
  });

  const stats = statsQuery.data ?? [
    { label: 'Active care journeys', value: '—' },
    { label: 'Upcoming appointments', value: '—' },
    { label: 'Unread alerts', value: '—' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Family Home"
        showBack={false}
        rightAction={{
          icon: 'notifications-outline',
          onPress: () => router.push('/(family)/notifications'),
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
          <Text className="text-2xl font-semibold text-stone-900">Family Home</Text>
          <Text className="mt-2 text-stone-600">
            Request care, follow your care journey, and stay informed — our care team handles the
            clinical details.
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
            <Text className="mb-2 text-sm text-stone-500">Could not refresh stats</Text>
            <Button size="sm" variant="secondary" onPress={() => void statsQuery.refetch()}>
              Try again
            </Button>
          </View>
        ) : null}

        <View className="mt-8 px-4">
          <Card className="p-5">
            <Text className="mb-1 font-semibold text-stone-900">What you can do</Text>
            <Text className="mb-4 text-sm text-stone-500">
              Request care and stay informed — our care team handles clinical detail.
            </Text>
            <View className="gap-2">
              {PRIMARY_LINKS.map((link) => (
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

            <View className="mt-5 gap-2">
              <Button onPress={() => router.push('/(onboarding)/step-1-care-unit')}>
                Start care request
              </Button>
              <Button variant="secondary" onPress={() => router.push('/(family)/care-unit')}>
                View my care unit
              </Button>
            </View>
          </Card>
        </View>

        <View className="mt-6 px-4">
          <Card className="p-5">
            <Text className="mb-1 font-semibold text-stone-900">Coming later</Text>
            <Text className="mb-4 text-sm text-stone-500">
              These stay in the menu so you know what is ahead — they are not live tools yet.
            </Text>
            {LATER_LINKS.map((link) => (
              <Pressable
                key={link.href}
                onPress={() => router.push(link.href as never)}
                className="mb-2 flex-row items-center justify-between rounded-xl border border-dashed border-stone-200 px-4 py-3"
              >
                <View>
                  <Text className="text-sm font-medium text-stone-600">{link.name}</Text>
                  <Text className="text-xs text-stone-500">{link.hint}</Text>
                </View>
                <View className="rounded-full bg-stone-100 px-2 py-0.5">
                  <Text className="text-[10px] font-semibold uppercase text-stone-500">Soon</Text>
                </View>
              </Pressable>
            ))}
          </Card>
        </View>

        {statsQuery.isLoading && !statsQuery.data ? (
          <ActivityIndicator size="large" color="#0D9488" className="mt-8" />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
