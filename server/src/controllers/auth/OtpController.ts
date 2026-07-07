import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { EmailService } from '../../services/EmailService';
import { generateAccessToken, generateRefreshToken, AuthPayload } from '../../middleware/auth';
import { setAuthCookies } from '../../utils/authCookies';

const sendSchema = z.object({
  identifier: z.string(),
  type: z.enum(['email', 'phone']).default('email'),
});

const verifySchema = z.object({
  identifier: z.string(),
  otp: z.string(),
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

    await prisma.otpVerification.create({
      data: { identifier: parsedIdentifier, otp, type: parsedType, expiresAt },
    });

    if (parsedType === 'email') {
      await EmailService.sendOtp(parsedIdentifier, otp);
    }
    // SMS would go here via WhatsApp or SMS gateway

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

    await prisma.otpVerification.update({ where: { id: record.id }, data: { verifiedAt: new Date() } });

    // Mark phone verified if it's a phone OTP
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

    if (user) {
      const payload: AuthPayload = { userId: user.id, role: user.role, email: user.email };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken({ userId: user.id });

      await prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
          ipAddress: req.ip,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        verified: true,
        token: accessToken,
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        is_registered: true,
      });
      return;
    }

    res.json({ verified: true, is_registered: false });
  }
}
