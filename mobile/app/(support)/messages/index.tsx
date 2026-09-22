import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../../components/ui';
import { ROLE, RoleTabHero } from '../../../components/shell/RoleChrome';

/** Support messaging uses the same APIs when threads exist; keep a calm empty state for now. */
export default function SupportMessagesScreen() {
  const { t } = useTranslation('support');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: ROLE.stone50 }} edges={['top']}>
      <RoleTabHero
        title={t('placeholders.messages.title')}
        subtitle={t('placeholders.messages.description')}
        showBack
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="chatbubble-ellipses-outline"
          title={t('placeholders.teamMessagingTitle')}
          subtitle={t('placeholders.teamMessagingBody')}
          action={{
            label: t('placeholders.backToHome'),
            onPress: () => router.replace('/(support)'),
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
