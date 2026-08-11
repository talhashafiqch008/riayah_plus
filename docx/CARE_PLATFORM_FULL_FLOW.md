# Riayah Plus — Care Platform Flow (Full)

**Audience:** Client meeting walkthrough  
**Scope:** Account creation + organization-based care delivery

---

# Part A — Account creation

How each role gets into the system before care delivery starts.

## Emails overview

Two different emails are used during onboarding:

### 1. Email verification (self-registration — Family)

**When:** Family registers themselves.  
**Subject:** `Verify your Riayah Plus email`  
**Body (essentially):**

> Welcome to Riayah Plus! Please verify your email address:  
> **[Verify Email]**

**Link:** Points to the API verify endpoint (`/api/email/verify?token=...&email=...`).  
**Expiry:** 24 hours.  
**Effect:** Marks the account as email-verified. Login is blocked until this is done.

Family can also request a **resend verification** email if needed.

### 2. Set-password invite (invited staff — Org Admin, Coordinator, Clinical, Support)

**When:** Platform admin / org admin invites the user.  
**Subject:** `Set up your Riayah Plus account`  
**Body (essentially):**

> Hello {name},  
> You have been invited as a **{role}** on Riayah Plus.  
> Click the link below to set your password and access your dashboard:  
> **[Set Password]**  
> This link expires in 7 days.

**Link:** Frontend `/set-password?token=...&email=...`  
**Note:** Invited accounts are created already **email-verified**. They do **not** get a separate verification email — the invite + set-password flow is enough.

### 3. Family assigned to organization (after admin assignment)

**When:** Platform admin assigns a registered family to an org.  
**Subject:** `Your Riayah Plus account is ready — you can log in now`  
**Effect:** Confirms the family is linked to a care organization. Care units / intakes created earlier are backfilled to that org. Family may already have been logged in and requesting care before this email.

---

## A1. Org Admin

1. Platform admin signs in → http://localhost:5173/login?portal=admin
2. Opens **Admin → Organizations**.
3. Creates a new organization (name, details).
4. Enters **org admin name + email** on the create form.
5. System creates the `org_admin` user and emails a **set-password invite** (`Set up your Riayah Plus account`).
6. Org admin opens the invite link → `/set-password` → sets password.
7. Org admin signs in → http://localhost:5173/login?portal=org

**Outcome:** Organization exists with an org admin who can manage staff and families.

---

## A2. Care Coordinator

1. Org admin signs in → `/org`.
2. Opens **Coordinators**.
3. Invites a coordinator (name + email).
4. System creates the `care_coordinator` user and emails a **set-password invite** (`Set up your Riayah Plus account`).
5. Coordinator opens the invite → sets password.
6. Coordinator signs in → http://localhost:5173/login?portal=coordinator

**Resend:** Org admin can resend invite only while the coordinator has not set a password yet.

**Outcome:** Coordinator belongs to the org and can receive assigned families / intakes.

---

## A3. Clinical Staff

1. Org admin signs in → `/org`.
2. Opens **Staff**.
3. Invites a clinical user (name + email + role, e.g. `clinical_staff` / doctor / nurse / therapist).
4. System creates the staff user and emails a **set-password invite** (`Set up your Riayah Plus account`).
5. Clinical user opens the invite → sets password.
6. Clinical user signs in → http://localhost:5173/login?portal=clinical

**Outcome:** Clinical capacity exists for assessments, notes, and sessions.

---

## A4. Support Worker

1. Org admin signs in → `/org`.
2. Opens **Staff**.
3. Invites a support worker (name + email + role `support_worker`).
4. System creates the user and emails a **set-password invite** (`Set up your Riayah Plus account`) — same invite path as clinical.
5. Support worker opens the invite → sets password.
6. Support worker signs in → http://localhost:5173/login?portal=support

**Outcome:** Support capacity exists for shifts and task delivery.

---

## A5. Family

1. Family registers a new account (family / patient role) via the public registration / family portal.
2. System emails **email verification**: subject `Verify your Riayah Plus email`, with a **Verify Email** button.
3. Family clicks **Verify Email** (link expires in 24 hours). Until verified, login is blocked.
4. At registration, the family still has **no organization** yet.
5. After verification, family **can log in** and complete onboarding / submit a care request even while unassigned (`organizationId` null). The family portal shows a soft banner that an organization will be assigned shortly — this does **not** block navigation or Finish.
6. Platform admin opens **Admin → Families** (unassigned filter).
7. Finds the unassigned family and **assigns them to an organization**.
8. System backfills related care unit / intake org linkage; family may receive an **account ready / org assigned** email.
9. Org / coordinator flow continues as today once the family is linked.

**Outcome:** Family email is verified; they can request care immediately; admin later places them in an org so intakes enter that org’s queue.

> Families do **not** self-select an organization. Platform admin assigns them.  
> **Order for family:** register → verify email → log in and request care → admin assigns org (backfill).

---

## Account-creation order (recommended)

```
Platform admin creates Org (+ Org Admin invite / set-password email)
    → Org Admin invites Coordinator (set-password email)
    → Org Admin invites Clinical (set-password email)
    → Org Admin invites Support (set-password email)
    → Family registers → verification email (Verify your Riayah Plus email)
    → Family clicks Verify Email → can log in and request care
    → Platform admin assigns Family → Org (backfill + optional account-ready email)
```

After that, care delivery follows Part B below.

---

## Deferred (discuss later)

- **Staff invite / profile more details** — license, specialties, languages, availability, photo, etc. TBD; not in this pass.
- **Doctor / clinician details with photos** — clinician is clinical staff; profile schema + UI enrichment TBD; not in this pass.

---

# Part B — Care delivery flow

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
    → Family registers → verifies email → can log in
    → Family completes intake (org may still be null)
    → Platform admin assigns family to an organization (backfill)
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

### 2. Family registers and can use the portal
1. Family creates an account (family / patient role) and verifies email.
2. At registration, the family has **no organization yet** (`organizationId` is empty).
3. After verification, family **can log in** and continue onboarding / care request. A soft banner notes that an organization will be assigned shortly — login and Finish are **not** blocked.

**Outcome:** Family account exists; they may already have submitted a care request before org assignment.

---

### 3. Platform admin assigns the family to an organization
1. Platform admin opens **Admin → Families**.
2. Finds the unassigned family.
3. **Assigns the family to an organization**.
4. System backfills related care unit / intake org linkage.
5. Family may receive an email that they have been assigned.

**Outcome:** Family belongs to a specific hospital / care org; prior intakes enter that org’s queue.

> This is the critical platform-admin step: **users do not pick their org themselves — admin assigns them.**

---

### 4. Family requests care (intake)
1. Family signs in to the family portal (allowed with or without org).
2. Completes clinical onboarding (care unit, care recipient, history, documents, consent).
3. Submits intake — `organizationId` may be null until admin assign, then backfilled.
4. Once assigned, intake appears as **pending** for that organization.

**Outcome:** Care request can be submitted before org assignment; after assignment it is in the org queue for coordinator assignment / review.

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
2. **Org admin** — invite coordinator, clinical, support  
3. **Family** — register, verify email, log in, complete onboarding + submit intake (may still be unassigned)  
4. **Platform admin** — **Admin → Families** → assign family to the org (backfill)  
5. **Org admin** — assign coordinator to the family  
6. **Coordinator** — validate intake → create/submit care plan  
7. **Family** — approve care plan  
8. **Coordinator** — schedule session + assign tasks  
9. **Clinical** — assessment + clinical note  
10. **Support** — start shift + complete task  
11. *(Optional)* Coordinator material edit → family re-approval  

---

## One-line summary

**Create accounts (org → staff → family) → family can log in and intake before org assign → admin assigns org (backfill) → org assigns coordinator → coordinator validates and plans → family approves → clinical assesses and documents → support delivers tasks → meaningful plan changes return to the family.**
