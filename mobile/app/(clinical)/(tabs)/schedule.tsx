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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { listAssessments, type Assessment } from '../../../lib/api/assessments';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { navForwardIcon } from '../../../lib/rtlIcons';
import { clinicalAssessmentType, clinicalScheduleStatus } from '../../../lib/clinicalI18n';

export default function ClinicalScheduleScreen() {
  const { t } = useTranslation('clinical');
  const [status, setStatus] = useState('scheduled');

  const filters = useMemo(
    () => [
      { value: 'scheduled', label: t('schedule.status.scheduled') },
      { value: '', label: t('common.all') },
      { value: 'completed', label: t('schedule.status.completed') },
      { value: 'cancelled', label: t('schedule.status.cancelled') },
    ],
    [t],
  );

  const query = useQuery({
    queryKey: ['clinical-assessments', status],
    queryFn: () => listAssessments({ status: status || undefined, limit: 50 }),
  });

  const rows = query.data?.data ?? [];
  const total = query.data?.total ?? rows.length;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={t('nav.schedule')}
        subtitle={t('mobile.scheduleSubtitle')}
        showBack={false}
      />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">{t('schedule.description')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {filters.map((filter) => {
            const active = status === filter.value;
            return (
              <Pressable
                key={filter.value || 'all'}
                onPress={() => setStatus(filter.value)}
                className={`rounded-full border px-3 py-1.5 ${
                  active ? 'border-teal-600 bg-teal-50' : 'border-stone-200 bg-white'
                }`}
              >
                <Text
                  className={`text-sm ${active ? 'font-medium text-teal-700' : 'text-stone-600'}`}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('schedule.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListHeaderComponent={
            rows.length > 0 ? (
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t(total === 1 ? 'schedule.count_one' : 'schedule.count_other', { count: total })}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={t('schedule.empty')}
              subtitle={t('schedule.description')}
            />
          }
          renderItem={({ item }) => (
            <AssessmentCard item={item} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function AssessmentCard({ item }: { item: Assessment }) {
  const { t, i18n } = useTranslation('clinical');
  const name = item.patient?.name || item.episode?.title || t('common.patient');
  const statusLabel = clinicalScheduleStatus(t, i18n, item.status);
  const typeLabel = item.type
    ? clinicalAssessmentType(t, i18n, item.type)
    : t('common.episode');

  return (
    <Card
      className="mb-3"
      onPress={() => router.push(`/(clinical)/schedule/${item.id}`)}
      shadow
    >
      <View className="flex-row items-start gap-3">
        <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
          <Ionicons name="clipboard-outline" size={20} color="#0F766E" />
        </View>
        <View className="flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="font-semibold text-stone-900">{name}</Text>
            <StatusBadge status={item.status} label={statusLabel} />
          </View>
          <Text className="mt-0.5 text-sm text-stone-500">
            {typeLabel}
            {item.scheduledAt ? ` · ${formatDateTime(item.scheduledAt)}` : ''}
          </Text>
          {item.status === 'scheduled' ? (
            <Text className="mt-1 text-sm font-medium text-teal-700">
              {t('schedule.markCompleted')}
            </Text>
          ) : null}
        </View>
        <Ionicons name={navForwardIcon()} size={18} color="#D6D3D1" />
      </View>
    </Card>
  );
}
