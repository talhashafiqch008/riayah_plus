# Milestone 3 — Task Tracker

**Created:** 2026-07-23  
**Source of truth (scope/spec):** `docx/MILESTONE_THREE.md`  
**Proposal:** `docx/Riayah_Plus_Proposal_v2.pdf` § Milestone 3 (+ client-directed AI integration)  
**Overall status:** 🟡 In progress — Wave 1 partially complete, Wave 2 not started  
**Rule:** Check tasks off here as you finish them. Keep `MILESTONE_THREE.md` for *what/why*; use **this file** for *what to do next*.

---

## How to use this tracker

1. Work **Wave 0 → Wave 6** in order unless a task is marked **∥ Parallel**.  
2. Do not start a wave’s frontend until that wave’s **backend blockers** are ✅ (or explicitly stubbed).  
3. Update **Status** column: `⬜ Todo` → `🟡 Doing` → `✅ Done` → `🧪 Verified`.  
4. After each wave, tick the **Wave exit criteria**.  
5. Final ship gate = **§ Acceptance map** all green + **REG** (M2 regression).

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🟡 Doing | In progress |
| ✅ Done | Code complete |
| 🧪 Verified | Smoke / checklist pass |
| ⏸ Blocked | Waiting on dependency / Momen / decision |
| ⏭ Skip | Out of scope or deferred with note |

---

## Progress snapshot

| Wave | Focus | Status | Est. order |
|---|---|---|---|
| **0** | Kickoff / env / Momen contract | 🟡 | **Do first** |
| **1** | Care-plan backend gaps (signed core) | 🟡 | **Current** |
| **2** | AI integration backend ∥ with Wave 1 | ⬜ | **∥ Parallel** Day 1 |
| **3** | Clinical notes + goals + co-sign API | ⬜ | After Wave 1 core |
| **4** | Scheduling + delivery backend | ⬜ | After Wave 1–3 APIs usable |
| **5** | Frontend (coordinator → family → clinical → support) | ⬜ | After matching APIs |
| **6** | Hardening, regression, acceptance | ⬜ | **Last** before client demo |

## Latest verified progress

- `M3-0.2` completed: `AI_SERVICE_URL` + `AI_SERVICE_API_KEY` added to `server/.env`
- `M3-1.1` completed: `ai_intake_summaries` migration run
- `M3-1.2` completed + API-smoke verified: approving a submitted care plan now creates one `Task` per `Goal`
- `M3-1.3` completed + API-smoke verified: `POST /api/care-plans/:id/reject` works for family/patient
- Demo auth issue fixed: seeded users now set **both** `isEmailVerified: true` and `emailVerifiedAt`, so demo logins work after seed
- Fresh seed note: there may be no family-visible care plans by default; for smoke tests, a coordinator may need to create + submit a plan first

**Last verified API smoke:**

- Family reject returned `Care plan rejected.`
- Family approve returned `Care plan approved.`
- Coordinator task list showed **2 pending tasks** created from the 2 approved goals

**Current next coding task:**

1. `M3-1.4` — re-approval gate when editing an active plan  
2. `M3-2.1`–`M3-2.3` — Riayah AI client + intake summarize + callback  
3. Then Wave 3 APIs (clinical notes / goals / co-sign)

**Suggested first three coding tasks (original start order):**

1. `M3-0.2` + `M3-1.1` — env + `ai_intake_summaries` migration  
2. `M3-1.2` — Goal → Task on care-plan approve  
3. `M3-1.3` — Family reject endpoint  

Then immediately spin **∥** `M3-2.1`–`M3-2.3` (Riayah AI client + summarize + callback).

---

## Dependency map (read once)

```
Wave 0 (env / Postman / callback URL)
    │
    ├──────────────────────┐
    ▼                      ▼
Wave 1 Care-plan API     Wave 2 AI backend (∥)
    │                      │
    ▼                      │
Wave 3 Notes / Goals / Co-sign
    │                      │
    ▼                      ▼
Wave 4 Scheduling / Delivery API
    │
    ▼
Wave 5 Frontend
    Coordinator (needs Wave 1 + 2 + schedule bits of 4)
    Family (needs Wave 1 reject + approve)
    Clinical (needs Wave 3)
    Support (needs Wave 4 delivery + existing shifts)
    │
    ▼
Wave 6 Acceptance + REG
```

---

## Wave 0 — Kickoff (do first)

**Goal:** Unblock coding; no feature work without env + AI contract clarity.

| ID | Task | Depends on | Status | Notes |
|---|---|---|---|---|
| **M3-0.1** | Re-read `MILESTONE_THREE.md` § Scope + §4 AI; confirm AI is in-scope for this sprint | — | ⬜ | Client-directed addition; Momen owns models |
| **M3-0.2** | Set local `AI_SERVICE_URL` + `AI_SERVICE_API_KEY` in `server/.env` (staging values from brief) | — | ✅ | Done locally |
| **M3-0.3** | Confirm Postman collection / sample payloads with Momen (summarize + draft + callback) | M3-0.1 | ⬜ | Open Qs §9 in brief |
| **M3-0.4** | Confirm our public callback URL Momen will call (`POST /ai/callbacks/care-plan-draft`) | M3-0.3 | ⬜ | Staging API hostname |
| **M3-0.5** | Create role-scoped client API module skeleton (e.g. `client/src/lib/api/carePlans.ts`) — prefer over extending careseeker | — | ⬜ | Can be empty exports first |

**Wave 0 exit**

- [ ] Staging AI reachable with API key  
- [ ] Callback URL agreed (or documented assumption)  
- [ ] Ready to migrate + code  

---

## Wave 1 — Care-plan backend gaps (signed core) — do next

**Goal:** Complete approval workflow the proposal already assumes. Most CRUD already exists.

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M3-1.1** | Run Prisma migration for `AiIntakeSummary` → table `ai_intake_summaries` | `server/prisma` | AI1 | ✅ | Migration run by user |
| **M3-1.2** | On `CarePlanController.approve`: create one `Task` per `Goal` (link `goalId`) | `CarePlanController.ts` | CP7 | 🧪 Verified | API smoke passed; 2 approved goals created 2 pending tasks |
| **M3-1.3** | Add `POST /care-plans/:id/reject` (family/patient); use state machine + approval log + notify coordinator | `carePlan.routes.ts` + controller | CP6 | 🧪 Verified | API smoke passed; family reject returned success |
| **M3-1.4** | Re-approval gate: material edit of `active` plan forces re-approval path (version + status) | `CarePlanController` update/submit | CP8 | ⬜ | Versioning exists; gate incomplete |
| **M3-1.5** | Smoke existing flow: create → items/goals → submit → approve / request-revision | API | CP1–CP5 | 🟡 Partial | Approve + reject verified; request-revision + full regression still pending |

**Wave 1 exit**

- [x] Reject works  
- [x] Approve creates tasks from goals  
- [ ] Active-plan edit requires re-approval  
- [x] `ai_intake_summaries` exists (even if empty)  

---

## Wave 2 — AI integration backend ∥ Parallel with Wave 1

**Goal:** Integrate Momen’s staging service. Non-blocking on intake. Human approval required.

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M3-2.1** | Build thin `RiayahAiClient` (`summarizeIntake`, `requestCarePlanDraft`) using `env.AI_SERVICE_*` | `server/src/services/` | — | ⬜ | Header `X-API-Key` |
| **M3-2.2** | After `IntakeController.review` commits + episode created: call summarize; **upsert** `AiIntakeSummary`; `status: draft` | `IntakeController.ts` ~668+ | AI1, AI5 | ⬜ | try/catch — never fail review if AI down |
| **M3-2.3** | Add idempotent `POST /ai/callbacks/care-plan-draft` (validate API key/secret; no duplicate drafts) | `ai.routes.ts` + handler | AI3 | ⬜ | Confirm payload via Postman |
| **M3-2.4** | Add authenticated trigger: coordinator requests draft → `POST /v1/careplan/{episode_id}/draft` | route + controller | AI3 | ⬜ | Prefer explicit button, not silent auto |
| **M3-2.5** | On callback success: persist draft `CarePlan` (or map goals/services) + `NotificationService` to coordinator | callback handler | AI3, AI4 | ⬜ | Never auto-submit to family |
| **M3-2.6** | Coordinator API to approve AI intake summary (`draft` → approved) | new endpoint or PATCH | AI2, AI4 | ⬜ | Art. 22 / human-in-loop |
| **M3-2.7** | Staging smoke: summarize + draft + duplicate callback | staging | AI1–AI5 | ⬜ | With Momen if shapes differ |

**Wave 2 exit**

- [ ] Intake review succeeds when AI is down  
- [ ] Summary row stored after episode create  
- [ ] Callback idempotent  
- [ ] AI draft never reaches family without coordinator edit/submit  

---

## Wave 3 — Clinical notes, goals, co-sign API

**Goal:** Documentation + goal progress APIs the UI will need.

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M3-3.1** | `GET/POST /clinical-notes` scoped to episode and/or session; org/tenant guards | new routes + controller | NOTE1, NOTE2 | ⬜ | Model exists; HTTP missing |
| **M3-3.2** | Immutability: no update/delete of saved notes (or append-only versions if required by product) | same | NOTE1 | ⬜ | Proposal: immutable history |
| **M3-3.3** | Goal progress: at least `PATCH` status → `achieved` (+ `achievedAt`) | goals routes or nested under care-plans | GOAL1 | ⬜ | May create under plan if nested is enough |
| **M3-3.4** | Clinical co-sign endpoint for care plans within scope | care-plan routes | — | ⬜ | Proposal requirement |
| **M3-3.5** | *(Optional / if time)* Reusable goal/service templates | new model/routes | — | ⬜ | Proposal mentions templates; defer only if schedule slips — mark ⏭ with note |

**Wave 3 exit**

- [ ] Clinical can create note; cannot silently rewrite  
- [ ] Goals can be marked achieved  
- [ ] Co-sign path exists (even if UI later)  

---

## Wave 4 — Scheduling & care delivery backend

**Goal:** Availability, booking with conflicts, delivery evidence. Shift/task CRUD already partially exists.

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M3-4.1** | Provider availability CRUD API (`ProviderAvailabilitySlot`) | new routes/controller | SCH1 | ⬜ | Schema exists |
| **M3-4.2** | Slot booking / assign staff to session with **conflict detection** | booking/session services | SCH2 | ⬜ | Core scheduling engine |
| **M3-4.3** | Recurring appointment generation | same | SCH2 | ⬜ | Proposal deliverable |
| **M3-4.4** | Audit shift/task APIs vs delivery needs; add evidence upload wiring if missing | `shift.routes` / uploads | DEL1, DEL2 | ⬜ | Don’t rebuild what works |
| **M3-4.5** | Ensure tasks created on plan approve are visible to assigned support workers | query filters / assignee | DEL1, CP7 | ⬜ | Ties Wave 1 → delivery |

**Wave 4 exit**

- [ ] Coordinator can manage availability  
- [ ] Booking rejects conflicts  
- [ ] Worker can start shift, see tasks, complete + evidence  

---

## Wave 5 — Frontend (replace placeholders)

**Path rule:** ship under `/family`, `/coordinator`, `/clinical`, `/support` only (`proposalRoleShells.ts`).  
**Adapt vs build:** follow `MILESTONE_THREE.md` §3.1.

### 5A — Shared client foundations (before pages)

| ID | Task | Status | Notes |
|---|---|---|---|
| **M3-5A.1** | Care-plan API client helpers (list/get/create/update/submit/approve/revision/reject/items) | ⬜ | New module; don’t rely on commented careseeker |
| **M3-5A.2** | Clinical notes + goals + AI summary/draft client helpers | ⬜ | |
| **M3-5A.3** | Reuse/extract demo atoms if useful (`StatusBadge`, `ProgressBar`, `TabNav`) | ⬜ | Optional; don’t block on perfect extraction |
| **M3-5A.4** | Map demo statuses: `pending_approval` → `submitted_for_approval` | ⬜ | Never persist demo strings |

### 5B — Coordinator UI (**build fresh**) — first frontend after Wave 1–2

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M3-5B.1** | Care Plans list (replace placeholder) | `/coordinator/plans` | ⬜ | |
| **M3-5B.2** | Care Plan builder (goals + service items) | `/coordinator/episodes/:id/care-plan/new` | ⬜ | CP1 |
| **M3-5B.3** | Care Plan detail / edit + approval log | `/coordinator/plans/:id` | ⬜ | CP2 |
| **M3-5B.4** | Submit for family approval from UI | same | ⬜ | CP3 |
| **M3-5B.5** | AI intake summary panel + approve summary | intake / episode detail | ⬜ | AI2, AI4 — **not** demo IntakePage |
| **M3-5B.6** | “Generate AI Draft” button + load draft into builder | builder / detail | ⬜ | AI3, AI4 |
| **M3-5B.7** | Schedule / availability / assignment UI + nav item | `/coordinator/schedule` | ⬜ | Needs Wave 4; can follow 5C if schedule API late |

### 5C — Family UI (**adapt** demo `CareseekerPage`)

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M3-5C.1** | Care plans list (replace placeholder) | `/family/care-plans` | ⬜ | Adapt patterns |
| **M3-5C.2** | Review page: goals, services, cost | `/family/care-plans/:id` | ⬜ | |
| **M3-5C.3** | Wire Approve | same | ⬜ | CP4 |
| **M3-5C.4** | Wire Request Changes | same | ⬜ | CP5 |
| **M3-5C.5** | Wire Reject | same | ⬜ | CP6 — needs M3-1.3 |

### 5D — Clinical UI (**build fresh**)

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M3-5D.1** | Session notes hub (replace placeholder) | `/clinical/notes` | ⬜ | |
| **M3-5D.2** | Episode notes add/view (immutable) | `/clinical/episodes/:id/notes` | ⬜ | NOTE1, NOTE2 |
| **M3-5D.3** | Care plan read-only + co-sign | `/clinical/plans/:id` | ⬜ | Needs M3-3.4 |

### 5E — Support worker UI (**adapt** `provider/TasksPage`)

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M3-5E.1** | My Shifts (replace placeholder) | `/support/shifts` | ⬜ | Use `lib/api/shifts.ts` |
| **M3-5E.2** | Tasks list / checklist | `/support/tasks` | ⬜ | DEL1 |
| **M3-5E.3** | Active shift: start / complete tasks / evidence / end | embedded | ⬜ | DEL2 |
| **M3-5E.4** | Do **not** ship product nav to `/demo/coordinator` or extend `/staff/TasksPage` as product | — | ⬜ | Policy check |

**Wave 5 exit**

- [ ] All M3 placeholders in §3 replaced with real pages (or intentional later note)  
- [ ] Family can complete approve / revision / reject in UI  
- [ ] Coordinator can build + submit plan and see AI assist  
- [ ] Clinical notes + support shift flows usable  

---

## Wave 6 — Hardening & ship gate (do last)

| ID | Task | Accept # | Status | Notes |
|---|---|---|---|---|
| **M3-6.1** | Full pass/fail checklist from `MILESTONE_THREE.md` §8 | all | ⬜ | Copy results into § Acceptance map below |
| **M3-6.2** | M2 regression: intake → coordinator review → episode → assessment | REG | ⬜ | Must stay green |
| **M3-6.3** | AI down test: review still succeeds; summary optional | AI5 | ⬜ | |
| **M3-6.4** | Idempotent callback retest (send twice) | AI3 | ⬜ | |
| **M3-6.5** | Confirm secrets/callback URL for staging (and prod plan) with Momen | — | ⬜ | |
| **M3-6.6** | Update `MILESTONE_THREE.md` status line + this tracker to 🟢 when done | — | ⬜ | |
| **M3-6.7** | Client demo dry-run with credentials in brief | — | ⬜ | coordinator / family / clinical / support |

**Wave 6 exit = Milestone 3 ready for review**

- [ ] § Acceptance map all ✅ or justified ⏭  
- [ ] REG passed  
- [ ] Demo path documented  

---

## Acceptance map (from brief §8)

Tick when verified end-to-end (API + UI where applicable).

| # | Check | Task IDs | Status |
|---|---|---|---|
| CP1 | Coordinator creates plan with goals + service items | M3-5B.2, M3-1.5 | ⬜ |
| CP2 | Edit creates new version; old not-current | M3-5B.3 | ⬜ |
| CP3 | Submit → family notification | M3-5B.4 | ⬜ |
| CP4 | Family approve → episode `active` | M3-5C.3 | 🧪 API verified |
| CP5 | Family request revision → coordinator notified | M3-5C.4 | ⬜ |
| CP6 | Family reject | M3-1.3, M3-5C.5 | 🧪 API verified |
| CP7 | Goals → tasks on approve | M3-1.2, M3-4.5 | 🧪 API verified |
| CP8 | Active plan material edit needs re-approval | M3-1.4 | ⬜ |
| SCH1 | Availability manageable | M3-4.1, M3-5B.7 | ⬜ |
| SCH2 | Assign/book with conflict detection | M3-4.2–4.3 | ⬜ |
| DEL1 | Worker start shift + see tasks | M3-5E.* | ⬜ |
| DEL2 | Complete tasks + evidence | M3-4.4, M3-5E.3 | ⬜ |
| NOTE1 | Clinical notes immutable after save | M3-3.1–3.2, M3-5D.2 | ⬜ |
| NOTE2 | Notes visible to coordinator on episode | M3-3.1, M3-5D | ⬜ |
| GOAL1 | Goals status / achieved | M3-3.3 | ⬜ |
| AI1 | Summary row after review + episode | M3-1.1, M3-2.2 | ⬜ |
| AI2 | Coordinator sees AI summary | M3-5B.5 | ⬜ |
| AI3 | Draft trigger + idempotent callback | M3-2.3–2.5, M3-2.7 | ⬜ |
| AI4 | Human approve/edit before family | M3-2.6, M3-5B.5–5B.6 | ⬜ |
| AI5 | Review OK when AI down | M3-2.2, M3-6.3 | ⬜ |
| REG | M2 flows still work | M3-6.2 | ⬜ |

---

## Out of scope (do not add to this tracker as Todo)

| Item | Why |
|---|---|
| Telehealth / Daily.co | M4 |
| Qatari payments / invoices | M4 |
| Secure messaging hub | M4 |
| React Native app | M5 |
| GPS geofence productization | M5 |
| Admin analytics dashboards | M5 |
| Building the LLM service | Momen |
| Shipping `/demo/coordinator` as product | Demo only |
| Extending legacy `/staff/TasksPage` as product | Replace via `/support` |

---

## Daily standup cheat sheet

**If you only have half a day — do this:**

| Day focus | Pick |
|---|---|
| Backend morning | Next open `M3-1.*` then `M3-2.*` |
| Backend afternoon | `M3-3.*` or `M3-4.*` if Wave 1 done |
| Frontend day | Next open `M3-5B.*` only after Wave 1 smoke; family after reject API |
| Stuck on AI staging | Continue Wave 1 / 3 / 5B builder without AI; leave AI tasks ⏸ |

**Current “NOW” pointer** *(edit this line each day):*

> **NOW →** `M3-1.4` re-approval gate → `M3-2.1` Riayah AI client → `M3-2.2` intake summarize → `M3-2.3` idempotent callback

---

## Quick links

| Doc | Role |
|---|---|
| `docx/MILESTONE_THREE.md` | Spec, inventory, AI contract, pass/fail definitions |
| `docx/M3_TASK_TRACKER.md` | **This file** — ordered work + status |
| `docx/MILESTONE_THREE_TEST.md` | Website manual test flows |
| `docx/Riayah_Plus_Proposal_v2.pdf` | Signed scope |
| Staging AI | `https://ca-riayah-ai-staging.yellowcoast-06b87bcc.uaenorth.azurecontainerapps.io` |

---

*Update statuses as you go. When Wave 6 exits, set Overall status to 🟢 and sync the status line in `MILESTONE_THREE.md`.*
