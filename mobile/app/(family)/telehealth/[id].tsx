import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { Button } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { LiveKitRoomWebView } from '../../../components/telehealth/LiveKitRoomWebView';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { getSession, type CareSession } from '../../../lib/api/scheduling';
import {
  grantTelehealthConsent,
  isLiveKitUrlReady,
  isTelehealthConsentRequired,
  joinTelehealthRoom,
  sessionJoinRoomName,
  type TelehealthJoin,
} from '../../../lib/api/telehealth';

export default function FamilyTelehealthJoinScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = String(id ?? '');
  const toast = useToast();
  const [session, setSession] = useState<CareSession | null>(null);
  const [join, setJoin] = useState<TelehealthJoin | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestJoin = useCallback(
    async (roomName: string) => {
      try {
        const next = await joinTelehealthRoom(roomName);
        setJoin(next);
        setNeedsConsent(false);
        setError(null);
        return next;
      } catch (err: unknown) {
        if (isTelehealthConsentRequired(err)) {
          setNeedsConsent(true);
          setJoin(null);
          return null;
        }
        setError(apiErrorMessage(err, 'Could not join the session'));
        return null;
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getSession(sessionId);
      setSession(row);
      await requestJoin(sessionJoinRoomName(row));
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, 'Failed to open session'), { type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [requestJoin, sessionId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (needsConsent || join?.phase !== 'waiting' || !session) return undefined;
    const roomName = sessionJoinRoomName(session);
    const timer = setInterval(() => {
      void requestJoin(roomName).catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [join?.phase, needsConsent, requestJoin, session]);

  async function onGrantConsent() {
    if (!agreed || !session) return;
    setBusy(true);
    try {
      await grantTelehealthConsent();
      await requestJoin(sessionJoinRoomName(session));
      toast.show('Consent saved', { type: 'success' });
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, 'Could not save consent'), { type: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  const videoReady =
    join?.phase === 'in_call' && isLiveKitUrlReady(join.serverUrl) && Boolean(join.token);

  if (videoReady && join?.serverUrl && join.token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1917' }} edges={['top']}>
        <FamilyTabHero title="Video visit" subtitle="In call" showBack />
        <LiveKitRoomWebView
          token={join.token}
          serverUrl={join.serverUrl}
          onDisconnected={() => setJoin(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Video visit" subtitle="Waiting room" showBack />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={FAMILY.teal} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {session ? (
            <Text className="mb-4 text-sm text-stone-500">
              Scheduled {formatDateTime(session.scheduledAt)}
              {session.provider?.name ? ` · ${session.provider.name}` : ''}
            </Text>
          ) : null}

          {needsConsent ? (
            <View className="rounded-2xl border border-stone-200 bg-white p-4">
              <Text className="text-base font-semibold text-stone-900">Consent required</Text>
              <Text className="mt-2 text-sm leading-5 text-stone-600">
                Before joining a video visit, confirm you agree to receive care over a secure video
                connection.
              </Text>
              <Pressable
                onPress={() => setAgreed((v) => !v)}
                className="mt-4 flex-row items-start gap-3"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreed }}
              >
                <View
                  className={`mt-0.5 h-5 w-5 items-center justify-center rounded-md border ${
                    agreed ? 'border-teal-600 bg-teal-600' : 'border-stone-300 bg-white'
                  }`}
                >
                  {agreed ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                </View>
                <Text className="flex-1 text-sm leading-5 text-stone-600">
                  I consent to join this telehealth session.
                </Text>
              </Pressable>
              <View className="mt-4">
                <Button isLoading={busy} disabled={!agreed} onPress={() => void onGrantConsent()}>
                  Continue
                </Button>
              </View>
            </View>
          ) : join?.phase === 'waiting' ? (
            <View className="items-center rounded-2xl border border-stone-200 bg-white px-4 py-10">
              <ActivityIndicator color={FAMILY.teal} />
              <Text className="mt-4 text-base font-semibold text-stone-900">In the waiting room</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
                Your clinician will admit you shortly. Keep this screen open.
              </Text>
            </View>
          ) : join?.phase === 'in_call' ? (
            <View className="rounded-2xl border border-stone-200 bg-white px-4 py-8">
              <Text className="text-center text-base font-semibold text-stone-900">You are admitted</Text>
              <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
                {isLiveKitUrlReady(join.serverUrl)
                  ? 'Connecting to video…'
                  : 'Video server is not configured yet. You are admitted — your clinician can continue on web, or LiveKit can be configured for mobile video.'}
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl border border-stone-200 bg-white px-4 py-8">
              <Text className="text-center text-base font-semibold text-stone-900">
                {error ?? 'Unable to join'}
              </Text>
              <View className="mt-4">
                <Button variant="secondary" onPress={() => void load()}>
                  Try again
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
