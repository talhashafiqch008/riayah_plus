import {
    ChatMessage,
    ChatMessagesResponse,
    ConversationsResponse,
    SendMessageResponse,
} from '@/types/chat';
import { client } from '@/lib/api/client';

export class ChatService {
    async getConversations(): Promise<ConversationsResponse> {
        const response = await client.get<ConversationsResponse>('/conversations');
        return response.data;
    }

    async getMessages(receiverId: string, page: number = 1): Promise<ChatMessagesResponse> {
        const response = await client.get<ChatMessagesResponse>(`/chat/${receiverId}?page=${page}`);
        return response.data;
    }

    async sendMessage(receiverId: string, message: string): Promise<SendMessageResponse> {
        const response = await client.post<SendMessageResponse>(`/chat/${receiverId}`, { message });
        return response.data;
    }

    async markAsRead(senderId: string): Promise<void> {
        await client.post(`/chat/${senderId}/read`);
    }

    async deleteMessage(messageId: string): Promise<void> {
        await client.delete(`/messages/${messageId}`);
    }
}

export function createChatService(): ChatService {
    return new ChatService();
}
