import { client } from './client';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export type ServiceCategory =
  | 'speech_therapy'
  | 'occupational_therapy'
  | 'behavioral_support'
  | 'physiotherapy'
  | 'nursing'
  | 'companion_care';

export interface CareUnit {
  id: string;
  name: string;
  primaryCaregiverName?: string | null;
  primaryCaregiverPhone?: string | null;
  primaryCaregiverRelation?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string;
  organizationId?: string | null;
  careRecipients?: CarePatient[];
  intakeRecords?: {
    id: string;
    status: string;
    careRecipientId: string;
    submittedAt?: string;
    reasonForCare?: string;
    diagnoses?: string[];
    serviceInterests?: ServiceCategory[];
    urgencyLevel?: UrgencyLevel | null;
    wizardPayload?: Record<string, unknown> | null;
  }[];
  careEpisodes?: {
    id: string;
    title: string;
    status: string;
    careRecipientId?: string | null;
    createdAt?: string;
  }[];
  _count?: { intakeRecords: number; careEpisodes: number };
}

export interface CarePatient {
  id: string;
  careUnitId?: string | null;
  name: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  relationship?: string | null;
  diagnosisCodes?: string[];
  pocName?: string | null;
  pocPhone?: string | null;
  externalRef?: string | null;
  notes?: string | null;
  medicalInfo?: Record<string, unknown> | null;
}

export interface CarePatientRevision {
  id: string;
  careRecipientId: string;
  changeSummary?: string | null;
  snapshot: Record<string, unknown>;
  createdAt: string;
  changedBy?: { id: string; name: string; email: string } | null;
}

export interface IntakeRecord {
  id: string;
  status: string;
  careUnitId: string;
  careRecipientId: string;
  urgencyLevel?: UrgencyLevel | null;
  reasonForCare: string;
  medicalHistory?: string | null;
  currentMeds?: string | null;
  diagnoses: string[];
  serviceInterests?: ServiceCategory[];
  primaryCaregiverName?: string | null;
  primaryCaregiverPhone?: string | null;
  primaryCaregiverRelation?: string | null;
  submittedAt?: string;
  reviewedAt?: string | null;
  reviewSummary?: Record<string, unknown> | null;
  careUnit?: { id: string; name: string };
  careRecipient?: {
    id: string;
    name: string;
    externalRef?: string | null;
    diagnosisCodes?: string[];
  };
  familyUser?: { id: string; name: string; email: string };
  careEpisode?: { id: string; title: string; status: string } | null;
  documents?: IntakeDocument[];
  wizardPayload?: Record<string, unknown> | null;
  consents?: IntakeConsentRecord[];
}

export interface IntakeConsentRecord {
  consentType: string;
  description?: string;
  granted: boolean;
  grantedAt?: string;
  documentVersion?: string | null;
  ipAddress?: string | null;
  deviceFingerprint?: string | null;
  signatureStatus?: string | null;
}

export type IntakeDocumentCategory =
  | 'referral'
  | 'prior_assessment'
  | 'insurance'
  | 'medical_report'
  | 'consent'
  | 'other';

export interface IntakeDocument {
  id: string;
  name: string;
  category?: IntakeDocumentCategory | null;
  mimeType?: string | null;
  size?: number | null;
  url?: string;
  status?: string;
  createdAt?: string;
}

export async function listIntakeQueue(params?: {
  status?: string;
  urgency?: string;
  page?: number;
  limit?: number;
}) {
  const { data } = await client.get<{ data: IntakeRecord[]; total: number; page: number; limit: number }>(
    '/coordinator/intake-queue',
    { params },
  );
  return data;
}

export async function getIntake(id: string) {
  const { data } = await client.get<{ data: IntakeRecord }>(`/intake/${id}`);
  return data.data;
}

export async function reviewIntake(
  id: string,
  payload: {
    keyConcerns: string[];
    urgencyIndicators: string[];
    suggestedServiceCategories: ServiceCategory[];
    riskFlags?: string[];
    createEpisode?: boolean;
    episodeTitle?: string;
    notes?: string;
  },
) {
  const { data } = await client.post<{
    data: { intake: IntakeRecord; episode: { id: string; title?: string; status?: string } | null };
  }>(`/intake/${id}/review`, payload);
  return data.data;
}

export async function updateIntakeStatus(id: string, status: string) {
  const { data } = await client.patch<{ data: IntakeRecord }>(`/intake/${id}/status`, { status });
  return data.data;
}

export async function updateIntakeUrgency(id: string, urgencyLevel: UrgencyLevel) {
  const { data } = await client.patch<{ data: IntakeRecord }>(`/intake/${id}/urgency`, {
    urgencyLevel,
  });
  return data.data;
}

export async function listCareUnits(params?: { search?: string; limit?: number }) {
  const { data } = await client.get<{ data: CareUnit[]; total: number }>('/care-units', {
    params,
  });
  return data;
}

export async function getCareUnit(id: string) {
  const { data } = await client.get<{ data: CareUnit }>(`/care-units/${id}`);
  return data.data;
}

export async function createCareUnit(payload: {
  name: string;
  primaryCaregiverName?: string;
  primaryCaregiverPhone?: string;
  primaryCaregiverRelation?: string;
  address?: string;
  city?: string;
  country?: string;
}) {
  const { data } = await client.post<{ data: CareUnit }>('/care-units', payload);
  return data.data;
}

export async function updateCareUnit(
  id: string,
  payload: Partial<{
    name: string;
    primaryCaregiverName: string;
    primaryCaregiverPhone: string;
    primaryCaregiverRelation: string;
    address: string;
    city: string;
    country: string;
  }>,
) {
  const { data } = await client.patch<{ data: CareUnit }>(`/care-units/${id}`, payload);
  return data.data;
}

export async function listPatients(careUnitId: string) {
  const { data } = await client.get<{ data: CarePatient[] }>(`/care-units/${careUnitId}/patients`);
  return data.data;
}

export async function createPatient(
  careUnitId: string,
  payload: {
    name: string;
    dateOfBirth?: string;
    gender?: string;
    relationship?: string;
    diagnosisCodes?: string[];
    pocName?: string;
    pocPhone?: string;
    notes?: string;
  },
) {
  const { data } = await client.post<{ data: CarePatient }>(
    `/care-units/${careUnitId}/patients`,
    payload,
  );
  return data.data;
}

export async function updatePatient(
  careUnitId: string,
  patientId: string,
  payload: Partial<{
    name: string;
    dateOfBirth: string;
    gender: string;
    relationship: string;
    diagnosisCodes: string[];
    pocName: string;
    pocPhone: string;
    notes: string;
    externalRef: string;
  }>,
) {
  const { data } = await client.patch<{ data: CarePatient }>(
    `/care-units/${careUnitId}/patients/${patientId}`,
    payload,
  );
  return data.data;
}

export async function listPatientRevisions(careUnitId: string, patientId: string) {
  const { data } = await client.get<{ data: CarePatientRevision[] }>(
    `/care-units/${careUnitId}/patients/${patientId}/revisions`,
  );
  return data.data;
}

export async function updateIntakeRequest(
  id: string,
  payload: {
    wizardPayload: Record<string, unknown>;
    reasonForCare?: string;
    serviceInterests?: ServiceCategory[];
    primaryCaregiverName?: string;
    primaryCaregiverPhone?: string;
    primaryCaregiverRelation?: string;
    syncCareUnit?: {
      address?: string;
      country?: string;
      primaryCaregiverName?: string;
    };
  },
) {
  const { data } = await client.patch<{ data: IntakeRecord }>(`/intake/${id}`, payload);
  return data.data;
}

export async function submitIntake(payload: {
  careUnitId: string;
  careRecipientId: string;
  reasonForCare: string;
  medicalHistory?: string;
  currentMeds?: string;
  diagnoses: string[];
  serviceInterests: ServiceCategory[];
  urgencyLevel?: UrgencyLevel;
  primaryCaregiverName?: string;
  primaryCaregiverPhone?: string;
  primaryCaregiverRelation?: string;
  wizardPayload?: Record<string, unknown>;
  documentIds?: string[];
  privacyConsent: boolean;
  treatmentConsent: boolean;
  telehealthConsent?: boolean;
  dataSharingConsent?: boolean;
}) {
  const { data } = await client.post<{ data: IntakeRecord }>('/intake', payload);
  return data.data;
}

export async function presignIntakeDocument(payload: {
  careUnitId: string;
  category: IntakeDocumentCategory;
  fileName: string;
  mimeType: string;
  size: number;
}) {
  const { data } = await client.post<{
    data:
      | { mode: 'multipart'; uploadPath: string; message?: string }
      | {
          mode: 's3';
          uploadUrl: string;
          key: string;
          uploadToken: string;
          expiresIn: number;
          category: string;
          careUnitId: string;
        };
  }>('/intake/documents/presign', payload);
  return data.data;
}

export async function confirmIntakeDocument(payload: {
  careUnitId: string;
  category: IntakeDocumentCategory;
  key: string;
  name: string;
  mimeType?: string;
  size?: number;
  uploadToken: string;
}) {
  const { data } = await client.post<{ data: IntakeDocument }>('/intake/documents/confirm', payload);
  return data.data;
}

export async function uploadIntakeDocument(
  careUnitId: string,
  category: IntakeDocumentCategory,
  file: File,
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('careUnitId', careUnitId);
  formData.append('category', category);

  const { data } = await client.post<{ data: IntakeDocument }>('/intake/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

/** Upload via S3 signed PUT when available, else multipart through API. */
export async function uploadIntakeDocumentSmart(
  careUnitId: string,
  category: IntakeDocumentCategory,
  file: File,
) {
  const presign = await presignIntakeDocument({
    careUnitId,
    category,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    size: file.size,
  });

  if (presign.mode === 's3') {
    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
    });
    if (!put.ok) {
      throw new Error('S3 upload failed — try again or use a smaller file.');
    }
    if (!presign.uploadToken) {
      throw new Error('Upload token missing from presign response.');
    }
    return confirmIntakeDocument({
      careUnitId,
      category,
      key: presign.key,
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      size: file.size,
      uploadToken: presign.uploadToken,
    });
  }

  return uploadIntakeDocument(careUnitId, category, file);
}

export async function getIntakeDocumentDownload(id: string) {
  const { data } = await client.get<{ data?: { url: string; name?: string }; message?: string }>(
    `/intake/documents/${id}/download`,
    { responseType: 'json', validateStatus: (s) => s < 500 },
  );
  // Local downloads may return a file blob via redirect — caller handles blob separately
  return data;
}

export function intakeDocumentDownloadUrl(id: string) {
  return `/api/intake/documents/${id}/download`;
}
