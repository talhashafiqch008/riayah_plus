import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import controller from '../controllers/TaskController';

const router = Router();

router.use(authenticate);

router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));

export default router;
