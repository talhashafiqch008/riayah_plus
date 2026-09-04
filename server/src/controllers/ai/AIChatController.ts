import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { GeminiChatService } from '../../services/GeminiChatService';
import { assertAiChatConsent } from '../../utils/aiChatConsent';
import { assertContentPolicy } from '../../utils/contentPolicy';

const messageSchema = z.object({ message: z.string().min(1).max(2000) });

export class AIChatController {
  // POST /api/ai/chat — send message in an AI conversation
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = messageSchema.parse(req.body);
      assertContentPolicy(message);
      const userId = req.user!.userId;
      await assertAiChatConsent(userId);

      // Get or create AI conversation for this user
      let conversation = await prisma.conversation.findFirst({
        where: { type: 'ai', participantLinks: { some: { userId } } },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            type: 'ai',
            title: 'Aria — AI Health Assistant',
            participantLinks: { create: { userId } },
          },
        });
      }

      const response = await GeminiChatService.sendMessage(userId, conversation.id, message);
      res.json({ success: true, reply: response, conversationId: conversation.id });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/ai/chat/stream — streaming response via SSE
  static async streamMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { message } = messageSchema.parse(req.body);
      assertContentPolicy(message);
      const userId = req.user!.userId;
      await assertAiChatConsent(userId);

      let conversation = await prisma.conversation.findFirst({
        where: { type: 'ai', participantLinks: { some: { userId } } },
      });
      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            type: 'ai',
            title: 'Aria — AI Health Assistant',
            participantLinks: { create: { userId } },
          },
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await GeminiChatService.streamMessage(userId, conversation.id, message, (chunk) => {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      next(err);
    }
  }

  // GET /api/ai/chat/history
  static async history(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);

      const conversation = await prisma.conversation.findFirst({
        where: { type: 'ai', participantLinks: { some: { userId } } },
      });

      if (!conversation) { res.json({ success: true, messages: [] }); return; }

      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: limit,
      });

      res.json({ success: true, messages, conversationId: conversation.id });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/ai/chat — clear AI conversation
  static async clearConversation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const conversation = await prisma.conversation.findFirst({
        where: { type: 'ai', participantLinks: { some: { userId } } },
      });

      if (conversation) {
        await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
        GeminiChatService.clearSession(conversation.id);
      }

      res.json({ success: true, message: 'Conversation cleared.' });
    } catch (err) {
      next(err);
    }
  }
}
