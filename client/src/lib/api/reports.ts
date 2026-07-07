import { client } from "./client";
import { extractApiError } from '@/lib/errors';

export async function getReports() {
    try {
        const response = await client.get('/provider/reports');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch reports', error);
        throw extractApiError(error);
    }
}

export async function createReport(data: { client_id: number; booking_id?: number; type: string; details: string }) {
    try {
        const response = await client.post('/provider/reports', data);
        return response.data;
    } catch (error) {
        console.error('Failed to create report', error);
        throw extractApiError(error);
    }
}

async function getReportDetails(id: string | number) {
    try {
        const response = await client.get(`/provider/reports/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch report details', error);
        throw extractApiError(error);
    }
}

export async function deleteReport(id: string | number) {
    try {
        const response = await client.delete(`/provider/reports/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete report', error);
        throw extractApiError(error);
    }
}
