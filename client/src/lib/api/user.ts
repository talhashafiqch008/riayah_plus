import { client } from "./client";
import { extractApiError } from '@/lib/errors';
import type { UpdateUserPayload } from "@/types/api";

export async function getUsers() {
    const response = await client.get('/users');
    return response.data;
}

async function updateUser(id: string, data: UpdateUserPayload) {
    try {
        const response = await client.put(`/users/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to updateUser', error);
        throw extractApiError(error);
    }
}

export async function deleteAccount() {
    try {
        const response = await client.delete('/user');
        return response.data;
    } catch (error) {
        console.error('Failed to deleteAccount', error);
        throw extractApiError(error);
    }
}
