import { Stack } from 'expo-router';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { COORDINATOR_ROLES } from '../../stores/authStore';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function CoordinatorLayout() {
  return (
    <RequireAuth roles={COORDINATOR_ROLES}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false, animation: 'none' }} />
      </Stack>
    </RequireAuth>
  );
}
