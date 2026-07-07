import { client } from "./client";
import { extractApiError } from '@/lib/errors';
import type { ServicePayload } from "@/types/api";

// export async function getServices() {
//     const response = await client.get('/services');
//     return response.data;
// }

async function createService(data: ServicePayload) {
    try {
        const response = await client.post('/services', data);
        return response.data;
    } catch (error) {
        console.error('Failed to createService', error);
        throw extractApiError(error);
    }
}

// export async function updateService(id: string, data: ServicePayload) {
//     try {
//         const response = await client.put(`/services/${id}`, data);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to updateService', error);
//         throw extractApiError(error);
//     }
// }
