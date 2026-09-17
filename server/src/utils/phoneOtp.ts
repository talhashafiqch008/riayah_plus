import crypto from 'crypto';
import { prisma } from '../config/database';
import { TwilioSmsService } from '../services/TwilioSmsService';
import { normalizePhoneE164 } from '../utils/phoneAuth';

export async function issueAndSendPhoneOtp(rawPhone: string): Promise<string> {
  const phone = normalizePhoneE164(rawPhone);
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpVerification.upsert({
    where: { identifier_type: { identifier: phone, type: 'phone' } },
    create: { identifier: phone, otp, type: 'phone', expiresAt },
    update: { otp, expiresAt, verifiedAt: null, userId: null },
  });

  await TwilioSmsService.sendOtp(phone, otp);
  return phone;
}
