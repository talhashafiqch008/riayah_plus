import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import controller from '../controllers/provider/ProviderPayoutController';

const router = Router();

const providerRoles = ['provider', 'doctor', 'nurse', 'physiotherapist',
  'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian',
  'support_worker', 'cleaner', 'gardener', 'driver', 'companion', 'nanny',
  'caregiver', 'therapist'];

router.use(authenticate, requireRole(providerRoles));

router.get('/balance', controller.getBalance.bind(controller));
router.get('/', controller.listPayouts.bind(controller));
router.post('/', controller.requestPayout.bind(controller));
router.delete('/:id', controller.cancelPayout.bind(controller));

export default router;
