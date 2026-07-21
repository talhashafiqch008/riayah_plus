import { Router } from 'express';
import { IntakeController } from '../controllers/patients/IntakeController';
import {
  IntakeDocumentController,
  intakeDocUpload,
} from '../controllers/patients/IntakeDocumentController';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator } from '../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/', IntakeController.submit);
router.get('/queue', requireCareCoordinator, IntakeController.queue);

router.post('/documents/presign', (req, res, next) => {
  IntakeDocumentController.presign(req, res).catch(next);
});
router.post('/documents/confirm', (req, res, next) => {
  IntakeDocumentController.confirm(req, res).catch(next);
});
router.post('/documents', (req, res, next) => {
  intakeDocUpload(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      return next(err.status ? err : Object.assign(new Error(message), { status: 422 }));
    }
    return IntakeDocumentController.upload(req, res).catch(next);
  });
});
router.get('/documents/:id/download', (req, res, next) => {
  IntakeDocumentController.download(req, res).catch(next);
});

router.get('/:id', IntakeController.show);
router.patch('/:id', IntakeController.updateRequest);
router.patch('/:id/status', IntakeController.updateStatus);
router.post('/:id/review', requireCareCoordinator, IntakeController.review);

export default router;
