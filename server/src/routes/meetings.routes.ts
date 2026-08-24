import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { MeetingSchedulerController } from '../controllers/telehealth/MeetingSchedulerController';

const router = Router();

router.post('/', authenticate, MeetingSchedulerController.schedule);
router.get('/', authenticate, MeetingSchedulerController.list);
router.post('/:id/join', authenticate, MeetingSchedulerController.join);
router.get('/:id/lobby', authenticate, MeetingSchedulerController.lobby);
router.get('/:id/context', authenticate, MeetingSchedulerController.context);
router.post('/:id/notes', authenticate, MeetingSchedulerController.addNote);
router.post('/:id/admit', authenticate, MeetingSchedulerController.admit);
router.post('/:id/end', authenticate, MeetingSchedulerController.end);
router.post('/:id/cancel', authenticate, MeetingSchedulerController.cancel);
router.post('/:id/start-recording', authenticate, MeetingSchedulerController.startRecording);
router.get('/:id/recording', authenticate, MeetingSchedulerController.getRecording);

export default router;
