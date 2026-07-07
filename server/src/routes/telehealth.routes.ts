import { Router } from 'express';
import { TelehealthController } from '../controllers/telehealth/TelehealthController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.post('/token', TelehealthController.generateToken);
router.post('/rooms', TelehealthController.createRoom);
router.get('/rooms/:roomName', TelehealthController.getRoomInfo);
router.post('/checkin', TelehealthController.sessionCheckin);
router.post('/checkout', TelehealthController.sessionCheckout);

export default router;
