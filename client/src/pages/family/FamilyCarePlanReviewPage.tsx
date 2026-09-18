import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  approveCarePlan,
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  getCarePlan,
  rejectCarePlan,
  requestCarePlanRevision,
  type CarePlan,
} from '@/lib/api/carePlans';

export default function FamilyCarePlanReviewPage() {
  const { t } = useTranslation('family');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlan(await getCarePlan(id));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('carePlanReview.loadError'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const canAct = plan?.status === 'submitted_for_approval';

  async function onApprove() {
    setBusy(true);
    try {
      await approveCarePlan(id);
      toast.success(t('carePlanReview.approved'));
      navigate('/family/care-plans');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('carePlanReview.approveFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onRevision() {
    if (!notes.trim()) {
      toast.error(t('carePlanReview.needExplanation'));
      return;
    }
    setBusy(true);
    try {
      await requestCarePlanRevision(id, notes.trim());
      toast.success(t('carePlanReview.revisionRequested'));
      navigate('/family/care-plans');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('carePlanReview.requestFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    setBusy(true);
    try {
      await rejectCarePlan(id, notes.trim() || undefined);
      toast.success(t('carePlanReview.rejected'));
      navigate('/family/care-plans');
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : t('carePlanReview.rejectFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full size-10 border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!plan) return <p className="text-stone-600">{t('carePlanReview.notFound')}</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/family/care-plans"
        className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4" /> {t('carePlanReview.back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{plan.title}</h2>
          {plan.notes && <p className="mt-2 text-stone-600">{plan.notes}</p>}
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
        >
          {carePlanStatusLabel(plan.status)}
        </span>
      </div>

      {(() => {
        const changeNotes = (plan.approvalLogs ?? [])
          .filter((log) => log.action === 'submitted' && Boolean(log.notes?.trim()))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
          ?.notes;
        if (!changeNotes) return null;
        return (
          <section className="rounded-xl border border-teal-200 bg-teal-50/70 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-teal-800">
              {t('carePlanReview.teamChanged')}
            </h3>
            <p className="mt-2 text-sm text-stone-800">{changeNotes}</p>
          </section>
        );
      })()}

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-3">{t('carePlanReview.careGoals')}</h3>
        <ul className="space-y-2">
          {(plan.goals ?? []).map((g) => (
            <li key={g.id} className="rounded-lg bg-stone-50 px-3 py-2">
              <p className="font-medium text-stone-900">{g.title}</p>
              {g.description && <p className="text-sm text-stone-600">{g.description}</p>}
              {g.measurement && (
                <p className="text-xs text-stone-500 mt-1">
                  {t('carePlanReview.measure', { value: g.measurement })}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-900 mb-3">{t('carePlanReview.servicesCosts')}</h3>
        <ul className="space-y-2">
          {(plan.items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between gap-3 text-sm rounded-lg bg-stone-50 px-3 py-2">
              <div>
                <p className="font-medium text-stone-900">{item.serviceType}</p>
                <p className="text-stone-600">
                  {[item.frequency, item.duration, item.assignedRole].filter(Boolean).join(' · ')}
                </p>
              </div>
              {item.unitCost != null && (
                <p className="font-semibold text-stone-800 whitespace-nowrap">
                  {item.currency ?? 'QAR'} {String(item.unitCost)}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canAct && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 space-y-4">
          <h3 className="font-semibold text-stone-900">{t('carePlanReview.yourDecision')}</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={t('carePlanReview.notesPlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onApprove()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {t('carePlanReview.approve')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onRevision()}
              className="rounded-xl border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-800 disabled:opacity-50"
            >
              {t('carePlanReview.requestChanges')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onReject()}
              className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              {t('carePlanReview.reject')}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
