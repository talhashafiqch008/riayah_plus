import { client } from "./client";
import { extractDomainError } from "@/lib/errors";
import type {
    RegisterPayload,
    UpdateProfilePayload,
    OnboardingPayload,
} from "@/types/api";

export async function login(identifier: string, password: string, isPhone = false) {
    try {
        const payload = isPhone ? { phone: identifier, password } : { email: identifier, password };
        const response = await client.post('/auth/login', payload);
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function forgotPassword(email: string) {
    try {
        const response = await client.post('/forgot-password', { email });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function resetPassword(email: string, token: string, password: string) {
    try {
        const response = await client.post('/reset-password', { email, token, password });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function resendVerificationEmail(email: string) {
    try {
        const response = await client.post('/email/resend-verification', { email });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function register(data: RegisterPayload) {
    try {
        const response = await client.post('/auth/register', data);
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function logout() {
    try {
        const response = await client.post('/auth/logout');
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function refreshSession() {
    try {
        const response = await client.post('/auth/refresh');
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function sendOtp(phone: string) {
    try {
        const response = await client.post('/otp/send', { identifier: phone, type: 'phone' });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function verifyOtp(phone: string, code: string) {
    try {
        const response = await client.post('/otp/verify', { identifier: phone, otp: code, type: 'phone' });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function verifyPhoneOtp(phone: string, otp: string, country_code?: string) {
    try {
        const response = await client.post('/auth/phone-otp-verify', {
            identifier: phone,
            phone,
            otp,
            type: 'phone',
            country_code,
        });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function getMe() {
    try {
        const response = await client.get('/me');
        return response.data?.user || response.data;
    } catch (error) {
        console.error('Failed to fetch current user', error);
        throw error;
    }
}

export async function getUser() {
    return getMe();
}

export async function enable2fa() {
    try {
        const response = await client.post('/2fa/enable');
        const data = response.data as { secret?: string; qrCode?: string; qr_code_url?: string };
        return {
            ...data,
            secret: data.secret,
            qrCode: data.qrCode ?? data.qr_code_url,
            qr_code_url: data.qrCode ?? data.qr_code_url,
        };
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function verify2faSetup(secret: string, code: string) {
    try {
        const response = await client.post('/2fa/verify-setup', { secret, code });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function disable2fa(password: string) {
    try {
        const response = await client.post('/2fa/disable', { password });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getSessions() {
    try {
        const response = await client.get('/sessions');
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function revokeSession(id: string | number) {
    try {
        const response = await client.delete(`/sessions/${id}`);
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function revokeOtherSessions() {
    try {
        const response = await client.post('/sessions/revoke-others');
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function logoutAll() {
    try {
        const response = await client.post('/logout-all');
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function verify2faLogin(userId: string, code: string) {
    try {
        const response = await client.post('/auth/2fa-verify', { userId, code });
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error);
    }
}

export async function updateClientProfile(data: UpdateProfilePayload | FormData) {
    try {
        const isFormData = data instanceof FormData;
        const config = isFormData ? {
            headers: { 'Content-Type': undefined as string | undefined },
        } : {};

        const response = isFormData
            ? await client.post('/client/profile?_method=PUT', data, config)
            : await client.put('/client/profile', data);
        return response.data;
    } catch (error) {
        console.error('Failed to update profile:', error);
        throw error;
    }
}

export async function updatePassword(current_password: string, password: string) {
    try {
        const response = await client.put('/user/password', {
            current_password: current_password,
            password: password,
            password_confirmation: password
        });
        return response.data;
    } catch (error) {
        throw error;
    }
}
export async function getProfile() {
    return getMe();
}

// export async function updateProfile(data: UpdateProfilePayload) {
//     try {
//         const response = await client.put('/user/profile', data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to updateProfile', error);
//         throw error;
//     }
// }

async function getOnboardingStatus() {
    try {
        const response = await client.get('/onboarding/status');
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function updateOnboardingProfile(data: OnboardingPayload) {
    try {
        const response = await client.post('/onboarding/profile', data);
        return response.data;
    } catch (error) {
        console.error('Failed to updateOnboardingProfile', error);
        throw error;
    }
}

export async function completeClientOnboarding(data: OnboardingPayload) {
    try {
        const config = data instanceof FormData ? {
            headers: { 'Content-Type': undefined as string | undefined },
        } : {};
        const response = await client.post('/client-onboarding/complete', data, config);
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function completeOnboarding(data: OnboardingPayload | FormData) {
    try {
        const config = data instanceof FormData ? {
            headers: { 'Content-Type': undefined as string | undefined },
            timeout: 120000,
        } : {};

        const response = await client.post('/onboarding/complete', data, config);
        return response.data;
    } catch (error: unknown) {
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function submitConsent(data: { type: string; version: string }) {
    try {
        const response = await client.post('/consent', data);
        return response.data;
    } catch (error) {
        console.error('Failed to submitConsent', error);
        throw error;
    }
}
