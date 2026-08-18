# M3 Pre-Delivery Audit

**Prepared:** 2026-08-13  
**Scope:** Server-side controllers, routes, and services introduced in M3 (care plans, clinical notes, AI integration, scheduling, shifts/tasks), plus follow-up reviews covering AI chat/sessions and public endpoints, auth-bypass/RBAC drift, IDOR, telehealth, WhatsApp, admin secret login, LMS/API misconfiguration, mass-assignment/JWT/CORS/verb tampering/prototype-pollution surface, HIPAA/PHI privacy, ATO taxonomy, CDN/reverse-proxy cache poisoning and Web Cache Deception surface, and CSRF/cross-site state-changing request surface.  
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
| A | `agency.routes.ts` only authenticates; any role can create agency staff/assignments | Auth / RBAC | **Medium** | Open |
| B | `care-orders.routes.ts` has no role gate (controller enforces ownership) | Auth / RBAC | **Low** | Open |
| B.1 | `CareOrderController.list` returns client `email` | GDPR / HIPAA | **Low / Info** | Open |
| C | `caremanagement.routes.ts` has no route-level role gate | Auth / RBAC | **Medium** | Open |
| D | `tasks.routes.ts` has no route-level role gate | Auth / RBAC | **Low–Medium** | Open |
| E | `documents.routes.ts` / `storage.routes.ts` have no role gate (controller enforces ownership) | Auth / RBAC | **Low** | Open |
| F | `CareNeedController.show` leaks bids and client identity to any authenticated user | Info Disclosure | **Medium** | Open |
| G | `ChatController.getMessages` does not verify conversation membership | IDOR | **Medium** | Open |
| H | `receipts.routes.ts` has no role gate (controller enforces ownership) | Auth / RBAC | **Low** | Open |
| I | Notifications correctly user-scoped | — | **Info** | ✅ Confirmed |
| J | Public AI chat rate-limited | — | **Info** | ✅ Addressed |
| K | Any authenticated user can join arbitrary LiveKit room; checkin/checkout unscoped | Telehealth | **High** | Open |
| L | `provider.routes.ts` mutations authenticated only (self-pollution) | Auth / RBAC | **Low** | Open |
| M | `whatsapp.routes.ts` `send-template` open to any authenticated user | Auth / Abuse | **Medium** | Open |
| N | Admin secret-login backdoor bypasses 2FA/password policy when enabled | Auth | **High (config)** | Acknowledged |
| O | Any authenticated user can create/publish LMS courses | API Misconfig | **Medium** | Open |
| P | LMS trainer quiz routes lack course-ownership check | API Misconfig / IDOR | **Medium** | Open |
| Q | Course owner can flip `isPublished` without trainer role | API Misconfig | **Low–Medium** | Open |
| R–X | Mass-assignment, JWT, CORS, verb tampering, prototype pollution, Swagger surface | — | **Info** | ✅ Confirmed |
| AM | Refresh-token rotation lacks replay-detection response | Session / ATO | **Medium** | Open |
| AN | Email verification link is GET with side effects | Auth | **Low–Medium** | Open |
| AO | Public staff avatars served with long `public` cache TTL and stable URL | Cache / Privacy | **Low–Medium** | Open |
| AP | Production SPA static serving lacks cache-busting policy; WCD risk if CDN added | Cache / WCD | **Low** | Open |
| AQ | No CSRF tokens; all state-changing endpoints rely solely on `SameSite=Lax` cookies | Auth / CSRF | **Low / Info** | Acknowledged |

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

`limit` is parsed directly with no upper bound. A caller can pass `?limit=1000000` and get a very large result set across three Prisma queries (bookings, episodes, notes). The same bug was fixed in `AIChatController.history` (Finding 13).

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

The `publicAiLimiter` (10/min) was correctly applied (Finding 12), but the authenticated equivalent was missed.

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

## Auth-Bypass / RBAC Drift Findings (added during M3 revision)

Riayah Plus uses custom cookie-based JWT authentication (HS256, no SSO/SAML/OAuth). The auth-bypass surface therefore reduces to function-level access-control drift and a few public/optional-auth endpoints.

### Finding A — `agency.routes.ts` only checks authentication, not role or agency ownership

**File:** `server/src/routes/agency.routes.ts:6`  
**File:** `server/src/controllers/staff/StaffController.ts:36, 61, 127, 167`

```typescript
// routes
router.use(authenticate);

// controller
const agencyId = req.user!.userId;
```

Any authenticated user — including `family`, `patient`, or `client` — can call `POST /api/agency/staff`, `GET /api/agency/staff`, `POST /api/agency/assignments`, etc. The controller treats `req.user.userId` as an `agencyId` and creates `agencyStaff` / `staffAssignment` records under that ID. There is no `requireRole`, no `requireProvider`, and no verification that the caller is actually an agency.

A family user could create fake agency staff and assignments that pollute the agency data model and could surface in future admin reporting.

**Fix:** Add a role gate on the route level (e.g. `requireRole(['provider', 'doctor', ...])` or a new `requireAgency` middleware) and validate that a matching `serviceProvider` / agency profile exists for the caller.

**Severity:** Medium  
**Status:** Open

---

### Finding B — `care-orders.routes.ts` lacks a role gate, but controller enforces ownership

**File:** `server/src/routes/care-orders.routes.ts:6–12`  
**File:** `server/src/controllers/caremanagement/CareOrderController.ts:24–141`

```typescript
// route
router.use(authenticate);

// controller checks
if (order.clientId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);
```

The route only applies `authenticate`, but the controller correctly ties create/show/update/delete to `req.user.userId` and allows reads/mutations only for the owner or `admin`/`super_admin`/`care_coordinator`. A malicious authenticated user cannot access another user's orders.

The remaining risk is function-level defense-in-depth: any authenticated role (including family, provider, or support worker) can create care orders for themselves, and mutating endpoints are not restricted to client/family roles. This is an access-control drift rather than an immediate data-leak vulnerability.

**Fix:** Add a route-level role gate (`requireRole(['client', 'family', 'patient', 'care_coordinator', 'admin'])`) so only intended roles reach care-order mutations.

**Severity:** Low  
**Status:** Open

#### Finding B.1 — `CareOrderController.list` returns client `email` in the response

**File:** `server/src/controllers/caremanagement/CareOrderController.ts:76`

```typescript
client: { select: { id: true, name: true, email: true } },
```

`list` includes the care-order owner's `email` in every row. Since the list is already scoped to the caller (or all orders for coordinators/admins), this is primarily a GDPR/HIPAA minimum-necessary issue: the care-order UI does not need the client's email, and the same pattern was flagged in Findings 7 and 18.

**Fix:** Remove `email` from the `client` select.

**Severity:** Low / Info  
**Status:** Open

---

### Finding C — `caremanagement.routes.ts` relies on controller-level checks with no route-level role gate

**File:** `server/src/routes/caremanagement.routes.ts:12–72`

```typescript
router.use(authenticate);
router.post('/care-recipients', CareRecipientController.create);
router.get('/care-recipients/:id', CareRecipientController.show);
router.patch('/care-recipients/:id', CareRecipientController.update);
// ... family members, consents, profile, reports, dashboard
```

These endpoints are mounted at `/api/client` and `/api/family-members` (both in `routes/index.ts`). They are only gated by `authenticate`; there is no `requireClient` / `requireFamilyOrCoordinator` guard at the route level. If any controller assumes the caller is a family user and skips its own ownership check, the route is vulnerable to cross-user access.

**Fix:** Apply a route-level role gate (`requireRole(['family','client','patient','care_coordinator',...])`) in addition to controller ownership checks.

**Severity:** Medium  
**Status:** Open (controllers partially known to check ownership; route-level defense missing)

---

### Finding D — `tasks.routes.ts` has no role middleware beyond `authenticate`

**File:** `server/src/routes/tasks.routes.ts:7–15`

```typescript
router.use(authenticate);
router.get('/', controller.list.bind(controller));
router.post('/', controller.create.bind(controller));
router.post('/assign-episode', controller.assignEpisode.bind(controller));
router.put('/:id', controller.update.bind(controller));
router.delete('/:id', controller.remove.bind(controller));
router.patch('/:id/status', controller.updateStatus.bind(controller));
router.post('/:id/complete', controller.complete.bind(controller));
```

The task surface is fully authenticated but not role-restricted at the route level. The earlier audit (Finding 5/6) already found missing org-scope checks in `TaskController.create` / `assignEpisode`; adding a role gate would provide defense in depth and prevent non-coordinator/non-clinical users from reaching task mutations if a controller check is ever skipped.

**Fix:** Apply `requireRole(['care_coordinator', 'clinical_staff', ...])` on mutating routes, or keep broad read access while restricting writes.

**Severity:** Low–Medium  
**Status:** Open

---

### Finding E — `documents.routes.ts` and `storage.routes.ts` lack a role gate, but controller enforces ownership

**File:** `server/src/routes/documents.routes.ts:6–12`
**File:** `server/src/routes/storage.routes.ts:6–12`
**File:** `server/src/controllers/DocumentController.ts:61–99, 142–165`

```typescript
// route
router.use(authenticate);

// getSignedUrl ownership check
const owned =
  key.startsWith(`documents/${req.user!.userId}/`) ||
  key.startsWith(`intake/${req.user!.userId}/`);
if (!isAdmin && !owned) { ... prisma.document.findFirst({ where: { userId: req.user!.userId, ... } }) ... }

// downloadDocument ownership check
if (doc.userId !== userId && !isAdmin) throw new AppError('Document not found', 404);
```

Both `getSignedUrl` and `downloadDocument` verify ownership before returning a signed URL. `getSignedUrl` also rejects absolute-path and `..` keys, and falls back to a database ownership lookup for non-prefix keys.

Risk remains as defense-in-depth: the route itself only uses `authenticate`, so a future controller bug or accidental route change could expose downloads. Also, `storage.routes.ts` and `documents.routes.ts` both import the same `DocumentController`, but the file paths suggest separate scopes; this coupling could confuse future maintainers.

**Fix:** Apply a role gate on document routes (e.g. `requireRole(['family','client','provider','clinical_staff','admin'])`) and add a regression test ensuring `getSignedUrl` rejects keys outside the caller's prefix.

**Severity:** Low  
**Status:** Open

---

### Finding F — `marketplace.routes.ts` bid/counter endpoints rely on controller ownership; `show` leaks bids to any authenticated user

**File:** `server/src/routes/marketplace.routes.ts:7–27`  
**File:** `server/src/controllers/marketplace/CareNeedController.ts:72–133, 171–322`

```typescript
// show endpoint — no ownership or role check
careNeed = await prisma.careNeed.findUnique({
  where: { id: req.params.id },
  include: { client: { select: { id: true, name: true, avatar: true } }, bids: { ... } },
});

// bid/accept/reject/counter-offer all verify ownership
if (careNeed.clientId !== req.user!.userId) throw new AppError('Forbidden.', 403);
if (bid.providerId !== req.user!.userId) throw new AppError('...', 403);
```

Mutating bid endpoints correctly enforce ownership in the controller: only the care-need owner can accept/reject/counter, and only the bid owner can withdraw. `placeBid` allows any authenticated user to bid, but a bid is tied to the caller's own user ID and cannot impersonate another provider.

However, `GET /api/care-needs/:id` (`CareNeedController.show`) has **no ownership or role check**. Any authenticated user who knows a care-need ID can read the full detail, including the client identity (`id`, `name`, `avatar`) and all bids with provider identities. Combined with `list` returning only the caller's own needs for non-provider roles, `show` becomes an easy IDOR/information-disclosure path.

**Fix:** Add an ownership or role check in `show`: return 404 unless the caller is the client, a provider (browsing open needs is acceptable), or an admin. Alternatively, restrict `bids` and `client` detail to the owner/provider and redact for others.

**Severity:** Medium  
**Status:** Open

---

### Finding G — `chat.routes.ts` `getMessages` does not verify conversation membership

**File:** `server/src/routes/chat.routes.ts:6–15`  
**File:** `server/src/controllers/chat/ChatController.ts:58–71`

```typescript
static async getMessages(req: Request, res: Response): Promise<void> {
  const { page = '1', limit = '50' } = req.query as Record<string, string>;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const messages = await prisma.message.findMany({
    where: { conversationId: req.params.conversationId },
    include: { sender: { select: { id: true, name: true, avatar: true } } },
    ...
  });
  res.json({ data: messages.reverse() });
}
```

`getMessages` reads every message in the conversation identified by `conversationId` without checking whether the caller is a participant. Any authenticated user who knows or guesses a conversation UUID can read its full message history, including sender names and any file URLs.

Other chat methods (`getConversations`, `createConversation`, `markConversationRead`, `editMessage`, `deleteMessage`) correctly scope by user ID or membership. `store` blindly accepts any `conversationId`/`receiverId`, but it only creates a message, it does not leak existing history.

**Fix:** Before querying messages, verify the caller has a `participantLinks` record for the conversation. Also cap `limit` to a reasonable maximum (e.g. 500) to avoid large unbounded queries.

**Severity:** Medium  
**Status:** Open

---

### Finding H — `receipts.routes.ts` lacks a role gate, but controller enforces ownership

**File:** `server/src/routes/receipts.routes.ts:6–11`  
**File:** `server/src/controllers/ReceiptController.ts:10–60`

```typescript
if (topup.userId !== userId && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);
if (payout.providerId !== userId && req.user!.role !== 'admin') throw new AppError('Forbidden', 403);
```

Both `topupReceipt` and `payoutReceipt` verify that the caller is the owner or an admin before returning financial receipt data. No cross-user read is possible.

Remaining risk is defense-in-depth: the route has only `authenticate`, and `role !== 'admin'` is a literal string check that does not include `super_admin` or `support_admin`.

**Fix:** Apply a route-level role gate and align the admin check with the project's `ADMIN_ROLES` array (which includes `super_admin` / `support_admin`).

**Severity:** Low  
**Status:** Open

---

### Finding I — `notification.routes.ts` correctly scoped by userId

**File:** `server/src/routes/notification.routes.ts:6–32`  
**File:** `server/src/services/NotificationService.ts:46–62`

```typescript
static async markAsRead(id: string, userId: string) {
  return prisma.notification.updateMany({ where: { id, userId }, data: { readAt: new Date() } });
}
static async delete(id: string, userId: string) {
  return prisma.notification.deleteMany({ where: { id, userId } });
}
```

`NotificationService` scopes all read/update/delete operations by `userId`, so a user cannot mark or delete another user's notifications. `getForUser` and `getUnreadCount` are also user-scoped.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding J — Public AI chat endpoint is unauthenticated by design but should have rate limit and abuse guard reviewed

**File:** `server/src/routes/ai.routes.ts:16–29`

`POST /api/ai/public/chat` is intentionally public and already has `publicAiLimiter` (Finding 12). No auth-bypass finding. Flag for info only: ensure the Zod `message` max length and rate limit are sufficient to prevent quota abuse.

**Severity:** Info  
**Status:** Already addressed

---

### Finding K — `telehealth.routes.ts` telehealth token/room endpoints are authenticated but not role-scoped

**File:** `server/src/routes/telehealth.routes.ts:6–13`
**File:** `server/src/controllers/telehealth/TelehealthController.ts:10–33`

```typescript
router.use(authenticate);
router.post('/token', TelehealthController.generateToken);
router.post('/rooms', TelehealthController.createRoom);
router.get('/rooms/:roomName', TelehealthController.getRoomInfo);
```

Any authenticated user can request a LiveKit token for an arbitrary `roomName` and create/list rooms. `generateToken` does not verify that the caller is a participant in the underlying session/booking. A malicious user who knows a room name can join any active telehealth session.

**Fix:** Bind telehealth access to the associated `session`/`booking` membership. Before issuing a token or creating a room, verify the caller is the `clientId` or `providerId` (or admin) for the referenced session.

**Severity:** High  
**Status:** Open

**Note:** `TelehealthController.sessionCheckin` and `sessionCheckout` accept any `sessionId` without verifying the caller is the assigned provider or client for that session. A user who knows a session UUID can check in/out of arbitrary sessions and alter `checkInAt`, `checkOutAt`, and GPS geofence status. This is a separate but related authorization drift on the same route file.

**Fix:** In `sessionCheckin`/`sessionCheckout`, verify `session.providerId === req.user.userId || session.clientId === req.user.userId || ADMIN_ROLES` before updating.

---

### Finding L — `provider.routes.ts` profile/availability mutations are authenticated only before `router.use(authenticate)`

**File:** `server/src/routes/provider.routes.ts:7–127`

Public listing endpoints correctly use `optionalAuth`. However, after `router.use(authenticate)`, there is no `requireProvider` (or `requireRole(providerRoles)`) guard. A family or coordinator token could call `PUT /api/providers/profile` and create/update a `serviceProvider` record for the caller's own userId, or `POST /api/providers/availability` to overwrite availability slots. The controller uses `req.user.userId`, so the impact is limited to self-pollution, but it is still a function-level auth drift.

**Fix:** Add `requireProvider` after `router.use(authenticate)` so only provider/clinical roles can manage provider profiles and availability.

**Severity:** Low  
**Status:** Open

---

### Finding M — `whatsapp.routes.ts` user-facing message endpoints are authenticated only (no role gate)

**File:** `server/src/routes/whatsapp.routes.ts:70–112`

```typescript
router.get('/messages', authenticate, async (req: Request, res: Response, next: NextFunction) => {...});
router.post('/send-template', authenticate, async (req: Request, res: Response, next: NextFunction) => {...});
```

These endpoints are authenticated but not restricted to any role. Any user can retrieve WhatsApp messages associated with their phone number suffix and send templated messages to arbitrary phones. While the message lookup is scoped to the user's phone, `send-template` accepts any `phone` in the body and sends outbound templates, which could be abused for unsolicited messaging.

**Fix:** Restrict `send-template` to admin or a specific outbound-messaging role; add rate-limit per-destination phone.

**Severity:** Medium  
**Status:** Open

---

### Finding N — `auth.routes.ts` `/admin/login` secret-login backdoor is disabled by default but bypasses 2FA and password policy

**File:** `server/src/routes/auth.routes.ts:19–55`

```typescript
router.post('/admin/login', adminLimiter, async (req: Request, res: Response, next: NextFunction) => {
  if (process.env.ALLOW_ADMIN_SECRET_LOGIN !== 'true') { ... }
  ...
  const token = generateAccessToken({ userId: user.id, role: user.role, email: user.email });
  setAuthCookies(res, token);
  ...
});
```

When `ALLOW_ADMIN_SECRET_LOGIN=true`, an attacker who obtains `ADMIN_SECRET` can authenticate as any admin email without a password, bypassing 2FA, password policy, and brute-force protections. This is an intentional break-glass feature (M-48) but is a high-value target if the secret is leaked.

**Fix (if enabled in production):** Require MFA/2FA even on secret login; log and alert on every use; rotate `ADMIN_SECRET` frequently; restrict source IP.

**Severity:** High (when enabled)  
**Status:** Acknowledged / configuration-dependent

---

## API Misconfiguration / Mass-Assignment / JWT / CORS Findings (added during M3 revision)

This pass inspected `server/src` for mass assignment, JWT attacks, prototype pollution, HTTP verb tampering, CORS misconfiguration, Swagger/OpenAPI exposure, and shadow APIs.

### Finding O — Any authenticated user can create/update/delete LMS courses via `/api/courses`

**File:** `server/src/routes/lms.routes.ts:18–24`  
**File:** `server/src/controllers/lms/CourseController.ts:38–127`

```typescript
// routes
router.post('/', authenticate, CourseController.create);
router.patch('/:id', authenticate, CourseController.update);
router.delete('/:id', authenticate, CourseController.delete);

// controller
const course = await prisma.course.create({ data: { ...body, trainerId: req.user!.userId } });
```

The public `/api/courses` endpoints are gated only by `authenticate`. `CourseController.create` sets `trainerId = req.user.userId`, so any authenticated user (including family, client, or support worker) can create a course and become a de-facto trainer. They can then update/delete their own courses and add lessons.

A separate set of `/api/courses/trainer/*` routes exists with `requireRole(trainerRoles)`, but the public authenticated routes are not restricted to trainers. This is a mass-assignment / function-level authorization drift: the `trainerId` field is correctly server-set, but the ability to create courses at all is not role-gated.

**Fix:** Remove the authenticated-but-public course mutation routes (or move them behind `requireRole(trainerRoles)`). The `/trainer/courses` routes already provide the correct trainer-gated surface.

**Severity:** Medium  
**Status:** Open

---

### Finding P — LMS trainer quiz routes do not verify course ownership

**File:** `server/src/routes/lms.routes.ts:107–129`

```typescript
router.post('/trainer/quizzes', authenticate, requireRole(trainerRoles), async (req, res, next) => {
  const { courseId, title, questions, passingScore } = req.body;
  const quiz = await prisma.quiz.create({ data: { courseId, title, questions, passingScore } });
});
router.put('/trainer/quizzes/:id', authenticate, requireRole(trainerRoles), async (req, res, next) => {
  const { id } = req.params;
  const { title, questions, passingScore } = req.body;
  const quiz = await prisma.quiz.update({ where: { id }, data: { title, questions, passingScore } });
});
router.delete('/trainer/quizzes/:id', authenticate, requireRole(trainerRoles), async (req, res, next) => {
  await prisma.quiz.delete({ where: { id: req.params.id } });
});
```

These trainer routes check role but do not verify that the quiz/course belongs to the calling trainer. Any user with the `trainer` role can create quizzes on any course, update any quiz (including quizzes on other trainers' courses), and delete arbitrary quizzes.

**Fix:** Before creating a quiz, verify the caller owns `courseId`. Before update/delete, load the quiz with its course and verify `quiz.course.trainerId === req.user.userId` or admin.

**Severity:** Medium  
**Status:** Open

---

### Finding Q — `CourseController.update` allows owner to flip `isPublished` without trainer role

**File:** `server/src/controllers/lms/CourseController.ts:100–113`

```typescript
const body = courseSchema.partial().parse(req.body);
if (course.trainerId !== req.user!.userId && !isAdmin) throw new AppError('Forbidden.', 403);
const updated = await prisma.course.update({ where: { id: req.params.id }, data: body });
```

Because `body` is a Zod-parsed partial schema that includes `isPublished`, the owner of a course can publish or unpublish it regardless of whether they have the `trainer` role. This compounds Finding O: a family user who creates a course can immediately publish it on the public course catalog.

**Fix:** Apply `requireRole(trainerRoles)` to the course mutation routes and restrict `isPublished` changes to trainers/admins.

**Severity:** Low–Medium  
**Status:** Open

---

### Finding R — `FamilyMemberController.update` passes body directly, but schema is safe

**File:** `server/src/controllers/caremanagement/FamilyMemberController.ts:40–48`

```typescript
const body = schema.partial().parse(req.body);
const updated = await prisma.familyMember.update({ where: { id: req.params.id }, data: body });
```

The update spreads the Zod-parsed body into Prisma. The schema only allows `name`, `relationship`, `email`, `phone`, `role`, `canReceiveUpdates`, and `isEmergencyContact` — it does not allow `managerId`, so a mass-assignment takeover is not possible. This is a safe pattern, noted here for positive confirmation.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding S — `StaffController.update` passes body directly, but schema is safe

**File:** `server/src/controllers/staff/StaffController.ts:97–103`

```typescript
const body = createStaffSchema.partial().parse(req.body);
const updated = await prisma.agencyStaff.update({ where: { id: req.params.id }, data: body });
```

The update uses a Zod-parsed partial of the create schema, which excludes `agencyId` and `status`. Mass assignment of ownership is not possible. Confirmed clean.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding T — JWT configuration is hardened against algorithm confusion and `none`

**File:** `server/src/middleware/auth.ts:30–33`

```typescript
const ACCESS_VERIFY_OPTS: jwt.VerifyOptions = { algorithms: ['HS256'] };
const REFRESH_VERIFY_OPTS: jwt.VerifyOptions = { algorithms: ['HS256'] };
```

Access and refresh tokens are both HS256 and `jwt.verify` is called with `algorithms: ['HS256']`. This blocks `alg=none`, RS256→HS256 confusion, and unexpected algorithms. Refresh tokens include a unique `jti`, are hashed before storage (`refreshTokenHash.ts`), and are rotated on refresh.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding U — CORS is allowlisted and does not reflect arbitrary origins

**File:** `server/src/app.ts:117–128`

```typescript
app.use(
  cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  })
);
```

CORS uses an explicit origin allowlist, not a wildcard or regex. No credential-reflection finding. Socket.io CORS also uses `env.FRONTEND_URL`.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding V — No method-override middleware; HTTP verb tampering surface is minimal

A grep for `X-HTTP-Method`, `X-HTTP-Method-Override`, `method-override`, and `methodOverride` returned no results. Express routes are declared with explicit verbs. No HTTP verb tampering finding.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding W — No prototype-pollution sinks found on user input

A grep for `Object.assign`, `_.merge`, `_.defaults`, and merge patterns on `req.body` found only internal query building (`Object.assign(where, ...)`) and error wrapping. No `__proto__`-pollutable merge of user-controlled JSON was found.

**Severity:** Info  
**Status:** Confirmed clean

---

### Finding X — No Swagger / OpenAPI / GraphQL introspection surface

Grep for `swagger`, `openapi`, `/docs`, `/redoc`, `graphiql`, `/playground` in `server/` returned no matches. No spec-disclosure finding.

**Severity:** Info  
**Status:** Confirmed clean

---

### Summary of API misconfiguration findings

| Finding | Area | Severity | Status |
|---|---|---|---|
| O | Any authenticated user can create LMS courses | Medium | Open |
| P | Trainer quiz routes lack course-ownership check | Medium | Open |
| Q | Course owner can publish without trainer role | Low–Medium | Open |
| R | `FamilyMemberController.update` mass-assignment safe | Info | Confirmed clean |
| S | `StaffController.update` mass-assignment safe | Info | Confirmed clean |
| T | JWT algorithm pinning / refresh-token hashing | Info | Confirmed clean |
| U | CORS allowlist | Info | Confirmed clean |
| V | No HTTP verb override | Info | Confirmed clean |
| W | No prototype-pollution sinks | Info | Confirmed clean |
| X | No Swagger/OpenAPI/GraphQL surface | Info | Confirmed clean |

---

### Summary of auth-bypass severity adjustments

| Finding | Initial severity | After controller read | Reason |
|---|---|---|---|
| A — `agency.routes.ts` no role gate | Medium | Medium | Controller treats any userId as agencyId; real bypass surface. |
| B — `care-orders.routes.ts` | Medium | Low | Controller enforces ownership; missing route-level role gate only. |
| B.1 — `CareOrderController.list` returns `email` | — | Low / Info | GDPR/HIPAA over-fetch in the same controller. |
| C — `caremanagement.routes.ts` | Medium | Medium | No controller read done; route-level defense still missing. |
| D — `tasks.routes.ts` | Low–Medium | Low–Medium | Existing findings 5/6 cover the real org-scope risk; this is defense-in-depth. |
| E — documents/storage | Medium | Low | Controller enforces ownership and rejects path-traversal keys. |
| F — marketplace bids | Low–Medium | Medium | `show` leaks care-need detail and all bids to any authenticated user. |
| G — chat | Low–Medium | Medium | `getMessages` does not verify caller is a participant. |
| H — receipts | Medium | Low | Controller enforces owner-or-admin access. |
| I — notifications | Info | Info | Confirmed user-scoped. |
| J — public AI chat | Info | Info | Already addressed by Finding 12. |
| K — telehealth token/room | High | High | Any authenticated user can join arbitrary LiveKit rooms; checkin/checkout also unscoped. |
| L — provider routes | Low | Low | Self-pollution only; controller uses caller userId. |
| M — WhatsApp send-template | Medium | Medium | No controller read; authenticated users can send templates to arbitrary phones. |
| N — admin secret login | High (when enabled) | High (when enabled) | Break-glass bypass of password + 2FA. |

---

### Not-flagged (confirmed clean)

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
- **JWT algorithm pinning**: `jwt.verify` restricted to `HS256` for both access and refresh tokens; `alg=none` and algorithm-confusion attacks blocked. ✅
- **Refresh token storage**: refresh tokens are hashed with SHA-256 before persistence, rotated on refresh, and scoped with `jti`. ✅
- **CORS**: explicit origin allowlist (`env.FRONTEND_URL`, localhost dev origins); no wildcard or regex reflection. ✅
- **HTTP verb tampering**: no method-override middleware; routes are verb-specific. ✅
- **Prototype pollution**: no `_.merge`/`Object.assign` on user-controlled JSON; only internal query building and error wrapping. ✅
- **Swagger/OpenAPI/GraphQL**: no spec or introspection endpoints present. ✅
- **Mass-assignment safe patterns**: `FamilyMemberController.update` and `StaffController.update` use Zod schemas that exclude ownership fields. ✅

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

---

## HIPAA / Privacy Compliance Findings

These findings focus on HIPAA minimum-necessary access, PHI audit logging, third-party/LLM boundaries, and family/client access scoping. They are separate from the OWASP-style findings above and should be triaged before any HIPAA pre-delivery review.

| # | Finding | Area | Severity | Status |
|---|---------|------|----------|--------|
| AA | AI care-plan draft sends clinical data without consent gate | AI / PHI disclosure | **High** | Open |
| AB | Google Gemini chat lacks consent check in doctor-chat and session message paths | AI / PHI disclosure | **High** | Open |
| AC | Audit-log redaction list misses common PHI fields | Audit controls | **High** | Open |
| AD | Sentry captures requests with no PII scrubbing | Observability / PHI leak | **High** | Open |
| AE | Chat messages persisted and broadcast without audit logging or retention policy | Chat / Audit | **Medium** | Open |
| AF | Telehealth token/room endpoints allow any authenticated user to join arbitrary sessions | Telehealth / Access control | **High** | Open |
| AG | Care-order endpoints leak client email and have no org scoping for coordinators | Care Orders / Minimum necessary | **High** | Open |
| AH | Family-member and care-recipient CRUD lacks audit logs and org scoping | PHI CRUD / Audit | **Medium** | Open |
| AI | Marketplace care-need `show` leaks client identity and bids to any authenticated user | Marketplace / Minimum necessary | **Medium** | Open |
| AJ | WhatsApp outbound flow can carry PHI and lacks Business Associate evidence | Integrations / BAA | **Medium** | Open |
| AK | Payment services send names/emails/internal IDs to Stripe/PayTabs without documented BAA | Payments / BAA | **Low–Medium** | Open |
| AL | Clinical-note `canSeePrivateNote` is too broad and not audited | Clinical Notes / Minimum necessary | **Medium** | Open |

---

### Finding AA — AI care-plan draft sends clinical data without consent gate

**File:** `server/src/services/AiCarePlanDraftService.ts:320–365`

`AiCarePlanDraftService.requestFromCoordinator()` builds a payload that includes `careRecipient.dateOfBirth`, `gender`, `diagnosisCodes`, `medicalHistory`, `reasonForCare`, `currentMeds`, and completed assessment `findings`/`recommendations`, then sends it to `RiayahAiClient.requestCarePlanDraft()`. The code has no check for a care-episode AI-consent flag. By contrast, `AiIntakeSummaryService.summarizeAndPersist()` checks `careEpisode.consentGiven` before sending an equivalent intake payload.

**PHI elements:** Diagnoses, medications, medical history, assessment findings/recommendations, DOB, gender.

**HIPAA principle:** §164.502(b) minimum necessary + §164.508 authorization for disclosure to a third party / §164.504(e) Business Associate arrangement.

**Fix:** In `requestFromCoordinator()`, verify `careEpisode.consentGiven === true` (or a dedicated `ai_care_plan` consent record) before calling `RiayahAiClient.requestCarePlanDraft()`. Return `403` with a clear message when consent is missing. Log the disclosure decision via `AuditService.log` with `entity: 'CareEpisode'`, `action: 'ai_care_plan_draft_requested'`, and only non-PHI metadata (`episodeId`, `actorId`, `consentStatus`).

**Severity:** High  
**Status:** Open

---

### Finding AB — Google Gemini chat lacks consent check in doctor-chat and session message paths

**Files:**
- `server/src/controllers/AIDoctorController.ts:28–46`
- `server/src/controllers/ai/AISessionController.ts:115–132`
- `server/src/services/GeminiChatService.ts:17–108`
- `server/src/routes/ai.routes.ts:46`

**Details:**
- `AIChatController.sendMessage()` and `streamMessage()` correctly require `ai_chat` consent via `assertAiChatConsent()`.
- `AISessionController.sendMessage()` sends user messages to `GeminiChatService.sendMessage()` without re-checking that consent.
- `AIDoctorController.doctorChat()` sends messages to Google Gemini with a clinical system prompt and has no consent check at all.
- `GeminiChatService.loadHistory()` returns the last 20 persisted messages, including any PHI a user may have typed. There is no input-side PII scrubber before a message leaves the server for Gemini.

**PHI elements:** Free-text symptoms, diagnoses, medications, names, appointments, care-plan details.

**HIPAA principle:** §164.508 authorization + §164.504(e) Business Associate. Using a consumer LLM API without a documented BAA/DPA and without consent gating creates disclosure risk.

**Fix:**
1. Add `assertAiChatConsent(userId)` in `AISessionController.sendMessage()` before calling `GeminiChatService.sendMessage()`.
2. Add the same consent check in `AIDoctorController.doctorChat()`, or remove/disable the endpoint until a consent + BAA posture is defined.
3. Add a lightweight PII pre-scrubber in `GeminiChatService.sendMessage()`/`streamMessage()` that redacts Qatari phone numbers, national IDs, and names when a message is about to leave the platform (or at minimum warn/audit such messages).
4. Persist an `AuditService.log` row for every outbound Gemini call with `action: 'ai_chat_message_sent'`, `entity: 'Conversation'`, `entityId`, and a `consentStatus` flag; store only `messageLength`, not `content`.

**Severity:** High  
**Status:** Open

---

### Finding AC — Audit-log redaction list misses common PHI fields

**Files:**
- `server/src/utils/auditRedact.ts:1–50`
- `server/src/middleware/auditMiddleware.ts:46–69`

`auditMiddleware` captures `req.params` and `req.body` for every POST/PUT/PATCH/DELETE and stores them via `AuditService.logHttpMutation()`. Safety depends on `redactForAudit()`’s `SENSITIVE_KEYS` list. The list is missing keys that appear in M3 payloads:
- `content` (chat messages, notifications, task notes)
- `message` (AI chat, WhatsApp outbound)
- `note` (singular; `notes` is covered)
- `summary` (AI intake summary, care summary)
- `planData`, `carePlanData`
- `externalRef` (MRN-like care-recipient identifier)
- `name`, `firstName`, `lastName`, `fullName`
- `nationalId`, `emiratesId`, `qid`
- `fileUrl`, `recordingUrl`

Redaction is case-insensitive exact-key match only, so nested fields inside objects like `careRecipient` are only redacted when their sub-key matches.

**PHI elements:** Free-text clinical notes, names, MRNs, national IDs, media URLs.

**HIPAA principle:** §164.312(b) audit controls — audit logs themselves must not become an unauthorized PHI repository.

**Fix:**
1. Expand `SENSITIVE_KEYS` in `server/src/utils/auditRedact.ts` to include the missing keys above.
2. Add a recursive value-pattern redactor (e.g., Qatari phone `^(00974|\+974|974)?[0-9]{8}$`, national ID patterns) so embedded PHI inside free-text fields is also masked.
3. Add unit tests for `redactForAudit` covering each new key, nested objects, arrays, and depth > 4 truncation.
4. Consider whether automatic mutation audit logs should capture full request bodies at all; if not, store only path, method, status, userId, and entityId.

**Severity:** High  
**Status:** Open

---

### Finding AD — Sentry captures requests with no PII scrubbing

**File:** `server/src/app.ts:40–47`

`Sentry.init()` uses `Sentry.expressIntegration()` with default settings. `Sentry.setupExpressErrorHandler(app)` is mounted after routes and before the custom error handler. There is no `requestBodies: 'never'`, no `beforeSend`/`beforeSendTransaction` scrubber, and no `sensitiveCookies` list. Sentry’s default Express integration can capture request bodies, headers, and cookies, which may include PHI.

**PHI elements:** Request bodies containing intake data, clinical notes, chat messages, care-plan content; cookies/session identifiers.

**HIPAA principle:** §164.504(e) — a Business Associate must return/destroy PHI and cannot use/disclose it; without a scrubber, Sentry may store PHI outside the covered-entity boundary.

**Fix:**
1. Add `requestBodies: 'never'` to the Sentry integration options (or set `maxRequestBodySize: 'never'`).
2. Implement `beforeSend(event)` and `beforeSendTransaction(event)` in `server/src/app.ts` to delete `event.request.data`, `event.user.email`, `event.user.ip_address`, cookies, and any `extra` fields containing request bodies.
3. Document the Sentry project configuration and confirm a signed Business Associate Agreement is in place.

**Severity:** High  
**Status:** Open

---

### Finding AE — Chat messages are persisted and broadcast without audit logging or retention policy

**Files:**
- `server/src/controllers/chat/ChatController.ts`
- `server/src/services/GeminiChatService.ts:41–45, 82–86`

`ChatController.store()` creates a `message` row with user-provided `content`, `fileUrl`, `conversationId`, and `receiverId`, then broadcasts the full message object over Socket.io. `editMessage()` and `deleteMessage()` only soft-delete (`deletedAt`) or update `content`. There are no `AuditService.log` calls in the chat controller, and `prisma.message` rows are not covered by a retention/anonymization job (the existing job targets soft-deleted users only). Gemini AI messages are also stored as `type: 'text'` / `'ai_response'` in the same table.

**PHI elements:** Free-text chat content, file URLs, sender/recipient identities.

**HIPAA principle:** §164.312(b) audit controls + §164.530(j) security incident procedures + retention limits.

**Fix:**
1. Add explicit `AuditService.log` calls in `ChatController.store`, `editMessage`, and `deleteMessage` with `entity: 'Message'`, `entityId`, and non-PHI metadata (`conversationId`, `receiverId`, `action`).
2. Ensure the data-retention policy covers `message.content` — either purge messages older than the documented retention period or anonymize `content` while keeping conversation metadata.
3. Confirm Socket.io rooms are scoped to `chat.{userId}` and that a user can only subscribe to their own room.

**Severity:** Medium  
**Status:** Open

---

### Finding AF — Telehealth token/room endpoints allow any authenticated user to join arbitrary sessions

**Files:**
- `server/src/routes/telehealth.routes.ts:6–13`
- `server/src/controllers/telehealth/TelehealthController.ts:10–88`
- `server/src/controllers/telehealth/MeetingSchedulerController.ts`

`TelehealthController.generateToken()` creates a LiveKit token for any `roomName` without verifying the caller is a participant. `createRoom()` accepts any `sessionId`; `getRoomInfo()` lists any room. `sessionCheckin()`/`sessionCheckout()` update any session’s GPS/clock-in data. `MeetingSchedulerController` stores `recordingUrl` and returns it to any participant. These endpoints are only `authenticate`-gated.

**PHI elements:** Audio/video session content, recording URLs, patient address/GPS coordinates, session metadata.

**HIPAA principle:** §164.312(a)(1) access control — users must only access sessions for which they are authorized.

**Fix:**
1. In `generateToken()`, require the caller to pass `sessionId` (or `bookingId`), load the session, and verify `session.providerId === req.user.userId || session.clientId === req.user.userId || admin` before issuing a token.
2. In `createRoom()`, verify the caller is `session.providerId` or an admin.
3. In `sessionCheckin()`/`sessionCheckout()`, verify `session.providerId === req.user.userId || session.clientId === req.user.userId || admin`.
4. Restrict `GET /meetings/:id/recording` to meeting host/participants and log each access via `AuditService.log`.
5. Encrypt or tokenize `recordingUrl` storage; do not return direct LiveKit/S3 URLs without time-limited presigned access.

**Severity:** High  
**Status:** Open (related to Finding K but adds PHI/recording angle)

---

### Finding AG — Care-order endpoints leak client email and have no org scoping for coordinators

**Files:**
- `server/src/routes/care-orders.routes.ts:6–12`
- `server/src/controllers/caremanagement/CareOrderController.ts:62–128`

`CareOrderController.list()` treats `care_coordinator` as an admin and uses `where = {}`, returning all care orders across every organization. The response includes `client: { id, name, email }` and the full `recipient` object. `show()` and `update()` also treat any `care_coordinator` as admin and grant access to any order. There is no route-level role gate.

**PHI elements:** Client name/email, recipient name/relationship/phone, care-order notes.

**HIPAA principle:** §164.502(b) minimum necessary + §164.308(a)(4) access authorization.

**Fix:**
1. Add `requireRole([...])` to `care-orders.routes.ts`.
2. In `list()`, scope `where` to `clientId: userId` for family/client roles and to `organizationId` for coordinators. Remove `email` from the `client` select.
3. In `show()`/`update()`, verify `order.clientId === userId` or the caller’s org matches `order.organizationId` (after adding `organizationId` to the model or resolving it via `episodeId`).
4. Add `AuditService.log` calls to `create`, `update`, and `delete`.

**Severity:** High  
**Status:** Open (related to Finding B/B.1 but raises HIPAA org-scope angle)

---

### Finding AH — Family-member and care-recipient CRUD lacks audit logs and org scoping

**Files:**
- `server/src/controllers/caremanagement/FamilyMemberController.ts`
- `server/src/controllers/caremanagement/CareRecipientController.ts`
- `server/src/controllers/caremanagement/ClientProfileController.ts`

These controllers directly create/update/delete PHI-bearing records (name, DOB, gender, relationship, email, phone, nationalId, insuranceNumber, medicalNotes, allergies, medications, emergency contacts). There are no `AuditService.log` calls, no route-level role restrictions beyond `authenticate`, and no organization scoping. Access relies on `managerId === userId` or `userId === req.user.userId`, with no centralized org-level visibility policy.

**PHI elements:** Names, DOB, contact info, national ID, insurance numbers, medical notes, allergies, medications.

**HIPAA principle:** §164.308(a)(1) access control + §164.312(b) audit controls.

**Fix:**
1. Add role gates to `caremanagement.routes.ts` for these sub-resources.
2. Add explicit `AuditService.log` calls in `FamilyMemberController.create/update/delete`, `CareRecipientController.create/update/delete`, and `ClientProfileController.upsert`.
3. For coordinator access to family records, use `careUnit.familyUserId` + org membership rather than only `managerId === userId` when a coordinator is assisting the family.
4. Apply `redactForAudit()` to any `before`/`after` metadata in those audit calls.

**Severity:** Medium  
**Status:** Open (related to Finding C but adds audit/logging angle)

---

### Finding AI — Marketplace care-need `show` leaks client identity and bids to any authenticated user

**Files:**
- `server/src/routes/marketplace.routes.ts:7–27`
- `server/src/controllers/marketplace/CareNeedController.ts:72–133`

`CareNeedController.show()` loads a care need with `client { id, name, avatar }` and all bids with `provider { id, name, avatar }` without verifying ownership or role. Any authenticated user who knows the UUID can read the full detail. This exposes the client identity and the competitive bid landscape.

**PHI elements:** Client name/avatar, provider names/avatars, care-need description/location.

**HIPAA principle:** §164.502(b) minimum necessary + §164.308(a)(4) access authorization.

**Fix:**
1. In `CareNeedController.show()`, return 404 unless the caller is the client, an admin, or a provider who has already placed a bid on this care need.
2. For open-market browsing, return a redacted view that omits `client.name` and `bids` (or only shows the caller’s own bid).
3. Add `AuditService.log` for `show` and bid-mutation actions.

**Severity:** Medium  
**Status:** Open (related to Finding F but framed as HIPAA minimum-necessary)

---

### Finding AJ — WhatsApp outbound flow can carry PHI and lacks Business Associate evidence

**Files:**
- `server/src/services/WhatsAppService.ts`
- `server/src/services/WhatsAppBookingFlowService.ts`
- `server/src/routes/whatsapp.routes.ts:70–112, 160–222`

`WhatsAppService.sendText()` and `sendInteractive()` send `phone` + message body to Meta’s WhatsApp Business API. Booking reminders and admin templates can include provider names, service types, dates, and booking IDs. OTP messages include 6-digit codes. Inbound webhook stores full Meta payload in `whatsAppMessage.metadata`. No BAA/DPA language exists in the codebase.

**PHI elements:** Phone numbers, names, service types, appointment times, booking IDs, OTP codes, message metadata.

**HIPAA principle:** §164.504(e) Business Associate + §164.530(c) safeguards.

**Fix:**
1. Restrict `send-template` to admin or a dedicated outbound-messaging role and rate-limit per phone.
2. Audit every outbound WhatsApp message in `AuditService.log` with `entity: 'WhatsAppMessage'`, `entityId`, phone hashed, `templateName`, and no body content.
3. Confirm a signed BAA/DPA with Meta for WhatsApp Business use, or document that only non-clinical reminders are sent via WhatsApp.
4. Sanitize `whatsAppMessage.metadata` before storage to remove unexpected PII fields.

**Severity:** Medium  
**Status:** Open (related to Finding M but adds HIPAA/BAA angle)

---

### Finding AK — Payment services send names, emails, and internal user IDs to Stripe/PayTabs without documented BAA

**Files:**
- `server/src/services/StripeService.ts`
- `server/src/services/QatariPaymentService.ts`
- `server/src/controllers/payments/PaymentMethodController.ts`
- `server/src/controllers/payments/BookingPaymentController.ts`

Stripe customer creation sends `email`, `name`, and `userId` metadata. PayTabs initiation sends `customerName`, `customerEmail`, `customerPhone`, and `cart_id`. These are standard payment flows, but for a healthcare platform the combination of name/email with booking/invoice IDs can be PHI if the payment is for a clinical service.

**PHI elements:** Name, email, phone, internal user/booking IDs linked to clinical services.

**HIPAA principle:** §164.504(e) Business Associate.

**Fix:**
1. Confirm signed BAAs with Stripe and PayTabs (or their regional entity) are in place and documented.
2. Minimize metadata passed to Stripe to only what is required for reconciliation; avoid clinical context in `description`/`metadata`.
3. Add a `processors` section to the privacy policy listing each payment processor and the categories of PHI shared.

**Severity:** Low–Medium  
**Status:** Open

---

### Finding AL — Clinical-note `canSeePrivateNote` is too broad and not audited

**File:** `server/src/controllers/clinical/ClinicalNoteController.ts:25–38, 85–205`

`canSeePrivateNote()` returns `true` for any `clinical_staff` or clinical role (doctor, nurse, physiotherapist, psychologist, etc.) regardless of whether they are assigned to the episode/session. A specialist who has never interacted with the patient can read private notes. The controller has `canView`/`canCreate` coarse checks and one `AuditService.log` on create, but reads are not audited and private-note visibility is org-wide.

**PHI elements:** Clinical note content, author identity.

**HIPAA principle:** §164.502(b) minimum necessary — private notes should be limited to those with a treatment relationship or administrative need.

**Fix:**
1. Tighten `canSeePrivateNote()` so private notes are visible only to the author, admins, and users who have an assigned `session` or `assessment` on the same episode.
2. Add `AuditService.log` for `index` and `show` with `entity: 'ClinicalNote'`, `entityId`, and `isPrivate` flag; do not store `content`.
3. Verify the `take`/`page` cap from Finding 22 is enforced in `index`.

**Severity:** Medium  
**Status:** Open (related to Finding 10 but adds audit + minimum-necessary framing)

---

## Cache-Attack / CDN Risk Findings

Top-down review of cache-related headers, static-asset serving, and host-header behavior. No live CDN testing was performed; findings are configuration/deployment risks that become exploitable if a caching reverse proxy or CDN is placed in front of the API.

### Finding AO — Public staff avatars served with `Cache-Control: public, max-age=86400` and stable URL

**Files:**
- `server/src/routes/auth.routes.ts:82–83`
- `server/src/controllers/users/StaffProfileController.ts:264–267`

**Details:**
`GET /api/avatars/:userId/:filename` is public (no authentication required) and explicitly returns:

```
Cache-Control: public, max-age=86400
```

The URL is stable per user and filename, so any CDN, corporate proxy, or browser cache will retain the avatar for 24 hours. Two risks follow:

1. **Revocation / replacement latency.** When a staff member uploads a new avatar to replace an old one (e.g., because the previous image was accidentally PII-rich or inappropriate), the old image remains publicly cached at the previous URL for a full day.
2. **PII exposure surface.** In a healthcare platform, provider/staff faces on episode cards are adjacent to PHI. Because the route is public and the URL pattern is predictable (`/api/avatars/{userId}/{filename}`), anyone who learns or guesses a `userId` and filename can retrieve and cache the image unauthenticated.

The controller does apply path-traversal and magic-byte validation, so file-content injection is not the issue; the issue is cache TTL + URL stability + public accessibility of user-generated images.

**Fix:**
1. Append a content hash / upload timestamp to the avatar URL (e.g., `/api/avatars/:userId/:filename?h=<hash>`) and return that URL wherever the avatar is referenced, so replacement immediately invalidates CDN/browser entries.
2. Reduce TTL for user-generated images; use `Cache-Control: public, max-age=3600` or `private` if avatars should not be shared across users.
3. Document whether staff avatars are considered PHI and, if so, require authentication or signed URLs.
4. Consider rate-limiting avatar downloads under `avatarUploadLimiter` or a separate download limiter.

**Severity:** Low–Medium  
**Status:** Open

---

### Finding AP — Production SPA static serving lacks cache-busting policy, creating Web Cache Deception (WCD) risk if a CDN is added

**File:** `server/src/app.ts:144–151`

**Details:**
In production, the API serves the built Vite SPA with:

```typescript
const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});
```

`express.static` uses default cache headers (`max-age: 0`) unless configured otherwise, and the SPA fallback returns `index.html` for **any** non-API path. If a CDN or reverse proxy is later placed in front of the app, this combination is the textbook setup for Web Cache Deception:

- An attacker can request a sensitive-looking authenticated path with a fake static extension, e.g., `/admin/dashboard;.css` or `/careseeker/messages.json`.
- Some CDNs treat the extension as a static asset, cache the response (`index.html` containing the authenticated SPA shell), and serve it to subsequent requesters of that same URL.
- Because auth cookies are `SameSite=Lax`, cross-origin WCD generally requires top-level navigation to carry cookies, but same-origin or sibling-subdomain attackers are not blocked by `Lax`.

Additionally, Vite normally emits hashed asset filenames (`assets/index-abc123.js`) that can be cached immutably, but `index.html` itself should never be cached by intermediaries. The current code does not distinguish between immutable hashed assets and the entry HTML, so either everything is uncached (performance loss) or everything is cached (WCD / stale-app risk).

**Fix:**
1. Configure `express.static(clientDist, { maxAge: '1y', immutable: true })` for hashed assets, but explicitly serve `index.html` with `Cache-Control: no-cache, no-store, must-revalidate, private`.
2. Restrict the SPA fallback to HTML-accepting requests (check `req.headers.accept?.includes('text/html')`) and return 404/405 for non-HTML paths that do not match static files.
3. If a CDN is used, configure an origin rule that never caches responses containing `Set-Cookie` and that treats `index.html` as non-cacheable.
4. Add a `Cache-Control` policy for the API that defaults to `no-store` for authenticated responses.

**Severity:** Low  
**Status:** Open (becomes High if/when a public CDN is placed in front of the SPA without origin rules)

---

## CSRF / Cross-Site State-Changing Request Findings

Top-down review of cookie `SameSite` policy, CORS configuration, CSRF-token usage, and state-changing GET endpoints.

### Cookie and CORS posture

**Files:**
- `server/src/utils/authCookies.ts:9–36`
- `server/src/app.ts:94–128`
- `server/src/middleware/auth.ts:71–105`

The M3 revision uses the following defense stack:

- Access token cookie: `httpOnly`, `secure` in prod, `SameSite=Lax`, `__Host-` prefix in prod, 15-minute TTL.
- Refresh token cookie: `httpOnly`, `secure` in prod, `SameSite=Strict`, `__Host-` prefix in prod, 7-day TTL.
- CORS origin whitelist (`env.FRONTEND_URL`, `localhost:3000`, `localhost:5173`) with `credentials: true`.
- API relies on Zod + `express.json()`; non-JSON bodies are rejected, blocking `text/plain` form CSRF to JSON endpoints.
- No CSRF token, double-submit cookie, or custom antiforgery header (e.g., `X-CSRF: 1`) is implemented.

Because `SameSite=Lax` blocks cookies on cross-site POST/PUT/PATCH/DELETE and refresh is `Strict`, **classic cross-site CSRF against the JSON API is not exploitable in modern browsers** from an arbitrary attacker origin. The same protection blocks `application/x-www-form-urlencoded` and `text/plain` form POSTs even before CORS is evaluated, because the browser simply does not send the cookies.

The one currently exploitable CSRF-style vector is the **GET-based email verification endpoint**, already captured as **Finding AN**.

### Finding AQ — No CSRF tokens; all state-changing endpoints rely solely on `SameSite=Lax` cookies

**Files:**
- `server/src/utils/authCookies.ts:9–36`
- `server/src/app.ts:94–128`
- All authenticated `router.post/put/patch/delete` routes under `server/src/routes/`

**Details:**
The application has no server-side CSRF protection beyond browser `SameSite` semantics. Every account-level mutation (password change, profile update, 2FA disable, device-token registration, care-plan submission/approval, clinical-note creation, telehealth checkin, etc.) depends on the access cookie being `SameSite=Lax`.

This is acceptable **today** because:
- `SameSite=Lax` blocks cross-site POST.
- Refresh token is `Strict`, so an attacker cannot silently refresh a stolen/expired access cookie cross-site.
- CORS origin whitelist blocks cross-origin `fetch`/`XHR` even if a future cookie change occurs.

However, it becomes a single-point-of-failure if the deployment ever:
1. Relaxes the access cookie to `SameSite=None` to support embedded widgets or third-party integrations.
2. Adds a wildcard or attacker-controlled origin to the CORS whitelist.
3. Introduces a same-site or sibling-subdomain XSS/primitive (e.g., a marketing subdomain under the same registrable domain) that can issue same-site requests.

Unlike frameworks that rotate per-request or per-session antiforgery tokens, this codebase has no fallback primitive to deploy if `SameSite` is ever weakened.

**Fix:**
1. Add a lightweight double-submit cookie or `X-CSRF-Token` header pattern for all authenticated state-changing endpoints. Because the client is a first-party SPA, a synchronizer token stored in a non-`httpOnly` cookie (`csrf_token`) and echoed in a request header is straightforward and works behind the same CORS policy.
2. Ensure the token is cryptographically random, rotated on login, and invalidated on logout/session revocation.
3. Keep `SameSite=Lax` / `Strict` as the primary defense; treat CSRF tokens as defense-in-depth, not a replacement.
4. Reject state-changing requests that arrive without the token/header when the request is cookie-authenticated.

**Severity:** Low / Info  
**Status:** Acknowledged (current `SameSite=Lax` + `Strict` + CORS whitelist provides effective protection; no exploit path exists today without a same-site primitive or future misconfiguration)

---

### Finding AM — Refresh-token rotation does not detect reuse (silent token theft)

**Files:**
- `server/src/controllers/auth/AuthController.ts:233–261`
- `server/src/utils/refreshTokenStore.ts:36–42`
- `server/src/middleware/auth.ts:34–50`

**Details:**
`AuthController.refresh()` rotates refresh tokens correctly: it revokes the old stored token and issues a new one on every refresh. However, there is no reuse-detection hook. If an attacker steals a refresh token and uses it after the legitimate user has already rotated it (or concurrently races it), the legitimate user's next refresh will simply receive `Invalid or expired refresh token` and be logged out, while the attacker's refresh succeeds and continues to obtain fresh access tokens.

Because the server does not treat presentation of a revoked refresh token as a compromise signal, token theft is not surfaced to the user or to administrators, and the attacker can maintain access until the stolen refresh token naturally expires or the user manually changes their password.

This finding is related to the ATO path: cookie/session token theft → persistent access without victim notification.

**Fix:**
1. When `findRefreshTokenByPlain()` returns a stored token that has already been revoked or expired, treat this as a reuse event.
2. On reuse detection, immediately revoke **all** refresh tokens and user sessions for the user, record a `token_reuse_detected` audit event, and clear the caller's cookies.
3. Notify the user (in-app and/or email) that a session token was reused and prompt them to re-authenticate and review active sessions.
4. Consider storing a short-lived "refresh token family" or `parentId` chain to distinguish legitimate rotation from concurrent reuse.

**Severity:** Medium  
**Status:** Open

---

### Finding AN — Email verification link uses GET with side effects

**Files:**
- `server/src/controllers/auth/AuthController.ts:643–699`
- `server/src/routes/auth.routes.ts:80`
- `server/src/utils/emailVerification.ts:6–25`

**Details:**
`GET /api/email/verify?token=...&email=...` is state-changing: on success it deletes all `email_verification` tokens for the user and flips `isEmailVerified` to `true`. Using GET for a state-changing action violates RFC 7231 safe-method semantics and makes the endpoint vulnerable to accidental or automated invocation.

Email clients, link-preview services, security scanners, and corporate proxies may pre-fetch or scan URLs in messages. If any of them call the verification link before the user does, the account can be marked verified without the user's explicit action. The token is single-use and user-bound (M-50), so an external attacker cannot construct a valid link, but the integrity of the "user explicitly verified their email" event is weakened.

**Fix:**
1. Change the email verification flow to a POST/PUT endpoint that accepts the token in the body (e.g., `POST /api/email/verify` with JSON `{ email, token }`).
2. Keep the existing GET endpoint only as a landing page that renders a confirmation form; the form then submits the token via POST.
3. Ensure the POST endpoint is rate-limited and continues to validate the token-user binding from M-50.
4. Add an `AuditService.log` entry for the actual verification action.

**Severity:** Low–Medium  
**Status:** Open

---

## ATO Audit Notes

**Scope:** Password-reset, password-change, session/refresh, 2FA, email verification, invite set-password, and admin secret-login flows.

**Taxonomy mapping:**

| Path | Control status | Evidence |
|------|----------------|----------|
| 1. Password-reset host-header poisoning | **Mitigated** | Reset URL is built from server-pinned `env.FRONTEND_URL`, not request `Host`. (`AuthController.forgotPassword:316`) |
| 2. Predictable/weak reset token | **Mitigated** | `crypto.randomBytes(32).toString('hex')` (256 bits), 1-hour expiry, single-use, prior tokens revoked. (`AuthController.forgotPassword:298–314`, `resetPassword:326–355`) |
| 3. Email change without re-auth | **N/A** | No self-service email-change endpoint exists; `updateProfile` does not accept `email`. |
| 4. OAuth/SAML/social account-link CSRF | **N/A** | No OAuth/SAML/social-login flows found. |
| 5. MFA bypass at sensitive endpoints | **Mitigated** | Login, password change, and 2FA disable all require TOTP when 2FA is enabled. (`AuthController.login:123`, `UserProfileController.updatePassword:67–80`, `AuthController.disable2fa:485–504`) |
| 6. JWT algorithm manipulation / weak secrets | **Mitigated** | Access and refresh tokens are signed/verified with pinned `HS256` only; production start-up rejects default secrets. (`middleware/auth.ts:30–32`, `config/env.ts:91–102`) |
| 7. Password change without step-up | **Mitigated** | Requires current password and TOTP (if enabled); revokes all sessions/tokens and clears cookies. (`UserProfileController.updatePassword:54–99`) |
| 8. Session fixation / insufficient invalidation | **Partial** | Tokens are issued fresh on login and rotated on refresh; `logoutAll` revokes tokens and sessions. Reset and password change also revoke all sessions. However, refresh-token reuse is not treated as a compromise signal (Finding AM). |
| 9. Admin secret-login backdoor | **Acknowledged** | Already tracked as Finding N. When `ALLOW_ADMIN_SECRET_LOGIN=true`, `/admin/login` bypasses password and 2FA. |
| 10. Subdomain takeover at redirect URI | **N/A** | No OAuth/SAML redirect flow. |

**Conclusion:** The core ATO surface is well-controlled for M3. The only material gaps are defense-in-depth: adding refresh-token reuse detection (AM) and converting email verification to POST (AN).
