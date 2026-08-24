import { Router } from 'express';
import { webhookLimiter } from '../middleware/rateLimiter';
import { MeetingSchedulerController } from '../controllers/telehealth/MeetingSchedulerController';

/**
 * Public LiveKit webhooks — MUST be mounted before auth.routes.
 * auth.routes installs `router.use(authenticate)` at `/`, which would 401 these otherwise.
 */
const router = Router();

router.post('/webhook', webhookLimiter, MeetingSchedulerController.livekitWebhook);

export default router;
