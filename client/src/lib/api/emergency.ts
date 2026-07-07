import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export interface EmergencyRequestPayload {
    category: string;
    urgency: string;
    description?: string;
    location?: string;
    contact_phone?: string;
    care_recipient?: string;
}

export async function submitEmergencyRequest(data: EmergencyRequestPayload) {
    try {
        const response = await client.post('/emergency', data);
        return response.data;
    } catch (error) {
        console.error('Failed to submitEmergencyRequest', error);
        throw extractApiError(error);
    }
}
