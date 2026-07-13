import crypto from 'crypto';
import { prisma } from '../config/database';

/** GDPR Art 17 — anonymize PII on soft-deleted users after retention grace period. */
export async function anonymizeUser(userId: string): Promise<void> {
  const placeholder = `deleted_${userId.slice(0, 8)}@anonymized.local`;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        email: placeholder,
        phone: null,
        avatar: null,
        passwordHash: crypto.randomBytes(32).toString('hex'),
        twoFactorSecret: null,
        twoFactorEnabled: false,
        deletionReason: 'Anonymized after 30-day retention period',
        processingRestricted: true,
      },
    }),
    prisma.clientProfile.updateMany({
      where: { userId },
      data: {
        address: null,
        city: null,
        emergencyName: null,
        emergencyPhone: null,
        gender: null,
      },
    }),
    prisma.serviceProvider.updateMany({
      where: { userId },
      data: { specializations: [], languages: [] },
    }),
  ]);
}
