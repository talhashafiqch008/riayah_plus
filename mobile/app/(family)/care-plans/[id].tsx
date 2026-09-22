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
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  Input,
  StatusBadge,
} from '../../../components/ui';
import { FamilyTabHero } from '../../../components/family/FamilyChrome';
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
import { AppSwitcherPrivacyOverlay, useScreenProtection } from '../../../hooks/useScreenProtection';

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
  useScreenProtection(true);
  const { t } = useTranslation('family');
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
      if (!id) throw new Error(t('carePlanReview.missing'));
      if (action === 'approve') return approveCarePlan(id);
      if (action === 'revision') {
        const trimmed = notes.trim();
        if (!trimmed) throw new Error(t('carePlanReview.needExplanation'));
        return requestCarePlanRevision(id, trimmed);
      }
      return rejectCarePlan(id, notes.trim() || undefined);
    },
    onSuccess: (_data, action) => {
      queryClient.invalidateQueries({ queryKey: ['family-care-plans'] });
      queryClient.invalidateQueries({ queryKey: ['family-care-plan', id] });
      toast.show(
        action === 'approve'
          ? t('carePlanReview.approved')
          : action === 'revision'
            ? t('carePlanReview.revisionRequested')
            : t('carePlanReview.rejected'),
        { type: 'success' },
      );
      router.replace('/(family)/care-plans');
    },
    onError: (e) => toastError(toast, e, t('carePlanReview.actionFailed')),
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title={t('carePlanReview.title')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !plan) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title={t('carePlanReview.title')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('carePlanReview.notFound')}
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: t('mobile.common.tryAgain'), onPress: () => void query.refetch() }}
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
      <AppSwitcherPrivacyOverlay />
      <FamilyTabHero
        title={plan.title}
        subtitle={t('carePlanReview.version', { version: plan.version })}
        showBack
      />

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
          <View className="gap-3">
            <StatusBadge
              status={normalizeCarePlanStatus(plan.status)}
              size="md"
              label={carePlanStatusLabel(plan.status)}
            />
            {plan.notes ? (
              <Text className="text-sm leading-5 text-stone-600">{plan.notes}</Text>
            ) : null}
          </View>

          {showCareTeamUpdate ? (
            <View className="mt-4 rounded-2xl border border-teal-300 bg-teal-50 p-4">
              <Text className="text-xs font-bold uppercase tracking-wider text-teal-800">
                {t('carePlanReview.teamChanged')}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-stone-800">
                {coordinatorChangeNotes ?? t('carePlanReview.teamUpdatedFallback')}
              </Text>
            </View>
          ) : null}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('carePlanReview.careGoals')}
          </Text>
          {goals.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('carePlanReview.noGoals')}</Text>
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
                        {t('carePlanReview.measure', {
                          value: goal.measurement ?? goal.measurableOutcome,
                        })}
                      </Text>
                    ) : null}
                    {goal.targetDate ? (
                      <Text className="mt-0.5 text-xs text-stone-400">
                        {t('carePlanReview.targetDate', { date: formatDate(goal.targetDate) })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))
          )}

          <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {t('carePlanReview.servicesCosts')}
          </Text>
          {items.length === 0 ? (
            <Card shadow={false}>
              <Text className="text-sm text-stone-500">{t('carePlanReview.noServices')}</Text>
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
              <Text className="font-semibold text-stone-900">{t('carePlanReview.yourDecision')}</Text>
              <View className="mt-3">
                <Input
                  placeholder={t('carePlanReview.notesPlaceholder')}
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
                  {t('carePlanReview.approve')}
                </Button>
                <Button
                  variant="secondary"
                  isLoading={busy && decision.variables === 'revision'}
                  disabled={busy}
                  onPress={() => decision.mutate('revision')}
                >
                  {t('carePlanReview.requestChanges')}
                </Button>
                <Button
                  variant="destructive"
                  isLoading={busy && decision.variables === 'reject'}
                  disabled={busy}
                  onPress={() => decision.mutate('reject')}
                >
                  {t('carePlanReview.reject')}
                </Button>
              </View>
            </View>
          ) : plan.rejectionNotes ? (
            <Card className="mt-6" shadow={false}>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('carePlanReview.lastDecisionNotes')}
              </Text>
              <Text className="mt-1 text-sm text-stone-700">{plan.rejectionNotes}</Text>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
