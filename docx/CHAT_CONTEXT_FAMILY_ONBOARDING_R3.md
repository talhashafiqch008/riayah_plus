# Chat Context — Family Onboarding = Careseeker UX (M2 Revision R3)

**Created:** 2026-07-21  
**Project:** Riayah Plus  
**Workspace:** `/Users/talhashafiq/Documents/riayah_plus`  
**Related docs:**  
`MILESTONE_TWO_REVISION.md` · `MILESTONE_TWO_REVISION_TEST.md` · `M2_FAMILY_EXPERIENCE_AUDIT.md` · `Family Experience.pdf`

---

## 1. Purpose of this document

This file captures the **full context of the chat session** that redefined Milestone 2 family onboarding: replace the clinical 8-step family wizard with the **same careseeker 6-step onboarding UX**, wire it to the existing M2 backend, and make the data visible to coordinator and family Care Unit screens.

Use this as handoff notes for the next session / teammate.

---

## 2. Background before this chat

### Already done (prior arcs)

- Signed **Milestone 2 clinical deliverables** complete (intake, coordinator review, episodes, assessments, docs, consents, tenant scoping, shell stats, proposal 2FA).
- Client demo of M2 completed.
- Client sent **Family Experience.pdf** — design direction: Family App simple; Staff Portal holds clinical complexity.
- Revision trackers created: `M2_FAMILY_EXPERIENCE_AUDIT.md`, `MILESTONE_TWO_REVISION.md` (R1–R8), `MILESTONE_TWO_REVISION_TEST.md`.

### Two onboardings that existed

| Path | What it was |
|---|---|
| `/careseeker/onboarding` | Simple marketplace 6-step UX (Location → Support → Preferences → Schedule → Account → Confirm) |
| `/family/onboarding` | M2 **clinical 8-step** wizard (care unit, patient, caregiver, reason, history/ICD, urgency, services, docs & consent) |

Client liked the **careseeker** screens and wanted that experience for **family**.

---

## 3. What the client meant (clarified in this chat)

> **Family onboarding should be the same careseeker onboarding UI** — not the clinical M2 wizard as the primary family path.

| | Before | After (client ask) |
|---|---|---|
| Family UI | 8 clinical steps | Same 6 careseeker steps |
| Backend | `submitIntake` → coordinator | **Same** M2 APIs / DB |
| Clinical detail | Family typed ICD/history | Coordinator completes in review |
| Careseeker route | Marketplace path | Keep working separately |

**Plain meaning:** Same screens as careseeker; different door into the **same M2 intake machine**.

---

## 4. Doc updates (before / during implementation)

Updated to say R3 = **replace** (not “enhance beside”):

- `docx/MILESTONE_TWO_REVISION.md` — Client Decision section, R3 redefine, implementation approach, changelog
- `docx/MILESTONE_TWO_REVISION_TEST.md` — Flow R3 rewritten for careseeker UX + intake wire
- `docx/M2_FAMILY_EXPERIENCE_AUDIT.md` — careseeker screenshots named as UX baseline

**Approved approach (user said “approve”):**

1. Reuse careseeker steps with `variant: 'family' | 'careseeker'`
2. Swap `/family/onboarding` UI to 6 steps
3. Finish → existing `submitIntake` + Care Unit / Patient / ConsentLog
4. Preserve clinical wizard file (do not delete)
5. Do not break careseeker path or staff M2 flows

---

## 5. What was implemented (R3 + follow-ups)

### 5.1 Core R3 — Family onboarding = careseeker UX

| Item | Detail |
|---|---|
| Shared wizard | `CareOnboardingWizard` in `client/src/pages/careseeker/OnboardingPage.tsx` |
| Family page | `client/src/pages/family/FamilyOnboardingPage.tsx` → `<CareOnboardingWizard variant="family" />` |
| Clinical wizard preserved | `client/src/pages/family/FamilyClinicalOnboardingPage.tsx` (not primary route) |
| Mapping helper | `client/src/lib/familyCareseekerIntake.ts` |
| Route | `/family/onboarding` inside `HealthRoleLayout` (sidebar visible) |

**Family Finish creates:**

1. Care Unit (create or reuse)
2. Patient (derived name from account type + logged-in user)
3. Intake (`Submitted`) with:
   - `reasonForCare` built from categories/prefs/schedule
   - `diagnoses: ['PENDING_CLINICAL_REVIEW']`
   - `serviceInterests` mapped from care categories
   - `wizardPayload` with `source: 'family_careseeker_onboarding'` + full form answers
4. Privacy + Treatment consents → ConsentLog

### 5.2 UI / UX fixes (same session)

| Issue | Fix |
|---|---|
| No sidebar / full-screen takeover | Render inside dashboard shell (`HealthRoleLayout`) |
| Huge logo | Family layout has no duplicate logo header; `Logo` size bug fixed (`width/height` respected) |
| Black unreadable cards | Replaced `bg-stone-800` unselected states with white + light borders across careseeker steps |
| Dashboard CTA | “Start clinical onboarding” → “Start care request” + “View my care unit” |

### 5.3 Coordinator visibility

- Added **Family request summary** panel on coordinator intake detail
- Parses `wizardPayload` via `parseFamilyWizardSummary()`
- Shows account type, location, language, support, prefs, schedule, NDIS, mapped services
- Pending diagnosis shown as readable text

**Where:** `/coordinator/intake` → open Submitted row

### 5.4 Family Care Unit visibility

- Added `FamilyCareRequestPanel` component
- Family Care Unit detail shows **Your care request** from latest intake + household + who needs care
- List badges: “request” language for family; care journey wording when episodes exist

**Where:** `/family/care-unit` → open unit

---

## 6. Important architecture note (answered repeatedly in chat)

### Is it UI-only?

**No.** It is end-to-end with existing M2 backend and DB.

### How can different UI steps use M2?

M2 deliverable was the **pipeline**, not the 8 form fields:

```
Family submits → Care Unit + Patient + Intake → Coordinator reviews → Episode → Assessment
```

Old 8-step form and new 6-step form are two UIs writing into the **same `IntakeRecord` shape**.

### What coordinator sees vs what family filled

| Field | From new onboarding |
|---|---|
| Reason for care | Generated from support/prefs |
| Diagnoses | Placeholder until staff review |
| Medical history / meds | Empty (`—`) — intentional |
| Service interests | Mapped from categories |
| Full step answers | In `wizardPayload` (now shown in Family request summary) |

### Is Care Unit data “perfect”?

Initially **not perfect** (placeholder patient name, sparse phone/city).  
Then improved so family Care Unit shows the **onboarding request summary**.  
Patient name is still derived (form does not collect a separate care-recipient legal name yet).

---

## 7. Key files touched

| File | Role |
|---|---|
| `client/src/pages/careseeker/OnboardingPage.tsx` | Shared wizard + family submit |
| `client/src/pages/family/FamilyOnboardingPage.tsx` | Thin family wrapper |
| `client/src/pages/family/FamilyClinicalOnboardingPage.tsx` | Preserved old clinical wizard |
| `client/src/lib/familyCareseekerIntake.ts` | Mapping + summary parse |
| `client/src/components/care/FamilyCareRequestPanel.tsx` | Family (and reusable) request card |
| `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx` | Family request summary for staff |
| `client/src/pages/care/CareUnitDetailPage.tsx` | Family-facing care unit + request |
| `client/src/pages/care/CareUnitListPage.tsx` | Family list copy/badges |
| `client/src/pages/roles/RoleShellDashboard.tsx` | Family CTAs |
| `client/src/routes/ProposalRoleRoutes.tsx` | Route placement / Care Unit copy |
| `client/src/pages/careseeker/steps/*` | Contrast / light card colors |
| `client/src/components/Logo.tsx` | Size fix |

---

## 8. How to test (full path)

### Prerequisites

```bash
# API :5001 · Client :5173
cd server && npm run dev
cd client && npm run dev
```

Passwords: **`Password123!`**

| Role | Email |
|---|---|
| Family | `family@demo.com` |
| Coordinator | `coordinator@riayahplus.com` |
| Clinical | `clinical@demo.com` |

### Happy path

1. Login family → `/family/onboarding`
2. Complete 6 steps + required consents → Finish
3. See success: request received
4. Open `/family/care-unit` → unit → **Your care request** panel matches answers
5. Login coordinator → `/coordinator/intake` → open intake → **Family request summary**
6. Structured review → episode created (existing M2)
7. Optional: clinical assessment still works (Flow REG)
8. Spot-check `/careseeker/onboarding` still loads for marketplace

---

## 9. Revision tracker status (as of this chat)

| ID | Item | Status |
|---|---|---|
| R3 | Replace family clinical wizard with careseeker 6-step + M2 intake | ✅ Done (this chat) |
| R1 | Family language rename (Care Journey / Consultation) | ⏳ Pending |
| R2 | Hide IDs / raw statuses from family | ⏳ Pending |
| R4 | Family dashboard cleanup | ⏳ Partial (CTAs updated) |
| R5 | Care Journey milestones | ⏳ Pending |
| R6–R8 | Coordinator polish / Talk to Us / role blurbs | ⏳ Pending |

**Suggested next coding:** R1 + R2, then R5 milestones.

---

## 10. Out of scope (do not confuse with this work)

- Care Plan builder / family approve → **M3**
- Live availability booking engine → **M3**
- Telehealth / payments / messaging hub → **M4**
- Collecting full ICD/history from family again → **not desired**
- Deleting clinical wizard permanently → keep until client confirms

---

## 11. Open gaps / known limitations

1. **Patient name** is still derived (`…'s family member`), not a typed care-recipient name field in the 6-step UI.
2. **Phone / city / relation** on Care Unit often empty unless edited later.
3. **Family language map** (Episode → Care Journey everywhere) not fully done (R1).
4. **Clinical wizard** file exists but is not linked as primary UI.
5. Older intakes submitted before `wizardPayload.source` may not show the rich Family request summary (only reason text fallback).

---

## 12. One-line summary

**This chat took the client’s careseeker onboarding screenshots, confirmed family must use that same UX, shipped it as `/family/onboarding` wired to real M2 intake/DB, fixed UI contrast/shell layout, and made onboarding answers visible on coordinator intake and family Care Unit pages.**

---

## Changelog of this context file

| Date | Note |
|---|---|
| 2026-07-21 | Written from full chat arc: clarify → docs → R3 implement → UI fixes → coordinator + family Care Unit visibility. |
