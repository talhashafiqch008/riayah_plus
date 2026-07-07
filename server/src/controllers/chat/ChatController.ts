import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

export class ChatController {
  static async getConversations(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const conversations = await prisma.conversation.findMany({
      where: { participantLinks: { some: { userId } } },
      include: {
        participantLinks: { include: { user: { select: { id: true, name: true, avatar: true } } } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    res.json({ data: conversations });
  }

  static async createConversation(req: Request, res: Response): Promise<void> {
    const { participantId, episodeId } = z
      .object({ participantId: z.string(), episodeId: z.string().optional() })
      .parse(req.body);

    const userId = req.user!.userId;

    const existing = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participantLinks: { some: { userId } } },
          { participantLinks: { some: { userId: participantId } } },
        ],
      },
    });

    if (existing) {
      res.json({ data: existing });
      return;
    }

    const conversation = await prisma.conversation.create({
      data: {
        episodeId,
        participantLinks: {
          create: [{ userId }, { userId: participantId }],
        },
      },
    });

    res.status(201).json({ data: conversation });
  }

  static async getMessages(req: Request, res: Response): Promise<void> {
    const { page = '1', limit = '50' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await prisma.message.findMany({
      where: { conversationId: req.params.conversationId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    });

    res.json({ data: messages.reverse() });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const { content, receiverId, conversationId, type, fileUrl } = z
      .object({
        content: z.string(),
        receiverId: z.string(),
        conversationId: z.string().optional(),
        type: z.string().default('text'),
        fileUrl: z.string().optional(),
      })
      .parse(req.body);

    const message = await prisma.message.create({
      data: {
        senderId: req.user!.userId,
        receiverId,
        content,
        conversationId,
        type,
        fileUrl,
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    if (conversationId) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      });
    }

    // Broadcast via Socket.io (server instance injected via app.locals)
    const io = req.app.locals.io;
    if (io) {
      io.to(`chat.${receiverId}`).emit('new_message', message);
    }

    res.status(201).json({ data: message });
  }

  static async markConversationRead(req: Request, res: Response): Promise<void> {
    await prisma.message.updateMany({
      where: {
        conversationId: req.params.conversationId,
        receiverId: req.user!.userId,
        status: { not: 'read' },
      },
      data: { status: 'read' },
    });
    res.json({ message: 'Marked as read.' });
  }

  static async editMessage(req: Request, res: Response): Promise<void> {
    const { content } = z.object({ content: z.string() }).parse(req.body);
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) throw new AppError('Message not found.', 404);
    if (message.senderId !== req.user!.userId) throw new AppError('Forbidden.', 403);

    const updated = await prisma.message.update({
      where: { id: message.id },
      data: { content, editedAt: new Date() },
    });
    res.json({ data: updated });
  }

  static async deleteMessage(req: Request, res: Response): Promise<void> {
    const message = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!message) throw new AppError('Message not found.', 404);
    if (message.senderId !== req.user!.userId) throw new AppError('Forbidden.', 403);

    await prisma.message.update({ where: { id: message.id }, data: { deletedAt: new Date() } });
    res.json({ message: 'Message deleted.' });
  }
}
