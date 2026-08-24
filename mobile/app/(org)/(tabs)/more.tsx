import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function OrgMoreScreen() {
  return (
    <RoleMoreScreen
      profileHref="/(org)/profile"
      showSignOut
      sections={[
        {
          title: 'Organization',
          links: [
            {
              icon: 'briefcase-outline',
              label: 'Staff',
              description: 'Invite and manage clinical and support staff',
              href: '/(org)/staff',
            },
            {
              icon: 'location-outline',
              label: 'Visit GPS',
              description: 'Staff check-ins, check-outs, and live visits',
              href: '/(org)/gps',
            },
          ],
        },
        {
          title: 'Account',
          links: [
            {
              icon: 'notifications-outline',
              label: 'Notifications',
              description: 'Updates for your organization',
              href: '/(org)/notifications',
            },
            {
              icon: 'person-outline',
              label: 'Profile',
              description: 'Your details and sign out',
              href: '/(org)/profile',
            },
          ],
        },
      ]}
    />
  );
}
