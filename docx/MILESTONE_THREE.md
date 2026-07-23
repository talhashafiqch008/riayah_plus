# Milestone 3 — Care Planning, Scheduling & Care Delivery

**Status:** 🔴 In progress — backend partially built; frontend not started  
**Budget:** $700  
**Timeline:** Weeks 3–4  
**Last updated:** 2026-07-23  
**Proposal ref:** `Riayah_Plus_Proposal_v2.pdf` § Milestone 3 + approved AI addition

---

## What M3 Delivers

> "The operational heart of the platform."

| Deliverable | Description |
|---|---|
| Care Plan Builder | Coordinator builds structured plan (Goals + Services) inside a Care Episode |
| Care Plan Approval Workflow | Coordinator submits → family reviews → Approve / Request Changes / Reject |
| Staff Scheduling & Availability Engine | Recurring availability, slot-based booking, conflict detection |
| Care Delivery Workflows | Support worker task checklists, evidence upload, shift tracking |
| Clinical Documentation | Immutable versioned clinical notes per session / episode |
| Goal & Progress Tracking | Goals linked to Care Plan, trackable status |
| AI Intake Summary *(approved addition)* | Call Riayah AI service after intake review; store result in `AiIntakeSummary` |
| AI Care Plan Draft *(approved addition)* | Call Riayah AI service to draft care plan; receive result via callback |

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

All M3 models are defined in `server/prisma/schema.prisma`. **Migration has been run for all models except `AiIntakeSummary`** (see §4 for pending migration).

#### `CarePlan` (line 777)
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

#### `CarePlanItem` (line 808)
```
id, carePlanId
serviceType, frequency, duration
unitCost (Decimal), currency (default "QAR")
assignedRole, notes
```

#### `Goal` (line 825)
```
id, carePlanId, userId
title, description
tier (default "short_term"), category (default "functional")
measurableOutcome, targetDate, measurement
status (GoalStatus enum)
notes, achievedAt
tasks Task[]     ← relation exists but conversion on plan approval is NOT implemented
```

#### `CarePlanApprovalLog` (line 851)
```
id, carePlanId, action, actorId, notes, createdAt
```

#### `ClinicalNote` (line 912)
```
id
sessionId? → Session
episodeId? → CareEpisode
authorId → User
content, noteType (default "session_note")
isPrivate (Boolean)
```

#### `Session` (line 867) — also covers telehealth (M4)
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

#### `ProviderAvailabilitySlot` (line 1392)
```
id, providerId
dayOfWeek (Int 0–6), startTime, endTime
isAvailable (Boolean)
```

#### `Shift` (line 1296)
```
id, workerId, bookingId?
status (ShiftStatus), startedAt, endedAt
breakStartAt, breakEndAt
tasks Task[]
```

#### `Task` (line 1316)
```
id, title, description
assigneeId, assignerId
shiftId?, goalId?
status, dueAt
```

#### `AiIntakeSummary` (line 721) — schema only, **migration pending**
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

Guard function: `assertCarePlanTransition(from, to)` — throws `AppError(400)` on invalid transition.

---

### 1.4 API Routes (all live and authenticated)

**Base:** `server/src/routes/index.ts` mounts all routes below under `/api`.

#### Care Plans — `server/src/routes/carePlan.routes.ts`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/care-plans` | Any | List plans (family scoped to own episodes; staff scoped to org) |
| POST | `/care-plans` | Coordinator only | Create plan (draft) |
| GET | `/care-plans/:id` | Any | Get plan with goals, items, approval logs |
| PATCH | `/care-plans/:id` | Coordinator only | Update → creates new version, marks old as not-current |
| DELETE | `/care-plans/:id` | Coordinator only | Delete plan |
| POST | `/care-plans/:id/submit` | Coordinator only | Submit for family approval → notifies family |
| POST | `/care-plans/:id/approve` | Family / patient | Approve → episode status → `active` |
| POST | `/care-plans/:id/request-revision` | Family / patient | Request changes with notes → notifies coordinator |
| GET | `/care-plans/:id/items` | Any | List service items |
| POST | `/care-plans/:id/items` | Coordinator only | Add service item |
| PATCH | `/care-plans/:id/items/:itemId` | Coordinator only | Edit service item |
| DELETE | `/care-plans/:id/items/:itemId` | Coordinator only | Remove service item |

**Controller:** `server/src/controllers/carePlans/CarePlanController.ts`

---

#### Shifts & Tasks — `server/src/routes/shift.routes.ts`

| Method | Path | Description |
|---|---|---|
| POST | `/shifts/start` | Worker starts shift (linked to optional booking) |
| POST | `/shifts/:id/end` | End shift |
| GET | `/shifts/active` | Get active shift with tasks |
| GET | `/shifts/history` | Past 50 shifts |
| POST | `/shifts/:id/break/start` | Start break |
| POST | `/shifts/:id/break/end` | End break |
| GET | `/shifts/tasks` | Worker's tasks |
| POST | `/shifts/tasks` | Create task |
| PATCH | `/shifts/tasks/:id` | Update task |
| DELETE | `/shifts/tasks/:id` | Delete task |

**Tasks (standalone) — `server/src/routes/tasks.routes.ts`**

| Method | Path | Description |
|---|---|---|
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Remove task |
| PATCH | `/tasks/:id/status` | Update task status only |

**Controller:** `server/src/controllers/TaskController.ts`

---

#### AI Routes — `server/src/routes/ai.routes.ts` (mounted at `/ai`)

Currently contains: Gemini public chat, authenticated chat, AI sessions, AI Doctor. **The M3 AI integration endpoints (RiayahAI callbacks) are NOT yet added here.**

---

### 1.5 What Is Fully Wired (Summary)

| Feature | Backend Status |
|---|---|
| Care plan CRUD | ✅ Done |
| Plan versioning (edit creates new version) | ✅ Done |
| Submit for family approval + notification | ✅ Done |
| Family approve → episode goes `active` | ✅ Done |
| Family request revision + notification to coordinator | ✅ Done |
| Approval log trail | ✅ Done |
| Tenant/org scoping on all plan routes | ✅ Done |
| Shift start / end / break | ✅ Done |
| Task CRUD + status update | ✅ Done |
| Goal model (schema) | ✅ Done |
| ClinicalNote model (schema) | ✅ Done |
| ProviderAvailabilitySlot model (schema) | ✅ Done |
| AiIntakeSummary model (schema) | ✅ Done (migration pending) |
| Care plan state machine guard | ✅ Done |

---

## 2. What Is Missing on the Backend ❌

These need to be built before frontend can consume them.

| Gap | Detail |
|---|---|
| **AiIntakeSummary migration** | Run `npx prisma migrate dev --name ai_intake_summary` — table does not exist in DB yet |
| **AI Intake Summary integration** | After episode creation in `IntakeController.review` (line 642), call `POST /v1/intake/{episode.id}/summarize` on RiayahAI service, store result in `AiIntakeSummary` |
| **AI callback endpoint** | Add `POST /ai/callbacks/care-plan-draft` inside `ai.routes.ts` — must be idempotent (check existing record before write) |
| **AI Care Plan draft trigger** | After care plan creation or on coordinator action, call `POST /v1/careplan/{episode_id}/draft` with `X-API-Key: local-dev-key-12345` |
| **Goal → Task conversion on approval** | `CarePlanController.approve` must create a `Task` per `Goal` when plan is approved (the schema relation exists, the logic does not) |
| **Clinical notes routes** | No controller or routes for `ClinicalNote` — needs `GET/POST /clinical-notes` scoped to episode/session |
| **Staff scheduling engine** | No slot-booking, conflict detection, or recurring appointment generation routes. `ProviderAvailabilitySlot` has CRUD schema but no coordinator-facing booking flow |
| **Goal CRUD routes** | No routes to create / update / read goals independently (only created inline when plan is created) |
| **Reusable plan templates** | No `CarePlanTemplate` model or routes |
| **Clinical co-sign endpoint** | Proposal requires clinical staff to co-sign care plans within their scope — not implemented |
| **Re-approval gate on active plan edits** | `PATCH /care-plans/:id` on an `active` plan should enforce re-approval — currently it creates a new version without the gate |

---

## 3. Frontend — Not Built ❌

**No M3 UI exists.** The only file that mentions care plans in a non-demo page is `client/src/pages/careseeker/CarePlansPage.tsx` — this is a **subscription pricing selector** (Basic/Standard/Premium tiers), not a clinical care plan builder. It has nothing to do with M3.

Care plan API calls in `client/src/lib/api/careseeker.ts` are **commented out**.

### Pages that need to be created

#### Coordinator Portal

| Page | Path | Description |
|---|---|---|
| Care Plan Builder | `/coordinator/episodes/:id/care-plan/new` | Create plan with goals and service items |
| Care Plan Editor | `/coordinator/care-plans/:id/edit` | Edit draft / revision-requested plan (new version) |
| Care Plan Detail | `/coordinator/care-plans/:id` | View plan, goals, items, approval log, AI summary |
| Goal Manager | Embedded in builder | Add / edit / remove goals per plan |
| Staff Schedule | `/coordinator/schedule` | View and assign staff availability slots |

#### Family Portal

| Page | Path | Description |
|---|---|---|
| Care Plan Review | `/family/care-plan/:id` | Read goals, services, cost breakdown — Approve / Request Changes |
| Care Journey Milestones | `/family/care-journey` | Simple milestone timeline (R5 from M2 revision) |

#### Clinical Staff Portal

| Page | Path | Description |
|---|---|---|
| Clinical Notes | `/clinical/episodes/:id/notes` | Add / view immutable session notes |
| Care Plan View | `/clinical/care-plan/:id` | Read-only + co-sign capability |

#### Support Worker Portal

| Page | Path | Description |
|---|---|---|
| Daily Schedule | `/staff/schedule` | View assigned sessions for the day |
| Active Shift | `/staff/shift` | Start shift, task checklist, evidence upload, end shift |
| Task Completion | Embedded in shift | Complete tasks, add notes, upload photos |

---

## 4. AI Integration — RiayahAI Service (Approved as Part of M3)

**Staging URL:** `https://ca-riayah-ai-staging.yellowcoast-06b87bcc.uaenorth.azurecontainerapps.io`  
**API Key:** `X-API-Key: local-dev-key-12345`  
**Repo:** `Benaa-AI/raiyah-plus-ai-service` (Postman workspace available)

### 4.1 AI Intake Summary

**Endpoint:** `POST /v1/intake/{episode_id}/summarize`

**Where to integrate:** `server/src/controllers/patients/IntakeController.ts` → `review` method, after the Prisma transaction at line ~685 (episode is created by this point).

**What it returns (maps to `AiIntakeSummary`):**
```
keyConcerns[], urgencyIndicators[], suggestedServiceCategories[]
flaggedRiskFactors (JSON), clinicalImpressions, confidence
model, promptTokens, completionTokens, totalTokens
```

**Implementation notes:**
- Call after the transaction commits so the episode ID exists
- Fire non-blocking (do not fail the review if the AI call fails — wrap in try/catch, log error)
- Use `upsert` on `AiIntakeSummary` keyed by `careEpisodeId` to handle retries
- Set initial `status: 'draft'` — coordinator approves the summary before it is acted on
- **Run migration first:** `npx prisma migrate dev --name ai_intake_summary`

### 4.2 AI Care Plan Draft

**Endpoint:** `POST /v1/careplan/{episode_id}/draft`  
**Required header:** `X-API-Key: local-dev-key-12345`

**Callback:** The AI service calls back to `POST /ai/callbacks/care-plan-draft` on our server.

**What to build:**
1. Trigger: coordinator action (button in builder UI or auto-trigger on plan creation)
2. New route in `ai.routes.ts`: `router.post('/callbacks/care-plan-draft', ...)` — no auth required (validated by payload signature or API key check)
3. Handler must be **idempotent** — check if a draft already exists for that episode before writing
4. Store draft content → `CarePlan` with `status: 'draft'` and `coordinatorId` set to the requesting user
5. Notify coordinator via `NotificationService` that the draft is ready

---

## 5. Build Order (Recommended)

### Phase 1 — Backend gaps (unblock frontend)

1. Run `npx prisma migrate dev --name ai_intake_summary`
2. Add clinical notes routes (`GET/POST /clinical-notes`)
3. Add goal CRUD routes (`GET/POST/PATCH/DELETE /goals`)
4. Fix `CarePlanController.approve` → convert goals to tasks
5. Add AI intake summary call to `IntakeController.review`
6. Add `POST /ai/callbacks/care-plan-draft` to `ai.routes.ts`

### Phase 2 — Coordinator frontend

1. Care Plan Builder page (goals + service items form)
2. Care Plan Detail / Approval Log view
3. Staff scheduling / availability view

### Phase 3 — Family frontend

1. Care Plan review page (Approve / Request Changes / Reject)
2. Care Journey milestone timeline

### Phase 4 — Staff / Clinical frontend

1. Clinical notes page
2. Support worker shift + task workflow

### Phase 5 — AI frontend surface

1. Show AI intake summary on coordinator intake detail (inline panel)
2. "Generate AI Draft" button in coordinator care plan builder
3. Coordinator approval step for AI-generated content before it goes active

---

## 6. Key Files Reference

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` (line 777+) | All M3 models |
| `server/src/controllers/carePlans/CarePlanController.ts` | Full care plan CRUD + approval workflow |
| `server/src/routes/carePlan.routes.ts` | Care plan REST routes + item sub-routes |
| `server/src/routes/shift.routes.ts` | Worker shift + task routes |
| `server/src/routes/tasks.routes.ts` | Standalone task CRUD |
| `server/src/routes/ai.routes.ts` | AI routes (callback to be added here) |
| `server/src/controllers/patients/IntakeController.ts` (line 593) | `review` method — AI intake call goes here |
| `server/src/utils/stateMachine.ts` | Care plan + episode state machine |
| `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx` | Only coordinator page currently built |
| `client/src/lib/api/careseeker.ts` | Care plan API calls (commented out — need wiring) |

---

## 7. Out of Scope for M3

Per signed proposal — do not pull into this milestone:

| Feature | Milestone |
|---|---|
| Telehealth video sessions | M4 |
| Qatari bank payment gateway | M4 |
| Invoice / quotation generation | M4 |
| Secure messaging hub | M4 |
| React Native mobile app | M5 |
| GPS geofencing and worker check-in | M5 |
| Admin analytics dashboards | M5 |

---

## 8. Pass / Fail Checklist

| # | Check | Pass | Fail |
|---|---|---|---|
| CP1 | Coordinator can create care plan with goals and service items | | |
| CP2 | Editing a plan creates a new version; old version marked not-current | | |
| CP3 | Coordinator submits plan → family receives in-app notification | | |
| CP4 | Family can approve care plan → episode status changes to `active` | | |
| CP5 | Family can request revision with comments → coordinator notified | | |
| CP6 | Approved plan goals are converted to trackable tasks | | |
| CP7 | Active plan edit requires re-approval before going active again | | |
| SCH1 | Staff availability slots are viewable by coordinator | | |
| SCH2 | Coordinator can assign staff to sessions (conflict detection) | | |
| DEL1 | Support worker can start shift and see task list | | |
| DEL2 | Support worker can complete tasks and upload evidence | | |
| NOTE1 | Clinical staff can add session notes (immutable after save) | | |
| NOTE2 | Notes are visible on episode detail for coordinator | | |
| GOAL1 | Goals display with status; can be marked achieved | | |
| AI1 | After coordinator review, AI intake summary is stored in `ai_intake_summaries` table | | |
| AI2 | Coordinator can see AI summary on intake / episode detail | | |
| AI3 | AI care plan draft is triggered and callback is handled idempotently | | |
| AI4 | Coordinator must approve AI-generated content before it goes active | | |
| REG | M2 flows still work: intake → coordinator review → episode → assessment | | |
