import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export const AI_CHAT_CONSENT_TYPE = 'ai_chat';

/** GDPR/HIPAA: require recorded consent before sending user text to Gemini. */
export async function assertAiChatConsent(userId: string): Promise<void> {
  const consent = await prisma.consent.findUnique({
    where: { userId_consentType: { userId, consentType: AI_CHAT_CONSENT_TYPE } },
    select: { granted: true, revokedAt: true },
  });
  if (!consent || !consent.granted || consent.revokedAt !== null) {
    throw new AppError(
      'AI chat consent is required. Please accept the AI usage terms before using this feature.',
      403,
    );
  }
}
