# M3 Client Audit — Remediation Tracker

**Source:** `M3_Security_GDPR_HIPAA_Source_Review.md` (client-submitted, 2026-08-10)  
**Scope:** M3-introduced findings only. Pre-existing findings (from Laravel→MERN conversion / M1–M2) are tracked separately.  
**Legend:** 🔴 Open · 🟡 In Progress · ✅ Fixed · ⏭ Deferred

---

## Summary

| Group | Total | Fixed | Open |
|-------|------:|------:|-----:|
| Access Control | 9 | 9 | 0 |
| Business Logic | 8 | 8 | 0 |
| IDOR | 2 | 2 | 0 |
| Input Validation (Upload) | 4 | 4 | 0 |
| Input Validation (Other) | 2 | 2 | 0 |
| AI Integration | 10 | 10 | 0 |
| Schema / Migration | 1 | 0 | 1 |
| Client-Side | 1 | 1 | 0 |
| **Total** | **37** | **36** | **1** |

---

## Group 1 — Access Control

### AC-01 ✅ [HIGH] Task list accepts unvalidated `episodeId` for coordinators
**File:** `server/src/controllers/TaskController.ts:67-68, 75`  
**Route:** `GET /api/tasks?episodeId=`  
Coordinator/admin uses raw `episodeId` from query without validating it belongs to their tenant.  
**Fix:** Load the episode, call `assertTenantOrgAccess`, reject if org mismatch.

---

### AC-02 ✅ [HIGH] Task update grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:45-49`  
**Route:** `PUT /api/tasks/:id`  
`canManageTask` returns `true` for any coordinator without checking the task's episode organization.  
**Fix:** Load task → episode → call `assertTenantOrgAccess(req, episode.organizationId)`.

---

### AC-03 ✅ [HIGH] Task status update grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:275-285`  
**Route:** `PATCH /api/tasks/:id/status`  
Reuses `canManageTask` — same bypass.  
**Fix:** Same as AC-02; add org check before allowing coordinator mutation.

---

### AC-04 ✅ [HIGH] Task deletion grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:259-267`  
**Route:** `DELETE /api/tasks/:id`  
Checks only `assignerId` or `COORD_ROLES`.  
**Fix:** Load task → episode → `assertTenantOrgAccess`.

---

### AC-05 ✅ [HIGH] Task completion grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:307-314`  
**Route:** `POST /api/tasks/:id/complete`  
Checks only `assigneeId` or `COORD_ROLES`.  
**Fix:** Load task → episode → `assertTenantOrgAccess`.

---

### AC-06 ✅ [HIGH] Staff assignment update lacks agency ownership check
**File:** `server/src/controllers/staff/StaffController.ts:161-167`  
**Route:** `PATCH /api/agency/assignments/:id`  
Updates any `staffAssignment` by ID without verifying it belongs to caller's agency.  
**Fix:** Load assignment first; verify `assignment.agencyId === req.user!.userId` (or agency-owner check).

---

### AC-07 ✅ [HIGH] Staff assignment delete lacks agency ownership check
**File:** `server/src/controllers/staff/StaffController.ts:175-177`  
**Route:** `DELETE /api/agency/assignments/:id`  
Same pattern as AC-06.  
**Fix:** Load assignment; verify agency ownership before delete.

---

### AC-08 ✅ [HIGH] Session list accepts unvalidated `providerId` for coordinators
**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:160-164`  
**Route:** `GET /api/scheduling/sessions?providerId=`  
Coordinators/admins never validate that the provider belongs to their tenant.  
**Fix:** Load provider; verify `provider.organizationId === req.tenant?.organizationId`.

---

### AC-09 ✅ [MEDIUM] Availability mutations allow management of null-org providers
**File:** `server/src/controllers/scheduling/AvailabilityController.ts:22-37`  
`assertTenantOrgAccess` returns without rejecting when `providerOrgId` is `null`.  
**Fix:** Treat `organizationId === null` as a 403 for non-platform-admin callers in availability mutations.

---

## Group 2 — Business Logic

### BL-01 ✅ [HIGH] Shift start race condition — concurrent active shifts
**File:** `server/src/routes/shift.routes.ts:29-52`  
**Route:** `POST /api/shifts/start`  
Check and create are not inside a transaction; two rapid requests can create two active shifts.  
**Fix:** Wrap in `prisma.$transaction` with a `findFirst` check inside the transaction, or add a unique partial index on `(assigneeId, status=active)`.

---

### BL-02 ✅ [HIGH] Care plan can be approved from `draft` without being submitted
**File:** `server/src/controllers/carePlans/CarePlanController.ts:169-198`  
**Route:** `POST /api/care-plans/:id/approve`  
`assertCarePlanTransition` is called but does not enforce the plan must be in `submitted_for_approval`.  
**Fix:** Add explicit guard: `if (plan.status !== 'submitted_for_approval') throw new AppError(...)` before `assertCarePlanTransition`.

---

### BL-03 ✅ [HIGH] Care plan can be re-approved after `revision_requested` without new submission
**File:** `server/src/controllers/carePlans/CarePlanController.ts:228-255`  
**Route:** `POST /api/care-plans/:id/request-revision`  
State machine allows `revision_requested → submitted_for_approval → approved` without substantive revision.  
**Fix:** Log the revision actor and require coordinator to re-submit explicitly; block approval if the plan hasn't been updated since revision was requested.

---

### BL-04 ✅ [MEDIUM] Intake review auto-advances without formal review checkpoint
**File:** `server/src/controllers/patients/IntakeController.ts:506-514`  
`review` moves `submitted → under_review → validated` in one transaction, skipping a checklist gate.  
**Fix:** Split into two endpoints or require a `reviewerNotes` field and log review time.

---

### BL-05 ✅ [MEDIUM] Intake status can revert from `validated` to `submitted` without reason
**File:** `server/src/controllers/patients/IntakeController.ts:439-481`  
**Route:** `PATCH /api/intake/:id/status`  
No reviewer or reason required when reverting.  
**Fix:** Require `reason` field for any backward transition; record `revertedBy` + timestamp.

---

### BL-06 ✅ [MEDIUM] Org admin can invite/deactivate without maker-checker
**File:** `server/src/controllers/org/OrgPortalController.ts:124-178, 464-519`  
Single org-admin credential can create and activate accounts silently.  
**Fix:** Log all invite and deactivation actions to `AuditService` with actor; consider a dual-approval flag for deactivation in sensitive roles.

---

### BL-07 ✅ [MEDIUM] Session `scheduledAt` and `durationMinutes` fully client-controlled
**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:42-46`  
**Route:** `POST /api/scheduling/sessions`  
No server-side validation against episode window or provider contract.  
**Fix:** Enforce `scheduledAt` is in the future and within the episode's active window; cap `durationMinutes` to a platform maximum (e.g. 480).

---

### BL-08 ✅ [MEDIUM] Agency staff `role` accepts any string
**File:** `server/src/controllers/staff/StaffController.ts:7-15`  
**Route:** `POST /api/agency/staff`  
`role: z.string()` — no enum constraint.  
**Fix:** Change to `z.enum([...ORG_STAFF_ROLES])` or the equivalent known role list.

---

## Group 3 — IDOR

### ID-01 ✅ [HIGH] Staff assignment IDOR — update/delete without ownership check
*(Duplicate of AC-06/07 — same fix applies; listed here for completeness.)*

---

### ID-02 ✅ [MEDIUM] Agency assignment links to arbitrary `bookingId`/`shiftId`
**File:** `server/src/controllers/staff/StaffController.ts:117-142`  
**Route:** `POST /api/agency/assignments`  
Validates that `staffId` belongs to the agency but not that `bookingId`/`shiftId` do.  
**Fix:** Load booking/shift; verify it belongs to the caller's agency before creating the assignment.

---

## Group 4 — Input Validation (File Upload)

### IV-01 ✅ [MEDIUM] `IntakeDocumentController.upload` — no MIME/extension check
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:192-254`  
Validates `careUnitId` and `category` but not file type.  
**Fix:** Apply `ALLOWED_UPLOAD_MIME_TYPES` allowlist; check magic bytes or extension.

---

### IV-02 ✅ [MEDIUM] `IntakeDocumentController.presign` — trusts client MIME type
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:97-138`  
`ContentType` and `ContentLength` taken from request body without allowlist validation.  
**Fix:** Validate `mimeType` against `ALLOWED_UPLOAD_MIME_TYPES` before generating presigned URL.

---

### IV-03 ✅ [MEDIUM] `IntakeDocumentController.confirm` — stores attacker-controlled S3 metadata
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:143-187`  
Accepts `key`, `name`, `mimeType`, `size` from body; only checks key prefix.  
**Fix:** Validate `mimeType` against allowlist; cap `size`; strip or validate `name`.

---

### IV-04 ✅ [MEDIUM] Local file serving skips `isValidIntakeFileKey` check
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:290-298`  
`isValidIntakeFileKey` helper exists but is not called before joining the path.  
**Fix:** Call `isValidIntakeFileKey(fileKey)` and throw 400 if invalid before serving.

---

## Group 5 — Input Validation (Other)

### IV-05 ✅ [MEDIUM] `TaskController.list` injects raw `status` into Prisma `where`
**File:** `server/src/controllers/TaskController.ts:24, 31`  
`if (status) where.status = status;` — no enum validation.  
**Fix:** Add `z.enum([...TASK_STATUSES]).optional()` validation on the `status` query param.

---

### IV-06 ✅ [LOW] `TaskController` uses `parseInt` without radix
**File:** `server/src/controllers/TaskController.ts:25`  
`parseInt(page)` / `parseInt(limit)` — missing radix.  
**Fix:** Use `parseInt(page, 10)` or replace with `Number(page)`.

---

## Group 6 — AI Integration

### AI-01 ✅ [HIGH] Care-plan draft callback has no replay/nonce protection
**File:** `server/src/routes/index.ts:71-77` + `server/src/middleware/aiServiceAuth.ts`  
Static API key with no timestamp, nonce, or request signature. Leaked key can be replayed indefinitely.  
**Fix:** Require `X-Request-Timestamp` header (reject if >5 min old) and a `X-Nonce` stored in Redis with TTL to prevent replay.

---

### AI-02 ✅ [MEDIUM] AI callback API key comparison leaks key length via timing
**File:** `server/src/middleware/aiServiceAuth.ts:6-15`  
On length mismatch, dummy `timingSafeEqual(b, b)` runs — timing difference leaks configured key length.  
**Fix:** Always pad/hash both sides to a fixed length before `timingSafeEqual`.

---

### AI-03 ✅ [MEDIUM] Callback controller has no audit log
**File:** `server/src/controllers/ai/CarePlanDraftCallbackController.ts:23-33`  
No `AuditService.log` call when a callback is received.  
**Fix:** Add `AuditService.log({ action: 'ai_care_plan_callback', entity: 'CarePlan', entityId: result.carePlanId, req })`.

---

### AI-04 ✅ [MEDIUM] Callback `episodeId` accepted without state/org validation
**File:** `server/src/services/AiCarePlanDraftService.ts:120-139`  
Episode loaded by ID but not validated for org boundary or allowed state for AI drafting.  
**Fix:** Verify episode is in a state that permits AI drafting (e.g. `active`, `care_planning`); check org context.

---

### AI-05 ✅ [MEDIUM] Authenticated chat auto-creates conversation without consent
**File:** `server/src/controllers/ai/AIChatController.ts:11-36`  
On first use, auto-creates an AI conversation row for the user without explicit consent.  
**Fix:** Check for existing consent flag on the user before auto-creating; surface a consent prompt if missing.

---

### AI-06 ✅ [MEDIUM] `AiIntakeSummaryService` sends PHI to Riayah AI without consent check
**File:** `server/src/services/AiIntakeSummaryService.ts:77-112`  
Sends DOB, gender, medical history, diagnoses, medications. No per-episode consent check before the call.  
**Fix:** Verify that the episode's care unit has recorded AI-processing consent before calling Riayah AI.

---

### AI-07 ✅ [MEDIUM] AI intake summary has no `AuditService` log at creation/approval
**File:** `server/src/services/AiIntakeSummaryService.ts:172-178, 245-249`  
Application logger only — no audit row.  
**Fix:** Add `AuditService.log` at summary generation and at coordinator approval.

---

### AI-08 ✅ [MEDIUM] `rawResponse` stored as arbitrary JSON without size cap
**File:** `server/src/services/AiCarePlanDraftService.ts:63-74`  
`rawResponse: z.record(z.unknown())` — no recursion depth or size limit.  
**Fix:** Drop `rawResponse` from storage entirely, or add `z.string().max(10000)` after `JSON.stringify`.

---

### AI-09 ✅ [MEDIUM] No content policy or prompt-injection mitigation on AI inputs
**Files:** `server/src/controllers/ai/AIChatController.ts`, `server/src/controllers/AIDoctorController.ts`  
User input forwarded to LLM with no injection checks or output filtering.  
**Fix:** Add a basic content policy layer (blocklist/pattern match on known injection patterns) before forwarding to LLM.

---

### AI-10 ✅ [MEDIUM] `react-markdown` renders AI output without HTML sanitization
**File:** `client/package.json:67,71`  
`react-markdown` does not sanitize HTML by default; `sanitize-html` is server-only.  
**Fix:** Pass `rehype-sanitize` as a plugin to `react-markdown` in all AI output rendering components.

---

## Group 7 — Schema / Migration

### SM-01 ⏭ [MEDIUM] AI intake summary migration drops and recreates `urgencyLevel` / `serviceInterests`
**File:** `server/prisma/migrations/20260727094511_ai_intake_summary/migration.sql:1-15`  
Enum column changes use `DROP COLUMN` + `ADD COLUMN` — causes data loss on existing rows.  
**Status:** Migration already applied to all environments; rewriting it is not possible after the fact. Data in these columns at migration time would have been lost. Going forward, any enum column changes must use `ALTER TYPE ... USING` or a rename-and-copy pattern. Document as a process control finding.

---

## Group 8 — Client-Side

### CS-01 ✅ [MEDIUM] `RoleGuard` leaves URL intact on denial and logs debug state
**File:** `client/src/components/RoleGuard.tsx:39-139`  
Renders a static denial UI instead of redirecting; `console.log` leaks internal role-check state.  
**Fix:** Replace with `<Navigate to="/unauthorized" replace />` on denial; remove all `console.log` statements.

---

## Remediation Order (Priority)

### This sprint — HIGH
- AC-01 → AC-08 (Task + Staff + Session cross-tenant)
- BL-01 (Shift race condition)
- BL-02 + BL-03 (Care plan approval bypass)
- AI-01 (Callback replay protection)

### Next sprint — MEDIUM
- BL-04 → BL-08 (Business logic)
- ID-02 (Agency assignment IDOR)
- IV-01 → IV-04 (Upload validation)
- IV-05 (Task status enum)
- AI-02 → AI-10 (AI hardening)
- SM-01 (Migration fix)
- CS-01 (RoleGuard)

### Backlog — LOW
- IV-06 (parseInt radix)

---

## Group 9 — Product Enhancements (Ahmed's Requirements, Revision M3)

> These are feature additions agreed during M3 revision review, not security findings.  
> PE-01–PE-05 implemented (Cursor).

---

### PE-01 ✅ Staff Profile — Self-Managed Settings Page

**Decision:** Staff fill in their own extended profile via a **Profile Settings** page inside their dashboard. Admins/agency do not enter this on their behalf.

**Shipped:**
- Schema: `ProviderProfile` extended (DOB, gender, nationality, languages, qatarId, certifications, emergency contact, availability JSON, service areas, MOH license)
- API: `GET/PATCH /api/users/me/profile`
- UI: `/clinical/profile`, `/support/profile`, `/staff/profile`
- Internal fields (Qatar ID, emergency contact, raw DOB) never returned on public staff cards — age derived for public display

**Fields explicitly excluded:** Driver's license, contract type, background check status, NDIS number.

---

### PE-02 ✅ Remove NDIS Number
Removed from disability onboarding (entire NDIS plan details block).

---

### PE-03 ✅ Auto-Detect Client Country
Onboarding step 1 detects via device timezone (incl. Pakistan); Change override retained.

---

### PE-04 ✅ Family Can Request Care Without Waiting for Approval
Family login + care unit/intake allowed with null org; soft banner; admin assign backfills.

---

### PE-05 ✅ Show Staff Photo + Details in Assessments & Sessions

**Shipped:**
- `GET /scheduling/sessions`, `/scheduling/staff`, assessments clinicians/list/show, episode show — include public staff card fields
- Episode assessments show clinician card; sessions show support worker card
- Coordinator schedule staff picker shows enriched card (photo, languages, bio excerpt)