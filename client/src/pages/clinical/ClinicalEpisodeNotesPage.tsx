import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  createClinicalNote,
  listClinicalNotes,
  type ClinicalNote,
} from '@/lib/api/clinicalNotes';
import { getEpisode } from '@/lib/api/episodes';
import {
  RolePageShell,
  btnPrimaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

export default function ClinicalEpisodeNotesPage() {
  const { episodeId = '' } = useParams();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [ep, rows] = await Promise.all([
        getEpisode(episodeId).catch(() => null),
        listClinicalNotes({ episodeId }),
      ]);
      if (ep) setTitle(ep.title);
      setNotes(rows);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Failed to load notes');
    }
  }, [episodeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!content.trim()) {
      toast.error('Note content is required');
      return;
    }
    setBusy(true);
    try {
      await createClinicalNote({
        episodeId,
        content: content.trim(),
        noteType: 'session_note',
        isPrivate,
      });
      toast.success('Note saved');
      setContent('');
      await load();
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <RolePageShell>
      <Link
        to="/clinical/notes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4" /> Notes hub
      </Link>

      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          Episode notes
        </h2>
        <p className="mt-1 break-words text-sm text-stone-600 sm:text-base">
          {title || episodeId}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className={fieldClass}
          placeholder="Add an immutable clinical note…"
        />
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="size-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
          />
          Private (hidden from coordinator)
        </label>
        <button type="button" disabled={busy} onClick={() => void onCreate()} className={btnPrimaryClass}>
          Save note
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-sm text-stone-500 py-6">No notes yet for this episode.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-stone-500">
                <span>
                  {n.author?.name ?? 'Author'}
                  {n.isPrivate ? ' · private' : ''}
                </span>
                <span className="shrink-0">{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-stone-800">
                {n.content}
              </p>
            </li>
          ))}
        </ul>
      )}
    </RolePageShell>
  );
}
