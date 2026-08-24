import { chatMessageType, isChatAttachmentKey, unreadMessageWhere } from '../../services/chatMessageRules';

describe('isChatAttachmentKey', () => {
  it('accepts keys scoped to the conversation', () => {
    const id = 'conv1';
    expect(isChatAttachmentKey(id, `chat/${id}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-note.pdf`)).toBe(
      true,
    );
  });

  it('rejects traversal and other conversations', () => {
    expect(isChatAttachmentKey('conv1', 'chat/conv1/../etc/passwd')).toBe(false);
    expect(isChatAttachmentKey('conv1', 'chat/other/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee-a.pdf')).toBe(
      false,
    );
    expect(isChatAttachmentKey('conv1', 'https://evil.example/x.pdf')).toBe(false);
  });
});

describe('chatMessageType', () => {
  it('uses image for image MIME and file otherwise', () => {
    expect(chatMessageType(false)).toBe('text');
    expect(chatMessageType(true, 'image/png')).toBe('image');
    expect(chatMessageType(true, 'application/pdf')).toBe('file');
  });
});

describe('unreadMessageWhere', () => {
  it('selects the other party\'s unread messages', () => {
    expect(unreadMessageWhere('c1', 'reader')).toMatchObject({
      conversationId: 'c1',
      senderId: { not: 'reader' },
      status: { not: 'read' },
    });
  });
});
