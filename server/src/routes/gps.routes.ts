import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { GPSController } from '../controllers/gps/GPSController';

const router = Router();
router.use(authenticate);

router.get('/active-workers', GPSController.activeWorkers);
router.get('/logs', GPSController.logs);
router.post('/sessions/:id/validate', GPSController.validate);
router.post('/sessions/:id/checkin', GPSController.checkin);
router.post('/sessions/:id/checkout', GPSController.checkout);
router.get('/sessions/:id', GPSController.replay);

export default router;
