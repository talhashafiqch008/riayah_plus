import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DisputeStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { DisputeService } from '../../services/DisputeService';
import { AppError } from '../../middleware/errorHandler';

const openSchema = z.object({
  reason: z.string().min(5),
  description: z.string().min(20),
  evidence: z.array(z.string().url()).optional(),
});

const resolveSchema = z.object({
  resolution: z.enum(['refund_client', 'release_provider', 'split', 'no_action']),
  notes: z.string().min(5),
  splitRatio: z.number().min(0).max(1).optional(),
});

export class DisputeController {
  // POST /api/bookings/:bookingId/dispute
  static async open(req: Request, res: Response, next: NextFunction) {
    try {
      const { bookingId } = req.params;
      const body = openSchema.parse(req.body);
      const dispute = await DisputeService.open({ bookingId, raisedById: req.user!.userId, ...body });
      res.status(201).json({ success: true, dispute });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/disputes/:disputeId/evidence
  static async addEvidence(req: Request, res: Response, next: NextFunction) {
    try {
      const { disputeId } = req.params;
      const { evidence } = z.object({ evidence: z.array(z.string().url()).min(1) }).parse(req.body);
      const dispute = await DisputeService.addEvidence(disputeId, req.user!.userId, evidence);
      res.json({ success: true, dispute });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/disputes (own disputes)
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Math.max(Number(req.query.limit) || 15, 1), 100);

      const bookings = await prisma.booking.findMany({
        where: { OR: [{ clientId: userId }, { providerId: userId }] },
        select: { id: true },
      });
      const bookingIds = bookings.map(b => b.id);

      const [disputes, total] = await Promise.all([
        prisma.bookingDispute.findMany({
          where: { bookingId: { in: bookingIds } },
          include: { booking: { select: { id: true, clientId: true, providerId: true, scheduledAt: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.bookingDispute.count({ where: { bookingId: { in: bookingIds } } }),
      ]);

      res.json({ success: true, disputes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/disputes/:disputeId
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const { disputeId } = req.params;
      const userId = req.user!.userId;

      const dispute = await prisma.bookingDispute.findUnique({
        where: { id: disputeId },
        include: {
          booking: { include: { client: { select: { id: true, name: true, avatar: true } }, provider: { select: { id: true, name: true, avatar: true } } } },
        },
      });

      if (!dispute) throw new AppError('Dispute not found.', 404);

      const isParty = dispute.booking.clientId === userId || dispute.booking.providerId === userId;
      const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

      if (!isParty && !isAdmin) throw new AppError('Forbidden.', 403);

      res.json({ success: true, dispute });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/disputes (admin list all)
  static async adminList(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
      const status = req.query.status as string | undefined;

      const where = status ? { status: status as DisputeStatus } : {};

      const [disputes, total] = await Promise.all([
        prisma.bookingDispute.findMany({
          where,
          include: {
            booking: {
              include: {
                client: { select: { id: true, name: true, email: true } },
                provider: { select: { id: true, name: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.bookingDispute.count({ where }),
      ]);

      res.json({ success: true, disputes, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/disputes/:disputeId/resolve
  static async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const { disputeId } = req.params;
      const body = resolveSchema.parse(req.body);
      const dispute = await DisputeService.resolve(disputeId, req.user!.userId, body.resolution, body.notes, body.splitRatio);
      res.json({ success: true, dispute });
    } catch (err) {
      next(err);
    }
  }
}
