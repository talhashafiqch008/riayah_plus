# Milestone 2 — Client Live Demo Guide

**Purpose:** Present the complete Milestone 2 workflow from family onboarding through assessment completion.  
**Recommended duration:** 20–25 minutes  
**Environment:** Local client `http://localhost:5173` · API `http://localhost:5001`  
**Demo password for all accounts:** `Password123!`

---

## 1. What This Demo Proves

Milestone 2 delivers the clinical onboarding foundation:

- An eight-step family onboarding flow
- Care Unit and patient profile management
- Coded diagnoses, urgency, service selection and categorized documents
- Required Privacy and Treatment consent with immutable audit metadata
- A coordinator intake queue with filters and structured review
- Care Episode creation and controlled lifecycle transitions
- Assessment scheduling, clinician completion and family visibility
- Live role-dashboard statistics
- Role-aware 2FA login support
- Organization-level isolation for clinical records

The main story is:

> Family submits clinical intake → coordinator reviews it → system creates a Care Episode → coordinator schedules an assessment → clinician completes it → family sees the result.

---

## 2. Pre-Call Checklist

Complete this 30–60 minutes before the call.

### Start and verify the application

```bash
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

Open:

- Client: http://localhost:5173
- API health: http://localhost:5001/api/health

Do **not** rerun the full legacy seed immediately before the call. The required demo users and two-tenant test fixtures already exist locally.

### Verify these accounts

- Family: `family@demo.com`
- Coordinator: `coordinator@riayahplus.com`
- Clinical staff: `clinical@demo.com`
- Admin: `admin@riayahplus.com`
- Second-tenant coordinator: `coordinator.b@riayahplus.com`

### Prepare demo data

- [ ] Confirm at least one intake appears as **Submitted** in `/coordinator/intake`
- [ ] Confirm at least one Care Episode exists in `/coordinator/episodes`
- [ ] Confirm `clinical@demo.com` appears in the assessment clinician list
- [ ] Keep a small, non-sensitive PDF ready as `sample-referral.pdf`
- [ ] Confirm the family and coordinator dashboards show numbers instead of `—`
- [ ] Close unrelated tabs and hide terminal secrets
- [ ] Set browser zoom to 90–100%
- [ ] Disable notifications that could appear during screen sharing

### Safest demo-data strategy

Prepare one **Submitted** intake before the call. During the call:

1. Show the complete family wizard.
2. Submit live only if the patient has no open intake.
3. If the API reports that an open intake already exists, say:

> “The platform prevents duplicate open intakes for the same patient. I’ll use the prepared submitted intake to continue the workflow.”

Then switch to the coordinator queue and continue without losing time.

### Local document-storage note

The upload flow supports S3 signed uploads when AWS credentials are configured. In the local demo, it may use the local fallback under `server/uploads/intake/`. Present this accurately:

> “The storage adapter is S3-ready; this local environment uses the configured fallback when cloud credentials are absent.”

---

## 3. Demo Accounts and Routes

### Family

- Login: http://localhost:5173/login?portal=family
- Dashboard: `/family`
- Onboarding: `/family/onboarding`
- Care Unit: `/family/care-unit`
- Episodes: `/family/episodes`
- Assessments/bookings: `/family/bookings`

### Coordinator

- Login: http://localhost:5173/login?portal=coordinator
- Dashboard: `/coordinator`
- Intake Queue: `/coordinator/intake`
- Patients: `/coordinator/patients`
- Episodes: `/coordinator/episodes`

### Clinical staff

- Login: http://localhost:5173/login?portal=clinical
- Dashboard: `/clinical`
- Schedule: `/clinical/schedule`

### Optional security checks

- Admin: `/admin`
- Tenant B coordinator: `coordinator.b@riayahplus.com`

---

## 4. Recommended 20–25 Minute Presentation

### Part 1 — Opening and Scope (1 minute)

### Say

> “Milestone 2 completes the clinical onboarding and assessment foundation. I’ll demonstrate one connected patient journey: a family submits an intake, a coordinator performs a structured review, the system creates a Care Episode, a clinician completes an assessment, and the family sees the updated information.”

> “Care-plan authoring, recurring staff scheduling and full clinical notes are intentionally Milestone 3. Today’s demo ends at the validated clinical episode and completed assessment.”

### Emphasize

- This is the real M2 role-based application, not the separate AI prototype.
- The workflow is connected end to end, not a set of isolated mock screens.
- Every actor sees only the actions relevant to their role.

---

### Part 2 — Family Dashboard and Live Data (1–2 minutes)

### Login

Use `family@demo.com` / `Password123!`.

### Show

1. Open `/family`.
2. Point out the role-specific navigation.
3. Point out live cards:
   - Active episodes
   - Upcoming visits
   - Unread alerts
4. Click **Refresh** to show that values come from APIs.

### Say

> “The family portal is no longer a static shell. These cards are calculated from the family’s episodes, assessments and notifications.”

---

### Part 3 — Eight-Step Family Onboarding (5–6 minutes)

Open `/family/onboarding`.

### Show the steps

1. **Care Unit**
   - Explain that a Care Unit groups the family, patient and related clinical records.
2. **Patient profile**
   - Show patient identity and clinical profile fields.
3. **Primary caregiver**
   - Show name, phone and relationship.
4. **Reason for care**
   - Enter a concise reason such as:
     `Post-discharge mobility and falls-risk support at home`
5. **Medical details**
   - Medical history: `Hypertension`
   - Current medication: `Amlodipine 5 mg`
   - Coded diagnosis: `I10`
6. **Urgency**
   - Select **High**.
7. **Service interests**
   - Select **Physiotherapy** and/or **Nursing**.
8. **Documents and consent**
   - Select category **Referral**
   - Upload `sample-referral.pdf`
   - Show the uploaded file in the list
   - Show Privacy and Treatment consent checkboxes

### Demonstrate validation

Before checking the required consents, try to continue or submit.

### Say

> “Privacy and Treatment consent are mandatory; the client and API both reject submission without them. On submission, we record the consent type, user, timestamp, document version, signature status, IP address where available and an immutable ConsentLog event.”

Check both consents and submit if the demo patient has no open intake.

### Expected result

- Success message
- Intake status **Submitted**
- Intake ID displayed

### If submission is blocked by an existing intake

Do not troubleshoot live. Explain the duplicate-intake guard and continue with the prepared Submitted intake.

---

### Part 4 — Coordinator Dashboard and Intake Queue (4–5 minutes)

Log out and sign in as `coordinator@riayahplus.com`.

### Show the dashboard

1. Open `/coordinator`.
2. Point out:
   - Pending intake
   - Active episodes
   - Plans awaiting review
3. Explain that care plans will become active in M3.

### Show the queue

1. Open `/coordinator/intake`.
2. Filter by **Submitted** and **High urgency**.
3. Open the prepared or newly submitted intake.
4. Point out:
   - Patient and family
   - Reason for care
   - Medical history and medications
   - Coded diagnoses
   - Requested services
   - Uploaded referral and its category
   - Consent panel with version and timestamp
5. Open the uploaded document.

### Perform structured review

Optionally click **Start review**, then enter:

- Key concerns: `Falls risk`, `Reduced mobility`
- Urgency indicators: `Recent discharge`
- Suggested service: `Physiotherapy`
- Risk flags: `Falls`
- Keep **Create care episode** enabled

Submit the review.

### Say

> “The review is deliberately structured rather than a single free-text box. This produces consistent clinical data for the episode, reporting and future care-plan workflow.”

### Expected result

- Intake changes to **Episode created**
- A Care Episode link is available
- Audit events are written for submission and review

---

### Part 5 — Care Unit, Patient Profile and Revision History (2–3 minutes)

Open `/coordinator/patients`.

### Show

1. Care Unit list and its patient/intake/episode counts
2. Care Unit detail
3. Patient profile with:
   - Point of contact
   - Coded diagnoses
   - Linked intake
   - Linked episode
4. Edit one harmless field, save and show **Edit history**

### Say

> “Profile changes do not silently overwrite clinical context. We keep revision snapshots so changes can be reviewed later.”

Avoid changing important clinical values during the call. A safe edit is a note or contact detail that you can restore afterward.

---

### Part 6 — Care Episode Lifecycle (2–3 minutes)

Open `/coordinator/episodes`, then open the new or prepared episode.

### Show

- Lifecycle stepper
- Status badge
- Intake-derived summary
- Diagnoses and services
- Timeline
- Linked patient
- Assessments section

If an allowed transition is available, advance the status one step.

### Say

> “Episode status changes are controlled by a state machine. The UI shows only valid next actions, while the API rejects illegal transitions.”

Do not force transitions just to reach a particular status; use whichever valid action is visible.

---

### Part 7 — Schedule and Complete an Assessment (4 minutes)

### As coordinator

From the episode’s **Assessments** section:

1. Select `clinical@demo.com`
2. Select an assessment type
3. Choose a near-future date and time
4. Click **Schedule assessment**

### Switch to clinical staff

Log in as `clinical@demo.com` and open `/clinical/schedule`.

1. Open the scheduled assessment.
2. Add structured findings, for example:
   - Mobility: `Requires assisted transfers`
   - Pain: `4/10 on movement`
   - Summary: `Moderate falls risk; physiotherapy recommended`
3. Add recommendations:
   `Twice-weekly physiotherapy with a home safety review`
4. Mark the assessment **Completed**.

### Say

> “Clinical staff see only their assigned assessments. Completion requires structured findings and either recommendations or a report reference; an empty completion is rejected.”

### Expected result

- Assessment status becomes **Completed**
- Findings remain linked to the Care Episode
- The family is notified

---

### Part 8 — Family Read-Only View (2 minutes)

Log back in as `family@demo.com`.

### Show

1. `/family/episodes`
   - Same episode
   - Updated status
   - Read-only lifecycle
2. `/family/bookings`
   - Scheduled/completed assessment
3. `/family/care-unit`
   - Family-scoped Care Unit and patient

### Say

> “The family sees the same connected care journey but cannot perform coordinator or clinician actions.”

---

### Part 9 — Security and Platform Controls (1–2 minutes)

Do not spend too long here; show or explain the controls.

### Mention

- Required role-based login
- 2FA code step supported across family, patient, coordinator, clinical and support portals
- Organization-scoped clinical lists and direct record access
- Immutable consent history
- Audit events for sensitive workflow actions
- Controlled episode and assessment state transitions

### Optional tenant-isolation proof

Sign in as `coordinator.b@riayahplus.com`.

Show that `/coordinator/episodes` and `/coordinator/patients` contain only Partner Care Org data. A direct request for a Tenant A episode returns `403 Forbidden`.

### Say

> “Tenant isolation is enforced in the API, not only by hiding UI links. Lists are organization-scoped and direct foreign record IDs are denied.”

---

## 5. Closing Milestone 2 (1 minute)

### Say

> “This completes the seven signed Milestone 2 deliverables: family onboarding, structured intake review, Care Unit and patient profiles, Care Episode lifecycle, assessment scheduling and reporting, categorized document management, and the coordinator queue.”

> “The result is a clinically structured intake-to-assessment pipeline. Milestone 3 will build the operational care-delivery layer on top of these episodes and assessment findings.”

### Do not claim

- Do not call the local environment production deployment.
- Do not claim local fallback files are currently stored in AWS if AWS credentials are not configured.
- Do not present placeholder care-plan, messaging or support-worker pages as completed M2 work.
- Do not present `/demo/coordinator/*` AI screens as M2.

---

## 6. What Comes Next in Milestone 3

**Milestone 3: Care Planning, Scheduling and Care Delivery**  
**Proposal budget:** $700  
**Proposal timeline:** Weeks 3–4

### 1. Structured Care Plan Builder

The coordinator will build a Care Plan inside the completed Care Episode using:

- SMART goals with measurable outcomes and target dates
- Service type, frequency, duration and unit cost
- Assigned staff roles
- Reusable goal and service templates
- Version control where every material edit creates a new immutable version

### 2. Family Review and Approval

The workflow will be:

> Coordinator submits → family reviews → approve, request changes or reject → optional clinical co-sign → activation

Material changes will require re-approval.

### 3. Staff Availability and Scheduling

M3 will add:

- Staff availability and roster management
- Slot-based booking
- Family, coordinator and clinician booking paths
- Skill and Care Plan eligibility checks
- Conflict detection and no double booking
- Recurring appointment generation

### 4. Task-Based Care Delivery

Approved Care Plan services will generate trackable tasks:

- Assigned employee
- Priority and due date
- Estimated and actual duration
- Completion evidence
- Notes and audit trail
- Missed-task alerts and overdue critical-task escalation

### 5. Structured Clinical Documentation

M3 will add immutable, versioned notes separated by role:

- Clinical notes
- Nursing notes
- Therapy notes
- Shift notes
- Coordination notes

### 6. Goals, Progress and Incidents

- Goal progress against measurable criteria
- Achievements linked to goals and supporting evidence
- Incident reporting for falls, medication errors, safeguarding, missed visits and escalations
- Coordinator and doctor dashboard widgets
- M3 workflow notifications

### Recommended M3 demo story

> Completed assessment → coordinator builds Care Plan → family requests a change → coordinator publishes a new version → family approves → plan activates → recurring appointments and staff tasks are generated → staff completes a visit with evidence and notes → goal progress updates.

---

## 7. Questions the Client May Ask

### “Is Milestone 2 complete?”

> “The signed M2 clinical features are implemented locally. The remaining handoff activity is the final E2E sign-off and staging deployment.”

### “Are uploaded files in S3?”

> “The upload flow supports S3 signed uploads. This local demo uses the local fallback unless AWS credentials are configured; staging will use the configured cloud storage.”

### “Is the Care Plan builder included?”

> “The episode and assessment foundations are ready. The complete builder, versioning and family approval workflow are signed Milestone 3 deliverables.”

### “Does the system use AI to create intake summaries or Care Plans?”

> “No. AI-generated intake and Care Plans were explicitly excluded from this scope. The current review is structured and human-led.”

### “Can one organization see another organization’s patients?”

> “No. M2 clinical lists are organization-scoped, and direct requests for another tenant’s clinical records return 403.”

### “Is this production-ready?”

> “This is the completed local M2 implementation. Production-style client review requires the remaining EC2/Vercel staging deployment and environment smoke test.”

### “What is intentionally not in M2?”

- Care Plan builder and approval — M3
- Recurring scheduling and staff task workflows — M3
- Full clinical/shift notes — M3
- Telehealth, payments and secure messaging — M4
- Mobile app and GPS workflows — M5
- AI intake or AI Care Plan generation — excluded

---

## 8. Live Demo Recovery Guide

### Intake submission says an open intake already exists

This is expected duplicate protection. Use the existing Submitted intake in the coordinator queue.

### Coordinator queue appears empty

- Change the status filter to **All**
- Check **Submitted**, **Under review** and **Episode created**
- Refresh the page

### Uploaded document does not appear

- Use a small PDF or image
- Confirm a document category was selected
- Check that the API is running
- For local mode, confirm `server/uploads/intake/` is writable

### Assessment cannot be completed

Add:

- At least one structured finding
- Recommendations or a valid report URL

### Login says email is not verified

Verify demo accounts before the call. If needed:

```sql
UPDATE users
SET "isEmailVerified" = true, "emailVerifiedAt" = NOW()
WHERE email LIKE '%@demo.com' OR email LIKE '%@riayahplus.com';
```

### A status action is unavailable

The state machine only exposes valid transitions. Explain this as a safety feature and continue with the current valid action.

### The UI shows a placeholder

Return to the M2 routes in this guide. Care Plans, full clinical notes, support-worker delivery and messaging belong to later milestones.

---

## 9. Final Five-Minute Backup Version

If the meeting runs short:

1. **Family onboarding:** show the eight steps, categorized document and required consents.
2. **Coordinator queue:** open a Submitted intake and point out structured clinical data.
3. **Structured review:** show concern, urgency, service and risk chips; explain episode creation.
4. **Episode:** show lifecycle, linked patient and assessment.
5. **Clinical:** show completed assessment findings.
6. **Family:** show the read-only episode and assessment.
7. **Close:** explain that M3 turns the completed assessment into an approved, scheduled and executable Care Plan.

Use this closing line:

> “Milestone 2 establishes who needs care, why they need it, the reviewed clinical episode and the initial assessment. Milestone 3 converts that validated need into an approved Care Plan, staff schedule, delivery tasks, clinical documentation and measurable outcomes.”

