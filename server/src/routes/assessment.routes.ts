import { Router } from 'express';
import { AssessmentController } from '../controllers/patients/AssessmentController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/clinicians', requireCareCoordinator, AssessmentController.clinicians);
router.get('/', AssessmentController.index);
router.post('/', requireCareCoordinator, AssessmentController.store);
router.get('/:id', AssessmentController.show);
router.patch('/:id', AssessmentController.update);

export default router;
