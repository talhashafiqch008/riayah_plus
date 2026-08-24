import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const ACTIVE = '#0D9488';
const INACTIVE = '#A8A29E';

export default function OrgTabsLayout() {
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
        name="requests"
        options={{
          title: 'Pending',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="file-tray-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="families"
        options={{
          title: 'Families',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coordinators"
        options={{
          title: 'Coordinators',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-add-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="ellipsis-horizontal" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
