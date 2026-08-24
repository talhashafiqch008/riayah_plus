import { useMemo } from 'react';
import type { ComponentType } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROLE } from '../shell/RoleChrome';
import type { VisitCheckinMapProps } from './visitMapTypes';

export type { MapCoord, VisitCheckinMapProps } from './visitMapTypes';

function mapsUrl(props: VisitCheckinMapProps): string | null {
  const dest = props.destination;
  const you = props.you;
  if (dest && you) {
    return `https://www.google.com/maps/dir/?api=1&origin=${you.latitude},${you.longitude}&destination=${dest.latitude},${dest.longitude}`;
  }
  if (dest) {
    return `https://www.google.com/maps/search/?api=1&query=${dest.latitude},${dest.longitude}`;
  }
  if (you) {
    return `https://www.google.com/maps/search/?api=1&query=${you.latitude},${you.longitude}`;
  }
  return null;
}

function VisitMapFallback(props: VisitCheckinMapProps) {
  const url = mapsUrl(props);

  return (
    <View style={styles.placeholder}>
      <Ionicons name="map-outline" size={28} color={ROLE.teal} />
      <Text style={styles.title}>
        {props.address ?? 'Patient address and your location'}
      </Text>
      {props.you ? (
        <Text style={styles.meta}>
          You: {props.you.latitude.toFixed(5)}, {props.you.longitude.toFixed(5)}
        </Text>
      ) : (
        <Text style={styles.meta}>Waiting for GPS…</Text>
      )}
      {props.destination ? (
        <Text style={styles.meta}>
          Patient: {props.destination.latitude.toFixed(5)}, {props.destination.longitude.toFixed(5)}
        </Text>
      ) : null}
      {url ? (
        <Pressable
          onPress={() => void Linking.openURL(url)}
          style={styles.button}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Open route in Maps</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type NativeMap = ComponentType<VisitCheckinMapProps>;

function loadNativeMap(): NativeMap | null {
  try {
    // Expo Go SDK 54 ships 1.20.1. Newer JS (RNMapsAirModule) crashes Go.
    const mod = require('./VisitCheckinMapNative') as {
      VisitCheckinMapNative: NativeMap;
    };
    return mod.VisitCheckinMapNative;
  } catch {
    return null;
  }
}

export function VisitCheckinMap(props: VisitCheckinMapProps) {
  const Native = useMemo(() => loadNativeMap(), []);
  if (!Native) return <VisitMapFallback {...props} />;
  return <Native {...props} />;
}

const styles = StyleSheet.create({
  placeholder: {
    minHeight: 180,
    borderRadius: 16,
    backgroundColor: ROLE.stone100,
    borderWidth: 1,
    borderColor: ROLE.stone200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: ROLE.stone900,
    textAlign: 'center',
  },
  meta: {
    fontSize: 12,
    color: ROLE.stone500,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: ROLE.teal,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: ROLE.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
