import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';
import { familyDateLocale, familyEpisodeStatusLabel } from '@/lib/familyLanguage';
import {
  RolePageHeader,
  RolePageShell,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

type Props = {
  basePath: string;
  title?: string;
  description?: string;
};

const STAFF_STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'intake_submitted', label: 'Intake submitted' },
  { value: 'under_review', label: 'Under review' },
  { value: 'validated', label: 'Validated' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'closed', label: 'Closed' },
];

const FAMILY_STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'intake_submitted', label: 'Request received' },
  { value: 'under_review', label: 'Care team reviewing' },
  { value: 'validated', label: 'Care journey started' },
  { value: 'active', label: 'Active care' },
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
  const { t } = useTranslation('family');
  const familyFacing = basePath.startsWith('/family');
  const dateLocale = familyDateLocale();
  const statusFilters = familyFacing ? FAMILY_STATUS_FILTERS : STAFF_STATUS_FILTERS;
  const pageTitle = familyFacing ? t('episodes.title') : title;
  const pageDescription = familyFacing ? t('episodes.description') : description;
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
      else toast.error(familyFacing ? t('episodes.loadError') : 'Failed to load episodes');
    } finally {
      setLoading(false);
    }
  }, [status, familyFacing, t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <RolePageShell>
      <RolePageHeader
        title={pageTitle}
        description={pageDescription}
        actions={
          <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" /> {familyFacing ? t('common.refresh') : 'Refresh'}
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${fieldClass} sm:max-w-xs`}
        >
          {statusFilters.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {familyFacing
                ? o.value
                  ? familyEpisodeStatusLabel(o.value)
                  : t('episodes.all')
                : o.label}
            </option>
          ))}
        </select>
        <span className="text-sm text-stone-500">
          {total}{' '}
          {familyFacing
            ? total === 1
              ? t('episodes.journey')
              : t('episodes.journeys')
            : `episode${total === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-stone-500">
            {familyFacing ? t('episodes.empty') : 'No episodes yet. Complete intake review to create one.'}
          </p>
        ) : (
          rows.map((ep) => (
            <Link
              key={ep.id}
              to={`${basePath}/${ep.id}`}
              className="flex items-start gap-3 p-4 transition-colors hover:bg-teal-50/40 active:bg-teal-50/60 sm:gap-4"
            >
              <div className="mt-0.5 shrink-0 rounded-xl bg-teal-50 p-2.5 text-teal-700">
                <Activity className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-stone-900">{ep.title}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(ep.status)}`}
                  >
                    {familyFacing
                      ? familyEpisodeStatusLabel(ep.status)
                      : ep.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-stone-500">
                  {ep.careRecipient?.name || ep.patient?.name || 'Patient'}
                  {!familyFacing && ep.urgencyLevel ? ` · ${ep.urgencyLevel}` : ''}
                  {ep.createdAt
                    ? ` · ${new Date(ep.createdAt).toLocaleDateString(familyFacing ? dateLocale : undefined)}`
                    : ''}
                </p>
                {ep.reasonForCare && (
                  <p className="mt-1 line-clamp-2 text-sm text-stone-600 sm:line-clamp-1">
                    {ep.reasonForCare}
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </RolePageShell>
  );
}
