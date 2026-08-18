import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE = '#0D9488';
const INACTIVE = '#A8A29E';

/** Reachable by navigation but never shown in the tab bar. */
const HIDDEN_ROUTES = [
  'analytics/index',
  'profile/index',
  'staff/index',
  'staff/[id]',
  'coordinators/[id]',
  'notifications',
];

export default function OrgLayout() {
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
        name="requests/index"
        options={{
          title: 'Pending',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="file-tray-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="families/index"
        options={{
          title: 'Families',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coordinators/index"
        options={{
          title: 'Coordinators',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
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
