import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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
  verifyAccessToken,
  recordLogoutAll,
  assertUserActive,
  wasLoggedOutAll,
  AuthPayload,
} from '../../middleware/auth';
import {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  getAccessTokenFromRequest,
  exposeMobileRefreshToken,
} from '../../utils/authCookies';
import { EmailService } from '../../services/EmailService';
import { AuditService } from '../../services/AuditService';
import { sendEmailVerificationForUser } from '../../utils/emailVerification';
import {
  persistRefreshToken,
  findRefreshTokenByPlain,
  revokeRefreshTokenByPlain,
  claimRefreshTokenForRotation,
  revokeRefreshTokenFamily,
} from '../../utils/refreshTokenStore';
import { formatDeviceLabel } from '../../utils/deviceInfo';
import { INVITE_TOKEN_TYPE } from '../../utils/inviteUser';
import { normalizePhoneE164 } from '../../utils/phoneAuth';
import {
  stagePendingTotpSecret,
  getPendingTotpSecret,
  clearPendingTotpSecret,
} from '../../utils/pendingTotp';
import { sanitizeUser } from '../../utils/sanitizeUser';
import { disconnectUserSockets } from '../../services/RealtimeService';
import { verifyTotpNoReplay } from '../../utils/totpReplay';
import { issueMfaPendingToken, consumeMfaPendingToken } from '../../utils/mfaPending';

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

// ─── Helpers ───────────────────────────────────────────────────────────────

async function issueTokens(
  user: { id: string; role: string; email: string },
  req: Request,
  familyId?: string,
) {
  const payload: AuthPayload = {
    userId: user.id,
    role: user.role as AuthPayload['role'],
    email: user.email,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ userId: user.id });

  // AUTH-02: pass familyId on rotation so reuse can revoke the whole chain
  await persistRefreshToken(user.id, refreshToken, req, familyId);
  await recordUserSession(user.id, req);

  return { accessToken, refreshToken };
}

/** AUTH-08: never put refreshToken in JSON — cookies + optional x-refresh-token for mobile. */
function authTokenResponse(accessToken: string) {
  return { token: accessToken, accessToken };
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

    const orgInclude = { organization: { select: { id: true, name: true } } } as const;
    let user;
    if ('email' in body) {
      user = await prisma.user.findUnique({
        where: { email: body.email, deletedAt: null },
        include: orgInclude,
      });
    } else {
      let phone = body.phone;
      try {
        phone = normalizePhoneE164(body.phone);
      } catch {
        /* keep raw for lookup */
      }
      user = await prisma.user.findFirst({
        where: { phone, deletedAt: null },
        include: orgInclude,
      });
    }

    // A-9: always run bcrypt regardless of whether the user exists to prevent timing-based enumeration
    const passwordHash = user?.passwordHash ?? '$2a$12$cNV4pbbGpFVj8mcnExwV9eVk8GgZycv2RNFJWdNJAmR8IQCBsg0VO';
    const passwordValid = await bcrypt.compare(password, passwordHash);
    if (!user || !passwordValid) {
      await AuditService.log({
        userId: user?.id,
        action: 'login_failed',
        after: { reason: 'invalid_credentials' },
        req,
      });
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

    // Family may log in and request care before organization assignment.
    // Platform admin assigns org later (Admin → Families); units/intakes backfill then.

    // Email login requires email verification; phone login requires phone verification.
    const isPhoneLogin = 'phone' in body;
    if (isPhoneLogin) {
      if (!user.isPhoneVerified) {
        throw new AppError('Phone not verified. Please verify the SMS code before logging in.', 403);
      }
    } else if (!user.isEmailVerified) {
      throw new AppError('Email not verified. Please verify your email address before logging in.', 403);
    }

    if (user.twoFactorEnabled) {
      // AUTH-11: bind password success to 2FA with a signed pending token (not raw user id)
      const mfaPendingToken = issueMfaPendingToken(user.id);
      res.json({
        requires2fa: true,
        requires_2fa: true,
        two_fa_token: mfaPendingToken,
        mfaPendingToken,
      });
      return;
    }

    const { accessToken, refreshToken } = await issueTokens(user, req);

    await AuditService.log({ userId: user.id, action: 'login', req });

    setAuthCookies(res, accessToken, refreshToken);
    exposeMobileRefreshToken(req, res, refreshToken);

    res.json({
      ...authTokenResponse(accessToken),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        onboardingStatus: user.onboardingStatus,
        twoFactorEnabled: user.twoFactorEnabled,
        organizationId: user.organizationId,
        organization: user.organization
          ? { id: user.organization.id, name: user.organization.name }
          : null,
      },
      onboarding_status: user.onboardingStatus,
    });
  }

  static async verify2faLogin(req: Request, res: Response): Promise<void> {
    const body = req.body as {
      userId?: string;
      two_fa_token?: string;
      mfaPendingToken?: string;
      code?: string;
    };
    const pendingToken = body.mfaPendingToken || body.two_fa_token;
    const code = body.code;
    if (!pendingToken || !code) throw new AppError('Invalid request.', 400);

    let userId: string;
    try {
      userId = await consumeMfaPendingToken(pendingToken);
    } catch {
      throw new AppError('Invalid or expired 2FA session. Please sign in again.', 401);
    }

    // Reject legacy raw-userId tokens (AUTH-11)
    if (body.userId && body.userId === pendingToken) {
      throw new AppError('Invalid or expired 2FA session. Please sign in again.', 401);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (!user?.twoFactorSecret) throw new AppError('Invalid request.', 400);

    if (!user.isActive) {
      throw new AppError('Your account has been suspended.', 403);
    }

    // Enforce email verification also for 2FA completion.
    if (!user.isEmailVerified) {
      throw new AppError('Email not verified. Please verify your email address before logging in.', 403);
    }

    const valid = await verifyTotpNoReplay(user.id, user.twoFactorSecret, code);

    if (!valid) {
      await AuditService.log({ userId: user.id, action: '2fa_failed', req });
      throw new AppError('Invalid 2FA code.', 401);
    }

    const { accessToken, refreshToken } = await issueTokens(user, req);
    await AuditService.log({ userId: user.id, action: '2fa_login', req });

    setAuthCookies(res, accessToken, refreshToken);
    exposeMobileRefreshToken(req, res, refreshToken);

    res.json({
      ...authTokenResponse(accessToken),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
        organizationId: user.organizationId,
        organization: user.organization
          ? { id: user.organization.id, name: user.organization.name }
          : null,
      },
    });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (refreshToken && req.user) {
      await revokeRefreshTokenByPlain(refreshToken, req.user.userId);
    }
    if (req.user) {
      await AuditService.log({ userId: req.user.userId, action: 'logout', req });
      // AUTH-05: tear down realtime channels for this user
      disconnectUserSockets(req.user.userId);
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
    disconnectUserSockets(userId);
    clearAuthCookies(res);
    await AuditService.log({ userId, action: 'logout_all', req });
    res.json({ message: 'All sessions terminated.' });
  }

  static async me(req: Request, res: Response): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId, deletedAt: null },
      include: {
        providerProfile: true,
        clientProfile: true,
        organization: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new AppError('User not found.', 404);
    // AUTH-04: never return passwordHash / twoFactorSecret on /me
    res.json({ user: sanitizeUser(user as unknown as Record<string, unknown>) });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      throw new AppError('Refresh token required.', 401);
    }

    const stored = await findRefreshTokenByPlain(refreshToken);
    if (!stored) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    // AUTH-02: reuse of a revoked family member → kill the whole family
    if (stored.revokedAt) {
      await revokeRefreshTokenFamily(stored.familyId, stored.userId);
      await recordLogoutAll(stored.userId);
      disconnectUserSockets(stored.userId);
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    if (stored.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    let payload: { userId: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('Invalid refresh token.', 401);
    }

    if (payload.userId !== stored.userId) {
      throw new AppError('Invalid refresh token.', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId, deletedAt: null } });
    // AUTH-12: suspended / missing users must not obtain fresh tokens
    if (!user || !user.isActive) {
      await revokeRefreshTokenFamily(stored.familyId, stored.userId);
      await recordLogoutAll(stored.userId);
      disconnectUserSockets(stored.userId);
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    // AUTH-02: atomic claim — concurrent refresh loses and looks like reuse
    const claimed = await claimRefreshTokenForRotation(stored.id, stored.userId);
    if (!claimed) {
      await revokeRefreshTokenFamily(stored.familyId, stored.userId);
      await recordLogoutAll(stored.userId);
      disconnectUserSockets(stored.userId);
      throw new AppError('Invalid or expired refresh token.', 401);
    }

    const tokens = await issueTokens(user, req, stored.familyId);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
    exposeMobileRefreshToken(req, res, tokens.refreshToken);
    res.json(authTokenResponse(tokens.accessToken));
  }

  /** Lightweight session check — used by SPA before rendering protected routes */
  static async session(req: Request, res: Response): Promise<void> {
    const token = getAccessTokenFromRequest(req);
    if (!token) {
      res.json({ authenticated: false });
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const [active, terminated] = await Promise.all([
        assertUserActive(payload.userId),
        wasLoggedOutAll(payload.userId, payload.iat),
      ]);
      if (!active || terminated) {
        res.json({ authenticated: false });
        return;
      }
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

      // A-5 / AUTH-09: single live reset token per email
      await prisma.otpVerification.upsert({
        where: { identifier_type: { identifier: email, type: 'password_reset' } },
        create: {
          userId: user.id,
          identifier: email,
          otp: token,
          type: 'password_reset',
          expiresAt,
        },
        update: {
          userId: user.id,
          otp: token,
          expiresAt,
          verifiedAt: null,
        },
      });

      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
      await EmailService.sendPasswordReset(email, resetUrl);
      await AuditService.log({
        userId: user.id,
        action: 'password_reset_requested',
        entity: 'User',
        entityId: user.id,
        req,
      });
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
    disconnectUserSockets(userId);
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
      // Match resetPassword: revoke any pre-invite sessions/tokens
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return updated;
    });
    await recordLogoutAll(userId);
    disconnectUserSockets(userId);
    clearAuthCookies(res);

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

  /**
   * AUTH-03: Stage a pending TOTP secret (Redis). Do not overwrite the live
   * twoFactorSecret until verify2faSetup confirms the code. Require password,
   * and current TOTP when 2FA is already enabled (re-enrollment).
   */
  static async enable2fa(req: Request, res: Response): Promise<void> {
    const { password, code } = z
      .object({
        password: z.string().min(1),
        code: z.string().min(6).max(8).optional(),
      })
      .parse(req.body ?? {});

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid password.', 401);
    }

    if (user.twoFactorEnabled) {
      if (!code) {
        throw new AppError('Current authenticator code is required to replace 2FA.', 422);
      }
      if (!user.twoFactorSecret) {
        throw new AppError('2FA is not configured.', 400);
      }
      const currentValid = await verifyTotpNoReplay(user.id, user.twoFactorSecret, code);
      if (!currentValid) {
        throw new AppError('Invalid authentication code.', 422);
      }
    }

    const secret = speakeasy.generateSecret({ name: `Riayah Plus (${user.email})` });
    await stagePendingTotpSecret(user.id, secret.base32);

    const qrUrl = await qrcode.toDataURL(secret.otpauth_url!);
    await AuditService.log({ userId: user.id, action: '2fa_setup_started', req });
    res.json({ secret: secret.base32, qrCode: qrUrl });
  }

  static async verify2faSetup(req: Request, res: Response): Promise<void> {
    const { code } = z.object({ code: z.string().min(6).max(8) }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    const pendingSecret = await getPendingTotpSecret(user.id);
    if (!pendingSecret) {
      throw new AppError('2FA setup expired or not started. Please begin again.', 400);
    }

    const valid = await verifyTotpNoReplay(user.id, pendingSecret, code);

    if (!valid) throw new AppError('Invalid code.', 422);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: pendingSecret, twoFactorEnabled: true },
    });
    await clearPendingTotpSecret(user.id);
    await AuditService.log({ userId: user.id, action: '2fa_enabled', req });
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

    // M-41 / AUTH-10: require fresh TOTP before disabling 2FA (no replay)
    if (!user.twoFactorSecret) throw new AppError('2FA is not configured.', 400);
    const valid = await verifyTotpNoReplay(user.id, user.twoFactorSecret, code);
    if (!valid) throw new AppError('Invalid authentication code.', 422);

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
    await AuditService.log({ userId: user.id, action: '2fa_disabled', req });
    res.json({ message: '2FA disabled.' });
  }

  /**
   * AUTH-01: Session list and revoke must share one ID space.
   * Always expose RefreshToken rows (the credential that revokeSession can kill).
   * UserSession remains for analytics/audit only and is never returned here.
   */
  static async listSessions(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const refreshToken = getRefreshTokenFromRequest(req);
    let currentSessionId: string | null = null;

    if (refreshToken) {
      const current = await findRefreshTokenByPlain(refreshToken);
      currentSessionId = current?.id ?? null;
    }

    const tokens = await prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
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
    const userId = req.user!.userId;
    const refreshToken = getRefreshTokenFromRequest(req);
    let currentSessionId: string | null = null;

    if (refreshToken) {
      const current = await findRefreshTokenByPlain(refreshToken);
      currentSessionId = current?.id ?? null;
    }

    await Promise.all([
      prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
        },
        data: { revokedAt: new Date() },
      }),
      // Best-effort hygiene: clear parallel UserSession rows (not listed to clients).
      prisma.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Other sessions revoked.' });
  }

  static async revokeSession(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const sessionId = req.params.id;
    const refreshToken = getRefreshTokenFromRequest(req);
    let currentSessionId: string | null = null;

    if (refreshToken) {
      const current = await findRefreshTokenByPlain(refreshToken);
      currentSessionId = current?.id ?? null;
    }

    const stored = await prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
      select: { id: true, ipAddress: true, userAgent: true, revokedAt: true },
    });
    if (!stored || stored.revokedAt) {
      throw new AppError('Session not found.', 404);
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Best-effort: revoke matching UserSession rows so analytics stay consistent.
    await prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(stored.userAgent ? { userAgent: stored.userAgent } : {}),
        ...(stored.ipAddress ? { ipAddress: stored.ipAddress } : {}),
      },
      data: { revokedAt: new Date() },
    });

    if (sessionId === currentSessionId) {
      clearAuthCookies(res);
    }

    await AuditService.log({
      userId,
      action: 'session_revoked',
      entity: 'RefreshToken',
      entityId: stored.id,
      req,
    });

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
