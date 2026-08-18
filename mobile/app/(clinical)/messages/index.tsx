import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState, ScreenHeader } from '../../../components/ui';

/** Matches web RoleShellPlaceholder for /clinical/messages. */
export default function ClinicalMessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Messages" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Secure messaging coming soon"
          subtitle="This section will be wired to live APIs in a later milestone. The Clinical shell and navigation are in place."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(clinical)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
