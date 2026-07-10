import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { EmailService } from '../services/EmailService';

export async function sendEmailVerificationForUser(user: {
  id: string;
  email: string;
}): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const verifyUrl = `${env.APP_URL}/api/email/verify?token=${token}&email=${encodeURIComponent(user.email)}`;

  await prisma.otpVerification.create({
    data: {
      userId: user.id,
      identifier: user.email,
      otp: token,
      type: 'email_verification',
      expiresAt,
    },
  });

  await EmailService.sendEmailVerification(user.email, verifyUrl);
}
