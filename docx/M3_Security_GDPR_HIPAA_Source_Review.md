# Milestone 3 Source-Code Security, GDPR, and HIPAA Review

**Worktree:** `.worktrees/milestone-3`  
**Commit:** `eead16261ecb5e7136341bdbbc05372ae4666626`  
**Baseline:** `milestone2-revisions-local`  
**Report date:** 2026-08-10  
**Review type:** Read-only source-code assessment. No code was modified; no external targets were scanned.  

---

## Executive Summary

This report reviews the security, privacy, and compliance posture of the Milestone 3 (M3) branch of the Riayah Plus care platform. All findings were derived from direct inspection of `.worktrees/milestone-3` at commit `eead16261ecb5e7136341bdbbc05372ae4666626`. The M3 branch introduces new role shells (`family`, `patient`, `coordinator`, `clinical`, `support`, `org`), AI-driven intake summaries and care-plan drafts, care-unit / care-episode intake flows, and org-admin staff management. Internal pre-delivery audit findings 1–25 were verified in code; the majority were fixed, with two acknowledged as intentional.

| Class | Critical | High | Medium | Low | Info |
|---|---|---:|---:|---:|---:|
| Internal audit verification | 0 | 0 | 0 | 1 | 1 |
| Access control (OWASP A01/A07) | 0 | 8 | 15 | 5 | 2 |
| GDPR / privacy | 0 | 7 | 11 | 2 | 0 |
| HIPAA / PHI | 0 | 6 | 8 | 3 | 0 |
| Input validation / injection | 0 | 3 | 7 | 4 | 2 |
| AI integration | 0 | 1 | 4 | 3 | 2 |
| Defensive cross-checks | 0 | 0 | 1 | 2 | 1 |
| Prisma schema / migrations | 0 | 0 | 1 | 3 | 1 |
| Client-side routing / storage | 0 | 0 | 2 | 3 | 2 |
| Dependencies | 0 | 0 | 0 | 2 | 2 |
| Business logic | 0 | 6 | 8 | 4 | 1 |
| IDOR / object access | 0 | 5 | 11 | 3 | 0 |
| Auth bypass | 0 | 2 | 4 | 1 | 0 |
| API security | 0 | 2 | 3 | 1 | 0 |
| **Total** | **0** | **41** | **80** | **35** | **15** |

The highest-risk issues are concentrated in:
1. **Cross-tenant access control:** coordinators/admins can operate on tasks, sessions, availability, and staff assignments outside their organization because role-based privileges are used as a tenant-bypass.
2. **PHI disclosure to third-party AI services:** clinical and episode data is sent to Gemini and the custom Riayah AI service without in-code BAA/DPA safeguards or explicit consent.
3. **Unencrypted data export:** the GDPR portability endpoint returns a plain JSON attachment containing special-category health data.
4. **File upload allowlist bypass:** three upload paths do not enforce the shared MIME/extension allowlist, allowing arbitrary content types to be stored in S3 or on local disk.
5. **Business-logic workflow bypass:** care plans can be approved from non-submitted states, shifts can be double-started, and sessions can be booked with arbitrary dates/costs, undermining care-plan governance and billing integrity.
6. **Insecure direct object references:** invoices, staff assignments, chat conversations, documents, LMS courses, and marketplace care needs are addressable by ID without ownership or tenant scoping, allowing one authenticated user to read or mutate another user's records.
7. **Authentication bypass surface:** the LiveKit webhook has no signature validation, a public AI chat endpoint is unauthenticated, the refresh-token endpoint accepts tokens from the request body, and the SPA session endpoint does not enforce logout-all or active-user checks, creating paths for unauthorized access or session inconsistency.
8. **API security / mass assignment:** admin user and settings endpoints write raw request bodies directly to Prisma, public marketplace endpoints expose full provider profiles, and several mutation endpoints lack strict input schemas, creating privilege-escalation and data-sprawl risks.

---

## 1. Scope and Methodology

### 1.1 Scope anchor
- All file paths below are relative to `.worktrees/milestone-3` at `eead16261ecb5e7136341bdbbc05372ae4666626`.
- M2 baseline: `milestone2-revisions-local`.
- No product code was modified during the review.
- No external penetration testing, live-target scanning, or dynamic exploitation was performed.

### 1.2 Methodology
1. Confirmed the worktree HEAD matched the expected M3 boundary.
2. Generated a grouped change inventory vs. the M2 baseline.
3. Read and verified the internal pre-delivery audit (`docx/M3_PRE_DELIVERY_AUDIT.md`).
4. Mapped new and changed routes, middleware stacks, and role scoping.
5. Performed domain reviews for access control, GDPR, HIPAA, input validation, AI integration, defensive cross-checks, schema/migrations, client-side controls, dependencies, insecure direct object references, authentication bypass, and API security.
6. Consolidated findings and remediation priorities into this report.

---

## 2. Change Inventory

The diff against `milestone2-revisions-local` touched approximately 104 files across client, server, Prisma, and documentation. The major functional areas added or changed in M3 are:

- **Role shells and routing:** `client/src/routes/ProposalRoleRoutes.tsx`, `client/src/config/proposalRoleShells.ts`, `client/src/components/RoleGuard.tsx`, `client/src/layouts/HealthRoleLayout.tsx`.
- **Org admin / coordinator / clinical / support portals:** `server/src/routes/org.routes.ts`, `server/src/controllers/org/OrgPortalController.ts`, `server/src/controllers/staff/StaffController.ts`.
- **Care unit, intake, and care episode flows:** `server/src/controllers/patients/CareEpisodeController.ts`, `server/src/controllers/patients/IntakeController.ts`, `server/src/controllers/patients/IntakeDocumentController.ts`, `server/prisma/migrations/20260714_m2_care_unit_intake/migration.sql`.
- **AI integration:** `server/src/routes/ai.routes.ts`, `server/src/controllers/ai/*`, `server/src/services/AiIntakeSummaryService.ts`, `server/src/services/AiCarePlanDraftService.ts`, `server/src/services/GeminiChatService.ts`, `server/src/services/RiayahAiClient.ts`, `server/src/middleware/aiServiceAuth.ts`, `server/prisma/migrations/20260727094511_ai_intake_summary/migration.sql`.
- **Tasks, shifts, scheduling, availability:** `server/src/controllers/TaskController.ts`, `server/src/routes/shift.routes.ts`, `server/src/controllers/scheduling/SessionScheduleController.ts`, `server/src/controllers/scheduling/AvailabilityController.ts`.
- **Clinical notes:** `server/src/controllers/clinical/ClinicalNoteController.ts`, `server/src/routes/clinicalNote.routes.ts`.

A full grouped diff-stat is saved in `docx/M3_vs_M2_change_inventory_grouped.txt`.

---

## 3. Internal Pre-Delivery Audit Verification

The M3 internal pre-delivery audit contained 25 findings. Each was re-verified in the source code.

| # | Finding | Claimed status | Verified status | Evidence | Residual risk |
|---|---------|--------------|-----------------|----------|---------------|
| 1 | Coordinator can approve/reject own care plan | Fixed | Fixed | `server/src/routes/carePlan.routes.ts:49-55` — approve/revision/reject guarded with `requireRole([...FAMILY_ROLES])`. | None. |
| 2 | Active/approved care plans can be deleted | Fixed | Fixed | `server/src/controllers/carePlans/CarePlanController.ts:711-730` — `destroy` rejects protected statuses. | None. |
| 3 | AI callback demotes coordinator draft without warning | Fixed | Fixed | `server/src/services/AiCarePlanDraftService.ts:238-264` — only demotes AI-marked drafts; 409 if non-AI current plan exists. | None. |
| 4 | AI API key compared with `!==` | Fixed | Fixed | `server/src/middleware/aiServiceAuth.ts:1-15` — uses `crypto.timingSafeEqual`. | None. |
| 5 | Task create does not verify episode belongs to caller's org | Fixed | Fixed | `server/src/controllers/TaskController.ts:117-133` — loads episode and calls `assertTenantOrgAccess`; assignee org checked. | None. |
| 6 | Bulk task assign-episode has no org scope check | Fixed | Fixed | `server/src/controllers/TaskController.ts:155-181` — coordinator-only; episode and assignee org checked. | None. |
| 7 | Staff scheduling picker returns emails | Fixed | Fixed | `server/src/controllers/scheduling/SessionScheduleController.ts:140-145` — select is `{ id, name, role }`. | None. |
| 8 | Any authenticated user can start a shift | Fixed | Fixed | `server/src/routes/shift.routes.ts:11-33` — restricted to support/clinical/admin roles. | None. |
| 9 | Legacy `/shifts/tasks` POST creates tasks without org check | Fixed | Fixed | `server/src/routes/shift.routes.ts:133-168` — role-restricted and `assertTenantOrgAccess` applied. | Low: legacy path still exists. |
| 10 | Private clinical notes visible to all clinical roles in org | Acknowledged | Acknowledged | `server/src/controllers/clinical/ClinicalNoteController.ts:25-38` — unchanged. | Info/HIPAA: intentional per audit note; may be promoted if stricter minimum-necessary is required. |
| 11 | AI session PATCH has no ownership check | Fixed | Fixed | `server/src/controllers/ai/AISessionController.ts:68-89` — checks `isParticipant`, throws 403. | None. |
| 12 | Public AI chat endpoint has no dedicated rate limit | Fixed | Fixed | `server/src/routes/ai.routes.ts:16` — `POST /public/chat` uses `publicAiLimiter` (10/min). | None. |
| 13 | AI chat history `limit` param is uncapped | Fixed | Fixed | `server/src/controllers/ai/AIChatController.ts:76` — capped at `Math.min(Math.max(...), 500)`. | None. |
| 14 | AI Doctor chat has no message length validation | Fixed | Fixed | `server/src/controllers/AIDoctorController.ts:21-23` — `z.string().min(1).max(2000)`. | None. |
| 15 | Care plan notification targets null `patientId` | Fixed | Fixed | `server/src/controllers/carePlans/CarePlanController.ts:14-19` and callers use `familyNotifyUserId`. | None. |
| 16 | Org portal `pendingIntakes` returns MRN/diagnosis codes | Fixed | Fixed | `server/src/controllers/org/OrgPortalController.ts:616-618` — careRecipient select is `{ id, name }`. | None. |
| 17 | Resend invite resets active accounts' passwords | Fixed | Fixed | `server/src/controllers/org/OrgPortalController.ts:236-238` and `578-580` — returns 409 if `!mustSetPassword`. | None. |
| 18 | Org portal `listFamilies` returns coordinator email | Fixed | Fixed | `server/src/controllers/org/OrgPortalController.ts:276` — assignedCoordinator select is `{ id, name }`. | None. |
| 19 | Org portal list endpoints have no pagination | Fixed | Fixed | `server/src/controllers/org/OrgPortalController.ts:39-44` — `listPagination` helper with cap 100. | None. |
| 20 | AI draft trigger response leaks model/tokens | Fixed | Fixed | `server/src/controllers/ai/CarePlanDraftCallbackController.ts:79-89` — client response returns `ai: { status }` only. | None. |
| 21 | `submitIntake` sends notification to null `notifyUserId` | Fixed | Fixed | `server/src/controllers/patients/CareEpisodeController.ts:268-276` — skips notification when null. | None. |
| 22 | `ClinicalNoteController.index` has no `take` limit | Fixed | Fixed | `server/src/controllers/clinical/ClinicalNoteController.ts:112` — `take: 200`. | None. |
| 23 | `CareSummaryController.getTimeline` `limit` uncapped | Fixed | Fixed | `server/src/controllers/CareSummaryController.ts:85` — capped at 200. | None. |
| 24 | `GET /scheduling/sessions` skips org filter when coordinator has no org | Fixed | Fixed | `server/src/controllers/scheduling/SessionScheduleController.ts:170-173` — throws 403 if org missing. | None. |
| 25 | `aiLimiter` defined but never applied | Fixed | Fixed | `server/src/routes/ai.routes.ts:32-33,43,46` — applied to chat/stream/session-message/doctor-chat. | None. |

---

## 4. Access-Control Findings

### 4.1 Route-level observations

#### [MEDIUM] Auth-only route groups place all authorization in controllers
Multiple new route files mount endpoints with only `authenticate` and no role, org, or resource middleware. Authorization is implemented ad-hoc in each controller method, increasing the chance of single-handler bypasses.

Affected groups:
- `/api/shifts/*` (`server/src/routes/shift.routes.ts:120`, `:133`, `:170`, `:204`)
- `/api/availability/*` (`server/src/routes/availability.routes.ts:8`, `:12`, `:16`, `:20`, `:24`)
- `/api/clinical-notes/*` (`server/src/routes/clinicalNote.routes.ts:8`, `:12`, `:16`)
- `/api/scheduling/*` (`server/src/routes/scheduling.routes.ts:8`, `:12`, `:16`, `:20`, `:28`, `:32`)
- `/api/tasks/*` (`server/src/routes/tasks.routes.ts:9-15`)
- `/api/agency/*` (`server/src/routes/agency.routes.ts:9-19`)

Evidence from `server/src/routes/shift.routes.ts`:
```ts
router.get('/tasks', authenticate, async (req: Request, res: Response, next: NextFunction) => { ... });
router.post('/tasks', authenticate, async (req: Request, res: Response, next: NextFunction) => { ... });
router.patch('/tasks/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => { ... });
router.delete('/tasks/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => { ... });
```

### 4.2 Controller-side findings

#### [HIGH] Staff assignment update lacks agency ownership check
**File:** `server/src/controllers/staff/StaffController.ts:161-167`  
**Path:** `PATCH /api/agency/assignments/:id`  
Updates any `staffAssignment` row by ID without verifying it belongs to the caller's agency.

```ts
static async updateAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, notes } = z.object({ status: z.string().optional(), notes: z.string().optional() }).parse(req.body);
    const assignment = await prisma.staffAssignment.update({
      where: { id: req.params.id },
      data: { status, notes },
    });
    res.json({ success: true, assignment });
```

#### [HIGH] Staff assignment delete lacks agency ownership check
**File:** `server/src/controllers/staff/StaffController.ts:175-177`  
**Path:** `DELETE /api/agency/assignments/:id`  
Deletes any `staffAssignment` row by ID without agency verification.

```ts
static async deleteAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.staffAssignment.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Assignment removed.' });
```

#### [MEDIUM] Staff assignment creation links to unvalidated booking/shift
**File:** `server/src/controllers/staff/StaffController.ts:118-136`  
**Path:** `POST /api/agency/assignments`  
Creates an assignment referencing arbitrary `bookingId`/`shiftId` without confirming those resources belong to the caller's agency.

#### [HIGH] Task list accepts unvalidated `episodeId` for coordinators
**File:** `server/src/controllers/TaskController.ts:67-68, 75`  
**Path:** `GET /api/tasks?episodeId=...`  
Coordinator/admin role uses the raw `episodeId` query value without validating it belongs to their tenant.

```ts
} else if (COORD_ROLES.includes(role) && episodeId) {
  where.careEpisodeId = episodeId;
}
...
if (episodeId && !where.careEpisodeId) where.careEpisodeId = episodeId;
```

#### [HIGH] Task update grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:45-49, 217-224`  
**Path:** `PUT /api/tasks/:id`  
`canManageTask` returns `true` for any coordinator/admin without checking the task's care-episode organization.

```ts
function canManageTask(req: Request, task: { assignerId: string; assigneeId: string }): boolean {
  const { userId, role } = req.user!;
  if (COORD_ROLES.includes(role)) return true;
  return task.assignerId === userId || task.assigneeId === userId;
}
```

#### [HIGH] Task status update grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:275-285`  
**Path:** `PATCH /api/tasks/:id/status`  
Reuses `canManageTask`, allowing cross-tenant status updates by ID.

#### [HIGH] Task deletion grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:259-267`  
**Path:** `DELETE /api/tasks/:id`  
Checks only `assignerId` or `COORD_ROLES`, so a coordinator can delete tasks in any tenant.

#### [HIGH] Task completion grants coordinators global task access
**File:** `server/src/controllers/TaskController.ts:307-314`  
**Path:** `POST /api/tasks/:id/complete`  
Checks only `assigneeId` or `COORD_ROLES`.

#### [MEDIUM] Bulk episode task assignment mutates tasks without per-task authorization
**File:** `server/src/controllers/TaskController.ts:183-189`  
**Path:** `POST /api/tasks/assign-episode`  
`updateMany` is scoped only by `careEpisodeId` and status; it does not verify per-task authorization beyond the episode lookup.

#### [HIGH] Session list accepts unvalidated `providerId` for coordinators
**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:160-164`  
**Path:** `GET /api/scheduling/sessions?providerId=...`  
Coordinators/admins bypass ownership checks and never validate that the provider belongs to their tenant.

#### [MEDIUM] Session detail falls back to role check when episode is absent
**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:189-212`  
**Path:** `GET /api/scheduling/sessions/:id`  
If `session.episode` is null, access relies on a role list without tenant verification.

#### [MEDIUM] Availability mutations allow management of null-organization providers
**File:** `server/src/controllers/scheduling/AvailabilityController.ts:22-37`  
When `providerOrgId` is `null`, `assertTenantOrgAccess` returns without rejecting, so any coordinator/admin can manage unassigned providers across tenants.

Evidence from `server/src/middleware/tenantAccess.ts:26-37`:
```ts
export function assertTenantOrgAccess(
  req: Request,
  rowOrganizationId: string | null | undefined,
): void {
  const tw = tenantWhere(req);
  if (!tw.organizationId) return; // platform bypass
```

#### [MEDIUM] Availability store can create slots for arbitrary provider by ID
**File:** `server/src/controllers/scheduling/AvailabilityController.ts:123-141`  
**Path:** `POST /api/availability`  
A coordinator/admin can specify any active provider ID and create slots if the provider belongs to the same org (or has null org).

#### [MEDIUM] Clinical note creation is scoped to organization, not care-team assignment
**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:156-176`  
**Path:** `POST /api/clinical-notes`  
Any user with `canCreate('clinical_note')` can create notes on any episode/session in their organization.

#### [MEDIUM] Org portal pending-intakes list is org-scoped but unbounded by assignment
**File:** `server/src/controllers/org/OrgPortalController.ts`  
**Path:** `GET /api/org/pending-intakes`  
Uses `organizationId` scoping but does not enforce that the caller is the assigned coordinator for the families shown.

### 4.3 Middleware findings

#### [HIGH] `optionalAuth` ignores logout-all revocation
**File:** `server/src/middleware/auth.ts:142-161`  
`optionalAuth` validates the token and active state but never checks `wasLoggedOutAll`, so a token revoked by "logout all sessions" remains valid on optional-auth routes until it expires.

#### [HIGH] `optionalAuth` never attaches tenant context
**File:** `server/src/middleware/auth.ts:142-161` and `server/src/middleware/tenantScope.ts:34-37`  
`optionalAuth` does not call `attachTenantContext`. Downstream `tenantWhere` returns `{}` for anonymous or admin callers, bypassing organization scoping.

#### [MEDIUM] JWT verification does not restrict accepted algorithms
**File:** `server/src/middleware/auth.ts:81` and `:151`  
`jwt.verify` is invoked without an explicit `algorithms` option, leaving the door open to algorithm-confusion tokens if the deployment ever switches to asymmetric signing.

```ts
const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload & { iat: number };
```

#### [MEDIUM] Cookie token overrides Authorization header token
**File:** `server/src/utils/authCookies.ts:30-39`  
`getAccessTokenFromRequest` returns the cookie value before inspecting the `Authorization` header, allowing a cookie-injection attacker to override a user's bearer token.

#### [MEDIUM] Platform admins with no organization get cross-tenant access
**File:** `server/src/middleware/tenantScope.ts:71-73`  
`admin`/`support_admin` users lacking an organization assignment receive an empty tenant filter (`{}`).

#### [MEDIUM] `attachTenantContext` silently skips unauthenticated requests
**File:** `server/src/middleware/tenantScope.ts:34-37`  
When `req.user` is absent, `req.tenant` remains undefined and `next()` is called immediately.

#### [MEDIUM] Logout-all revocation silently fails when Redis is unavailable
**File:** `server/src/middleware/auth.ts:30-36` and `:38-46`  
Redis errors in `recordLogoutAll` and `wasLoggedOutAll` are swallowed.

#### [LOW] Auth cookies omit `__Host-`/`__Secure-` prefix and rely on environment for `secure`
**File:** `server/src/utils/authCookies.ts:11-28`  
Cookie options only set `secure` in production and lack `__Host-`/`__Secure-` prefixes.

### 4.4 Access-control remediation priority

**Immediate (High)**
1. Add agency ownership checks to `StaffController.updateAssignment` and `deleteAssignment`.
2. Scope all `TaskController` lookups and mutations to the task's care-episode organization; remove the coordinator-wide `canManageTask` bypass.
3. Validate `providerId`/`episodeId` query parameters in `SessionScheduleController.index` and `TaskController.list` against the caller's tenant.
4. Pin JWT verification to `['HS256']`.
5. Make `optionalAuth` check logout-all revocation and attach tenant context.

**This week (Medium)**
6. Add route-level role/org middleware to `/api/tasks`, `/api/shifts`, `/api/availability`, `/api/scheduling`, and `/api/clinical-notes`.
7. Treat `provider.organizationId === null` as an explicit error in availability mutations unless the caller is a platform bypass role.
8. Scope clinical-note writes to assigned care-team members, not just same-organization users.
9. Ensure `tenantWhere` returns a sentinel no-op filter for platform admins instead of `{}`.
10. Add `__Host-`/`__Secure-` prefixes and always-set `secure` flags for auth cookies in production.

**Scheduled (Low/Info)**
11. Replace duplicated care-plan item access logic with a shared helper.
12. Harden `requireRole` input validation and audit `permissions.ts` `'any'` resource usage.
13. Review the public AI chat endpoint abuse surface.

---

## 5. GDPR / Privacy Findings

### 5.1 Lawfulness, consent, and special-category data

#### [HIGH] Public/unauthenticated Gemini endpoint may process health data without consent or accountability
**File:** `server/src/routes/ai.routes.ts:16-29`  
**GDPR articles:** Art. 6, Art. 9, Art. 25  
`POST /api/ai/public/chat` is intentionally unauthenticated. It creates an AI conversation with `senderId: 'public'` and persists the message content. Any visitor can disclose health data, and there is no way to map that data to a data subject for erasure or demonstrate a lawful basis.

```ts
router.post('/public/chat', publicAiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  ...
  const convId = sessionId ?? `public-${Date.now()}`;
  const reply = await GeminiChatService.sendMessage('public', convId, message);
  res.json({ success: true, reply, sessionId: convId });
```

#### [HIGH] Riayah AI service receives re-identifiable health data without documented safeguards
**Files:** `server/src/services/RiayahAiClient.ts:197-214, 224-255`; `server/src/services/AiIntakeSummaryService.ts:77-112`; `server/src/services/AiCarePlanDraftService.ts:444-522`  
The custom AI service receives date of birth, gender, medical history, medications, diagnoses, and reason for care. Names and emails are stripped, but the residual dataset is highly re-identifiable. No in-code DPA/SCC check, no user-facing consent, and no audit log tagging the external service are present.

#### [MEDIUM] Consent model is not granular and bundles multiple purposes
**Files:** `server/src/controllers/caremanagement/ConsentController.ts:9-54`; `server/src/controllers/auth/RegistrationController.ts:29-96`  
Registration captures a single `terms_of_service` consent. There are no separate consent types for AI processing, GPS geofencing, WhatsApp messaging, or marketing. `hasAllRequired` also returns `true` if any single consent exists.

#### [MEDIUM] AI intake summary persists special-category inferences without user notification
**Files:** `server/src/services/AiIntakeSummaryService.ts:123-181`; `server/prisma/schema.prisma:2012-2026`  
AI-derived health inferences are stored linked to a care episode without notifying the family/patient or recording separate consent.

### 5.2 Data minimisation and purpose limitation

#### [MEDIUM] AI care-plan draft callback stores arbitrary `rawResponse` without classification
**File:** `server/src/services/AiCarePlanDraftService.ts:63-74`  
The callback schema permits `rawResponse: z.record(z.unknown()).nullable().optional()`. The upstream AI can echo arbitrary JSON that may later be merged into clinical notes or metadata.

#### [MEDIUM] Device fingerprint is derived from IP + user-agent and stored without transparency
**File:** `server/src/controllers/caremanagement/ConsentController.ts:15-20`  
Every consent grant stores a SHA-256 hash of `req.ip:user-agent`. The privacy policy does not disclose this fingerprinting.

#### [LOW] Public privacy policy hard-codes retention claims not fully implemented in code
**File:** `server/src/routes/public.routes.ts:21-22`  
The policy states retention periods for account anonymization, emergency location, GPS logs, notifications, and OTP. It does not mention `WhatsAppMessage`, `Message`, `ClinicalNote`, `Assessment`, `AiIntakeSummary`, `CarePlan`, or `Booking` records.

### 5.3 Right to erasure and anonymization

#### [MEDIUM] Anonymization utility leaves pseudonymous linkability
**File:** `server/src/utils/anonymizeUser.ts:11, 25, 163-166`  
The placeholder email embeds a hash of the original `userId` (`deleted_${userId.slice(0, 8)}@anonymized.local`). Consent logs are deleted entirely, removing proof of consent where a legal obligation to retain may exist.

#### [MEDIUM] Account deletion is blocked by operational records
**File:** `server/src/services/AccountDeletionService.ts:17-123`  
Deletion is refused for active bookings, open invoices, open disputes, pending payouts, open episodes, or scheduled assessments. GDPR allows erasure to be refused only for specific legal grounds; a pending payout is not a statutory refusal ground.

#### [MEDIUM] Processing-restriction flag is not enforced across mutating controllers
**File:** `server/src/middleware/processingRestriction.ts` (present) vs. controllers (no usage observed)  
A user can set `processingRestricted: true`, but most state-changing endpoints do not check the flag.

### 5.4 Right to access / portability

#### [HIGH] Data export returns unredacted special-category data without encryption or access controls
**File:** `server/src/controllers/privacy/PrivacyController.ts:31-173`  
The export is returned as a plain JSON attachment over HTTPS. It contains special-category health data and third-party PII embedded in `familyMembers`, `bookings`, and `messages`, with no password, expiry-signed URL, email verification, or re-authentication.

```ts
res.setHeader('Content-Type', 'application/json');
res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
res.json(exportData);
```

### 5.5 Storage limitation and retention

#### [HIGH] Gemini chat messages are stored indefinitely without retention policy
**Files:** `server/src/services/GeminiChatService.ts:41-46, 82-87`; `server/prisma/schema.prisma` `Message` model  
AI chat messages are persisted to `messages` but the table has no `expiresAt` and no retention cron. Deletion only occurs when a user manually clears a conversation.

#### [HIGH] GPS geofencing logs precise worker location without DPIA evidence
**Files:** `server/src/services/GPSService.ts:48-117`; `server/src/cron/scheduler.ts:245-273`  
Precise worker geolocation is collected during home visits and tied to the worker and session. A 90-day retention cron exists, but there is no in-code evidence of a DPIA, worker consent, or data-residency safeguards.

### 5.6 Third-party processors and international transfers

#### [HIGH] No in-code evidence of DPA/SCC for any processor
**File:** `server/src/config/env.ts:27-77`; `server/src/services/*`  
Environment variables reference Stripe, PayTabs, AWS SES/S3, LiveKit, Daily, Twilio, Firebase, Google Maps, WhatsApp/Meta, Sentry, and Riayah AI. No setting or table records DPA/SCC presence.

#### [MEDIUM] Sentry may export error traces containing clinical context
**File:** `server/src/app.ts:36-43, 141-144`  
Sentry is initialized with `expressIntegration` and no `beforeSend` scrubbing. Error stack traces or request bodies could include PHI.

#### [MEDIUM] Email service sends personal data through AWS SES and may log recipient addresses
**File:** `server/src/services/EmailService.ts:5-12, 23-32`  
On failure, the logger records `to: options.to`.

### 5.7 Admin surfaces with privacy impact

#### [MEDIUM] Admin user patch applies `req.body` directly without input sanitisation
**File:** `server/src/routes/admin.routes.ts:68-72`  
Raw `req.body` is passed to Prisma, allowing mass-assignment of sensitive fields.

#### [MEDIUM] Audit log CSV export leaks IP addresses without its own audit event
**File:** `server/src/routes/admin.routes.ts:131-161`  
The CSV contains `ipAddress` (personal data), returns as a plain HTTP response, and has no download audit event.

### 5.8 GDPR remediation priority

**Immediate (High)**
1. Remove or authenticate the public AI chat endpoint and require consent before processing health data.
2. Gate Riayah AI calls on explicit per-episode consent and a recorded DPA/SCC; minimize the payload.
3. Encrypt, time-limit, and re-authenticate the data export download path.
4. Implement a `subprocessors` register with DPA/SCC checks and fail closed.
5. Add a daily retention purge for `Message` (AI chat) records.
6. Require worker consent and document DPIA before creating GPS logs.

**This week (Medium)**
7. Add per-purpose consent types and enforce them for AI, GPS, WhatsApp, and marketing.
8. Enforce `processingRestricted` across mutating endpoints.
9. Replace the pseudonymizing placeholder with a random value and preserve anonymized consent logs.
10. Allow account erasure requests to soft-restrict immediately and defer hard anonymization.
11. Add `beforeSend` scrubbing to Sentry; redact recipient emails from mail logs; require TLS.
12. Discard or isolate `rawResponse` from AI care-plan callbacks.

**Scheduled (Low)**
13. Align the public privacy policy with actual retention rules.
14. Add strict Zod schemas for admin user updates and audit CSV exports.
15. Notify data subjects before AI intake summaries are generated and provide a challenge/review path.

---

## 6. HIPAA / PHI Findings

### 6.1 Business associate / subprocessor safeguards

#### [HIGH] No BAA/DPA register or transfer gate exists for PHI-touching services
**File:** `server/src/config/env.ts:27-77` and service usage across `server/src/services/*`  
**HIPAA rule:** 45 CFR § 164.502(e), § 164.504(e)  
The codebase references multiple third-party services but has no runtime check that a BAA/DPA is in place before PHI is disclosed.

#### [HIGH] Custom Riayah AI service receives PHI without a documented BAA or consent
**Files:** `server/src/services/RiayahAiClient.ts:197-214, 224-255`; `server/src/services/AiIntakeSummaryService.ts:77-112`  
The intake-summary payload sends DOB, gender, medical history, medications, diagnoses, and reason for care. This combination is generally sufficient to re-identify patients in small populations, failing HIPAA Safe Harbor.

#### [MEDIUM] AI service callback uses a single shared API key with no request signature or replay protection
**File:** `server/src/middleware/aiServiceAuth.ts:21-36`  
The callback endpoint is guarded with a static `X-API-Key`. There is no request signing, timestamp/nonce replay protection, or key rotation.

### 6.2 PHI in logs, observability, and error handling

#### [HIGH] Sentry is initialized without PHI scrubbing
**File:** `server/src/app.ts:36-43, 141-144`  
Sentry is initialized with `expressIntegration` and no `beforeSend`/`beforeSendTransaction` filters. `tracesSampleRate` is 1.0 in non-production and 0.2 in production.

#### [MEDIUM] Email failure logs may contain recipient addresses
**File:** `server/src/services/EmailService.ts:30`  
On send failure, the logger records `to: options.to`.

#### [MEDIUM] `uncaughtException` and `unhandledRejection` handlers log full stack traces without scrubbing
**File:** `server/src/app.ts:27-33`  
Unhandled errors are logged with `err.message` and `err.stack`, which may contain PHI if the error originated from a request that carried clinical data.

#### [LOW] Request logger may capture PHI in query strings or bodies
**File:** `server/src/middleware/requestLogger.ts` (not changed in M3, but relied upon by new endpoints)  
If `requestLogger` logs full URLs or bodies without redaction, new PHI-bearing endpoints will leak PHI into application logs.

### 6.3 Access control and minimum necessary

#### [MEDIUM] Clinical note private-note visibility is broader than the minimum necessary
**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:25-38`  
`canSeePrivateNote` allows any clinical staff member to view private notes, not only those involved in the episode.

#### [MEDIUM] Clinical note creation is scoped to organization, not care-team assignment
**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:156-197`  
Any user with `canCreate('clinical_note')` can create notes on any episode or session in their organization.

#### [MEDIUM] Assessment query returns patient name and email in default includes
**File:** `server/src/controllers/patients/AssessmentController.ts:50-56`  
`ASSESSMENT_INCLUDE` selects `patient: { id, name, email }` for every assessment read.

#### [LOW] Org portal coordinator/staff invite lifecycle is org-wide only
**File:** `server/src/controllers/org/OrgPortalController.ts`  
Org admin/coordinator creation and updates are scoped only by `organizationId`. There is no finer-grained clearance check.

### 6.4 Integrity, immutability, and audit logging

#### [MEDIUM] Clinical notes are immutable but not tamper-evident
**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:199-204`  
M3 makes clinical notes immutable by rejecting mutations with HTTP 405, but there is no integrity hash, chain of custody, or verifiable timestamp.

#### [MEDIUM] AI intake summary lacks an audit log at creation and approval
**File:** `server/src/services/AiIntakeSummaryService.ts:172-178, 245-249`  
The service logs to the application logger but does not write an `AuditService` row when a summary is generated or approved.

#### [LOW] Audit redaction does not cover all PHI fields used in M3
**File:** `server/src/utils/auditRedact.ts:1-50`  
The `SENSITIVE_KEYS` list may miss new fields such as `serviceInterests`, `reasonForCare`, `urgencyLevel`, `providerNotes`, `cancellationReason`, `feedback`, or custom JSON fields in `wizardPayload`.

### 6.5 Encryption and transmission security

#### [HIGH] Data export returns unencrypted PHI as a plain JSON attachment
**File:** `server/src/controllers/privacy/PrivacyController.ts:31-173`  
Same finding as GDPR section 5.4.

#### [MEDIUM] Email transport does not mandate TLS
**File:** `server/src/services/EmailService.ts:5-13`  
The transporter sets `secure: env.MAIL_PORT === 465` but does not set `requireTLS: true`.

#### [LOW] Cookie options lack `__Host-`/`__Secure-` prefixes and always-on `secure`
**File:** `server/src/utils/authCookies.ts:11-28`  
Auth cookies set `secure: env.isProd` and lack `__Host-`/`__Secure-` prefixes.

### 6.6 Workforce clearance and user provisioning

#### [MEDIUM] Admin user update passes raw `req.body` to Prisma
**File:** `server/src/routes/admin.routes.ts:68-72`  
Same finding as GDPR section 5.7.

#### [LOW] CSV audit-log export contains IP addresses without its own audit event
**File:** `server/src/routes/admin.routes.ts:131-161`  
Same finding as GDPR section 5.7.

### 6.7 HIPAA remediation priority

**Immediate (High)**
1. Establish and enforce a BAA/DPA register for all PHI subprocessors; fail closed when a contract is missing.
2. Reduce the Riayah AI payload and obtain/document a BAA before processing production PHI.
3. Add Sentry `beforeSend`/`beforeSendTransaction` PHI scrubbers.
4. Encrypt and access-control the data-export download path.

**This week (Medium)**
5. Mandate TLS for SMTP and redact `to` from email failure logs.
6. Restrict private-note visibility to the author and assigned care team; audit every private-note view.
7. Add `AuditService` rows for AI intake summary generation and approval.
8. Scope clinical-note creation to assigned care-team members.
9. Apply a strict allow-list schema to admin user updates.
10. Redact PHI from uncaught exception and request logs.

**Scheduled (Low)**
11. Harden auth-cookie flags in all environments.
12. Add tamper-evidence (hash/chain) to clinical notes and log deletion attempts.
13. Expand `auditRedact` to cover all free-text PHI fields introduced in M3.
14. Add replay-resistant request signing for the AI callback.

---

## 7. Input-Validation and Injection Findings

### 7.1 SQL / NoSQL injection

#### [MEDIUM] `status` and `severity` query params cast directly to string enums without validation
**File:** `server/src/controllers/admin/AdvancedAdminController.ts:178-188`  
**Path:** `GET /api/admin/incidents?severity=&status=`  
`severity` and `status` are taken from `req.query` and placed directly into a Prisma `where` object without a Zod schema.

#### [MEDIUM] `TaskController.list` injects raw `status` string into Prisma `where`
**File:** `server/src/controllers/TaskController.ts:24, 31`  
**Path:** `GET /api/tasks?status=`  
`if (status) where.status = status;`

#### [MEDIUM] `AssessmentController.index` assigns raw `status` string to enum field
**File:** `server/src/controllers/patients/AssessmentController.ts:191-192`  
`where.status = status as AssessmentStatus;`

#### [LOW] `CarePlanController` goal/item fields accept unconstrained strings and numbers
**File:** `server/src/controllers/carePlans/CarePlanController.ts:32-65`  
Zod schemas for goals/items do not enforce length limits or enum values on most free-text fields.

### 7.2 File upload

#### [HIGH] Legacy `document.routes.ts` upload accepts any file type
**File:** `server/src/routes/document.routes.ts:19-46`  
Uses `multer.memoryStorage()` with only a size limit; no MIME type, extension, or magic-byte validation. The S3 key contains raw `originalname`, and `ContentType` is attacker-controlled.

#### [HIGH] `DocumentController.uploadFile` also accepts any file type
**File:** `server/src/controllers/DocumentController.ts:62-99`  
Same pattern: no validation, raw extension extracted from `originalname`, S3 object created with attacker-controlled `ContentType`.

#### [MEDIUM] `IntakeDocumentController.upload` validates category but not file type
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:192-254`  
Validates `careUnitId` and `category`, sanitizes filename, but does not enforce `ALLOWED_UPLOAD_MIME_TYPES`.

#### [MEDIUM] `IntakeDocumentController.presign` trusts client-supplied MIME type and size
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:97-138`  
Generates a presigned PUT URL with `ContentType: mimeType` and `ContentLength: size` from `req.body` without allowlist validation.

#### [MEDIUM] `IntakeDocumentController.confirm` stores attacker-controlled S3 key and metadata
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:143-187`  
Accepts `key`, `name`, `mimeType`, and `size` from the body and checks only that `key.startsWith(`intake/${userId}/`)`.

#### [MEDIUM] Local file serving uses `path.basename(fileKey)` without validating key shape
**File:** `server/src/controllers/patients/IntakeDocumentController.ts:290-298`  
For local storage, the code joins `LOCAL_UPLOAD_ROOT`, `doc.userId`, and `path.basename(fileKey)`. The helper `isValidIntakeFileKey` exists in `uploadAllowlist.ts` but is not called.

### 7.3 Date/time / numeric parsing

#### [MEDIUM] `new Date(raw)` used for multiple request inputs without format enforcement
**Files:**
- `server/src/controllers/patients/IntakeController.ts:332`
- `server/src/controllers/carePlans/CarePlanController.ts`
- `server/src/controllers/scheduling/SessionScheduleController.ts:42-46`
- `server/src/controllers/patients/AssessmentController.ts:82-86`

`new Date` accepts a wide range of strings. Inconsistent client behavior can lead to scheduling errors or stored `Invalid Date`.

#### [LOW] `parseInt(page)` / `parseInt(limit)` used without radix in `TaskController.list`
**File:** `server/src/controllers/TaskController.ts:25`  
`const skip = (parseInt(page) - 1) * parseInt(limit);`

### 7.4 AI / callback payload validation

#### [MEDIUM] AI care-plan callback stores `rawResponse` as arbitrary JSON
**File:** `server/src/services/AiCarePlanDraftService.ts:63-74`  
`rawResponse: z.record(z.unknown()).nullable().optional()` is stored without recursive validation or size cap.

#### [MEDIUM] `RiayahAiClient` logs error detail with `JSON.stringify(detail).slice(0, 200)`
**File:** `server/src/services/RiayahAiClient.ts:165-187`  
Truncated remote error detail is still written to application logs.

#### [LOW] `AIChatController` does not sanitize message content before persistence
**File:** `server/src/controllers/ai/AIChatController.ts:7`  
Messages are validated only as `z.string().min(1).max(2000)` and persisted to the `message` table.

### 7.5 Input-validation remediation priority

**Immediate (High)**
1. Enforce `ALLOWED_UPLOAD_MIME_TYPES` and extension allowlisting in all upload paths.
2. Validate S3 callback metadata (`name`, `mimeType`, `size`) against the same policy used for direct uploads.
3. Use `isValidIntakeFileKey` before serving local files.

**This week (Medium)**
4. Add Zod schemas for all query parameters (enum validation, pagination clamps).
5. Replace `new Date(raw)` with strict ISO-8601 Zod schemas across `IntakeController`, `CarePlanController`, `SessionScheduleController`, and `AssessmentController`.
6. Cap size and recursion depth on AI callback `rawResponse` and other free-form JSON metadata.
7. Add explicit radix to `parseInt` calls and clamp page/limit values.

**Scheduled (Low)**
8. Apply server-side output encoding or sanitization to persisted AI chat messages and care-plan free-text fields.
9. Review whether the local upload root should be outside the application tree and served with `Content-Disposition: attachment`.

---

## 8. AI Integration Findings

### 8.1 AI callback security

#### [HIGH] Care-plan draft callback has no replay / timestamp / nonce protection
**File:** `server/src/routes/index.ts:71-77` + `server/src/controllers/ai/CarePlanDraftCallbackController.ts:23-33` + `server/src/services/AiCarePlanDraftService.ts:120-163`  
The callback is protected by a static API key and performs idempotent upserts, but it does not validate a nonce, timestamp, or request signature. A leaked or brute-forced key can be replayed indefinitely.

#### [MEDIUM] Callback API key comparison has a length-leaking side-channel
**File:** `server/src/middleware/aiServiceAuth.ts:6-15`  
On length mismatch, the helper performs a dummy `timingSafeEqual(b, b)` and returns `false`. The timing difference can leak the configured key length.

#### [MEDIUM] Callback controller does not log or audit the remote caller identity
**File:** `server/src/controllers/ai/CarePlanDraftCallbackController.ts:23-33`  
No `AuditService.log` call exists in the callback handler.

#### [MEDIUM] Callback schema accepts `episodeId` without verifying organization/state
**File:** `server/src/services/AiCarePlanDraftService.ts:120-139`  
`handleCallback` looks up the episode by ID but does not assert it is in a state that allows AI drafting or verify organization boundaries.

### 8.2 Public / authenticated chat security

#### [MEDIUM] Public AI chat is unauthenticated and rate-limited only by IP
**File:** `server/src/routes/ai.routes.ts:16-29`  
Protected by `publicAiLimiter` (10/min) but has no CAPTCHA, bot detection, content policy, or per-user accountability.

#### [MEDIUM] Authenticated chat endpoint auto-creates a conversation without explicit consent
**File:** `server/src/controllers/ai/AIChatController.ts:11-36`  
On first use, the controller auto-creates an AI conversation row and participant link for the authenticated user.

#### [LOW] `AIDoctorController` does not persist messages or audit the clinical query
**File:** `server/src/controllers/AIDoctorController.ts:27-44`  
No audit log, no persistence, no input/output filtering.

### 8.3 Data boundary / privacy / BAA

#### [MEDIUM] Health data is sent to external Gemini and Riayah AI services
**Files:** `server/src/services/GeminiChatService.ts`, `server/src/services/AiIntakeSummaryService.ts`, `server/src/services/AiCarePlanDraftService.ts`  
No in-code evidence of BAA/DPA or model-usage policy.

#### [MEDIUM] `AiIntakeSummaryService` builds payload with diagnoses and DOB but no explicit consent check
**File:** `server/src/services/AiIntakeSummaryService.ts:77-112`

#### [LOW] AI service URL is configurable and may point to staging
**File:** `server/src/services/RiayahAiClient.ts:147-162`

### 8.4 Prompt / output handling

#### [MEDIUM] No input/output content policy or prompt-injection mitigation
**Files:** `server/src/controllers/ai/AIChatController.ts`, `server/src/controllers/AIDoctorController.ts`, `server/src/controllers/ai/CarePlanDraftCallbackController.ts`

### 8.5 AI remediation priority

**Immediate (High)**
1. Add replay protection to `/api/ai/callbacks/care-plan-draft`: require a unique `idempotencyKey` per request and store processed keys, or use a signed/timestamped HMAC.

**This week (Medium)**
2. Harden API-key comparison to constant-time regardless of length.
3. Add audit logging for every AI callback call.
4. Add content-policy / prompt-injection checks on public chat input and filter AI output.
5. Document and enforce BAA/DPA status for Gemini and Riayah AI.
6. Add explicit consent verification before sending intake/episode data to Riayah AI.

**Scheduled (Low)**
7. Add SSE output encoding validation and response-size limits.
8. Consider adding a source-IP allowlist for callbacks.

---

## 9. Defensive Cross-Checks

### 9.1 CORS / host-header / ATO

#### [MEDIUM] CORS allowlist permits credentials and allows localhost origins in all environments
**File:** `server/src/app.ts:103-114`  
Hard-coded `http://localhost:3000` and `http://localhost:5173` origins widen the credentialed CORS surface in production.

#### [LOW] No explicit host-header validation
**File:** `server/src/app.ts`  
The application does not validate `Host` or reject `X-Forwarded-Host`/`X-Forwarded-Port` overrides.

#### [LOW] Error handler forwards `err.details` to the client
**File:** `server/src/middleware/errorHandler.ts:44-52`  
If a controller passes internal state as `details`, the client receives it.

### 9.2 Authentication / session controls

- Rate limiting is applied to login, register, forgot-password, OTP, and admin-login endpoints.
- Password reset uses single-use tokens and revokes all sessions/tokens on success.
- Refresh token rotation is implemented.
- Family/patient accounts require an assigned organization before login.
- Email verification is enforced before login and 2FA completion.
- Logout-all revokes refresh tokens and user sessions.
- Login always runs bcrypt against a dummy hash to prevent timing enumeration.

#### [INFO] 2FA setup exposes the raw base32 secret to the client
**File:** `server/src/controllers/auth/AuthController.ts:431-443`

### 9.3 Defensive remediation priority

**This week (Medium)**
1. Remove hard-coded localhost origins from the production CORS allowlist.

**Scheduled (Low)**
2. Add host-header allowlist or `trust proxy` validation for reverse-proxy deployments.
3. Audit every `new AppError(..., ..., details)` construction to ensure no internal state is passed as details.

---

## 10. Prisma Schema and Migration Findings

### 10.1 Migration safety

#### [MEDIUM] AI intake summary migration drops and recreates clinical columns on `care_episodes`
**File:** `server/prisma/migrations/20260727094511_ai_intake_summary/migration.sql:1-15`  
Prisma-generated warnings indicate that `urgencyLevel` and `serviceInterests` will be dropped and recreated, causing data loss if the columns already contain values.

```sql
ALTER TABLE "care_episodes" DROP COLUMN "urgencyLevel",
ADD COLUMN     "urgencyLevel" "UrgencyLevel",
DROP COLUMN "serviceInterests",
ADD COLUMN     "serviceInterests" "ServiceCategory"[],
```

### 10.2 PHI / privacy model changes

#### [LOW] `ai_intake_summaries` stores clinical impressions and flagged risk factors without retention policy
**File:** `server/prisma/migrations/20260727094511_ai_intake_summary/migration.sql:17-37`

#### [LOW] Free-text clinical fields lack encryption-at-rest annotations
**Files:** `server/prisma/migrations/20260714_m2_care_unit_intake/migration.sql:68-94`, `server/prisma/migrations/20260714_m2_care_episode_columns/migration.sql:1-5`

#### [LOW] Unique index on nullable `care_recipients.externalRef`
**File:** `server/prisma/migrations/20260714_m2_care_unit_intake/migration.sql:97-113`  
PostgreSQL allows duplicate NULL values, which is usually fine but should be revisited if `externalRef` becomes non-null.

### 10.3 Schema remediation priority

**This week (Medium)**
1. Rewrite the AI intake summary migration to preserve existing `care_episodes.urgencyLevel` and `serviceInterests` data when converting to enums.

**Scheduled (Low)**
2. Add a retention/deletion policy for `ai_intake_summaries` rows.
3. Document whether clinical free-text columns rely on filesystem/database-level encryption.

---

## 11. Client-Side Findings

### 11.1 Route guards and role routing

#### [MEDIUM] `RoleGuard` does not redirect when access is denied; renders a static denial UI with debug logs
**File:** `client/src/components/RoleGuard.tsx:39-139`  
The guard leaves the URL intact and uses `console.log` statements that leak internal role-check state.

#### [LOW] `ProposalRoleRoutes` uses runtime `string[]` for `allowedRoles`
**File:** `client/src/routes/ProposalRoleRoutes.tsx:78`  
Typos in shell config are not caught at compile time.

### 11.2 Storage of sensitive data

#### [MEDIUM] Client still stores token and user object in `localStorage` despite project convention of httpOnly cookies
**File:** `client/src/lib/storage-keys.ts:1-13`

#### [LOW] Onboarding draft data is persisted to `localStorage` and may contain PPI
**File:** `client/src/hooks/useCareseekerDashboard.ts:88-109`

#### [LOW] Provider client pages render full names, emails, phone numbers, and addresses without masking
**Files:** `client/src/pages/provider/ClientsPage.tsx:17-70`, `client/src/pages/provider/PatientDetailPage.tsx:32-69`

### 11.3 Client remediation priority

**This week (Medium)**
1. Remove `localStorage` token keys from `storage-keys.ts` and migrate client auth to httpOnly cookies only.
2. Replace `RoleGuard` debug `console.log` statements and add an immediate `Navigate` fallback on denial.

**Scheduled (Low)**
3. Tighten `allowedRoles` typing in `proposalRoleShells.ts` to a union of known roles.
4. Add a `clearOnboardingDraft` utility that purges the careseeker onboarding `localStorage` entry once onboarding is complete.

---

## 12. Business-Logic Findings

A business-logic audit of the M3 workflows identified additional issues that are not injection or access-control bugs but instead exploit assumptions embedded in the care-platform workflows. Findings are grouped by workflow.

### 12.1 Workflow / state-machine flaws

#### [HIGH] Care plan can be approved while still in `draft` by skipping the submit step
**File:** `server/src/controllers/carePlans/CarePlanController.ts:169-198, 200-226`
**Path:** `POST /api/care-plans/:id/approve`
The `approve` method calls `assertCarePlanTransition(plan.status, 'approved')` but does not verify the plan is currently `submitted_for_approval`. Because the state machine permits `submitted_for_approval → approved` but `approve` does not require that exact starting state, a family user who has view access can approve a plan that a coordinator never submitted, prematurely activating the episode and bypassing the coordinator review gate.

```ts
static async approve(req: Request, res: Response): Promise<void> {
  ...
  assertCarePlanTransition(plan.status, 'approved');
  ...
}
```

#### [HIGH] Care plan can be re-approved after `revision_requested` without a new submission
**File:** `server/src/controllers/carePlans/CarePlanController.ts:228-255`
**Path:** `POST /api/care-plans/:id/request-revision`
A family user can call `requestRevision`, but the state machine allows `revision_requested → submitted_for_approval` and `submitted_for_approval → approved`. The controller allows the original coordinator (or any coordinator in the org) to move the plan back to approved even if no substantive revision was made, defeating the revision loop.

#### [MEDIUM] Intake can be reviewed/validated without passing through `under_review`
**File:** `server/src/controllers/patients/IntakeController.ts:506-514`
The `review` method auto-advances `submitted → under_review → validated` inside the same transaction. This is intentional, but there is no separate endpoint or lock that forces a coordinator to actually enter review state before validating. A malicious or fat-fingered coordinator can create an episode directly from a submitted intake, skipping the formal review step and any UI-enforced checklist.

#### [MEDIUM] Intake status can move from `validated` back to `submitted` via `updateStatus`
**File:** `server/src/controllers/patients/IntakeController.ts:439-481`
**Path:** `PATCH /api/intake/:id/status`
`assertIntakeTransition` allows `under_review → submitted`. A coordinator can revert a validated intake to `submitted` only by going through `under_review`, but the controller does not record a reviewer or require a reason, so validated data can be silently returned to an unvalidated state. The same endpoint also accepts `episode_created` in the body but returns a 422; this is correctly blocked.

#### [MEDIUM] Shift can be ended by a coordinator without having started it
**File:** `server/src/routes/shift.routes.ts:54-65`
**Path:** `POST /api/shifts/:id/end`
`loadOwnShiftOrThrow` treats `care_coordinator` as an admin-equivalent role (`isAdmin` array includes `'care_coordinator'`). A coordinator can therefore end any shift by ID, including one belonging to a worker in a different org if the cross-tenant checks elsewhere fail, and can end a shift that was never active.

### 12.2 Self-approval / segregation-of-duties flaws

#### [HIGH] Coordinator can create and approve their own care plan for a family
**File:** `server/src/routes/carePlan.routes.ts:44, 48, 49`
**Path:** `POST /api/care-plans` → `POST /api/care-plans/:id/submit` → `POST /api/care-plans/:id/approve`
The routes correctly restrict `store`/`submit` to coordinators and `approve` to family roles, but nothing prevents a coordinator from registering a separate family account (or using an existing family account they control) and approving plans they authored. The audit log records `actorId` but does not enforce that approver is independent of the authoring coordinator. This is a latent segregation-of-duties issue: the same person can be both drafter and approver if they control both accounts.

#### [MEDIUM] Org admin can invite, activate, and deactivate their own staff and coordinators without maker-checker
**File:** `server/src/controllers/org/OrgPortalController.ts:124-178, 464-519`
**Paths:** `POST /api/org/coordinators`, `POST /api/org/staff`
Org admins can create accounts, resend invites, and deactivate accounts single-handedly. There is no dual-control requirement or separation between account creation and activation. A compromised org-admin credential can silently create a new `clinical_staff` account and assign it to episodes.

#### [MEDIUM] Agency owner can assign their own staff to arbitrary bookings/shifts
**File:** `server/src/controllers/staff/StaffController.ts:117-142`
**Path:** `POST /api/agency/assignments`
`assign` validates that the staff member belongs to the agency, but it does not validate that the referenced `bookingId` or `shiftId` belongs to the same agency or that the agency has any legitimate relationship to the booking. The `bookingId`/`shiftId` are accepted as arbitrary foreign keys, allowing an agency to link its staff to bookings in other agencies or orgs.

### 12.3 Race-condition / TOCTOU flaws

#### [HIGH] Shift start does not prevent concurrent active shifts
**File:** `server/src/routes/shift.routes.ts:29-52`
**Path:** `POST /api/shifts/start`
The controller checks for an existing active shift and then creates a new one, but the check and create are not inside a transaction or unique constraint. Two rapid `start` requests can create two overlapping `active` shifts for the same worker, enabling double billing or time fraud.

#### [MEDIUM] Recurring session creation is not atomic
**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:276-363`
**Path:** `POST /api/scheduling/sessions/recurring`
Each occurrence is created in a loop without a transaction around the entire set. If a partial failure occurs, some sessions are booked and others are not, leaving the episode in an inconsistent state. The `skipped` list is returned but there is no rollback of already-created sessions.

#### [MEDIUM] Availability `replace` deletes then creates slots non-atomically
**File:** `server/src/controllers/scheduling/AvailabilityController.ts:83-120`
**Path:** `PUT /api/availability/:providerId`
The transaction deletes all existing slots and then creates new ones. Because the transaction wraps both steps, it is atomic at the DB level, but there is no advisory lock preventing concurrent `replace` calls from different coordinators on the same provider. The second transaction may delete the first transaction's newly inserted slots before they commit, causing availability to be lost.

### 12.4 Parameter tampering / client-trusted values

#### [MEDIUM] Session `scheduledAt` and `durationMinutes` are fully client-controlled
**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:42-46, 215-274`
**Path:** `POST /api/scheduling/sessions`
The server parses `scheduledAt` from the client string and accepts `durationMinutes` up to 24 hours. There is no server-side business-rule validation against the episode's approved care plan, provider contract, or operating hours. A coordinator can book a 24-hour session at any historical or far-future datetime.

#### [MEDIUM] Care plan `unitCost` is accepted from the client without lookup
**File:** `server/src/controllers/carePlans/CarePlanController.ts:19-26`
`itemSchema` includes `unitCost: z.number().optional()` and the route schema in `carePlan.routes.ts:79-87` accepts `unitCost` and `currency` directly from the request. The server does not look up the service catalog price, allowing a coordinator to set arbitrary costs on care-plan items that may later drive invoices or reports.

#### [LOW] Task `estimatedDuration` and `actualDuration` are unbounded
**File:** `server/src/controllers/TaskController.ts:1-15`
**Path:** `POST /api/tasks`, `PATCH /api/tasks/:id/status`
`createTaskSchema` requires `estimatedDuration` to be a positive integer but does not cap it. The status-update endpoint accepts `actualDuration` with no validation. Extremely large values can distort billing/labor analytics.

### 12.5 Step-skip / verification bypass

#### [MEDIUM] Staff invite accept endpoint is not protected against role elevation
**File:** `server/src/controllers/org/OrgPortalController.ts:52-57`
`createStaffSchema` uses `z.enum(ORG_STAFF_ROLES)` for the staff invite, but the same schema is not enforced when a user accepts the invite via the password-reset flow. The `sendInviteSetPassword` utility creates the user with the requested role, and the password-set endpoint only checks `mustSetPassword`, not the original invite role. There is no evidence of an explicit role-confirmation step on accept.

#### [MEDIUM] Agency staff role can be any string
**File:** `server/src/controllers/staff/StaffController.ts:7-15`
**Path:** `POST /api/agency/staff`
`createStaffSchema` accepts `role: z.string()` with no enum constraint. An agency owner can create staff with arbitrary role values that may be trusted elsewhere in the UI or reporting logic.

### 12.6 Business-logic remediation priority

**This week (High)**
1. Enforce that `POST /api/care-plans/:id/approve` only succeeds from `submitted_for_approval` status and log approver independence (separate from drafter).
2. Wrap `POST /api/shifts/start` in a transaction or unique partial index to prevent concurrent active shifts for the same worker.
3. Validate `bookingId`/`shiftId` in `POST /api/agency/assignments` against the agency's scope.
4. Add server-side business-rule validation for session `scheduledAt` (future-only, within episode window) and `durationMinutes` (max per episode / provider contract).
5. Look up care-plan item prices from a service catalog and reject arbitrary `unitCost`/`currency`.

**This week (Medium)**
6. Require an explicit review checkpoint before `IntakeController.review` auto-advances to validated; log reviewer notes and time-in-review.
7. Add maker-checker or audit-only dual-control for org admin invite/deactivate operations.
8. Make `AvailabilityController.replace` idempotent or serializable per provider (advisory lock or optimistic concurrency).
9. Cap `estimatedDuration`/`actualDuration` and reject historical / far-future task due dates.
10. Restrict `createStaffSchema.role` to a known enum and re-validate the invite role on password set.

**Scheduled (Low)**
11. Add workflow-level integrity checks: care-plan approval cannot occur until intake is `episode_created`; sessions cannot be booked against `on_hold` episodes.
12. Return atomic results for recurring session creation and support rollback of partial bookings.
13. Add business-rule unit tests for each workflow state machine.

---

## 13. IDOR Findings

A source-code IDOR (insecure direct object reference) review of the M3 controllers and routes identified several endpoints that accept object identifiers without verifying that the caller owns or is authorized to access the referenced object. The issues below are grouped by workflow. All evidence is from `.worktrees/milestone-3/server/src`.

### 13.1 Billing / invoices

#### [HIGH] `GET /api/invoices/:id` returns any invoice without ownership check
**File:** `server/src/controllers/billing/InvoiceController.ts:96-103`  
**Route:** `server/src/routes/invoice.routes.ts:9,13`  
`InvoiceController.show` loads the invoice by `req.params.id` and returns it with `client` and `payments` included. The route group only applies `authenticate`; there is no check that the caller is the client, the issuer, or a tenant admin.

```ts
const invoice = await prisma.invoice.findUnique({
  where: { id: req.params.id },
  include: { client: true, payments: true },
});
```

#### [HIGH] `POST /api/invoices/:id/send` and `POST /api/invoices/:id/mark-paid` mutate any invoice
**File:** `server/src/controllers/billing/InvoiceController.ts:105-133,135-161`  
**Route:** `server/src/routes/invoice.routes.ts:9,14-15`  
`send` and `markPaid` look up the invoice only by ID, then update status and optionally create a payment record. Any authenticated user can send invoices to clients or mark arbitrary invoices as paid.

#### [MEDIUM] `POST /api/invoices` accepts arbitrary `clientId` and `episodeId`
**File:** `server/src/controllers/billing/InvoiceController.ts:69-94`  
**Route:** `server/src/routes/invoice.routes.ts:9,12`  
`store` creates an invoice using the `clientId` supplied in the body without verifying that the caller is authorized to invoice that client or episode.

---

### 13.2 Documents / KYC

#### [MEDIUM-HIGH] `POST /api/documents/:id/approve` and `POST /api/documents/:id/reject` lack tenant/owner scoping
**File:** `server/src/routes/document.routes.ts:127-148`  
The route only checks that the caller has one of `admin`, `super_admin`, `support_admin`, or `care_coordinator` roles. It does not verify the document's owner belongs to the caller's tenant, so a coordinator in one organization can approve or reject documents uploaded by users in another organization.

```ts
if (!['admin', 'super_admin', 'support_admin', 'care_coordinator'].includes(req.user!.role)) {
  throw new AppError('Forbidden.', 403);
}
await prisma.document.update({
  where: { id: req.params.id },
  data: { status: 'approved', verifierId: req.user!.userId, verifiedAt: new Date() },
});
```

#### [MEDIUM] Document signed-URL fallback trusts key prefixes only
**File:** `server/src/controllers/DocumentController.ts:61-99`, `server/src/routes/document.routes.ts:78-96`  
`getSignedUrl` allows any key under `documents/{callerUserId}/` or `intake/{callerUserId}/`. If a leaked S3 key belongs to another user, the prefix check is the only guard. The DB fallback only matches documents owned by the caller.

#### [MEDIUM] `PATCH /api/document-requests/:id/fulfill` does not validate the supplied `documentId`
**File:** `server/src/controllers/documents/DocumentRequestController.ts:118-142`  
The controller checks that the caller is the request's `targetUserId` but does not verify that the supplied `documentId` belongs to the caller before linking it to the request.

---

### 13.3 Staff / agency assignments

#### [HIGH] `PATCH /api/agency/assignments/:id` and `DELETE /api/agency/assignments/:id` have no ownership check
**File:** `server/src/controllers/staff/StaffController.ts:160-182`  
**Route:** `server/src/routes/agency.routes.ts:6,18-19`  
`updateAssignment` and `deleteAssignment` mutate the `staffAssignment` row by ID without loading it or verifying that it belongs to the caller's agency. The parent route only applies `authenticate`.

```ts
const assignment = await prisma.staffAssignment.update({
  where: { id: req.params.id },
  data: { status, notes },
});
```

#### [MEDIUM] `POST /api/agency/assignments` links staff to arbitrary booking/shift IDs
**File:** `server/src/controllers/staff/StaffController.ts:117-142`  
The controller checks that `staffId` belongs to the caller's agency but accepts `bookingId` and `shiftId` from the body without verifying that those resources belong to the agency.

---

### 13.4 Chat / messaging

#### [MEDIUM] `GET /api/chat/:conversationId/messages` and `PATCH /api/chat/:conversationId/read` do not verify participation
**File:** `server/src/controllers/chat/ChatController.ts:58-71,112-122`  
**Route:** `server/src/routes/chat.routes.ts:6,10,12`  
Both endpoints query messages by `conversationId` without checking that the caller is a participant in that conversation. Any authenticated user can read messages from any conversation and mark messages as read.

#### [MEDIUM] `POST /api/chat` can inject messages into any conversation
**File:** `server/src/controllers/chat/ChatController.ts:73-110`  
**Route:** `server/src/routes/chat.routes.ts:6,11`  
`store` accepts an optional `conversationId` and a `receiverId` but does not verify that the caller participates in the supplied conversation before creating the message and updating `lastMessageAt`.

---

### 13.5 Marketplace / care needs

#### [MEDIUM] `GET /api/care-needs/:id` returns any care need including bids
**File:** `server/src/controllers/marketplace/CareNeedController.ts:116-133`  
**Route:** `server/src/routes/marketplace.routes.ts:7,12`  
`show` returns the care need by ID with client and bid details, including provider identities, without checking ownership. The list endpoint scopes results to the caller's own needs or open provider needs, but `show` does not.

#### [MEDIUM] `POST /api/care-needs/:id/bids` allows any authenticated user to bid
**File:** `server/src/controllers/marketplace/CareNeedController.ts:171-201`  
**Route:** `server/src/routes/marketplace.routes.ts:20`  
`placeBid` checks only that the care need is open, not that the caller is a provider or has any relationship to the client.

---

### 13.6 LMS / training

#### [MEDIUM] `POST /api/courses/:id/lessons` adds lessons without ownership check
**File:** `server/src/controllers/lms/CourseController.ts:129-138`  
**Route:** `server/src/routes/lms.routes.ts:9,21`  
`addLesson` creates a lesson under the supplied course ID without checking that the caller is the course trainer or an admin.

#### [MEDIUM] `PATCH /api/courses/:id` and `DELETE /api/courses/:id` are mounted with only `authenticate`
**File:** `server/src/controllers/lms/CourseController.ts:100-127`  
**Route:** `server/src/routes/lms.routes.ts:9,19-20`  
Although `CourseController.update` and `delete` check `course.trainerId`, the generic `/api/courses/:id` routes are protected only by `authenticate`. Trainer-gated equivalents exist under `/api/trainer/courses/:id`, but the generic paths remain exposed and could be used if the trainer check is ever bypassed or the role list is incomplete.

#### [LOW] `POST /api/courses/:id/lessons/:lessonId/complete` does not require enrollment
**File:** `server/src/controllers/lms/CourseController.ts:173-203`  
**Route:** `server/src/routes/lms.routes.ts:23`  
`completeLesson` records progress for any `lessonId` without verifying that the caller is enrolled in the lesson's course.

---

### 13.7 IDOR remediation priority

**This week (High)**
1. Add ownership/tenant checks in `InvoiceController.show`, `send`, and `markPaid`, and validate `clientId`/`episodeId` in `InvoiceController.store`.
2. Verify the document owner/tenant before `POST /api/documents/:id/approve` and `reject`.
3. Verify `staffAssignment.agencyId === caller.userId` before `PATCH /api/agency/assignments/:id` and `DELETE /api/agency/assignments/:id`.
4. Verify the caller is a participant in `conversationId` before returning or mutating chat messages.
5. Scope `GET /api/care-needs/:id` to the owner, eligible providers, or admin.

**This week (Medium)**
6. Validate `bookingId`/`shiftId` ownership in `POST /api/agency/assignments`.
7. Validate the supplied `documentId` in `PATCH /api/document-requests/:id/fulfill`.
8. Restrict lesson addition to the course trainer or admin; remove or role-guard the generic `/api/courses/:id` mutation routes.
9. Require active enrollment before `completeLesson` and `submitQuiz`.
10. Restrict `placeBid` to provider roles.

**Scheduled (Low)**
11. Introduce reusable `assertInvoiceAccess`, `assertDocumentAccess`, `assertConversationAccess`, and `assertAssignmentAccess` helpers.
12. Add middleware-level role/tenant guards to all route groups that currently use only `authenticate`.
13. Re-run the IDOR review after fixes, focusing on `findUnique({ where: { id: req.params.id } })` patterns.

---

## 14. Authentication Bypass Findings

A source-code review of the M3 authentication layer and route guards identified several endpoints or flows where authentication, session continuity, or token-channel discipline is weak. All evidence is from `.worktrees/milestone-3/server/src`. Findings that are primarily object-access issues (IDOR) are covered in Section 13.

### 14.1 Missing or weak endpoint authentication

#### [HIGH] `POST /api/livekit/webhook` accepts unsigned events
**File:** `server/src/routes/meetings.routes.ts:8` → `server/src/controllers/telehealth/MeetingSchedulerController.ts:168-196`  
**Endpoint:** `POST /api/livekit/webhook`  
The webhook route is mounted without `authenticate` or any signature check. `livekitWebhook` reads `req.body.event` and `req.body.room.name`, then updates meeting status and recording URLs directly.

```ts
// server/src/routes/meetings.routes.ts:8
router.post('/livekit/webhook', MeetingSchedulerController.livekitWebhook);
```

```ts
// server/src/controllers/telehealth/MeetingSchedulerController.ts:168-196
static async livekitWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const event = req.body;
    const roomName = event?.room?.name;
    if (event.event === 'room_finished' && roomName) {
      await prisma.meeting.updateMany({ where: { roomName, status: 'active' }, data: { status: 'ended', endedAt: new Date() } });
    }
    if (event.event === 'recording_finished' && roomName) {
      const egressId = event?.egressInfo?.egressId;
      const recordingUrl = event?.egressInfo?.file?.location;
      if (egressId && recordingUrl) {
        await prisma.meeting.updateMany({ where: { roomName }, data: { recordingUrl, recordingStatus: 'available' } });
      }
    }
    res.sendStatus(200);
  } catch (err) { next(err); }
}
```

**Impact:** An unauthenticated attacker can spoof `room_finished` or `recording_finished` events to terminate active telehealth sessions or overwrite recording URLs with arbitrary locations.  
**Remediation:** Validate the webhook with the LiveKit SDK `WebhookReceiver` (or equivalent) using the configured LiveKit secret before processing `req.body`.

---

#### [MEDIUM] `POST /api/public/chat` has no identity gate
**File:** `server/src/routes/ai.routes.ts:16-29`  
**Endpoint:** `POST /api/public/chat`  
The public chat endpoint is mounted with only a rate limiter. It accepts a message and optional `sessionId`, then forwards the request to the Gemini-backed chat service.

```ts
router.post('/public/chat', publicAiLimiter, async (req: Request, res: Response, next: NextFunction) => {
  const { message, sessionId } = z.object({ ... }).parse(req.body);
  const convId = sessionId ?? `public-${Date.now()}`;
  const reply = await GeminiChatService.sendMessage('public', convId, message);
```

**Impact:** Any unauthenticated caller can consume the LLM backend, enabling abuse, inflated cost, and an open prompt-injection surface.  
**Remediation:** Remove the public endpoint, or gate it behind a captcha, anonymous session binding, and abuse logging; ensure interactions are not attributed to real users.

---

#### [LOW] `GET /api/services` exposes platform service settings without authentication
**File:** `server/src/routes/public.routes.ts:6-9`  
**Endpoint:** `GET /api/services`  
The public services route returns all `services` group settings without authentication.

```ts
router.get('/services', async (_req: Request, res: Response) => {
  const settings = await prisma.setting.findMany({ where: { group: 'services' } });
  res.json({ data: settings });
});
```

**Impact:** Internal service configuration (pricing toggles, feature flags, integrations) is exposed to unauthenticated callers, aiding reconnaissance.  
**Remediation:** Move behind `authenticate` and an admin/coordinator permission, or filter to non-sensitive public keys only.

---

### 14.2 Session / token channel weaknesses

#### [MEDIUM] Refresh token accepted from request body
**File:** `server/src/utils/authCookies.ts:31-37`  
**Endpoint:** `POST /api/auth/refresh`  
`getRefreshTokenFromRequest` first checks the httpOnly cookie, but falls back to `req.body.refreshToken`.

```ts
export function getRefreshTokenFromRequest(req: Request): string | undefined {
  const fromCookie = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  if (fromCookie) return fromCookie;
  const body = req.body as { refreshToken?: string } | undefined;
  return body?.refreshToken;
}
```

**Impact:** A refresh token can be submitted in a JSON body, increasing the risk of token leakage through request logs, browser history, or XSS exfiltration, and weakening the `SameSite=lax` cookie protection.  
**Remediation:** Remove the body fallback; refresh tokens must only be accepted from the `httpOnly` cookie.

---

#### [LOW] `GET /api/auth/session` validates the token but skips active-user and logout-all checks
**File:** `server/src/controllers/auth/AuthController.ts:234-252`  
**Endpoint:** `GET /api/auth/session`  
The lightweight session check verifies the JWT signature but does not call `assertUserActive` or `wasLoggedOutAll`.

```ts
static async session(req: Request, res: Response): Promise<void> {
  const token = getAccessTokenFromRequest(req);
  if (!token) { res.json({ authenticated: false }); return; }
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    res.json({ authenticated: true, userId: payload.userId, role: payload.role, email: payload.email });
  } catch { res.json({ authenticated: false }); }
}
```

**Impact:** The SPA may report `authenticated: true` for a suspended/deleted user or for an access token issued before a `logout-all` event, causing inconsistent UI state.  
**Remediation:** Reuse the same active-user and logout-all checks used by the `authenticate` middleware before returning `authenticated: true`.

---

### 14.3 Password reset / invite flows

#### [MEDIUM] `set-password` invite link does not invalidate existing sessions
**File:** `server/src/controllers/auth/AuthController.ts:360-429`  
**Endpoint:** `POST /api/set-password`, `POST /api/auth/set-password`  
`setPasswordFromInvite` updates the user's password hash and clears invite tokens, but does not revoke existing refresh tokens or user sessions.

```ts
const user = await prisma.$transaction(async (tx) => {
  const updated = await tx.user.update({ ... mustSetPassword: false, isEmailVerified: true ... });
  await tx.otpVerification.deleteMany({ where: { userId, type: INVITE_TOKEN_TYPE } });
  return updated;
});
```

**Impact:** Any pre-existing session or refresh token remains valid after the user accepts an invite and sets a password, allowing continued access by whoever held the old credentials or session.  
**Remediation:** After a successful invite password set, revoke all active refresh tokens and user sessions for that user, matching the behavior of the `resetPassword` flow.

---

#### [LOW] Reset-password and set-password endpoints lack per-flow rate limiting
**File:** `server/src/routes/auth.routes.ts:62-64`  
**Endpoint:** `POST /api/reset-password`, `POST /api/set-password`, `POST /api/auth/set-password`  
These endpoints are mounted without any rate limiter.

```ts
router.post('/reset-password', AuthController.resetPassword);
router.post('/set-password', AuthController.setPasswordFromInvite);
router.post('/auth/set-password', AuthController.setPasswordFromInvite);
```

**Impact:** Attackers can brute-force the 256-bit reset/invite token at network speed; while not feasible directly, the absence of rate limiting removes a defense-in-depth layer.  
**Remediation:** Apply the existing `otpLimiter` or a dedicated password-reset rate limiter to these endpoints.

---

### 14.4 Authentication bypass remediation priority

**This week (High)**
1. Add signature validation to `POST /api/livekit/webhook` before acting on events.
2. Remove or strongly gate `POST /api/public/chat`.
3. Stop accepting `refreshToken` from the request body in `getRefreshTokenFromRequest`.
4. Make `GET /api/auth/session` enforce active-user and logout-all checks.

**This week (Medium)**
5. Revoke all active sessions and refresh tokens after invite password set.
6. Apply rate limiting to reset-password and set-password endpoints.
7. Move or filter `GET /api/services` so internal settings are not public.

**Scheduled (Low)**
8. Add centralized logging for all authentication anomalies (invalid webhook signatures, body refresh-token attempts, session-state mismatches).
9. Review all route mounts that use only `authenticate` and add role/ownership guards where required.

---

## 15. Dependency Findings

### 15.1 New / notable dependencies

#### [LOW] Server adds `@google/generative-ai@^0.15.0`
**File:** `server/package.json:26`  
Loose version pin for a dependency that processes PHI.

#### [LOW] Client renders AI/markdown output with `react-markdown@^9.0.1`
**File:** `client/package.json:67,71`  
Default `react-markdown` does not sanitize HTML. `sanitize-html` is a server dependency, not a client dependency.

### 15.2 Supply-chain observations

- No `package-lock.json` diff was reviewed; a full lockfile diff is needed to detect transitive additions.
- PHI-handling dependencies (`@google/generative-ai`, `react-markdown`) should be pinned.
- CI should run `npm audit --audit-level=moderate` on both `server/` and `client/`.

### 15.3 Dependency remediation priority

**This week (Low)**
1. Add `npm audit` to the server and client CI pipelines.
2. Pin or use exact versions for dependencies that process PHI or render untrusted content.

**Scheduled (Info)**
3. Evaluate whether `lodash` can be replaced with targeted imports or removed from the client bundle.
4. Verify that `sanitize-html` is actively used on all user/AI-generated content before persistence and before client rendering.

---

## 16. API Security Findings

### 16.1 Mass assignment / unvalidated field writes

#### [HIGH] `PATCH /api/admin/users/:id` updates arbitrary `User` columns from raw `req.body`
**File:** `server/src/routes/admin.routes.ts:68-72`  
**Endpoint:** `PATCH /api/admin/users/:id`  
The admin user update route passes the entire request body directly to `prisma.user.update` without a Zod schema or an allowlist.

```ts
router.patch('/users/:id', requireEdit('user'), async (req: Request, res: Response) => {
  const user = await prisma.user.update({ where: { id: req.params.id }, data: req.body });
  await AuditService.log({ userId: req.user!.userId, action: 'admin_user_updated', entity: 'User', entityId: user.id, req });
  res.json({ data: user });
});
```

**Impact:** An admin (or any account that can obtain `requireEdit('user')`) can overwrite security-sensitive fields such as `role`, `organizationId`, `isActive`, `isEmailVerified`, `mustSetPassword`, or `passwordHash` if those keys are present in the request body, leading to privilege escalation, account takeover, or cross-tenant reassignment.  
**Remediation:** Introduce a strict Zod allowlist schema for admin user updates and reject any key not intended for admin mutation; never pass `req.body` directly to Prisma.

---

#### [HIGH] `PUT /api/admin/settings` upserts arbitrary setting keys from raw `req.body`
**File:** `server/src/routes/admin.routes.ts:171-179`  
**Endpoint:** `PUT /api/admin/settings`  
The settings update route iterates over every key in `req.body` and upserts it into the global `setting` table.

```ts
router.put('/settings', requireEdit('organization'), async (req: Request, res: Response) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } })
    )
  );
  res.json({ message: 'Settings updated.' });
});
```

**Impact:** A holder of `requireEdit('organization')` can create or overwrite any platform setting, including pricing, feature flags, service toggles, or keys used by other modules, effectively allowing configuration-level privilege escalation.  
**Remediation:** Validate the request body against an explicit allowlist of editable setting keys; reject unknown keys and type-check values.

---

### 16.2 Public / unauthenticated data exposure

#### [MEDIUM] Public marketplace offer returns full provider profiles
**File:** `server/src/controllers/provider/MarketplaceOfferController.ts:51-68`  
**Endpoint:** `GET /api/marketplace/offers/:id`  
The public offer detail endpoint includes both `providerProfile` and `providerProfileExt` for the provider.

```ts
include: {
  provider: {
    select: { id: true, name: true, providerProfileExt: true, providerProfile: true },
  },
}
```

Because `providerProfile` contains PII/identifiable professional data and `providerProfileExt` is not defined in the schema (likely a stale include), this leaks more provider data than necessary to unauthenticated browsers.  
**Impact:** Unauthenticated callers can harvest provider PII, hourly rates, and other profile fields for reconnaissance or contact scraping.  
**Remediation:** Limit public offer detail to `id`, `name`, and a small public bio subset; remove `providerProfile`/`providerProfileExt` from the public include or split the response by authentication level.

---

### 16.3 Mutation field sprawl and type confusion

#### [MEDIUM] `PATCH /api/tasks/:id/status` accepts and writes additional fields without schema validation
**File:** `server/src/controllers/TaskController.ts:274-304`  
**Endpoint:** `PATCH /api/tasks/:id/status`  
The status update endpoint reads `actualDuration` and `completionEvidence` from the raw request body and writes them alongside `status`, but does not parse the body through a Zod schema.

```ts
const { status, actualDuration, completionEvidence } = req.body;
```

While `completionEvidence` is URL-validated, `actualDuration` is stored without type or range validation, and the endpoint may silently ignore or store unexpected keys depending on how the `data` object is built.  
**Impact:** A caller can mutate task completion metadata in ways not intended by the UI, potentially polluting the task record or bypassing the dedicated `POST /tasks/:id/complete` flow.  
**Remediation:** Wrap the status endpoint body in a strict Zod schema (`status`, optional `actualDuration`, optional `completionEvidence`) and reject extra keys.

---

#### [MEDIUM] `AdvancedAdminController` CSV exports have no date/range schema and no row cap
**File:** `server/src/controllers/admin/AdvancedAdminController.ts:222-293`  
**Endpoints:** `GET /api/admin/export/bookings`, `GET /api/admin/export/users`  
Both export endpoints accept `from`/`to` as plain strings, convert them with `new Date()`, and take up to 10,000 rows without pagination or further access controls. The bookings export includes client and provider email addresses.

```ts
if (from && to) where.createdAt = { gte: new Date(from), lte: new Date(to) };
```

**Impact:** Invalid date strings produce `Invalid Date` filters; a broad date range or missing filter can dump the entire user or booking table into a CSV attachment, increasing the blast radius of a compromised admin session.  
**Remediation:** Validate `from`/`to` with Zod (ISO date strings, max range), default to a sensible window, cap rows, and stream the response instead of buffering 10,000 records in memory.

---

#### [LOW] `PATCH /api/admin/incidents/:id` spreads parsed body directly into Prisma update
**File:** `server/src/controllers/admin/AdvancedAdminController.ts:206-218`  
**Endpoint:** `PATCH /api/admin/incidents/:id`  
The incident update handler parses `status` and `resolution`, then spreads the parsed body into the Prisma `data` object.

```ts
const body = z.object({ status: z.string().optional(), resolution: z.string().optional() }).parse(req.body);
const incident = await prisma.incident.update({
  where: { id: req.params.id },
  data: { ...body, resolvedAt: body.status === 'resolved' ? new Date() : undefined },
});
```

Because the schema is `.optional()` for both fields, an empty request body is accepted and the spread has no effect, but any future schema additions will be written blindly.  
**Remediation:** Replace `...body` with explicit field assignments, or use a strict schema with `strict()` / `strip()` behavior and explicit mapping.

---

### 16.4 API security remediation priority

**This week (High)**
1. Add strict Zod allowlists for `PATCH /api/admin/users/:id` and `PUT /api/admin/settings`; reject unknown keys.
2. Split public marketplace offer responses from authenticated provider-profile responses and remove the undefined `providerProfileExt` include.

**This week (Medium)**
3. Add Zod schemas to `PATCH /api/tasks/:id/status` and other task mutation endpoints.
4. Validate date ranges and cap row counts on admin CSV export endpoints.
5. Replace `...body` spread in `AdvancedAdminController.updateIncident` with explicit field mapping.

**Scheduled (Low / hardening)**
6. Audit every route that forwards `req.body` or spreads a parsed body into Prisma and replace with explicit data objects.
7. Add response-size limits and pagination to all admin bulk/list endpoints.

---

## 17. Clean / No-Issue Items

The following controls were observed and appear sound:

- **Admin route guards:** `admin.routes.ts` consistently applies `authenticate`, `requireAdmin`, and `adminLimiter`; endpoints add `requireView/Create/Edit/Delete/Approve` where appropriate.
- **Org route guards:** `org.routes.ts` consistently applies `authenticate`, `attachTenantContext`, and `requireOrgAdmin`.
- **Care plan routes:** `CarePlanController` uses `assertCarePlanAccess`/`assertTenantOrgAccess`; inline `requirePlanAccess` replicates the same family/org checks.
- **Episode routes:** `CareEpisodeController` enforces `assertEpisodeAccess` and role guards.
- **Intake routes:** `IntakeController` uses `assertIntakeAccess` and `requireCareUnitAccess`.
- **AI session/chat controllers:** `AIChatController` and `AISessionController` verify participant links before exposing or mutating sessions.
- **AI callback mounting:** `/api/ai/callbacks/care-plan-draft` is mounted before auth routes so the server-to-server key check is not blocked by session authentication.
- **Rate limiting:** `publicAiLimiter` and `aiLimiter` are applied to AI endpoints.
- **Global middleware:** Helmet CSP, referrer policy, CORS allowlist, JSON body limits, and global rate limiting are configured in `server/src/app.ts`.
- **Clinical notes are immutable after creation** (HTTP 405 on mutation).
- **Auth migration endpoint:** `POST /api/auth/migrate-role` is now behind `requireAdmin`.

---

## 18. Consolidated Remediation Roadmap

### 18.1 Immediate (high severity)
1. Fix cross-tenant access control in `TaskController`, `StaffController` assignments, and `SessionScheduleController` provider lookups.
2. Add replay-resistant authentication to the AI care-plan callback.
3. Remove or authenticate the public AI chat endpoint.
4. Gate Riayah AI / Gemini PHI processing on explicit consent and a recorded BAA/DPA; minimize the payload.
5. Encrypt and access-control the GDPR/HIPAA data export download.
6. Enforce the shared upload MIME/extension allowlist in all upload paths.
7. Pin JWT verification to `['HS256']` and fix `optionalAuth` logout-all revocation.
8. Implement a `subprocessors` register with BAA/DPA/SCC checks and fail closed.
9. Fix business-logic workflow bypasses: enforce care-plan approval only from `submitted_for_approval`, prevent concurrent shift starts, validate agency assignment scope, and reject arbitrary session dates/care-plan costs.
10. Fix IDOR gaps: add ownership/tenant checks for invoice read/send/mark-paid, document approval/rejection, staff-assignment mutations, chat conversation access, and marketplace care-need reads.
11. Fix authentication bypass gaps: validate LiveKit webhook signatures, gate the public AI chat endpoint, restrict refresh tokens to cookies, enforce active-user/logout-all checks in the SPA session endpoint, and revoke sessions after invite password set.
12. Fix API-security / mass-assignment gaps: add strict Zod allowlists to `PATCH /api/admin/users/:id`, `PUT /api/admin/settings`, and `PATCH /api/admin/incidents/:id`; never pass `req.body` directly to Prisma.
13. Split public marketplace offer responses from authenticated provider-profile responses and remove the stale `providerProfileExt` include.

### 18.2 This week (medium severity)
1. Add route-level role/org middleware to `/api/tasks`, `/api/shifts`, `/api/availability`, `/api/scheduling`, and `/api/clinical-notes`.
2. Restrict private-note visibility and clinical-note creation to assigned care-team members.
3. Add per-purpose consent types for AI, GPS, WhatsApp, and marketing.
4. Enforce `processingRestricted` across mutating endpoints.
5. Add Sentry `beforeSend`/`beforeSendTransaction` PHI scrubbers.
6. Mandate TLS for SMTP and redact recipient addresses from failure logs.
7. Rewrite the AI intake summary migration to preserve existing enum data.
8. Remove `localStorage` token keys and migrate client auth to httpOnly cookies.
9. Add workflow-level business rules (care-plan state enforcement, shift-start concurrency, session booking bounds, care-plan item cost lookup).
10. Add maker-checker or dual-control logging for org-admin invite/deactivation actions.
11. Add reusable IDOR ownership helpers and enforce them on all `:id` and indirect-reference endpoints.
12. Remove or role-guard generic `/api/courses/:id` mutation routes; restrict lesson/quiz completion to enrolled learners.
13. Validate LiveKit webhook signatures before accepting meeting/recording events.
14. Gate `POST /api/public/chat` behind identity or stronger abuse controls.
15. Remove `refreshToken` body fallback and restrict refresh to the httpOnly cookie.
16. Add active-user and logout-all validation to `GET /api/auth/session`.
17. Revoke all sessions and refresh tokens after invite `set-password` success.
18. Add strict Zod schemas to task status updates and other `req.body`-forwarding endpoints.
19. Validate date ranges, cap row counts, and stream responses on admin CSV export endpoints.

### 18.3 Scheduled (low severity / hardening)
1. Add tamper-evidence (hash/chain) to clinical notes.
2. Harden auth-cookie flags (`__Host-`/`__Secure-` prefixes, always `secure`).
3. Align public privacy policy with actual retention rules.
4. Pin PHI-handling dependencies and add `npm audit` to CI.
5. Add SSE output encoding and response-size limits for AI chat.
6. Audit every route that forwards `req.body` or spreads a parsed body into Prisma and replace with explicit data objects.
7. Add response-size limits and pagination to all admin bulk/list endpoints.

---

## Appendix A: Glossary

- **BAA** — Business Associate Agreement (HIPAA).
- **DPA** — Data Processing Agreement (GDPR).
- **PHI** — Protected Health Information (HIPAA).
- **PPI** — Personally Identifiable Information used in the client context.
- **SCC** — Standard Contractual Clauses (GDPR international transfers).
- **DPIA** — Data Protection Impact Assessment.

## Appendix B: Findings Index by File

| File | Finding IDs / Topics |
|------|----------------------|
| `server/src/app.ts` | Sentry PHI, uncaught exception logging, CORS localhost origins, host-header validation |
| `server/src/middleware/auth.ts` | `optionalAuth` revocation/tenant gaps, JWT algorithm pinning |
| `server/src/middleware/aiServiceAuth.ts` | AI callback key comparison side-channel |
| `server/src/middleware/errorHandler.ts` | `err.details` disclosure |
| `server/src/middleware/tenantScope.ts` | Platform admin `{}` bypass, unauthenticated tenant skip |
| `server/src/utils/authCookies.ts` | Cookie flag hardening |
| `server/src/controllers/TaskController.ts` | Cross-tenant task list/update/delete/status/complete |
| `server/src/controllers/carePlans/CarePlanController.ts` | Care-plan state-machine bypass, client-trusted unitCost |
| `server/src/controllers/staff/StaffController.ts` | Assignment CRUD lacks agency ownership; arbitrary staff role |
| `server/src/controllers/scheduling/SessionScheduleController.ts` | Unvalidated providerId query, session fallback, unbounded session datetime/duration, recurring non-atomicity |
| `server/src/controllers/scheduling/AvailabilityController.ts` | Null-org provider management, concurrent availability replacement |
| `server/src/controllers/clinical/ClinicalNoteController.ts` | Private-note visibility, org-scoped creation |
| `server/src/controllers/patients/AssessmentController.ts` | Patient email in default include, raw status query |
| `server/src/controllers/patients/IntakeController.ts` | Intake review step-skip, validated→submitted reversal |
| `server/src/controllers/patients/IntakeDocumentController.ts` | Upload/presign/confirm file-type validation, local file serving |
| `server/src/controllers/org/OrgPortalController.ts` | Org-wide pending intakes, invite TOCTOU, maker-checker gaps on invite/deactivation, role confirmation on invite accept |
| `server/src/routes/shift.routes.ts` | Concurrent shift start, coordinator shift termination |
| `server/src/controllers/billing/InvoiceController.ts` | IDOR on invoice show/send/mark-paid/store |
| `server/src/controllers/chat/ChatController.ts` | IDOR on conversation messages/read/inject |
| `server/src/controllers/DocumentController.ts` | Signed-URL ownership fallback |
| `server/src/routes/document.routes.ts` | Document approve/reject without tenant/owner scoping |
| `server/src/controllers/marketplace/CareNeedController.ts` | IDOR on care-need show; any authenticated user can bid |
| `server/src/controllers/lms/CourseController.ts` | IDOR on addLesson/completeLesson; generic course mutation routes only `authenticate` |
| `server/src/controllers/auth/AuthController.ts` | 2FA secret exposure, session revocation, session endpoint skips active/logout-all checks |
| `server/src/routes/meetings.routes.ts` | LiveKit webhook mounted without signature validation |
| `server/src/routes/ai.routes.ts` | Public chat endpoint unauthenticated |
| `server/src/routes/public.routes.ts` | `/services` settings exposed without authentication |
| `server/src/utils/authCookies.ts` | Refresh token accepted from request body |
| `server/src/routes/admin.routes.ts` | Raw `req.body` user update, settings mass assignment, CSV audit export |
| `server/src/controllers/admin/AdvancedAdminController.ts` | CSV export date validation/cap, incident update body spread |
| `server/src/controllers/provider/MarketplaceOfferController.ts` | Public offer leaks full provider profile |
| `server/src/services/AiIntakeSummaryService.ts` | PHI to Riayah AI, no audit log |
| `server/src/services/AiCarePlanDraftService.ts` | Callback replay, `rawResponse` storage |
| `server/src/services/GeminiChatService.ts` | Indefinite message retention |
| `server/src/services/RiayahAiClient.ts` | Configurable URL, error logging |
| `server/src/services/EmailService.ts` | TLS, PHI in failure logs |
| `server/src/controllers/privacy/PrivacyController.ts` | Unencrypted export |
| `server/src/utils/anonymizeUser.ts` | Pseudonym linkability |
| `server/src/services/AccountDeletionService.ts` | Deletion blocked by operational records |
| `server/src/services/GPSService.ts` | Worker geolocation consent/DPIA |
| `server/prisma/migrations/20260727094511_ai_intake_summary/migration.sql` | Destructive enum migration |
| `client/src/components/RoleGuard.tsx` | Denial UI, debug logs |
| `client/src/lib/storage-keys.ts` | localStorage token keys |
| `client/src/hooks/useCareseekerDashboard.ts` | Onboarding draft in localStorage |

---

*End of report.*
