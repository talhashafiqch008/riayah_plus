import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  listCarePlans,
  type CarePlan,
} from '@/lib/api/carePlans';
import { listEpisodes, type CareEpisode } from '@/lib/api/episodes';

export default function CoordinatorCarePlansPage() {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [episodes, setEpisodes] = useState<CareEpisode[]>([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [planRows, epResult] = await Promise.all([
        listCarePlans(),
        listEpisodes({ limit: 50 }),
      ]);
      setPlans(planRows.filter((p) => p.isCurrentVersion !== false));
      setEpisodes(epResult.data);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load care plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => (status ? plans.filter((p) => p.status === status) : plans),
    [plans, status],
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">Care Plans</h2>
          <p className="mt-1 text-stone-600">
            Build, submit, and track care plans for your episodes.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <RefreshCw className="size-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="size-4" /> New plan
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-stone-800">Choose an episode to build a plan</p>
          <div className="max-h-56 overflow-y-auto divide-y divide-stone-100">
            {episodes.length === 0 && (
              <p className="text-sm text-stone-500 py-2">No episodes found.</p>
            )}
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                to={`/coordinator/episodes/${ep.id}/care-plan/new`}
                className="flex items-center justify-between py-2.5 hover:bg-stone-50 px-2 rounded-lg"
              >
                <span className="text-sm font-medium text-stone-900">{ep.title}</span>
                <span className="text-xs text-stone-500">{ep.status}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <label className="text-sm text-stone-600">Status</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="submitted_for_approval">Awaiting approval</option>
          <option value="active">Active</option>
          <option value="revision_requested">Revision requested</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">No care plans yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((plan) => (
            <li key={plan.id}>
              <Link
                to={`/coordinator/plans/${plan.id}`}
                className="block rounded-xl border border-stone-100 bg-white p-4 shadow-sm hover:border-teal-200 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-stone-900">{plan.title}</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      v{plan.version}
                      {plan.episodeId ? (
                        <>
                          {' · '}
                          <span className="font-mono">{plan.episodeId.slice(0, 10)}…</span>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
                  >
                    {carePlanStatusLabel(plan.status)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {(plan.goals?.length ?? 0)} goals · {(plan.items?.length ?? 0)} services
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
