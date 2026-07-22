import { API_BASE_URL, client } from "./client";
import { extractDomainError } from '@/lib/errors';
import type { OnboardingDocumentPayload } from "@/types/api";

async function uploadOnboardingDocument(data: OnboardingDocumentPayload) {
    try {
        const response = await client.post('/documents', data);
        return response.data;
    } catch (error) {
        console.error('Failed to uploadOnboardingDocument', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function uploadVerificationDocument(file: File, type: string) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const response = await client.post('/documents', formData);
        return response.data;
    } catch (error) {
        console.error('Failed to uploadVerificationDocument', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getMyDocuments() {
    try {
        const response = await client.get('/documents');
        return response.data;
    } catch (error) {
        console.error('Failed to getMyDocuments', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getDocuments(filters?: { type?: string; status?: string }) {
    try {
        const response = await client.get('/documents', { params: filters });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch documents', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getDocumentsStatistics() {
    try {
        const response = await client.get('/documents/statistics');
        return response.data;
    } catch (error) {
        console.error('Failed to fetch documents statistics', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getDocumentsByType(type: string) {
    try {
        const response = await client.get(`/documents/type/${type}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch documents of type ${type}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getDocument(id: string | number) {
    try {
        const response = await client.get(`/documents/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch document ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function uploadDocument(formData: FormData) {
    try {
        // Let Axios set Content-Type with boundary automatically
        const response = await client.post('/documents', formData);
        return response.data;
    } catch (error: any) {
        console.error('Failed to upload document:', error.response?.data || error.message);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function updateDocument(id: string | number, data: {
    title?: string;
    description?: string;
    expires_at?: string;
    is_public?: boolean;
}) {
    try {
        const response = await client.put(`/documents/${id}`, data);
        return response.data;
    } catch (error) {
        console.error(`Failed to update document ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function deleteDocument(id: string | number) {
    try {
        const response = await client.delete(`/documents/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to delete document ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

function getDocumentDownloadUrl(id: string | number): string {
    return `${API_BASE_URL}/documents/${id}/download`;
}

export async function downloadDocument(id: string | number, fileName?: string) {
    try {
        const response = await client.get(`/documents/${id}/download`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        let downloadName = fileName || 'document';

        if (!fileName) {
            const disposition = response.headers['content-disposition'];
            if (disposition) {
                const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
                if (matches != null && matches[1]) {
                    downloadName = matches[1].replace(/['"]/g, '');
                }
            }
        }

        link.setAttribute('download', downloadName);
        document.body.appendChild(link);
        link.click();

        link.parentNode?.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error(`Failed to download document ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

async function getSignedUrl(key: string) {
    try {
        const response = await client.get(`/storage/signed-url?key=${key}`);
        return response.data;
    } catch (error) {
        console.error('Failed to getSignedUrl', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

// export async function uploadFile(file: File) {
//     try {
//         const formData = new FormData();
//         formData.append('file', file);
//
//         const response = await client.post('/upload', formData);
//         return response.data;
//     } catch (error) {
//         console.error('Failed to upload file', error);
//         throw extractDomainError(error); // MIGRATED: domain error handling
//     }
// }

export async function createCoordinatorDocumentRequest(payload: {
  targetUserId: string;
  documentType: string;
  description?: string;
  dueDate?: string;
}) {
  try {
    const response = await client.post('/document-requests', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to createCoordinatorDocumentRequest', error);
    throw extractDomainError(error);
  }
}

export async function submitDocumentRequest(file: File, documentType: string, title?: string, description?: string) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', documentType);
        if (title) formData.append('title', title);
        if (description) formData.append('description', description);

        const response = await client.post('/document-requests', formData);
        return response.data;
    } catch (error) {
        console.error('Failed to submitDocumentRequest', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getDocumentRequests() {
    try {
        const response = await client.get('/document-requests');
        return response.data;
    } catch (error) {
        console.error('Failed to getDocumentRequests', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getDocumentRequest(id: string | number) {
    try {
        const response = await client.get(`/document-requests/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Failed to getDocumentRequest ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getAdminDocumentRequests(status?: string) {
    try {
        const params = status ? { status } : {};
        const response = await client.get('/admin/document-requests', { params });
        return response.data;
    } catch (error) {
        console.error('Failed to getAdminDocumentRequests', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function getPendingDocumentRequests(params?: { page?: number; perPage?: number }) {
    try {
        const response = await client.get('/admin/document-requests/pending', { params });
        return response.data;
    } catch (error) {
        console.error('Failed to getPendingDocumentRequests', error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function approveDocumentRequest(id: string | number, adminNotes?: string) {
    try {
        const response = await client.post(`/admin/document-requests/${id}/approve`, {
            admin_notes: adminNotes,
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to approveDocumentRequest ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}

export async function rejectDocumentRequest(id: string | number, rejectionReason: string, adminNotes?: string) {
    try {
        const response = await client.post(`/admin/document-requests/${id}/reject`, {
            rejection_reason: rejectionReason,
            admin_notes: adminNotes,
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to rejectDocumentRequest ${id}`, error);
        throw extractDomainError(error); // MIGRATED: domain error handling
    }
}
