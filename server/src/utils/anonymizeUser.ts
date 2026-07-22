import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * GDPR Art 17 — anonymize PII after retention grace period (G-3).
 * Cascades related personal/health fields while keeping non-identifying
 * operational shells where legal retention may still apply.
 */
export async function anonymizeUser(userId: string): Promise<void> {
  const placeholder = `deleted_${userId.slice(0, 8)}@anonymized.local`;
  const redacted = '[redacted]';

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
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
        isActive: false,
      },
    });

    await tx.clientProfile.updateMany({
      where: { userId },
      data: {
        address: null,
        city: null,
        emergencyName: null,
        emergencyPhone: null,
        gender: null,
        dateOfBirth: null,
      },
    });

    await tx.serviceProvider.updateMany({
      where: { userId },
      data: { specializations: [], languages: [] },
    });

    await tx.message.updateMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
      data: { content: redacted },
    });
    await tx.notification.updateMany({
      where: { userId },
      data: { title: redacted, body: redacted, data: {} },
    });
    await tx.pushNotificationToken.deleteMany({ where: { userId } });

    await tx.document.updateMany({
      where: { userId },
      data: {
        name: redacted,
        url: redacted,
        deletedAt: new Date(),
        metadata: { anonymized: true },
      },
    });
    await tx.review.updateMany({
      where: { OR: [{ clientId: userId }, { providerId: userId }] },
      data: { comment: redacted },
    });

    const units = await tx.careUnit.findMany({
      where: { familyUserId: userId },
      select: { id: true },
    });
    const unitIds = units.map((u) => u.id);

    if (unitIds.length > 0) {
      await tx.careUnit.updateMany({
        where: { id: { in: unitIds } },
        data: {
          name: 'Anonymized Care Unit',
          address: null,
          city: null,
          primaryCaregiverName: null,
          primaryCaregiverPhone: null,
          primaryCaregiverRelation: null,
          deletedAt: new Date(),
        },
      });
    }

    await tx.careRecipient.updateMany({
      where: {
        OR: [
          { userId },
          ...(unitIds.length > 0 ? [{ careUnitId: { in: unitIds } }] : []),
        ],
      },
      data: {
        name: 'Anonymized Patient',
        medicalInfo: Prisma.JsonNull,
        diagnosisCodes: [],
        notes: null,
        externalRef: null,
        dateOfBirth: null,
        gender: null,
        pocName: null,
        pocPhone: null,
        deletedAt: new Date(),
      },
    });

    await tx.intakeRecord.updateMany({
      where: { familyUserId: userId },
      data: {
        reasonForCare: redacted,
        medicalHistory: null,
        currentMeds: null,
        diagnoses: [],
        primaryCaregiverName: null,
        primaryCaregiverPhone: null,
        wizardPayload: { anonymized: true },
        reviewSummary: { anonymized: true },
      },
    });

    await tx.careEpisode.updateMany({
      where: { OR: [{ patientId: userId }, { coordinatorId: userId }] },
      data: {
        reasonForCare: redacted,
        medicalHistory: null,
        currentMeds: null,
        diagnoses: [],
        intakeSummary: { anonymized: true },
        title: 'Anonymized Episode',
      },
    });

    await tx.assessment.updateMany({
      where: { OR: [{ patientId: userId }, { assessorId: userId }] },
      data: {
        findings: { anonymized: true },
        recommendations: null,
        notes: null,
        reportUrl: null,
      },
    });

    await tx.emergencyRequest.updateMany({
      where: { clientId: userId },
      data: {
        description: redacted,
        latitude: null,
        longitude: null,
        address: null,
        location: null,
        notes: null,
      },
    });

    await tx.gpsLog.deleteMany({ where: { userId } });
    await tx.consent.deleteMany({ where: { userId } });
    await tx.consentLog.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.otpVerification.deleteMany({ where: { userId } });
    await tx.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.accountDeletionRequest.updateMany({
      where: { userId, status: { not: 'completed' } },
      data: { status: 'completed', completedAt: new Date() },
    });
  });
}
