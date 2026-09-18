import type { CareEpisode } from '@/lib/api/episodes';
import i18n from '@/i18n/config';

export type FamilyMilestone = {
  id: string;
  label: string;
  description?: string;
  done: boolean;
  current: boolean;
  locked?: boolean;
};

function episodeProgressRank(status: string): number {
  switch (status) {
    case 'intake_submitted':
      return 0;
    case 'under_review':
      return 1;
    case 'validated':
    case 'active':
    case 'on_hold':
      return 2;
    case 'closed':
      return 3;
    default:
      return 0;
  }
}

function milestoneCopy(id: string, fallbackLabel: string, fallbackDescription: string) {
  const label = i18n.t(`milestones.items.${id}.label`, {
    ns: 'family',
    defaultValue: fallbackLabel,
  });
  const description = i18n.t(`milestones.items.${id}.description`, {
    ns: 'family',
    defaultValue: fallbackDescription,
  });
  return { label, description };
}

/** Family-facing care journey milestones (R5). */
export function buildFamilyJourneyMilestones(episode: CareEpisode): FamilyMilestone[] {
  const rank = episodeProgressRank(episode.status);
  const sessions = episode.sessions ?? [];
  const sessionBooked = sessions.some((s) => s.status !== 'cancelled');
  const sessionCompleted = sessions.some((s) => s.status === 'completed');

  const raw: Omit<FamilyMilestone, 'current'>[] = [
    {
      id: 'received',
      ...milestoneCopy('received', 'Request received', 'Your care request is with our team.'),
      done: true,
    },
    {
      id: 'reviewing',
      ...milestoneCopy(
        'reviewing',
        'Care team reviewing',
        'A coordinator is reviewing your request.',
      ),
      done: rank >= 1,
    },
    {
      id: 'started',
      ...milestoneCopy('started', 'Care journey started', 'Your care journey is underway.'),
      done: rank >= 2,
    },
    {
      id: 'booked',
      ...milestoneCopy('booked', 'Session booked', 'A care session has been scheduled.'),
      done: sessionBooked,
    },
    {
      id: 'completed',
      ...milestoneCopy(
        'completed',
        'Session completed',
        'Your clinician has finished a care session.',
      ),
      done: sessionCompleted,
    },
    {
      id: 'careplan',
      ...milestoneCopy('careplan', 'Care plan ready', 'Coming in a later release.'),
      done: false,
      locked: true,
    },
  ];

  const firstOpen = raw.findIndex((m) => !m.done && !m.locked);

  return raw.map((m, i) => ({
    ...m,
    current: !m.locked && (firstOpen === -1 ? m.done && i === raw.length - 2 : i === firstOpen),
  }));
}
