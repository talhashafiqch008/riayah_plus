import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, StatusBadge } from '../../../components/ui';
import { AdminScreenHeader } from '../../../components/admin/AdminScreenHeader';
import { fetchAdminGpsCompliance } from '../../../lib/api/admin';
import { listGpsLogs } from '../../../lib/api/gps';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';

export default function AdminGpsScreen() {
  const statsQuery = useQuery({
    queryKey: ['admin-gps-compliance'],
    queryFn: fetchAdminGpsCompliance,
  });

  const logsQuery = useQuery({
    queryKey: ['admin-gps-logs'],
    queryFn: () => listGpsLogs({ limit: 50 }),
  });

  const s = (statsQuery.data ?? {}) as {
    totalCheckins?: number;
    outOfRadius?: number;
    complianceRate?: string | number;
  };

  const logs = logsQuery.data?.data ?? [];
  const loading = (statsQuery.isLoading && !statsQuery.data) || (logsQuery.isLoading && !logsQuery.data);
  const err = statsQuery.error ?? logsQuery.error;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader
        title="GPS Monitor"
        subtitle="Check-in geofence compliance"
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : err ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load GPS data"
          subtitle={apiErrorMessage(err)}
          action={{
            label: 'Try again',
            onPress: () => {
              void statsQuery.refetch();
              void logsQuery.refetch();
            },
          }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={statsQuery.isFetching || logsQuery.isFetching}
              onRefresh={() => {
                void statsQuery.refetch();
                void logsQuery.refetch();
              }}
              tintColor="#0D9488"
            />
          }
        >
          <View className="flex-row flex-wrap gap-3">
            <Card className="w-[47%]">
              <Text className="text-xs text-stone-500">Total check-ins</Text>
              <Text className="mt-1 text-xl font-semibold text-stone-900">
                {s.totalCheckins ?? 0}
              </Text>
            </Card>
            <Card className="w-[47%]">
              <Text className="text-xs text-stone-500">Out of radius</Text>
              <Text className="mt-1 text-xl font-semibold text-stone-900">
                {s.outOfRadius ?? 0}
              </Text>
            </Card>
            <Card className="w-full">
              <Text className="text-xs text-stone-500">Compliance rate</Text>
              <Text className="mt-1 text-xl font-semibold text-teal-700">
                {s.complianceRate != null ? `${s.complianceRate}%` : '—'}
              </Text>
            </Card>
          </View>

          <Text className="mt-6 mb-2 font-semibold text-stone-900">Recent GPS logs</Text>
          {logs.length === 0 ? (
            <Text className="text-sm text-stone-500">No check-ins recorded yet.</Text>
          ) : (
            logs.map((log) => (
              <Card
                key={log.id}
                className="mb-2"
                shadow={false}
                onPress={
                  log.sessionId
                    ? () => router.push(`/(admin)/gps/${log.sessionId}`)
                    : undefined
                }
              >
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-stone-900">
                      {log.worker?.name ?? 'Worker'}
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-500">
                      {log.client?.name ? `${log.client.name} · ` : ''}
                      {formatDateTime(log.createdAt)}
                    </Text>
                    <Text className="mt-0.5 text-xs capitalize text-stone-400">
                      {log.eventType}
                      {log.distanceMeters != null ? ` · ${log.distanceMeters}m` : ''}
                    </Text>
                  </View>
                  {log.eventType === 'checkin' ? (
                    <StatusBadge
                      status={log.geofenced ? 'completed' : 'cancelled'}
                      label={log.geofenceStatus?.replace(/_/g, ' ') ?? (log.geofenced ? 'within' : 'out')}
                    />
                  ) : null}
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
