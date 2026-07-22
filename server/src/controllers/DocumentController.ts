import { Request, Response, NextFunction } from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import {
  UPLOAD_MAX_BYTES,
  assertAllowedUploadMime,
  sanitizeUploadFilename,
} from '../utils/uploadAllowlist';

const s3 = new S3Client({ region: env.AWS_DEFAULT_REGION });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    try {
      assertAllowedUploadMime(file.mimetype);
      cb(null, true);
    } catch (err) {
      cb(err instanceof Error ? err : new Error('Unsupported file type.'));
    }
  },
});

export const uploadMiddleware = upload.single('file');

export class DocumentController {
  async getStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const [total, pending, approved, expired] = await Promise.all([
        prisma.document.count({ where: { userId } }),
        prisma.document.count({ where: { userId, status: 'pending' } }),
        prisma.document.count({ where: { userId, status: 'approved' } }),
        prisma.document.count({ where: { userId, status: 'expired' } }),
      ]);
      res.json({ data: { total, pending, approved, expired } });
    } catch (err) {
      next(err);
    }
  }

  async getByType(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const { type } = req.params;
      const docs = await prisma.document.findMany({
        where: { userId, type },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ data: docs });
    } catch (err) {
      next(err);
    }
  }

  async getSignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { key, expiresIn = '3600' } = req.query as Record<string, string>;
      if (!key) throw new AppError('key query param is required', 400);
      if (key.includes('..') || key.startsWith('/')) {
        throw new AppError('Document not found', 404);
      }

      const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
      const owned =
        key.startsWith(`documents/${req.user!.userId}/`) ||
        key.startsWith(`intake/${req.user!.userId}/`);

      if (!isAdmin && !owned) {
        const doc = await prisma.document.findFirst({
          where: {
            userId: req.user!.userId,
            deletedAt: null,
            OR: [
              { metadata: { path: ['fileKey'], equals: key } },
              { url: { contains: key } },
            ],
          },
          select: { id: true },
        });
        if (!doc) throw new AppError('Document not found', 404);
      }

      const command = new GetObjectCommand({
        Bucket: env.AWS_BUCKET!,
        Key: key,
        ResponseContentDisposition: 'attachment',
      });
      const url = await getSignedUrl(s3, command, { expiresIn: parseInt(expiresIn) });
      res.json({ data: { url, expiresIn: parseInt(expiresIn) } });
    } catch (err) {
      next(err);
    }
  }

  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      assertAllowedUploadMime(req.file.mimetype);
      const userId = req.user!.userId;
      const { documentType = 'general', title } = req.body;

      const safeName = sanitizeUploadFilename(req.file.originalname);
      const key = `documents/${userId}/${uuidv4()}-${safeName}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: env.AWS_BUCKET!,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
          ContentDisposition: 'attachment',
        }),
      );

      const fileUrl = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

      const doc = await prisma.document.create({
        data: {
          userId,
          name: title ? sanitizeUploadFilename(String(title)) : safeName,
          type: documentType,
          url: fileUrl,
          status: 'pending',
          mimeType: req.file.mimetype,
          size: req.file.size,
          metadata: { fileKey: key },
        },
      });

      res.status(201).json({ data: doc });
    } catch (err) {
      next(err);
    }
  }

  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc || doc.deletedAt) throw new AppError('Document not found', 404);
      const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
      if (doc.userId !== userId && !isAdmin) throw new AppError('Document not found', 404);
      const fileKey = (doc.metadata as Record<string, string> | null)?.fileKey;
      if (!fileKey) throw new AppError('Document not found', 404);

      const command = new GetObjectCommand({
        Bucket: env.AWS_BUCKET!,
        Key: fileKey,
        ResponseContentDisposition: `attachment; filename="${sanitizeUploadFilename(doc.name)}"`,
      });
      const url = await getSignedUrl(s3, command, { expiresIn: 300 });

      res.redirect(url);
    } catch (err) {
      next(err);
    }
  }
}

export default new DocumentController();
