import { io, type Socket } from 'socket.io-client';

/**
 * Browser realtime client. Auth is the httpOnly `token` cookie (`withCredentials`).
 *
 * In Vite HTTPS dev, connect to the same origin (`/`) so `/socket.io` is proxied to
 * the API. A bare `http://localhost:5001` URL from an `https://` page is mixed
 * content and the browser will not deliver realtime events.
 */
export function connectRealtime(): Socket {
  const configured = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
  const pageIsHttps =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  const configuredIsHttp = Boolean(configured && /^http:\/\//i.test(configured));

  // Prefer same-origin proxy whenever an http socket URL would be mixed content
  const url =
    !configured || (pageIsHttps && configuredIsHttp) ? undefined : configured;

  return io(url || '/', {
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });
}

export type ChatRealtimeHandlers = {
  onMessage?: (message: unknown) => void;
  onRead?: (payload: unknown) => void;
};

export function subscribeChatRealtime(socket: Socket, handlers: ChatRealtimeHandlers): () => void {
  if (handlers.onMessage) socket.on('new_message', handlers.onMessage);
  if (handlers.onRead) socket.on('messages_read', handlers.onRead);
  return () => {
    if (handlers.onMessage) socket.off('new_message', handlers.onMessage);
    if (handlers.onRead) socket.off('messages_read', handlers.onRead);
  };
}

export function subscribeNotificationRealtime(
  socket: Socket,
  onNotification: (payload: unknown) => void,
): () => void {
  socket.on('notification', onNotification);
  return () => {
    socket.off('notification', onNotification);
  };
}
