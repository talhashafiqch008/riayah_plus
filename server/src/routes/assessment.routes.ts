import { Router } from 'express';
import { AssessmentController } from '../controllers/patients/AssessmentController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Clinicians list + schedule: coordinator OR family (own episode) — enforced in controller
router.get('/clinicians', AssessmentController.clinicians);
router.get('/', AssessmentController.index);
router.post('/', AssessmentController.store);
router.get('/:id', AssessmentController.show);
router.patch('/:id', AssessmentController.update);

export default router;
