import { evaluateGeofence, haversineDistanceMeters } from '../../services/gpsMath';

const DOHA: { lat: number; lng: number } = { lat: 25.2854, lng: 51.531 };

describe('GPS geofence math', () => {
  it('returns ~0m for the same point', () => {
    expect(haversineDistanceMeters(DOHA, DOHA)).toBeLessThan(1);
  });

  it('measures about 111m for 0.001° of latitude', () => {
    const north = { lat: DOHA.lat + 0.001, lng: DOHA.lng };
    const d = haversineDistanceMeters(DOHA, north);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(130);
  });

  it('flags within_radius inside the configured radius', () => {
    const nearby = { lat: DOHA.lat + 0.001, lng: DOHA.lng };
    const result = evaluateGeofence(nearby, DOHA, 300);
    expect(result.status).toBe('within_radius');
    expect(result.isWithinRadius).toBe(true);
    expect(result.radiusMeters).toBe(300);
  });

  it('flags out_of_radius beyond the radius without blocking the shape of the result', () => {
    const far = { lat: DOHA.lat + 0.01, lng: DOHA.lng };
    const result = evaluateGeofence(far, DOHA, 300);
    expect(result.status).toBe('out_of_radius');
    expect(result.isWithinRadius).toBe(false);
    expect(result.distanceMeters).toBeGreaterThan(300);
  });

  it('allows check-in when the visit has no address coordinates', () => {
    const result = evaluateGeofence(DOHA, null, 300);
    expect(result.status).toBe('no_address');
    expect(result.isWithinRadius).toBe(true);
    expect(result.distanceMeters).toBe(0);
  });
});
