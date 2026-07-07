import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import controller from '../controllers/provider/MarketplaceOfferController';
import providerController from '../controllers/provider/ProviderBookingController';

const router = Router();

// Public browse
router.get('/offers', controller.listPublic.bind(controller));
router.get('/offers/:id', controller.getOne.bind(controller));

// Book an offer (requires auth)
router.post('/offers/:id/book', authenticate, controller.bookOffer.bind(controller));

// Provider available slots (public read, no auth required)
router.get('/providers/:providerId/slots', providerController.getSlots.bind(providerController));

export default router;
