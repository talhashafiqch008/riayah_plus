import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '../ui';
import { AdminScreenHeader } from './AdminScreenHeader';

type Props = {
  title: string;
  description: string;
  webPath: string;
};

/** Lightweight stand-in for modules not yet fully ported — reachable from the drawer. */
export function AdminPlaceholderScreen({ title, description, webPath }: Props) {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <AdminScreenHeader title={title} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="construct-outline"
          title={`${title} on mobile`}
          subtitle={`${description} Full management stays on the web admin console (${webPath}) for now.`}
          action={{
            label: 'Back to dashboard',
            onPress: () => router.replace('/(admin)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
