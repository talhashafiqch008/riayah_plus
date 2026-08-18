import * as Location from 'expo-location';

export interface ForegroundPosition {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export async function getForegroundPosition(): Promise<ForegroundPosition> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission is required to check in or out of a visit.');
  }

  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
  };
}
