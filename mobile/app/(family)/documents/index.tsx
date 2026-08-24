import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  FAMILY,
  FamilySectionLabel,
  FamilyTabHero,
  familyCardStyle,
  familyPressSpring,
  familyReleaseSpring,
} from '../../../components/family/FamilyChrome';

const LINKS = [
  {
    icon: 'people-outline' as const,
    label: 'Care Unit',
    hint: 'Upload documents from your care unit',
    href: '/(family)/care-unit',
  },
  {
    icon: 'heart-outline' as const,
    label: 'Care Journey',
    hint: 'View reports attached to your care journey',
    href: '/(family)/episodes',
  },
];

function LinkCard({ link }: { link: (typeof LINKS)[0] }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={animStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={link.label}
        onPressIn={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          scale.value = withSpring(0.97, familyPressSpring);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, familyReleaseSpring);
        }}
        onPress={() => router.push(link.href)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          padding: 16,
          ...familyCardStyle,
        }}
      >
        <View
          style={{
            height: 44,
            width: 44,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            backgroundColor: FAMILY.teal50,
          }}
        >
          <Ionicons name={link.icon} size={22} color={FAMILY.teal} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: FAMILY.stone900, letterSpacing: -0.2 }}>
            {link.label}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: FAMILY.stone500, lineHeight: 16 }}>
            {link.hint}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={FAMILY.stone400} />
      </Pressable>
    </Animated.View>
  );
}

export default function FamilyDocumentsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Documents" subtitle="Reports and files from your care team" showBack />

      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 20 }}>
        <View style={{ marginBottom: 24, alignItems: 'center', padding: 24, ...familyCardStyle }}>
          <View
            style={{
              marginBottom: 14,
              height: 64,
              width: 64,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 18,
              backgroundColor: FAMILY.teal50,
            }}
          >
            <Ionicons name="folder-open-outline" size={30} color={FAMILY.teal} />
          </View>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '700',
              color: FAMILY.stone900,
              letterSpacing: -0.3,
            }}
          >
            Documents hub coming soon
          </Text>
          <Text
            style={{
              marginTop: 6,
              textAlign: 'center',
              fontSize: 13,
              lineHeight: 20,
              color: FAMILY.stone500,
            }}
          >
            A dedicated space for all your care files. For now, documents are available directly from
            your care unit and care journey.
          </Text>
        </View>

        <FamilySectionLabel>Access documents from</FamilySectionLabel>

        <View style={{ gap: 12 }}>
          {LINKS.map((link) => (
            <LinkCard key={link.href} link={link} />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
