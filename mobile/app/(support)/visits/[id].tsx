import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { VisitCheckinMap } from '../../../components/maps/VisitCheckinMap';
import { getSession } from '../../../lib/api/scheduling';
import {
  checkInVisit,
  checkOutVisit,
  getGpsReplay,
  pingVisitLocation,
  validateVisitGps,
  type GeofenceResult,
  type GpsTarget,
} from '../../../lib/api/gps';
import {
  getForegroundPosition,
  watchForegroundPosition,
  type ForegroundPosition,
} from '../../../lib/location';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

function geofenceTone(status: string | undefined): string {
  if (status === 'within_radius') return 'text-teal-700';
  if (status === 'out_of_radius') return 'text-amber-700';
  return 'text-stone-500';
}

function toCoord(lat?: number | null, lng?: number | null) {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { latitude: lat, longitude: lng };
}

export default function SupportVisitDetailScreen() {
  const { t } = useTranslation('support');
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [geo, setGeo] = useState<GeofenceResult | null>(null);
  const [target, setTarget] = useState<GpsTarget | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [you, setYou] = useState<ForegroundPosition | null>(null);
  const lastValidated = useRef<{ lat: number; lng: number; at: number } | null>(null);
  const lastPinged = useRef<{ lat: number; lng: number; at: number } | null>(null);

  function geofenceCopy(result: GeofenceResult | null): string {
    if (!result) return t('visits.waitingGps');
    if (result.status === 'no_address') {
      return t('visits.noAddress');
    }
    if (result.status === 'within_radius') {
      return t('visits.withinRadius', {
        distance: result.distanceMeters,
        radius: result.radiusMeters,
      });
    }
    return t('visits.outsideRadius', {
      distance: result.distanceMeters,
      radius: result.radiusMeters,
    });
  }

  const query = useQuery({
    queryKey: ['support-visit', id],
    queryFn: () => getSession(id),
    enabled: Boolean(id),
  });

  const replayQuery = useQuery({
    queryKey: ['support-visit-gps', id],
    queryFn: () => getGpsReplay(id),
    enabled: Boolean(id),
  });

  const session = query.data;
  const checkedIn = Boolean(session?.checkInAt);
  const checkedOut = Boolean(session?.checkOutAt);

  useEffect(() => {
    const replayTarget = replayQuery.data?.target;
    if (!replayTarget) return;
    setTarget((prev) => prev ?? replayTarget);
  }, [replayQuery.data]);

  useEffect(() => {
    if (!id || checkedOut) return;
    let stop: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      try {
        stop = await watchForegroundPosition((pos) => {
          if (!cancelled) setYou(pos);
        });
      } catch (e) {
        if (!cancelled) setGeoError(apiErrorMessage(e, t('visits.gpsReadFailed')));
      }
    })();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [id, checkedOut, t]);

  useEffect(() => {
    if (!id || !checkedIn || checkedOut || !you) return;
    const prev = lastPinged.current;
    const moved =
      !prev ||
      Math.abs(prev.lat - you.latitude) > 0.00025 ||
      Math.abs(prev.lng - you.longitude) > 0.00025;
    const stale = !prev || Date.now() - prev.at > 20_000;
    if (!moved && !stale) return;
    lastPinged.current = { lat: you.latitude, lng: you.longitude, at: Date.now() };
    void pingVisitLocation(id, you).catch(() => undefined);
  }, [id, checkedIn, checkedOut, you]);

  useEffect(() => {
    if (!id || checkedIn || !you) return;

    const prev = lastValidated.current;
    const moved =
      !prev ||
      Math.abs(prev.lat - you.latitude) > 0.0003 ||
      Math.abs(prev.lng - you.longitude) > 0.0003;
    const stale = !prev || Date.now() - prev.at > 12_000;
    if (!moved && !stale) return;

    let cancelled = false;
    lastValidated.current = { lat: you.latitude, lng: you.longitude, at: Date.now() };

    async function preview(pos: ForegroundPosition) {
      setLocating(true);
      setGeoError(null);
      try {
        const result = await validateVisitGps(id, pos);
        if (cancelled) return;
        setGeo(result.geofence);
        setTarget(result.target);
      } catch (e) {
        if (!cancelled) setGeoError(apiErrorMessage(e, t('visits.gpsReadFailed')));
      } finally {
        if (!cancelled) setLocating(false);
      }
    }

    void preview(you);
    return () => {
      cancelled = true;
    };
  }, [id, checkedIn, you, t]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const pos = you ?? (await getForegroundPosition());
      return checkInVisit(id, pos);
    },
    onSuccess: async (result) => {
      setGeo(result.geofence);
      if (result.target) setTarget(result.target);
      await queryClient.invalidateQueries({ queryKey: ['support-visit', id] });
      await queryClient.invalidateQueries({ queryKey: ['support-visits'] });
      await queryClient.invalidateQueries({ queryKey: ['support-visit-gps', id] });
      const status = result.geofence.status;
      if (status === 'out_of_radius') {
        toast.show(
          t('visits.checkedInFarToast', { distance: result.geofence.distanceMeters }),
          { type: 'warning' },
        );
      } else {
        toast.show(t('visits.checkedInToast'), { type: 'success' });
      }
    },
    onError: (e) => toastError(toast, e, t('visits.checkInFailed')),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const pos = you ?? (await getForegroundPosition());
      return checkOutVisit(id, {
        ...pos,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setNotes('');
      await queryClient.invalidateQueries({ queryKey: ['support-visit', id] });
      await queryClient.invalidateQueries({ queryKey: ['support-visits'] });
      await queryClient.invalidateQueries({ queryKey: ['support-visit-gps', id] });
      toast.show(t('visits.checkedOutToast'), { type: 'success' });
    },
    onError: (e) => toastError(toast, e, t('visits.checkOutFailed')),
  });

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title={t('visits.visitFallback')} />
        <EmptyState icon="alert-circle-outline" title={t('visits.missingVisit')} />
      </SafeAreaView>
    );
  }

  const dest = toCoord(target?.lat ?? replayQuery.data?.target.lat, target?.lng ?? replayQuery.data?.target.lng);
  const youCoord = toCoord(you?.latitude, you?.longitude);
  const address = target?.address ?? replayQuery.data?.target.address ?? null;
  const radius = geo?.radiusMeters ?? replayQuery.data?.target.radiusMeters ?? null;
  const patientName = session?.client?.name ?? replayQuery.data?.session.clientName ?? t('visits.patient');

  const mapBlock = (
    <View className="mb-4">
      <VisitCheckinMap
        destination={dest}
        destinationLabel={patientName}
        you={youCoord}
        radiusMeters={radius}
        address={address}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('visits.detailTitle')} />

      {query.isLoading && !session ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError || !session ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t('visits.loadDetailError')}
          subtitle={query.error ? apiErrorMessage(query.error) : t('visits.notFound')}
          action={{ label: t('visits.tryAgain'), onPress: () => void query.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Card className="mb-4" shadow>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-stone-900">
                  {session.client?.name ?? t('visits.patient')}
                </Text>
                <Text className="mt-1 text-sm text-stone-500">
                  {formatDateTime(session.scheduledAt)}
                </Text>
                <Text className="mt-0.5 text-xs capitalize text-stone-400">
                  {t(`visits.types.${session.type ?? 'visit'}`, {
                    defaultValue: (session.type ?? 'visit').replace(/_/g, ' '),
                  })}
                </Text>
              </View>
              <StatusBadge
                status={session.status}
                label={t(`visits.status.${session.status}`, {
                  defaultValue: session.status.replace(/_/g, ' '),
                })}
              />
            </View>
          </Card>

          {mapBlock}

          {checkedOut ? (
            <Card>
              <Text className="text-sm font-medium text-stone-700">{t('visits.checkedOut')}</Text>
              <Text className="mt-1 text-sm text-stone-500">
                {session.checkOutAt ? formatDateTime(session.checkOutAt) : t('visits.complete')}
              </Text>
            </Card>
          ) : checkedIn ? (
            <Card>
              <Text className="text-sm font-medium text-teal-800">{t('visits.checkedIn')}</Text>
              <Text className="mt-1 text-sm text-stone-500">{t('visits.liveSharing')}</Text>
              {session.checkInAt ? (
                <Text className="mt-1 text-sm text-stone-500">
                  {formatDateTime(session.checkInAt)}
                </Text>
              ) : null}
              {session.geofenceStatus ? (
                <Text className={`mt-2 text-sm ${geofenceTone(session.geofenceStatus)}`}>
                  {t('visits.geofenceLabel', {
                    status: t(`visits.geofenceStatus.${session.geofenceStatus}`, {
                      defaultValue: session.geofenceStatus.replace(/_/g, ' '),
                    }),
                  })}
                </Text>
              ) : null}

              <Text className="mt-4 mb-2 text-sm font-medium text-stone-700">
                {t('visits.visitNotes')}
              </Text>
              <TextInput
                className="min-h-[100px] rounded-xl border border-stone-200 bg-white px-3 py-2 text-base text-stone-900"
                placeholder={t('visits.notesPlaceholder')}
                placeholderTextColor="#A8A29E"
                multiline
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
              />

              <View className="mt-4">
                <Button
                  variant="destructive"
                  isLoading={checkOutMutation.isPending}
                  onPress={() => {
                    Alert.alert(t('visits.checkOutConfirmTitle'), t('visits.checkOutConfirmBody'), [
                      { text: t('visits.cancel'), style: 'cancel' },
                      {
                        text: t('visits.checkOutAction'),
                        style: 'destructive',
                        onPress: () => checkOutMutation.mutate(),
                      },
                    ]);
                  }}
                >
                  {t('visits.gpsCheckOut')}
                </Button>
              </View>
            </Card>
          ) : (
            <Card>
              {geoError ? (
                <View className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                  <Text className="text-sm text-red-700">{geoError}</Text>
                </View>
              ) : (
                <Text className={`mb-3 text-sm ${geofenceTone(geo?.status)}`}>
                  {locating && !geo ? t('visits.gettingLocation') : geofenceCopy(geo)}
                </Text>
              )}
              <Button
                disabled={locating && !you}
                isLoading={checkInMutation.isPending}
                onPress={() => checkInMutation.mutate()}
              >
                {t('visits.gpsCheckIn')}
              </Button>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
