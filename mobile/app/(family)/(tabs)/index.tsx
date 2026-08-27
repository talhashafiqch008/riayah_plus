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
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Avatar } from '../../../components/ui';
import { apiClient } from '../../../lib/api/client';
import { listEpisodes } from '../../../lib/api/care';
import { listSessions, type CareSession } from '../../../lib/api/scheduling';
import { formatDateTime, greetingForNow } from '../../../lib/format';
import { useAuthStore } from '../../../stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Website tokens from mern/client/src/index.css — no invented palette. */
const TEAL = '#0D9488';
const TEAL_DARK = '#0F766E';
const TEAL_LIGHT = '#14B8A6';
const TEAL_50 = '#F0FDFA';
const STONE_50 = '#FAFAF9';
const STONE_200 = '#E7E5E4';
const STONE_400 = '#A8A29E';
const STONE_500 = '#78716C';
const STONE_900 = '#1C1917';
const AMBER = '#F59E0B';
const WHITE = '#FFFFFF';

const TILE_WIDTH = (SCREEN_WIDTH - 48) / 2;

const PRESS_SPRING = { mass: 0.5, stiffness: 400, damping: 20 };
const RELEASE_SPRING = { mass: 0.5, stiffness: 250, damping: 18 };

interface DashboardStats {
  activeEpisodes: number;
  upcomingAppointments: number;
  unreadAlerts: number;
  nextAppointment: CareSession | null;
}

async function fetchStats(): Promise<DashboardStats> {
  const [activeEpisodes, appointmentBundle, unreadAlerts] = await Promise.all([
    (async () => {
      try {
        const res = await listEpisodes({ status: 'active', limit: 1 });
        return res.total ?? 0;
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        const sessions = await listSessions();
        const now = Date.now();
        const upcoming = sessions
          .filter(
            (s) =>
              ['pending', 'accepted', 'in_progress'].includes(s.status) &&
              new Date(s.scheduledAt).getTime() >= now,
          )
          .sort(
            (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
          );
        return { count: upcoming.length, next: upcoming[0] ?? null };
      } catch {
        return { count: 0, next: null };
      }
    })(),
    (async () => {
      try {
        const { data } = await apiClient.get('/api/notifications/unread-count');
        const count = data?.count ?? data?.data?.count ?? 0;
        return typeof count === 'number' ? count : 0;
      } catch {
        return 0;
      }
    })(),
  ]);

  return {
    activeEpisodes,
    upcomingAppointments: appointmentBundle.count,
    unreadAlerts,
    nextAppointment: appointmentBundle.next,
  };
}

function SkeletonBar({ color }: { color: string }) {
  const shimmer = useSharedValue(0.3);

  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 750, easing: Easing.ease }),
        withTiming(0.3, { duration: 750, easing: Easing.ease }),
      ),
      -1,
      false,
    );
  }, [shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <Animated.View
      style={[
        { width: 28, height: 26, borderRadius: 6, backgroundColor: color },
        shimmerStyle,
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
  value: number;
  label: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <View
      className="flex-1 items-center rounded-2xl bg-white px-2 py-4"
      style={{
        shadowColor: STONE_900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: STONE_200,
      }}
    >
      {loading ? (
        <SkeletonBar color={accent} />
      ) : (
        <Text
          className="text-[28px] font-extrabold leading-9"
          style={{ color: accent, letterSpacing: -1, fontVariant: ['tabular-nums'] }}
        >
          {value}
        </Text>
      )}
      <Text className="mt-1 text-center text-[11px] leading-[16px] text-stone-400">{label}</Text>
    </View>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onPress,
  badge,
  featured,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
  badge?: number;
  featured?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[{ width: TILE_WIDTH }, animStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (!reduceMotion) scale.value = withSpring(0.97, PRESS_SPRING);
        }}
        onPressOut={() => {
          if (!reduceMotion) scale.value = withSpring(1, RELEASE_SPRING);
        }}
        className="rounded-2xl p-4"
        style={{
          backgroundColor: featured ? TEAL : WHITE,
          borderWidth: featured ? 0 : 1,
          borderColor: STONE_200,
          shadowColor: featured ? TEAL : STONE_900,
          shadowOffset: { width: 0, height: featured ? 8 : 2 },
          shadowOpacity: featured ? 0.28 : 0.05,
          shadowRadius: featured ? 16 : 8,
          elevation: featured ? 6 : 2,
          minHeight: 118,
        }}
      >
        <View className="mb-3 flex-row items-start justify-between">
          <View
            className="h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: featured ? 'rgba(255,255,255,0.18)' : TEAL_50 }}
          >
            <Ionicons name={icon} size={20} color={featured ? WHITE : TEAL} />
          </View>
          {badge && badge > 0 ? (
            <View
              className="h-5 min-w-5 items-center justify-center rounded-full px-1.5"
              style={{ backgroundColor: featured ? WHITE : TEAL }}
            >
              <Text
                className="text-[10px] font-bold"
                style={{ color: featured ? TEAL : WHITE, fontVariant: ['tabular-nums'] }}
              >
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          className="text-[13px] font-bold"
          style={{ color: featured ? WHITE : STONE_900, letterSpacing: -0.2 }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-[11px] leading-4"
          style={{ color: featured ? 'rgba(255,255,255,0.72)' : STONE_500 }}
        >
          {hint}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const greeting = greetingForNow();
  const hour = new Date().getHours();
  const arabicGreeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';

  const { data: stats, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['family-shell-stats'],
    queryFn: fetchStats,
  });

  const reduceMotion = useReducedMotion();
  const ctaScale = useSharedValue(1);
  const visitScale = useSharedValue(1);
  const ctaAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));
  const visitAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: visitScale.value }] }));

  const next = stats?.nextAppointment ?? null;

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={() => void refetch()}
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
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: 28,
              bottom: -28,
              height: 96,
              width: 96,
              borderRadius: 48,
              backgroundColor: 'rgba(255,255,255,0.08)',
            }}
          />

          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="mb-1 text-right text-[13px] text-white/40">{arabicGreeting}</Text>
              <Text className="text-[13px] font-medium text-white/70">{greeting},</Text>
              <Text
                className="mt-0.5 text-[28px] font-extrabold leading-9 text-white"
                style={{ letterSpacing: -0.8 }}
              >
                {firstName}
              </Text>
              <Text className="mt-2 max-w-[240px] text-[13px] leading-5 text-white/75">
                Your care, in one place.
              </Text>
            </View>

            <View className="flex-row items-center gap-3 pt-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push('/(family)/notifications')}
                hitSlop={10}
                className="h-[38px] w-[38px] items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
              >
                <Ionicons name="notifications-outline" size={20} color={WHITE} />
                {stats && stats.unreadAlerts > 0 ? (
                  <View
                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full"
                    style={{ backgroundColor: AMBER, borderWidth: 1.5, borderColor: TEAL_DARK }}
                  />
                ) : null}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile"
                onPress={() => router.push('/(family)/profile')}
                hitSlop={10}
              >
                <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size="sm" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View className="-mt-7 flex-row gap-2.5 px-4">
          <StatPill
            value={stats?.activeEpisodes ?? 0}
            label={'Active\njourneys'}
            accent={TEAL}
            loading={isLoading}
          />
          <StatPill
            value={stats?.upcomingAppointments ?? 0}
            label={'Upcoming\nsessions'}
            accent={STONE_900}
            loading={isLoading}
          />
          <StatPill
            value={stats?.unreadAlerts ?? 0}
            label={'Unread\nalerts'}
            accent={AMBER}
            loading={isLoading}
          />
        </View>

        {isError ? (
          <Pressable onPress={() => void refetch()} className="mt-3 items-center">
            <Text className="text-xs text-stone-400">
              Could not load — <Text className="font-semibold text-teal-600">tap to retry</Text>
            </Text>
          </Pressable>
        ) : null}

        {next ? (
          <View className="mt-5 px-4">
            <Animated.View style={visitAnimStyle}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open next appointment"
                onPress={() => router.push('/(family)/bookings')}
                onPressIn={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (!reduceMotion) visitScale.value = withSpring(0.98, PRESS_SPRING);
                }}
                onPressOut={() => {
                  if (!reduceMotion) visitScale.value = withSpring(1, RELEASE_SPRING);
                }}
                className="rounded-2xl bg-white p-4"
                style={{
                  borderWidth: 1,
                  borderColor: STONE_200,
                  shadowColor: STONE_900,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-teal-50">
                    <Ionicons name="calendar" size={20} color={TEAL} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold uppercase tracking-widest text-teal-600">
                      Next visit
                    </Text>
                    <Text className="mt-0.5 text-[15px] font-semibold text-stone-900">
                      {next.provider?.name ?? next.type.replace(/_/g, ' ')}
                    </Text>
                    <Text className="mt-0.5 text-xs text-stone-400">{formatDateTime(next.scheduledAt)}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={TEAL} />
                </View>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}

        <View className="mt-5 px-4">
          <Animated.View style={ctaAnimStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Request care"
              onPress={() => router.push('/(onboarding)/step-1-care-unit')}
              onPressIn={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (!reduceMotion) ctaScale.value = withSpring(0.98, PRESS_SPRING);
              }}
              onPressOut={() => {
                if (!reduceMotion) ctaScale.value = withSpring(1, RELEASE_SPRING);
              }}
              className="overflow-hidden rounded-2xl bg-white"
              style={{
                borderWidth: 1,
                borderColor: STONE_200,
                shadowColor: STONE_900,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View className="flex-row">
                <View style={{ width: 4, backgroundColor: TEAL }} />
                <View className="flex-1 flex-row items-center gap-3.5 px-4 py-4">
                  <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-teal-600">
                    <Ionicons name="add" size={24} color={WHITE} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-bold text-stone-900" style={{ letterSpacing: -0.2 }}>
                      Request care
                    </Text>
                    <Text className="mt-0.5 text-xs leading-4 text-stone-400">
                      Find the right support for your family
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={TEAL} />
                </View>
              </View>
            </Pressable>
          </Animated.View>
        </View>

        <View className="mt-7 px-4">
          <Text className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
            Quick access
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <QuickAction
              icon="heart-outline"
              label="Care Journey"
              hint="Follow your progress"
              onPress={() => router.push('/(family)/episodes')}
              featured
            />
            <QuickAction
              icon="calendar-outline"
              label="Appointments"
              hint="View and book sessions"
              onPress={() => router.push('/(family)/bookings')}
              badge={stats?.upcomingAppointments}
            />
            <QuickAction
              icon="folder-outline"
              label="Documents"
              hint="Upload and manage files"
              onPress={() => router.push('/(family)/documents')}
            />
            <QuickAction
              icon="people-outline"
              label="Care Unit"
              hint="Your care team"
              onPress={() => router.push('/(family)/care-unit')}
            />
          </View>
        </View>

        <View className="mt-6 px-4">
          <View
            className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-3.5"
            style={{ borderWidth: 1, borderColor: STONE_200 }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-teal-50">
                <Ionicons name="chatbubbles-outline" size={16} color={TEAL} />
              </View>
              <View>
                <Text className="text-[13px] font-semibold text-stone-900">Messages</Text>
                <Text className="mt-0.5 text-[11px] text-stone-400">Chat with your care team</Text>
              </View>
            </View>
            <View className="rounded-full bg-amber-50 px-2.5 py-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Soon</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
