import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Avatar,
  Card,
  EmptyState,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { apiClient } from '../../../lib/api/client';
import { apiErrorMessage, formatDate } from '../../../lib/format';

type UiFilter = 'pending' | 'in_review' | 'approved' | 'rejected' | 'all';

interface IntakeQueueItem {
  id: string;
  status: string;
  urgencyLevel?: string | null;
  reasonForCare?: string | null;
  serviceInterests?: string[];
  submittedAt?: string | null;
  createdAt?: string;
  careUnit?: { id: string; name: string } | null;
  careRecipient?: { id: string; name: string; externalRef?: string | null } | null;
  familyUser?: { id: string; name: string; email: string } | null;
}

interface QueueResponse {
  data: IntakeQueueItem[];
  total: number;
  page: number;
  limit: number;
}

const FILTERS: { key: UiFilter; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_review', label: 'In Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'All' },
];

function apiStatusForFilter(filter: UiFilter): string | undefined {
  switch (filter) {
    case 'pending':
      return 'submitted';
    case 'in_review':
      return 'under_review';
    case 'rejected':
      return 'withdrawn';
    case 'approved':
    case 'all':
      return undefined;
  }
}

function careTypeLabel(item: IntakeQueueItem): string {
  const interests = item.serviceInterests ?? [];
  if (interests.length > 0) {
    return interests
      .slice(0, 2)
      .map((s) => s.replace(/_/g, ' '))
      .join(', ');
  }
  return item.careUnit?.name ?? 'Care request';
}

function isUrgent(level?: string | null): boolean {
  return level === 'urgent' || level === 'high';
}

async function fetchQueue(filter: UiFilter): Promise<QueueResponse> {
  if (filter === 'approved') {
    const [validated, created] = await Promise.all([
      apiClient.get<QueueResponse>('/api/intake/queue', {
        params: { status: 'validated', page: 1, limit: 50 },
      }),
      apiClient.get<QueueResponse>('/api/intake/queue', {
        params: { status: 'episode_created', page: 1, limit: 50 },
      }),
    ]);
    const merged = [...(validated.data.data ?? []), ...(created.data.data ?? [])];
    merged.sort((a, b) => {
      const aTime = new Date(a.submittedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.submittedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
    return {
      data: merged,
      total: (validated.data.total ?? 0) + (created.data.total ?? 0),
      page: 1,
      limit: 50,
    };
  }

  const status = apiStatusForFilter(filter);
  const res = await apiClient.get<QueueResponse>('/api/intake/queue', {
    params: {
      page: 1,
      limit: 50,
      ...(status ? { status } : {}),
    },
  });
  return res.data;
}

export default function CoordinatorIntakeQueueScreen() {
  const [filter, setFilter] = useState<UiFilter>('pending');

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['intake-queue', filter],
    queryFn: () => fetchQueue(filter),
  });

  const items = data?.data ?? [];
  const emptySubtitle = useMemo(() => {
    const label = FILTERS.find((f) => f.key === filter)?.label ?? 'this filter';
    return filter === 'all'
      ? 'No intake requests yet.'
      : `No ${label.toLowerCase()} intakes.`;
  }, [filter]);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Intake Queue" showBack={false} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-12 border-b border-stone-100 bg-white"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`rounded-full border px-3 py-1.5 ${
                active
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-stone-200 bg-white'
              }`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text
                className={`text-sm font-medium ${
                  active ? 'text-teal-700' : 'text-stone-600'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(error)}
          action={{ label: 'Try again', onPress: () => void refetch() }}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ flexGrow: 1, padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={() => void refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="file-tray-outline"
              title="Nothing here"
              subtitle={emptySubtitle}
            />
          }
          renderItem={({ item }) => {
            const patientName = item.careRecipient?.name ?? 'Unknown patient';
            const submitted = item.submittedAt ?? item.createdAt;
            return (
              <Card
                className="mb-3"
                onPress={() => router.push(`/(coordinator)/intake/${item.id}`)}
              >
                <View className="flex-row items-center gap-3">
                  <Avatar name={patientName} size="sm" />
                  <View className="flex-1">
                    <Text className="font-medium text-stone-900" numberOfLines={1}>
                      {patientName}
                    </Text>
                    <Text className="text-sm capitalize text-stone-400" numberOfLines={1}>
                      {careTypeLabel(item)}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                  <Ionicons name="chevron-forward" size={18} color="#A8A29E" />
                </View>
                <View className="mt-2 flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <Ionicons name="calendar-outline" size={14} color="#A8A29E" />
                    <Text className="text-xs text-stone-400">
                      {submitted ? formatDate(submitted) : '—'}
                    </Text>
                  </View>
                  {isUrgent(item.urgencyLevel) ? (
                    <View className="rounded-full bg-amber-50 px-2 py-0.5">
                      <Text className="text-xs font-medium text-amber-600">Urgent</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
