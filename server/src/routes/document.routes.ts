import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { authenticate } from '../middleware/auth';
import { documentLimiter } from '../middleware/rateLimiter';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
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
const router = Router();
router.use(authenticate);

function notFoundDoc(): never {
  throw new AppError('Document not found.', 404);
}

// Upload document
router.post('/upload', documentLimiter, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded.', 422);
  assertAllowedUploadMime(req.file.mimetype);

  const safeName = sanitizeUploadFilename(req.file.originalname);
  const key = `documents/${req.user!.userId}/${uuidv4()}-${safeName}`;

  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ContentDisposition: 'attachment',
  }));

  const url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

  const doc = await prisma.document.create({
    data: {
      userId: req.user!.userId,
      type: req.body.type ?? 'general',
      name: safeName,
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'pending',
      metadata: { fileKey: key },
    },
  });

  res.status(201).json({
    data: doc,
    maxBytes: UPLOAD_MAX_BYTES,
    allowedMimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
  });
});

// Get signed URL — ownership required (M-9 / M-34)
router.post('/signed-url', async (req: Request, res: Response) => {
  const { key } = z.object({ key: z.string().min(1) }).parse(req.body);
  if (key.includes('..') || key.startsWith('/')) notFoundDoc();

  const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
  const ownedPrefix = `documents/${req.user!.userId}/`;
  const intakePrefix = `intake/${req.user!.userId}/`;
  if (!isAdmin && !key.startsWith(ownedPrefix) && !key.startsWith(intakePrefix)) {
    notFoundDoc();
  }

  const command = new GetObjectCommand({
    Bucket: env.AWS_BUCKET,
    Key: key,
    ResponseContentDisposition: 'attachment',
  });
  const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
  res.json({ url });
});

// List documents
router.get('/', async (req: Request, res: Response) => {
  const docs = await prisma.document.findMany({
    where: { userId: req.user!.userId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ data: docs });
});

// Get document — owner or admin only (Z-3)
router.get('/:id', async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc || doc.deletedAt) notFoundDoc();
  const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
  if (doc!.userId !== req.user!.userId && !isAdmin) notFoundDoc();
  res.json({ data: doc });
});

// Delete document — owner or admin only (Z-3)
router.delete('/:id', async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc || doc.deletedAt) notFoundDoc();
  const isAdmin = ['admin', 'super_admin', 'support_admin'].includes(req.user!.role);
  if (doc!.userId !== req.user!.userId && !isAdmin) notFoundDoc();
  await prisma.document.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ message: 'Document deleted.' });
});

// Admin/coordinator: approve/reject (Z-3)
router.post('/:id/approve', async (req: Request, res: Response) => {
  if (!['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role)) {
    throw new AppError('Forbidden.', 403);
  }
  await prisma.document.update({
    where: { id: req.params.id },
    data: { status: 'approved', verifierId: req.user!.userId, verifiedAt: new Date() },
  });
  res.json({ message: 'Document approved.' });
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  if (!['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role)) {
    throw new AppError('Forbidden.', 403);
  }
  const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);
  await prisma.document.update({
    where: { id: req.params.id },
    data: { status: 'rejected', rejectionNotes: notes },
  });
  res.json({ message: 'Document rejected.' });
});

export default router;
