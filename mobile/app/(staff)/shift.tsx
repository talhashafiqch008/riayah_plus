import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { useToast } from 'react-native-toast-notifications';
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../components/ui';
import { ShiftTimer } from '../../components/shift/ShiftTimer';
import { apiClient } from '../../lib/api/client';
import {
  apiErrorMessage,
  formatDateTime,
  haversineMetres,
} from '../../lib/format';
import { queryClient } from '../../lib/query/client';
import { useShiftStore } from '../../stores/shiftStore';
import { toastError } from '../../lib/toast';

interface StaffSession {
  id: string;
  scheduledAt: string;
  status: string;
  type?: string;
  notes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  patientLat?: number | string | null;
  patientLng?: number | string | null;
  address?: string | null;
  clientName?: string;
  client?: { id?: string; name?: string; address?: string | null };
  checkInAt?: string | null;
  checkOutAt?: string | null;
}

const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'rejected', 'no_show']);

function toNum(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function sessionCoords(session: StaffSession): { lat: number; lng: number } | null {
  const lat = toNum(session.patientLat ?? session.latitude);
  const lng = toNum(session.patientLng ?? session.longitude);
  if (lat === null || lng === null) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function clientLabel(session: StaffSession): string {
  return session.clientName ?? session.client?.name ?? 'Client';
}

function addressLabel(session: StaffSession): string {
  return session.address ?? session.client?.address ?? 'Address not set';
}

function distanceTone(metres: number): string {
  if (metres < 100) return 'text-green-600';
  if (metres < 500) return 'text-amber-500';
  return 'text-red-600';
}

async function fetchSessions(): Promise<StaffSession[]> {
  const { data } = await apiClient.get<{ sessions?: StaffSession[] }>('/api/scheduling/sessions');
  return Array.isArray(data.sessions) ? data.sessions : [];
}

function pickNextSession(sessions: StaffSession[]): StaffSession | null {
  const now = Date.now();
  const open = sessions
    .filter((s) => !CLOSED_STATUSES.has(s.status) && !s.checkOutAt)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const upcoming = open.find((s) => new Date(s.scheduledAt).getTime() >= now - 60 * 60 * 1000);
  return upcoming ?? open[0] ?? null;
}

export default function ShiftScreen() {
  const toast = useToast();
  const isOnShift = useShiftStore((s) => s.isOnShift);
  const sessionId = useShiftStore((s) => s.sessionId);
  const startShift = useShiftStore((s) => s.startShift);
  const endShift = useShiftStore((s) => s.endShift);

  const [distanceM, setDistanceM] = useState<number | null>(null);
  const [geoSkipped, setGeoSkipped] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');

  const sessionsQuery = useQuery({
    queryKey: ['sessions-me'],
    queryFn: fetchSessions,
  });

  const nextSession = useMemo(() => {
    const list = sessionsQuery.data ?? [];
    if (isOnShift && sessionId) {
      return list.find((s) => s.id === sessionId) ?? null;
    }
    return pickNextSession(list);
  }, [sessionsQuery.data, isOnShift, sessionId]);

  const target = nextSession ? sessionCoords(nextSession) : null;

  useEffect(() => {
    let cancelled = false;

    async function refreshDistance() {
      if (!nextSession || isOnShift) {
        setDistanceM(null);
        setGeoSkipped(false);
        return;
      }
      if (!target) {
        setDistanceM(null);
        setGeoSkipped(true);
        return;
      }
      setGeoSkipped(false);
      setLocating(true);
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) {
            setDistanceM(null);
            toast.show('Location permission is required for check-in.', { type: 'warning' });
          }
          return;
        }
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (cancelled) return;
        const dist = haversineMetres(
          pos.coords.latitude,
          pos.coords.longitude,
          target.lat,
          target.lng,
        );
        setDistanceM(dist);
      } catch (e) {
        if (!cancelled) {
          toastError(toast, e, 'Could not read GPS');
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    }

    void refreshDistance();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when session / coords change
  }, [nextSession?.id, target?.lat, target?.lng, isOnShift]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!nextSession) throw new Error('No session available to check in.');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required to check in.');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;
      const coords = sessionCoords(nextSession);

      if (coords) {
        const dist = haversineMetres(latitude, longitude, coords.lat, coords.lng);
        setDistanceM(dist);
        setGeoSkipped(false);
        if (dist > 500) {
          throw new Error(
            `You are ${Math.round(dist)}m from the location. Move closer to check in.`,
          );
        }
      } else {
        setGeoSkipped(true);
        setDistanceM(null);
      }

      await apiClient.post('/api/telehealth/checkin', {
        sessionId: nextSession.id,
        latitude,
        longitude,
      });

      return { sessionId: nextSession.id, latitude, longitude };
    },
    onSuccess: ({ sessionId: id, latitude, longitude }) => {
      startShift(id, latitude, longitude);
      void queryClient.invalidateQueries({ queryKey: ['sessions-me'] });
      toast.show('Checked in', { type: 'success' });
    },
    onError: (e) => {
      toastError(toast, e);
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const activeId = sessionId ?? nextSession?.id;
      if (!activeId) throw new Error('No active session to check out.');

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required to check out.');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await apiClient.post('/api/telehealth/checkout', {
        sessionId: activeId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return activeId;
    },
    onSuccess: () => {
      endShift();
      setSessionNotes('');
      void queryClient.invalidateQueries({ queryKey: ['sessions-me'] });
      toast.show('Checked out', { type: 'success' });
    },
    onError: (e) => {
      toastError(toast, e);
    },
  });

  const tooFar = distanceM !== null && distanceM > 500 && !geoSkipped;
  const checkInDisabled =
    !nextSession || locating || checkInMutation.isPending || tooFar;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Shift" showBack={false} />

      {sessionsQuery.isLoading && !sessionsQuery.data ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : sessionsQuery.isError ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load"
          subtitle={apiErrorMessage(sessionsQuery.error)}
          action={{ label: 'Try again', onPress: () => void sessionsQuery.refetch() }}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {isOnShift ? (
            <View className="px-4 pt-4">
              <Card className="bg-teal-600" shadow={false}>
                <Text className="text-sm text-teal-100">On Shift</Text>
                <ShiftTimer className="mt-1" />
                {nextSession ? (
                  <View className="mt-3">
                    <Text className="text-base font-semibold text-white">
                      {clientLabel(nextSession)}
                    </Text>
                    <Text className="mt-0.5 text-sm text-teal-100">
                      {addressLabel(nextSession)}
                    </Text>
                    <Text className="mt-1 text-xs text-teal-100/80">
                      {formatDateTime(nextSession.scheduledAt)}
                    </Text>
                  </View>
                ) : null}
                <View className="mt-4">
                  <Button
                    variant="destructive"
                    isLoading={checkOutMutation.isPending}
                    onPress={() => {
                      Alert.alert('End shift?', 'This will check you out of the session.', [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'End Shift',
                          style: 'destructive',
                          onPress: () => checkOutMutation.mutate(),
                        },
                      ]);
                    }}
                  >
                    End Shift
                  </Button>
                </View>
              </Card>

              <Card className="mt-4" shadow>
                <Text className="mb-2 text-sm font-medium text-stone-700">Session notes</Text>
                <TextInput
                  className="min-h-[100px] rounded-xl border border-stone-200 bg-white px-3 py-2 text-base text-stone-900"
                  placeholder="Add session notes..."
                  placeholderTextColor="#A8A29E"
                  multiline
                  textAlignVertical="top"
                  value={sessionNotes}
                  onChangeText={setSessionNotes}
                />
                <Text className="mt-2 text-xs text-stone-300">
                  Notes are kept on device for this shift (checkout API accepts GPS only).
                </Text>
              </Card>
            </View>
          ) : !nextSession ? (
            <EmptyState
              icon="calendar-outline"
              title="No upcoming sessions"
              subtitle="When you have a scheduled visit, you can check in here."
            />
          ) : (
            <View className="px-4 pt-4">
              <Card shadow>
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-teal-600">
                      Next session
                    </Text>
                    <Text className="mt-1 text-lg font-semibold text-stone-900">
                      {clientLabel(nextSession)}
                    </Text>
                    <Text className="mt-1 text-sm text-stone-500">
                      {formatDateTime(nextSession.scheduledAt)}
                    </Text>
                    <Text className="mt-1 text-sm text-stone-400">{addressLabel(nextSession)}</Text>
                  </View>
                  <StatusBadge status={nextSession.status} />
                </View>

                <View className="mt-4">
                  {geoSkipped ? (
                    <Text className="mb-3 text-sm text-amber-600">
                      No patient coordinates on this session — geofence check skipped.
                    </Text>
                  ) : locating || distanceM === null ? (
                    <Text className="mb-3 text-sm text-stone-400">
                      {locating ? 'Getting your location…' : 'Waiting for GPS…'}
                    </Text>
                  ) : (
                    <Text className={`mb-3 text-sm font-medium ${distanceTone(distanceM)}`}>
                      You are {Math.round(distanceM)}m from the location
                    </Text>
                  )}

                  <Button
                    disabled={checkInDisabled}
                    isLoading={checkInMutation.isPending}
                    onPress={() => checkInMutation.mutate()}
                  >
                    Check In
                  </Button>
                </View>
              </Card>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
