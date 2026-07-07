import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  status: 'within_radius' | 'out_of_radius' | 'no_address';
}

/**
 * Haversine formula — distance between two GPS coordinates in metres
 */
function haversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const aCalc =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
  return R * c;
}

export class GPSService {
  static async validateCheckin(
    workerCoords: Coordinates,
    patientUserId: string
  ): Promise<GeofenceResult> {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: patientUserId },
    });

    // If no address coordinates on file, allow but flag
    if (!profile?.address) {
      return { isWithinRadius: true, distanceMeters: 0, status: 'no_address' };
    }

    // In a real system, geocode the address via Google Maps API
    // Here we check if GPS coordinates are stored on the patient profile
    // For now we return a permissive result if geocoding is not configured
    if (!env.GOOGLE_MAPS_API_KEY) {
      logger.warn('GPS geofencing: GOOGLE_MAPS_API_KEY not set, skipping geofence check');
      return { isWithinRadius: true, distanceMeters: 0, status: 'no_address' };
    }

    // Geocode patient address
    const geocoded = await GPSService.geocodeAddress(profile.address);
    if (!geocoded) {
      return { isWithinRadius: true, distanceMeters: 0, status: 'no_address' };
    }

    const distanceMeters = haversineDistanceMeters(workerCoords, geocoded);
    const isWithinRadius = distanceMeters <= env.GPS_CHECKIN_RADIUS_METERS;

    return {
      isWithinRadius,
      distanceMeters: Math.round(distanceMeters),
      status: isWithinRadius ? 'within_radius' : 'out_of_radius',
    };
  }

  static async geocodeAddress(address: string): Promise<Coordinates | null> {
    try {
      const { default: axios } = await import('axios');
      const response = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json`,
        {
          params: { address, key: env.GOOGLE_MAPS_API_KEY },
        }
      );

      const result = response.data?.results?.[0]?.geometry?.location;
      if (!result) return null;
      return { lat: result.lat, lng: result.lng };
    } catch {
      return null;
    }
  }

  static async logCheckin(
    userId: string,
    sessionId: string | null,
    coords: Coordinates,
    geofenceResult: GeofenceResult
  ) {
    return prisma.gpsLog.create({
      data: {
        userId,
        eventType: 'checkin',
        latitude: coords.lat,
        longitude: coords.lng,
        geofenced: geofenceResult.isWithinRadius,
        geofenceStatus: geofenceResult.status,
        metadata: { distanceMeters: geofenceResult.distanceMeters } as object,
      },
    });
  }

  static async logCheckout(userId: string, sessionId: string | null, coords: Coordinates) {
    return prisma.gpsLog.create({
      data: {
        userId,
        sessionId,
        eventType: 'checkout',
        latitude: coords.lat,
        longitude: coords.lng,
        geofenced: true,
        geofenceStatus: 'checkout',
      },
    });
  }
}
