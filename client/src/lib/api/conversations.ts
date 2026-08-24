import { client } from './client';
import { extractApiError } from '@/lib/errors';

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

export function conversationAttachmentHref(conversationId: string, fileUrl: string): string {
  const name = attachmentFileName(fileUrl);
  if (!name) return '#';
  return `/api/conversations/${conversationId}/files/${encodeURIComponent(name)}`;
}

export async function listConversations(params?: { episodeId?: string; type?: string }) {
  try {
    const { data } = await client.get<{ data: Conversation[] }>('/conversations', { params });
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function createConversationThread(opts: {
  participantId: string;
  episodeId?: string;
}) {
  try {
    const { data } = await client.post<{ data: Conversation }>('/conversations/threads', opts);
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function listConversationMessages(conversationId: string, page = 1, limit = 50) {
  try {
    const { data } = await client.get<{ data: ChatMessage[] }>(
      `/conversations/${conversationId}/messages`,
      { params: { page, limit } },
    );
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function sendConversationMessage(
  conversationId: string,
  opts: { content?: string; file?: File },
) {
  try {
    if (opts.file) {
      const form = new FormData();
      if (opts.content?.trim()) form.append('content', opts.content.trim());
      form.append('file', opts.file);
      const { data } = await client.post<{ data: ChatMessage }>(
        `/conversations/${conversationId}/messages`,
        form,
      );
      return data.data;
    }
    const { data } = await client.post<{ data: ChatMessage }>(
      `/conversations/${conversationId}/messages`,
      { content: opts.content },
    );
    return data.data;
  } catch (error) {
    throw extractApiError(error);
  }
}

export async function markConversationRead(conversationId: string) {
  try {
    const { data } = await client.post<{ success: boolean; updated: number; readAt: string }>(
      `/conversations/${conversationId}/read`,
    );
    return data;
  } catch (error) {
    throw extractApiError(error);
  }
}
