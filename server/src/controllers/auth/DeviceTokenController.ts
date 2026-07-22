import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

const revokeByTokenSchema = z.object({
  token: z.string().min(1),
});

export class DeviceTokenController {
  /** Register or refresh a push notification token for the authenticated user. */
  static async register(req: Request, res: Response): Promise<void> {
    const { token, platform } = registerSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.pushNotificationToken.findUnique({ where: { token } });

    let record;
    if (existing) {
      // M-42: do not re-bind a push token owned by another account
      if (existing.userId !== userId) {
        throw new AppError('Device token is already registered to another account.', 403);
      }
      record = await prisma.pushNotificationToken.update({
        where: { id: existing.id },
        data: { platform, isActive: true },
      });
    } else {
      record = await prisma.pushNotificationToken.create({
        data: { userId, token, platform },
      });
    }

    await AuditService.log({
      userId,
      action: 'device_token_registered',
      entity: 'PushNotificationToken',
      entityId: record.id,
      req,
      metadata: { platform },
    });

    res.status(201).json({
      message: 'Device registered for push notifications.',
      device: {
        id: record.id,
        platform: record.platform,
        isActive: record.isActive,
        updatedAt: record.updatedAt,
      },
    });
  }

  /** List active push devices for the authenticated user (token values omitted). */
  static async list(req: Request, res: Response): Promise<void> {
    const devices = await prisma.pushNotificationToken.findMany({
      where: { userId: req.user!.userId, isActive: true },
      select: { id: true, platform: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ devices });
  }

  /** Deactivate a device token by record id. */
  static async revokeById(req: Request, res: Response): Promise<void> {
    const result = await prisma.pushNotificationToken.updateMany({
      where: { id: req.params.id, userId: req.user!.userId, isActive: true },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new AppError('Device token not found.', 404);
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'device_token_revoked',
      entity: 'PushNotificationToken',
      entityId: req.params.id,
      req,
    });

    res.json({ message: 'Device token revoked.' });
  }

  /** Deactivate a device token by FCM/APNs token value (e.g. on mobile logout). */
  static async revokeByToken(req: Request, res: Response): Promise<void> {
    const { token } = revokeByTokenSchema.parse(req.body);

    const result = await prisma.pushNotificationToken.updateMany({
      where: { token, userId: req.user!.userId, isActive: true },
      data: { isActive: false },
    });

    if (result.count === 0) {
      throw new AppError('Device token not found.', 404);
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'device_token_revoked',
      entity: 'PushNotificationToken',
      req,
      metadata: { byToken: true },
    });

    res.json({ message: 'Device token revoked.' });
  }
}
