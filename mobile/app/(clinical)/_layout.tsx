import { Stack } from 'expo-router';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { CLINICAL_ROLES } from '../../stores/authStore';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function ClinicalLayout() {
  return (
    <RequireAuth roles={CLINICAL_ROLES}>
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
