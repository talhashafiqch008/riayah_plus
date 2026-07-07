import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export async function getNotifications(unreadOnly: boolean = false) {
    const response = await client.get('/notifications', { params: { unreadOnly } });
    return response.data;
}

export async function getUnreadNotificationCount() {
    const response = await client.get('/notifications/unread');
    return response.data;
}

export async function markNotificationAsRead(id: string) {
    try {
        const response = await client.post(`/notifications/mark-as-read/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to markNotificationAsRead', error);
        throw extractApiError(error);
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const response = await client.post('/notifications/mark-all-as-read');
        return response.data;
    } catch (error) {
        console.error('Failed to markAllNotificationsAsRead', error);
        throw extractApiError(error);
    }
}

export async function deleteNotification(id: string) {
    try {
        const response = await client.delete(`/notifications/delete/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to deleteNotification', error);
        throw extractApiError(error);
    }
}
