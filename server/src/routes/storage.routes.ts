import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import controller, { uploadMiddleware } from '../controllers/DocumentController';

const router = Router();

router.use(authenticate);

// GET /storage/signed-url?key=...
router.get('/signed-url', controller.getSignedUrl.bind(controller));

export default router;
