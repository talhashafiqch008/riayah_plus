import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { ArrowLeft, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getSession, type CareSession } from '@/lib/api/scheduling';
import { familyDateLocale } from '@/lib/familyLanguage';
import {
  grantTelehealthConsent,
  isLiveKitUrlReady,
  isTelehealthConsentRequired,
  isTelehealthPaymentRequired,
  joinTelehealthRoom,
  sessionJoinRoomName,
  telehealthPaymentInvoiceId,
  type TelehealthJoin,
} from '@/lib/api/telehealth';

export function FamilyAppointmentJoinRedirect() {
  const { id } = useParams();
  return <Navigate to={`/family/telehealth/${id ?? ''}`} replace />;
}

export default function FamilyTelehealthJoinPage() {
  const { t } = useTranslation('family');
  const dateLocale = familyDateLocale();
  const { sessionId = '' } = useParams();
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
          setError(isApiError(err) ? err.message : t('telehealthJoin.paymentRequired'));
          return null;
        }
        if (isTelehealthConsentRequired(err)) {
          setNeedsConsent(true);
          setNeedsPayment(false);
          setPaymentInvoiceId(null);
          setJoin(null);
          return null;
        }
        setError(isApiError(err) ? err.message : t('telehealthJoin.joinFailed'));
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
      toast.error(isApiError(err) ? err.message : t('telehealthJoin.openFailed'));
    } finally {
      setLoading(false);
    }
  }, [requestJoin, sessionId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (needsConsent || needsPayment || join?.phase !== 'waiting' || !session) return undefined;
    const roomName = sessionJoinRoomName(session);
    const timer = window.setInterval(() => {
      void requestJoin(roomName).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [join?.phase, needsConsent, needsPayment, requestJoin, session]);

  async function onGrantConsent() {
    if (!agreed || !session) return;
    setBusy(true);
    try {
      await grantTelehealthConsent();
      await requestJoin(sessionJoinRoomName(session));
      toast.success(t('telehealthJoin.consentSaved'));
    } catch (err: unknown) {
      toast.error(isApiError(err) ? err.message : t('telehealthJoin.consentFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  const videoReady = join?.phase === 'in_call' && isLiveKitUrlReady(join.serverUrl) && Boolean(join.token);

  if (videoReady && join) {
    return (
      <div className="h-[calc(100vh-8rem)] min-h-[480px] overflow-hidden rounded-xl bg-stone-900">
        <LiveKitRoom
          video
          audio
          token={join.token}
          serverUrl={join.serverUrl}
          data-lk-theme="default"
          style={{ height: '100%' }}
          onDisconnected={() => {
            setJoin(null);
          }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link
        to="/family/telehealth"
        className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" /> {t('telehealthJoin.back')}
      </Link>

      <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-50 p-3">
            <Video className="size-6 text-teal-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {session?.provider?.name ?? t('telehealthJoin.title')}
            </h2>
            {session && (
              <p className="mt-1 text-sm text-stone-600">
                {new Date(session.scheduledAt).toLocaleString(dateLocale)}
              </p>
            )}
          </div>
        </div>

        {needsPayment && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-stone-700">{t('telehealthJoin.paymentRequired')}</p>
            {error && <p className="text-sm text-rose-700">{error}</p>}
            <div className="flex flex-wrap gap-3">
              {paymentInvoiceId ? (
                <Link
                  to={`/family/billing/${paymentInvoiceId}`}
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  {t('telehealthJoin.payToJoin')}
                </Link>
              ) : (
                <Link
                  to="/family/billing"
                  className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  {t('telehealthJoin.payToJoin')}
                </Link>
              )}
              <button
                type="button"
                onClick={() => void load()}
                className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-800 hover:bg-stone-50"
              >
                {t('telehealthJoin.tryAgainPaid')}
              </button>
            </div>
          </div>
        )}

        {!needsPayment && needsConsent && (
          <div className="mt-6 space-y-4">
            <p className="text-sm font-medium text-stone-900">{t('telehealthJoin.consentTitle')}</p>
            <p className="text-sm text-stone-700">{t('telehealthJoin.consentBody')}</p>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                aria-label={t('telehealthJoin.consentCta')}
              />
              <span>{t('telehealthJoin.consentCta')}</span>
            </label>
            <button
              type="button"
              disabled={!agreed || busy}
              onClick={() => void onGrantConsent()}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {busy ? t('telehealthJoin.joining') : t('telehealthJoin.consentCta')}
            </button>
          </div>
        )}

        {!needsPayment && !needsConsent && join?.phase === 'waiting' && (
          <div className="mt-6 space-y-3">
            <p className="text-stone-800 font-medium">{t('telehealthJoin.waitingTitle')}</p>
            <p className="text-sm text-stone-600">{t('telehealthJoin.waitingHint')}</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-500" />
            </div>
          </div>
        )}

        {!needsPayment && !needsConsent && join?.phase === 'in_call' && (
          <div className="mt-6 space-y-2">
            <p className="font-medium text-stone-800">{t('telehealthJoin.admittedTitle')}</p>
            <p className="text-sm text-stone-600">
              {t('telehealthJoin.admittedBody')}
            </p>
          </div>
        )}

        {error && !needsConsent && !needsPayment && (
          <p className="mt-6 text-sm text-rose-700">{error}</p>
        )}
      </div>
    </div>
  );
}
