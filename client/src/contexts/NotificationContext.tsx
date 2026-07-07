
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useNotificationEcho } from '@/hooks/useEcho';
import { deleteNotification, getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/api';
import toast from 'react-hot-toast';

interface Notification {
 id: string | number;
 user_id: number;
 type?: string;
 title: string;
 body: string;
 is_read: number;
 created_at: string;
 updated_at: string;
 data?: {
 [key: string]: unknown;
 };
}

interface NotificationContextType {
 notifications: Notification[];
 unreadCount: number;
 isConnected: boolean;
 markAsRead: (id: string | number) => void;
 markAllAsRead: () => void;
 deleteNotification: (id: string | number) => void;
 fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children, userId }: { children: ReactNode; userId: string | number | null }) {
 const [notifications, setNotifications] = useState<Notification[]>([]);
 const [unreadCount, setUnreadCount] = useState(0);

 const handleNewNotification = useCallback((data: { notification: Record<string, unknown>; unreadCount: number }) => {
 const notification = data.notification as unknown as Notification;
 setNotifications(prev => [notification, ...prev].slice(0, 20));
 setUnreadCount(data.unreadCount);

 const message = notification.body || notification.title || 'New notification';
 toast.success(message, {
 duration: 4000,
 position: 'top-right',
 icon: '🔔',
 });

 if ('Notification' in window && Notification.permission === 'granted') {
 new Notification(notification.title || 'Raiyah Notification', {
 body: message,
 icon: '/logo.png',
 badge: '/logo.png',
 });
 }
 }, []);

 const { isConnected } = useNotificationEcho(
 userId || '',
 handleNewNotification
 );

 const fetchNotifications = useCallback(async () => {
 if (!userId) return;

 try {
 const result = await getNotifications();
 const notificationsList = result.data?.notifications || result.notifications || [];
 setNotifications(notificationsList.slice(0, 20));
 const unread = notificationsList.filter((n: Notification) => n.is_read === 0).length;
 setUnreadCount(unread);
 } catch (error) {
 console.error('Failed to fetch notifications:', error);
 }
 }, [userId]);

 const markAsRead = useCallback(async (id: string | number) => {
 try {
 await markNotificationAsRead(String(id));
 setNotifications(prev =>
 prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
 setUnreadCount(prev => Math.max(0, prev - 1));
 } catch (error) {
 console.error('Failed to mark notification as read:', error);
 }
 }, []);

 const markAllAsRead = useCallback(async () => {
 try {
 await markAllNotificationsAsRead();
 setNotifications(prev =>
 prev.map(n => ({ ...n, is_read: 1 }))
 );
 setUnreadCount(0);
 toast.success('All notifications marked as read');
 } catch (error) {
 console.error('Failed to mark all as read:', error);
 }
 }, []);

 const deleteNotification = useCallback(async (id: string | number) => {
 try {
 await deleteNotification(String(id));
 const notification = notifications.find(n => n.id === id);
 setNotifications(prev => prev.filter(n => n.id !== id));

 if (notification && notification.is_read === 0) {
 setUnreadCount(prev => Math.max(0, prev - 1));
 }

 toast.success('Notification deleted');
 } catch (error) {
 console.error('Failed to delete notification:', error);
 }
 }, [notifications]);

 useEffect(() => {
 if (userId) {
 fetchNotifications();
 }
 }, [userId, fetchNotifications]);

 useEffect(() => {
 if ('Notification' in window && Notification.permission === 'default') {
 Notification.requestPermission();
 }
 }, []);

 return (
 <NotificationContext.Provider
 value={{
 notifications,
 unreadCount,
 isConnected,
 markAsRead,
 markAllAsRead,
 deleteNotification,
 fetchNotifications,
 }}
 >
 {children}
 </NotificationContext.Provider>
 );
}

export function useNotifications() {
 const context = useContext(NotificationContext);
 if (context === undefined) {
 throw new Error('useNotifications must be used within a NotificationProvider');
 }
 return context;
}
