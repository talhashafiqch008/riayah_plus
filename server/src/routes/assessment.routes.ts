import { Router } from 'express';
import { AssessmentController } from '../controllers/patients/AssessmentController';
import { authenticate } from '../middleware/auth';
import { requireClinicalOrCoordinator, requireFamilyOrCoordinator } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

// Clinicians list + schedule: coordinator OR family (own episode) — enforced in controller
router.get('/clinicians', requireFamilyOrCoordinator, AssessmentController.clinicians);
router.get('/', AssessmentController.index);
router.post('/', requireFamilyOrCoordinator, AssessmentController.store);
router.get('/:id', AssessmentController.show);
router.patch('/:id', requireClinicalOrCoordinator, AssessmentController.update);

export default router;
