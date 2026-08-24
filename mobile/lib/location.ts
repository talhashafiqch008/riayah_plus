import * as Location from 'expo-location';

export interface ForegroundPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export async function ensureForegroundPermission(): Promise<void> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to check in or out of a visit.');
  }
}

export async function getForegroundPosition(): Promise<ForegroundPosition> {
  await ensureForegroundPermission();

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
  };
}

export async function watchForegroundPosition(
  onUpdate: (pos: ForegroundPosition) => void,
): Promise<() => void> {
  await ensureForegroundPermission();

  const sub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 4000,
      distanceInterval: 8,
    },
    (loc) => {
      onUpdate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
      });
    },
  );

  return () => sub.remove();
}
