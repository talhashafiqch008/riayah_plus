import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Register Expo push token with the API. Safe no-op on simulator / failure. */
export async function registerPushToken(): Promise<void> {
  try {
    // expo-constants: avoid bundling expo-device just for a simulator check
    if (Constants.isDevice === false) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await apiClient.post('/api/device-tokens', {
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
    });
  } catch {
    // Non-fatal — app must still work without push
  }
}
