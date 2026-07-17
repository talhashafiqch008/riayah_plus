import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';

type Props = {
  basePath: string;
  title?: string;
  description?: string;
};

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'intake_submitted', label: 'Intake submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'validated', label: 'Validated' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'closed', label: 'Closed' },
];

function statusBadgeClass(status: string) {
  switch (status) {
    case 'intake_submitted':
      return 'bg-amber-50 text-amber-800';
    case 'under_review':
      return 'bg-blue-50 text-blue-800';
    case 'validated':
      return 'bg-teal-50 text-teal-800';
    case 'active':
      return 'bg-emerald-50 text-emerald-800';
    case 'on_hold':
      return 'bg-orange-50 text-orange-800';
    case 'closed':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

export default function EpisodeListPage({
  basePath,
  title = 'Care Episodes',
  description = 'Track episode status from intake through active care.',
}: Props) {
  const [rows, setRows] = useState<CareEpisode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listEpisodes({
        status: status || undefined,
        limit: 50,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load episodes');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{title}</h2>
          <p className="mt-1 text-stone-600">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw className="size-4" /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
        >
          {STATUS_FILTERS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-stone-500">{total} episode{total === 1 ? '' : 's'}</span>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden divide-y">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-stone-500 text-sm">
            No episodes yet. Complete intake review to create one.
          </p>
        ) : (
          rows.map((ep) => (
            <Link
              key={ep.id}
              to={`${basePath}/${ep.id}`}
              className="flex items-start gap-4 p-4 hover:bg-teal-50/40 transition-colors"
            >
              <div className="mt-0.5 rounded-xl bg-teal-50 p-2.5 text-teal-700">
                <Activity className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-stone-900">{ep.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(ep.status)}`}
                  >
                    {ep.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-stone-500">
                  {ep.careRecipient?.name || ep.patient?.name || 'Patient'}
                  {ep.urgencyLevel ? ` · ${ep.urgencyLevel}` : ''}
                  {ep.createdAt ? ` · ${new Date(ep.createdAt).toLocaleDateString()}` : ''}
                </p>
                {ep.reasonForCare && (
                  <p className="mt-1 text-sm text-stone-600 line-clamp-1">{ep.reasonForCare}</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
