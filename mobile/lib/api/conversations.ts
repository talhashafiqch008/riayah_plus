import { apiClient } from './client';

export type ConversationUser = {
  id: string;
  name: string;
  avatar?: string | null;
  role?: string;
};

export type ConversationParticipant = {
  userId: string;
  lastReadAt?: string | null;
  user?: ConversationUser;
};

export type ChatMessage = {
  id: string;
  conversationId?: string | null;
  senderId?: string | null;
  receiverId?: string | null;
  content?: string | null;
  type?: string;
  fileUrl?: string | null;
  status?: string;
  readAt?: string | null;
  deleted?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  sender?: { id: string; name: string; avatar?: string | null } | null;
};

export type Conversation = {
  id: string;
  type: string;
  episodeId?: string | null;
  title?: string | null;
  lastMessageAt?: string | null;
  participantLinks: ConversationParticipant[];
  messages?: ChatMessage[];
};

export type MessagesReadPayload = {
  conversationId: string;
  readerId: string;
  readAt: string;
};

export function otherParticipant(
  conversation: Conversation,
  myId: string,
): ConversationUser | undefined {
  return conversation.participantLinks.find((p) => p.userId !== myId)?.user;
}

export function conversationHasUnread(conversation: Conversation, myId: string): boolean {
  const mine = conversation.participantLinks.find((p) => p.userId === myId);
  const last = conversation.messages?.[0];
  if (!last || last.senderId === myId || last.deleted) return false;
  if (!mine?.lastReadAt) return true;
  return new Date(last.createdAt).getTime() > new Date(mine.lastReadAt).getTime();
}

export function conversationTypeLabel(type: string): string {
  if (type === 'family_coordinator') return 'Care coordinator';
  if (type === 'family_clinical') return 'Clinician';
  if (type === 'coordinator_clinical') return 'Care team';
  if (type === 'internal_staff') return 'Internal';
  if (type === 'episode') return 'Care journey';
  return 'Message';
}

export function attachmentFileName(fileUrl: string): string | null {
  const part = fileUrl.split('/').pop();
  return part || null;
}

export function attachmentDisplayName(fileUrl: string): string {
  const name = attachmentFileName(fileUrl) || 'Attachment';
  return name.replace(/^[0-9a-f-]{36}-/i, '');
}

export function conversationAttachmentPath(conversationId: string, fileUrl: string): string | null {
  const name = attachmentFileName(fileUrl);
  if (!name) return null;
  return `/api/conversations/${conversationId}/files/${encodeURIComponent(name)}`;
}

export async function listConversations(params?: { episodeId?: string; type?: string }) {
  const { data } = await apiClient.get<{ data: Conversation[] }>('/api/conversations', { params });
  return data.data;
}

export async function createConversationThread(opts: {
  participantId: string;
  episodeId?: string;
}) {
  const { data } = await apiClient.post<{ data: Conversation }>('/api/conversations/threads', opts);
  return data.data;
}

export async function listConversationMessages(conversationId: string, page = 1, limit = 50) {
  const { data } = await apiClient.get<{ data: ChatMessage[] }>(
    `/api/conversations/${conversationId}/messages`,
    { params: { page, limit } },
  );
  return data.data;
}

export async function sendConversationMessage(
  conversationId: string,
  opts: { content?: string; fileUri?: string; fileName?: string; mimeType?: string },
) {
  if (opts.fileUri) {
    const form = new FormData();
    if (opts.content?.trim()) form.append('content', opts.content.trim());
    form.append('file', {
      uri: opts.fileUri,
      name: opts.fileName ?? 'attachment',
      type: opts.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
    const { data } = await apiClient.post<{ data: ChatMessage }>(
      `/api/conversations/${conversationId}/messages`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  }
  const { data } = await apiClient.post<{ data: ChatMessage }>(
    `/api/conversations/${conversationId}/messages`,
    { content: opts.content },
  );
  return data.data;
}

export async function markConversationRead(conversationId: string) {
  const { data } = await apiClient.post<{ success: boolean; updated: number; readAt: string }>(
    `/api/conversations/${conversationId}/read`,
  );
  return data;
}
