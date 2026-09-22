import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { anonymizeUser } from '../../utils/anonymizeUser';
import { performAccountDeletion } from '../../services/AccountDeletionService';
import { recordLogoutAll } from '../../middleware/auth';
import { disconnectUserSockets } from '../../services/RealtimeService';
import { clearAuthCookies } from '../../utils/authCookies';
import { verifyTotpNoReplay } from '../../utils/totpReplay';
import {
  avatarUrlSchema,
  optionalSanitizedString,
  sanitizedString,
} from '../../utils/sanitize';

const updatePasswordSchema = z.object({
  current_password: z.string(),
  password: z.string().min(8),
  password_confirmation: z.string(),
  code: z.string().min(6).max(8).optional(),
  totp: z.string().min(6).max(8).optional(),
});

const MIGRATE_ROLE_ALLOWLIST = [
  'client',
  'consumer',
  'family',
  'patient',
  'provider',
  'clinical_staff',
  'care_coordinator',
  'support_worker',
  'doctor',
  'nurse',
] as const;

const updateProfileSchema = z.object({
  name: sanitizedString(z.string().min(2)).optional(),
  phone: optionalSanitizedString(z.string()),
  avatar: avatarUrlSchema.optional(),
  dateOfBirth: z.string().optional(),
  gender: optionalSanitizedString(z.string()),
  address: optionalSanitizedString(z.string()),
  city: optionalSanitizedString(z.string()),
  country: optionalSanitizedString(z.string()),
  emergencyName: optionalSanitizedString(z.string()),
  emergencyPhone: optionalSanitizedString(z.string()),
  bio: optionalSanitizedString(z.string()),
  specializations: z.array(sanitizedString(z.string())).optional(),
  languages: z.array(sanitizedString(z.string())).optional(),
  hourlyRate: z.number().optional(),
});

const setUiLanguageSchema = z.object({
  language: z.enum(['en', 'ar']),
});

export class UserProfileController {
  /** Permanent UI language chooser — set once; subsequent changes are rejected. */
  static async setUiLanguage(req: Request, res: Response): Promise<void> {
    const { language } = setUiLanguageSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user) throw new AppError('User not found.', 404);

    if (user.uiLanguage) {
      if (user.uiLanguage === language) {
        res.json({ message: 'Language preference already set.', uiLanguage: user.uiLanguage });
        return;
      }
      throw new AppError('Language preference is permanent and cannot be changed.', 409);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { uiLanguage: language },
      select: { id: true, uiLanguage: true },
    });

    await AuditService.log({
      userId,
      action: 'ui_language_set',
      entity: 'User',
      entityId: userId,
      after: { uiLanguage: language },
      req,
    });

    res.json({ message: 'Language preference saved.', uiLanguage: updated.uiLanguage });
  }

  static async updatePassword(req: Request, res: Response): Promise<void> {
    const data = updatePasswordSchema.parse(req.body);
    if (data.password !== data.password_confirmation) {
      throw new AppError('Passwords do not match.', 422);
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    if (!(await bcrypt.compare(data.current_password, user.passwordHash))) {
      throw new AppError('Current password is incorrect.', 422);
    }

    // M-45: require TOTP when 2FA is enabled
    if (user.twoFactorEnabled) {
      const totpCode = data.code ?? data.totp;
      if (!totpCode || !user.twoFactorSecret) {
        throw new AppError('Two-factor authentication code is required.', 422);
      }
      const valid = await verifyTotpNoReplay(user.id, user.twoFactorSecret, totpCode);
      if (!valid) throw new AppError('Invalid authentication code.', 422);
    }

    const hashed = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashed } }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await recordLogoutAll(user.id);
    disconnectUserSockets(user.id);
    clearAuthCookies(res);
    await AuditService.log({ userId: user.id, action: 'password_changed', req });

    res.json({ message: 'Password updated. Please sign in again.' });
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const data = updateProfileSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found.', 404);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone,
        avatar: data.avatar,
      },
    });

    const isProvider = ['provider', 'doctor', 'nurse', 'care_coordinator', 'clinical_staff',
      'support_worker', 'physiotherapist', 'occupational_therapist', 'speech_therapist',
      'psychologist', 'dietitian', 'cleaner', 'gardener', 'driver', 'companion', 'nanny',
      'caregiver', 'therapist'].includes(user.role);

    if (isProvider) {
      await prisma.serviceProvider.upsert({
        where: { userId },
        create: {
          userId,
          specializations: data.specializations ?? [],
          languages: data.languages ?? [],
        },
        update: {
          specializations: data.specializations,
          languages: data.languages,
        },
      });
    } else {
      await prisma.clientProfile.upsert({
        where: { userId },
        create: {
          userId,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          address: data.address,
          city: data.city,
          country: data.country ?? 'QA',
          emergencyName: data.emergencyName,
          emergencyPhone: data.emergencyPhone,
        },
        update: {
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
          gender: data.gender,
          address: data.address,
          city: data.city,
          country: data.country,
          emergencyName: data.emergencyName,
          emergencyPhone: data.emergencyPhone,
        },
      });
    }

    res.json({ user: updated });
  }

  static async destroy(req: Request, res: Response): Promise<void> {
    // G-14: same obligation-checked path as POST /privacy/delete-account
    try {
      const { requestId } = await performAccountDeletion({
        userId: req.user!.userId,
        reason: 'User-requested deletion via DELETE /api/user',
        req,
        res,
      });
      res.json({
        message: 'Account deleted. Personal data will be anonymized after a 30-day grace period.',
        requestId,
      });
    } catch (err) {
      if (err instanceof AppError && (err as AppError & { blockers?: unknown }).blockers) {
        res.status(400).json({
          message: err.message,
          blockers: (err as AppError & { blockers: unknown }).blockers,
        });
        return;
      }
      throw err;
    }
  }

  /** Called by retention cron — anonymizes a soft-deleted user after grace period. */
  static async anonymizeDeletedUser(userId: string): Promise<void> {
    await anonymizeUser(userId);
  }

  static async migrateRole(req: Request, res: Response): Promise<void> {
    // M-46: internal guard even if route middleware is misconfigured later
    const adminRoles = ['admin', 'super_admin', 'support_admin'];
    if (!req.user || !adminRoles.includes(req.user.role)) {
      throw new AppError('Admin access required.', 403);
    }

    const { userId, role } = z
      .object({
        userId: z.string().uuid().or(z.string().min(1)),
        role: z.enum(MIGRATE_ROLE_ALLOWLIST),
      })
      .parse(req.body);

    // Never allow elevating to platform admin via this endpoint
    if (adminRoles.includes(role)) {
      throw new AppError('Cannot assign admin roles via migrateRole.', 403);
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });
    if (!existing) throw new AppError('User not found.', 404);

    await prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
    });

    await AuditService.log({
      userId: req.user.userId,
      action: 'role_migrated',
      entity: 'User',
      entityId: userId,
      before: { role: existing.role },
      after: { role },
      req,
    });

    res.json({ message: 'Role updated.' });
  }
}
