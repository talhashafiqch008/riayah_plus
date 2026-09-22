import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function SupportMoreScreen() {
  const { t } = useTranslation('support');

  const sections = useMemo(
    () => [
      {
        title: t('mobile.more.shift'),
        links: [
          {
            icon: 'location-outline' as const,
            label: t('visits.title'),
            description: t('mobile.more.visitsDesc'),
            href: '/(support)/visits',
          },
        ],
      },
      {
        title: t('mobile.more.communication'),
        links: [
          {
            icon: 'notifications-outline' as const,
            label: t('mobile.shell.notifications'),
            description: t('mobile.more.notificationsDesc'),
            href: '/(support)/notifications',
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
            href: '/(support)/profile',
          },
        ],
      },
    ],
    [t],
  );

  return (
    <RoleMoreScreen
      i18nNs="support"
      profileHref="/(support)/profile"
      showSignOut
      sections={sections}
    />
  );
}
