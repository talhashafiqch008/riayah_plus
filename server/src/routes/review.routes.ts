import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { ReviewController } from '../controllers/reviews/ReviewController';

const router = Router();
router.use(authenticate);

router.post('/', ReviewController.create);
router.get('/my', ReviewController.myReviews);
router.get('/provider/:providerId', ReviewController.listByProvider);
router.patch('/:id', ReviewController.update);
router.delete('/:id', ReviewController.delete);

export default router;
