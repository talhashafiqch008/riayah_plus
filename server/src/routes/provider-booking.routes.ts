import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import providerController from '../controllers/provider/ProviderBookingController';
import pricingController from '../controllers/provider/ProviderPricingController';
import payoutController from '../controllers/provider/ProviderPayoutController';
import reportController from '../controllers/provider/ProviderReportController';
import marketplaceController from '../controllers/provider/MarketplaceOfferController';

const router = Router();

const providerRoles = ['provider', 'doctor', 'nurse', 'physiotherapist',
  'occupational_therapist', 'speech_therapist', 'psychologist', 'dietitian',
  'support_worker', 'cleaner', 'gardener', 'driver', 'companion', 'nanny',
  'caregiver', 'therapist'];

router.use(authenticate, requireRole(providerRoles));

// Booking management
router.get('/bookings/requests', providerController.listRequests.bind(providerController));
router.post('/bookings/:id/action', providerController.takeAction.bind(providerController));
router.post('/bookings/:id/notes', providerController.addNotes.bind(providerController));

// Client management
router.get('/clients', providerController.listClients.bind(providerController));
router.get('/clients/:clientId', providerController.getClient.bind(providerController));

// Self-refund
router.post('/self-refund', providerController.selfRefund.bind(providerController));

// Reports
router.get('/reports', reportController.list.bind(reportController));
router.post('/reports', reportController.create.bind(reportController));
router.get('/reports/:id', reportController.getOne.bind(reportController));
router.delete('/reports/:id', reportController.remove.bind(reportController));

// Marketplace offers
router.get('/marketplace-offers', marketplaceController.listMine.bind(marketplaceController));
router.post('/marketplace-offers', marketplaceController.create.bind(marketplaceController));
router.put('/marketplace-offers/:id', marketplaceController.update.bind(marketplaceController));
router.delete('/marketplace-offers/:id', marketplaceController.remove.bind(marketplaceController));

export default router;
