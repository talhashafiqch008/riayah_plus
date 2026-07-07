import axios from "axios";
import { extractDomainError } from '@/lib/errors';
import { client } from "./client";
import type {
    BookingPayload,
    BookingStatusUpdate,
    CareOrderPayload,
    AdminBookingFilters,
} from "@/types/api";

export async function getBookingSessions() {
    try {
        const response = await client.get('/bookings');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch booking sessions', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getBookings() {
    return getBookingSessions();
}

export async function getBookingDetails(id: string) {
    try {
        const response = await client.get(`/bookings/${id}`);
        return response.data.booking || response.data;
    } catch (error) {
        console.error(`Failed to fetch booking details for ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

// export async function getUpcomingSessions() {
//     try {
//         const response = await client.get('/bookings/upcoming');
//         return response.data;
//     } catch (error) {
//         console.error('Failed to fetch upcoming sessions', error);
//         throw extractDomainError(error); // MIGRATED: domain error handling
//     }
// }

export async function createSession(data: BookingPayload) {
    try {
        const response = await client.post('/bookings', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create session', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function updateSession(id: string, data: BookingStatusUpdate) {
    try {
        const response = await client.put(`/bookings/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update session', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getSessionStats() {
    try {
        const response = await client.get('/bookings/stats');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch session stats', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getCareOrders() {
    try {
        const response = await client.get('/care-orders');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch care orders', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function createCareOrder(data: CareOrderPayload) {
    try {
        const response = await client.post('/care-orders', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create care order', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function updateCareOrder(id: string, data: CareOrderPayload) {
    try {
        const response = await client.put(`/care-orders/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update care order', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function payWithCredits(bookingId: string, credits: number, idempotencyKey?: string) {
    try {
        const response = await client.post(`/bookings/${bookingId}/pay-with-credits`, {
            credits,
            idempotency_key: idempotencyKey || crypto.randomUUID(),
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to pay with credits for booking ${bookingId}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function cancelBooking(id: string, reason?: string) {
    try {
        const response = await client.post(`/bookings/${id}/cancel`, { reason });
        return response.data;
    } catch (error) {
        console.error('Failed to cancelBooking', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getUserBookings() {
    try {
        const response = await client.get('/bookings');
        return response.data;
    } catch (error) {
        console.error('Failed to get user bookings', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function createBooking(data: BookingPayload) {
    try {
        const response = await client.post('/bookings', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create booking', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getProviderSlots(providerId: string, date: string) {
    try {
        const response = await client.get(`/providers/${providerId}/slots`, { params: { date } });
        return response.data;
    } catch (error) {
        console.error('Failed to get provider slots', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getProviderBookingRequests() {
    try {
        const response = await client.get('/provider/bookings/requests');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) return [];
        }
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function respondToBookingRequest(
    bookingId: string,
    action: 'accept' | 'reject' | 'counter_offer',
    counterOfferData?: {
        proposed_amount: number;
        proposed_hours: number;
        proposed_date: string;
        proposed_start_time: string;
        proposed_end_time: string;
        reason?: string;
    }
) {
    try {
        const payload: Record<string, unknown> = { action };
        if (action === 'counter_offer' && counterOfferData) {
            payload.proposed_amount = counterOfferData.proposed_amount;
            payload.proposed_hours = counterOfferData.proposed_hours;
            payload.proposed_date = counterOfferData.proposed_date;
            payload.proposed_start_time = counterOfferData.proposed_start_time;
            payload.proposed_end_time = counterOfferData.proposed_end_time;
            payload.reason = counterOfferData.reason;
        }
        const response = await client.post(`/provider/bookings/${bookingId}/action`, payload);
        return response.data;
    } catch (error) {
        console.error(`Failed to ${action} booking request`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function addProviderBookingNotes(bookingId: string, notes: string) {
    try {
        const response = await client.post(`/provider/bookings/${bookingId}/notes`, { notes });
        return response.data;
    } catch (error) {
        console.error('Failed to add booking notes', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function startBookingSession(bookingId: string) {
    try {
        const response = await client.post(`/bookings/${bookingId}/start`);
        return response.data;
    } catch (error) {
        console.error('Failed to start booking session', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function completeBookingSession(bookingId: string) {
    try {
        const response = await client.post(`/bookings/${bookingId}/complete`);
        return response.data;
    } catch (error) {
        console.error('Failed to complete booking session', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getAdminBookings(filters?: AdminBookingFilters) {
    try {
        const response = await client.get('/admin/bookings', { params: filters });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch admin bookings:', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getAdminBookingDetails(id: string | number) {
    try {
        const response = await client.get(`/admin/bookings/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch admin booking details:', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getPendingAssignments() {
    try {
        const response = await client.get('/provider/bookings/requests');
        return response.data;
    } catch (error) {
        console.error('Failed to getPendingAssignments', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function acceptAssignment(id: string) {
    try {
        const response = await client.post(`/provider/bookings/${id}/action`, { action: 'accept' });
        return response.data;
    } catch (error) {
        console.error('Failed to acceptAssignment', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function declineAssignment(id: string) {
    try {
        const response = await client.post(`/provider/bookings/${id}/action`, { action: 'reject' });
        return response.data;
    } catch (error) {
        console.error('Failed to declineAssignment', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

// export async function checkAccessStatus() {
//     try {
//         const response = await client.get('/access-status');
//         return response.data;
//     } catch (error) {
//         console.error('Failed to checkAccessStatus', error);
//         throw extractDomainError(error); // MIGRATED: domain error handling
//     }
// }
