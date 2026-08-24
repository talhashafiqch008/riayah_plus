import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { RefundService } from '../../services/RefundService';
import { AuditService } from '../../services/AuditService';
import { CacheInvalidationService } from '../../services/CacheInvalidationService';

export class ProviderBookingController {
  // GET /provider/bookings/requests — incoming booking requests for provider
  async listRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { page = '1', limit = '20' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where: { providerId, status: 'pending' },
          skip,
          take: parseInt(limit),
          include: { client: { select: { id: true, name: true, phone: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.booking.count({ where: { providerId, status: 'pending' } }),
      ]);
      res.json({ data: bookings, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/bookings/:id/action — approve/reject booking
  async takeAction(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const { action, reason } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        throw new AppError('action must be approve or reject', 400);
      }

      const booking = await prisma.booking.findFirst({ where: { id, providerId } });
      if (!booking) throw new AppError('Booking not found', 404);
      if (booking.status !== 'pending') throw new AppError('Booking is no longer pending', 400);

      const newStatus = action === 'approve' ? 'accepted' : 'cancelled';
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: newStatus,
          ...(action === 'reject' && { cancellationReason: reason }),
        },
      });
      res.json({ data: updated, message: `Booking ${action === 'approve' ? 'approved' : 'rejected'}` });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/bookings/:id/notes — add/update provider notes
  async addNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const { notes } = req.body;

      const booking = await prisma.booking.findFirst({ where: { id, providerId } });
      if (!booking) throw new AppError('Booking not found', 404);

      const updated = await prisma.booking.update({ where: { id }, data: { notes } });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // GET /provider/clients — provider's unique clients
  async listClients(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { page = '1', limit = '20' } = req.query as Record<string, string>;

      const bookings = await prisma.booking.findMany({
        where: { providerId },
        select: { clientId: true },
        distinct: ['clientId'],
      });
      const clientIds = bookings.map((b) => b.clientId);
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const clients = await prisma.user.findMany({
        where: { id: { in: clientIds }, deletedAt: null },
        skip,
        take: parseInt(limit),
        select: { id: true, name: true, email: true, phone: true, avatar: true, createdAt: true },
      });
      res.json({ data: clients, meta: { total: clientIds.length } });
    } catch (err) {
      next(err);
    }
  }

  // GET /provider/clients/:clientId — specific client for this provider
  async getClient(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { clientId } = req.params;

      const hasBooking = await prisma.booking.findFirst({ where: { providerId, clientId } });
      if (!hasBooking) throw new AppError('No booking relationship found with this client', 404);

      const client = await prisma.user.findUnique({
        where: { id: clientId },
        select: {
          id: true, name: true, email: true, phone: true, avatar: true,
          clientProfile: true, careRecipients: true,
        },
      });
      if (!client) throw new AppError('Client not found', 404);

      const bookingHistory = await prisma.booking.findMany({
        where: { providerId, clientId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      res.json({ data: { ...client, bookingHistory } });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/self-refund — provider-initiated refund (real gateway/wallet refund)
  async selfRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { bookingId, reason } = req.body;
      if (!bookingId) throw new AppError('bookingId is required', 400);
      if (!reason || typeof reason !== 'string' || !reason.trim()) {
        throw new AppError('reason is required', 400);
      }

      const booking = await prisma.booking.findFirst({
        where: { id: bookingId, providerId },
        include: { payment: true },
      });
      if (!booking) throw new AppError('Booking not found', 404);
      if (booking.status !== 'completed') {
        throw new AppError('Can only refund completed bookings', 400);
      }

      const payment = booking.payment;
      if (!payment) throw new AppError('No completed payment found for this booking', 404);
      if (payment.status === 'refunded') {
        res.json({
          data: { paymentId: payment.id },
          message: 'Already refunded',
          alreadyRefunded: true,
        });
        return;
      }
      if (payment.status !== 'paid') {
        throw new AppError('No completed payment found for this booking', 404);
      }

      const result = await RefundService.refundPaidBookingPayment({
        paymentId: payment.id,
        bookingId,
        clientUserId: booking.clientId,
        actorUserId: providerId,
        reason: `Provider self-refund: ${reason.trim()}`,
      });

      await CacheInvalidationService.onBookingUpdated(booking.clientId, booking.providerId);
      await AuditService.log({
        userId: providerId,
        action: 'provider_booking_refund',
        entity: 'Booking',
        entityId: bookingId,
        after: {
          paymentId: payment.id,
          refundRef: result.alreadyRefunded ? null : result.refundRef,
          reason: reason.trim(),
        },
        req,
      });

      res.status(result.alreadyRefunded ? 200 : 201).json({
        data: {
          paymentId: payment.id,
          refundRef: result.alreadyRefunded ? undefined : result.refundRef,
        },
        message: result.alreadyRefunded ? 'Already refunded' : 'Refund processed by provider',
        alreadyRefunded: result.alreadyRefunded,
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /providers/:providerId/slots — available booking slots
  async getSlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId } = req.params;
      const { from, to } = req.query as Record<string, string>;

      const dateFrom = from ? new Date(from) : new Date();
      const dateTo = to ? new Date(to) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const [slots, existingBookings] = await Promise.all([
        prisma.providerAvailabilitySlot.findMany({
          where: { providerId, isAvailable: true },
          orderBy: { startTime: 'asc' },
        }),
        prisma.booking.findMany({
          where: {
            providerId,
            scheduledAt: { gte: dateFrom, lte: dateTo },
            status: { in: ['pending', 'accepted', 'in_progress'] },
          },
          select: { scheduledAt: true, durationHours: true },
        }),
      ]);

      const bookedTimes = existingBookings.map((b) => ({
        start: b.scheduledAt,
        end: new Date(b.scheduledAt.getTime() + Number(b.durationHours ?? 1) * 60 * 60 * 1000),
      }));

      const availableSlots = slots.filter((slot) => {
        return !bookedTimes.some(
          (b) => slot.startTime < b.end.toISOString() && slot.endTime > b.start.toISOString()
        );
      });

      res.json({ data: availableSlots });
    } catch (err) {
      next(err);
    }
  }
}

export default new ProviderBookingController();
