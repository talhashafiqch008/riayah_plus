import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw } from 'lucide-react';
import {
  assignOrgFamilyCoordinator,
  listOrgCoordinators,
  listOrgFamilies,
  type OrgCoordinator,
  type OrgFamily,
} from '@/lib/api/org';
import { isApiError } from '@/lib/errors';
import {
  RolePageHeader,
  RolePageShell,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

export default function OrgFamiliesPage() {
  const [families, setFamilies] = useState<OrgFamily[]>([]);
  const [coords, setCoords] = useState<OrgCoordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, c] = await Promise.all([listOrgFamilies(), listOrgCoordinators()]);
      setFamilies(f);
      setCoords(c.filter((x) => x.isActive));
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Failed to load families');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (familyId: string, coordinatorId: string) => {
    setSavingId(familyId);
    try {
      await assignOrgFamilyCoordinator(familyId, coordinatorId || null);
      toast.success(coordinatorId ? 'Coordinator assigned' : 'Coordinator cleared');
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Assignment failed');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <RolePageShell>
      <RolePageHeader
        title="Families"
        description="Families linked to your organization. Assign a primary coordinator for ownership."
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={btnSecondaryClass}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-stone-500">Loading…</p>
        ) : families.length === 0 ? (
          <p className="p-6 text-stone-500">No families assigned to your organization yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-stone-50 text-left text-stone-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Family</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Email</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Primary coordinator</th>
                </tr>
              </thead>
              <tbody>
                {families.map((f) => (
                  <tr key={f.id} className="border-t border-stone-100">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-stone-900">
                      {f.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-600">{f.email}</td>
                    <td className="px-4 py-3">
                      <select
                        disabled={savingId === f.id}
                        className={`${fieldClass} min-w-[200px] max-w-xs`}
                        value={f.assignedCoordinatorId ?? ''}
                        onChange={(e) => assign(f.id, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {coords.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RolePageShell>
  );
}
