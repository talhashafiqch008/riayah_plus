import { Request, Response } from 'express';
import { z } from 'zod';
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { NotificationService } from '../../services/NotificationService';

export class TelehealthController {
  static async generateToken(req: Request, res: Response): Promise<void> {
    const { roomName, participantName } = z
      .object({ roomName: z.string(), participantName: z.string().optional() })
      .parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new AppError('User not found.', 404);

    const at = new AccessToken(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET, {
      identity: user.id,
      name: participantName ?? user.name,
      ttl: '2h',
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token, roomName, serverUrl: env.LIVEKIT_URL });
  }

  static async createRoom(req: Request, res: Response): Promise<void> {
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.body);

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { provider: true, client: true },
    });
    if (!session) throw new AppError('Session not found.', 404);

    const roomName = `session-${sessionId}`;

    const svc = new RoomServiceClient(
      env.LIVEKIT_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    );

    await svc.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 10,
    });

    await prisma.session.update({
      where: { id: sessionId },
      data: { livekitRoomId: roomName },
    });

    // Notify both parties
    await NotificationService.create({
      userId: session.clientId,
      title: 'Your telehealth session is ready',
      body: 'Your session is ready. Open the app to join.',
      type: 'telehealth_ready',
      data: { sessionId, roomName },
    });

    res.json({ roomName, serverUrl: env.LIVEKIT_URL });
  }

  static async getRoomInfo(req: Request, res: Response): Promise<void> {
    const { roomName } = req.params;

    const svc = new RoomServiceClient(
      env.LIVEKIT_URL,
      env.LIVEKIT_API_KEY,
      env.LIVEKIT_API_SECRET
    );

    const rooms = await svc.listRooms([roomName]);
    if (!rooms.length) throw new AppError('Room not found.', 404);

    res.json({ room: rooms[0] });
  }

  static async sessionCheckin(req: Request, res: Response): Promise<void> {
    const { sessionId, latitude, longitude } = z
      .object({
        sessionId: z.string(),
        latitude: z.number().gte(-90).lte(90),
        longitude: z.number().gte(-180).lte(180),
      })
      .parse(req.body);

    const { GPSService } = await import('../../services/GPSService');
    const session = await GPSService.loadSession(sessionId);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const result = await GPSService.applySessionCheckin({
      session,
      userId: req.user!.userId,
      coords: { lat: latitude, lng: longitude },
    });

    if (!result.geofence.isWithinRadius && result.geofence.status === 'out_of_radius') {
      if (session.episode?.coordinatorId) {
        await NotificationService.create({
          userId: session.episode.coordinatorId,
          title: 'Out-of-Radius Check-In Detected',
          body: `Worker checked in ${result.geofence.distanceMeters}m from the patient's address.`,
          type: 'gps_out_of_radius',
          data: { sessionId, distanceMeters: result.geofence.distanceMeters },
        });
      }
    }

    res.json({ checkedIn: true, geofence: result.geofence, checkInAt: result.checkInAt });
  }

  static async sessionCheckout(req: Request, res: Response): Promise<void> {
    const { sessionId, latitude, longitude } = z
      .object({
        sessionId: z.string(),
        latitude: z.number().gte(-90).lte(90),
        longitude: z.number().gte(-180).lte(180),
      })
      .parse(req.body);

    const { GPSService } = await import('../../services/GPSService');
    const session = await GPSService.loadSession(sessionId);
    GPSService.assertAssignedWorker(session, req.user!.userId);

    const result = await GPSService.applySessionCheckout({
      session,
      userId: req.user!.userId,
      coords: { lat: latitude, lng: longitude },
    });

    res.json({ checkedOut: true, checkOutAt: result.checkOutAt });
  }
}
