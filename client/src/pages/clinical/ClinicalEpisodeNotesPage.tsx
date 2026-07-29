import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  createClinicalNote,
  listClinicalNotes,
  type ClinicalNote,
} from '@/lib/api/clinicalNotes';
import { getEpisode } from '@/lib/api/episodes';

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
      toast.error(isApiError(error) ? error.message : 'Failed to load notes');
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
      toast.error(isApiError(error) ? error.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/clinical/notes"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4" /> Notes hub
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Episode notes</h2>
        <p className="mt-1 text-stone-600">{title || episodeId}</p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-3">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
          placeholder="Add an immutable clinical note…"
        />
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          Private
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreate()}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Save note
        </button>
      </div>

      <ul className="space-y-3">
        {notes.map((n) => (
          <li key={n.id} className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm">
            <div className="flex justify-between text-xs text-stone-500">
              <span>
                {n.author?.name ?? 'Author'}
                {n.isPrivate ? ' · private' : ''}
              </span>
              <span>{new Date(n.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-2 text-sm text-stone-800 whitespace-pre-wrap">{n.content}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
