import { Router } from 'express';
import { IntakeController } from '../controllers/patients/IntakeController';
import {
  IntakeDocumentController,
  intakeDocUpload,
} from '../controllers/patients/IntakeDocumentController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator, requireFamilyOrCoordinator } from '../middleware/rbac';
import { documentLimiter } from '../middleware/rateLimiter';

const router = Router();
router.use(authenticate);

router.post('/', IntakeController.submit);
router.get('/queue', requireCareCoordinator, IntakeController.queue);

router.post('/documents/presign', documentLimiter, (req, res, next) => {
  IntakeDocumentController.presign(req, res).catch(next);
});
router.post('/documents/confirm', documentLimiter, (req, res, next) => {
  IntakeDocumentController.confirm(req, res).catch(next);
});
router.post('/documents', documentLimiter, (req, res, next) => {
  intakeDocUpload(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return next(err.status ? err : Object.assign(new Error(message), { status: 422 }));
    }
    return IntakeDocumentController.upload(req, res).catch(next);
  });
});
router.get('/documents/:id/download', documentLimiter, (req, res, next) => {
  IntakeDocumentController.download(req, res).catch(next);
});

router.get('/:id', IntakeController.show);
router.patch('/:id', requireFamilyOrCoordinator, IntakeController.updateRequest);
router.patch('/:id/status', requireFamilyOrCoordinator, IntakeController.updateStatus);
router.patch('/:id/urgency', requireCareCoordinator, IntakeController.updateUrgency);
router.post('/:id/review', requireCareCoordinator, IntakeController.review);

export default router;
