import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { PricingEngine } from '../../services/PricingEngine';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

const createCareNeedSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  serviceType: z.string(),
  location: z.string(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  scheduledAt: z.string().optional(),
  durationHours: z.number().positive().optional(),
  isUrgent: z.boolean().default(false),
  budget: z.number().positive().optional(),
  currency: z.string().default('QAR'),
  requirements: z.record(z.unknown()).optional(),
});

const bidSchema = z.object({
  amount: z.number().positive(),
  message: z.string().optional(),
  estimatedDuration: z.number().positive().optional(),
});

export class CareNeedController {
  // POST /api/care-needs
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createCareNeedSchema.parse(req.body);
      const clientId = req.user!.userId;

      // Get price estimate
      const pricing = await PricingEngine.calculate({
        serviceType: body.serviceType,
        durationHours: body.durationHours ?? 1,
        isUrgent: body.isUrgent,
        clientLatitude: body.latitude,
        clientLongitude: body.longitude,
        currency: body.currency,
      });

      const careNeed = await prisma.careNeed.create({
        data: {
          clientId,
          title: body.title,
          description: body.description,
          serviceType: body.serviceType,
          location: body.location,
          latitude: body.latitude,
          longitude: body.longitude,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          durationHours: body.durationHours,
          isUrgent: body.isUrgent,
          budget: body.budget ?? pricing.total,
          currency: body.currency,
          requirements: (body.requirements ?? {}) as Prisma.InputJsonValue,
          status: 'open',
        },
      });

      res.status(201).json({ success: true, careNeed, pricingEstimate: pricing });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/care-needs (client's own needs, or providers browsing open needs)
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { page, limit, skip, take } = parsePagination(req.query);
      const serviceType = queryString(req.query.serviceType);
      const isUrgent = queryString(req.query.isUrgent) === 'true' ? true : undefined;

      const providerRoles = ['provider', 'doctor', 'nurse', 'physiotherapist', 'occupational_therapist',
        'speech_therapist', 'psychologist', 'dietitian', 'support_worker', 'caregiver',
        'companion', 'nanny', 'therapist', 'cleaner', 'gardener', 'driver'];

      const isProvider = providerRoles.includes(role);

      const where: Record<string, unknown> = {};
      if (isProvider) {
        where.status = 'open';
        if (serviceType) where.serviceType = serviceType;
        if (isUrgent !== undefined) where.isUrgent = isUrgent;
      } else {
        where.clientId = userId;
        const status = queryString(req.query.status);
        if (status) where.status = status;
      }

      const [careNeeds, total] = await Promise.all([
        prisma.careNeed.findMany({
          where,
          include: { client: { select: { id: true, name: true, avatar: true } }, _count: { select: { bids: true } } },
          orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
          skip,
          take,
        }),
        prisma.careNeed.count({ where }),
      ]);

      res.json({ success: true, careNeeds, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/care-needs/:id
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const careNeed = await prisma.careNeed.findUnique({
        where: { id: req.params.id },
        include: {
          client: { select: { id: true, name: true, avatar: true } },
          bids: {
            include: { provider: { select: { id: true, name: true, avatar: true } } },
            orderBy: { amount: 'asc' },
          },
        },
      });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      res.json({ success: true, careNeed });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/care-needs/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createCareNeedSchema.partial().parse(req.body);
      const careNeed = await prisma.careNeed.findUnique({ where: { id: req.params.id } });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      if (careNeed.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);

      const updated = await prisma.careNeed.update({
        where: { id: req.params.id },
        data: {
          ...body,
          scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
          requirements: body.requirements ? body.requirements as Prisma.InputJsonValue : undefined,
        },
      });
      res.json({ success: true, careNeed: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/care-needs/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const careNeed = await prisma.careNeed.findUnique({ where: { id: req.params.id } });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      if (careNeed.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      if (careNeed.status !== 'open') throw new AppError('Cannot delete a care need that has bids or is in progress.', 400);
      await prisma.careNeed.delete({ where: { id: req.params.id } });
      res.json({ success: true, message: 'Care need removed.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/care-needs/:id/bids — provider places a bid
  static async placeBid(req: Request, res: Response, next: NextFunction) {
    try {
      const body = bidSchema.parse(req.body);
      const providerId = req.user!.userId;
      const careNeedId = req.params.id;

      const careNeed = await prisma.careNeed.findUnique({ where: { id: careNeedId } });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      if (careNeed.status !== 'open') throw new AppError('This care need is no longer accepting bids.', 400);

      const existing = await prisma.careNeedBid.findFirst({ where: { careNeedId, providerId } });
      if (existing) throw new AppError('You have already placed a bid on this care need.', 409);

      const bid = await prisma.careNeedBid.create({
        data: { careNeedId, providerId, amount: body.amount, message: body.message, estimatedDuration: body.estimatedDuration },
      });

      await NotificationService.create({
        userId: careNeed.clientId,
        title: 'New Bid Received',
        body: `A provider has placed a bid of QAR ${body.amount} on your care need.`,
        type: 'care_need_bid',
        data: { careNeedId, bidId: bid.id },
      });

      res.status(201).json({ success: true, bid });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/care-needs/:id/bids/:bidId/accept — client accepts a bid
  static async acceptBid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: careNeedId, bidId } = req.params;
      const clientId = req.user!.userId;

      const careNeed = await prisma.careNeed.findUnique({ where: { id: careNeedId } });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      if (careNeed.clientId !== clientId) throw new AppError('Forbidden.', 403);

      const bid = await prisma.careNeedBid.findUnique({ where: { id: bidId } });
      if (!bid || bid.careNeedId !== careNeedId) throw new AppError('Bid not found.', 404);

      // Mark care need as accepted and create a booking
      const booking = await prisma.booking.create({
        data: {
          clientId,
          providerId: bid.providerId,
          serviceType: careNeed.serviceType,
          scheduledAt: careNeed.scheduledAt ?? new Date(Date.now() + 48 * 3600 * 1000),
          durationHours: bid.estimatedDuration ?? careNeed.durationHours,
          notes: careNeed.description,
          totalPrice: bid.amount,
          status: 'pending',
          careNeedId,
        },
      });

      await prisma.careNeed.update({ where: { id: careNeedId }, data: { status: 'fulfilled' } });
      await prisma.careNeedBid.updateMany({ where: { careNeedId, id: { not: bidId } }, data: { status: 'rejected' } });
      await prisma.careNeedBid.update({ where: { id: bidId }, data: { status: 'accepted' } });

      await NotificationService.create({
        userId: bid.providerId,
        title: 'Bid Accepted!',
        body: 'The client has accepted your bid. A booking has been created.',
        type: 'bid_accepted',
        data: { careNeedId, bookingId: booking.id },
      });

      res.json({ success: true, booking, bid });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/care-needs/:id/bids/:bidId/reject — client rejects a bid
  static async rejectBid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: careNeedId, bidId } = req.params;
      const careNeed = await prisma.careNeed.findUnique({ where: { id: careNeedId } });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      if (careNeed.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);

      const bid = await prisma.careNeedBid.findUnique({ where: { id: bidId } });
      if (!bid || bid.careNeedId !== careNeedId) throw new AppError('Bid not found.', 404);

      await prisma.careNeedBid.update({ where: { id: bidId }, data: { status: 'rejected' } });

      await NotificationService.create({
        userId: bid.providerId,
        title: 'Bid Not Accepted',
        body: 'The client did not accept your bid on this care need.',
        type: 'bid_rejected',
        data: { careNeedId, bidId },
      });

      res.json({ success: true, message: 'Bid rejected.' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/care-needs/:id/bids/:bidId — provider withdraws their own bid
  static async withdrawBid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: careNeedId, bidId } = req.params;
      const bid = await prisma.careNeedBid.findUnique({ where: { id: bidId } });
      if (!bid || bid.careNeedId !== careNeedId) throw new AppError('Bid not found.', 404);
      if (bid.providerId !== req.user!.userId) throw new AppError('You can only withdraw your own bids.', 403);
      if (bid.status === 'accepted') throw new AppError('Cannot withdraw an accepted bid.', 400);

      await prisma.careNeedBid.delete({ where: { id: bidId } });
      res.json({ success: true, message: 'Bid withdrawn.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/care-needs/:id/bids/:bidId/counter-offer — client makes counter-offer on a bid
  static async counterOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: careNeedId, bidId } = req.params;
      const { amount, message } = z.object({ amount: z.number().positive(), message: z.string().optional() }).parse(req.body);

      const careNeed = await prisma.careNeed.findUnique({ where: { id: careNeedId } });
      if (!careNeed) throw new AppError('Care need not found.', 404);
      if (careNeed.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);

      const bid = await prisma.careNeedBid.findUnique({ where: { id: bidId } });
      if (!bid || bid.careNeedId !== careNeedId) throw new AppError('Bid not found.', 404);

      const updated = await prisma.careNeedBid.update({
        where: { id: bidId },
        data: { counterOfferAmount: amount, counterOfferMessage: message, status: 'counter_offered' },
      });

      await NotificationService.create({
        userId: bid.providerId,
        title: 'Counter-Offer Received',
        body: `The client has made a counter-offer of QAR ${amount} on your bid.`,
        type: 'bid_counter_offer',
        data: { careNeedId, bidId },
      });

      res.json({ success: true, bid: updated });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/care-needs/:id/price-estimate
  static async priceEstimate(req: Request, res: Response, next: NextFunction) {
    try {
      const body = z.object({
        serviceType: z.string(),
        durationHours: z.number().positive(),
        isUrgent: z.boolean().default(false),
        clientLatitude: z.number().optional(),
        clientLongitude: z.number().optional(),
        providerId: z.string().optional(),
        currency: z.string().default('QAR'),
      }).parse(req.body);

      const pricing = await PricingEngine.calculate(body);
      res.json({ success: true, pricing });
    } catch (err) {
      next(err);
    }
  }
}
