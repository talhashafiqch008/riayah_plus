import '../helpers/prismaMock';
import { prismaMock } from '../helpers/prismaMock';

jest.mock('../../services/NotificationService', () => ({
  NotificationService: { create: jest.fn() },
}));
jest.mock('../../services/EmailService', () => ({
  EmailService: { send: jest.fn() },
}));

import { TelehealthReminderService } from '../../services/TelehealthReminderService';
import { NotificationService } from '../../services/NotificationService';

const now = new Date('2026-08-13T12:00:00.000Z');
const inWindow = new Date('2026-08-13T12:30:00.000Z');

describe('TelehealthReminderService.sendDueReminders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.session.findMany.mockResolvedValue([]);
    prismaMock.meeting.findMany.mockResolvedValue([]);
    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue({ email: 'fam@demo.com', name: 'Fam' } as never);
  });

  it('notifies family and clinician once for a due session', async () => {
    prismaMock.session.findMany.mockResolvedValue([
      {
        id: 'sess-1',
        clientId: 'fam',
        providerId: 'clin',
        type: 'telehealth',
        status: 'accepted',
        scheduledAt: inWindow,
      },
    ] as never);

    const result = await TelehealthReminderService.sendDueReminders(now);

    expect(result).toEqual({ sessions: 1, meetings: 0, notified: 2 });
    expect(NotificationService.create).toHaveBeenCalledTimes(2);
    expect(NotificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'fam',
        type: 'telehealth_reminder',
        data: { sessionId: 'sess-1' },
      }),
    );
  });

  it('skips a user who already received the reminder', async () => {
    prismaMock.session.findMany.mockResolvedValue([
      {
        id: 'sess-1',
        clientId: 'fam',
        providerId: 'clin',
        type: 'telehealth',
        status: 'accepted',
        scheduledAt: inWindow,
      },
    ] as never);
    prismaMock.notification.findFirst.mockResolvedValue({ id: 'n1' } as never);

    const result = await TelehealthReminderService.sendDueReminders(now);
    expect(result.notified).toBe(0);
    expect(NotificationService.create).not.toHaveBeenCalled();
  });
});
