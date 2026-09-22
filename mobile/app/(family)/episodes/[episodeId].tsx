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
  Button,
  Card,
  Chip,
  EmptyState,
  StatusBadge,
} from '../../../components/ui';
import { FamilyTabHero } from '../../../components/family/FamilyChrome';
import { getEpisode } from '../../../lib/api/care';
import { apiErrorMessage } from '../../../lib/format';
import {
  familyEpisodeStatusLabel,
  formatFamilyDateTime,
} from '../../../lib/familyLanguage';
import { buildFamilyJourneyMilestones } from '../../../lib/familyJourneyMilestones';

export default function FamilyEpisodeDetailScreen() {
  const { t } = useTranslation('family');
  const { episodeId } = useLocalSearchParams<{ episodeId: string }>();

  const query = useQuery({
    queryKey: ['family-episode', episodeId],
    enabled: Boolean(episodeId),
    queryFn: () => getEpisode(episodeId!),
  });

  const episode = query.data;
  const isClosed = (episode?.status ?? '') === 'closed';

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title={t('episodes.title')} showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !episode) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title={t('episodes.title')} showBack />
        <EmptyState
          icon="alert-circle-outline"
          title={t('episodeDetail.notFound')}
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: t('mobile.common.tryAgain'), onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const milestones = buildFamilyJourneyMilestones(episode);
  const sessions = episode.sessions ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <FamilyTabHero
        title={episode.title ?? t('episodes.untitled')}
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
        <View className="mb-3 flex-row items-center justify-between gap-2">
          {episode.status ? (
            <StatusBadge
              status={episode.status}
              size="md"
              label={familyEpisodeStatusLabel(episode.status)}
            />
          ) : (
            <View />
          )}
          {!isClosed ? (
            <Button
              onPress={() =>
                router.push(`/(family)/book-session?episodeId=${episode.id}` as never)
              }
            >
              {t('appointments.bookSession')}
            </Button>
          ) : null}
        </View>

        <Card className="mt-3" shadow>
          <Text className="text-sm font-semibold text-stone-900">
            {t('episodeDetail.milestones')}
          </Text>
          <Text className="mt-0.5 text-sm text-stone-500">{t('milestones.hint')}</Text>
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
                    {m.locked ? <Chip label={t('milestones.comingSoon')} /> : null}
                    {m.current && !m.locked ? (
                      <Chip label={t('milestones.now')} tone="teal" />
                    ) : null}
                  </View>
                  {m.description ? (
                    <Text
                      className={`mt-0.5 text-xs ${
                        m.locked ? 'text-stone-400' : 'text-stone-500'
                      }`}
                    >
                      {m.description}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">
            {t('episodeDetail.careSummary')}
          </Text>
          <View className="mt-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              {t('episodeDetail.reasonForCare')}
            </Text>
            <Text className="mt-0.5 text-base text-stone-900">
              {episode.reasonForCare || '—'}
            </Text>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">
            {t('episodeDetail.timeline')}
          </Text>
          <View className="mt-3 gap-3">
            <TimelineRow
              color="bg-amber-400"
              title={t('episodeDetail.requestReceived')}
              subtitle={
                episode.createdAt ? formatFamilyDateTime(episode.createdAt) : '—'
              }
            />
            {episode.intakeReviewedAt ? (
              <TimelineRow
                color="bg-teal-500"
                title={t('episodeDetail.teamReviewed')}
                subtitle={formatFamilyDateTime(episode.intakeReviewedAt)}
              />
            ) : null}
            <TimelineRow
              color={
                ['validated', 'active'].includes(episode.status ?? '')
                  ? 'bg-green-500'
                  : 'bg-stone-300'
              }
              title={t('episodeDetail.current', {
                status: familyEpisodeStatusLabel(episode.status ?? ''),
              })}
              subtitle={
                episode.updatedAt ? formatFamilyDateTime(episode.updatedAt) : '—'
              }
            />
            <TimelineRow
              color={sessions.length > 0 ? 'bg-sky-500' : 'bg-stone-200'}
              title={t('episodeDetail.careSessions')}
              subtitle={
                sessions.length > 0
                  ? t('episodeDetail.sessionsBooked', { count: sessions.length })
                  : t('episodeDetail.noSessions')
              }
            />
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          {t('episodeDetail.careSessions')}
        </Text>
        {sessions.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">{t('episodeDetail.sessionsHint')}</Text>
            {!isClosed ? (
              <View className="mt-3">
                <Button
                  variant="secondary"
                  onPress={() =>
                    router.push(`/(family)/book-session?episodeId=${episode.id}` as never)
                  }
                >
                  {t('episodeDetail.bookSession')}
                </Button>
              </View>
            ) : null}
          </Card>
        ) : (
          sessions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => {
                if (s.type === 'telehealth') {
                  router.push(`/(family)/telehealth/${s.id}` as never);
                }
              }}
            >
              <Card className="mb-2" shadow={false}>
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="flex-1 font-medium text-stone-900">
                    {s.scheduledAt ? formatFamilyDateTime(s.scheduledAt) : t('common.careTeam')}
                    {s.durationMinutes
                      ? ` · ${t('common.min', { count: s.durationMinutes })}`
                      : ''}
                  </Text>
                  <StatusBadge status={s.status ?? 'scheduled'} />
                </View>
                {s.provider?.name ? (
                  <Text className="mt-1 text-sm text-stone-500">
                    {t('mobile.common.withProvider', { name: s.provider.name })}
                  </Text>
                ) : null}
                {s.type === 'telehealth' ? (
                  <Text className="mt-1 text-xs font-medium text-teal-700">
                    {t('nav.telehealth')}
                  </Text>
                ) : null}
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineRow({
  color,
  title,
  subtitle,
}: {
  color: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className={`mt-1.5 h-2.5 w-2.5 rounded-full ${color}`} />
      <View className="flex-1">
        <Text className="text-sm font-medium text-stone-900">{title}</Text>
        <Text className="mt-0.5 text-xs text-stone-500">{subtitle}</Text>
      </View>
    </View>
  );
}
