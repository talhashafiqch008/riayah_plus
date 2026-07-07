import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export async function getLiveKitToken(params: {
    roomName: string;
    participantName: string;
    bookingId?: string | number;
}) {
    try {
        const response = await client.post('/video/token', {
            room_name: params.roomName,
            participant_name: params.participantName,
            booking_id: params.bookingId,
        });
        return response.data;
    } catch (error) {
        console.error('Failed to get LiveKit token', error);
        throw extractApiError(error);
    }
}
