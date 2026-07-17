# Milestone 2 — Onboarding, Patient Management & Assessments

**Budget:** $600 | **Week:** 2  
**Status:** ~90% complete (through Flow H intake documents)  
**Last updated:** 2026-07-16

> Source of truth for deliverables: `Riayah_Plus_Proposal_v2.pdf` § M2  
> Implementation guidance: `MILESTONE_SPECS.md` § M2 · `Riayah_Plus_HealthOS_Specification.docx` §3.2–3.3, §8.1  
> Adaptive shell map: `client/src/config/proposalRoleShells.ts`  
> **Schema decision (Approach B):** `docs/superpowers/specs/2026-07-14-m2-care-unit-intake-schema-design.md` — **approved & migrated in repo**  
> **Not M2:** care plan builder, scheduling engine, clinical notes system (M3); telehealth / payments (M4); mobile / GPS (M5); Arabic-first landing; AI intake summarisation

---

## Context — Where We Are Coming From

### M1 outcome (submitted + revised)

M1 delivered **Foundation & Auth**: login/register, email verification, 2FA, sessions, refresh hashing, RBAC stubs, org hierarchy admin, 6-role adaptive shells, audit foundation, Prisma migrations.

Client auditor (**Karim Ashraf**, 10–11 Jul 2026) raised security + GDPR findings in:

| Doc | Purpose |
|---|---|
| `GDPR_M1.pdf` | GDPR compliance audit |
| `M1_GAPS.pdf` | Security / stub audit |
| `M1_REVISION_FIXES.md` | Fix checklist + status |
| `M1_REVISION_LOG.md` | Bugs fixed during live testing |
| `M2_M3_TEST_GUIDE.md` | Open tickets deferred past M1 |

Most CRITICAL/HIGH/MEDIUM code gaps were fixed in the M1 revision pass. Staging deploy remains the last formal M1 sign-off blocker and should be closed **before or at the start of** M2.

### Carry-forward into M2 (from `M2_M3_TEST_GUIDE.md`)

These are **not** the signed M2 clinical deliverables, but they must be closed while building M2 so multi-tenant clinical data is safe:

| Ticket | Priority | What |
|---|---|---|
| **STAGING** | 🔴 P0 | EC2 API + Vercel client smoke test |
| **STUB-001** | ✅ M2 clinical | Tenant-scoped episodes, care units/patients, assessments, care plans |
| **SHELL-003** | ✅ Done | 2FA step on `ProposalPortalLoginPage` |
| **SHELL-002** | ✅ Done | Live stats on role shell dashboards |
| **SHELL-006** | 🟢 P2 | Live admin badge counts |
| **STUB-004** | 🟢 P2 | State machine for Document / Invoice / Payout |
| **G2** | 🟡 P1 | “Request human review” UI (matching already returns `requiresReview: true`) |
| **GDPR G6–G12 / G14–G19** | Docs / ops | Client-content dependent — track but do not block clinical M2 |

---

## Signed Deliverable Status (Client Review)

| # | Deliverable | Status | Notes |
|---|---|---|---|
| 1 | Multi-step family onboarding flow (web) | **Done** ✅ | Wizard + categorized doc upload + ConsentLog on submit |
| 2 | Coordinator-led intake review workflow | **Done** ✅ | Queue + structured review UI at `/coordinator/intake` + API |
| 7 | Coordinator onboarding queue dashboard | **Done** ✅ | Live at `/coordinator/intake` — filters, detail, review summary chips |
| 3 | Patient & Care Unit profile management | **Done** ✅ | List/detail/edit UI + revisions at `/coordinator/patients` & `/family/care-unit` |
| 4 | Care Episode creation & lifecycle | **Done** ✅ | Created from intake review; list/detail + status transitions UI |
| 5 | Assessment scheduling, booking, reporting | **Done** ✅ | API + schedule from episode + clinical complete + family bookings |
| 6 | Document upload & management (S3) | **Done** ✅ | Categorized intake upload (S3 signed PUT or local fallback) + coordinator open |

---

## What M2 Must Deliver (Signed Proposal)

From `Riayah_Plus_Proposal_v2.pdf` Milestone 2:

1. Complete multi-step family onboarding flow (web)
2. Structured coordinator-led intake review workflow
3. Patient and Care Unit profile management
4. Care Episode creation and lifecycle management
5. Assessment scheduling, booking, and reporting system
6. Document upload and management (S3-backed)
7. Coordinator onboarding queue and review dashboard

### Technical requirements (proposal wording)

**Family onboarding form (multi-step):**

1. Care Unit creation  
2. Patient profile  
3. Primary caregiver details  
4. Reason for care  
5. Medical history, current medications, diagnoses  
6. Urgency level  
7. Service interest selection  
8. Document upload (referral letters, prior assessments, insurance) via S3 signed URLs  

**Intake record:** Immutable, timestamped, linked to family account.  
**Intake status:** `Submitted → Under Review → Validated → Episode Created`

**Coordinator review:**

- Queue with filters (status, urgency)
- Structured clinical summary: key concerns, urgency indicators, suggested service categories, risk flags
- Guided fields — not free text
- Every review action → AuditLog (reviewer, timestamp, summary)

**Patient & Care Unit:** Structured profiles, versioned edit history, multi-episode support per patient.

**Assessments:** Full scheduling, booking, reporting lifecycle linked to Care Episode.

---

## HealthOS Guidance — How to Build M2 Correctly

> HealthOS expands product vision. **Signed proposal wins** when they conflict. Use HealthOS for data shapes and UX patterns only.

| Topic | HealthOS ref | Build in M2? |
|---|---|---|
| Family onboarding pipeline | §3.2 Account → Patient → Intake → Reports → Consent → Assessment Booking | **Yes** — skip Arabic landing, skip AI summary |
| Consent at intake | §3.3 types + immutable metadata | **Yes** — Privacy + Treatment (+ Telehealth / Data Sharing / Media as applicable) |
| ICD-10 / coded diagnoses | §4.2 no free-text diagnoses | **Yes** — structured code entries on intake |
| Assessment flow | §8.1 Book → Assign → Session → Metrics → Report → Episode | **Yes** |
| Care Episode as parent | §10 every clinical record belongs to an episode | **Yes — non-negotiable** |
| Arabic-first / RTL landing | §3.1 | **No** — excluded §5.2 |
| AI intake summary | §3.2 / §9 | **No** — excluded §5.2 |
| Care plan builder / task engine | §4–6 | **No** — M3 |

**Intake pipeline to implement (manual / coordinator-led):**

```
Family Account
  → Care Unit + Patient profile
  → Medical intake form
  → Upload reports (S3)
  → Consent capture
  → Submit intake (Submitted)
  → Coordinator queue → Under Review
  → Structured review → Validated
  → Care Episode created / advanced
  → Assessment booking
```

**Assessment lifecycle (HealthOS §8.1):**

```
Booking Confirmed → Clinician Assigned → Session Completed
  → Structured Metrics Recorded → Clinical Report Generated → Linked to Care Episode
```

**Consent types at intake (minimum):**

| Type | When |
|---|---|
| Privacy Consent | Account / intake start |
| Treatment Consent | Before clinical data collection |
| Telehealth Consent | If telehealth interest selected |
| Data Sharing Consent | If external reports uploaded |
| Media Consent | Optional |

Immutable metadata: `documentVersion`, `timestamp`, `userId`, `deviceFingerprint`, `ipAddress`, `signatureStatus` (partially done in M1 ConsentController — extend at intake steps).

---

## Codebase Snapshot (M2 Starting Point)

| Area | Current state |
|---|---|
| Stack | `server/` Express + Prisma + PostgreSQL · `client/` Vite + React Router |
| Episodes API | `GET/POST /api/episodes`, `GET/PATCH /api/episodes/:id`, `POST /api/episodes/:id/submit-intake`, summary PDF |
| Care Unit / Intake APIs | ✅ `/api/care-units`, `/api/intake`, `/api/coordinator/intake-queue` |
| Assessment API | ✅ `/api/assessments` (+ clinicians list) |
| Care Unit / Patient models | ✅ `CareUnit` + extended `CareRecipient` (clinical Patient) |
| IntakeRecord | ✅ `IntakeRecord` + `IntakeStatus` + `assertIntakeTransition` |
| Family UI | ✅ `/family/onboarding` wizard; dashboard CTA live; other sub-pages mostly placeholders |
| Coordinator UI | ✅ `/coordinator/intake` queue + review; `/demo/coordinator/intake` = AI mock (**do not ship as M2**) |
| Clinical / Support / Patient shells | Same placeholder pattern |
| Unit tests | Intake state machine covered in `stateMachine.test.ts` |
| Local dev | API `:5001` · Client `:5173` · DB `riayah_plus` |

### Key existing files (extend, don’t reinvent)

| Key files | Path |
|---|---|
| Episode API | `server/src/controllers/patients/CareEpisodeController.ts` |
| Care Unit API | `server/src/controllers/patients/CareUnitController.ts` |
| Intake API | `server/src/controllers/patients/IntakeController.ts` |
| Episode routes | `server/src/routes/episode.routes.ts` |
| Care Unit / Intake routes | `server/src/routes/careUnit.routes.ts`, `intake.routes.ts` |
| State machines | `server/src/utils/stateMachine.ts` (episode + **intake**) |
| Consent | `server/src/controllers/caremanagement/ConsentController.ts` |
| Storage / S3 | `server/src/routes/storage.routes.ts`, `DocumentController` |
| Role shells | `client/src/config/proposalRoleShells.ts` |
| Family wizard | `client/src/pages/family/FamilyOnboardingPage.tsx` |
| Coordinator queue | `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx` |
| Care Unit / Patient profiles | `client/src/pages/care/CareUnitListPage.tsx`, `CareUnitDetailPage.tsx`, `CarePatientDetailPage.tsx` |
| Episode list/detail | `client/src/pages/care/EpisodeListPage.tsx`, `EpisodeDetailPage.tsx` |
| Episode client API | `client/src/lib/api/episodes.ts` |
| Intake client API | `client/src/lib/api/intake.ts` |
| Shell pages | `client/src/pages/roles/RoleShellDashboard.tsx`, `RoleShellPlaceholder.tsx` |
| Routes | `client/src/routes/ProposalRoleRoutes.tsx` |
| Schema | `CareUnit`, `IntakeRecord`, `CareEpisode`, `Assessment`, `CareRecipient`, `Consent`, `Document` |
| Migration | `server/prisma/migrations/20260714_m2_care_unit_intake/` |

### Schema mapping decision (RESOLVED — Approach B)

| Proposal concept | Model | Status |
|---|---|---|
| Care Unit | `CareUnit` | ✅ Migrated (`20260714_m2_care_unit_intake`) |
| Patient | `CareRecipient` (+ `careUnitId`) | ✅ Extended |
| IntakeRecord | `IntakeRecord` | ✅ Migrated + intake state machine |
| Care Episode | `CareEpisode` | ✅ Extended with `careUnitId` / `organizationId` |
| Assessment | `Assessment` | Model only — routes later |

**Apply locally:**

```bash
cd server && npx prisma migrate deploy && npm run db:seed
```

**Status mapping:** Intake uses `submitted → under_review → validated → episode_created`. Episode keeps `intake_submitted / under_review / validated / active / …`. When intake hits `episode_created`, set episode to at least `validated`.

---

## Done (Already Usable for M2)

### Backend (partial foundations)

- [x] `CareUnit` + `IntakeRecord` + `CareRecipientRevision` models (migration `20260714_m2_care_unit_intake`)
- [x] `CareRecipient` extended (`careUnitId`, coded `diagnosisCodes`, POC, `externalRef`)
- [x] Intake status machine (`assertIntakeTransition`)
- [x] Seed: Demo Family Care Unit + Demo Care Recipient (`RP-DEMO-001`)
- [x] `CareEpisode` model with intake-ish fields (`reasonForCare`, `medicalHistory`, `diagnoses[]`, `serviceInterests`, `urgencyLevel`, `intakeSummary`)
- [x] Episode CRUD + `submitIntake` endpoint
- [x] Care episode transition guards (`assertCareEpisodeTransition`)
- [x] `Assessment` Prisma model with `episodeId` FK
- [x] `CareRecipient`, `ClientProfile`, `FamilyMember` models
- [x] `Consent` + `ConsentLog` with audit metadata (M1 revision)
- [x] Document / storage signed-URL scaffolding
- [x] Audit middleware on mutating `/api` routes
- [x] Auth + proposal role shells from M1
- [x] Seed users for family / patient / coordinator / clinical / support

### Frontend (shells only)

- [x] `/family`, `/patient`, `/coordinator`, `/clinical`, `/support` adaptive shells
- [x] Nav items that match M2 surfaces (Family: Care Plans/Bookings/Documents; Coordinator: Intake Queue / Patients / Plans)
- [x] Placeholder pages ready to replace with real flows

---

## Left To Do (M2 Build Plan)

### 🔴 P0 — Prerequisites & architecture (Days 1–2)

| Item | Why |
|---|---|
| ~~Decide Care Unit / Patient / IntakeRecord mapping + migration~~ | ✅ Done — Approach B |
| Finish **staging deploy** smoke test (if still open) | M1 sign-off; stable env for client demos |
| ~~Apply **STUB-001** on M2 episode/patient/assessment/care-plan APIs~~ | ✅ Org-scoped lists + direct-ID access checks |
| ~~Align intake status machine to proposal wording~~ | ✅ `assertIntakeTransition` in `stateMachine.ts` |

### 🔴 P0 — Backend clinical core (Days 2–4)

| Item | Details |
|---|---|
| ~~**CareUnit CRUD**~~ | ✅ `GET/POST/PATCH /api/care-units` |
| ~~**Patient (CareRecipient) CRUD**~~ | ✅ `/api/care-units/:id/patients` + revisions |
| ~~**Multi-step intake API**~~ | ✅ `POST /api/intake` (immutable submit) |
| ~~**Intake state machine**~~ | ✅ + `PATCH /api/intake/:id/status` |
| ~~**Coordinator review endpoint**~~ | ✅ `POST /api/intake/:id/review` |
| ~~**Intake queue API**~~ | ✅ `GET /api/coordinator/intake-queue` |
| ~~**Assessment API**~~ | ✅ schedule / complete / cancel; findings + report/recommendations required |
| ~~**S3 intake uploads**~~ | ✅ Categories + `/api/intake/documents` (S3 or local) |
| **Consent at intake steps** | ✅ Privacy + Treatment required on submit → `Consent` + `ConsentLog` (`1.0.0-intake`); coordinator detail panel |
| ~~**ICD-10 / coded diagnoses**~~ | ✅ Required `diagnoses[]` on intake submit |
| ~~**AuditLog**~~ | ✅ submit / review / care unit / patient mutations |


### 🟡 P1 — Frontend clinical flows (Days 3–6)

| Item | Details |
|---|---|
| ~~**Family onboarding wizard**~~ | ✅ `/family/onboarding` (8 steps → submit) |
| ~~**Document upload UI**~~ | ✅ Wizard categorized upload + coordinator open |
| ~~**Coordinator intake queue**~~ | ✅ `/coordinator/intake` — filters + structured review + chip summary |
| ~~**Patient / Care Unit profiles**~~ | ✅ `/coordinator/patients` · `/family/care-unit` — edit + revision history |
| ~~**Episode lifecycle views**~~ | ✅ `/coordinator/episodes` · `/family/episodes` — stepper + transitions |
| ~~**Assessment booking UI**~~ | ✅ episode schedule · `/clinical/schedule` · `/family/bookings` |
| **Wire shell dashboards (SHELL-002)** | ✅ Live counts via `shellStats.ts` (intake / episodes / assessments / notifications) |
| **Proposal portal 2FA (SHELL-003)** | ✅ Same pattern as admin/provider — `complete2faLogin` on proposal portals |

### 🟢 P2 — Polish & deferred audit (as capacity)

| Item | Details |
|---|---|
| Admin live badges (SHELL-006) | Unread / pending counts |
| Expand state machine (STUB-004) | Document / Invoice / Payout — soft dependency for M3/M4 |
| G2 “Request human review” UI | Matching flow affordance |
| Mobile deep links (SHELL-007) | Optional; primary in M5 |
| Seed rich clinical demo data | 2–3 sample intakes across statuses for client demo |

---

## Frontend Surface Map (Wire These Placeholders)

From `proposalRoleShells.ts` — M2 owns filling these routes:

### Family `/family`

| Nav | Path | M2 work |
|---|---|---|
| Dashboard | `/family` | CTA → Start clinical onboarding |
| **Onboarding** | `/family/onboarding` | ✅ 8-step wizard |
| **Care Unit** | `/family/care-unit` | ✅ Unit + patient profiles + edit history |
| **Episodes** | `/family/episodes` | ✅ List/detail + status badge (read-only) |
| Care Plans | `/family/care-plans` | **Read-only / empty state** until M3 |
| Bookings | `/family/bookings` | ✅ Assessment list (read-only) |
| Documents | `/family/documents` | Intake uploads + list |
| Messages | `/family/messages` | Placeholder OK (M4) |

### Patient `/patient`

| Nav | Path | M2 work |
|---|---|---|
| Dashboard | `/patient` | Care plan status / next appointment / docs (real where available) |
| My Care Plan | `/patient/care-plan` | Empty / locked until M3 |
| Appointments | `/patient/appointments` | Assessment appointments |
| Documents | `/patient/documents` | View shared docs |
| Messages | `/patient/messages` | Placeholder OK (M4) |

### Coordinator `/coordinator`

| Nav | Path | M2 work |
|---|---|---|
| Dashboard | `/coordinator` | Pending intake, active episodes, plans awaiting review (plans M3 → show 0) |
| **Intake Queue** | `/coordinator/intake` | ✅ Done — filters + structured review |
| Patients | `/coordinator/patients` | ✅ Care Unit list → patient profiles |
| **Episodes** | `/coordinator/episodes` | ✅ List/detail + advance status |
| Care Plans | `/coordinator/plans` | Placeholder until M3 |
| Messages | `/coordinator/messages` | Placeholder OK (M4) |

### Clinical `/clinical`

| Nav | Path | M2 work |
|---|---|---|
| Schedule | `/clinical/schedule` | ✅ Assigned assessments → complete |
| Patients | `/clinical/patients` | Assigned episode patients |
| Session Notes | `/clinical/notes` | Light assessment notes only — full note system is M3 |
| Messages | `/clinical/messages` | Placeholder OK (M4) |

### Support `/support`

| Nav | Path | M2 work |
|---|---|---|
| Shifts / Tasks / Notes | `/support/*` | **Minimal** — empty states pointing to M3 delivery workflows |

---

## Suggested Build Order (1 Week)

1. ~~**Day 1** — Schema decision + migration~~ ✅ Approach B migrated  
2. ~~**Day 2** — Intake API + state machine + coordinator review + queue + audits~~ ✅  
3. ~~**Day 3** — Family multi-step onboarding wizard~~ ✅  
4. ~~**Day 4** — Coordinator intake queue + structured review UI~~ ✅  
5. ~~**Day 5a** — Patient/Care Unit profiles~~ ✅ · ~~**Day 5b** episode lifecycle UI~~ ✅  
6. ~~**Day 6a** — Assessment API + booking UI~~ ✅ · still open: shell live stats; proposal 2FA  
7. ~~**Day 7a** — Flow H S3 docs + Flow I ConsentLog~~ ✅ · remaining: seed polish, E2E demo script, Flow J/K/L  
*(Still open from earlier days: STUB-001 broader tenantWhere, staging deploy)*  

---

## Explicitly Out of Scope (Do Not Add in M2)

| Item | Reason |
|---|---|
| Arabic-first / RTL landing | Proposal §5.2 — no localization |
| AI intake summary / AI risk flags | Proposal §5.2 — excluded; do **not** productize `/demo/coordinator` AI intake |
| Care plan builder + family approval | M3 |
| Staff availability / recurring scheduling engine | M3 |
| Support worker task/GPS delivery | M3 / M5 |
| Telehealth video | M4 |
| Invoicing / Qatari payments | M4 |
| Secure messaging Socket.io productization | M4 |
| React Native app | M5 |
| Employee HR module | Additions — not signed M2 |
| GDPR ROPA / DPO docs (G6–G7) | Client-provided content — track separately |

---

## Acceptance Criteria (Demo Script)

A client reviewer should be able to:

1. Log in as `family@demo.com` → complete multi-step clinical onboarding → submit intake → see status **Submitted**  
2. Log in as `coordinator@riayahplus.com` → open **Intake Queue** → filter by urgency → open submission → fill structured review → status **Validated** / episode created  
3. See AuditLog entries for submit + review  
4. Upload at least one categorized document to the intake  
5. Create / schedule an **Assessment** linked to the episode; clinical (or coordinator) completes it with findings + report URL  
6. View Patient / Care Unit profile with the episode listed  
7. Confirm proposal role shells no longer show only `—` for M2-relevant stats  

---

## Pass / Fail Checklist

| # | Check | Pass | Fail |
|---|---|---|---|
| M2-A | Family multi-step onboarding (all 8 proposal steps) | | |
| M2-B | Immutable intake record + status machine | | |
| M2-C | Coordinator queue filters (status, urgency) | | |
| M2-D | Structured review form (no free-text-only) + AuditLog | | |
| M2-E | Patient + Care Unit profiles + edit history | | |
| M2-F | Care Episode lifecycle (create → review → validated/active) | | |
| M2-G | Assessment schedule / complete / report linked to episode | | |
| M2-H | S3 categorized document upload at intake | | |
| M2-I | Consent captured at intake with metadata | | |
| M2-J | Coded diagnoses (not free text only) | | |
| M2-K | STUB-001 tenant-scoped episode/patient lists | ✅ | |
| M2-L | SHELL-002 live shell stats for intake/episodes | ✅ | |
| M2-M | SHELL-003 proposal portal 2FA login | ✅ | |
| M2-N | Staging smoke (if not already signed off) | | |

---

## Test Credentials

After `npm run db:seed` in `server/`:

| Role | Email | Password | Primary M2 path |
|---|---|---|---|
| Family | `family@demo.com` | `Password123!` | `/family` → onboarding / intake |
| Care Coordinator | `coordinator@riayahplus.com` | `Password123!` | `/coordinator/intake` |
| Patient | `patient@demo.com` | `Password123!` | `/patient` |
| Clinical Staff | `clinical@demo.com` | `Password123!` | `/clinical/schedule` |
| Support Worker | `support@demo.com` | `Password123!` | `/support` (empty OK) |
| Admin | `admin@riayahplus.com` | `Password123!` | `/admin` (orgs / audit) |

> If login returns "Email not verified":  
> `UPDATE users SET "isEmailVerified" = true WHERE email LIKE '%@demo.com' OR email LIKE '%@riayahplus.com';`

---

## Local Run Commands

```bash
# PostgreSQL + Redis must be running first

# Terminal 1 — API
cd server && npm run dev          # http://localhost:5001

# Terminal 2 — Client
cd client && npm run dev          # http://localhost:5173
```

---

## Related Docs

| Question | File |
|---|---|
| Signed M2 wording | `Riayah_Plus_Proposal_v2.pdf` § Milestone 2 |
| Full M2/M3 specs | `MILESTONE_SPECS.md` § M2 |
| HealthOS onboarding / consent / assessments | `Riayah_Plus_HealthOS_Specification.docx` §3.2–3.3, §8.1 |
| Role shell nav map | `client/src/config/proposalRoleShells.ts` |
| **M2 manual visual tests** | **`MILESTONE_TWO_TEST.md`** — expand the matching flow when a deliverable is marked Done |
| M1 tracker (complete) | `MILESTONE_ONE.md` |
| M1 revision status | `M1_REVISION_FIXES.md`, `M1_REVISION_LOG.md` |
| Open audit tickets | `M2_M3_TEST_GUIDE.md` |
| M1 manual test guide | `MILESTONE_ONE_TEST.md` |

---

## Progress Log

| Date | Update |
|---|---|
| 2026-07-14 | M2 tracker created post-M1 revision submission. Est. ~25% from existing episode schema/API + shells. |
| 2026-07-14 | **Approach B approved.** Migration `20260714_m2_care_unit_intake` + `CareUnit` / `IntakeRecord` / revisions + intake state machine + family seed. |
| 2026-07-14 | **Care Unit + Intake APIs live.** Queue/review smoke-tested → `episode_created`. Next: family wizard + coordinator intake UI. |
| 2026-07-14 | **Flow C wizard live** at `/family/onboarding` (8 steps → submit intake). Next: Flow D coordinator queue UI. |
| 2026-07-14 | **Flow D live** at `/coordinator/intake` — status/urgency filters + structured review → episode. Review summary shows chips (not raw JSON). Next: Flow E profiles. |
| 2026-07-14 | **Flow E live** — `/coordinator/patients` + `/family/care-unit` (list → unit → patient, edit + revisions). Next: Flow F episode UI. |
| 2026-07-14 | **Flow F live** — `/coordinator/episodes` + `/family/episodes` (stepper, timeline, coordinator transitions). Next: Flow G assessments. |
| 2026-07-15 | **Flow G live** — `/api/assessments` + schedule from episode + `/clinical/schedule` complete + `/family/bookings`. Next: Flow H S3 docs. |
| 2026-07-16 | **Flow H live** — categorized intake docs via `/api/intake/documents` (S3 signed PUT or local fallback) + wizard + coordinator open. Next: Flow I ConsentLog. |
| 2026-07-16 | **Flow I live** — Privacy + Treatment required on `POST /api/intake` → Consent + ConsentLog (`1.0.0-intake`); coordinator intake detail shows Consents panel. Next: Flow J shell live stats. |
| 2026-07-16 | **Flow J live** — `RoleShellDashboard` loads live stats (family/coordinator/clinical/patient/support) via existing list APIs; fixed notifications unread-count path. Next: Flow K portal 2FA. |
| 2026-07-16 | **Flow K live** — `ProposalPortalLoginPage` 2FA step (catch `TwoFactorRequiredError` → TOTP → `complete2faLogin`). Next: Flow L tenant scoping. |
| 2026-07-17 | **Flow L live** — tenant-scoped episodes, care units/patients, assessments and care plans; direct foreign IDs return 403; second-org fixtures smoke-tested. |
