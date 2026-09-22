import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  localizeGeneratedLabel,
  localizeStoredNarrative,
} from '@/lib/localizeStoredEnglish';

export default function OrgPendingRequestsPage() {
  const { t } = useTranslation('org');
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
      toast.error(isApiError(error) ? error.message : t('pending.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const assign = async (familyId: string, intakeId: string) => {
    const coordinatorId = selected[intakeId];
    if (!coordinatorId) {
      toast.error(t('pending.selectRequired'));
      return;
    }
    setSavingId(intakeId);
    try {
      await assignOrgFamilyCoordinator(familyId, coordinatorId);
      toast.success(t('pending.assignedToast'));
      await load();
    } catch (error) {
      toast.error(isApiError(error) ? error.message : t('pending.assignFailed'));
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
            {t('pending.title')}
          </h1>
          <p className="text-stone-500 mt-1">{t('pending.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('pending.refresh')}
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
        {loading ? (
          <p className="p-6 text-stone-500">{t('common.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-stone-500">{t('pending.empty')}</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rows.map((row) => (
              <li key={row.id} className="p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-stone-900">
                      {localizeGeneratedLabel(row.careRecipient?.name) || t('common.patient')} —{' '}
                      {row.familyUser.name}
                    </p>
                    <p className="text-sm text-stone-500">{row.familyUser.email}</p>
                    {row.reasonForCare && (
                      <p className="text-sm text-stone-600 mt-1 line-clamp-2">
                        {localizeStoredNarrative(row.reasonForCare)}
                      </p>
                    )}
                  </div>
                  <span className="text-xs uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-1 rounded-lg h-fit">
                    {row.status.replace(/_/g, ' ')}
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
                    <option value="">{t('pending.selectCoordinator')}</option>
                    {coords.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={savingId === row.id}
                    onClick={() => void assign(row.familyUser.id, row.id)}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {savingId === row.id ? t('pending.assigning') : t('pending.assign')}
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
