# Milestone 3 — Website Test Guide

**Created:** 2026-07-27  
**Last updated:** 2026-07-31  
**Spec:** `docx/MILESTONE_THREE.md`  
**Task tracker:** `docx/M3_TASK_TRACKER.md`  
**Overall test status:** 🟢 Signed M3 flows smoke-verified (General Hospital dry-run). Deferred: formal AI-down kill-switch, Momen handshake.  
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
| Support Worker | `support@demo.com` | `/support` |

**General Hospital dry-run accounts (2026-07-31):**

| Role | Email |
|---|---|
| Org admin | `shahbaztayyab1386@gmail.com` |
| Coordinator | `coordinator-general@mailinator.com` |
| Clinical | `clinical-general@demo.com` |
| Support | `support-general@demo.com` |
| Family | Faraz Tayyab — `zzohaib953@gmail.com` |

### Test status legend

| Tag | Meaning |
|---|---|
| 🟢 | Ready to test on website (when task done) |
| 🟡 | Partial — API only or placeholder UI |
| 🔴 | Not built yet — expect placeholder or 404 |

**Current baseline (updated 2026-07-29):** Production M3 website pages are still mostly 🔴, but backend Wave 1 + early Wave 2 are ahead:

- family login works after seed (`isEmailVerified` + `emailVerifiedAt`)
- care-plan **reject / approve / goal→task / re-approval gate** APIs working
- `RiayahAiClient` + **AI intake summarize on review** working (summary row in `ai_intake_summaries`, status `draft`)

Use **API smoke** sections until Wave 5 UI lands.

### Latest verified smoke

These were verified via API / DB smoke:

1. `family@demo.com` login succeeded
2. Family reject / approve + goal → task
3. Active plan material edit → draft v2 requiring re-approval (`CP8`)
4. Intake review + create episode → `ai_intake_summaries` row (`draft`, model `deepseek-v4-flash`)

Fresh seed note: family-visible care plans may start empty. If so, create + submit a care plan before family actions.

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
**Status:** 🟢 Website UI verified (2026-07-31)

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
**Status:** 🟢 Website UI verified (2026-07-31)

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
**Status:** 🟢 Website UI verified (2026-07-31) — approve / request changes / reject

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
**Status:** 🟢 Verified — goals → tasks on approve; goal progress API

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

### 4.2b API smoke (manual — until UI)

**When:** After `M3-3.3` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

# Use an active plan with goals (or create/approve one first)
PLAN_ID=<ACTIVE_CARE_PLAN_ID>

curl -s -b /tmp/coord.txt "http://localhost:5001/api/care-plans/$PLAN_ID/goals" | jq .
GOAL_ID=$(curl -s -b /tmp/coord.txt "http://localhost:5001/api/care-plans/$PLAN_ID/goals" | jq -r '.goals[0].id')

# Mark achieved — expect status=achieved + achievedAt set
curl -s -b /tmp/coord.txt -X PATCH "http://localhost:5001/api/care-plans/$PLAN_ID/goals/$GOAL_ID" \
  -H 'Content-Type: application/json' \
  -d '{"status":"achieved","notes":"Goal met in session"}' | jq .

# Re-PATCH achieved is idempotent (achievedAt unchanged)
curl -s -b /tmp/coord.txt -X PATCH "http://localhost:5001/api/care-plans/$PLAN_ID/goals/$GOAL_ID" \
  -H 'Content-Type: application/json' \
  -d '{"status":"achieved"}' | jq '{status:.goal.status, achievedAt:.goal.achievedAt}'

# Clinical can also update; family → 403
curl -s -c /tmp/clinical.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"clinical@demo.com","password":"Password123!"}' | jq .
curl -s -b /tmp/clinical.txt -X PATCH "http://localhost:5001/api/care-plans/$PLAN_ID/goals/$GOAL_ID" \
  -H 'Content-Type: application/json' \
  -d '{"status":"active"}' | jq '{status:.goal.status, achievedAt:.goal.achievedAt}'
```

**Pass:**

- `PATCH` with `status: achieved` → `achievedAt` set
- Works on **active** plans without creating a new draft (not CP8)
- Clinical + coordinator allowed; family → `403`
- Empty body → `422`

**Verified (2026-07-29):** ✅ list + mark achieved + idempotent `achievedAt` + clinical reopen + family 403.

---

## Flow 5 — Re-approval on active plan edit

**Accept:** `CP8`  
**Tasks:** `M3-1.4`  
**Status:** 🟢 Website UI verified (2026-07-31)

### 5.1 Material edit forces re-approval (website)

**When:** After `M3-1.4` + coordinator UI ✅

1. Start from an **active** approved plan
2. Coordinator edits a service item or goal (material change)
3. Save

**Pass:**

- Plan cannot stay `active` without re-approval
- New version created; status requires submit → family approve again
- Family sees updated plan for re-approval

### 5.2 API smoke (manual — until coordinator UI)

**When:** After `M3-1.4` ✅

```bash
# 1) Login
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

curl -s -c /tmp/family.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"family@demo.com","password":"Password123!"}' | jq .

# 2) Create draft plan (use a family-owned episode id)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/care-plans \
  -H 'Content-Type: application/json' \
  -d '{
    "episodeId":"<EPISODE_ID>",
    "title":"CP8 reapproval smoke",
    "goals":[{"title":"Walk daily","measurement":"minutes"}],
    "items":[{"serviceType":"physiotherapy","frequency":"2x/week","unitCost":200}]
  }' | jq .

# 3) Submit → family approve (plan becomes active)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/care-plans/<PLAN_ID>/submit | jq .
curl -s -b /tmp/family.txt -X POST http://localhost:5001/api/care-plans/<PLAN_ID>/approve | jq .

# 4) In-place item edit must 422
curl -s -b /tmp/coord.txt -X PATCH http://localhost:5001/api/care-plans/<PLAN_ID>/items/<ITEM_ID> \
  -H 'Content-Type: application/json' -d '{"frequency":"3x/week"}' | jq .

# 5) Material edit → new draft version
curl -s -b /tmp/coord.txt -X PATCH http://localhost:5001/api/care-plans/<PLAN_ID> \
  -H 'Content-Type: application/json' \
  -d '{
    "title":"CP8 revised",
    "goals":[{"title":"Walk daily"},{"title":"Pain control"}],
    "items":[{"serviceType":"physiotherapy","frequency":"3x/week","unitCost":200}]
  }' | jq '{id:.data.id, status:.data.status, version:.data.version, prev:.data.previousVersionId, meta:.meta}'

# 6) Resubmit new draft → family re-approve
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/care-plans/<NEW_PLAN_ID>/submit | jq .
curl -s -b /tmp/family.txt -X POST http://localhost:5001/api/care-plans/<NEW_PLAN_ID>/approve | jq .
```

**Pass:**

- Step 4 → `422`
- Step 5 → `status: draft`, bumped `version`, `previousVersionId` set, `meta.reapprovalRequired: true`
- Old plan → `isCurrentVersion: false`, status `revision_requested`
- Step 6 → new plan `active`

**Verified (2026-07-29):** ✅ full path above passed in API smoke.

---

## Flow 6 — AI intake summary

**Accept:** `AI1`, `AI2`, `AI5`  
**Tasks:** `M3-1.1`, `M3-2.1`, `M3-2.2`, `M3-5B.5`  
**Status:** 🟢 Verified — AI summary panel + approve

### 6.1 Summary generated after intake review (backend + UI)

**When:** After `M3-2.2` ✅

1. Run Flow 0.2 (coordinator review + create episode)
2. Coordinator opens intake detail or episode detail
3. Find **AI Intake Summary** panel

**Pass:**

- Summary shows key concerns, urgency, suggested services, clinical impressions
- Status = `draft` until coordinator approves
- Intake review **still succeeded** even if AI service was down (test separately in 6.3)

### 6.1b API smoke (manual — until UI)

**When:** After `M3-2.2` ✅

```bash
# Login as coordinator
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

# Review a submitted intake with createEpisode:true
# Note: path is /api/intake/:id/review (singular)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/intake/<INTAKE_ID>/review \
  -H 'Content-Type: application/json' \
  -d '{
    "keyConcerns":["Home care support"],
    "urgencyIndicators":["Medium urgency"],
    "suggestedServiceCategories":["companion_care"],
    "riskFlags":["fall_risk"],
    "createEpisode":true,
    "episodeTitle":"AI summarize smoke"
  }' | jq '{status: .data.intake.status, episodeId: .data.episode.id}'

# DB check
# SELECT id, "careEpisodeId", status, model, "keyConcerns", confidence
# FROM ai_intake_summaries ORDER BY "createdAt" DESC LIMIT 5;
```

**Pass:**

- Review returns `200` with `intake.status = episode_created` and an `episode.id`
- `ai_intake_summaries` has a row for that episode, `status = draft`, non-empty `keyConcerns`

**Verified (2026-07-29):** ✅ review ~2.8s → row `draft` / model `deepseek-v4-flash` / concerns populated.

### 6.2 Coordinator approves AI summary (website)

**When:** After `M3-2.6` + `M3-5B.5` ✅

1. Open AI summary panel → **Approve summary**

**Pass:** Status → approved; `approvedAt` / approver recorded.

### 6.2b API smoke — get + approve (manual)

**When:** After `M3-2.6` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

# Read draft summary
curl -s -b /tmp/coord.txt http://localhost:5001/api/episodes/<EPISODE_ID>/ai-intake-summary | jq '{
  status: .data.status,
  keyConcerns: .data.keyConcerns,
  confidence: .data.confidence
}'

# Approve (human-in-the-loop)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/episodes/<EPISODE_ID>/ai-intake-summary/approve | jq '{
  message, status: .data.status, approvedById: .data.approvedById, approvedAt: .data.approvedAt
}'

# Re-approve → idempotent
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/episodes/<EPISODE_ID>/ai-intake-summary/approve | jq .message
```

**Pass:**

- GET returns summary with `status: draft` (before) / `approved` (after)
- Approve sets `approvedById` + `approvedAt`
- Second approve → “already approved”
- Family → `403`

**Verified (2026-07-29):** ✅ get + approve + idempotent re-approve; family blocked.

### 6.3 AI service down (negative test)

**When:** After `M3-2.2` ✅

1. Stop AI service or set bad `AI_SERVICE_URL` in `server/.env` (restart API)
2. Repeat Flow 0.2 / 6.1b (new intake → review → create episode)

**Pass:** Review completes; episode created; no 500 to user; server log contains `AI intake summarize failed (non-blocking)`.

### 6.4 DB check (optional)

```sql
SELECT id, "careEpisodeId", status, model, "keyConcerns", confidence
FROM ai_intake_summaries
ORDER BY "createdAt" DESC
LIMIT 5;
```

**Pass:** Row exists for episode created in Flow 0.2 / 6.1b.

---

## Flow 7 — AI care plan draft

**Accept:** `AI3`, `AI4`  
**Tasks:** `M3-2.3`–`M3-2.5`, `M3-2.4`, `M3-5B.6`  
**Status:** 🟢 Verified — Generate AI Draft + callback

### 7.1 Generate draft (website)

**When:** After `M3-5B.6` ✅

1. Coordinator → episode with no plan (or empty draft)
2. Open care plan builder → **Generate AI Draft**
3. Wait for notification / poll until draft loads

**Pass:**

- Draft care plan appears in builder with goals/services from AI
- Status remains `draft` — **not** submitted to family
- Coordinator can edit before submit

### 7.1b API smoke — coordinator trigger (manual)

**When:** After `M3-2.4` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

# Explicit generate (may take a few seconds — calls staging AI)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/episodes/<EPISODE_ID>/ai-care-plan-draft \
  -H 'Content-Type: application/json' \
  -d '{"familyConsultationNotes":"Prefers morning PT sessions."}' | jq '{
    status: .data.status,
    carePlanId: .data.carePlanId,
    created: .data.created,
    goals: (.data.carePlan.goals|length),
    items: (.data.carePlan.items|length),
    ai: .data.ai
  }'

# Regenerate — same carePlanId, idempotentReplay/created false
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/episodes/<EPISODE_ID>/ai-care-plan-draft \
  -H 'Content-Type: application/json' -d '{}' | jq '.data | {carePlanId, created, idempotentReplay}'
```

**Pass:**

- `201`/`200` with `status: draft`, goals/items present
- Regenerate keeps same `carePlanId`
- Family calling this endpoint → `403`
- Plan **not** `submitted_for_approval`

**Verified (2026-07-29):** ✅ staging AI (~4s) → draft with goals/items; regenerate upserts same id.

### 7.2 Idempotent callback (technical)

**When:** After `M3-2.3` ✅

1. Trigger draft twice for same episode (or replay callback via Postman)
2. Check database / UI

**Pass:** Only one draft plan created (or upsert — no duplicates).

### 7.2b API smoke (manual)

```bash
# Auth: X-API-Key must match server AI_SERVICE_API_KEY
# Path: POST /api/ai/callbacks/care-plan-draft  (registered before session auth)

curl -s -X POST http://localhost:5001/api/ai/callbacks/care-plan-draft \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: local-dev-key-12345' \
  -d '{
    "episodeId":"<EPISODE_ID>",
    "draftId":"manual-test-1",
    "model":"manual",
    "draft":{
      "goals":[{"title":"Walk daily","measurementCriteria":"minutes"}],
      "services":[{"serviceType":"physiotherapy","category":"rehab","frequency":"2x/week","durationMinutes":45,"unitCost":200}],
      "clinicalNotes":"Manual callback smoke",
      "currency":"QAR"
    }
  }' | jq .

# Replay the exact same body — expect 200, same carePlanId, idempotentReplay:true
curl -s -X POST http://localhost:5001/api/ai/callbacks/care-plan-draft \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: local-dev-key-12345' \
  -d '{ ...same body... }' | jq .

# Missing/wrong key → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:5001/api/ai/callbacks/care-plan-draft \
  -H 'Content-Type: application/json' -d '{"episodeId":"x","draft":{"goals":[],"services":[]}}'
```

**Pass:**

- First call → `201`, `created: true`, `status: draft`
- Replay → `200`, same `carePlanId`, `idempotentReplay: true`
- Plan stays `draft` (not submitted to family)
- Bad/missing API key → `401`

**Verified (2026-07-29):** ✅ auth + create + idempotent replay + single AI draft upsert.

### 7.3 AI draft never auto-goes to family (negative)

1. Generate AI draft
2. Log in as family **without** coordinator submitting

**Pass:** Family does **not** see plan until coordinator explicitly submits for approval.

---

## Flow 8 — Clinical documentation

**Accept:** `NOTE1`, `NOTE2`  
**Tasks:** `M3-3.1`–`M3-3.2`, `M3-3.4`, `M3-5D.*`  
**Status:** 🟢 Website UI verified (2026-07-31) — notes hub + episode notes + care plan co-sign

### 8.1 Add session note (website)

**When:** After `M3-5D.2` ✅

1. Log in as `clinical@demo.com` → `/clinical`
2. Open **Session Notes** → `/clinical/notes` or episode → `/clinical/episodes/:id/notes`
3. Add note content → save

**Pass:**

- Note saved and listed
- Author and timestamp shown
- **No edit/delete** after save (immutable)

### 8.1b API smoke (manual — until UI)

**When:** After `M3-3.1` + `M3-3.2` ✅

```bash
# Clinical login
curl -s -c /tmp/clinical.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"clinical@demo.com","password":"Password123!"}' | jq .

curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

# Create note on episode
curl -s -b /tmp/clinical.txt -X POST http://localhost:5001/api/clinical-notes \
  -H 'Content-Type: application/json' \
  -d '{
    "episodeId":"<EPISODE_ID>",
    "content":"Patient tolerated PT well. Continue gait training.",
    "noteType":"session_note",
    "isPrivate":false
  }' | jq .

# List for coordinator (public notes)
curl -s -b /tmp/coord.txt "http://localhost:5001/api/clinical-notes?episodeId=<EPISODE_ID>" | jq .

# Immutability — expect 405
curl -s -b /tmp/clinical.txt -X PATCH http://localhost:5001/api/clinical-notes/<NOTE_ID> \
  -H 'Content-Type: application/json' -d '{"content":"changed"}' | jq .
curl -s -b /tmp/clinical.txt -X DELETE http://localhost:5001/api/clinical-notes/<NOTE_ID> | jq .
```

**Pass:**

- `POST` → `201` with author
- Coordinator `GET` sees non-private notes
- `PATCH`/`DELETE` → `405` immutable message
- Family → `403`

**Verified (2026-07-29):** ✅ create/list/show + private filter + 405 immutability.

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

### 8.3b API smoke (manual — until UI)

**When:** After `M3-3.4` ✅

```bash
# Clinical login (co-sign is clinical-only — not coordinator/family)
curl -s -c /tmp/clinical.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"clinical@demo.com","password":"Password123!"}' | jq .

curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

curl -s -c /tmp/family.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"family@demo.com","password":"Password123!"}' | jq .

# Pick a submitted / approved / active plan
PLAN_ID=<ACTIVE_OR_SUBMITTED_CARE_PLAN_ID>

# Optional: confirm current status + existing logs
curl -s -b /tmp/coord.txt "http://localhost:5001/api/care-plans/$PLAN_ID" | jq '{
  id: .data.id,
  status: .data.status,
  logs: [.data.approvalLogs[] | {action, actorId, notes, createdAt}]
}'

# Co-sign — expect 201, action=clinical_cosign; plan status unchanged
curl -s -b /tmp/clinical.txt -X POST "http://localhost:5001/api/care-plans/$PLAN_ID/cosign" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"Clinically reviewed — goals and services appropriate"}' | jq '{
  message,
  action: .approvalLog.action,
  actorId: .approvalLog.actorId,
  notes: .approvalLog.notes,
  status: .data.status,
  logActions: [.data.approvalLogs[].action]
}'

# Idempotent — same clinical user again → 200 "Already co-signed."
curl -s -b /tmp/clinical.txt -X POST "http://localhost:5001/api/care-plans/$PLAN_ID/cosign" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"again"}' | jq '{message, action: .approvalLog.action}'

# Coordinator / family → 403
curl -s -b /tmp/coord.txt -X POST "http://localhost:5001/api/care-plans/$PLAN_ID/cosign" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"no"}' | jq .
curl -s -b /tmp/family.txt -X POST "http://localhost:5001/api/care-plans/$PLAN_ID/cosign" \
  -H 'Content-Type: application/json' \
  -d '{"notes":"no"}' | jq .

# Draft plan → 422
curl -s -b /tmp/clinical.txt -X POST "http://localhost:5001/api/care-plans/<DRAFT_PLAN_ID>/cosign" \
  -H 'Content-Type: application/json' \
  -d '{}' | jq .
```

**Pass:**

- Clinical `POST` → `201` with `approvalLog.action === "clinical_cosign"`
- Plan `status` unchanged (optional attestation; family approval still owns activation)
- Co-sign visible on `GET /care-plans/:id` → `approvalLogs`
- Same clinical user again → idempotent `"Already co-signed."`
- Coordinator / family → `403`
- `draft` / `rejected` / `revision_requested` / `completed` → `422`

**Verified (2026-07-29):** ✅ co-sign on active plan + idempotent + role gates + draft 422.

---

## Flow 9 — Staff scheduling & availability

**Accept:** `SCH1`, `SCH2`  
**Tasks:** `M3-4.1`–`M3-4.3`, `M3-5B.7`  
**Status:** 🟢 Website UI verified (2026-07-31)

### 9.1 Manage availability (website)

**When:** After `M3-5B.7` ✅

1. Coordinator → **Schedule** → `/coordinator/schedule`
2. Set recurring availability for a support/clinical worker (day, start/end)

**Pass:** Slots saved; visible on coordinator schedule view.

### 9.1b API smoke — availability CRUD

**When:** After `M3-4.1` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

# Demo support worker id (from seed) — or look up via /api/providers/matched
SUPPORT_ID=<SUPPORT_WORKER_USER_ID>

# Replace weekly slots for a staff member (coordinator)
curl -s -b /tmp/coord.txt -X PUT "http://localhost:5001/api/availability/$SUPPORT_ID" \
  -H 'Content-Type: application/json' \
  -d '{
    "slots": [
      {"dayOfWeek":1,"startTime":"09:00","endTime":"17:00","isAvailable":true},
      {"dayOfWeek":3,"startTime":"10:00","endTime":"14:00","isAvailable":true}
    ]
  }' | jq .

# List
curl -s -b /tmp/coord.txt "http://localhost:5001/api/availability?providerId=$SUPPORT_ID" | jq .

# Add one slot
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/availability \
  -H 'Content-Type: application/json' \
  -d '{"providerId":"'"$SUPPORT_ID"'","dayOfWeek":5,"startTime":"08:00","endTime":"12:00"}' | jq .

# Patch / delete a slot
SLOT_ID=<SLOT_ID>
curl -s -b /tmp/coord.txt -X PATCH "http://localhost:5001/api/availability/slots/$SLOT_ID" \
  -H 'Content-Type: application/json' \
  -d '{"endTime":"13:00"}' | jq .
curl -s -b /tmp/coord.txt -X DELETE "http://localhost:5001/api/availability/slots/$SLOT_ID" | jq .
```

**Pass:** Coordinator can set/list/update/delete slots for staff in their org.

**Verified (2026-07-29):** ✅ PUT replace + GET list for `support@demo.com`.

### 9.2 Book / assign with conflict detection (website)

**When:** After `M3-4.2` ✅

1. Assign worker to a session slot
2. Try to double-book same worker at overlapping time

**Pass:**

- Valid booking succeeds
- Conflict shows error — second booking blocked

### 9.2b API smoke — book + conflict

**When:** After `M3-4.2` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

EPISODE_ID=<ACTIVE_EPISODE_ID>
SUPPORT_ID=<SUPPORT_WORKER_USER_ID>
# Pick a future ISO time
START=$(node -e "const d=new Date();d.setUTCDate(d.getUTCDate()+3);d.setUTCHours(10,0,0,0);console.log(d.toISOString())")
OVERLAP=$(node -e "const d=new Date('$START');d.setUTCMinutes(30);console.log(d.toISOString())")

# Book session — optionally reassign pending goal tasks to the worker
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/scheduling/sessions \
  -H 'Content-Type: application/json' \
  -d "{
    \"episodeId\":\"$EPISODE_ID\",
    \"providerId\":\"$SUPPORT_ID\",
    \"scheduledAt\":\"$START\",
    \"durationMinutes\":60,
    \"type\":\"in_person\",
    \"assignPendingTasks\":true,
    \"notes\":\"Home visit\"
  }" | jq .

# Overlapping book → expect 409 SCHEDULING_CONFLICT
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/scheduling/sessions \
  -H 'Content-Type: application/json' \
  -d "{
    \"episodeId\":\"$EPISODE_ID\",
    \"providerId\":\"$SUPPORT_ID\",
    \"scheduledAt\":\"$OVERLAP\",
    \"durationMinutes\":60
  }" | jq .

# List episode sessions
curl -s -b /tmp/coord.txt "http://localhost:5001/api/scheduling/sessions?episodeId=$EPISODE_ID" | jq .
```

**Pass:** First book `201`; overlap `409` with `details.code === "SCHEDULING_CONFLICT"`.

**Verified (2026-07-29):** ✅ book + 409 conflict + assignPendingTasks.

### 9.3 Recurring appointments (website)

**When:** After `M3-4.3` ✅

1. Create recurring weekly session for an episode
2. Check calendar/list for generated occurrences

**Pass:** Multiple future sessions created per recurrence rule.

### 9.3b API smoke — recurring sessions

**When:** After `M3-4.3` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

EPISODE_ID=<ACTIVE_EPISODE_ID>
SUPPORT_ID=<SUPPORT_WORKER_USER_ID>
RECUR_START=$(node -e "const d=new Date();d.setUTCDate(d.getUTCDate()+14);d.setUTCHours(14,0,0,0);console.log(d.toISOString())")

curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/scheduling/sessions/recurring \
  -H 'Content-Type: application/json' \
  -d "{
    \"episodeId\":\"$EPISODE_ID\",
    \"providerId\":\"$SUPPORT_ID\",
    \"scheduledAt\":\"$RECUR_START\",
    \"durationMinutes\":45,
    \"type\":\"home_visit\",
    \"recurrence\":{\"frequency\":\"weekly\",\"count\":3,\"interval\":1}
  }" | jq '{created, skipped, times:[.sessions[].scheduledAt]}'
```

**Pass:** `created >= 1` (up to `count`); conflicting occurrences listed in `skipped`.

**Verified (2026-07-29):** ✅ 3 weekly sessions generated.

---

## Flow 10 — Care delivery (Support worker)

**Accept:** `DEL1`, `DEL2`  
**Tasks:** `M3-4.4`, `M3-4.5`, `M3-5E.*`  
**Status:** 🟢 Website UI verified (2026-07-31) — `/support/shifts`, `/support/tasks`

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

### 10.1b API smoke — assign tasks + support worker list

**When:** After `M3-4.5` ✅

```bash
curl -s -c /tmp/coord.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq .

curl -s -c /tmp/support.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"support@demo.com","password":"Password123!"}' | jq .

EPISODE_ID=<EPISODE_WITH_GOAL_TASKS>
SUPPORT_ID=<SUPPORT_WORKER_USER_ID>

# Bulk-assign pending episode tasks to support worker
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/tasks/assign-episode \
  -H 'Content-Type: application/json' \
  -d "{\"episodeId\":\"$EPISODE_ID\",\"assigneeId\":\"$SUPPORT_ID\"}" | jq .

# Support worker sees assigned tasks
curl -s -b /tmp/support.txt 'http://localhost:5001/api/tasks?assignee=me' | jq .
# Also available under shifts helper:
curl -s -b /tmp/support.txt http://localhost:5001/api/shifts/tasks | jq .
```

**Pass:** After assign, support `GET /tasks?assignee=me` returns the episode goal tasks.

**Verified (2026-07-29):** ✅ assign via book `assignPendingTasks` + support list.

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

### 10.2b / 10.3 API smoke — shift + complete with evidence

**When:** After `M3-4.4` ✅

```bash
curl -s -c /tmp/support.txt -X POST http://localhost:5001/api/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"support@demo.com","password":"Password123!"}' | jq .

# Start shift (idempotent if already active)
curl -s -b /tmp/support.txt -X POST http://localhost:5001/api/shifts/start \
  -H 'Content-Type: application/json' -d '{}' | jq .
SHIFT_ID=$(curl -s -b /tmp/support.txt http://localhost:5001/api/shifts/active | jq -r '.data.id')

curl -s -b /tmp/support.txt http://localhost:5001/api/shifts/active | jq .
curl -s -b /tmp/support.txt 'http://localhost:5001/api/tasks?assignee=me' | jq .
TASK_ID=$(curl -s -b /tmp/support.txt 'http://localhost:5001/api/tasks?assignee=me' | jq -r '.data[]|select(.status!="completed")|.id' | head -1)

# Complete with evidence URL (upload via POST /api/upload first if needed, then paste URL)
curl -s -b /tmp/support.txt -X POST "http://localhost:5001/api/tasks/$TASK_ID/complete" \
  -H 'Content-Type: application/json' \
  -d '{
    "completionEvidence":"https://example.com/evidence/photo1.jpg",
    "notes":"Visit completed — client walked 15 min",
    "actualDuration":55
  }' | jq .

# Or via status patch:
# curl -s -b /tmp/support.txt -X PATCH "http://localhost:5001/api/tasks/$TASK_ID/status" \
#   -H 'Content-Type: application/json' \
#   -d '{"status":"completed","completionEvidence":"https://example.com/evidence/photo1.jpg"}' | jq .

curl -s -b /tmp/support.txt -X POST "http://localhost:5001/api/shifts/$SHIFT_ID/end" | jq .
```

**Pass:**

- Shift start → active; end → completed + `endedAt`
- Task `status=completed`, `completionEvidence` URL set, `completedAt` set
- Invalid evidence (non-URL) → `422`

**Verified (2026-07-29):** ✅ shift start/end + task complete with evidence URL.

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
| CP8 | Active edit → re-approval | 5.1 / 5.2 | 🧪 API | | 2026-07-29 — curl steps in §5.2 |
| SCH1 | Availability manageable | 9.1 / 9.1b | 🧪 API | | 2026-07-29 — curl in §9.1b |
| SCH2 | Conflict detection | 9.2 / 9.2b / 9.3b | 🧪 API | | 2026-07-29 — book + 409 + recurring |
| DEL1 | Start shift + see tasks | 10.1 / 10.1b | 🧪 API | | 2026-07-29 — assign + list |
| DEL2 | Complete task + evidence | 10.2 / 10.2b | 🧪 API | | 2026-07-29 — complete + evidence URL |
| NOTE1 | Clinical notes immutable | 8.1 / 8.1b | 🧪 API | | 2026-07-29 — curl in §8.1b |
| NOTE2 | Notes on episode for coordinator | 8.2 / 8.1b | 🧪 API | | API list works; UI pending |
| COSIGN | Clinical co-sign on care plan | 8.3 / 8.3b | 🧪 API | | 2026-07-29 — curl in §8.3b |
| GOAL1 | Goal marked achieved | 4.2 / 4.2b | 🧪 API | | 2026-07-29 — curl in §4.2b |
| AI1 | Summary row after episode | 6.1 / 6.1b / 6.4 | 🧪 API | | 2026-07-29 — draft row after review |
| AI2 | Coordinator sees summary | 6.1 / 6.2b | 🧪 API | | 2026-07-29 — GET + approve API; UI panel pending |
| AI3 | Draft + idempotent callback | 7.1 / 7.2 / 7.2b | 🧪 API | | 2026-07-29 — callback + upsert; trigger UI still pending |
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
