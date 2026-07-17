# Milestone 2 — Manual Visual Test Guide

Use this document to run the app locally and visually verify **M2 clinical work** as it ships.

**Last updated:** 2026-07-16  
**Companion doc:** `MILESTONE_TWO.md` (status tracker)  
**M1 tests:** `MILESTONE_ONE_TEST.md` (auth, orgs, audit — still valid; do not re-test unless auth regresses)

---

## How This Doc Is Maintained

> **Rule:** When a task in `MILESTONE_TWO.md` moves to **Done**, expand the matching flow below from `NOT READY` → full click-through steps so you can test it visually.

| M2 deliverable (tracker) | Test flow below | Status |
|---|---|---|
| Schema: CareUnit / IntakeRecord (Approach B) | **Flow 0** | ✅ READY (migrate + seed) |
| Care Unit + Intake APIs | **Flow M** | ✅ READY (curl / API) |
| Multi-step family onboarding | **Flow C** | ✅ READY (wizard UI) |
| Coordinator intake queue + review | **Flow D** | ✅ READY |
| Patient & Care Unit profiles | **Flow E** | ✅ READY |
| Care Episode lifecycle | **Flow B** (API) · **Flow F** (UI) | ✅ READY |
| Assessment schedule / report | **Flow G** | ✅ READY |
| S3 intake document uploads | **Flow H** | ✅ READY |
| Consent at intake | **Flow I** | ✅ READY |
| Shell live stats (SHELL-002) | **Flow J** | ✅ READY |
| Proposal portal 2FA (SHELL-003) | **Flow K** | ✅ READY |
| Tenant scoping (STUB-001) | **Flow L** | ✅ READY (M2 clinical APIs) |

**Ready to test today:** Flow 0, M, C, D, E, F, G, H, I, J, K, **L**, A, B — plus M1 regression spot-check.

---

## What Has Been Built (Summary)

| Area | What you can test now |
|---|---|
| **Role shells** | Family / Patient / Coordinator / Clinical / Support portals |
| **Care Unit + Intake APIs** | Submit → queue → structured review → episode (Flow M) |
| **Family onboarding wizard** | `/family/onboarding` — 8 steps → Submitted (Flow C) |
| **Coordinator intake queue** | `/coordinator/intake` — filters + chip review → episode (Flow D) |
| **Care Unit / Patient profiles** | `/coordinator/patients` + `/family/care-unit` (Flow E) |
| **Care Episodes UI** | `/coordinator/episodes` + `/family/episodes` (Flow F) |
| **Assessments** | Schedule from episode; `/clinical/schedule`; `/family/bookings` (Flow G) |
| **Intake documents** | Categorized upload in wizard + coordinator open (Flow H) |
| **Care Episodes API** | Create / list / update via curl (Flow B) |
| **State machine** | Illegal intake/episode transitions return `422` |
| **M1 foundations** | Auth, org admin, audit logs — use `MILESTONE_ONE_TEST.md` |

**Not ready yet:** E2E happy-path sign-off and staging deployment.

---

## 1. Prerequisites

Same as M1. Short version:

```bash
# Terminal 1 — API
cd server && npm run dev          # http://localhost:5001

# Terminal 2 — Client
cd client && npm run dev          # http://localhost:5173
```

Health: http://localhost:5001/api/health  

If seed logins say email not verified:

```sql
UPDATE users
SET "isEmailVerified" = true, "emailVerifiedAt" = NOW()
WHERE email LIKE '%@demo.com' OR email LIKE '%@riayahplus.com';
```

---

## 2. Seeded Test Accounts (M2 Roles)

All passwords: **`Password123!`**

| Role | Email | Primary M2 path |
|---|---|---|
| Family | `family@demo.com` | `/family` → `/family/onboarding` |
| Care Coordinator | `coordinator@riayahplus.com` | `/coordinator/intake` |
| Patient | `patient@demo.com` | `/patient` |
| Clinical Staff | `clinical@demo.com` | `/clinical/schedule` |
| Support Worker | `support@demo.com` | `/support` (empty OK for M2) |
| Admin | `admin@riayahplus.com` | `/admin` (audit after intake reviews) |

---

## 3. Full Visual Test Flows

Work through **Ready** flows now. Skip or mark **NOT READY** until the companion tracker says Done.

---

### Flow 0 — Apply M2 schema + seed demo Care Unit ✅ READY

**Goal:** Confirm migration and seed created Care Unit + clinical patient for family.

```bash
cd server
npx prisma migrate deploy
npm run db:seed
```

**Expected seed output includes lines like:**

- `Care Unit      : Demo Family Care Unit (...)`
- `Patient (CR)   : Demo Care Recipient / ref RP-DEMO-001`

**Optional Prisma Studio check:**

```bash
cd server && npx prisma studio
```

Open tables `care_units`, `care_recipients`, `intake_records` (empty until APIs/wizard land).

**Pass if:** migrate succeeds; seed prints Care Unit + recipient; no Prisma errors.

---

### Flow M — Care Unit + Intake APIs (submit → queue → review) ✅ READY

**Goal:** End-to-end clinical intake via API (UI comes later in Flows C–D).

```bash
# 1) Family login
curl -c /tmp/fam.txt -s -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"family@demo.com","password":"Password123!"}' | jq '{id: .user.id, role: .user.role}'

# 2) List care units (seed has Demo Family Care Unit)
curl -s -b /tmp/fam.txt http://localhost:5001/api/care-units | jq '{total, name: .data[0].name, id: .data[0].id}'

# 3) List patients on unit — replace UNIT_ID
curl -s -b /tmp/fam.txt http://localhost:5001/api/care-units/UNIT_ID/patients \
  | jq '{count: (.data|length), patient: .data[0].name, id: .data[0].id}'

# 4) Submit intake — replace UNIT_ID + PATIENT_ID
curl -s -b /tmp/fam.txt -X POST http://localhost:5001/api/intake \
  -H "Content-Type: application/json" \
  -d '{
    "careUnitId":"UNIT_ID",
    "careRecipientId":"PATIENT_ID",
    "reasonForCare":"Post-discharge mobility support needed at home",
    "medicalHistory":"Hypertension",
    "diagnoses":["I10"],
    "serviceInterests":["physiotherapy"],
    "urgencyLevel":"high"
  }' | jq '{id: .data.id, status: .data.status}'

# 5) Coordinator queue
curl -c /tmp/coord.txt -s -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' >/dev/null

curl -s -b /tmp/coord.txt 'http://localhost:5001/api/coordinator/intake-queue?status=submitted' \
  | jq '{total, first: .data[0].id}'

# 6) Structured review → episode_created (replace INTAKE_ID)
curl -s -b /tmp/coord.txt -X POST http://localhost:5001/api/intake/INTAKE_ID/review \
  -H "Content-Type: application/json" \
  -d '{
    "keyConcerns":["falls risk"],
    "urgencyIndicators":["recent_discharge"],
    "suggestedServiceCategories":["physiotherapy"],
    "riskFlags":["falls"],
    "createEpisode":true
  }' | jq '{intakeStatus: .data.intake.status, episodeId: .data.episode.id}'
```

**Expected:**

- Submit → `status: submitted`
- Queue total ≥ 1
- Review → `intakeStatus: episode_created` + episode id
- Missing guided fields → **422**
- Second open intake for same patient → **409**

**Pass if:** Full path succeeds without 500s.

---

### Flow A — M2 shell map + placeholders ✅ READY

**Goal:** Confirm M2 navigation exists and placeholders do not crash (baseline before wiring APIs).

1. Log in as `family@demo.com` at http://localhost:5173/login?portal=family  
   - **Expected:** `/family` — sidebar: Dashboard, Care Plans, Bookings, Documents, Messages  
   - Dashboard stats load live counts (Flow J)  
2. Click each sidebar item — pages load (placeholder copy OK)  
3. Log out → login as `coordinator@riayahplus.com` at `/login?portal=coordinator`  
   - **Expected:** `/coordinator` — sidebar includes **Intake Queue** → `/coordinator/intake`  
4. Open Intake Queue — **placeholder only** (not the AI demo at `/demo/coordinator/*`)  
5. Spot-check `/patient`, `/clinical`, `/support` the same way  

**Pass if:** All M2 nav targets open without errors; Intake Queue is the real shell route, not the AI demo.

**Do not treat as pass:** AI intake at http://localhost:5173/demo/coordinator/intake — that is **out of M2 scope**.

---

### Flow B — Care Episode API (create → review statuses) 🟡 READY (API)

**Goal:** Verify episode backend before the coordinator UI exists.

```bash
# 1) Login as coordinator
curl -c /tmp/coord.txt -s -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"coordinator@riayahplus.com","password":"Password123!"}' | jq '{id: .user.id, role: .user.role}'

# 2) Get a patient/family user id (use family seed)
curl -c /tmp/fam.txt -s -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"family@demo.com","password":"Password123!"}' | jq '{id: .user.id}'

# 3) Create episode (replace PATIENT_ID)
curl -b /tmp/coord.txt -s -X POST http://localhost:5001/api/episodes \
  -H "Content-Type: application/json" \
  -d '{
    "patientId":"PATIENT_ID",
    "title":"M2 Test Intake",
    "urgencyLevel":"medium",
    "reasonForCare":"Mobility support after discharge",
    "medicalHistory":"Hypertension",
    "currentMeds":"Amlodipine 5mg",
    "diagnoses":["I10"],
    "serviceInterests":["physiotherapy"]
  }' | jq '{id: .data.id, status: .data.status}'

# Expected: status intake_submitted (or Submitted mapping)

# 4) List episodes
curl -b /tmp/coord.txt -s 'http://localhost:5001/api/episodes?limit=5' | jq '{total: .total, first: .data[0].title}'

# 5) Move to under_review (replace EPISODE_ID)
curl -b /tmp/coord.txt -s -X PATCH http://localhost:5001/api/episodes/EPISODE_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"under_review","intakeSummary":{"keyConcerns":["falls risk"]}}' | jq '{status: .data.status}'

# 6) Illegal jump (should fail)
curl -b /tmp/coord.txt -s -X PATCH http://localhost:5001/api/episodes/EPISODE_ID \
  -H "Content-Type: application/json" \
  -d '{"status":"closed"}' | jq '{statusCode: .statusCode // .status, message}'
# If still under_review → closed may be allowed by matrix; try skipping to a blocked state
# Better illegal check from intake_submitted → active if your matrix forbids it:
# create a fresh episode and PATCH status to "active" without going through review

# 7) Submit / validate intake
curl -b /tmp/coord.txt -s -X POST http://localhost:5001/api/episodes/EPISODE_ID/submit-intake \
  -H "Content-Type: application/json" \
  -d '{}' | jq '{status: .data.status}'
```

**Pass if:** Create works; list returns the episode; valid transitions succeed; invalid transitions return **422**.

**When UI ships:** Promote steps into Flow F (visual).

---

### Flow C — Family multi-step clinical onboarding ✅ READY

**Goal:** Family completes the 8-step wizard and lands on Submitted intake.

**Path:** http://localhost:5173/family/onboarding  
(Also: Family dashboard → **Start clinical onboarding**, or sidebar **Onboarding**)

**Steps:**

1. Login as `family@demo.com` / `Password123!` at `/login?portal=family`
2. Open http://localhost:5173/family/onboarding
3. Complete each step:
   - Care Unit (pre-filled from seed if present)
   - Patient profile
   - Primary caregiver
   - Reason for care
   - Medical history / meds / **coded diagnoses** (required)
   - Urgency
   - Service interests
   - Docs notes + Privacy & Treatment consents  
     *(File binary upload still Flow H — notes + consents are enough to submit)*
4. Click **Submit intake**
5. **Expected:** Success screen with status **Submitted** and an intake ID
6. As coordinator, confirm it appears in queue (**Flow D** or Flow M step 5)

**If you see "open intake already exists":** previous test left a `submitted`/`under_review` intake for that patient — review it as coordinator first, or clear via Flow M prep.

**Pass if:** Wizard completes; confirmation shows Submitted; no crash.

---

### Flow D — Coordinator intake queue + structured review ✅ READY

**Goal:** Coordinator filters queue and submits a **structured** (not free-text-only) review.

**Path:** http://localhost:5173/coordinator/intake

**Steps:**

1. Have at least one **Submitted** intake (Flow C)  
2. Login as `coordinator@riayahplus.com` / `Password123!` at `/login?portal=coordinator`  
3. Open **Intake Queue** (sidebar) → `/coordinator/intake`  
4. Filter by **status** (default Submitted) and **urgency** — list updates  
5. Click a row → detail shows patient, family, reason, diagnoses, history  
6. Optional: **Start review** (marks under review)  
7. Fill structured chips:  
   - Key concerns *  
   - Urgency indicators *  
   - Suggested services *  
   - Risk flags (optional)  
8. Leave **Create care episode** checked → **Submit structured review**  
9. **Expected:** Toast success; status becomes **episode created**; filters show it under that status  
10. Optional: Admin → Audit Logs — look for `intake_reviewed`

**Negative check:** Try submitting with no chips selected → toast/validation blocks it.

**Pass if:** Filters work; guided fields required; episode created on success.

---

### Flow E — Patient & Care Unit profiles ✅ READY

**Goal:** View and edit Care Unit / Patient profiles; see linked episodes and edit history.

**Paths:**

- Coordinator: http://localhost:5173/coordinator/patients  
- Family: http://localhost:5173/family/care-unit  

**Steps:**

1. Login as `coordinator@riayahplus.com` / `Password123!`  
2. Open **Patients** → see Care Units (patient / intake / episode counts)  
3. Open a care unit → details + patient list; optional **Edit care unit** → Save  
4. Open a patient → DOB, POC, diagnoses, linked episodes + intakes  
5. **Edit profile** → change a field → Save → refresh persists  
6. Confirm **Edit history** shows a new revision snapshot  
7. Login as `family@demo.com` → **Care Unit** nav → same unit/patient (scoped to family)

**Pass if:** List/detail/edit works; revisions appear after save; episodes visible when linked.

---

### Flow F — Care Episode lifecycle (UI) ✅ READY

**Goal:** Visual status path and coordinator-driven transitions.

**Paths:**

- Coordinator: http://localhost:5173/coordinator/episodes  
- Family: http://localhost:5173/family/episodes  

**Steps:**

1. Have at least one episode (Flow D review with create episode, or Flow B API)  
2. Login as `coordinator@riayahplus.com` → **Episodes**  
3. Filter by status → open an episode  
4. Confirm **Lifecycle** stepper + clinical summary + timeline  
5. Click an allowed **Advance status** button (e.g. validated → active)  
6. Login as `family@demo.com` → **Episodes** → same episode shows updated badge (read-only, no advance buttons)  
7. Optional: open patient profile → linked episode navigates to detail  

**Negative check:** Illegal status not shown as a button; API still returns 422 if forced.

**Pass if:** Badges match API; transitions respect state machine; family is read-only.

---

### Flow G — Assessment schedule / complete / report ✅ READY

**Goal:** Assessment linked to Care Episode through HealthOS §8.1 path.

**Paths:**

- Coordinator: schedule from episode detail (`/coordinator/episodes/:id`)  
- Clinical: http://localhost:5173/clinical/schedule  
- Family: http://localhost:5173/family/bookings  

**Steps:**

1. Open a care episode as `coordinator@riayahplus.com`  
2. Under **Assessments** → pick clinician (`clinical@demo.com`), type, date/time → **Schedule assessment**  
3. Login as `clinical@demo.com` / `Password123!` → **Schedule**  
4. Open the scheduled row → fill findings (mobility/pain/summary) + recommendations (or report URL) → **Mark completed**  
5. Back on episode detail → assessment shows status **completed**  
6. Family (`family@demo.com`) → **Bookings** → sees the assessment (read-only)

**Negative check:** Completing without findings → 422 toast.

**Pass if:** Assessment always has `episodeId`; complete requires structured findings + report/recommendations.

---

### Flow H — S3 categorized intake documents ✅ READY

**Goal:** Upload referral / prior assessment / insurance docs during intake.

**Paths:** Family wizard step 8 (`/family/onboarding`) · Coordinator intake detail

**Steps:**

1. Login as `family@demo.com` → `/family/onboarding`  
2. Reach **Docs & consent** step  
3. Pick a category (`referral`, `prior_assessment`, `insurance`, …) and upload PDF/image  
4. Confirm file appears in the uploaded list  
5. Tick Privacy + Treatment → **Submit intake**  
6. Login as coordinator → Intake Queue → open that intake  
7. **Intake documents** section lists files → **Open** downloads/views  

**Notes:** With AWS credentials set, upload uses S3 signed PUT. Without credentials, files store under `server/uploads/intake/` (local fallback).

**Pass if:** Files persist with category; coordinator can open them.

---

### Flow I — Consent at intake ✅ READY

**Goal:** Privacy + Treatment consents write immutable `Consent` + `ConsentLog` on submit; coordinator sees them on intake detail.

**Prereq:** Flow C (wizard) + coordinator login.

1. Login `family@demo.com` → `/family/onboarding`  
2. Complete wizard; on **Docs & consent** leave Privacy/Treatment unchecked → **Submit blocked**  
3. Tick Privacy + Treatment → submit  
4. **Expected API:** `POST /api/intake` without `privacyConsent: true` / `treatmentConsent: true` → **422**  
5. Login `coordinator@riayahplus.com` → `/coordinator/intake` → open the new intake  
6. **Expected:** **Consents** panel shows `privacy` + `treatment`, version `1.0.0-intake`, granted time (+ IP if available)  
7. Optional DB check: `ConsentLog` rows for that family user with both types  

**Pass if:** Cannot submit without required consents; ConsentLog written; coordinator sees consents (no silent defaults).

---

### Flow J — Shell live stats (SHELL-002) ✅ READY

**Goal:** Role shell dashboard cards show real numbers from APIs (not `—`).

1. Login `family@demo.com` → `/family`  
2. **Expected:** Active episodes / Upcoming visits / Unread alerts are numbers (refresh updates them)  
3. Login `coordinator@riayahplus.com` → `/coordinator`  
4. **Expected:** Pending intake ≥ submitted+under_review count (seed currently ≥ 1)  
5. Optional: clinical `/clinical`, patient `/patient`, support `/support` — cards load without `—`  

**Pass if:** Numbers reflect live API data; Refresh reloads counts.

---

### Flow K — Proposal portal 2FA (SHELL-003) ✅ READY

**Goal:** Family / patient / coordinator / clinical / support portals prompt for TOTP when 2FA is enabled.

**Prereq:** Enable 2FA for a portal user (e.g. `family@demo.com`) via Security settings or:
`POST /api/auth/2fa/enable` → confirm with TOTP → `POST /api/auth/2fa/confirm`.

1. Log out → open http://localhost:5173/family (or `/login?portal=family`)  
2. Enter email/password  
3. **Expected:** 6-digit code step (not a toast-only `2FA_REQUIRED` error)  
4. Wrong code → error, stay on 2FA step  
5. Correct authenticator code → land on `/family`  
6. Optional: repeat for `/coordinator`, `/clinical`, `/patient`, `/support`  

**Pass if:** Code step works; wrong code fails; correct code logs in to the matching portal.

---

### Flow L — Tenant scoping (STUB-001) ✅ READY

**Goal:** Admin/coordinator lists do not leak other orgs’ patients/episodes.

**Seeded test accounts (password `Password123!`):**

- Tenant A: `coordinator@riayahplus.com`
- Tenant B: `coordinator.b@riayahplus.com`

1. Login as Tenant A → `GET /api/episodes`, `/api/care-units`, `/api/assessments`, `/api/care-plans`  
2. Login as Tenant B → repeat those list requests  
3. **Expected:** Every returned row belongs only to the logged-in organization  
4. As Tenant B, request a Tenant A episode/assessment/care plan by ID  
5. **Expected:** `403 Forbidden`  
6. `super_admin` remains the intentional all-tenant bypass; an org-assigned `admin` is scoped

**Pass if:** Cross-tenant lists are empty and direct foreign-ID access is denied.

---

## 4. End-to-End Happy Path (When C–G Ready)

Run this full story for client demo:

| Step | Actor | Action | Expected |
|---|---|---|---|
| 1 | Family | Complete wizard + upload + consents | Intake **Submitted** |
| 2 | Coordinator | Queue → filter → structured review | **Validated** + AuditLog |
| 3 | System | Episode created / active | Visible on family + coordinator |
| 4 | Coordinator / Family | Schedule assessment | Status **scheduled** |
| 5 | Clinical | Complete assessment + report | Linked on episode |
| 6 | Family | Open Documents / Appointments | Sees uploads + assessment booking |

**Overall pass if:** Table completes without API 500s or placeholder dead-ends on these paths.

---

## 5. API-Only Checks (As Endpoints Ship)

### Episodes (available now — Flow B)

```bash
curl -b /tmp/coord.txt http://localhost:5001/api/episodes
```

### Intake queue (add when built)

```bash
curl -b /tmp/coord.txt 'http://localhost:5001/api/coordinator/intake-queue?status=intake_submitted'
```

### Intake review (add when built)

```bash
curl -b /tmp/coord.txt -X POST http://localhost:5001/api/intake/INTAKE_ID/review \
  -H "Content-Type: application/json" \
  -d '{
    "keyConcerns":["mobility"],
    "urgencyIndicators":["recent_fall"],
    "suggestedServiceCategories":["physiotherapy"],
    "riskFlags":["falls"]
  }'
```

### Assessments (add when built)

```bash
curl -b /tmp/coord.txt -X POST http://localhost:5001/api/assessments \
  -H "Content-Type: application/json" \
  -d '{"episodeId":"EPISODE_ID","patientId":"PATIENT_ID","assessorId":"CLINICAL_USER_ID","type":"initial","scheduledAt":"2026-07-20T09:00:00.000Z"}'
```

---

## 6. What You Should See vs Placeholder

| Feature | Real / working | Placeholder / not yet |
|---|---|---|
| CareUnit / IntakeRecord schema | ✅ migrate `20260714_m2_care_unit_intake` | |
| Intake status machine | ✅ unit tested | |
| Seed Care Unit + CareRecipient | ✅ after `db:seed` | |
| 6 role shells + M2 nav | ✅ | |
| Care Unit + Intake APIs | ✅ Flow M | |
| Family clinical wizard | ✅ `/family/onboarding` | Binary S3 = Flow H |
| `/coordinator/intake` queue + review | ✅ filters, chips, episode link | |
| Care Episode API | ✅ Flow B | |
| Episode lifecycle UI | ✅ `/coordinator/episodes` · `/family/episodes` | |
| Episode status machine | ✅ | |
| Patient / Care Unit profile UI | ✅ `/coordinator/patients` · `/family/care-unit` | |
| Assessment API + UI | ✅ `/api/assessments` · clinical schedule · family bookings | |
| Categorized S3 intake uploads | ✅ wizard + `/api/intake/documents` | Local fallback if no AWS |
| ConsentLog at intake | | ✅ Consent + ConsentLog + coordinator panel |
| Live shell stats | | Shows `—` |
| Proposal portal 2FA | | ⏳ |
| AI demo intake | ❌ out of scope | Do not demo as M2 |

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| Episode create 403 | Must be `care_coordinator` (or admin if allowed) — use coordinator seed |
| Episode create 400 on patientId | Use real user id from family login response |
| Status PATCH 422 | Illegal transition — check `stateMachine.ts` allowed next states |
| Intake Queue empty forever | No **Submitted** intakes — run Flow C (or Flow M). Filter may be set to Submitted while all are `episode_created` → switch to All statuses |
| Confused by AI intake UI | You’re on `/demo/coordinator/*` — use `/coordinator/intake` instead |
| Email not verified | SQL update in §1 |
| Client can’t reach API | API `:5001`, Vite proxy → 5001 |

---

## 8. Suggested Test Order (Today vs Later)

### Today (~25–35 min)

1. Start servers + health check  
2. **Flow 0** — migrate + seed (if not already)  
3. **Flow C** — family wizard → Submitted  
4. **Flow D** — coordinator queue → structured review → episode  
5. **Flow E** — patients / care unit profiles + edit history  
6. **Flow F** — episodes list/detail + coordinator status advances  
7. **Flow G** — schedule assessment → clinical complete → family bookings  
8. **Flow H** — categorized docs on wizard → coordinator open  
9. Optional: **Flow M** API path; **Flow A** shells; **Flow B** episode list  

### After each M2 feature ships

1. Unlock the matching flow (I–L)  
2. Run that flow visually  
3. Tick **Pass** in §9  
4. Update `MILESTONE_TWO.md` status %  

---

## 9. Pass / Fail Log

| # | Flow | Ready? | Pass | Fail | Notes |
|---|---|---|---|---|---|
| 0 | Schema migrate + seed Care Unit | ✅ | | | |
| M | Care Unit + Intake APIs | ✅ | | | |
| A | Shell map + placeholders | ✅ | | | |
| B | Care Episode API | ✅ | | | |
| C | Family onboarding wizard | ✅ | | | `/family/onboarding` |
| D | Coordinator queue + review UI | ✅ | | | `/coordinator/intake` |
| E | Patient / Care Unit profile UI | ✅ | | | `/coordinator/patients` · `/family/care-unit` |
| F | Episode lifecycle UI | ✅ | | | `/coordinator/episodes` · `/family/episodes` |
| G | Assessments | ✅ | | | schedule → `/clinical/schedule` · `/family/bookings` |
| H | S3 categorized docs | ✅ | | | wizard step 8 · coordinator open |
| I | Intake consents | ✅ | | | Consent + ConsentLog on submit · coordinator panel |
| J | Live shell stats | ✅ | | | `/family` · `/coordinator` · other shells |
| K | Proposal portal 2FA | ✅ | | | `/login?portal=family` (+ other portals) |
| L | Tenant scoping | ✅ | | | episodes · care units · assessments · care plans |
| E2E | Happy path §4 | ⏳ | | | |

---

## 10. Report Back

After each testing session, note:

- Which flows passed / failed  
- Screenshots for client (wizard, queue, review, assessment)  
- Blockers (S3 credentials, schema decision CareUnit vs CareRecipient, etc.)

Then continue the next unchecked item in `MILESTONE_TWO.md` Suggested Build Order.
