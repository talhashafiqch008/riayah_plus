/* eslint-disable */
// @ts-nocheck
/**
 * Phone Authentication Service
 * OTP generation and verification for phone-based auth
 */

import api from './api';
import { CountryCode, validatePhoneNumber } from '@/config/countries';

export interface OTPResponse {
    success: boolean;
    message: string;
    expires_at?: Date;
}

export interface VerifyOTPResponse {
    success: boolean;
    access_token?: string;
    user?: Record<string, unknown>;
    message: string;
}

// ============================================================================
// PHONE AUTH SERVICE
// ============================================================================

export class PhoneAuthService {
    /**
     * Send OTP to phone number
     */
    static async sendOTP(
        phoneNumber: string,
        countryCode: CountryCode
    ): Promise<OTPResponse> {
        try {
            const cleanPhone = phoneNumber.replace(/\s|-/g, '');
            if (!validatePhoneNumber(cleanPhone, countryCode)) {
                return {
                    success: false,
                    message: 'Invalid phone number format'
                };
            }

            const result = await api.sendOtp(cleanPhone);
            return {
                success: result.success ?? true,
                message: result.message || 'OTP sent successfully',
                expires_at: new Date(Date.now() + 5 * 60 * 1000)
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to send OTP';
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Verify OTP code
     */
    static async verifyOTP(
        phoneNumber: string,
        code: string,
        _countryCode: CountryCode
    ): Promise<VerifyOTPResponse> {
        try {
            const result = await api.verifyOtp(phoneNumber, code);
            return {
                success: result.success ?? true,
                access_token: result.access_token,
                user: result.user,
                message: result.message || 'OTP verified successfully'
            };
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to verify OTP';
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    /**
     * Resend OTP
     */
    static async resendOTP(
        phoneNumber: string,
        countryCode: CountryCode
    ): Promise<OTPResponse> {
        // Same as sendOTP but with different messaging
        const result = await this.sendOTP(phoneNumber, countryCode);
        if (result.success) {
            result.message = 'OTP resent successfully';
        }
        return result;
    }

    /**
     * Check if phone number exists
     */

}

// ============================================================================
// OTP STORAGE (for development/testing)
// ============================================================================

interface OTPStore {
    code: string;
    phone: string;
    expires_at: number;
    attempts: number;
}

class OTPManager {
    private static readonly STORAGE_KEY = 'otp_store';
    private static readonly MAX_ATTEMPTS = 3;
    private static readonly EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Generate and store OTP (for development)
     */
    static generateOTP(phone: string): string {
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        const store: OTPStore = {
            code,
            phone,
            expires_at: Date.now() + this.EXPIRY_MS,
            attempts: 0
        };

        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));

        return code;
    }

    /**
     * Verify OTP (for development)
     */
    static verifyOTP(phone: string, code: string): boolean {
        const stored = sessionStorage.getItem(this.STORAGE_KEY);
        if (!stored) return false;

        try {
            const store: OTPStore = JSON.parse(stored);

            // Check phone match
            if (store.phone !== phone) return false;

            // Check expiry
            if (Date.now() > store.expires_at) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return false;
            }

            // Check attempts
            if (store.attempts >= this.MAX_ATTEMPTS) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return false;
            }

            // Verify code
            if (store.code === code) {
                sessionStorage.removeItem(this.STORAGE_KEY);
                return true;
            }

            // Increment attempts
            store.attempts++;
            sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(store));

            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Clear OTP
     */
    static clearOTP(): void {
        sessionStorage.removeItem(this.STORAGE_KEY);
    }
}


