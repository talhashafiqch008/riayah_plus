import { prisma } from '../config/database';

export const EMAIL_NOTIFICATIONS_CONSENT_TYPE = 'email_notifications';
export const TELEHEALTH_CONSENT_TYPE = 'telehealth';

async function hasActiveConsent(userId: string, consentType: string): Promise<boolean> {
  const consent = await prisma.consent.findUnique({
    where: { userId_consentType: { userId, consentType } },
    select: { granted: true, revokedAt: true },
  });
  return Boolean(consent?.granted && consent.revokedAt === null);
}

/** G6 / M15 — transactional email (OTP, password reset) is always allowed. */
export async function canSendEmailToUser(
  userId: string,
  purpose: 'transactional' | 'telehealth_reminder' | 'marketing',
): Promise<boolean> {
  if (purpose === 'transactional') return true;

  if (purpose === 'marketing') {
    return hasActiveConsent(userId, 'marketing');
  }

  const [telehealth, email] = await Promise.all([
    hasActiveConsent(userId, TELEHEALTH_CONSENT_TYPE),
    hasActiveConsent(userId, EMAIL_NOTIFICATIONS_CONSENT_TYPE),
  ]);
  return telehealth && email;
}
