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
import { getAssessment, updateAssessment } from '../../../lib/api/assessments';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';
import {
  clinicalAssessmentType,
  clinicalEmDash,
  clinicalScheduleStatus,
} from '../../../lib/clinicalI18n';

function findingString(findings: Record<string, unknown> | null | undefined, key: string): string {
  const v = findings?.[key];
  return typeof v === 'string' ? v : '';
}

export default function ClinicalAssessmentDetailScreen() {
  const { t, i18n } = useTranslation('clinical');
  const emDash = clinicalEmDash(t);
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [mobility, setMobility] = useState('');
  const [pain, setPain] = useState('');
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['clinical-assessment', id],
    enabled: Boolean(id),
    queryFn: () => getAssessment(id!),
  });

  const row = query.data;
  const isScheduled = (row?.status ?? '') === 'scheduled';

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('Missing assessment');
      if (!mobility.trim() && !pain.trim() && !summary.trim()) {
        throw new Error(t('schedule.needFindings'));
      }
      if (!recommendations.trim() && !reportUrl.trim()) {
        throw new Error(t('schedule.needRecOrReport'));
      }
      return updateAssessment(id, {
        status: 'completed',
        findings: {
          mobility: mobility.trim() || null,
          pain: pain.trim() || null,
          summary: summary.trim() || null,
        },
        recommendations: recommendations.trim() || undefined,
        reportUrl: reportUrl.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setFormError(null);
      await queryClient.invalidateQueries({ queryKey: ['clinical-assessment', id] });
      await queryClient.invalidateQueries({ queryKey: ['clinical-assessments'] });
      await queryClient.invalidateQueries({ queryKey: ['clinical-shell-stats'] });
      toast.show(t('schedule.completed'), { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, t('schedule.completeFailed'));
      setFormError(msg);
      toastError(toast, e, t('schedule.completeFailed'));
    },
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('mobile.detail.assessmentTitle')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !row) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('mobile.detail.assessmentTitle')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('mobile.detail.assessmentNotFound')}
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const patientName =
    row.patient?.name || row.episode?.title || t('common.patient');
  const assessmentType = clinicalAssessmentType(t, i18n, row.type);
  const statusLabel = clinicalScheduleStatus(t, i18n, row.status);

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={patientName} showBack />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => void query.refetch()}
              tintColor="#0D9488"
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <StatusBadge status={row.status} label={statusLabel} size="md" />
            <Text className="text-sm text-stone-500">{assessmentType}</Text>
          </View>
          {row.scheduledAt ? (
            <Text className="mt-1 text-sm text-stone-600">{formatDateTime(row.scheduledAt)}</Text>
          ) : null}

          {isScheduled ? (
            <Card className="mt-4" shadow>
              <Text className="text-sm font-semibold text-stone-900">
                {t('schedule.completeTitle', { type: assessmentType })}
              </Text>
              <Text className="mt-1 text-sm text-stone-500">{t('mobile.detail.completeHint')}</Text>
              {formError ? (
                <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <Text className="text-sm text-red-700">{formError}</Text>
                </View>
              ) : null}
              <View className="mt-3 gap-3">
                <Input
                  label={t('schedule.mobility')}
                  value={mobility}
                  onChangeText={setMobility}
                  placeholder={t('schedule.mobilityPlaceholder')}
                />
                <Input
                  label={t('schedule.pain')}
                  value={pain}
                  onChangeText={setPain}
                  placeholder={t('schedule.painPlaceholder')}
                />
                <Input
                  label={t('schedule.summary')}
                  value={summary}
                  onChangeText={setSummary}
                  placeholder={t('schedule.summary')}
                  multiline
                />
                <Input
                  label={t('schedule.recommendations')}
                  value={recommendations}
                  onChangeText={setRecommendations}
                  placeholder={t('schedule.recommendations')}
                  multiline
                />
                <Input
                  label={t('schedule.report')}
                  value={reportUrl}
                  onChangeText={setReportUrl}
                  placeholder={t('schedule.reportUrlPlaceholder')}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Button
                  isLoading={completeMutation.isPending}
                  onPress={() => {
                    setFormError(null);
                    completeMutation.mutate();
                  }}
                >
                  {t('schedule.markCompleted')}
                </Button>
              </View>
            </Card>
          ) : (
            <Card className="mt-4" shadow>
              <Text className="text-sm font-semibold text-stone-900">{t('schedule.findings')}</Text>
              <View className="mt-3 gap-3">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('schedule.mobility')}
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {findingString(row.findings, 'mobility') || emDash}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('schedule.pain')}
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {findingString(row.findings, 'pain') || emDash}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('schedule.summary')}
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {findingString(row.findings, 'summary') || emDash}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    {t('schedule.recommendations')}
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {row.recommendations || emDash}
                  </Text>
                </View>
                {row.reportUrl ? (
                  <Text className="text-sm text-teal-700">{row.reportUrl}</Text>
                ) : null}
              </View>
            </Card>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
