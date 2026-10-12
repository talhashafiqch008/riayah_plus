import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

/**
 * Twilio Verify (OTP) + optional legacy Programmable Messaging.
 * Prefer Verify Service SID for phone OTP (Qatar / GCC recommended by Twilio Support).
 */
export class TwilioSmsService {
  private static credentials() {
    const sid = env.TWILIO_ACCOUNT_SID?.trim();
    const token = env.TWILIO_AUTH_TOKEN?.trim();
    const verifySid = env.TWILIO_VERIFY_SERVICE_SID?.trim();
    return { sid, token, verifySid };
  }

  /** Start SMS verification via Twilio Verify (Twilio generates and sends the code). */
  static async startPhoneVerification(toE164: string): Promise<void> {
    const { sid, token, verifySid } = this.credentials();
    if (!sid || !token) {
      throw new AppError('SMS gateway is not configured (Twilio).', 503);
    }
    if (!verifySid) {
      throw new AppError('Twilio Verify Service SID is not configured.', 503);
    }

    const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/Verifications`;
    try {
      await axios.post(
        url,
        new URLSearchParams({ To: toE164, Channel: 'sms' }).toString(),
        {
          auth: { username: sid, password: token },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20_000,
        },
      );
    } catch (err) {
      this.throwSendError(err, toE164);
    }
  }

  /** Check OTP via Twilio Verify. Returns true when status is approved. */
  static async checkPhoneVerification(toE164: string, code: string): Promise<boolean> {
    const { sid, token, verifySid } = this.credentials();
    if (!sid || !token) {
      throw new AppError('SMS gateway is not configured (Twilio).', 503);
    }
    if (!verifySid) {
      throw new AppError('Twilio Verify Service SID is not configured.', 503);
    }

    const url = `https://verify.twilio.com/v2/Services/${encodeURIComponent(verifySid)}/VerificationCheck`;
    try {
      const { data } = await axios.post(
        url,
        new URLSearchParams({ To: toE164, Code: code }).toString(),
        {
          auth: { username: sid, password: token },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20_000,
        },
      );
      return String(data?.status || '').toLowerCase() === 'approved';
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
          ? err.message
          : String(err);
      logger.error('Twilio Verify check failed', {
        toLast4: toE164.slice(-4),
        detail: String(detail).slice(0, 200),
      });
      return false;
    }
  }

  /**
   * @deprecated Prefer startPhoneVerification (Twilio Verify).
   * Kept for environments that only have TWILIO_PHONE_NUMBER configured.
   */
  static async sendOtp(toE164: string, otp: string): Promise<void> {
    const { sid, token, verifySid } = this.credentials();
    if (verifySid) {
      await this.startPhoneVerification(toE164);
      return;
    }

    const from = env.TWILIO_PHONE_NUMBER?.trim();
    if (!sid || !token) {
      throw new AppError('SMS gateway is not configured (Twilio).', 503);
    }
    if (!from) {
      throw new AppError('Twilio phone number or Verify Service SID is not configured.', 503);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
    try {
      await axios.post(
        url,
        new URLSearchParams({
          To: toE164,
          From: from,
          Body: `Your Riayah Plus verification code is ${otp}. It expires in 10 minutes.`,
        }).toString(),
        {
          auth: { username: sid, password: token },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 20_000,
        },
      );
    } catch (err) {
      this.throwSendError(err, toE164);
    }
  }

  private static throwSendError(err: unknown, toE164: string): never {
    const detail = axios.isAxiosError(err)
      ? err.response?.data?.message || err.message
      : err instanceof Error
        ? err.message
        : String(err);
    logger.error('Twilio SMS/Verify send failed', {
      toLast4: toE164.slice(-4),
      detail: String(detail).slice(0, 200),
    });
    throw new AppError('Failed to send SMS verification code. Please try again.', 502);
  }
}
