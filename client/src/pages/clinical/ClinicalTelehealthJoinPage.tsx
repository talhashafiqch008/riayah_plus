import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LiveKitRoom, RoomAudioRenderer, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { ArrowLeft, Circle, FileText, Loader2, PanelRight, RefreshCw, Square, UserCheck, Video, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { getSession, type CareSession } from '@/lib/api/scheduling';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';
import { familyDateLocale } from '@/lib/familyLanguage';
import {
  addTelehealthSessionNote,
  admitTelehealthParticipant,
  getRecordingIntelligence,
  getTelehealthContext,
  getTelehealthLobby,
  getTelehealthRecording,
  isLiveKitUrlReady,
  joinTelehealthRoom,
  sessionJoinRoomName,
  startTelehealthRecording,
  stopTelehealthRecording,
  type RecordingIntelligenceRun,
  type TelehealthContext,
  type TelehealthJoin,
  type TelehealthLobby,
  type TelehealthRecording,
  type TranscriptArtifact,
  type TranscriptSegment,
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
  const { t } = useTranslation('clinical');
  const dateLocale = familyDateLocale();
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
      toast.success(t('telehealthJoin.noteSaved'));
      onRefresh();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('telehealthJoin.noteFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`flex h-full min-h-0 flex-col ${compact ? '' : 'rounded-xl border border-stone-100 bg-white shadow-sm'}`}>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <PanelRight className="size-4 text-teal-700" />
          <h3 className="text-sm font-semibold text-stone-900">{t('telehealthJoin.sessionContext')}</h3>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100"
          aria-label={t('telehealthJoin.refreshContext')}
        >
          <RefreshCw className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
        {!context ? (
          <p className="text-stone-500">{t('telehealthJoin.loadingContext')}</p>
        ) : (
          <>
            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{t('telehealthJoin.episode')}</p>
              {context.episode ? (
                <div className="mt-1">
                  <p className="font-medium text-stone-900">{localizeGeneratedLabel(context.episode.title)}</p>
                  <p className="text-xs text-stone-500">{context.episode.status.replace(/_/g, ' ')}</p>
                </div>
              ) : (
                <p className="mt-1 text-stone-500">{t('telehealthJoin.noEpisode')}</p>
              )}
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{t('telehealthJoin.carePlan')}</p>
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
                <p className="mt-1 text-stone-500">{t('telehealthJoin.noCarePlan')}</p>
              )}
            </section>

            <section>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{t('telehealthJoin.notes')}</p>
              {context.notes.length === 0 ? (
                <p className="mt-1 text-stone-500">{t('telehealthJoin.noNotes')}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {context.notes.slice(0, 12).map((row) => (
                    <li key={row.id} className="rounded-lg border border-stone-100 px-2.5 py-2">
                      <p className="whitespace-pre-wrap text-stone-800">{row.content}</p>
                      <p className="mt-1 text-[10px] text-stone-400">
                        {row.author?.name ?? t('telehealthJoin.staff')}
                        {row.isPrivate ? ` · ${t('telehealthJoin.privateTag')}` : ''}
                        {' · '}
                        {new Date(row.createdAt).toLocaleString(dateLocale)}
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
          placeholder={t('telehealthJoin.notePlaceholder')}
          className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            {t('telehealthJoin.private')}
          </label>
          <button
            type="submit"
            disabled={saving || !note.trim()}
            className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {t('telehealthJoin.saveNote')}
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
  const { t } = useTranslation('clinical');
  const waiting = lobby?.lobby ?? [];
  const admitted = new Set(lobby?.admitted ?? []);

  return (
    <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-900">{t('telehealthJoin.waitingRoom')}</h3>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-800"
        >
          <RefreshCw className="size-3.5" /> {t('telehealthJoin.refresh')}
        </button>
      </div>
      {waiting.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500">{t('telehealthJoin.nobodyWaiting')}</p>
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
                  <p className="text-xs text-stone-500">{user.role?.replace(/_/g, ' ') ?? t('telehealthJoin.participant')}</p>
                </div>
                <button
                  type="button"
                  disabled={already || admittingId === user.id}
                  onClick={() => onAdmit(user.id)}
                  className="inline-flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  <UserCheck className="size-3.5" />
                  {already ? t('telehealthJoin.admitted') : admittingId === user.id ? '…' : t('telehealthJoin.admit')}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {admitted.size > 0 && waiting.length === 0 && (
        <p className="mt-2 text-xs text-teal-700">{t('telehealthJoin.admittedCount', { count: admitted.size })}</p>
      )}
    </div>
  );
}

function formatSegmentTime(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function transcriptFromRun(run: RecordingIntelligenceRun): {
  status: string;
  segments: TranscriptSegment[];
  completeText: string;
  warnings: string[];
} | null {
  const row = run.artifacts.find((a) => a.artifactType === 'transcript');
  if (!row) return null;
  const payload = (row.artifact ?? null) as TranscriptArtifact | null;
  const segments = Array.isArray(payload?.segments) ? payload!.segments! : [];
  const completeText =
    (typeof payload?.completeText === 'string' && payload.completeText.trim()) ||
    segments.map((s) => s.text).filter(Boolean).join('\n');
  return {
    status: String(row.status),
    segments,
    completeText,
    warnings: Array.isArray(payload?.warnings) ? payload!.warnings! : [],
  };
}

function RecordingArchive({
  sessionId,
  recording,
}: {
  sessionId: string;
  recording: TelehealthRecording | null;
}) {
  const { t } = useTranslation('clinical');
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptStatus, setTranscriptStatus] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [completeText, setCompleteText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);

  if (!recording?.recordingUrl && !recording?.status) return null;
  const status = recording.status?.replace(/_/g, ' ') ?? '';

  const openTranscript = async () => {
    if (transcriptLoading) return;
    setTranscriptLoading(true);
    setTranscriptOpen(true);
    setTranscriptStatus(null);
    setPipelineError(null);
    setSegments([]);
    setCompleteText('');
    setWarnings([]);
    try {
      const run = await getRecordingIntelligence(sessionId);
      if (run.status === 'failed' || run.status === 'delivery_failed') {
        setTranscriptStatus('pipeline_failed');
        setPipelineError(run.errorMessage || run.errorCode || null);
        return;
      }
      const parsed = transcriptFromRun(run);
      if (!parsed) {
        setTranscriptStatus(
          run.status === 'processing' || run.status === 'queued' ? 'processing' : 'missing',
        );
        return;
      }
      if (parsed.status !== 'completed') {
        setTranscriptStatus(parsed.status);
        return;
      }
      setTranscriptStatus('completed');
      setSegments(parsed.segments);
      setCompleteText(parsed.completeText);
      setWarnings(parsed.warnings);
    } catch (error: unknown) {
      if (isApiError(error) && error.statusCode === 404) {
        setTranscriptStatus('missing');
      } else {
        setTranscriptOpen(false);
        toast.error(isApiError(error) ? error.message : t('telehealthJoin.transcriptFailed'));
      }
    } finally {
      setTranscriptLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-stone-900">{t('telehealthJoin.sessionRecording')}</h3>
          {status && <p className="mt-1 text-xs font-medium uppercase tracking-wide text-teal-800">{status}</p>}
        </div>
        {recording.recordingUrl && (
          <button
            type="button"
            onClick={() => void openTranscript()}
            disabled={transcriptLoading}
            aria-busy={transcriptLoading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-900 hover:bg-teal-100 disabled:cursor-wait disabled:opacity-70"
          >
            {transcriptLoading ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <FileText className="size-3.5" aria-hidden />
            )}
            {transcriptLoading ? t('telehealthJoin.loadingTranscript') : t('telehealthJoin.viewTranscript')}
          </button>
        )}
      </div>
      {recording.recordingUrl && (
        <video src={recording.recordingUrl} controls className="w-full rounded-lg bg-black" />
      )}

      {transcriptOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-stone-950/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-transcript-title"
          onClick={() => !transcriptLoading && setTranscriptOpen(false)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-4 py-3">
              <div>
                <h4 id="session-transcript-title" className="text-sm font-semibold text-stone-900">
                  {t('telehealthJoin.transcriptTitle')}
                </h4>
                <p className="mt-0.5 text-xs text-amber-800">{t('telehealthJoin.transcriptDraft')}</p>
              </div>
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                disabled={transcriptLoading}
                className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50"
                aria-label={t('telehealthJoin.transcriptClose')}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
              {transcriptLoading && (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-stone-600">
                  <Loader2 className="size-6 animate-spin text-teal-600" />
                  {t('telehealthJoin.loadingTranscript')}
                </div>
              )}

              {!transcriptLoading && transcriptStatus === 'missing' && (
                <p className="py-8 text-center text-sm text-stone-600">{t('telehealthJoin.transcriptNotFound')}</p>
              )}

              {!transcriptLoading && transcriptStatus === 'pipeline_failed' && (
                <div className="space-y-2 py-8 text-center text-sm text-stone-600">
                  <p>{t('telehealthJoin.transcriptPipelineFailed')}</p>
                  {pipelineError && (
                    <p className="font-mono text-xs text-rose-700">{pipelineError}</p>
                  )}
                </div>
              )}

              {!transcriptLoading &&
                transcriptStatus &&
                transcriptStatus !== 'completed' &&
                transcriptStatus !== 'missing' &&
                transcriptStatus !== 'pipeline_failed' && (
                  <p className="py-8 text-center text-sm text-stone-600">{t('telehealthJoin.transcriptNotReady')}</p>
                )}

              {!transcriptLoading && transcriptStatus === 'completed' && (
                <div className="space-y-3">
                  {warnings.length > 0 && (
                    <ul className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      {warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                  )}
                  {segments.length > 0 ? (
                    <ul className="space-y-3">
                      {segments.map((seg) => (
                        <li key={seg.segmentId} className="rounded-lg bg-stone-50 px-3 py-2">
                          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-medium text-stone-500">
                            <span>
                              {seg.speakerLabel
                                ? t('telehealthJoin.speaker', { label: seg.speakerLabel })
                                : t('telehealthJoin.speaker', { label: '—' })}
                            </span>
                            <span>
                              {formatSegmentTime(seg.startMs)}–{formatSegmentTime(seg.endMs)}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">{seg.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : completeText ? (
                    <p className="text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">{completeText}</p>
                  ) : (
                    <p className="py-8 text-center text-sm text-stone-600">{t('telehealthJoin.transcriptEmpty')}</p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                disabled={transcriptLoading}
                className="w-full rounded-lg bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {t('telehealthJoin.transcriptClose')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClinicalTelehealthJoinPage() {
  const { t } = useTranslation('clinical');
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
      toast.error(isApiError(error) ? error.message : t('telehealthJoin.loadFailed'));
    }
  }, [sessionId, t]);

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
      setError(isApiError(err) ? err.message : t('telehealthJoin.joinFailed'));
      return null;
    }
  }, [sessionId, t]);

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
      toast.error(isApiError(err) ? err.message : t('telehealthJoin.openFailed'));
    } finally {
      setLoading(false);
    }
  }, [refreshContext, refreshLobby, refreshRecording, requestJoin, sessionId, t]);

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
      toast.success(t('telehealthJoin.admitSuccess'));
      await refreshLobby();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('telehealthJoin.admitFailed'));
    } finally {
      setAdmittingId(null);
    }
  }

  async function onStartRecording() {
    setRecBusy(true);
    try {
      await startTelehealthRecording(sessionId);
      toast.success(t('telehealthJoin.recordingStarted'));
      setRecording((prev) => ({ ...(prev ?? {}), status: 'in_progress' }));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('telehealthJoin.recordingStartFailed'));
    } finally {
      setRecBusy(false);
    }
  }

  async function onStopRecording() {
    setRecBusy(true);
    try {
      await stopTelehealthRecording(sessionId);
      toast.success(t('telehealthJoin.recordingStopped'));
      await refreshRecording();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('telehealthJoin.recordingStopFailed'));
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
                <Square className="size-3 fill-current" /> {t('telehealthJoin.stopRecording')}
              </button>
            ) : (
              <button
                type="button"
                disabled={recBusy}
                onClick={() => void onStartRecording()}
                className="inline-flex items-center gap-1 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Circle className="size-3 fill-rose-500 text-rose-500" /> {t('telehealthJoin.startRecording')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowPanel((v) => !v)}
              className="rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white"
            >
              {showPanel ? t('telehealthJoin.hidePanel') : t('telehealthJoin.showPanel')}
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
                <RecordingArchive sessionId={sessionId} recording={recording} />
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
        <ArrowLeft className="size-4" /> {t('telehealthJoin.backToSessions')}
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
                  {localizeGeneratedLabel(session?.client?.name) || t('telehealthJoin.videoSession')}
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
                <p className="font-medium text-stone-800">{t('telehealthJoin.inSession')}</p>
                <p className="text-sm text-stone-600">{t('telehealthJoin.liveKitHint')}</p>
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
          <RecordingArchive sessionId={sessionId} recording={recording} />
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
