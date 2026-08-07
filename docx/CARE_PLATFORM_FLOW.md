# Riayah Plus — Care Platform Flow

**Audience:** Client meeting walkthrough  
**Scope:** Organization-based care delivery (platform admin → family → org → coordinator → clinical → support)

---

## Roles at a glance

| Role | Portal | Responsibility |
|------|--------|----------------|
| **Platform Admin** | `/admin` | Create organizations, invite org admins, assign families to orgs |
| **Family** | `/family` | Request care, complete intake, approve care plans |
| **Org Admin** | `/org` | Manage org staff, assign coordinators, oversee pending intakes |
| **Care Coordinator** | `/coordinator` | Review intake, build & submit care plans, schedule, assign tasks |
| **Clinical Staff** | `/clinical` | Assessments, clinical notes, sessions, optional plan co-sign |
| **Support Worker** | `/support` | Shifts and task delivery (in-home / visit work) |

---

## End-to-end flow

```
Platform admin creates organization (+ org admin)
    → Family registers
    → Platform admin assigns family to an organization
    → Family completes intake
    → Org admin assigns coordinator
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

### 1. Platform admin creates the organization
1. Platform admin signs in to the **admin** portal (`/admin`).
2. Creates an **organization** (e.g. “The General Hospital”).
3. Provides an **org admin** name + email as part of org creation.
4. System creates the org admin account and sends an **invite** (set-password link).
5. Org admin sets their password and can access `/org`.

**Outcome:** The care organization exists and has an org admin owner.

---

### 2. Family registers
1. Family creates an account (family / patient role).
2. At registration, the family has **no organization yet** (`organizationId` is empty).
3. Until an org is assigned, family login is blocked with an “awaiting assignment” state.

**Outcome:** Family account exists and is waiting for platform admin to place them in an org.

---

### 3. Platform admin assigns the family to an organization
1. Platform admin opens **Admin → Families**.
2. Finds the unassigned family.
3. **Assigns the family to an organization**.
4. System can backfill related care unit / intake org linkage as needed.
5. Family receives an email that they have been assigned (login link → family portal).

**Outcome:** Family now belongs to a specific hospital / care org and can use the family portal.

> This is the critical platform-admin step: **users do not pick their org themselves — admin assigns them.**

---

### 4. Family requests care (intake)
1. Family signs in to the family portal.
2. Completes clinical onboarding (care unit, care recipient, history, documents, consent).
3. Submits intake under their assigned organization.
4. Intake appears as **pending** for that organization.

**Outcome:** Care request is in the org queue, waiting for coordinator assignment / review.

---

### 5. Org admin sets up the case
1. Org admin signs in to the org portal (`/org`).
2. Reviews pending intakes / families needing a coordinator.
3. Assigns a **care coordinator** to the family.
4. Invites clinical and support staff into the organization (if not already present).

**Outcome:** The family has an owner (coordinator) and the org has delivery capacity.

> Coordinators do **not** reassign families to other coordinators — org admin owns that assignment.

---

### 6. Coordinator validates intake
1. Coordinator opens the intake / episode queue (only families assigned to them).
2. Reviews submitted information (and may request clarification).
3. Validates intake so the care episode becomes active for planning.

**Outcome:** Episode is ready for assessment and care planning. Family is notified that intake was reviewed.

---

### 7. Clinical assessment & documentation
1. Clinical staff open the clinical portal.
2. Complete **assessments** for the episode.
3. Add **clinical notes** against the episode / session:
   - Notes are **immutable** after save (audit-safe clinical record).
   - Notes can be marked **private** (clinical continuity) or **public** (non-private clinical record).
4. Clinical may later **co-sign** a care plan as attestation (does **not** replace family approval).

**Outcome:** Clinical picture is captured for planning and ongoing care.

> **Note for demos:** Clinical notes are written and viewed in the clinical portal today. Coordinator episode UI for reading notes is on the roadmap (API already supports it).

---

### 8. Care plan creation
1. Coordinator creates a care plan on the episode (manual, or with AI draft assistance).
2. Defines goals, services/items, and plan notes.
3. Reviews and edits until ready.
4. **Submits the plan to the family** for approval.

**Important:** AI / draft plans never go to the family automatically. The coordinator must explicitly submit.

**Outcome:** Family receives a “care plan ready for review” notification.

---

### 9. Family approval gate
Family opens the care plan and chooses one:

| Action | Result |
|--------|--------|
| **Approve** | Plan becomes approved / active |
| **Request revision** | Plan returns to coordinator with family notes |
| **Reject** | Plan is rejected; coordinator is notified |

**Important:** Only the family can approve, reject, or request revision — not the coordinator.

**Outcome:** No active care plan delivery without family consent.

---

### 10. Scheduling & task assignment
Once the plan is active, the coordinator:
1. Books **sessions** with clinical and/or support staff.
2. Assigns **tasks** derived from care-plan goals (typically to support workers).
3. Uses org staff availability / schedule tools to avoid conflicts.

**Outcome:** The delivery team knows what to do and when.

---

### 11. Care delivery — Clinical
1. Attends scheduled sessions.
2. Continues assessments and clinical notes as care progresses.
3. Optionally co-signs plan updates when clinically appropriate.

---

### 12. Care delivery — Support
1. Support worker signs in to the support portal.
2. **Starts a shift**.
3. Completes assigned **tasks** (visit / in-home delivery work).
4. Ends the shift.

**Outcome:** Plan items are executed and tracked operationally.

---

### 13. Plan changes (re-approval)
If the coordinator makes a **material** change to an active / approved plan:
1. System creates a **new draft version**.
2. Coordinator submits again.
3. Family must **approve again** before the new version becomes current.

Non-material edits can stay in place without restarting family approval.

**Outcome:** Families stay in control when care intent meaningfully changes.

---

## Who sees what (simple)

| Content | Platform Admin | Family | Org Admin | Coordinator | Clinical | Support |
|---------|:--------------:|:------:|:---------:|:-----------:|:--------:|:-------:|
| Create org / invite org admin | ✓ | — | — | — | — | — |
| Assign family → organization | ✓ | — | — | — | — | — |
| Intake / episode status | — | ✓ | ✓ (org) | ✓ | ✓ (scope) | — |
| Assign family → coordinator | — | — | ✓ | — | — | — |
| Care plan (for approval) | — | ✓ | — | ✓ (create/submit) | ✓ (view / co-sign) | — |
| Clinical notes | — | — | — | API ready / UI pending | ✓ | — |
| Sessions / schedule | — | Appointments view | — | ✓ | Own sessions | Own sessions |
| Tasks / shifts | — | — | — | Assign / oversee | — | ✓ |

---

## Demo path (suggested order)

1. **Platform admin** — create organization + org admin invite  
2. **Family** — register (show awaiting-org state if useful)  
3. **Platform admin** — **Admin → Families** → assign family to the org  
4. **Family** — log in, complete onboarding + submit intake  
5. **Org admin** — assign coordinator (+ optional staff invites)  
6. **Coordinator** — validate intake → create/submit care plan  
7. **Family** — approve care plan  
8. **Coordinator** — schedule session + assign tasks  
9. **Clinical** — assessment + clinical note  
10. **Support** — start shift + complete task  
11. *(Optional)* Coordinator material edit → family re-approval  

---

## One-line summary

**Platform admin creates the org and assigns families into it → org admin assigns a coordinator → coordinator validates and plans → family approves → clinical assesses and documents → support delivers tasks → meaningful plan changes return to the family.**
