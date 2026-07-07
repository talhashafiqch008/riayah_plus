import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';

const updatePasswordSchema = z.object({
  current_password: z.string(),
  password: z.string().min(8),
  password_confirmation: z.string(),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  bio: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  hourlyRate: z.number().optional(),
});

export class UserProfileController {
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

    const hashed = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashed } });
    await AuditService.log({ userId: user.id, action: 'password_changed', req });

    res.json({ message: 'Password updated.' });
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
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { deletedAt: new Date(), isActive: false },
    });
    await AuditService.log({ userId: req.user!.userId, action: 'account_deleted', req });
    res.json({ message: 'Account deleted.' });
  }

  static async migrateRole(req: Request, res: Response): Promise<void> {
    const { userId, role } = z
      .object({ userId: z.string(), role: z.string() })
      .parse(req.body);

    await prisma.user.update({ where: { id: userId }, data: { role: role as any } });
    res.json({ message: 'Role updated.' });
  }
}
