import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { ConversationService } from '../../services/ConversationService';
import { ChatMessageService } from '../../services/ChatMessageService';
import { emitMessagesRead, emitNewMessage } from '../../services/RealtimeService';
import { sanitizedString } from '../../utils/sanitize';

export class ChatController {
  static async getConversations(req: Request, res: Response): Promise<void> {
    const conversations = await ConversationService.listForUser(
      { userId: req.user!.userId, role: req.user!.role },
      {
        episodeId:
          typeof req.query.episodeId === 'string' && req.query.episodeId.trim()
            ? req.query.episodeId.trim()
            : undefined,
        type:
          typeof req.query.type === 'string' && req.query.type.trim()
            ? req.query.type.trim()
            : undefined,
      },
    );
    res.json({ data: conversations });
  }

  static async createConversation(req: Request, res: Response): Promise<void> {
    const body = z
      .object({
        participantId: z.string().min(1).optional(),
        participantIds: z.array(z.string().min(1)).optional(),
        episodeId: z.string().min(1).optional(),
      })
      .parse(req.body);
    const participantId = body.participantId ?? body.participantIds?.[0];
    if (!participantId) {
      throw new AppError('participantId is required.', 400);
    }

    const { conversation, created } = await ConversationService.findOrCreateDirect({
      actor: { userId: req.user!.userId, role: req.user!.role },
      participantId,
      episodeId: body.episodeId,
    });
    res.status(created ? 201 : 200).json({ data: conversation });
  }

  static async getMessages(req: Request, res: Response): Promise<void> {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '50'), 10);
    const messages = await ChatMessageService.list(
      req.params.conversationId,
      req.user!.userId,
      page,
      limit,
    );
    res.json({ data: messages });
  }

  static async sendInThread(req: Request, res: Response): Promise<void> {
    const content =
      typeof req.body?.content === 'string'
        ? req.body.content
        : typeof req.body?.message === 'string'
          ? req.body.message
          : undefined;
    const message = await ChatMessageService.send({
      conversationId: req.params.conversationId,
      actorId: req.user!.userId,
      content,
      file: req.file,
    });

    const io = req.app.locals.io;
    emitNewMessage(io, message);
    res.status(201).json({ data: message });
  }

  static async store(req: Request, res: Response): Promise<void> {
    const body = z
      .object({
        content: sanitizedString(z.string().min(1).max(20000)).optional(),
        receiverId: z.string().min(1).optional(),
        conversationId: z.string().min(1).optional(),
        type: z.string().optional(),
      })
      .parse(req.body);

    if (body.conversationId) {
      const message = await ChatMessageService.send({
        conversationId: body.conversationId,
        actorId: req.user!.userId,
        content: body.content,
      });
      const io = req.app.locals.io;
      emitNewMessage(io, message);
      res.status(201).json({ data: message });
      return;
    }

    throw new AppError('conversationId is required.', 400);
  }

  static async markConversationRead(req: Request, res: Response): Promise<void> {
    const result = await ChatMessageService.markRead(req.params.conversationId, req.user!.userId);
    emitMessagesRead(req.app.locals.io, {
      conversationId: req.params.conversationId,
      readerId: req.user!.userId,
      participantIds: result.participantIds,
      readAt: result.readAt,
    });
    res.json({ success: true, updated: result.updated, readAt: result.readAt });
  }

  static async downloadAttachment(req: Request, res: Response): Promise<void> {
    const { full, fileName } = await ChatMessageService.attachmentPath(
      req.params.conversationId,
      req.user!.userId,
      req.params.fileName,
    );
    res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/^.*?-/, '')}"`);
    res.sendFile(full);
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
