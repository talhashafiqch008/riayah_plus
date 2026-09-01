import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { AIChatController } from '../controllers/ai/AIChatController';
import { AISessionController } from '../controllers/ai/AISessionController';
import { GeminiChatService } from '../services/GeminiChatService';
import aiDoctorController from '../controllers/AIDoctorController';
import { publicAiLimiter, aiLimiter } from '../middleware/rateLimiter';
import { assertAiChatConsent } from '../utils/aiChatConsent';
import { assertContentPolicy } from '../utils/contentPolicy';
import { z } from 'zod';

const router = Router();

// ── Authenticated Gemini chat (legacy path; prefer /chat) ───────────────────────
router.post('/public/chat', publicAiLimiter, authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, sessionId } = z.object({
      message: z.string().min(1).max(1000),
      sessionId: z.string().optional(),
    }).parse(req.body);

    assertContentPolicy(message);
    const userId = req.user!.userId;
    await assertAiChatConsent(userId);

    const convId = sessionId ?? `ai-${userId}`;
    const reply = await GeminiChatService.sendMessage(userId, convId, message);
    res.json({ success: true, reply, sessionId: convId });
  } catch (err) {
    next(err);
  }
});

// ── Authenticated chat ────────────────────────────────────────────────────────
router.post('/chat', aiLimiter, authenticate, AIChatController.sendMessage);
router.post('/chat/stream', aiLimiter, authenticate, AIChatController.streamMessage);
router.get('/chat/history', authenticate, AIChatController.history);
router.delete('/chat', authenticate, AIChatController.clearConversation);

// ── AI session management ─────────────────────────────────────────────────────
router.get('/sessions', authenticate, AISessionController.list);
router.post('/sessions', authenticate, AISessionController.create);
router.get('/sessions/:id', authenticate, AISessionController.show);
router.patch('/sessions/:id', authenticate, AISessionController.update);
router.delete('/sessions/:id', authenticate, AISessionController.delete);
router.post('/sessions/:id/message', aiLimiter, authenticate, AISessionController.sendMessage);

// ── AI Doctor (clinical system prompt) ────────────────────────────────────────
router.post('/doctor-chat', aiLimiter, authenticate, aiDoctorController.doctorChat.bind(aiDoctorController));

// ── Legacy session API ─────────────────────────────────────────────────────────
router.post('/session/start', authenticate, aiDoctorController.startSession.bind(aiDoctorController));
router.get('/session/status', authenticate, aiDoctorController.sessionStatus.bind(aiDoctorController));
router.post('/session/end', authenticate, aiDoctorController.endSession.bind(aiDoctorController));
router.post('/history/:sessionId/clear', authenticate, aiDoctorController.clearSessionHistory.bind(aiDoctorController));

export default router;
