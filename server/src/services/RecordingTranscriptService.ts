import type { Request } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { AuditService } from './AuditService';
import { canStartRecording, canViewRecording } from './TelehealthRecordingService';
import { type TelehealthActor } from './LiveKitAccess';
import {
  decryptRecordingTranscript,
  encryptRecordingTranscript,
} from '../utils/recordingTranscriptCrypto';
import { logTelehealthPurposeOfUse } from '../utils/telehealthPurposeLog';

export class RecordingTranscriptService {
  /** Persist spoken PHI transcript — always encrypted before writing to PostgreSQL (HP3). */
  static async saveForSession(
    sessionId: string,
    plaintext: string,
    actor: TelehealthActor,
    req?: Request,
  ): Promise<void> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canStartRecording('session', session, actor)) throw new AppError('Forbidden.', 403);

    const ciphertext = encryptRecordingTranscript(plaintext);
    await prisma.session.update({
      where: { id: sessionId },
      data: { recordingTranscript: ciphertext },
    });

    await AuditService.log({
      userId: actor.userId,
      action: 'recording_transcript_saved',
      entity: 'Session',
      entityId: sessionId,
      metadata: { plaintextChars: plaintext.length },
      req,
    });
  }

  static async readForSession(
    sessionId: string,
    actor: TelehealthActor,
    req?: Request,
  ): Promise<string | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canViewRecording('session', session, actor)) throw new AppError('Forbidden.', 403);
    if (!session.recordingTranscript) return null;

    const plaintext = decryptRecordingTranscript(session.recordingTranscript);

    await logTelehealthPurposeOfUse({
      userId: actor.userId,
      role: actor.role,
      purpose: 'transcript_view',
      entity: 'Session',
      entityId: sessionId,
      req,
    });

    return plaintext;
  }
}
