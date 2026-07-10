import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { client, clearLegacyTokenStorage } from '@/lib/api/client';
import { extractDomainError, TwoFactorRequiredError } from '@/lib/errors';
import { AuthError } from '@/lib/errors/domain';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { isProtectedPath } from '@/routes/getLoginRedirectForPath';

export const isProviderRole = (role: string): boolean => {
  if (typeof role !== 'string') return false;
  const providerRoles = [
    'provider', 'doctor', 'nurse', 'physiotherapist', 'occupational_therapist',
    'speech_therapist', 'psychologist', 'dietitian', 'support_worker', 'cleaner',
    'gardener', 'driver', 'companion', 'nanny', 'caregiver', 'therapist',
  ];
  return providerRoles.includes(role.toLowerCase());
};

export interface ServiceProviderInfo {
  provider_type?: string;
  provider_role?: string;
  roles?: string[];
  public_profile_id?: string;
  [key: string]: unknown;
}

export interface User {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  country?: string;
  phone?: string;
  avatar?: string | null;
  onboarding_status?: string;
  is_active?: boolean;
  is_verified?: boolean;
  public_id?: string;
  average_rating?: number;
  age?: number;
  gender?: string;
  serviceProvider?: ServiceProviderInfo;
  two_factor_enabled?: boolean;
  credit_balance?: {
    available_credits: number;
    escrow_credits: number;
    currency: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export interface RegisterResult {
  user: User;
  requiresEmailVerification?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, isPhone?: boolean) => Promise<User>;
  complete2faLogin: (userId: string, code: string) => Promise<User>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapUserData(userData: Record<string, unknown>, extra?: Record<string, unknown>): User {
  const name = userData.name as string | undefined;
  const nameParts = name?.trim().split(/\s+/) ?? [];
  const firstName =
    (userData.firstName || userData.first_name || nameParts[0] || '') as string;
  const lastName =
    (userData.lastName || userData.last_name || nameParts.slice(1).join(' ') || '') as string;

  return {
    id: userData.id as string,
    email: userData.email as string,
    firstName,
    lastName,
    role: userData.role as string,
    country: userData.country as string | undefined,
    phone: userData.phone as string | undefined,
    avatar: userData.avatar as string | null | undefined,
    onboarding_status: (
      userData.onboarding_status ||
      userData.onboardingStatus ||
      extra?.onboarding_status ||
      extra?.onboardingStatus
    ) as string | undefined,
    is_active: (userData.is_active ?? userData.isActive) as boolean | undefined,
    is_verified: (userData.is_verified ?? userData.isVerified) as boolean | undefined,
    public_id: userData.public_id as string | undefined,
    average_rating: userData.average_rating as number | undefined,
    serviceProvider: (userData.service_provider || userData.serviceProvider) as ServiceProviderInfo | undefined,
    two_factor_enabled: (userData.two_factor_enabled ?? userData.twoFactorEnabled) as boolean | undefined,
    credit_balance: userData.credit_balance as User['credit_balance'],
  };
}

function storeAuthResponse(_data: Record<string, unknown>): void {
  // httpOnly cookies are set by the server — nothing to store client-side
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticating = useRef(false);

  useEffect(() => {
    clearLegacyTokenStorage();
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-validate session when navigating to protected routes (middleware parity)
  useEffect(() => {
    if (loading || !isProtectedPath(location.pathname)) return;
    const token = localStorage.getItem(STORAGE_KEYS.apiToken);
    if (!token) return;
    void revalidateSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Redirect inactive providers to pending page
  useEffect(() => {
    if (!loading && user) {
      const role = typeof user.role === 'string' ? user.role.toLowerCase() : '';
      const isProvider = isProviderRole(role);
      const isPending = location.pathname === '/provider/account-pending';
      const isOnboarding = location.pathname === '/provider/onboarding';
      if (isProvider && user.is_active === false && !isPending && !isOnboarding) {
        navigate('/provider/account-pending', { replace: true });
      }
    }
  }, [user, loading, location.pathname, navigate]);

  // Cross-tab logout sync
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      navigate('/');
    };
    window.addEventListener('auth:logout', handleAuthLogout);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('auth');
      channel.onmessage = (event) => {
        if (event.data === 'logout') {
          setUser(null);
          navigate('/');
        }
      };
    } catch {
      // BroadcastChannel not available
    }

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      channel?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const revalidateSession = async () => {
    try {
      const response = await client.get('/me');
      const data = response.data as Record<string, unknown>;
      const userData = (data.user || data.data || data) as Record<string, unknown>;
      if (userData?.id) {
        const refreshedUser = mapUserData(userData, data);
        setUser(refreshedUser);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(refreshedUser));
      }
    } catch {
      if (isAuthenticating.current) return;
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  };

  const checkAuth = async () => {
    try {
      const sessionRes = await client.get('/auth/session');
      const session = sessionRes.data as { authenticated?: boolean };
      if (!session.authenticated) {
        setUser(null);
        setLoading(false);
        return;
      }

      const response = await client.get('/me');
      const data = response.data as Record<string, unknown>;
      const userData = (data.user || data.data || data) as Record<string, unknown>;

      if (userData && userData.id) {
        const refreshedUser = mapUserData(userData, data);
        setUser(refreshedUser);
        localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(refreshedUser));
      } else {
        if (isAuthenticating.current) return;
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.user);
      }
    } catch (error: unknown) {
      const err = error as { response?: { status?: number }; message?: string };
      if (err?.response?.status !== 401) {
        console.error('Session validation failed:', err.message || error);
      }
      const domainError = extractDomainError(error);
      if (domainError instanceof AuthError && domainError.shouldRedirect) {
        window.location.href = domainError.shouldRedirect;
      }
      if (isAuthenticating.current) return;
      setUser(null);
      localStorage.removeItem(STORAGE_KEYS.user);
    } finally {
      if (isAuthenticating.current) return;
      setLoading(false);
    }
  };

  const login = async (identifier: string, password: string, isPhone = false): Promise<User> => {
    isAuthenticating.current = true;
    try {
      localStorage.removeItem(STORAGE_KEYS.providerOnboardingDraft);
      localStorage.removeItem(STORAGE_KEYS.onboardingData);

      const payload = isPhone ? { phone: identifier, password } : { email: identifier, password };
      const response = await client.post('/login', payload);
      const data = response.data as Record<string, unknown>;

      if (data.requires2fa || data.requires_2fa) {
        const userId = (data.userId || data.two_fa_token) as string;
        throw new TwoFactorRequiredError(userId);
      }

      if (!data || !data.user) {
        throw new Error('Invalid response from server');
      }

      const loggedInUser = mapUserData(data.user as Record<string, unknown>, data);
      setUser(loggedInUser);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(loggedInUser));
      storeAuthResponse(data);

      return loggedInUser;
    } catch (error: unknown) {
      if (error instanceof TwoFactorRequiredError) {
        throw error;
      }
      console.error('Login error:', error);
      throw extractDomainError(error);
    } finally {
      isAuthenticating.current = false;
    }
  };

  const complete2faLogin = async (userId: string, code: string): Promise<User> => {
    isAuthenticating.current = true;
    try {
      const response = await client.post('/auth/2fa-verify', { userId, code });
      const data = response.data as Record<string, unknown>;

      if (!data?.user) {
        throw new Error('Invalid response from server');
      }

      const loggedInUser = mapUserData(data.user as Record<string, unknown>, data);
      setUser(loggedInUser);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(loggedInUser));
      storeAuthResponse(data);

      return loggedInUser;
    } catch (error: unknown) {
      console.error('2FA login error:', error);
      throw extractDomainError(error);
    } finally {
      isAuthenticating.current = false;
    }
  };

  const register = async (data: RegisterData): Promise<RegisterResult> => {
    isAuthenticating.current = true;
    try {
      localStorage.removeItem(STORAGE_KEYS.providerOnboardingDraft);
      localStorage.removeItem(STORAGE_KEYS.onboardingData);

      const response = await client.post('/register', {
        name: `${data.firstName} ${data.lastName}`.trim(),
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: data.role,
      });
      const responseData = response.data as Record<string, unknown>;
      const registeredUser = mapUserData(responseData.user as Record<string, unknown>, responseData);
      const requiresEmailVerification = Boolean(responseData.requiresEmailVerification);

      if (requiresEmailVerification) {
        return { user: registeredUser, requiresEmailVerification: true };
      }

      setUser(registeredUser);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(registeredUser));
      storeAuthResponse(responseData);

      return { user: registeredUser };
    } catch (error: unknown) {
      console.error('Registration error:', error);
      throw extractDomainError(error);
    } finally {
      isAuthenticating.current = false;
    }
  };

  const logout = async () => {
    try {
      await client.post('/auth/logout');
    } catch (error) {
      console.error('Logout request failed:', error);
    }

    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('auth');
      channel.postMessage('logout');
      channel.close();
    }

    localStorage.removeItem(STORAGE_KEYS.onboardingData);
    localStorage.removeItem(STORAGE_KEYS.providerOnboardingDraft);
    localStorage.removeItem(STORAGE_KEYS.country);
    localStorage.removeItem(STORAGE_KEYS.user);
    clearLegacyTokenStorage();
    setUser(null);
    navigate('/');
  };

  const refreshUser = async () => {
    try {
      const response = await client.get('/me');
      const data = response.data as Record<string, unknown>;
      const userData = (data.user || data.data || data) as Record<string, unknown>;

      if (!userData || !userData.id) {
        setUser(null);
        return;
      }

      setUser(mapUserData(userData, data));
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, complete2faLogin, register, logout, refreshUser, setUser, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
