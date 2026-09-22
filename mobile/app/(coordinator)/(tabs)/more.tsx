import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function CoordinatorMoreScreen() {
  const { t } = useTranslation('coordinator');

  const sections = useMemo(
    () => [
      {
        title: t('mobile.more.carePanel'),
        links: [
          {
            icon: 'people-outline' as const,
            label: t('nav.patients'),
            description: t('mobile.more.patientsDesc'),
            href: '/(coordinator)/patients',
          },
          {
            icon: 'calendar-outline' as const,
            label: t('nav.schedule'),
            description: t('mobile.more.scheduleDesc'),
            href: '/(coordinator)/schedule',
          },
          {
            icon: 'location-outline' as const,
            label: t('mobile.detail.visitGps'),
            description: t('mobile.more.gpsDesc'),
            href: '/(coordinator)/map',
          },
          {
            icon: 'mic-outline' as const,
            label: t('nav.voice-recordings'),
            description: t('mobile.more.voiceDesc'),
            href: '/(coordinator)/voice-recordings',
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
            href: '/(coordinator)/messages',
          },
          {
            icon: 'notifications-outline' as const,
            label: t('mobile.shell.notifications'),
            description: t('mobile.more.notificationsDesc'),
            href: '/(coordinator)/notifications',
          },
        ],
      },
      {
        title: t('mobile.more.account'),
        links: [
          {
            icon: 'person-outline' as const,
            label: t('mobile.shell.profile'),
            description: t('mobile.more.profileDesc'),
            href: '/(coordinator)/profile',
          },
        ],
      },
    ],
    [t],
  );

  return (
    <RoleMoreScreen
      i18nNs="coordinator"
      profileHref="/(coordinator)/profile"
      sections={sections}
    />
  );
}
