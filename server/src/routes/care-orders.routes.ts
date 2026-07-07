import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { CareOrderController } from '../controllers/caremanagement/CareOrderController';

const router = Router();
router.use(authenticate);

router.post('/', CareOrderController.create);
router.get('/', CareOrderController.list);
router.get('/:id', CareOrderController.show);
router.patch('/:id', CareOrderController.update);
router.delete('/:id', CareOrderController.delete);

export default router;
