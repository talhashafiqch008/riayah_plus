import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { DisputeController } from '../controllers/disputes/DisputeController';

const router = Router();

// Authenticated user routes
router.get('/', authenticate, DisputeController.list);
router.get('/:disputeId', authenticate, DisputeController.show);
router.post('/:disputeId/evidence', authenticate, DisputeController.addEvidence);

// Admin routes
router.get('/admin/all', authenticate, requireAdmin, DisputeController.adminList);
router.post('/admin/:disputeId/resolve', authenticate, requireAdmin, DisputeController.resolve);

export default router;
