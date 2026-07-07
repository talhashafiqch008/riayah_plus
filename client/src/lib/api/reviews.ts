import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export async function getProviderReviews(providerId: string) {
    try {
        const response = await client.get(`/providers/${providerId}/reviews`);
        return response.data;
    } catch (error) {
        console.error('Failed to getProviderReviews', error);
        throw extractApiError(error);
    }
}

export async function getMyReviews() {
    try {
        const response = await client.get('/my-reviews');
        return response.data;
    } catch (error) {
        console.error('Failed to getMyReviews', error);
        throw extractApiError(error);
    }
}

export async function submitReview(data: { provider_id: string; rating: number; comment: string; booking_id?: string }) {
    try {
        const response = await client.post('/reviews', data);
        return response.data;
    } catch (error) {
        console.error('Failed to submit review', error);
        throw extractApiError(error);
    }
}
