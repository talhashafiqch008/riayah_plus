import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import controller from '../controllers/CareSummaryController';
import matchingController from '../controllers/CareMatchingController';
import bookingExtrasController from '../controllers/booking/BookingExtrasController';

const router = Router();

router.use(authenticate);

router.get('/care-summary', controller.getSummary.bind(controller));
router.get('/care-budget', controller.getBudget.bind(controller));
router.get('/care-timeline', controller.getTimeline.bind(controller));

router.post('/matching/find-providers', matchingController.findProviders.bind(matchingController));
router.post('/matching/save', matchingController.saveMatch.bind(matchingController));
router.get('/matching/history/:careseekerId', matchingController.getHistory.bind(matchingController));

router.get('/access-status', bookingExtrasController.getAccessStatus.bind(bookingExtrasController));
router.get('/bookings/upcoming', bookingExtrasController.getUpcoming.bind(bookingExtrasController));

router.get('/privacy-policy', (_req, res) =>
  res.json({ data: { content: 'Raiyah Privacy Policy', version: '1.0', updatedAt: '2025-01-01' } })
);
router.get('/terms-of-service', (_req, res) =>
  res.json({ data: { content: 'Raiyah Terms of Service', version: '1.0', updatedAt: '2025-01-01' } })
);

export default router;
