import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

const CLOSED = new Set(['cancelled', 'completed', 'rejected', 'no_show']);

export default function SupportVisitsScreen() {
  const { t } = useTranslation('support');

  const query = useQuery({
    queryKey: ['support-visits'],
    queryFn: () => listSessions(),
  });

  const rows = (query.data ?? [])
    .filter((s) => !CLOSED.has(s.status) || s.checkInAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  function visitState(session: CareSession): { label: string; status: string } {
    if (session.checkOutAt) return { label: t('visits.checkedOut'), status: 'completed' };
    if (session.checkInAt) return { label: t('visits.checkedIn'), status: 'in_progress' };
    return {
      label: t(`visits.status.${session.status}`, {
        defaultValue: session.status.replace(/_/g, ' '),
      }),
      status: session.status,
    };
  }

  function typeLabel(type?: string | null) {
    const key = type ?? 'visit';
    return t(`visits.types.${key}`, { defaultValue: key.replace(/_/g, ' ') });
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('visits.title')} subtitle={t('visits.description')} />

      {query.isLoading && !query.data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('visits.loadError')}
          subtitle={apiErrorMessage(query.error)}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title={t('visits.empty')}
          subtitle={t('visits.emptyHint')}
        />
      ) : (
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
          {rows.map((session) => {
            const state = visitState(session);
            return (
              <Card
                key={session.id}
                className="mb-3"
                onPress={() => router.push(`/(support)/visits/${session.id}`)}
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-stone-900">
                      {session.client?.name ?? t('visits.patient')}
                    </Text>
                    <Text className="mt-1 text-sm text-stone-500">
                      {formatDateTime(session.scheduledAt)}
                    </Text>
                    <Text className="mt-0.5 text-xs capitalize text-stone-400">
                      {typeLabel(session.type)}
                    </Text>
                  </View>
                  <StatusBadge status={state.status} label={state.label} />
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
