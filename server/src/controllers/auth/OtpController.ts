import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { EmailService } from '../../services/EmailService';
import { AuditService } from '../../services/AuditService';
import { generateAccessToken, generateRefreshToken, AuthPayload } from '../../middleware/auth';
import { setAuthCookies, exposeMobileRefreshToken } from '../../utils/authCookies';
import { persistRefreshToken } from '../../utils/refreshTokenStore';
import { sanitizedString } from '../../utils/sanitize';
import { normalizePhoneE164 } from '../../utils/phoneAuth';
import { TwilioSmsService } from '../../services/TwilioSmsService';
import { issueMfaPendingToken } from '../../utils/mfaPending';
import { env } from '../../config/env';
import { TWILIO_VERIFY_OTP_MARKER } from '../../utils/phoneOtp';

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

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const useTwilioVerify =
      parsedType === 'phone' && Boolean(env.TWILIO_VERIFY_SERVICE_SID?.trim());

    let storeIdentifier = parsedIdentifier;
    if (parsedType === 'phone') {
      try {
        storeIdentifier = normalizePhoneE164(parsedIdentifier);
      } catch {
        throw new AppError('Invalid phone number.', 422);
      }
    }

    const otp = useTwilioVerify
      ? TWILIO_VERIFY_OTP_MARKER
      : crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    await prisma.otpVerification.upsert({
      where: {
        identifier_type: { identifier: storeIdentifier, type: parsedType },
      },
      create: {
        identifier: storeIdentifier,
        otp,
        type: parsedType,
        expiresAt,
      },
      update: {
        otp,
        expiresAt,
        verifiedAt: null,
        userId: null,
      },
    });

    if (parsedType === 'email') {
      await EmailService.sendOtp(storeIdentifier, otp);
    } else if (useTwilioVerify) {
      await TwilioSmsService.startPhoneVerification(storeIdentifier);
    } else {
      await TwilioSmsService.sendOtp(storeIdentifier, otp);
    }

    await AuditService.log({
      action: 'otp_send',
      after: { type: parsedType },
      req,
    });

    res.json({ message: 'OTP sent.', identifier: storeIdentifier });
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
    let parsedIdentifier = parsed.identifier;
    const parsedOtp = parsed.otp;
    const parsedType = parsed.type;

    if (parsedType === 'phone') {
      try {
        parsedIdentifier = normalizePhoneE164(parsedIdentifier);
      } catch {
        throw new AppError('Invalid phone number.', 422);
      }
    }

    const useTwilioVerify =
      parsedType === 'phone' && Boolean(env.TWILIO_VERIFY_SERVICE_SID?.trim());

    let record = null as Awaited<ReturnType<typeof prisma.otpVerification.findFirst>>;

    if (useTwilioVerify) {
      const approved = await TwilioSmsService.checkPhoneVerification(parsedIdentifier, parsedOtp);
      if (!approved) {
        await AuditService.log({
          action: 'otp_failed',
          after: { type: parsedType },
          req,
        });
        throw new AppError('Invalid or expired OTP.', 422);
      }
      record = await prisma.otpVerification.findFirst({
        where: {
          identifier: parsedIdentifier,
          type: 'phone',
          verifiedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!record) {
        // Verify approved but no local send record — still accept (Twilio is source of truth)
        record = await prisma.otpVerification.create({
          data: {
            identifier: parsedIdentifier,
            otp: TWILIO_VERIFY_OTP_MARKER,
            type: 'phone',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        });
      }
    } else {
      record = await prisma.otpVerification.findFirst({
        where: {
          identifier: parsedIdentifier,
          otp: parsedOtp,
          type: parsedType,
          verifiedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!record) {
        await AuditService.log({
          action: 'otp_failed',
          after: { type: parsedType },
          req,
        });
        throw new AppError('Invalid or expired OTP.', 422);
      }
    }

    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    await prisma.otpVerification.deleteMany({
      where: {
        identifier: parsedIdentifier,
        type: parsedType,
        expiresAt: { lt: new Date() },
      },
    });

    let user = null;
    if (parsedType === 'phone') {
      user = await prisma.user.findFirst({ where: { phone: parsedIdentifier, deletedAt: null } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isPhoneVerified: true, phoneVerifiedAt: new Date() },
        });
      }
    } else {
      user = await prisma.user.findFirst({ where: { email: parsedIdentifier, deletedAt: null } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isEmailVerified: true, emailVerifiedAt: new Date() },
        });
      }
    }

    // AUTH-25: OTP-login must enforce account state + MFA (same gates as password login)
    const allowOtpLogin = process.env.ALLOW_OTP_LOGIN === 'true';
    if (user && allowOtpLogin) {
      if (!user.isActive) {
        throw new AppError('Your account has been suspended.', 403);
      }
      if (user.twoFactorEnabled) {
        const mfaPendingToken = issueMfaPendingToken(user.id);
        res.json({
          verified: true,
          loginRequired: false,
          requires2fa: true,
          requires_2fa: true,
          two_fa_token: mfaPendingToken,
          mfaPendingToken,
          is_registered: true,
        });
        return;
      }

      const payload: AuthPayload = { userId: user.id, role: user.role, email: user.email };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ userId: user.id });
      await persistRefreshToken(user.id, refreshToken, req);
      setAuthCookies(res, accessToken, refreshToken);
      exposeMobileRefreshToken(req, res, refreshToken);

      await AuditService.log({ userId: user.id, action: 'otp_login', req });

      // AUTH-08: no refreshToken in JSON body
      res.json({
        verified: true,
        loginRequired: false,
        token: accessToken,
        accessToken,
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
