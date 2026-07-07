import { prisma } from '../config/database';
import { WalletService } from './WalletService';
import { NotificationService } from './NotificationService';
import { logger } from '../config/logger';

const PENALTY_PERCENTAGE = 0.5; // 50% of booking amount is penalised for no-show

export class NoShowPenaltyService {
  static async applyClientNoShow(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || booking.status !== 'accepted') return;
    if (!booking.payment) return;

    const penaltyAmount = Number(booking.payment.amount) * PENALTY_PERCENTAGE;
    const releaseAmount = Number(booking.payment.amount) - penaltyAmount;

    // Client loses 50% of payment as penalty
    await WalletService.debit(
      booking.clientId,
      penaltyAmount,
      'no_show_penalty',
      `No-show penalty for booking ${booking.id}`,
      bookingId,
      'Booking'
    );

    // Provider gets 50% as compensation
    await WalletService.credit(
      booking.providerId,
      penaltyAmount,
      'no_show_compensation',
      `No-show compensation for booking ${booking.id}`,
      bookingId,
      'Booking'
    );

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'no_show', noShowPenaltyApplied: true, noShowPenaltyAmount: penaltyAmount },
    });

    // Release remaining escrow back to client
    if (releaseAmount > 0) {
      await WalletService.credit(
        booking.clientId,
        releaseAmount,
        'escrow_release',
        `Partial escrow release for booking ${booking.id}`,
        bookingId,
        'Booking'
      );
    }

    await NotificationService.create({
      userId: booking.clientId,
      title: 'No-Show Penalty Applied',
      body: `A no-show penalty of QAR ${penaltyAmount.toFixed(2)} has been deducted from your wallet.`,
      type: 'no_show_penalty',
      data: { bookingId },
    });

    await NotificationService.create({
      userId: booking.providerId,
      title: 'No-Show Compensation',
      body: `You received QAR ${penaltyAmount.toFixed(2)} compensation for a client no-show.`,
      type: 'no_show_compensation',
      data: { bookingId },
    });

    logger.info('No-show penalty applied', { bookingId, clientId: booking.clientId, penaltyAmount });
  }

  static async applyProviderNoShow(bookingId: string): Promise<void> {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });

    if (!booking || booking.status !== 'accepted') return;

    // Full refund to client — provider no-show
    const fullAmount = booking.payment ? Number(booking.payment.amount) : 0;

    if (fullAmount > 0) {
      await WalletService.credit(
        booking.clientId,
        fullAmount,
        'provider_no_show_refund',
        `Full refund — provider no-show for booking ${booking.id}`,
        bookingId,
        'Booking'
      );
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'cancelled', cancellationReason: 'provider_no_show' },
    });

    await NotificationService.create({
      userId: booking.clientId,
      title: 'Booking Cancelled — Provider No-Show',
      body: `Your booking was cancelled because the provider did not show up. A full refund has been issued.`,
      type: 'provider_no_show',
      data: { bookingId },
    });

    logger.warn('Provider no-show recorded', { bookingId, providerId: booking.providerId });
  }
}
