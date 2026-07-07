import { Request, Response, NextFunction } from 'express';
import { S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const s3 = new S3Client({ region: env.AWS_DEFAULT_REGION });

export class ReceiptController {
  // GET /receipts/topup/:topupId
  async topupReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { topupId } = req.params;
      const userId = req.user!.userId;

      const topup = await prisma.creditTopup.findUnique({ where: { id: topupId } });
      if (!topup) throw new AppError('Top-up not found', 404);
      if (topup.userId !== userId && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);

      res.json({
        data: {
          id: topup.id,
          amount: topup.amount,
          currency: topup.currency,
          status: topup.status,
          createdAt: topup.createdAt,
          type: 'credit_topup',
          reference: topup.stripeIntentId,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /receipts/payout/:payoutId
  async payoutReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const { payoutId } = req.params;
      const userId = req.user!.userId;

      const payout = await prisma.payoutRequest.findUnique({ where: { id: payoutId } });
      if (!payout) throw new AppError('Payout not found', 404);
      if (payout.providerId !== userId && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);

      res.json({
        data: {
          id: payout.id,
          amount: payout.amount,
          currency: payout.currency,
          status: payout.status,
          processedAt: payout.processedAt,
          reference: payout.id,
          type: 'payout',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export default new ReceiptController();
