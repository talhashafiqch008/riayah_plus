import { useMemo, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import {
  listCarePlans,
  listEpisodes,
  normalizeCarePlanStatus,
  type CarePlan,
} from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';

const STATUS_FILTER_VALUES = [
  '',
  'draft',
  'submitted_for_approval',
  'active',
  'revision_requested',
  'rejected',
] as const;

function episodeStatusLabel(
  t: (key: string, opts?: Record<string, unknown>) => string,
  status: string,
) {
  return t(`episodes.status.${status}`, { defaultValue: status.replace(/_/g, ' ') });
}

export default function CoordinatorPlansScreen() {
  const { t } = useTranslation('coordinator');
  const [status, setStatus] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const statusFilters = useMemo(
    () =>
      STATUS_FILTER_VALUES.map((value) => ({
        value,
        label:
          value === ''
            ? t('plans.allStatuses')
            : t(`plans.status.${value}`, { defaultValue: value }),
      })),
    [t],
  );

  const plansQuery = useQuery({
    queryKey: ['coordinator-care-plans'],
    queryFn: () => listCarePlans(),
  });

  const episodesQuery = useQuery({
    queryKey: ['coordinator-episodes', ''],
    queryFn: () => listEpisodes({ limit: 50 }),
    enabled: showPicker,
  });

  const plans = useMemo(
    () => (plansQuery.data ?? []).filter((p) => p.isCurrentVersion !== false),
    [plansQuery.data],
  );

  const filtered = useMemo(
    () => (status ? plans.filter((p) => p.status === status) : plans),
    [plans, status],
  );

  const episodes = episodesQuery.data?.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('plans.title')} subtitle={t('mobile.home.plansHint')} showBack={false} />

      <View className="border-b border-stone-100 bg-white px-4 pb-3">
        <Text className="mt-3 text-sm text-stone-500">{t('plans.description')}</Text>
        <View className="mt-3">
          <Button size="sm" onPress={() => setShowPicker((v) => !v)}>
            {showPicker ? t('mobile.detail.hideEpisodePicker') : t('plans.newPlan')}
          </Button>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-3"
          contentContainerStyle={{ gap: 8 }}
        >
          {statusFilters.map((filter) => {
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

      {plansQuery.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : plansQuery.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('plans.loadError')}
          subtitle={apiErrorMessage(plansQuery.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void plansQuery.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={plansQuery.isFetching && !plansQuery.isLoading}
              onRefresh={() => void plansQuery.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          {showPicker ? (
            <Card className="mb-4" shadow>
              <Text className="mb-2 text-sm font-medium text-stone-800">{t('plans.pickEpisode')}</Text>
              {episodesQuery.isLoading ? (
                <ActivityIndicator color="#0D9488" />
              ) : episodes.length === 0 ? (
                <Text className="text-sm text-stone-500">{t('plans.noEpisodes')}</Text>
              ) : (
                episodes.map((ep) => (
                  <Pressable
                    key={ep.id}
                    onPress={() => {
                      setShowPicker(false);
                      router.push(`/(coordinator)/plans/new?episodeId=${ep.id}`);
                    }}
                    className="flex-row items-center justify-between border-t border-stone-100 py-3"
                  >
                    <Text className="flex-1 text-sm font-medium text-stone-900">
                      {ep.title ?? t('mobile.detail.episodeFallback')}
                    </Text>
                    <Text className="text-xs text-stone-500">
                      {episodeStatusLabel(t, ep.status ?? '')}
                    </Text>
                  </Pressable>
                ))
              )}
            </Card>
          ) : null}

          {filtered.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title={t('plans.empty')}
              subtitle={t('mobile.detail.plansEmptyHint')}
            />
          ) : (
            filtered.map((plan) => <PlanCard key={plan.id} plan={plan} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PlanCard({ plan }: { plan: CarePlan }) {
  const { t } = useTranslation('coordinator');
  const goalsCount = plan.goals?.length ?? 0;
  const servicesCount = plan.items?.length ?? 0;

  return (
    <Card className="mb-3" onPress={() => router.push(`/(coordinator)/plans/${plan.id}`)} shadow>
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="font-semibold text-stone-900">{plan.title}</Text>
          <Text className="mt-1 text-sm text-stone-500">
            {t('mobile.detail.planGoalsServices', {
              goals: goalsCount,
              services: servicesCount,
              version: plan.version,
            })}
          </Text>
        </View>
        <StatusBadge
          status={normalizeCarePlanStatus(plan.status)}
          label={t(`plans.status.${normalizeCarePlanStatus(plan.status)}`, {
            defaultValue: plan.status.replace(/_/g, ' '),
          })}
        />
      </View>
    </Card>
  );
}
