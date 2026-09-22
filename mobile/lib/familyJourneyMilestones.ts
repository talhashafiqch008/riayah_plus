/** Port of mern/client/src/lib/familyJourneyMilestones.ts — keep in sync with web. */

import type { CareEpisode } from './api/care';
import i18n from '../i18n/config';

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

function milestoneCopy(id: string, enLabel: string, enDesc: string) {
  const label = i18n.t(`milestones.items.${id}.label`, {
    ns: 'family',
    defaultValue: enLabel,
  });
  const description = i18n.t(`milestones.items.${id}.description`, {
    ns: 'family',
    defaultValue: enDesc,
  });
  return { label, description };
}

export function buildFamilyJourneyMilestones(episode: CareEpisode): FamilyMilestone[] {
  const rank = episodeProgressRank(episode.status ?? '');
  const sessions = episode.sessions ?? [];
  const sessionBooked = sessions.some((s) => s.status !== 'cancelled');
  const sessionCompleted = sessions.some((s) => s.status === 'completed');

  const received = milestoneCopy(
    'received',
    'Request received',
    'Your care request is with our team.',
  );
  const reviewing = milestoneCopy(
    'reviewing',
    'Care team reviewing',
    'A coordinator is reviewing your request.',
  );
  const started = milestoneCopy(
    'started',
    'Care journey started',
    'Your care journey is underway.',
  );
  const booked = milestoneCopy(
    'booked',
    'Session booked',
    'A care session has been scheduled.',
  );
  const completed = milestoneCopy(
    'completed',
    'Session completed',
    'Your clinician has finished a care session.',
  );
  const careplan = milestoneCopy(
    'careplan',
    'Care plan ready',
    'Coming in a later release.',
  );

  const raw: Omit<FamilyMilestone, 'current'>[] = [
    { id: 'received', ...received, done: true },
    { id: 'reviewing', ...reviewing, done: rank >= 1 },
    { id: 'started', ...started, done: rank >= 2 },
    { id: 'booked', ...booked, done: sessionBooked },
    { id: 'completed', ...completed, done: sessionCompleted },
    { id: 'careplan', ...careplan, done: false, locked: true },
  ];

  const firstOpen = raw.findIndex((m) => !m.done && !m.locked);

  return raw.map((m, i) => ({
    ...m,
    current: firstOpen === i,
  }));
}
