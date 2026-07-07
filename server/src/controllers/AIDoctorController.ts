import { Request, Response, NextFunction } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const DOCTOR_SYSTEM_PROMPT = `You are a qualified medical AI assistant for the Raiyah care platform. 
You provide evidence-based medical information, symptom guidance, and care coordination support.

IMPORTANT CONSTRAINTS:
- Always recommend consulting a licensed healthcare professional for diagnosis and treatment
- Never prescribe medications or provide dosage recommendations
- Flag emergency symptoms (chest pain, difficulty breathing, stroke signs) immediately
- Maintain strict patient confidentiality
- Use clear, compassionate language appropriate for patients
- Reference clinical guidelines where relevant (NICE, WHO, local Qatar MOH guidelines)`;

export class AIDoctorController {
  // POST /ai/doctor-chat
  async doctorChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { message, sessionId, context } = req.body;
      if (!message) throw new AppError('message is required', 400);

      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction: DOCTOR_SYSTEM_PROMPT,
      });

      const chat = model.startChat({});
      const result = await chat.sendMessage(message);
      const reply = result.response.text();

      res.json({ data: { reply, sessionId } });
    } catch (err) {
      next(err);
    }
  }

  // POST /ai/session/start — legacy session start (maps to Conversation)
  async startSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { title, context } = req.body;

      const session = await prisma.conversation.create({
        data: {
          type: 'ai',
          title: title ?? 'New Chat',
          participantLinks: { create: { userId } },
        },
      });
      res.status(201).json({ data: { sessionId: session.id, session } });
    } catch (err) {
      next(err);
    }
  }

  // GET /ai/session/status
  async sessionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.query as Record<string, string>;

      if (sessionId) {
        const session = await prisma.conversation.findFirst({
          where: { id: sessionId, participantLinks: { some: { userId } } },
          include: { _count: { select: { messages: true } } },
        });
        if (!session) throw new AppError('Session not found', 404);
        res.json({
          data: {
            sessionId: session.id,
            active: true,
            messageCount: session._count.messages,
            createdAt: session.createdAt,
          },
        });
      } else {
        const recentSession = await prisma.conversation.findFirst({
          where: { type: 'ai', participantLinks: { some: { userId } } },
          orderBy: { updatedAt: 'desc' },
        });
        res.json({ data: { hasActiveSession: !!recentSession, recentSessionId: recentSession?.id } });
      }
    } catch (err) {
      next(err);
    }
  }

  // POST /ai/session/end
  async endSession(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.body;
      if (!sessionId) throw new AppError('sessionId is required', 400);

      const session = await prisma.conversation.findFirst({
        where: { id: sessionId, participantLinks: { some: { userId } } },
      });
      if (!session) throw new AppError('Session not found', 404);

      await prisma.conversation.update({
        where: { id: sessionId },
        data: { title: (session.title ?? 'Chat') + ' (ended)' },
      });
      res.json({ message: 'Session ended' });
    } catch (err) {
      next(err);
    }
  }

  // POST /ai/history/:sessionId/clear
  async clearSessionHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { sessionId } = req.params;

      const session = await prisma.conversation.findFirst({
        where: { id: sessionId, participantLinks: { some: { userId } } },
      });
      if (!session) throw new AppError('Session not found', 404);

      await prisma.message.deleteMany({ where: { conversationId: sessionId } });
      res.json({ message: 'Session history cleared' });
    } catch (err) {
      next(err);
    }
  }
}

export default new AIDoctorController();
