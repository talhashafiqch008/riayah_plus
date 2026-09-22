import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../../lib/api/client';

const ACTIVE = '#0D9488';
const INACTIVE = '#A8A29E';

type FamilyNavBadges = {
  scheduledAppointments?: number;
  plansAwaitingReview?: number;
};

function badgeText(n?: number): string | undefined {
  if (!n || n <= 0) return undefined;
  return n > 99 ? '99+' : String(n);
}

export default function FamilyTabsLayout() {
  const { t } = useTranslation('family');
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
          title: t('mobile.tabs.home'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="episodes"
        options={{
          title: t('mobile.tabs.journey'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: t('mobile.tabs.appointments'),
          tabBarBadge: bookingsBadge,
          tabBarBadgeStyle: { backgroundColor: '#0D9488', fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="care-plans"
        options={{
          title: t('mobile.tabs.plans'),
          tabBarBadge: plansBadge,
          tabBarBadgeStyle: { backgroundColor: '#D97706', fontSize: 10 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('mobile.tabs.more'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
