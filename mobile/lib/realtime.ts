import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_SERVER_BASE_URI ??
  'http://localhost:5001';

/**
 * Mobile realtime client. Auth is Bearer token (same as REST), not httpOnly cookies.
 */
export function connectRealtime(token: string | null | undefined): Socket {
  return io(BASE_URL.replace(/\/$/, ''), {
    auth: token ? { token } : undefined,
    extraHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
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
