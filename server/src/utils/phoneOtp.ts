import crypto from 'crypto';
import { prisma } from '../config/database';
import { TwilioSmsService } from '../services/TwilioSmsService';
import { normalizePhoneE164 } from '../utils/phoneAuth';

export async function issueAndSendPhoneOtp(rawPhone: string): Promise<string> {
  const phone = normalizePhoneE164(rawPhone);
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpVerification.deleteMany({
    where: { identifier: phone, type: 'phone', verifiedAt: null },
  });

  await prisma.otpVerification.create({
    data: { identifier: phone, otp, type: 'phone', expiresAt },
  });

  await TwilioSmsService.sendOtp(phone, otp);
  return phone;
}
