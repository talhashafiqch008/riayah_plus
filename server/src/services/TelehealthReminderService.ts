import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { EmailService } from './EmailService';
import { NotificationService } from './NotificationService';
import {
  reminderRecipientIds,
  reminderWindow,
  shouldRemindMeeting,
  shouldRemindSession,
} from './telehealthReminderWindow';

const REMINDER_TYPE = 'telehealth_reminder';
const TITLE = 'Telehealth session in 30 minutes';
const BODY = 'Your video session starts in about 30 minutes. Open the app to join.';

async function alreadyReminded(opts: {
  userId: string;
  sessionId?: string;
  meetingId?: string;
}): Promise<boolean> {
  const path = opts.sessionId ? 'sessionId' : 'meetingId';
  const value = opts.sessionId ?? opts.meetingId;
  if (!value) return false;
  const existing = await prisma.notification.findFirst({
    where: {
      userId: opts.userId,
      type: REMINDER_TYPE,
      data: { path: [path], equals: value },
    },
    select: { id: true },
  });
  return Boolean(existing);
}

async function remindUser(opts: {
  userId: string;
  sessionId?: string;
  meetingId?: string;
}): Promise<boolean> {
  if (await alreadyReminded(opts)) return false;

  try {
    await NotificationService.create({
      userId: opts.userId,
      title: TITLE,
      body: BODY,
      type: REMINDER_TYPE,
      data: {
        ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
        ...(opts.meetingId ? { meetingId: opts.meetingId } : {}),
      },
    });
  } catch (err) {
    logger.warn('Telehealth reminder in-app failed', { userId: opts.userId, err });
    return false;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: opts.userId },
      select: { email: true, name: true },
    });
    if (user?.email) {
      const joinUrl = `${env.FRONTEND_URL}/family/telehealth`;
      await EmailService.send({
        to: user.email,
        subject: TITLE,
        html: `<p>Hello ${user.name ?? ''},</p><p>${BODY}</p><p><a href="${joinUrl}">Open Riayah Plus</a></p>`,
        text: BODY,
      });
    }
  } catch (err) {
    logger.warn('Telehealth reminder email failed', { userId: opts.userId, err });
  }

  return true;
}

export class TelehealthReminderService {
  static async sendDueReminders(now = new Date()): Promise<{
    sessions: number;
    meetings: number;
    notified: number;
  }> {
    const { from, to } = reminderWindow(now);
    let notified = 0;

    const sessions = await prisma.session.findMany({
      where: {
        type: 'telehealth',
        status: 'accepted',
        scheduledAt: { gte: from, lte: to },
      },
      select: { id: true, clientId: true, providerId: true, type: true, status: true, scheduledAt: true },
    });

    for (const session of sessions) {
      if (!shouldRemindSession(session, now)) continue;
      for (const userId of reminderRecipientIds([session.clientId, session.providerId])) {
        if (await remindUser({ userId, sessionId: session.id })) notified += 1;
      }
    }

    const meetings = await prisma.meeting.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { gte: from, lte: to },
      },
      select: { id: true, hostId: true, participantId: true, status: true, scheduledAt: true },
    });

    for (const meeting of meetings) {
      if (!shouldRemindMeeting(meeting, now)) continue;
      for (const userId of reminderRecipientIds([meeting.hostId, meeting.participantId])) {
        if (await remindUser({ userId, meetingId: meeting.id })) notified += 1;
      }
    }

    return { sessions: sessions.length, meetings: meetings.length, notified };
  }
}
