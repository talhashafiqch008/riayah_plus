import { useQuery } from '@tanstack/react-query';
import { getCareseekerDashboard } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { STORAGE_KEYS } from '@/lib/storage-keys';

interface CareCategory {
  id: string;
  name: string;
  icon: string;
}

interface UpcomingSession {
  id: string;
  providerId: string;
  providerName: string;
  providerRole: string;
  providerAvatar?: string;
  scheduledAt: string;
  duration: number;
  type: 'in-person' | 'telehealth';
  status: 'scheduled' | 'confirmed' | 'in-progress';
  address?: string;
}

interface RecommendedProvider {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  currency: 'QAR' | 'EGP';
  verified: boolean;
  languages: string[];
  specialties: string[];
}

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  careCategories: string[];
  avatar?: string;
}

interface DashboardSummary {
  country: 'QA' | 'EG';
  careCategories: CareCategory[];
  supportModel: 'one-off' | 'ongoing' | 'both';
  activeProviders: number;
  upcomingSessionsCount: number;
  unreadMessages: number;
  monthlySpend: number;
  currency: 'QAR' | 'EGP';
}

interface CompletedSession {
  id: string;
  providerId: string;
  providerName: string;
  providerRole: string;
  providerAvatar?: string;
  completedAt: string;
  duration: number;
  type: 'in-person' | 'telehealth';
  rating?: number;
  notesAvailable: boolean;
}

export interface DashboardData {
  summary: DashboardSummary;
  upcomingSessions: UpcomingSession[];
  completedSessions: CompletedSession[];
  recommendedProviders: RecommendedProvider[];
  familyMembers: FamilyMember[];
  recentActivity: Record<string, unknown>[];
  alerts: Record<string, unknown>[];
}

const CATEGORY_PROVIDER_MAP: Record<string, string[]> = {
  aged_care: ['Support Worker', 'Nurse', 'Household Support'],
  disability_support: ['Support Worker', 'Allied Health'],
  child_family: ['Support Worker', 'Allied Health', 'Childcare Provider'],
  allied_health: ['Allied Health', 'Trainer / Educator'],
  home_support: ['Household Support', 'Gardener'],
};

async function fetchDashboard(userCountry: 'QA' | 'EG'): Promise<DashboardData> {
  let onboardingData: Record<string, unknown> | null = null;
  try {
    const draft = localStorage.getItem(STORAGE_KEYS.careseekerOnboardingDraft);
    if (draft) {
      const parsed = JSON.parse(draft);
      onboardingData = parsed.data;
    }
  } catch (e) {
    console.error('Error loading onboarding draft:', e);
  }

  const careCategoriesMap: Record<string, { name: string; icon: string }> = {
    aged_care: { name: 'Aged Care', icon: '👴' },
    disability_support: { name: 'Disability Support', icon: '💪' },
    child_family: { name: 'Child & Family Support', icon: '👨‍👩‍👧' },
    allied_health: { name: 'Allied Health', icon: '🩺' },
    home_support: { name: 'Home Support', icon: '🏠' },
  };

  const selectedCategories = (onboardingData?.careCategories as string[]) || [];
  const careCategories = selectedCategories.map((catId: string) => ({
    id: catId,
    name: careCategoriesMap[catId]?.name || catId,
    icon: careCategoriesMap[catId]?.icon || '💙',
  }));

  const scheduleType = onboardingData?.scheduleType || 'flexible';
  const supportModel: 'one-off' | 'ongoing' | 'both' =
    scheduleType === 'one_time' ? 'one-off' :
      scheduleType === 'weekly' || scheduleType === 'daily' ? 'ongoing' : 'both';

  const backendData = await getCareseekerDashboard();

  if (!backendData || backendData.account_active === undefined) {
    throw new Error('Dashboard data unavailable or invalid response structure');
  }

  return {
    summary: {
      country: userCountry,
      careCategories: careCategories.length > 0 ? careCategories : [{ id: 'aged-care', name: 'Aged Care', icon: '👴' }],
      supportModel,
      activeProviders: backendData.active_providers?.length || 0,
      upcomingSessionsCount: backendData.upcoming_sessions?.length || 0,
      unreadMessages: backendData.unread_notifications_count || backendData.unread_documents_count || 0,
      monthlySpend: 0,
      currency: userCountry === 'QA' ? 'QAR' : 'EGP',
    },
    upcomingSessions: (backendData.upcoming_sessions || []).map((s: Record<string, unknown>) => {
      const provider = (backendData.active_providers || []).find((p: Record<string, unknown>) => p.name === s.provider_name);
      return {
        id: s.id,
        providerId: provider?.id || 'unknown',
        providerName: s.provider_name,
        providerRole: s.service_type === 'online' ? 'Teleconsultant' : (provider?.role || 'Provider'),
        scheduledAt: s.scheduled_at,
        duration: 60,
        type: s.service_type === 'online' ? 'telehealth' : 'in-person',
        status: s.status,
        address: '',
      };
    }),
    completedSessions: [],
    recommendedProviders: (backendData.active_providers || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      name: p.name,
      role: (p.role as string)?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Provider',
      avatar: p.profile_photo,
      rating: 5.0,
      reviewCount: 0,
      hourlyRate: 0,
      currency: userCountry === 'QA' ? 'QAR' : 'EGP',
      verified: true,
      languages: [],
      specialties: p.specialties || [],
    })),
    familyMembers: [],
    recentActivity: backendData.recent_activity || [],
    alerts: backendData.alerts || [],
  };
}

export function useCareseekerDashboard() {
  const { user } = useAuth();
  const userCountry: 'QA' | 'EG' =
    user?.country === 'EGY' || user?.country === 'EG' ? 'EG' : 'QA';

  return useQuery<DashboardData, Error>({
    queryKey: ['careseeker', 'dashboard', userCountry],
    queryFn: () => fetchDashboard(userCountry),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: Boolean(user),
  });
}

export function getMatchingProviderTypes(data: DashboardData | undefined): string[] {
  if (!data?.summary.careCategories) return [];

  const providerTypes = new Set<string>();
  data.summary.careCategories.forEach((cat) => {
    const types = CATEGORY_PROVIDER_MAP[cat.id] || [];
    types.forEach((type) => providerTypes.add(type));
  });

  return Array.from(providerTypes);
}
