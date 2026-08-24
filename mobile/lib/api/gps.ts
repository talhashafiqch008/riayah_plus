/**
 * Visit GPS — check-in/out, geofence, coordinator map, admin logs/replay.
 * Paths match mern/server GPS routes under /api/gps.
 */

import { apiClient } from './client';

export type GeofenceStatus = 'within_radius' | 'out_of_radius' | 'no_address' | 'checkout' | string;

export interface GeofenceResult {
  isWithinRadius: boolean;
  distanceMeters: number;
  status: GeofenceStatus;
  radiusMeters: number;
}

export interface GpsTarget {
  source: 'session' | 'care_unit' | 'client_profile' | 'none' | string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  radiusMeters?: number;
}

export interface GpsCheckinResponse {
  checkedIn: boolean;
  geofence: GeofenceResult;
  target?: GpsTarget;
  checkInAt?: string;
}

export interface GpsCheckoutResponse {
  checkedOut: boolean;
  checkOutAt?: string;
}

export interface GpsValidateResponse {
  geofence: GeofenceResult;
  target: GpsTarget;
}

export interface ActiveWorker {
  workerId: string;
  name: string;
  lat: number | null;
  lng: number | null;
  targetLat?: number | null;
  targetLng?: number | null;
  patientName: string;
  patientId?: string;
  sessionId: string;
  episodeId?: string | null;
  episodeTitle?: string | null;
  checkInAt: string | null;
  lastSeenAt?: string | null;
  isLive?: boolean;
  liveSource?: 'ping' | 'checkin' | string;
  geofenceStatus: string | null;
  withinGeofence: boolean;
  shiftStart: string | null;
  distanceMeters: number | null;
}

export interface GpsLogRow {
  id: string;
  userId: string;
  sessionId: string | null;
  eventType: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  address: string | null;
  geofenced: boolean;
  geofenceStatus: string | null;
  distanceMeters: number | null;
  radiusMeters: number | null;
  createdAt: string;
  worker?: { id: string; name: string; role?: string };
  client?: { id: string; name: string };
  sessionScheduledAt?: string;
}

export interface GpsReplay {
  session: {
    id: string;
    providerId: string;
    providerName: string;
    clientId: string;
    clientName: string;
    scheduledAt: string;
    checkInAt: string | null;
    checkOutAt: string | null;
    geofenceStatus: string | null;
    withinGeofence: boolean;
    type: string;
    status: string;
  };
  target: {
    lat: number | null;
    lng: number | null;
    address: string | null;
    source: string;
    radiusMeters: number;
  };
  points: Array<{
    kind: string;
    lat: number;
    lng: number;
    at: string | null;
    geofenceStatus?: string | null;
    geofenced?: boolean;
  }>;
  logs: GpsLogRow[];
}

export async function validateVisitGps(
  sessionId: string,
  coords: { latitude: number; longitude: number },
) {
  const { data } = await apiClient.post(`/api/gps/sessions/${sessionId}/validate`, coords);
  return data as GpsValidateResponse;
}

export async function pingVisitLocation(
  sessionId: string,
  coords: { latitude: number; longitude: number; accuracy?: number | null },
) {
  const { data } = await apiClient.post(`/api/gps/sessions/${sessionId}/ping`, coords);
  return data as {
    pinged: boolean;
    skipped?: boolean;
    lastSeenAt?: string;
    geofence?: GeofenceResult;
  };
}

export async function checkInVisit(
  sessionId: string,
  coords: { latitude: number; longitude: number; accuracy?: number | null },
) {
  const { data } = await apiClient.post(`/api/gps/sessions/${sessionId}/checkin`, coords);
  return data as GpsCheckinResponse;
}

export async function checkOutVisit(
  sessionId: string,
  coords: { latitude: number; longitude: number; accuracy?: number | null; notes?: string },
) {
  const { data } = await apiClient.post(`/api/gps/sessions/${sessionId}/checkout`, coords);
  return data as GpsCheckoutResponse;
}

export async function listActiveWorkers() {
  const { data } = await apiClient.get('/api/gps/active-workers');
  return (data.workers ?? []) as ActiveWorker[];
}

export async function listGpsLogs(params?: {
  sessionId?: string;
  workerId?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await apiClient.get('/api/gps/logs', { params });
  const payload = (data?.data ?? data) as {
    data?: GpsLogRow[];
    meta?: { page: number; limit: number; total: number };
  };
  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : [];
  return {
    data: rows,
    meta: payload && !Array.isArray(payload) ? payload.meta : undefined,
  };
}

export async function getGpsReplay(sessionId: string) {
  const { data } = await apiClient.get(`/api/gps/sessions/${sessionId}`);
  return data as GpsReplay;
}
