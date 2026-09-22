import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Avatar, Button } from '../ui';
import { useAuthStore } from '../../stores/authStore';
import { navForwardIcon } from '../../lib/rtlIcons';
import {
  ROLE,
  RoleTabHero,
  roleCardStyle,
  rolePressSpring,
  roleReleaseSpring,
} from './RoleChrome';

export type RoleMoreLink = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  href: string;
};

function SectionRow({ link, isLast }: { link: RoleMoreLink; isLast: boolean }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.98, rolePressSpring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, roleReleaseSpring);
        }}
        onPress={() => router.push(link.href as never)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: ROLE.stone100,
        }}
      >
        <View
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: ROLE.teal50,
          }}
        >
          <Ionicons name={link.icon} size={18} color={ROLE.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: ROLE.stone900, fontSize: 15 }}>{link.label}</Text>
          <Text style={{ marginTop: 1, fontSize: 12, color: ROLE.stone500, lineHeight: 16 }}>
            {link.description}
          </Text>
        </View>
        <Ionicons name={navForwardIcon()} size={16} color="#D6D3D1" />
      </Pressable>
    </Animated.View>
  );
}

export function RoleMoreScreen({
  sections,
  profileHref,
  showSignOut,
  i18nNs,
}: {
  sections: { title: string; links: RoleMoreLink[] }[];
  profileHref: string;
  showSignOut?: boolean;
  i18nNs?: 'clinical' | 'support' | 'coordinator' | 'org';
}) {
  const { t } = useTranslation(i18nNs ?? 'clinical');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const heroScale = useSharedValue(1);
  const heroAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));

  const myAccount = i18nNs ? t('mobile.shell.myAccount') : 'My account';
  const openProfile = i18nNs ? t('mobile.shell.openProfile') : 'Open profile';
  const signOut = i18nNs ? t('layout.signOut') : 'Sign out';
  const signOutConfirm = i18nNs ? t('mobile.shell.signOutConfirm') : 'Are you sure?';
  const cancel = i18nNs ? t('mobile.shell.signOutCancel') : 'Cancel';

  const confirmLogout = () => {
    Alert.alert(signOut, signOutConfirm, [
      { text: cancel, style: 'cancel' },
      { text: signOut, style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ROLE.stone50 }} edges={['top']}>
      <RoleTabHero
        title={user?.name ?? myAccount}
        subtitle={user?.email}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={openProfile}
            onPressIn={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              heroScale.value = withSpring(0.97, rolePressSpring);
            }}
            onPressOut={() => {
              heroScale.value = withSpring(1, roleReleaseSpring);
            }}
            onPress={() => router.push(profileHref as never)}
          >
            <Animated.View style={heroAnimStyle}>
              <Avatar name={user?.name ?? '?'} uri={user?.avatarUrl} size="lg" />
            </Animated.View>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {sections.map((section) => (
          <View key={section.title} style={{ marginBottom: 8 }}>
            <Text
              style={{
                marginTop: 8,
                marginBottom: 10,
                fontSize: 10,
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: 2.5,
                color: ROLE.stone400,
              }}
            >
              {section.title}
            </Text>
            <View style={{ overflow: 'hidden', ...roleCardStyle }}>
              {section.links.map((link, index) => (
                <SectionRow
                  key={link.href}
                  link={link}
                  isLast={index === section.links.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        {showSignOut ? (
          <View style={{ marginTop: 16 }}>
            <Button variant="destructive" onPress={confirmLogout}>
              {signOut}
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
