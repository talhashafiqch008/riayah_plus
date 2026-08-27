import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  assertAllowedUploadMime,
  sanitizeUploadFilename,
  UPLOAD_MAX_BYTES,
} from '../utils/uploadAllowlist';
import { sanitizePlainText } from '../utils/sanitize';
import { ConversationService } from './ConversationService';
import { chatMessageType, isChatAttachmentKey, unreadMessageWhere } from './chatMessageRules';

const LOCAL_CHAT_ROOT = path.join(process.cwd(), 'uploads', 'chat');

const s3Configured = Boolean(
  env.AWS_ACCESS_KEY_ID?.trim() && env.AWS_SECRET_ACCESS_KEY?.trim() && env.AWS_BUCKET?.trim(),
);
const s3 = s3Configured
  ? new S3Client({
      region: env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

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

  static async attachmentPath(conversationId: string, actorId: string, fileName: string) {
    const resolved = await this.resolveAttachmentForDownload(conversationId, actorId, fileName);
    if (resolved.source !== 'local') {
      throw new AppError('Attachment not found.', 404);
    }
    return { full: resolved.full, fileName: resolved.fileName, key: resolved.key };
  }

  static async resolveAttachmentForDownload(
    conversationId: string,
    actorId: string,
    fileName: string,
  ): Promise<
    | {
        source: 'local';
        full: string;
        fileName: string;
        key: string;
      }
    | {
        source: 's3';
        body: Readable;
        fileName: string;
        key: string;
        contentType?: string;
        contentLength?: number;
      }
  > {
    await ConversationService.requireParticipant(conversationId, actorId);
    const decodedName = decodeURIComponent(fileName);
    const key = `chat/${conversationId}/${decodedName}`;
    if (!isChatAttachmentKey(conversationId, key)) {
      throw new AppError('Invalid attachment.', 400);
    }

    if (s3 && s3Configured) {
      try {
        const obj = await s3.send(
          new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }),
        );
        if (!obj.Body) throw new AppError('Attachment not found.', 404);
        return {
          source: 's3',
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

    const dir = path.join(LOCAL_CHAT_ROOT, conversationId);
    const full = path.join(dir, decodedName);
    if (!full.startsWith(dir + path.sep)) throw new AppError('Invalid attachment.', 400);
    if (!fs.existsSync(full)) throw new AppError('Attachment not found.', 404);
    return { source: 'local', full, fileName: decodedName, key };
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

    const safeName = sanitizeUploadFilename(file.originalname);
    const key = `chat/${conversationId}/${uuidv4()}-${safeName}`;

    if (s3 && s3Configured) {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.AWS_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentDisposition: 'attachment',
        }),
      );
      return key;
    }

    const dir = path.join(LOCAL_CHAT_ROOT, conversationId);
    fs.mkdirSync(dir, { recursive: true });
    const fileName = key.slice(`chat/${conversationId}/`.length);
    const full = path.join(dir, fileName);
    if (!full.startsWith(dir + path.sep)) throw new AppError('Invalid file path.', 400);
    fs.writeFileSync(full, file.buffer);
    return key;
  }
}
