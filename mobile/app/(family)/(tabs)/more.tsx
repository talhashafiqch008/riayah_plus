import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
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

type MoreLink = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  href: string;
};

const SECTIONS: { title: string; links: MoreLink[] }[] = [
  {
    title: 'My care',
    links: [
      {
        icon: 'people-outline',
        label: 'My care unit',
        description: 'Household, people needing care, and their requests',
        href: '/(family)/care-unit',
      },
      {
        icon: 'add-circle-outline',
        label: 'New care request',
        description: 'Start a care request for someone in your household',
        href: '/(onboarding)/step-1-care-unit',
      },
      {
        icon: 'folder-outline',
        label: 'Documents',
        description: 'Reports and files shared with your care team',
        href: '/(family)/documents',
      },
    ],
  },
  {
    title: 'Communication',
    links: [
      {
        icon: 'chatbubble-outline',
        label: 'Messages',
        description: 'Talk to your care team',
        href: '/(family)/messages',
      },
      {
        icon: 'notifications-outline',
        label: 'Notifications',
        description: 'Updates about your care journey',
        href: '/(family)/notifications',
      },
    ],
  },
  {
    title: 'Account',
    links: [
      {
        icon: 'person-outline',
        label: 'Profile & settings',
        description: 'Your details and account preferences',
        href: '/(family)/profile',
      },
      {
        icon: 'receipt-outline',
        label: 'Invoices',
        description: 'Statements and payment history',
        href: '/(family)/invoices',
      },
    ],
  },
];

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
        onPress={() => router.push(link.href)}
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
        <Ionicons name="chevron-forward" size={16} color="#D6D3D1" />
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyMoreScreen() {
  const user = useAuthStore((s) => s.user);
  const heroScale = useSharedValue(1);
  const heroAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: heroScale.value }] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title={user?.name ?? 'My account'}
        subtitle={user?.email}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile"
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
        {SECTIONS.map((section) => (
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
