import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import {
  carePlanStatusLabel,
  listCarePlans,
  normalizeCarePlanStatus,
  type CarePlan,
} from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';

export default function FamilyCarePlansScreen() {
  const query = useQuery({
    queryKey: ['family-care-plans'],
    queryFn: () => listCarePlans(),
  });

  const plans = useMemo(
    () => (query.data ?? []).filter((p) => p.isCurrentVersion !== false),
    [query.data],
  );

  const awaiting = useMemo(
    () => plans.filter((p) => normalizeCarePlanStatus(p.status) === 'submitted_for_approval'),
    [plans],
  );
  const others = useMemo(
    () => plans.filter((p) => normalizeCarePlanStatus(p.status) !== 'submitted_for_approval'),
    [plans],
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Care Plans" showBack={false} />

      {query.isLoading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load care plans"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <Text className="mb-4 text-sm text-stone-500">
            Review plans from your care team — approve, request changes, or reject.
          </Text>

          {plans.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No care plans to review yet"
              subtitle="Your coordinator will share a plan once it is ready."
            />
          ) : (
            <>
              {awaiting.length > 0 ? (
                <>
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Needs your action
                  </Text>
                  {awaiting.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} highlight />
                  ))}
                </>
              ) : null}

              {others.length > 0 ? (
                <>
                  <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Other plans
                  </Text>
                  {others.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function PlanCard({ plan, highlight }: { plan: CarePlan; highlight?: boolean }) {
  return (
    <Card
      className={`mb-3 ${highlight ? 'border border-amber-200 bg-amber-50/60' : ''}`}
      onPress={() => router.push(`/(family)/care-plans/${plan.id}`)}
      shadow
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <Text className="font-semibold text-stone-900">{plan.title}</Text>
          <Text className="mt-1 text-sm text-stone-500">
            {plan.goals?.length ?? 0} goals · {plan.items?.length ?? 0} services · v{plan.version}
          </Text>
        </View>
        <StatusBadge
          status={normalizeCarePlanStatus(plan.status)}
          label={carePlanStatusLabel(plan.status)}
        />
      </View>
    </Card>
  );
}
