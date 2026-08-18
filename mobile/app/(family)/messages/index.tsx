import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState, ScreenHeader } from '../../../components/ui';

/**
 * Matches mern/client RoleShellPlaceholder for /family/messages —
 * secure messaging ships later; care team contacts families about appointments.
 */
export default function MessagesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Messages" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title="Secure messaging coming soon"
          subtitle="Secure family messaging ships in a later release. Your care team will contact you about appointments and next steps."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(family)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
