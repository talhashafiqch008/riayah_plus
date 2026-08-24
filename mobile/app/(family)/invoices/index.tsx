import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { EmptyState } from '../../../components/ui';
import { FAMILY, FamilyTabHero } from '../../../components/family/FamilyChrome';

export default function InvoicesScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: FAMILY.stone50 }} edges={['top']}>
      <FamilyTabHero title="Invoices" subtitle="Statements and payment history" showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="receipt-outline"
          title="Invoices coming soon"
          subtitle="Billing and payments for family will be available after the payments work is ready."
          action={{
            label: 'Back to home',
            onPress: () => router.replace('/(family)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
