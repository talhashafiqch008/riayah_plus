import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { RETENTION_DAYS, retentionCutoff } from '../utils/retentionPolicy';

export async function purgeExpiredMessages(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.message);
  const result = await prisma.message.deleteMany({
    where: {
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        { retentionExpiresAt: null, createdAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}

export async function purgeExpiredMeetings(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.meeting);
  const result = await prisma.meeting.deleteMany({
    where: {
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        { retentionExpiresAt: null, scheduledAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}

export async function purgeExpiredUserSessions(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.userSession);
  const result = await prisma.userSession.deleteMany({
    where: {
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        {
          retentionExpiresAt: null,
          OR: [{ revokedAt: { lt: cutoff } }, { lastActiveAt: { lt: cutoff } }],
        },
      ],
    },
  });
  return result.count;
}

export async function purgeExpiredDocuments(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.document);
  const result = await prisma.document.deleteMany({
    where: {
      deletedAt: { not: null },
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        { retentionExpiresAt: null, deletedAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}

/** Clear telehealth recording artifacts after retention window (metadata row kept for billing). */
export async function purgeExpiredSessionRecordings(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.sessionRecording);
  const result = await prisma.session.updateMany({
    where: {
      completedAt: { lt: cutoff },
      OR: [{ recordingUrl: { not: null } }, { recordingTranscript: { not: null } }],
    },
    data: {
      recordingUrl: null,
      recordingTranscript: null,
      recordingStatus: null,
      recordingEgressId: null,
    },
  });
  return result.count;
}

export async function runRetentionPurgeBatch(): Promise<void> {
  const [messages, meetings, userSessions, documents, recordings] = await Promise.all([
    purgeExpiredMessages(),
    purgeExpiredMeetings(),
    purgeExpiredUserSessions(),
    purgeExpiredDocuments(),
    purgeExpiredSessionRecordings(),
  ]);

  const total = messages + meetings + userSessions + documents + recordings;
  if (total > 0) {
    logger.info('Retention purge batch completed', {
      messages,
      meetings,
      userSessions,
      documents,
      recordings,
    });
  }
}
