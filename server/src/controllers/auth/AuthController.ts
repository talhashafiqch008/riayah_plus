import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  AuthPayload,
} from '../../middleware/auth';
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  getAccessTokenFromRequest,
} from '../../utils/authCookies';
import { EmailService } from '../../services/EmailService';
import { AuditService } from '../../services/AuditService';

// ─── Schemas ───────────────────────────────────────────────────────────────

const loginSchema = z.union([
  z.object({ email: z.string().email(), password: z.string().min(1) }),
  z.object({ phone: z.string().min(5), password: z.string().min(1) }),
]);

const forgotSchema = z.object({ email: z.string().email() });

const resetSchema = z.object({
  email: z.string().email(),
  token: z.string(),
  password: z.string().min(8),
});

// ─── Helpers ───────────────────────────────────────────────────────────────

async function issueTokens(user: { id: string; role: string; email: string }, req: Request) {
  const payload: AuthPayload = {
    userId: user.id,
    role: user.role as AuthPayload['role'],
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      expiresAt,
    },
  });

  return { accessToken, refreshToken };
}

// ─── Controller ────────────────────────────────────────────────────────────

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const body = loginSchema.parse(req.body);
    const password = body.password;

    const user = 'email' in body
      ? await prisma.user.findUnique({ where: { email: body.email, deletedAt: null } })
      : await prisma.user.findFirst({ where: { phone: body.phone, deletedAt: null } });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid credentials.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been suspended.', 403);
    }

    if (user.twoFactorEnabled) {
      res.json({ requires2fa: true, requires_2fa: true, userId: user.id, two_fa_token: user.id });
      return;
    }

    const { accessToken, refreshToken } = await issueTokens(user, req);

    await AuditService.log({ userId: user.id, action: 'login', req });

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        onboardingStatus: user.onboardingStatus,
      },
      onboarding_status: user.onboardingStatus,
    });
  }

  static async verify2faLogin(req: Request, res: Response): Promise<void> {
    const body = req.body as { userId?: string; two_fa_token?: string; code?: string };
    const userId = body.userId || body.two_fa_token;
    const code = body.code;
    if (!userId || !code) throw new AppError('Invalid request.', 400);

    const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
    if (!user?.twoFactorSecret) throw new AppError('Invalid request.', 400);

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) throw new AppError('Invalid 2FA code.', 401);

    const { accessToken, refreshToken } = await issueTokens(user, req);
    await AuditService.log({ userId: user.id, action: '2fa_login', req });

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      token: accessToken,
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken && req.user) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken, userId: req.user.userId },
        data: { revokedAt: new Date() },
      });
    }
    if (req.user) {
      await AuditService.log({ userId: req.user.userId, action: 'logout', req });
    }
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  }

  static async logoutAll(req: Request, res: Response): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId: req.user!.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.json({ message: 'All sessions terminated.' });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId, deletedAt: null },
      include: { providerProfile: true, clientProfile: true },
    });
    if (!user) throw new AppError('User not found.', 404);
    res.json({ user });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new AppError('Refresh token required.', 401);
    }

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token.', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId, deletedAt: null } });
    if (!user) throw new AppError('User not found.', 404);

    // Rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const tokens = await issueTokens(user, req);

    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({ ...tokens, token: tokens.accessToken });
  }

  /** Lightweight session check — used by SPA before rendering protected routes */
  static async session(req: Request, res: Response): Promise<void> {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      res.json({ authenticated: false });
      return;
    }

    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
      res.json({
        authenticated: true,
        userId: payload.userId,
        role: payload.role,
        email: payload.email,
      });
    } catch {
      res.json({ authenticated: false });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = forgotSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return 200 to prevent user enumeration
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.otpVerification.create({
        data: {
          userId: user.id,
          identifier: email,
          otp: token,
          type: 'password_reset',
          expiresAt,
        },
      });

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await EmailService.sendPasswordReset(email, resetUrl);
    }

    res.json({ message: 'If an account exists, a reset link has been sent.' });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { email, token, password } = resetSchema.parse(req.body);

    const record = await prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        otp: token,
        type: 'password_reset',
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) throw new AppError('Invalid or expired reset token.', 422);

    const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: record.userId! }, data: { passwordHash: hashed } });
    await prisma.otpVerification.update({ where: { id: record.id }, data: { verifiedAt: new Date() } });

    res.json({ message: 'Password reset successfully.' });
  }

  static async enable2fa(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    const secret = speakeasy.generateSecret({ name: `Riayah Plus (${user.email})` });
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 },
    });

    const qrUrl = await qrcode.toDataURL(secret.otpauth_url!);
    res.json({ secret: secret.base32, qrCode: qrUrl });
  }

  static async verify2faSetup(req: Request, res: Response): Promise<void> {
    const { code } = z.object({ code: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user?.twoFactorSecret) throw new AppError('2FA not initialized.', 400);

    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!valid) throw new AppError('Invalid code.', 422);

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
    res.json({ message: '2FA enabled successfully.' });
  }

  static async disable2fa(req: Request, res: Response): Promise<void> {
    const { password } = z.object({ password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid password.', 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ message: '2FA disabled.' });
  }

  static async listSessions(req: Request, res: Response): Promise<void> {
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: req.user!.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ sessions: tokens });
  }

  static async revokeSession(req: Request, res: Response): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { revokedAt: new Date() },
    });
    res.json({ message: 'Session revoked.' });
  }

  static async resendVerification(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);
    if (user.isEmailVerified) {
      res.json({ message: 'Email already verified.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const verifyUrl = `${env.APP_URL}/api/email/verify?token=${token}&email=${encodeURIComponent(user.email)}`;
    await EmailService.sendEmailVerification(user.email, verifyUrl);
    res.json({ message: 'Verification email sent.' });
  }
}
