export function chatUserRoom(userId: string): string {
  return `chat.${userId}`;
}

export function conversationRoom(conversationId: string): string {
  return `conversation.${conversationId}`;
}

export function notificationUserRoom(userId: string): string {
  return `notification.user.${userId}`;
}

/** Resolve a JWT from socket handshake: auth.token, Bearer, or httpOnly cookie. */
export function tokenFromSocketHandshake(handshake: {
  auth?: { token?: unknown };
  headers: { authorization?: string; cookie?: string };
}): string | undefined {
  const authToken = handshake.auth?.token;
  if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

  const header = handshake.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const bearer = header.slice('Bearer '.length).trim();
    if (bearer) return bearer;
  }

  const cookieHeader = handshake.headers.cookie ?? '';
  for (const name of ['token', '__Host-token']) {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return undefined;
}
