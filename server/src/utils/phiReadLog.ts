import type { Request } from 'express';
import { AuditService } from '../services/AuditService';

/**
 * TM-003 / TM-019 — HIPAA §164.312(b) accounting of disclosures / purpose-of-use
 * for PHI reads outside the telehealth-specific helper.
 */
export type PhiReadPurpose =
  | 'clinical_note_view'
  | 'clinical_note_list'
  | 'document_download'
  | 'document_signed_url'
  | 'intake_document_download'
  | 'invoice_view'
  | 'care_summary_download'
  | 'gps_map_view'
  | 'gps_log_list'
  | 'admin_user_view'
  | 'admin_payment_view'
  | 'recording_intelligence_view';

export async function logPhiRead(opts: {
  userId: string;
  role: string;
  purpose: PhiReadPurpose;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  await AuditService.log({
    userId: opts.userId,
    action: 'phi_read',
    entity: opts.entity,
    entityId: opts.entityId,
    metadata: {
      purpose: opts.purpose,
      role: opts.role,
      ...opts.metadata,
    },
    req: opts.req,
  });
}
