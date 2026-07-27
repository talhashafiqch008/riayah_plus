import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { EmailService } from '../../services/EmailService';
import { WhatsAppService } from '../../services/WhatsAppService';
import { env } from '../../config/env';
import { generateAccessToken, generateRefreshToken, AuthPayload } from '../../middleware/auth';
import { setAuthCookies } from '../../utils/authCookies';
import { persistRefreshToken } from '../../utils/refreshTokenStore';
import { sanitizedString } from '../../utils/sanitize';

const sendSchema = z.object({
  identifier: sanitizedString(z.string().min(3)),
  type: z.enum(['email', 'phone']).default('email'),
});

const verifySchema = z.object({
  identifier: sanitizedString(z.string().min(3)),
  otp: z.string().min(4).max(10),
  type: z.enum(['email', 'phone']).default('email'),
});

export class OtpController {
  static async send(req: Request, res: Response): Promise<void> {
    const raw = req.body as { identifier?: string; phone?: string; type?: 'email' | 'phone' };
    const identifier = raw.identifier || raw.phone;
    if (!identifier) throw new AppError('identifier or phone is required.', 422);
    const type = raw.type ?? (raw.phone ? 'phone' : 'email');
    const { identifier: parsedIdentifier, type: parsedType } = sendSchema.parse({ identifier, type });

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // A-1: invalidate any existing unused OTPs for this identifier before issuing a new one
    await prisma.otpVerification.deleteMany({
      where: { identifier: parsedIdentifier, type: parsedType, verifiedAt: null },
    });

    await prisma.otpVerification.create({
      data: { identifier: parsedIdentifier, otp, type: parsedType, expiresAt },
    });

    if (parsedType === 'email') {
      await EmailService.sendOtp(parsedIdentifier, otp);
    } else {
      // AUTH-002: deliver phone OTP via WhatsApp Business API
      if (!env.WHATSAPP_TOKEN || !env.WHATSAPP_PHONE_ID) {
        throw new AppError('Phone OTP gateway is not configured.', 503);
      }
      const phone = parsedIdentifier.replace(/^\+/, '');
      await WhatsAppService.sendText(
        phone,
        `Your Riayah Plus verification code is: ${otp}. It expires in 10 minutes.`,
      );
    }

    res.json({ message: 'OTP sent.' });
  }

  static async verify(req: Request, res: Response): Promise<void> {
    const raw = req.body as {
      identifier?: string;
      phone?: string;
      otp?: string;
      type?: 'email' | 'phone';
    };
    const identifier = raw.identifier || raw.phone;
    const otp = raw.otp;
    if (!identifier || !otp) throw new AppError('identifier/phone and otp are required.', 422);
    const type = raw.type ?? (raw.phone ? 'phone' : 'email');
    const parsed = verifySchema.parse({ identifier, otp, type });
    const { identifier: parsedIdentifier, otp: parsedOtp, type: parsedType } = parsed;

    const record = await prisma.otpVerification.findFirst({
      where: {
        identifier: parsedIdentifier,
        otp: parsedOtp,
        type: parsedType,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) throw new AppError('Invalid or expired OTP.', 422);

    // M-44: purge used OTP immediately (single-use)
    await prisma.otpVerification.delete({ where: { id: record.id } });
    await prisma.otpVerification.deleteMany({
      where: {
        identifier: parsedIdentifier,
        type: parsedType,
        expiresAt: { lt: new Date() },
      },
    });

    let user = null;
    if (parsedType === 'phone') {
      user = await prisma.user.findFirst({ where: { phone: parsedIdentifier } });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { isPhoneVerified: true } });
      }
    } else {
      user = await prisma.user.findFirst({ where: { email: parsedIdentifier } });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { isEmailVerified: true } });
      }
    }

    // M-43: OTP verifies identity only — do not issue a full session unless explicitly enabled.
    const allowOtpLogin = process.env.ALLOW_OTP_LOGIN === 'true';
    if (user && allowOtpLogin) {
      const payload: AuthPayload = { userId: user.id, role: user.role, email: user.email };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ userId: user.id });
      await persistRefreshToken(user.id, refreshToken, req);
      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        verified: true,
        loginRequired: false,
        token: accessToken,
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        is_registered: true,
      });
      return;
    }

    res.json({
      verified: true,
      loginRequired: Boolean(user),
      is_registered: Boolean(user),
      message: user
        ? 'Phone/email verified. Please sign in with your password.'
        : 'Verified. Continue registration.',
    });
  }
}
