import { Request, Response } from 'express';
import { z } from 'zod';
import { GPSService } from '../../services/GPSService';
import { AuditService } from '../../services/AuditService';
import { NotificationService } from '../../services/NotificationService';
import { AppError } from '../../middleware/errorHandler';
import { tenantOrgWhere } from '../../middleware/tenantScope';
import { assertTenantOrgAccess } from '../../middleware/tenantAccess';

const coordsSchema = z.object({
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  accuracy: z.number().positive().max(50_000).optional(),
  notes: z.string().max(5000).optional(),
});

const MAP_ROLES = new Set([
  'care_coordinator',
  'org_admin',
]);

function orgScope(req: Request): string | null {
  const tw = tenantOrgWhere(req);
  if (tw.organizationId === '__no_tenant__') {
    throw new AppError('No organization assigned to this account.', 403);
  }
  if (!tw.organizationId) {
    throw new AppError('No organization assigned to this account.', 403);
  }
  return tw.organizationId;
}

function assertMapRole(req: Request): void {
  if (!MAP_ROLES.has(req.user!.role)) {
    throw new AppError('Forbidden.', 403);
  }
}

function sessionOrganizationId(session: {
  episode?: { organizationId?: string | null } | null;
  provider?: { organizationId?: string | null } | null;
}): string | null {
  return session.episode?.organizationId ?? session.provider?.organizationId ?? null;
}

async function notifyOutOfRadius(
  session: Awaited<ReturnType<typeof GPSService.loadSession>>,
  sessionId: string,
  distanceMeters: number,
): Promise<void> {
  if (!session.episode?.coordinatorId) return;
  await NotificationService.create({
    userId: session.episode.coordinatorId,
    title: 'Out-of-Radius Check-In Detected',
    body: `Worker checked in ${distanceMeters}m from the patient's address.`,
    type: 'gps_out_of_radius',
    data: { sessionId, distanceMeters },
  });
}

export class GPSController {
  /** POST /gps/sessions/:id/validate — geofence preview, no write */
  static async validate(req: Request, res: Response): Promise<void> {
    const body = coordsSchema.omit({ notes: true }).parse(req.body);
    const session = await GPSService.loadSession(req.params.id);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const { geofence, target } = await GPSService.validateSessionCheckin(
      { lat: body.latitude, lng: body.longitude },
      session,
    );

    res.json({
      geofence,
      target: {
        source: target.source,
        address: target.address,
        lat: target.coords?.lat ?? null,
        lng: target.coords?.lng ?? null,
      },
    });
  }

  /** POST /gps/sessions/:id/checkin */
  static async checkin(req: Request, res: Response): Promise<void> {
    const body = coordsSchema.parse(req.body);
    const session = await GPSService.loadSession(req.params.id);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const result = await GPSService.applySessionCheckin({
      session,
      userId: req.user!.userId,
      coords: { lat: body.latitude, lng: body.longitude },
      accuracy: body.accuracy ?? null,
    });

    if (!result.geofence.isWithinRadius && result.geofence.status === 'out_of_radius') {
      await notifyOutOfRadius(session, session.id, result.geofence.distanceMeters);
    }

    await AuditService.log({
      userId: req.user!.userId,
      action: 'gps_checkin',
      entity: 'Session',
      entityId: session.id,
      after: {
        geofenceStatus: result.geofence.status,
        distanceMeters: result.geofence.distanceMeters,
        radiusMeters: result.geofence.radiusMeters,
      },
      req,
    });

    res.json({
      checkedIn: true,
      geofence: result.geofence,
      target: {
        source: result.target.source,
        address: result.target.address,
        lat: result.target.coords?.lat ?? null,
        lng: result.target.coords?.lng ?? null,
      },
      checkInAt: result.checkInAt,
    });
  }

  /** POST /gps/sessions/:id/ping — live location while checked in */
  static async ping(req: Request, res: Response): Promise<void> {
    const body = coordsSchema.omit({ notes: true }).parse(req.body);
    const session = await GPSService.loadSession(req.params.id);
    const result = await GPSService.applyLocationPing({
      session,
      userId: req.user!.userId,
      coords: { lat: body.latitude, lng: body.longitude },
      accuracy: body.accuracy ?? null,
    });

    res.json({
      pinged: result.pinged,
      skipped: result.skipped,
      lastSeenAt: result.lastSeenAt,
      geofence: result.geofence,
      coords: result.coords,
      target: {
        source: result.target.source,
        address: result.target.address,
        lat: result.target.coords?.lat ?? null,
        lng: result.target.coords?.lng ?? null,
      },
    });
  }

  /** POST /gps/sessions/:id/checkout */
  static async checkout(req: Request, res: Response): Promise<void> {
    const body = coordsSchema.parse(req.body);
    const session = await GPSService.loadSession(req.params.id);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const result = await GPSService.applySessionCheckout({
      session,
      userId: req.user!.userId,
      coords: { lat: body.latitude, lng: body.longitude },
      accuracy: body.accuracy ?? null,
      notes: body.notes ?? null,
    });

    await AuditService.log({
      userId: req.user!.userId,
      action: 'gps_checkout',
      entity: 'Session',
      entityId: session.id,
      req,
    });

    res.json({
      checkedOut: true,
      checkOutAt: result.checkOutAt,
    });
  }

  /** GET /gps/active-workers */
  static async activeWorkers(req: Request, res: Response): Promise<void> {
    assertMapRole(req);
    const organizationId = orgScope(req);
    const workers = await GPSService.listActiveWorkers(organizationId);
    res.json({ workers });
  }

  /** GET /gps/compliance — org-scoped check-in / check-out totals */
  static async compliance(req: Request, res: Response): Promise<void> {
    assertMapRole(req);
    const organizationId = orgScope(req);
    if (!organizationId) {
      throw new AppError('No organization assigned to this account.', 403);
    }
    const stats = await GPSService.complianceStats(organizationId);
    res.json(stats);
  }

  /** GET /gps/logs */
  static async logs(req: Request, res: Response): Promise<void> {
    assertMapRole(req);
    const organizationId = orgScope(req);
    const query = z
      .object({
        sessionId: z.string().min(1).optional(),
        workerId: z.string().min(1).optional(),
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
      .parse(req.query);

    const result = await GPSService.listLogs({
      organizationId,
      sessionId: query.sessionId,
      workerId: query.workerId,
      page: query.page,
      limit: query.limit,
    });
    res.json(result);
  }

  /** GET /gps/sessions/:id — replay points + logs for one visit */
  static async replay(req: Request, res: Response): Promise<void> {
    const session = await GPSService.loadSession(req.params.id);
    const isWorker = session.providerId === req.user!.userId;
    if (!isWorker) {
      assertMapRole(req);
      assertTenantOrgAccess(req, sessionOrganizationId(session));
    }

    const replay = await GPSService.getSessionReplay(session);
    res.json(replay);
  }
}
