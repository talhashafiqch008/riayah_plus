import { Request } from 'express';
import { BookingStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export type BookingParty = {
  id: string;
  clientId: string;
  providerId: string;
  status: BookingStatus;
};

/**
 * Load booking and assert caller is client, provider, or admin (Z-4).
 */
export async function loadBookingOrThrow(bookingId: string): Promise<BookingParty> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, clientId: true, providerId: true, status: true },
  });
  if (!booking) throw new AppError('Booking not found.', 404);
  return booking;
}

export function assertBookingAccess(
  req: Request,
  booking: { clientId: string; providerId: string },
  opts?: { allowClient?: boolean; allowProvider?: boolean; adminOk?: boolean },
): void {
  const allowClient = opts?.allowClient !== false;
  const allowProvider = opts?.allowProvider !== false;
  const adminOk = opts?.adminOk !== false;
  const { userId, role } = req.user!;
  const isAdmin = adminOk && ['admin', 'super_admin', 'support_admin'].includes(role);
  const isClient = allowClient && booking.clientId === userId;
  const isProvider = allowProvider && booking.providerId === userId;
  if (!isAdmin && !isClient && !isProvider) {
    throw new AppError('Forbidden.', 403);
  }
}

/** Provider-only actions (start, complete, counter-offer, clock). */
export function assertBookingProvider(req: Request, booking: { providerId: string }): void {
  const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
  if (booking.providerId !== req.user!.userId && !isAdmin) {
    throw new AppError('Forbidden.', 403);
  }
}

/** Client-only actions (pay, cancel as client). */
export function assertBookingClient(req: Request, booking: { clientId: string }): void {
  const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
  if (booking.clientId !== req.user!.userId && !isAdmin) {
    throw new AppError('Forbidden.', 403);
  }
}
