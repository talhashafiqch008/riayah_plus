import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { isApiError } from '@/lib/errors';
import {
  allowedEpisodeTransitions,
  EPISODE_STATUS_STEPS,
  getEpisode,
  updateEpisodeStatus,
  type CareEpisode,
} from '@/lib/api/episodes';
import {
  listClinicians,
  scheduleAssessment,
  type ClinicianOption,
} from '@/lib/api/assessments';
import {
  formatFamilyDateTime,
  familyEpisodeStatusLabel,
  familySessionStatusLabel,
  familyStaffRoleLabel,
} from '@/lib/familyLanguage';
import {
  localizeChip,
  localizeGeneratedLabel,
  localizeStoredNarrative,
} from '@/lib/localizeStoredEnglish';
import { buildFamilyJourneyMilestones } from '@/lib/familyJourneyMilestones';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import StaffPersonCard from '@/components/care/StaffPersonCard';
import type { PublicStaffCard } from '@/lib/api/staffProfile';

type Props = {
  basePath: string;
  /** Coordinator can advance episode status. */
  canTransition?: boolean;
  /** Family can book care sessions (open slots) on this episode. */
  canSchedule?: boolean;
};

/** Step 4 only reflects coordinator active / on hold. */
const LIFECYCLE_STATUS_STATUSES = new Set(['active', 'on_hold']);

function statusBadgeClass(status: string) {
  switch (status) {
    case 'intake_submitted':
      return 'bg-amber-50 text-amber-800';
    case 'under_review':
      return 'bg-blue-50 text-blue-800';
    case 'validated':
      return 'bg-teal-50 text-teal-800';
    case 'active':
      return 'bg-emerald-50 text-emerald-800';
    case 'on_hold':
      return 'bg-orange-50 text-orange-800';
    case 'closed':
      return 'bg-stone-100 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-700';
  }
}

/** Filled circle colors aligned with status badges. */
function statusStepCircleClass(status: string) {
  switch (status) {
    case 'intake_submitted':
      return 'bg-amber-500 text-white';
    case 'under_review':
      return 'bg-blue-500 text-white';
    case 'validated':
      return 'bg-teal-600 text-white';
    case 'active':
      return 'bg-emerald-600 text-white';
    case 'on_hold':
      return 'bg-orange-500 text-white';
    case 'closed':
      return 'bg-stone-500 text-white';
    default:
      return 'bg-stone-400 text-white';
  }
}

function statusStepTextClass(status: string) {
  switch (status) {
    case 'intake_submitted':
      return 'text-amber-800';
    case 'under_review':
      return 'text-blue-800';
    case 'validated':
      return 'text-teal-800';
    case 'active':
      return 'text-emerald-800';
    case 'on_hold':
      return 'text-orange-800';
    case 'closed':
      return 'text-stone-600';
    default:
      return 'text-stone-700';
  }
}

function statusStepDoneCircleClass(status: string) {
  switch (status) {
    case 'intake_submitted':
      return 'bg-amber-100 text-amber-800';
    case 'under_review':
      return 'bg-blue-100 text-blue-800';
    case 'validated':
      return 'bg-teal-100 text-teal-800';
    case 'active':
      return 'bg-emerald-100 text-emerald-800';
    case 'on_hold':
      return 'bg-orange-100 text-orange-800';
    case 'closed':
      return 'bg-stone-200 text-stone-600';
    default:
      return 'bg-stone-100 text-stone-500';
  }
}

function statusConnectorClass(status: string) {
  switch (status) {
    case 'intake_submitted':
      return 'bg-amber-300';
    case 'under_review':
      return 'bg-blue-300';
    case 'validated':
      return 'bg-teal-300';
    case 'active':
      return 'bg-emerald-300';
    case 'on_hold':
      return 'bg-orange-300';
    case 'closed':
      return 'bg-stone-300';
    default:
      return 'bg-stone-200';
  }
}

function formatLabel(status: string) {
  return status.replace(/_/g, ' ');
}

function displayEpisodeStatus(
  status: string,
  familyFacing: boolean,
  t?: (key: string, opts?: Record<string, string>) => string,
  staffLocalized?: boolean,
) {
  if (familyFacing) return familyEpisodeStatusLabel(status);
  if (staffLocalized && t) {
    return t(`episodes.status.${status}`, { defaultValue: formatLabel(status) });
  }
  return formatLabel(status);
}

function stepIndex(status: string) {
  const idx = EPISODE_STATUS_STEPS.indexOf(status as (typeof EPISODE_STATUS_STEPS)[number]);
  if (idx >= 0) return idx;
  // active / on_hold sit on step 4; closed is past the status step
  if (LIFECYCLE_STATUS_STATUSES.has(status) || status === 'closed') {
    return EPISODE_STATUS_STEPS.length - 1;
  }
  return 0;
}

/** Step 4 only shows active or on hold (coordinator status). */
function stepFourLabel(
  status: string,
  familyFacing: boolean,
  t?: (key: string, opts?: Record<string, string>) => string,
  staffLocalized?: boolean,
) {
  if (LIFECYCLE_STATUS_STATUSES.has(status)) {
    return displayEpisodeStatus(status, familyFacing, t, staffLocalized);
  }
  return staffLocalized && t ? t('episodeDetail.status') : 'Status';
}

export default function EpisodeDetailPage({
  basePath,
  canTransition = false,
  canSchedule = false,
}: Props) {
  const { episodeId = '' } = useParams();
  const [episode, setEpisode] = useState<CareEpisode | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const [clinicians, setClinicians] = useState<ClinicianOption[]>([]);
  const [assessorId, setAssessorId] = useState('');
  const [assessmentType, setAssessmentType] = useState('initial');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const showAssessmentScheduleForm = canTransition;
  const familyFacing = canSchedule && !canTransition;
  const isCoordinator = basePath.startsWith('/coordinator');
  const isClinical = basePath.startsWith('/clinical');
  const staffLocalized = isCoordinator || isClinical;
  const localized = familyFacing || staffLocalized;
  const { t } = useTranslation(
    familyFacing ? 'family' : isCoordinator ? 'coordinator' : isClinical ? 'clinical' : 'family',
  );

  const load = useCallback(async () => {
    if (!episodeId) return;
    setLoading(true);
    try {
      const data = await getEpisode(episodeId);
      setEpisode(data);
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(localized ? t('episodeDetail.loadError') : 'Failed to load episode');
    } finally {
      setLoading(false);
    }
  }, [episodeId, localized, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showAssessmentScheduleForm) return;
    void listClinicians()
      .then((list) => {
        setClinicians(list);
        if (list[0]) setAssessorId(list[0].id);
      })
      .catch(() => undefined);
  }, [showAssessmentScheduleForm]);

  const nextStatuses = useMemo(
    () => (episode ? allowedEpisodeTransitions(episode.status) : []),
    [episode],
  );

  const handleTransition = async (next: string) => {
    if (!episode) return;
    setUpdating(next);
    try {
      const updated = await updateEpisodeStatus(episode.id, next);
      setEpisode((prev) => (prev ? { ...prev, ...updated } : updated));
      toast.success(
        staffLocalized
          ? t('episodeDetail.statusUpdatedToast', { status: displayEpisodeStatus(next, false, t, true) })
          : `Status → ${formatLabel(next)}`,
      );
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(staffLocalized ? t('episodeDetail.statusUpdateFailed') : 'Status update failed');
    } finally {
      setUpdating(null);
    }
  };

  const handleSchedule = async () => {
    if (!episode || !assessorId || !scheduledAt) {
      toast.error(isCoordinator ? t('episodeDetail.pickClinician') : 'Pick clinician and date/time');
      return;
    }
    setScheduling(true);
    try {
      await scheduleAssessment({
        episodeId: episode.id,
        assessorId,
        type: assessmentType,
        scheduledAt: new Date(scheduledAt).toISOString(),
      });
      toast.success(
        isCoordinator ? t('episodeDetail.assessmentScheduled') : 'Assessment scheduled',
      );
      setScheduledAt('');
      await load();
    } catch (error: unknown) {
      if (isApiError(error)) toast.error(error.message);
      else toast.error(isCoordinator ? t('episodeDetail.scheduleFailed') : 'Schedule failed');
    } finally {
      setScheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!episode) {
    return (
      <p className="text-stone-500">
        {localized ? t('episodeDetail.notFound') : 'Episode not found.'}
      </p>
    );
  }

  const currentStep = stepIndex(episode.status);
  const intakeSummary = episode.intakeSummary as Record<string, unknown> | null | undefined;
  const familyMilestones = familyFacing ? buildFamilyJourneyMilestones(episode) : [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Breadcrumb
          items={[
            { label: familyFacing ? t('episodeDetail.breadcrumb') : staffLocalized ? t(isClinical ? 'episodeDetail.breadcrumb' : 'nav.episodes') : 'Episodes', href: basePath },
            { label: staffLocalized ? localizeGeneratedLabel(episode.title) : episode.title },
          ]}
        />
        <Link
          to={basePath}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          <ArrowLeft className="size-4" />{' '}
          {localized ? t('episodeDetail.back') : 'Back to episodes'}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-stone-900">
              {staffLocalized ? localizeGeneratedLabel(episode.title) : episode.title}
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              {staffLocalized
                ? localizeGeneratedLabel(
                    episode.careRecipient?.name || episode.patient?.name || t('episodeDetail.patient'),
                  )
                : episode.careRecipient?.name || episode.patient?.name || 'Patient'}
              {!familyFacing && episode.coordinator?.name
                ? staffLocalized
                  ? ` · ${t('episodeDetail.coord', { name: episode.coordinator.name })}`
                  : ` · Coord. ${episode.coordinator.name}`
                : ''}
            </p>
            {isClinical && (
              <Link
                to={`/clinical/episodes/${episode.id}/notes`}
                className="mt-2 inline-flex text-sm font-semibold text-teal-700 hover:underline"
              >
                {t('episodeDetail.openSessionNotes')}
              </Link>
            )}
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(episode.status)}`}
          >
            {displayEpisodeStatus(episode.status, familyFacing, t, staffLocalized)}
          </span>
        </div>
      </div>

      {/* Family milestones (R5) or staff lifecycle stepper */}
      {familyFacing ? (
        <div className="rounded-2xl border bg-white shadow-sm p-5">
          <h3 className="text-sm font-semibold text-stone-900 mb-1">{t('episodeDetail.milestones')}</h3>
          <p className="text-sm text-stone-500 mb-4">{t('milestones.hint')}</p>
          <ol className="space-y-3">
            {familyMilestones.map((m, i) => (
              <li key={m.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    m.locked
                      ? 'bg-stone-100 text-stone-400 border border-dashed border-stone-300'
                      : m.current
                        ? 'bg-teal-600 text-white'
                        : m.done
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-stone-100 text-stone-400'
                  }`}
                >
                  {m.locked ? '·' : i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p
                    className={`text-sm font-medium ${
                      m.locked
                        ? 'text-stone-400'
                        : m.current
                          ? 'text-teal-800'
                          : m.done
                            ? 'text-stone-900'
                            : 'text-stone-400'
                    }`}
                  >
                    {m.label}
                    {m.locked && (
                      <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        {t('milestones.comingSoon')}
                      </span>
                    )}
                    {m.current && !m.locked && (
                      <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                        {t('milestones.now')}
                      </span>
                    )}
                  </p>
                  {m.description && (
                    <p className={`mt-0.5 text-xs ${m.locked ? 'text-stone-400' : 'text-stone-500'}`}>
                      {m.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : (
      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-stone-900 mb-4">{staffLocalized ? t('episodeDetail.lifecycle') : 'Lifecycle'}</h3>
        <ol className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
          {EPISODE_STATUS_STEPS.map((step, i) => {
            const isLastStep = i === EPISODE_STATUS_STEPS.length - 1;
            const isCurrent = isLastStep
              ? LIFECYCLE_STATUS_STATUSES.has(episode.status)
              : step === episode.status;
            const done = isLastStep
              ? LIFECYCLE_STATUS_STATUSES.has(episode.status) || episode.status === 'closed'
              : i < currentStep || step === episode.status;
            const colorKey = isLastStep
              ? LIFECYCLE_STATUS_STATUSES.has(episode.status)
                ? episode.status
                : 'pending'
              : step;
            const label = isLastStep
              ? stepFourLabel(episode.status, false, t, staffLocalized)
              : staffLocalized
                ? displayEpisodeStatus(step, false, t, true)
                : formatLabel(step);

            return (
              <li key={step} className="flex sm:flex-1 items-center gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isCurrent
                        ? statusStepCircleClass(colorKey)
                        : done
                          ? statusStepDoneCircleClass(colorKey)
                          : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`text-xs font-medium truncate ${
                      isCurrent
                        ? statusStepTextClass(colorKey)
                        : done
                          ? 'text-stone-700'
                          : 'text-stone-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < EPISODE_STATUS_STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block flex-1 h-0.5 mx-2 ${
                      i < currentStep
                        ? statusConnectorClass(
                            EPISODE_STATUS_STEPS[Math.min(i + 1, currentStep)] ?? step,
                          )
                        : 'bg-stone-200'
                    }`}
                  />
                )}
              </li>
            );
          })}
        </ol>

        {canTransition && nextStatuses.length > 0 && (
          <div className="mt-5 pt-4 border-t">
            <p className="text-xs font-semibold text-stone-500 mb-2">{isCoordinator ? t('episodeDetail.advanceStatus') : 'Advance status'}</p>
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((next) => (
                <button
                  key={next}
                  type="button"
                  disabled={updating !== null}
                  onClick={() => void handleTransition(next)}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {updating === next && <Loader2 className="size-3 animate-spin" />}
                  →{' '}
                  {staffLocalized
                    ? displayEpisodeStatus(next, false, t, true)
                    : formatLabel(next)}
                </button>
              ))}
            </div>
          </div>
        )}

        {canTransition && nextStatuses.length === 0 && (
          <p className="mt-4 text-sm text-stone-500">
            {staffLocalized
              ? t('episodeDetail.noStatusTransitions')
              : 'No further status transitions available.'}
          </p>
        )}

        {canTransition && (
          <div className="mt-5 pt-4 border-t">
            <p className="text-xs font-semibold text-stone-500 mb-1">{isCoordinator ? t('episodeDetail.assignedCoordinator') : 'Assigned coordinator'}</p>
            <p className="text-sm text-stone-800">
              {episode.coordinator?.name ??
                (staffLocalized ? t('episodeDetail.unassigned') : 'Unassigned')}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Care / clinical summary */}
      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-stone-900 mb-3">
          {localized ? t(familyFacing ? 'episodeDetail.careSummary' : 'episodeDetail.clinicalSummary') : 'Clinical summary'}
        </h3>
        <dl className="grid gap-3 sm:grid-cols-2 text-sm">
          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold text-stone-500">
              {localized ? t('episodeDetail.reasonForCare') : 'Reason for care'}
            </dt>
            <dd className="mt-0.5 text-stone-900">
              {episode.reasonForCare
                ? staffLocalized
                  ? localizeStoredNarrative(episode.reasonForCare)
                  : episode.reasonForCare
                : '—'}
            </dd>
          </div>
          {!familyFacing && (
            <div>
              <dt className="text-xs font-semibold text-stone-500">{staffLocalized ? t('episodeDetail.urgency') : 'Urgency'}</dt>
              <dd className="mt-0.5 text-stone-900">
                {episode.urgencyLevel
                  ? staffLocalized
                    ? t(
                        isCoordinator
                          ? `intake.urgency.${episode.urgencyLevel}`
                          : `urgency.${episode.urgencyLevel}`,
                        { defaultValue: episode.urgencyLevel },
                      )
                    : episode.urgencyLevel
                  : '—'}
              </dd>
            </div>
          )}
          {!familyFacing && (
            <div>
              <dt className="text-xs font-semibold text-stone-500">{staffLocalized ? t('episodeDetail.diagnoses') : 'Diagnoses'}</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1.5">
                {(episode.diagnoses ?? []).length > 0 ? (
                  episode.diagnoses!.map((d) => (
                    <span
                      key={d}
                      className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900"
                    >
                      {staffLocalized &&
                      (d === 'PENDING_CLINICAL_REVIEW' || d === 'PENDING_DIAGNOSIS')
                        ? t(isCoordinator ? 'intake.pendingClinicalReview' : 'pendingClinicalReview')
                        : d}
                    </span>
                  ))
                ) : (
                  <span className="text-stone-400">—</span>
                )}
              </dd>
            </div>
          )}
          {!familyFacing && (
            <>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500">{staffLocalized ? t('episodeDetail.medicalHistory') : 'Medical history'}</dt>
                <dd className="mt-0.5 text-stone-900 whitespace-pre-wrap">
                  {episode.medicalHistory || '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold text-stone-500">{staffLocalized ? t('episodeDetail.currentMeds') : 'Current medications'}</dt>
                <dd className="mt-0.5 text-stone-900 whitespace-pre-wrap">
                  {episode.currentMeds || '—'}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border bg-white shadow-sm p-5">
        <h3 className="text-sm font-semibold text-stone-900 mb-1">
          {localized ? t('episodeDetail.timeline') : 'Timeline'}
        </h3>
        {familyFacing && (
          <p className="text-xs text-stone-500 mb-3">{t('episodeDetail.timelineHint')}</p>
        )}
        {!familyFacing && <div className="mb-3" />}
        <ol className="relative border-l border-stone-200 ml-3 space-y-4">
          <li className="ml-4">
            <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-amber-400" />
            <p className="text-sm font-medium text-stone-900">
              {localized ? t(familyFacing ? 'episodeDetail.requestReceived' : 'episodeDetail.intakeCreated') : 'Intake / episode created'}
            </p>
            <p className="text-xs text-stone-500">
              {episode.createdAt
                ? familyFacing || staffLocalized
                  ? formatFamilyDateTime(episode.createdAt)
                  : new Date(episode.createdAt).toLocaleString()
                : '—'}
            </p>
          </li>
          {episode.intakeReviewedAt && (
            <li className="ml-4">
              <span className="absolute -left-1.5 mt-1.5 size-3 rounded-full bg-teal-500" />
              <p className="text-sm font-medium text-stone-900">
                {localized ? t(familyFacing ? 'episodeDetail.teamReviewed' : 'episodeDetail.intakeReviewed') : 'Intake reviewed'}
              </p>
              <p className="text-xs text-stone-500">
                {familyFacing || staffLocalized
                  ? formatFamilyDateTime(episode.intakeReviewedAt)
                  : new Date(episode.intakeReviewedAt).toLocaleString()}
              </p>
              {!familyFacing && intakeSummary && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(['keyConcerns', 'urgencyIndicators', 'suggestedServiceCategories', 'riskFlags'] as const).flatMap(
                    (key) => {
                      const values = intakeSummary[key];
                      if (!Array.isArray(values)) return [];
                      return values
                        .filter((v): v is string => typeof v === 'string')
                        .map((v) => (
                          <span
                            key={`${key}-${v}`}
                            className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-700"
                          >
                            {staffLocalized ? localizeChip(v) : v.replace(/_/g, ' ')}
                          </span>
                        ));
                    },
                  )}
                </div>
              )}
            </li>
          )}
          <li className="ml-4">
            <span
              className={`absolute -left-1.5 mt-1.5 size-3 rounded-full ${
                ['validated', 'active'].includes(episode.status)
                  ? 'bg-emerald-500'
                  : 'bg-stone-300'
              }`}
            />
            <p className="text-sm font-medium text-stone-900">
              {familyFacing || staffLocalized
                ? t('episodeDetail.current', {
                    status: displayEpisodeStatus(episode.status, familyFacing, t, staffLocalized),
                  })
                : `Current: ${displayEpisodeStatus(episode.status, familyFacing)}`}
            </p>
            <p className="text-xs text-stone-500">
              {episode.updatedAt
                ? familyFacing || staffLocalized
                  ? formatFamilyDateTime(episode.updatedAt)
                  : new Date(episode.updatedAt).toLocaleString()
                : '—'}
            </p>
          </li>
          <li className="ml-4">
            <span
              className={`absolute -left-1.5 mt-1.5 size-3 rounded-full ${
                (episode.sessions?.length ?? 0) > 0 ? 'bg-sky-500' : 'bg-stone-200'
              }`}
            />
            <p className="text-sm font-medium text-stone-900">
              {localized ? t(familyFacing ? 'episodeDetail.careSessions' : 'episodeDetail.assessments') : 'Assessments'}
            </p>
            <p className="text-xs text-stone-500">
              {familyFacing
                ? (episode.sessions?.length ?? 0) > 0
                  ? t('episodeDetail.sessionsBooked', { count: episode.sessions!.length })
                  : t('episodeDetail.noSessions')
                : (episode.assessments?.length ?? 0) > 0
                  ? staffLocalized
                    ? t('episodeDetail.linkedCount', { count: episode.assessments!.length })
                    : `${episode.assessments!.length} linked`
                  : staffLocalized
                    ? t('episodeDetail.noneScheduled')
                    : 'None scheduled yet'}
            </p>
          </li>
        </ol>
      </div>

      {/* Assessments — coordinator / clinical only */}
      {!familyFacing ? (
      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="text-sm font-semibold text-stone-900">{staffLocalized ? t('episodeDetail.assessments') : 'Assessments'}</h3>

        {(episode.assessments?.length ?? 0) === 0 ? (
          <p className="text-sm text-stone-500">{staffLocalized ? t('episodeDetail.noAssessments') : 'No assessments linked to this episode yet.'}</p>
        ) : (
          <ul className="space-y-3">
            {episode.assessments!.map((a) => (
              <li
                key={a.id}
                className="rounded-xl bg-stone-50 px-3 py-3 text-sm space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-stone-900 capitalize">
                    {staffLocalized && a.type
                      ? t(`assessmentTypes.${a.type}`, { defaultValue: a.type })
                      : a.type || 'assessment'}
                    {a.scheduledAt
                      ? ` · ${
                          staffLocalized
                            ? formatFamilyDateTime(a.scheduledAt)
                            : new Date(a.scheduledAt).toLocaleString()
                        }`
                      : ''}
                  </span>
                  <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900">
                    {staffLocalized
                      ? t(`schedule.status.${a.status || 'scheduled'}`, {
                          defaultValue: (a.status || 'scheduled').replace(/_/g, ' '),
                        })
                      : (a.status || 'scheduled').replace(/_/g, ' ')}
                  </span>
                </div>
                {a.assessor ? (
                  <StaffPersonCard
                    staff={a.assessor as PublicStaffCard}
                    variant="clinician"
                    localize={familyFacing || staffLocalized}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {showAssessmentScheduleForm && episode.status !== 'closed' && (
          <div className="pt-3 border-t space-y-3">
            <p className="text-xs font-semibold text-stone-500">{isCoordinator ? t('episodeDetail.scheduleAssessment') : 'Schedule assessment'}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-xs font-semibold text-stone-500">
                  {isCoordinator ? t('episodeDetail.clinician') : 'Clinician'}
                </span>
                <select
                  value={assessorId}
                  onChange={(e) => setAssessorId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                >
                  {clinicians.length === 0 && (
                    <option value="">
                      {isCoordinator ? t('episodeDetail.noClinicians') : 'No clinicians found'}
                    </option>
                  )}
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.languages?.length ? ` · ${c.languages.slice(0, 2).join(', ')}` : ''}
                      {c.role
                        ? ` (${
                            isCoordinator || familyFacing
                              ? familyStaffRoleLabel(c.role)
                              : c.role.replace(/_/g, ' ')
                          })`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="text-xs font-semibold text-stone-500">
                  {isCoordinator ? t('episodeDetail.type') : 'Type'}
                </span>
                <select
                  value={assessmentType}
                  onChange={(e) => setAssessmentType(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                >
                  <option value="initial">
                    {isCoordinator ? t('assessmentTypes.initial') : 'Initial'}
                  </option>
                  <option value="follow_up">
                    {isCoordinator ? t('assessmentTypes.follow_up') : 'Follow-up'}
                  </option>
                  <option value="discharge">
                    {isCoordinator ? t('assessmentTypes.discharge') : 'Discharge'}
                  </option>
                </select>
              </label>
              <label className="sm:col-span-2 text-sm">
                <span className="text-xs font-semibold text-stone-500">
                  {isCoordinator ? t('episodeDetail.dateTime') : 'Date & time'}
                </span>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2"
                />
              </label>
            </div>
            {assessorId && clinicians.find((c) => c.id === assessorId) ? (
              <StaffPersonCard
                staff={clinicians.find((c) => c.id === assessorId)!}
                variant="clinician"
                localize={familyFacing || staffLocalized}
              />
            ) : null}
            <button
              type="button"
              disabled={scheduling || !assessorId || !scheduledAt}
              onClick={() => void handleSchedule()}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {scheduling && <Loader2 className="size-4 animate-spin" />}
              {isCoordinator ? t('episodeDetail.scheduleAssessment') : 'Schedule assessment'}
            </button>
          </div>
        )}
      </div>
      ) : null}

      {/* Sessions */}
      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-stone-900">
            {localized ? t(familyFacing ? 'episodeDetail.careSessions' : 'episodeDetail.sessions') : 'Sessions'}
          </h3>
          {familyFacing && episode.status !== 'closed' ? (
            <Link
              to={`/family/bookings/book?episodeId=${episode.id}`}
              className="rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              {t('episodeDetail.bookSession')}
            </Link>
          ) : null}
        </div>
        {familyFacing && (
          <p className="text-xs text-stone-500">{t('episodeDetail.sessionsHint')}</p>
        )}
        {(episode.sessions?.length ?? 0) === 0 ? (
          <p className="text-sm text-stone-500">
            {localized
              ? t('episodeDetail.noSessions')
              : 'No care sessions scheduled for this episode yet.'}
          </p>
        ) : (
          <ul className="space-y-3">
            {episode.sessions!.map((s) => (
              <li key={s.id} className="rounded-xl bg-stone-50 px-3 py-3 text-sm space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-stone-900">
                    {s.scheduledAt
                      ? familyFacing || staffLocalized
                        ? formatFamilyDateTime(s.scheduledAt)
                        : new Date(s.scheduledAt).toLocaleString()
                      : 'Session'}
                    {s.durationMinutes && familyFacing
                      ? ` · ${t('common.min', { count: s.durationMinutes })}`
                      : s.durationMinutes
                        ? ` · ${s.durationMinutes} min`
                        : ''}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900 capitalize">
                    {familyFacing
                      ? familySessionStatusLabel(s.status || 'pending')
                      : (s.status || 'scheduled').replace(/_/g, ' ')}
                  </span>
                </div>
                {s.provider ? (
                  <StaffPersonCard
                    staff={s.provider as PublicStaffCard}
                    variant="support"
                    localize={familyFacing || staffLocalized}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
