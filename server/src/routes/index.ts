import { Router } from 'express';
import authRoutes from './auth.routes';
import episodeRoutes from './episode.routes';
import carePlanRoutes from './carePlan.routes';
import careUnitRoutes from './careUnit.routes';
import intakeRoutes from './intake.routes';
import assessmentRoutes from './assessment.routes';
import invoiceRoutes from './invoice.routes';
import chatRoutes from './chat.routes';
import notificationRoutes from './notification.routes';
import telehealthRoutes from './telehealth.routes';
import bookingRoutes from './booking.routes';
import providerRoutes from './provider.routes';
import documentRoutes from './document.routes';
import shiftRoutes from './shift.routes';
import walletRoutes from './wallet.routes';
import adminRoutes from './admin.routes';
import whatsappRoutes from './whatsapp.routes';
import publicRoutes from './public.routes';
import disputeRoutes from './dispute.routes';
import paymentRoutes from './payment.routes';
import marketplaceRoutes from './marketplace.routes';
import reviewRoutes from './review.routes';
import aiRoutes from './ai.routes';
import careManagementRoutes from './caremanagement.routes';
import agencyRoutes from './agency.routes';
import providerDashboardRoutes from './provider-dashboard.routes';
import privacyRoutes from './privacy.routes';
import lmsRoutes from './lms.routes';
import meetingsRoutes from './meetings.routes';
import careOrdersRoutes from './care-orders.routes';
// New routes (Phase 2+ parity)
import pricingRoutes from './pricing.routes';
import payoutRoutes from './payout.routes';
import providerBookingRoutes from './provider-booking.routes';
import marketplaceOffersRoutes from './marketplace-offers.routes';
import clientRoutes from './client.routes';
import documentsRoutes from './documents.routes';
import storageRoutes from './storage.routes';
import uploadRoutes from './upload.routes';
import careSummaryRoutes from './care-summary.routes';
import tasksRoutes from './tasks.routes';
import receiptsRoutes from './receipts.routes';
import { auditMiddleware } from '../middleware/auditMiddleware';
import { authenticate } from '../middleware/auth';
import { requireCareCoordinator } from '../middleware/rbac';
import { IntakeController } from '../controllers/patients/IntakeController';

const router = Router();

// Health check (registered before audit middleware — no HTTP audit row)
router.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Automatic audit logging for all mutating API requests (POST/PUT/PATCH/DELETE)
router.use(auditMiddleware);

// Public routes
router.use('/', publicRoutes);

// Auth & user management
router.use('/', authRoutes);

// Care domain (M2–M3)
router.use('/episodes', episodeRoutes);
router.use('/care-plans', carePlanRoutes);
router.use('/care-units', careUnitRoutes);
router.use('/intake', intakeRoutes);
router.use('/assessments', assessmentRoutes);
router.get('/coordinator/intake-queue', authenticate, requireCareCoordinator, IntakeController.queue);

// Telehealth & GPS (M4–M5)
router.use('/telehealth', telehealthRoutes);

// Billing (M4)
router.use('/invoices', invoiceRoutes);

// Chat
router.use('/chat', chatRoutes);
router.use('/conversations', chatRoutes);

// Notifications
router.use('/notifications', notificationRoutes);

// Bookings
router.use('/bookings', bookingRoutes);
router.use('/sessions', bookingRoutes);

// Providers
router.use('/providers', providerRoutes);
router.use('/matching', providerRoutes);

// Documents
router.use('/documents', documentRoutes);

// Shifts & tasks
router.use('/shifts', shiftRoutes);

// Wallet & credits
router.use('/wallet', walletRoutes);

// Payment methods
router.use('/payments', paymentRoutes);

// Disputes
router.use('/disputes', disputeRoutes);

// Marketplace (care needs + bidding)
router.use('/care-needs', marketplaceRoutes);

// Reviews
router.use('/reviews', reviewRoutes);

// AI chat (Gemini)
router.use('/ai', aiRoutes);

// Care management (recipients, consents, family members, client profile, reports, dashboard)
router.use('/client', careManagementRoutes);

// Care orders (formal funded service orders)
router.use('/care-orders', careOrdersRoutes);

// Family members (also accessible at top level)
router.use('/family-members', careManagementRoutes);

// Agency & staff management
router.use('/agency', agencyRoutes);

// Provider dashboard
router.use('/provider-dashboard', providerDashboardRoutes);

// Privacy, GDPR, document requests, emergency (grouped)
router.use('/', privacyRoutes);

// LMS — courses, enrollments, quizzes
router.use('/courses', lmsRoutes);

// Meetings — scheduling, LiveKit, recordings
router.use('/meetings', meetingsRoutes);
router.use('/', meetingsRoutes); // livekit webhook at /livekit/webhook

// Admin (prefixed)
router.use('/admin', adminRoutes);

// WhatsApp — webhook + user-facing + admin routes
router.use('/webhook/whatsapp', whatsappRoutes);
router.use('/whatsapp', whatsappRoutes);

// Provider pricing & pricing rules
router.use('/provider', pricingRoutes);

// Provider payouts
router.use('/provider/payouts', payoutRoutes);

// Provider booking management, reports, marketplace offers, clients, self-refund
router.use('/provider', providerBookingRoutes);

// Public marketplace offers + provider available slots
router.use('/marketplace', marketplaceOffersRoutes);
router.use('/providers', marketplaceOffersRoutes);

// Client-side offer and care-needs paths
router.use('/client', clientRoutes);

// Document download/stats/type + upload + signed URLs
router.use('/documents', documentsRoutes);
router.use('/storage', storageRoutes);
router.use('/upload', uploadRoutes);

// Care summary, budget, timeline + matching + access-status + privacy/terms
router.use('/', careSummaryRoutes);

// Tasks (root-level)
router.use('/tasks', tasksRoutes);

// Receipts
router.use('/receipts', receiptsRoutes);

export const apiRouter = router;
export default router;
