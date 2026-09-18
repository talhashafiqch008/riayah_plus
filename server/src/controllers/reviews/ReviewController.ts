import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const reviewSchema = z.object({
  bookingId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

async function recalcProviderRating(providerId: string) {
  const agg = await prisma.review.aggregate({ where: { providerId }, _avg: { rating: true }, _count: true });
  await prisma.providerProfile.updateMany({
    where: { userId: providerId },
    data: { averageRating: agg._avg.rating ?? 0, reviewCount: agg._count },
  });
}

export class ReviewController {
  // POST /api/reviews
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = reviewSchema.parse(req.body);
      const clientId = req.user!.userId;

      const booking = await prisma.booking.findUnique({ where: { id: body.bookingId } });
      if (!booking) throw new AppError('Booking not found.', 404);
      if (booking.clientId !== clientId) throw new AppError('Only the client of this booking can leave a review.', 403);
      if (booking.status !== 'completed') throw new AppError('You can only review completed bookings.', 400);

      const existingReview = await prisma.review.findFirst({ where: { bookingId: body.bookingId, clientId } });
      if (existingReview) throw new AppError('You have already reviewed this booking.', 409);

      const review = await prisma.review.create({
        data: {
          bookingId: body.bookingId,
          clientId,
          providerId: booking.providerId,
          rating: body.rating,
          comment: body.comment,
        },
      });

      await recalcProviderRating(booking.providerId);

      res.status(201).json({ success: true, review });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/reviews/provider/:providerId
  static async listByProvider(req: Request, res: Response, next: NextFunction) {
    try {
      const { providerId } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 100);

      const [reviews, total, agg] = await Promise.all([
        prisma.review.findMany({
          where: { providerId },
          include: { client: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.review.count({ where: { providerId } }),
        prisma.review.aggregate({ where: { providerId }, _avg: { rating: true } }),
      ]);

      res.json({
        success: true,
        reviews,
        averageRating: agg._avg.rating ?? 0,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/reviews/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { rating, comment } = z.object({
        rating: z.number().int().min(1).max(5).optional(),
        comment: z.string().max(1000).optional(),
      }).parse(req.body);

      const review = await prisma.review.findUnique({ where: { id: req.params.id } });
      if (!review) throw new AppError('Review not found.', 404);
      if (review.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);

      const updated = await prisma.review.update({
        where: { id: req.params.id },
        data: { rating, comment },
      });

      await recalcProviderRating(review.providerId);

      res.json({ success: true, review: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/reviews/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const review = await prisma.review.findUnique({ where: { id: req.params.id } });
      if (!review) throw new AppError('Review not found.', 404);

      const isOwner = review.clientId === req.user!.userId;
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

      if (!isOwner && !isAdmin) throw new AppError('Forbidden.', 403);

      await prisma.review.delete({ where: { id: req.params.id } });
      await recalcProviderRating(review.providerId);

      res.json({ success: true, message: 'Review deleted.' });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/reviews/my — client's own reviews
  static async myReviews(req: Request, res: Response, next: NextFunction) {
    try {
      const reviews = await prisma.review.findMany({
        where: { clientId: req.user!.userId },
        include: { provider: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, reviews });
    } catch (err) {
      next(err);
    }
  }
}
