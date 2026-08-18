import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, ScreenHeader } from '../../../components/ui';
import { useAuthStore } from '../../../stores/authStore';

type MoreLink = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  href: string;
};

const SECTIONS: { title: string; links: MoreLink[] }[] = [
  {
    title: 'Clinical',
    links: [
      {
        icon: 'book-outline',
        label: 'Care Plans',
        description: 'Review plans and add an optional co-sign',
        href: '/(clinical)/plans',
      },
    ],
  },
  {
    title: 'Communication',
    links: [
      {
        icon: 'chatbubble-outline',
        label: 'Messages',
        description: 'Talk to families and the care team',
        href: '/(clinical)/messages',
      },
      {
        icon: 'notifications-outline',
        label: 'Notifications',
        description: 'Updates about assessments and notes',
        href: '/(clinical)/notifications',
      },
    ],
  },
  {
    title: 'Account',
    links: [
      {
        icon: 'person-outline',
        label: 'Profile',
        description: 'Your details and app settings',
        href: '/(clinical)/profile',
      },
    ],
  },
];

export default function ClinicalMoreScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="More" showBack={false} />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {user?.name ? (
          <Card className="mb-4" shadow>
            <Text className="text-base font-semibold text-stone-900">{user.name}</Text>
            {user.email ? (
              <Text className="mt-0.5 text-sm text-stone-500">{user.email}</Text>
            ) : null}
          </Card>
        ) : null}

        {SECTIONS.map((section) => (
          <View key={section.title}>
            <Text className="mb-2 mt-2 text-xs font-semibold uppercase tracking-wider text-stone-400">
              {section.title}
            </Text>
            {section.links.map((link) => (
              <Card
                key={link.href}
                className="mb-2"
                onPress={() => router.push(link.href as never)}
                shadow={false}
              >
                <View className="flex-row items-center gap-3">
                  <View className="rounded-xl bg-teal-50 p-2.5">
                    <Ionicons name={link.icon} size={20} color="#0F766E" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-stone-900">{link.label}</Text>
                    <Text className="mt-0.5 text-sm text-stone-500">{link.description}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#D6D3D1" />
                </View>
              </Card>
            ))}
          </View>
        ))}

        <View className="mt-4">
          <Button variant="destructive" onPress={confirmLogout}>
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
