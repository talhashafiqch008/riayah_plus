import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import {
  evaluateGeofence,
  pairFromLatLng,
  type Coordinates,
  type GeofenceResult,
} from './gpsMath';

export {
  evaluateGeofence,
  haversineDistanceMeters,
  pairFromLatLng,
} from './gpsMath';
export type { Coordinates, GeofenceResult, GeofenceStatus } from './gpsMath';

export interface VisitTarget {
  coords: Coordinates | null;
  address: string | null;
  source: 'session' | 'care_unit' | 'client_profile' | 'none';
}

const CLOSED_SESSION_STATUSES = new Set(['cancelled', 'completed', 'rejected', 'no_show']);

export function checkinRadiusMeters(): number {
  const n = env.GPS_CHECKIN_RADIUS_METERS;
  return Number.isFinite(n) && n > 0 ? n : 300;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n =
    typeof value === 'object' && value !== null && 'toNumber' in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return Number.isFinite(n) ? n : null;
}

const sessionVisitInclude = {
  episode: {
    select: {
      id: true,
      coordinatorId: true,
      organizationId: true,
      title: true,
      patientId: true,
      careUnit: { select: { id: true, address: true, city: true, country: true } },
    },
  },
  client: { select: { id: true, name: true, clientProfile: { select: { address: true, city: true } } } },
  provider: { select: { id: true, name: true, organizationId: true } },
} satisfies Prisma.SessionInclude;

export type SessionForGps = Prisma.SessionGetPayload<{ include: typeof sessionVisitInclude }>;

function formatAddress(parts: Array<string | null | undefined>): string | null {
  const text = parts
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean)
    .join(', ');
  return text || null;
}

export class GPSService {
  static async geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!env.GOOGLE_MAPS_API_KEY) return null;
    try {
      const { default: axios } = await import('axios');
      const response = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json`, {
        params: { address, key: env.GOOGLE_MAPS_API_KEY },
      });

      const result = response.data?.results?.[0]?.geometry?.location;
      if (!result) return null;
      return { lat: result.lat, lng: result.lng };
    } catch {
      return null;
    }
  }

  static async resolveVisitTarget(session: {
    latitude?: unknown;
    longitude?: unknown;
    clientId: string;
    episode?: {
      careUnit?: { address?: string | null; city?: string | null; country?: string | null } | null;
    } | null;
    client?: { clientProfile?: { address?: string | null; city?: string | null } | null } | null;
  }): Promise<VisitTarget> {
    const fromSession = pairFromLatLng(session.latitude, session.longitude);
    if (fromSession) {
      return { coords: fromSession, address: null, source: 'session' };
    }

    const careUnitAddress = formatAddress([
      session.episode?.careUnit?.address,
      session.episode?.careUnit?.city,
      session.episode?.careUnit?.country,
    ]);
    if (careUnitAddress) {
      const geocoded = await GPSService.geocodeAddress(careUnitAddress);
      if (geocoded) {
        return { coords: geocoded, address: careUnitAddress, source: 'care_unit' };
      }
      return { coords: null, address: careUnitAddress, source: 'care_unit' };
    }

    let profileAddress =
      formatAddress([
        session.client?.clientProfile?.address,
        session.client?.clientProfile?.city,
      ]) ?? null;

    if (!profileAddress) {
      const profile = await prisma.clientProfile.findUnique({
        where: { userId: session.clientId },
        select: { address: true, city: true },
      });
      profileAddress = formatAddress([profile?.address, profile?.city]);
    }

    if (profileAddress) {
      const geocoded = await GPSService.geocodeAddress(profileAddress);
      if (geocoded) {
        return { coords: geocoded, address: profileAddress, source: 'client_profile' };
      }
      return { coords: null, address: profileAddress, source: 'client_profile' };
    }

    return { coords: null, address: null, source: 'none' };
  }

  static async validateCheckin(
    workerCoords: Coordinates,
    patientUserId: string,
  ): Promise<GeofenceResult> {
    const profile = await prisma.clientProfile.findUnique({
      where: { userId: patientUserId },
    });

    if (!profile?.address) {
      return evaluateGeofence(workerCoords, null, checkinRadiusMeters());
    }

    if (!env.GOOGLE_MAPS_API_KEY) {
      logger.warn('GPS geofencing: GOOGLE_MAPS_API_KEY not set, skipping geofence check');
      return evaluateGeofence(workerCoords, null, checkinRadiusMeters());
    }

    const geocoded = await GPSService.geocodeAddress(profile.address);
    return evaluateGeofence(workerCoords, geocoded, checkinRadiusMeters());
  }

  static async validateSessionCheckin(
    workerCoords: Coordinates,
    session: Parameters<typeof GPSService.resolveVisitTarget>[0],
  ): Promise<{ geofence: GeofenceResult; target: VisitTarget }> {
    const target = await GPSService.resolveVisitTarget(session);
    if (target.address && !target.coords && !env.GOOGLE_MAPS_API_KEY) {
      logger.warn('GPS geofencing: GOOGLE_MAPS_API_KEY not set, skipping geofence check');
    }
    return { geofence: evaluateGeofence(workerCoords, target.coords, checkinRadiusMeters()), target };
  }

  static async logCheckin(
    userId: string,
    sessionId: string | null,
    coords: Coordinates,
    geofenceResult: GeofenceResult,
    extras?: { accuracy?: number | null; address?: string | null },
  ) {
    return prisma.gpsLog.create({
      data: {
        userId,
        sessionId,
        eventType: 'checkin',
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: extras?.accuracy ?? null,
        address: extras?.address ?? null,
        geofenced: geofenceResult.isWithinRadius,
        geofenceStatus: geofenceResult.status,
        metadata: {
          distanceMeters: geofenceResult.distanceMeters,
          radiusMeters: geofenceResult.radiusMeters,
        } as object,
      },
    });
  }

  static async logCheckout(
    userId: string,
    sessionId: string | null,
    coords: Coordinates,
    extras?: { accuracy?: number | null },
  ) {
    return prisma.gpsLog.create({
      data: {
        userId,
        sessionId,
        eventType: 'checkout',
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: extras?.accuracy ?? null,
        geofenced: true,
        geofenceStatus: 'checkout',
      },
    });
  }

  static async loadSession(sessionId: string): Promise<SessionForGps> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: sessionVisitInclude,
    });
    if (!session) throw new AppError('Session not found.', 404);
    return session;
  }

  static assertAssignedWorker(session: { providerId: string }, userId: string): void {
    if (session.providerId !== userId) {
      throw new AppError('Only the assigned worker can check in or out of this visit.', 403);
    }
  }

  static async applySessionCheckin(opts: {
    session: SessionForGps;
    userId: string;
    coords: Coordinates;
    accuracy?: number | null;
  }): Promise<{
    sessionId: string;
    checkedIn: true;
    geofence: GeofenceResult;
    target: VisitTarget;
    checkInAt: Date;
  }> {
    const { session, userId, coords, accuracy } = opts;

    if (CLOSED_SESSION_STATUSES.has(session.status)) {
      throw new AppError('This session is closed and cannot be checked in.', 422);
    }
    if (session.checkOutAt) {
      throw new AppError('This session has already been checked out.', 409);
    }
    if (session.checkInAt) {
      throw new AppError('Already checked in to this session.', 409);
    }

    const { geofence, target } = await GPSService.validateSessionCheckin(coords, session);

    const persistTarget = !pairFromLatLng(session.latitude, session.longitude) && target.coords;

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: {
        checkInAt: new Date(),
        checkInLat: coords.lat,
        checkInLng: coords.lng,
        isGeofenced: geofence.isWithinRadius,
        geofenceStatus: geofence.status,
        status: session.status === 'accepted' || session.status === 'pending' ? 'in_progress' : session.status,
        ...(persistTarget
          ? { latitude: target.coords!.lat, longitude: target.coords!.lng }
          : {}),
      },
    });

    await GPSService.logCheckin(userId, session.id, coords, geofence, {
      accuracy,
      address: target.address,
    });

    return {
      sessionId: session.id,
      checkedIn: true,
      geofence,
      target,
      checkInAt: updated.checkInAt ?? new Date(),
    };
  }

  static async applySessionCheckout(opts: {
    session: SessionForGps;
    userId: string;
    coords: Coordinates;
    accuracy?: number | null;
    notes?: string | null;
  }): Promise<{ sessionId: string; checkedOut: true; checkOutAt: Date }> {
    const { session, userId, coords, accuracy, notes } = opts;

    if (!session.checkInAt) {
      throw new AppError('Check in before checking out.', 422);
    }
    if (session.checkOutAt) {
      throw new AppError('Already checked out of this session.', 409);
    }

    const updated = await prisma.session.update({
      where: { id: session.id },
      data: {
        checkOutAt: new Date(),
        checkOutLat: coords.lat,
        checkOutLng: coords.lng,
        ...(notes
          ? { notes: session.notes ? `${session.notes}\n${notes}` : notes }
          : {}),
      },
    });

    await GPSService.logCheckout(userId, session.id, coords, { accuracy });

    return {
      sessionId: session.id,
      checkedOut: true,
      checkOutAt: updated.checkOutAt ?? new Date(),
    };
  }

  static async listActiveWorkers(organizationId: string | null | undefined) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where: Prisma.SessionWhereInput = {
      checkInAt: { not: null, gte: since },
      checkOutAt: null,
      status: { notIn: ['cancelled', 'completed', 'rejected', 'no_show'] },
    };
    if (organizationId) {
      where.OR = [
        { episode: { organizationId } },
        { episodeId: null, provider: { organizationId } },
      ];
    }

    const sessions = await prisma.session.findMany({
      where,
      orderBy: { checkInAt: 'desc' },
      take: 200,
      include: {
        provider: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        episode: { select: { id: true, title: true, organizationId: true } },
        gpsLogs: {
          where: { eventType: 'checkin' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { metadata: true },
        },
      },
    });

    return sessions.map((s) => {
      const coords = pairFromLatLng(s.checkInLat, s.checkInLng);
      const meta = s.gpsLogs[0]?.metadata;
      const distanceMeters =
        meta && typeof meta === 'object' && 'distanceMeters' in meta
          ? Number((meta as { distanceMeters?: unknown }).distanceMeters)
          : null;
      return {
        workerId: s.providerId,
        name: s.provider.name,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        patientName: s.client.name,
        patientId: s.clientId,
        sessionId: s.id,
        episodeId: s.episodeId,
        episodeTitle: s.episode?.title ?? null,
        checkInAt: s.checkInAt,
        geofenceStatus: s.geofenceStatus,
        withinGeofence: s.isGeofenced,
        shiftStart: s.checkInAt,
        distanceMeters: Number.isFinite(distanceMeters) ? distanceMeters : null,
      };
    });
  }

  static async listLogs(opts: {
    organizationId?: string | null;
    sessionId?: string;
    workerId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 50));
    const where: Prisma.GpsLogWhereInput = {};

    if (opts.sessionId) where.sessionId = opts.sessionId;
    if (opts.workerId) where.userId = opts.workerId;

    if (opts.organizationId) {
      where.OR = [
        { session: { episode: { organizationId: opts.organizationId } } },
        { sessionId: null, user: { organizationId: opts.organizationId } },
        { session: { episodeId: null, provider: { organizationId: opts.organizationId } } },
      ];
    }

    const [rows, total] = await Promise.all([
      prisma.gpsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, role: true } },
          session: {
            select: {
              id: true,
              scheduledAt: true,
              client: { select: { id: true, name: true } },
              geofenceStatus: true,
              isGeofenced: true,
            },
          },
        },
      }),
      prisma.gpsLog.count({ where }),
    ]);

    return {
      data: rows.map(serializeGpsLog),
      meta: { page, limit, total },
    };
  }

  static async getSessionReplay(session: SessionForGps) {
    const logs = await prisma.gpsLog.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
    });

    const target = await GPSService.resolveVisitTarget(session);
    const checkIn = pairFromLatLng(session.checkInLat, session.checkInLng);
    const checkOut = pairFromLatLng(session.checkOutLat, session.checkOutLng);

    return {
      session: {
        id: session.id,
        providerId: session.providerId,
        providerName: session.provider.name,
        clientId: session.clientId,
        clientName: session.client.name,
        scheduledAt: session.scheduledAt,
        checkInAt: session.checkInAt,
        checkOutAt: session.checkOutAt,
        geofenceStatus: session.geofenceStatus,
        withinGeofence: session.isGeofenced,
        type: session.type,
        status: session.status,
      },
      target: {
        lat: target.coords?.lat ?? null,
        lng: target.coords?.lng ?? null,
        address: target.address,
        source: target.source,
        radiusMeters: checkinRadiusMeters(),
      },
      points: [
        ...(checkIn
          ? [
              {
                kind: 'checkin' as const,
                lat: checkIn.lat,
                lng: checkIn.lng,
                at: session.checkInAt,
              },
            ]
          : []),
        ...logs.map((log) => ({
          kind: log.eventType,
          lat: Number(log.latitude),
          lng: Number(log.longitude),
          at: log.createdAt,
          geofenceStatus: log.geofenceStatus,
          geofenced: log.geofenced,
        })),
        ...(checkOut
          ? [
              {
                kind: 'checkout' as const,
                lat: checkOut.lat,
                lng: checkOut.lng,
                at: session.checkOutAt,
              },
            ]
          : []),
      ],
      logs: logs.map(serializeGpsLog),
    };
  }
}

function serializeGpsLog(log: {
  id: string;
  userId: string;
  sessionId: string | null;
  eventType: string;
  latitude: unknown;
  longitude: unknown;
  accuracy: unknown;
  address: string | null;
  geofenced: boolean;
  geofenceStatus: string | null;
  metadata: unknown;
  createdAt: Date;
  user?: { id: string; name: string; role?: string } | null;
  session?: {
    id: string;
    scheduledAt: Date;
    client?: { id: string; name: string } | null;
    geofenceStatus?: string | null;
    isGeofenced?: boolean;
  } | null;
}) {
  const meta =
    log.metadata && typeof log.metadata === 'object' ? (log.metadata as Record<string, unknown>) : {};
  return {
    id: log.id,
    userId: log.userId,
    sessionId: log.sessionId,
    eventType: log.eventType,
    latitude: Number(log.latitude),
    longitude: Number(log.longitude),
    accuracy: toNumber(log.accuracy),
    address: log.address,
    geofenced: log.geofenced,
    geofenceStatus: log.geofenceStatus,
    distanceMeters: typeof meta.distanceMeters === 'number' ? meta.distanceMeters : null,
    radiusMeters: typeof meta.radiusMeters === 'number' ? meta.radiusMeters : null,
    createdAt: log.createdAt,
    worker: log.user ? { id: log.user.id, name: log.user.name, role: log.user.role } : undefined,
    client: log.session?.client ?? undefined,
    sessionScheduledAt: log.session?.scheduledAt ?? undefined,
  };
}
