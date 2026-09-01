import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { isFamilyRole } from '../utils/careAccess';
import { canJoinMeeting, canJoinSessionRoom, type TelehealthActor } from './LiveKitAccess';

const LIVE_PLAN = new Set(['approved', 'active']);
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
  'care_coordinator',
]);

export type PlanPick = {
  id: string;
  status: string;
  isCurrentVersion: boolean;
  version: number;
  approvedAt?: Date | null;
};

export function pickActiveCarePlan<T extends PlanPick>(plans: T[]): T | null {
  if (plans.length === 0) return null;
  const current = plans.filter((p) => p.isCurrentVersion);
  const liveCurrent = current.find((p) => LIVE_PLAN.has(p.status));
  if (liveCurrent) return liveCurrent;
  const liveAny = plans.find((p) => LIVE_PLAN.has(p.status));
  if (liveAny) return liveAny;
  if (current.length) {
    return [...current].sort((a, b) => b.version - a.version)[0];
  }
  return [...plans].sort((a, b) => b.version - a.version)[0];
}

export function noteVisibleToViewer(
  note: { authorId: string; isPrivate: boolean },
  actor: TelehealthActor,
): boolean {
  if (isFamilyRole(actor.role)) return false;
  if (!note.isPrivate) return true;
  if (note.authorId === actor.userId) return true;
  return CLINICAL_ROLES.has(actor.role);
}

type ContextNote = {
  id: string;
  content: string;
  isPrivate: boolean;
  noteType: string;
  authorId: string;
  createdAt: Date;
  author?: { id: string; name: string; role?: string } | null;
};

type ContextPlan = {
  id: string;
  title: string;
  status: string;
  version: number;
  items: { serviceType: string; frequency?: string | null; duration?: string | null; unitCost?: unknown }[];
  goals: { id: string; title: string; status: string; tier?: string | null }[];
};

export function shapeTelehealthContext(input: {
  viewer: TelehealthActor;
  episode: { id: string; title: string; status: string } | null;
  carePlan: ContextPlan | null;
  notes: ContextNote[];
}) {
  const items = (input.carePlan?.items ?? []).map(({ unitCost: _unitCost, ...item }) => item);
  const notes = isFamilyRole(input.viewer.role)
    ? []
    : input.notes
        .filter((n) => noteVisibleToViewer(n, input.viewer))
        .map(({ authorId, ...rest }) => ({
          ...rest,
          author: rest.author ?? undefined,
        }));

  return {
    episode: input.episode,
    carePlan: input.carePlan
      ? {
          id: input.carePlan.id,
          title: input.carePlan.title,
          status: input.carePlan.status,
          version: input.carePlan.version,
          items,
          goals: input.carePlan.goals,
        }
      : null,
    notes,
  };
}

export class TelehealthContextService {
  static async forSession(sessionId: string, actor: TelehealthActor) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canJoinSessionRoom(session, actor)) throw new AppError('Forbidden.', 403);

    return this.forEpisode(session.episodeId, actor);
  }

  static async forMeeting(meetingId: string, actor: TelehealthActor) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (!canJoinMeeting(meeting, actor)) throw new AppError('Forbidden.', 403);
    return this.forEpisode(meeting.episodeId, actor);
  }

  static async forEpisode(episodeId: string | null, actor: TelehealthActor) {
    if (!episodeId) {
      return shapeTelehealthContext({ viewer: actor, episode: null, carePlan: null, notes: [] });
    }

    const episode = await prisma.careEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        title: true,
        status: true,
        carePlans: {
          include: {
            items: {
              select: { serviceType: true, frequency: true, duration: true, unitCost: true },
              orderBy: { createdAt: 'asc' },
            },
            goals: {
              select: { id: true, title: true, status: true, tier: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { version: 'desc' },
        },
      },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);

    const picked = pickActiveCarePlan(episode.carePlans);
    const notes = await prisma.clinicalNote.findMany({
      where: { episodeId },
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return shapeTelehealthContext({
      viewer: actor,
      episode: { id: episode.id, title: episode.title, status: episode.status },
      carePlan: picked
        ? {
            id: picked.id,
            title: picked.title,
            status: picked.status,
            version: picked.version,
            items: picked.items,
            goals: picked.goals,
          }
        : null,
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        isPrivate: n.isPrivate,
        noteType: n.noteType,
        authorId: n.authorId,
        createdAt: n.createdAt,
        author: n.author,
      })),
    });
  }
}
