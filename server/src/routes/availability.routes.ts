import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { AvailabilityController } from '../controllers/scheduling/AvailabilityController';

const router = Router();
router.use(authenticate);

router.get('/', (req, res, next) => {
  AvailabilityController.index(req, res).catch(next);
});

router.post('/', (req, res, next) => {
  AvailabilityController.store(req, res).catch(next);
});

router.put('/:providerId', (req, res, next) => {
  AvailabilityController.replace(req, res).catch(next);
});

router.patch('/slots/:slotId', (req, res, next) => {
  AvailabilityController.updateSlot(req, res).catch(next);
});

router.delete('/slots/:slotId', (req, res, next) => {
  AvailabilityController.destroySlot(req, res).catch(next);
});

export default router;
