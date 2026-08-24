import { tokenFromSocketHandshake, chatUserRoom, conversationRoom, notificationUserRoom } from '../../services/realtimeRooms';

describe('tokenFromSocketHandshake', () => {
  it('prefers auth.token then Bearer then cookie', () => {
    expect(
      tokenFromSocketHandshake({
        auth: { token: ' from-auth ' },
        headers: { authorization: 'Bearer from-header', cookie: 'token=from-cookie' },
      }),
    ).toBe('from-auth');
    expect(
      tokenFromSocketHandshake({
        headers: { authorization: 'Bearer from-header', cookie: 'token=from-cookie' },
      }),
    ).toBe('from-header');
    expect(
      tokenFromSocketHandshake({
        headers: { cookie: 'refresh_token=x; token=from-cookie; other=1' },
      }),
    ).toBe('from-cookie');
  });

  it('returns undefined when nothing is present', () => {
    expect(tokenFromSocketHandshake({ headers: {} })).toBeUndefined();
  });
});

describe('realtime rooms', () => {
  it('namespaces chat and conversation rooms', () => {
    expect(chatUserRoom('u1')).toBe('chat.u1');
    expect(conversationRoom('c1')).toBe('conversation.c1');
    expect(notificationUserRoom('u1')).toBe('notification.user.u1');
  });
});
