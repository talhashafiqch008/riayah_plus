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
import { apiErrorMessage, formatDate } from '../../../lib/format';

type AssessmentRow = {
  id: string;
  type?: string;
  status?: string;
  completedAt?: string | null;
  scheduledAt?: string | null;
  score?: number | string | null;
  summary?: string | null;
  findings?: { summary?: string | null } | null;
  completedBy?: string;
  assessor?: { name?: string } | null;
};

export function AssessmentsTab({ episodeId }: { episodeId?: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['episode-assessments', episodeId],
    enabled: Boolean(episodeId),
    queryFn: async () => {
      const { data: res } = await apiClient.get('/api/assessments', {
        params: { episodeId },
      });
      return (res.data ?? res.assessments ?? []) as AssessmentRow[];
    },
  });

  const assessments = data ?? [];

  if (!episodeId) {
    return (
      <EmptyState
        icon="clipboard-outline"
        title="No episode"
        subtitle="Select an episode to view assessments."
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

  return (
    <FlatList
      data={assessments}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => void refetch()}
          tintColor="#0D9488"
        />
      }
      contentContainerStyle={{
        paddingVertical: 12,
        paddingBottom: 32,
        flexGrow: 1,
      }}
      ListEmptyComponent={
        <EmptyState
          icon="clipboard-outline"
          title="No assessments yet"
          subtitle="Completed assessments will show up here."
        />
      }
      renderItem={({ item }) => {
        const when = item.completedAt ?? item.scheduledAt;
        const by =
          item.completedBy ?? item.assessor?.name ?? 'Clinician';
        const summary = item.summary ?? item.findings?.summary;
        return (
          <Card className="mb-2 mx-4" shadow>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-base font-bold capitalize text-stone-900">
                  {(item.type ?? 'Assessment').replace(/_/g, ' ')}
                </Text>
                {when ? (
                  <Text className="mt-1 text-sm text-stone-400">
                    {formatDate(when)}
                  </Text>
                ) : null}
                <Text className="mt-1 text-sm text-stone-500">
                  Completed by {by}
                </Text>
                {summary ? (
                  <Text className="mt-2 text-sm text-stone-400" numberOfLines={3}>
                    {summary}
                  </Text>
                ) : null}
              </View>
              <View className="items-end gap-2">
                {item.status ? <StatusBadge status={item.status} /> : null}
                {item.score != null && item.score !== '' ? (
                  <View className="rounded-full bg-teal-50 px-2 py-0.5">
                    <Text className="text-xs font-semibold text-teal-700">
                      Score {String(item.score)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </Card>
        );
      }}
    />
  );
}

export default function EpisodeAssessmentsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Assessments" subtitle="Consultations for this care journey" showBack />
      <AssessmentsTab />
    </SafeAreaView>
  );
}
