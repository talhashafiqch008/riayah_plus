import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../config/database';
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

/** How often connected sockets re-check account/session status (AUTH-05). */
const SOCKET_REVALIDATE_MS = 60_000;

let realtimeIo: SocketIOServer | undefined;

export function getRealtimeIo(): SocketIOServer | undefined {
  return realtimeIo;
}

/**
 * AUTH-05: Force-disconnect all Socket.IO connections for a user after
 * logout / logout-all / password reset / password change / suspension.
 */
export function disconnectUserSockets(userId: string): void {
  const io = realtimeIo;
  if (!io || !userId) return;
  try {
    io.in(chatUserRoom(userId)).disconnectSockets(true);
    io.in(notificationUserRoom(userId)).disconnectSockets(true);
  } catch (err) {
    logger.warn(`Failed to disconnect user sockets for ${userId}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function emitNotification(userId: string, payload: unknown): void {
  realtimeIo?.to(notificationUserRoom(userId)).emit('notification', payload);
}

export async function emitNewMessage(
  io: SocketIOServer | undefined,
  message: {
    id?: string;
    receiverId?: string | null;
    senderId?: string | null;
    conversationId?: string | null;
  },
): Promise<void> {
  const bus = io ?? realtimeIo;
  if (!bus) return;

  // Plain JSON so Socket.IO clients always get serializable fields (Prisma dates, etc.)
  const payload = JSON.parse(JSON.stringify(message)) as typeof message;

  const userIds = new Set<string>();
  if (payload.receiverId) userIds.add(payload.receiverId);
  if (payload.senderId) userIds.add(payload.senderId);

  if (payload.conversationId) {
    bus.to(conversationRoom(payload.conversationId)).emit('new_message', payload);
    const links = await prisma.conversationParticipant.findMany({
      where: { conversationId: payload.conversationId },
      select: { userId: true },
    });
    for (const link of links) userIds.add(link.userId);
  }

  for (const userId of userIds) {
    bus.to(chatUserRoom(userId)).emit('new_message', payload);
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
      socket.data.tokenIat = payload.iat ?? 0;
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

    // AUTH-05: periodic session revalidation — disconnect if revoked / suspended
    const revalidateTimer = setInterval(() => {
      void (async () => {
        try {
          const tokenIat = typeof socket.data.tokenIat === 'number' ? socket.data.tokenIat : 0;
          const [active, terminated] = await Promise.all([
            assertUserActive(userId),
            wasLoggedOutAll(userId, tokenIat),
          ]);
          if (!active || terminated) {
            socket.disconnect(true);
          }
        } catch {
          socket.disconnect(true);
        }
      })();
    }, SOCKET_REVALIDATE_MS);

    socket.on('join_conversation', (conversationId: unknown) => {
      if (typeof conversationId !== 'string' || !conversationId.trim()) return;
      void (async () => {
        try {
          const tokenIat = typeof socket.data.tokenIat === 'number' ? socket.data.tokenIat : 0;
          const [active, terminated] = await Promise.all([
            assertUserActive(userId),
            wasLoggedOutAll(userId, tokenIat),
          ]);
          if (!active || terminated) {
            socket.disconnect(true);
            return;
          }
          await ConversationService.requireParticipant(conversationId, userId);
          await socket.join(conversationRoom(conversationId));
        } catch {
          // deny silently
        }
      })();
    });

    socket.on('leave_conversation', (conversationId: unknown) => {
      if (typeof conversationId !== 'string') return;
      void socket.leave(conversationRoom(conversationId));
    });

    socket.on('disconnect', () => {
      clearInterval(revalidateTimer);
      logger.debug(`Socket disconnected: ${userId}`);
    });
  });
}
