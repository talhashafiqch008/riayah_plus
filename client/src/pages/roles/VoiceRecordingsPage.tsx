import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mic, MicOff, Pause, Play, RefreshCw, Square, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  deleteVoiceRecording,
  getVoiceRecordingPlayback,
  listVoiceRecordingPatients,
  listVoiceRecordings,
  uploadVoiceRecording,
  type VoiceRecording,
  type VoiceRecordingPatient,
} from '@/lib/api/voiceRecordings';

function formatDuration(seconds?: number | null): string {
  const total = Math.max(0, Math.round(seconds ?? 0));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pickRecorderMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

type Props = {
  title?: string;
  description?: string;
};

export default function VoiceRecordingsPage({
  title = 'Voice recordings',
  description = 'Choose an assigned patient first, then record a voice note. Replay or delete from your history.',
}: Props) {
  const { pathname } = useLocation();
  const isCoordinator = pathname.startsWith('/coordinator');
  const isClinical = pathname.startsWith('/clinical');
  const localized = isCoordinator || isClinical;
  const { t } = useTranslation(isClinical ? 'clinical' : 'coordinator');
  const pageTitle = localized ? t('voice.title') : title;
  const pageDescription = localized ? t('voice.description') : description;
  const [params] = useSearchParams();
  const sessionId = params.get('sessionId') ?? undefined;
  const meetingId = params.get('meetingId') ?? undefined;

  const [rows, setRows] = useState<VoiceRecording[]>([]);
  const [patients, setPatients] = useState<VoiceRecordingPatient[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [titleDraft, setTitleDraft] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const selectedPatient = patients.find((p) => p.id === selectedPatientKey) ?? null;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const elapsedRef = useRef(0);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [recordingRows, patientRows] = await Promise.all([
        listVoiceRecordings(),
        listVoiceRecordingPatients(),
      ]);
      setRows(recordingRows);
      setPatients(patientRows);
      setSelectedPatientKey((prev) =>
        prev && patientRows.some((p) => p.id === prev) ? prev : patientRows[0]?.id ?? '',
      );
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : (localized ? t('voice.toasts.loadFailed') : 'Failed to load voice recordings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      clearTimer();
      stopTracks();
      mediaRecorderRef.current = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [load]);

  const startRecording = async () => {
    if (isRecording || uploading) return;
    if (!selectedPatient) {
      toast.error(localized ? t('voice.toasts.choosePatient') : 'Choose an assigned patient before recording.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(localized ? t('voice.toasts.unsupported') : 'Voice recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickRecorderMime();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        void (async () => {
          clearTimer();
          stopTracks();
          setIsRecording(false);
          setIsPaused(false);
          const durationSeconds = elapsedRef.current;
          const blobType = recorder.mimeType || mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: blobType });
          chunksRef.current = [];
          if (!blob.size) {
            toast.error(localized ? t('voice.toasts.noAudio') : 'No audio captured.');
            return;
          }
          setUploading(true);
          try {
            const ext = blobType.includes('ogg')
              ? 'ogg'
              : blobType.includes('mp4')
                ? 'm4a'
                : 'webm';
            const patient = selectedPatient;
            if (!patient) {
              toast.error(localized ? t('voice.toasts.choosePatient') : 'Choose an assigned patient before recording.');
              return;
            }
            await uploadVoiceRecording({
              file: blob,
              fileName: `voice-${Date.now()}.${ext}`,
              title: titleDraft.trim() || undefined,
              notes: notesDraft.trim() || undefined,
              durationSeconds,
              sessionId,
              meetingId,
              patientId: patient.patientId,
              careRecipientId: patient.careRecipientId,
              episodeId: patient.episodeId,
            });
            setTitleDraft('');
            setNotesDraft('');
            toast.success(localized ? t('voice.toasts.saved') : 'Voice recording saved');
            await load();
          } catch (error: unknown) {
            toast.error(isApiError(error) ? error.message : (localized ? t('voice.toasts.saveFailed') : 'Failed to save recording'));
          } finally {
            setUploading(false);
            setElapsed(0);
            elapsedRef.current = 0;
          }
        })();
      };

      recorder.start(1000);
      setIsRecording(true);
      setIsPaused(false);
      setElapsed(0);
      elapsedRef.current = 0;
      clearTimer();
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      toast.error(localized ? t('voice.toasts.micRequired') : 'Microphone permission is required to record.');
      stopTracks();
    }
  };

  const pauseRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recorder.pause();
    setIsPaused(true);
    clearTimer();
  };

  const resumeRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    recorder.resume();
    setIsPaused(false);
    clearTimer();
    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || (recorder.state !== 'recording' && recorder.state !== 'paused')) return;
    recorder.stop();
  };

  const cancelRecording = () => {
    const recorder = mediaRecorderRef.current;
    chunksRef.current = [];
    clearTimer();
    stopTracks();
    setIsRecording(false);
    setIsPaused(false);
    setElapsed(0);
    elapsedRef.current = 0;
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null;
      recorder.stop();
    }
    mediaRecorderRef.current = null;
  };

  const playRecording = async (id: string) => {
    try {
      setBusyId(id);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const { url } = await getVoiceRecordingPlayback(id);
      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingId(id);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        toast.error(localized ? t('voice.toasts.playFailed') : 'Could not play this recording');
      };
      await audio.play();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : (localized ? t('voice.toasts.playbackFailed') : 'Playback failed'));
      setPlayingId(null);
    } finally {
      setBusyId(null);
    }
  };

  const removeRecording = async (id: string) => {
    if (!window.confirm(localized ? t('voice.confirmDelete') : 'Delete this voice recording?')) return;
    try {
      setBusyId(id);
      if (playingId === id && audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setPlayingId(null);
      }
      await deleteVoiceRecording(id);
      setRows((prev) => prev.filter((row) => row.id !== id));
      toast.success(localized ? t('voice.toasts.deleted') : 'Recording deleted');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : (localized ? t('voice.toasts.deleteFailed') : 'Delete failed'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{pageTitle}</h1>
          <p className="mt-1 text-sm text-stone-600">{pageDescription}</p>
          {(sessionId || meetingId) && (
            <p className="mt-2 text-xs text-teal-700">
              Linked to {sessionId ? `session ${sessionId}` : `meeting ${meetingId}`}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw className="size-4" />
          {localized ? t('voice.refresh') : 'Refresh'}
        </button>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          {localized ? t('voice.record') : 'Record'}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-stone-700 sm:col-span-2">
            {localized ? t('voice.patient') : 'Patient'}{' '}
            <span className="font-normal text-rose-600">*</span>
            <select
              value={selectedPatientKey}
              onChange={(e) => setSelectedPatientKey(e.target.value)}
              disabled={isRecording || uploading || patients.length === 0}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-400 disabled:bg-stone-50"
            >
              {patients.length === 0 ? (
                <option value="">{localized ? t('voice.noPatients') : 'No assigned patients'}</option>
              ) : (
                patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.episodeTitle}
                  </option>
                ))
              )}
            </select>
            {patients.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                {localized
                  ? t('voice.patientHint')
                  : 'You can only record for patients on your active or validated care episodes.'}
              </p>
            ) : null}
          </label>
          <label className="block text-sm text-stone-700">
            {localized ? t('voice.titleOptional') : (
              <>
                Title <span className="font-normal text-stone-400">(optional)</span>
              </>
            )}
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              disabled={isRecording || uploading}
              placeholder={
                localized ? t('voice.titlePlaceholder') : 'e.g. Post-session follow-up'
              }
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </label>
          <label className="block text-sm text-stone-700 sm:col-span-2">
            {localized ? t('voice.notesOptional') : (
              <>
                Notes <span className="font-normal text-stone-400">(optional)</span>
              </>
            )}
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              disabled={isRecording || uploading}
              rows={2}
              placeholder={
                localized ? t('voice.notesPlaceholder') : 'Optional context for this recording'
              }
              className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-teal-400"
            />
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          {!isRecording ? (
            <button
              type="button"
              onClick={() => void startRecording()}
              disabled={uploading || !selectedPatient}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              <Mic className="size-4" />
              {localized ? t('voice.start') : 'Start recording'}
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
                >
                  <Play className="size-4" />
                  {localized ? t('voice.resume') : 'Resume'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  <Pause className="size-4" />
                  {localized ? t('voice.pause') : 'Pause'}
                </button>
              )}
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
              >
                <Square className="size-4" />
                {localized ? t('voice.stop') : 'Stop & save'}
              </button>
              <button
                type="button"
                onClick={cancelRecording}
                className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                <MicOff className="size-4" />
                {localized ? t('voice.cancel') : 'Cancel'}
              </button>
            </>
          )}
          <span className="font-mono text-sm text-stone-600">
            {uploading ? (localized ? t('common.loading') : 'Saving…') : formatDuration(elapsed)}
            {isRecording && !isPaused ? (
              <span className="ms-2 inline-block size-2 animate-pulse rounded-full bg-rose-500" />
            ) : null}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
          {localized ? t('voice.history') : 'History'}
        </h2>
        {loading ? (
          <div className="mt-6 flex justify-center py-10">
            <div className="size-8 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">
            {localized ? t('voice.emptyHistory') : 'No voice recordings yet.'}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-900">
                    {row.title?.trim() || (localized ? t('voice.untitled') : 'Untitled recording')}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {row.patientName ? `${row.patientName} · ` : ''}
                    {new Date(row.createdAt).toLocaleString(localized ? undefined : 'en-QA')} ·{' '}
                    {formatDuration(row.durationSeconds)} · {formatBytes(row.sizeBytes)}
                    {row.sessionId ? ` · session` : ''}
                    {row.meetingId ? ` · meeting` : ''}
                  </p>
                  {row.notes ? (
                    <p className="mt-1 text-sm text-stone-600 line-clamp-2">{row.notes}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void playRecording(row.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                  >
                    <Play className="size-3.5" />
                    {playingId === row.id ? (localized ? t('voice.playing') : 'Playing…') : localized ? t('voice.play') : 'Play'}
                  </button>
                  <button
                    type="button"
                    disabled={busyId === row.id}
                    onClick={() => void removeRecording(row.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    <Trash2 className="size-3.5" />
                    {localized ? t('voice.delete') : 'Delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
