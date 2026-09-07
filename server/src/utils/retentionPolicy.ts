/** Retention TTLs for M4 PHI/PII tables (G8). */
export const RETENTION_DAYS = {
  message: 730,
  notification: 365,
  meeting: 365,
  sessionRecording: 90,
  voiceRecording: 90,
  userSession: 90,
  document: 2555,
} as const;

export function retentionExpiresAtFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function retentionCutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
