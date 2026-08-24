import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../config/logger';
import { assertUserActive, verifyAccessToken, wasLoggedOutAll } from '../middleware/auth';
import { ConversationService } from './ConversationService';
import {
  chatUserRoom,
  conversationRoom,
  notificationUserRoom,
  tokenFromSocketHandshake,
} from './realtimeRooms';

export { chatUserRoom, conversationRoom, notificationUserRoom, tokenFromSocketHandshake };

let realtimeIo: SocketIOServer | undefined;

export function getRealtimeIo(): SocketIOServer | undefined {
  return realtimeIo;
}

export function emitNotification(userId: string, payload: unknown): void {
  realtimeIo?.to(notificationUserRoom(userId)).emit('notification', payload);
}

export function emitNewMessage(
  io: SocketIOServer | undefined,
  message: { receiverId?: string | null; conversationId?: string | null },
): void {
  if (!io) return;
  if (message.receiverId) io.to(chatUserRoom(message.receiverId)).emit('new_message', message);
  if (message.conversationId) {
    io.to(conversationRoom(message.conversationId)).emit('new_message', message);
  }
}

export function emitMessagesRead(
  io: SocketIOServer | undefined,
  opts: { conversationId: string; readerId: string; participantIds: string[]; readAt: Date },
): void {
  if (!io) return;
  const payload = {
    conversationId: opts.conversationId,
    readerId: opts.readerId,
    readAt: opts.readAt,
  };
  for (const userId of opts.participantIds) {
    if (userId === opts.readerId) continue;
    io.to(chatUserRoom(userId)).emit('messages_read', payload);
  }
  io.to(conversationRoom(opts.conversationId)).emit('messages_read', payload);
}

export function attachRealtime(io: SocketIOServer): void {
  realtimeIo = io;
  io.use(async (socket, next) => {
    const token = tokenFromSocketHandshake(socket.handshake);
    if (!token) {
      next(new Error('unauthorized'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const [active, terminated] = await Promise.all([
        assertUserActive(payload.userId),
        wasLoggedOutAll(payload.userId, payload.iat),
      ]);
      if (!active || terminated) {
        next(new Error('unauthorized'));
        return;
      }
      socket.data.userId = payload.userId;
      await Promise.all([
        socket.join(chatUserRoom(payload.userId)),
        socket.join(notificationUserRoom(payload.userId)),
      ]);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    logger.debug(`Socket connected: ${userId}`);

    socket.on('join_conversation', (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !conversationId.trim()) return;
      void ConversationService.requireParticipant(conversationId, userId)
        .then(() => {
          socket.join(conversationRoom(conversationId));
        })
        .catch(() => undefined);
    });

    socket.on('leave_conversation', (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return;
      void socket.leave(conversationRoom(conversationId));
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${userId}`);
    });
  });
}
