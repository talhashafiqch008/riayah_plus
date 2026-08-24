import { io, type Socket } from 'socket.io-client';

/**
 * Browser realtime client. Auth is the httpOnly `token` cookie (`withCredentials`).
 * In Vite, `/socket.io` is proxied to the API. Production serves the SPA from the API origin.
 */
export function connectRealtime(): Socket {
  const url = (import.meta.env.VITE_SOCKET_URL as string | undefined) || undefined;
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
