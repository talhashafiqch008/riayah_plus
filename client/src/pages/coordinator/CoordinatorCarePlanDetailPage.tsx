import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  getCarePlan,
  submitCarePlan,
  updateCarePlan,
  updateCarePlanGoal,
  type CarePlan,
  type GoalInput,
  type ItemInput,
} from '@/lib/api/carePlans';
import { familyDateLocale } from '@/lib/familyLanguage';
import { localizeFrequencyLine, localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';

export default function CoordinatorCarePlanDetailPage() {
  const { t } = useTranslation('coordinator');
  const dateLocale = familyDateLocale();
  const { id = '' } = useParams();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCarePlan(id);
      setPlan(data);
      setTitle(data.title);
      setNotes(data.notes ?? '');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const editable =
    plan &&
    (plan.status === 'draft' ||
      plan.status === 'revision_requested' ||
      plan.status === 'active' ||
      plan.status === 'approved');

  const familyRevisionFeedback =
    plan?.rejectionNotes?.trim() ||
    (plan?.approvalLogs ?? [])
      .filter((log) => log.action === 'revision_requested')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      ?.notes;

  async function onSave() {
    if (!plan) return;
    setBusy(true);
    try {
      const goals: GoalInput[] = (plan.goals ?? []).map((g) => ({
        title: g.title,
        description: g.description ?? undefined,
        measurement: g.measurement ?? undefined,
        measurableOutcome: g.measurableOutcome ?? undefined,
        tier: g.tier,
        category: g.category,
        targetDate: g.targetDate ?? undefined,
      }));
      const items: ItemInput[] = (plan.items ?? []).map((i) => ({
        serviceType: i.serviceType,
        frequency: i.frequency ?? undefined,
        duration: i.duration ?? undefined,
        unitCost: i.unitCost != null ? Number(i.unitCost) : undefined,
        currency: i.currency,
        assignedRole: i.assignedRole ?? undefined,
        notes: i.notes ?? undefined,
      }));
      const updated = await updateCarePlan(plan.id, {
        title: title.trim(),
        notes: notes.trim() || null,
        goals,
        items,
      });
      setPlan(updated);
      toast.success(
        updated.id !== plan.id
          ? t('plans.toasts.newVersion', { version: updated.version })
          : t('plans.toasts.saved'),
      );
      if (updated.id !== plan.id) {
        window.history.replaceState(null, '', `/coordinator/plans/${updated.id}`);
      }
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.toasts.saveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit() {
    if (!plan) return;
    if (plan.status === 'revision_requested') {
      const trimmed = changeNotes.trim();
      if (trimmed.length < 10) {
        toast.error(t('plans.toasts.changeNotesRequired'));
        return;
      }
    }
    setBusy(true);
    try {
      await submitCarePlan(
        plan.id,
        plan.status === 'revision_requested' ? changeNotes.trim() : undefined,
      );
      toast.success(t('plans.toasts.submitted'));
      setChangeNotes('');
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.toasts.submitFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onAchieveGoal(goalId: string) {
    if (!plan) return;
    try {
      await updateCarePlanGoal(plan.id, goalId, { status: 'achieved' });
      toast.success(t('plans.toasts.goalAchieved'));
      await load();
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('plans.toasts.updateFailed'));
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!plan) {
    return <p className="text-stone-600">{t('plans.toasts.notFound')}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/coordinator/plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4 rtl-flip" /> {t('plans.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{localizeGeneratedLabel(plan.title)}</h2>
          <p className="mt-1 text-sm text-stone-500">
            {t('plans.versionMeta', { version: plan.version ?? 1 })}
            {plan.episodeId ? (
              <>
                {' · '}
                <Link
                  className="text-teal-700 hover:underline"
                  to={`/coordinator/episodes/${plan.episodeId}`}
                >
                  {t('plans.openEpisode')}
                </Link>
                {' · '}
                <Link
                  className="text-teal-700 hover:underline"
                  to={`/coordinator/episodes/${plan.episodeId}/care-plan/new`}
                >
                  {t('plans.newVersion')}
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
        >
          {t(`plans.status.${plan.status}`, {
            defaultValue: carePlanStatusLabel(plan.status),
          })}
        </span>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm space-y-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">{t('plans.fieldTitle')}</span>
          <input
            value={title}
            disabled={!editable}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:bg-stone-50"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-stone-700">{t('plans.fieldNotes')}</span>
          <textarea
            value={notes}
            disabled={!editable}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm disabled:bg-stone-50"
          />
        </label>
        {plan.status === 'revision_requested' && (
          <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            {familyRevisionFeedback ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800">
                  {t('plans.familyFeedback')}
                </p>
                <p className="mt-1 text-sm text-stone-700">{familyRevisionFeedback}</p>
              </div>
            ) : null}
            <label className="block space-y-1">
              <span className="text-sm font-medium text-stone-800">
                {t('plans.changeNotesLabel')}{' '}
                <span className="text-amber-700">{t('plans.changeNotesRequired')}</span>
              </span>
              <textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={3}
                placeholder={t('plans.changeNotesPlaceholder')}
                className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm"
              />
              <p className="text-xs text-stone-500">{t('plans.changeNotesHint')}</p>
            </label>
          </div>
        )}
        {editable && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSave()}
              className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-50 disabled:opacity-50"
            >
              {t('plans.saveChanges')}
            </button>
            {(plan.status === 'draft' || plan.status === 'revision_requested') && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSubmit()}
                className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {t('plans.submitApproval')}
              </button>
            )}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-3">{t('plans.goals')}</h3>
        <ul className="space-y-2">
          {(plan.goals ?? []).map((g) => (
            <li
              key={g.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
            >
              <div className="text-start min-w-0">
                <p className="font-medium text-stone-900">{g.title}</p>
                {g.description && <p className="text-sm text-stone-600">{g.description}</p>}
                <p className="text-xs text-stone-500 mt-0.5">
                  {t('plans.goalStatus', {
                    status: t(`plans.status.${g.status}`, {
                      defaultValue: g.status.replace(/_/g, ' '),
                    }),
                  })}
                </p>
              </div>
              {g.status === 'achieved' ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800">
                  <CheckCircle2 className="size-3.5" /> {t('plans.achieved')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void onAchieveGoal(g.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800"
                >
                  <CheckCircle2 className="size-3.5" /> {t('plans.markAchieved')}
                </button>
              )}
            </li>
          ))}
          {(plan.goals?.length ?? 0) === 0 && (
            <p className="text-sm text-stone-500">{t('plans.noGoals')}</p>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-3">{t('plans.services')}</h3>
        <ul className="space-y-2">
          {(plan.items ?? []).map((item) => (
            <li key={item.id} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
              <span className="font-medium text-stone-900">
                {t(`plans.serviceTypes.${item.serviceType}`, {
                  defaultValue: item.serviceType.replace(/_/g, ' '),
                })}
              </span>
              {(item.frequency || item.duration) && (
                <span className="text-stone-600">
                  {' '}
                  · {localizeFrequencyLine([item.frequency, item.duration].filter(Boolean).join(' · '))}
                </span>
              )}
              {item.unitCost != null && (
                <span className="text-stone-500">
                  {' '}
                  · {localizeFrequencyLine(`${item.currency ?? 'QAR'} ${String(item.unitCost)}`)}
                </span>
              )}
            </li>
          ))}
          {(plan.items?.length ?? 0) === 0 && (
            <p className="text-sm text-stone-500">{t('plans.noServices')}</p>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-3">{t('plans.approvalLog')}</h3>
        <ul className="space-y-2">
          {(plan.approvalLogs ?? []).map((log) => (
            <li key={log.id} className="text-sm text-stone-700 border-b border-stone-50 pb-2">
              <span className="font-medium">
                {t(`plans.actions.${log.action}`, {
                  defaultValue: log.action.replace(/_/g, ' '),
                })}
              </span>
              <span className="text-stone-500">
                {' '}
                · {new Date(log.createdAt).toLocaleString(dateLocale)}
              </span>
              {log.notes && <p className="text-stone-600 mt-0.5">{log.notes}</p>}
            </li>
          ))}
          {(plan.approvalLogs?.length ?? 0) === 0 && (
            <p className="text-sm text-stone-500">{t('plans.noApprovals')}</p>
          )}
        </ul>
      </section>
    </div>
  );
}
