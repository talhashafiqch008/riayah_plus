# Milestone 2 — Family Experience Feedback Audit

**Created:** 2026-07-20  
**Updated:** 2026-07-22 — R1–R6 shipped; polish logged; optional R7–R8 next  
**Source of feedback:** `docx/Family Experience.pdf` (client, after M2 demo) + careseeker onboarding video/screenshots + polish session `CHAT_CONTEXT_M2_POLISH_2026-07-21.md`  
**Compared against:** Signed M2 proposal + what we delivered locally  
**Purpose:** Separate **M2 revision** (simple family UX with current implementation) from **later milestones / out of scope**.

---

## 1. Short Answer

The Family Experience document is **not a list of M2 bugs**.

It is a **product design direction**:

- Keep the **Family App simple**
- Put clinical / operational complexity in the **Staff Portal**
- Clarify **what each role does**

| Area | Verdict |
|---|---|
| Signed M2 clinical backend + staff flows | ✅ Delivered |
| Family App simplicity / language / guided journey | ✅ Core revision done (R1–R5); optional R6–R8 remain |
| Care plans, scheduling engine, telehealth, payments, AI, messaging hub | ❌ Not M2 — M3 / M4 / excluded |

**Bottom line:**  
M2 built the **clinical foundation**. The client now wants the **family-facing layer** to feel lighter. We can do that as an **M2 revision** without rebuilding M3–M5.

---

## 2. What Milestone 2 Actually Delivered

### Signed M2 deliverables (done)

| # | Deliverable | Status |
|---|---|---|
| 1 | Multi-step family onboarding | ✅ Done |
| 2 | Coordinator intake review | ✅ Done |
| 3 | Patient & Care Unit profiles | ✅ Done |
| 4 | Care Episode lifecycle | ✅ Done |
| 5 | Assessment schedule / complete / report | ✅ Done |
| 6 | Document upload (S3 / local fallback) | ✅ Done |
| 7 | Coordinator intake queue dashboard | ✅ Done |

### Also shipped in M2 build

- Privacy + Treatment consent + ConsentLog
- Live role-shell dashboard stats
- Proposal portal 2FA step
- Tenant-scoped clinical lists (org isolation)

### What M2 intentionally did **not** include

- Care Plan builder / family approval → **M3**
- Staff availability + recurring scheduling engine → **M3**
- Full clinical / shift notes → **M3**
- Telehealth join → **M4**
- Quotations / invoices / payments → **M4**
- Secure messaging productization → **M4**
- AI intake / AI care-plan draft → **Excluded** (proposal §5.2)

---

## 3. What the Client Is Asking For (Family Experience.pdf)

### Core design rule

> Family App = receive care  
> Staff Portal = manage healthcare operations

Before adding anything to Family:

> Does the family need this to receive or manage their care?  
> If no → Staff Portal.

### Family App should feel like

- Request support
- Book a consultation
- Upload documents
- See simple status / care journey
- See care plan later
- Messages, telehealth, payments later

### Family App should **not** expose

- Care Episode IDs
- Internal workflow statuses
- Clinical state transitions
- Technical identifiers
- Internal approvals

### Preferred family language

| Internal (staff) | Family language |
|---|---|
| Care Episode | Care Journey |
| Assessment | Consultation |
| Clinical Documentation | Visit Summary |
| Task | Upcoming Activity |
| Coordinator Notes | Care Team Notes |
| Goal | Care Goal |
| Outcome Report | Progress Summary |

### Preferred family onboarding (client vision + reference UX)

Client PDF vision (conceptual):

1. How can we help you today?
2. Who needs care?
3. Basic info (name, DOB, mobile, language)
4. Tell us about the situation + upload docs
5. Book a consultation (clinic / home / telehealth) → **preference only in M2; live slots = M3**
6. Consent
7. Confirmation

**Reference UX the client already liked (screenshots / video):** existing careseeker onboarding

`client/src/pages/careseeker/OnboardingPage.tsx` — 6 steps:

1. Location + language + who needs care (Individual / Family Guardian)
2. Support categories (+ NDIS only when Australia)
3. Provider preferences
4. Schedule preferences
5. Account
6. Confirm / consents

**M2 revision approach:** enhance that careseeker-style flow (role clarity, less clutter, family language) and wire Finish into M2 Care Unit / Patient / Intake — **do not** make the clinical 8-step `/family/onboarding` the primary family path.

After submit, **system creates behind the scenes**:

- Care Unit
- Patient profile
- Intake record
- Consent log
- Documents (when uploaded)
- Coordinator review task
- Audit events
- Draft Care Episode only if/when staff review creates it (keep current M2 review gate)

Family should **not** fill long clinical forms.

### Role clarity (client wants this documented / reflected in UX)

| Role | Owns | Does not own |
|---|---|---|
| **Family / Patient** | Request care, upload docs, attend, review outcomes | Edit clinical records / assessments / care plans |
| **Care Coordinator** | Care journey ownership, intake review, coordination, monitoring | Clinical decision-making |
| **Doctor / Clinical** | Assessment, clinical recommendations | Staff scheduling / family admin |
| **Allied Health** | Therapy / specialty delivery | Whole journey ownership |
| **Nurse / Support Worker** | Execute assigned tasks, notes, incidents | Care plan ownership |
| **Reception / Admin** | Appointments, payments, docs admin | Unnecessary clinical data |

---

## 4. Gap Map — Current M2 vs Client Vision

| Client expectation | Current M2 reality | Verdict |
|---|---|---|
| Short, simple family onboarding (careseeker-style) | ✅ `/family/onboarding` = careseeker 6-step → M2 intake (R3) | ✅ Done |
| Family language (“Care Journey”, “Consultation”) | ✅ Nav + journey/appointments pages + `familyLanguage.ts` | ✅ Done (R1) |
| Hide internal IDs / workflow states from family | ✅ Status maps; no IDs; diagnoses/clinical fields hidden on family episode | ✅ Done (R2) |
| Backend auto-creates Care Unit / Patient / Intake after simple submit | ✅ Wired; episode still on coordinator review | ✅ Done (episode gate kept) |
| Book consultation from availability | Coordinator / family book on episode — not live roster engine | ❌ M3 (scheduling engine) |
| Family Care Plan view / approval | Placeholder / empty | ❌ M3 |
| Progress / goals tracking | Not built | ❌ M3 |
| Telehealth join | Not M2 product | ❌ M4 |
| Messages hub | Placeholder | ❌ M4 |
| Quotations & payments | Not M2 | ❌ M4 |
| “Talk to Us” / callback help | Not present | 🟡 Small M2 revision possible (R7) |
| AI care-plan draft for coordinator | Explicitly excluded | ❌ Out of scope |
| Full coordinator Action Center / Care Plan Management / Communication Hub | Intake queue + patients + episodes only | ❌ Mostly M3 / M4 |
| Role definitions documented | Family Guardian blurbs on onboarding; staff blurbs still open | 🟡 R8 still open |
| Family Care Unit shows request summary | ✅ `FamilyCareRequestPanel` on care unit + coordinator | ✅ Done |
| Separate edit request vs profile | ✅ Polish session | ✅ Done |
| Family dashboard only useful sections | ✅ Family Home primary actions + Coming later | ✅ Done (R4) |
| Care Journey milestones on home | ✅ Detail milestones + Care Plan locked (M3) | ✅ Done (R5) |

---

## 5. What Is **M2 Revision** (In Scope — Keep It Simple)

These enhance what we already built. They do **not** require Care Plans, telehealth, or payments.

### A. Simplify Family App language and navigation

- Rename family-facing labels:
  - Episodes → **Care Journey**
  - Assessments / Bookings → **Consultations** / **Appointments**
- Hide Care Episode IDs and internal status codes from family screens
- Map internal statuses to simple milestones, for example:
  - Submitted → **Request received**
  - Under review → **Care team reviewing**
  - Episode created / validated → **Care journey started**
  - Assessment scheduled → **Consultation booked**
  - Assessment completed → **Consultation completed**

### B. Enhance simple family onboarding (careseeker baseline → M2 intake)

**Goal:** Keep the card-based UX the client already liked. Enhance role clarity. Staff still gets the clinical structure M2 already supports.

**Baseline:** `client/src/pages/careseeker/OnboardingPage.tsx` (Location → Support → Preferences → Schedule → Account → Confirm)

Recommended approach:

1. **Family path (enhance existing simple UX):**
   - Expand **Family Guardian** role expectations on the Who needs care cards
   - Keep support categories; gate **NDIS** to Australia only; add short management-type help text
   - Keep preferences; family-friendly wording
   - Keep schedule prefs; simplify Custom Hours
   - Account shows signed-in role; Confirm shows summary + consents
2. **Behind the scenes (already mostly built):**
   - Create / reuse Care Unit + Patient
   - Create IntakeRecord (map support categories + prefs + schedule)
   - Save documents + ConsentLog
   - Create coordinator review task / queue item
3. **Staff path (keep current M2 power):**
   - Coordinator completes clinical fields if missing (diagnoses, urgency, services)
   - Structured review → Care Episode
   - Schedule consultation (assessment)

**Do not** dump ICD / history / meds into the primary family path. Clinical 8-step wizard can remain as a staff-assisted or power path only.

This matches the client principle: **family requests care; staff manages operations**.

### C. Family dashboard cleanup

Show only useful family sections:

- Home
- Care Journey (simple milestones)
- Appointments / Consultations
- Documents
- Messages (placeholder OK until M4)
- Book / Request support

Do **not** show family:

- Internal approvals
- Episode IDs
- Staff state-machine buttons
- Care Plan builder tools

### D. Small “Talk to Us” / Need help entry

Simple form → creates a coordinator follow-up item / message / intake note.

Can be lightweight in M2 revision; full messaging hub stays M4.

### E. Role clarity in product copy

Add short role descriptions in Staff Portal (and optionally help text):

- Coordinator = owns the care journey
- Clinical = clinical decisions / consultations
- Family = participate and stay informed
- Support worker = execute assigned activities (M3 delivery)

### F. Coordinator UX polish (still M2)

Keep current intake queue, but improve family-first language in review screens and next-action clarity:

- Review new request
- Request missing documents
- Schedule consultation
- Escalate urgency

Do **not** build full Care Plan Management / AI draft / Communication Hub in M2 revision.

---

## 6. What Is **Out of Scope** for M2 Revision

| Request from Family Experience.pdf | Why out of scope | When |
|---|---|---|
| Family self-booking from live staff availability | Needs scheduling engine | **M3** |
| Care Plan builder + family approve / reject | Signed M3 | **M3** |
| Care goals / progress tracking | Signed M3 | **M3** |
| Task / upcoming activity execution for support workers | Signed M3 | **M3** |
| Clinical documentation / visit summaries system | Signed M3 | **M3** |
| Incident management | Signed M3 | **M3** |
| AI-assisted care plan draft | Proposal excluded + later AI work | **Excluded / later** |
| Telehealth join | Signed M4 | **M4** |
| Quotations & payments | Signed M4 | **M4** |
| Full secure messaging / communication hub | Signed M4 | **M4** |
| Workforce management / rostering | M3 / later ops | **M3+** |
| Mobile Family App | M5 | **M5** |

---

## 7. Recommended Position for Client Call / Slack

### What we can say

> Milestone 2 delivered the clinical foundation: intake, coordinator review, care journey/episode, consultations/assessments, documents, consents, and role portals.  
> Your Family Experience feedback is aligned with our direction. The next M2 revision should simplify the Family App language and onboarding so families request care quickly, while staff keep the detailed clinical workflow we already built.  
> Care plans, scheduling engine, telehealth, payments, and AI drafting remain later milestones as per the signed proposal.

### What we will revise in M2 (proposed)

1. Enhance careseeker-style family onboarding (role clarity + wire to M2 intake)  
2. Family language map (Care Journey, Consultation, etc.)  
3. Hide internal IDs and workflow noise from family  
4. Simple care-journey milestones on family dashboard  
5. Optional “Talk to Us” help entry  
6. Clearer role descriptions (Family Guardian + staff portals)  

### What we will **not** pull into M2

- Care Plan builder / approval  
- Availability-based booking engine  
- Telehealth / payments / messaging hub  
- AI care-plan generation  

---

## 8. Suggested M2 Revision Priority (Simple)

| Priority | Item | Effort | Impact |
|---|---|---|---|
| P0 | ~~Family language rename + hide internal IDs/statuses~~ | Small | High | ✅ Done (R1/R2) |
| P0 | ~~Enhance careseeker-style family onboarding + wire to M2 intake~~ | Medium | High | ✅ Done (R3) |
| P1 | ~~Family Care Journey milestone view~~ | Small–Medium | High | ✅ Done (R5) |
| P1 | ~~Family dashboard cleanup (remove staff-like clutter)~~ | Small | High | ✅ Done (R4) |
| P2 | “Talk to Us” / help request | Small | Medium | ⏳ |
| P2 | Role blurbs in staff portals | Small | Medium | ⏳ |
| P1 | Coordinator next-action polish | Small | Medium | ✅ Done (R6) |

---

## 9. One-Line Summary

**M2 delivered the clinical engine.  
Family Experience feedback asks us to hide that engine from families.  
M2 revision = simpler family UX on top of current implementation.  
Care plans, scheduling, telehealth, payments, AI = not M2.**

---

## Related Docs

| Doc | Use |
|---|---|
| `Family Experience.pdf` | Client design feedback |
| `MILESTONE_TWO_REVISION.md` | M2 revision work tracker (R1–R8) |
| `MILESTONE_TWO_REVISION_TEST.md` | Visual test flows for revision |
| `MILESTONE_TWO.md` | Signed M2 tracker |
| `MILESTONE_TWO_TEST.md` | Original M2 clinical tests |
| `MILESTONE_TWO_CLIENT_DEMO.md` | What we demoed |
| `MILESTONE_SPECS.md` § M3 | Next milestone scope |
| `M1_SCOPE_VS_CLIENT_AUDIT.md` | Same style of scope clarification for M1 |
