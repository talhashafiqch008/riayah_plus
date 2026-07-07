
import { useState } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

export function NotificationBellEcho() {
 const [showDropdown, setShowDropdown] = useState(false);
 const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

 const formatTime = (dateString: string) => {
 try {
 const date = new Date(dateString);
 const now = new Date();
 const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

 if (diffInMinutes < 1) return 'Just now';
 if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
 if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
 return `${Math.floor(diffInMinutes / 1440)}d ago`;
 } catch {
 return 'Recently';
 }
 };

 return (
 <div className="relative">
 <button
 onClick={() => setShowDropdown(!showDropdown)}
 className="relative p-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
 aria-label="Notifications"
 >
 <Bell className="size-5" />
 {unreadCount > 0 && (
 <span className="absolute top-1 right-1 size-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
 {unreadCount > 9 ? '9+' : unreadCount}
 </span>
 )}
 {/* Connection indicator */}
 {isConnected && (
 <span className="absolute bottom-1 right-1 size-2 bg-green-500 rounded-full border border-white"></span>
 )}
 </button>

 {showDropdown && (
 <>
 {/* Backdrop */}
 <div role="button" tabIndex={0}
 className="fixed inset-0 z-40"
 onClick={() => setShowDropdown(false)}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); (e.currentTarget as HTMLElement).click();} }}
 />

 {/* Dropdown Panel */}
 <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-stone-200 z-50 max-h-[600px] flex flex-col">
 {/* Header */}
 <div className="p-4 border-b border-stone-200 flex items-center justify-between">
 <div>
 <h3 className="text-lg font-semibold text-stone-900">Notifications</h3>
 <p className="text-xs text-stone-500 mt-0.5">
 {isConnected ? (
 <span className="flex items-center gap-1">
 <span className="size-1.5 bg-green-500 rounded-full"></span>
 Live updates enabled
 </span>
 ) : (
 <span className="flex items-center gap-1">
 <span className="size-1.5 bg-stone-400 rounded-full"></span>
 Connecting…
 </span>
 )}
 </p>
 </div>
 <div className="flex items-center gap-2">
 {unreadCount > 0 && (
 <button
 onClick={markAllAsRead}
 className="text-xs text-teal-600 hover:text-teal-700 font-medium"
 title="Mark all as read"
 >
 Mark all read
 </button>
 )}
 <button
 onClick={() => setShowDropdown(false)}
 className="text-stone-500 hover:text-stone-700"
 >
 <X className="size-5" />
 </button>
 </div>
 </div>

 {/* Notifications List */}
 <div className="flex-1 overflow-y-auto">
 {notifications.length === 0 ? (
 <div className="py-12 text-center text-stone-500">
 <Bell className="size-12 mx-auto mb-3 opacity-30" />
 <p className="text-sm">No notifications yet</p>
 </div>
 ) : (
 <div className="divide-y divide-stone-100">
 {notifications.map((notification) => {
 // Backend uses is_read: 0 = unread, 1 = read
 const isUnread = notification.is_read === 0;
 const message = notification.body || notification.title || 'New notification';
 const title = notification.title || 'Notification';

 return (
 <div
 key={notification.id}
 className={`p-4 hover:bg-stone-50 transition-colors ${isUnread ? 'bg-teal-50/50' : '' }`}
 >
 <div className="flex items-start justify-between gap-3">
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <h4 className="text-sm font-semibold text-stone-900 truncate">
 {title}
 </h4>
 {isUnread && (
 <span className="size-2 rounded-full bg-teal-600 flex-shrink-0"></span>
 )}
 </div>
 <p className="text-sm text-stone-600 mb-2 line-clamp-2">
 {message}
 </p>
 <p className="text-xs text-stone-500">
 {formatTime(notification.created_at)}
 </p>
 </div>
 <div className="flex flex-col gap-2">
 {isUnread && (
 <button
 onClick={() => markAsRead(notification.id)}
 className="text-teal-600 hover:text-teal-700 p-1"
 title="Mark as read"
 >
 <Check className="size-4" />
 </button>
 )}
 <button
 onClick={() => deleteNotification(notification.id)}
 className="text-red-600 hover:text-red-700 p-1"
 title="Delete"
 >
 <Trash2 className="size-4" />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 </>
 )}
 </div>
 );
}
