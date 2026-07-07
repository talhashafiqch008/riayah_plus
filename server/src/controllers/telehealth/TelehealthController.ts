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
      body: `Join your session with ${session.provider.name}`,
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
        latitude: z.number(),
        longitude: z.number(),
      })
      .parse(req.body);

    const { GPSService } = await import('../../services/GPSService');

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { client: true },
    });
    if (!session) throw new AppError('Session not found.', 404);

    const geofenceResult = await GPSService.validateCheckin(
      { lat: latitude, lng: longitude },
      session.clientId
    );

    await prisma.session.update({
      where: { id: sessionId },
      data: {
        checkInAt: new Date(),
        checkInLat: latitude,
        checkInLng: longitude,
        isGeofenced: geofenceResult.isWithinRadius,
        geofenceStatus: geofenceResult.status,
      },
    });

    await GPSService.logCheckin(req.user!.userId, sessionId, { lat: latitude, lng: longitude }, geofenceResult);

    if (!geofenceResult.isWithinRadius) {
      // Notify coordinator of out-of-radius check-in
      const episode = session.episodeId
        ? await prisma.careEpisode.findUnique({ where: { id: session.episodeId } })
        : null;

      if (episode) {
        await NotificationService.create({
          userId: episode.coordinatorId,
          title: 'Out-of-Radius Check-In Detected',
          body: `Worker checked in ${geofenceResult.distanceMeters}m from the patient's address.`,
          type: 'gps_out_of_radius',
          data: { sessionId, distanceMeters: geofenceResult.distanceMeters },
        });
      }
    }

    res.json({ checkedIn: true, geofence: geofenceResult });
  }

  static async sessionCheckout(req: Request, res: Response): Promise<void> {
    const { sessionId, latitude, longitude } = z
      .object({ sessionId: z.string(), latitude: z.number(), longitude: z.number() })
      .parse(req.body);

    const { GPSService } = await import('../../services/GPSService');

    await prisma.session.update({
      where: { id: sessionId },
      data: { checkOutAt: new Date(), checkOutLat: latitude, checkOutLng: longitude },
    });

    await GPSService.logCheckout(req.user!.userId, sessionId, { lat: latitude, lng: longitude });

    res.json({ checkedOut: true });
  }
}
