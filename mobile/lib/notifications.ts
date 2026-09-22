import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from './api/client';

type NotificationsModule = typeof import('expo-notifications');

const PUSH_TOKEN_KEY = 'expo_push_token';

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

/** Lazy-load so Expo Go does not crash on import (push APIs removed in SDK 53+). */
async function loadNotifications(): Promise<NotificationsModule | null> {
  if (isExpoGo()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

let handlerConfigured = false;

async function ensureHandler(Notifications: NotificationsModule): Promise<void> {
  if (handlerConfigured) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

/** Register Expo push token with the API. Safe no-op on Expo Go / simulator / failure. */
export async function registerPushToken(): Promise<void> {
  try {
    if (Constants.isDevice === false) return;

    const Notifications = await loadNotifications();
    if (!Notifications) return;

    await ensureHandler(Notifications);

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    // Expo push needs an EAS projectId; without it this throws loudly on device.
    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
    if (!projectId) return;

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

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
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token).catch(() => undefined);
  } catch {
    // Non-fatal — app must still work without push
  }
}

/** Deactivate this device's push token on the server (MOB-09). Call while auth is still valid. */
export async function revokePushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (!token) return;
    try {
      await apiClient.post('/api/device-tokens/revoke', { token });
    } catch {
      /* 404/network — still clear local */
    }
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
