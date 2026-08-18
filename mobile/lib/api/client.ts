import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Prefer EXPO_PUBLIC_API_URL (should be origin only, e.g. http://192.168.x.x:5001).
 * Paths below include `/api/...`.
 */
const BASE_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_URL ??
  process.env.EXPO_PUBLIC_SERVER_BASE_URI ??
  'http://localhost:5001';

export const apiClient = axios.create({
  baseURL: BASE_URL.replace(/\/$/, ''),
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
  // Cap response body parsing pressure on low-RAM devices
  maxContentLength: 2 * 1024 * 1024,
  maxBodyLength: 2 * 1024 * 1024,
});

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

apiClient.interceptors.request.use((config) => {
  if (authToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err),
);
