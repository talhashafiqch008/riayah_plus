import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from 'react-native-toast-notifications';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';
import { TelehealthVideoRoom } from '../../../components/telehealth/TelehealthVideoRoom';
import { apiErrorMessage, formatDateTime } from '../../../lib/format';
import { getSession, type CareSession } from '../../../lib/api/scheduling';
import {
  grantTelehealthConsent,
  isLiveKitUrlReady,
  isTelehealthConsentRequired,
  isTelehealthPaymentRequired,
  joinTelehealthRoom,
  sessionJoinRoomName,
  telehealthPaymentInvoiceId,
  type TelehealthJoin,
} from '../../../lib/api/telehealth';

export default function FamilyTelehealthJoinScreen() {
  const { t } = useTranslation('family');
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = String(id ?? '');
  const router = useRouter();
  const toast = useToast();
  const [session, setSession] = useState<CareSession | null>(null);
  const [join, setJoin] = useState<TelehealthJoin | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
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
        setNeedsPayment(false);
        setPaymentInvoiceId(null);
        setError(null);
        return next;
      } catch (err: unknown) {
        if (isTelehealthPaymentRequired(err)) {
          setNeedsPayment(true);
          setPaymentInvoiceId(telehealthPaymentInvoiceId(err));
          setNeedsConsent(false);
          setJoin(null);
          setError(apiErrorMessage(err, t('telehealthJoin.paymentRequired')));
          return null;
        }
        if (isTelehealthConsentRequired(err)) {
          setNeedsConsent(true);
          setNeedsPayment(false);
          setPaymentInvoiceId(null);
          setJoin(null);
          return null;
        }
        setError(apiErrorMessage(err, t('telehealthJoin.joinFailed')));
        return null;
      }
    },
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getSession(sessionId);
      setSession(row);
      await requestJoin(sessionJoinRoomName(row));
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, t('telehealthJoin.openFailed')), { type: 'danger' });
    } finally {
      setLoading(false);
    }
  }, [requestJoin, sessionId, t, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (needsConsent || needsPayment || join?.phase !== 'waiting' || !session) return undefined;
    const roomName = sessionJoinRoomName(session);
    const timer = setInterval(() => {
      void requestJoin(roomName).catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [join?.phase, needsConsent, needsPayment, requestJoin, session]);

  async function onGrantConsent() {
    if (!agreed || !session) return;
    setBusy(true);
    try {
      await grantTelehealthConsent();
      await requestJoin(sessionJoinRoomName(session));
      toast.show(t('telehealthJoin.consentSaved'), { type: 'success' });
    } catch (err: unknown) {
      toast.show(apiErrorMessage(err, t('telehealthJoin.consentFailed')), { type: 'danger' });
    } finally {
      setBusy(false);
    }
  }

  const videoReady =
    join?.phase === 'in_call' && isLiveKitUrlReady(join.serverUrl) && Boolean(join.token);

  const visitTitle = t('telehealthJoin.videoVisitTitle');

  if (videoReady && join?.serverUrl && join.token) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#1c1917' }} edges={['top']}>
        <FamilyTabHero title={visitTitle} subtitle={t('telehealthJoin.inCall')} showBack />
        <TelehealthVideoRoom
          token={join.token}
          serverUrl={join.serverUrl}
          onDisconnected={() => setJoin(null)}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title={visitTitle} subtitle={t('telehealthJoin.waitingTitle')} showBack />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={FAMILY.teal} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {session ? (
            <Text className="mb-4 text-sm text-stone-500">
              {t('telehealthJoin.scheduled', {
                datetime: `${formatDateTime(session.scheduledAt)}${
                  session.provider?.name ? ` · ${session.provider.name}` : ''
                }`,
              })}
            </Text>
          ) : null}

          {needsPayment ? (
            <View className="rounded-2xl border border-stone-200 bg-white p-4">
              <Text className="text-base font-semibold text-stone-900">
                {t('telehealthJoin.paymentTitle')}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-stone-600">
                {t('telehealthJoin.paymentBody')}
              </Text>
              {error ? <Text className="mt-2 text-sm text-rose-700">{error}</Text> : null}
              <View className="mt-4 gap-3">
                {paymentInvoiceId ? (
                  <Button
                    onPress={() => router.push(`/(family)/invoices/${paymentInvoiceId}`)}
                  >
                    {t('telehealthJoin.payToJoin')}
                  </Button>
                ) : null}
                <Button variant="secondary" onPress={() => void load()}>
                  {t('telehealthJoin.tryAgainPaid')}
                </Button>
              </View>
            </View>
          ) : needsConsent ? (
            <View className="rounded-2xl border border-stone-200 bg-white p-4">
              <Text className="text-base font-semibold text-stone-900">
                {t('telehealthJoin.consentRequiredTitle')}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-stone-600">
                {t('telehealthJoin.consentRequiredBody')}
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
                  {t('telehealthJoin.consentCheckbox')}
                </Text>
              </Pressable>
              <View className="mt-4">
                <Button isLoading={busy} disabled={!agreed} onPress={() => void onGrantConsent()}>
                  {t('telehealthJoin.continue')}
                </Button>
              </View>
            </View>
          ) : join?.phase === 'waiting' ? (
            <View className="items-center rounded-2xl border border-stone-200 bg-white px-4 py-10">
              <ActivityIndicator color={FAMILY.teal} />
              <Text className="mt-4 text-base font-semibold text-stone-900">
                {t('telehealthJoin.inWaitingRoom')}
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
                {t('telehealthJoin.waitingRoomBody')}
              </Text>
            </View>
          ) : join?.phase === 'in_call' ? (
            <View className="rounded-2xl border border-stone-200 bg-white px-4 py-8">
              <Text className="text-center text-base font-semibold text-stone-900">
                {t('telehealthJoin.admittedShort')}
              </Text>
              <Text className="mt-2 text-center text-sm leading-5 text-stone-500">
                {isLiveKitUrlReady(join.serverUrl)
                  ? t('telehealthJoin.connectingVideo')
                  : t('telehealthJoin.videoServerNotConfigured')}
              </Text>
            </View>
          ) : (
            <View className="rounded-2xl border border-stone-200 bg-white px-4 py-8">
              <Text className="text-center text-base font-semibold text-stone-900">
                {error ?? t('telehealthJoin.unableToJoin')}
              </Text>
              <View className="mt-4">
                <Button variant="secondary" onPress={() => void load()}>
                  {t('mobile.common.tryAgain')}
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
