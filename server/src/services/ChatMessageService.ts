import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  assertAllowedUploadMime,
  sanitizeUploadFilename,
  UPLOAD_MAX_BYTES,
} from '../utils/uploadAllowlist';
import { sanitizePlainText } from '../utils/sanitize';
import {
  assertPhiS3UploadConfigured,
  createPhiS3Client,
  isPhiS3Configured,
  putPhiObject,
} from '../utils/phiS3';
import { ConversationService } from './ConversationService';
import { chatMessageType, isChatAttachmentKey, unreadMessageWhere } from './chatMessageRules';

export { chatMessageType, isChatAttachmentKey, unreadMessageWhere };

export type ChatUpload = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export class ChatMessageService {
  static async list(conversationId: string, actorId: string, page = 1, limit = 50) {
    await ConversationService.requireParticipant(conversationId, actorId);
    const take = Math.min(Math.max(limit, 1), 100);
    const skip = (Math.max(page, 1) - 1) * take;
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return messages.reverse().map((m) =>
      m.deletedAt
        ? { ...m, content: null, fileUrl: null, deleted: true }
        : { ...m, deleted: false },
    );
  }

  static async send(opts: {
    conversationId: string;
    actorId: string;
    content?: string;
    file?: ChatUpload;
  }) {
    const conversation = await ConversationService.requireParticipant(opts.conversationId, opts.actorId);
    const text = opts.content ? sanitizePlainText(opts.content) : '';
    let fileUrl: string | undefined;
    let mime: string | undefined;

    if (opts.file) {
      fileUrl = await this.storeAttachment(opts.conversationId, opts.file);
      mime = opts.file.mimetype;
    }
    if (!text && !fileUrl) {
      throw new AppError('Message content or file is required.', 400);
    }

    const receiverId = conversation.participantLinks.find((p) => p.userId !== opts.actorId)?.userId;
    const message = await prisma.message.create({
      data: {
        conversationId: opts.conversationId,
        senderId: opts.actorId,
        receiverId,
        content: text || null,
        type: chatMessageType(Boolean(fileUrl), mime),
        fileUrl,
        status: 'sent',
      },
      include: { sender: { select: { id: true, name: true, avatar: true } } },
    });

    await prisma.conversation.update({
      where: { id: opts.conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  static async markRead(conversationId: string, readerId: string) {
    const conversation = await ConversationService.requireParticipant(conversationId, readerId);
    const now = new Date();
    const result = await prisma.message.updateMany({
      where: unreadMessageWhere(conversationId, readerId),
      data: { status: 'read', readAt: now },
    });
    await prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: readerId },
      data: { lastReadAt: now },
    });
    return {
      updated: result.count,
      readAt: now,
      participantIds: conversation.participantLinks.map((p) => p.userId),
    };
  }

  static async resolveAttachmentForDownload(
    conversationId: string,
    actorId: string,
    fileName: string,
  ): Promise<{
    body: Readable;
    fileName: string;
    key: string;
    contentType?: string;
    contentLength?: number;
  }> {
    await ConversationService.requireParticipant(conversationId, actorId);
    if (!isPhiS3Configured()) {
      throw new AppError('Chat attachment storage is not configured.', 503);
    }

    const decodedName = decodeURIComponent(fileName);
    const key = `chat/${conversationId}/${decodedName}`;
    if (!isChatAttachmentKey(conversationId, key)) {
      throw new AppError('Invalid attachment.', 400);
    }

    const s3 = createPhiS3Client();
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }));
      if (!obj.Body) throw new AppError('Attachment not found.', 404);
      return {
        body: obj.Body as Readable,
        fileName: decodedName,
        key,
        contentType: obj.ContentType,
        contentLength: obj.ContentLength,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError('Attachment not found.', 404);
    }
  }

  private static async storeAttachment(conversationId: string, file: ChatUpload): Promise<string> {
    try {
      assertAllowedUploadMime(file.mimetype);
    } catch {
      throw new AppError('Unsupported file type. Use PDF, Word, JPEG, PNG, or WebP.', 422);
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      throw new AppError(`File exceeds ${UPLOAD_MAX_BYTES} byte limit.`, 422);
    }

    assertPhiS3UploadConfigured('Chat attachment storage');

    const safeName = sanitizeUploadFilename(file.originalname);
    const key = `chat/${conversationId}/${uuidv4()}-${safeName}`;

    await putPhiObject('chat_attachment', {
      key,
      body: file.buffer,
      contentType: file.mimetype,
      contentDisposition: 'attachment',
    });
    return key;
  }
}
