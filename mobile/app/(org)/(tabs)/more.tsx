import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function OrgMoreScreen() {
  const { t } = useTranslation('org');

  const sections = useMemo(
    () => [
      {
        title: t('mobile.more.organization'),
        links: [
          {
            icon: 'briefcase-outline' as const,
            label: t('nav.staff'),
            description: t('mobile.more.staffDesc'),
            href: '/(org)/staff',
          },
          {
            icon: 'location-outline' as const,
            label: t('mobile.home.visitGps'),
            description: t('mobile.more.gpsDesc'),
            href: '/(org)/gps',
          },
        ],
      },
      {
        title: t('mobile.more.account'),
        links: [
          {
            icon: 'notifications-outline' as const,
            label: t('mobile.shell.notifications'),
            description: t('mobile.more.notificationsDesc'),
            href: '/(org)/notifications',
          },
          {
            icon: 'person-outline' as const,
            label: t('mobile.shell.profile'),
            description: t('mobile.more.profileDesc'),
            href: '/(org)/profile',
          },
        ],
      },
    ],
    [t],
  );

  return (
    <RoleMoreScreen
      i18nNs="org"
      profileHref="/(org)/profile"
      showSignOut
      sections={sections}
    />
  );
}
