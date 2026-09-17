import {
  canStartRecording,
  canViewRecording,
  isPlaceholderLiveKitUrl,
  recordingLocationFromEgress,
  resolveRecordingTarget,
  s3KeyFromRecordingUrl,
} from '../../services/TelehealthRecordingService';

describe('resolveRecordingTarget', () => {
  it('maps session rooms including waiting suffix', () => {
    expect(resolveRecordingTarget('session-abc123')).toEqual({ kind: 'session', id: 'abc123' });
    expect(resolveRecordingTarget('session-abc123__waiting')).toEqual({ kind: 'session', id: 'abc123' });
  });

  it('treats other rooms as meetings', () => {
    expect(resolveRecordingTarget('meet-xyz')).toEqual({ kind: 'meeting', roomName: 'meet-xyz' });
  });
});

describe('recordingLocationFromEgress', () => {
  it('prefers fileResults then file.location', () => {
    expect(
      recordingLocationFromEgress({
        fileResults: [{ location: 's3://bucket/a.mp4' }],
        file: { location: 'ignored' },
      }),
    ).toBe('s3://bucket/a.mp4');
    expect(recordingLocationFromEgress({ file: { location: 'https://cdn/rec.mp4' } })).toBe(
      'https://cdn/rec.mp4',
    );
    expect(recordingLocationFromEgress({})).toBeNull();
  });
});

describe('s3KeyFromRecordingUrl', () => {
  it('reads keys from s3 URLs and stored keys', () => {
    expect(s3KeyFromRecordingUrl('telehealth-recordings/session/1/a.mp4')).toBe(
      'telehealth-recordings/session/1/a.mp4',
    );
    expect(s3KeyFromRecordingUrl('s3://my-bucket/telehealth-recordings/session/1/a.mp4')).toBe(
      'telehealth-recordings/session/1/a.mp4',
    );
    expect(s3KeyFromRecordingUrl('https://example.com/public.mp4')).toBeNull();
  });
});

describe('recording access', () => {
  const session = { providerId: 'clin', clientId: 'fam', status: 'accepted', episode: { coordinatorId: 'co' } };
  const meeting = { hostId: 'host', participantId: 'fam', status: 'active' };

  it('lets staff start and blocks family', () => {
    expect(canStartRecording('session', session, { userId: 'clin', role: 'clinical_staff' })).toBe(true);
    expect(canStartRecording('session', session, { userId: 'fam', role: 'family' })).toBe(false);
    expect(canStartRecording('meeting', meeting, { userId: 'host', role: 'clinical_staff' })).toBe(true);
    expect(canStartRecording('meeting', meeting, { userId: 'fam', role: 'family' })).toBe(false);
  });

  it('blocks family from viewing recordings; staff participants can view', () => {
    expect(canViewRecording('session', session, { userId: 'fam', role: 'family' })).toBe(false);
    expect(canViewRecording('session', session, { userId: 'clin', role: 'clinical_staff' })).toBe(true);
    expect(canViewRecording('meeting', meeting, { userId: 'fam', role: 'family' })).toBe(false);
    expect(canViewRecording('meeting', meeting, { userId: 'host', role: 'clinical_staff' })).toBe(true);
    expect(canViewRecording('session', session, { userId: 'other', role: 'family' })).toBe(false);
  });
});

describe('isPlaceholderLiveKitUrl', () => {
  it('detects placeholder LiveKit hosts', () => {
    expect(isPlaceholderLiveKitUrl('wss://your-livekit-server.livekit.cloud')).toBe(true);
    expect(isPlaceholderLiveKitUrl('wss://proj.livekit.cloud')).toBe(false);
    expect(isPlaceholderLiveKitUrl('')).toBe(true);
  });
});
