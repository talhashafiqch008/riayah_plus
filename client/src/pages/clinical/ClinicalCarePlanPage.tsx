import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PenLine } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  carePlanStatusBadgeClass,
  carePlanStatusLabel,
  cosignCarePlan,
  getCarePlan,
  type CarePlan,
} from '@/lib/api/carePlans';
import {
  localizeFrequencyLine,
  localizeGeneratedLabel,
} from '@/lib/localizeStoredEnglish';
import { familyDateLocale } from '@/lib/familyLanguage';
import {
  RolePageShell,
  btnPrimaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

export default function ClinicalCarePlanPage() {
  const { t } = useTranslation('clinical');
  const dateLocale = familyDateLocale();
  const { id = '' } = useParams();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPlan(await getCarePlan(id));
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('plans.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCosign() {
    setBusy(true);
    try {
      const result = await cosignCarePlan(id, notes.trim() || undefined);
      setPlan(result.data);
      toast.success(result.message);
    } catch (error: unknown) {
      toast.error(extractApiError(error).message || t('plans.cosignFailed'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="size-10 animate-spin rounded-full border-b-2 border-teal-600" />
      </div>
    );
  }

  if (!plan) return <p className="text-stone-600">{t('plans.notFound')}</p>;

  const already =
    plan.approvalLogs?.some((l) => l.action === 'clinical_cosign') ?? false;

  return (
    <RolePageShell>
      <Link
        to="/clinical/plans"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
      >
        <ArrowLeft className="size-4 rtl-flip" /> {t('plans.back')}
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="break-words text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
            {localizeGeneratedLabel(plan.title)}
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {t('plans.readOnly', { version: plan.version })}
          </p>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${carePlanStatusBadgeClass(plan.status)}`}
        >
          {t(`plans.status.${plan.status}`, {
            defaultValue: carePlanStatusLabel(plan.status),
          })}
        </span>
      </div>

      <section className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-semibold text-stone-900">{t('plans.goals')}</h3>
        {(plan.goals ?? []).length === 0 ? (
          <p className="text-sm text-stone-500">{t('plans.noGoals')}</p>
        ) : (
          (plan.goals ?? []).map((g) => (
            <p key={g.id} className="break-words text-sm text-stone-700">
              • {localizeGeneratedLabel(g.title)}
              {g.status === 'achieved' ? ` ${t('plans.achieved')}` : ''}
            </p>
          ))
        )}
      </section>

      <section className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="font-semibold text-stone-900">{t('plans.services')}</h3>
        {(plan.items ?? []).length === 0 ? (
          <p className="text-sm text-stone-500">{t('plans.noServices')}</p>
        ) : (
          (plan.items ?? []).map((i) => (
            <p key={i.id} className="break-words text-sm text-stone-700">
              • {localizeGeneratedLabel(i.serviceType)}
              {i.frequency ? ` · ${localizeFrequencyLine(i.frequency)}` : ''}
            </p>
          ))
        )}
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h3 className="mb-3 font-semibold text-stone-900">{t('plans.approvalLog')}</h3>
        <ul className="space-y-2 text-sm">
          {(plan.approvalLogs ?? []).length === 0 ? (
            <li className="text-stone-500">{t('plans.noApprovals')}</li>
          ) : (
            (plan.approvalLogs ?? []).map((log) => (
              <li key={log.id} className="text-stone-700">
                <span className="font-medium break-words">{log.action}</span>
                <span className="text-stone-500">
                  {' '}
                  · {new Date(log.createdAt).toLocaleString(dateLocale)}
                </span>
                {log.notes && <p className="break-words text-stone-600">{log.notes}</p>}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-teal-100 bg-teal-50/40 p-4 sm:p-5">
        <h3 className="inline-flex items-center gap-2 font-semibold text-stone-900">
          <PenLine className="size-4 text-teal-700" /> {t('plans.cosign')}
        </h3>
        <p className="text-sm text-stone-600">{t('plans.cosignLongHint')}</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder={t('plans.cosignPlaceholder')}
          className={fieldClass}
        />
        <button type="button" disabled={busy} onClick={() => void onCosign()} className={btnPrimaryClass}>
          {already ? t('plans.cosignAgain') : t('plans.cosignButton')}
        </button>
      </section>
    </RolePageShell>
  );
}
