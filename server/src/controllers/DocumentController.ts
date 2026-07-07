import { Request, Response, NextFunction } from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';

const s3 = new S3Client({ region: env.AWS_DEFAULT_REGION });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

export const uploadMiddleware = upload.single('file');

export class DocumentController {
  // GET /documents/statistics
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

  // GET /documents/type/:type
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

  // GET /storage/signed-url
  async getSignedUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const { key, expiresIn = '3600' } = req.query as Record<string, string>;
      if (!key) throw new AppError('key query param is required', 400);

      const command = new GetObjectCommand({ Bucket: env.AWS_BUCKET!, Key: key });
      const url = await getSignedUrl(s3, command, { expiresIn: parseInt(expiresIn) });
      res.json({ data: { url, expiresIn: parseInt(expiresIn) } });
    } catch (err) {
      next(err);
    }
  }

  // POST /upload
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError('No file provided', 400);
      const userId = req.user!.userId;
      const { documentType = 'general', title } = req.body;

      const ext = req.file.originalname.split('.').pop();
      const key = `documents/${userId}/${uuidv4()}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: env.AWS_BUCKET!,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })
      );

      const fileUrl = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

      const doc = await prisma.document.create({
        data: {
          userId,
          name: title || req.file.originalname,
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

  // GET /documents/:id/download
  async downloadDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      const doc = await prisma.document.findUnique({ where: { id } });
      if (!doc) throw new AppError('Document not found', 404);
      if (doc.userId !== userId && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);
      const fileKey = (doc.metadata as Record<string, string> | null)?.fileKey;
      if (!fileKey) throw new AppError('File not available for download', 404);

      const command = new GetObjectCommand({ Bucket: env.AWS_BUCKET!, Key: fileKey });
      const url = await getSignedUrl(s3, command, { expiresIn: 300 });

      res.redirect(url);
    } catch (err) {
      next(err);
    }
  }
}

export default new DocumentController();
