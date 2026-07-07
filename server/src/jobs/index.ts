import { Queue } from 'bullmq';
import { bullmqConnection } from '../config/redis';

export const notificationQueue = new Queue('notifications', bullmqConnection);
export const emailQueue = new Queue('emails', bullmqConnection);
export const refundQueue = new Queue('refunds', bullmqConnection);
export const stripeTopupQueue = new Queue('stripe-topups', bullmqConnection);
export const bookingStatusQueue = new Queue('booking-status', bullmqConnection);
export const whatsappQueue = new Queue('whatsapp', bullmqConnection);
export const pdfQueue = new Queue('pdf-generation', bullmqConnection);
export const gpsComplianceQueue = new Queue('gps-compliance', bullmqConnection);

// Job helpers
export async function dispatchNotification(data: {
  userId: string;
  title: string;
  body: string;
  type: string;
  channel?: string;
  meta?: Record<string, unknown>;
}) {
  return notificationQueue.add('dispatch', data);
}

export async function dispatchEmail(data: {
  to: string;
  subject: string;
  html: string;
}) {
  return emailQueue.add('send', data);
}

export async function dispatchRefund(data: {
  paymentId: string;
  amount: number;
  reason?: string;
}) {
  return refundQueue.add('process', data, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
}

export async function dispatchBookingStatus(data: {
  bookingId: string;
  status: string;
  notifyUserId: string;
}) {
  return bookingStatusQueue.add('status-change', data);
}

export async function dispatchWhatsApp(data: {
  phone: string;
  message: string;
  type?: string;
}) {
  return whatsappQueue.add('send', data);
}
