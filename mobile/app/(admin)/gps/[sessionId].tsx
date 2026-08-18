import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, StatusBadge } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { getGpsReplay } from '../../../lib/api/gps';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

export default function AdminGpsSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const query = useQuery({
    queryKey: ['admin-gps-replay', sessionId],
    queryFn: () => getGpsReplay(sessionId),
    enabled: Boolean(sessionId),
  });

  const replay = query.data;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title="Visit GPS" subtitle="Check-in and check-out trail" />

      {!sessionId ? (
        <EmptyState icon="alert-circle-outline" title="Missing visit" />
      ) : query.isLoading && !replay ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError || !replay ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load GPS trail"
          subtitle={query.error ? apiErrorMessage(query.error) : 'Not found'}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Card className="mb-4">
            <Text className="text-base font-semibold text-stone-900">
              {replay.session.providerName}
            </Text>
            <Text className="mt-1 text-sm text-stone-600">
              Visit with {replay.session.clientName}
            </Text>
            <Text className="mt-1 text-xs text-stone-400">
              {formatDateTime(replay.session.scheduledAt)}
            </Text>
            <View className="mt-3">
              <StatusBadge
                status={replay.session.withinGeofence ? 'completed' : 'cancelled'}
                label={(replay.session.geofenceStatus ?? 'unknown').replace(/_/g, ' ')}
              />
            </View>
            {replay.target.address ? (
              <Text className="mt-3 text-sm text-stone-500">{replay.target.address}</Text>
            ) : null}
            <Text className="mt-1 text-xs text-stone-400">
              Radius {replay.target.radiusMeters}m
              {replay.target.lat != null && replay.target.lng != null
                ? ` · ${replay.target.lat.toFixed(5)}, ${replay.target.lng.toFixed(5)}`
                : ''}
            </Text>
          </Card>

          <Text className="mb-2 font-semibold text-stone-900">Trail</Text>
          {replay.logs.length === 0 ? (
            <Text className="text-sm text-stone-500">No GPS points on this visit.</Text>
          ) : (
            replay.logs.map((log) => (
              <Card key={log.id} className="mb-2" shadow={false}>
                <Text className="text-sm font-medium capitalize text-stone-800">
                  {log.eventType}
                </Text>
                <Text className="mt-0.5 text-xs text-stone-500">
                  {formatDateTime(log.createdAt)}
                </Text>
                <Text className="mt-0.5 text-xs text-stone-400">
                  {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                  {log.distanceMeters != null ? ` · ${log.distanceMeters}m` : ''}
                </Text>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
