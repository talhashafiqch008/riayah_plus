import axios from "axios";
import { extractApiError } from '@/lib/errors';
import { client } from "./client";
import type {
    CareRecipientPayload,
    CarePlanPayload,
    CarePlanItemPayload,
    CareBudgetPayload,
    CareTimelineEventPayload,
} from "@/types/api";

async function getCareRecipients() {
    try {
        const response = await client.get('/care-recipients');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch care recipients', error);
        throw extractApiError(error);
    }
}

async function createCareRecipient(data: CareRecipientPayload) {
    try {
        const response = await client.post('/care-recipients', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create care recipient', error);
        throw extractApiError(error);
    }
}

async function updateCareRecipient(id: string, data: CareRecipientPayload) {
    try {
        const response = await client.put(`/care-recipients/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update care recipient', error);
        throw extractApiError(error);
    }
}

async function deleteCareRecipient(id: string) {
    try {
        const response = await client.delete(`/care-recipients/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete care recipient', error);
        throw extractApiError(error);
    }
}

export async function getCareseekerDashboard() {
    try {
        const response = await client.get('/client/dashboard');
        return response.data;
    } catch (error: unknown) {
        const message = axios.isAxiosError(error)
            ? `API Call /client/dashboard failed: ${error.response?.status} ${error.message}`
            : `API Call /client/dashboard failed: ${error}`;
        console.error(message);
        throw extractApiError(error);
    }
}

export async function getCarePlans() {
    try {
        const response = await client.get('/care-plans');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch care plans', error);
        throw extractApiError(error);
    }
}

// export async function createCarePlan(data: CarePlanPayload) {
//     try {
//         const response = await client.post('/care-plans', data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to create care plan', error);
//         throw extractApiError(error);
//     }
// }

// export async function updateCarePlan(id: string, data: CarePlanPayload) {
//     try {
//         const response = await client.put(`/care-plans/${id}`, data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to update care plan', error);
//         throw extractApiError(error);
//     }
// }

// export async function deleteCarePlan(id: string) {
//     try {
//         const response = await client.delete(`/care-plans/${id}`);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to delete care plan', error);
//         throw extractApiError(error);
//     }
// }

// export async function getCarePlanItems(planId: string) {
//     try {
//         const response = await client.get(`/care-plans/${planId}/items`);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to fetch care plan items', error);
//         throw extractApiError(error);
//     }
// }

// export async function createCarePlanItem(planId: string, data: CarePlanItemPayload) {
//     try {
//         const response = await client.post(`/care-plans/${planId}/items`, data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to create care plan item', error);
//         throw extractApiError(error);
//     }
// }

export async function getCareSummary() {
    try {
        const response = await client.get('/care-summary');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch care summary', error);
        throw extractApiError(error);
    }
}

export async function getCareBudget() {
    try {
        const response = await client.get('/care-budget');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch care budget', error);
        throw extractApiError(error);
    }
}

// export async function createCareBudget(data: CareBudgetPayload) {
//     try {
//         const response = await client.post('/care-budget', data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to create care budget', error);
//         throw extractApiError(error);
//     }
// }

export async function getCareTimeline() {
    try {
        const response = await client.get('/care-timeline');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch care timeline', error);
        throw extractApiError(error);
    }
}

// export async function createCareTimelineEvent(data: CareTimelineEventPayload) {
//     try {
//         const response = await client.post('/care-timeline', data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to create care timeline event', error);
//         throw extractApiError(error);
//     }
// }
