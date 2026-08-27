import '../global.css';
import { useEffect } from 'react';
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
  const startListening = useOfflineStore((s) => s.startListening);

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const failSafe = setTimeout(() => {
      if (!cancelled && useAuthStore.getState().isLoading) {
        useAuthStore.setState({ isLoading: false });
      }
    }, 10_000);

    void hydrate().finally(() => {
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

  // Defer push registration until after first paint — saves cold-start RAM/CPU
  useEffect(() => {
    if (!token) return;
    const task = InteractionManager.runAfterInteractions(() => {
      void registerPushToken();
    });
    return () => task.cancel();
  }, [token]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ToastProvider>
            <BottomSheetModalProvider>
              <StatusBar style="dark" />
              <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
            </BottomSheetModalProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
