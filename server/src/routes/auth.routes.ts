import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthController } from '../controllers/auth/AuthController';
import { RegistrationController } from '../controllers/auth/RegistrationController';
import { OtpController } from '../controllers/auth/OtpController';
import { DeviceTokenController } from '../controllers/auth/DeviceTokenController';
import { UserProfileController } from '../controllers/users/UserProfileController';
import { StaffProfileController, staffAvatarUploadMiddleware } from '../controllers/users/StaffProfileController';
import { authenticate, optionalAuth, generateAccessToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { loginLimiter, otpLimiter, registerLimiter, avatarUploadLimiter, refreshLimiter } from '../middleware/rateLimiter';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { setAuthCookies } from '../utils/authCookies';

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const router = Router();

// AUTH-15: break-glass — disabled by default; when enabled requires bound user id + constant-time secret
router.post('/admin/login', loginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.ALLOW_ADMIN_SECRET_LOGIN !== 'true') {
      throw new AppError('Admin secret login is disabled.', 403);
    }
    if (!env.ADMIN_SECRET || !env.ADMIN_BREAK_GLASS_USER_ID) {
      throw new AppError('Admin break-glass is not configured.', 403);
    }

    const { secret } = (req.body ?? {}) as { secret?: string };
    if (!secret || !timingSafeEqualString(secret, env.ADMIN_SECRET)) {
      throw new AppError('Invalid admin secret.', 401);
    }

    // Bind to a fixed admin identity — never accept client-supplied email/userId
    const user = await prisma.user.findUnique({
      where: { id: env.ADMIN_BREAK_GLASS_USER_ID, deletedAt: null },
    });
    if (!user || !user.isActive || !['admin', 'super_admin'].includes(user.role)) {
      throw new AppError('Admin break-glass target is invalid.', 404);
    }

    const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });
    setAuthCookies(res, token);

    const { AuditService } = await import('../services/AuditService');
    await AuditService.log({
      userId: user.id,
      action: 'admin_secret_login',
      entity: 'User',
      entityId: user.id,
      after: { method: 'ADMIN_SECRET', breakGlass: true },
      req,
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// Public auth
router.post('/register', registerLimiter, RegistrationController.register);
router.post('/auth/register', registerLimiter, RegistrationController.register);
router.post('/register/phone', registerLimiter, RegistrationController.registerPhone);
router.post('/auth/register/phone', registerLimiter, RegistrationController.registerPhone);
router.post('/login', loginLimiter, AuthController.login);
router.post('/auth/login', loginLimiter, AuthController.login);
router.post('/forgot-password', otpLimiter, AuthController.forgotPassword);
router.post('/reset-password', otpLimiter, AuthController.resetPassword);
router.post('/set-password', otpLimiter, AuthController.setPasswordFromInvite);
router.post('/auth/set-password', otpLimiter, AuthController.setPasswordFromInvite);
router.post('/email/resend-verification', otpLimiter, AuthController.resendVerificationPublic);
router.post('/2fa/verify', loginLimiter, AuthController.verify2faLogin);
router.post('/auth/2fa-verify', loginLimiter, AuthController.verify2faLogin);
router.post('/otp/send', otpLimiter, OtpController.send);
router.post('/otp/verify', otpLimiter, OtpController.verify);
router.post('/auth/otp-verify', otpLimiter, OtpController.verify);
router.post('/auth/phone-otp-verify', otpLimiter, OtpController.verify);
router.post('/auth/refresh', refreshLimiter, AuthController.refresh);
router.get('/auth/session', AuthController.session);
router.post('/logout', optionalAuth, AuthController.logout);
router.post('/auth/logout', optionalAuth, AuthController.logout);

// Public email verification link:
// GET /api/email/verify?token=...&email=...
router.get('/email/verify', AuthController.verifyEmailLink);

// Public staff profile photos (shown on episode cards)
router.get('/avatars/:userId/:filename', StaffProfileController.serveAvatar);

// Authenticated
router.use(authenticate);
router.post('/logout-all', AuthController.logoutAll);
router.get('/me', AuthController.me);
router.get('/users/me', AuthController.me);
router.put('/me/language', UserProfileController.setUiLanguage);
router.put('/users/me/language', UserProfileController.setUiLanguage);
router.post('/auth/resend-verification', AuthController.resendVerification);
router.post('/2fa/enable', loginLimiter, AuthController.enable2fa);
router.post('/2fa/verify-setup', loginLimiter, AuthController.verify2faSetup);
router.post('/2fa/disable', loginLimiter, AuthController.disable2fa);
router.get('/sessions', AuthController.listSessions);
router.delete('/sessions/:id', loginLimiter, AuthController.revokeSession);
router.post('/sessions/revoke-others', loginLimiter, AuthController.revokeOtherSessions);

router.post('/device-tokens', DeviceTokenController.register);
router.post('/auth/device-tokens', DeviceTokenController.register);
router.get('/device-tokens', DeviceTokenController.list);
router.get('/auth/device-tokens', DeviceTokenController.list);
router.delete('/device-tokens/:id', DeviceTokenController.revokeById);
router.delete('/auth/device-tokens/:id', DeviceTokenController.revokeById);
router.post('/device-tokens/revoke', DeviceTokenController.revokeByToken);
router.post('/auth/device-tokens/revoke', DeviceTokenController.revokeByToken);

// Admin-only role migration (was public — security fix)
router.post('/migrate-role', requireAdmin, UserProfileController.migrateRole);

// Onboarding
router.post('/onboarding/complete', RegistrationController.completeOnboarding);
router.post('/client-onboarding/complete', RegistrationController.completeOnboarding);
router.post('/onboarding/profile', RegistrationController.completeOnboarding);
router.get('/onboarding/status', RegistrationController.getOnboardingStatus);

// Profile
router.put('/user/password', UserProfileController.updatePassword);
router.put('/user/profile', UserProfileController.updateProfile);
router.put('/client/profile', UserProfileController.updateProfile);
router.get('/users/me/profile', StaffProfileController.getMeProfile);
router.patch('/users/me/profile', StaffProfileController.patchMeProfile);
router.post(
  '/users/me/avatar',
  avatarUploadLimiter,
  staffAvatarUploadMiddleware,
  StaffProfileController.uploadAvatar,
);
router.delete('/user', UserProfileController.destroy);

export default router;
