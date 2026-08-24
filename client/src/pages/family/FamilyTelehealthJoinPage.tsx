import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { ArrowLeft, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getSession, type CareSession } from '@/lib/api/scheduling';
import {
  grantTelehealthConsent,
  getTelehealthRecording,
  isLiveKitUrlReady,
  isTelehealthConsentRequired,
  joinTelehealthRoom,
  sessionJoinRoomName,
  type TelehealthJoin,
  type TelehealthRecording,
} from '@/lib/api/telehealth';

export function FamilyAppointmentJoinRedirect() {
  const { id } = useParams();
  return <Navigate to={`/family/telehealth/${id ?? ''}`} replace />;
}

export default function FamilyTelehealthJoinPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<CareSession | null>(null);
  const [join, setJoin] = useState<TelehealthJoin | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<TelehealthRecording | null>(null);

  const refreshRecording = useCallback(async () => {
    try {
      setRecording(await getTelehealthRecording(sessionId));
    } catch {
      setRecording(null);
    }
  }, [sessionId]);

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
        setError(isApiError(err) ? err.message : 'Could not join the session');
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
      await Promise.all([requestJoin(sessionJoinRoomName(row)), refreshRecording()]);
    } catch (err: unknown) {
      toast.error(isApiError(err) ? err.message : 'Failed to open session');
    } finally {
      setLoading(false);
    }
  }, [refreshRecording, requestJoin, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (needsConsent || join?.phase !== 'waiting' || !session) return undefined;
    const roomName = sessionJoinRoomName(session);
    const timer = window.setInterval(() => {
      void requestJoin(roomName).catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [join?.phase, needsConsent, requestJoin, session]);

  useEffect(() => {
    if (recording?.status !== 'stopping') return undefined;
    const timer = window.setInterval(() => {
      void refreshRecording();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [recording?.status, refreshRecording]);

  async function onGrantConsent() {
    if (!agreed || !session) return;
    setBusy(true);
    try {
      await grantTelehealthConsent();
      await requestJoin(sessionJoinRoomName(session));
      toast.success('Consent saved');
    } catch (err: unknown) {
      toast.error(isApiError(err) ? err.message : 'Could not save consent');
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
        <ArrowLeft className="size-4" /> Video sessions
      </Link>

      <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-teal-50 p-3">
            <Video className="size-6 text-teal-700" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {session?.provider?.name ?? 'Video session'}
            </h2>
            {session && (
              <p className="mt-1 text-sm text-stone-600">
                {new Date(session.scheduledAt).toLocaleString('en-QA')}
              </p>
            )}
          </div>
        </div>

        {needsConsent && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-stone-700">
              Before you join a video session, confirm you agree to receive care over a live video
              call. Clinical details stay in the app — not on this screen.
            </p>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              I agree to join this telehealth session.
            </label>
            <button
              type="button"
              disabled={!agreed || busy}
              onClick={() => void onGrantConsent()}
              className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              Save and continue
            </button>
          </div>
        )}

        {!needsConsent && join?.phase === 'waiting' && (
          <div className="mt-6 space-y-3">
            <p className="text-stone-800 font-medium">You are in the waiting room.</p>
            <p className="text-sm text-stone-600">
              Your clinician will admit you when they are ready. Keep this page open.
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-500" />
            </div>
          </div>
        )}

        {!needsConsent && join?.phase === 'in_call' && (
          <div className="mt-6 space-y-2">
            <p className="font-medium text-stone-800">You have been admitted.</p>
            <p className="text-sm text-stone-600">
              Video will start here when the clinic call server is configured. You can stay on this
              page — you are already in the session.
            </p>
          </div>
        )}

        {error && !needsConsent && <p className="mt-6 text-sm text-rose-700">{error}</p>}
      </div>

      {(recording?.recordingUrl || recording?.status) && (
        <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-stone-900">Session recording</h3>
          {recording.status && (
            <p className="text-xs font-medium uppercase tracking-wide text-teal-800">
              {recording.status.replace(/_/g, ' ')}
            </p>
          )}
          {recording.recordingUrl && (
            <video src={recording.recordingUrl} controls className="w-full rounded-lg bg-black" />
          )}
        </div>
      )}
    </div>
  );
}
