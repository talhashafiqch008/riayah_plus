import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState, ScreenHeader } from '../../../components/ui';

/** Matches family / web RoleShellPlaceholder — secure messaging ships later. */
export default function CoordinatorMessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Messages" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Secure messaging coming soon"
          subtitle="Secure messaging ships in a later release. Use intake and episode notes for care coordination for now."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(coordinator)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
