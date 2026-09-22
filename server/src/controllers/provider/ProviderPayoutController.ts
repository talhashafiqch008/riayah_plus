import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { z } from 'zod';
import { parsePagination } from '../../utils/pagination';
import { queryString } from '../../utils/queryScalar';

const createPayoutSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('QAR'),
  bankAccount: z.string().min(1),
  notes: z.string().optional(),
});

export class ProviderPayoutController {
  // GET /provider/payouts/balance
  async getBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const wallet = await prisma.walletBalance.findUnique({ where: { userId: providerId } });
      const pendingPayouts = await prisma.payoutRequest.aggregate({
        where: { providerId, status: 'pending' },
        _sum: { amount: true },
      });
      res.json({
        data: {
          availableBalance: wallet ? Number(wallet.balance) : 0,
          pendingPayouts: Number(pendingPayouts._sum.amount ?? 0),
          currency: 'QAR',
        },
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /provider/payouts
  async listPayouts(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
            const { page, limit, skip, take } = parsePagination(req.query);
      const status = queryString(req.query.status);
      const where: Record<string, unknown> = { providerId };
      if (status) where.status = status;

      const [payouts, total] = await Promise.all([
        prisma.payoutRequest.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.payoutRequest.count({ where }),
      ]);
      res.json({ data: payouts, meta: { total, page, limit } });
    } catch (err) {
      next(err);
    }
  }

  // POST /provider/payouts
  async requestPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const parsed = createPayoutSchema.parse(req.body);

      const wallet = await prisma.walletBalance.findUnique({ where: { userId: providerId } });
      if (!wallet || Number(wallet.balance) < parsed.amount) {
        throw new AppError('Insufficient balance', 400);
      }

      const payout = await prisma.$transaction(async (tx) => {
        await tx.walletBalance.update({
          where: { userId: providerId },
          data: { balance: { decrement: parsed.amount } },
        });
        return tx.payoutRequest.create({
          data: {
            providerId,
            amount: parsed.amount,
            currency: parsed.currency,
            status: 'pending',
            notes: parsed.notes,
          },
        });
      });

      res.status(201).json({ data: payout });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /provider/payouts/:id (cancel pending payout)
  async cancelPayout(req: Request, res: Response, next: NextFunction) {
    try {
      const providerId = req.user!.userId;
      const { id } = req.params;

      const payout = await prisma.payoutRequest.findFirst({ where: { id, providerId } });
      if (!payout) throw new AppError('Not found', 404);
      if (payout.status !== 'pending') throw new AppError('Only pending payouts can be cancelled', 400);

      await prisma.$transaction(async (tx) => {
        await tx.walletBalance.update({
          where: { userId: providerId },
          data: { balance: { increment: Number(payout.amount) } },
        });
        await tx.payoutRequest.update({ where: { id }, data: { status: 'cancelled' } });
      });

      res.json({ message: 'Payout cancelled and balance restored' });
    } catch (err) {
      next(err);
    }
  }
}

export default new ProviderPayoutController();
