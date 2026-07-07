
import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { deleteNotification, getNotifications, getUnreadNotificationCount, markAllNotificationsAsRead, markNotificationAsRead } from '@/lib/api';
import { m, LazyMotion, domAnimation, AnimatePresence } from "framer-motion";
import { Link } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";

interface NotificationItem {
 id: string;
 title: string;
 message: string;
 read: boolean;
 createdAt: string;
}

export default function NotificationsDropdown() {
 const { user } = useAuth();
 const [isOpen, setIsOpen] = useState(false);
 const [notifications, setNotifications] = useState<NotificationItem[]>([]);
 const [unreadCount, setUnreadCount] = useState(0);
 const [loading, setLoading] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);

 // Close on click outside
 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
 setIsOpen(false);
 }
 };
 document.addEventListener("mousedown", handleClickOutside);
 return () => document.removeEventListener("mousedown", handleClickOutside);
 }, []);
 const fetchUnreadCount = async () => {
 try {
 const res = await getUnreadNotificationCount();
 setUnreadCount((res as { count: number }).count);
 } catch (error) {
 console.error("Failed to fetch notification count", error);
 }
 };

 // Fetch count periodically, but only when tab is visible
 useEffect(() => {
 if (!user) return;
 fetchUnreadCount();

 const handleVisibilityChange = () => {
 if (document.visibilityState === 'visible') {
 fetchUnreadCount();
 }
 };

 document.addEventListener('visibilitychange', handleVisibilityChange);

 const interval = setInterval(() => {
 if (document.visibilityState === 'visible') {
 fetchUnreadCount();
 }
 }, 30000);

 return () => {
 document.removeEventListener('visibilitychange', handleVisibilityChange);
 clearInterval(interval);
 };
 }, [user]);

 const loadNotifications = async () => {
 if (!user) return;
 setLoading(true);
 try {
 const res = await getNotifications();
 const notificationList = (res as NotificationItem[]) || [];
 setNotifications(notificationList);
 // Also update count
 const startUnread = notificationList.filter((n) => !n.read).length;
 setUnreadCount(startUnread);
 } catch (error) {
 console.error("Failed to fetch notifications", error);
 } finally {
 setLoading(false);
 }
 };

 const toggleDropdown = () => {
 if (!isOpen) {
 setIsOpen(true);
 loadNotifications();
 } else {
 setIsOpen(false);
 }
 };

 const markAsRead = async (id: string) => {
 try {
 await markNotificationAsRead(id);
 setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
 setUnreadCount(prev => Math.max(0, prev - 1));
 } catch (error) {
 console.error("Failed to mark as read", error);
 }
 };

 const markAllRead = async () => {
 try {
 await markAllNotificationsAsRead();
 setNotifications(prev => prev.map(n => ({ ...n, read: true })));
 setUnreadCount(0);
 } catch (error) {
 console.error("Failed to mark all read", error);
 }
 };

 const removeNotification = async (id: string) => {
 try {
 await deleteNotification(id);
 setNotifications(prev => prev.filter(n => n.id !== id));
 // If it was unread, decrease count
 // But usually we assume only read ones are deleted unless specified
 } catch (error) {
 console.error("Failed to remove notification", error);
 }
 };

 if (!user) return null;

 return (
 <div className="relative" ref={dropdownRef}>
 <button
 onClick={toggleDropdown}
 className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-full transition-colors focus:outline-none"
 >
 <Bell className="size-6" />
 {unreadCount > 0 && (
 <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 </button>

 <AnimatePresence>
 {isOpen && (
 <m.div
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 10, scale: 0.95 }}
 transition={{ duration: 0.2 }}
 className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-xl border border-stone-200 z-50 overflow-hidden"
 >
 <div className="flex items-center justify-between p-4 border-b border-stone-100">
 <h3 className="font-semibold text-stone-900">Notifications</h3>
 {unreadCount > 0 && (
 <button
 onClick={markAllRead}
 className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center"
 >
 <Check className="size-3 mr-1" />
 Mark all read
 </button>
 )}
 </div>

 <div className="max-h-[400px] overflow-y-auto">
 {loading ? (
 <div className="p-8 flex justify-center text-stone-400">
 <div className="animate-spin rounded-full size-6 border-b-2 border-teal-600"></div>
 </div>
 ) : notifications.length === 0 ? (
 <div className="p-8 text-center text-stone-500">
 <Bell className="size-8 mx-auto mb-2 text-stone-300" />
 <p className="text-sm">No notifications yet</p>
 </div>
 ) : (
 <div className="divide-y divide-stone-50">
 {notifications.map((notification) => (
 <div
 key={notification.id}
 className={`p-4 hover:bg-stone-50 transition-colors relative group ${!notification.read ? 'bg-teal-50/30' : ''}`}
 >
 <div className="flex items-start gap-3">
 <div className={`mt-1 flex-shrink-0 size-2 rounded-full ${!notification.read ? 'bg-teal-500' : 'bg-transparent'}`} />
 <div className="flex-1 min-w-0">
 <p className={`text-sm ${!notification.read ? 'font-semibold text-stone-900' : 'text-stone-700'}`}>
 {notification.title}
 </p>
 <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">
 {notification.message}
 </p>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-xs text-stone-400">
 {new Date(notification.createdAt).toLocaleDateString()}
 </span>
 {!notification.read && (
 <button
 onClick={() => markAsRead(notification.id)}
 className="text-xs font-medium text-teal-600 hover:underline"
 >
 Mark read
 </button>
 )}
 </div>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 removeNotification(notification.id);
 }}
 className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-500 transition-opacity"
 title="Remove"
 >
 <Trash2 className="size-4" />
 </button>
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </m.div>
 )}
 </AnimatePresence>
 </div>
 );
}
