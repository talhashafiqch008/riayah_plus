/** ~30 minutes before start, with a ±5 minute window so a missed cron tick still fires. */
export const TELEHEALTH_REMINDER_LEAD_MS = 30 * 60 * 1000;
export const TELEHEALTH_REMINDER_WINDOW_MS = 10 * 60 * 1000;

export function reminderWindow(now: Date): { from: Date; to: Date } {
  const center = now.getTime() + TELEHEALTH_REMINDER_LEAD_MS;
  const half = TELEHEALTH_REMINDER_WINDOW_MS / 2;
  return { from: new Date(center - half), to: new Date(center + half) };
}

export function isInReminderWindow(scheduledAt: Date, now: Date): boolean {
  const { from, to } = reminderWindow(now);
  return scheduledAt >= from && scheduledAt <= to;
}

export function shouldRemindSession(session: {
  type: string;
  status: string;
  scheduledAt: Date;
}, now: Date): boolean {
  if (session.type !== 'telehealth') return false;
  if (session.status !== 'accepted') return false;
  return isInReminderWindow(session.scheduledAt, now);
}

export function shouldRemindMeeting(meeting: {
  status: string;
  scheduledAt: Date;
}, now: Date): boolean {
  if (meeting.status !== 'scheduled') return false;
  return isInReminderWindow(meeting.scheduledAt, now);
}

export function reminderRecipientIds(ids: Array<string | null | undefined>): string[] {
  return [...new Set(ids.filter((id): id is string => Boolean(id)))];
}
