import { API_BASE_URL, client, getAccessToken } from "./client";
import { extractApiError } from '@/lib/errors';
import type { ChatMessagePayload, CreateConversationPayload } from "@/types/api";

export async function createConversation(data: CreateConversationPayload) {
    try {
        const response = await client.post('/conversations', data);
        return response.data;
    } catch (error) {
        console.error('Failed to createConversation', error);
        throw extractApiError(error);
    }
}

async function getConversationMessages(conversationId: string) {
    const response = await client.get(`/conversations/${conversationId}/messages`);
    return response.data;
}

async function markConversationAsRead(conversationId: string) {
    try {
        const response = await client.post(`/conversations/${conversationId}/read`);
        return response.data;
    } catch (error) {
        console.error('Failed to markConversationAsRead', error);
        throw extractApiError(error);
    }
}

async function sendMessage(receiverId: string, data: { message?: string; file?: File; type?: string; duration?: number }) {
    try {
        const formData = new FormData();
        if (data.message) formData.append('message', data.message);
        if (data.file) formData.append('file', data.file);
        if (data.type) formData.append('type', data.type);
        if (data.duration) formData.append('duration', data.duration.toString());

        const response = await client.post(`/chat/${receiverId}`, formData);
        return response.data;
    } catch (error) {
        console.error('Failed to send message', error);
        throw extractApiError(error);
    }
}

async function getMessages(userId: string) {
    try {
        const response = await client.get(`/chat/${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to get messages with ${userId}`, error);
        return { messages: [] };
    }
}

/**
 * Stream AI chat response using Server-Sent Events.
 * Uses native fetch to access response.body as ReadableStream for streaming.
 * 
 * @deprecated Use streamDoctorChat for authenticated doctor chat
 */
export async function streamAIChat(params: {
    message: string;
    model?: string;
    temperature?: number;
    system_prompt?: string;
}): Promise<ReadableStream> {
    const response = await fetch(`${API_BASE_URL}/ai/stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
            message: params.message,
            model: params.model || 'sonar',
            temperature: params.temperature ?? 0.7,
            system_prompt: params.system_prompt,
        }),
    });

    if (!response.ok) {
        throw new Error(`AI Stream failed: ${response.statusText}`);
    }

    return response.body as ReadableStream;
}

/**
 * Stream doctor chat with full patient context and conversation history.
 * This is the main AI doctor endpoint that sends user context to the backend.
 */
export async function streamDoctorChat(params: {
    message: string;
    sessionId?: string;
    userData?: {
        name?: string;
        age?: number;
        gender?: string;
        careCategories?: string[];
        careNeeds?: string[];
        medicalHistory?: string[];
        currentMedications?: string[];
        allergies?: string[];
        preferredLanguage?: string;
        country?: string;
    };
    conversationHistory?: Array<{ role: 'user' | 'model'; content: string }>;
    onChunk: (text: string) => void;
    onComplete: (sessionId: string) => void;
    onError: (error: Error) => void;
}) {
    try {
        const response = await fetch(`${API_BASE_URL}/ai/doctor-chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAccessToken() || ''}`,
            },
            credentials: 'include',
            body: JSON.stringify({
                message: params.message,
                session_id: params.sessionId,
                user_data: params.userData,
                conversation_history: params.conversationHistory || [],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error('Response body is not readable');
        }

        let buffer = '';
        let receivedSessionId = params.sessionId || '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            throw new Error(data.error);
                        }

                        const content = data.choices?.[0]?.delta?.content || '';
                        if (content) {
                            params.onChunk(content);
                        }

                        // Extract session ID from completion signal
                        if (data.done && data.session_id) {
                            receivedSessionId = data.session_id;
                        }

                        if (data.choices?.[0]?.finish_reason) {
                            // Streaming complete
                        }
                    } catch (e) {
                        if (e instanceof SyntaxError) {
                            // Skip malformed JSON
                            continue;
                        }
                        console.error('Failed to parse SSE data:', e);
                    }
                }
            }
        }

        params.onComplete(receivedSessionId);
    } catch (error) {
        params.onError(error as Error);
    }
}

/**
 * Create a new AI session.
 */
export async function createAISession(feature: string = 'doctor_chat', aiModel?: string) {
    try {
        const response = await client.post('/ai/session/start', {
            feature,
            ai_model: aiModel,
        });
        return response.data;
    } catch (error) {
        console.error('Failed to create AI session', error);
        throw extractApiError(error);
    }
}

/**
 * Get AI session status.
 */
export async function getAISessionStatus(sessionId: string) {
    try {
        const response = await client.get('/ai/session/status', {
            params: { session_id: sessionId },
        });
        return response.data;
    } catch (error) {
        console.error('Failed to get AI session status', error);
        throw extractApiError(error);
    }
}

/**
 * End AI session.
 */
export async function endAISession(sessionId: string) {
    try {
        const response = await client.post('/ai/session/end', {
            session_id: sessionId,
        });
        return response.data;
    } catch (error) {
        console.error('Failed to end AI session', error);
        throw extractApiError(error);
    }
}

/**
 * Get AI conversation history.
 */
export async function getAIHistory(limit: number = 100) {
    try {
        const response = await client.get('/ai/history', {
            params: { limit },
        });
        return response.data;
    } catch (error) {
        console.error('Failed to get AI history', error);
        throw extractApiError(error);
    }
}

/**
 * Clear AI session history.
 */
export async function clearAIHistory(sessionId: string) {
    try {
        const response = await client.post(`/ai/history/${sessionId}/clear`);
        return response.data;
    } catch (error) {
        console.error('Failed to clear AI history', error);
        throw extractApiError(error);
    }
}
