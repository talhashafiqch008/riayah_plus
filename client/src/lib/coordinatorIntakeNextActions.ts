import type { IntakeRecord, UrgencyLevel } from '@/lib/api/intake';

export type CoordinatorNextActionId =
  | 'review'
  | 'documents'
  | 'schedule'
  | 'escalate';

export type CoordinatorNextAction = {
  id: CoordinatorNextActionId;
  primary?: boolean;
  /** Documents action: whether the intake has zero files yet */
  noDocumentsYet?: boolean;
  /** Escalate action: current urgency slug for description interpolation */
  currentUrgency?: UrgencyLevel;
};

export type QueueHintId =
  | 'review'
  | 'completeReview'
  | 'schedule'
  | 'createEpisode'
  | 'docs'
  | 'escalate';

const URGENCY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function queueHintIdForIntake(
  row: Pick<IntakeRecord, 'status' | 'careEpisode'>,
): QueueHintId | '' {
  switch (row.status) {
    case 'submitted':
      return 'review';
    case 'under_review':
      return 'completeReview';
    case 'validated':
      return row.careEpisode ? 'schedule' : 'createEpisode';
    case 'episode_created':
      return 'schedule';
    default:
      return '';
  }
}

/** @deprecated Use queueHintIdForIntake + i18n */
export function queueHintForIntake(row: Pick<IntakeRecord, 'status' | 'careEpisode'>): string {
  const id = queueHintIdForIntake(row);
  const fallback: Record<string, string> = {
    review: 'Review',
    completeReview: 'Complete review',
    schedule: 'Schedule',
    createEpisode: 'Create episode',
  };
  return id ? fallback[id] ?? '' : '';
}

/** Derive clear next actions for the selected intake (R6). Labels come from i18n. */
export function buildCoordinatorNextActions(intake: IntakeRecord): CoordinatorNextAction[] {
  const actions: CoordinatorNextAction[] = [];
  const open = intake.status === 'submitted' || intake.status === 'under_review';
  const docCount = intake.documents?.length ?? 0;
  const urgency = (intake.urgencyLevel || 'medium') as UrgencyLevel;
  const urgencyRank = URGENCY_RANK[urgency] ?? 2;
  const episodeId = intake.careEpisode?.id;

  if (intake.status === 'submitted' || intake.status === 'under_review') {
    actions.push({
      id: 'review',
      primary: true,
    });
  }

  if (open) {
    actions.push({
      id: 'documents',
      primary: false,
      noDocumentsYet: docCount === 0,
    });
  }

  if (episodeId && (intake.status === 'validated' || intake.status === 'episode_created')) {
    actions.push({
      id: 'schedule',
      primary: true,
    });
  }

  if (open && urgencyRank < 4) {
    actions.push({
      id: 'escalate',
      primary: false,
      currentUrgency: urgency,
    });
  }

  return actions;
}

export function nextUrgencyLevel(current?: UrgencyLevel | null): UrgencyLevel {
  switch (current) {
    case 'low':
      return 'medium';
    case 'medium':
      return 'high';
    case 'high':
      return 'urgent';
    case 'urgent':
      return 'urgent';
    default:
      return 'high';
  }
}
