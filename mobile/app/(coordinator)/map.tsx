import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../../components/ui';
import { listActiveWorkers } from '../../lib/api/gps';
import { apiErrorMessage, formatDateTime } from '../../lib/format';

function geofenceLabel(status: string | null, within: boolean): { label: string; status: string } {
  if (status === 'out_of_radius' || !within) {
    return { label: 'out of radius', status: 'cancelled' };
  }
  if (status === 'no_address') return { label: 'no address', status: 'pending' };
  return { label: 'within radius', status: 'completed' };
}

export default function CoordinatorMapScreen() {
  const query = useQuery({
    queryKey: ['gps-active-workers'],
    queryFn: listActiveWorkers,
    refetchInterval: 30_000,
  });

  const workers = query.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Active workers"
        subtitle="Last GPS check-in. Map view comes next."
      />

      {query.isLoading && !query.data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load locations"
          subtitle={apiErrorMessage(query.error)}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : workers.length === 0 ? (
        <EmptyState
          icon="location-outline"
          title="No one checked in"
          subtitle="Workers appear here after they GPS check in to a visit."
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
          {workers.map((w) => {
            const fence = geofenceLabel(w.geofenceStatus, w.withinGeofence);
            return (
              <Card key={w.sessionId} className="mb-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-stone-900">{w.name}</Text>
                    <Text className="mt-1 text-sm text-stone-600">
                      With {w.patientName}
                    </Text>
                    {w.checkInAt ? (
                      <Text className="mt-1 text-xs text-stone-400">
                        Checked in {formatDateTime(w.checkInAt)}
                      </Text>
                    ) : null}
                    {w.lat != null && w.lng != null ? (
                      <Text className="mt-1 text-xs text-stone-400">
                        {w.lat.toFixed(5)}, {w.lng.toFixed(5)}
                        {w.distanceMeters != null ? ` · ${Math.round(w.distanceMeters)}m` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <StatusBadge status={fence.status} label={fence.label} />
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
