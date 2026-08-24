import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, StatusBadge } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { apiClient } from '../../../lib/api/client';
import { apiErrorMessage } from '../../../lib/format';

type CareGoal = {
  id?: string;
  title: string;
  measurement?: string | null;
  measurableOutcome?: string | null;
  description?: string | null;
  status?: string;
};

type CareItem = {
  id?: string;
  serviceType: string;
  frequency?: string | null;
  duration?: string | null;
};

type CarePlan = {
  id: string;
  title?: string;
  notes?: string | null;
  status?: string;
  goals?: CareGoal[];
  items?: CareItem[];
  services?: CareItem[];
};

type PlanRow =
  | { kind: 'goal'; goal: CareGoal; index: number; key: string }
  | { kind: 'service'; service: CareItem; key: string };

export function CarePlanTab({ episodeId }: { episodeId?: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['care-plan', episodeId],
    enabled: Boolean(episodeId),
    queryFn: async () => {
      const { data: res } = await apiClient.get('/api/care-plans', {
        params: { episodeId },
      });
      const plans = (res.data ?? res.carePlans ?? []) as CarePlan[];
      if (!plans.length) return null;
      const preferred =
        plans.find((p) =>
          ['active', 'approved', 'submitted_for_approval'].includes(
            (p.status ?? '').toLowerCase(),
          ),
        ) ?? plans[0];
      return preferred;
    },
  });

  const goals = data?.goals ?? [];
  const services = data?.items ?? data?.services ?? [];
  const rows: PlanRow[] = [
    ...goals.map((goal, index) => ({
      kind: 'goal' as const,
      goal,
      index,
      key: goal.id ?? `goal-${index}`,
    })),
    ...services.map((service, index) => ({
      kind: 'service' as const,
      service,
      key: service.id ?? `svc-${index}`,
    })),
  ];

  if (!episodeId) {
    return (
      <EmptyState
        icon="document-text-outline"
        title="No episode"
        subtitle="Select an episode to view its care plan."
      />
    );
  }

  if (isLoading) {
    return <ActivityIndicator size="large" color="#0D9488" className="mt-12" />;
  }

  if (isError) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Could not load"
        subtitle={apiErrorMessage(error)}
        action={{ label: 'Try again', onPress: () => void refetch() }}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        icon="document-text-outline"
        title="No care plan yet"
        subtitle="Your coordinator is preparing one."
      />
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={(item) => item.key}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => void refetch()}
          tintColor="#0D9488"
        />
      }
      contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
      ListHeaderComponent={
        <View className="px-4 pt-4">
          <View className="mb-3 flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-lg font-bold text-stone-900">
              {data.title ?? 'Care Plan'}
            </Text>
            {data.status ? <StatusBadge status={data.status} /> : null}
          </View>
          {data.notes ? (
            <Text className="mb-4 text-sm text-stone-600">{data.notes}</Text>
          ) : null}
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Goals & Services
          </Text>
          {rows.length === 0 ? (
            <Text className="mb-2 text-sm text-stone-400">
              No goals or services listed yet.
            </Text>
          ) : null}
        </View>
      }
      renderItem={({ item }) => {
        if (item.kind === 'goal') {
          const { goal, index } = item;
          return (
            <View className="px-4">
              <Card className="mb-2" shadow={false}>
                <View className="flex-row gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-full bg-teal-600">
                    <Text className="text-sm font-bold text-white">
                      {index + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-stone-900">
                      {goal.title}
                    </Text>
                    {(goal.measurement ?? goal.measurableOutcome) ? (
                      <Text className="mt-0.5 text-sm text-stone-500">
                        {goal.measurement ?? goal.measurableOutcome}
                      </Text>
                    ) : null}
                    {goal.description ? (
                      <Text className="mt-1 text-sm text-stone-400">
                        {goal.description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            </View>
          );
        }

        const { service: svc } = item;
        return (
          <View className="mb-2 mx-4 flex-row flex-wrap items-center gap-2 rounded-xl border border-stone-100 bg-white p-3">
            <View className="rounded-full bg-teal-50 px-2.5 py-1">
              <Text className="text-xs font-medium capitalize text-teal-700">
                {svc.serviceType.replace(/_/g, ' ')}
              </Text>
            </View>
            {svc.frequency ? (
              <Text className="text-sm text-stone-500">{svc.frequency}</Text>
            ) : null}
            {svc.duration ? (
              <Text className="text-sm text-stone-400">{svc.duration}</Text>
            ) : null}
          </View>
        );
      }}
    />
  );
}

export default function CarePlanScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Care plan" subtitle="Goals and services for this journey" showBack />
      <CarePlanTab />
    </SafeAreaView>
  );
}
