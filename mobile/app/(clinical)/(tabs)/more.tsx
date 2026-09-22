import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function ClinicalMoreScreen() {
  const { t } = useTranslation('clinical');

  const sections = useMemo(
    () => [
      {
        title: t('mobile.more.clinical'),
        links: [
          {
            icon: 'book-outline' as const,
            label: t('nav.plans'),
            description: t('mobile.more.plansDesc'),
            href: '/(clinical)/plans',
          },
          {
            icon: 'videocam-outline' as const,
            label: t('nav.telehealth'),
            description: t('mobile.more.telehealthDesc'),
            href: '/(clinical)/telehealth',
          },
          {
            icon: 'mic-outline' as const,
            label: t('nav.voice-recordings'),
            description: t('mobile.more.voiceDesc'),
            href: '/(clinical)/voice-recordings',
          },
        ],
      },
      {
        title: t('mobile.more.communication'),
        links: [
          {
            icon: 'chatbubble-outline' as const,
            label: t('nav.messages'),
            description: t('mobile.more.messagesDesc'),
            href: '/(clinical)/messages',
          },
          {
            icon: 'notifications-outline' as const,
            label: t('mobile.shell.notifications'),
            description: t('mobile.more.notificationsDesc'),
            href: '/(clinical)/notifications',
          },
        ],
      },
      {
        title: t('mobile.more.account'),
        links: [
          {
            icon: 'person-outline' as const,
            label: t('nav.profile'),
            description: t('mobile.more.profileDesc'),
            href: '/(clinical)/profile',
          },
        ],
      },
    ],
    [t],
  );

  return (
    <RoleMoreScreen
      i18nNs="clinical"
      profileHref="/(clinical)/profile"
      showSignOut
      sections={sections}
    />
  );
}
