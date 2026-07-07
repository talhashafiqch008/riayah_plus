import { client } from "./client";
import { extractDomainError } from '@/lib/errors';

export async function getCareNeeds(careType?: string, location?: string) {
    try {
        const params = new URLSearchParams();
        if (careType) params.append('care_type', careType);
        if (location) params.append('location', location);
        const response = await client.get(`/care-needs?${params.toString()}`);
        return response.data;
    } catch (error) {
        console.error('Failed to get care needs', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

// export async function getCareNeedDetail(id: string) {
//     try {
//         const response = await client.get(`/care-needs/${id}`);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to get care need detail', error);
//         throw extractDomainError(error); // MIGRATED: domain error handling
//     }
// }

export async function placeBid(careNeedId: string, data: { bid_amount: number; proposal_message?: string }) {
    try {
        const response = await client.post(`/care-needs/${careNeedId}/bid`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to place bid', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getProviderBids() {
    try {
        const response = await client.get('/provider/bids');
        const data = response.data;
        
        // Normalize API response: map snake_case care_need to camelCase careNeed
        if (data.success && data.bids) {
            data.bids = data.bids.map((bid: any) => ({
                ...bid,
                careNeed: bid.care_need || bid.careNeed || null,
            }));
        }
        
        return data;
    } catch (error) {
        console.error('Failed to get provider bids', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function createCareNeed(data: {
    title: string;
    description: string;
    care_type: string;
    location: string;
    budget_min?: number;
    budget_max?: number;
    schedule_type: 'one_time' | 'recurring' | 'flexible';
    preferred_start_date?: string;
    preferred_end_date?: string;
}) {
    try {
        const response = await client.post('/client/care-needs', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create care need', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getMyCareNeeds() {
    try {
        const response = await client.get('/client/care-needs');
        return response.data;
    } catch (error) {
        console.error('Failed to get my care needs', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function acceptBid(bidId: string) {
    try {
        const response = await client.post(`/client/care-needs/bids/${bidId}/accept`);
        return response.data;
    } catch (error) {
        console.error('Failed to accept bid', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}
