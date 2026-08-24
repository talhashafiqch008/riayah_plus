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
import { EmptyState } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { SessionCard, type SessionCardSession } from '../../../components/session/SessionCard';
import { apiClient } from '../../../lib/api/client';
import { apiErrorMessage } from '../../../lib/format';

function monthKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

export function SessionsTab({ episodeId }: { episodeId?: string }) {
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
      return [{ title: 'Sessions', data: sessions }];
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
  }, [sessions]);

  if (!episodeId) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No episode"
        subtitle="Select an episode to view sessions."
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

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon="calendar-outline"
        title="No sessions yet"
        subtitle="Booked care sessions will appear here."
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
          title="No sessions yet"
          subtitle="Booked care sessions will appear here."
        />
      }
    />
  );
}

export default function EpisodeSessionsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Sessions" subtitle="Booked visits for this care journey" showBack />
      <SessionsTab />
    </SafeAreaView>
  );
}
