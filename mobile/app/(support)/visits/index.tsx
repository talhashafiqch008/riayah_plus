import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

const CLOSED = new Set(['cancelled', 'completed', 'rejected', 'no_show']);

function visitState(session: CareSession): { label: string; status: string } {
  if (session.checkOutAt) return { label: 'checked out', status: 'completed' };
  if (session.checkInAt) return { label: 'checked in', status: 'in_progress' };
  return { label: session.status.replace(/_/g, ' '), status: session.status };
}

export default function SupportVisitsScreen() {
  const query = useQuery({
    queryKey: ['support-visits'],
    queryFn: () => listSessions(),
  });

  const rows = (query.data ?? [])
    .filter((s) => !CLOSED.has(s.status) || s.checkInAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Visits" subtitle="GPS check-in at the patient's address" />

      {query.isLoading && !query.data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load visits"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="No visits assigned"
          subtitle="When a coordinator books a home visit for you, check in here."
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
                      {session.client?.name ?? 'Patient'}
                    </Text>
                    <Text className="mt-1 text-sm text-stone-500">
                      {formatDateTime(session.scheduledAt)}
                    </Text>
                    <Text className="mt-0.5 text-xs capitalize text-stone-400">
                      {(session.type ?? 'visit').replace(/_/g, ' ')}
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
