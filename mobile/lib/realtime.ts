import { io, type Socket } from 'socket.io-client';
import Constants from 'expo-constants';

const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_SERVER_BASE_URI ??
  'http://localhost:5001';

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
const joinedConversations = new Set<string>();

/**
 * Mobile realtime client. Auth is Bearer token (same as REST), not httpOnly cookies.
 * Reuses one socket for the app session (inbox + thread).
 */
export function getRealtimeSocket(token: string | null | undefined): Socket | null {
  if (!token) return null;

  if (sharedSocket && sharedToken === token) {
    return sharedSocket;
  }

  sharedSocket?.disconnect();
  joinedConversations.clear();

  sharedToken = token;
  sharedSocket = io(BASE_URL.replace(/\/$/, ''), {
    auth: { token },
    extraHeaders: { Authorization: `Bearer ${token}` },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  sharedSocket.on('connect', () => {
    for (const conversationId of joinedConversations) {
      sharedSocket?.emit('join_conversation', conversationId);
    }
  });

  return sharedSocket;
}

export function releaseRealtimeSocket(): void {
  sharedSocket?.disconnect();
  sharedSocket = null;
  sharedToken = null;
  joinedConversations.clear();
}

/** @deprecated Use getRealtimeSocket — kept for call sites migrating gradually */
export function connectRealtime(token: string | null | undefined): Socket {
  const socket = getRealtimeSocket(token);
  if (!socket) {
    return io(BASE_URL.replace(/\/$/, ''), { autoConnect: false });
  }
  return socket;
}

export function joinConversationRoom(socket: Socket, conversationId: string): void {
  joinedConversations.add(conversationId);
  const join = () => socket.emit('join_conversation', conversationId);
  if (socket.connected) join();
  else socket.once('connect', join);
}

export function leaveConversationRoom(socket: Socket, conversationId: string): void {
  joinedConversations.delete(conversationId);
  if (socket.connected) socket.emit('leave_conversation', conversationId);
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
