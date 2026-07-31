import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Inbox, RefreshCw } from 'lucide-react';
import {
  assignOrgFamilyCoordinator,
  listOrgCoordinators,
  listOrgPendingIntakes,
  type OrgCoordinator,
  type OrgPendingIntake,
} from '@/lib/api/org';
import { isApiError } from '@/lib/errors';

export default function OrgPendingRequestsPage() {
  const [rows, setRows] = useState<OrgPendingIntake[]>([]);
  const [coords, setCoords] = useState<OrgCoordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, coordinators] = await Promise.all([
        listOrgPendingIntakes(),
        listOrgCoordinators(),
      ]);
      setRows(pending.data ?? []);
      setCoords(coordinators.filter((c) => c.isActive));
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (familyId: string, intakeId: string) => {
    const coordinatorId = selected[intakeId];
    if (!coordinatorId) {
      toast.error('Select a coordinator');
      return;
    }
    setSavingId(intakeId);
    try {
      await assignOrgFamilyCoordinator(familyId, coordinatorId);
      toast.success('Coordinator assigned. Request is now in their intake queue.');
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Assignment failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <Inbox className="size-6 text-teal-600" />
            Pending requests
          </h1>
          <p className="text-stone-500 mt-1">
            Care requests from families without a primary coordinator. Assign a coordinator to route
            each request into their intake queue.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-stone-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-stone-500">No pending unassigned requests.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((row) => (
              <li key={row.id} className="p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-900">
                      {row.careRecipient?.name ?? 'Patient'} — {row.familyUser.name}
                    </p>
                    <p className="text-sm text-stone-500">{row.familyUser.email}</p>
                    <p className="text-sm text-stone-600 mt-1 line-clamp-2">
                      {row.reasonForCare}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-1 rounded-lg h-fit">
                    {row.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="rounded-lg border border-stone-200 px-2 py-1.5 text-sm"
                    value={selected[row.id] ?? ''}
                    onChange={(e) =>
                      setSelected((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                  >
                    <option value="">Select coordinator…</option>
                    {coords.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => assign(row.familyUser.id, row.id)}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {savingId === row.id ? 'Assigning…' : 'Assign & route'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
