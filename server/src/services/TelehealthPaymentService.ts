import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { isFamilyRole } from '../utils/careAccess';
import { InvoiceService } from './InvoiceService';
import type { TelehealthActor } from './LiveKitAccess';

export const TELEHEALTH_PAYMENT_REQUIRED = 'telehealth_payment_required';

type SessionPaymentRow = {
  id: string;
  type: string;
  status: string;
};

export function requiresTelehealthJoinPayment(role: string, sessionType: string): boolean {
  return isFamilyRole(role) && sessionType === 'telehealth';
}

/**
 * Family must pay the session invoice before joining a telehealth room.
 * Staff / clinical / coordinators are not gated. Creates a booking invoice
 * on the fly for legacy sessions booked before prepaid billing.
 */
export class TelehealthPaymentService {
  static async assertSessionPaid(session: SessionPaymentRow, actor: TelehealthActor): Promise<void> {
    if (!requiresTelehealthJoinPayment(actor.role, session.type)) return;
    if (session.status === 'cancelled') {
      throw new AppError('This session cannot be joined.', 400);
    }

    await InvoiceService.tryFromTelehealthBooking(session.id);

    const invoice = await prisma.invoice.findFirst({
      where: { sessionId: session.id, type: 'invoice' },
      select: { id: true, status: true, invoiceNumber: true, total: true, currency: true },
    });

    if (!invoice) {
      throw new AppError(
        'Payment is required before joining, but no invoice is available yet. Please contact your care coordinator.',
        403,
        { code: TELEHEALTH_PAYMENT_REQUIRED },
      );
    }

    if (invoice.status === 'paid') return;

    throw new AppError('Please pay the session invoice before joining the video visit.', 403, {
      code: TELEHEALTH_PAYMENT_REQUIRED,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      total: Number(invoice.total),
      currency: invoice.currency,
      status: invoice.status,
    });
  }
}
