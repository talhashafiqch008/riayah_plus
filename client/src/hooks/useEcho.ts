
import { useEffect, useState, useRef } from 'react';
import {
    acquireSharedEcho,
    releaseSharedEcho,
    subscribeToConnectionState,
} from '@/lib/echo';
import type { ConnectionState } from '@/lib/echo';
import type EchoType from 'laravel-echo';

interface Message {
    id: string | number;
    user_id: string | number;
    receiver_id: string | number;
    message: string;
    created_at: string;
    updated_at?: string;
    right?: boolean;
    is_mine?: boolean;
}

interface ChatEventData {
    message: Message;
    sender: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
    };
    receiver: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
    };
}

function useEchoConnection(userId: string | number) {
    const [isConnected, setIsConnected] = useState(false);
    const [echo, setEcho] = useState<EchoType<any> | null>(null);
    const cleanedUpRef = useRef(false);

    // TODO: Refactor cascading setState into useReducer or batched update
    // TODO: Combine multiple setState calls
    useEffect(() => {
        if (!userId) return;
        if (typeof window === 'undefined') return;

        cleanedUpRef.current = false;
        const echoInstance = acquireSharedEcho();
        if (!echoInstance) return;

        setEcho(echoInstance);
        try {
            const pusher = echoInstance.connector?.pusher;
            const state = pusher?.connection?.state;
            setIsConnected(state === 'connected');
        } catch {
            setIsConnected(false);
        }

        const unsubscribe = subscribeToConnectionState((state: ConnectionState) => {
            if (!cleanedUpRef.current) {
                setIsConnected(state === 'connected');
            }
        });

        return () => {
            cleanedUpRef.current = true;
            unsubscribe();
            releaseSharedEcho();
        };
    }, [userId]);

    return { isConnected, echo, cleanedUpRef };
}

/* oxlint-disable effect-needs-cleanup */
export function useChatEcho(
    userId: string | number,
    onNewMessage: (message: Message) => void
) {
    const { isConnected, echo, cleanedUpRef } = useEchoConnection(userId);
    const onNewMessageRef = useRef(onNewMessage);

    useEffect(() => {
        onNewMessageRef.current = onNewMessage;
    }, [onNewMessage]);

    // oxlint-disable-next-line effect-needs-cleanup
    useEffect(() => {
        if (!echo || !userId) return;
        const channelName = `chat.${userId}`;
        const channel = echo.private(channelName);

        channel.listen('.chat', (data: ChatEventData) => {
            if (data.message) {
                onNewMessageRef.current(data.message);
            }
        });

        return () => {
            channel.stopListening('.chat');
            echo.leave(channelName);
        };
    }, [echo, userId]);

    return { isConnected, echo };
}

/* oxlint-disable effect-needs-cleanup */
export function useNotificationEcho(
    userId: string | number,
    onNotification: (data: { notification: Record<string, unknown>; unreadCount: number }) => void
) {
    const { isConnected, echo, cleanedUpRef } = useEchoConnection(userId);
    const onNotificationRef = useRef(onNotification);

    useEffect(() => {
        onNotificationRef.current = onNotification;
    }, [onNotification]);

    // oxlint-disable-next-line effect-needs-cleanup
    useEffect(() => {
        if (!echo || !userId) return;
        const channelName = `notification.user.${userId}`;
        const channel = echo.private(channelName);

        const handleNotification = (data: Record<string, unknown>) => {
            if (data.notification) {
                onNotificationRef.current({
                    notification: data.notification as Record<string, unknown>,
                    unreadCount: (data.unreadCount as number) || 0,
                });
            }
        };

        channel.listen('.notification', handleNotification);

        return () => {
            channel.stopListening('.notification');
            echo.leave(channelName);
        };
    }, [echo, userId]);

    return { isConnected, echo };
/* oxlint-enable effect-needs-cleanup */
}
