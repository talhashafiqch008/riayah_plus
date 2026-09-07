import { DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  assertPhiS3UploadConfigured,
  createPhiS3Client,
  putPhiObject,
} from '../utils/phiS3';
import {
  RETENTION_DAYS,
  retentionExpiresAtFromNow,
} from '../utils/retentionPolicy';
import {
  assertAllowedVoiceMime,
  sanitizeUploadFilename,
  VOICE_RECORDING_MAX_BYTES,
} from '../utils/uploadAllowlist';

export type VoiceRecordingActor = {
  userId: string;
  role: string;
  organizationId?: string | null;
};

function extensionForMime(mime: string): string {
  const base = mime.toLowerCase().split(';')[0]!.trim();
  if (base === 'audio/webm') return 'webm';
  if (base === 'audio/ogg') return 'ogg';
  if (base === 'audio/mp4') return 'm4a';
  if (base === 'audio/mpeg') return 'mp3';
  if (base === 'audio/wav' || base === 'audio/x-wav') return 'wav';
  return 'webm';
}

function serialize(row: {
  id: string;
  userId: string;
  organizationId: string | null;
  title: string | null;
  notes: string | null;
  mimeType: string;
  sizeBytes: number;
  durationSeconds: number | null;
  sessionId: string | null;
  meetingId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    userId: row.userId,
    organizationId: row.organizationId,
    title: row.title,
    notes: row.notes,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    sessionId: row.sessionId,
    meetingId: row.meetingId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class VoiceRecordingService {
  static async list(actor: VoiceRecordingActor) {
    const rows = await prisma.voiceRecording.findMany({
      where: { userId: actor.userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(serialize);
  }

  static async create(
    actor: VoiceRecordingActor,
    input: {
      file: Express.Multer.File;
      title?: string | null;
      notes?: string | null;
      durationSeconds?: number | null;
      sessionId?: string | null;
      meetingId?: string | null;
    },
  ) {
    if (!input.file) throw new AppError('Audio file is required.', 400);
    if (input.file.size > VOICE_RECORDING_MAX_BYTES) {
      throw new AppError('Voice recording exceeds the 25 MB limit.', 400);
    }
    try {
      assertAllowedVoiceMime(input.file.mimetype);
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : 'Unsupported audio type.', 400);
    }

    assertPhiS3UploadConfigured('Voice recording storage');

    const safeName = sanitizeUploadFilename(input.file.originalname || 'voice-note');
    const ext = extensionForMime(input.file.mimetype);
    const key = `voice-recordings/${actor.userId}/${Date.now()}-${randomUUID()}.${ext}`;

    await putPhiObject('voice_recording', {
      key,
      body: input.file.buffer,
      contentType: input.file.mimetype.split(';')[0]!.trim(),
      contentDisposition: `inline; filename="${safeName}"`,
    });

    const row = await prisma.voiceRecording.create({
      data: {
        userId: actor.userId,
        organizationId: actor.organizationId ?? null,
        title: input.title?.trim() || null,
        notes: input.notes?.trim() || null,
        s3Key: key,
        mimeType: input.file.mimetype.split(';')[0]!.trim(),
        sizeBytes: input.file.size,
        durationSeconds:
          typeof input.durationSeconds === 'number' && Number.isFinite(input.durationSeconds)
            ? Math.max(0, Math.round(input.durationSeconds))
            : null,
        sessionId: input.sessionId?.trim() || null,
        meetingId: input.meetingId?.trim() || null,
        retentionExpiresAt: retentionExpiresAtFromNow(RETENTION_DAYS.voiceRecording),
      },
    });

    return serialize(row);
  }

  static async getPlaybackUrl(id: string, actor: VoiceRecordingActor) {
    const row = await prisma.voiceRecording.findFirst({
      where: { id, userId: actor.userId, deletedAt: null },
    });
    if (!row) throw new AppError('Voice recording not found.', 404);
    if (!env.AWS_BUCKET) throw new AppError('Storage is not configured.', 503);

    const s3 = createPhiS3Client();
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: row.s3Key }),
      { expiresIn: 300 },
    );
    return { url, expiresIn: 300, recording: serialize(row) };
  }

  static async softDelete(id: string, actor: VoiceRecordingActor) {
    const row = await prisma.voiceRecording.findFirst({
      where: { id, userId: actor.userId, deletedAt: null },
    });
    if (!row) throw new AppError('Voice recording not found.', 404);

    await prisma.voiceRecording.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });

    // Best-effort S3 delete — soft-delete still succeeds if object removal fails.
    try {
      if (env.AWS_BUCKET) {
        const s3 = createPhiS3Client();
        await s3.send(new DeleteObjectCommand({ Bucket: env.AWS_BUCKET, Key: row.s3Key }));
      }
    } catch {
      /* ignore */
    }

    return { success: true };
  }
}
