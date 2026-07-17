import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { IntakeDocumentCategory, Prisma } from '@prisma/client';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { env } from '../../config/env';
import { tenantWhere } from '../../middleware/tenantScope';

const ADMIN_ROLES = ['admin', 'super_admin', 'support_admin'];
const COORDINATOR_ROLES = ['care_coordinator', ...ADMIN_ROLES];
const FAMILY_ROLES = ['family', 'client', 'consumer'];

const CATEGORIES = Object.values(IntakeDocumentCategory);

const LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'intake');

const s3Configured = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY && env.AWS_BUCKET);
const s3 = s3Configured
  ? new S3Client({
      region: env.AWS_DEFAULT_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    })
  : null;

export const intakeDocUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Use PDF, Word, or image.'));
    }
  },
}).single('file');

function isAdmin(role: string) {
  return ADMIN_ROLES.includes(role);
}
function isCoordinator(role: string) {
  return COORDINATOR_ROLES.includes(role);
}
function isFamily(role: string) {
  return FAMILY_ROLES.includes(role);
}

async function requireCareUnitAccess(req: Request, careUnitId: string) {
  const unit = await prisma.careUnit.findFirst({
    where: { id: careUnitId, deletedAt: null },
  });
  if (!unit) throw new AppError('Care unit not found.', 404);

  const role = req.user!.role;
  if (isAdmin(role)) return unit;
  if (isFamily(role) && unit.familyUserId === req.user!.userId) return unit;
  if (isCoordinator(role)) {
    const tw = tenantWhere(req);
    if (tw.organizationId === '__no_tenant__') {
      throw new AppError('No organization assigned to this account.', 403);
    }
    if (tw.organizationId && unit.organizationId !== tw.organizationId) {
      throw new AppError('Forbidden.', 403);
    }
    return unit;
  }
  throw new AppError('Forbidden.', 403);
}

function ensureLocalDir(userId: string) {
  const dir = path.join(LOCAL_UPLOAD_ROOT, userId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export class IntakeDocumentController {
  /**
   * POST /intake/documents/presign
   * Returns a presigned PUT URL when S3 is configured; otherwise instructs client to use multipart upload.
   */
  static async presign(req: Request, res: Response): Promise<void> {
    const { careUnitId, category, fileName, mimeType, size } = req.body as Record<string, string>;
    if (!careUnitId) throw new AppError('careUnitId is required.', 422);
    if (!category || !CATEGORIES.includes(category as IntakeDocumentCategory)) {
      throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`, 422);
    }
    if (!fileName) throw new AppError('fileName is required.', 422);

    await requireCareUnitAccess(req, careUnitId);

    if (!s3 || !s3Configured) {
      res.json({
        data: {
          mode: 'multipart' as const,
          uploadPath: '/api/intake/documents',
          message: 'S3 not configured — use multipart upload to /api/intake/documents',
        },
      });
      return;
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `intake/${req.user!.userId}/${uuidv4()}-${safeName}`;
    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET,
      Key: key,
      ContentType: mimeType || 'application/octet-stream',
      ...(size ? { ContentLength: parseInt(String(size), 10) } : {}),
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    res.json({
      data: {
        mode: 's3' as const,
        uploadUrl,
        key,
        expiresIn: 900,
        category,
        careUnitId,
      },
    });
  }

  /**
   * POST /intake/documents/confirm — after client PUTs to S3.
   */
  static async confirm(req: Request, res: Response): Promise<void> {
    if (!s3Configured) {
      throw new AppError('S3 confirm requires AWS credentials. Use multipart upload instead.', 422);
    }

    const { careUnitId, category, key, name, mimeType, size } = req.body as Record<string, string>;
    if (!careUnitId || !key || !name) {
      throw new AppError('careUnitId, key, and name are required.', 422);
    }
    if (!category || !CATEGORIES.includes(category as IntakeDocumentCategory)) {
      throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`, 422);
    }
    if (!key.startsWith(`intake/${req.user!.userId}/`)) {
      throw new AppError('Invalid upload key.', 403);
    }

    await requireCareUnitAccess(req, careUnitId);

    const url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
    const doc = await prisma.document.create({
      data: {
        userId: req.user!.userId,
        careUnitId,
        type: 'intake',
        category: category as IntakeDocumentCategory,
        name,
        url,
        mimeType: mimeType || null,
        size: size ? parseInt(String(size), 10) : null,
        status: 'pending',
        metadata: { fileKey: key, storage: 's3' } as Prisma.InputJsonValue,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_document_uploaded',
      entity: 'Document',
      entityId: doc.id,
      after: { category, careUnitId, name },
      req,
    });

    res.status(201).json({ data: doc });
  }

  /**
   * POST /intake/documents — multipart upload (S3 or local fallback).
   */
  static async upload(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new AppError('No file uploaded.', 422);

    const careUnitId = String(req.body.careUnitId || '');
    const category = String(req.body.category || '');
    if (!careUnitId) throw new AppError('careUnitId is required.', 422);
    if (!CATEGORIES.includes(category as IntakeDocumentCategory)) {
      throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`, 422);
    }

    await requireCareUnitAccess(req, careUnitId);

    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `intake/${req.user!.userId}/${uuidv4()}-${safeName}`;
    let url: string;
    let storage: 's3' | 'local';

    if (s3 && s3Configured) {
      await s3.send(
        new PutObjectCommand({
          Bucket: env.AWS_BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        }),
      );
      url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
      storage = 's3';
    } else {
      const dir = ensureLocalDir(req.user!.userId);
      const localName = path.basename(key);
      const localPath = path.join(dir, localName);
      fs.writeFileSync(localPath, req.file.buffer);
      url = `/api/intake/documents/local/${req.user!.userId}/${localName}`;
      storage = 'local';
    }

    const doc = await prisma.document.create({
      data: {
        userId: req.user!.userId,
        careUnitId,
        type: 'intake',
        category: category as IntakeDocumentCategory,
        name: req.file.originalname,
        url,
        mimeType: req.file.mimetype,
        size: req.file.size,
        status: 'pending',
        metadata: { fileKey: key, storage } as Prisma.InputJsonValue,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_document_uploaded',
      entity: 'Document',
      entityId: doc.id,
      after: { category, careUnitId, name: doc.name, storage },
      req,
    });

    res.status(201).json({ data: doc });
  }

  /** GET /intake/documents/:id/download — signed URL or local stream */
  static async download(req: Request, res: Response): Promise<void> {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        intakeRecord: { select: { id: true, familyUserId: true, organizationId: true } },
        careUnit: { select: { id: true, familyUserId: true, organizationId: true } },
      },
    });
    if (!doc) throw new AppError('Document not found.', 404);

    const role = req.user!.role;
    const allowed =
      isAdmin(role) ||
      doc.userId === req.user!.userId ||
      (isFamily(role) &&
        (doc.careUnit?.familyUserId === req.user!.userId ||
          doc.intakeRecord?.familyUserId === req.user!.userId)) ||
      (isCoordinator(role) &&
        (() => {
          const tw = tenantWhere(req);
          const org =
            doc.intakeRecord?.organizationId ?? doc.careUnit?.organizationId ?? null;
          if (tw.organizationId === '__no_tenant__') return false;
          if (!tw.organizationId) return true;
          return !org || org === tw.organizationId;
        })());

    if (!allowed) throw new AppError('Forbidden.', 403);

    const meta = (doc.metadata as Record<string, string> | null) ?? {};
    const fileKey = meta.fileKey;
    const storage = meta.storage || (doc.url.startsWith('/api/') ? 'local' : 's3');

    if (storage === 'local' && fileKey) {
      const ownerPath = path.join(LOCAL_UPLOAD_ROOT, doc.userId, path.basename(fileKey));
      if (!fs.existsSync(ownerPath)) {
        throw new AppError('File not found on disk.', 404);
      }
      // Force binary type — global JSON middleware can leave Content-Type as application/json
      res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
      res.download(ownerPath, doc.name);
      return;
    }

    if (s3 && s3Configured && fileKey) {
      const command = new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: fileKey });
      const signed = await getSignedUrl(s3, command, { expiresIn: 300 });
      res.json({ data: { url: signed, expiresIn: 300, name: doc.name } });
      return;
    }

    // Fallback: redirect to stored URL if public
    if (doc.url.startsWith('http')) {
      res.json({ data: { url: doc.url, expiresIn: 0, name: doc.name } });
      return;
    }

    throw new AppError('File not available for download.', 404);
  }
}
