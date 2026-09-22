import '../global.css';
import '../i18n/config';
import { useEffect, useState } from 'react';
import { ActivityIndicator, InteractionManager, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastProvider } from 'react-native-toast-notifications';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { persistOptions, queryClient } from '../lib/query/client';
import { useAuthStore } from '../stores/authStore';
import { useOfflineStore } from '../stores/offlineStore';
import { registerPushToken } from '../lib/notifications';
import { LanguagePreferenceGate } from '../components/LanguagePreferenceGate';
import { bootstrapUiLanguage, syncI18nToAccountLanguage } from '../lib/uiLanguage';
import i18n, { i18nReady } from '../i18n/config';
import { I18nextProvider } from 'react-i18next';

export { ErrorBoundary } from 'expo-router';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// LiveKit WebRTC globals — only in native builds (not Expo Go). Defer so splash can dismiss.
if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  queueMicrotask(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { registerGlobals } = require('@livekit/react-native') as typeof import('@livekit/react-native');
      registerGlobals();
    } catch {
      // Native module missing until `npx expo run:android` / `run:ios`.
    }
  });
}

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);
  const uiLanguage = useAuthStore((s) => s.user?.uiLanguage);
  const startListening = useOfflineStore((s) => s.startListening);
  const [rtlReady, setRtlReady] = useState(false);

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failSafe = setTimeout(() => {
      if (!cancelled && useAuthStore.getState().isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
      if (!cancelled) setRtlReady(true);
    }, 10_000);

    void (async () => {
      await i18nReady;
      // Must settle RTL before mounting the app shell (Yoga does not flip mid-tree).
      await bootstrapUiLanguage();
      if (cancelled) return;
      await hydrate();
      if (cancelled) return;
      const lang = useAuthStore.getState().user?.uiLanguage;
      if (lang === 'en' || lang === 'ar') {
        await syncI18nToAccountLanguage(lang);
      }
      if (!cancelled) setRtlReady(true);
    })().finally(() => {
      clearTimeout(failSafe);
      void SplashScreen.hideAsync().catch(() => undefined);
    });
    const unsubscribe = startListening();
    return () => {
      cancelled = true;
      clearTimeout(failSafe);
      unsubscribe();
    };
  }, [hydrate, startListening]);

  // Keep translations in sync if account language is already set (e.g. after gate).
  useEffect(() => {
    if (uiLanguage === 'en' || uiLanguage === 'ar') {
      void syncI18nToAccountLanguage(uiLanguage);
    }
  }, [uiLanguage]);

  // Defer push registration until after first paint — saves cold-start RAM/CPU
  useEffect(() => {
    if (!token) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void registerPushToken();
    });
    return () => task.cancel();
  }, [token]);

  if (isLoading || !rtlReady) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <ToastProvider>
              <BottomSheetModalProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
                <LanguagePreferenceGate />
              </BottomSheetModalProvider>
            </ToastProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
