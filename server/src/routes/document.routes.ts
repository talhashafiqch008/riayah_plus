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

const s3 = new S3Client({ region: env.AWS_DEFAULT_REGION });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();
router.use(authenticate);

// Upload document
router.post('/upload', documentLimiter, upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('No file uploaded.', 422);

  const key = `documents/${req.user!.userId}/${uuidv4()}-${req.file.originalname}`;

  await s3.send(new PutObjectCommand({
    Bucket: env.AWS_BUCKET,
    Key: key,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  }));

  const url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;

  const doc = await prisma.document.create({
    data: {
      userId: req.user!.userId,
      type: req.body.type ?? 'general',
      name: req.file.originalname,
      url,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'pending',
    },
  });

  res.status(201).json({ data: doc });
});

// Get signed URL
router.post('/signed-url', async (req: Request, res: Response) => {
  const { key } = z.object({ key: z.string() }).parse(req.body);
  const command = new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key });
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

// Get document
router.get('/:id', async (req: Request, res: Response) => {
  const doc = await prisma.document.findUnique({ where: { id: req.params.id } });
  if (!doc) throw new AppError('Document not found.', 404);
  res.json({ data: doc });
});

// Delete document
router.delete('/:id', async (req: Request, res: Response) => {
  await prisma.document.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
  res.json({ message: 'Document deleted.' });
});

// Admin: approve/reject
router.post('/:id/approve', async (req: Request, res: Response) => {
  await prisma.document.update({
    where: { id: req.params.id },
    data: { status: 'approved', verifierId: req.user!.userId, verifiedAt: new Date() },
  });
  res.json({ message: 'Document approved.' });
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  const { notes } = z.object({ notes: z.string().optional() }).parse(req.body);
  await prisma.document.update({
    where: { id: req.params.id },
    data: { status: 'rejected', rejectionNotes: notes },
  });
  res.json({ message: 'Document rejected.' });
});

export default router;
