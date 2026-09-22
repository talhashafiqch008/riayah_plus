import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';

export default function CoordinatorCarePlansPage() {
  const { t } = useTranslation('coordinator');
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
      toast.error(isApiError(error) ? error.message : t('plans.loadError'));
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
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{t('plans.title')}</h2>
          <p className="mt-1 text-stone-600">{t('plans.description')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            <RefreshCw className="size-4" /> {t('plans.refresh')}
          </button>
          <button
            type="button"
            onClick={() => setShowPicker((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            <Plus className="size-4" /> {t('plans.newPlan')}
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-medium text-stone-800">{t('plans.pickEpisode')}</p>
          <div className="max-h-56 overflow-y-auto divide-y divide-stone-100">
            {episodes.length === 0 && (
              <p className="text-sm text-stone-500 py-2">{t('plans.noEpisodes')}</p>
            )}
            {episodes.map((ep) => (
              <Link
                key={ep.id}
                to={`/coordinator/episodes/${ep.id}/care-plan/new`}
                className="flex items-center justify-between py-2.5 hover:bg-stone-50 px-2 rounded-lg"
              >
                <span className="text-sm font-medium text-stone-900 text-start">
                  {localizeGeneratedLabel(ep.title)}
                </span>
                <span className="text-xs text-stone-500">
                  {t(`episodes.status.${ep.status}`, {
                    defaultValue: ep.status.replace(/_/g, ' '),
                  })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        <label className="text-sm text-stone-600">{t('common.all')}</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-stone-200 px-3 py-2 text-sm"
        >
          <option value="">{t('plans.allStatuses')}</option>
          <option value="draft">{t('plans.status.draft')}</option>
          <option value="submitted_for_approval">{t('plans.status.submitted_for_approval')}</option>
          <option value="active">{t('plans.status.active')}</option>
          <option value="revision_requested">{t('plans.status.revision_requested')}</option>
          <option value="rejected">{t('plans.status.rejected')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-200 bg-white p-10 text-center">
          <ClipboardList className="mx-auto size-10 text-stone-300" />
          <p className="mt-3 text-stone-600">{t('plans.empty')}</p>
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
                  <div className="text-start">
                    <h3 className="font-semibold text-stone-900">{localizeGeneratedLabel(plan.title)}</h3>
                    <p className="mt-1 text-xs text-stone-500">
                      {t('plans.version', { version: plan.version ?? 1 })}
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
                <p className="mt-2 text-sm text-stone-600 text-start">
                  {t('plans.goalsCount', { count: plan.goals?.length ?? 0 })}
                  {' · '}
                  {t('plans.servicesCount', { count: plan.items?.length ?? 0 })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
