import * as Location from 'expo-location';

export interface ForegroundPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  /** Android mock-location signal when the platform exposes it (MOB-06). */
  mocked: boolean | null;
  timestamp: number;
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

  const mockedRaw = (pos as unknown as { mocked?: boolean }).mocked;
  const coordsMocked = (pos.coords as unknown as { mocked?: boolean }).mocked;
  const mocked =
    typeof mockedRaw === 'boolean'
      ? mockedRaw
      : typeof coordsMocked === 'boolean'
        ? coordsMocked
        : null;

  if (mocked === true) {
    throw new Error('Mock location detected. Disable mock/fake GPS to check in.');
  }

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    mocked,
    timestamp: pos.timestamp,
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
      const mockedRaw = (loc as unknown as { mocked?: boolean }).mocked;
      const mocked = typeof mockedRaw === 'boolean' ? mockedRaw : null;
      onUpdate({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
        mocked,
        timestamp: loc.timestamp,
      });
    },
  );

  return () => sub.remove();
}
