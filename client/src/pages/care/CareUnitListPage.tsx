import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, RefreshCw, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import { listCareUnits, type CareUnit } from '@/lib/api/intake';

type Props = {
  basePath: string;
  title?: string;
  description?: string;
};

export default function CareUnitListPage({
  basePath,
  title = 'Care Units & Patients',
  description = 'Open a care unit to view patients, edit profiles, and see linked episodes.',
}: Props) {
  const [rows, setRows] = useState<CareUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listCareUnits({
        search: search.trim() || undefined,
        limit: 50,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error('Failed to load care units');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="w-full min-w-0 max-w-5xl space-y-6">
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search care units…"
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm w-full sm:w-72"
        />
        <span className="text-sm text-stone-500">{total} unit{total === 1 ? '' : 's'}</span>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden divide-y">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-teal-600" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-stone-500 text-sm">
            {basePath.startsWith('/family')
              ? 'No care unit yet. Complete Onboarding to create your household and care request.'
              : 'No care units yet. Complete Family Onboarding first.'}
          </p>
        ) : (
          rows.map((unit) => {
            const patientCount = unit.careRecipients?.length ?? 0;
            return (
              <Link
                key={unit.id}
                to={`${basePath}/${unit.id}`}
                className="flex items-start gap-4 p-4 hover:bg-teal-50/40 transition-colors"
              >
                <div className="mt-0.5 rounded-xl bg-teal-50 p-2.5 text-teal-700">
                  <Users className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900">{unit.name}</p>
                  <p className="mt-0.5 text-sm text-stone-500">
                    {[unit.city, unit.country].filter(Boolean).join(', ') || 'No location'}
                    {unit.primaryCaregiverName
                      ? ` · Caregiver: ${unit.primaryCaregiverName}`
                      : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-stone-700">
                      {patientCount} patient{patientCount === 1 ? '' : 's'}
                    </span>
                    {unit._count && (
                      <>
                        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-amber-800">
                          {unit._count.intakeRecords}{' '}
                          {basePath.startsWith('/family') ? 'request' : 'intake'}
                          {unit._count.intakeRecords === 1 ? '' : 's'}
                        </span>
                        {!basePath.startsWith('/family') && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800">
                            {unit._count.careEpisodes} episode
                            {unit._count.careEpisodes === 1 ? '' : 's'}
                          </span>
                        )}
                        {basePath.startsWith('/family') && unit._count.careEpisodes > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800">
                            {unit._count.careEpisodes} care journey
                            {unit._count.careEpisodes === 1 ? '' : 's'}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
