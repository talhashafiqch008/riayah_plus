import { useEffect, useState } from 'react';
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
import { Button, Card, EmptyState, ScreenHeader, StatusBadge } from '../../../components/ui';
import { getSession } from '../../../lib/api/scheduling';
import {
  checkInVisit,
  checkOutVisit,
  validateVisitGps,
  type GeofenceResult,
} from '../../../lib/api/gps';
import { getForegroundPosition } from '../../../lib/location';
import { queryClient } from '../../../lib/query/client';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { toastError } from '../../../lib/toast';

function geofenceTone(status: string | undefined): string {
  if (status === 'within_radius') return 'text-teal-700';
  if (status === 'out_of_radius') return 'text-amber-700';
  return 'text-stone-500';
}

function geofenceCopy(result: GeofenceResult | null): string {
  if (!result) return 'Waiting for GPS…';
  if (result.status === 'no_address') {
    return 'No patient coordinates on file — geofence check skipped.';
  }
  if (result.status === 'within_radius') {
    return `You are ${result.distanceMeters}m from the address (within ${result.radiusMeters}m).`;
  }
  return `You are ${result.distanceMeters}m from the address (radius ${result.radiusMeters}m). You can still check in; the coordinator will be flagged.`;
}

export default function SupportVisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const [notes, setNotes] = useState('');
  const [geo, setGeo] = useState<GeofenceResult | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const query = useQuery({
    queryKey: ['support-visit', id],
    queryFn: () => getSession(id),
    enabled: Boolean(id),
  });

  const session = query.data;
  const checkedIn = Boolean(session?.checkInAt);
  const checkedOut = Boolean(session?.checkOutAt);

  useEffect(() => {
    if (!id || checkedIn) return;
    let cancelled = false;

    async function preview() {
      setLocating(true);
      setGeoError(null);
      try {
        const pos = await getForegroundPosition();
        const result = await validateVisitGps(id, pos);
        if (!cancelled) setGeo(result.geofence);
      } catch (e) {
        if (!cancelled) {
          setGeo(null);
          setGeoError(apiErrorMessage(e, 'Could not read GPS'));
        }
      } finally {
        if (!cancelled) setLocating(false);
      }
    }

    void preview();
    return () => {
      cancelled = true;
    };
  }, [id, checkedIn]);

  const checkInMutation = useMutation({
    mutationFn: async () => {
      const pos = await getForegroundPosition();
      return checkInVisit(id, pos);
    },
    onSuccess: async (result) => {
      setGeo(result.geofence);
      await queryClient.invalidateQueries({ queryKey: ['support-visit', id] });
      await queryClient.invalidateQueries({ queryKey: ['support-visits'] });
      const status = result.geofence.status;
      if (status === 'out_of_radius') {
        toast.show(
          `Checked in ${result.geofence.distanceMeters}m from the address. Coordinator flagged.`,
          { type: 'warning' },
        );
      } else {
        toast.show('Checked in', { type: 'success' });
      }
    },
    onError: (e) => toastError(toast, e, 'Check-in failed'),
  });

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      const pos = await getForegroundPosition();
      return checkOutVisit(id, {
        ...pos,
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: async () => {
      setNotes('');
      await queryClient.invalidateQueries({ queryKey: ['support-visit', id] });
      await queryClient.invalidateQueries({ queryKey: ['support-visits'] });
      toast.show('Checked out', { type: 'success' });
    },
    onError: (e) => toastError(toast, e, 'Check-out failed'),
  });

  if (!id) {
    return (
      <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
        <ScreenHeader title="Visit" />
        <EmptyState icon="alert-circle-outline" title="Missing visit" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Visit check-in" />

      {query.isLoading && !session ? (
        <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
      ) : query.isError || !session ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Could not load visit"
          subtitle={query.error ? apiErrorMessage(query.error) : 'Visit not found'}
          action={{ label: 'Try again', onPress: () => void query.refetch() }}
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
                  {session.client?.name ?? 'Patient'}
                </Text>
                <Text className="mt-1 text-sm text-stone-500">
                  {formatDateTime(session.scheduledAt)}
                </Text>
                <Text className="mt-0.5 text-xs capitalize text-stone-400">
                  {(session.type ?? 'visit').replace(/_/g, ' ')}
                </Text>
              </View>
              <StatusBadge status={session.status} />
            </View>
          </Card>

          {checkedOut ? (
            <Card>
              <Text className="text-sm font-medium text-stone-700">Checked out</Text>
              <Text className="mt-1 text-sm text-stone-500">
                {session.checkOutAt ? formatDateTime(session.checkOutAt) : 'Complete'}
              </Text>
            </Card>
          ) : checkedIn ? (
            <Card>
              <Text className="text-sm font-medium text-teal-800">Checked in</Text>
              {session.checkInAt ? (
                <Text className="mt-1 text-sm text-stone-500">
                  {formatDateTime(session.checkInAt)}
                </Text>
              ) : null}
              {session.geofenceStatus ? (
                <Text className={`mt-2 text-sm ${geofenceTone(session.geofenceStatus)}`}>
                  Geofence: {session.geofenceStatus.replace(/_/g, ' ')}
                </Text>
              ) : null}

              <Text className="mt-4 mb-2 text-sm font-medium text-stone-700">Visit notes</Text>
              <TextInput
                className="min-h-[100px] rounded-xl border border-stone-200 bg-white px-3 py-2 text-base text-stone-900"
                placeholder="Optional notes on checkout"
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
                    Alert.alert('Check out?', 'This records your GPS location and ends the visit.', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Check out',
                        style: 'destructive',
                        onPress: () => checkOutMutation.mutate(),
                      },
                    ]);
                  }}
                >
                  GPS check-out
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
                  {locating ? 'Getting your location…' : geofenceCopy(geo)}
                </Text>
              )}
              <Button
                disabled={locating}
                isLoading={checkInMutation.isPending}
                onPress={() => checkInMutation.mutate()}
              >
                GPS check-in
              </Button>
            </Card>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
