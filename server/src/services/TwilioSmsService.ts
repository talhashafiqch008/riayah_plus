import axios from 'axios';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../config/logger';

/**
 * Twilio Programmable Messaging via REST (no SDK dependency).
 */
export class TwilioSmsService {
  static async sendOtp(toE164: string, otp: string): Promise<void> {
    const sid = env.TWILIO_ACCOUNT_SID?.trim();
    const token = env.TWILIO_AUTH_TOKEN?.trim();
    const from = env.TWILIO_PHONE_NUMBER?.trim();

    if (!sid || !token) {
      throw new AppError('SMS gateway is not configured (Twilio).', 503);
    }
    if (!from) {
      throw new AppError('Twilio phone number is not configured.', 503);
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
    const body = new URLSearchParams({
      To: toE164,
      From: from,
      Body: `Your Riayah Plus verification code is ${otp}. It expires in 10 minutes.`,
    });

    try {
      await axios.post(url, body.toString(), {
        auth: { username: sid, password: token },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 20_000,
      });
    } catch (err) {
      const detail = axios.isAxiosError(err)
        ? err.response?.data?.message || err.message
        : err instanceof Error
          ? err.message
          : String(err);
      logger.error('Twilio SMS send failed', {
        toLast4: toE164.slice(-4),
        detail: String(detail).slice(0, 200),
      });
      throw new AppError('Failed to send SMS verification code. Please try again.', 502);
    }
  }
}
