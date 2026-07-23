import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';
import { logger } from '../../config/logger';

const raiseSchema = z.object({
  description: z.string().min(5),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  recipientId: z.string().optional(), // If for a specific care recipient
});

export class EmergencyController {
  // POST /api/emergency — raise emergency alert
  static async raise(req: Request, res: Response, next: NextFunction) {
    try {
      const body = raiseSchema.parse(req.body);
      const clientId = req.user!.userId;

      const request = await prisma.emergencyRequest.create({
        data: {
          clientId,
          description: body.description,
          latitude: body.latitude,
          longitude: body.longitude,
          address: body.address,
          recipientId: body.recipientId,
          status: 'pending',
        },
      });

      // Notify all admins and care coordinators
      const recipients = await prisma.user.findMany({
        where: { role: { in: ['admin', 'super_admin', 'care_coordinator'] }, deletedAt: null },
        select: { id: true },
      });

      await Promise.all(recipients.map(r =>
        NotificationService.create({
          userId: r.id,
          title: 'Emergency Alert',
          body: 'A client has raised an emergency. Open the app to respond.',
          type: 'emergency_alert',
          data: { emergencyId: request.id, clientId },
        })
      ));

      // Also notify any active provider for the client
      const activeBooking = await prisma.booking.findFirst({
        where: { clientId, status: 'in_progress' },
        select: { providerId: true },
      });
      if (activeBooking) {
        await NotificationService.create({
          userId: activeBooking.providerId,
          title: '🚨 Client Emergency',
          body: `Your current client needs emergency assistance.`,
          type: 'emergency_alert',
          data: { emergencyId: request.id },
        });
      }

      logger.warn('Emergency request raised', { requestId: request.id, clientId });

      res.status(201).json({ success: true, request });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/emergency — list own emergency requests
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const isAdmin = ['admin', 'super_admin', 'care_coordinator'].includes(req.user!.role);

      const requests = await prisma.emergencyRequest.findMany({
        where: isAdmin ? {} : { clientId: userId },
        include: {
          client: { select: { id: true, name: true, phone: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      res.json({ success: true, requests });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/emergency/:id/respond — care coordinator responds
  static async respond(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { notes, status } = z.object({ notes: z.string().optional(), status: z.enum(['acknowledged', 'resolved']) }).parse(req.body);

      const request = await prisma.emergencyRequest.findUnique({ where: { id } });
      if (!request) throw new AppError('Emergency request not found.', 404);

      const updated = await prisma.emergencyRequest.update({
        where: { id },
        data: { status, respondedById: req.user!.userId, respondedAt: new Date(), notes },
      });

      await NotificationService.create({
        userId: request.clientId,
        title: 'Emergency Response',
        body: status === 'resolved' ? 'Your emergency has been resolved.' : 'Help is on the way. Your alert has been acknowledged.',
        type: 'emergency_response',
        data: { emergencyId: id },
      });

      res.json({ success: true, request: updated });
    } catch (err) {
      next(err);
    }
  }
}
