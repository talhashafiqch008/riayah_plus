import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Building2, RefreshCw } from 'lucide-react';
import { adminApi } from '@/lib/admin/api';
import { isApiError } from '@/lib/errors';

type FamilyRow = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  organizationId?: string | null;
  createdAt: string;
  organization?: { id: string; name: string } | null;
};

type OrgOption = { id: string; name: string };

export default function AdminFamiliesPage() {
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [unassignedOnly, setUnassignedOnly] = useState(true);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [famRes, orgRes] = await Promise.all([
        adminApi.get('/admin/families', {
          unassigned: unassignedOnly ? 'true' : 'false',
          limit: 100,
        }),
        adminApi.get('/admin/organizations'),
      ]);
      const famData = famRes.data ?? famRes;
      setFamilies(Array.isArray(famData) ? famData : []);
      const orgData = orgRes.data ?? orgRes;
      setOrgs(
        (Array.isArray(orgData) ? orgData : []).map((o: OrgOption) => ({
          id: o.id,
          name: o.name,
        })),
      );
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Failed to load families');
      setFamilies([]);
    } finally {
      setLoading(false);
    }
  }, [unassignedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (familyId: string) => {
    const organizationId = selectedOrg[familyId];
    if (!organizationId) {
      toast.error('Select an organization first');
      return;
    }
    setAssigningId(familyId);
    try {
      await adminApi.patch(`/admin/families/${familyId}/organization`, { organizationId });
      toast.success('Organization assigned. Family can now log in.');
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : 'Assignment failed');
    } finally {
      setAssigningId(null);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 flex items-center gap-2">
            <Users className="size-6 text-teal-600" />
            Families
          </h1>
          <p className="text-stone-500 mt-1">
            Assign self-registered family accounts to an organization so they can log in.
            Uncheck “Unassigned only” to see every family (with and without an org).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
              className="rounded border-stone-300"
            />
            Unassigned only
          </label>
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
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-stone-500">Loading…</p>
        ) : families.length === 0 ? (
          <p className="p-6 text-stone-500">No families found.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Registered</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {families.map((f) => (
                <tr key={f.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-medium text-stone-900">{f.name}</td>
                  <td className="px-4 py-3 text-stone-600">{f.email}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {new Date(f.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {f.organization ? (
                      <span className="inline-flex items-center gap-1 text-teal-700">
                        <Building2 className="size-3.5" />
                        {f.organization.name}
                      </span>
                    ) : (
                      <select
                        className="rounded-lg border border-stone-200 px-2 py-1.5 max-w-[220px]"
                        value={selectedOrg[f.id] ?? ''}
                        onChange={(e) =>
                          setSelectedOrg((prev) => ({ ...prev, [f.id]: e.target.value }))
                        }
                      >
                        <option value="">Select org…</option>
                        {orgs.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!f.organizationId && (
                      <button
                        type="button"
                        disabled={assigningId === f.id}
                        onClick={() => assign(f.id)}
                        className="rounded-lg bg-teal-600 px-3 py-1.5 text-white text-xs font-medium hover:bg-teal-700 disabled:opacity-50"
                      >
                        {assigningId === f.id ? 'Assigning…' : 'Assign'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
