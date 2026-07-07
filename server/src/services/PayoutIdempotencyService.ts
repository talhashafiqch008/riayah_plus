import { prisma } from '../config/database';
import { redis } from '../config/redis';
import { WalletService } from './WalletService';
import { NotificationService } from './NotificationService';
import { AuditService } from './AuditService';
import { logger } from '../config/logger';

const LOCK_TTL_SECONDS = 60; // prevent double-processing for 60s

export class PayoutIdempotencyService {
  /**
   * Process a payout request exactly once.
   * Uses a Redis lock so concurrent calls (e.g. from cron + manual trigger) never double-pay.
   */
  static async process(payoutRequestId: string): Promise<{ processed: boolean; message: string }> {
    const lockKey = `payout_lock:${payoutRequestId}`;

    // Attempt to acquire lock
    const acquired = await redis.set(lockKey, '1', 'EX', LOCK_TTL_SECONDS, 'NX');
    if (!acquired) {
      return { processed: false, message: 'Payout already being processed.' };
    }

    try {
      const payout = await prisma.payoutRequest.findUnique({ where: { id: payoutRequestId } });
      if (!payout) return { processed: false, message: 'Payout request not found.' };
      if (payout.status !== 'pending') return { processed: false, message: `Payout already in status: ${payout.status}` };

      // Check idempotency record
      const existing = await prisma.payoutIdempotency.findUnique({ where: { payoutRequestId } });
      if (existing) {
        return { processed: false, message: 'Payout already processed (idempotency record found).' };
      }

      // providerId is the user who owns the payout
      const ownerId = payout.providerId;

      // Verify sufficient balance
      const wallet = await WalletService.getBalance(ownerId);
      if (Number(wallet.balance) < Number(payout.amount)) {
        await prisma.payoutRequest.update({ where: { id: payoutRequestId }, data: { status: 'rejected' as const, failureReason: 'Insufficient wallet balance' } });
        return { processed: false, message: 'Insufficient balance for payout.' };
      }

      // Debit wallet and create idempotency record atomically
      await prisma.$transaction(async (tx) => {
        await tx.payoutIdempotency.create({
          data: { payoutRequestId, processedAt: new Date() },
        });
        await tx.payoutRequest.update({ where: { id: payoutRequestId }, data: { status: 'processing' } });
      });

      // Debit wallet
      await WalletService.debit(
        ownerId,
        Number(payout.amount),
        'payout',
        `Payout #${payoutRequestId}`,
        payoutRequestId,
        'PayoutRequest'
      );

      await prisma.payoutRequest.update({ where: { id: payoutRequestId }, data: { status: 'completed', processedAt: new Date() } });

      await NotificationService.create({
        userId: ownerId,
        title: 'Payout Processed',
        body: `Your payout of ${payout.currency} ${Number(payout.amount).toFixed(2)} has been processed.`,
        type: 'payout_completed',
        data: { payoutRequestId },
      });

      await AuditService.log({
        userId: ownerId,
        action: 'payout_processed',
        entity: 'PayoutRequest',
        entityId: payoutRequestId,
        metadata: { amount: Number(payout.amount), currency: payout.currency },
      });

      logger.info('Payout processed', { payoutRequestId, amount: payout.amount });
      return { processed: true, message: 'Payout processed successfully.' };
    } finally {
      await redis.del(lockKey);
    }
  }

  static async processBatch(limit = 20): Promise<{ processed: number; failed: number }> {
    const pending = await prisma.payoutRequest.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    let processed = 0;
    let failed = 0;

    for (const payout of pending) {
      const result = await PayoutIdempotencyService.process(payout.id);
      if (result.processed) processed++;
      else failed++;
    }

    return { processed, failed };
  }
}
