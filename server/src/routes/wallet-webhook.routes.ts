import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../config/database';
import { WalletService } from '../services/WalletService';
import { QatariPaymentService } from '../services/QatariPaymentService';
import { env } from '../config/env';

/**
 * Public payment webhooks — MUST be mounted before auth.routes.
 * auth.routes installs `router.use(authenticate)` at `/`, which would 401 these otherwise.
 */
const router = Router();
const stripe = new Stripe(env.STRIPE_SECRET, { apiVersion: '2024-06-20' });

router.post('/stripe/webhook', async (req: Request, res: Response) => {
  let event: Stripe.Event;
  try {
    // TM-025: constructEvent requires the exact raw bytes (Buffer/string), not a parsed object.
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : typeof req.body === 'string'
        ? req.body
        : null;
    if (!rawBody) {
      res.status(400).send('Webhook signature verification failed.');
      return;
    }
    event = stripe.webhooks.constructEvent(
      rawBody,
      req.headers['stripe-signature'] as string,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    res.status(400).send('Webhook signature verification failed.');
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent;
    const topup = await prisma.creditTopup.findFirst({ where: { stripeIntentId: intent.id } });
    if (topup) {
      const claimed = await prisma.creditTopup.updateMany({
        where: { id: topup.id, status: 'pending' },
        data: { status: 'paid', confirmedAt: new Date() },
      });
      if (claimed.count === 0) {
        res.json({ received: true });
        return;
      }
      await WalletService.credit(
        topup.userId,
        Number(topup.amount),
        'topup',
        'Stripe credit top-up',
        topup.id,
        'CreditTopup',
      );
    }
  }

  res.json({ received: true });
});

router.post('/paytabs/webhook', async (req: Request, res: Response) => {
  try {
    const rawBody =
      Buffer.isBuffer(req.body)
        ? req.body
        : typeof req.body === 'string'
          ? req.body
          : JSON.stringify(req.body ?? {});

    let payload: Record<string, unknown>;
    if (Buffer.isBuffer(req.body) || typeof req.body === 'string') {
      const text = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
      try {
        payload = JSON.parse(text) as Record<string, unknown>;
      } catch {
        payload = Object.fromEntries(new URLSearchParams(text)) as Record<string, unknown>;
      }
    } else {
      payload = (req.body ?? {}) as Record<string, unknown>;
    }

    await QatariPaymentService.handleWebhook(
      payload,
      req.headers as Record<string, string | string[] | undefined>,
      rawBody
    );
    res.json({ received: true });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode ?? 400;
    const message = err instanceof Error ? err.message : 'Webhook rejected.';
    res.status(status).json({ message });
  }
});

export default router;
