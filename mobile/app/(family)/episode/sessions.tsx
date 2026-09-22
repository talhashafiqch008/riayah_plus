import { useMemo } from 'react';
import {
  ActivityIndicator,
  SectionList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { SessionCard, type SessionCardSession } from '../../../components/session/SessionCard';
import { apiClient } from '../../../lib/api/client';
import { apiErrorMessage, activeDateLocale } from '../../../lib/format';

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(activeDateLocale(), { month: 'long', year: 'numeric' });
}

export function SessionsTab({ episodeId }: { episodeId?: string }) {
  const { t } = useTranslation('family');
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['episode-sessions', episodeId],
    enabled: Boolean(episodeId),
    queryFn: async () => {
      const { data: res } = await apiClient.get('/api/scheduling/sessions', {
        params: { episodeId },
      });
      return (res.sessions ?? res.data ?? []) as SessionCardSession[];
    },
  });

  const sessions = data ?? [];

  const sections = useMemo(() => {
    if (sessions.length <= 3) {
      return [{ title: t('mobile.episode.sessionsSection'), data: sessions }];
    }
    const map = new Map<string, SessionCardSession[]>();
    for (const s of sessions) {
      const key = monthKey(s.scheduledAt);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return Array.from(map.entries()).map(([title, rows]) => ({
      title,
      data: rows,
    }));
  }, [sessions, t]);

  if (!episodeId) {
    return (
      <EmptyState
        icon="calendar-outline"
        title={t('mobile.episode.noEpisodeTitle')}
        subtitle={t('mobile.episode.selectEpisodeSessions')}
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
        title={t('mobile.common.notifications.loadError')}
        subtitle={apiErrorMessage(error)}
        action={{ label: t('mobile.common.tryAgain'), onPress: () => void refetch() }}
      />
    );
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title={t('mobile.episode.noSessionsTitle')}
        subtitle={t('mobile.episode.noSessionsSubtitle')}
      />
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={isFetching}
          onRefresh={() => void refetch()}
          tintColor="#0D9488"
        />
      }
      contentContainerStyle={{ paddingVertical: 12, paddingBottom: 32 }}
      renderSectionHeader={({ section }) =>
        sessions.length > 3 ? (
          <Text className="mb-2 mt-2 px-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
            {section.title}
          </Text>
        ) : null
      }
      renderItem={({ item }) => (
        <SessionCard
          session={{
            ...item,
            providerName: item.providerName ?? item.provider?.name,
            serviceType: item.serviceType ?? item.type,
          }}
          variant="family"
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title={t('mobile.episode.noSessionsTitle')}
          subtitle={t('mobile.episode.noSessionsSubtitle')}
        />
      }
    />
  );
}

export default function EpisodeSessionsScreen() {
  const { t } = useTranslation('family');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title={t('mobile.episode.sessionsTitle')}
        subtitle={t('mobile.episode.sessionsSubtitle')}
        showBack
      />
      <SessionsTab />
    </SafeAreaView>
  );
}
