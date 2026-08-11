import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import {
  staffSelfProfileSelect,
  toSelfStaffProfile,
} from '../../utils/staffProfile';
import {
  AVATAR_MAX_BYTES,
  assertAllowedAvatarMime,
  avatarContentTypeForFilename,
  avatarExtForMime,
  detectAvatarMimeFromMagic,
  isValidAvatarFilename,
  isValidAvatarUserId,
} from '../../utils/uploadAllowlist';

const STAFF_ROLES = new Set([
  'provider',
  'doctor',
  'nurse',
  'care_coordinator',
  'clinical_staff',
  'support_worker',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'cleaner',
  'gardener',
  'driver',
  'companion',
  'nanny',
  'caregiver',
  'therapist',
  'org_admin',
]);

const AVATAR_ROOT = path.resolve(process.cwd(), 'uploads', 'avatars');

const availabilitySchema = z
  .object({
    days: z.array(z.number().int().min(0).max(6)).optional(),
    windows: z
      .array(
        z.object({
          start: z.string().min(1).max(16),
          end: z.string().min(1).max(16),
        }),
      )
      .optional(),
  })
  .nullable()
  .optional();

const patchMeProfileSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  phone: z.string().max(40).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  specialties: z.array(z.string().max(80)).max(30).optional(),
  languages: z.array(z.string().max(40)).max(20).optional(),
  certifications: z.array(z.string().max(80)).max(30).optional(),
  serviceAreas: z.array(z.string().max(80)).max(30).optional(),
  gender: z.string().max(40).nullable().optional(),
  nationality: z.string().max(80).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  qatarId: z.string().max(80).nullable().optional(),
  emergencyContactName: z.string().max(120).nullable().optional(),
  emergencyContactPhone: z.string().max(40).nullable().optional(),
  mohLicenseNumber: z.string().max(80).nullable().optional(),
  availabilitySchedule: availabilitySchema,
});

function assertStaffRole(role: string): void {
  if (!STAFF_ROLES.has(role)) {
    throw new AppError('Staff profile is only available for care staff accounts.', 403);
  }
}

function ensureUserAvatarDir(userId: string): string {
  if (!isValidAvatarUserId(userId)) {
    throw new AppError('Invalid user id.', 400);
  }
  const dir = path.resolve(AVATAR_ROOT, userId);
  if (!dir.startsWith(AVATAR_ROOT + path.sep)) {
    throw new AppError('Invalid file path.', 400);
  }
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function clearUserAvatarFiles(dir: string): void {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (!isValidAvatarFilename(name)) continue;
    const target = path.resolve(dir, name);
    if (!target.startsWith(dir + path.sep)) continue;
    fs.unlinkSync(target);
  }
}

/** Multer: exactly one image field named `avatar` (IV-01 MIME allowlist). */
export const staffAvatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    try {
      assertAllowedAvatarMime(file.mimetype);
      cb(null, true);
    } catch (err) {
      cb(err instanceof Error ? err : new Error('Unsupported profile photo.'));
    }
  },
}).single('avatar');

export function staffAvatarUploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  staffAvatarUpload(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        next(new AppError('Upload exactly one profile image.', 422));
        return;
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(new AppError('Profile image must be 2 MB or smaller.', 422));
        return;
      }
      next(new AppError(err.message || 'Upload failed.', 422));
      return;
    }
    next(new AppError(err instanceof Error ? err.message : 'Upload failed.', 422));
  });
}

export class StaffProfileController {
  /** GET /users/me/profile — self-managed staff profile (includes internal fields). */
  static async getMeProfile(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId, deletedAt: null },
      select: staffSelfProfileSelect,
    });
    if (!user) throw new AppError('User not found.', 404);
    assertStaffRole(user.role);

    res.json({ data: toSelfStaffProfile(user) });
  }

  /**
   * POST /users/me/avatar — multipart single image (`avatar` field).
   * Security (IV-01 / §7.2): magic-byte sniff, MIME allowlist, fixed filename,
   * path containment, size limit, single-file only. Never trusts originalname.
   */
  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    if (!isValidAvatarUserId(userId)) {
      throw new AppError('Invalid user id.', 400);
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true, avatar: true },
    });
    if (!existing) throw new AppError('User not found.', 404);
    assertStaffRole(existing.role);

    if (!req.file) {
      throw new AppError('Select one profile image (JPEG, PNG, or WebP).', 422);
    }
    if (req.file.size <= 0 || req.file.size > AVATAR_MAX_BYTES) {
      throw new AppError('Profile image must be between 1 byte and 2 MB.', 422);
    }

    // IV-01: detect type from magic bytes — do not trust client Content-Type alone
    const magicMime = detectAvatarMimeFromMagic(req.file.buffer);
    if (!magicMime) {
      throw new AppError('File content is not a valid JPEG, PNG, or WebP image.', 422);
    }
    try {
      assertAllowedAvatarMime(magicMime);
      // If client sent a Content-Type, it must agree with magic (when present)
      if (req.file.mimetype && req.file.mimetype !== magicMime) {
        throw new AppError('Declared file type does not match file contents.', 422);
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(err instanceof Error ? err.message : 'Unsupported profile photo.', 422);
    }

    const ext = avatarExtForMime(magicMime);
    const dir = ensureUserAvatarDir(userId);
    clearUserAvatarFiles(dir);

    // Fixed server-chosen name — never use originalname (audit §7.2)
    const filename = `profile.${ext}`;
    if (!isValidAvatarFilename(filename)) {
      throw new AppError('Invalid file path.', 400);
    }
    const localPath = path.resolve(dir, filename);
    if (!localPath.startsWith(dir + path.sep)) {
      throw new AppError('Invalid file path.', 400);
    }
    fs.writeFileSync(localPath, req.file.buffer, { flag: 'w' });

    const avatarUrl = `/api/avatars/${userId}/${filename}`;
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    await AuditService.log({
      userId,
      action: 'staff_avatar_uploaded',
      entity: 'User',
      entityId: userId,
      after: { avatar: avatarUrl, mime: magicMime, size: req.file.size },
      req,
    });

    res.json({ data: { avatar: avatarUrl } });
  }

  /** GET /avatars/:userId/:filename — public profile photo (no auth). */
  static async serveAvatar(req: Request, res: Response): Promise<void> {
    const userId = String(req.params.userId || '');
    const filename = String(req.params.filename || '');

    // M-32 / path traversal: strict allowlist on both segments
    if (!isValidAvatarUserId(userId) || !isValidAvatarFilename(filename)) {
      throw new AppError('Not found.', 404);
    }

    const contentType = avatarContentTypeForFilename(filename);
    if (!contentType) {
      throw new AppError('Not found.', 404);
    }

    const dir = path.resolve(AVATAR_ROOT, userId);
    if (!dir.startsWith(AVATAR_ROOT + path.sep)) {
      throw new AppError('Not found.', 404);
    }
    const filePath = path.resolve(dir, filename);
    if (!filePath.startsWith(dir + path.sep) || !fs.existsSync(filePath)) {
      throw new AppError('Not found.', 404);
    }

    // Re-verify on-disk bytes match extension (defense in depth)
    const buf = fs.readFileSync(filePath);
    const magic = detectAvatarMimeFromMagic(buf);
    if (!magic || magic !== contentType) {
      throw new AppError('Not found.', 404);
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  }

  /** PATCH /users/me/profile — staff updates own extended profile (no avatar URL). */
  static async patchMeProfile(req: Request, res: Response): Promise<void> {
    const body = patchMeProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true, name: true, phone: true, avatar: true },
    });
    if (!existing) throw new AppError('User not found.', 404);
    assertStaffRole(existing.role);

    const userData: Prisma.UserUpdateInput = {};
    if (body.name !== undefined) userData.name = body.name;
    if (body.phone !== undefined) userData.phone = body.phone;

    const profileData: Prisma.ProviderProfileUpsertArgs['create'] = {
      userId,
      bio: body.bio ?? undefined,
      yearsExperience: body.yearsExperience ?? undefined,
      specialties: body.specialties ?? [],
      languages: body.languages ?? [],
      certifications: body.certifications ?? [],
      serviceAreas: body.serviceAreas ?? [],
      gender: body.gender ?? undefined,
      nationality: body.nationality ?? undefined,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      qatarId: body.qatarId ?? undefined,
      emergencyContactName: body.emergencyContactName ?? undefined,
      emergencyContactPhone: body.emergencyContactPhone ?? undefined,
      mohLicenseNumber: body.mohLicenseNumber ?? undefined,
      availabilitySchedule:
        body.availabilitySchedule === undefined
          ? undefined
          : body.availabilitySchedule === null
            ? Prisma.DbNull
            : (body.availabilitySchedule as Prisma.InputJsonValue),
    };

    const profileUpdate: Prisma.ProviderProfileUpdateInput = {};
    if (body.bio !== undefined) profileUpdate.bio = body.bio;
    if (body.yearsExperience !== undefined) profileUpdate.yearsExperience = body.yearsExperience;
    if (body.specialties !== undefined) profileUpdate.specialties = body.specialties;
    if (body.languages !== undefined) profileUpdate.languages = body.languages;
    if (body.certifications !== undefined) profileUpdate.certifications = body.certifications;
    if (body.serviceAreas !== undefined) profileUpdate.serviceAreas = body.serviceAreas;
    if (body.gender !== undefined) profileUpdate.gender = body.gender;
    if (body.nationality !== undefined) profileUpdate.nationality = body.nationality;
    if (body.dateOfBirth !== undefined) {
      profileUpdate.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    }
    if (body.qatarId !== undefined) profileUpdate.qatarId = body.qatarId;
    if (body.emergencyContactName !== undefined) {
      profileUpdate.emergencyContactName = body.emergencyContactName;
    }
    if (body.emergencyContactPhone !== undefined) {
      profileUpdate.emergencyContactPhone = body.emergencyContactPhone;
    }
    if (body.mohLicenseNumber !== undefined) {
      profileUpdate.mohLicenseNumber = body.mohLicenseNumber;
    }
    if (body.availabilitySchedule !== undefined) {
      profileUpdate.availabilitySchedule =
        body.availabilitySchedule === null
          ? Prisma.DbNull
          : (body.availabilitySchedule as Prisma.InputJsonValue);
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: userData }),
      prisma.providerProfile.upsert({
        where: { userId },
        create: profileData,
        update: profileUpdate,
      }),
    ]);

    if (body.languages !== undefined || body.specialties !== undefined) {
      await prisma.serviceProvider.upsert({
        where: { userId },
        create: {
          userId,
          languages: body.languages ?? [],
          specializations: body.specialties ?? [],
        },
        update: {
          ...(body.languages !== undefined ? { languages: body.languages } : {}),
          ...(body.specialties !== undefined ? { specializations: body.specialties } : {}),
        },
      });
    }

    await AuditService.log({
      userId,
      action: 'staff_profile_updated',
      entity: 'ProviderProfile',
      entityId: userId,
      req,
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: userId },
      select: staffSelfProfileSelect,
    });
    if (!refreshed) throw new AppError('User not found.', 404);

    res.json({ data: toSelfStaffProfile(refreshed) });
  }
}
