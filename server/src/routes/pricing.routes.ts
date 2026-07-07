import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import controller from '../controllers/provider/ProviderPricingController';

const router = Router();

router.use(authenticate, requireRole(['provider', 'doctor', 'nurse', 'physiotherapist',
  'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian',
  'support_worker', 'cleaner', 'gardener', 'driver', 'companion', 'nanny',
  'caregiver', 'therapist']));

router.get('/pricing-rules', controller.listRules.bind(controller));
router.post('/pricing-rules', controller.createRule.bind(controller));
router.put('/pricing-rules/:id', controller.updateRule.bind(controller));
router.delete('/pricing-rules/:id', controller.deleteRule.bind(controller));

router.get('/pricing', controller.listPricing.bind(controller));
router.post('/pricing', controller.createPricing.bind(controller));
router.delete('/pricing/:id', controller.deletePricing.bind(controller));
router.post('/pricing/calculate', controller.calculatePrice.bind(controller));

export default router;
