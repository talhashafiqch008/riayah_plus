import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

let hardSessionResetPromise: Promise<void> | null = null;

async function hardSessionReset(): Promise<void> {
  if (hardSessionResetPromise) return hardSessionResetPromise;
  hardSessionResetPromise = (async () => {
    await clearAuthTokens();
    try {
      const { purgeLocalSession } = await import('../sessionCleanup');
      await purgeLocalSession();
    } catch {
      /* ignore */
    }
    try {
      const { useAuthStore } = await import('../../stores/authStore');
      useAuthStore.setState({ token: null, user: null });
    } catch {
      /* ignore */
    }
    try {
      router.replace('/(auth)/login');
    } catch {
      /* ignore */
    }
  })().finally(() => {
    hardSessionResetPromise = null;
  });
  return hardSessionResetPromise;
}

/**
 * Prefer EXPO_PUBLIC_API_URL (should be origin only, e.g. http://192.168.x.x:5001).
 * Paths below include `/api/...`.
 */
const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_SERVER_BASE_URI ??
  'http://localhost:5001';

export const ACCESS_TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

export const apiClient = axios.create({
  baseURL: BASE_URL.replace(/\/$/, ''),
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
  },
  // Cap response body parsing pressure on low-RAM devices
  maxContentLength: 2 * 1024 * 1024,
  maxBodyLength: 2 * 1024 * 1024,
});

let authToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export async function setApiRefreshToken(token: string | null) {
  refreshToken = token;
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => undefined);
  }
}

export async function hydrateRefreshToken(): Promise<void> {
  refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

/** Persist access + optional refresh from a login/refresh response. */
export async function persistAuthTokensFromResponse(
  accessToken: string,
  responseHeaders?: Record<string, unknown>,
): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  setApiAuthToken(accessToken);

  const headerRefresh =
    (responseHeaders?.['x-refresh-token'] as string | undefined) ||
    (responseHeaders?.['X-Refresh-Token'] as string | undefined);
  if (headerRefresh) {
    await setApiRefreshToken(headerRefresh);
  }
}

export async function clearAuthTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => undefined);
  await setApiRefreshToken(null);
  setApiAuthToken(null);
}

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) {
    refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  }
  if (!refreshToken) return null;

  const res = await axios.post(
    `${BASE_URL.replace(/\/$/, '')}/api/auth/refresh`,
    {},
    {
      headers: {
        'X-Client': 'mobile',
        'X-Refresh-Token': refreshToken,
      },
      timeout: 15_000,
    },
  );

  const nextAccess: string | undefined =
    res.data?.token ?? res.data?.accessToken ?? res.data?.access_token;
  if (!nextAccess) return null;

  const nextRefresh =
    (res.headers?.['x-refresh-token'] as string | undefined) ||
    (res.headers?.['X-Refresh-Token'] as string | undefined) ||
    refreshToken;

  await persistAuthTokensFromResponse(nextAccess, { 'x-refresh-token': nextRefresh });
  return nextAccess;
}

apiClient.interceptors.request.use((config) => {
  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  if (refreshToken) {
    config.headers['X-Refresh-Token'] = refreshToken;
  }
  config.headers['X-Client'] = 'mobile';
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const original = err.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (err.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(err);
    }
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/login')) {
      return Promise.reject(err);
    }

    original._retry = true;
    try {
      refreshPromise = refreshPromise ?? refreshAccessToken();
      const next = await refreshPromise;
      refreshPromise = null;
      if (!next) {
        // MOB-10: failed refresh → purge caches and return to login
        await hardSessionReset();
        return Promise.reject(err);
      }
      original.headers.Authorization = `Bearer ${next}`;
      return apiClient(original);
    } catch (refreshErr) {
      refreshPromise = null;
      await hardSessionReset();
      return Promise.reject(refreshErr);
    }
  },
);
