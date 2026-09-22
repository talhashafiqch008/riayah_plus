import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { assertAppointmentTransition } from '../../utils/stateMachine';
import {
  assertBookingAccess,
  assertBookingClient,
  loadBookingOrThrow,
} from '../../utils/bookingAccess';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

const updateBookingSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
  durationHours: z.number().positive().optional(),
  notes: z.string().optional(),
});

export class BookingExtrasController {
  // PUT /bookings/:id — full update (reschedule, notes)
  async updateBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const parsed = updateBookingSchema.parse(req.body);

      const booking = await loadBookingOrThrow(id);
      assertBookingAccess(req, booking);
      if (!['pending', 'accepted'].includes(booking.status)) {
        throw new AppError('Cannot update a booking in its current state', 400);
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          ...(parsed.scheduledAt && { scheduledAt: new Date(parsed.scheduledAt) }),
          ...(parsed.durationHours && { durationHours: parsed.durationHours }),
          ...(parsed.notes !== undefined && { notes: parsed.notes }),
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          provider: { select: { id: true, name: true } },
        },
      });

      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /bookings/:id/cancel
  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const booking = await loadBookingOrThrow(id);
      assertBookingAccess(req, booking);
      if (['cancelled', 'completed'].includes(booking.status)) {
        throw new AppError('Booking cannot be cancelled in its current state', 400);
      }

      assertAppointmentTransition(booking.status, 'cancelled');

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: 'cancelled',
          cancellationReason: reason,
        },
      });
      res.json({ data: updated, message: 'Booking cancelled' });
    } catch (err) {
      next(err);
    }
  }

  // GET /bookings/upcoming
  async getUpcoming(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { take } = parsePagination(req.query, { defaultLimit: 10 });

      const isProvider = ['provider', 'doctor', 'nurse', 'physiotherapist',
        'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian',
        'support_worker', 'caregiver', 'therapist'].includes(role);

      const bookings = await prisma.booking.findMany({
        where: {
          ...(isProvider ? { providerId: userId } : { clientId: userId }),
          status: { in: ['pending', 'accepted', 'in_progress'] },
          scheduledAt: { gte: new Date() },
        },
        take,
        orderBy: { scheduledAt: 'asc' },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          provider: { select: { id: true, name: true, role: true } },
        },
      });

      res.json({ data: bookings });
    } catch (err) {
      next(err);
    }
  }

  // GET /access-status
  async getAccessStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { bookingId } = req.query as Record<string, string>;

      if (!bookingId) throw new AppError('bookingId query param required', 400);

      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new AppError('Booking not found', 404);

      const canAccess = booking.clientId === userId || booking.providerId === userId;
      const isActive = ['accepted', 'in_progress'].includes(booking.status);

      res.json({
        data: {
          canAccess,
          isActive,
          status: booking.status,
          scheduledAt: booking.scheduledAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /bookings/:id/counter-offer/respond — careseeker accept/reject counter-offer
  async respondToCounterOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { action, bidId } = req.body;
      if (!['accept', 'reject'].includes(action)) throw new AppError('action must be accept or reject', 400);

      const booking = await loadBookingOrThrow(id);
      assertBookingClient(req, booking);

      if (action === 'accept') {
        assertAppointmentTransition(booking.status, 'accepted');
        await prisma.booking.update({
          where: { id },
          data: { status: 'accepted' },
        });
        if (bidId) {
          await prisma.careNeedBid.update({
            where: { id: bidId },
            data: { status: 'accepted' },
          });
        }
        res.json({ message: 'Counter-offer accepted. Booking confirmed.' });
      } else {
        assertAppointmentTransition(booking.status, 'cancelled');
        await prisma.booking.update({ where: { id }, data: { status: 'cancelled' } });
        res.json({ message: 'Counter-offer rejected. Booking cancelled.' });
      }
    } catch (err) {
      next(err);
    }
  }
}

export default new BookingExtrasController();
