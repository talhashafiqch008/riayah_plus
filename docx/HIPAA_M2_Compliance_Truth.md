# HIPAA M2 Compliance — Fact-Check & Action Items

**Written:** 2026-07-23  
**Checks against:** current `milestone3` branch (post-M2 security remediation)  
**Source report:** `HIPAA_M2_Compliance_Report.md` (audited against `milestone-2` commit `161a3a9`)  
**Scope:** M2-relevant code only. M3 gaps (ClinicalNote, AiIntakeSummary, AI integration) are flagged as future scope, not M2 action items.

---

## 1. What the Report Got Wrong (Already Fixed)

These findings are **inaccurate against the current codebase** — the M2 security remediation fixed them before the branch was updated.

### H-4 (careUnit routes — no role guard)
**Report claim:** `careUnit.routes.ts` mounts `authenticate` only; no role guard.  
**Truth:** Line 8 applies `router.use(requireFamilyOrCoordinator)` at the router level. Every careUnit route already enforces family-or-coordinator access.  
**Status: Fixed — no action needed.**

### H-7 (audit logs store full ePHI snapshots)
**Report claim:** `auditRedact.ts` only redacts passwords/tokens; health data passes through unredacted.  
**Truth:** `auditRedact.ts` (lines 1–46) now redacts 28 sensitive keys including `medicalInfo`, `medicalHistory`, `currentMeds`, `diagnoses`, `findings`, `recommendations`, `intakeSummary`, `clinicalImpressions`, `flaggedRiskFactors`, `notes`, `phone`, `email`, `address`, `latitude`, `longitude`, `dateOfBirth`. `AuditService.log` calls `redactForAudit()` at lines 54–55 before writing to `AuditLog`. The AuditLog table entries are properly redacted.  
**Status: Fixed — no action needed on AuditLog.**

### H-13 (data export omits M2 ePHI)
**Report claim:** `requestDataExport` only includes `bookings`, `payments`, `messages`, `notifications`, `documents`, `reviews`, `wallet`.  
**Truth:** `PrivacyController.ts` (lines 46–119) now includes a `care` category that fetches `careUnits`, `careRecipients`, `intakeRecords`, `careEpisodes`, `assessments`, plus `emergencies`, `familyMembers`, `consents`, and `consentLogs`. The export also records a `DataExportRequest` entry.  
**Status: Substantially fixed.** One remaining gap: `GpsLog` is not included in the export (see §2 below).

### H-14 (account deletion does not cascade through ePHI)
**Report claim:** `anonymizeUser` only soft-deletes the user row and nulls some profile fields.  
**Truth:** `anonymizeUser.ts` (lines 10–176) runs a full transaction that cascades through: `User`, `ClientProfile`, `ServiceProvider`, `Message`, `Notification`, `PushNotificationToken`, `Document`, `Review`, `CareUnit`, `CareRecipient`, `IntakeRecord`, `CareEpisode`, `Assessment`, `EmergencyRequest`, `GpsLog` (hard-deleted), `Consent`, `ConsentLog`, `RefreshToken`, `OtpVerification`, `UserSession`, `AccountDeletionRequest`. The `PrivacyController` delegates to `AccountDeletionService`.  
**Status: Fixed — no action needed.**

---

## 2. What Is Partially Fixed (Remaining Gaps)

### H-4 (assessment and episode GET routes — no role guard)
**Report claim:** All assessment and episode routes lack role guards.  
**Truth:** Most mutation routes now have guards. The unguarded reads remain:
- `GET /assessments` — `authenticate` only; any logged-in user can list assessments
- `GET /assessments/:id` — `authenticate` only; any logged-in user can read any assessment
- `GET /episodes` — `authenticate` only; any logged-in user can list all episodes
- `GET /episodes/:id` — `authenticate` only; any logged-in user can read any episode

The controller logic may do some record-level scoping, but there is no route-level minimum-necessary enforcement on these reads.  
**Status: Partially fixed. Action needed — see §3, item A1.**

### H-7 (CareRecipientRevision.snapshot stores full ePHI)
`CareUnitController` writes `patientSnapshot(patient)` directly to `prisma.careRecipientRevision.create()` (lines 340–347, 399–406). `patientSnapshot` returns the full record including `name`, `dateOfBirth`, `medicalInfo`, `notes`, `diagnosisCodes`, `pocName`, `pocPhone`. This path bypasses `AuditService.log` and `redactForAudit`, so the `CareRecipientRevision` table holds unredacted ePHI snapshots.  
**Status: Not fixed. Action needed — see §3, item A2.**

### H-13 (GpsLog missing from data export)
`GpsLog` is not included in `requestDataExport`. A user whose GPS check-in data is retained cannot retrieve it via the export endpoint.  
**Status: Minor remaining gap. Action needed — see §3, item A3.**

---

## 3. What Is True and Needs M2 Action

These are the findings that are confirmed accurate in the current codebase and can be addressed in M2 code.

---

### A1 — Add role guards to assessment and episode GET routes
**From:** H-4  
**Files:**  
- `server/src/routes/assessment.routes.ts` lines 11, 13  
- `server/src/routes/episode.routes.ts` lines 13, 15  

`GET /` and `GET /:id` on both routes have no role middleware. Add `requireClinicalOrCoordinator` (or a suitable family-inclusive guard) and scope the Prisma query inside the controller to only return records owned by the requesting user or their org/care-unit.

---

### A2 — Redact ePHI in CareRecipientRevision.snapshot
**From:** H-7  
**Files:**  
- `server/src/controllers/patients/CareUnitController.ts` lines 340–347, 399–406  
- `server/src/utils/auditRedact.ts`  

`patientSnapshot()` at lines 77–105 returns the full patient row including all clinical fields. Before passing it to `prisma.careRecipientRevision.create()`, run it through `redactForAudit()` (already imported in `AuditService`) or build a stripped snapshot function that omits `medicalInfo`, `notes`, `diagnosisCodes`, `dateOfBirth`, `pocName`, `pocPhone`.

---

### A3 — Add GpsLog to data export
**From:** H-13  
**File:** `server/src/controllers/privacy/PrivacyController.ts`  

Add a `gps_logs` category to `exportSchema` and include `prisma.gpsLog.findMany({ where: { userId } })` in the `Promise.all`. Return it under `gpsLogs` in `exportData`.

---

### A4 — Authenticate Socket.io connections (H-9)
**File:** `server/src/app.ts` lines 55–60  

The socket server reads `socket.handshake.query.userId` and immediately joins `chat.{userId}` and `notification.user.{userId}` with no JWT verification. Any client can subscribe to any user's notification and chat rooms by guessing or enumerating a userId.

Fix: verify the socket against the JWT cookie or Authorization header before calling `socket.join()`. Confirm the authenticated userId matches the requested room name.

---

### A5 — Remove X-Admin-Request from CORS allowedHeaders (H-18)
**File:** `server/src/app.ts` line 99  

`'X-Admin-Request'` remains in `allowedHeaders`. The middleware correctly rejects it, but leaving it in CORS is a hygiene issue and a regression risk.

Fix: delete `'X-Admin-Request'` from the `allowedHeaders` array. One-line change.

---

### A6 — Add a notification content policy to avoid ePHI on lock screens (H-10)
**Files:**  
- `server/src/controllers/emergency/EmergencyController.ts` lines 42–49  
- `server/src/controllers/telehealth/TelehealthController.ts` lines 64–70  

`EmergencyController.raise` embeds the raw emergency `description` in the notification body. `TelehealthController.createRoom` puts the provider name in the notification body. Both can appear on device lock screens or email previews.

Fix: replace notification body content with a generic action category (e.g., `"New emergency alert — open the app"`, `"Consultation ready — open the app"`). Move details inside the app, not the push payload.

---

### A7 — Mask phone numbers in WhatsApp logs (H-15)
**File:** `server/src/services/WhatsAppService.ts` line 24`  

On failure, `sendText` logs the raw `phone` number. Phone numbers are HIPAA identifiers.

Fix: log only the last 4 digits: `` `****${phone.slice(-4)}` ``.

---

## 4. M2-Irrelevant Findings (Out of Scope for M2 Code)

The following findings are real but belong to infrastructure, policy, or M3+ milestone scope. Do not pull them into M2 work.

| Finding | Why out of M2 scope |
|---|---|
| H-1 — No BAA registry or vendor controls | Operational/legal — requires contracts with AWS, LiveKit, Meta, Google, Sentry. Not a code fix. |
| H-2 — Gemini processes ePHI without BAA | Blocks production AI doctor use — handle as a policy gate when enabling the feature for a US covered entity. Not a code change for M2. |
| H-3 — No encryption at rest | Infrastructure: PostgreSQL TDE, S3 SSE-KMS, KMS-backed column encryption. Not a source-code task. |
| H-5 — ClinicalNote has no access controls | `ClinicalNote` is M3 scope. The model exists in the schema but has no routes and no migration has created it for clinical note use. Do not implement in M2. |
| H-6 — AiIntakeSummary no access controls | M3 scope (AI integration). Schema-only; migration not yet run; no routes exist. Will be addressed in M3 Phase A. |
| H-8 — No breach notification workflow | Policy + operational — requires documented procedures, not a code change for M2. |
| H-11 — Emergency geolocation retained indefinitely | Retention cron is M3/infrastructure scope. Anonymization-on-deletion is already handled by `anonymizeUser`. |
| H-12 — GPS logs retained indefinitely | Same as H-11. `anonymizeUser` hard-deletes GpsLog on account deletion. A periodic retention cron is a separate operational task. |
| H-15 — WhatsApp ePHI without BAA | Legal/BAA issue; masking phone in logs is covered in A7 above (the only code-addressable part). |
| H-16 — Sentry may receive ePHI | Requires Sentry Business BAA + `beforeSend` scrubber config. Low priority for M2 (Sentry is disabled in default dev config). |
| H-17 — No sanctions policy or workforce training | Policy documents, not code. |

---

## 5. M2 Action Summary

| # | Action | File(s) | Effort |
|---|---|---|---|
| A1 | Add role guards to `GET /assessments`, `GET /assessments/:id`, `GET /episodes`, `GET /episodes/:id` | `assessment.routes.ts`, `episode.routes.ts` + controllers | Small |
| A2 | Redact ePHI in `CareRecipientRevision.snapshot` before write | `CareUnitController.ts` | Small |
| A3 | Add `GpsLog` to data export | `PrivacyController.ts` | Trivial |
| A4 | Authenticate Socket.io connections before joining rooms | `app.ts` | Medium |
| A5 | Remove `X-Admin-Request` from CORS `allowedHeaders` | `app.ts` | Trivial |
| A6 | Replace ePHI content in emergency and telehealth notification bodies | `EmergencyController.ts`, `TelehealthController.ts` | Small |
| A7 | Mask phone number in WhatsApp failure log | `WhatsAppService.ts` | Trivial |

**Total M2 code items: 7. No infrastructure or policy work required for M2.**
