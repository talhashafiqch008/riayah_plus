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
  recordLogoutAll,
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
import { sendEmailVerificationForUser } from '../../utils/emailVerification';
import { persistRefreshToken, findRefreshTokenByPlain, revokeRefreshTokenByPlain } from '../../utils/refreshTokenStore';
import { formatDeviceLabel } from '../../utils/deviceInfo';
import { INVITE_TOKEN_TYPE } from '../../utils/inviteUser';

const resendVerificationPublicSchema = z.object({ email: z.string().email() });

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

const setPasswordSchema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

const FAMILY_ROLES = new Set(['family', 'patient', 'client', 'consumer']);

// ─── Helpers ───────────────────────────────────────────────────────────────

async function issueTokens(user: { id: string; role: string; email: string }, req: Request) {
  const payload: AuthPayload = {
    userId: user.id,
    role: user.role as AuthPayload['role'],
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  await persistRefreshToken(user.id, refreshToken, req);
  await recordUserSession(user.id, req);

  return { accessToken, refreshToken };
}

async function recordUserSession(userId: string, req: Request): Promise<void> {
  await prisma.userSession.create({
    data: {
      userId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      deviceId: typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined,
    },
  });
}

// ─── Controller ────────────────────────────────────────────────────────────

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    const body = loginSchema.parse(req.body);
    const password = body.password;

    const user = 'email' in body
      ? await prisma.user.findUnique({ where: { email: body.email, deletedAt: null } })
      : await prisma.user.findFirst({ where: { phone: body.phone, deletedAt: null } });

    // A-9: always run bcrypt regardless of whether the user exists to prevent timing-based enumeration
    const passwordHash = user?.passwordHash ?? '$2a$12$cNV4pbbGpFVj8mcnExwV9eVk8GgZycv2RNFJWdNJAmR8IQCBsg0VO';
    const passwordValid = await bcrypt.compare(password, passwordHash);
    if (!user || !passwordValid) {
      throw new AppError('Invalid credentials.', 401);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been suspended.', 403);
    }

    if (user.mustSetPassword) {
      throw new AppError(
        'Please set your password using the invite link sent to your email before logging in.',
        403,
      );
    }

    // Family/patient accounts cannot log in until a platform admin assigns an organization.
    if (FAMILY_ROLES.has(user.role) && !user.organizationId) {
      throw new AppError(
        'Your account is awaiting organization assignment. You will be able to log in once an administrator links you to a care organization.',
        403,
      );
    }

    // Enforce email verification before allowing login.
    // (Seed accounts can be marked verified via prisma/seed.ts)
    if (!user.isEmailVerified) {
      throw new AppError('Email not verified. Please verify your email address before logging in.', 403);
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
        twoFactorEnabled: user.twoFactorEnabled,
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

    // Enforce email verification also for 2FA completion.
    if (!user.isEmailVerified) {
      throw new AppError('Email not verified. Please verify your email address before logging in.', 403);
    }

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
      user: { id: user.id, name: user.name, email: user.email, role: user.role, twoFactorEnabled: user.twoFactorEnabled },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken && req.user) {
      await revokeRefreshTokenByPlain(refreshToken, req.user.userId);
    }
    if (req.user) {
      await AuditService.log({ userId: req.user.userId, action: 'logout', req });
    }
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  }

  static async logoutAll(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    await Promise.all([
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      recordLogoutAll(userId),
    ]);
    clearAuthCookies(res);
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

    const stored = await findRefreshTokenByPlain(refreshToken);
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

      // A-5: revoke all prior reset tokens for this email before issuing a new one
      await prisma.otpVerification.deleteMany({
        where: { identifier: email, type: 'password_reset', verifiedAt: null },
      });

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

    if (!record?.userId) throw new AppError('Invalid or expired reset token.', 422);

    const userId = record.userId;
    const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    // M-39/M-40: single-use reset + revoke all sessions/tokens for the user
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash: hashed } }),
      prisma.otpVerification.deleteMany({
        where: { userId, type: 'password_reset' },
      }),
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    await recordLogoutAll(userId);
    clearAuthCookies(res);

    await AuditService.log({
      userId,
      action: 'password_reset',
      entity: 'User',
      entityId: userId,
      req,
    });

    res.json({ message: 'Password reset successfully.' });
  }

  /** Magic-link invite: set password for org_admin / coordinator invites. */
  static async setPasswordFromInvite(req: Request, res: Response): Promise<void> {
    const { email, token, password } = setPasswordSchema.parse(req.body);

    const record = await prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        otp: token,
        type: INVITE_TOKEN_TYPE,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record?.userId) throw new AppError('Invalid or expired invite link.', 422);

    const userId = record.userId;
    const hashed = await bcrypt.hash(password, env.BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash: hashed,
          mustSetPassword: false,
          isEmailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
      await tx.otpVerification.deleteMany({
        where: { userId, type: INVITE_TOKEN_TYPE },
      });
      return updated;
    });

    await AuditService.log({
      userId,
      action: 'invite_password_set',
      entity: 'User',
      entityId: userId,
      req,
    });

    const CLINICAL_ROLES = new Set([
      'clinical_staff',
      'doctor',
      'nurse',
      'physiotherapist',
      'occupational_therapist',
      'speech_therapist',
      'psychologist',
      'dietitian',
      'therapist',
    ]);
    const redirectPath =
      user.role === 'org_admin'
        ? '/org'
        : user.role === 'care_coordinator'
          ? '/coordinator'
          : user.role === 'support_worker'
            ? '/support'
            : CLINICAL_ROLES.has(user.role)
              ? '/clinical'
              : '/';

    res.json({
      message: 'Password set successfully. You can now log in.',
      redirectPath,
      role: user.role,
    });
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
    const { password, code } = z
      .object({ password: z.string(), code: z.string().min(6).max(8) })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid password.', 401);
    }

    // M-41: require fresh TOTP before disabling 2FA
    if (!user.twoFactorSecret) throw new AppError('2FA is not configured.', 400);
    const valid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!valid) throw new AppError('Invalid authentication code.', 422);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    res.json({ message: '2FA disabled.' });
  }

  static async listSessions(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const refreshToken = getRefreshTokenFromRequest(req);
    let currentSessionId: string | null = null;

    if (refreshToken) {
      const current = await findRefreshTokenByPlain(refreshToken);
      currentSessionId = current?.id ?? null;
    }

    const userSessionCount = await prisma.userSession.count({
      where: { userId, revokedAt: null },
    });

    if (userSessionCount > 0) {
      const sessions = await prisma.userSession.findMany({
        where: { userId, revokedAt: null },
        select: { id: true, ipAddress: true, userAgent: true, createdAt: true, lastActiveAt: true },
        orderBy: { lastActiveAt: 'desc' },
      });

      res.json({
        sessions: sessions.map((session) => ({
          id: session.id,
          name: formatDeviceLabel(session.userAgent),
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          expiresAt: null,
          lastUsedAt: session.lastActiveAt,
          current: session.id === currentSessionId,
        })),
      });
      return;
    }

    const tokens = await prisma.refreshToken.findMany({
      where: { userId: req.user!.userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true, ipAddress: true, userAgent: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      sessions: tokens.map((token) => ({
        id: token.id,
        name: formatDeviceLabel(token.userAgent),
        ipAddress: token.ipAddress,
        userAgent: token.userAgent,
        createdAt: token.createdAt,
        expiresAt: token.expiresAt,
        lastUsedAt: token.createdAt,
        current: token.id === currentSessionId,
      })),
    });
  }

  static async revokeOtherSessions(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    let currentSessionId: string | null = null;

    if (refreshToken) {
      const current = await findRefreshTokenByPlain(refreshToken);
      currentSessionId = current?.id ?? null;
    }

    await prisma.refreshToken.updateMany({
      where: {
        userId: req.user!.userId,
        revokedAt: null,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    res.json({ message: 'Other sessions revoked.' });
  }

  static async revokeSession(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    let currentSessionId: string | null = null;

    if (refreshToken) {
      const current = await findRefreshTokenByPlain(refreshToken);
      currentSessionId = current?.id ?? null;
    }

    const result = await prisma.refreshToken.updateMany({
      where: { id: req.params.id, userId: req.user!.userId },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new AppError('Session not found.', 404);
    }

    if (req.params.id === currentSessionId) {
      clearAuthCookies(res);
    }

    res.json({ message: 'Session revoked.' });
  }

  static async resendVerificationPublic(req: Request, res: Response): Promise<void> {
    const { email } = resendVerificationPublicSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email, deletedAt: null } });

    if (user && !user.isEmailVerified) {
      await sendEmailVerificationForUser({ id: user.id, email: user.email });
    }

    res.json({
      message: 'If an unverified account exists for this email, a verification link has been sent.',
    });
  }

  static async resendVerification(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);
    if (user.isEmailVerified) {
      res.json({ message: 'Email already verified.' });
      return;
    }

    await sendEmailVerificationForUser({ id: user.id, email: user.email });
    res.json({ message: 'Verification email sent.' });
  }

  /**
   * Email verification link handler.
   * Example: GET /api/email/verify?token=...&email=...
   */
  static async verifyEmailLink(req: Request, res: Response): Promise<void> {
    const schema = z.object({
      token: z.string().min(1),
      email: z.string().email(),
    });

    const { token, email } = schema.parse(req.query);

    const record = await prisma.otpVerification.findFirst({
      where: {
        identifier: email,
        otp: token,
        type: 'email_verification',
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // M-50: token must be bound to the user for this email
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!record || !user || !record.userId || record.userId !== user.id) {
      res.status(400).send(`
        <html>
          <body style="font-family: sans-serif; padding: 24px;">
            <h2>Verification failed</h2>
            <p>The link is invalid or expired.</p>
          </body>
        </html>
      `);
      return;
    }

    await prisma.otpVerification.deleteMany({
      where: { userId: user.id, type: 'email_verification' },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifiedAt: new Date() },
    });

    const loginUrl = `${env.FRONTEND_URL}/careseeker/login?verified=1`;

    res.status(200).send(`
      <html>
        <head>
          <meta http-equiv="refresh" content="3;url=${loginUrl}" />
        </head>
        <body style="font-family: sans-serif; padding: 24px; text-align: center;">
          <h2>Email verified successfully</h2>
          <p>You can now log in to your account.</p>
          <p><a href="${loginUrl}">Continue to login</a></p>
        </body>
      </html>
    `);
  }
}
