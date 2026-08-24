import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function ClinicalMoreScreen() {
  return (
    <RoleMoreScreen
      profileHref="/(clinical)/profile"
      showSignOut
      sections={[
        {
          title: 'Clinical',
          links: [
            {
              icon: 'book-outline',
              label: 'Care Plans',
              description: 'Review plans and add an optional co-sign',
              href: '/(clinical)/plans',
            },
          ],
        },
        {
          title: 'Communication',
          links: [
            {
              icon: 'chatbubble-outline',
              label: 'Messages',
              description: 'Talk to families and the care team',
              href: '/(clinical)/messages',
            },
            {
              icon: 'notifications-outline',
              label: 'Notifications',
              description: 'Updates about assessments and notes',
              href: '/(clinical)/notifications',
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
              href: '/(clinical)/profile',
            },
          ],
        },
      ]}
    />
  );
}
