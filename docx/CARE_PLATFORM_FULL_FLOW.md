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
**Effect:** Tells the family they can log in to the family portal (org is now linked).

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
5. Even after verification, family login stays blocked until org assignment (“awaiting organization”).
6. Platform admin opens **Admin → Families**.
7. Finds the unassigned family and **assigns them to an organization**.
8. Family receives a second email: **account ready / org assigned** (login link → family portal).
9. Family signs in → http://localhost:5173/login?portal=family

**Outcome:** Family email is verified, belongs to a specific org, and can complete intake / care requests.

> Families do **not** self-select an organization. Platform admin assigns them.  
> **Order for family:** register → verify email → admin assigns org → log in.

---

## Account-creation order (recommended)

```
Platform admin creates Org (+ Org Admin invite / set-password email)
    → Org Admin invites Coordinator (set-password email)
    → Org Admin invites Clinical (set-password email)
    → Org Admin invites Support (set-password email)
    → Family registers → verification email (Verify your Riayah Plus email)
    → Family clicks Verify Email
    → Platform admin assigns Family → Org (account-ready email)
```

After that, care delivery follows Part B below.

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
2. **Org admin** — invite coordinator, clinical, support  
3. **Family** — register (show awaiting-org state if useful)  
4. **Platform admin** — **Admin → Families** → assign family to the org  
5. **Family** — log in, complete onboarding + submit intake  
6. **Org admin** — assign coordinator to the family  
7. **Coordinator** — validate intake → create/submit care plan  
8. **Family** — approve care plan  
9. **Coordinator** — schedule session + assign tasks  
10. **Clinical** — assessment + clinical note  
11. **Support** — start shift + complete task  
12. *(Optional)* Coordinator material edit → family re-approval  

---

## One-line summary

**Create accounts (org → staff → family assignment) → family intakes → org assigns coordinator → coordinator validates and plans → family approves → clinical assesses and documents → support delivers tasks → meaningful plan changes return to the family.**
