import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, RefreshCw, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  listCarePlans,
  type CarePlan,
} from '@/lib/api/carePlans';
import {
  RolePageHeader,
  RolePageShell,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

export default function ClinicalCarePlansPage() {
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCarePlans();
      setPlans(rows.filter((p) => p.isCurrentVersion !== false));
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || 'Failed to load care plans');
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
    <RolePageShell>
      <RolePageHeader
        title="Care Plans"
        description="Review plans for your organization and add an optional clinical co-sign."
        actions={
          <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" /> Refresh
          </button>
        }
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={`${fieldClass} sm:max-w-xs`}
      >
        <option value="">All statuses</option>
        <option value="submitted_for_approval">Submitted for approval</option>
        <option value="approved">Approved</option>
        <option value="active">Active</option>
        <option value="revision_requested">Revision requested</option>
        <option value="completed">Completed</option>
      </select>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center sm:p-10">
          <BookOpen className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">No care plans to review yet.</p>
          <p className="mt-1 text-sm text-stone-500">
            Plans appear after a coordinator creates and submits one for an episode in your org.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          {filtered.map((plan) => (
            <li key={plan.id}>
              <Link
                to={`/clinical/plans/${plan.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-teal-50/40 active:bg-teal-50/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-stone-900">{plan.title}</p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
                    >
                      {carePlanStatusLabel(plan.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500 break-words">
                    {plan.episode?.title || 'Episode'}
                    {' · '}
                    {(plan.goals?.length ?? 0)} goals · {(plan.items?.length ?? 0)} services · v
                    {plan.version}
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
