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

function findingString(findings: Record<string, unknown> | null | undefined, key: string): string {
  const v = findings?.[key];
  return typeof v === 'string' ? v : '';
}

export default function ClinicalAssessmentDetailScreen() {
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
        throw new Error('Enter at least one findings field');
      }
      if (!recommendations.trim() && !reportUrl.trim()) {
        throw new Error('Add recommendations or a report URL');
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
      toast.show('Assessment completed', { type: 'success' });
    },
    onError: (e) => {
      const msg = apiErrorMessage(e, 'Complete failed');
      setFormError(msg);
      toastError(toast, e, 'Complete failed');
    },
  });

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Assessment" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !row) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Assessment" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Assessment not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const patientName = row.patient?.name || row.episode?.title || 'Patient';

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
            <StatusBadge status={row.status} label={row.status.replace(/_/g, ' ')} size="md" />
            <Text className="text-sm capitalize text-stone-500">
              {(row.type ?? 'assessment').replace(/_/g, ' ')}
            </Text>
          </View>
          {row.scheduledAt ? (
            <Text className="mt-1 text-sm text-stone-600">{formatDateTime(row.scheduledAt)}</Text>
          ) : null}

          {isScheduled ? (
            <Card className="mt-4" shadow>
              <Text className="text-sm font-semibold text-stone-900">Complete assessment</Text>
              <Text className="mt-1 text-sm text-stone-500">
                Enter at least one findings field, plus recommendations or a report URL.
              </Text>
              {formError ? (
                <View className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <Text className="text-sm text-red-700">{formError}</Text>
                </View>
              ) : null}
              <View className="mt-3 gap-3">
                <Input
                  label="Mobility"
                  value={mobility}
                  onChangeText={setMobility}
                  placeholder="Mobility findings"
                />
                <Input
                  label="Pain"
                  value={pain}
                  onChangeText={setPain}
                  placeholder="Pain findings"
                />
                <Input
                  label="Summary"
                  value={summary}
                  onChangeText={setSummary}
                  placeholder="Clinical summary"
                  multiline
                />
                <Input
                  label="Recommendations"
                  value={recommendations}
                  onChangeText={setRecommendations}
                  placeholder="Recommendations"
                  multiline
                />
                <Input
                  label="Report URL"
                  value={reportUrl}
                  onChangeText={setReportUrl}
                  placeholder="https://…"
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
                  Complete assessment
                </Button>
              </View>
            </Card>
          ) : (
            <Card className="mt-4" shadow>
              <Text className="text-sm font-semibold text-stone-900">Findings</Text>
              <View className="mt-3 gap-3">
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Mobility
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {findingString(row.findings, 'mobility') || '—'}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Pain
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {findingString(row.findings, 'pain') || '—'}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Summary
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {findingString(row.findings, 'summary') || '—'}
                  </Text>
                </View>
                <View>
                  <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                    Recommendations
                  </Text>
                  <Text className="mt-0.5 text-sm text-stone-800">
                    {row.recommendations || '—'}
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
