import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Stethoscope, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';
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
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listEpisodes({ limit: 50 });
      setEpisodes(result.data);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Failed to load episodes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RolePageShell>
      <RolePageHeader
        title="Session Notes"
        description="Choose a care episode to view or add clinical notes. Notes are immutable after save."
        actions={
          <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" /> Refresh
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
          <p className="mt-3 text-stone-600">No episodes available yet.</p>
          <p className="mt-1 text-sm text-stone-500">
            Episodes appear after a coordinator starts a care journey for a patient in your
            organization.
          </p>
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
                    <p className="truncate font-semibold text-stone-900">{ep.title}</p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(ep.status)}`}
                    >
                      {ep.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-stone-500">
                    {ep.patient?.name || ep.careRecipient?.name || 'Patient'}
                    {ep.coordinator?.name ? ` · Coord: ${ep.coordinator.name}` : ''}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-stone-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RolePageShell>
  );
}
