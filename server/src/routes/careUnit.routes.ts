import { Router } from 'express';
import { CareUnitController } from '../controllers/patients/CareUnitController';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', CareUnitController.index);
router.post('/', CareUnitController.store);
router.get('/:id', CareUnitController.show);
router.patch('/:id', CareUnitController.update);

router.get('/:id/patients', CareUnitController.listPatients);
router.post('/:id/patients', CareUnitController.createPatient);
router.patch('/:id/patients/:patientId', CareUnitController.updatePatient);
router.get('/:id/patients/:patientId/revisions', CareUnitController.patientRevisions);

export default router;
