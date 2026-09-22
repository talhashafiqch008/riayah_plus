import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('org');
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
      toast.error(isApiError(error) ? error.message : t('families.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const assign = async (familyId: string, coordinatorId: string) => {
    setSavingId(familyId);
    try {
      await assignOrgFamilyCoordinator(familyId, coordinatorId || null);
      toast.success(
        coordinatorId ? t('families.assignedToast') : t('families.clearedToast'),
      );
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('families.assignFailed'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <RolePageShell>
      <RolePageHeader
        title={t('families.title')}
        description={t('families.description')}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className={btnSecondaryClass}
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            {t('families.refresh')}
          </button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-stone-500">{t('common.loading')}</p>
        ) : families.length === 0 ? (
          <p className="p-6 text-stone-500">{t('families.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-stone-50 text-start text-stone-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    {t('families.colFamily')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    {t('families.colEmail')}
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">
                    {t('families.colCoordinator')}
                  </th>
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
                        onChange={(e) => void assign(f.id, e.target.value)}
                      >
                        <option value="">{t('common.unassigned')}</option>
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
