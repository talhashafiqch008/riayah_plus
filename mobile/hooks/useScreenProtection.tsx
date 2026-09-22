import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Prevent screenshots / screen recording on PHI-heavy screens (MOB-07).
 * No-ops when the native module is unavailable.
 */
export function useScreenProtection(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let ScreenCapture: typeof import('expo-screen-capture') | null = null;

    void (async () => {
      try {
        ScreenCapture = await import('expo-screen-capture');
        if (cancelled) return;
        await ScreenCapture.preventScreenCaptureAsync();
      } catch {
        /* module missing or unsupported — non-fatal */
      }
    })();

    return () => {
      cancelled = true;
      void ScreenCapture?.allowScreenCaptureAsync().catch(() => undefined);
    };
  }, [enabled]);
}

/** Opaque overlay while backgrounded so recent-apps thumbnails hide PHI (MOB-07). */
export function AppSwitcherPrivacyOverlay({ active = true }: { active?: boolean }) {
  const insets = useSafeAreaInsets();
  const [obscured, setObscured] = useState(false);

  useEffect(() => {
    if (!active) {
      setObscured(false);
      return;
    }
    const sub = AppState.addEventListener('change', (state) => {
      setObscured(state !== 'active');
    });
    return () => sub.remove();
  }, [active]);

  if (!active || !obscured) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor: '#0f172a',
          zIndex: 9999,
          paddingTop: insets.top,
        },
      ]}
    />
  );
}
