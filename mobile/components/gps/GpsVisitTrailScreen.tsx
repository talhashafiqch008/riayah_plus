import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Card, EmptyState, ScreenHeader, StatusBadge } from '../ui';
import { VisitCheckinMap } from '../maps/VisitCheckinMap';
import { getGpsReplay } from '../../lib/api/gps';
import { apiErrorMessage, formatDateTime } from '../../lib/format';

function geofenceBadgeLabel(t: TFunction, status: string | null | undefined, checkedOut: boolean) {
  if (checkedOut) return t('mobile.gps.badges.checkedOut');
  const key = status ?? 'unknown';
  return t(`mobile.gps.badges.${key}`, {
    defaultValue: key.replace(/_/g, ' '),
  });
}

interface GpsVisitTrailScreenProps {
  i18nNs?: 'coordinator' | 'org';
}

export function GpsVisitTrailScreen({ i18nNs = 'coordinator' }: GpsVisitTrailScreenProps) {
  const { t } = useTranslation(i18nNs);
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const query = useQuery({
    queryKey: ['gps-replay', sessionId],
    queryFn: () => getGpsReplay(sessionId),
    enabled: Boolean(sessionId),
    refetchInterval: (q) => (q.state.data?.session.checkOutAt ? false : 10_000),
  });

  const replay = query.data;
  const dest =
    replay?.target.lat != null && replay.target.lng != null
      ? { latitude: replay.target.lat, longitude: replay.target.lng }
      : null;
  const livePoint = [...(replay?.points ?? [])].reverse().find((p) => p.kind === 'ping');
  const checkIn = replay?.points.find((p) => p.kind === 'checkin');
  const workerFrom = livePoint ?? checkIn ?? replay?.points[0];
  const workerPoint = workerFrom
    ? { latitude: workerFrom.lat, longitude: workerFrom.lng }
    : null;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title={t('mobile.gps.title')}
        subtitle={t('mobile.gps.trailSubtitle')}
        showBack
      />

      {!sessionId ? (
        <EmptyState icon="alert-circle-outline" title={t('mobile.gps.missingVisit')} />
      ) : query.isLoading && !replay ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError || !replay ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('mobile.gps.trailLoadError')}
          subtitle={query.error ? apiErrorMessage(query.error) : t('mobile.gps.notFound')}
          action={{ label: t('mobile.shell.tryAgain'), onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View className="mb-4">
            <VisitCheckinMap
              destination={dest}
              destinationLabel={replay.session.clientName}
              you={workerPoint}
              youLabel={replay.session.providerName}
              radiusMeters={replay.target.radiusMeters}
              address={replay.target.address}
            />
          </View>

          <Card className="mb-4" shadow>
            <Text className="text-base font-semibold text-stone-900">
              {replay.session.providerName}
            </Text>
            <Text className="mt-1 text-sm text-stone-600">
              {t('mobile.gps.visitWith', { name: replay.session.clientName })}
            </Text>
            <Text className="mt-1 text-xs text-stone-400">
              {formatDateTime(replay.session.scheduledAt)}
            </Text>
            <View className="mt-3">
              <StatusBadge
                status={
                  replay.session.checkOutAt
                    ? 'completed'
                    : replay.session.withinGeofence
                      ? 'completed'
                      : 'cancelled'
                }
                label={geofenceBadgeLabel(
                  t,
                  replay.session.geofenceStatus,
                  Boolean(replay.session.checkOutAt),
                )}
              />
            </View>
            {replay.session.checkInAt ? (
              <Text className="mt-3 text-sm text-stone-500">
                {t('mobile.gps.inAt', { time: formatDateTime(replay.session.checkInAt) })}
              </Text>
            ) : null}
            {replay.session.checkOutAt ? (
              <Text className="mt-1 text-sm text-stone-500">
                {t('mobile.gps.outAt', { time: formatDateTime(replay.session.checkOutAt) })}
              </Text>
            ) : null}
          </Card>

          <Text className="mb-2 font-semibold text-stone-900">{t('mobile.gps.trail')}</Text>
          {replay.logs.filter((l) => l.eventType !== 'ping').length === 0 ? (
            <Text className="text-sm text-stone-500">{t('mobile.gps.noTrailPoints')}</Text>
          ) : (
            replay.logs
              .filter((log) => log.eventType !== 'ping')
              .map((log) => (
                <Card key={log.id} className="mb-2" shadow>
                  <Text className="text-sm font-medium text-stone-800">
                    {log.eventType === 'checkout'
                      ? t('mobile.gps.checkOut')
                      : t('mobile.gps.checkIn')}
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
