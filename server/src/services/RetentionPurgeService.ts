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
  const rows = await prisma.session.findMany({
    where: {
      completedAt: { lt: cutoff },
      OR: [{ recordingUrl: { not: null } }, { recordingTranscript: { not: null } }],
    },
    select: { id: true, recordingUrl: true },
    take: 200,
  });

  const { s3KeyFromRecordingUrl } = await import('./TelehealthRecordingService');
  const { deleteS3ObjectBestEffort } = await import('../utils/s3Delete');
  for (const row of rows) {
    const key = row.recordingUrl ? s3KeyFromRecordingUrl(row.recordingUrl) : null;
    await deleteS3ObjectBestEffort(key, { purpose: 'session_recording_retention', sessionId: row.id });
  }

  const result = await prisma.session.updateMany({
    where: { id: { in: rows.map((r) => r.id) } },
    data: {
      recordingUrl: null,
      recordingTranscript: null,
      recordingTranscriptSha256: null,
      recordingStatus: null,
      recordingEgressId: null,
    },
  });
  return result.count;
}

export async function purgeExpiredVoiceRecordings(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.voiceRecording);
  const rows = await prisma.voiceRecording.findMany({
    where: {
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        { deletedAt: { not: null, lt: cutoff } },
        { retentionExpiresAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true, s3Key: true },
    take: 200,
  });
  const { deleteS3ObjectBestEffort } = await import('../utils/s3Delete');
  for (const row of rows) {
    await deleteS3ObjectBestEffort(row.s3Key, {
      purpose: 'voice_recording_retention',
      voiceRecordingId: row.id,
    });
  }
  const result = await prisma.voiceRecording.deleteMany({
    where: { id: { in: rows.map((r) => r.id) } },
  });
  return result.count;
}

/** TM-022: purge GPS location logs past retention (90 days). */
export async function purgeExpiredGpsLogs(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.gpsLog);
  const result = await prisma.gpsLog.deleteMany({
    where: {
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        { retentionExpiresAt: null, createdAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}

/** TM-023: purge notifications past retention (1 year). */
export async function purgeExpiredNotifications(): Promise<number> {
  const cutoff = retentionCutoff(RETENTION_DAYS.notification);
  const result = await prisma.notification.deleteMany({
    where: {
      OR: [
        { retentionExpiresAt: { lt: new Date() } },
        { retentionExpiresAt: null, createdAt: { lt: cutoff } },
      ],
    },
  });
  return result.count;
}

export async function runRetentionPurgeBatch(): Promise<void> {
  const [
    messages,
    meetings,
    userSessions,
    documents,
    recordings,
    voiceRecordings,
    gpsLogs,
    notifications,
  ] = await Promise.all([
    purgeExpiredMessages(),
    purgeExpiredMeetings(),
    purgeExpiredUserSessions(),
    purgeExpiredDocuments(),
    purgeExpiredSessionRecordings(),
    purgeExpiredVoiceRecordings(),
    purgeExpiredGpsLogs(),
    purgeExpiredNotifications(),
  ]);

  const total =
    messages +
    meetings +
    userSessions +
    documents +
    recordings +
    voiceRecordings +
    gpsLogs +
    notifications;
  if (total > 0) {
    logger.info('Retention purge batch completed', {
      messages,
      meetings,
      userSessions,
      documents,
      recordings,
      voiceRecordings,
      gpsLogs,
      notifications,
    });
  }
}
