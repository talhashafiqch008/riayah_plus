export interface Coordinates {
  lat: number;
  lng: number;
}

export type GeofenceStatus = 'within_radius' | 'out_of_radius' | 'no_address';

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  status: GeofenceStatus;
  radiusMeters: number;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n =
    typeof value === 'object' && value !== null && 'toNumber' in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function pairFromLatLng(lat: unknown, lng: unknown): Coordinates | null {
  const a = toNumber(lat);
  const b = toNumber(lng);
  if (a === null || b === null) return null;
  if (a === 0 && b === 0) return null;
  return { lat: a, lng: b };
}

/**
 * Haversine formula — distance between two GPS coordinates in metres.
 */
export function haversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aCalc =
    sinLat * sinLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c;
}

export function evaluateGeofence(
  worker: Coordinates,
  target: Coordinates | null,
  radiusMeters: number,
): GeofenceResult {
  if (!target) {
    return {
      isWithinRadius: true,
      distanceMeters: 0,
      status: 'no_address',
      radiusMeters,
    };
  }

  const distanceMeters = Math.round(haversineDistanceMeters(worker, target));
  const isWithinRadius = distanceMeters <= radiusMeters;
  return {
    isWithinRadius,
    distanceMeters,
    status: isWithinRadius ? 'within_radius' : 'out_of_radius',
    radiusMeters,
  };
}
