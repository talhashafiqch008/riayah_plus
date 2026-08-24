import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { isAdminRole, isFamilyRole } from '../utils/careAccess';

export const CONVERSATION_TYPES = [
  'family_coordinator',
  'family_clinical',
  'coordinator_clinical',
  'internal_staff',
  'direct',
] as const;

export type ConversationType = (typeof CONVERSATION_TYPES)[number];

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
  'provider',
]);

export type MessagingBucket = 'family' | 'coordinator' | 'clinical' | 'other';

export function messagingBucket(role: string): MessagingBucket {
  if (isFamilyRole(role)) return 'family';
  if (role === 'care_coordinator' || isAdminRole(role)) return 'coordinator';
  if (CLINICAL_ROLES.has(role)) return 'clinical';
  return 'other';
}

export function conversationTypeForRoles(roleA: string, roleB: string): ConversationType {
  const pair = [messagingBucket(roleA), messagingBucket(roleB)].sort().join('+');
  if (pair === 'coordinator+family') return 'family_coordinator';
  if (pair === 'clinical+family') return 'family_clinical';
  if (pair === 'clinical+coordinator') return 'coordinator_clinical';
  if (pair === 'clinical+clinical' || pair === 'coordinator+coordinator') return 'internal_staff';
  return 'direct';
}

export function isConversationType(value: string): value is ConversationType {
  return (CONVERSATION_TYPES as readonly string[]).includes(value);
}

export type EpisodeMessagingParty = {
  coordinatorId: string;
  patientId: string;
  careUnit?: { familyUserId: string } | null;
  clinicianIds?: string[];
};

export type MessagingActor = { userId: string; role: string };

export function isEpisodeMessagingParty(userId: string, episode: EpisodeMessagingParty): boolean {
  if (episode.coordinatorId === userId) return true;
  if (episode.patientId === userId) return true;
  if (episode.careUnit?.familyUserId === userId) return true;
  return Boolean(episode.clinicianIds?.includes(userId));
}

export function canOpenEpisodeThread(opts: {
  actor: MessagingActor;
  participantId: string;
  episode: EpisodeMessagingParty;
}): boolean {
  const actorOk = isAdminRole(opts.actor.role) || isEpisodeMessagingParty(opts.actor.userId, opts.episode);
  const otherOk = isEpisodeMessagingParty(opts.participantId, opts.episode);
  return actorOk && otherOk;
}

export function matchingDirectThreadWhere(
  userId: string,
  participantId: string,
  episodeId: string | null,
) {
  return {
    episodeId,
    AND: [
      { participantLinks: { some: { userId } } },
      { participantLinks: { some: { userId: participantId } } },
    ],
  };
}

const threadInclude = {
  participantLinks: { include: { user: { select: { id: true, name: true, avatar: true, role: true } } } },
} as const;

export class ConversationService {
  static async listForUser(
    actor: MessagingActor,
    opts: { episodeId?: string; type?: string } = {},
  ) {
    const episodeId = opts.episodeId;
    const type = opts.type;
    if (type && !isConversationType(type)) {
      throw new AppError('Invalid conversation type.', 400);
    }
    if (episodeId) {
      await this.loadEpisodeForThread(episodeId, actor, actor.userId);
    }

    return prisma.conversation.findMany({
      where: {
        participantLinks: { some: { userId: actor.userId } },
        ...(episodeId ? { episodeId } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        ...threadInclude,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
    });
  }

  static async findOrCreateDirect(opts: {
    actor: MessagingActor;
    participantId: string;
    episodeId?: string;
  }) {
    const { actor, participantId } = opts;
    if (participantId === actor.userId) {
      throw new AppError('Cannot start a conversation with yourself.', 400);
    }

    const other = await prisma.user.findUnique({
      where: { id: participantId },
      select: { id: true, role: true },
    });
    if (!other) throw new AppError('Participant not found.', 404);

    let episodeId: string | null = null;
    if (opts.episodeId) {
      await this.loadEpisodeForThread(opts.episodeId, actor, participantId);
      episodeId = opts.episodeId;
    }

    const type = conversationTypeForRoles(actor.role, other.role);

    const existing = await prisma.conversation.findFirst({
      where: matchingDirectThreadWhere(actor.userId, participantId, episodeId),
      include: threadInclude,
    });
    if (existing) {
      if (existing.type !== type) {
        const updated = await prisma.conversation.update({
          where: { id: existing.id },
          data: { type },
          include: threadInclude,
        });
        return { conversation: updated, created: false };
      }
      return { conversation: existing, created: false };
    }

    const conversation = await prisma.conversation.create({
      data: {
        episodeId,
        type,
        participantLinks: {
          create: [{ userId: actor.userId }, { userId: participantId }],
        },
      },
      include: threadInclude,
    });
    return { conversation, created: true };
  }

  static async requireParticipant(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participantLinks: { select: { userId: true } } },
    });
    if (!conversation) throw new AppError('Conversation not found.', 404);
    if (!conversation.participantLinks.some((p) => p.userId === userId)) {
      throw new AppError('Forbidden.', 403);
    }
    return conversation;
  }

  private static async loadEpisodeForThread(
    episodeId: string,
    actor: MessagingActor,
    participantId: string,
  ) {
    const episode = await prisma.careEpisode.findUnique({
      where: { id: episodeId },
      select: {
        id: true,
        coordinatorId: true,
        patientId: true,
        careUnit: { select: { familyUserId: true } },
        sessions: { select: { providerId: true } },
      },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);

    const party: EpisodeMessagingParty = {
      coordinatorId: episode.coordinatorId,
      patientId: episode.patientId,
      careUnit: episode.careUnit,
      clinicianIds: [...new Set(episode.sessions.map((s) => s.providerId))],
    };

    if (!canOpenEpisodeThread({ actor, participantId, episode: party })) {
      throw new AppError('Forbidden.', 403);
    }
    return episode;
  }
}
