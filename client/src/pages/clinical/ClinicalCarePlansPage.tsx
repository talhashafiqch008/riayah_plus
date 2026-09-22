import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, RefreshCw, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  listCarePlans,
  type CarePlan,
} from '@/lib/api/carePlans';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';
import {
  RolePageHeader,
  RolePageShell,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

export default function ClinicalCarePlansPage() {
  const { t } = useTranslation('clinical');
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCarePlans();
      setPlans(rows.filter((p) => p.isCurrentVersion !== false));
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('plans.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

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
        title={t('plans.title')}
        description={t('plans.description')}
        actions={
          <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" /> {t('plans.refresh')}
          </button>
        }
      />

      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className={`${fieldClass} sm:max-w-xs`}
      >
        <option value="">{t('plans.allStatuses')}</option>
        <option value="submitted_for_approval">{t('plans.status.submitted_for_approval')}</option>
        <option value="approved">{t('plans.status.approved')}</option>
        <option value="active">{t('plans.status.active')}</option>
        <option value="revision_requested">{t('plans.status.revision_requested')}</option>
        <option value="completed">{t('plans.status.completed')}</option>
      </select>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-white px-5 py-10 text-center sm:p-10">
          <BookOpen className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">{t('plans.empty')}</p>
          <p className="mt-1 text-sm text-stone-500">{t('plans.emptyHint')}</p>
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
                    <p className="truncate font-semibold text-stone-900">
                      {localizeGeneratedLabel(plan.title)}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
                    >
                      {t(`plans.status.${plan.status}`, {
                        defaultValue: carePlanStatusLabel(plan.status),
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500 break-words">
                    {localizeGeneratedLabel(plan.episode?.title || t('common.episode'))}
                    {' · '}
                    {t('plans.goalsCount', { count: plan.goals?.length ?? 0 })}
                    {' · '}
                    {t('plans.servicesCount', { count: plan.items?.length ?? 0 })}
                    {' · '}
                    {t('plans.version', { version: plan.version ?? 1 })}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-stone-400 rtl-flip" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RolePageShell>
  );
}
