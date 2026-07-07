import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import controller from '../controllers/client/ClientOfferController';

const router = Router();

const clientRoles = ['client', 'careseeker', 'user'];

router.use(authenticate, requireRole(clientRoles));

router.get('/offers', controller.listOffers.bind(controller));
router.post('/offers/:id/accept', controller.acceptOffer.bind(controller));
router.post('/offers/:id/reject', controller.rejectOffer.bind(controller));

router.post('/care-needs', controller.createCareNeed.bind(controller));
router.get('/care-needs', controller.listCareNeeds.bind(controller));
router.post('/care-needs/bids/:id/accept', controller.acceptBid.bind(controller));

export default router;
