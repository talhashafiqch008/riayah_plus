import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui';
import { AdminScreenHeader } from '../../components/admin/AdminScreenHeader';
import {
  fetchAdminDashboard,
  fetchAdminDashboardFull,
  fetchAdminUserAnalytics,
  fetchAdminUsers,
  unwrapList,
} from '../../lib/api/admin';
import { apiErrorMessage, formatDate } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';

const QUICK_LINKS = [
  { name: 'Users', href: '/(admin)/users', icon: 'people-outline' as const },
  { name: 'Families', href: '/(admin)/families', icon: 'home-outline' as const },
  { name: 'Organizations', href: '/(admin)/organizations', icon: 'business-outline' as const },
  { name: 'Providers', href: '/(admin)/providers', icon: 'medkit-outline' as const },
  { name: 'Payments', href: '/(admin)/payments', icon: 'card-outline' as const },
  { name: 'Payouts', href: '/(admin)/payouts', icon: 'cash-outline' as const },
  { name: 'Documents', href: '/(admin)/documents', icon: 'document-text-outline' as const },
  { name: 'Analytics', href: '/(admin)/analytics', icon: 'bar-chart-outline' as const },
];

type DashSimple = {
  users?: number;
  bookings?: number;
  activeEpisodes?: number;
  pendingDocs?: number;
  pendingPayouts?: number;
  overdueInvoices?: number;
};

type DashFull = {
  stats?: {
    users?: { total?: number; newThisMonth?: number };
    bookings?: { active?: number; completedThisMonth?: number };
    episodes?: { active?: number };
    compliance?: { pendingDocuments?: number; openDisputes?: number };
    financial?: {
      pendingPayouts?: number;
      overdueInvoices?: number;
      totalRevenue?: number;
      revenueThisMonth?: number;
    };
  };
};

type RecentUser = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  isEmailVerified?: boolean;
  verificationStatus?: string;
};

function money(n: number | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function AdminDashboardScreen() {
  const name = useAuthStore((s) => s.user?.name?.split(' ')[0] ?? 'Admin');

  const simple = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await fetchAdminDashboard()) as DashSimple,
  });
  const full = useQuery({
    queryKey: ['admin-dashboard-full'],
    queryFn: async () => (await fetchAdminDashboardFull()) as DashFull | null,
  });
  const analytics = useQuery({
    queryKey: ['admin-user-analytics'],
    queryFn: fetchAdminUserAnalytics,
  });
  const recent = useQuery({
    queryKey: ['admin-users-recent'],
    queryFn: async () =>
      unwrapList<RecentUser>(await fetchAdminUsers({ page: 1, limit: 5 })),
  });

  const s = simple.data;
  const stats = full.data?.stats;
  const a = (analytics.data ?? {}) as {
    totalUsers?: number;
    newThisMonth?: number;
    activeProviders?: number;
  };

  const totalRevenue = stats?.financial?.totalRevenue;
  const revenueThisMonth = stats?.financial?.revenueThisMonth;
  const totalUsers = stats?.users?.total ?? a.totalUsers ?? s?.users;
  const newUsers = stats?.users?.newThisMonth ?? a.newThisMonth;
  const activeBookings = stats?.bookings?.active ?? s?.bookings;
  const completedBookings = stats?.bookings?.completedThisMonth;
  const activeEpisodes = stats?.episodes?.active ?? s?.activeEpisodes;
  const pendingDocs = stats?.compliance?.pendingDocuments ?? s?.pendingDocs;
  const pendingPayouts = stats?.financial?.pendingPayouts ?? s?.pendingPayouts;
  const overdueInvoices = stats?.financial?.overdueInvoices ?? s?.overdueInvoices;
  const activeProviders = a.activeProviders;

  const loading = simple.isLoading && full.isLoading;
  const refreshing =
    simple.isFetching || full.isFetching || analytics.isFetching || recent.isFetching;

  const refetchAll = () => {
    void simple.refetch();
    void full.refetch();
    void analytics.refetch();
    void recent.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title="Dashboard" subtitle={`Welcome, ${name}`} />
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refetchAll} tintColor="#0D9488" />
        }
      >
        <Text className="text-2xl font-semibold text-stone-900">Dashboard Overview</Text>
        <Text className="mt-1 text-sm text-stone-500">
          Global system performance monitoring.
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0D9488" className="mt-12" />
        ) : simple.isError && !full.data ? (
          <Card className="mt-6">
            <Text className="text-sm text-red-600">
              {apiErrorMessage(simple.error, 'Failed to load dashboard')}
            </Text>
            <Pressable onPress={refetchAll} className="mt-3">
              <Text className="font-semibold text-teal-700">Try again</Text>
            </Pressable>
          </Card>
        ) : (
          <View className="mt-5 gap-3">
            {/* Revenue hero — mirrors web */}
            <Card className="border border-emerald-100">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Total Revenue
                  </Text>
                  <Text className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
                    {totalRevenue != null ? money(Number(totalRevenue)) : '—'}
                  </Text>
                  <Text className="mt-2 text-sm text-stone-500">
                    {revenueThisMonth != null
                      ? `${money(Number(revenueThisMonth))} this month · `
                      : ''}
                    {pendingPayouts ?? 0} payouts pending
                  </Text>
                </View>
                <View className="rounded-2xl bg-emerald-50 p-3">
                  <Ionicons name="card-outline" size={22} color="#059669" />
                </View>
              </View>
            </Card>

            {/* System status */}
            <Card className="bg-stone-900">
              <Text className="text-xs font-semibold uppercase tracking-widest text-stone-400">
                System Status
              </Text>
              <View className="mt-2 flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <Text className="text-xl font-bold text-white">Operational</Text>
              </View>
              <View className="mt-4 flex-row gap-6 border-t border-white/10 pt-4">
                <View>
                  <Text className="text-[10px] font-bold uppercase text-stone-400">
                    Pending docs
                  </Text>
                  <Text className="text-base font-bold text-emerald-400">
                    {pendingDocs ?? '—'}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-bold uppercase text-stone-400">
                    Overdue invoices
                  </Text>
                  <Text className="text-base font-bold text-emerald-400">
                    {overdueInvoices ?? '—'}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Secondary stats */}
            <View className="flex-row flex-wrap gap-3">
              <Pressable
                className="w-[47%]"
                onPress={() => router.push('/(admin)/users')}
              >
                <Card>
                  <Text className="text-xs text-stone-500">Total Users</Text>
                  <Text className="mt-1 text-2xl font-semibold text-stone-900">
                    {totalUsers ?? '—'}
                  </Text>
                  <Text className="mt-2 text-xs text-stone-400">
                    {newUsers != null ? `${newUsers} new (30d)` : 'All accounts'}
                  </Text>
                </Card>
              </Pressable>
              <Pressable
                className="w-[47%]"
                onPress={() => router.push('/(admin)/bookings')}
              >
                <Card>
                  <Text className="text-xs text-stone-500">Active Bookings</Text>
                  <Text className="mt-1 text-2xl font-semibold text-stone-900">
                    {activeBookings ?? '—'}
                  </Text>
                  <Text className="mt-2 text-xs text-stone-400">
                    {completedBookings != null
                      ? `${completedBookings} completed (30d)`
                      : `${activeEpisodes ?? 0} active episodes`}
                  </Text>
                </Card>
              </Pressable>
              <Pressable
                className="w-[47%]"
                onPress={() => router.push('/(admin)/providers')}
              >
                <Card>
                  <Text className="text-xs text-stone-500">Active Providers</Text>
                  <Text className="mt-1 text-2xl font-semibold text-stone-900">
                    {activeProviders ?? '—'}
                  </Text>
                  <Text className="mt-2 text-xs text-stone-400">Recently active</Text>
                </Card>
              </Pressable>
              <Pressable
                className="w-[47%]"
                onPress={() => router.push('/(admin)/payouts')}
              >
                <Card>
                  <Text className="text-xs text-stone-500">Pending Payouts</Text>
                  <Text className="mt-1 text-2xl font-semibold text-stone-900">
                    {pendingPayouts ?? '—'}
                  </Text>
                  <Text className="mt-2 text-xs text-stone-400">Needs review</Text>
                </Card>
              </Pressable>
            </View>

            {/* Recent registrations */}
            <Card shadow={false}>
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-stone-900">
                  Recent Registrations
                </Text>
                <Pressable onPress={() => router.push('/(admin)/users')}>
                  <Text className="text-xs font-bold text-teal-600">View All</Text>
                </Pressable>
              </View>
              {recent.isLoading ? (
                <ActivityIndicator color="#0D9488" />
              ) : (recent.data ?? []).length === 0 ? (
                <Text className="py-4 text-center text-sm text-stone-400">
                  No recent registrations
                </Text>
              ) : (
                (recent.data ?? []).map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => router.push(`/(admin)/users/${u.id}`)}
                    className="mb-2 flex-row items-center gap-3 rounded-xl p-2"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-teal-600">
                      <Text className="font-bold text-white">
                        {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-stone-900" numberOfLines={1}>
                        {u.name || u.email || 'User'}
                      </Text>
                      <Text className="text-xs text-stone-500">
                        {u.createdAt ? formatDate(u.createdAt) : '—'}
                        {u.role ? ` · ${u.role.replace(/_/g, ' ')}` : ''}
                      </Text>
                    </View>
                    <View
                      className={`rounded-md px-2 py-1 ${
                        u.isEmailVerified || u.verificationStatus === 'verified'
                          ? 'bg-emerald-50'
                          : 'bg-orange-50'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          u.isEmailVerified || u.verificationStatus === 'verified'
                            ? 'text-emerald-600'
                            : 'text-orange-600'
                        }`}
                      >
                        {u.isEmailVerified || u.verificationStatus === 'verified'
                          ? 'Verified'
                          : 'Pending'}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </Card>
          </View>
        )}

        <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wider text-stone-400">
          Quick links
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {QUICK_LINKS.map((link) => (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href as never)}
              className="w-[47%] flex-row items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4"
            >
              <Ionicons name={link.icon} size={20} color="#0D9488" />
              <Text className="flex-1 text-sm font-medium text-stone-800">{link.name}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
