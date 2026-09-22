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
import { useTranslation } from 'react-i18next';
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
import { navForwardIcon } from '../../../lib/rtlIcons';

type UiFilter = 'pending' | 'in_review' | 'approved' | 'rejected' | 'all';
type UrgencyFilter = '' | 'urgent' | 'high' | 'medium' | 'low';

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

function careTypeLabel(
  item: IntakeQueueItem,
  careRequestLabel: string,
  formatService: (serviceId: string) => string,
): string {
  const interests = item.serviceInterests ?? [];
  if (interests.length > 0) {
    return interests.slice(0, 2).map(formatService).join(', ');
  }
  return item.careUnit?.name ?? careRequestLabel;
}

function intakeStatusLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  status: string,
) {
  return t(`intake.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
}

function isUrgent(level?: string | null): boolean {
  return level === 'urgent' || level === 'high';
}

async function fetchQueue(filter: UiFilter, urgency: UrgencyFilter): Promise<QueueResponse> {
  const urgencyParam = urgency || undefined;

  if (filter === 'approved') {
    const [validated, created] = await Promise.all([
      apiClient.get<QueueResponse>('/api/intake/queue', {
        params: { status: 'validated', page: 1, limit: 50, ...(urgencyParam ? { urgency: urgencyParam } : {}) },
      }),
      apiClient.get<QueueResponse>('/api/intake/queue', {
        params: {
          status: 'episode_created',
          page: 1,
          limit: 50,
          ...(urgencyParam ? { urgency: urgencyParam } : {}),
        },
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
      ...(urgencyParam ? { urgency: urgencyParam } : {}),
    },
  });
  return res.data;
}

export default function CoordinatorIntakeQueueScreen() {
  const { t } = useTranslation('coordinator');
  const [filter, setFilter] = useState<UiFilter>('pending');
  const [urgency, setUrgency] = useState<UrgencyFilter>('');

  const filters = useMemo(
    () =>
      [
        { key: 'pending' as const, label: t('mobile.detail.filterPending') },
        { key: 'in_review' as const, label: t('mobile.detail.filterInReview') },
        { key: 'approved' as const, label: t('mobile.detail.filterApproved') },
        { key: 'rejected' as const, label: t('mobile.detail.filterRejected') },
        { key: 'all' as const, label: t('common.all') },
      ] as const,
    [t],
  );

  const urgencyFilters = useMemo(
    () =>
      [
        { key: '' as UrgencyFilter, label: t('intake.allUrgency') },
        { key: 'urgent' as UrgencyFilter, label: t('intake.urgency.urgent') },
        { key: 'high' as UrgencyFilter, label: t('intake.urgency.high') },
        { key: 'medium' as UrgencyFilter, label: t('intake.urgency.medium') },
        { key: 'low' as UrgencyFilter, label: t('intake.urgency.low') },
      ] as const,
    [t],
  );

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['intake-queue', filter, urgency],
    queryFn: () => fetchQueue(filter, urgency),
  });

  const items = data?.data ?? [];
  const emptySubtitle = useMemo(() => {
    if (filter === 'all') {
      return t('mobile.detail.intakeEmptyAll');
    }
    const label = filters.find((f) => f.key === filter)?.label ?? '';
    return t('mobile.detail.intakeEmptyFilter', { filter: label.toLowerCase() });
  }, [filter, filters, t]);

  const careRequestLabel = t('mobile.detail.careRequest');
  const formatService = (serviceId: string) =>
    t(`intake.services.${serviceId}`, { defaultValue: serviceId.replace(/_/g, ' ') });
  const forwardIcon = navForwardIcon();

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={t('intake.title')}
        subtitle={t('mobile.detail.intakeListSubtitle')}
        showBack={false}
      />

      <View className="border-b border-stone-200 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            gap: 8,
          }}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ flexShrink: 0 }}
                className={`rounded-full border px-4 py-2 ${
                  active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${active ? 'font-semibold text-teal-700' : 'text-stone-600'}`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingBottom: 12,
            gap: 8,
          }}
        >
          {urgencyFilters.map((f) => {
            const active = urgency === f.key;
            return (
              <Pressable
                key={f.key || 'all-urgency'}
                onPress={() => setUrgency(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ flexShrink: 0 }}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-amber-500 bg-amber-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text
                  className={`text-xs ${active ? 'font-semibold text-amber-700' : 'text-stone-500'}`}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading && items.length === 0 ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('common.failedLoad')}
          subtitle={apiErrorMessage(error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void refetch() }}
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
            <EmptyState icon="file-tray-outline" title={t('common.empty')} subtitle={emptySubtitle} />
          }
          renderItem={({ item }) => {
            const patientName = item.careRecipient?.name ?? t('patientDetail.unknown');
            const submitted = item.submittedAt ?? item.createdAt;
            return (
              <Card
                className="mb-3"
                onPress={() => router.push(`/(coordinator)/intake/${item.id}`)}
              >
                <View className="flex-row items-center gap-3">
                  <Avatar name={patientName} size="sm" />
                  <View className="min-w-0 flex-1">
                    <Text className="font-medium text-stone-900" numberOfLines={1}>
                      {patientName}
                    </Text>
                    <Text className="text-sm text-stone-400" numberOfLines={1}>
                      {careTypeLabel(item, careRequestLabel, formatService)}
                    </Text>
                  </View>
                  <View className="shrink-0">
                    <StatusBadge
                      status={item.status}
                      label={intakeStatusLabel(t, item.status)}
                    />
                  </View>
                  <Ionicons name={forwardIcon} size={18} color="#A8A29E" />
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
                      <Text className="text-xs font-medium text-amber-600">
                        {t(`intake.urgency.${item.urgencyLevel}`, {
                          defaultValue: item.urgencyLevel?.replace(/_/g, ' ') ?? '',
                        })}
                      </Text>
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
