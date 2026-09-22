import { useEffect } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from './ui';
import { FAMILY, FamilyTabHero, familyCardStyle } from './family/FamilyChrome';
import { apiClient } from '../lib/api/client';
import { formatDate } from '../lib/format';
import { queryClient } from '../lib/query/client';
import { navBackIcon } from '../lib/rtlIcons';
import { localizeNotification } from '../lib/localizeNotification';

const NAVY = '#1B2E3C';
const TEAL = '#0D9488';
const BRASS = '#B8943F';
const PARCHMENT = '#F7F4EF';
const WARM_BROWN = '#7A6B58';

export type NotificationsTone = 'navy' | 'family';

interface NotificationItem {
  id: string;
  title: string;
  body?: string | null;
  message?: string | null;
  type?: string | null;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

function normalizeNotifications(payload: unknown): NotificationItem[] {
  if (Array.isArray(payload)) return payload as NotificationItem[];
  if (payload && typeof payload === 'object') {
    const obj = payload as { notifications?: NotificationItem[]; data?: NotificationItem[] };
    if (Array.isArray(obj.notifications)) return obj.notifications;
    if (Array.isArray(obj.data)) return obj.data;
  }
  return [];
}

function SkeletonRow({ tone }: { tone: NotificationsTone }) {
  const shimmer = useSharedValue(0.4);
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 750, easing: Easing.ease }),
        withTiming(0.4, { duration: 750, easing: Easing.ease }),
      ),
      -1,
      false,
    );
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: shimmer.value }));
  return (
    <Animated.View
      style={[
        {
          height: 68,
          borderRadius: 16,
          backgroundColor: tone === 'family' ? FAMILY.stone200 : '#E2DDD6',
          marginBottom: 8,
          marginHorizontal: 16,
        },
        style,
      ]}
    />
  );
}

function NotificationRow({
  item,
  onPress,
  tone,
}: {
  item: NotificationItem;
  onPress: () => void;
  tone: NotificationsTone;
}) {
  const { t: tCommon } = useTranslation('common');
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const unread = !item.readAt;
  const localized = localizeNotification(item, tCommon);
  const body = localized.body;
  const family = tone === 'family';
  const accent = family ? FAMILY.amber : BRASS;
  const titleColor = unread ? (family ? FAMILY.stone900 : NAVY) : family ? FAMILY.stone500 : WARM_BROWN;
  const bodyColor = family ? FAMILY.stone500 : WARM_BROWN;

  return (
    <Animated.View style={[animStyle, { marginHorizontal: 16, marginBottom: 8 }]}>
      <Pressable
        onPressIn={() => {
          if (unread) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.97, { mass: 0.5, stiffness: 400, damping: 20 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { mass: 0.5, stiffness: 250, damping: 18 });
        }}
        onPress={onPress}
        style={[
          {
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
          },
          unread
            ? family
              ? {
                  ...familyCardStyle,
                  borderColor: 'rgba(245,158,11,0.35)',
                }
              : {
                  backgroundColor: '#fff',
                  borderColor: 'rgba(184,148,63,0.3)',
                  shadowColor: NAVY,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 2,
                }
            : family
              ? { ...familyCardStyle, shadowOpacity: 0, elevation: 0 }
              : {
                  backgroundColor: '#fff',
                  borderColor: 'rgba(27,46,60,0.07)',
                },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <View
            style={{
              marginTop: 2,
              height: 32,
              width: 32,
              borderRadius: 99,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: unread
                ? family
                  ? FAMILY.amber50
                  : 'rgba(184,148,63,0.12)'
                : family
                  ? FAMILY.stone100
                  : PARCHMENT,
            }}
          >
            <View
              style={{
                height: 10,
                width: 10,
                borderRadius: 99,
                backgroundColor: unread ? accent : '#D6D3D1',
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontWeight: unread ? '700' : '500',
                color: titleColor,
                fontSize: 14,
                letterSpacing: -0.1,
              }}
            >
              {localized.title}
            </Text>
            {body ? (
              <Text style={{ marginTop: 2, fontSize: 13, lineHeight: 18, color: bodyColor }}>
                {body}
              </Text>
            ) : null}
            <Text style={{ marginTop: 6, fontSize: 11, color: family ? FAMILY.stone400 : '#C7C3C0' }}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

type NotificationsI18nNs = 'family' | 'clinical' | 'support' | 'coordinator' | 'org';

function notificationsKey(ns: NotificationsI18nNs, leaf: string) {
  return ns === 'family'
    ? `mobile.common.notifications.${leaf}`
    : `mobile.notifications.${leaf}`;
}

export function NotificationsScreen({
  tone = 'navy',
  i18nNs,
}: {
  tone?: NotificationsTone;
  i18nNs?: NotificationsI18nNs;
}) {
  const ns: NotificationsI18nNs | undefined =
    i18nNs ?? (tone === 'family' ? 'family' : undefined);
  const { t } = useTranslation(ns ?? 'family');
  const localized = Boolean(ns);
  const nk = (leaf: string) => (ns ? notificationsKey(ns, leaf) : leaf);
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/api/notifications');
      return normalizeNotifications(res.data.notifications ?? res.data);
    },
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = data ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;
  const family = tone === 'family';
  const page = family ? FAMILY.stone50 : PARCHMENT;

  const list = isLoading && items.length === 0 ? (
    <View style={{ paddingTop: 12 }}>
      <SkeletonRow tone={tone} />
      <SkeletonRow tone={tone} />
      <SkeletonRow tone={tone} />
      <SkeletonRow tone={tone} />
    </View>
  ) : isError ? (
    <EmptyState
      icon="alert-circle-outline"
      title={localized ? t(nk('loadError')) : 'Could not load'}
      subtitle={
        (error as Error)?.message ??
        (localized ? t(nk('somethingWrong')) : 'Something went wrong')
      }
      action={{
        label: localized ? t(nk('tryAgain')) : 'Try again',
        onPress: () => void refetch(),
      }}
    />
  ) : (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ flexGrow: 1, paddingTop: 12, paddingBottom: 24 }}
      refreshControl={
        <RefreshControl
          refreshing={isFetching && !isLoading}
          onRefresh={() => void refetch()}
          tintColor={family ? FAMILY.teal : TEAL}
        />
      }
      renderItem={({ item }) => (
        <NotificationRow
          item={item}
          tone={tone}
          onPress={() => {
            if (!item.readAt) readMutation.mutate(item.id);
          }}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          icon="notifications-off-outline"
          title={localized ? t(nk('allCaughtUp')) : 'All caught up'}
          subtitle={localized ? t(nk('empty')) : 'No notifications yet.'}
        />
      }
    />
  );

  if (family) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: page }} edges={['top']}>
        <FamilyTabHero
          title={t(nk('title'))}
          subtitle={
            unreadCount > 0
              ? t(nk('unread'), { count: unreadCount })
              : t(nk('allCaughtUp'))
          }
          showBack
          right={
            <View
              style={{
                height: 38,
                width: 38,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 19,
                backgroundColor: 'rgba(255,255,255,0.16)',
              }}
            >
              <Ionicons name="notifications-outline" size={19} color={FAMILY.white} />
              {unreadCount > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 7,
                    right: 7,
                    height: 8,
                    width: 8,
                    borderRadius: 4,
                    backgroundColor: FAMILY.amber,
                    borderWidth: 1.5,
                    borderColor: FAMILY.tealDark,
                  }}
                />
              ) : null}
            </View>
          }
        />
        {list}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: page }} edges={['top']}>
      <LinearGradient
        colors={[NAVY, '#14232F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              height: 38,
              width: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Ionicons name={navBackIcon()} size={22} color="rgba(255,255,255,0.85)" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.8 }}>
              {localized ? t(nk('title')) : 'Notifications'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 3 }}>
              {unreadCount > 0
                ? localized
                  ? t(nk('unread'), { count: unreadCount })
                  : `${unreadCount} unread`
                : localized
                  ? t(nk('allCaughtUp'))
                  : 'All caught up'}
            </Text>
          </View>
          <View
            style={{
              height: 38,
              width: 38,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <Ionicons name="notifications-outline" size={19} color="rgba(255,255,255,0.85)" />
            {unreadCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
                  height: 8,
                  width: 8,
                  borderRadius: 4,
                  backgroundColor: BRASS,
                  borderWidth: 1.5,
                  borderColor: NAVY,
                }}
              />
            ) : null}
          </View>
        </View>
      </LinearGradient>
      {list}
    </SafeAreaView>
  );
}
