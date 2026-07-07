import axios from "axios";
import { extractApiError } from '@/lib/errors';
import { client } from "./client";
import type {
    ProviderFilters,
    ProviderProfileData,
    FamilyMemberPayload,
    AgencyStaffPayload,
} from "@/types/api";

export async function searchProviders(filters: ProviderFilters) {
    const response = await client.get('/doctors', { params: filters });
    return response.data;
}

export async function getMatchedProviders(filters: ProviderFilters) {
    try {
        const response = await client.get('/providers/matched', { params: filters });
        return response.data;
    } catch (error) {
        console.error('Failed to get matched providers', error);
        throw extractApiError(error);
    }
}

export async function getDoctors(params: ProviderFilters) {
    try {
        const response = await client.get('/doctors', { params });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch doctors:', error);
        throw extractApiError(error);
    }
}

export async function getDoctorById(id: string) {
    try {
        const response = await client.get(`/doctors/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch doctor ${id}:`, error);
        throw extractApiError(error);
    }
}

export async function getProviderById(id: string) {
    const response = await client.get(`/providers/${id}`);
    return response.data;
}

export async function getProviderDetails(id: string) {
    try {
        const response = await client.get(`/providers/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to get provider details', error);
        throw extractApiError(error);
    }
}

export async function getProviderProfile() {
    try {
        const response = await client.get('/provider/profile');
        return response.data;
    } catch (error) {
        console.error('Failed to get provider profile', error);
        throw extractApiError(error);
    }
}

export async function updateProviderProfile(data: ProviderProfileData | FormData) {
    try {
        const response = await client.post('/provider/profile', data);
        return response.data;
    } catch (error) {
        console.error('Failed to update provider profile', error);
        throw extractApiError(error);
    }
}

async function getProviderDashboard() {
    const response = await client.get('/provider/dashboard');
    return response.data;
}

export async function getProviderDashboardStats() {
    try {
        const response = await client.get('/provider/dashboard/stats');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch provider dashboard stats', error);
        throw extractApiError(error);
    }
}

export async function getProviderEarnings() {
    try {
        const response = await client.get('/provider/earnings');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch provider earnings', error);
        throw extractApiError(error);
    }
}

export async function getProviderClients() {
    try {
        const response = await client.get('/provider/clients');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch provider clients', error);
        throw extractApiError(error);
    }
}

export async function getProviderClientDetails(clientId: string | number) {
    try {
        const response = await client.get(`/provider/clients/${clientId}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch client details for ${clientId}`, error);
        throw extractApiError(error);
    }
}

export async function getProviderSchedule() {
    try {
        const response = await client.get('/provider/schedule');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch provider schedule', error);
        throw extractApiError(error);
    }
}

export async function getFamilyMembers() {
    try {
        const response = await client.get('/family-members');
        return response.data;
    } catch (error) {
        console.error('Failed to get family members', error);
        throw extractApiError(error);
    }
}

export async function addFamilyMember(data: FamilyMemberPayload) {
    try {
        const response = await client.post('/family-members', data);
        return response.data;
    } catch (error) {
        console.error('Failed to add family member', error);
        throw extractApiError(error);
    }
}

export async function updateFamilyMember(id: string, data: FamilyMemberPayload) {
    try {
        const response = await client.put(`/family-members/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update family member', error);
        throw extractApiError(error);
    }
}

export async function deleteFamilyMember(id: string) {
    try {
        const response = await client.delete(`/family-members/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete family member', error);
        throw extractApiError(error);
    }
}

export async function getAgencyStaff() {
    try {
        const response = await client.get('/agency-staff');
        return response.data;
    } catch (error) {
        console.error('Failed to get agency staff', error);
        throw extractApiError(error);
    }
}

export async function getAgencyStaffRoles() {
    try {
        const response = await client.get('/agency-staff/roles');
        return response.data;
    } catch (error) {
        console.error('Failed to get agency staff roles', error);
        throw extractApiError(error);
    }
}

export async function addAgencyStaff(data: AgencyStaffPayload) {
    try {
        const response = await client.post('/agency-staff', data);
        return response.data;
    } catch (error) {
        console.error('Failed to add agency staff', error);
        throw extractApiError(error);
    }
}

export async function updateAgencyStaff(id: string, data: AgencyStaffPayload) {
    try {
        const response = await client.put(`/agency-staff/${id}`, data);
        return response.data;
    } catch (error) {
        console.error('Failed to update agency staff', error);
        throw extractApiError(error);
    }
}

export async function deleteAgencyStaff(id: string) {
    try {
        const response = await client.delete(`/agency-staff/${id}`);
        return response.data;
    } catch (error) {
        console.error('Failed to delete agency staff', error);
        throw extractApiError(error);
    }
}
