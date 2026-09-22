import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState, ScreenHeader } from '../../../components/ui';

/** Matches web RoleShellPlaceholder for /support/notes — no live route yet. */
export default function SupportShiftNotesScreen() {
  const { t } = useTranslation('support');

  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title={t('placeholders.notes.title')} showBack />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="document-text-outline"
          title={t('placeholders.shiftNotesComingTitle')}
          subtitle={t('placeholders.shiftNotesComingBody')}
          action={{
            label: t('placeholders.backToHome'),
            onPress: () => router.replace('/(support)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
