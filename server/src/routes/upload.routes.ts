import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import controller, { uploadMiddleware } from '../controllers/DocumentController';

const router = Router();

router.use(authenticate);

router.post('/', uploadMiddleware, controller.uploadFile.bind(controller));

export default router;
