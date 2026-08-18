import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../lib/api/client';

const ACTIVE = '#0D9488';
const INACTIVE = '#A8A29E';

/** Routes reachable by navigation but never shown in the tab bar. */
const HIDDEN_ROUTES = [
  'care-unit/index',
  'care-unit/[unitId]',
  'care-unit/[unitId]/[patientId]',
  'episodes/[episodeId]',
  'care-plans/[id]',
  'documents/index',
  'messages/index',
  'messages/[id]',
  'telehealth/[id]',
  'invoices/index',
  'invoices/[id]',
  'notifications',
  'profile/index',
  'book/index',
  'episode/index',
  'episode/care-plan',
  'episode/sessions',
  'episode/assessments',
];

type FamilyNavBadges = {
  scheduledAppointments?: number;
  plansAwaitingReview?: number;
};

function badgeText(n?: number): string | undefined {
  if (!n || n <= 0) return undefined;
  return n > 99 ? '99+' : String(n);
}

export default function FamilyLayout() {
  const badgesQuery = useQuery({
    queryKey: ['family-nav-badges'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/shells/family/nav-badges');
      return (data.data ?? data) as FamilyNavBadges;
    },
    staleTime: 60_000,
    retry: false,
  });

  const bookingsBadge = badgeText(badgesQuery.data?.scheduledAppointments);
  const plansBadge = badgeText(badgesQuery.data?.plansAwaitingReview);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F5F5F4' },
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="episodes/index"
        options={{
          title: 'Journey',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: 'Appointments',
          tabBarBadge: bookingsBadge,
          tabBarBadgeStyle: { backgroundColor: '#0D9488', fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="care-plans/index"
        options={{
          title: 'Plans',
          tabBarBadge: plansBadge,
          tabBarBadgeStyle: { backgroundColor: '#D97706', fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more/index"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
      {HIDDEN_ROUTES.map((name) => (
        <Tabs.Screen key={name} name={name} options={{ href: null }} />
      ))}
    </Tabs>
  );
}
