import type { IntakeRecord, UrgencyLevel } from './api/care';

export type CoordinatorNextActionId = 'review' | 'documents' | 'schedule' | 'escalate';

export type CoordinatorNextAction = {
  id: CoordinatorNextActionId;
  label: string;
  description: string;
  primary?: boolean;
  queueHint: string;
};

const URGENCY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export function queueHintForIntake(
  row: Pick<IntakeRecord, 'status' | 'careEpisode'> | { status?: string; careEpisode?: { id: string } | null },
): string {
  switch (row.status) {
    case 'submitted':
      return 'Review';
    case 'under_review':
      return 'Complete review';
    case 'validated':
      return row.careEpisode ? 'Schedule' : 'Create episode';
    case 'episode_created':
      return 'Schedule';
    default:
      return '';
  }
}

/** Derive clear next actions for the selected intake (R6). */
export function buildCoordinatorNextActions(intake: IntakeRecord): CoordinatorNextAction[] {
  const actions: CoordinatorNextAction[] = [];
  const open = intake.status === 'submitted' || intake.status === 'under_review';
  const docCount = intake.documents?.length ?? 0;
  const urgency = (intake.urgencyLevel || 'medium') as UrgencyLevel;
  const urgencyRank = URGENCY_RANK[urgency] ?? 2;
  const episodeId = intake.careEpisode?.id;

  if (intake.status === 'submitted') {
    actions.push({
      id: 'review',
      label: 'Review new request',
      description: 'Mark under review and complete the structured clinical fields.',
      primary: true,
      queueHint: 'Review',
    });
  } else if (intake.status === 'under_review') {
    actions.push({
      id: 'review',
      label: 'Complete structured review',
      description: 'Fill guided chips and validate to open a care episode.',
      primary: true,
      queueHint: 'Complete review',
    });
  }

  if (open) {
    actions.push({
      id: 'documents',
      label: docCount === 0 ? 'Request missing documents' : 'Request additional documents',
      description:
        docCount === 0
          ? 'No files attached yet — ask the family to upload what you need.'
          : 'Ask the family for another document type if something is missing.',
      primary: false,
      queueHint: 'Docs',
    });
  }

  if (episodeId && (intake.status === 'validated' || intake.status === 'episode_created')) {
    actions.push({
      id: 'schedule',
      label: 'Schedule consultation',
      description: 'Open the care episode to book a clinician consultation.',
      primary: true,
      queueHint: 'Schedule',
    });
  }

  if (open && urgencyRank < 4) {
    actions.push({
      id: 'escalate',
      label: 'Escalate urgency',
      description:
        urgencyRank < 3
          ? `Current urgency is ${urgency}. Raise it so this request sorts higher in the queue.`
          : 'Raise to urgent if clinical risk requires immediate coordination.',
      primary: false,
      queueHint: 'Escalate',
    });
  }

  return actions;
}

export function nextUrgencyLevel(current?: UrgencyLevel | string | null): UrgencyLevel {
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
