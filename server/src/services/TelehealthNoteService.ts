import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { canCreate } from '../middleware/permissions';
import { AuditService } from './AuditService';
import { canJoinMeeting, canJoinSessionRoom, type TelehealthActor } from './LiveKitAccess';

export type TelehealthNoteInput = {
  content: string;
  noteType?: string;
  isPrivate?: boolean;
};

export function canWriteTelehealthNote(actor: TelehealthActor): boolean {
  if (!Object.values(UserRole).includes(actor.role as UserRole)) return false;
  return canCreate(actor.role as UserRole, 'clinical_note');
}

export class TelehealthNoteService {
  static async addForSession(sessionId: string, actor: TelehealthActor, input: TelehealthNoteInput) {
    if (!canWriteTelehealthNote(actor)) throw new AppError('Forbidden.', 403);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canJoinSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);

    return this.createNote({
      actor,
      content: input.content,
      noteType: input.noteType,
      isPrivate: input.isPrivate,
      sessionId: session.id,
      episodeId: session.episodeId,
      meetingId: null,
    });
  }

  static async addForMeeting(meetingId: string, actor: TelehealthActor, input: TelehealthNoteInput) {
    if (!canWriteTelehealthNote(actor)) throw new AppError('Forbidden.', 403);

    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (!canJoinMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);

    return this.createNote({
      actor,
      content: input.content,
      noteType: input.noteType,
      isPrivate: input.isPrivate,
      sessionId: null,
      episodeId: meeting.episodeId,
      meetingId: meeting.id,
    });
  }

  private static async createNote(params: {
    actor: TelehealthActor;
    content: string;
    noteType?: string;
    isPrivate?: boolean;
    sessionId: string | null;
    episodeId: string | null;
    meetingId: string | null;
  }) {
    const note = await prisma.clinicalNote.create({
      data: {
        content: params.content,
        noteType: params.noteType ?? 'session_note',
        isPrivate: params.isPrivate ?? false,
        authorId: params.actor.userId,
        sessionId: params.sessionId ?? undefined,
        episodeId: params.episodeId ?? undefined,
      },
      include: { author: { select: { id: true, name: true, role: true } } },
    });

    await AuditService.log({
      userId: params.actor.userId,
      action: 'clinical_note_created',
      entity: 'ClinicalNote',
      entityId: note.id,
      after: {
        episodeId: note.episodeId,
        sessionId: note.sessionId,
        meetingId: params.meetingId,
        noteType: note.noteType,
        isPrivate: note.isPrivate,
        source: 'telehealth',
      },
    });

    return note;
  }
}
