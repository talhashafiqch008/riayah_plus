import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireProvider, requireClient } from '../middleware/rbac';
import { CareNeedController } from '../controllers/marketplace/CareNeedController';

const router = Router();
router.use(authenticate);

// Care needs
router.post('/', CareNeedController.create);
router.get('/', CareNeedController.list);
router.get('/:id', CareNeedController.show);
router.put('/:id', CareNeedController.update);
router.delete('/:id', CareNeedController.delete);

// Price estimate (public auth route)
router.post('/price-estimate', CareNeedController.priceEstimate);

// Bidding — providers
router.post('/:id/bids', CareNeedController.placeBid);
router.patch('/:id/bids/:bidId/accept', CareNeedController.acceptBid);
router.patch('/:id/bids/:bidId/reject', CareNeedController.rejectBid);
router.delete('/:id/bids/:bidId', CareNeedController.withdrawBid);

// Careseeker counter-offer on a bid
router.post('/:id/bids/:bidId/counter-offer', CareNeedController.counterOffer);

export default router;
