import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2, RefreshCw, ClipboardCheck, HeartHandshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  getIntake,
  listIntakeQueue,
  reviewIntake,
  updateIntakeStatus,
  updateIntakeUrgency,
  intakeDocumentDownloadUrl,
  type IntakeRecord,
  type ServiceCategory,
  type UrgencyLevel,
} from '@/lib/api/intake';
import { createCoordinatorDocumentRequest } from '@/lib/api/documents';
import {
  PENDING_DIAGNOSIS,
  parseFamilyWizardSummary,
} from '@/lib/familyCareseekerIntake';
import {
  buildCoordinatorNextActions,
  nextUrgencyLevel,
  queueHintIdForIntake,
  type CoordinatorNextAction,
} from '@/lib/coordinatorIntakeNextActions';
import {
  localizeAccountTypeLabel,
  localizeChip,
  localizeGeneratedLabel,
  localizeStoredNarrative,
} from '@/lib/localizeStoredEnglish';
import { familyDateLocale, familyEnumLabel } from '@/lib/familyLanguage';

const DOC_REQUEST_TYPE_VALUES = [
  'medical_report',
  'referral',
  'prior_assessment',
  'insurance',
  'other',
] as const;

const STATUS_VALUES = [
  '',
  'submitted',
  'under_review',
  'validated',
  'episode_created',
  'withdrawn',
] as const;

const URGENCY_VALUES = ['', 'urgent', 'high', 'medium', 'low'] as const;

const CONCERN_OPTIONS = [
  'falls risk',
  'mobility',
  'medication management',
  'cognitive decline',
  'pain',
  'caregiver burnout',
  'post-discharge support',
];

const URGENCY_INDICATOR_OPTIONS = [
  'recent_discharge',
  'recent_fall',
  'worsening_symptoms',
  'no_informal_support',
  'time_sensitive_therapy',
];

const RISK_FLAG_OPTIONS = ['falls', 'polypharmacy', 'isolation', 'wound_care', 'dysphagia'];

const SERVICE_VALUES: ServiceCategory[] = [
  'physiotherapy',
  'nursing',
  'occupational_therapy',
  'speech_therapy',
  'behavioral_support',
  'companion_care',
];

function statusBadgeClass(status: string) {
  switch (status) {
    case 'submitted':
      return 'bg-amber-50 text-amber-800';
    case 'under_review':
      return 'bg-blue-50 text-blue-800';
    case 'validated':
      return 'bg-teal-50 text-teal-800';
    case 'episode_created':
      return 'bg-emerald-50 text-emerald-800';
    case 'withdrawn':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

function urgencyBadgeClass(urgency?: string | null) {
  switch (urgency) {
    case 'urgent':
      return 'bg-red-50 text-red-700';
    case 'high':
      return 'bg-orange-50 text-orange-700';
    case 'medium':
      return 'bg-yellow-50 text-yellow-800';
    case 'low':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-500';
  }
}

function ChipToggle({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
        selected
          ? 'bg-teal-600 border-teal-600 text-white'
          : 'bg-white border-stone-200 text-stone-700 hover:border-teal-300'
      }`}
    >
      {label}
    </button>
  );
}

function nextActionCopy(
  action: CoordinatorNextAction,
  intakeStatus: string,
  t: (key: string, opts?: Record<string, string>) => string,
): { label: string; description: string } {
  if (action.id === 'review') {
    if (intakeStatus === 'submitted') {
      return {
        label: t('intake.nextActions.review.labelSubmitted'),
        description: t('intake.nextActions.review.descSubmitted'),
      };
    }
    return {
      label: t('intake.nextActions.review.labelUnderReview'),
      description: t('intake.nextActions.review.descUnderReview'),
    };
  }
  if (action.id === 'documents') {
    return action.noDocumentsYet
      ? {
          label: t('intake.nextActions.documents.labelMissing'),
          description: t('intake.nextActions.documents.descMissing'),
        }
      : {
          label: t('intake.nextActions.documents.labelAdditional'),
          description: t('intake.nextActions.documents.descAdditional'),
        };
  }
  if (action.id === 'schedule') {
    return {
      label: t('intake.nextActions.schedule.label'),
      description: t('intake.nextActions.schedule.description'),
    };
  }
  const urgency = action.currentUrgency ?? 'medium';
  const urgencyLabel = t(`intake.urgency.${urgency}`, { defaultValue: urgency });
  const rank = urgency === 'high' ? 3 : urgency === 'urgent' ? 4 : urgency === 'low' ? 1 : 2;
  return {
    label: t('intake.nextActions.escalate.label'),
    description:
      rank < 3
        ? t('intake.nextActions.escalate.descRaise', { urgency: urgencyLabel })
        : t('intake.nextActions.escalate.descUrgent'),
  };
}

const SUPPORT_EN_TO_ID: Record<string, string> = {
  'Home Care': 'aged_care',
  Disability: 'disability_support',
  Babysitting: 'child_family',
  Therapy: 'allied_health',
  'Home Visit': 'home_support',
};
const GENDER_EN_TO_ID: Record<string, string> = {
  'Female provider only': 'female_only',
  'Male provider only': 'male_only',
  'No preference': 'no_preference',
};
const CARE_LOCATION_EN_TO_ID: Record<string, string> = {
  'In-person / at home': 'home',
  Clinic: 'clinic',
  Virtual: 'telehealth',
  Flexible: 'flexible',
  'In-person': 'home',
};

function localizeSummaryToken(group: string, raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  let slug = trimmed;
  if (group === 'support' && SUPPORT_EN_TO_ID[trimmed]) slug = SUPPORT_EN_TO_ID[trimmed];
  if (group === 'gender' && GENDER_EN_TO_ID[trimmed]) slug = GENDER_EN_TO_ID[trimmed];
  if (group === 'careLocation' && CARE_LOCATION_EN_TO_ID[trimmed]) {
    slug = CARE_LOCATION_EN_TO_ID[trimmed];
  }
  const translated = familyEnumLabel(group, slug);
  return translated !== slug.replace(/_/g, ' ') ? translated : trimmed;
}

export default function CoordinatorIntakeQueuePage() {
  const { t } = useTranslation('coordinator');
  const [status, setStatus] = useState('submitted');
  const [urgency, setUrgency] = useState('');
  const [rows, setRows] = useState<IntakeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<IntakeRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [requestingDocs, setRequestingDocs] = useState(false);
  const [showDocRequest, setShowDocRequest] = useState(false);
  const [docType, setDocType] = useState('medical_report');
  const [docNote, setDocNote] = useState('');

  const [keyConcerns, setKeyConcerns] = useState<string[]>([]);
  const [urgencyIndicators, setUrgencyIndicators] = useState<string[]>([]);
  const [suggestedServices, setSuggestedServices] = useState<ServiceCategory[]>([]);
  const [riskFlags, setRiskFlags] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [createEpisode, setCreateEpisode] = useState(true);
  const [episodeTitle, setEpisodeTitle] = useState('');

  const reviewSectionRef = useRef<HTMLDivElement | null>(null);

  const canReview = useMemo(() => {
    if (!detail) return false;
    return detail.status === 'submitted' || detail.status === 'under_review';
  }, [detail]);

  const nextActions = useMemo(
    () => (detail ? buildCoordinatorNextActions(detail) : []),
    [detail],
  );

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listIntakeQueue({
        status: status || undefined,
        urgency: urgency || undefined,
        limit: 50,
      });
      setRows(result.data);
      setTotal(result.total);
      if (selectedId && !result.data.some((r) => r.id === selectedId)) {
        // keep selection if still valid; otherwise leave as-is until click
      }
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(t('intake.loadError'));
    } finally {
      setLoading(false);
    }
  }, [status, urgency, selectedId, t]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const openDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    setKeyConcerns([]);
    setUrgencyIndicators([]);
    setSuggestedServices([]);
    setRiskFlags([]);
    setNotes('');
    setCreateEpisode(true);
    setEpisodeTitle('');
    setShowDocRequest(false);
    setDocType('medical_report');
    setDocNote('');
    try {
      const data = await getIntake(id);
      setDetail(data);
      if (data.serviceInterests?.length) {
        setSuggestedServices(data.serviceInterests);
      }
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(t('intake.loadError'));
    } finally {
      setDetailLoading(false);
    }
  };

  const toggle = <T extends string>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const handleStartReview = async () => {
    if (!detail || detail.status !== 'submitted') return;
    setClaiming(true);
    try {
      await updateIntakeStatus(detail.id, 'under_review');
      toast.success(t('intake.toasts.markedUnderReview'));
      const refreshed = await getIntake(detail.id);
      setDetail(refreshed);
      await loadQueue();
      window.setTimeout(() => {
        reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(t('intake.toasts.statusUpdateFailed'));
    } finally {
      setClaiming(false);
    }
  };

  const handleEscalateUrgency = async () => {
    if (!detail) return;
    const next = nextUrgencyLevel(detail.urgencyLevel);
    if (detail.urgencyLevel === 'urgent') {
      toast(t('intake.toasts.alreadyUrgent'));
      return;
    }
    setEscalating(true);
    try {
      const updated = await updateIntakeUrgency(detail.id, next);
      setDetail((prev) => (prev ? { ...prev, ...updated } : updated));
      toast.success(
        t('intake.toasts.urgencyRaised', {
          level: t(`intake.urgency.${next}`, { defaultValue: next }),
        }),
      );
      await loadQueue();
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(t('intake.toasts.escalateFailed'));
    } finally {
      setEscalating(false);
    }
  };

  const handleRequestDocuments = async () => {
    if (!detail?.familyUser?.id) {
      toast.error(t('intake.toasts.noFamilyUser'));
      return;
    }
    setRequestingDocs(true);
    try {
      await createCoordinatorDocumentRequest({
        targetUserId: detail.familyUser.id,
        documentType: docType,
        description: docNote.trim() || undefined,
      });
      toast.success(t('intake.toasts.docRequestSent'));
      setShowDocRequest(false);
      setDocNote('');
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(t('intake.toasts.docOpenFailed'));
    } finally {
      setRequestingDocs(false);
    }
  };

  const handleNextAction = (actionId: string) => {
    if (actionId === 'review') {
      if (detail?.status === 'submitted') {
        void handleStartReview();
      } else {
        reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (actionId === 'documents') {
      setShowDocRequest(true);
      return;
    }
    if (actionId === 'escalate') {
      void handleEscalateUrgency();
    }
  };

  const handleReview = async () => {
    if (!detail) return;
    if (keyConcerns.length === 0) {
      toast.error(t('intake.toasts.needConcern'));
      return;
    }
    if (urgencyIndicators.length === 0) {
      toast.error(t('intake.toasts.needUrgency'));
      return;
    }
    if (suggestedServices.length === 0) {
      toast.error(t('intake.toasts.needService'));
      return;
    }

    setReviewing(true);
    try {
      const result = await reviewIntake(detail.id, {
        keyConcerns,
        urgencyIndicators,
        suggestedServiceCategories: suggestedServices,
        riskFlags,
        createEpisode,
        episodeTitle: episodeTitle.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(
        createEpisode
          ? t('intake.toasts.episodeCreated', {
              id: result.episode?.id?.slice(0, 8) ?? '',
            })
          : t('intake.toasts.validated'),
      );
      setDetail(result.intake);
      await loadQueue();
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(t('intake.toasts.reviewFailed'));
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-stone-900">{t('intake.title')}</h2>
          <p className="mt-1 text-stone-600">{t('intake.description')}</p>
        </div>
        <button
          type="button"
          onClick={() => void loadQueue()}
          className="inline-flex items-center gap-2 rounded-xl border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
        >
          <RefreshCw className="size-4" /> {t('intake.refresh')}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
        >
          {STATUS_VALUES.map((value) => (
            <option key={value || 'all'} value={value}>
              {value ? t(`intake.status.${value}`) : t('intake.allStatuses')}
            </option>
          ))}
        </select>
        <select
          value={urgency}
          onChange={(e) => setUrgency(e.target.value)}
          className="rounded-xl border border-stone-300 px-3 py-2 text-sm"
        >
          {URGENCY_VALUES.map((value) => (
            <option key={value || 'all-u'} value={value}>
              {value ? t(`intake.urgency.${value}`) : t('intake.allUrgency')}
            </option>
          ))}
        </select>
        <span className="text-sm text-stone-500 self-center">{total} result{total === 1 ? '' : 's'}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2 rounded-2xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-7 animate-spin text-teal-600" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-stone-500 text-sm">{t('intake.empty')}</div>
          ) : (
            <ul className="divide-y divide-stone-100">
              {rows.map((row) => {
                const active = row.id === selectedId;
                const hintId = queueHintIdForIntake(row);
                const hint = hintId
                  ? t(`intake.queueHint.${hintId}`, { defaultValue: hintId })
                  : '';
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => void openDetail(row.id)}
                      className={`w-full text-start px-4 py-3 transition-colors ${
                        active ? 'bg-teal-50' : 'hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-stone-900 text-sm">
                            {localizeGeneratedLabel(
                              row.careRecipient?.name ?? t('intake.detail.patient'),
                            )}
                          </p>
                          <p className="text-xs text-stone-500 mt-0.5">
                            {localizeGeneratedLabel(
                              row.careUnit?.name ?? t('intake.detail.careUnit'),
                            )}{' '}
                            · {row.familyUser?.name ?? t('intake.detail.family')}
                          </p>
                          {hint && (
                            <p className="text-[11px] font-semibold text-teal-700 mt-1">
                              {t('intake.queueHint.next', { hint })}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(row.status)}`}
                          >
                            {t(`intake.status.${row.status}`, {
                              defaultValue: row.status.replace(/_/g, ' '),
                            })}
                          </span>
                          {row.urgencyLevel && (
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgencyBadgeClass(row.urgencyLevel)}`}
                            >
                              {t(`intake.urgency.${row.urgencyLevel}`, {
                                defaultValue: row.urgencyLevel,
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 mt-2 line-clamp-2">
                        {localizeStoredNarrative(row.reasonForCare)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-3 rounded-2xl border bg-white shadow-sm p-6 min-h-[420px]">
          {!selectedId && (
            <div className="h-full flex flex-col items-center justify-center text-center text-stone-500 py-16">
              <ClipboardCheck className="size-10 text-stone-300 mb-3" />
              <p className="text-sm">{t('intake.detail.selectPrompt')}</p>
            </div>
          )}

          {selectedId && detailLoading && (
            <div className="flex justify-center py-16">
              <Loader2 className="size-7 animate-spin text-teal-600" />
            </div>
          )}

          {selectedId && !detailLoading && detail && (
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-stone-900">
                    {localizeGeneratedLabel(detail.careRecipient?.name)}
                  </h3>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(detail.status)}`}
                  >
                    {t(`intake.status.${detail.status}`, {
                      defaultValue: detail.status.replace(/_/g, ' '),
                    })}
                  </span>
                </div>
                <p className="text-sm text-stone-600">
                  {localizeGeneratedLabel(detail.careUnit?.name)} · {t('intake.detail.family')}:{' '}
                  {detail.familyUser?.name} ({detail.familyUser?.email})
                </p>
                {detail.submittedAt && (
                  <p className="text-xs text-stone-400 mt-1">
                    {t('intake.detail.submitted', {
                      date: new Date(detail.submittedAt).toLocaleString(familyDateLocale()),
                    })}
                  </p>
                )}
              </div>

              {nextActions.length > 0 && (
                <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {t('intake.nextActions.title')}
                    </p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {t('intake.nextActions.subtitle')}
                    </p>
                  </div>
                  <ul className="space-y-2">
                    {nextActions.map((action) => {
                      const copy = nextActionCopy(action, detail.status, t);
                      return (
                      <li
                        key={action.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-stone-900">{copy.label}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{copy.description}</p>
                        </div>
                        {action.id === 'schedule' && detail.careEpisode?.id ? (
                          <Link
                            to={`/coordinator/episodes/${detail.careEpisode.id}`}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shrink-0 ${
                              action.primary
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {t('intake.actions.openEpisode')}
                            <ArrowRight className="size-3.5" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              (action.id === 'review' && claiming) ||
                              (action.id === 'escalate' && escalating) ||
                              (action.id === 'documents' && requestingDocs)
                            }
                            onClick={() => handleNextAction(action.id)}
                            className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold shrink-0 disabled:opacity-50 ${
                              action.primary
                                ? 'bg-teal-600 text-white hover:bg-teal-700'
                                : 'border border-stone-200 text-stone-700 hover:bg-stone-50'
                            }`}
                          >
                            {(action.id === 'review' && claiming) ||
                            (action.id === 'escalate' && escalating) ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <ArrowRight className="size-3.5" />
                            )}
                            {action.id === 'review' && detail.status === 'submitted'
                              ? t('intake.actions.markReviewed')
                              : action.id === 'review'
                                ? t('intake.actions.review')
                                : action.id === 'documents'
                                  ? t('intake.actions.requestDocs')
                                  : action.id === 'escalate'
                                    ? t('intake.actions.raiseTo', {
                                        level: t(
                                          `intake.urgency.${nextUrgencyLevel(detail.urgencyLevel)}`,
                                          {
                                            defaultValue: nextUrgencyLevel(detail.urgencyLevel),
                                          },
                                        ),
                                      })
                                    : t('common.open')}
                          </button>
                        )}
                      </li>
                      );
                    })}
                  </ul>

                  {showDocRequest && (
                    <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3 space-y-3">
                      <p className="text-xs font-semibold text-teal-900">
                        {t('intake.detail.requestDocTitle')}
                      </p>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-stone-500">
                          {t('intake.detail.documentType')}
                        </span>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm bg-white"
                        >
                          {DOC_REQUEST_TYPE_VALUES.map((value) => (
                            <option key={value} value={value}>
                              {t(`intake.docTypes.${value}`)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-sm">
                        <span className="text-xs font-semibold text-stone-500">
                          {t('intake.detail.noteOptional')}
                        </span>
                        <textarea
                          value={docNote}
                          onChange={(e) => setDocNote(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm min-h-[64px] bg-white"
                          placeholder={t('intake.detail.notePlaceholder')}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={requestingDocs}
                          onClick={() => void handleRequestDocuments()}
                          className="rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {requestingDocs && <Loader2 className="size-3.5 animate-spin" />}
                          {t('intake.actions.sendRequest')}
                        </button>
                        <button
                          type="button"
                          disabled={requestingDocs}
                          onClick={() => setShowDocRequest(false)}
                          className="rounded-xl border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-white"
                        >
                          {t('intake.actions.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const familySummary = parseFamilyWizardSummary(
                  detail.wizardPayload as Record<string, unknown> | null | undefined,
                );
                if (!familySummary) return null;

                const rows: { label: string; value: string }[] = [
                  familySummary.accountType
                    ? {
                        label: t('intake.detail.fields.accountType'),
                        value: localizeAccountTypeLabel(familySummary.accountType),
                      }
                    : null,
                  familySummary.country
                    ? { label: t('intake.detail.fields.location'), value: familySummary.country }
                    : null,
                  familySummary.preferredLanguage
                    ? {
                        label: t('intake.detail.fields.preferredLanguage'),
                        value: localizeChip(familySummary.preferredLanguage),
                      }
                    : null,
                  familySummary.supportCategories.length
                    ? {
                        label: t('intake.detail.fields.supportNeeded'),
                        value: familySummary.supportCategories
                          .map((c) => localizeSummaryToken('support', c))
                          .join(', '),
                      }
                    : null,
                  familySummary.specificNeeds.length
                    ? {
                        label: t('intake.detail.fields.specificNeeds'),
                        value: familySummary.specificNeeds.map((n) => localizeChip(n)).join(' · '),
                      }
                    : null,
                  familySummary.practitionerGender
                    ? {
                        label: t('intake.detail.fields.providerGender'),
                        value: localizeSummaryToken('gender', familySummary.practitionerGender),
                      }
                    : null,
                  familySummary.providerLanguages.length
                    ? {
                        label: t('intake.detail.fields.providerLanguages'),
                        value: familySummary.providerLanguages
                          .map((l) => localizeChip(l))
                          .join(', '),
                      }
                    : null,
                  familySummary.careLocation
                    ? {
                        label: t('intake.detail.fields.careLocation'),
                        value: localizeSummaryToken('careLocation', familySummary.careLocation),
                      }
                    : null,
                  familySummary.address
                    ? { label: t('intake.detail.fields.address'), value: familySummary.address }
                    : null,
                  familySummary.scheduleType
                    ? {
                        label: t('intake.detail.fields.schedule'),
                        value: localizeSummaryToken('schedule', familySummary.scheduleType),
                      }
                    : null,
                  familySummary.preferredDays.length
                    ? {
                        label: t('intake.detail.fields.preferredDays'),
                        value: familySummary.preferredDays
                          .map((d) => localizeSummaryToken('day', d))
                          .join(', '),
                      }
                    : null,
                  familySummary.preferredTimeSlots.length
                    ? {
                        label: t('intake.detail.fields.preferredTimes'),
                        value: familySummary.preferredTimeSlots
                          .map((s) => localizeSummaryToken('time', s))
                          .join(', '),
                      }
                    : null,
                  familySummary.startTiming
                    ? {
                        label: t('intake.detail.fields.startTiming'),
                        value: familySummary.startTiming,
                      }
                    : null,
                  familySummary.ndisPlanType
                    ? {
                        label: t('intake.detail.fields.ndisPlan'),
                        value: familySummary.ndisPlanType,
                      }
                    : null,
                  familySummary.ndisNumber
                    ? {
                        label: t('intake.detail.fields.ndisNumber'),
                        value: familySummary.ndisNumber,
                      }
                    : null,
                  familySummary.planManagerEmail
                    ? {
                        label: t('intake.detail.fields.planManagerEmail'),
                        value: familySummary.planManagerEmail,
                      }
                    : null,
                ].filter(Boolean) as { label: string; value: string }[];

                return (
                  <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-xl bg-teal-100 flex items-center justify-center shrink-0">
                        <HeartHandshake className="size-5 text-teal-700" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-teal-900">
                          {t('intake.detail.familySummaryTitle')}
                        </p>
                        <p className="text-xs text-teal-800/80 mt-0.5">
                          {t('intake.detail.familySummaryHint')}
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {rows.map((row) => (
                        <div
                          key={row.label}
                          className="rounded-xl bg-white/90 border border-teal-100 px-3 py-2"
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80">
                            {row.label}
                          </p>
                          <p className="text-sm text-stone-800 mt-0.5 break-words">{row.value}</p>
                        </div>
                      ))}
                    </div>
                    {(detail.serviceInterests?.length ?? 0) > 0 && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700/80 mb-1.5">
                          {t('intake.detail.mappedServices')}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.serviceInterests!.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-white border border-teal-200 px-2.5 py-0.5 text-xs font-medium text-teal-900"
                            >
                              {t(`intake.services.${s}`, {
                                defaultValue: localizeChip(s),
                              })}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">
                    {t('intake.detail.reasonForCare')}
                  </p>
                  <p className="text-stone-800">
                    {localizeStoredNarrative(detail.reasonForCare)}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">
                    {t('intake.detail.diagnoses')}
                  </p>
                  <p className="text-stone-800">
                    {detail.diagnoses?.includes(PENDING_DIAGNOSIS)
                      ? t('intake.pendingClinicalReview')
                      : detail.diagnoses?.join(', ') || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">
                    {t('intake.detail.medicalHistory')}
                  </p>
                  <p className="text-stone-800">{detail.medicalHistory || '—'}</p>
                </div>
                <div className="rounded-xl bg-stone-50 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-1">
                    {t('intake.detail.medications')}
                  </p>
                  <p className="text-stone-800">{detail.currentMeds || '—'}</p>
                </div>
              </div>

              {(detail.documents?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-2">
                    {t('intake.detail.documents', { count: detail.documents!.length })}
                  </p>
                  <ul className="space-y-2">
                    {detail.documents!.map((doc) => (
                      <li
                        key={doc.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-stone-900 truncate">{doc.name}</p>
                          <p className="text-xs text-stone-500">
                            {t(`intake.docTypes.${doc.category || 'other'}`, {
                              defaultValue: (doc.category || 'other').replace(/_/g, ' '),
                            })}
                            {doc.size ? ` · ${Math.round(doc.size / 1024)} KB` : ''}
                          </p>
                        </div>
                        <a
                          href={intakeDocumentDownloadUrl(doc.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 hover:bg-teal-100"
                          onClick={async (e) => {
                            e.preventDefault();
                            try {
                              const res = await fetch(intakeDocumentDownloadUrl(doc.id), {
                                credentials: 'include',
                              });
                              if (!res.ok) {
                                const errBody = (await res.json().catch(() => null)) as {
                                  message?: string;
                                } | null;
                                toast.error(errBody?.message || t('intake.toasts.docOpenFailed'));
                                return;
                              }

                              const contentType = res.headers.get('content-type') || '';
                              const disposition = res.headers.get('content-disposition') || '';
                              const isFile =
                                disposition.includes('attachment') ||
                                contentType.includes('pdf') ||
                                contentType.includes('octet-stream') ||
                                contentType.includes('image/') ||
                                contentType.includes('msword') ||
                                contentType.includes('officedocument');

                              if (!isFile && contentType.includes('application/json')) {
                                const body = (await res.json()) as {
                                  data?: { url?: string };
                                };
                                if (body.data?.url) {
                                  window.open(body.data.url, '_blank', 'noopener,noreferrer');
                                  return;
                                }
                                toast.error(t('intake.toasts.docUrlMissing'));
                                return;
                              }

                              const blob = await res.blob();
                              const objectUrl = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = doc.name;
                              a.target = '_blank';
                              a.rel = 'noreferrer';
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(objectUrl);
                            } catch {
                              toast.error(t('intake.toasts.docOpenFailed'));
                            }
                          }}
                        >
                          {t('intake.actions.open')}
                        </a>
                      </li>
                    ))}
                  </ul>
                  {(detail.status === 'submitted' || detail.status === 'under_review') && (
                    <button
                      type="button"
                      onClick={() => setShowDocRequest(true)}
                      className="mt-3 text-xs font-semibold text-teal-700 hover:underline"
                    >
                      {t('intake.detail.requestAnotherDoc')}
                    </button>
                  )}
                </div>
              )}

              {(detail.documents?.length ?? 0) === 0 &&
                (detail.status === 'submitted' || detail.status === 'under_review') && (
                  <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-3">
                    <p className="text-sm font-medium text-stone-800">
                      {t('intake.detail.noDocuments')}
                    </p>
                    <p className="text-xs text-stone-500 mt-1">
                      {t('intake.detail.noDocumentsHint')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDocRequest(true)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                    >
                      {t('intake.detail.requestMissingDocs')}
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                )}

              {(detail.consents?.length ?? 0) > 0 && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <p className="text-xs font-semibold text-stone-500 mb-2">
                    {t('intake.detail.consents', { count: detail.consents!.length })}
                  </p>
                  <ul className="space-y-2">
                    {detail.consents!.map((c) => (
                      <li
                        key={`${c.consentType}-${c.grantedAt}`}
                        className="rounded-lg bg-stone-50 px-3 py-2 text-sm"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-stone-900">
                            {t(`intake.detail.consentTypes.${c.consentType}`, {
                              defaultValue: c.consentType.replace(/_/g, ' '),
                            })}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
                            {c.granted ? t('intake.detail.granted') : t('intake.detail.revoked')}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-stone-500">
                          {c.documentVersion ? `v${c.documentVersion}` : '—'}
                          {c.grantedAt
                            ? ` · ${new Date(c.grantedAt).toLocaleString(familyDateLocale())}`
                            : ''}
                          {c.ipAddress ? ` · IP ${c.ipAddress}` : ''}
                          {c.signatureStatus ? ` · ${c.signatureStatus}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {detail.status === 'submitted' && (
                <button
                  type="button"
                  disabled={claiming}
                  onClick={() => void handleStartReview()}
                  className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-100 disabled:opacity-50"
                >
                  {claiming ? t('intake.detail.updating') : t('intake.actions.startReview')}
                </button>
              )}

              {canReview ? (
                <div ref={reviewSectionRef} className="space-y-4 border-t border-stone-100 pt-5">
                  <h4 className="font-semibold text-stone-900">
                    {t('intake.detail.structuredReview')}
                  </h4>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">
                      {t('intake.detail.keyConcerns')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {CONCERN_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c}
                          label={localizeChip(c)}
                          selected={keyConcerns.includes(c)}
                          onToggle={() => toggle(keyConcerns, c, setKeyConcerns)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">
                      {t('intake.detail.urgencyIndicators')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {URGENCY_INDICATOR_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c}
                          label={localizeChip(c)}
                          selected={urgencyIndicators.includes(c)}
                          onToggle={() => toggle(urgencyIndicators, c, setUrgencyIndicators)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">
                      {t('intake.detail.suggestedServices')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_VALUES.map((value) => (
                        <ChipToggle
                          key={value}
                          label={t(`intake.services.${value}`)}
                          selected={suggestedServices.includes(value)}
                          onToggle={() => toggle(suggestedServices, value, setSuggestedServices)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-stone-500 mb-2">
                      {t('intake.detail.riskFlags')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {RISK_FLAG_OPTIONS.map((c) => (
                        <ChipToggle
                          key={c}
                          label={localizeChip(c)}
                          selected={riskFlags.includes(c)}
                          onToggle={() => toggle(riskFlags, c, setRiskFlags)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-stone-500 mb-1.5 block">
                      {t('intake.detail.notes')}
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm min-h-[72px]"
                      placeholder={t('intake.detail.notesPlaceholder')}
                    />
                  </div>

                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={createEpisode}
                      onChange={(e) => setCreateEpisode(e.target.checked)}
                    />
                    {t('intake.detail.createEpisodeOnValidate')}
                  </label>

                  {createEpisode && (
                    <input
                      value={episodeTitle}
                      onChange={(e) => setEpisodeTitle(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm"
                      placeholder={t('intake.episodeTitlePlaceholder')}
                    />
                  )}

                  <button
                    type="button"
                    disabled={reviewing}
                    onClick={() => void handleReview()}
                    className="w-full sm:w-auto rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {reviewing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> {t('common.submit')}…
                      </>
                    ) : (
                      t('intake.actions.validate')
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
                  {(detail.status === 'episode_created' || detail.status === 'validated') &&
                    detail.careEpisode?.id && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {t('intake.detail.linkedEpisode')}
                      </p>
                      <p className="mt-1 font-medium text-stone-900">
                        {localizeGeneratedLabel(
                          detail.careEpisode?.title || t('intake.careEpisode'),
                        )}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                        {detail.careEpisode?.status && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800">
                            {t(`episodes.status.${detail.careEpisode.status}`, {
                              defaultValue: detail.careEpisode.status.replace(/_/g, ' '),
                            })}
                          </span>
                        )}
                        <span className="font-mono text-stone-400">
                          {detail.careEpisode.id.slice(0, 8)}…
                        </span>
                      </div>
                      <Link
                        to={`/coordinator/episodes/${detail.careEpisode.id}`}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        {t('intake.actions.scheduleConsultation')}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </div>
                  )}

                  {detail.reviewSummary && (
                    <ReviewSummaryView summary={detail.reviewSummary} />
                  )}

                  {!['episode_created', 'validated'].includes(detail.status) && (
                    <p className="text-stone-600">{t('intake.detail.notOpen')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ReviewSummary = {
  notes?: string | null;
  riskFlags?: string[];
  keyConcerns?: string[];
  urgencyIndicators?: string[];
  suggestedServiceCategories?: string[];
};

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

function ReviewSummaryView({ summary }: { summary: Record<string, unknown> | ReviewSummary }) {
  const { t } = useTranslation('coordinator');
  const data = summary as ReviewSummary;
  const keyConcerns = asStringList(data.keyConcerns);
  const urgencyIndicators = asStringList(data.urgencyIndicators);
  const services = asStringList(data.suggestedServiceCategories);
  const riskFlags = asStringList(data.riskFlags);
  const notes = typeof data.notes === 'string' && data.notes.trim() ? data.notes.trim() : null;

  const sections: { label: string; values: string[]; tone: string }[] = [
    {
      label: t('intake.detail.keyConcerns').replace(/\s*\*$/, ''),
      values: keyConcerns,
      tone: 'bg-teal-50 text-teal-800',
    },
    {
      label: t('intake.detail.urgencyIndicators').replace(/\s*\*$/, ''),
      values: urgencyIndicators,
      tone: 'bg-amber-50 text-amber-900',
    },
    {
      label: t('intake.detail.suggestedServices').replace(/\s*\*$/, ''),
      values: services,
      tone: 'bg-sky-50 text-sky-900',
    },
    {
      label: t('intake.detail.riskFlags'),
      values: riskFlags,
      tone: 'bg-rose-50 text-rose-800',
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        {t('intake.detail.reviewSummary')}
      </p>
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 text-xs font-semibold text-stone-500">{section.label}</p>
          {section.values.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {section.values.map((value) => (
                <span
                  key={`${section.label}-${value}`}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${section.tone}`}
                >
                  {t(`intake.services.${value}`, { defaultValue: localizeChip(value) })}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400">—</p>
          )}
        </div>
      ))}
      {notes && (
        <div>
          <p className="mb-1 text-xs font-semibold text-stone-500">{t('intake.detail.notes')}</p>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}
