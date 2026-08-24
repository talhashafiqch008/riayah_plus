import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function SupportMoreScreen() {
  return (
    <RoleMoreScreen
      profileHref="/(support)/profile"
      showSignOut
      sections={[
        {
          title: 'Shift',
          links: [
            {
              icon: 'location-outline',
              label: 'Visits',
              description: 'GPS check-in and check-out at the patient address',
              href: '/(support)/visits',
            },
            {
              icon: 'document-text-outline',
              label: 'Shift Notes',
              description: 'Visit notes after a shift',
              href: '/(support)/notes',
            },
          ],
        },
        {
          title: 'Communication',
          links: [
            {
              icon: 'chatbubble-outline',
              label: 'Messages',
              description: 'Talk to your care team',
              href: '/(support)/messages',
            },
            {
              icon: 'notifications-outline',
              label: 'Notifications',
              description: 'Updates about shifts and tasks',
              href: '/(support)/notifications',
            },
          ],
        },
        {
          title: 'Account',
          links: [
            {
              icon: 'person-outline',
              label: 'Profile',
              description: 'Your details and app settings',
              href: '/(support)/profile',
            },
          ],
        },
      ]}
    />
  );
}
