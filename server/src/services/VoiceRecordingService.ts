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
import { isFamilyRole } from '../utils/careAccess';

export type VoiceRecordingActor = {
  userId: string;
  role: string;
  organizationId?: string | null;
};

export type VoiceRecordingPatientOption = {
  /** Stable select key: careRecipientId ?? patientId */
  id: string;
  patientId: string;
  careRecipientId: string | null;
  episodeId: string;
  name: string;
  episodeTitle: string;
};

const ASSIGNED_EPISODE_STATUSES = ['validated', 'active'] as const;
const CLINICAL_ROLES = new Set([
  'clinical_staff',
  'doctor',
  'nurse',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'therapist',
  'caregiver',
  'support_worker',
]);

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
  patientId: string | null;
  careRecipientId: string | null;
  episodeId: string | null;
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
  patient?: { id: string; name: string } | null;
  careRecipient?: { id: string; name: string } | null;
}) {
  return {
    id: row.id,
    userId: row.userId,
    patientId: row.patientId,
    careRecipientId: row.careRecipientId,
    episodeId: row.episodeId,
    organizationId: row.organizationId,
    title: row.title,
    notes: row.notes,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    durationSeconds: row.durationSeconds,
    sessionId: row.sessionId,
    meetingId: row.meetingId,
    patientName: row.careRecipient?.name ?? row.patient?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class VoiceRecordingService {
  /** Patients the actor is assigned to via active/validated care episodes (option B). */
  static async listEligiblePatients(
    actor: VoiceRecordingActor,
  ): Promise<VoiceRecordingPatientOption[]> {
    if (isFamilyRole(actor.role)) {
      throw new AppError('Forbidden.', 403);
    }

    const byKey = new Map<string, VoiceRecordingPatientOption>();

    const pushEpisode = (ep: {
      id: string;
      title: string;
      patientId: string;
      careRecipientId: string | null;
      patient?: { name: string } | null;
      careRecipient?: { name: string } | null;
    }) => {
      const careRecipientId = ep.careRecipientId;
      const patientId = ep.patientId;
      const key = careRecipientId ?? patientId;
      if (byKey.has(key)) return;
      byKey.set(key, {
        id: key,
        patientId,
        careRecipientId,
        episodeId: ep.id,
        name: ep.careRecipient?.name?.trim() || ep.patient?.name?.trim() || 'Patient',
        episodeTitle: ep.title,
      });
    };

    if (actor.role === 'care_coordinator' || actor.role === 'org_admin') {
      const episodes = await prisma.careEpisode.findMany({
        where: {
          coordinatorId: actor.userId,
          status: { in: [...ASSIGNED_EPISODE_STATUSES] },
          ...(actor.organizationId ? { organizationId: actor.organizationId } : {}),
        },
        select: {
          id: true,
          title: true,
          patientId: true,
          careRecipientId: true,
          patient: { select: { name: true } },
          careRecipient: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
      episodes.forEach(pushEpisode);
    } else if (CLINICAL_ROLES.has(actor.role) || actor.role === 'admin' || actor.role === 'super_admin') {
      const sessions = await prisma.session.findMany({
        where: {
          providerId: actor.userId,
          episode: {
            status: { in: [...ASSIGNED_EPISODE_STATUSES] },
            ...(actor.organizationId ? { organizationId: actor.organizationId } : {}),
          },
        },
        select: {
          episode: {
            select: {
              id: true,
              title: true,
              patientId: true,
              careRecipientId: true,
              patient: { select: { name: true } },
              careRecipient: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 200,
      });
      for (const s of sessions) {
        if (s.episode) pushEpisode(s.episode);
      }
    }

    return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  static async assertPatientAccess(
    actor: VoiceRecordingActor,
    patientId: string,
    careRecipientId?: string | null,
    episodeId?: string | null,
  ): Promise<VoiceRecordingPatientOption> {
    const eligible = await this.listEligiblePatients(actor);
    const match = eligible.find((p) => {
      if (careRecipientId) return p.careRecipientId === careRecipientId && p.patientId === patientId;
      if (episodeId) return p.episodeId === episodeId && p.patientId === patientId;
      return p.patientId === patientId;
    });
    if (!match) {
      throw new AppError(
        'Select a patient you are assigned to before recording.',
        422,
      );
    }
    return match;
  }

  static async list(actor: VoiceRecordingActor) {
    const rows = await prisma.voiceRecording.findMany({
      where: { userId: actor.userId, deletedAt: null },
      include: {
        patient: { select: { id: true, name: true } },
        careRecipient: { select: { id: true, name: true } },
      },
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
      patientId: string;
      careRecipientId?: string | null;
      episodeId?: string | null;
    },
  ) {
    if (isFamilyRole(actor.role)) {
      throw new AppError('Voice recording is not available for family accounts.', 403);
    }
    if (!input.patientId?.trim()) {
      throw new AppError('Please choose a patient before recording.', 422);
    }

    const patient = await this.assertPatientAccess(
      actor,
      input.patientId.trim(),
      input.careRecipientId?.trim() || null,
      input.episodeId?.trim() || null,
    );

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
        patientId: patient.patientId,
        careRecipientId: patient.careRecipientId,
        episodeId: patient.episodeId,
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
      include: {
        patient: { select: { id: true, name: true } },
        careRecipient: { select: { id: true, name: true } },
      },
    });

    return serialize(row);
  }

  static async getPlaybackUrl(id: string, actor: VoiceRecordingActor) {
    const row = await prisma.voiceRecording.findFirst({
      where: { id, userId: actor.userId, deletedAt: null },
      include: {
        patient: { select: { id: true, name: true } },
        careRecipient: { select: { id: true, name: true } },
      },
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
