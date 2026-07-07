import { NotificationChannel } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface CreateNotificationOptions {
  userId: string;
  title: string;
  body: string;
  type: string;
  channel?: NotificationChannel;
  data?: Record<string, unknown>;
}

export class NotificationService {
  static async create(opts: CreateNotificationOptions) {
    return prisma.notification.create({
      data: {
        userId: opts.userId,
        title: opts.title,
        body: opts.body,
        type: opts.type,
        channel: opts.channel ?? 'in_app',
        data: (opts.data ?? {}) as any,
      },
    });
  }

  static async getForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
    ]);
    return { notifications, total, page, limit };
  }

  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, readAt: null } });
  }

  static async markAsRead(id: string, userId: string) {
    return prisma.notification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
  }

  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  static async delete(id: string, userId: string) {
    return prisma.notification.deleteMany({ where: { id, userId } });
  }

  static async broadcastToSocket(
    io: import('socket.io').Server,
    userId: string,
    event: string,
    data: unknown
  ): Promise<void> {
    try {
      io.to(`notification.user.${userId}`).emit(event, data);
    } catch (err) {
      logger.error('Socket broadcast error', { err });
    }
  }
}
