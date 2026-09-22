import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  createClinicalNote,
  listClinicalNotes,
  type ClinicalNote,
} from '@/lib/api/clinicalNotes';
import { getEpisode } from '@/lib/api/episodes';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';
import { familyDateLocale } from '@/lib/familyLanguage';
import {
  RolePageShell,
  btnPrimaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

export default function ClinicalEpisodeNotesPage() {
  const { t } = useTranslation('clinical');
  const dateLocale = familyDateLocale();
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
      toast.error(extractApiError(error).message || t('notes.notesLoadError'));
    }
  }, [episodeId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate() {
    if (!content.trim()) {
      toast.error(t('notes.contentRequired'));
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
      toast.success(t('notes.saved'));
      setContent('');
      await load();
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('notes.createFailed'));
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
        <ArrowLeft className="size-4 rtl-flip" /> {t('notes.hubBack')}
      </Link>

      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          {t('notes.episodeTitle')}
        </h2>
        <p className="mt-1 break-words text-sm text-stone-600 sm:text-base">
          {localizeGeneratedLabel(title) || episodeId}
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className={fieldClass}
          placeholder={t('notes.placeholder')}
        />
        <label className="inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(e) => setIsPrivate(e.target.checked)}
            className="size-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
          />
          {t('notes.private')}
        </label>
        <button type="button" disabled={busy} onClick={() => void onCreate()} className={btnPrimaryClass}>
          {busy ? t('notes.saving') : t('notes.save')}
        </button>
      </div>

      {notes.length === 0 ? (
        <p className="text-center text-sm text-stone-500 py-6">{t('notes.emptyNotes')}</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-2xl border border-stone-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-stone-500">
                <span>
                  {n.author?.name ?? t('notes.author')}
                  {n.isPrivate ? ` · ${t('notes.privateTag')}` : ''}
                </span>
                <span className="shrink-0">
                  {new Date(n.createdAt).toLocaleString(dateLocale)}
                </span>
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
