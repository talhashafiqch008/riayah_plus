import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { GeminiChatService } from '../../services/GeminiChatService';
import { AppError } from '../../middleware/errorHandler';

export class AISessionController {
  // GET /api/ai/sessions — list all AI conversations for user
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await prisma.conversation.findMany({
        where: { type: 'ai', participantLinks: { some: { userId: req.user!.userId } } },
        include: {
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      res.json({ success: true, sessions });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/ai/sessions — create a new AI session (named conversation)
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title } = z.object({ title: z.string().min(1).optional() }).parse(req.body);
      const userId = req.user!.userId;

      const session = await prisma.conversation.create({
        data: {
          type: 'ai',
          title: title ?? 'Aria — AI Health Assistant',
          participantLinks: { create: { userId } },
        },
      });

      res.status(201).json({ success: true, session });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/ai/sessions/:id — get session messages
  static async show(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const session = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          participantLinks: true,
        },
      });

      if (!session) throw new AppError('AI session not found.', 404);
      const isParticipant = session.participantLinks.some(p => p.userId === userId);
      if (!isParticipant) throw new AppError('Forbidden.', 403);

      res.json({ success: true, session });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/ai/sessions/:id — rename a session
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { title } = z.object({ title: z.string().min(1) }).parse(req.body);
      const session = await prisma.conversation.update({
        where: { id: req.params.id },
        data: { title },
      });
      res.json({ success: true, session });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/ai/sessions/:id — delete a session and its messages
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const session = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: { participantLinks: true },
      });

      if (!session) throw new AppError('AI session not found.', 404);
      const isParticipant = session.participantLinks.some(p => p.userId === userId);
      if (!isParticipant) throw new AppError('Forbidden.', 403);

      await prisma.message.deleteMany({ where: { conversationId: req.params.id } });
      await prisma.conversation.delete({ where: { id: req.params.id } });
      GeminiChatService.clearSession(req.params.id);

      res.json({ success: true, message: 'AI session deleted.' });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/ai/sessions/:id/message — send a message in a specific named session
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = z.object({ message: z.string().min(1).max(2000) }).parse(req.body);
      const userId = req.user!.userId;

      const session = await prisma.conversation.findUnique({
        where: { id: req.params.id },
        include: { participantLinks: true },
      });
      if (!session) throw new AppError('AI session not found.', 404);
      if (!session.participantLinks.some(p => p.userId === userId)) throw new AppError('Forbidden.', 403);

      const reply = await GeminiChatService.sendMessage(userId, req.params.id, message);
      res.json({ success: true, reply, sessionId: req.params.id });
    } catch (err) {
      next(err);
    }
  }
}
