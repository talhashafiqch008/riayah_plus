import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { RoleNavBadgesController } from '../controllers/RoleNavBadgesController';

const router = Router();

router.use(authenticate);
router.get('/:shellKey/nav-badges', RoleNavBadgesController.get);

export default router;
