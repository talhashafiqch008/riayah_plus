import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';
import { WalletService } from '../services/WalletService';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const stripe = new Stripe(env.STRIPE_SECRET, { apiVersion: '2024-06-20' });
const router = Router();

router.use(authenticate);

// Wallet balance
router.get('/balance', async (req: Request, res: Response) => {
  const wallet = await WalletService.getBalance(req.user!.userId);
  res.json({ data: wallet });
});

// Wallet transactions
router.get('/transactions', async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const data = await WalletService.getTransactions(req.user!.userId, parseInt(page ?? '1'), parseInt(limit ?? '20'));
  res.json(data);
});

// Create Stripe top-up
router.post('/topup', paymentLimiter, async (req: Request, res: Response) => {
  const { amount, currency } = z.object({ amount: z.number().positive(), currency: z.string().default('QAR') }).parse(req.body);

  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    metadata: { userId: req.user!.userId },
  });

  const topup = await prisma.creditTopup.create({
    data: {
      userId: req.user!.userId,
      amount,
      currency,
      stripeIntentId: intent.id,
      status: 'pending',
    },
  });

  res.json({ clientSecret: intent.client_secret, topupId: topup.id });
});

// Confirm top-up (client calls after Stripe payment)
router.post('/topup/:id/confirm', paymentLimiter, async (req: Request, res: Response) => {
  const topup = await prisma.creditTopup.findUnique({ where: { id: req.params.id } });
  if (!topup || topup.userId !== req.user!.userId) throw new AppError('Top-up not found.', 404);

  if (topup.status === 'paid') {
    res.json({ message: 'Credits already added.', amount: topup.amount });
    return;
  }

  if (topup.stripeIntentId) {
    const intent = await stripe.paymentIntents.retrieve(topup.stripeIntentId);
    if (intent.status !== 'succeeded') throw new AppError('Payment not yet completed.', 422);
  }

  const claimed = await prisma.creditTopup.updateMany({
    where: { id: topup.id, userId: req.user!.userId, status: 'pending' },
    data: { status: 'paid', confirmedAt: new Date() },
  });
  if (claimed.count === 0) {
    const current = await prisma.creditTopup.findUnique({ where: { id: topup.id } });
    if (current?.status === 'paid') {
      res.json({ message: 'Credits already added.', amount: topup.amount });
      return;
    }
    throw new AppError('Top-up could not be confirmed.', 409);
  }

  await WalletService.credit(topup.userId, Number(topup.amount), 'topup', 'Credit top-up', topup.id, 'CreditTopup');

  res.json({ message: 'Credits added successfully.', amount: topup.amount });
});

// Payment methods
router.get('/payment-methods', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, include: { providerProfile: true } });
  if (!user?.providerProfile) {
    res.json({ data: [] });
    return;
  }
  res.json({ data: [] });
});

// Payout requests
router.get('/payouts', async (req: Request, res: Response) => {
  const payouts = await prisma.payoutRequest.findMany({
    where: { providerId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: payouts });
});

router.post('/payouts', paymentLimiter, async (req: Request, res: Response) => {
  const data = z.object({ amount: z.number().positive(), bankName: z.string().optional(), iban: z.string().optional(), notes: z.string().optional() }).parse(req.body);
  const payout = await prisma.payoutRequest.create({
    data: { providerId: req.user!.userId, ...data, currency: 'QAR', status: 'pending' },
  });
  res.status(201).json({ data: payout });
});

export default router;
