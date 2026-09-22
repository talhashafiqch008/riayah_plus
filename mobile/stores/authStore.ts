import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import {
  ACCESS_TOKEN_KEY,
  apiClient,
  clearAuthTokens,
  hydrateRefreshToken,
  persistAuthTokensFromResponse,
  setApiAuthToken,
} from '../lib/api/client';
import { revokePushToken } from '../lib/notifications';
import { purgeLocalSession } from '../lib/sessionCleanup';
import { router } from 'expo-router';

export type UserRole =
  | 'family'
  | 'client'
  | 'consumer'
  | 'patient'
  | 'support_worker'
  | 'clinical_staff'
  | 'doctor'
  | 'nurse'
  | 'physiotherapist'
  | 'occupational_therapist'
  | 'speech_therapist'
  | 'psychologist'
  | 'dietitian'
  | 'therapist'
  | 'caregiver'
  | 'companion'
  | 'care_coordinator'
  | 'org_admin'
  | 'admin'
  | 'super_admin'
  | 'support_admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  careUnitId?: string | null;
}

export const FAMILY_ROLES: UserRole[] = ['family', 'client', 'consumer', 'patient'];
export const STAFF_ROLES: UserRole[] = [
  'support_worker',
  'clinical_staff',
  'doctor',
  'nurse',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'therapist',
  'caregiver',
  'companion',
];
export const CLINICAL_ROLES: UserRole[] = [
  'clinical_staff',
  'doctor',
  'nurse',
  'physiotherapist',
  'occupational_therapist',
  'speech_therapist',
  'psychologist',
  'dietitian',
  'therapist',
];
export const SUPPORT_ROLES: UserRole[] = ['support_worker', 'caregiver', 'companion'];
export const COORDINATOR_ROLES: UserRole[] = ['care_coordinator'];
/** Tenant org console — not platform admin. */
export const ORG_ADMIN_ROLES: UserRole[] = ['org_admin'];
/** Platform admin console. */
export const PLATFORM_ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'support_admin'];
export const SUPER_ADMIN_ROLES: UserRole[] = ['super_admin'];

const BIO_EMAIL_KEY = 'auth_bio_email';

function orgNameFromRaw(raw: Record<string, unknown>): string | null {
  if (typeof raw.organizationName === 'string' && raw.organizationName.trim()) {
    return raw.organizationName.trim();
  }
  const org = raw.organization;
  if (org && typeof org === 'object' && 'name' in org) {
    const name = (org as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  return null;
}

function mapUser(raw: Record<string, unknown>): AuthUser {
  const first = (raw.firstName ?? raw.first_name ?? '') as string;
  const last = (raw.lastName ?? raw.last_name ?? '') as string;
  const name =
    (raw.name as string | undefined)?.trim() ||
    `${first} ${last}`.trim() ||
    (raw.email as string) ||
    'User';

  return {
    id: String(raw.id),
    name,
    email: String(raw.email ?? ''),
    role: (raw.role as UserRole) || 'family',
    avatarUrl: (raw.avatar ?? raw.avatarUrl ?? null) as string | null,
    organizationId: (raw.organizationId ?? raw.organization_id ?? null) as string | null,
    organizationName: orgNameFromRaw(raw),
    careUnitId: (raw.careUnitId ?? raw.care_unit_id ?? null) as string | null,
  };
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
  rememberBiometricEmail: (email: string) => Promise<void>;
  getBiometricEmail: () => Promise<string | null>;
}

export function routeByRole(user: AuthUser) {
  const { role, careUnitId } = user;
  if (FAMILY_ROLES.includes(role)) {
    router.replace(careUnitId ? '/(family)' : '/(onboarding)/step-1-care-unit');
  } else if (PLATFORM_ADMIN_ROLES.includes(role)) {
    router.replace('/(admin)');
  } else if (ORG_ADMIN_ROLES.includes(role)) {
    router.replace('/(org)');
  } else if (role === 'care_coordinator') {
    router.replace('/(coordinator)');
  } else if (CLINICAL_ROLES.includes(role)) {
    router.replace('/(clinical)');
  } else if (SUPPORT_ROLES.includes(role)) {
    router.replace('/(support)');
  } else {
    router.replace('/(staff)');
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  user: null,
  isLoading: true,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      await hydrateRefreshToken();
      if (!stored) {
        set({ isLoading: false });
        return;
      }
      setApiAuthToken(stored);
      const { data } = await apiClient.get('/api/me');
      const raw = (data.user ?? data.data ?? data) as Record<string, unknown>;
      let user = mapUser(raw);

      // Families may have care units without careUnitId on /me — detect for routing
      if (FAMILY_ROLES.includes(user.role) && !user.careUnitId) {
        try {
          const units = await apiClient.get('/api/care-units');
          const list = (units.data.data ?? units.data) as unknown;
          if (Array.isArray(list) && list.length > 0) {
            user = { ...user, careUnitId: String((list[0] as { id: string }).id) };
          }
        } catch {
          // ignore — fall through to onboarding if needed
        }
      }

      set({ token: stored, user, isLoading: false });
    } catch {
      await clearAuthTokens();
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const res = await apiClient.post('/api/login', { email, password });
    const data = res.data;
    if (data.requires2fa || data.requires_2fa) {
      throw Object.assign(new Error('Two-factor authentication required.'), {
        code: '2FA_REQUIRED',
        // AUTH-11: signed pending token (not raw user id)
        mfaPendingToken: data.mfaPendingToken ?? data.two_fa_token,
        userId: data.mfaPendingToken ?? data.two_fa_token,
      });
    }
    const jwt: string = data.token ?? data.accessToken ?? data.access_token;
    if (!jwt) throw new Error('Login succeeded but no token was returned.');

    await persistAuthTokensFromResponse(jwt, res.headers as Record<string, unknown>);

    let user: AuthUser;
    if (data.user) {
      user = mapUser(data.user as Record<string, unknown>);
    } else {
      const me = await apiClient.get('/api/me');
      user = mapUser((me.data.user ?? me.data) as Record<string, unknown>);
    }

    if (FAMILY_ROLES.includes(user.role) && !user.careUnitId) {
      try {
        const units = await apiClient.get('/api/care-units');
        const list = (units.data.data ?? units.data) as unknown;
        if (Array.isArray(list) && list.length > 0) {
          user = { ...user, careUnitId: String((list[0] as { id: string }).id) };
        }
      } catch {
        // ignore
      }
    }

    set({ token: jwt, user });
    routeByRole(user);
  },

  logout: async () => {
    // Revoke push binding while the access token is still valid (MOB-09)
    try {
      await revokePushToken();
    } catch {
      /* ignore */
    }
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // ignore — local clear still required
    }
    await clearAuthTokens();
    await purgeLocalSession();
    set({ token: null, user: null });
    router.replace('/(auth)/login');
  },

  setUser: (user) => set({ user }),

  rememberBiometricEmail: async (email) => {
    await SecureStore.setItemAsync(BIO_EMAIL_KEY, email);
  },

  getBiometricEmail: async () => SecureStore.getItemAsync(BIO_EMAIL_KEY),
}));
