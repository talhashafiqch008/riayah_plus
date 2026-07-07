import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { z } from 'zod';

const offerSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  serviceType: z.string().min(1),
  price: z.number().positive(),
  currency: z.string().default('QAR'),
  slots: z.record(z.unknown()).optional(),
});

export class MarketplaceOfferController {
  // GET /marketplace/offers — public browse
  async listPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', serviceType, minPrice, maxPrice } = req.query as Record<string, string>;
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const where: Record<string, unknown> = { status: 'active' };
      if (serviceType) where.serviceType = serviceType;
      if (minPrice || maxPrice) {
        where.price = {
          ...(minPrice ? { gte: parseFloat(minPrice) } : {}),
          ...(maxPrice ? { lte: parseFloat(maxPrice) } : {}),
        };
      }

      const [offers, total] = await Promise.all([
        prisma.providerMarketplaceOffer.findMany({
          where,
          skip,
          take: parseInt(limit),
          include: {
            provider: {
              select: { id: true, name: true, providerProfileExt: { select: { averageRating: true, bio: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.providerMarketplaceOffer.count({ where }),
      ]);
      res.json({ data: offers, meta: { total, page: parseInt(page), limit: parseInt(limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /marketplace/offers/:id — public single
  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const offer = await prisma.providerMarketplaceOffer.findUnique({
        where: { id },
        include: {
          provider: {
            select: { id: true, name: true, providerProfileExt: true, providerProfile: true },
          },
        },
      });
      if (!offer) throw new AppError('Offer not found', 404);
      res.json({ data: offer });
    } catch (err) {
      next(err);
    }
  }

  // POST /marketplace/offers/:id/book — book an offer
  async bookOffer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const clientId = req.user!.userId;
      const { scheduledAt, notes, durationHours = 1 } = req.body;

      const offer = await prisma.providerMarketplaceOffer.findUnique({
        where: { id },
        include: { provider: { select: { id: true } } },
      });
      if (!offer) throw new AppError('Offer not found', 404);
      if (offer.status !== 'active') throw new AppError('Offer is no longer available', 400);

      const booking = await prisma.booking.create({
        data: {
          clientId,
          providerId: offer.providerId,
          serviceType: offer.serviceType,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
          durationHours,
          status: 'pending',
          notes,
          totalPrice: Number(offer.price) * durationHours,
          currency: offer.currency,
        },
        include: {
          client: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
        },
      });

      res.status(201).json({ data: booking });
    } catch (err) {
      next(err);
    }
  }

  // GET /provider/marketplace-offers — provider's own offers
  async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const offers = await prisma.providerMarketplaceOffer.findMany({
        where: { providerId },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: offers });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/marketplace-offers
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const parsed = offerSchema.parse(req.body);
      const offer = await prisma.providerMarketplaceOffer.create({
        data: { providerId, ...parsed, slots: parsed.slots ? parsed.slots as Prisma.InputJsonValue : undefined },
      });
      res.status(201).json({ data: offer });
    } catch (err) {
      next(err);
    }
  }

  // PUT /provider/marketplace-offers/:id
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const offer = await prisma.providerMarketplaceOffer.findFirst({ where: { id, providerId } });
      if (!offer) throw new AppError('Not found', 404);
      const parsed = offerSchema.partial().parse(req.body);
      const updated = await prisma.providerMarketplaceOffer.update({
        where: { id },
        data: { ...parsed, slots: parsed.slots ? parsed.slots as Prisma.InputJsonValue : undefined },
      });
      res.json({ data: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /provider/marketplace-offers/:id
  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;
      const offer = await prisma.providerMarketplaceOffer.findFirst({ where: { id, providerId } });
      if (!offer) throw new AppError('Not found', 404);
      await prisma.providerMarketplaceOffer.delete({ where: { id } });
      res.json({ message: 'Deleted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new MarketplaceOfferController();
