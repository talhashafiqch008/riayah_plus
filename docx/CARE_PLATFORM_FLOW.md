# Riayah Plus — Care Platform Flow

**Audience:** Client meeting walkthrough  
**Scope:** Organization-based care delivery (family → coordinator → clinical → support)

---

## Roles at a glance

| Role | Portal | Responsibility |
|------|--------|----------------|
| **Family** | `/family` | Request care, complete intake, approve care plans |
| **Org Admin** | `/org` | Manage org staff, assign coordinators, oversee pending intakes |
| **Care Coordinator** | `/coordinator` | Review intake, build & submit care plans, schedule, assign tasks |
| **Clinical Staff** | `/clinical` | Assessments, clinical notes, sessions, optional plan co-sign |
| **Support Worker** | `/support` | Shifts and task delivery (in-home / visit work) |

---

## End-to-end flow

```
Family intake
    → Org assigns coordinator
    → Coordinator validates intake
    → Clinical assesses & documents
    → Coordinator builds care plan
    → Family approves plan
    → Coordinator schedules & assigns work
    → Clinical + Support deliver care
    → Material plan changes → family re-approves
```

---

## Step-by-step

### 1. Family requests care
1. Family signs in to the family portal.
2. Completes clinical onboarding (care unit, care recipient, history, documents, consent).
3. Submits intake.
4. Intake appears as **pending** for the organization.

**Outcome:** Care request is in the system, waiting for org / coordinator attention.

---

### 2. Organization sets up the case
1. Org admin signs in to the org portal.
2. Reviews pending intakes / families needing a coordinator.
3. Assigns a **care coordinator** to the family.
4. Invites clinical and support staff into the organization (if not already present).

**Outcome:** The family has an owner (coordinator) and the org has delivery capacity.

---

### 3. Coordinator validates intake
1. Coordinator opens the intake / episode queue.
2. Reviews submitted information (and may request clarification).
3. Validates intake so the care episode becomes active for planning.

**Outcome:** Episode is ready for assessment and care planning. Family is notified that intake was reviewed.

---

### 4. Clinical assessment & documentation
1. Clinical staff open the clinical portal.
2. Complete **assessments** for the episode.
3. Add **clinical notes** against the episode / session:
   - Notes are **immutable** after save (audit-safe clinical record).
   - Notes can be marked **private** (clinical continuity) or **public** (non-private clinical record).
4. Clinical may later **co-sign** a care plan as attestation (does **not** replace family approval).

**Outcome:** Clinical picture is captured for planning and ongoing care.

> **Note for demos:** Clinical notes are written and viewed in the clinical portal today. Coordinator episode UI for reading notes is on the roadmap (API already supports it).

---

### 5. Care plan creation
1. Coordinator creates a care plan on the episode (manual, or with AI draft assistance).
2. Defines goals, services/items, and plan notes.
3. Reviews and edits until ready.
4. **Submits the plan to the family** for approval.

**Important:** AI / draft plans never go to the family automatically. The coordinator must explicitly submit.

**Outcome:** Family receives a “care plan ready for review” notification.

---

### 6. Family approval gate
Family opens the care plan and chooses one:

| Action | Result |
|--------|--------|
| **Approve** | Plan becomes approved / active |
| **Request revision** | Plan returns to coordinator with family notes |
| **Reject** | Plan is rejected; coordinator is notified |

**Important:** Only the family can approve, reject, or request revision — not the coordinator.

**Outcome:** No active care plan delivery without family consent.

---

### 7. Scheduling & task assignment
Once the plan is active, the coordinator:
1. Books **sessions** with clinical and/or support staff.
2. Assigns **tasks** derived from care-plan goals (typically to support workers).
3. Uses org staff availability / schedule tools to avoid conflicts.

**Outcome:** The delivery team knows what to do and when.

---

### 8. Care delivery — Clinical
1. Attends scheduled sessions.
2. Continues assessments and clinical notes as care progresses.
3. Optionally co-signs plan updates when clinically appropriate.

---

### 9. Care delivery — Support
1. Support worker signs in to the support portal.
2. **Starts a shift**.
3. Completes assigned **tasks** (visit / in-home delivery work).
4. Ends the shift.

**Outcome:** Plan items are executed and tracked operationally.

---

### 10. Plan changes (re-approval)
If the coordinator makes a **material** change to an active / approved plan:
1. System creates a **new draft version**.
2. Coordinator submits again.
3. Family must **approve again** before the new version becomes current.

Non-material edits can stay in place without restarting family approval.

**Outcome:** Families stay in control when care intent meaningfully changes.

---

## Who sees what (simple)

| Content | Family | Coordinator | Clinical | Support | Org Admin |
|---------|:------:|:-----------:|:--------:|:-------:|:---------:|
| Intake / episode status | ✓ | ✓ | ✓ (scope) | — | ✓ (org) |
| Care plan (for approval) | ✓ | ✓ (create/submit) | ✓ (view / co-sign) | — | — |
| Clinical notes | — | API ready / UI pending | ✓ | — | — |
| Sessions / schedule | Appointments view | ✓ | Own sessions | Own sessions | — |
| Tasks / shifts | — | Assign / oversee | — | ✓ | — |

---

## Demo path (suggested order)

1. **Family** — show onboarding + submitted intake  
2. **Org admin** — assign coordinator + show staff invites  
3. **Coordinator** — validate intake → create/submit care plan  
4. **Family** — approve care plan  
5. **Coordinator** — schedule session + assign tasks  
6. **Clinical** — assessment + clinical note  
7. **Support** — start shift + complete task  
8. *(Optional)* Coordinator material edit → family re-approval  

---

## One-line summary

**Family requests care → org assigns a coordinator → coordinator validates and plans → family approves → clinical assesses and documents → support delivers tasks → meaningful plan changes return to the family.**
