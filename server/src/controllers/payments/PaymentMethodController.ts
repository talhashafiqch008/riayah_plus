import { Request, Response, NextFunction } from 'express';
import { StripeService } from '../../services/StripeService';
import { AppError } from '../../middleware/errorHandler';
import { prisma } from '../../config/database';

export class PaymentMethodController {
  // GET /api/payment-methods
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      const customerId = await StripeService.getOrCreateCustomer(userId, user!.email, user!.name);
      const methods = await StripeService.listPaymentMethods(customerId);
      res.json({ success: true, paymentMethods: methods });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/payment-methods/setup-intent
  static async createSetupIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      const customerId = await StripeService.getOrCreateCustomer(userId, user!.email, user!.name);
      const setupIntent = await StripeService.createSetupIntent(customerId);
      res.json({ success: true, clientSecret: setupIntent.client_secret });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/payment-methods
  static async attach(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.user!.userId;

      if (!paymentMethodId) throw new AppError('paymentMethodId is required.', 400);

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      const customerId = await StripeService.getOrCreateCustomer(userId, user!.email, user!.name);
      await StripeService.attachPaymentMethod(paymentMethodId, customerId);

      res.json({ success: true, message: 'Payment method saved.' });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/payment-methods/:paymentMethodId
  static async detach(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethodId } = req.params;
      const userId = req.user!.userId;

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      const customerId = await StripeService.getOrCreateCustomer(userId, user!.email, user!.name);
      const methods = await StripeService.listPaymentMethods(customerId);
      const owned = methods.some((m) => m.id === paymentMethodId);
      if (!owned) throw new AppError('Forbidden. Payment method not found on your account.', 403);

      await StripeService.detachPaymentMethod(paymentMethodId);
      res.json({ success: true, message: 'Payment method removed.' });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/payment-methods/:paymentMethodId/default
  static async setDefault(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMethodId } = req.params;
      const userId = req.user!.userId;
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
      const customerId = await StripeService.getOrCreateCustomer(userId, user!.email, user!.name);
      await StripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
      res.json({ success: true, message: 'Default payment method updated.' });
    } catch (err) {
      next(err);
    }
  }
}
