import { View } from 'react-native';
import { Stack } from 'expo-router';
import { AdminDrawer } from '../../components/admin/AdminDrawer';

/**
 * Admin uses a Stack + hamburger drawer (not bottom tabs).
 * Drawer mounts once here — never per-screen — so stack depth doesn't open N Modals.
 */
export default function AdminLayout() {
  return (
    <View className="flex-1">
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#FAFAF9' },
        }}
      />
      <AdminDrawer />
    </View>
  );
}
