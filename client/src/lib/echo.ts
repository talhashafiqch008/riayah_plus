import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { STORAGE_KEYS } from '@/lib/storage-keys';

declare global {
    interface Window {
        Pusher: typeof Pusher;
    }
}

if (typeof window !== 'undefined') {
    window.Pusher = Pusher;
}

function getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.apiToken);
}

let echoInstance: Echo<any> | null = null;
let connectionRefCount = 0;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const stateListeners = new Set<(state: ConnectionState) => void>();

function notifyStateListeners(state: ConnectionState) {
    stateListeners.forEach((listener) => {
        try {
            listener(state);
        } catch (e) {
            console.error('Echo state listener error:', e);
        }
    });
}

function isPlaceholderCredential(value: string | undefined): boolean {
    if (!value) return true;
    const placeholderPatterns = [
        'YOUR_KEY',
        'YOUR_SECRET',
        'placeholder',
        'secret-key-placeholder',
        '123456',
        'pk_test_XX',
        'sk_test_XX',
        'pk_live_XX',
        'sk_live_XX',
    ];
    return placeholderPatterns.some(pattern =>
        value.includes(pattern) || value === pattern
    );
}

function createEchoInstance(): Echo<any> | null {
    const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER;

    if (!pusherKey || !pusherCluster) {
        return null;
    }

    if (isPlaceholderCredential(pusherKey)) {
        notifyStateListeners('error');
        return null;
    }

    const apiUrl = import.meta.env.VITE_API_URL!;
    const baseUrl = apiUrl.replace('/api', '');

    const echo = new Echo({
        broadcaster: 'pusher',
        key: pusherKey,
        cluster: pusherCluster,
        forceTLS: true,
        encrypted: true,
        reconnect: true,
        maxReconnectDelay: 30000,
        minReconnectDelay: 1000,
        authorizer: (channel: { name: string }) => ({
            authorize: (socketId: string, callback: (error: Error | null, data: unknown) => void) => {
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                };

                const token = getAccessToken();
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }

                fetch(`${baseUrl}/api/broadcasting/auth`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        socket_id: socketId,
                        channel_name: channel.name,
                    }),
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error(`Authorization failed: ${res.status}`);
                        }
                        return res.json();
                    })
                    .then((data) => callback(null, data))
                    .catch((err) => {
                        console.error('Echo authorization error:', err);
                        callback(err, null);
                    });
            },
        }),
    });

    const pusher = echo.connector.pusher;

    pusher.connection.bind('connecting', () => {
        notifyStateListeners('connecting');
    });

    pusher.connection.bind('connected', () => {
        notifyStateListeners('connected');
    });

    pusher.connection.bind('disconnected', () => {
        notifyStateListeners('disconnected');
    });

    pusher.connection.bind('error', () => {
        notifyStateListeners('error');
    });

    return echo;
}

/**
 * Acquire a reference to the shared Echo/Pusher connection.
 * Calling code MUST pair this with a subsequent `releaseSharedEcho()` call.
 * Safe to call multiple times — returns the same instance and increments an internal ref counter.
 */
export function acquireSharedEcho(): Echo<any> | null {
    if (typeof window === 'undefined') return null;

    if (!echoInstance) {
        echoInstance = createEchoInstance();
    }

    connectionRefCount++;
    return echoInstance;
}

/**
 * Release a reference previously acquired via `acquireSharedEcho()`.
 * When the last reference is released, the underlying Pusher connection is disconnected.
 */
export function releaseSharedEcho(): void {
    connectionRefCount = Math.max(0, connectionRefCount - 1);

    if (connectionRefCount <= 0 && echoInstance) {
        try {
            echoInstance.disconnect();
        } catch (e) {
        }
        echoInstance = null;
    }
}

/**
 * Get the current shared Echo instance without modifying the ref count.
 * Returns null if no connection has been acquired yet.
 */
function getEchoInstance(): Echo<any> | null {
    return echoInstance;
}

/**
 * Get the current connection state of the shared Echo instance.
 */
function getConnectionState(): ConnectionState {
    if (!echoInstance) return 'disconnected';
    const state = echoInstance.connector.pusher.connection.state;
    if (state === 'connected') return 'connected';
    if (state === 'connecting') return 'connecting';
    return 'disconnected';
}

/**
 * Subscribe to connection state changes on the shared Echo instance.
 * Returns an unsubscribe function.
 */
export function subscribeToConnectionState(
    listener: (state: ConnectionState) => void
): () => void {
    stateListeners.add(listener);
    listener(getConnectionState());
    return () => {
        stateListeners.delete(listener);
    };
}

/**
 * @deprecated Use `acquireSharedEcho` instead to participate in shared connection lifecycle.
 */
function createEcho(_userToken?: string): Echo<any> {
    const instance = acquireSharedEcho();
    if (!instance) {
        throw new Error('Failed to create Echo: not in browser environment');
    }
    return instance;
}

/**
 * @deprecated Use `releaseSharedEcho` instead.
 */
function disconnectEcho(): void {
    releaseSharedEcho();
}
