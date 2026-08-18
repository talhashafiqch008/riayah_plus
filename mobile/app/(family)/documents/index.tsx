import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState, ScreenHeader } from '../../../components/ui';

export default function FamilyDocumentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Documents" showBack />
      <View className="flex-1">
        <EmptyState
          icon="folder-outline"
          title="Documents"
          subtitle="Document upload is available from your care request and care unit. A dedicated documents hub expands in a later release."
          action={{
            label: 'Open my care unit',
            onPress: () => router.push('/(family)/care-unit'),
          }}
        />
      </View>
    </SafeAreaView>
  );
}
