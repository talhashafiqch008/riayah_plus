import { apiClient } from './client';
import { Linking, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { deleteTempFile } from '../sessionCleanup';
import { familyConversationTypeLabel } from '../familyLanguage';

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
  return familyConversationTypeLabel(type);
}

export function attachmentFileName(fileUrl: string): string | null {
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('chat/')) {
    return trimmed.split('/').pop() ?? null;
  }
  try {
    const url = new URL(trimmed);
    const part = url.pathname.split('/').pop();
    return part ? decodeURIComponent(part) : null;
  } catch {
    const part = trimmed.split('/').pop();
    return part ? decodeURIComponent(part) : null;
  }
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

function attachmentMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  return 'application/octet-stream';
}

/** Download a thread attachment with auth and open it in the system viewer (not the share sheet). */
export async function downloadConversationAttachment(
  conversationId: string,
  fileUrl: string,
): Promise<string> {
  const path = conversationAttachmentPath(conversationId, fileUrl);
  if (!path) throw new Error('Invalid attachment.');

  const displayName = attachmentDisplayName(fileUrl);
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!dir) throw new Error('File storage is unavailable on this device.');

  const safeName = displayName.replace(/[^\w.\-() ]+/g, '_');
  const target = `${dir}attachment-${Date.now()}-${safeName}`;
  const baseURL = String(apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  const authHeader = apiClient.defaults.headers.common.Authorization;
  const mimeType = attachmentMimeType(displayName);

  const result = await FileSystem.downloadAsync(`${baseURL}${path}`, target, {
    headers: authHeader ? { Authorization: String(authHeader) } : undefined,
  });
  if (result.status < 200 || result.status >= 300) {
    await deleteTempFile(result.uri);
    throw new Error('Could not download attachment');
  }

  try {
    if (Platform.OS === 'android') {
      const contentUri = await FileSystem.getContentUriAsync(result.uri);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1,
        type: mimeType,
      });
    } else {
      const canOpen = await Linking.canOpenURL(result.uri);
      if (!canOpen) {
        throw new Error('No app available to open this file.');
      }
      await Linking.openURL(result.uri);
    }
  } finally {
    // MOB-08: schedule cleanup after the external viewer has a chance to open the file
    setTimeout(() => {
      void deleteTempFile(result.uri);
    }, 60_000);
  }

  return result.uri;
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
