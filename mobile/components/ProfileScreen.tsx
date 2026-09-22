import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Avatar, Card, Input } from './ui';
import { FAMILY, FAMILY_HERO_COLORS, familyCardStyle } from './family/FamilyChrome';
import { apiClient } from '../lib/api/client';
import { apiErrorMessage } from '../lib/format';
import { useAuthStore } from '../stores/authStore';
import { familyEnumLabel } from '../lib/familyLanguage';
import { navBackIcon, navForwardIcon } from '../lib/rtlIcons';

const NAVY = '#1B2E3C';
const TEAL = '#0D9488';
const PARCHMENT = '#F7F4EF';
const WARM_BROWN = '#7A6B58';

export type ProfileTone = 'navy' | 'family';

function palette(tone: ProfileTone) {
  if (tone === 'family') {
    return {
      page: FAMILY.stone50,
      hero: [...FAMILY_HERO_COLORS] as [string, string, ...string[]],
      text: FAMILY.stone900,
      muted: FAMILY.stone500,
      well: FAMILY.teal50,
      wellIcon: FAMILY.teal,
      actionIcon: FAMILY.stone500,
      divider: FAMILY.stone100,
      cardStyle: familyCardStyle,
    };
  }
  return {
    page: PARCHMENT,
    hero: [NAVY, '#14232F'] as [string, string, ...string[]],
    text: NAVY,
    muted: WARM_BROWN,
    well: PARCHMENT,
    wellIcon: WARM_BROWN,
    actionIcon: WARM_BROWN,
    divider: 'rgba(27,46,60,0.06)',
    cardStyle: {
      overflow: 'hidden' as const,
      borderRadius: 16,
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: 'rgba(27,46,60,0.07)',
      shadowColor: NAVY,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
  };
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
  isLast,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  isLast?: boolean;
  tone: ProfileTone;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const colors = palette(tone);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.97, { mass: 0.5, stiffness: 400, damping: 20 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { mass: 0.5, stiffness: 250, damping: 18 });
        }}
        onPress={onPress}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: colors.divider,
        }}
      >
        <View
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: danger ? '#FEF2F2' : colors.well,
          }}
        >
          <Ionicons name={icon} size={18} color={danger ? '#DC2626' : colors.actionIcon} />
        </View>
        <Text
          style={{
            flex: 1,
            fontWeight: '600',
            fontSize: 15,
            color: danger ? '#DC2626' : colors.text,
          }}
        >
          {label}
        </Text>
        {!danger ? <Ionicons name={navForwardIcon()} size={16} color="#D6D3D1" /> : null}
      </Pressable>
    </Animated.View>
  );
}

function InfoRow({
  label,
  value,
  icon,
  isLast,
  tone,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
  tone: ProfileTone;
}) {
  const colors = palette(tone);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      <View
        style={{
          height: 36,
          width: 36,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 10,
          backgroundColor: tone === 'family' ? FAMILY.teal50 : 'rgba(13,148,136,0.1)',
        }}
      >
        <Ionicons name={icon} size={16} color={TEAL} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, color: colors.muted, letterSpacing: 0.2 }}>{label}</Text>
        <Text
          style={{ marginTop: 2, fontSize: 14, fontWeight: '600', color: colors.text }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function organizationDisplayName(
  raw: Record<string, unknown> | undefined,
  fallback?: string | null,
): string | null {
  const org = raw?.organization;
  if (org && typeof org === 'object' && 'name' in org) {
    const name = (org as { name?: unknown }).name;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  if (typeof raw?.organizationName === 'string' && raw.organizationName.trim()) {
    return raw.organizationName.trim();
  }
  return fallback?.trim() || null;
}

type ProfileI18nNs = 'family' | 'clinical' | 'support' | 'coordinator' | 'org';

function profileKey(ns: ProfileI18nNs, leaf: string) {
  return ns === 'family' ? `mobile.common.profile.${leaf}` : `mobile.profile.${leaf}`;
}

export function ProfileScreen({
  tone = 'navy',
  i18nNs,
}: {
  tone?: ProfileTone;
  i18nNs?: ProfileI18nNs;
}) {
  const ns: ProfileI18nNs | undefined = i18nNs ?? (tone === 'family' ? 'family' : undefined);
  const { t } = useTranslation(ns ?? 'family');
  const localized = Boolean(ns);
  const pk = (leaf: string) => (ns ? profileKey(ns, leaf) : leaf);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const colors = palette(tone);

  const meQuery = useQuery({
    queryKey: ['me'],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data } = await apiClient.get('/api/me');
      return (data.user ?? data) as Record<string, unknown>;
    },
    staleTime: 60_000,
  });

  const organizationName = organizationDisplayName(
    meQuery.data,
    user?.organizationName,
  );

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 14, color: colors.muted }}>
            {localized ? t(pk('notSignedIn')) : 'Not signed in.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const save = async () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert(
        localized ? t(pk('invalidName')) : 'Invalid name',
        localized
          ? t(pk('invalidNameHint'))
          : 'Please enter at least 2 characters.',
      );
      return;
    }
    setSaving(true);
    try {
      await apiClient.put('/api/user/profile', { name: trimmed });
      useAuthStore.getState().setUser({ ...user, name: trimmed });
      setName(trimmed);
      setEditing(false);
    } catch (e) {
      Alert.alert(
        localized ? t(pk('saveFailed')) : 'Could not save',
        apiErrorMessage(e),
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      localized ? t(pk('signOut')) : 'Sign out',
      localized ? t(pk('signOutConfirm')) : 'Are you sure?',
      [
        {
          text: localized ? t(pk('cancel')) : 'Cancel',
          style: 'cancel',
        },
        {
          text: localized ? t(pk('signOut')) : 'Sign out',
          style: 'destructive',
          onPress: () => void logout(),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.page }} edges={['top']}>
      <LinearGradient
        colors={colors.hero}
        start={{ x: 0, y: 0 }}
        end={tone === 'family' ? { x: 1, y: 1 } : { x: 0, y: 1 }}
        style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, overflow: 'hidden' }}
      >
        {tone === 'family' ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -40,
              top: -28,
              height: 140,
              width: 140,
              borderRadius: 70,
              backgroundColor: 'rgba(255,255,255,0.12)',
            }}
          />
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
          <Pressable
            onPress={() => (editing ? void save() : setEditing(true))}
            hitSlop={12}
            style={{
              borderRadius: 99,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 16,
              paddingVertical: 6,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>
              {editing
                ? saving
                  ? localized
                    ? t(pk('saving'))
                    : 'Saving…'
                  : localized
                    ? t(pk('save'))
                    : 'Save'
                : localized
                  ? t(pk('edit'))
                  : 'Edit'}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 20, alignItems: 'center' }}>
          <Avatar uri={user.avatarUrl} name={user.name} size="xl" />
          <Text
            style={{
              color: '#fff',
              fontSize: 22,
              fontWeight: '800',
              marginTop: 14,
              letterSpacing: -0.6,
            }}
          >
            {user.name}
          </Text>
          <View
            style={{
              marginTop: 8,
              borderRadius: 99,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              paddingHorizontal: 14,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' }}>
              {localized ? familyEnumLabel('role', user.role) : user.role.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 20 }}>
          <View style={{ overflow: 'hidden', ...colors.cardStyle }}>
            <InfoRow
              tone={tone}
              label={localized ? t(pk('email')) : 'Email'}
              value={user.email}
              icon="mail-outline"
            />
            <InfoRow
              tone={tone}
              label={localized ? t(pk('role')) : 'Role'}
              value={
                localized ? familyEnumLabel('role', user.role) : user.role.replace(/_/g, ' ')
              }
              icon="shield-checkmark-outline"
            />
            {user.organizationId ? (
              <InfoRow
                tone={tone}
                label={localized ? t(pk('organization')) : 'Organization'}
                value={
                  organizationName ??
                  (meQuery.isLoading
                    ? localized
                      ? t(pk('loading'))
                      : 'Loading…'
                    : '—')
                }
                icon="business-outline"
                isLast
              />
            ) : null}
          </View>

          {editing ? (
            <Card shadow={false}>
              <Input
                label={localized ? t(pk('displayName')) : 'Display name'}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!saving}
              />
            </Card>
          ) : null}

          <View style={{ overflow: 'hidden', ...colors.cardStyle }}>
            <ActionRow
              tone={tone}
              icon="key-outline"
              label={localized ? t(pk('changePassword')) : 'Change Password'}
              onPress={() => router.push('/(auth)/forgot-password')}
            />
            <ActionRow
              tone={tone}
              icon="log-out-outline"
              label={localized ? t(pk('signOut')) : 'Sign Out'}
              onPress={confirmLogout}
              danger
              isLast
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
