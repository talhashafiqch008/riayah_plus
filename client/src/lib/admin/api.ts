/**
 * Admin API Boundary
 *
 * Dedicated API client for admin panel operations.
 * All functions automatically include X-Admin-Request header via client interceptors.
 * Uses the same axios client from lib/api/client with admin route detection.
 */

import { client } from "@/lib/api/client";
import { extractApiError } from "@/lib/errors";

async function adminGet(url: string, params?: Record<string, unknown>) {
    try {
        const response = await client.get(url, { params });
        return response.data;
    } catch (error) {
        throw extractApiError(error);
    }
}

async function adminPost(url: string, data?: Record<string, unknown>) {
    try {
        const response = await client.post(url, data);
        return response.data;
    } catch (error) {
        throw extractApiError(error);
    }
}

async function adminPut(url: string, data?: Record<string, unknown>) {
    try {
        const response = await client.put(url, data);
        return response.data;
    } catch (error) {
        throw extractApiError(error);
    }
}

async function adminDelete(url: string) {
    try {
        const response = await client.delete(url);
        return response.data;
    } catch (error) {
        throw extractApiError(error);
    }
}

async function adminPatch(url: string, data?: Record<string, unknown>) {
    try {
        const response = await client.patch(url, data);
        return response.data;
    } catch (error) {
        throw extractApiError(error);
    }
}

export const adminApi = {
    get: adminGet,
    post: adminPost,
    put: adminPut,
    patch: adminPatch,
    delete: adminDelete,
};

// export default adminApi;
