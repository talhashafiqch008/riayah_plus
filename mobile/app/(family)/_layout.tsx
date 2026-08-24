import { Stack } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function FamilyLayout() {
  return (
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
  );
}
