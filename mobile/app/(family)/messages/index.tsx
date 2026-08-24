import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';

export default function MessagesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero
        title="Messages"
        subtitle="Talk to your care team"
        showBack
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Secure messaging coming soon"
          subtitle="Your care team will contact you about appointments and next steps."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(family)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
