# Milestone 3 — Website Test Guide

**Created:** 2026-07-27  
**Spec:** `docx/MILESTONE_THREE.md`  
**Task tracker:** `docx/M3_TASK_TRACKER.md`  
**How to use:** Run flows **after** the linked task IDs are marked ✅ in the tracker. If a flow says **Not built yet**, skip until that wave ships.

---

## Before you test

### URLs

| Service | URL |
|---|---|
| Client | `http://localhost:5173` |
| API | `http://localhost:5001` |

```bash
cd server && npm run dev
cd client && npm run dev
```

### Credentials

```
Password (all roles): Password123!
```

| Role | Email | Portal path |
|---|---|---|
| Care Coordinator | `coordinator@riayahplus.com` | `/coordinator` |
| Family | `family@demo.com` | `/family` |
| Clinical Staff | `clinical@demo.com` | `/clinical` |
| Support Worker | *(create in admin)* | `/support` |

### Test status legend

| Tag | Meaning |
|---|---|
| 🟢 | Ready to test on website (when task done) |
| 🟡 | Partial — API only or placeholder UI |
| 🔴 | Not built yet — expect placeholder or 404 |

**Current baseline (updated 2026-07-29):** Production M3 website pages are still mostly 🔴, but the backend care-plan API moved forward:

- family login works after seed (seed now sets `isEmailVerified: true` and `emailVerifiedAt`)
- care-plan **reject** API is working
- care-plan **approve** API is working
- goal → task creation on approve is working

Use **API smoke** sections until Wave 5 UI lands.

### Latest verified smoke

These were manually verified in terminal/API smoke before this handoff:

1. `family@demo.com` login succeeded
2. Family reject returned `Care plan rejected.`
3. Family approve returned `Care plan approved.`
4. Coordinator `/api/tasks` returned **2 pending tasks** matching the 2 approved goals

Fresh seed note: family-visible care plans may start empty. If so, log in as coordinator, create a care plan for a family-owned episode, then submit it before testing family actions.

---

## Recommended test order (matches build order)

Test in this sequence so each flow has data from the previous step:

```
1. REG  — M2 regression (intake → episode)           [always first]
2. CP*  — Care plan create → submit → family actions
3. AI*  — Intake summary + care plan draft
4. GOAL — Goal progress
5. NOTE — Clinical notes
6. SCH* — Scheduling / availability
7. DEL* — Support shifts + tasks + evidence
8. Full end-to-end demo (all roles, one episode)
```

---

## Flow 0 — M2 regression (run before and after every M3 change)

**Accept:** `REG`  
**Task:** `M3-6.2`  
**Status:** 🟢 (M2 shipped)

### 0.1 Family submits care request

1. Log out. Go to `http://localhost:5173/family`
2. Log in as `family@demo.com` / `Password123!`
3. Open **Care request** → `/family/onboarding`
4. Complete and submit intake for a care recipient

**Pass:** Submission succeeds; no console errors; intake visible in coordinator queue.

### 0.2 Coordinator reviews intake and creates episode

1. Log out. Go to `http://localhost:5173/coordinator`
2. Log in as `coordinator@riayahplus.com` / `Password123!`
3. Open **Intake Queue** → `/coordinator/intake`
4. Open the new intake → fill guided review fields
5. Check **Create care episode** → submit review

**Pass:** Intake status → episode created; episode appears under **Episodes** (`/coordinator/episodes`).

### 0.3 Clinical assessment (M2 carry-over)

1. Log in as `clinical@demo.com` → `/clinical/schedule`
2. Complete or view assessment tied to the episode (if scheduled)

**Pass:** M2 assessment flow still works; no 403/500 on episode access.

---

## Flow 1 — Care plan builder (Coordinator)

**Accept:** `CP1`, `CP2`  
**Tasks:** `M3-5B.1`–`M3-5B.3`  
**Status:** 🔴 UI not built · 🟡 API exists

### 1.1 Create care plan with goals and services (website)

**When:** After `M3-5B.2` ✅

1. Coordinator → **Episodes** → open the episode from Flow 0
2. Start **New care plan** → `/coordinator/episodes/:episodeId/care-plan/new`
3. Enter plan title and notes
4. Add at least **2 goals** (title, description, target date, measurement)
5. Add at least **2 service items** (type, frequency, duration, unit cost)
6. Save as **draft**

**Pass:**

- Plan appears on `/coordinator/plans`
- Status = `draft`
- Goals and items visible on detail page
- Episode linked correctly

**Fail:** Placeholder page only; save errors; goals/items missing after reload.

### 1.2 Edit plan creates new version (website)

**When:** After `M3-5B.3` + `M3-1.4` ✅

1. Open draft plan → **Edit**
2. Change a goal title and a service frequency → save
3. Open version history / prior version (if exposed in UI)

**Pass:**

- New version number incremented
- Previous version marked not current (`isCurrentVersion: false`)
- Old version read-only

### 1.3 API smoke (until UI ships)

```bash
# Login coordinator
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}'

# List care plans
curl -s -b /tmp/coord.txt http://localhost:5001/api/care-plans | jq .

# Create (replace episodeId)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/care-plans \
  -H "Content-Type: application/json" \
  -d '{"episodeId":"<EPISODE_ID>","title":"M3 test plan","goals":[{"title":"Mobility","description":"Walk 10 min daily"}],"items":[{"serviceType":"physio","frequency":"2x/week","duration":60,"unitCost":150}]}' | jq .
```

**Pass:** `201` with plan id; GET returns goals + items.

---

## Flow 2 — Submit for family approval (Coordinator)

**Accept:** `CP3`  
**Tasks:** `M3-5B.4`  
**Status:** 🔴 UI · 🟡 API (`POST /care-plans/:id/submit`)

### 2.1 Submit plan (website)

**When:** After `M3-5B.4` ✅

1. Coordinator → open draft plan on `/coordinator/plans/:id`
2. Click **Submit for family approval**
3. Confirm

**Pass:**

- Plan status → `submitted_for_approval`
- Success toast/message
- Family user receives **in-app notification** (check family dashboard or notifications)

### 2.2 API smoke

```bash
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/care-plans/<PLAN_ID>/submit | jq .
```

**Pass:** `200`; status updated; family notification created.

---

## Flow 3 — Family review: Approve / Request changes / Reject

**Accept:** `CP4`, `CP5`, `CP6`  
**Tasks:** `M3-5C.*`, `M3-1.3` (reject API)  
**Status:** 🔴 UI (placeholder at `/family/care-plans`) · 🟡 API partial (`approve` + `reject` verified; `request-revision` still needs smoke)

### 3.1 Family sees submitted plan (website)

**When:** After `M3-5C.1`–`M3-5C.2` ✅

1. Log out → `http://localhost:5173/family`
2. Log in as `family@demo.com`
3. Open **Care Plans** → `/family/care-plans`
4. Open the plan awaiting approval

**Pass:**

- Goals, services, and cost breakdown visible
- Status shows awaiting approval (map: `submitted_for_approval`)
- No internal IDs / unnecessary PHI exposed

### 3.2 Approve (website)

**When:** After `M3-5C.3` ✅

1. On plan review page → **Approve**
2. Confirm

**Pass:**

- Plan status → `approved` (then `active` per workflow)
- Care episode status → `active`
- Coordinator notified (optional check)

### 3.3 Request changes (website)

**When:** After `M3-5C.4` ✅

1. Use a **different** submitted plan (reset via coordinator if needed)
2. Family → **Request changes** → enter comments → submit

**Pass:**

- Plan status → `revision_requested`
- Comments stored; coordinator receives notification

### 3.4 Reject (website)

**When:** After `M3-1.3` + `M3-5C.5` ✅

1. Coordinator submits another plan
2. Family → **Reject** → optional reason → submit

**Pass:**

- Plan status → `rejected`
- Coordinator notified
- Plan can return to draft for coordinator rework

### 3.5 API smoke (family actions)

```bash
curl -s -c /tmp/family.txt -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"family@demo.com","password":"Password123!"}'

curl -s -b /tmp/family.txt -X POST http://localhost:5001/api/care-plans/<PLAN_ID>/approve | jq .
curl -s -b /tmp/family.txt -X POST http://localhost:5001/api/care-plans/<PLAN_ID>/request-revision \
  -H "Content-Type: application/json" -d '{"notes":"Please adjust frequency"}' | jq .

# Reject is already shipped / verified:
curl -s -b /tmp/family.txt -X POST http://localhost:5001/api/care-plans/<PLAN_ID>/reject \
  -H "Content-Type: application/json" -d '{"notes":"Not suitable at this time"}' | jq .
```

**Verified result:** approve and reject both returned success in API smoke. Request-revision still needs a fresh smoke pass after the next plan setup.

---

## Flow 4 — Goals → tasks on approval

**Accept:** `CP7`, `GOAL1`  
**Tasks:** `M3-1.2`, `M3-3.3`, `M3-4.5`  
**Status:** 🟡 backend verified (`goal` → `task` works in API smoke) · website UI still not built

### 4.1 Tasks created after family approves (website)

**When:** After `M3-1.2` ✅ and family approves in Flow 3.2

1. Coordinator or support worker opens tasks/shifts view
2. Verify one **task per goal** exists, linked to the care plan goal

**Pass:**

- Task count matches goal count
- Tasks have titles from goals; status trackable
- Episode / assignee scoping correct

**Verified result:** API smoke produced 2 pending tasks with matching goal titles and `goalId` values after family approval.

### 4.2 Mark goal achieved (website)

**When:** After `M3-3.3` + UI ✅

1. Coordinator or clinical opens plan goals
2. Mark a goal **Achieved**

**Pass:** Goal status → `achieved`; `achievedAt` set; UI reflects change.

---

## Flow 5 — Re-approval on active plan edit

**Accept:** `CP8`  
**Tasks:** `M3-1.4`  
**Status:** 🔴

### 5.1 Material edit forces re-approval (website)

**When:** After `M3-1.4` + coordinator UI ✅

1. Start from an **active** approved plan
2. Coordinator edits a service item or goal (material change)
3. Save

**Pass:**

- Plan cannot stay `active` without re-approval
- New version created; status requires submit → family approve again
- Family sees updated plan for re-approval

---

## Flow 6 — AI intake summary

**Accept:** `AI1`, `AI2`, `AI5`  
**Tasks:** `M3-1.1`, `M3-2.2`, `M3-5B.5`  
**Status:** 🔴

### 6.1 Summary generated after intake review (backend + UI)

**When:** After `M3-2.2` ✅

1. Run Flow 0.2 (coordinator review + create episode)
2. Coordinator opens intake detail or episode detail
3. Find **AI Intake Summary** panel

**Pass:**

- Summary shows key concerns, urgency, suggested services, clinical impressions
- Status = `draft` until coordinator approves
- Intake review **still succeeded** even if AI service was down (test separately in 6.3)

### 6.2 Coordinator approves AI summary (website)

**When:** After `M3-2.6` + `M3-5B.5` ✅

1. Open AI summary panel → **Approve summary**

**Pass:** Status → approved; `approvedAt` / approver recorded.

### 6.3 AI service down (negative test)

**When:** After `M3-2.2` ✅

1. Stop AI service or set bad `AI_SERVICE_URL` in `server/.env`
2. Repeat Flow 0.2 (new intake → review → create episode)

**Pass:** Review completes; episode created; no 500 to user; error logged server-side only.

### 6.4 DB check (optional)

```sql
SELECT id, "careEpisodeId", status, "keyConcerns" FROM ai_intake_summaries ORDER BY "createdAt" DESC LIMIT 5;
```

**Pass:** Row exists for episode created in Flow 0.2.

---

## Flow 7 — AI care plan draft

**Accept:** `AI3`, `AI4`  
**Tasks:** `M3-2.3`–`M3-2.5`, `M3-5B.6`  
**Status:** 🔴

### 7.1 Generate draft (website)

**When:** After `M3-5B.6` ✅

1. Coordinator → episode with no plan (or empty draft)
2. Open care plan builder → **Generate AI Draft**
3. Wait for notification / poll until draft loads

**Pass:**

- Draft care plan appears in builder with goals/services from AI
- Status remains `draft` — **not** submitted to family
- Coordinator can edit before submit

### 7.2 Idempotent callback (technical)

**When:** After `M3-2.3` ✅

1. Trigger draft twice for same episode (or replay callback via Postman)
2. Check database / UI

**Pass:** Only one draft plan created (or upsert — no duplicates).

### 7.3 AI draft never auto-goes to family (negative)

1. Generate AI draft
2. Log in as family **without** coordinator submitting

**Pass:** Family does **not** see plan until coordinator explicitly submits for approval.

---

## Flow 8 — Clinical documentation

**Accept:** `NOTE1`, `NOTE2`  
**Tasks:** `M3-3.1`–`M3-3.2`, `M3-5D.*`  
**Status:** 🔴 (placeholder at `/clinical/notes`)

### 8.1 Add session note (website)

**When:** After `M3-5D.2` ✅

1. Log in as `clinical@demo.com` → `/clinical`
2. Open **Session Notes** → `/clinical/notes` or episode → `/clinical/episodes/:id/notes`
3. Add note content → save

**Pass:**

- Note saved and listed
- Author and timestamp shown
- **No edit/delete** after save (immutable)

### 8.2 Coordinator sees notes on episode (website)

**When:** After `M3-3.1` + coordinator episode detail ✅

1. Coordinator → open same episode
2. Find clinical notes section

**Pass:** Note visible; private notes hidden if `isPrivate` and viewer not author/clinical.

### 8.3 Clinical co-sign care plan (website)

**When:** After `M3-3.4` + `M3-5D.3` ✅

1. Clinical → open care plan read-only view
2. **Co-sign** within scope

**Pass:** Co-sign recorded; visible on approval log.

---

## Flow 9 — Staff scheduling & availability

**Accept:** `SCH1`, `SCH2`  
**Tasks:** `M3-4.1`–`M3-4.3`, `M3-5B.7`  
**Status:** 🔴

### 9.1 Manage availability (website)

**When:** After `M3-5B.7` ✅

1. Coordinator → **Schedule** → `/coordinator/schedule`
2. Set recurring availability for a support/clinical worker (day, start/end)

**Pass:** Slots saved; visible on coordinator schedule view.

### 9.2 Book / assign with conflict detection (website)

**When:** After `M3-4.2` ✅

1. Assign worker to a session slot
2. Try to double-book same worker at overlapping time

**Pass:**

- Valid booking succeeds
- Conflict shows error — second booking blocked

### 9.3 Recurring appointments (website)

**When:** After `M3-4.3` ✅

1. Create recurring weekly session for an episode
2. Check calendar/list for generated occurrences

**Pass:** Multiple future sessions created per recurrence rule.

---

## Flow 10 — Care delivery (Support worker)

**Accept:** `DEL1`, `DEL2`  
**Tasks:** `M3-4.4`, `M3-5E.*`  
**Status:** 🔴 placeholders at `/support/shifts`, `/support/tasks`

### 10.1 Start shift and see tasks (website)

**When:** After `M3-5E.1`–`M3-5E.2` ✅

1. Log in as support worker → `http://localhost:5173/support`
2. Open **My Shifts** → `/support/shifts`
3. **Start shift** (if not auto-started)
4. Open **Tasks** → `/support/tasks`

**Pass:**

- Active shift shown
- Tasks from approved care plan (Flow 4) visible
- Task status updatable

### 10.2 Complete task + upload evidence (website)

**When:** After `M3-5E.3` ✅

1. Open a task → mark complete
2. Upload photo / file evidence (if required by task type)
3. Add completion notes
4. **End shift**

**Pass:**

- Task status → completed
- Evidence attached and visible to coordinator
- Shift end time recorded

### 10.3 API smoke (shifts — partial today)

```bash
# Login support worker (after account exists)
curl -s -c /tmp/support.txt -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<support@demo.com>","password":"Password123!"}'

curl -s -b /tmp/support.txt -X POST http://localhost:5001/api/shifts/start \
  -H "Content-Type: application/json" -d '{}' | jq .

curl -s -b /tmp/support.txt http://localhost:5001/api/shifts/active | jq .
curl -s -b /tmp/support.txt http://localhost:5001/api/tasks | jq .
```

---

## Flow 11 — Full end-to-end demo (client walkthrough)

**When:** Wave 6 (`M3-6.7`) — all critical paths ✅

Run once through the website with **one care episode**:

| Step | Role | Action |
|---|---|---|
| 1 | Family | Submit care request |
| 2 | Coordinator | Review intake → create episode → AI summary appears |
| 3 | Coordinator | Build care plan (or AI draft → edit) → submit |
| 4 | Family | Approve care plan |
| 5 | Coordinator | Set schedule / assign worker |
| 6 | Clinical | Add session note |
| 7 | Support | Start shift → complete tasks → upload evidence → end shift |
| 8 | Coordinator | Verify episode active, tasks done, notes visible |
| 9 | All | Re-run Flow 0 quickly to confirm M2 regression |

**Pass:** No broken links; no placeholder pages on critical path; acceptance map in `M3_TASK_TRACKER.md` § Acceptance map all 🧪 Verified.

---

## Acceptance checklist (copy for sign-off)

| # | Test | Flow | Pass | Fail | Date |
|---|---|---|---|---|---|
| REG | M2 intake → episode → assessment | 0 | | | |
| CP1 | Create plan + goals + items | 1.1 | | | |
| CP2 | Edit → new version | 1.2 | | | |
| CP3 | Submit → family notified | 2.1 | | | |
| CP4 | Family approve → episode active | 3.2 | API smoke passed | | 2026-07-28 |
| CP5 | Family request revision | 3.3 | | | |
| CP6 | Family reject | 3.4 | API smoke passed | | 2026-07-28 |
| CP7 | Goals → tasks on approve | 4.1 | API smoke passed | | 2026-07-28 |
| CP8 | Active edit → re-approval | 5.1 | | | |
| SCH1 | Availability manageable | 9.1 | | | |
| SCH2 | Conflict detection | 9.2 | | | |
| DEL1 | Start shift + see tasks | 10.1 | | | |
| DEL2 | Complete task + evidence | 10.2 | | | |
| NOTE1 | Clinical notes immutable | 8.1 | | | |
| NOTE2 | Notes on episode for coordinator | 8.2 | | | |
| GOAL1 | Goal marked achieved | 4.2 | | | |
| AI1 | Summary row after episode | 6.1 / 6.4 | | | |
| AI2 | Coordinator sees summary | 6.1 | | | |
| AI3 | Draft + idempotent callback | 7.1 / 7.2 | | | |
| AI4 | Human approve before family | 7.3 | | | |
| AI5 | Review OK when AI down | 6.3 | | | |

---

## What not to test as M3 product

| Surface | Why |
|---|---|
| `/demo/coordinator/*` | Mock demo only — not production M3 |
| `/careseeker/care-plans` | Legacy pricing page — not clinical builder |
| `/staff/*` | Legacy layout — M3 ships under `/support/*` |
| Demo `IntakePage` AI chat | Different concept — not Riayah AI summary panel |

---

## Quick links

| Doc | Purpose |
|---|---|
| `docx/MILESTONE_THREE.md` | Scope + spec |
| `docx/M3_TASK_TRACKER.md` | Build order + task status |
| `docx/MILESTONE_THREE_TEST.md` | **This file** — website test flows |

---

*Update flow status tags (🟢/🟡/🔴) as tasks complete in `M3_TASK_TRACKER.md`.*
