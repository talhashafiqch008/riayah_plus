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
import { listCarePlans } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';
import { navForwardIcon } from '../../../lib/rtlIcons';
import { clinicalPlanStatus } from '../../../lib/clinicalI18n';

const STATUS_FILTER_VALUES = [
  '',
  'submitted_for_approval',
  'approved',
  'active',
  'revision_requested',
  'completed',
] as const;

export default function ClinicalCarePlansScreen() {
  const { t, i18n } = useTranslation('clinical');
  const [status, setStatus] = useState('');

  const filters = useMemo(
    () =>
      STATUS_FILTER_VALUES.map((value) => ({
        value,
        label:
          value === ''
            ? t('common.all')
            : clinicalPlanStatus(t, i18n, value),
      })),
    [t, i18n],
  );

  const query = useQuery({
    queryKey: ['clinical-care-plans'],
    queryFn: () => listCarePlans(),
  });

  const plans = useMemo(
    () => (query.data ?? []).filter((p) => p.isCurrentVersion !== false),
    [query.data],
  );

  const filtered = useMemo(
    () => (status ? plans.filter((p) => p.status === status) : plans),
    [plans, status],
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('plans.title')} showBack />

      <View className="border-b border-stone-100 bg-white pb-3">
        <Text className="px-4 pt-3 text-sm text-stone-500">{t('plans.description')}</Text>
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
          title={t('plans.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="book-outline"
              title={t('plans.empty')}
              subtitle={t('plans.emptyHint')}
            />
          }
          renderItem={({ item }) => {
            const goalsCount = item.goals?.length ?? 0;
            const servicesCount = item.items?.length ?? 0;
            return (
              <Card
                className="mb-3"
                onPress={() => router.push(`/(clinical)/plans/${item.id}`)}
                shadow
              >
                <View className="flex-row items-start gap-3">
                  <View className="mt-0.5 rounded-xl bg-teal-50 p-2.5">
                    <Ionicons name="book-outline" size={20} color="#0F766E" />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="font-semibold text-stone-900">{item.title}</Text>
                      <StatusBadge
                        status={item.status}
                        label={clinicalPlanStatus(t, i18n, item.status)}
                      />
                    </View>
                    <Text className="mt-0.5 text-sm text-stone-500">
                      {item.episode?.title || t('mobile.detail.episodeFallback')}
                      {' · '}
                      {t('plans.goalsCount', { count: goalsCount })}
                      {' · '}
                      {t('plans.servicesCount', { count: servicesCount })}
                      {' · '}
                      {t('plans.version', { version: item.version })}
                    </Text>
                  </View>
                  <Ionicons name={navForwardIcon()} size={18} color="#D6D3D1" />
                </View>
              </Card>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
