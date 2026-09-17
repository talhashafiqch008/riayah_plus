import { Request, Response } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';
import { AuditService } from '../../services/AuditService';
import { sanitizedString } from '../../utils/sanitize';
import { canCreate, canView } from '../../middleware/permissions';

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'support_admin'];

const createNoteSchema = z
  .object({
    content: sanitizedString(z.string().min(1).max(20000)),
    episodeId: z.string().min(1).optional(),
    sessionId: z.string().min(1).optional(),
    noteType: z.string().min(1).max(64).optional().default('session_note'),
    isPrivate: z.boolean().optional().default(false),
  })
  .refine((d) => Boolean(d.episodeId || d.sessionId), {
    message: 'Either episodeId or sessionId is required.',
  });

function canSeePrivateNote(
  role: UserRole,
  viewerId: string,
  note: { authorId: string; isPrivate: boolean },
): boolean {
  if (!note.isPrivate) return true;
  if (note.authorId === viewerId) return true;
  if (ADMIN_ROLES.includes(role)) return true;
  // Clinical staff in-tenant may see private notes for care continuity
  return role === 'clinical_staff' || [
    'doctor', 'nurse', 'physiotherapist', 'occupational_therapist',
    'speech_therapist', 'psychologist', 'dietitian', 'therapist',
  ].includes(role);
}

/**
 * AUTHZ-03: Clinicians may only read notes for episodes they are assigned to
 * (coordinator, session provider, or assessor) — or notes they authored.
 * Platform admins retain org-wide access.
 */
async function assertCareRelationship(
  req: Request,
  episodeId: string | null,
  noteAuthorId?: string,
): Promise<void> {
  const role = req.user!.role;
  const userId = req.user!.userId;

  if (ADMIN_ROLES.includes(role)) return;
  if (noteAuthorId && noteAuthorId === userId) return;
  if (!episodeId) throw new AppError('Forbidden.', 403);

  // Org admins: tenant gate already applied — org-wide clinical read is intentional
  if (role === 'org_admin') return;

  if (role === 'care_coordinator') {
    const episode = await prisma.careEpisode.findFirst({
      where: { id: episodeId, coordinatorId: userId },
      select: { id: true },
    });
    if (episode) return;
    throw new AppError('Forbidden.', 403);
  }

  const [asProvider, asAssessor] = await Promise.all([
    prisma.session.findFirst({
      where: { episodeId, providerId: userId },
      select: { id: true },
    }),
    prisma.assessment.findFirst({
      where: { episodeId, assessorId: userId },
      select: { id: true },
    }),
  ]);

  if (asProvider || asAssessor) return;
  throw new AppError('Forbidden.', 403);
}

async function resolveEpisodeScope(params: {
  episodeId?: string;
  sessionId?: string;
}): Promise<{ episodeId: string | null; sessionId: string | null; organizationId: string | null }> {
  if (params.sessionId) {
    const session = await prisma.session.findUnique({
      where: { id: params.sessionId },
      select: {
        id: true,
        episodeId: true,
        episode: { select: { organizationId: true } },
      },
    });
    if (!session) throw new AppError('Session not found.', 404);
    const episodeId = params.episodeId ?? session.episodeId;
    if (params.episodeId && session.episodeId && params.episodeId !== session.episodeId) {
      throw new AppError('sessionId does not belong to the given episodeId.', 422);
    }
    let organizationId = session.episode?.organizationId ?? null;
    if (!organizationId && episodeId) {
      const ep = await prisma.careEpisode.findUnique({
        where: { id: episodeId },
        select: { organizationId: true },
      });
      organizationId = ep?.organizationId ?? null;
    }
    return { episodeId: episodeId ?? null, sessionId: session.id, organizationId };
  }

  if (!params.episodeId) {
    throw new AppError('Either episodeId or sessionId is required.', 422);
  }

  const episode = await prisma.careEpisode.findUnique({
    where: { id: params.episodeId },
    select: { id: true, organizationId: true },
  });
  if (!episode) throw new AppError('Episode not found.', 404);
  return {
    episodeId: episode.id,
    sessionId: null,
    organizationId: episode.organizationId,
  };
}

export class ClinicalNoteController {
  static async index(req: Request, res: Response): Promise<void> {
    if (!canView(req.user!.role, 'clinical_note')) {
      throw new AppError('Forbidden.', 403);
    }

    const { episodeId, sessionId } = req.query as {
      episodeId?: string;
      sessionId?: string;
    };
    if (!episodeId && !sessionId) {
      throw new AppError('Query episodeId or sessionId is required.', 400);
    }

    const scope = await resolveEpisodeScope({ episodeId, sessionId });
    assertTenantOrgAccess(req, scope.organizationId);
    await assertCareRelationship(req, scope.episodeId);

    const where: Record<string, unknown> = {};
    if (scope.episodeId) where.episodeId = scope.episodeId;
    if (sessionId) where.sessionId = sessionId;

    const notes = await prisma.clinicalNote.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const visible = notes.filter((n) =>
      canSeePrivateNote(req.user!.role, req.user!.userId, n),
    );

    res.json({ data: visible });
  }

  static async show(req: Request, res: Response): Promise<void> {
    if (!canView(req.user!.role, 'clinical_note')) {
      throw new AppError('Forbidden.', 403);
    }

    const note = await prisma.clinicalNote.findUnique({
      where: { id: req.params.id },
      include: {
        author: { select: { id: true, name: true, role: true } },
        episode: { select: { id: true, organizationId: true } },
        session: {
          select: {
            id: true,
            episodeId: true,
            episode: { select: { organizationId: true } },
          },
        },
      },
    });
    if (!note) throw new AppError('Clinical note not found.', 404);

    const organizationId =
      note.episode?.organizationId ??
      note.session?.episode?.organizationId ??
      null;
    assertTenantOrgAccess(req, organizationId);
    await assertCareRelationship(
      req,
      note.episodeId ?? note.session?.episodeId ?? null,
      note.authorId,
    );

    if (!canSeePrivateNote(req.user!.role, req.user!.userId, note)) {
      throw new AppError('Forbidden.', 403);
    }

    res.json({ data: note });
  }

  static async store(req: Request, res: Response): Promise<void> {
    if (!canCreate(req.user!.role, 'clinical_note')) {
      throw new AppError('Forbidden.', 403);
    }

    const body = createNoteSchema.parse(req.body);
    const scope = await resolveEpisodeScope({
      episodeId: body.episodeId,
      sessionId: body.sessionId,
    });
    assertTenantOrgAccess(req, scope.organizationId);

    const note = await prisma.clinicalNote.create({
      data: {
        content: body.content,
        noteType: body.noteType,
        isPrivate: body.isPrivate,
        authorId: req.user!.userId,
        episodeId: scope.episodeId ?? undefined,
        sessionId: scope.sessionId ?? undefined,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'clinical_note_created',
      entity: 'ClinicalNote',
      entityId: note.id,
      after: {
        episodeId: note.episodeId,
        sessionId: note.sessionId,
        noteType: note.noteType,
        isPrivate: note.isPrivate,
      },
      req,
    });

    res.status(201).json({ data: note });
  }

  /** M3-3.2 — notes are immutable after save */
  static async rejectMutation(_req: Request, res: Response): Promise<void> {
    res.status(405).json({
      message: 'Clinical notes are immutable after save. Create a new note instead.',
    });
  }
}
