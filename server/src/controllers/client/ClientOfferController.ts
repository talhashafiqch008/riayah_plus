import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ClientOfferController {
  // GET /client/offers — list provider offers visible to client
  async listOffers(req: Request, res: Response, next: NextFunction) {
    try {
      const { serviceType, page = '1', limit = '20' } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = { status: 'active' };
      if (serviceType) where.serviceType = serviceType;

      const [offers, total] = await Promise.all([
        prisma.providerOffer.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            provider: { select: { id: true, name: true, role: true, providerProfileExt: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.providerOffer.count({ where }),
      ]);
      res.json({ data: offers, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /client/offers/:id/accept — accept an offer
  async acceptOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const clientId = req.user!.userId;
      const { scheduledAt, notes } = req.body;

      const offer = await prisma.providerOffer.findUnique({
        where: { id },
        include: { provider: { select: { id: true } } },
      });
      if (!offer) throw new AppError('Offer not found', 404);
      if (offer.status !== 'active') throw new AppError('Offer is no longer active', 400);

      const booking = await prisma.booking.create({
        data: {
          clientId,
          providerId: offer.providerId,
          serviceType: 'general',
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          status: 'pending',
          notes,
          currency: 'QAR',
        },
      });

      await prisma.providerOffer.update({ where: { id }, data: { status: 'booked', clientId } });

      res.status(201).json({ data: booking, message: 'Offer accepted, booking created' });
    } catch (err) {
      next(err);
    }
  }

  // POST /client/offers/:id/reject — reject an offer
  async rejectOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const clientId = req.user!.userId;
      const { reason } = req.body;

      const offer = await prisma.providerOffer.findFirst({ where: { id, clientId } });
      if (!offer) throw new AppError('Offer not found', 404);

      await prisma.providerOffer.update({ where: { id }, data: { status: 'withdrawn' } });
      res.json({ message: 'Offer rejected' });
    } catch (err) {
      next(err);
    }
  }

  // POST /client/care-needs — alias path
  async createCareNeed(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user!.userId;
      const { title, description, serviceType, budget, scheduledAt, location, isUrgent, durationHours } = req.body;
      if (!title) throw new AppError('title is required', 400);

      const careNeed = await prisma.careNeed.create({
        data: {
          clientId,
          title,
          description,
          serviceType,
          budget: budget ?? undefined,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          location,
          isUrgent: isUrgent ?? false,
          durationHours: durationHours ?? undefined,
          status: 'open',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      res.status(201).json({ data: careNeed });
    } catch (err) {
      next(err);
    }
  }

  // GET /client/care-needs — alias path
  async listCareNeeds(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = req.user!.userId;
      const { status } = req.query as Record<string, string>;
      const where: Record<string, unknown> = { clientId };
      if (status) where.status = status;

      const careNeeds = await prisma.careNeed.findMany({
        where,
        include: { bids: { include: { provider: { select: { id: true, name: true, role: true } } } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: careNeeds });
    } catch (err) {
      next(err);
    }
  }

  // POST /client/care-needs/bids/:id/accept — accept a bid (client path)
  async acceptBid(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const clientId = req.user!.userId;

      const bid = await prisma.careNeedBid.findUnique({
        where: { id },
        include: { careNeed: true },
      });
      if (!bid) throw new AppError('Bid not found', 404);
      if (bid.careNeed.clientId !== clientId) throw new AppError('Forbidden', 403);
      if (bid.status !== 'pending') throw new AppError('Bid is no longer pending', 400);

      await prisma.$transaction(async (tx) => {
        await tx.careNeedBid.update({ where: { id }, data: { status: 'accepted' } });
        await tx.careNeedBid.updateMany({
          where: { careNeedId: bid.careNeedId, id: { not: id }, status: 'pending' },
          data: { status: 'rejected' },
        });
        await tx.careNeed.update({ where: { id: bid.careNeedId }, data: { status: 'in_progress' } });
      });

      res.json({ message: 'Bid accepted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new ClientOfferController();
