import { Request } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { assertEpisodeAccess } from './careAccess';

type ScheduleInput = {
  participantId: string;
  bookingId?: string;
  episodeId?: string;
};

/**
 * H3: Require a verifiable care relationship before scheduling telehealth meetings.
 */
export async function assertCanScheduleMeeting(
  req: Request,
  input: ScheduleInput,
): Promise<void> {
  const userId = req.user!.userId;

  if (!input.bookingId && !input.episodeId) {
    throw new AppError('bookingId or episodeId is required to schedule a meeting.', 422);
  }

  const participant = await prisma.user.findFirst({
    where: { id: input.participantId, deletedAt: null },
    select: { id: true },
  });
  if (!participant) throw new AppError('Participant not found.', 404);

  if (input.participantId === userId) {
    throw new AppError('Host and participant must be different users.', 422);
  }

  if (input.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      select: { id: true, clientId: true, providerId: true },
    });
    if (!booking) throw new AppError('Booking not found.', 404);

    const isParty = booking.clientId === userId || booking.providerId === userId;
    if (!isParty) throw new AppError('Forbidden.', 403);

    const participantOnBooking =
      input.participantId === booking.clientId || input.participantId === booking.providerId;
    if (!participantOnBooking) {
      throw new AppError('Participant must be part of the linked booking.', 403);
    }

    const hostOnBooking = userId === booking.clientId || userId === booking.providerId;
    if (!hostOnBooking) throw new AppError('Forbidden.', 403);
  }

  if (input.episodeId) {
    const episode = await prisma.careEpisode.findUnique({
      where: { id: input.episodeId },
      select: {
        id: true,
        patientId: true,
        organizationId: true,
        coordinatorId: true,
        careUnitId: true,
        careUnit: { select: { familyUserId: true } },
      },
    });
    if (!episode) throw new AppError('Care episode not found.', 404);

    await assertEpisodeAccess(req, episode);

    const familyUserId = episode.careUnit?.familyUserId;
    const allowedParticipantIds = new Set(
      [episode.patientId, episode.coordinatorId, familyUserId].filter(Boolean) as string[],
    );

    if (!allowedParticipantIds.has(input.participantId) && input.participantId !== userId) {
      const assigned = await prisma.session.findFirst({
        where: {
          episodeId: episode.id,
          OR: [{ providerId: input.participantId }, { clientId: input.participantId }],
        },
        select: { id: true },
      });
      if (!assigned) {
        throw new AppError('Participant is not linked to this care episode.', 403);
      }
    }
  }
}
