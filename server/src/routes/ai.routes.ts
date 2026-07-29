import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AIChatController } from '../controllers/ai/AIChatController';
import { AISessionController } from '../controllers/ai/AISessionController';
import { GeminiChatService } from '../services/GeminiChatService';
import aiDoctorController from '../controllers/AIDoctorController';
import { z } from 'zod';

const router = Router();

// Note: POST /ai/callbacks/care-plan-draft is registered in routes/index.ts
// BEFORE auth.routes (auth.routes' global authenticate would otherwise 401 it).

// ── Public (unauthenticated) Gemini endpoint ──────────────────────────────────
router.post('/public/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, sessionId } = z.object({
      message: z.string().min(1).max(1000),
      sessionId: z.string().optional(),
    }).parse(req.body);

    const convId = sessionId ?? `public-${Date.now()}`;
    const reply = await GeminiChatService.sendMessage('public', convId, message);
    res.json({ success: true, reply, sessionId: convId });
  } catch (err) {
    next(err);
  }
});

// ── Authenticated chat ────────────────────────────────────────────────────────
router.post('/chat', authenticate, AIChatController.sendMessage);
router.post('/chat/stream', authenticate, AIChatController.streamMessage);
router.get('/chat/history', authenticate, AIChatController.history);
router.delete('/chat', authenticate, AIChatController.clearConversation);

// ── AI session management ─────────────────────────────────────────────────────
router.get('/sessions', authenticate, AISessionController.list);
router.post('/sessions', authenticate, AISessionController.create);
router.get('/sessions/:id', authenticate, AISessionController.show);
router.patch('/sessions/:id', authenticate, AISessionController.update);
router.delete('/sessions/:id', authenticate, AISessionController.delete);
router.post('/sessions/:id/message', authenticate, AISessionController.sendMessage);

// ── AI Doctor (clinical system prompt) ────────────────────────────────────────
router.post('/doctor-chat', authenticate, aiDoctorController.doctorChat.bind(aiDoctorController));

// ── Legacy session API ─────────────────────────────────────────────────────────
router.post('/session/start', authenticate, aiDoctorController.startSession.bind(aiDoctorController));
router.get('/session/status', authenticate, aiDoctorController.sessionStatus.bind(aiDoctorController));
router.post('/session/end', authenticate, aiDoctorController.endSession.bind(aiDoctorController));
router.post('/history/:sessionId/clear', authenticate, aiDoctorController.clearSessionHistory.bind(aiDoctorController));

export default router;
