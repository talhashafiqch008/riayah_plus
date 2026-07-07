import { client } from "./client";
import { extractApiError } from '@/lib/errors';
import type { ShiftPayload, TaskPayload } from "@/types/api";

async function startShift(data: ShiftPayload) {
    try {
        const response = await client.post('/shifts/start', data);
        return response.data;
    } catch (error) {
        console.error('Failed to startShift', error);
        throw extractApiError(error);
    }
}

async function endShift(id: string, data: ShiftPayload) {
    try {
        const response = await client.post(`/shifts/${id}/end`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to endShift', error);
        throw extractApiError(error);
    }
}

async function getActiveShift() {
    try {
        const response = await client.get('/shifts/active');
        return response.data;
    } catch (error) {
        console.error('Failed to getActiveShift', error);
        throw extractApiError(error);
    }
}

async function getShiftHistory() {
    try {
        const response = await client.get('/shifts/history');
        return response.data;
    } catch (error) {
        console.error('Failed to getShiftHistory', error);
        throw extractApiError(error);
    }
}

async function getTasks() {
    try {
        const response = await client.get('/tasks');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch tasks', error);
        throw extractApiError(error);
    }
}

async function createTask(data: TaskPayload) {
    try {
        const response = await client.post('/tasks', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create task', error);
        throw extractApiError(error);
    }
}

async function updateTask(id: string, data: TaskPayload) {
    try {
        const response = await client.put(`/tasks/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update task', error);
        throw extractApiError(error);
    }
}

async function updateTaskStatus(id: string, status: 'PENDING' | 'COMPLETED') {
    try {
        const response = await client.put(`/tasks/${id}`, { status });
        return response.data;
    } catch (error) {
        console.error('Failed to updateTaskStatus', error);
        throw extractApiError(error);
    }
}

async function deleteTask(id: string) {
    try {
        const response = await client.delete(`/tasks/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete task', error);
        throw extractApiError(error);
    }
}
