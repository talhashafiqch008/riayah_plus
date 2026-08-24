import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '../../../components/ui';
import { ROLE, RoleTabHero } from '../../../components/shell/RoleChrome';

/** Support messaging uses the same APIs when threads exist; keep a calm empty state for now. */
export default function SupportMessagesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ROLE.stone50 }} edges={['top']}>
      <RoleTabHero title="Messages" subtitle="Talk with your care team" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Team messaging"
          subtitle="Family, clinical, and coordinator messaging is live. Support threads will appear here when your organization opens them."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(support)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
