import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';

const createSchema = z.object({
  episodeId: z.string().optional(),
  serviceType: z.string(),
  fundingType: z.enum(['self_funded', 'insurance', 'government', 'nphc']).default('self_funded'),
  frequency: z.string().optional(),
  durationWeeks: z.number().int().positive().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  hoursPerWeek: z.number().positive().optional(),
  budget: z.number().positive().optional(),
  currency: z.string().default('QAR'),
  notes: z.string().optional(),
  recipientId: z.string().optional(),
});

export class CareOrderController {
  // POST /api/care-orders
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createSchema.parse(req.body);
      const order = await prisma.careOrder.create({
        data: {
          clientId: req.user!.userId,
          episodeId: body.episodeId,
          serviceType: body.serviceType,
          fundingType: body.fundingType,
          frequency: body.frequency,
          durationWeeks: body.durationWeeks,
          startDate: new Date(body.startDate),
          endDate: body.endDate ? new Date(body.endDate) : undefined,
          hoursPerWeek: body.hoursPerWeek,
          budget: body.budget,
          currency: body.currency,
          notes: body.notes,
          recipientId: body.recipientId,
          status: 'active',
        },
      });

      // Notify care coordinators
      const coordinators = await prisma.user.findMany({
        where: { role: 'care_coordinator', deletedAt: null },
        select: { id: true },
        take: 5,
      });
      await Promise.all(coordinators.map(c =>
        NotificationService.create({ userId: c.id, title: 'New Care Order', body: `A new ${body.serviceType} care order has been created.`, type: 'care_order_created', data: { orderId: order.id } })
      ));

      res.status(201).json({ success: true, order });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/care-orders
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const isAdmin = ['admin', 'super_admin', 'care_coordinator'].includes(req.user!.role);
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const where = isAdmin ? {} : { clientId: userId };

      const [orders, total] = await Promise.all([
        prisma.careOrder.findMany({
          where,
          include: {
            client: { select: { id: true, name: true, email: true } },
            recipient: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.careOrder.count({ where }),
      ]);

      res.json({ success: true, orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/care-orders/:id
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await prisma.careOrder.findUnique({
        where: { id: req.params.id },
        include: { client: { select: { id: true, name: true } }, recipient: true },
      });
      if (!order) throw new AppError('Care order not found.', 404);
      const isAdmin = ['admin', 'super_admin', 'care_coordinator'].includes(req.user!.role);
      if (order.clientId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);
      res.json({ success: true, order });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/care-orders/:id
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = createSchema.partial().parse(req.body);
      const order = await prisma.careOrder.findUnique({ where: { id: req.params.id } });
      if (!order) throw new AppError('Care order not found.', 404);
      const isAdmin = ['admin', 'super_admin', 'care_coordinator'].includes(req.user!.role);
      if (order.clientId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);
      const updated = await prisma.careOrder.update({
        where: { id: req.params.id },
        data: {
          ...body,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
        },
      });
      res.json({ success: true, order: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/care-orders/:id
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await prisma.careOrder.findUnique({ where: { id: req.params.id } });
      if (!order) throw new AppError('Care order not found.', 404);
      if (order.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);
      await prisma.careOrder.update({ where: { id: req.params.id }, data: { status: 'cancelled' } });
      res.json({ success: true, message: 'Care order cancelled.' });
    } catch (err) {
      next(err);
    }
  }
}
