/** Port of mern/client/src/lib/familyJourneyMilestones.ts — keep in sync with web. */

import type { CareEpisode } from './api/care';

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

export function buildFamilyJourneyMilestones(episode: CareEpisode): FamilyMilestone[] {
  const rank = episodeProgressRank(episode.status ?? '');
  const sessions = episode.sessions ?? [];
  const sessionBooked = sessions.some((s) => s.status !== 'cancelled');
  const sessionCompleted = sessions.some((s) => s.status === 'completed');

  const raw: Omit<FamilyMilestone, 'current'>[] = [
    {
      id: 'received',
      label: 'Request received',
      description: 'Your care request is with our team.',
      done: true,
    },
    {
      id: 'reviewing',
      label: 'Care team reviewing',
      description: 'A coordinator is reviewing your request.',
      done: rank >= 1,
    },
    {
      id: 'started',
      label: 'Care journey started',
      description: 'Your care journey is underway.',
      done: rank >= 2,
    },
    {
      id: 'booked',
      label: 'Session booked',
      description: 'A care session has been scheduled.',
      done: sessionBooked,
    },
    {
      id: 'completed',
      label: 'Session completed',
      description: 'Your clinician has finished a care session.',
      done: sessionCompleted,
    },
    {
      id: 'careplan',
      label: 'Care plan ready',
      description: 'Coming in a later release.',
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
