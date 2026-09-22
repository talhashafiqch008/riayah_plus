import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { bookingLimiter } from '../middleware/rateLimiter';
import { AppError } from '../middleware/errorHandler';
import { WalletService } from '../services/WalletService';
import { NotificationService } from '../services/NotificationService';
import { AuditService } from '../services/AuditService';
import { BookingPaymentController } from '../controllers/payments/BookingPaymentController';
import { DisputeController } from '../controllers/disputes/DisputeController';
import { NoShowPenaltyService } from '../services/NoShowPenaltyService';
import extrasController from '../controllers/booking/BookingExtrasController';
import { assertAppointmentTransition } from '../utils/stateMachine';
import {
  assertBookingAccess,
  assertBookingClient,
  assertBookingProvider,
  loadBookingOrThrow,
} from '../utils/bookingAccess';
import { InvoiceService } from '../services/InvoiceService';
import { parsePagination } from '../utils/pagination';
import { queryString } from '../utils/queryScalar';

const router = Router();
router.use(authenticate);

// Create booking
router.post('/', bookingLimiter, async (req: Request, res: Response) => {
  const data = z.object({
    providerId: z.string(),
    serviceType: z.string().optional(),
    scheduledAt: z.string(),
    durationHours: z.number().optional(),
    notes: z.string().optional(),
  }).parse(req.body);

  const booking = await prisma.booking.create({
    data: {
      clientId: req.user!.userId,
      providerId: data.providerId,
      serviceType: data.serviceType,
      scheduledAt: new Date(data.scheduledAt),
      durationHours: data.durationHours,
      notes: data.notes,
      status: 'pending',
    },
  });

  await NotificationService.create({
    userId: data.providerId,
    title: 'New Booking Request',
    body: 'You have a new booking request.',
    type: 'new_booking',
    data: { bookingId: booking.id },
  });

  res.status(201).json({ success: true, booking });
});

// Get user bookings
router.get('/', async (req: Request, res: Response) => {
        const { page, limit, skip, take } = parsePagination(req.query);
      const status = queryString(req.query.status);
  const userId = req.user!.userId;
  const role = req.user!.role;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;

  const isProvider = ['provider','doctor','nurse','clinical_staff','support_worker','care_coordinator',
    'physiotherapist','occupational_therapist','speech_therapist','psychologist','dietitian',
    'cleaner','gardener','driver','companion','nanny','caregiver','therapist'].includes(role);

  if (isProvider) where.providerId = userId;
  else where.clientId = userId;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({ where, orderBy: { scheduledAt: 'desc' }, skip, take }),
    prisma.booking.count({ where }),
  ]);

  res.json({ bookings, total });
});

// Upcoming (must be before /:id)
router.get('/upcoming', extrasController.getUpcoming.bind(extrasController));

// Get single booking
router.get('/:id', async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({
    where: { id: req.params.id },
    include: { client: { select: { id: true, name: true } }, provider: { select: { id: true, name: true } }, payment: true },
  });
  if (!booking) throw new AppError('Booking not found.', 404);
  assertBookingAccess(req, booking);

  res.json({ booking });
});

// Accept/reject booking — provider accepts/rejects; client may cancel
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status, reason } = z.object({ status: z.enum(['accepted','rejected','cancelled']), reason: z.string().optional() }).parse(req.body);

  const existing = await loadBookingOrThrow(req.params.id);
  if (status === 'cancelled') {
    assertBookingAccess(req, existing);
  } else {
    assertBookingProvider(req, existing);
  }

  assertAppointmentTransition(existing.status, status);

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status, cancelReason: reason },
  });
  await NotificationService.create({
    userId: booking.clientId,
    title: `Booking ${status}`,
    body: reason ?? `Your booking has been ${status}.`,
    type: 'booking_status',
    data: { bookingId: booking.id, status },
  });
  res.json({ data: booking });
});

// Start booking
router.post('/:id/start', async (req: Request, res: Response) => {
  const existing = await loadBookingOrThrow(req.params.id);
  assertBookingProvider(req, existing);

  assertAppointmentTransition(existing.status, 'in_progress');

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: 'in_progress', startedAt: new Date() },
  });
  res.json({ data: booking });
});

// Complete booking
router.post('/:id/complete', async (req: Request, res: Response) => {
  const existing = await loadBookingOrThrow(req.params.id);
  assertBookingProvider(req, existing);

  if (existing.status === 'completed') {
    const invoice = await InvoiceService.tryFromBooking(existing.id, req.user!.userId);
    const booking = await prisma.booking.findUnique({ where: { id: existing.id } });
    res.json({ data: booking, invoice: invoice ?? undefined });
    return;
  }

  assertAppointmentTransition(existing.status, 'completed');

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { status: 'completed', completedAt: new Date() },
  });
  await AuditService.log({ userId: req.user!.userId, action: 'booking_completed', entity: 'Booking', entityId: booking.id, req });

  const invoice = await InvoiceService.tryFromBooking(booking.id, req.user!.userId);
  res.json({ data: booking, invoice: invoice ?? undefined });
});

// Pay with credits
router.post('/:id/pay-with-credits', bookingLimiter, async (req: Request, res: Response) => {
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) throw new AppError('Booking not found.', 404);
  assertBookingClient(req, booking);
  if (!booking.totalAmount) throw new AppError('Booking has no amount set.', 422);

  assertAppointmentTransition(booking.status, 'accepted');

  await WalletService.holdEscrow(req.user!.userId, Number(booking.totalAmount));
  await prisma.booking.update({ where: { id: booking.id }, data: { paidWithCredits: true, status: 'accepted' } });

  res.json({ message: 'Booking paid with credits and accepted.' });
});

// Counter offer
router.post('/:id/counter-offer', async (req: Request, res: Response) => {
  const { amount, notes } = z.object({ amount: z.number(), notes: z.string().optional() }).parse(req.body);
  const existing = await loadBookingOrThrow(req.params.id);
  assertBookingProvider(req, existing);

  const booking = await prisma.booking.update({
    where: { id: req.params.id },
    data: { totalAmount: amount, isCounterOffered: true, counterOfferAt: new Date(), counterOffer: { amount, notes } as object },
  });
  await NotificationService.create({
    userId: booking.clientId,
    title: 'Counter Offer Received',
    body: `Provider offered a new rate of ${amount}`,
    type: 'counter_offer',
    data: { bookingId: booking.id },
  });
  res.json({ data: booking });
});

// Mark no-show (client didn't show up — penalty applied)
router.post('/:id/no-show', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await loadBookingOrThrow(req.params.id);
    assertBookingProvider(req, existing);
    await NoShowPenaltyService.applyClientNoShow(req.params.id);
    res.json({ success: true, message: 'No-show penalty applied.' });
  } catch (err) {
    next(err);
  }
});

// Mark provider no-show (provider didn't show up — full refund to client)
router.post('/:id/provider-no-show', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await loadBookingOrThrow(req.params.id);
    assertBookingClient(req, existing);
    await NoShowPenaltyService.applyProviderNoShow(req.params.id);
    res.json({ success: true, message: 'Provider no-show recorded. Full refund issued.' });
  } catch (err) {
    next(err);
  }
});

// GPS clock-in / clock-out
router.post('/:id/clock-in', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude } = z.object({ latitude: z.number(), longitude: z.number() }).parse(req.body);
    const booking = await loadBookingOrThrow(req.params.id);
    assertBookingProvider(req, booking);

    const { GPSService } = await import('../services/GPSService');
    const geofenceResult = await GPSService.validateCheckin({ lat: latitude, lng: longitude }, booking.clientId);
    await GPSService.logCheckin(req.user!.userId, null, { lat: latitude, lng: longitude }, geofenceResult);

    assertAppointmentTransition(booking.status, 'in_progress');

    await prisma.booking.update({ where: { id: req.params.id }, data: { status: 'in_progress', startedAt: new Date() } });
    res.json({ success: true, message: 'Clocked in successfully.' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/clock-out', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { latitude, longitude } = z.object({ latitude: z.number(), longitude: z.number() }).parse(req.body);
    const booking = await loadBookingOrThrow(req.params.id);
    assertBookingProvider(req, booking);

    const { GPSService } = await import('../services/GPSService');
    await GPSService.logCheckout(req.user!.userId, null, { lat: latitude, lng: longitude });

    res.json({ success: true, message: 'Clocked out successfully.' });
  } catch (err) {
    next(err);
  }
});

// Payment for booking (controllers enforce client ownership)
router.post('/:bookingId/pay', bookingLimiter, BookingPaymentController.initiatePayment);
router.post('/:bookingId/payment/verify', BookingPaymentController.verifyPayment);
router.post('/:bookingId/refund', BookingPaymentController.selfRefund);

// Dispute for booking (service enforces party ownership)
router.post('/:bookingId/dispute', DisputeController.open);

// Booking extras (controllers enforce client/provider ownership)
router.put('/:id', extrasController.updateBooking.bind(extrasController));
router.post('/:id/cancel', extrasController.cancelBooking.bind(extrasController));
router.post('/:id/counter-offer/respond', extrasController.respondToCounterOffer.bind(extrasController));

export default router;
