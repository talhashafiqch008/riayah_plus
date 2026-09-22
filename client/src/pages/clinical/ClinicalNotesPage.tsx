import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, Stethoscope, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';
import {
  RolePageHeader,
  RolePageShell,
  btnSecondaryClass,
} from '@/components/care/RolePageChrome';

function statusClass(status: string) {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 text-emerald-800';
    case 'validated':
      return 'bg-teal-50 text-teal-800';
    case 'on_hold':
      return 'bg-amber-50 text-amber-800';
    case 'closed':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

export default function ClinicalNotesPage() {
  const { t } = useTranslation('clinical');
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listEpisodes({ limit: 50 });
      setEpisodes(result.data);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('notes.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RolePageShell>
      <RolePageHeader
        title={t('notes.title')}
        description={t('notes.description')}
        actions={
          <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" /> {t('notes.refresh')}
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-teal-600" />
        </div>
      ) : episodes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center sm:p-10">
          <Stethoscope className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">{t('notes.empty')}</p>
          <p className="mt-1 text-sm text-stone-500">{t('notes.emptyHint')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {episodes.map((ep) => (
            <li key={ep.id}>
              <Link
                to={`/clinical/episodes/${ep.id}/notes`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-teal-50/40 active:bg-teal-50/60"
              >
                <div className="shrink-0 rounded-xl bg-teal-50 p-2.5 text-teal-700">
                  <Stethoscope className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-stone-900">
                      {localizeGeneratedLabel(ep.title)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(ep.status)}`}
                    >
                      {t(`episodes.status.${ep.status}`, {
                        defaultValue: ep.status.replace(/_/g, ' '),
                      })}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-500">
                    {localizeGeneratedLabel(
                      ep.patient?.name || ep.careRecipient?.name || t('common.patient'),
                    )}
                    {ep.coordinator?.name
                      ? ` · ${t('notes.coord', { name: ep.coordinator.name })}`
                      : ''}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-stone-400 rtl-flip" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RolePageShell>
  );
}
