import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export async function getProviderOffers() {
    try {
        const response = await client.get('/provider/offers');
        return response.data;
    } catch (error) {
        console.error('Failed to get provider offers', error);
        throw extractApiError(error);
    }
}

export async function withdrawProviderOffer(offerId: string) {
    try {
        const response = await client.delete(`/provider/offers/${offerId}`);
        return response.data;
    } catch (error) {
        console.error('Failed to withdraw offer', error);
        throw extractApiError(error);
    }
}

export async function getClientOffers() {
    try {
        const response = await client.get('/client/offers');
        return response.data;
    } catch (error) {
        console.error('Failed to get client offers', error);
        throw extractApiError(error);
    }
}

export async function acceptOffer(offerId: string) {
    try {
        const response = await client.post(`/client/offers/${offerId}/accept`);
        return response.data;
    } catch (error) {
        console.error('Failed to accept offer', error);
        throw extractApiError(error);
    }
}

export async function rejectOffer(offerId: string) {
    try {
        const response = await client.post(`/client/offers/${offerId}/reject`);
        return response.data;
    } catch (error) {
        console.error('Failed to reject offer', error);
        throw extractApiError(error);
    }
}

export async function createOffer(data: {
    client_id: string;
    proposed_amount: number;
    proposed_hours: number;
    proposed_date: string;
    proposed_start_time: string;
    proposed_end_time: string;
    service_type?: string;
    message?: string;
}) {
    try {
        const response = await client.post('/provider/offers', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create offer', error);
        throw extractApiError(error);
    }
}
