import { useEffect, type ReactNode } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
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
import { Avatar } from '../ui';
import { greetingForNow } from '../../lib/format';
import { useAuthStore } from '../../stores/authStore';
import {
  ROLE,
  ROLE_HERO_COLORS,
  roleCardStyle,
  rolePressSpring,
  roleReleaseSpring,
} from './RoleChrome';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_WIDTH = (SCREEN_WIDTH - 48) / 2;

export type RoleHomeStat = {
  value: string | number;
  label: string;
  accent?: 'teal' | 'stone' | 'amber';
};

export type RoleHomeLink = {
  name: string;
  href: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export type RoleHomeProps = {
  tagline: string;
  notificationsHref: string;
  profileHref: string;
  stats: RoleHomeStat[];
  loading: boolean;
  refreshing: boolean;
  isError: boolean;
  onRefresh: () => void;
  onRetry: () => void;
  nextSteps: string[];
  cta?: { label: string; onPress: () => void };
  quickLinks: readonly RoleHomeLink[];
  /** Optional dashboard widget rendered above next steps (e.g. voice record). */
  topWidget?: ReactNode;
};

function accentColor(accent: RoleHomeStat['accent']) {
  if (accent === 'amber') return ROLE.amber;
  if (accent === 'stone') return ROLE.stone900;
  return ROLE.teal;
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
  value: string | number;
  label: string;
  accent: string;
  loading: boolean;
}) {
  return (
    <View
      className="flex-1 items-center rounded-2xl bg-white px-2 py-4"
      style={{
        shadowColor: ROLE.stone900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: ROLE.stone200,
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
  featured,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  hint: string;
  onPress: () => void;
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
          if (!reduceMotion) scale.value = withSpring(0.97, rolePressSpring);
        }}
        onPressOut={() => {
          if (!reduceMotion) scale.value = withSpring(1, roleReleaseSpring);
        }}
        className="rounded-2xl p-4"
        style={{
          backgroundColor: featured ? ROLE.teal : ROLE.white,
          borderWidth: featured ? 0 : 1,
          borderColor: ROLE.stone200,
          shadowColor: featured ? ROLE.teal : ROLE.stone900,
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
            style={{ backgroundColor: featured ? 'rgba(255,255,255,0.18)' : ROLE.teal50 }}
          >
            <Ionicons name={icon} size={20} color={featured ? ROLE.white : ROLE.teal} />
          </View>
        </View>
        <Text
          className="text-[13px] font-bold"
          style={{ color: featured ? ROLE.white : ROLE.stone900, letterSpacing: -0.2 }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-[11px] leading-4"
          style={{ color: featured ? 'rgba(255,255,255,0.72)' : ROLE.stone500 }}
        >
          {hint}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export function RoleHome({
  tagline,
  notificationsHref,
  profileHref,
  stats,
  loading,
  refreshing,
  isError,
  onRefresh,
  onRetry,
  nextSteps,
  cta,
  quickLinks,
  topWidget,
}: RoleHomeProps) {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const greeting = greetingForNow();
  const hour = new Date().getHours();
  const arabicGreeting = hour < 12 ? 'صباح الخير' : 'مساء الخير';

  const reduceMotion = useReducedMotion();
  const ctaScale = useSharedValue(1);
  const ctaAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: ctaScale.value }] }));

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={onRefresh}
            tintColor={ROLE.teal}
          />
        }
      >
        <LinearGradient
          colors={[...ROLE_HERO_COLORS]}
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
                {tagline}
              </Text>
            </View>

            <View className="flex-row items-center gap-3 pt-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => router.push(notificationsHref as never)}
                hitSlop={10}
                className="h-[38px] w-[38px] items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}
              >
                <Ionicons name="notifications-outline" size={20} color={ROLE.white} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Profile"
                onPress={() => router.push(profileHref as never)}
                hitSlop={10}
              >
                <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size="sm" />
              </Pressable>
            </View>
          </View>
        </LinearGradient>

        <View className="-mt-7 flex-row gap-2.5 px-4">
          {stats.map((stat) => (
            <StatPill
              key={stat.label}
              value={stat.value}
              label={stat.label}
              accent={accentColor(stat.accent)}
              loading={loading}
            />
          ))}
        </View>

        {isError ? (
          <Pressable onPress={onRetry} className="mt-3 items-center">
            <Text className="text-xs text-stone-400">
              Could not load — <Text className="font-semibold text-teal-600">tap to retry</Text>
            </Text>
          </Pressable>
        ) : null}

        {topWidget ? <View className="mt-5 px-4">{topWidget}</View> : null}

        <View className="mt-5 px-4">
          <View style={[{ padding: 16 }, roleCardStyle]}>
            <Text className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
              Suggested next steps
            </Text>
            <View className="gap-3">
              {nextSteps.map((step) => (
                <View key={step} className="flex-row items-start gap-2">
                  <Ionicons name="arrow-forward" size={16} color={ROLE.teal} />
                  <Text className="flex-1 text-sm text-stone-600">{step}</Text>
                </View>
              ))}
            </View>
            {cta ? (
              <Animated.View style={[{ marginTop: 16 }, ctaAnimStyle]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={cta.label}
                  onPress={cta.onPress}
                  onPressIn={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (!reduceMotion) ctaScale.value = withSpring(0.98, rolePressSpring);
                  }}
                  onPressOut={() => {
                    if (!reduceMotion) ctaScale.value = withSpring(1, roleReleaseSpring);
                  }}
                  className="items-center rounded-xl py-3"
                  style={{ backgroundColor: ROLE.teal }}
                >
                  <Text className="text-[14px] font-bold text-white">{cta.label}</Text>
                </Pressable>
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View className="mt-7 px-4">
          <Text className="mb-3 text-[10px] font-bold uppercase tracking-[2.5px] text-stone-400">
            Quick access
          </Text>
          <View className="flex-row flex-wrap gap-3">
            {quickLinks.map((link, index) => (
              <QuickAction
                key={link.href}
                icon={link.icon}
                label={link.name}
                hint={link.hint}
                featured={index === 0}
                onPress={() => router.push(link.href as never)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
