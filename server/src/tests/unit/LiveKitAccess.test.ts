import { AccessToken } from 'livekit-server-sdk';
import { createHash } from 'crypto';
import {
  admitParticipant,
  canCreateSessionRoom,
  canJoinMeeting,
  canJoinSessionRoom,
  enterLobby,
  isJoinableMeeting,
  isJoinableSession,
  joinGrants,
  parseSessionIdFromRoom,
  parseTelehealthControl,
  receiveLiveKitWebhookEvent,
  resolveJoinPhase,
  sessionRoomName,
  waitingRoomName,
} from '../../services/LiveKitAccess';

describe('sessionRoomName', () => {
  it('round-trips session ids', () => {
    expect(sessionRoomName('abc123')).toBe('session-abc123');
    expect(parseSessionIdFromRoom('session-abc123')).toBe('abc123');
    expect(parseSessionIdFromRoom('riayah-other')).toBeNull();
  });

  it('strips the waiting-room suffix', () => {
    expect(parseSessionIdFromRoom('session-abc123__waiting')).toBe('abc123');
    expect(waitingRoomName('session-abc123')).toBe('session-abc123__waiting');
  });
});

const session = {
  providerId: 'prov-1',
  clientId: 'fam-1',
  status: 'accepted',
  episode: { coordinatorId: 'coord-1' },
};

describe('canJoinSessionRoom', () => {
  it('allows client, provider, episode coordinator, and admin', () => {
    expect(canJoinSessionRoom(session, { userId: 'fam-1', role: 'family' })).toBe(true);
    expect(canJoinSessionRoom(session, { userId: 'prov-1', role: 'clinical_staff' })).toBe(true);
    expect(canJoinSessionRoom(session, { userId: 'coord-1', role: 'care_coordinator' })).toBe(true);
    expect(canJoinSessionRoom(session, { userId: 'admin-1', role: 'admin' })).toBe(true);
  });

  it('rejects a stranger', () => {
    expect(canJoinSessionRoom(session, { userId: 'other', role: 'family' })).toBe(false);
    expect(canJoinSessionRoom(session, { userId: 'other', role: 'clinical_staff' })).toBe(false);
  });
});

describe('canCreateSessionRoom', () => {
  it('allows the assigned provider, coordinator, and admin', () => {
    expect(canCreateSessionRoom(session, { userId: 'prov-1', role: 'clinical_staff' })).toBe(true);
    expect(canCreateSessionRoom(session, { userId: 'coord-1', role: 'care_coordinator' })).toBe(true);
    expect(canCreateSessionRoom(session, { userId: 'admin-1', role: 'admin' })).toBe(true);
  });

  it('rejects family and other coordinators', () => {
    expect(canCreateSessionRoom(session, { userId: 'fam-1', role: 'family' })).toBe(false);
    expect(canCreateSessionRoom(session, { userId: 'coord-2', role: 'care_coordinator' })).toBe(false);
  });
});

describe('meeting join guards', () => {
  const meeting = { hostId: 'host-1', participantId: 'fam-1', status: 'scheduled' };

  it('allows host, participant, and admin', () => {
    expect(canJoinMeeting(meeting, { userId: 'host-1', role: 'clinical_staff' })).toBe(true);
    expect(canJoinMeeting(meeting, { userId: 'fam-1', role: 'family' })).toBe(true);
    expect(canJoinMeeting(meeting, { userId: 'admin-1', role: 'admin' })).toBe(true);
    expect(canJoinMeeting(meeting, { userId: 'other', role: 'family' })).toBe(false);
  });

  it('blocks ended or cancelled meetings', () => {
    expect(isJoinableMeeting({ ...meeting, status: 'ended' })).toBe(false);
    expect(isJoinableMeeting({ ...meeting, status: 'cancelled' })).toBe(false);
    expect(isJoinableMeeting(meeting)).toBe(true);
  });

  it('blocks completed or cancelled sessions', () => {
    expect(isJoinableSession({ status: 'completed' })).toBe(false);
    expect(isJoinableSession({ status: 'cancelled' })).toBe(false);
    expect(isJoinableSession({ status: 'accepted' })).toBe(true);
  });
});

describe('waiting room + admit', () => {
  it('puts family in waiting until admitted; staff skip the lobby', () => {
    expect(resolveJoinPhase({ isStaff: true, admitted: false })).toBe('in_call');
    expect(resolveJoinPhase({ isStaff: false, admitted: false })).toBe('waiting');
    expect(resolveJoinPhase({ isStaff: false, admitted: true })).toBe('in_call');
  });

  it('waiting grants cannot subscribe to the main call', () => {
    expect(joinGrants('waiting').canSubscribe).toBe(false);
    expect(joinGrants('in_call').canSubscribe).toBe(true);
  });

  it('moves a family member from lobby to admitted', () => {
    let control = parseTelehealthControl(null);
    control = enterLobby(control, 'fam-1');
    expect(control.lobby).toEqual(['fam-1']);
    control = admitParticipant(control, 'fam-1');
    expect(control.lobby).toEqual([]);
    expect(control.admitted).toEqual(['fam-1']);
    control = admitParticipant(control, 'fam-1');
    expect(control.admitted).toEqual(['fam-1']);
  });
});

describe('receiveLiveKitWebhookEvent', () => {
  const apiKey = 'devkey';
  const apiSecret = 'devsecret-devsecret-devsecret-xx';

  async function sign(body: string, secret = apiSecret) {
    const sha256 = createHash('sha256').update(body).digest('base64');
    const at = new AccessToken(apiKey, secret, { ttl: '5m' });
    at.sha256 = sha256;
    return at.toJwt();
  }

  it('rejects missing Authorization', async () => {
    await expect(receiveLiveKitWebhookEvent('{}', undefined, apiKey, apiSecret)).rejects.toThrow(
      /signature/i,
    );
  });

  it('rejects a token signed with the wrong secret', async () => {
    const body = JSON.stringify({ event: 'room_finished', room: { name: 'session-1' } });
    const jwt = await sign(body, 'wrong-secret-wrong-secret-wrong');
    await expect(receiveLiveKitWebhookEvent(body, jwt, apiKey, apiSecret)).rejects.toThrow(
      /signature/i,
    );
  });

  it('accepts a valid LiveKit webhook JWT and returns the event', async () => {
    const body = JSON.stringify({ event: 'room_finished', room: { name: 'session-1' } });
    const jwt = await sign(body);
    const event = await receiveLiveKitWebhookEvent(body, jwt, apiKey, apiSecret);
    expect(event.event).toBe('room_finished');
    expect(event.room?.name).toBe('session-1');
  });
});
