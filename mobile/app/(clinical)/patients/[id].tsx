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
import { useTranslation } from 'react-i18next';
import {
  Card,
  Chip,
  EmptyState,
  ScreenHeader,
  StatusBadge,
} from '../../../components/ui';
import { getEpisode } from '../../../lib/api/care';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { buildFamilyJourneyMilestones } from '../../../lib/familyJourneyMilestones';
import {
  clinicalAssessmentType,
  clinicalEmDash,
  clinicalEpisodeStatus,
  clinicalRoleLabel,
  clinicalScheduleStatus,
  clinicalUrgency,
} from '../../../lib/clinicalI18n';

export default function ClinicalPatientDetailScreen() {
  const { t, i18n } = useTranslation('clinical');
  const emDash = clinicalEmDash(t);
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
        <ScreenHeader title={t('episodeDetail.patient')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !episode) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('episodeDetail.patient')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('episodeDetail.notFound')}
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const milestones = buildFamilyJourneyMilestones(episode);
  const assessments = episode.assessments ?? [];
  const episodeStatus = episode.status
    ? clinicalEpisodeStatus(t, i18n, episode.status)
    : '';

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={episode.title ?? t('mobile.detail.episodeFallback')}
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
            <StatusBadge status={episode.status} size="md" label={episodeStatus} />
          ) : null}
          <Pressable onPress={() => router.push(`/(clinical)/notes/${episode.id}`)}>
            <Text className="text-sm font-semibold text-teal-700">
              {t('episodeDetail.openSessionNotes')}
            </Text>
          </Pressable>
        </View>

        <Card className="mt-3" shadow>
          <Text className="text-sm font-semibold text-stone-900">{t('mobile.detail.careJourney')}</Text>
          <Text className="mt-0.5 text-sm text-stone-500">{t('mobile.detail.careJourneyHint')}</Text>
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
                    {m.locked ? <Chip label={t('mobile.detail.comingSoon')} /> : null}
                    {m.current && !m.locked ? (
                      <Chip label={t('mobile.detail.now')} tone="teal" />
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View className="mt-4 border-t border-stone-100 pt-4">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {t('mobile.detail.assignedCoordinator')}
            </Text>
            <Text className="mt-0.5 text-sm text-stone-800">
              {episode.coordinator?.name ?? t('mobile.detail.unassigned')}
            </Text>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">
            {t('episodeDetail.clinicalSummary')}
          </Text>
          <View className="mt-3 gap-3">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('episodeDetail.reasonForCare')}
              </Text>
              <Text className="mt-0.5 text-base text-stone-900">
                {episode.reasonForCare || emDash}
              </Text>
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                {t('episodeDetail.urgency')}
              </Text>
              <Text className="mt-0.5 text-base text-stone-900">
                {episode.urgencyLevel
                  ? clinicalUrgency(t, i18n, episode.urgencyLevel)
                  : emDash}
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
          {t('mobile.detail.consultations')}
        </Text>
        {assessments.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">{t('mobile.detail.noConsultations')}</Text>
          </Card>
        ) : (
          assessments.map((a) => (
            <Card key={a.id} className="mb-2" shadow={false}>
              <View className="flex-row items-start justify-between gap-2">
                <Text className="flex-1 font-medium text-stone-900">
                  {clinicalAssessmentType(t, i18n, a.type)}
                  {a.scheduledAt ? ` · ${formatDateTime(a.scheduledAt)}` : ''}
                </Text>
                <StatusBadge
                  status={a.status ?? 'scheduled'}
                  label={clinicalScheduleStatus(t, i18n, a.status ?? 'scheduled')}
                />
              </View>
              {a.assessor?.name ? (
                <Text className="mt-1 text-sm text-stone-500">
                  {t('mobile.detail.withAssessor', { name: a.assessor.name })}
                  {a.assessor.role ? ` · ${clinicalRoleLabel(t, i18n, a.assessor.role)}` : ''}
                </Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
