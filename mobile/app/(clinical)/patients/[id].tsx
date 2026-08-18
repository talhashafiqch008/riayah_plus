import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Chip,
  EmptyState,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { episodeStatusLabel, getEpisode } from '../../../lib/api/care';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { familyAssessmentStatusLabel } from '../../../lib/familyLanguage';
import { buildFamilyJourneyMilestones } from '../../../lib/familyJourneyMilestones';

export default function ClinicalPatientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useQuery({
    queryKey: ['clinical-episode', id],
    enabled: Boolean(id),
    queryFn: () => getEpisode(id!),
  });

  const episode = query.data;

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Patient" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !episode) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Patient" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Episode not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const milestones = buildFamilyJourneyMilestones(episode);
  const assessments = episode.assessments ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={episode.title ?? 'Episode'}
        subtitle={episode.careRecipient?.name ?? episode.patient?.name ?? undefined}
        showBack
      />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => void query.refetch()}
            tintColor="#0D9488"
          />
        }
      >
        <View className="flex-row items-center justify-between">
          {episode.status ? (
            <StatusBadge
              status={episode.status}
              size="md"
              label={episodeStatusLabel(episode.status)}
            />
          ) : null}
          <Pressable onPress={() => router.push(`/(clinical)/notes/${episode.id}`)}>
            <Text className="text-sm font-semibold text-teal-700">Session notes</Text>
          </Pressable>
        </View>

        <Card className="mt-3" shadow>
          <Text className="text-sm font-semibold text-stone-900">Care journey</Text>
          <Text className="mt-0.5 text-sm text-stone-500">
            Read-only view of this episode’s milestones.
          </Text>
          <View className="mt-4 gap-3">
            {milestones.map((m, i) => (
              <View key={m.id} className="flex-row items-start gap-3">
                <View
                  className={`mt-0.5 h-7 w-7 items-center justify-center rounded-full ${
                    m.locked
                      ? 'border border-dashed border-stone-300 bg-stone-100'
                      : m.current
                        ? 'bg-teal-600'
                        : m.done
                          ? 'bg-teal-100'
                          : 'bg-stone-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      m.locked
                        ? 'text-stone-400'
                        : m.current
                          ? 'text-white'
                          : m.done
                            ? 'text-teal-800'
                            : 'text-stone-400'
                    }`}
                  >
                    {m.locked ? '·' : i + 1}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text
                      className={`text-sm font-medium ${
                        m.locked
                          ? 'text-stone-400'
                          : m.current
                            ? 'text-teal-800'
                            : m.done
                              ? 'text-stone-900'
                              : 'text-stone-400'
                      }`}
                    >
                      {m.label}
                    </Text>
                    {m.locked ? <Chip label="Coming soon" /> : null}
                    {m.current && !m.locked ? <Chip label="Now" tone="teal" /> : null}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-4 border-t border-stone-100 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Assigned coordinator
            </Text>
            <Text className="mt-0.5 text-sm text-stone-800">
              {episode.coordinator?.name ?? 'Unassigned'}
            </Text>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">Clinical summary</Text>
          <View className="mt-3 gap-3">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Reason for care
              </Text>
              <Text className="mt-0.5 text-base text-stone-900">{episode.reasonForCare || '—'}</Text>
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Urgency
              </Text>
              <Text className="mt-0.5 text-base capitalize text-stone-900">
                {episode.urgencyLevel || '—'}
              </Text>
            </View>
            {(episode.diagnoses ?? []).length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {episode.diagnoses!.map((d) => (
                  <Chip key={d} label={d} tone="sky" />
                ))}
              </View>
            ) : null}
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Consultations
        </Text>
        {assessments.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">No consultations booked yet.</Text>
          </Card>
        ) : (
          assessments.map((a) => (
            <Card key={a.id} className="mb-2" shadow={false}>
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-medium capitalize text-stone-900">
                  {(a.type ?? 'consultation').replace(/_/g, ' ')}
                  {a.scheduledAt ? ` · ${formatDateTime(a.scheduledAt)}` : ''}
                </Text>
                <StatusBadge
                  status={a.status ?? 'scheduled'}
                  label={familyAssessmentStatusLabel(a.status ?? 'scheduled')}
                />
              </View>
              {a.assessor?.name ? (
                <Text className="mt-1 text-sm text-stone-500">
                  With {a.assessor.name}
                  {a.assessor.role ? ` · ${a.assessor.role.replace(/_/g, ' ')}` : ''}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
