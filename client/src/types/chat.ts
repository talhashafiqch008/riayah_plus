/**
 * Chat Message Interface
 */
export interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    message: string;
    created_at: string;
    updated_at?: string;
    sender?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        avatar?: string;
    };
    receiver?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        avatar?: string;
    };
}

/**
 * Chat Event from Laravel Echo
 */
interface ChatEvent {
    message: ChatMessage;
}

/**
 * Conversation Interface
 */
export interface Conversation {
    id: string;
    user_id: string;
    other_user_id: string;
    last_message?: ChatMessage;
    unread_count: number;
    created_at: string;
    updated_at: string;
    other_user?: {
        id: string;
        first_name: string;
        last_name: string;
        email?: string;
        avatar?: string;
    };
}

/**
 * Notification Interface
 */
interface Notification {
    id: string;
    type: string;
    data: Record<string, unknown>;
    read_at?: string;
    created_at: string;
}

/**
 * Notification Event from Laravel Echo
 */
interface NotificationEvent {
    notification: Notification;
}

/**
 * Typing Event
 */
interface TypingEvent {
    user_id: string;
    is_typing: boolean;
}

/**
 * API Response for Chat Messages
 */
export interface ChatMessagesResponse {
    success: boolean;
    data: {
        messages: ChatMessage[];
        pagination?: {
            current_page: number;
            last_page: number;
            per_page: number;
            total: number;
        };
    };
}

/**
 * API Response for Conversations
 */
export interface ConversationsResponse {
    success: boolean;
    data: {
        conversations: Conversation[];
    };
}

/**
 * API Response for Send Message
 */
export interface SendMessageResponse {
    success: boolean;
    data: {
        message: ChatMessage;
    };
}
