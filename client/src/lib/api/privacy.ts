import { client } from './client';

export interface DataExportReady {
  success: boolean;
  requestId: string;
  status: string;
  expiresAt: string;
  downloadUrl: string;
  message?: string;
}

/** Request an encrypted export (requires password re-auth). Does not return PHI. */
export async function requestDataExport(password: string): Promise<DataExportReady> {
  const { data } = await client.post<DataExportReady>('/privacy/data-export', { password });
  return data;
}

/** Re-auth and download the decrypted JSON once (blob). */
export async function downloadDataExport(requestId: string, password: string): Promise<Blob> {
  try {
    const { data } = await client.post(
      `/privacy/data-export/${requestId}/download`,
      { password },
      { responseType: 'blob' },
    );
    const blob = data as Blob;
    // Axios surfaces API errors as JSON blobs when responseType is blob
    if (blob.type?.includes('application/json')) {
      const text = await blob.text();
      let message = 'Failed to download export.';
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        // keep default
      }
      throw Object.assign(new Error(message), { isApiError: true, message });
    }
    return blob;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: Blob }; message?: string; isApiError?: boolean };
    if (axiosErr.isApiError) throw err;
    if (axiosErr.response?.data instanceof Blob) {
      try {
        const text = await axiosErr.response.data.text();
        const parsed = JSON.parse(text) as { message?: string };
        throw Object.assign(new Error(parsed.message || 'Failed to download export.'), {
          isApiError: true,
          message: parsed.message || 'Failed to download export.',
        });
      } catch (inner) {
        if ((inner as { isApiError?: boolean }).isApiError) throw inner;
      }
    }
    throw err;
  }
}

export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
