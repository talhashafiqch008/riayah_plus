import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  createClinicalNote,
  listClinicalNotes,
  type ClinicalNote,
} from '@/lib/api/clinicalNotes';

export default function ClinicalNotesPage() {
  const [episodeId, setEpisodeId] = useState('');
  const [content, setContent] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [busy, setBusy] = useState(false);

  async function loadNotes() {
    if (!episodeId.trim()) {
      toast.error('Enter an episode id');
      return;
    }
    try {
      const rows = await listClinicalNotes({ episodeId: episodeId.trim() });
      setNotes(rows);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load notes');
    }
  }

  async function onCreate() {
    if (!episodeId.trim() || !content.trim()) {
      toast.error('Episode and note content are required');
      return;
    }
    setBusy(true);
    try {
      await createClinicalNote({
        episodeId: episodeId.trim(),
        content: content.trim(),
        noteType: 'session_note',
        isPrivate,
      });
      toast.success('Note saved (immutable)');
      setContent('');
      await loadNotes();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Session Notes</h2>
        <p className="mt-1 text-stone-600">
          Clinical documentation is immutable after save — no edit or delete.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Episode ID</span>
          <div className="flex gap-2">
            <input
              value={episodeId}
              onChange={(e) => setEpisodeId(e.target.value)}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => void loadNotes()}
              className="rounded-xl border border-stone-200 px-3 py-2 text-sm font-semibold whitespace-nowrap"
            >
              Load
            </button>
          </div>
          {episodeId.trim() && (
            <Link
              to={`/clinical/episodes/${episodeId.trim()}/notes`}
              className="text-xs text-teal-700 hover:underline"
            >
              Open dedicated episode notes page
            </Link>
          )}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">Note</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm"
            placeholder="Session findings, interventions, plan…"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
          />
          Private (hidden from coordinator)
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

      <section className="space-y-3">
        <h3 className="font-semibold text-stone-900 flex items-center gap-2">
          <Stethoscope className="size-5 text-teal-700" /> Notes
        </h3>
        {notes.length === 0 ? (
          <p className="text-sm text-stone-500">No notes loaded.</p>
        ) : (
          notes.map((n) => (
            <article
              key={n.id}
              className="rounded-xl border border-stone-100 bg-white p-4 shadow-sm"
            >
              <div className="flex justify-between gap-2 text-xs text-stone-500">
                <span>
                  {n.author?.name ?? 'Author'}
                  {n.isPrivate ? ' · private' : ''}
                </span>
                <span>{new Date(n.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-stone-800 whitespace-pre-wrap">{n.content}</p>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
