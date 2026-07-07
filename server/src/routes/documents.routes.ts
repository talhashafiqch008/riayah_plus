import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import controller, { uploadMiddleware } from '../controllers/DocumentController';

const router = Router();

router.use(authenticate);

router.get('/statistics', controller.getStatistics.bind(controller));
router.get('/type/:type', controller.getByType.bind(controller));
router.get('/:id/download', controller.downloadDocument.bind(controller));

export default router;
