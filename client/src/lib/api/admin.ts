import { client } from "./client";
import { extractApiError } from '@/lib/errors';
import type {
    IncidentPayload,
    AuditLogParams,
    AdminUserFilter,
    StaffAssignmentPayload,
} from "@/types/api";

export async function getPendingVerifications() {
    try {
        const response = await client.get('/admin/documents/pending');
        return response.data;
    } catch (error) {
        console.error('Failed to getPendingVerifications', error);
        throw extractApiError(error);
    }
}

export async function verifyDocument(id: string, status: 'VERIFIED' | 'REJECTED') {
    try {
        const response = await client.post(`/admin/documents/${id}/verify`, { status });
        return response.data;
    } catch (error) {
        console.error('Failed to verifyDocument', error);
        throw extractApiError(error);
    }
}

async function approveUserVerification(userId: string) {
    try {
        const response = await client.put(`/admin/doctors/${userId}/approve`);
        return response.data;
    } catch (error) {
        console.error('Failed to approveUserVerification', error);
        throw extractApiError(error);
    }
}

async function rejectUserVerification(userId: string, reason: string) {
    try {
        const response = await client.put(`/admin/doctors/${userId}/reject`, { reason });
        return response.data;
    } catch (error) {
        console.error('Failed to rejectUserVerification', error);
        throw extractApiError(error);
    }
}

async function getAdminStats() {
    try {
        const response = await client.get('/admin/dashboard');
        return response.data;
    } catch (error) {
        console.error('Failed to getAdminStats', error);
        throw extractApiError(error);
    }
}

async function getIncidents() {
    try {
        const response = await client.get('/admin/incidents');
        return response.data;
    } catch (error) {
        console.error('Failed to getIncidents', error);
        throw extractApiError(error);
    }
}

async function createIncident(data: IncidentPayload) {
    try {
        const response = await client.post('/admin/incidents', data);
        return response.data;
    } catch (error) {
        console.error('Failed to createIncident', error);
        throw extractApiError(error);
    }
}

async function getAuditLogs(params?: AuditLogParams) {
    try {
        const response = await client.get('/admin/audit-logs');
        return response.data;
    } catch (error) {
        console.error('Failed to getAuditLogs', error);
        throw extractApiError(error);
    }
}

export async function getAdminDashboard() {
    try {
        const response = await client.get('/admin/dashboard');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch admin dashboard:', error);
        throw extractApiError(error);
    }
}

async function getAdminUserAnalytics() {
    try {
        const response = await client.get('/admin/dashboard/user-analytics');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user analytics:', error);
        throw extractApiError(error);
    }
}

export async function getAdminAllUsers(filters?: AdminUserFilter) {
    try {
        const response = await client.get('/admin/users', { params: filters });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch all users:', error);
        throw extractApiError(error);
    }
}

async function getAdminUserDetails(id: string) {
    try {
        const response = await client.get(`/admin/users/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch user details:', error);
        throw extractApiError(error);
    }
}

export async function getAdminProviderDetails(id: string) {
    try {
        const response = await client.get(`/admin/doctors/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch provider details:', error);
        throw extractApiError(error);
    }
}

export async function verifyDoctor(id: string) {
    try {
        const response = await client.put(`/admin/doctors/${id}/approve`);
        return response.data;
    } catch (error) {
        console.error('Failed to verify doctor:', error);
        throw extractApiError(error);
    }
}

export async function rejectDoctor(id: string, reason: string) {
    try {
        const response = await client.put(`/admin/doctors/${id}/reject`, { reason });
        return response.data;
    } catch (error) {
        console.error('Failed to reject doctor:', error);
        throw extractApiError(error);
    }
}

export async function getStaffAssignments() {
    try {
        const response = await client.get('/staff/assignments');
        return response.data;
    } catch (error) {
        console.error('Failed to getStaffAssignments', error);
        throw extractApiError(error);
    }
}

async function getMyAssignments() {
    try {
        const response = await client.get('/staff/my-assignments');
        return response.data;
    } catch (error) {
        console.error('Failed to getMyAssignments', error);
        throw extractApiError(error);
    }
}

export async function createStaffAssignment(data: StaffAssignmentPayload) {
    try {
        const response = await client.post('/staff/assignments', data);
        return response.data;
    } catch (error) {
        console.error('Failed to createStaffAssignment', error);
        throw extractApiError(error);
    }
}
