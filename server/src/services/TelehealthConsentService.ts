import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { isFamilyRole } from '../utils/careAccess';
import type { TelehealthActor } from './LiveKitAccess';

export const TELEHEALTH_CONSENT_TYPE = 'telehealth';
export const TELEHEALTH_CONSENT_REQUIRED = 'telehealth_consent_required';

export type TelehealthConsentRow = {
  granted: boolean;
  revokedAt: Date | null;
  expiresAt: Date | null;
};

export function requiresTelehealthJoinConsent(role: string): boolean {
  return isFamilyRole(role);
}

export function isTelehealthConsentActive(
  consent: TelehealthConsentRow | null,
  now = new Date(),
): boolean {
  if (!consent?.granted || consent.revokedAt) return false;
  if (consent.expiresAt && consent.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export function assertTelehealthConsentActive(
  consent: TelehealthConsentRow | null,
  role: string,
  now = new Date(),
): void {
  if (!requiresTelehealthJoinConsent(role)) return;
  if (isTelehealthConsentActive(consent, now)) return;
  throw new AppError('Telehealth consent is required before joining a session.', 403, {
    code: TELEHEALTH_CONSENT_REQUIRED,
  });
}

export class TelehealthConsentService {
  static async assertJoinConsent(actor: TelehealthActor): Promise<void> {
    if (!requiresTelehealthJoinConsent(actor.role)) return;
    const consent = await prisma.consent.findUnique({
      where: { userId_consentType: { userId: actor.userId, consentType: TELEHEALTH_CONSENT_TYPE } },
      select: { granted: true, revokedAt: true, expiresAt: true },
    });
    assertTelehealthConsentActive(consent, actor.role);
  }
}
