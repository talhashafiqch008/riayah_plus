import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { EmailService } from '../services/EmailService';

export const INVITE_TOKEN_TYPE = 'invite_set_password';
/** Unusable bcrypt-looking placeholder; login with password will fail until set-password. */
export const INVITE_PASSWORD_PLACEHOLDER = '!';

/**
 * Issue a magic-link invite for org_admin / care_coordinator (and similar)
 * so they can set a password before first login.
 */
export async function sendInviteSetPassword(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.otpVerification.upsert({
    where: { identifier_type: { identifier: user.email, type: INVITE_TOKEN_TYPE } },
    create: {
      userId: user.id,
      identifier: user.email,
      otp: token,
      type: INVITE_TOKEN_TYPE,
      expiresAt,
    },
    update: {
      userId: user.id,
      otp: token,
      expiresAt,
      verifiedAt: null,
    },
  });

  const setPasswordUrl = `${env.FRONTEND_URL}/set-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  await EmailService.sendInviteSetPassword(user.email, {
    name: user.name,
    role: user.role,
    setPasswordUrl,
  });
}
