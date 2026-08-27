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
  Button,
  Card,
  Chip,
  EmptyState,
  StatusBadge,
} from '../../../components/ui';
import { FamilyTabHero } from '../../../components/family/FamilyChrome';
import { getEpisode } from '../../../lib/api/care';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { familyEpisodeStatusLabel } from '../../../lib/familyLanguage';
import { buildFamilyJourneyMilestones } from '../../../lib/familyJourneyMilestones';

export default function FamilyEpisodeDetailScreen() {
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
        <FamilyTabHero title="Care journey" showBack />
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      </SafeAreaView>
    );
  }

  if (query.isError || !episode) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <FamilyTabHero title="Care journey" showBack />
        <EmptyState
          icon="alert-circle-outline"
          title="Care journey not found"
          subtitle={query.error ? apiErrorMessage(query.error) : undefined}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      </SafeAreaView>
    );
  }

  const milestones = buildFamilyJourneyMilestones(episode);
  const sessions = episode.sessions ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <FamilyTabHero
        title={episode.title ?? 'Care journey'}
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
              Book session
            </Button>
          ) : null}
        </View>

        <Card className="mt-3" shadow>
          <Text className="text-sm font-semibold text-stone-900">Your care journey</Text>
          <Text className="mt-0.5 text-sm text-stone-500">
            Simple milestones so you always know what comes next.
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
          <Text className="text-sm font-semibold text-stone-900">Care summary</Text>
          <View className="mt-3">
            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Reason for care
            </Text>
            <Text className="mt-0.5 text-base text-stone-900">
              {episode.reasonForCare || '—'}
            </Text>
          </View>
        </Card>

        <Card className="mt-4" shadow>
          <Text className="text-sm font-semibold text-stone-900">Timeline</Text>
          <View className="mt-3 gap-3">
            <TimelineRow
              color="bg-amber-400"
              title="Care request received"
              subtitle={episode.createdAt ? formatDateTime(episode.createdAt) : '—'}
            />
            {episode.intakeReviewedAt ? (
              <TimelineRow
                color="bg-teal-500"
                title="Care team reviewed"
                subtitle={formatDateTime(episode.intakeReviewedAt)}
              />
            ) : null}
            <TimelineRow
              color={
                ['validated', 'active'].includes(episode.status ?? '')
                  ? 'bg-green-500'
                  : 'bg-stone-300'
              }
              title={`Current: ${familyEpisodeStatusLabel(episode.status ?? '')}`}
              subtitle={episode.updatedAt ? formatDateTime(episode.updatedAt) : '—'}
            />
            <TimelineRow
              color={sessions.length > 0 ? 'bg-sky-500' : 'bg-stone-200'}
              title="Care sessions"
              subtitle={
                sessions.length > 0 ? `${sessions.length} scheduled` : 'None scheduled yet'
              }
            />
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Sessions
        </Text>
        {sessions.length === 0 ? (
          <Card shadow={false}>
            <Text className="text-sm text-stone-500">
              No care sessions scheduled yet. When your coordinator assigns a clinician, you can
              book from open time slots.
            </Text>
            {!isClosed ? (
              <View className="mt-3">
                <Button
                  variant="secondary"
                  onPress={() =>
                    router.push(`/(family)/book-session?episodeId=${episode.id}` as never)
                  }
                >
                  Book a session
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
                    {s.scheduledAt ? formatDateTime(s.scheduledAt) : 'Session'}
                    {s.durationMinutes ? ` · ${s.durationMinutes} min` : ''}
                  </Text>
                  <StatusBadge status={s.status ?? 'scheduled'} />
                </View>
                {s.provider?.name ? (
                  <Text className="mt-1 text-sm text-stone-500">With {s.provider.name}</Text>
                ) : null}
                {s.type === 'telehealth' ? (
                  <Text className="mt-1 text-xs font-medium text-teal-700">Video visit</Text>
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
