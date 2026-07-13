import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import { AuditService } from '../../services/AuditService';
import { sendEmailVerificationForUser } from '../../utils/emailVerification';
import { sanitizedString } from '../../utils/sanitize';

const registerSchema = z
  .object({
    name: sanitizedString(z.string().min(2)).optional(),
    firstName: sanitizedString(z.string().min(1)).optional(),
    lastName: sanitizedString(z.string().min(1)).optional(),
    email: z.string().email(),
    password: z.string().min(8),
    phone: z.string().optional(),
    role: z.nativeEnum(UserRole).optional(),
    consentAccepted: z.boolean().optional(),
  })
  .refine(
    (data) => Boolean(data.name?.trim() || (data.firstName?.trim() && data.lastName?.trim())),
    { message: 'Name or firstName/lastName is required.' },
  );

const REGISTRATION_CONSENT_TYPE = 'terms_of_service';

const onboardingSchema = z.object({
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

export class RegistrationController {
  static async register(req: Request, res: Response): Promise<void> {
    const data = registerSchema.parse(req.body);

    if (data.consentAccepted !== true) {
      throw new AppError('You must accept the terms of service to register.', 422);
    }

    const name =
      data.name?.trim() || `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim();

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Email already registered.', 409);

    const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);
    const role = data.role ?? 'client';

    const user = await prisma.user.create({
      data: {
        name,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role,
        onboardingStatus: 'pending',
      },
    });

    await prisma.consent.create({
      data: {
        userId: user.id,
        consentType: REGISTRATION_CONSENT_TYPE,
        description: 'Terms of service accepted at registration',
        granted: true,
        grantedAt: new Date(),
        documentVersion: '1.0.0',
        ipAddress: req.ip,
        deviceFingerprint: req.headers['x-device-fingerprint'] as string | undefined,
        signatureStatus: 'signed',
      },
    });

    await prisma.consentLog.create({
      data: {
        userId: user.id,
        consentType: REGISTRATION_CONSENT_TYPE,
        version: '1.0.0',
        ipAddress: req.ip,
        granted: true,
      },
    });

    // Create + persist an email verification token for the new account.
    await sendEmailVerificationForUser({ id: user.id, email: user.email });

    await AuditService.log({ userId: user.id, action: 'register', req });

    res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      message:
        'Registration successful. Please check your email to verify your account before logging in.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingStatus: user.onboardingStatus,
      },
      onboarding_status: user.onboardingStatus,
    });
  }

  static async completeOnboarding(req: Request, res: Response): Promise<void> {
    const data = onboardingSchema.parse(req.body);
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('User not found.', 404);

    const isProvider = [
      'provider', 'doctor', 'nurse', 'care_coordinator', 'clinical_staff', 'support_worker',
      'physiotherapist', 'occupational_therapist', 'speech_therapist', 'psychologist',
      'dietitian', 'cleaner', 'gardener', 'driver', 'companion', 'nanny', 'caregiver', 'therapist',
    ].includes(user.role);

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

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'complete' },
    });

    res.json({ message: 'Onboarding complete.', user: updated });
  }

  static async getOnboardingStatus(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { onboardingStatus: true },
    });
    res.json({ onboarding_status: user?.onboardingStatus });
  }
}
