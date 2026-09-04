import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import { createPhiS3Client, isPhiKmsConfigured, isPhiS3Configured } from '../utils/phiS3';
import {
  canAdmitMeeting,
  canCreateSessionRoom,
  canJoinMeeting,
  canJoinSessionRoom,
  parseSessionIdFromRoom,
  sessionRoomName,
  type MeetingAccessRow,
  type SessionAccessRow,
  type TelehealthActor,
} from './LiveKitAccess';

export const RECORDING_UNAVAILABLE = 'recording_unavailable';

export type RecordingKind = 'session' | 'meeting';

export type EgressFileInfo = {
  fileResults?: { location?: string }[];
  file?: { location?: string };
};

export function isPlaceholderLiveKitUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!u) return true;
  return u.includes('your-livekit') || u.includes('mock.livekit');
}

export function isS3Configured(): boolean {
  return isPhiS3Configured();
}

export function isRecordingPipelineReady(): boolean {
  return (
    Boolean(env.LIVEKIT_API_KEY?.trim() && env.LIVEKIT_API_SECRET?.trim()) &&
    !isPlaceholderLiveKitUrl(env.LIVEKIT_URL || '') &&
    isS3Configured() &&
    (!env.isProd || isPhiKmsConfigured())
  );
}

export function livekitHttpHost(url: string): string {
  return url.replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
}

export function resolveRecordingTarget(
  roomName: string,
): { kind: 'session'; id: string } | { kind: 'meeting'; roomName: string } {
  const sessionId = parseSessionIdFromRoom(roomName);
  if (sessionId) return { kind: 'session', id: sessionId };
  return { kind: 'meeting', roomName: roomName.replace(/__waiting$/, '') };
}

export function recordingLocationFromEgress(info: EgressFileInfo | undefined | null): string | null {
  if (!info) return null;
  const fromResults = info.fileResults?.[0]?.location?.trim();
  if (fromResults) return fromResults;
  const fromFile = info.file?.location?.trim();
  if (fromFile) return fromFile;
  try {
    const raw = JSON.parse(JSON.stringify(info)) as {
      file?: { location?: string };
      fileResults?: { location?: string }[];
    };
    return raw.fileResults?.[0]?.location?.trim() || raw.file?.location?.trim() || null;
  } catch {
    return null;
  }
}

export function s3KeyFromRecordingUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  if (value.startsWith('telehealth-recordings/')) return value;
  try {
    if (value.startsWith('s3://')) {
      const without = value.slice('s3://'.length);
      const slash = without.indexOf('/');
      if (slash < 0) return null;
      return decodeURIComponent(without.slice(slash + 1));
    }
    const parsed = new URL(value);
    if (!parsed.hostname.includes('amazonaws.com') && !parsed.hostname.includes('.s3.')) {
      return null;
    }
    return decodeURIComponent(parsed.pathname.replace(/^\//, '')) || null;
  } catch {
    return null;
  }
}

export function canStartRecording(
  kind: RecordingKind,
  row: SessionAccessRow | MeetingAccessRow,
  actor: TelehealthActor,
): boolean {
  if (kind === 'session') return canCreateSessionRoom(row as SessionAccessRow, actor);
  return canAdmitMeeting(row as MeetingAccessRow, actor);
}

export function canViewRecording(
  kind: RecordingKind,
  row: SessionAccessRow | MeetingAccessRow,
  actor: TelehealthActor,
): boolean {
  if (kind === 'session') return canJoinSessionRoom(row as SessionAccessRow, actor);
  return canJoinMeeting(row as MeetingAccessRow, actor);
}

function assertPipelineReady(): void {
  if (isRecordingPipelineReady()) return;
  throw new AppError('Recording is not available until LiveKit and S3 are configured.', 503, {
    code: RECORDING_UNAVAILABLE,
  });
}

function s3Output(filepath: string): EncodedFileOutput {
  // LiveKit S3Upload does not expose SSE headers; bucket default encryption must use
  // TELEHEALTH_RECORDING_KMS_KEY (validated at startup in production).
  return new EncodedFileOutput({
    fileType: EncodedFileType.MP4,
    filepath,
    output: {
      case: 's3',
      value: new S3Upload({
        accessKey: env.AWS_ACCESS_KEY_ID,
        secret: env.AWS_SECRET_ACCESS_KEY,
        region: env.AWS_DEFAULT_REGION,
        bucket: env.AWS_BUCKET,
        metadata: { 'phi-classification': 'telehealth-recording' },
      }),
    },
  });
}

async function startEgress(roomName: string, filepath: string): Promise<string | undefined> {
  assertPipelineReady();
  const host = livekitHttpHost(env.LIVEKIT_URL);
  const client = new EgressClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  const info = await client.startRoomCompositeEgress(roomName, s3Output(filepath));
  return info.egressId;
}

async function signedPlaybackUrl(stored: string): Promise<string> {
  const key = s3KeyFromRecordingUrl(stored);
  if (!key || !isS3Configured()) return stored;
  const s3 = createPhiS3Client();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.AWS_BUCKET, Key: key }), { expiresIn: 300 });
}

export class TelehealthRecordingService {
  static async startForSession(sessionId: string, actor: TelehealthActor) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canStartRecording('session', session, actor)) throw new AppError('Forbidden.', 403);
    const roomName = session.livekitRoomId || sessionRoomName(session.id);
    const filepath = `telehealth-recordings/session/${session.id}/{time}.mp4`;
    const egressId = await startEgress(roomName, filepath);
    await prisma.session.update({
      where: { id: session.id },
      data: {
        recordingStatus: 'in_progress',
        recordingEgressId: egressId ?? null,
      },
    });
    return { roomName, egressId, status: 'in_progress' as const };
  }

  static async stopForSession(sessionId: string, actor: TelehealthActor) {
    assertPipelineReady();
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canStartRecording('session', session, actor)) throw new AppError('Forbidden.', 403);
    if (!session.recordingEgressId) {
      throw new AppError('No active recording to stop.', 422);
    }
    const host = livekitHttpHost(env.LIVEKIT_URL);
    const client = new EgressClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    await client.stopEgress(session.recordingEgressId);
    await prisma.session.update({
      where: { id: session.id },
      data: { recordingStatus: 'stopping' },
    });
    const roomName = session.livekitRoomId || sessionRoomName(session.id);
    void TelehealthRecordingService.pollEgressUntilSaved(session.id, roomName, session.recordingEgressId);
    return { status: 'stopping' as const, egressId: session.recordingEgressId };
  }

  static async pollEgressUntilSaved(sessionId: string, roomName: string, egressId: string): Promise<void> {
    const host = livekitHttpHost(env.LIVEKIT_URL);
    const client = new EgressClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
    for (let i = 0; i < 40; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      try {
        const items = await client.listEgress({ egressId });
        const info = items[0] as (EgressFileInfo & { status?: string | number }) | undefined;
        const location = recordingLocationFromEgress(info);
        const status = String(info?.status ?? '');
        if (status.includes('FAILED') || status === '4') {
          await prisma.session.update({
            where: { id: sessionId },
            data: { recordingStatus: 'failed' },
          });
          return;
        }
        if (!location) continue;
        await TelehealthRecordingService.persistFromEgressEvent({
          event: 'egress_ended',
          room: { name: roomName },
          egressInfo: info,
        });
        return;
      } catch {
        /* keep polling — webhook may still arrive */
      }
    }
    void sessionId;
  }

  static async startForMeeting(meetingId: string, actor: TelehealthActor) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (!canStartRecording('meeting', meeting, actor)) throw new AppError('Forbidden.', 403);
    const filepath = `telehealth-recordings/meeting/${meeting.id}/{time}.mp4`;
    const egressId = await startEgress(meeting.roomName, filepath);
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { recordingStatus: 'in_progress' },
    });
    return { roomName: meeting.roomName, egressId, status: 'in_progress' as const };
  }

  static async playbackForSession(sessionId: string, actor: TelehealthActor) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { episode: { select: { coordinatorId: true, organizationId: true } } },
    });
    if (!session) throw new AppError('Session not found.', 404);
    if (!canViewRecording('session', session, actor)) throw new AppError('Forbidden.', 403);

    let recordingUrlStored = session.recordingUrl;
    let status = session.recordingStatus ?? (session.recordingUrl ? 'available' : null);

    if (
      !recordingUrlStored &&
      session.recordingEgressId &&
      ['stopping', 'in_progress', 'available', 'failed'].includes(String(status))
    ) {
      const recovered = await TelehealthRecordingService.recoverSessionFromLiveKit(
        session.id,
        session.livekitRoomId || sessionRoomName(session.id),
        session.recordingEgressId,
      );
      if (recovered) {
        recordingUrlStored = recovered;
        status = 'available';
      }
    }

    if (!recordingUrlStored && !status) {
      throw new AppError('No recording available for this session.', 404);
    }
    const recordingUrl = recordingUrlStored ? await signedPlaybackUrl(recordingUrlStored) : null;
    return {
      recordingUrl,
      status,
      expiresIn:
        recordingUrlStored && s3KeyFromRecordingUrl(recordingUrlStored) && isS3Configured()
          ? 300
          : undefined,
    };
  }

  static async recoverSessionFromLiveKit(
    sessionId: string,
    roomName: string,
    egressId: string,
  ): Promise<string | null> {
    try {
      const host = livekitHttpHost(env.LIVEKIT_URL);
      const client = new EgressClient(host, env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
      const items = await client.listEgress({ egressId });
      const info = items[0] as EgressFileInfo | undefined;
      const location = recordingLocationFromEgress(info);
      if (!location) return null;
      await TelehealthRecordingService.persistFromEgressEvent({
        event: 'egress_ended',
        room: { name: roomName },
        egressInfo: info,
      });
      return location;
    } catch {
      return null;
    }
  }

  static async playbackForMeeting(meetingId: string, actor: TelehealthActor) {
    const meeting = await prisma.meeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new AppError('Meeting not found.', 404);
    if (!canViewRecording('meeting', meeting, actor)) throw new AppError('Forbidden.', 403);
    if (!meeting.recordingUrl) throw new AppError('No recording available for this meeting.', 404);
    const recordingUrl = await signedPlaybackUrl(meeting.recordingUrl);
    return { recordingUrl, expiresIn: s3KeyFromRecordingUrl(meeting.recordingUrl) && isS3Configured() ? 300 : undefined };
  }

  static async persistFromEgressEvent(event: {
    event?: string;
    room?: { name?: string };
    egressInfo?: EgressFileInfo & { egressId?: string };
  }) {
    const eventName = String(event.event ?? '');
    if (eventName !== 'egress_ended' && eventName !== 'recording_finished') return { updated: 0 };
    const roomName = event.room?.name;
    const location = recordingLocationFromEgress(event.egressInfo);
    if (!roomName || !location) return { updated: 0 };

    const target = resolveRecordingTarget(roomName);
    if (target.kind === 'session') {
      const result = await prisma.session.updateMany({
        where: { OR: [{ id: target.id }, { livekitRoomId: roomName.replace(/__waiting$/, '') }] },
        data: { recordingUrl: location, recordingStatus: 'available' },
      });
      return { updated: result.count, kind: 'session' as const };
    }

    const result = await prisma.meeting.updateMany({
      where: { roomName: target.roomName },
      data: { recordingUrl: location, recordingStatus: 'available' },
    });
    return { updated: result.count, kind: 'meeting' as const };
  }
}
