import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState, ScreenHeader } from '../../../components/ui';

/** Matches web RoleShellPlaceholder for /support/notes — no live route yet. */
export default function SupportShiftNotesScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Shift Notes" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="document-text-outline"
          title="Shift notes coming soon"
          subtitle="This section will be wired to live APIs in a later milestone. The Support Worker shell and navigation are in place."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(support)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
