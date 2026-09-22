import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { extractApiError } from '@/lib/errors';
import {
  listAssessments,
  updateAssessment,
  type Assessment,
} from '@/lib/api/assessments';
import { familyAssessmentStatusLabel, familyDateLocale } from '@/lib/familyLanguage';
import { localizeGeneratedLabel } from '@/lib/localizeStoredEnglish';
import {
  RolePageHeader,
  RolePageShell,
  btnDangerClass,
  btnPrimaryClass,
  btnSecondaryClass,
  fieldClass,
} from '@/components/care/RolePageChrome';

function statusClass(status: string) {
  switch (status) {
    case 'scheduled':
      return 'bg-blue-50 text-blue-800';
    case 'completed':
      return 'bg-emerald-50 text-emerald-800';
    case 'cancelled':
      return 'bg-stone-100 text-stone-600';
    case 'no_show':
      return 'bg-orange-50 text-orange-800';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

type Mode = 'clinical' | 'family';

export default function AssessmentSchedulePage({
  mode = 'clinical',
}: {
  mode?: Mode;
}) {
  const isFamily = mode === 'family';
  const isClinical = mode === 'clinical';
  const { t } = useTranslation(isFamily ? 'family' : 'clinical');
  const dateLocale = familyDateLocale();
  const [rows, setRows] = useState<Assessment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(mode === 'clinical' ? 'scheduled' : '');
  const [selected, setSelected] = useState<Assessment | null>(null);
  const [completing, setCompleting] = useState(false);

  const [mobility, setMobility] = useState('');
  const [pain, setPain] = useState('');
  const [summary, setSummary] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [reportUrl, setReportUrl] = useState('');
  const detailRef = useRef<HTMLDivElement>(null);

  const title = isFamily ? t('assessment.title') : t('schedule.title');
  const description = isFamily ? t('assessment.description') : t('schedule.description');

  const statusLabel = (value: string) => {
    if (isFamily) return familyAssessmentStatusLabel(value);
    return t(`schedule.status.${value}`, { defaultValue: value.replace(/_/g, ' ') });
  };

  const typeLabel = (value?: string | null) => {
    if (!value) return '';
    if (isClinical) {
      return t(`assessmentTypes.${value}`, { defaultValue: value.replace(/_/g, ' ') });
    }
    return value;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listAssessments({
        status: status || undefined,
        limit: 50,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (error: unknown) {
      toast.error(
        extractApiError(error).message ||
          (isFamily ? t('assessment.loadError') : t('schedule.loadError')),
      );
    } finally {
      setLoading(false);
    }
  }, [status, isFamily, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openComplete = (row: Assessment) => {
    setSelected(row);
    setMobility('');
    setPain('');
    setSummary('');
    setRecommendations('');
    setReportUrl('');
    window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleComplete = async () => {
    if (!selected) return;
    if (!mobility.trim() && !pain.trim() && !summary.trim()) {
      toast.error(t('schedule.needFindings'));
      return;
    }
    if (!recommendations.trim() && !reportUrl.trim()) {
      toast.error(t('schedule.needRecOrReport'));
      return;
    }

    setCompleting(true);
    try {
      await updateAssessment(selected.id, {
        status: 'completed',
        findings: {
          mobility: mobility.trim() || null,
          pain: pain.trim() || null,
          summary: summary.trim() || null,
        },
        recommendations: recommendations.trim() || undefined,
        reportUrl: reportUrl.trim() || undefined,
      });
      toast.success(t('schedule.completed'));
      setSelected(null);
      await load();
    } catch (error: unknown) {
      const apiError = extractApiError(error);
      const fieldHint = apiError.fieldErrors
        ? Object.entries(apiError.fieldErrors)
            .map(([k, v]) => `${k}: ${v.join(', ')}`)
            .join('; ')
        : '';
      toast.error(fieldHint || apiError.message || t('schedule.completeFailed'));
    } finally {
      setCompleting(false);
    }
  };

  const selectRow = (row: Assessment) => {
    if (mode === 'clinical' && row.status === 'scheduled') {
      openComplete(row);
      return;
    }
    setSelected(row);
    window.setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <RolePageShell>
      <RolePageHeader
        title={title}
        description={description}
        actions={
          <button type="button" onClick={() => void load()} className={btnSecondaryClass}>
            <RefreshCw className="size-4" />{' '}
            {isFamily ? t('common.refresh') : t('schedule.refresh')}
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={`${fieldClass} sm:max-w-xs`}
        >
          <option value="">{isFamily ? t('episodes.all') : t('schedule.allStatuses')}</option>
          <option value="scheduled">
            {isFamily ? t('assessment.consultationBooked') : t('schedule.status.scheduled')}
          </option>
          <option value="completed">
            {isFamily ? t('assessment.consultationCompleted') : t('schedule.status.completed')}
          </option>
          <option value="cancelled">
            {isFamily ? t('assessment.status.cancelled', { defaultValue: 'Cancelled' }) : t('schedule.status.cancelled')}
          </option>
        </select>
        <span className="text-sm text-stone-500">
          {isFamily
            ? `${total} ${total === 1 ? t('assessment.appointment') : t('assessment.appointments')}`
            : t('schedule.count', { count: total })}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-5 lg:gap-6">
        <div
          className={`divide-y overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm lg:col-span-2 ${
            selected ? 'hidden lg:block' : ''
          }`}
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-6 animate-spin text-teal-600" />
            </div>
          ) : rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-stone-500">
              {isFamily ? t('assessment.empty') : t('schedule.empty')}
            </p>
          ) : (
            rows.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => selectRow(row)}
                className={`w-full p-4 text-left transition-colors hover:bg-teal-50/40 active:bg-teal-50/60 ${
                  selected?.id === row.id ? 'bg-teal-50/60' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 rounded-xl bg-teal-50 p-2 text-teal-700">
                    <CalendarClock className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold capitalize text-stone-900">
                        {typeLabel(row.type) || row.type}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-stone-500">
                      {isClinical
                        ? localizeGeneratedLabel(row.episode?.title) || t('schedule.episode')
                        : row.episode?.title || (isFamily ? t('assessment.careJourney') : 'Episode')}
                    </p>
                    <p className="mt-0.5 text-xs text-stone-400">
                      {new Date(row.scheduledAt).toLocaleString(dateLocale)}
                      {row.assessor?.name ? ` · ${row.assessor.name}` : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div
          ref={detailRef}
          className="min-h-[280px] rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-3 lg:min-h-[320px]"
        >
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-stone-400">
              <CalendarClock className="mb-3 size-10 opacity-40" />
              <p className="text-sm">
                {isFamily
                  ? t('assessment.selectPrompt', { defaultValue: 'Select an appointment to view details.' })
                  : t('schedule.selectPrompt')}
              </p>
            </div>
          ) : mode === 'clinical' && selected.status === 'scheduled' ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold capitalize text-stone-900">
                    {t('schedule.completeTitle', { type: typeLabel(selected.type) || selected.type })}
                  </h3>
                  <p className="mt-1 break-words text-sm text-stone-500">
                    {localizeGeneratedLabel(selected.episode?.title)} ·{' '}
                    {new Date(selected.scheduledAt).toLocaleString(dateLocale)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 lg:hidden"
                >
                  {t('schedule.back')}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs font-semibold text-stone-500">{t('schedule.mobility')}</span>
                  <input
                    value={mobility}
                    onChange={(e) => setMobility(e.target.value)}
                    className={`mt-1 ${fieldClass}`}
                    placeholder={t('schedule.mobilityPlaceholder')}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs font-semibold text-stone-500">{t('schedule.pain')}</span>
                  <input
                    value={pain}
                    onChange={(e) => setPain(e.target.value)}
                    className={`mt-1 ${fieldClass}`}
                    placeholder={t('schedule.painPlaceholder')}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-xs font-semibold text-stone-500">{t('schedule.summary')}</span>
                  <textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className={`mt-1 min-h-[72px] ${fieldClass}`}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-xs font-semibold text-stone-500">{t('schedule.recommendations')}</span>
                  <textarea
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className={`mt-1 min-h-[64px] ${fieldClass}`}
                  />
                </label>
                <label className="text-sm sm:col-span-2">
                  <span className="text-xs font-semibold text-stone-500">{t('schedule.reportUrl')}</span>
                  <input
                    value={reportUrl}
                    onChange={(e) => setReportUrl(e.target.value)}
                    className={`mt-1 ${fieldClass}`}
                    placeholder="https://…"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => void handleComplete()}
                  className={btnPrimaryClass}
                >
                  {completing && <Loader2 className="size-4 animate-spin" />}
                  {t('schedule.markCompleted')}
                </button>
                <button
                  type="button"
                  disabled={completing}
                  onClick={async () => {
                    try {
                      await updateAssessment(selected.id, { status: 'cancelled' });
                      toast.success(t('schedule.cancelled'));
                      setSelected(null);
                      await load();
                    } catch (error: unknown) {
                      toast.error(extractApiError(error).message);
                    }
                  }}
                  className={btnDangerClass}
                >
                  {t('schedule.cancelAssessment')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold capitalize text-stone-900">
                    {typeLabel(selected.type) || selected.type}
                  </h3>
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass(selected.status)}`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-stone-500 hover:bg-stone-100 lg:hidden"
                >
                  {isClinical ? t('schedule.back') : 'Back'}
                </button>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-stone-500">
                    {isFamily ? t('assessment.careJourney') : t('schedule.episode')}
                  </dt>
                  <dd className="mt-0.5 break-words text-stone-900">
                    {isClinical
                      ? localizeGeneratedLabel(selected.episode?.title) || '—'
                      : selected.episode?.title || '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">
                    {isClinical ? t('schedule.scheduled') : 'Scheduled'}
                  </dt>
                  <dd className="mt-0.5 text-stone-900">
                    {new Date(selected.scheduledAt).toLocaleString(dateLocale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">
                    {isFamily ? t('assessment.clinician') : t('schedule.assessor')}
                  </dt>
                  <dd className="mt-0.5 text-stone-900">{selected.assessor?.name || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-stone-500">
                    {isFamily ? t('assessment.visitSummary') : t('schedule.report')}
                  </dt>
                  <dd className="mt-0.5 text-stone-900">
                    {selected.reportUrl ? (
                      <a
                        href={selected.reportUrl}
                        className="break-all text-teal-700 underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {isClinical ? t('schedule.openReport') : 'Open report'}
                      </a>
                    ) : (
                      '—'
                    )}
                  </dd>
                </div>
              </dl>
              {selected.findings && (
                <div>
                  <p className="mb-2 text-xs font-semibold text-stone-500">
                    {isFamily ? t('assessment.visitNotes') : t('schedule.findings')}
                  </p>
                  <dl className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2">
                    {Object.entries(selected.findings)
                      .filter(([, value]) => value != null && String(value).trim() !== '')
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs font-semibold capitalize text-stone-500">
                            {key.replace(/_/g, ' ')}
                          </dt>
                          <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-stone-900">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              )}
              {selected.recommendations && (
                <div>
                  <p className="mb-1 text-xs font-semibold text-stone-500">
                    {isClinical ? t('schedule.recommendations') : 'Recommendations'}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-stone-800">
                    {selected.recommendations}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RolePageShell>
  );
}
