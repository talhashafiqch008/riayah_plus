import { reminderWindow, shouldRemindMeeting, shouldRemindSession } from '../../services/telehealthReminderWindow';

const now = new Date('2026-08-13T12:00:00.000Z');

describe('reminderWindow', () => {
  it('centers 30 minutes ahead with a ±5 minute band', () => {
    const { from, to } = reminderWindow(now);
    expect(from.toISOString()).toBe('2026-08-13T12:25:00.000Z');
    expect(to.toISOString()).toBe('2026-08-13T12:35:00.000Z');
  });
});

describe('shouldRemindSession', () => {
  it('reminds accepted telehealth in the window', () => {
    expect(
      shouldRemindSession(
        { type: 'telehealth', status: 'accepted', scheduledAt: new Date('2026-08-13T12:30:00.000Z') },
        now,
      ),
    ).toBe(true);
  });

  it('skips in-person, cancelled, and sessions too far out', () => {
    const at = new Date('2026-08-13T12:30:00.000Z');
    expect(shouldRemindSession({ type: 'in_person', status: 'accepted', scheduledAt: at }, now)).toBe(false);
    expect(shouldRemindSession({ type: 'telehealth', status: 'cancelled', scheduledAt: at }, now)).toBe(false);
    expect(
      shouldRemindSession(
        { type: 'telehealth', status: 'accepted', scheduledAt: new Date('2026-08-13T14:00:00.000Z') },
        now,
      ),
    ).toBe(false);
  });
});

describe('shouldRemindMeeting', () => {
  it('reminds scheduled meetings in the window only', () => {
    const at = new Date('2026-08-13T12:30:00.000Z');
    expect(shouldRemindMeeting({ status: 'scheduled', scheduledAt: at }, now)).toBe(true);
    expect(shouldRemindMeeting({ status: 'cancelled', scheduledAt: at }, now)).toBe(false);
  });
});
