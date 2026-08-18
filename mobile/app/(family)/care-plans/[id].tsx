import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import {
  Button,
  Card,
  EmptyState,
  Input,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import {
  approveCarePlan,
  carePlanStatusLabel,
  getCarePlan,
  normalizeCarePlanStatus,
  rejectCarePlan,
  requestCarePlanRevision,
  type CarePlan,
} from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDate } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

type Decision = 'approve' | 'revision' | 'reject';

function latestLogNotes(plan: CarePlan, action: string): string | null {
  const logs = Array.isArray(plan.approvalLogs) ? plan.approvalLogs : [];
  const hit = [...logs]
    .filter((log) => log.action === action && typeof log.notes === 'string' && log.notes.trim())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  return hit?.notes?.trim() ?? null;
}

function hadPriorRevision(plan: CarePlan): boolean {
  const logs = Array.isArray(plan.approvalLogs) ? plan.approvalLogs : [];
  return logs.some((log) => log.action === 'revision_requested');
}

export default function FamilyCarePlanReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [notes, setNotes] = useState('');

  const query = useQuery({
    queryKey: ['family-care-plan', id],
    enabled: Boolean(id),
    queryFn: () => getCarePlan(id!),
  });

  useFocusEffect(
    useCallback(() => {
      if (id) void queryClient.invalidateQueries({ queryKey: ['family-care-plan', id] });
    }, [id]),
  );

  const plan = query.data;

  const decision = useMutation({
    mutationFn: async (action: Decision) => {
      if (!id) throw new Error('Missing care plan');
      if (action === 'approve') return approveCarePlan(id);
      if (action === 'revision') {
        const trimmed = notes.trim();
        if (!trimmed) throw new Error('Please explain what changes you need');
        return requestCarePlanRevision(id, trimmed);
      }
      return rejectCarePlan(id, notes.trim() || undefined);
    },
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['family-care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['family-care-plan', id] });
      toast.show(
        action === 'approve'
          ? 'Care plan approved'
          : action === 'revision'
            ? 'Revision requested'
            : 'Care plan rejected',
        { type: 'success' },
      );
      router.replace('/(family)/care-plans');
    },
    onError: (e) => toastError(toast, e, 'Action failed'),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Care plan" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !plan) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Care plan" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Plan not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const goals = plan.goals ?? [];
  const items = plan.items ?? [];
  const canAct = normalizeCarePlanStatus(plan.status) === 'submitted_for_approval';
  const busy = decision.isPending;
  const coordinatorChangeNotes = latestLogNotes(plan, 'submitted');
  const showCareTeamUpdate = Boolean(coordinatorChangeNotes) || (canAct && hadPriorRevision(plan));

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={plan.title} subtitle={`Version ${plan.version}`} showBack />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              {plan.notes ? (
                <Text className="text-sm text-stone-600">{plan.notes}</Text>
              ) : null}
            </View>
            <StatusBadge
              status={normalizeCarePlanStatus(plan.status)}
              size="md"
              label={carePlanStatusLabel(plan.status)}
            />
          </View>

          {showCareTeamUpdate ? (
            <View className="mt-4 rounded-2xl border border-teal-300 bg-teal-50 p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-teal-800">
                What the care team changed
              </Text>
              <Text className="mt-2 text-sm leading-5 text-stone-800">
                {coordinatorChangeNotes ??
                  'Your care team updated this plan after your change request. Review the goals and services below.'}
              </Text>
            </View>
          ) : null}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Care goals
          </Text>
          {goals.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">No goals listed yet.</Text>
            </Card>
          ) : (
            goals.map((goal, index) => (
              <Card key={goal.id} className="mb-2" shadow={false}>
                <View className="flex-row gap-3">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-teal-600">
                    <Text className="text-xs font-bold text-white">{index + 1}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-stone-900">{goal.title}</Text>
                    {goal.description ? (
                      <Text className="mt-0.5 text-sm text-stone-600">{goal.description}</Text>
                    ) : null}
                    {goal.measurement ?? goal.measurableOutcome ? (
                      <Text className="mt-1 text-xs text-stone-500">
                        Measure: {goal.measurement ?? goal.measurableOutcome}
                      </Text>
                    ) : null}
                    {goal.targetDate ? (
                      <Text className="mt-0.5 text-xs text-stone-400">
                        Target {formatDate(goal.targetDate)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Services & costs
          </Text>
          {items.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">No services listed yet.</Text>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="mb-2" shadow={false}>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-medium capitalize text-stone-900">
                      {item.serviceType.replace(/_/g, ' ')}
                    </Text>
                    <Text className="mt-0.5 text-sm text-stone-500">
                      {[item.frequency, item.duration, item.assignedRole]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                  </View>
                  {item.unitCost != null ? (
                    <Text className="font-semibold text-stone-800">
                      {item.currency ?? 'QAR'} {String(item.unitCost)}
                    </Text>
                  ) : null}
                </View>
              </Card>
            ))
          )}

          {canAct ? (
            <View className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <Text className="font-semibold text-stone-900">Your decision</Text>
              <View className="mt-3">
                <Input
                  placeholder="Optional notes (required to request changes)"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={4}
                  className="min-h-[88px]"
                  textAlignVertical="top"
                />
              </View>
              <View className="mt-3 gap-2">
                <Button
                  isLoading={busy && decision.variables === 'approve'}
                  disabled={busy}
                  onPress={() => decision.mutate('approve')}
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  isLoading={busy && decision.variables === 'revision'}
                  disabled={busy}
                  onPress={() => decision.mutate('revision')}
                >
                  Request changes
                </Button>
                <Button
                  variant="destructive"
                  isLoading={busy && decision.variables === 'reject'}
                  disabled={busy}
                  onPress={() => decision.mutate('reject')}
                >
                  Reject
                </Button>
              </View>
            </View>
          ) : plan.rejectionNotes ? (
            <Card className="mt-6" shadow={false}>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Notes from your last decision
              </Text>
              <Text className="mt-1 text-sm text-stone-700">{plan.rejectionNotes}</Text>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
