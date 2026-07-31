# M3 Pre-Delivery Audit

**Prepared:** 2026-07-31  
**Scope:** Server-side controllers, routes, and services introduced in M3 (care plans, clinical notes, AI integration, scheduling, shifts/tasks), plus Pass 2 follow-up (AI chat/sessions, public endpoints, care-plan notifications).  
**Method:** Manual code review — not a penetration test.  
**Goal:** Catch issues before Karim's audit so they can be fixed or acknowledged proactively.

---

## Summary

| # | Finding | Area | Severity | Status |
|---|---------|------|----------|--------|
| 1 | Coordinator can approve/reject their own care plan | Care Plan | **High** | ✅ Fixed |
| 2 | Active/approved care plans can be deleted | Care Plan | **Medium** | ✅ Fixed |
| 3 | AI callback marks coordinator's existing draft as non-current without warning | AI | **Medium** | ✅ Fixed |
| 4 | AI API key compared with `!==` (not timing-safe) | AI | **Medium** | ✅ Fixed |
| 5 | Task create does not verify the episode belongs to caller's org | Tasks | **Medium** | ✅ Fixed |
| 6 | Bulk task assign-episode has no org scope check on episode or assignee | Tasks | **Medium** | ✅ Fixed |
| 7 | Staff scheduling picker returns email addresses | Scheduling / GDPR | **Medium** | ✅ Fixed |
| 8 | Any authenticated user can start a shift | Shifts | **Low** | ✅ Fixed |
| 9 | Legacy `/shifts/tasks` POST creates tasks for any assignee with no org check | Shifts | **Low** | ✅ Fixed |
| 10 | Private clinical notes visible to all clinical roles within the org | Clinical Notes | **Low / Info** | Acknowledged (no change) |
| 11 | AI session PATCH has no ownership check — any user can rename any session | AI Sessions | **Medium** | ✅ Fixed |
| 12 | Public AI chat endpoint has no dedicated rate limit | AI / Cost | **Medium** | ✅ Fixed |
| 13 | AI chat history `limit` param is uncapped | AI Chat | **Low** | ✅ Fixed |
| 14 | AI Doctor chat has no message length validation | AI Doctor | **Low** | ✅ Fixed |
| 15 | Care plan approval notification sent to `patientId` which can be null | Care Plans | **Low** | ✅ Fixed |
| 16 | Org portal `pendingIntakes` returns `externalRef` (MRN) and `diagnosisCodes` | Org Portal / GDPR | **Medium** | ✅ Fixed |
| 17 | `resendCoordinatorInvite` / `resendStaffInvite` resets password for active accounts | Org Portal | **Medium** | ✅ Fixed |
| 18 | Org portal `listFamilies` returns coordinator email | Org Portal / GDPR | **Low** | ✅ Fixed |
| 19 | Org portal list endpoints have no pagination (`take` limit) | Org Portal | **Low** | ✅ Fixed |
| 20 | AI draft trigger response leaks model name and token count to client | AI / Info Disclosure | **Low / Info** | ✅ Fixed |
| 21 | `submitIntake` sends notification to potentially-null `notifyUserId` | Care Episodes | **Low** | ✅ Fixed |
| 22 | `ClinicalNoteController.index` has no `take` limit — unbounded query | Clinical Notes | **Low** | ✅ Fixed |
| 23 | `CareSummaryController.getTimeline` `limit` param is uncapped | Care Summary | **Low** | ✅ Fixed |
| 24 | `GET /scheduling/sessions` skips org filter when coordinator has no org — returns all sessions | Scheduling | **Medium** | ✅ Fixed |
| 25 | `aiLimiter` defined but never applied — authenticated AI endpoints only get global 60/min cap | AI / Cost | **Low** | ✅ Fixed |

---

## Finding 1 — Coordinator can approve/reject their own care plan (High)

**File:** `server/src/routes/carePlan.routes.ts:49–51`

```typescript
router.post('/:id/approve', CarePlanController.approve);
router.post('/:id/request-revision', CarePlanController.requestRevision);
router.post('/:id/reject', CarePlanController.reject);
```

These three routes have **no role middleware**. The controller's `assertCarePlanAccess` allows any user in the same org — including the coordinator who created and submitted the plan — to approve, reject, or request a revision.

The intended flow is that the family approves and the coordinator only submits. Currently a coordinator can complete the full approval loop themselves without the family ever seeing the plan.

**Fix:** Add a `requireRole([...FAMILY_ROLES])` guard on `approve`, `reject`, and `request-revision` routes. Coordinators should only be allowed on `submit` and `update`.

---

## Finding 2 — Active or approved care plans can be deleted (Medium)

**File:** `server/src/controllers/carePlans/CarePlanController.ts:642–652`

```typescript
static async destroy(req: Request, res: Response): Promise<void> {
  const plan = await prisma.carePlan.findUnique({ ... });
  if (!plan) throw new AppError('Care plan not found.', 404);
  assertTenantOrgAccess(req, plan.episode.organizationId);
  await prisma.carePlan.delete({ where: { id: req.params.id } });
  res.json({ message: 'Care plan deleted.' });
}
```

There is no status check before deletion. A coordinator can permanently delete a care plan that is `active`, `approved`, or even `completed` — which would orphan the goals and tasks that were created from it, and erase the approval history.

**Fix:** Block deletion if `plan.status` is in `['submitted_for_approval', 'approved', 'active', 'completed']`. Only `draft` and `rejected` plans should be deletable.

---

## Finding 3 — AI callback silently demotes coordinator's existing draft (Medium)

**File:** `server/src/services/AiCarePlanDraftService.ts:238–243`

```typescript
await tx.carePlan.updateMany({
  where: { episodeId: episode.id, isCurrentVersion: true },
  data: { isCurrentVersion: false },
});
```

When Momen's AI callback fires and no matching draft exists (new draft path), the code marks **all** existing current-version plans as non-current before creating the AI draft. This means if a coordinator had manually built a `draft` or `submitted_for_approval` plan, the AI callback would silently demote it and make the AI draft the current version instead.

The coordinator would lose their work with no notification and no error.

**Fix:** Scope the `updateMany` to only demote other `draft` AI-generated plans (identified by `AI_DRAFT_MARKER` in notes). Leave non-AI drafts and submitted plans untouched, and return a conflict error or warning if a non-AI current version already exists.

---

## Finding 4 — AI callback API key compared without timing-safe equality (Medium)

**File:** `server/src/middleware/aiServiceAuth.ts:19`

```typescript
if (!provided || provided !== configured) {
  throw new AppError('Unauthorized.', 401);
}
```

JavaScript's `!==` string comparison short-circuits and returns as soon as the first differing character is found. An attacker who can make many requests to the callback endpoint could use response-time differences to brute-force the API key one character at a time.

**Fix:** Replace with `crypto.timingSafeEqual`:

```typescript
import { timingSafeEqual } from 'crypto';

const a = Buffer.from(provided.padEnd(configured.length));
const b = Buffer.from(configured);
if (a.length !== b.length || !timingSafeEqual(a, b)) {
  throw new AppError('Unauthorized.', 401);
}
```

---

## Finding 5 — Task create does not scope to the caller's org (Medium)

**File:** `server/src/controllers/TaskController.ts:112–130`

```typescript
async create(req: Request, res: Response, next: NextFunction) {
  const parsed = createTaskSchema.parse(req.body);
  const task = await prisma.task.create({
    data: { ...parsed, assignerId: req.user!.userId, ... },
  });
}
```

The schema accepts `careEpisodeId` from the request body, but the controller never verifies that the episode belongs to the caller's organization. A coordinator in Org A could create tasks linked to episodes in Org B.

**Fix:** If `careEpisodeId` is provided, look up the episode and call `assertTenantOrgAccess(req, episode.organizationId)` before creating the task.

---

## Finding 6 — Bulk task assign-episode has no org scope on episode or assignee (Medium)

**File:** `server/src/controllers/TaskController.ts:135–185`

```typescript
const episode = await prisma.careEpisode.findUnique({ where: { id: body.episodeId }, ... });
// No assertTenantOrgAccess call here

const assignee = await prisma.user.findFirst({ where: { id: body.assigneeId, ... } });
// No org check on assignee
```

Any care coordinator (regardless of org) can bulk-assign tasks on any episode to any user. Neither the episode nor the assignee is verified to belong to the coordinator's organization.

**Fix:** After loading the episode, call `assertTenantOrgAccess(req, episode.organizationId)`. After loading the assignee, verify `assignee.organizationId === episode.organizationId` or that the assignee is in the same org as the requester.

---

## Finding 7 — Staff scheduling picker returns email addresses (Medium — GDPR)

**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:140–145`

```typescript
const data = await prisma.user.findMany({
  where,
  select: { id: true, name: true, email: true, role: true },
});
```

The staff picker (used for session booking and availability) returns `email`. Karim flagged the coordinator picker in M2 for the same reason (we removed it then). A picker UI only needs `id`, `name`, and `role` — the email is not displayed or used.

**Fix:** Remove `email` from the select. Change to `{ id: true, name: true, role: true }`.

---

## Finding 8 — Any authenticated user can start a shift (Low)

**File:** `server/src/routes/shift.routes.ts:20–39`

```typescript
router.post('/start', async (req, res, next) => {
  // No role check — any authenticated user can call this
  const shift = await prisma.shift.create({
    data: { workerId: req.user!.userId, ... }
  });
});
```

No role restriction on shift start. A family user, coordinator, or clinical staff member could start a shift, which creates shift records that would appear in admin reporting and could confuse support worker dashboards.

**Fix:** Add a role check before creating the shift, restricting it to `support_worker` and optionally `clinical_staff` and admin roles.

---

## Finding 9 — Legacy `/shifts/tasks` POST creates tasks for any assignee with no org check (Low)

**File:** `server/src/routes/shift.routes.ts:120–142`

```typescript
router.post('/tasks', async (req, res, next) => {
  const data = z.object({ assigneeId: z.string(), ... }).parse(req.body);
  const task = await prisma.task.create({
    data: { ...data, assignerId: req.user!.userId }
  });
});
```

This legacy endpoint (under `/shifts/tasks`) creates tasks with an arbitrary `assigneeId` from the body, no org verification, and no role restriction beyond authentication. It bypasses all the ownership checks in `TaskController`.

**Fix:** Either remove this endpoint (the main `/tasks` controller is the preferred path) or add the same org-scoping and role guards as `TaskController.create`.

---

## Finding 10 — Private clinical notes visible to all clinical roles within the org (Low / Info)

**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:25–38`

```typescript
function canSeePrivateNote(role, viewerId, note): boolean {
  if (!note.isPrivate) return true;
  if (note.authorId === viewerId) return true;
  if (ADMIN_ROLES.includes(role)) return true;
  return role === 'clinical_staff' || ['doctor', 'nurse', 'physiotherapist', ...].includes(role);
}
```

Any clinical staff in the same org can see any private note, regardless of whether they are involved in the care episode. A physiotherapist can read a psychologist's private note for a patient they have no session with.

This may be intentional for care continuity (HIPAA minimum-necessary allows disclosure for treatment), but Karim may flag it as a HIPAA concern.

**Info:** If stricter controls are needed, private notes could be scoped to only users who have a session on the same episode. No change required unless Karim raises it.

---

## Finding 11 — AI session PATCH has no ownership check (Medium)

**File:** `server/src/controllers/ai/AISessionController.ts`

`show`, `delete`, and `sendMessage` all verify `session.participantLinks.some(p => p.userId === userId)` before acting. `update` did not — it went straight to `prisma.conversation.update`. Any authenticated user who knew a session ID could rename another user's AI conversation.

**Fix applied:** Load the session first, check `isParticipant`, throw 403 if not — same pattern as `show` and `delete`.

---

## Finding 12 — Public AI chat endpoint has no dedicated rate limit (Medium)

**File:** `server/src/routes/ai.routes.ts`

`POST /ai/public/chat` is unauthenticated. Previously only the global `apiLimiter` (60 req/min per IP) applied. Sustained abuse could burn Gemini API quota with no auth required.

**Fix applied:** Added `publicAiLimiter` (10 req/min) in `rateLimiter.ts` and applied it to `/public/chat`.

---

## Finding 13 — AI chat history `limit` param is uncapped (Low)

**File:** `server/src/controllers/ai/AIChatController.ts`

A caller could pass `?limit=1000000` and Prisma would attempt to return every message in a single query.

**Fix applied:** Cap with `Math.min(Math.max(Number(req.query.limit) || 50, 1), 500)`.

---

## Finding 14 — AI Doctor chat has no message length validation (Low)

**File:** `server/src/controllers/AIDoctorController.ts`

`message` was read raw from `req.body` without Zod validation. A caller could submit a multi-MB string to Gemini. Unused `sessionId` / `context` body fields were removed from the handler.

**Fix applied:** Validate with `z.object({ message: z.string().min(1).max(2000) })`.

---

## Finding 15 — Care plan notification targets `patientId` which can be null (Low)

**File:** `server/src/controllers/carePlans/CarePlanController.ts` (material-edit path and `submitForApproval`)

Episodes can have `patientId = null` when created for a care unit with only `familyUserId`. Notifications to `patientId` alone could fail or no-op.

**Fix applied:** Prefer `patientId ?? careUnit.familyUserId` via `familyNotifyUserId`, and skip the notification when neither is set.

---

---

## Finding 16 — Org portal `pendingIntakes` returns MRN and diagnosis codes (Medium — GDPR/HIPAA)

**File:** `server/src/controllers/org/OrgPortalController.ts` (~line 578)

```typescript
careRecipient: {
  select: { id: true, name: true, externalRef: true, diagnosisCodes: true },
},
```

`pendingIntakes` is the queue of new family requests waiting for coordinator assignment. The response includes `externalRef` (the care recipient's external/MRN reference) and `diagnosisCodes` (ICD codes). Karim flagged both fields on the episode list in the M2 audit — they constitute PHI under HIPAA minimum-necessary and personal data under GDPR. The intake queue listing is a read-by-org-admin operation and does not need clinical data for coordinator assignment.

**Fix:** Remove `externalRef` and `diagnosisCodes` from the `careRecipient` select. Change to `{ id: true, name: true }`.

**Fix applied:** Select reduced to `{ id: true, name: true }`.

---

## Finding 17 — Resend invite unconditionally resets active accounts' password (Medium)

**File:** `server/src/controllers/org/OrgPortalController.ts` (`resendCoordinatorInvite`, `resendStaffInvite`)

Both resend handlers call:

```typescript
await prisma.user.update({
  where: { id: user.id },
  data: { passwordHash: INVITE_PASSWORD_PLACEHOLDER, mustSetPassword: true },
});
```

The `INVITE_PASSWORD_PLACEHOLDER` (`'!'`) is an invalid bcrypt hash — any subsequent login attempt with a real password will fail. If a coordinator or staff member has already accepted their invite and set a password, an org admin can lock them out completely by clicking "resend invite." There is no status check — the reset happens whether the account is active or still pending.

**Fix:** Before resetting, check if the user has already completed onboarding. If `user.mustSetPassword === false` (i.e., they have set a real password), either refuse the resend with a 409 or only regenerate the invite token without touching `passwordHash`. Example guard:

```typescript
if (!user.mustSetPassword) {
  throw new AppError('User has already set their password. Resending is not allowed.', 409);
}
```

**Fix applied:** Both `resendCoordinatorInvite` and `resendStaffInvite` return 409 when `mustSetPassword === false`.

---

## Finding 18 — Org portal `listFamilies` returns coordinator email (Low — GDPR)

**File:** `server/src/controllers/org/OrgPortalController.ts` (`listFamilies`)

```typescript
assignedCoordinator: { select: { id: true, name: true, email: true } },
```

The family list response includes the assigned coordinator's email address. This is the same pattern Karim flagged on the M2 coordinator picker — emails are not displayed in the UI and violate GDPR minimum-necessary.

**Fix:** Remove `email` from the select. Change to `{ id: true, name: true }`.

**Fix applied:** `assignedCoordinator` select is now `{ id: true, name: true }`.

---

## Finding 19 — Org portal list endpoints have no pagination (Low)

**File:** `server/src/controllers/org/OrgPortalController.ts`

`listFamilies`, `listCoordinators`, `listStaff`, and `pendingIntakes` all call `prisma.findMany` with no `take` argument. For a large organization this returns the entire table in a single query, causing memory pressure and slow responses.

**Fix:** Accept `page` / `limit` query params (or at minimum add a hard `take: 100` cap) on all four endpoints, matching the pattern already used in `TaskController` and `AIChatController`.

**Fix applied:** Shared `listPagination` helper (`page`/`limit`, hard cap 100, default 50) on `listFamilies`, `listCoordinators`, `listStaff`, and `pendingIntakes`; responses include `meta: { total, page, limit }`.

---

## Finding 20 — AI draft trigger response leaks internal AI provider details (Low / Info)

**File:** `server/src/controllers/ai/CarePlanDraftCallbackController.ts` (`trigger`)

The response body sent back to the coordinator client includes:

```json
{
  "ai": {
    "model": "gemini-pro-1.5",
    "totalTokens": 4821,
    "status": "callback_pending"
  }
}
```

`model` reveals which third-party AI provider and model version we are using. `totalTokens` lets a caller estimate prompt size and correlate usage. Neither field is needed by the coordinator UI — it only needs to know whether the draft request was accepted.

**Fix:** Strip `model` and `totalTokens` from the client-facing response. Return only `{ status, draftKey }` or equivalent.

**Fix applied:** Client response returns `ai: { status }` only; `model` / `totalTokens` remain in the audit log and server logs.

---

---

## Finding 21 — `submitIntake` sends notification to null `notifyUserId` (Low)

**File:** `server/src/controllers/patients/CareEpisodeController.ts:268–273`

```typescript
const notifyUserId = episode.careUnit?.familyUserId ?? episode.patientId;
await NotificationService.create({
  userId: notifyUserId,
  ...
});
```

Episodes where both `careUnit.familyUserId` and `patientId` are null will pass `userId: null` to `NotificationService`. This is the exact same bug that was found and fixed in `CarePlanController` (Finding 15). If `NotificationService` does not guard against null, the intake submission throws at the final step — the user gets a 500 after the episode was already updated.

**Fix:** Mirror the pattern from Finding 15:

```typescript
const notifyUserId = episode.careUnit?.familyUserId ?? episode.patientId ?? null;
if (notifyUserId) {
  await NotificationService.create({ userId: notifyUserId, ... });
}
```

**Fix applied:** Notification is skipped when neither `familyUserId` nor `patientId` is set.

---

## Finding 22 — `ClinicalNoteController.index` has no `take` limit (Low)

**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:106–112`

```typescript
const notes = await prisma.clinicalNote.findMany({
  where,
  include: { author: { select: { id: true, name: true, role: true } } },
  orderBy: { createdAt: 'desc' },
});
```

No `take` argument. A long-running care episode with hundreds or thousands of notes returns all of them in a single query. In contrast, `TaskController.list` paginates, and `AISessionController.list` uses `take: 1` for the last message.

**Fix:** Add pagination (`page`/`limit` query params) or at minimum a hard `take: 200` cap, consistent with the rest of the codebase.

**Fix applied:** Hard `take: 200` on `ClinicalNoteController.index`.

---

## Finding 23 — `CareSummaryController.getTimeline` `limit` param is uncapped (Low)

**File:** `server/src/controllers/CareSummaryController.ts:83–84`

```typescript
const { limit = '20' } = req.query as Record<string, string>;
...
take: parseInt(limit),
```

`limit` is parsed directly with no upper bound. A caller can pass `?limit=1000000` and get a very large result set across three Prisma queries (bookings, episodes, notes). The same bug was fixed in `AIChatController.history` in Pass 2 (Finding 13).

**Fix:** Cap with `Math.min(Math.max(Number(limit) || 20, 1), 200)`.

**Fix applied:** Timeline `limit` capped at 200 (min 1, default 20).

---

## Finding 24 — `GET /scheduling/sessions` returns all sessions when coordinator has no org (Medium)

**File:** `server/src/controllers/scheduling/SessionScheduleController.ts:168–175`

```typescript
} else {
  // coordinator: scope via episodes in org
  const orgId = req.tenant?.organizationId;
  if (orgId) {
    where.episode = { organizationId: orgId };
  }
}
```

The `else` branch is reached for `care_coordinator`, `admin`, `super_admin`, and `support_admin` when no `episodeId` or `providerId` is given. If `req.tenant?.organizationId` is null/falsy (a user with no org assigned), the `if (orgId)` block is skipped and `where` remains empty — Prisma returns **all sessions in the database**.

This is a data-isolation failure. Any coordinator or admin without an org assignment can enumerate every session in the system.

**Fix:** Either throw early if the org is missing, or default the filter to `null` (which would match sessions with no org, avoiding a full-table result):

```typescript
} else {
  const orgId = req.tenant?.organizationId;
  if (!orgId) throw new AppError('No organization assigned to this account.', 403);
  where.episode = { organizationId: orgId };
}
```

**Fix applied:** Missing org now throws 403; sessions are always scoped to `organizationId`.

---

## Finding 25 — `aiLimiter` is defined but never applied to authenticated AI endpoints (Low)

**File:** `server/src/middleware/rateLimiter.ts:42–47` and `server/src/routes/ai.routes.ts`

`aiLimiter` (30 req/min per IP) is exported from `rateLimiter.ts` but is not imported or applied anywhere in the codebase. The Gemini-backed authenticated routes — `POST /ai/chat`, `POST /ai/chat/stream`, `POST /ai/sessions/:id/message`, and `POST /ai/doctor-chat` — receive only the global `apiLimiter` (60 req/min). This is double the intended cap for AI routes, and all Gemini calls count toward API quota.

The `publicAiLimiter` (10/min) was correctly applied in Pass 2 (Finding 12), but the authenticated equivalent was missed.

**Fix:** Import `aiLimiter` in `ai.routes.ts` and apply it to all Gemini-backed routes:

```typescript
import { aiLimiter } from '../middleware/rateLimiter';

router.post('/chat', aiLimiter, authenticate, AIChatController.sendMessage);
router.post('/chat/stream', aiLimiter, authenticate, AIChatController.streamMessage);
router.post('/sessions/:id/message', aiLimiter, authenticate, AISessionController.sendMessage);
router.post('/doctor-chat', aiLimiter, authenticate, aiDoctorController.doctorChat.bind(aiDoctorController));
```

**Fix applied:** `aiLimiter` applied to `/chat`, `/chat/stream`, `/sessions/:id/message`, and `/doctor-chat`.

---

## Not-flagged (confirmed clean)

- **Org portal tenant isolation**: all org routes gated by `requireOrgAdmin`; list queries are scoped to `req.tenant.organizationId`. Cross-org data access is not possible. ✅
- **Org invite token security**: `crypto.randomBytes(32).toString('hex')`, prior tokens deleted before reissue, 7-day expiry. ✅
- **Matching history IDOR**: `GET /matching/history/:careseekerId` checks `careseekerId === req.user.userId || role === 'admin'` before returning. ✅
- **CareMatchingController.findProviders**: provider results are projected — no PII fields (email, phone, passwordHash) included in response. ✅
- **Episode index email/MRN omission**: H-27 comment confirmed — `externalRef` and coordinator `email` excluded from episode list projection. ✅
- **Episode show access control**: uniform 404 returned for both missing and unauthorized episodes (no enumeration). ✅
- **Episode coordinator picker**: email omitted from `GET /episodes/coordinators` (R-2 comment confirmed). ✅
- **submitIntake validated status guard**: jumping to `validated` via free `PATCH /episodes/:id` is blocked; only `POST /episodes/:id/submit-intake` can transition to validated. ✅
- **Availability controller org isolation**: `assertCanManageProvider` requires self or coordinator + same org; `assertTenantOrgAccess` called for all cross-user mutations. ✅
- **Care summary PDF access**: three-way check — family (patientId or familyUserId), coordinator/admin (org scope), other roles 403. ✅
- **AI episode routes all gated**: `requireCareCoordinator` on `ai-intake-summary`, `ai-intake-summary/approve`, and `ai-care-plan-draft`. ✅
- **AiCarePlanDraftService conflict guard**: blocks new AI draft if a non-AI current plan exists (409); only demotes other AI draft rows. ✅
- **Clinical note immutability** (M3-3.2): PATCH/PUT/DELETE all return 405. ✅
- **Care plan state machine**: `assertCarePlanTransition` enforced on all status changes. ✅
- **AI draft never auto-submitted**: `status: 'draft'` always; coordinator must explicitly submit. ✅
- **AI callback idempotency**: draftKey-based upsert prevents duplicate drafts. ✅
- **Session conflict detection**: `assertNoProviderConflict` called before both single and recurring bookings. ✅
- **Coordinator-only plan creation/submit**: `requireCareCoordinator` on `POST /` and `POST /:id/submit`. ✅
- **Tenant org isolation on episodes**: all episode lookups call `assertTenantOrgAccess` or `mergeTenantOrg`. ✅
- **Task completion ownership**: assignee-only or coordinator can complete. ✅
- **AI callback auth required**: `requireAiServiceApiKey` middleware applied on all AI callback routes. ✅
- **AI session show/delete/sendMessage**: all check `isParticipant` before acting. ✅
- **Availability controller**: org isolation correct — coordinators can only manage providers in their org; self-management requires being the provider. ✅
- **Availability time validation**: `assertValidAvailabilityRange` enforces `endTime > startTime`. ✅
- **Conflict detection logic**: broad DB window + precise `windowsOverlap` filter; `excludeSessionId` handled correctly for reschedule. ✅
- **AI intake summary**: coordinator-only routes gated by `requireCareCoordinator`; approval is idempotent; draft status required before approve. ✅
- **AI care plan trigger**: coordinator + org access checked; never auto-submits to family (`status: 'draft'` always). ✅
- **RiayahAiClient**: `encodeURIComponent` used on episode IDs in URL paths (prevents path traversal). ✅
- **AI payload sent to Momen**: de-identified — no patient name, email, or phone; only DOB, gender, diagnoses, and clinical data. ✅
- **Public AI chat**: message capped at 1000 chars via Zod. ✅
- **Session scheduling routes**: all mutating endpoints behind `assertSchedulerRole`. ✅
- **Care summary PDF**: access check covers family (patientId or familyUserId), coordinator (org scope), and admin. All others get 403. ✅
- **Episode AI routes**: all three AI episode routes (intake summary, summary approve, care plan draft trigger) gated by `requireCareCoordinator`. ✅

---

## External dependency — message for Momen (AI service developer)

**Owner:** Momen / `Benaa-AI/raiyah-plus-ai-service` (not our app)  
**Status:** ⏸ Open — we shipped a client-side workaround; root cause is upstream  
**Endpoint:** `POST /v1/careplan/{episode_id}/draft`  
**Observed on:** staging (intermittent `422`)

### What’s broken

The care-plan **draft request** accepts an optional top-level field `familyConsultationNotes` (string | null).  
The care-plan **draft response** schema (`CarePlanDraft`) uses `additionalProperties: false` and does **not** allow `familyConsultationNotes`.

On staging, the LLM sometimes **echoes** `familyConsultationNotes` into the generated `CarePlanDraft` object. The AI service then fails its own output validation and returns:

- **HTTP 422**
- Detail along the lines of: `familyConsultationNotes` — **Extra inputs are not permitted**

That fails the draft call even when our request payload is valid.

### Impact on Riayah Plus

- Coordinator “Generate AI care plan draft” can fail with 422 until a retry succeeds.
- Family consultation notes cannot reliably be sent on the documented top-level field.

### Workaround we shipped (temporary)

In `RiayahAiClient.requestCarePlanDraft` / `AiCarePlanDraftService`:

1. Always send `familyConsultationNotes: null` on the wire.
2. Put real notes under `metadata.familyConsultationNotes` instead.
3. Retry up to **3×** when the 422 schema-echo pattern is detected.

This reduces failures but does **not** fix the root cause. Notes in `metadata` may also be ignored by the model unless the prompt/schema reads them.

### What we need from Momen

Please fix one (or both) of:

1. **Prompt / structured output** — ensure `CarePlanDraft` never includes `familyConsultationNotes` or other non-schema keys (strip before validate, or tighten the generator).
2. **Schema / API contract** — either:
   - allow and strip unknown keys on the draft object before validation, **or**
   - document that `familyConsultationNotes` must stay `null` and that notes belong only in `metadata` (and teach the model to read `metadata`).

Also confirm the intended contract for:

- Where family/consultation notes should live (`familyConsultationNotes` vs `metadata`)
- Whether draft responses are sync-only, callback-only, or both
- Staging vs production schema parity

Until this is fixed upstream, treat AI care-plan draft as **best-effort** with manual plan creation as fallback.
