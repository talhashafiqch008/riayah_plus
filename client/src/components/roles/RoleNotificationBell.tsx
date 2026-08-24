import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@/lib/errors';
import {
  deleteNotification,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  notificationHref,
  notificationIsUnread,
  type AppNotification,
} from '@/lib/api/notifications';
import { connectRealtime, subscribeNotificationRealtime } from '@/lib/realtime';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-QA', { dateStyle: 'medium', timeStyle: 'short' });
}

interface RoleNotificationBellProps {
  shellBasePath: string;
}

export default function RoleNotificationBell({ shellBasePath }: RoleNotificationBellProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      setUnread(await getUnreadNotificationCount());
    } catch {
      /* ignore transient */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNotifications({ limit: 30 });
      setRows(data.notifications);
      setUnread(data.notifications.filter(notificationIsUnread).length);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void refreshCount();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshCount();
    };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshCount();
    }, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [refreshCount, user]);

  useEffect(() => {
    if (!user) return;
    const socket = connectRealtime();
    const unsub = subscribeNotificationRealtime(socket, (raw) => {
      const n = raw as AppNotification;
      if (!n?.id) return;
      setRows((prev) => (prev.some((r) => r.id === n.id) ? prev : [n, ...prev].slice(0, 30)));
      setUnread((c) => c + 1);
    });
    return () => {
      unsub();
      socket.disconnect();
    };
  }, [user]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    await loadList();
  }

  async function onMarkRead(id: string) {
    try {
      await markNotificationAsRead(id);
      setRows((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString(), isRead: true } : n)),
      );
      setUnread((c) => Math.max(0, c - 1));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not mark as read');
    }
  }

  async function onMarkAll() {
    try {
      await markAllNotificationsAsRead();
      setRows((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString(), isRead: true })));
      setUnread(0);
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not mark all as read');
    }
  }

  async function onDelete(id: string) {
    const row = rows.find((n) => n.id === id);
    try {
      await deleteNotification(id);
      setRows((prev) => prev.filter((n) => n.id !== id));
      if (row && notificationIsUnread(row)) setUnread((c) => Math.max(0, c - 1));
    } catch (error: unknown) {
      toast.error(isApiError(error) ? error.message : 'Could not remove notification');
    }
  }

  async function onOpen(notification: AppNotification) {
    if (notificationIsUnread(notification)) await onMarkRead(notification.id);
    const href = notificationHref(notification, shellBasePath);
    setOpen(false);
    if (href) navigate(href);
  }

  if (!user) return null;

  return (
    <div className="relative ml-auto" ref={panelRef}>
      <button
        type="button"
        onClick={() => void toggle()}
        className="relative rounded-lg p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-teal-600 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-stone-900">Notifications</h3>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void onMarkAll()}
                className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                <Check className="size-3" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="size-7 animate-spin rounded-full border-b-2 border-teal-600" />
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-stone-500">
                <Bell className="mx-auto mb-2 size-8 text-stone-300" />
                No notifications yet
              </div>
            ) : (
              <ul className="divide-y divide-stone-50">
                {rows.map((n) => {
                  const unreadRow = notificationIsUnread(n);
                  const href = notificationHref(n, shellBasePath);
                  return (
                    <li
                      key={n.id}
                      className={`group relative px-4 py-3 ${unreadRow ? 'bg-teal-50/40' : ''}`}
                    >
                      <button
                        type="button"
                        onClick={() => void onOpen(n)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                              unreadRow ? 'bg-teal-600' : 'bg-transparent'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm ${
                                unreadRow ? 'font-semibold text-stone-900' : 'font-medium text-stone-800'
                              }`}
                            >
                              {n.title}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{n.body}</p>
                            <p className="mt-1 text-[10px] text-stone-400">
                              {formatWhen(n.createdAt)}
                              {href ? ' · Open' : ''}
                            </p>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDelete(n.id)}
                        className="absolute right-2 top-2 rounded p-1 text-stone-300 opacity-0 hover:text-rose-600 group-hover:opacity-100"
                        aria-label="Remove notification"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
