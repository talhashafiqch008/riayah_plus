# Milestone 3 — Care Planning, Scheduling & Care Delivery (+ AI Integration)

**Status:** 🔴 Ready to start — core backend partially built; M3 UI not started; AI service ready on staging (integration pending)  
**Budget (signed):** $700  
**Timeline:** Weeks 3–4  
**Last updated:** 2026-07-23  
**Sources:** `Riayah_Plus_Proposal_v2.pdf` § Milestone 3 · §5.2 Excluded · Momen Walied staging handoff · this codebase audit

---

## How to read this doc

Use this as the **single working brief** before coding. It answers:

1. What the **signed proposal** requires for M3  
2. What **AI work** we are adding in M3 (integration only — Momen owns the models)  
3. What already exists vs what is still missing in **this** repo  
4. Exact integration contract + recommended build order + pass/fail checks  

---

## Scope decision (important)

### Signed proposal (v2)

Milestone 3 deliverables (unchanged):

- Structured care plan builder + version control  
- Family care plan approval / rejection workflow  
- Staff availability + slot-based scheduling + conflict detection  
- In-person care delivery task workflows  
- Structured clinical documentation (immutable history)  
- Goal and progress tracking linked to Care Plan  

**§5.2 Excluded from scope (signed):**

> AI/LLM-based intake summarisation, care plan drafting, or risk detection — removed from this version  

Revision note on the cover also says this version **removes all AI-assisted modules**.

### Client direction for this sprint (M3 addition)

Momen’s Riayah AI service is **deployed to staging** and ready for integration. Our job is **not** to build the AI models — we **integrate** their endpoints into our Express/Prisma app and surface results for human approval.

| Track | Owner | In M3? |
|---|---|---|
| Core M3 (care plans, scheduling, delivery, clinical notes, goals) | Us | ✅ Required (signed) |
| AI service (LLM summarize / draft) | Momen / `Benaa-AI/raiyah-plus-ai-service` | ✅ They ship it |
| AI integration (HTTP client, DB store, callback, UI approval) | Us | ✅ **Client-directed addition for M3** |

Treat AI as a **parallel integration track** inside M3, not a replacement for signed care-delivery work. Do not ship demo coordinator mock-AI UI as product.

---

## What M3 Delivers

> "The operational heart of the platform."

| Deliverable | Description | Source |
|---|---|---|
| Care Plan Builder | Coordinator builds structured plan (Goals + Services) inside a Care Episode | Signed |
| Care Plan Approval Workflow | Coordinator submits → family reviews → Approve / Request Changes / Reject | Signed |
| Staff Scheduling & Availability Engine | Recurring availability, slot-based booking, conflict detection | Signed |
| Care Delivery Workflows | Support worker task checklists, evidence upload, shift tracking | Signed |
| Clinical Documentation | Immutable versioned clinical notes per session / episode | Signed |
| Goal & Progress Tracking | Goals linked to Care Plan; convert to tasks on approval | Signed |
| AI Intake Summary | Call Riayah AI after intake review (+ episode create); store in `AiIntakeSummary` | Client + Momen |
| AI Care Plan Draft | Trigger draft on AI service; receive idempotent callback; coordinator reviews | Client + Momen |

---

## Test Credentials

```
All passwords: Password123!
```

| Role | Email | Primary Path |
|---|---|---|
| Care Coordinator | `coordinator@riayahplus.com` | `/coordinator` |
| Clinical Staff | `clinical@demo.com` | `/clinical/schedule` |
| Family | `family@demo.com` | `/family` |
| Support Worker | *(create in admin)* | `/staff` |

Server: `http://localhost:5001`  
Client: `http://localhost:5173`

```bash
cd server && npm run dev
cd client && npm run dev
```

---

## 1. What Exists on the Backend ✅

### 1.1 Database Schema (Prisma)

M3 clinical models live in `server/prisma/schema.prisma`. Most tables are already migrated. **`AiIntakeSummary` is schema-only — table does not exist in the DB yet** (verified 2026-07-23: `ai_intake_summaries` → missing).

#### `CarePlan` (~line 777)
```
id, episodeId, coordinatorId
version (Int, default 1)
status (CarePlanStatus enum — see below)
title, notes
submittedAt, approvedAt, approvedById, rejectionNotes
isCurrentVersion (Boolean)
previousVersionId → self-relation for version chain
goals Goal[]
items CarePlanItem[]
approvalLogs CarePlanApprovalLog[]
```

#### `CarePlanItem` (~line 808)
```
id, carePlanId
serviceType, frequency, duration
unitCost (Decimal), currency (default "QAR")
assignedRole, notes
```

#### `Goal` (~line 825)
```
id, carePlanId, userId
title, description
tier (default "short_term"), category (default "functional")
measurableOutcome, targetDate, measurement
status (GoalStatus enum)
notes, achievedAt
tasks Task[]     ← relation exists; conversion on plan approval is NOT implemented
```

#### `CarePlanApprovalLog` (~line 851)
```
id, carePlanId, action, actorId, notes, createdAt
```

#### `ClinicalNote` (~line 912)
```
id
sessionId? → Session
episodeId? → CareEpisode
authorId → User
content, noteType (default "session_note")
isPrivate (Boolean)
```

#### `Session` (~line 867) — also covers telehealth (M4)
```
id, episodeId, providerId, clientId
type (SessionType), status (BookingStatus)
scheduledAt, startedAt, completedAt, durationMinutes
notes, recordingUrl, livekitRoomId, dailyRoomUrl
GPS fields: latitude, longitude, checkInAt, checkOutAt, checkInLat/Lng, checkOutLat/Lng
isGeofenced, geofenceStatus
clinicalNotes ClinicalNote[]
invoice Invoice?, payment Payment?, gpsLogs GpsLog[]
```

#### `ProviderAvailabilitySlot` (~line 1392)
```
id, providerId
dayOfWeek (Int 0–6), startTime, endTime
isAvailable (Boolean)
```

#### `Shift` / `Task` (~lines 1296 / 1316)
Shift start/end/break + Task CRUD exist as routes. Goal→Task link on care-plan approve does **not**.

#### `AiIntakeSummary` (~line 721) — **schema only; migration required**
```
id, careEpisodeId @unique
model, promptTokens, completionTokens, totalTokens
keyConcerns[], urgencyIndicators[], suggestedServiceCategories[]
flaggedRiskFactors (Json?), clinicalImpressions?, confidence?
status (default "draft")
approvedById?, approvedAt?
```

---

### 1.2 Enums

```prisma
enum CarePlanStatus {
  draft
  submitted_for_approval
  approved
  active
  revision_requested
  rejected
  completed
}

enum GoalStatus {
  active
  achieved
  paused
  cancelled
}
```

---

### 1.3 State Machine

File: `server/src/utils/stateMachine.ts`

**Care Plan transitions:**

```
draft              → submitted_for_approval | rejected
submitted_for_approval → approved | revision_requested | rejected
revision_requested → draft | submitted_for_approval
approved           → active | completed
active             → revision_requested | completed
rejected           → draft
completed          → (terminal)
```

Guard: `assertCarePlanTransition(from, to)` — throws `AppError(400)` on invalid transition.

**Gap:** Family “Reject” is in the proposal and enum, but there is **no** `POST /care-plans/:id/reject` handler today (only approve + request-revision).

---

### 1.4 API Routes (live)

**Base:** `server/src/routes/index.ts` mounts under `/api` (AI routes under `/ai`).

#### Care Plans — `server/src/routes/carePlan.routes.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/care-plans` | Any | List plans (family scoped to own episodes; staff scoped to org) |
| POST | `/care-plans` | Coordinator | Create plan (draft) |
| GET | `/care-plans/:id` | Any | Get plan with goals, items, approval logs |
| PATCH | `/care-plans/:id` | Coordinator | Update → new version, old marked not-current |
| DELETE | `/care-plans/:id` | Coordinator | Delete plan |
| POST | `/care-plans/:id/submit` | Coordinator | Submit for family approval → notifies family |
| POST | `/care-plans/:id/approve` | Family / patient | Approve → episode `active` (**does not** create tasks from goals) |
| POST | `/care-plans/:id/request-revision` | Family / patient | Request changes → notifies coordinator |
| GET/POST/PATCH/DELETE | `/care-plans/:id/items…` | Coordinator (write) | Service items |

**Controller:** `server/src/controllers/carePlans/CarePlanController.ts`

#### Shifts & Tasks — `shift.routes.ts` + `tasks.routes.ts`

Worker shift start/end/break and task CRUD are live.

#### AI routes today — `server/src/routes/ai.routes.ts`

Contains Gemini public/authenticated chat, AI sessions, AI Doctor.  
**Does not** contain Riayah AI callbacks (`/ai/callbacks/care-plan-draft`).

#### Env already prepared

```ts
// server/src/config/env.ts
AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8001'
AI_SERVICE_API_KEY: process.env.AI_SERVICE_API_KEY || ''
```

Also documented in `server/.env.example`. Point these at staging for integration (see §4).

---

### 1.5 Backend wiring summary

| Feature | Backend Status |
|---|---|
| Care plan CRUD | ✅ Done |
| Plan versioning (edit → new version) | ✅ Done |
| Submit for family approval + notification | ✅ Done |
| Family approve → episode `active` | ✅ Done |
| Family request revision + notify coordinator | ✅ Done |
| Family reject endpoint | ❌ Missing |
| Approval log trail | ✅ Done |
| Tenant/org scoping on plan routes | ✅ Done |
| Shift start / end / break | ✅ Done |
| Task CRUD + status update | ✅ Done |
| Goal model (schema) | ✅ Done |
| Goal → Task on approve | ❌ Missing |
| ClinicalNote model (schema) | ✅ Done |
| Clinical notes HTTP API | ❌ Missing |
| ProviderAvailabilitySlot model | ✅ Done |
| Slot booking / conflict / recurring engine | ❌ Missing |
| AiIntakeSummary model (schema) | ✅ Done |
| `ai_intake_summaries` table in DB | ❌ Missing (migration pending) |
| Call Riayah AI summarize / draft | ❌ Missing |
| Care-plan-draft callback (idempotent) | ❌ Missing |
| Care plan state machine guard | ✅ Done |
| Re-approval gate when editing `active` plan | ❌ Incomplete (versioning without approval gate) |
| Clinical co-sign | ❌ Missing |
| Reusable plan templates | ❌ Missing (nice-to-have vs signed “templates” wording) |

---

## 2. What Is Missing on the Backend ❌

Build these before (or in parallel with) frontend work.

| Gap | Detail |
|---|---|
| **`AiIntakeSummary` migration** | Run `npx prisma migrate dev --name ai_intake_summary` — table confirmed absent |
| **AI Intake Summary integration** | After successful episode create in `IntakeController.review` (~line 668+), call `POST /v1/intake/{episode_id}/summarize`, upsert `AiIntakeSummary` |
| **AI callback endpoint** | `POST /ai/callbacks/care-plan-draft` — **idempotent** |
| **AI Care Plan draft trigger** | Coordinator action (preferred) or post-create hook → `POST /v1/careplan/{episode_id}/draft` with `X-API-Key` |
| **Goal → Task on approval** | `CarePlanController.approve` must create a `Task` per `Goal` |
| **Family reject** | `POST /care-plans/:id/reject` using existing state machine |
| **Clinical notes routes** | `GET/POST /clinical-notes` (and immutability rules) scoped to episode/session |
| **Staff scheduling engine** | Availability CRUD + slot booking + conflict detection + recurring generation |
| **Goal CRUD / progress** | Independent goal read/update (status → achieved, etc.) if not only nested under plan |
| **Clinical co-sign** | Endpoint for clinical staff within scope |
| **Re-approval on material change** | Editing an `active` plan must force re-approval before active again |
| **Reusable templates** | Goal/service templates for common episode types (proposal feature) |

---

## 3. Frontend — Not Built for M3 ❌

**No production M3 care-plan UI** exists in coordinator / family / clinical / staff shells. The table below clarifies what is present so it is not confused with finished work.

| Existing surface | Reality |
|---|---|
| `client/src/pages/careseeker/CarePlansPage.tsx` | Legacy careseeker page: calls `getCarePlans()` and renders a subscription tier pricing UI (Basic / Standard / Premium). **Not** the clinical builder or family approval flow. |
| `client/src/lib/api/careseeker.ts` | `getCarePlans` is live; `createCarePlan`, `updateCarePlan`, `deleteCarePlan` are commented out. |
| `/family/care-plans` route | Renders `RoleShellPlaceholder` with the message *"Family care-plan review and approval arrives in Milestone 3."* — placeholder only, no real UI. |
| `/coordinator/plans` route | Renders `RoleShellPlaceholder` with title "Care Plans" — placeholder only. |
| `/clinical/notes` route | Renders `RoleShellPlaceholder` with title "Session Notes" — placeholder only. |
| `/support/shifts` + `/support/tasks` routes | Both render `RoleShellPlaceholder` — placeholders only. |
| Demo coordinator pages (`/demo/coordinator/*`) | Mock data, no API calls. Contain reusable UI patterns. **See §3.1 for full audit and reuse guidance.** |

### Pages to build

#### Coordinator Portal

| Page | Path | Description |
|---|---|---|
| Care Plan Builder | `/coordinator/episodes/:id/care-plan/new` | Goals + service items; optional “Generate AI Draft” |
| Care Plan Editor | `/coordinator/care-plans/:id/edit` | Edit draft / revision-requested (new version) |
| Care Plan Detail | `/coordinator/care-plans/:id` | View plan, goals, items, approval log, AI summary |
| Staff Schedule | `/coordinator/schedule` | Availability + assignment |
| AI Intake Summary panel | On intake / episode detail | Show draft summary; coordinator approve |

#### Family Portal

| Page | Path | Description |
|---|---|---|
| Care Plan Review | `/family/care-plans/:id` (or `/family/care-plan/:id`) | Goals, services, cost — Approve / Request Changes / Reject |

#### Clinical Staff Portal

| Page | Path | Description |
|---|---|---|
| Clinical Notes | `/clinical/episodes/:id/notes` | Add / view immutable notes |
| Care Plan View | `/clinical/care-plans/:id` | Read-only + co-sign |

#### Support Worker Portal

| Page | Path | Description |
|---|---|---|
| Daily Schedule | `/staff/schedule` | Assigned sessions |
| Active Shift | `/staff/shift` | Start shift, tasks, evidence, end shift |

---

### 3.1 Legacy / Demo UI — Verified Present on This Branch ✅

A full audit was run on 2026-07-23 (milestone3 branch). The following files exist and all their dependencies resolve. **All demo pages use hardcoded mock data — none are wired to the real API.** They are valuable starting points for M3 UI, not finished product.

#### Demo coordinator pages — `client/src/pages/demo/coordinator/`

All 10 pages are registered in the router under `DemoCoordinatorLayout` (routes `/demo/coordinator/*`). They are lazy-loaded and auth-gated.

| File | Lines | M3 Relevance | What it has |
|---|---|---|---|
| `CareseekerPage.tsx` | 428 | **High** — family care plan flow | Active plan + task list, pending-approval banner with Approve / Request Changes buttons, plan list tab with progress bars, PDF export. Local state only — swap mock data for real API calls to wire it up. |
| `MonitoringPage.tsx` | 487 | Medium — task delivery tracking | Live task feed with animated progress, alerts, status badges. Useful reference for support worker shift view. |
| `WorkflowPage.tsx` | 345 | Low — visual reference | Diagram of the full care plan → task engine → approval flow. Role responsibility matrix. |
| `IntakePage.tsx` | 421 | Low — AI demo, not product | AI chat + intake extraction UI using mock data. Do not repurpose as the real AI summary panel. |
| `DashboardPage.tsx` | 675 | Low | Coordinator overview stats, mock KPIs |
| `BookingsPage.tsx` | 378 | Low | Booking list, mock data |
| `HelperPage.tsx` | 343 | Low | Helper/support worker assignment mock |
| `ProviderPage.tsx` | 404 | Low | Provider matching mock |
| `ReportingPage.tsx` | 643 | Low | Reports mock |
| `OrganizationPage.tsx` | 526 | Low | Org management mock |

#### Demo data / helpers — `client/src/demo/coordinator/`

All 6 files present and verified:

| File | What it contains |
|---|---|
| `types.ts` | `DemoPatient`, `DemoTask`, `DemoCarePlan`, `DemoProvider`, `DemoProgress` — type shapes closely mirror the real Prisma models |
| `data.ts` | `mockPatients`, `mockCarePlans`, `mockProviders`, `mockProgress` — rich sample data with tasks, goals, statuses, budgets |
| `components/shared.tsx` | `StatusBadge`, `StatCard`, `ProgressBar`, `ProgressRing`, `LoadingSkeleton`, `TabNav` — reusable presentational components |
| `components/notification-center.tsx` | Notification panel component |
| `tokens.ts` | Design tokens (colours, typography, shadows) used across all demo pages |
| `pdf-export.ts` | `exportCarePlanPDF`, `exportPatientProgress`, `exportCoordinatorReport` — client-side PDF helpers |

`DemoCarePlan` shape for reference:
```ts
{
  id, patientId, patientName, title
  clinicalBudget, dailyLivingBudget, equipmentBudget, totalBudget
  status: "draft" | "pending_approval" | "approved" | "active" | "completed"
  tasks: DemoTask[]     // category, frequency, role, status, assignedTo, dueDate, notes
  createdAt, approvedAt?, approvedBy?
}
```

#### Non-demo pages with M3-adjacent UI

| File | Lines | What it has | Status |
|---|---|---|---|
| `client/src/pages/provider/TasksPage.tsx` | 995 | Full task management UI for support/clinical workers — categories, priorities, vitals logging, evidence upload, shift-like workflow | **Not wired to API.** Uses role detection from `localStorage`. Good basis for real support worker shift page. |
| `client/src/pages/staff/TasksPage.tsx` | ~100 | Simple hardcoded task toggle list with priority badges | Minimal — replace entirely. |

#### What to reuse vs what to build fresh

| M3 Feature | Action |
|---|---|
| Family care plan review / approve / reject UI | **Adapt** `demo/coordinator/CareseekerPage.tsx` — replace `mockCarePlans` with real `GET /care-plans?episodeId=...`, wire Approve / Request Changes buttons to real endpoints |
| Support worker task + shift workflow | **Adapt** `provider/TasksPage.tsx` — wire to `GET /shifts/active`, `PATCH /shifts/tasks/:id`, `POST /shifts/start` |
| Shared UI atoms (badges, progress bars, tabs) | **Reuse** `demo/coordinator/components/shared.tsx` or extract into `/components/ui/` |
| Coordinator care plan builder | **Build fresh** — no legacy equivalent exists |
| Clinical notes page | **Build fresh** |
| Staff scheduling / availability | **Build fresh** |
| AI summary panel | **Build fresh** — `IntakePage.tsx` demo is a different concept (voice chat); do not repurpose |

---

## 4. AI Integration — Riayah AI Service (client-directed M3 addition)

**Ownership split**

| Piece | Who |
|---|---|
| Model hosting, `/v1/intake/.../summarize`, `/v1/careplan/.../draft` | Momen / AI repo |
| Calling those endpoints, storing results, callback handler, human-approval UX | **Us (this repo)** |
| Postman + staging access | Momen (already invited) |

**Staging base URL**  
`https://ca-riayah-ai-staging.yellowcoast-06b87bcc.uaenorth.azurecontainerapps.io`

**API key (dev/staging as provided)**  
`X-API-Key: local-dev-key-12345`

**Repo**  
`Benaa-AI/raiyah-plus-ai-service`

**Local / staging env (our server)**

```bash
AI_SERVICE_URL=https://ca-riayah-ai-staging.yellowcoast-06b87bcc.uaenorth.azurecontainerapps.io
AI_SERVICE_API_KEY=local-dev-key-12345
```

Prefer reading key/URL from `env` — never hardcode the key in controllers long-term. Rotate when Momen issues production keys.

### 4.1 AI Intake Summary

**Their endpoint:** `POST /v1/intake/{episode_id}/summarize`

**Integrate in:** `server/src/controllers/patients/IntakeController.ts` → `review`  
Hook **after** the Prisma transaction commits and an episode was created (`createEpisode: true`). Method starts ~line 668; episode create ~735+.

**Store in:** `AiIntakeSummary` (map response fields to schema).

**Rules:**

1. Run migration first so the table exists.  
2. Call only when an episode ID exists.  
3. **Non-blocking:** wrap in try/catch — intake review must succeed even if AI is down.  
4. Use **upsert** on `careEpisodeId` for retries.  
5. Persist `status: 'draft'` until a coordinator explicitly approves the summary.  
6. Log failures with episode id (no PHI in logs beyond what’s already allowed by audit policy).

### 4.2 AI Care Plan Draft

**Their endpoint:** `POST /v1/careplan/{episode_id}/draft`  
**Header:** `X-API-Key: <AI_SERVICE_API_KEY>`

**Their callback to us:** `POST /ai/callbacks/care-plan-draft`  
(Mount under existing AI router so full path matches what Momen configured — confirm exact public URL with them: likely `https://<our-api>/ai/callbacks/care-plan-draft`.)

**What we build:**

1. **Trigger** — coordinator button in builder (preferred over silent auto) so humans remain in control.  
2. **Callback route** — validate with shared secret / API key header; **idempotent** (same episode / same draft id → no duplicate CarePlans).  
3. **Persist** — create or update a `CarePlan` in `draft` (or a dedicated draft payload table if response shape doesn’t map cleanly — confirm against Postman).  
4. **Notify** coordinator via `NotificationService`.  
5. **UI** — coordinator must review/edit AI draft before submit-for-approval. AI content never goes straight to family.

### 4.3 GDPR / clinical safety (carry from M2)

- AI output is assistive — human approval required (Art. 22 posture).  
- Do not auto-activate AI care plans.  
- Prefer not to log full clinical prompt/response bodies in app logs.

---

## 5. Build Order (recommended)

Do **signed core** and **AI integration** in parallel where possible; do not block the whole milestone on AI if staging flakes.

### Phase A — Unblock data + critical backend gaps

1. `npx prisma migrate dev --name ai_intake_summary`  
2. Goal → Task conversion in `CarePlanController.approve`  
3. Family reject endpoint  
4. Clinical notes `GET/POST`  
5. Goal progress update (at least status → achieved)  
6. Re-approval gate for material edits to `active` plans  

### Phase B — AI integration (can start Day 1 alongside A)

1. Thin `RiayahAiClient` using `AI_SERVICE_URL` + `AI_SERVICE_API_KEY`  
2. Non-blocking summarize call from `IntakeController.review` + upsert `AiIntakeSummary`  
3. Idempotent `POST /ai/callbacks/care-plan-draft`  
4. Trigger endpoint/action for draft generation  
5. Smoke against staging + Postman with Momen if payloads differ  

### Phase C — Scheduling / delivery backend

1. Provider availability management API  
2. Slot booking + conflict detection  
3. Recurring appointment generation  
4. Wire evidence upload to shift/task flow if not already sufficient  

### Phase D — Coordinator frontend

1. Care Plan Builder / Editor / Detail  
2. AI summary panel + “Generate AI Draft”  
3. Schedule / assignment UI  

### Phase E — Family + Clinical + Staff frontend

1. Family review (Approve / Request Changes / Reject)  
2. Clinical notes + co-sign  
3. Support worker schedule + active shift  

### Phase F — Hardening

1. Regression: M2 intake → review → episode → assessment still green  
2. Pass/fail checklist below  
3. Confirm callback URL + secrets with Momen for staging/prod  

---

## 6. Key Files Reference

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` (~721 AiIntakeSummary, ~777 CarePlan) | M3 + AI models |
| `server/src/config/env.ts` | `AI_SERVICE_URL`, `AI_SERVICE_API_KEY` |
| `server/src/controllers/carePlans/CarePlanController.ts` | CRUD + approve (add goal→task) |
| `server/src/routes/carePlan.routes.ts` | Care plan REST |
| `server/src/routes/shift.routes.ts` / `tasks.routes.ts` | Delivery tasks |
| `server/src/routes/ai.routes.ts` | Add Riayah callback here |
| `server/src/controllers/patients/IntakeController.ts` (~668 `review`) | AI summarize hook after episode create |
| `server/src/utils/stateMachine.ts` | Care plan transitions |
| `client/src/pages/coordinator/*` | Build M3 coordinator UI here |
| `client/src/lib/api/careseeker.ts` | Partial care-plan client — prefer role-scoped API modules for M3 |

---

## 7. Out of Scope for M3

Per signed proposal — do **not** pull into this milestone:

| Feature | Milestone |
|---|---|
| Telehealth video sessions | M4 |
| Qatari bank payment gateway | M4 |
| Invoice / quotation generation | M4 |
| Secure messaging hub | M4 |
| React Native mobile app | M5 |
| GPS geofencing / worker check-in productization | M5 (schema fields may exist) |
| Admin analytics dashboards | M5 |
| Building / hosting the LLM service itself | Momen (not us) |

---

## 8. Pass / Fail Checklist

| # | Check | Pass | Fail |
|---|---|---|---|
| CP1 | Coordinator can create care plan with goals and service items | | |
| CP2 | Editing a plan creates a new version; old version marked not-current | | |
| CP3 | Coordinator submits plan → family receives in-app notification | | |
| CP4 | Family can approve care plan → episode status changes to `active` | | |
| CP5 | Family can request revision with comments → coordinator notified | | |
| CP6 | Family can reject a submitted plan | | |
| CP7 | Approved plan goals are converted to trackable tasks | | |
| CP8 | Material edit to active plan requires re-approval | | |
| SCH1 | Staff availability slots are manageable / viewable by coordinator | | |
| SCH2 | Coordinator can book/assign with conflict detection | | |
| DEL1 | Support worker can start shift and see task list | | |
| DEL2 | Support worker can complete tasks and upload evidence | | |
| NOTE1 | Clinical staff can add session notes (immutable after save) | | |
| NOTE2 | Notes visible on episode detail for coordinator | | |
| GOAL1 | Goals display with status; can be marked achieved | | |
| AI1 | After coordinator review + episode create, row exists in `ai_intake_summaries` | | |
| AI2 | Coordinator can see AI summary on intake / episode detail | | |
| AI3 | AI care plan draft triggered; callback handled **idempotently** | | |
| AI4 | Coordinator must approve/edit AI content before family submission | | |
| AI5 | Intake review still succeeds when AI service is down | | |
| REG | M2 flows still work: intake → coordinator review → episode → assessment | | |

---

## 9. Open questions (ask Momen / client early)

1. Exact **request/response JSON** for summarize + draft (use Postman; map to Prisma fields).  
2. Exact **callback payload** and auth (shared secret header vs signed body).  
3. Public URL of **our** callback they will call (staging API hostname).  
4. Whether draft callback creates a full `CarePlan` or returns structured goals/services for us to map.  
5. Commercial confirmation that AI integration is accepted inside M3 delivery (signed §5.2 excluded it; client+Momen directed it in).  

---

*End of M3 working brief — update this file when migrations land or when Momen’s contract differs from the staging note above.*
