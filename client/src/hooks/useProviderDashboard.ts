import { useQuery } from '@tanstack/react-query';
import { getProviderDashboardStats, getProviderEarnings } from '@/lib/api';

interface EarningsData {
  earnings: {
    total: {
      currency: string;
      amount: number;
    };
    pending: {
      amount: number;
    };
  };
}

export interface ProviderDashboardData {
  stats: Record<string, unknown> | null;
  earningsData: EarningsData | null;
}

async function fetchDashboard(): Promise<ProviderDashboardData> {
  const [statsResponse, earningsResponse] = await Promise.all([
    getProviderDashboardStats(),
    getProviderEarnings(),
  ]);

  return {
    stats: statsResponse ?? null,
    earningsData: earningsResponse ?? null,
  };
}

export function useProviderDashboard() {
  return useQuery<ProviderDashboardData, Error>({
    queryKey: ['provider', 'dashboard'],
    queryFn: fetchDashboard,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
