import {
  assertTelehealthConsentActive,
  isTelehealthConsentActive,
  requiresTelehealthJoinConsent,
} from '../../services/TelehealthConsentService';
import { AppError } from '../../middleware/errorHandler';

describe('requiresTelehealthJoinConsent', () => {
  it('requires consent from family and patients only', () => {
    expect(requiresTelehealthJoinConsent('family')).toBe(true);
    expect(requiresTelehealthJoinConsent('patient')).toBe(true);
    expect(requiresTelehealthJoinConsent('clinical_staff')).toBe(false);
    expect(requiresTelehealthJoinConsent('care_coordinator')).toBe(false);
    expect(requiresTelehealthJoinConsent('admin')).toBe(false);
  });
});

describe('isTelehealthConsentActive', () => {
  const now = new Date('2026-08-13T12:00:00.000Z');

  it('is false when missing, revoked, or not granted', () => {
    expect(isTelehealthConsentActive(null, now)).toBe(false);
    expect(isTelehealthConsentActive({ granted: false, revokedAt: null, expiresAt: null }, now)).toBe(false);
    expect(
      isTelehealthConsentActive(
        { granted: true, revokedAt: new Date('2026-08-01T00:00:00.000Z'), expiresAt: null },
        now,
      ),
    ).toBe(false);
  });

  it('is false when expired', () => {
    expect(
      isTelehealthConsentActive(
        { granted: true, revokedAt: null, expiresAt: new Date('2026-08-13T11:59:00.000Z') },
        now,
      ),
    ).toBe(false);
  });

  it('is true when granted, not revoked, and unexpired', () => {
    expect(isTelehealthConsentActive({ granted: true, revokedAt: null, expiresAt: null }, now)).toBe(true);
    expect(
      isTelehealthConsentActive(
        { granted: true, revokedAt: null, expiresAt: new Date('2026-08-13T12:01:00.000Z') },
        now,
      ),
    ).toBe(true);
  });
});

describe('assertTelehealthConsentActive', () => {
  it('lets staff join without a consent row', () => {
    expect(() => assertTelehealthConsentActive(null, 'clinical_staff')).not.toThrow();
  });

  it('blocks family without active consent and includes a UI code', () => {
    try {
      assertTelehealthConsentActive(null, 'family');
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const e = err as AppError;
      expect(e.statusCode).toBe(403);
      expect(e.details).toEqual({ code: 'telehealth_consent_required' });
    }
  });
});
