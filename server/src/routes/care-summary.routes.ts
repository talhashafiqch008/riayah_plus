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
  res.json({
    data: {
      content:
        'Riayah Plus Privacy Policy v2.0 (M2). See /api/privacy-policy for the full summary covering retention, DPO contact, cookies, and data-subject rights.',
      version: '2.0.0-m2',
      updatedAt: '2026-07-22',
      dpoEmail: 'privacy@riayahplus.com',
    },
  }),
);
router.get('/terms-of-service', (_req, res) =>
  res.json({
    data: {
      content: 'Riayah Plus Terms of Service v2.0 (M2). See /api/terms-of-service for details.',
      version: '2.0.0-m2',
      updatedAt: '2026-07-22',
    },
  }),
);

export default router;
