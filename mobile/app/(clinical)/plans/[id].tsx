import { useState } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  EmptyState,
  Input,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { cosignCarePlan, getCarePlan } from '../../../lib/api/care';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';
import { clinicalPlanAction, clinicalPlanStatus } from '../../../lib/clinicalI18n';

const COSIGN_STATUSES = new Set(['submitted_for_approval', 'approved', 'active']);

export default function ClinicalCarePlanDetailScreen() {
  const { t, i18n } = useTranslation('clinical');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['clinical-care-plan', id],
    enabled: Boolean(id),
    queryFn: () => getCarePlan(id!),
  });

  const plan = query.data;
  const already = plan?.approvalLogs?.some((l) => l.action === 'clinical_cosign') ?? false;
  const canCosign = !!plan && COSIGN_STATUSES.has(plan.status) && !already;

  const cosignMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing plan');
      return cosignCarePlan(id, notes.trim() || undefined);
    },
    onSuccess: async (result) => {
      setFormError(null);
      setNotes('');
      await queryClient.invalidateQueries({ queryKey: ['clinical-care-plan', id] });
      await queryClient.invalidateQueries({ queryKey: ['clinical-care-plans'] });
      toast.show(result.message ?? t('mobile.detail.planCosigned'), { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, t('plans.cosignFailed'));
      setFormError(msg);
      toastError(toast, e, t('plans.cosignFailed'));
    },
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('mobile.detail.carePlanHeader')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !plan) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('mobile.detail.carePlanHeader')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('plans.notFound')}
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const planStatusLabel = clinicalPlanStatus(t, i18n, plan.status);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={plan.title} showBack />
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
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <Text className="text-sm text-stone-500">
              {t('plans.readOnly', { version: plan.version })}
            </Text>
            <StatusBadge status={plan.status} label={planStatusLabel} />
          </View>

          <Card className="mt-4" shadow>
            <Text className="font-semibold text-stone-900">{t('plans.goals')}</Text>
            {(plan.goals ?? []).length === 0 ? (
              <Text className="mt-2 text-sm text-stone-500">{t('plans.noGoals')}</Text>
            ) : (
              (plan.goals ?? []).map((g) => (
                <Text key={g.id} className="mt-2 text-sm text-stone-700">
                  • {g.title}
                  {g.status === 'achieved' ? ` ${t('plans.achieved')}` : ''}
                </Text>
              ))
            )}
          </Card>

          <Card className="mt-3" shadow>
            <Text className="font-semibold text-stone-900">{t('plans.services')}</Text>
            {(plan.items ?? []).length === 0 ? (
              <Text className="mt-2 text-sm text-stone-500">{t('plans.noServices')}</Text>
            ) : (
              (plan.items ?? []).map((i) => (
                <Text key={i.id} className="mt-2 text-sm text-stone-700">
                  • {i.serviceType}
                  {i.frequency ? ` · ${i.frequency}` : ''}
                </Text>
              ))
            )}
          </Card>

          <Card className="mt-3" shadow>
            <Text className="mb-2 font-semibold text-stone-900">{t('plans.approvalLog')}</Text>
            {(plan.approvalLogs ?? []).length === 0 ? (
              <Text className="text-sm text-stone-500">{t('plans.noApprovals')}</Text>
            ) : (
              (plan.approvalLogs ?? []).map((log) => (
                <View key={log.id} className="mb-2">
                  <Text className="text-sm font-medium text-stone-700">
                    {clinicalPlanAction(t, i18n, log.action)}
                    {' · '}
                    {formatDateTime(log.createdAt)}
                  </Text>
                  {log.notes ? (
                    <Text className="text-sm text-stone-600">{log.notes}</Text>
                  ) : null}
                </View>
              ))
            )}
          </Card>

          {canCosign ? (
            <Card className="mt-3 border border-teal-100 bg-teal-50/40" shadow={false}>
              <Text className="font-semibold text-stone-900">{t('plans.cosign')}</Text>
              <Text className="mt-1 text-sm text-stone-600">{t('plans.cosignLongHint')}</Text>
              {formError ? (
                <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <Text className="text-sm text-red-700">{formError}</Text>
                </View>
              ) : null}
              <View className="mt-3 gap-3">
                <Input
                  value={notes}
                  onChangeText={setNotes}
                  placeholder={t('plans.cosignPlaceholder')}
                  multiline
                />
                <Button
                  isLoading={cosignMutation.isPending}
                  onPress={() => {
                    setFormError(null);
                    cosignMutation.mutate();
                  }}
                >
                  {t('plans.cosignButton')}
                </Button>
              </View>
            </Card>
          ) : already ? (
            <Text className="mt-4 text-sm text-stone-500">{t('plans.alreadyCosigned')}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
