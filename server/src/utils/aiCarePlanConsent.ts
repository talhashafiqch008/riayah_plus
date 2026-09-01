import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

/** GDPR Art. 9 / HIPAA: explicit consent before sending episode PHI to Riayah AI. */
export const AI_CARE_PLAN_CONSENT_TYPE = 'ai_care_plan';

export async function assertAiCarePlanConsent(userId: string): Promise<void> {
  const consent = await prisma.consent.findUnique({
    where: { userId_consentType: { userId, consentType: AI_CARE_PLAN_CONSENT_TYPE } },
    select: { granted: true, revokedAt: true },
  });
  if (!consent || !consent.granted || consent.revokedAt !== null) {
    throw new AppError(
      'AI care-plan processing consent is required before generating a draft. Record consent for this episode or user first.',
      403,
    );
  }
}
