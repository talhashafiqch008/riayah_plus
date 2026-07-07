import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { EmergencyController } from '../controllers/emergency/EmergencyController';

const router = Router();
router.use(authenticate);

router.post('/', EmergencyController.raise);
router.get('/', EmergencyController.list);
router.post('/:id/respond', EmergencyController.respond);

export default router;
