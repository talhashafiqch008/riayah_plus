import {
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../ui';
import { ROLE, roleCardStyle } from '../shell/RoleChrome';
import { VisitCheckinMap } from '../maps/VisitCheckinMap';
import {
  listActiveWorkers,
  listGpsLogs,
  type GpsLogRow,
} from '../../lib/api/gps';
import { apiClient } from '../../lib/api/client';
import { apiErrorMessage, formatDateTime } from '../../lib/format';

export interface GpsComplianceStats {
  totalCheckins: number;
  totalCheckouts: number;
  outOfRadius: number;
  complianceRate: string | number;
}

async function fetchGpsCompliance() {
  const { data } = await apiClient.get('/api/gps/compliance');
  return (data?.data ?? data) as GpsComplianceStats;
}

function logBadge(log: GpsLogRow): { label: string; status: string } {
  if (log.eventType === 'checkout') return { label: 'checked out', status: 'completed' };
  if (log.geofenceStatus === 'no_address') return { label: 'no address', status: 'pending' };
  if (log.geofenced) return { label: 'within radius', status: 'completed' };
  return {
    label: (log.geofenceStatus ?? 'out of radius').replace(/_/g, ' '),
    status: 'cancelled',
  };
}

interface GpsMonitorScreenProps {
  visitHref: (sessionId: string) => string;
}

export function GpsMonitorScreen({ visitHref }: GpsMonitorScreenProps) {
  const statsQuery = useQuery({
    queryKey: ['gps-compliance'],
    queryFn: fetchGpsCompliance,
  });

  const logsQuery = useQuery({
    queryKey: ['gps-logs'],
    queryFn: () => listGpsLogs({ limit: 50 }),
  });

  const activeQuery = useQuery({
    queryKey: ['gps-active-workers'],
    queryFn: listActiveWorkers,
    refetchInterval: 10_000,
  });

  const s = statsQuery.data;
  const logs = logsQuery.data?.data ?? [];
  const workers = activeQuery.data ?? [];
  const loading =
    (statsQuery.isLoading && !statsQuery.data) ||
    (logsQuery.isLoading && !logsQuery.data) ||
    (activeQuery.isLoading && !activeQuery.data);
  const err = statsQuery.error ?? logsQuery.error ?? activeQuery.error;

  const refetchAll = () => {
    void statsQuery.refetch();
    void logsQuery.refetch();
    void activeQuery.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Visit GPS"
        subtitle="Check-ins, check-outs, and who is on a visit now"
        showBack
      />
      {loading ? (
        <View className="flex-row flex-wrap gap-3 p-4">
          <View className="h-24 w-[47%]" style={roleCardStyle} />
          <View className="h-24 w-[47%]" style={roleCardStyle} />
        </View>
      ) : err ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load GPS data"
          subtitle={apiErrorMessage(err)}
          action={{ label: 'Try again', onPress: refetchAll }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={statsQuery.isFetching || logsQuery.isFetching || activeQuery.isFetching}
              onRefresh={refetchAll}
              tintColor={ROLE.teal}
            />
          }
        >
          <View className="flex-row flex-wrap gap-3">
            <StatCard label="Check-ins" value={s?.totalCheckins ?? 0} />
            <StatCard label="Check-outs" value={s?.totalCheckouts ?? 0} />
            <StatCard label="Out of radius" value={s?.outOfRadius ?? 0} />
            <StatCard
              label="Compliance"
              value={s?.complianceRate != null ? `${s.complianceRate}%` : '—'}
              teal
            />
          </View>

          <Text className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
            Live location
          </Text>
          {workers.length === 0 ? (
            <Text className="mb-2 text-sm text-stone-500">
              No one is checked in. Open the visit screen on the worker phone to share live GPS.
            </Text>
          ) : (
            workers.map((w) => {
              const dest =
                w.targetLat != null && w.targetLng != null
                  ? { latitude: w.targetLat, longitude: w.targetLng }
                  : null;
              const you =
                w.lat != null && w.lng != null
                  ? { latitude: w.lat, longitude: w.lng }
                  : null;
              return (
                <View key={w.sessionId} className="mb-4">
                  <VisitCheckinMap
                    destination={dest}
                    destinationLabel={w.patientName}
                    you={you}
                    youLabel={w.name}
                    address={w.patientName}
                  />
                  <Card
                    className="mt-2"
                    onPress={() => router.push(visitHref(w.sessionId))}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-semibold text-stone-900">{w.name}</Text>
                        <Text className="mt-1 text-sm text-stone-600">With {w.patientName}</Text>
                        <Text className="mt-1 text-xs text-stone-400">
                          {w.isLive
                            ? 'Live location'
                            : w.lastSeenAt
                              ? `Last seen ${formatDateTime(w.lastSeenAt)}`
                              : w.checkInAt
                                ? `Checked in ${formatDateTime(w.checkInAt)}`
                                : 'Waiting for GPS'}
                          {w.distanceMeters != null ? ` · ${Math.round(w.distanceMeters)}m from address` : ''}
                        </Text>
                      </View>
                      <StatusBadge
                        status={w.isLive ? 'completed' : w.withinGeofence ? 'completed' : 'cancelled'}
                        label={w.isLive ? 'live' : (w.geofenceStatus ?? 'unknown').replace(/_/g, ' ')}
                      />
                    </View>
                  </Card>
                </View>
              );
            })
          )}

          <Text className="mb-3 mt-6 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
            Check-ins and check-outs
          </Text>
          {logs.length === 0 ? (
            <Text className="text-sm text-stone-500">No visit GPS recorded yet.</Text>
          ) : (
            logs.map((log) => {
              const badge = logBadge(log);
              return (
                <Card
                  key={log.id}
                  className="mb-3"
                  onPress={
                    log.sessionId ? () => router.push(visitHref(log.sessionId!)) : undefined
                  }
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-bold text-stone-900">
                        {log.worker?.name ?? 'Worker'}
                      </Text>
                      <Text className="mt-0.5 text-xs text-stone-500">
                        {log.client?.name ? `${log.client.name} · ` : ''}
                        {formatDateTime(log.createdAt)}
                      </Text>
                      <Text className="mt-0.5 text-xs text-stone-400">
                        {log.eventType === 'checkout' ? 'Check-out' : 'Check-in'}
                        {log.address ? ` · ${log.address}` : ''}
                        {log.distanceMeters != null ? ` · ${log.distanceMeters}m` : ''}
                      </Text>
                    </View>
                    <StatusBadge status={badge.status} label={badge.label} />
                  </View>
                </Card>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  teal,
}: {
  label: string;
  value: string | number;
  teal?: boolean;
}) {
  return (
    <View className="w-[47%] p-4" style={roleCardStyle}>
      <Text className="text-xs text-stone-500">{label}</Text>
      <Text
        className={`mt-1 text-2xl font-extrabold ${teal ? 'text-teal-700' : 'text-stone-900'}`}
        style={{ letterSpacing: -0.6, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
    </View>
  );
}
