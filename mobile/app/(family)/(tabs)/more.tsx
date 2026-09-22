import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '../../../components/ui';
import {
  FAMILY,
  FamilyTabHero,
  familyCardStyle,
  familyPressSpring,
  familyReleaseSpring,
} from '../../../components/family/FamilyChrome';
import { useAuthStore } from '../../../stores/authStore';
import { navForwardIcon } from '../../../lib/rtlIcons';

type MoreLink = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  href: string;
};

function SectionRow({ link, isLast }: { link: MoreLink; isLast: boolean }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.98, familyPressSpring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, familyReleaseSpring);
        }}
        onPress={() => router.push(link.href as never)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: isLast ? 0 : 1,
          borderBottomColor: FAMILY.stone100,
        }}
      >
        <View
          style={{
            height: 36,
            width: 36,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 10,
            backgroundColor: FAMILY.teal50,
          }}
        >
          <Ionicons name={link.icon} size={18} color={FAMILY.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '600', color: FAMILY.stone900, fontSize: 15 }}>{link.label}</Text>
          <Text style={{ marginTop: 1, fontSize: 12, color: FAMILY.stone500, lineHeight: 16 }}>
            {link.description}
          </Text>
        </View>
        <Ionicons name={navForwardIcon()} size={16} color="#D6D3D1" />
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyMoreScreen() {
  const { t } = useTranslation('family');
  const user = useAuthStore((s) => s.user);
  const heroScale = useSharedValue(1);
  const heroAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));

  const sections = useMemo(
    () => [
      {
        title: t('mobile.more.myCare'),
        links: [
          {
            icon: 'people-outline' as const,
            label: t('mobile.more.careUnit'),
            description: t('mobile.more.careUnitDesc'),
            href: '/(family)/care-unit',
          },
          {
            icon: 'add-circle-outline' as const,
            label: t('mobile.more.newRequest'),
            description: t('mobile.more.newRequestDesc'),
            href: '/(onboarding)/step-1-care-unit',
          },
          {
            icon: 'folder-outline' as const,
            label: t('nav.documents'),
            description: t('mobile.more.documentsDesc'),
            href: '/(family)/documents',
          },
        ],
      },
      {
        title: t('mobile.more.communication'),
        links: [
          {
            icon: 'chatbubble-outline' as const,
            label: t('nav.messages'),
            description: t('mobile.more.messagesDesc'),
            href: '/(family)/messages',
          },
          {
            icon: 'videocam-outline' as const,
            label: t('nav.telehealth'),
            description: t('mobile.more.videoDesc'),
            href: '/(family)/telehealth',
          },
          {
            icon: 'notifications-outline' as const,
            label: t('mobile.home.notifications'),
            description: t('mobile.more.notificationsDesc'),
            href: '/(family)/notifications',
          },
        ],
      },
      {
        title: t('mobile.more.account'),
        links: [
          {
            icon: 'person-outline' as const,
            label: t('mobile.more.profile'),
            description: t('mobile.more.profileDesc'),
            href: '/(family)/profile',
          },
          {
            icon: 'receipt-outline' as const,
            label: t('nav.billing'),
            description: t('mobile.more.billingDesc'),
            href: '/(family)/invoices',
          },
        ],
      },
    ],
    [t],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title={user?.name ?? t('mobile.more.myAccount')}
        subtitle={user?.email}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('mobile.more.openProfile')}
            onPressIn={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              heroScale.value = withSpring(0.97, familyPressSpring);
            }}
            onPressOut={() => {
              heroScale.value = withSpring(1, familyReleaseSpring);
            }}
            onPress={() => router.push('/(family)/profile')}
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
                color: FAMILY.stone400,
              }}
            >
              {section.title}
            </Text>
            <View
              style={{
                overflow: 'hidden',
                ...familyCardStyle,
              }}
            >
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
      </ScrollView>
    </SafeAreaView>
  );
}
