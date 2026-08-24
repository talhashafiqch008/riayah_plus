import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { ArrowLeft, Circle, PanelRight, RefreshCw, Square, UserCheck, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getSession, type CareSession } from '@/lib/api/scheduling';
import {
  addTelehealthSessionNote,
  admitTelehealthParticipant,
  getTelehealthContext,
  getTelehealthLobby,
  getTelehealthRecording,
  isLiveKitUrlReady,
  joinTelehealthRoom,
  sessionJoinRoomName,
  startTelehealthRecording,
  stopTelehealthRecording,
  type TelehealthContext,
  type TelehealthJoin,
  type TelehealthLobby,
  type TelehealthRecording,
} from '@/lib/api/telehealth';

function ContextPanel({
  sessionId,
  context,
  onRefresh,
  compact,
}: {
  sessionId: string;
  context: TelehealthContext | null;
  onRefresh: () => void;
  compact?: boolean;
}) {
  const [note, setNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);

  async function onSaveNote(event: FormEvent) {
    event.preventDefault();
    const content = note.trim();
    if (!content) return;
    setSaving(true);
    try {
      await addTelehealthSessionNote(sessionId, { content, isPrivate, noteType: 'session_note' });
      setNote('');
      toast.success('Note saved to episode');
      onRefresh();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not save note');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${compact ? '' : 'rounded-xl border border-stone-100 bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <PanelRight className="size-4 text-teal-700" />
          <h3 className="text-sm font-semibold text-stone-900">Session context</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
          aria-label="Refresh context"
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
        {!context ? (
          <p className="text-stone-500">Loading care context…</p>
        ) : (
          <>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Episode</p>
              {context.episode ? (
                <div className="mt-1">
                  <p className="font-medium text-stone-900">{context.episode.title}</p>
                  <p className="text-xs text-stone-500">{context.episode.status.replace(/_/g, ' ')}</p>
                </div>
              ) : (
                <p className="mt-1 text-stone-500">No episode linked</p>
              )}
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Care plan</p>
              {context.carePlan ? (
                <div className="mt-1 space-y-2">
                  <p className="font-medium text-stone-900">
                    {context.carePlan.title}{' '}
                    <span className="text-xs font-normal text-stone-500">v{context.carePlan.version}</span>
                  </p>
                  {context.carePlan.goals.length > 0 && (
                    <ul className="space-y-1">
                      {context.carePlan.goals.map((goal) => (
                        <li key={goal.id} className="rounded-lg bg-stone-50 px-2.5 py-1.5 text-xs text-stone-700">
                          {goal.title}
                          <span className="ml-1 text-stone-400">· {goal.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {context.carePlan.items.length > 0 && (
                    <ul className="space-y-1 text-xs text-stone-600">
                      {context.carePlan.items.map((item, idx) => (
                        <li key={`${item.serviceType}-${idx}`}>
                          {item.serviceType.replace(/_/g, ' ')}
                          {item.frequency ? ` · ${item.frequency}` : ''}
                          {item.duration ? ` · ${item.duration}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-stone-500">No active care plan</p>
              )}
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">Notes</p>
              {context.notes.length === 0 ? (
                <p className="mt-1 text-stone-500">No notes yet</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {context.notes.slice(0, 12).map((row) => (
                    <li key={row.id} className="rounded-lg border border-stone-100 px-2.5 py-2">
                      <p className="whitespace-pre-wrap text-stone-800">{row.content}</p>
                      <p className="mt-1 text-[10px] text-stone-400">
                        {row.author?.name ?? 'Staff'}
                        {row.isPrivate ? ' · private' : ''}
                        {' · '}
                        {new Date(row.createdAt).toLocaleString('en-QA')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <form onSubmit={onSaveNote} className="border-t border-stone-100 p-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Add a session note"
          className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Private
          </label>
          <button
            type="submit"
            disabled={saving || !note.trim()}
            className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            Save note
          </button>
        </div>
      </form>
    </div>
  );
}

function LobbyPanel({
  lobby,
  admittingId,
  onAdmit,
  onRefresh,
}: {
  lobby: TelehealthLobby | null;
  admittingId: string | null;
  onAdmit: (userId: string) => void;
  onRefresh: () => void;
}) {
  const waiting = lobby?.lobby ?? [];
  const admitted = new Set(lobby?.admitted ?? []);

  return (
    <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-900">Waiting room</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>
      {waiting.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">No one is waiting.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {waiting.map((user) => {
            const already = admitted.has(user.id);
            return (
              <li
                key={user.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-stone-900">{user.name}</p>
                  <p className="text-xs text-stone-500">{user.role?.replace(/_/g, ' ') ?? 'Participant'}</p>
                </div>
                <button
                  type="button"
                  disabled={already || admittingId === user.id}
                  onClick={() => onAdmit(user.id)}
                  className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <UserCheck className="size-3.5" />
                  {already ? 'Admitted' : admittingId === user.id ? '…' : 'Admit'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {admitted.size > 0 && waiting.length === 0 && (
        <p className="mt-2 text-xs text-teal-700">{admitted.size} participant(s) admitted</p>
      )}
    </div>
  );
}

function RecordingArchive({ recording }: { recording: TelehealthRecording | null }) {
  if (!recording?.recordingUrl && !recording?.status) return null;
  const status = recording.status?.replace(/_/g, ' ') ?? '';
  return (
    <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm space-y-3">
      <h3 className="text-sm font-semibold text-stone-900">Session recording</h3>
      {status && <p className="text-xs font-medium uppercase tracking-wide text-teal-800">{status}</p>}
      {recording.recordingUrl && (
        <video src={recording.recordingUrl} controls className="w-full rounded-lg bg-black" />
      )}
    </div>
  );
}

export default function ClinicalTelehealthJoinPage() {
  const { sessionId = '' } = useParams();
  const [session, setSession] = useState<CareSession | null>(null);
  const [join, setJoin] = useState<TelehealthJoin | null>(null);
  const [lobby, setLobby] = useState<TelehealthLobby | null>(null);
  const [context, setContext] = useState<TelehealthContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [admittingId, setAdmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPanel, setShowPanel] = useState(true);
  const [recording, setRecording] = useState<TelehealthRecording | null>(null);
  const [recBusy, setRecBusy] = useState(false);
  const recStatus = recording?.status ?? null;

  const refreshLobby = useCallback(async () => {
    try {
      setLobby(await getTelehealthLobby(sessionId));
    } catch {
      /* staff-only; ignore on load race */
    }
  }, [sessionId]);

  const refreshContext = useCallback(async () => {
    try {
      setContext(await getTelehealthContext(sessionId));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load session context');
    }
  }, [sessionId]);

  const refreshRecording = useCallback(async () => {
    try {
      setRecording(await getTelehealthRecording(sessionId));
    } catch {
      setRecording(null);
    }
  }, [sessionId]);

  const requestJoin = useCallback(async (roomName: string) => {
    try {
      const next = await joinTelehealthRoom(roomName);
      setJoin(next);
      setError(null);
      return next;
    } catch (err: unknown) {
      setError(isApiError(err) ? err.message : 'Could not join the session');
      return null;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getSession(sessionId);
      setSession(row);
      await Promise.all([
        requestJoin(sessionJoinRoomName(row)),
        refreshLobby(),
        refreshContext(),
        refreshRecording(),
      ]);
    } catch (err: unknown) {
      toast.error(isApiError(err) ? err.message : 'Failed to open session');
    } finally {
      setLoading(false);
    }
  }, [refreshContext, refreshLobby, refreshRecording, requestJoin, sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshLobby();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [refreshLobby]);

  useEffect(() => {
    if (recStatus !== 'stopping') return undefined;
    const timer = window.setInterval(() => {
      void refreshRecording();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [recStatus, refreshRecording]);

  async function onAdmit(userId: string) {
    setAdmittingId(userId);
    try {
      await admitTelehealthParticipant(sessionId, userId);
      toast.success('Participant admitted');
      await refreshLobby();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Admit failed');
    } finally {
      setAdmittingId(null);
    }
  }

  async function onStartRecording() {
    setRecBusy(true);
    try {
      await startTelehealthRecording(sessionId);
      toast.success('Recording started — both participants are included');
      setRecording((prev) => ({ ...(prev ?? {}), status: 'in_progress' }));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not start recording');
    } finally {
      setRecBusy(false);
    }
  }

  async function onStopRecording() {
    setRecBusy(true);
    try {
      await stopTelehealthRecording(sessionId);
      toast.success('Recording stopped. Saving video…');
      await refreshRecording();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not stop recording');
    } finally {
      setRecBusy(false);
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
      <div className="flex h-[calc(100vh-8rem)] min-h-[480px] overflow-hidden rounded-xl bg-stone-900">
        <div className="relative min-w-0 flex-1">
          <div className="absolute right-3 top-3 z-10 flex gap-2">
            {recStatus === 'in_progress' ? (
              <button
                type="button"
                disabled={recBusy}
                onClick={() => void onStopRecording()}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Square className="size-3 fill-current" /> Stop recording
              </button>
            ) : (
              <button
                type="button"
                disabled={recBusy}
                onClick={() => void onStartRecording()}
                className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Circle className="size-3 fill-rose-500 text-rose-500" /> Start recording
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPanel((v) => !v)}
              className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {showPanel ? 'Hide panel' : 'Show panel'}
            </button>
          </div>
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
        {showPanel && (
          <aside className="hidden w-80 shrink-0 border-l border-stone-700 bg-white lg:flex lg:flex-col">
            <div className="border-b border-stone-100 p-3">
              <LobbyPanel
                lobby={lobby}
                admittingId={admittingId}
                onAdmit={(id) => void onAdmit(id)}
                onRefresh={() => void refreshLobby()}
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ContextPanel
                sessionId={sessionId}
                context={context}
                onRefresh={() => void refreshContext()}
                compact
              />
              <div className="p-3">
                <RecordingArchive recording={recording} />
              </div>
            </div>
          </aside>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/clinical/telehealth"
        className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-stone-900"
      >
        <ArrowLeft className="size-4" /> Video sessions
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <div className="rounded-xl border border-stone-100 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-teal-50 p-3">
                <Video className="size-6 text-teal-700" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-stone-900">
                  {session?.client?.name ?? 'Video session'}
                </h2>
                {session && (
                  <p className="mt-1 text-sm text-stone-600">
                    {new Date(session.scheduledAt).toLocaleString('en-QA')}
                  </p>
                )}
              </div>
            </div>

            {join?.phase === 'in_call' && (
              <div className="mt-6 space-y-2">
                <p className="font-medium text-stone-800">You are in the session.</p>
                <p className="text-sm text-stone-600">
                  Live video starts when the clinic LiveKit server is configured. Admit family from
                  the waiting room and use the side panel for plan, goals, and notes.
                </p>
              </div>
            )}

            {error && <p className="mt-6 text-sm text-rose-700">{error}</p>}
          </div>

          <LobbyPanel
            lobby={lobby}
            admittingId={admittingId}
            onAdmit={(id) => void onAdmit(id)}
            onRefresh={() => void refreshLobby()}
          />
          <RecordingArchive recording={recording} />
        </div>

        <div className="min-h-[28rem]">
          <ContextPanel
            sessionId={sessionId}
            context={context}
            onRefresh={() => void refreshContext()}
          />
        </div>
      </div>
    </div>
  );
}
