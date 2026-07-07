import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { MeetingSchedulerController } from '../controllers/telehealth/MeetingSchedulerController';

const router = Router();

// LiveKit webhook (no auth — signed by LiveKit)
router.post('/livekit/webhook', MeetingSchedulerController.livekitWebhook);

// Authenticated meeting routes
router.post('/', authenticate, MeetingSchedulerController.schedule);
router.get('/', authenticate, MeetingSchedulerController.list);
router.post('/:id/join', authenticate, MeetingSchedulerController.join);
router.post('/:id/end', authenticate, MeetingSchedulerController.end);
router.post('/:id/cancel', authenticate, MeetingSchedulerController.cancel);
router.post('/:id/start-recording', authenticate, MeetingSchedulerController.startRecording);
router.get('/:id/recording', authenticate, MeetingSchedulerController.getRecording);

export default router;
