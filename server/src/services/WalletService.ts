import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import Decimal from 'decimal.js';

export class WalletService {
  static async getOrCreateWallet(userId: string) {
    return prisma.walletBalance.upsert({
      where: { userId },
      create: { userId, balance: 0, escrow: 0 },
      update: {},
    });
  }

  static async getBalance(userId: string) {
    return this.getOrCreateWallet(userId);
  }

  static async creditWithTx(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    type: string,
    description?: string,
    relatedId?: string,
    relatedType?: string,
  ) {
    if (!(amount > 0)) {
      throw new AppError('Credit amount must be positive.', 400);
    }

    if (relatedId && relatedType) {
      const existing = await tx.creditTransaction.findFirst({
        where: { userId, relatedId, relatedType, type },
      });
      if (existing) {
        const wallet = await tx.walletBalance.findUnique({ where: { userId } });
        if (!wallet) throw new AppError('Wallet not found.', 404);
        return wallet;
      }
    }

    const wallet = await tx.walletBalance.upsert({
      where: { userId },
      create: { userId, balance: amount, escrow: 0 },
      update: { balance: { increment: amount } },
    });

    const balanceBefore = new Decimal(wallet.balance).minus(amount).toNumber();

    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
        relatedId,
        relatedType,
        balanceBefore,
        balanceAfter: Number(wallet.balance),
      },
    });

    return wallet;
  }

  static async credit(
    userId: string,
    amount: number,
    type: string,
    description?: string,
    relatedId?: string,
    relatedType?: string,
  ) {
    return prisma.$transaction(async (tx) =>
      this.creditWithTx(tx, userId, amount, type, description, relatedId, relatedType),
    );
  }

  static async debit(
    userId: string,
    amount: number,
    type: string,
    description?: string,
    relatedId?: string,
    relatedType?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.walletBalance.updateMany({
        where: { userId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      if (claimed.count === 0) {
        throw new AppError('Insufficient wallet balance.', 422);
      }

      const updated = await tx.walletBalance.findUnique({ where: { userId } });
      if (!updated) throw new AppError('Wallet not found.', 404);

      const balanceAfter = Number(updated.balance);
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type,
          description,
          relatedId,
          relatedType,
          balanceBefore: balanceAfter + amount,
          balanceAfter,
        },
      });

      return updated;
    });
  }

  static async holdEscrow(userId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.walletBalance.updateMany({
        where: { userId, balance: { gte: amount } },
        data: {
          balance: { decrement: amount },
          escrow: { increment: amount },
        },
      });
      if (claimed.count === 0) {
        throw new AppError('Insufficient balance to hold in escrow.', 422);
      }
      const updated = await tx.walletBalance.findUnique({ where: { userId } });
      if (!updated) throw new AppError('Wallet not found.', 404);
      return updated;
    });
  }

  static async releaseEscrow(userId: string, amount: number, toProviderId: string) {
    return prisma.$transaction(async (tx) => {
      const released = await tx.walletBalance.updateMany({
        where: { userId, escrow: { gte: amount } },
        data: { escrow: { decrement: amount } },
      });
      if (released.count === 0) {
        throw new AppError('Insufficient escrow balance to release.', 422);
      }

      await tx.walletBalance.upsert({
        where: { userId: toProviderId },
        create: { userId: toProviderId, balance: amount, escrow: 0 },
        update: { balance: { increment: amount } },
      });
    });
  }

  static async refundEscrow(userId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const refunded = await tx.walletBalance.updateMany({
        where: { userId, escrow: { gte: amount } },
        data: {
          balance: { increment: amount },
          escrow: { decrement: amount },
        },
      });
      if (refunded.count === 0) {
        throw new AppError('Insufficient escrow balance to refund.', 422);
      }
      const updated = await tx.walletBalance.findUnique({ where: { userId } });
      if (!updated) throw new AppError('Wallet not found.', 404);
      return updated;
    });
  }

  static async getTransactions(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditTransaction.count({ where: { userId } }),
    ]);
    return { transactions, total, page, limit };
  }
}
