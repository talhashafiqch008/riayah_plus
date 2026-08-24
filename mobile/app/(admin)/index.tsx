import { useEffect } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  fetchAdminDashboard,
  fetchAdminDashboardFull,
  fetchAdminUserAnalytics,
  fetchAdminUsers,
  unwrapList,
} from '../../lib/api/admin';
import { apiErrorMessage, formatDate, greetingForNow } from '../../lib/format';
import { useAdminDrawer } from '../../stores/adminDrawerStore';
import { useAuthStore } from '../../stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Website tokens from mern/client/src/index.css */
const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';
const TEAL_LIGHT = '#14B8A6';
const TEAL_50 = '#F0FDFA';
const STONE_200 = '#E7E5E4';
const STONE_400 = '#A8A29E';
const STONE_900 = '#1C1917';
const AMBER = '#F59E0B';
const EMERALD = '#059669';
const WHITE = '#FFFFFF';

const TILE_WIDTH = (SCREEN_WIDTH - 48) / 2;
const PRESS_SPRING = { mass: 0.5, stiffness: 400, damping: 20 };
const RELEASE_SPRING = { mass: 0.5, stiffness: 250, damping: 18 };
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

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
  revenue?: { month: string; revenue: number; transactions: number }[];
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

const cardShadow = {
  shadowColor: STONE_900,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
  borderWidth: 1,
  borderColor: STONE_200,
} as const;

function money(n: number | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function monthLabel(isoMonth: string) {
  const [year, month] = isoMonth.split('-').map(Number);
  if (!year || !month) return isoMonth;
  return new Date(year, month - 1, 1).toLocaleDateString('en-AU', { month: 'short' });
}

function SkeletonBar({ width, height }: { width: number; height: number }) {
  const shimmer = useSharedValue(0.35);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 750, easing: Easing.ease }),
        withTiming(0.35, { duration: 750, easing: Easing.ease }),
      ),
      -1,
      false,
    );
  }, [shimmer]);
  const style = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: 8,
          backgroundColor: STONE_200,
        },
        style,
      ]}
    />
  );
}

function usePressScale() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!reduceMotion) scale.value = withSpring(0.97, PRESS_SPRING);
  };
  const onPressOut = () => {
    if (!reduceMotion) scale.value = withSpring(1, RELEASE_SPRING);
  };
  return { style, onPressIn, onPressOut };
}

function StatusPulse() {
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) return;
    glow.value = withRepeat(
      withSequence(
        withTiming(0.35, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [glow, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <Animated.View
      style={[
        {
          height: 10,
          width: 10,
          borderRadius: 5,
          backgroundColor: '#10B981',
          shadowColor: '#10B981',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 6,
        },
        style,
      ]}
    />
  );
}

function StatPill({
  value,
  label,
  accent,
  loading,
}: {
  value: string;
  label: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <View
      className="flex-1 items-center rounded-2xl bg-white px-2 py-4"
      style={cardShadow}
    >
      {loading ? (
        <SkeletonBar width={36} height={28} />
      ) : (
        <Text
          className="text-[26px] font-extrabold leading-8"
          style={{ color: accent, letterSpacing: -1, fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      )}
      <Text className="mt-1 text-center text-[11px] leading-[16px] text-stone-400">{label}</Text>
    </View>
  );
}

function MetricTile({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value: string;
  hint: string;
  onPress: () => void;
}) {
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, { width: TILE_WIDTH }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={onPress}
        className="rounded-2xl bg-white p-4"
        style={cardShadow}
      >
        <Text className="text-xs text-stone-500">{label}</Text>
        <Text
          className="mt-1 text-2xl font-extrabold text-stone-900"
          style={{ letterSpacing: -0.6, fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
        <Text className="mt-2 text-xs text-stone-400">{hint}</Text>
      </Pressable>
    </Animated.View>
  );
}

function RevenueBar({
  ratio,
  label,
  index,
}: {
  ratio: number;
  label: string;
  index: number;
}) {
  const reduceMotion = useReducedMotion();
  const entered = useSharedValue(0);
  const scaleY = useSharedValue(reduceMotion ? Math.max(ratio, 0.04) : 0.04);

  useEffect(() => {
    const next = Math.max(ratio, 0.04);
    if (reduceMotion) {
      scaleY.value = next;
      return;
    }
    if (entered.value === 1) {
      scaleY.value = withTiming(next, { duration: 220, easing: EASE_OUT });
      return;
    }
    entered.value = 1;
    scaleY.value = withDelay(
      index * 40,
      withTiming(next, { duration: 420, easing: EASE_OUT }),
    );
  }, [entered, index, ratio, reduceMotion, scaleY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scaleY.value }],
  }));

  return (
    <View className="flex-1 items-center">
      <View style={{ height: 88, width: '100%', justifyContent: 'flex-end' }}>
        <Animated.View
          style={[
            {
              height: 88,
              width: '100%',
              borderRadius: 8,
              backgroundColor: TEAL,
              transformOrigin: 'bottom',
            },
            style,
          ]}
        />
      </View>
      <Text className="mt-2 text-[10px] font-semibold uppercase text-stone-400">{label}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const name = useAuthStore((s) => s.user?.name?.split(' ')[0] ?? 'Admin');
  const openDrawer = useAdminDrawer((s) => s.openDrawer);
  const greeting = greetingForNow();

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
    queryFn: async () => unwrapList<RecentUser>(await fetchAdminUsers({ page: 1, limit: 5 })),
  });

  const s = simple.data;
  const stats = full.data?.stats;
  const revenue = full.data?.revenue ?? [];
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
  const openDisputes = stats?.compliance?.openDisputes;
  const activeProviders = a.activeProviders;
  const maxRevenue = Math.max(...revenue.map((r) => Number(r.revenue) || 0), 1);

  const loading = simple.isLoading && full.isLoading;
  const refreshing =
    simple.isFetching || full.isFetching || analytics.isFetching || recent.isFetching;
  const loadError = simple.isError && !full.data;

  const refetchAll = () => {
    void simple.refetch();
    void full.refetch();
    void analytics.refetch();
    void recent.refetch();
  };

  const attention = [
    pendingDocs
      ? { label: 'Pending documents', value: pendingDocs, href: '/(admin)/documents' as const }
      : null,
    pendingPayouts
      ? { label: 'Payouts to review', value: pendingPayouts, href: '/(admin)/payouts' as const }
      : null,
    overdueInvoices
      ? { label: 'Overdue invoices', value: overdueInvoices, href: '/(admin)/payments' as const }
      : null,
    openDisputes
      ? { label: 'Open disputes', value: openDisputes, href: '/(admin)/disputes' as const }
      : null,
  ].filter((x): x is NonNullable<typeof x> => x != null && Number(x.value) > 0);

  const revenuePress = usePressScale();

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={refetchAll}
            tintColor={TEAL}
          />
        }
      >
        <LinearGradient
          colors={[TEAL_DARK, TEAL, TEAL_LIGHT]}
          locations={[0, 0.62, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, overflow: 'hidden' }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -48,
              top: -36,
              height: 180,
              width: 180,
              borderRadius: 90,
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
          />
          <View className="flex-row items-start justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open menu"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openDrawer();
              }}
              hitSlop={10}
              className="h-[38px] w-[38px] items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <Ionicons name="menu" size={20} color={WHITE} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={() => router.push('/(admin)/notifications')}
              hitSlop={10}
              className="h-[38px] w-[38px] items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
            >
              <Ionicons name="notifications-outline" size={20} color={WHITE} />
            </Pressable>
          </View>
          <Text className="mt-5 text-[13px] font-medium text-white/70">
            {greeting}, {name}
          </Text>
          <Text
            className="mt-0.5 text-[28px] font-extrabold leading-9 text-white"
            style={{ letterSpacing: -0.8 }}
          >
            Dashboard
          </Text>
          <Text className="mt-2 max-w-[280px] text-[13px] leading-5 text-white/75">
            Global system performance monitoring.
          </Text>
        </LinearGradient>

        <View className="-mt-7 flex-row gap-2.5 px-4">
          <StatPill
            value={totalUsers != null ? String(totalUsers) : '—'}
            label={'Total\nusers'}
            accent={TEAL}
            loading={loading}
          />
          <StatPill
            value={activeBookings != null ? String(activeBookings) : '—'}
            label={'Active\nbookings'}
            accent={STONE_900}
            loading={loading}
          />
          <StatPill
            value={pendingDocs != null ? String(pendingDocs) : '—'}
            label={'Pending\ndocs'}
            accent={AMBER}
            loading={loading}
          />
        </View>

        {loadError ? (
          <Pressable onPress={refetchAll} className="mt-5 items-center px-4">
            <Text className="text-center text-sm text-stone-500">
              {apiErrorMessage(simple.error, 'Could not load dashboard')}
            </Text>
            <Text className="mt-1 text-xs font-semibold text-teal-600">Tap to retry</Text>
          </Pressable>
        ) : (
          <View className="mt-5 gap-3 px-4">
            <Animated.View style={revenuePress.style}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open payments"
                onPressIn={revenuePress.onPressIn}
                onPressOut={revenuePress.onPressOut}
                onPress={() => router.push('/(admin)/payments')}
                className="overflow-hidden rounded-2xl bg-white p-4"
                style={{ ...cardShadow, borderColor: '#A7F3D0' }}
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-[10px] font-bold uppercase tracking-[2px] text-stone-400">
                      Total revenue
                    </Text>
                    <Text
                      className="mt-1 text-3xl font-extrabold text-stone-900"
                      style={{ letterSpacing: -1, fontVariant: ['tabular-nums'] }}
                    >
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
                    <Ionicons name="card-outline" size={22} color={EMERALD} />
                  </View>
                </View>
              </Pressable>
            </Animated.View>

            <View className="overflow-hidden rounded-2xl bg-stone-900 p-4">
              <Text className="text-[10px] font-bold uppercase tracking-[2px] text-stone-400">
                System status
              </Text>
              <View className="mt-2 flex-row items-center gap-2.5">
                <StatusPulse />
                <Text className="text-xl font-extrabold text-white">Operational</Text>
              </View>
              <View className="mt-4 flex-row gap-8 border-t border-white/10 pt-4">
                <View>
                  <Text className="text-[10px] font-bold uppercase text-stone-400">
                    Pending docs
                  </Text>
                  <Text className="mt-0.5 text-base font-bold text-emerald-400">
                    {pendingDocs ?? '—'}
                  </Text>
                </View>
                <View>
                  <Text className="text-[10px] font-bold uppercase text-stone-400">
                    Overdue invoices
                  </Text>
                  <Text className="mt-0.5 text-base font-bold text-emerald-400">
                    {overdueInvoices ?? '—'}
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row flex-wrap gap-3">
              <MetricTile
                label="Active providers"
                value={activeProviders != null ? String(activeProviders) : '—'}
                hint="Active in the last 30 days"
                onPress={() => router.push('/(admin)/providers')}
              />
              <MetricTile
                label="Pending payouts"
                value={pendingPayouts != null ? String(pendingPayouts) : '—'}
                hint="Needs review"
                onPress={() => router.push('/(admin)/payouts')}
              />
              <MetricTile
                label="Active journeys"
                value={activeEpisodes != null ? String(activeEpisodes) : '—'}
                hint={
                  completedBookings != null
                    ? `${completedBookings} bookings completed (30d)`
                    : 'Open care journeys'
                }
                onPress={() => router.push('/(admin)/sessions')}
              />
              <MetricTile
                label="New users"
                value={newUsers != null ? String(newUsers) : '—'}
                hint="Joined in the last 30 days"
                onPress={() => router.push('/(admin)/users')}
              />
            </View>

            {attention.length > 0 ? (
              <View
                className="rounded-2xl bg-white p-4"
                style={{ ...cardShadow, borderColor: '#FDE68A' }}
              >
                <Text className="text-[10px] font-bold uppercase tracking-[2px] text-amber-600">
                  Needs your action
                </Text>
                <View className="mt-3 gap-2">
                  {attention.map((item) => (
                    <Pressable
                      key={item.href}
                      onPress={() => router.push(item.href)}
                      className="flex-row items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5"
                    >
                      <Text className="text-sm font-medium text-stone-800">{item.label}</Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-sm font-bold text-amber-700">{item.value}</Text>
                        <Ionicons name="chevron-forward" size={14} color={AMBER} />
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {revenue.length > 0 ? (
              <View className="rounded-2xl bg-white p-4" style={cardShadow}>
                <View className="mb-4 flex-row items-center justify-between">
                  <Text className="text-base font-semibold text-stone-900">Revenue</Text>
                  <Text className="text-xs text-stone-400">Last {revenue.length} months</Text>
                </View>
                <View className="flex-row items-end gap-2">
                  {revenue.map((row, i) => (
                    <RevenueBar
                      key={row.month}
                      index={i}
                      ratio={Number(row.revenue) / maxRevenue}
                      label={monthLabel(row.month)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <View className="rounded-2xl bg-white p-4" style={cardShadow}>
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-base font-semibold text-stone-900">
                  Recent registrations
                </Text>
                <Pressable onPress={() => router.push('/(admin)/users')}>
                  <Text className="text-xs font-bold text-teal-600">View all</Text>
                </Pressable>
              </View>
              {recent.isLoading ? (
                <View className="gap-3 py-2">
                  <SkeletonBar width={SCREEN_WIDTH - 64} height={48} />
                  <SkeletonBar width={SCREEN_WIDTH - 64} height={48} />
                </View>
              ) : (recent.data ?? []).length === 0 ? (
                <Text className="py-4 text-center text-sm text-stone-400">
                  No recent registrations
                </Text>
              ) : (
                (recent.data ?? []).map((u) => (
                  <RecentUserRow key={u.id} user={u} />
                ))
              )}
            </View>
          </View>
        )}

        <View className="mt-7 px-4">
          <Text className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
            Quick access
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {QUICK_LINKS.map((link) => (
              <QuickLink key={link.href} link={link} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RecentUserRow({ user }: { user: RecentUser }) {
  const press = usePressScale();
  const verified =
    user.isEmailVerified || user.verificationStatus === 'verified';
  return (
    <Animated.View style={press.style}>
      <Pressable
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => router.push(`/(admin)/users/${user.id}`)}
        className="mb-1 flex-row items-center gap-3 rounded-xl py-2"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: TEAL }}
        >
          <Text className="font-bold text-white">
            {(user.name || user.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-stone-900" numberOfLines={1}>
            {user.name || user.email || 'User'}
          </Text>
          <Text className="text-xs text-stone-500">
            {user.createdAt ? formatDate(user.createdAt) : '—'}
            {user.role ? ` · ${user.role.replace(/_/g, ' ')}` : ''}
          </Text>
        </View>
        <View className={`rounded-md px-2 py-1 ${verified ? 'bg-emerald-50' : 'bg-orange-50'}`}>
          <Text
            className={`text-[10px] font-bold ${verified ? 'text-emerald-600' : 'text-orange-600'}`}
          >
            {verified ? 'Verified' : 'Pending'}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function QuickLink({
  link,
}: {
  link: (typeof QUICK_LINKS)[number];
}) {
  const press = usePressScale();
  return (
    <Animated.View style={[press.style, { width: TILE_WIDTH }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={link.name}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        onPress={() => router.push(link.href as never)}
        className="flex-row items-center gap-2.5 rounded-2xl bg-white p-4"
        style={cardShadow}
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: TEAL_50 }}
        >
          <Ionicons name={link.icon} size={18} color={TEAL} />
        </View>
        <Text className="flex-1 text-sm font-semibold text-stone-800">{link.name}</Text>
      </Pressable>
    </Animated.View>
  );
}
