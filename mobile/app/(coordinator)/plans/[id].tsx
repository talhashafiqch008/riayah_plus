import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
  carePlanStatusLabel,
  getCarePlan,
  normalizeCarePlanStatus,
  submitCarePlan,
  updateCarePlan,
  updateCarePlanGoal,
  type GoalInput,
  type ItemInput,
} from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

export default function CoordinatorCarePlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['coordinator-care-plan', id],
    enabled: Boolean(id),
    queryFn: () => getCarePlan(id!),
  });

  const plan = query.data;

  useEffect(() => {
    if (plan) {
      setTitle(plan.title);
      setNotes(plan.notes ?? '');
    }
  }, [plan]);

  const editable =
    !!plan &&
    (plan.status === 'draft' ||
      plan.status === 'revision_requested' ||
      plan.status === 'active' ||
      plan.status === 'approved');

  const familyRevisionFeedback =
    plan?.rejectionNotes?.trim() ||
    (plan?.approvalLogs ?? [])
      .filter((log) => log.action === 'revision_requested')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      ?.notes;

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error('Missing plan');
      const goals: GoalInput[] = (plan.goals ?? []).map((g) => ({
        title: g.title,
        description: g.description ?? undefined,
        measurement: g.measurement ?? undefined,
        measurableOutcome: g.measurableOutcome ?? undefined,
        targetDate: g.targetDate ?? undefined,
      }));
      const items: ItemInput[] = (plan.items ?? []).map((i) => ({
        serviceType: i.serviceType,
        frequency: i.frequency ?? undefined,
        duration: i.duration ?? undefined,
        unitCost: i.unitCost != null ? Number(i.unitCost) : undefined,
        currency: i.currency,
        assignedRole: i.assignedRole ?? undefined,
        notes: i.notes ?? undefined,
      }));
      return updateCarePlan(plan.id, {
        title: title.trim(),
        notes: notes.trim() || null,
        goals,
        items,
      });
    },
    onSuccess: async (updated) => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['coordinator-care-plans'] });
      if (updated.id !== plan?.id) {
        toast.show(`New draft version v${updated.version} created for re-approval`, {
          type: 'success',
        });
        router.replace(`/(coordinator)/plans/${updated.id}`);
      } else {
        await queryClient.invalidateQueries({ queryKey: ['coordinator-care-plan', id] });
        toast.show('Plan saved', { type: 'success' });
      }
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Save failed');
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error('Missing plan');
      if (plan.status === 'revision_requested') {
        const trimmed = changeNotes.trim();
        if (trimmed.length < 10) {
          throw new Error('Describe what you changed (at least 10 characters) before resubmitting.');
        }
        return submitCarePlan(plan.id, trimmed);
      }
      return submitCarePlan(plan.id);
    },
    onSuccess: async () => {
      setFormError(null);
      setChangeNotes('');
      await queryClient.invalidateQueries({ queryKey: ['coordinator-care-plan', id] });
      await queryClient.invalidateQueries({ queryKey: ['coordinator-care-plans'] });
      await queryClient.invalidateQueries({ queryKey: ['coordinator-shell-stats'] });
      toast.show('Submitted for family approval', { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Submit failed');
      setFormError(msg);
      toast.show(msg, { type: 'danger' });
    },
  });

  const achieveMutation = useMutation({
    mutationFn: (goalId: string) => {
      if (!plan) throw new Error('Missing plan');
      return updateCarePlanGoal(plan.id, goalId, { status: 'achieved' });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['coordinator-care-plan', id] });
      toast.show('Goal marked achieved', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Update failed'),
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
          title="Care plan not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

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
          <View className="mb-3 flex-row items-center justify-between">
            <StatusBadge
              status={normalizeCarePlanStatus(plan.status)}
              size="md"
              label={carePlanStatusLabel(plan.status, 'staff')}
            />
            {plan.episodeId ? (
              <Pressable
                onPress={() => router.push(`/(coordinator)/episodes/${plan.episodeId}`)}
              >
                <Text className="text-sm font-semibold text-teal-700">Open episode</Text>
              </Pressable>
            ) : null}
          </View>

          <Card shadow>
            {formError ? (
              <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                <Text className="text-sm text-red-700">{formError}</Text>
              </View>
            ) : null}
            <Input label="Title" value={title} onChangeText={setTitle} editable={editable} />
            <View className="mt-3">
              <Text className="mb-1 text-sm text-stone-700">Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                editable={editable}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="min-h-[88px] rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900"
              />
            </View>

            {plan.status === 'revision_requested' ? (
              <View className="mt-4 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
                {familyRevisionFeedback ? (
                  <View className="mb-3">
                    <Text className="text-xs font-bold uppercase tracking-wide text-amber-800">
                      Family feedback
                    </Text>
                    <Text className="mt-1 text-sm text-stone-700">{familyRevisionFeedback}</Text>
                  </View>
                ) : null}
                <Text className="mb-1 text-sm font-medium text-stone-800">
                  What changed (required to resubmit)
                </Text>
                <TextInput
                  value={changeNotes}
                  onChangeText={setChangeNotes}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholder="e.g. Updated visit frequency to twice weekly…"
                  placeholderTextColor="#A8A29E"
                  className="min-h-[72px] rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-base text-stone-900"
                />
                <Text className="mt-1 text-xs text-stone-500">At least 10 characters.</Text>
              </View>
            ) : null}

            {editable ? (
              <View className="mt-4 gap-2">
                <Button
                  variant="secondary"
                  isLoading={saveMutation.isPending}
                  onPress={() => saveMutation.mutate()}
                >
                  Save changes
                </Button>
                {plan.status === 'draft' || plan.status === 'revision_requested' ? (
                  <Button
                    isLoading={submitMutation.isPending}
                    onPress={() => submitMutation.mutate()}
                  >
                    Submit for family approval
                  </Button>
                ) : null}
              </View>
            ) : null}
          </Card>

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Goals
          </Text>
          {(plan.goals ?? []).length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">No goals on this plan.</Text>
            </Card>
          ) : (
            (plan.goals ?? []).map((g) => (
              <Card key={g.id} className="mb-2" shadow={false}>
                <View className="flex-row items-start justify-between gap-2">
                  <View className="flex-1">
                    <Text className="font-medium text-stone-900">{g.title}</Text>
                    {g.description ? (
                      <Text className="mt-0.5 text-sm text-stone-600">{g.description}</Text>
                    ) : null}
                    <Text className="mt-1 text-xs capitalize text-stone-500">
                      Status: {g.status}
                    </Text>
                  </View>
                  {g.status !== 'achieved' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      isLoading={achieveMutation.isPending && achieveMutation.variables === g.id}
                      onPress={() => achieveMutation.mutate(g.id)}
                    >
                      Achieved
                    </Button>
                  ) : null}
                </View>
              </Card>
            ))
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Services
          </Text>
          {(plan.items ?? []).length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">No service items.</Text>
            </Card>
          ) : (
            (plan.items ?? []).map((item) => (
              <Card key={item.id} className="mb-2" shadow={false}>
                <Text className="font-medium text-stone-900">{item.serviceType}</Text>
                <Text className="mt-0.5 text-sm text-stone-500">
                  {[item.frequency, item.duration].filter(Boolean).join(' · ') || '—'}
                  {item.unitCost != null
                    ? ` · ${item.currency ?? 'QAR'} ${String(item.unitCost)}`
                    : ''}
                </Text>
              </Card>
            ))
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            Approval log
          </Text>
          {(plan.approvalLogs ?? []).length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">No approval events yet.</Text>
            </Card>
          ) : (
            (plan.approvalLogs ?? []).map((log) => (
              <Card key={log.id} className="mb-2" shadow={false}>
                <Text className="text-sm font-medium text-stone-800">
                  {log.action.replace(/_/g, ' ')}
                </Text>
                <Text className="mt-0.5 text-xs text-stone-500">
                  {formatDateTime(log.createdAt)}
                </Text>
                {log.notes ? (
                  <Text className="mt-1 text-sm text-stone-600">{log.notes}</Text>
                ) : null}
              </Card>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
