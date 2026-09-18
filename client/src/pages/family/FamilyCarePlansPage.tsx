import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  listCarePlans,
  type CarePlan,
} from '@/lib/api/carePlans';

export default function FamilyCarePlansPage() {
  const { t } = useTranslation('family');
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCarePlans();
      setPlans(rows.filter((p) => p.isCurrentVersion !== false));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('carePlans.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const awaiting = useMemo(
    () => plans.filter((p) => p.status === 'submitted_for_approval'),
    [plans],
  );
  const others = useMemo(
    () => plans.filter((p) => p.status !== 'submitted_for_approval'),
    [plans],
  );

  function PlanCard({ plan, highlight }: { plan: CarePlan; highlight?: boolean }) {
    return (
      <Link
        to={`/family/care-plans/${plan.id}`}
        className={`block rounded-xl border p-4 shadow-sm transition ${
          highlight
            ? 'border-amber-200 bg-amber-50/40 hover:border-amber-300'
            : 'border-stone-100 bg-white hover:border-teal-200'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-stone-900">{plan.title}</h3>
            <p className="mt-1 text-sm text-stone-600">
              {t('common.goalsServices', {
                goals: plan.goals?.length ?? 0,
                services: plan.items?.length ?? 0,
                version: plan.version,
              })}
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
          >
            {carePlanStatusLabel(plan.status)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{t('carePlans.title')}</h2>
          <p className="mt-1 text-stone-600">{t('carePlans.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          <RefreshCw className="size-4" /> {t('common.refresh')}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <BookOpen className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">{t('carePlans.empty')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {awaiting.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-800">
                {t('carePlans.needsAction')}
              </h3>
              {awaiting.map((p) => (
                <PlanCard key={p.id} plan={p} highlight />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                {t('carePlans.otherPlans')}
              </h3>
              {others.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
