import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { LiveKitRoomWebView } from './LiveKitRoomWebView';
import { registerTelehealthSession } from '../../lib/telehealthSession';
import { AppSwitcherPrivacyOverlay, useScreenProtection } from '../../hooks/useScreenProtection';

type Props = {
  token: string;
  serverUrl: string;
  onDisconnected?: () => void;
};

function canUseNativeLiveKit(): boolean {
  // Native WebRTC modules are not available inside Expo Go.
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

/**
 * Picks native LiveKit (dev/production builds) or an improved WebView fallback (Expo Go).
 */
export function TelehealthVideoRoom({ token, serverUrl, onDisconnected }: Props) {
  const [ready, setReady] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);
  const useNative = useMemo(() => canUseNativeLiveKit(), []);

  useScreenProtection(true);

  useEffect(() => {
    return registerTelehealthSession(() => {
      onDisconnected?.();
    });
  }, [onDisconnected]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const cam = await Camera.requestCameraPermissionsAsync();
        const mic = await Audio.requestPermissionsAsync();
        if (cancelled) return;
        if (cam.status !== 'granted' || mic.status !== 'granted') {
          setPermError(
            'Camera and microphone permission are required for video visits. Enable them in system settings, then try again.',
          );
          setReady(true);
          return;
        }
        setPermError(null);
      } catch {
        if (!cancelled) {
          setPermError('Could not request camera/microphone permissions.');
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1c1917' }}>
        <ActivityIndicator color="#0d9488" />
        <Text style={{ color: '#a8a29e', marginTop: 12, fontSize: 13 }}>Preparing camera…</Text>
      </View>
    );
  }

  if (permError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#1c1917' }}>
        <Text style={{ color: '#fecaca', fontSize: 15, lineHeight: 22, textAlign: 'center' }}>
          {permError}
        </Text>
      </View>
    );
  }

  if (useNative) {
    // Lazy require so Expo Go does not evaluate native modules at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LiveKitCallRoom } = require('./LiveKitCallRoom') as typeof import('./LiveKitCallRoom');
    return (
      <View style={{ flex: 1 }}>
        <LiveKitCallRoom token={token} serverUrl={serverUrl} onDisconnected={onDisconnected} />
        <AppSwitcherPrivacyOverlay />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {Platform.OS === 'android' ? (
        <Text
          style={{
            backgroundColor: '#44403c',
            color: '#fde68a',
            fontSize: 11,
            paddingHorizontal: 10,
            paddingVertical: 6,
            textAlign: 'center',
          }}
        >
          Expo Go uses a limited WebView call. For reliable camera, chat, and screen share, run a
          development build (`npx expo run:android`).
        </Text>
      ) : null}
      <LiveKitRoomWebView token={token} serverUrl={serverUrl} onDisconnected={onDisconnected} />
      <AppSwitcherPrivacyOverlay />
    </View>
  );
}
