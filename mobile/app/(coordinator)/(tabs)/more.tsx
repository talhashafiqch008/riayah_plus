import { RoleMoreScreen } from '../../../components/shell/RoleMore';

export default function CoordinatorMoreScreen() {
  return (
    <RoleMoreScreen
      profileHref="/(coordinator)/profile"
      sections={[
        {
          title: 'Care panel',
          links: [
            {
              icon: 'people-outline',
              label: 'Patients',
              description: 'Browse care units and open patient profiles',
              href: '/(coordinator)/patients',
            },
            {
              icon: 'calendar-outline',
              label: 'Schedule',
              description: 'Staff availability and care sessions',
              href: '/(coordinator)/schedule',
            },
            {
              icon: 'location-outline',
              label: 'Visit GPS',
              description: 'Map, check-ins, and check-outs for booked visits',
              href: '/(coordinator)/map',
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
              href: '/(coordinator)/messages',
            },
            {
              icon: 'notifications-outline',
              label: 'Notifications',
              description: 'Updates about intake and episodes',
              href: '/(coordinator)/notifications',
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
              href: '/(coordinator)/profile',
            },
          ],
        },
      ]}
    />
  );
}
