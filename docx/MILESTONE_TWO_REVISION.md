# Milestone 2 Revision — Family Experience Simplification

**Status:** 🟡 In progress — **R1–R6 done** · polish logged · **optional next: R7–R8**  
**Estimate:** 4–6 working days (P0 + P1) · 3–4 days minimum (P0 only)  
**Last updated:** 2026-07-22  
**Companion test doc:** `MILESTONE_TWO_REVISION_TEST.md`  
**Scope audit:** `M2_FAMILY_EXPERIENCE_AUDIT.md`  
**Client feedback:** `Family Experience.pdf` + careseeker onboarding video/screenshots  
**Handoffs:** `CHAT_CONTEXT_FAMILY_ONBOARDING_R3.md` · `CHAT_CONTEXT_M2_POLISH_2026-07-21.md`

> Signed M2 clinical deliverables are **done**.  
> This revision improves the **Family App** so it stays simple, while staff keep the detailed clinical workflows already built.

---

## Client Decision (2026-07-21) — Read This First

> **Family onboarding = the same careseeker onboarding UI.**  
> Replace the current M2 clinical 8-step family wizard as the primary family path.

| | Before (M2 delivered) | After (client ask) |
|---|---|---|
| Route families use | `/family/onboarding` = clinical 8-step wizard | `/family/onboarding` = **same 6-step careseeker UX** |
| What family fills | History, meds, ICD, urgency, services… | Location → Support → Preferences → Schedule → Account → Confirm |
| Backend | `POST /api/intake` → coordinator queue | **Same** — still create Care Unit / Patient / Intake / ConsentLog |
| Clinical wizard | Primary family path | **Not** primary for families (staff completes clinical detail in intake review) |
| Careseeker route | `/careseeker/onboarding` exists | Keep working for marketplace careseekers; family uses the **same UX** at `/family/onboarding` |

**Plain meaning:** Do not make families fill the hospital-style form. Put the simple careseeker screens into family onboarding, and keep M2 staff intake/episode/assessment working.

---

## Goal

Make the Family App feel like a modern care service:

- Family **requests care** quickly (careseeker-style steps)
- Staff **manages clinical / operational detail**
- Families never see internal hospital-system complexity

---

## Context

| Item | Status |
|---|---|
| Signed M2 (onboarding, intake, episodes, assessments, docs, consents) | ✅ Done |
| Client demo of M2 | ✅ Done |
| Client feedback — Family Experience PDF | 📥 Received |
| Client clarification — family onboarding = careseeker UX | 📥 Confirmed 2026-07-21 |
| M2 Revision (this doc) | 🟡 In progress — R1–R6 + polish done; R7–R8 optional |
| **M2 Security remediation** | 🔴 Open — see `M2_SECURITY_REMEDIATION.md` (**gate before M3**) |
| Milestone 3 (care plans, scheduling, notes) | ⏸ After revision **and** security Wave A |

---

## Revision Deliverables

| # | Item | Priority | Status | Notes |
|---|---|---|---|---|
| R1 | Family language rename | **P0** | ✅ Done | Nav + pages: Care Journey / Appointments / Consultation |
| R2 | Hide internal IDs / workflow noise from family | **P0** | ✅ Done | Status map via `familyLanguage.ts`; no IDs; diagnoses hidden on family episode |
| R3 | **Replace** family clinical wizard with careseeker 6-step UX | **P0** | ✅ Done | `/family/onboarding` = careseeker UX → `submitIntake` |
| R4 | Family dashboard cleanup | **P0** | ✅ Done | Family Home primary actions + Coming later; Care Plans/Messages de-emphasized |
| R5 | Care Journey milestone view | **P1** | ✅ Done | Family milestones via `familyJourneyMilestones.ts` (Care Plan locked M3) |
| R6 | Coordinator next-action polish | **P1** | ✅ Done | Next actions card + doc request + urgency PATCH + schedule from intake |
| R7 | “Talk to Us” / help request | **P2** | ⏳ | Lightweight follow-up entry |
| R8 | Role blurbs in staff portals | **P2** | ⏳ | Coordinator / Clinical / Family / Support copy |

---

## Reference UX (Becomes Family Onboarding)

Source to reuse:

`client/src/pages/careseeker/OnboardingPage.tsx` (+ `client/src/pages/careseeker/steps/*`)

| Step | Screen | What it does |
|---|---|---|
| 1 | **Location** | Country, language, who needs care (Individual / Family Guardian) |
| 2 | **Support** | What support do you need? (+ NDIS only for Australia) |
| 3 | **Preferences** | Provider gender, languages, care location |
| 4 | **Schedule** | How often, preferred days/times |
| 5 | **Account** | Login / verified account |
| 6 | **Confirm** | Consents + finish → **M2 intake** |

Enhancements on top of reuse:

- Clearer **Family Guardian** role expectations
- NDIS gated to Australia
- Simpler Custom Hours
- Family-friendly confirmation copy
- Submit must call existing M2 intake API (not marketplace-only draft)

---

## Implementation Approach (R3 — Shipped)

### Principle: replace UI, keep backend

- **Replace** what family sees at `/family/onboarding`
- **Do not break** coordinator intake review, episode creation, assessment scheduling/completion
- **Do not break** `/careseeker/onboarding` marketplace path (reuse components; do not delete careseeker)

### What shipped (R3)

1. Shared `CareOnboardingWizard` (`variant: 'family' | 'careseeker'`) in `client/src/pages/careseeker/OnboardingPage.tsx`
2. `/family/onboarding` renders the **6 careseeker steps** (full-screen, outside role shell sidebar)
3. Finish (family) maps answers → `submitIntake()` + Care Unit/Patient + ConsentLog (`PENDING_CLINICAL_REVIEW` diagnosis for staff to complete)
4. Clinical 8-step wizard preserved as `FamilyClinicalOnboardingPage.tsx` (not primary route)
5. Family Guardian role bullets + confirm summary + plain-language success screen

### Regression gate

- Flow REG: coordinator structured review + clinical assessment still works
- Family submit without consents blocked
- Careseeker `/careseeker/onboarding` still works
- No change to staff routes / tenant scoping

### Suggested coding order next

1. ~~**R3 first**~~ ✅  
2. ~~**R1 + R2** (language + hide IDs)~~ ✅  
3. ~~**R4 / R5**~~ ✅  
4. ~~**R6**~~ ✅  
5. Optional R7–R8  

---

## Build Details

### R1 — Family language rename ✅ Done

| Internal (staff) | Family App label |
|---|---|
| Care Episode | Care Journey |
| Assessment | Consultation |
| Bookings (assessment list) | Appointments / Consultations |
| Coordinator notes | Care Team Notes |
| Goal | Care Goal |
| Outcome report | Progress Summary |

**Shipped:** Family nav (`proposalRoleShells`), episode list/detail, appointments page, dashboard stats labels, patient care-journey links. Shared helpers in `client/src/lib/familyLanguage.ts`.  
**Do not rename** staff portal clinical terms unless copy is clearly family-facing.

### R2 — Hide internal complexity from family ✅ Done

Family must **not** see:

- Care Episode IDs
- Raw statuses like `under_review`, `episode_created`
- State-machine advance buttons
- Internal approval / audit technical detail
- Diagnoses / medical history / meds on family episode detail (staff-only)

Map statuses to simple family text:

| Internal status | Family wording |
|---|---|
| Intake submitted | Request received |
| Under review | Care team reviewing |
| Episode created / validated | Care journey started |
| Assessment scheduled | Consultation booked |
| Assessment completed | Consultation completed |

**Shipped:** Status badges/filters use `familyLanguage` maps; family episode detail hides clinical fields + intake chip noise; no episode IDs shown as primary UI.

### R3 — Replace family clinical wizard with careseeker 6-step UX

**Goal:** `/family/onboarding` shows the same careseeker screens. Finish creates M2 intake.

#### Must ship

| Requirement | Detail |
|---|---|
| Same 6 steps | Location → Support → Preferences → Schedule → Account → Confirm |
| Same look | Card-based careseeker UI (reuse components) |
| Family route | Primary CTA uses `/family/onboarding` |
| Finish → M2 | `submitIntake` + Care Unit/Patient + ConsentLog → coordinator queue |
| Role clarity | Family Guardian card explains expectations |
| NDIS | Australia only |
| Confirmation | Plain language — no intake ID as hero text for family |

#### Staff still does

- Complete clinical fields if missing
- Structured review → Care Journey/Episode
- Schedule consultation (assessment)

#### Out of this step

- Live clinician availability booking engine → **M3**
- Care Plan builder → **M3**
- Telehealth join / payments → **M4**

### R4 — Family dashboard cleanup

Keep / emphasize:

- Home
- Care Journey
- Appointments / Consultations
- Documents
- Messages (placeholder OK until M4)
- Request support / Talk to Us

De-emphasize or remove family exposure of:

- Staff-like clinical builders
- Care Plan tools (still M3)
- Internal workflow controls

### R5 — Care Journey milestone view

Simple family-facing timeline, for example:

```
Request received
  → Care team reviewing
  → Care journey started
  → Consultation booked
  → Consultation completed
  → (Care Plan Ready — M3, show as upcoming / locked)
```

### R6 — Coordinator polish ✅ Done

Keep `/coordinator/intake` as the main queue. Improve clarity of next actions:

- Review new request
- Request missing documents
- Schedule consultation
- Escalate urgency

**Shipped:** Next-actions card + queue hints (`coordinatorIntakeNextActions.ts`); `PATCH /intake/:id/urgency`; coordinator document request via `POST /document-requests`; schedule CTA + `canSchedule` on coordinator episodes.

Do **not** build Care Plan Management, AI draft, or Communication Hub here.

### R7 — Talk to Us (optional P2)

Simple form:

- Describe situation
- Optional document upload
- Request callback / ask question

Routes to coordinator follow-up (intake note / queue flag / lightweight request record).

### R8 — Role blurbs (optional P2)

Short copy in staff portals **and** in Family Guardian selection:

| Role | One-line meaning |
|---|---|
| Family Guardian | Manages care for relatives — requests support, uploads docs, stays informed |
| Individual | Requests care for themselves |
| Care Coordinator | Owns the care journey — coordinates family, clinicians, and operations |
| Clinical Staff | Clinical assessment and recommendations |
| Support Worker | Executes assigned care activities (delivery in M3) |

---

## Explicitly Out of Scope (Do Not Pull Into M2 Revision)

| Item | Milestone |
|---|---|
| Care Plan builder + family approve / reject | **M3** |
| Staff availability / recurring scheduling engine | **M3** |
| Goals / progress tracking / achievements | **M3** |
| Support worker task execution + evidence | **M3** |
| Full clinical / shift notes | **M3** |
| Incident management | **M3** |
| AI care-plan draft | **Excluded / later** |
| Telehealth join | **M4** |
| Quotations & payments | **M4** |
| Full messaging / communication hub | **M4** |
| Mobile Family App | **M5** |

---

## Suggested Build Order

1. **Day 1–2** — **R3** replace `/family/onboarding` with careseeker 6-step + wire `submitIntake`  
2. **Day 2** — R1 language + R2 hide IDs/statuses  
3. **Day 3–4** — R4 dashboard cleanup + R5 Care Journey milestones  
4. **Day 4–5** — R6 coordinator polish + QA / demo script update  
5. **Optional Day 5–6** — R7 Talk to Us + R8 role blurbs  

Then: client re-demo → start **Milestone 3**.

**Regression gate after R3:** Flow REG must still pass (coordinator review + clinical assessment). Careseeker marketplace onboarding must still open.

---

## Acceptance Criteria (Client Re-Demo)

A reviewer should be able to:

1. Log in as family → open `/family/onboarding` → see the **same 6 careseeker steps** (not ICD/history clinical wizard)  
2. Complete Location → Support → Preferences → Schedule → Account → Confirm  
3. See **Family Guardian** role expectations when selected  
4. See confirmation in plain language (“request received — care team will review”)  
5. Coordinator sees new intake in queue → completes clinical detail if needed → structured review → episode created  
6. Clinical assessment path still works  
7. `/careseeker/onboarding` still works for marketplace users  
8. Confirm care plans / telehealth / payments remain later milestones  

---

## Pass / Fail Checklist

| # | Check | Pass | Fail |
|---|---|---|---|
| R1 | Family nav/labels use Care Journey / Consultation wording | | |
| R2 | Family screens hide episode IDs and raw status codes | | |
| R3 | `/family/onboarding` is careseeker 6-step; Finish creates intake; clinical wizard not primary | | |
| R3b | `/careseeker/onboarding` still works | | |
| R4 | Family dashboard shows only useful family sections | | |
| R5 | Family Care Journey milestones are understandable | | |
| R6 | Coordinator still has full structured review power | | |
| R7 | Talk to Us works (if shipped) | | |
| R8 | Role blurbs visible (if shipped) | | |
| REG | Existing M2 staff flows still work (intake → episode → assessment) | | |

---

## Test Credentials

Same as M2 (`Password123!`):

| Role | Email | Path |
|---|---|---|
| Family | `family@demo.com` | `/family` → `/family/onboarding` |
| Coordinator | `coordinator@riayahplus.com` | `/coordinator/intake` |
| Clinical | `clinical@demo.com` | `/clinical/schedule` |

---

## Related Docs

| Doc | Purpose |
|---|---|
| `M2_FAMILY_EXPERIENCE_AUDIT.md` | Scope vs client feedback |
| `MILESTONE_TWO_REVISION_TEST.md` | Visual test flows for this revision |
| `M2_SECURITY_REVIEW.md` | Source-code security audit (Karim, 2026-07-20) |
| `M2_SECURITY_REMEDIATION.md` | **Security fix tracker + auditor reply draft** |
| `M2_SECURITY_REMEDIATION_TEST.md` | Security retest flows by wave |
| `MILESTONE_TWO.md` | Original signed M2 tracker (clinical done) |
| `MILESTONE_TWO_TEST.md` | Original M2 clinical test guide |
| `Family Experience.pdf` | Client design feedback |
| `MILESTONE_SPECS.md` § M3 | Next milestone after revision + security Wave A |

---

## Changelog

| Date | Note |
|---|---|
| 2026-07-20 | Tracker created from Family Experience feedback after M2 demo. |
| 2026-07-20 | Client shared careseeker onboarding screenshots — R3 redefined around that UX. |
| 2026-07-21 | Client confirmed: **family onboarding must be the same careseeker onboarding** (replace clinical 8-step as primary). Approach documented; implementation pending approval. |
| 2026-07-21 | **R3 shipped:** `/family/onboarding` = careseeker 6-step → M2 intake. Clinical wizard preserved as `FamilyClinicalOnboardingPage.tsx`. |
| 2026-07-21 | Evening polish: separate profile/request edits, lifecycle step-4, bookings findings UI, shell scroll — see `CHAT_CONTEXT_M2_POLISH_2026-07-21.md`. |
| 2026-07-22 | Docs synced after polish. **Next:** finish R1 + R2 (family language + hide IDs/statuses). |
| 2026-07-22 | **R1 + R2 shipped:** family language + status maps on journey/appointments/patient pages. **Next:** R4 dashboard cleanup + R5 milestones. |
| 2026-07-22 | **R4 + R5 shipped:** Family Home cleanup + care-journey milestones (Care Plan locked). **Next:** optional R6–R8. |
| 2026-07-22 | **R6 shipped:** coordinator next-actions on intake (review / docs / schedule / escalate). **Next:** optional R7–R8. |
| 2026-07-22 | Security audit intake: `M2_SECURITY_REMEDIATION.md` opened. **M3 gated on security Wave A** (not on R7–R8). |
