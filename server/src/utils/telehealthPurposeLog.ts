import type { Request } from 'express';
import { AuditService } from '../services/AuditService';

export type TelehealthPurpose =
  | 'session_join'
  | 'session_host'
  | 'meeting_join'
  | 'context_view'
  | 'recording_view'
  | 'transcript_view';

/** HIPAA/GDPR purpose-of-use audit when telehealth PHI is accessed outside direct participation. */
export async function logTelehealthPurposeOfUse(opts: {
  userId: string;
  role: string;
  purpose: TelehealthPurpose;
  entity: 'Session' | 'Meeting';
  entityId: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}): Promise<void> {
  await AuditService.log({
    userId: opts.userId,
    action: 'telehealth_purpose_of_use',
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
