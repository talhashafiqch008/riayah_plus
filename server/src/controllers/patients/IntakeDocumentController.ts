import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { IntakeDocumentCategory, Prisma } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { env } from '../../config/env';
import { tenantWhere } from '../../middleware/tenantScope';
import { redis } from '../../config/redis';
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_MAX_BYTES,
  assertAllowedUploadMime,
  isValidIntakeFileKey,
  sanitizeUploadFilename,
} from '../../utils/uploadAllowlist';

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
  limits: { fileSize: UPLOAD_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    try {
      assertAllowedUploadMime(file.mimetype);
      cb(null, true);
    } catch (err) {
      cb(err instanceof Error ? err : new Error('Unsupported file type.'));
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
    if (tw.organizationId === '__no_tenant__' || !tw.organizationId) {
      throw new AppError('No organization assigned to this account.', 403);
    }
    // M-1: reject null-org units for coordinators
    if (!unit.organizationId || unit.organizationId !== tw.organizationId) {
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

function uploadTokenKey(token: string) {
  return `upload:presign:${token}`;
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

    try {
      assertAllowedUploadMime(mimeType);
    } catch {
      throw new AppError(
        `Unsupported mimeType. Allowed: ${ALLOWED_UPLOAD_MIME_TYPES.join(', ')}`,
        422,
      );
    }

    const parsedSize = size ? parseInt(String(size), 10) : NaN;
    if (!Number.isFinite(parsedSize) || parsedSize <= 0 || parsedSize > UPLOAD_MAX_BYTES) {
      throw new AppError(`File size must be between 1 and ${UPLOAD_MAX_BYTES} bytes.`, 422);
    }

    await requireCareUnitAccess(req, careUnitId);

    if (!s3 || !s3Configured) {
      res.json({
        data: {
          mode: 'multipart' as const,
          uploadPath: '/api/intake/documents',
          message: 'S3 not configured — use multipart upload to /api/intake/documents',
          maxBytes: UPLOAD_MAX_BYTES,
          allowedMimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
        },
      });
      return;
    }

    const safeName = sanitizeUploadFilename(fileName);
    const key = `intake/${req.user!.userId}/${uuidv4()}-${safeName}`;
    const uploadToken = crypto.randomBytes(24).toString('hex');

    const command = new PutObjectCommand({
      Bucket: env.AWS_BUCKET,
      Key: key,
      ContentType: mimeType,
      ContentLength: parsedSize,
    });
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

    // M-8: one-time upload token required at confirm
    await redis.set(
      uploadTokenKey(uploadToken),
      JSON.stringify({
        userId: req.user!.userId,
        key,
        mimeType,
        size: parsedSize,
        careUnitId,
        category,
      }),
      'EX',
      900,
    );

    res.json({
      data: {
        mode: 's3' as const,
        uploadUrl,
        key,
        uploadToken,
        expiresIn: 900,
        category,
        careUnitId,
        maxBytes: UPLOAD_MAX_BYTES,
        allowedMimeTypes: ALLOWED_UPLOAD_MIME_TYPES,
      },
    });
  }

  /**
   * POST /intake/documents/confirm — after client PUTs to S3.
   */
  static async confirm(req: Request, res: Response): Promise<void> {
    if (!s3 || !s3Configured) {
      throw new AppError('S3 confirm requires AWS credentials. Use multipart upload instead.', 422);
    }

    const { careUnitId, category, key, name, uploadToken } = req.body as Record<string, string>;
    if (!careUnitId || !key || !name || !uploadToken) {
      throw new AppError('careUnitId, key, name, and uploadToken are required.', 422);
    }
    if (!category || !CATEGORIES.includes(category as IntakeDocumentCategory)) {
      throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`, 422);
    }
    if (!isValidIntakeFileKey(key, req.user!.userId)) {
      throw new AppError('Invalid upload key.', 403);
    }

    const tokenRaw = await redis.get(uploadTokenKey(uploadToken));
    if (!tokenRaw) throw new AppError('Invalid or expired upload token.', 422);
    await redis.del(uploadTokenKey(uploadToken));

    let pending: {
      userId: string;
      key: string;
      mimeType: string;
      size: number;
      careUnitId: string;
      category: string;
    };
    try {
      pending = JSON.parse(tokenRaw);
    } catch {
      throw new AppError('Invalid upload token.', 422);
    }

    if (
      pending.userId !== req.user!.userId ||
      pending.key !== key ||
      pending.careUnitId !== careUnitId ||
      pending.category !== category
    ) {
      throw new AppError('Upload token does not match this request.', 403);
    }

    await requireCareUnitAccess(req, careUnitId);

    // H-4: verify object metadata from S3, not client body
    let head;
    try {
      head = await s3.send(
        new HeadObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }),
      );
    } catch {
      throw new AppError('Uploaded object not found.', 422);
    }

    const headMime = head.ContentType || pending.mimeType;
    const headSize = head.ContentLength ?? pending.size;
    try {
      assertAllowedUploadMime(headMime);
    } catch {
      throw new AppError('Uploaded object has disallowed content type.', 422);
    }
    if (!headSize || headSize > UPLOAD_MAX_BYTES) {
      throw new AppError('Uploaded object exceeds size limit.', 422);
    }

    const url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
    const doc = await prisma.document.create({
      data: {
        userId: req.user!.userId,
        careUnitId,
        type: 'intake',
        category: category as IntakeDocumentCategory,
        name: sanitizeUploadFilename(name),
        url,
        mimeType: headMime,
        size: headSize,
        status: 'pending',
        metadata: { fileKey: key, storage: 's3' } as Prisma.InputJsonValue,
      },
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'intake_document_uploaded',
      entity: 'Document',
      entityId: doc.id,
      after: { category, careUnitId, name: doc.name },
      req,
    });

    res.status(201).json({ data: doc });
  }

  /**
   * POST /intake/documents — multipart upload (S3 or local fallback).
   */
  static async upload(req: Request, res: Response): Promise<void> {
    if (!req.file) throw new AppError('No file uploaded.', 422);
    try {
      assertAllowedUploadMime(req.file.mimetype);
    } catch {
      throw new AppError('Unsupported file type.', 422);
    }
    if (req.file.size > UPLOAD_MAX_BYTES) {
      throw new AppError(`File exceeds ${UPLOAD_MAX_BYTES} byte limit.`, 422);
    }

    const careUnitId = String(req.body.careUnitId || '');
    const category = String(req.body.category || '');
    if (!careUnitId) throw new AppError('careUnitId is required.', 422);
    if (!CATEGORIES.includes(category as IntakeDocumentCategory)) {
      throw new AppError(`category must be one of: ${CATEGORIES.join(', ')}`, 422);
    }

    await requireCareUnitAccess(req, careUnitId);

    const safeName = sanitizeUploadFilename(req.file.originalname);
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
          ContentDisposition: 'attachment',
        }),
      );
      url = `https://${env.AWS_BUCKET}.s3.${env.AWS_DEFAULT_REGION}.amazonaws.com/${key}`;
      storage = 's3';
    } else {
      const dir = ensureLocalDir(req.user!.userId);
      const localName = path.basename(key);
      const localPath = path.join(dir, localName);
      // M-32: ensure resolved path stays under user dir
      if (!localPath.startsWith(dir + path.sep)) {
        throw new AppError('Invalid file path.', 400);
      }
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
        name: safeName,
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
    const notFound = () => {
      throw new AppError('Document not found.', 404);
    };

    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        intakeRecord: { select: { id: true, familyUserId: true, organizationId: true } },
        careUnit: { select: { id: true, familyUserId: true, organizationId: true } },
      },
    });
    // M-31: uniform 404 for missing/unauthorized
    if (!doc) notFound();

    const role = req.user!.role;
    const allowed =
      isAdmin(role) ||
      doc!.userId === req.user!.userId ||
      (isFamily(role) &&
        (doc!.careUnit?.familyUserId === req.user!.userId ||
          doc!.intakeRecord?.familyUserId === req.user!.userId)) ||
      (isCoordinator(role) &&
        (() => {
          const tw = tenantWhere(req);
          const org =
            doc!.intakeRecord?.organizationId ?? doc!.careUnit?.organizationId ?? null;
          if (!tw.organizationId || tw.organizationId === '__no_tenant__') return false;
          // M-1: null org not visible cross-tenant
          if (!org) return false;
          return org === tw.organizationId;
        })());

    if (!allowed) notFound();

    const meta = (doc!.metadata as Record<string, string> | null) ?? {};
    const fileKey = meta.fileKey;
    const storage = meta.storage || (doc!.url.startsWith('/api/') ? 'local' : 's3');

    if (storage === 'local' && fileKey) {
      if (!isValidIntakeFileKey(fileKey, doc!.userId)) {
        notFound();
      }
      const ownerDir = path.join(LOCAL_UPLOAD_ROOT, doc!.userId);
      const ownerPath = path.join(ownerDir, path.basename(fileKey));
      if (!ownerPath.startsWith(ownerDir + path.sep) || !fs.existsSync(ownerPath)) {
        // M-31: do not leak missing-file vs missing-doc
        notFound();
      }
      res.setHeader('Content-Type', doc!.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizeUploadFilename(doc!.name)}"`);
      res.download(ownerPath, sanitizeUploadFilename(doc!.name));
      return;
    }

    if (s3 && s3Configured && fileKey) {
      if (!isValidIntakeFileKey(fileKey, doc!.userId)) notFound();
      const command = new GetObjectCommand({
        Bucket: env.AWS_BUCKET,
        Key: fileKey,
        ResponseContentDisposition: `attachment; filename="${sanitizeUploadFilename(doc!.name)}"`,
      });
      const signed = await getSignedUrl(s3, command, { expiresIn: 300 });
      res.json({ data: { url: signed, expiresIn: 300, name: doc!.name } });
      return;
    }

    if (doc!.url.startsWith('http')) {
      res.json({ data: { url: doc!.url, expiresIn: 0, name: doc!.name } });
      return;
    }

    notFound();
  }
}
