export function isChatAttachmentKey(conversationId: string, key: string): boolean {
  const prefix = `chat/${conversationId}/`;
  if (!key || key.includes('..') || key.includes('\\') || !key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  return /^[0-9a-f-]{36}-[a-zA-Z0-9._-]+$/i.test(rest);
}

export function chatMessageType(hasFile: boolean, mime?: string | null): 'text' | 'image' | 'file' {
  if (!hasFile) return 'text';
  if (mime && mime.startsWith('image/')) return 'image';
  return 'file';
}

export function unreadMessageWhere(conversationId: string, readerId: string) {
  return {
    conversationId,
    senderId: { not: readerId },
    deletedAt: null,
    status: { not: 'read' as const },
  };
}
