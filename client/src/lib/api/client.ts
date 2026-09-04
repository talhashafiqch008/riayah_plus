import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Auth uses httpOnly cookies set by Express (token + refresh_token).
 * withCredentials sends cookies on every request — no localStorage tokens.
 */
export function getAccessToken(): string | null {
  return null;
}

export function setAccessToken(_token: string | null) {
  // Tokens are httpOnly cookies — not accessible from JS
}

export function getRefreshToken(): string | null {
  return null;
}

export function setRefreshToken(_token: string | null) {
  // Tokens are httpOnly cookies — not accessible from JS
}

export function setAuthTokens(_access: string | null, _refresh?: string | null) {
  // Cookies are set by the server on login/register/refresh
}

/** Remove legacy localStorage tokens and cached user profile from pre-cookie migration */
export function clearLegacyTokenStorage(): void {
  localStorage.removeItem('raiyah:api_token');
  localStorage.removeItem('raiyah:refresh_token');
  localStorage.removeItem('raiyah:token');
  localStorage.removeItem('raiyah:user');
  localStorage.removeItem('api_token');
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(error: AxiosError): boolean {
  if (!error.response) return true;
  const status = error.response.status;
  return status >= 500 || status === 408;
}

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
  maxBodyLength: 50 * 1024 * 1024,
  maxContentLength: 50 * 1024 * 1024,
});

client.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  (config as AxiosRequestConfig & { __retryCount?: number }).__retryCount =
    (config as AxiosRequestConfig & { __retryCount?: number }).__retryCount || 0;
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (response.status === 202) {
      return {
        ...response,
        data: { ...response.data, _asyncStatus: 'processing', _statusCode: 202 },
      };
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as (AxiosRequestConfig & { __retryCount?: number }) | undefined;
    if (!config) return Promise.reject(error);

    const retryCount = config.__retryCount || 0;
    if (retryCount < MAX_RETRIES && shouldRetry(error)) {
      config.__retryCount = retryCount + 1;
      await sleep(RETRY_DELAY_MS * Math.pow(2, retryCount));
      return client(config);
    }
    return Promise.reject(error);
  },
);

let isRefreshing = false;

interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: AxiosRequestConfig;
}

const failedQueue: FailedRequest[] = [];

function processQueue(error: Error | null) {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(client(prom.config));
  });
  failedQueue.length = 0;
}

client.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    const isLoginRequest = originalRequest.url?.includes('/login');
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');
    const isSessionRequest = originalRequest.url?.includes('/auth/session');
    const isLoginPage = window.location.pathname.includes('/login');
    const isPublicPage = ['/', '/find-care', '/browse', '/find-support'].includes(
      window.location.pathname,
    );

    if (
      error.response?.status === 401 &&
      !isLoginRequest &&
      !isRefreshRequest &&
      !isSessionRequest &&
      !isLoginPage
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      isRefreshing = true;
      try {
        await client.post('/auth/refresh');
        processQueue(null);
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(
          refreshError instanceof Error ? refreshError : new Error(String(refreshError)),
        );
        if (!isPublicPage) {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

export async function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.get<T>(url, config);
  return response.data;
}

export async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.post<T>(url, data, config);
  return response.data;
}

export async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.put<T>(url, data, config);
  return response.data;
}

export async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.patch<T>(url, data, config);
  return response.data;
}

export async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await client.delete<T>(url, config);
  return response.data;
}

export { API_BASE_URL };
