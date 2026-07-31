import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth/AuthController';
import { RegistrationController } from '../controllers/auth/RegistrationController';
import { OtpController } from '../controllers/auth/OtpController';
import { DeviceTokenController } from '../controllers/auth/DeviceTokenController';
import { UserProfileController } from '../controllers/users/UserProfileController';
import { authenticate, optionalAuth, generateAccessToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbac';
import { loginLimiter, otpLimiter, registerLimiter, adminLimiter } from '../middleware/rateLimiter';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { setAuthCookies } from '../utils/authCookies';

const router = Router();

// Admin secret login — disabled by default (M-48). Enable only with ALLOW_ADMIN_SECRET_LOGIN=true.
router.post('/admin/login', adminLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (process.env.ALLOW_ADMIN_SECRET_LOGIN !== 'true') {
      throw new AppError('Admin secret login is disabled.', 403);
    }
    const { secret, email } = req.body;
    if (!secret || !env.ADMIN_SECRET || secret !== env.ADMIN_SECRET) {
      throw new AppError('Invalid admin secret.', 401);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      throw new AppError('Admin user not found.', 404);
    }

    const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });
    setAuthCookies(res, token);

    const { AuditService } = await import('../services/AuditService');
    await AuditService.log({
      userId: user.id,
      action: 'admin_secret_login',
      entity: 'User',
      entityId: user.id,
      after: { method: 'ADMIN_SECRET', email: user.email },
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
router.post('/login', loginLimiter, AuthController.login);
router.post('/auth/login', loginLimiter, AuthController.login);
router.post('/forgot-password', otpLimiter, AuthController.forgotPassword);
router.post('/reset-password', AuthController.resetPassword);
router.post('/set-password', AuthController.setPasswordFromInvite);
router.post('/auth/set-password', AuthController.setPasswordFromInvite);
router.post('/email/resend-verification', otpLimiter, AuthController.resendVerificationPublic);
router.post('/2fa/verify', loginLimiter, AuthController.verify2faLogin);
router.post('/auth/2fa-verify', loginLimiter, AuthController.verify2faLogin);
router.post('/otp/send', otpLimiter, OtpController.send);
router.post('/otp/verify', otpLimiter, OtpController.verify);
router.post('/auth/otp-verify', otpLimiter, OtpController.verify);
router.post('/auth/phone-otp-verify', otpLimiter, OtpController.verify);
router.post('/auth/refresh', AuthController.refresh);
router.get('/auth/session', AuthController.session);
router.post('/logout', optionalAuth, AuthController.logout);
router.post('/auth/logout', optionalAuth, AuthController.logout);

// Public email verification link:
// GET /api/email/verify?token=...&email=...
router.get('/email/verify', AuthController.verifyEmailLink);

// Authenticated
router.use(authenticate);
router.post('/logout-all', AuthController.logoutAll);
router.get('/me', AuthController.me);
router.get('/users/me', AuthController.me);
router.post('/auth/resend-verification', AuthController.resendVerification);
router.post('/2fa/enable', AuthController.enable2fa);
router.post('/2fa/verify-setup', AuthController.verify2faSetup);
router.post('/2fa/disable', AuthController.disable2fa);
router.get('/sessions', AuthController.listSessions);
router.delete('/sessions/:id', AuthController.revokeSession);
router.post('/sessions/revoke-others', AuthController.revokeOtherSessions);

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
router.delete('/user', UserProfileController.destroy);

export default router;
