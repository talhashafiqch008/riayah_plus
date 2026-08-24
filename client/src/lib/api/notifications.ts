import { client } from './client';
import { extractApiError } from '@/lib/errors';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown> | null;
  isRead?: boolean;
  readAt?: string | null;
  createdAt: string;
};

export function notificationIsUnread(n: AppNotification): boolean {
  return !n.readAt && n.isRead !== true;
}

export async function listNotifications(params?: { page?: number; limit?: number }) {
  try {
    const { data } = await client.get<{
      notifications: AppNotification[];
      total: number;
      page: number;
      limit: number;
    }>('/notifications', { params });
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

/** @deprecated Prefer listNotifications — kept for marketplace layouts. */
export async function getNotifications(unreadOnly = false) {
  const data = await listNotifications({ limit: 50 });
  if (!unreadOnly) return data;
  return {
    ...data,
    notifications: data.notifications.filter(notificationIsUnread),
  };
}

export async function getUnreadNotificationCount() {
  try {
    const { data } = await client.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const { data } = await client.patch(`/notifications/${id}/read`);
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const { data } = await client.patch('/notifications/read-all');
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function deleteNotification(id: string) {
  try {
    const { data } = await client.delete(`/notifications/${id}`);
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}

/** Deep-link a notification into the current role shell when possible. */
export function notificationHref(
  notification: AppNotification,
  shellBasePath: string,
): string | null {
  const data = (notification.data ?? {}) as Record<string, unknown>;
  const type = notification.type || '';
  const invoiceId = typeof data.invoiceId === 'string' ? data.invoiceId : null;
  const sessionId = typeof data.sessionId === 'string' ? data.sessionId : null;
  const conversationId = typeof data.conversationId === 'string' ? data.conversationId : null;

  if (shellBasePath === '/family') {
    if (type.startsWith('invoice_') || type.startsWith('payment_') || type === 'quotation_generated') {
      return invoiceId ? `/family/billing/${invoiceId}` : '/family/billing';
    }
    if (type.startsWith('telehealth_') && sessionId) return `/family/telehealth/${sessionId}`;
    if (type.startsWith('telehealth_')) return '/family/telehealth';
    if (conversationId) return `/family/messages/${conversationId}`;
  }

  if (shellBasePath === '/clinical') {
    if (type.startsWith('telehealth_') && sessionId) return `/clinical/telehealth/${sessionId}`;
    if (type.startsWith('telehealth_')) return '/clinical/telehealth';
    if (conversationId) return `/clinical/messages/${conversationId}`;
  }

  if (shellBasePath === '/coordinator') {
    if (conversationId) return `/coordinator/messages/${conversationId}`;
    if (type.startsWith('telehealth_') && sessionId) return `/coordinator/schedule`;
  }

  return null;
}
