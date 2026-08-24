import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';

export default function FamilyTelehealthScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Video visit" subtitle="Join from your phone when it is ready" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="videocam-outline"
          title="Video visits coming soon"
          subtitle="When a remote appointment is scheduled, you will join from this screen."
          action={{
            label: 'Back to appointments',
            onPress: () => router.replace('/(family)/bookings'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
