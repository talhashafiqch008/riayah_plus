import crypto from 'crypto';
import { prisma } from '../config/database';
import { TwilioSmsService } from '../services/TwilioSmsService';
import { normalizePhoneE164 } from '../utils/phoneAuth';
import { env } from '../config/env';

/** Marker stored when OTP is issued by Twilio Verify (code not known server-side). */
export const TWILIO_VERIFY_OTP_MARKER = '__twilio_verify__';

export async function issueAndSendPhoneOtp(rawPhone: string): Promise<string> {
  const phone = normalizePhoneE164(rawPhone);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const useVerify = Boolean(env.TWILIO_VERIFY_SERVICE_SID?.trim());

  if (useVerify) {
    await prisma.otpVerification.upsert({
      where: { identifier_type: { identifier: phone, type: 'phone' } },
      create: { identifier: phone, otp: TWILIO_VERIFY_OTP_MARKER, type: 'phone', expiresAt },
      update: { otp: TWILIO_VERIFY_OTP_MARKER, expiresAt, verifiedAt: null, userId: null },
    });
    await TwilioSmsService.startPhoneVerification(phone);
    return phone;
  }

  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  await prisma.otpVerification.upsert({
    where: { identifier_type: { identifier: phone, type: 'phone' } },
    create: { identifier: phone, otp, type: 'phone', expiresAt },
    update: { otp, expiresAt, verifiedAt: null, userId: null },
  });
  await TwilioSmsService.sendOtp(phone, otp);
  return phone;
}
