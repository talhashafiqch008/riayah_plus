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
    relatedType?: string
  ) {
    if (!(amount > 0)) {
      throw new AppError('Credit amount must be positive.', 400);
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
    relatedType?: string
  ) {
    return prisma.$transaction(async (tx) =>
      this.creditWithTx(tx, userId, amount, type, description, relatedId, relatedType)
    );
  }

  static async debit(
    userId: string,
    amount: number,
    type: string,
    description?: string,
    relatedId?: string,
    relatedType?: string
  ) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.walletBalance.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new AppError('Insufficient wallet balance.', 422);
      }

      const updated = await tx.walletBalance.update({
        where: { userId },
        data: { balance: { decrement: amount } },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type,
          description,
          relatedId,
          relatedType,
          balanceBefore: Number(wallet.balance),
          balanceAfter: Number(updated.balance),
        },
      });

      return updated;
    });
  }

  static async holdEscrow(userId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const wallet = await tx.walletBalance.findUnique({ where: { userId } });
      if (!wallet || Number(wallet.balance) < amount) {
        throw new AppError('Insufficient balance to hold in escrow.', 422);
      }
      return tx.walletBalance.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          escrow: { increment: amount },
        },
      });
    });
  }

  static async releaseEscrow(userId: string, amount: number, toProviderId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.walletBalance.update({
        where: { userId },
        data: { escrow: { decrement: amount } },
      });
      await tx.walletBalance.upsert({
        where: { userId: toProviderId },
        create: { userId: toProviderId, balance: amount, escrow: 0 },
        update: { balance: { increment: amount } },
      });
    });
  }

  static async refundEscrow(userId: string, amount: number) {
    return prisma.walletBalance.update({
      where: { userId },
      data: {
        balance: { increment: amount },
        escrow: { decrement: amount },
      },
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
