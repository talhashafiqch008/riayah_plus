# Riayah Plus HealthOS — Milestone Specifications

*Sources: `Riayah_Plus_Proposal_v2.pdf` (signed proposal — **milestone scope & payment**), `Riayah_Plus_HealthOS_Specification.docx` (v1.2 — architectural mandates), `Proposed Additions & Modules.pdf` (module & RBAC detail). Last updated: 2026-07-07.*

> **How to use this doc**
> 1. **Proposal sections** = what you must deliver to close the milestone and get paid.
> 2. **HealthOS / Additions sections** = how to implement those deliverables correctly (data shapes, UX patterns, rules).
> 3. Items marked **Out of scope (Proposal §5.2)** must not be scheduled in M1–M5.

> For PERN conversion fixes, see `BACKEND_PARITY.md` Section 23.

---

## Signed Proposal — Scope Exclusions (§5.2)

| Exclusion | Implication |
|---|---|
| AI/LLM intake summarisation, care plan drafting, or risk detection | No `AI Generated` care plan step, no AI intake summary in onboarding |
| **Multi-language / localization support** | **No Arabic-first landing, RTL default, or language toggle** |
| Native public App Store / Play Store listing | M5 = TestFlight + Play internal track only |
| Ongoing maintenance post-delivery | Handover only |
| Third-party API subscription costs | Client-owned accounts |
| Continuous GPS outside check-in/check-out | Location captured at visit start/end only |

**HealthOS vs Proposal:** The HealthOS spec describes Arabic-first landing (§3.1), AI intake summary (§3.2), and AI plan drafting (§4) as product vision. The **signed proposal excludes** localization and AI automation — build the **manual/coordinator-led flows** instead.

---

## System Backbone (HealthOS — applies across all milestones)

> *"Everything clinical or operational exists inside a Care Episode. Care Plan → Task Engine → Execution Loop."* — HealthOS §1.1

### Data hierarchy (enforce via FKs + middleware)

```
Organization → Branch (Clinic) → Department → Employee
  → Care Unit (Family) → Patient → Care Episode
    → Assessment → Medical Reports → Care Plan
      → Goals → Services → Appointments → Session Notes → Reviews
        → Outcome Report → Episode Closed
```

### State machines (no direct status PATCH)

| Entity | States |
|---|---|
| **Care Episode** | Draft → Assessment Pending → Assessment Complete → Care Planning → Awaiting Family Approval → Active → Under Review → Completed → Closed → Archived |
| **Care Plan** | Draft → Coordinator Review → Clinical Review (optional) → Family Review → Approved → Activated → Superseded → Archived *(skip `AI Generated` — excluded)* |
| **Appointment** | Requested → Booked → Confirmed → Checked In → In Progress → Completed → Closed (+ Cancelled, Rescheduled) |
| **Assessment** | Scheduled → In Progress → Completed → Reviewed → Approved |
| **Intake (M2)** | Submitted → Under Review → Validated → Episode Created |

### Developer mandates (HealthOS §10)

1. Every structural clinical record belongs to a **Care Episode**.
2. Care Plans are **version-controlled** (immutable prior versions).
3. **Tasks** are the execution layer — bridge plans to appointments/sessions.
4. **No free-text clinical data** — ICD-10 diagnoses, structured goals, segregated notes.
5. **Multi-branch native** — tenant scoping in middleware, not schema-only.

---

## RBAC Matrix (Proposed Additions — implement per milestone)

Proposal M1 requires **6 roles**: Family, Patient, Care Coordinator, Clinical Staff, Support Worker, Admin.

HealthOS / Proposed Additions expand to granular Create/Edit/Delete/Approve:

| Role | View | Create | Edit | Delete | Approve |
|---|---|---|---|---|---|
| Family | Own records | Consultation request | Own profile | — | Care Plan, Quotation |
| Patient | Own records | — | Basic profile | — | — |
| Care Coordinator | Assigned patients | Episodes, Plans, Tasks, Notes | Clinical records (assigned) | Drafts only | Coordinator actions |
| Doctor | Assigned patients | Assessments, Clinical Notes | Assessments, Plans | — | Clinical sign-off |
| Nurse | Assigned patients | Nursing/Shift Notes | Own notes | — | — |
| Support Worker | Assigned tasks | Shift Notes | Own notes | — | — |
| Receptionist | Bookings, patient list | Bookings | Bookings | Bookings only | — |
| Clinic Admin | All (branch) | Employees, schedules | Branch records | Branch records | Branch approvals |
| Super Admin | Everything | Everything | Everything | Everything | Everything |

**M1:** Auth + route-level role gates for 6 proposal roles.  
**M2–M5:** Add per-action permission middleware as modules ship.

---

## Non-Functional Requirements

| Requirement | Target |
|---|---|
| API response time | < 500ms p95 |
| Concurrent users | 10,000 |
| Uptime | 99.9% |
| Backups | Daily automated |
| Encryption | TLS in transit; at rest for DB + files |
| Audit logging | Foundation M1; full viewer M5 |
| Data residency | Qatar region |
| Multi-clinic | Org → Branch → Department in middleware |

---

## M1 — Foundation & Infrastructure ($500) — Week 1

### What this milestone is about

Establishes the entire technical foundation. **No clinical features** until architecture, database, and authentication are solid. Everything in M2–M5 builds on this layer.

### Signed proposal deliverables

- Fully functional authentication system (web)
- PostgreSQL database with complete schema and migrations
- RBAC middleware protecting all routes
- Org hierarchy management (Admin)
- Adaptive UI shell with role-based navigation
- Audit logging foundation active across all endpoints
- Deployed to staging (EC2 + Vercel)

### Signed proposal technical requirements

| Area | Requirements |
|---|---|
| **Backend** | Express modular domains: auth, users, organizations, patients, episodes, plans, scheduling, billing, payments, telehealth, audit, notifications |
| **Database** | PostgreSQL on AWS RDS; Prisma full schema (Users, Roles, Orgs, Clinics, Departments, Employees, CareUnits, Patients, CareEpisodes, Assessments, CarePlans, Goals, Services, Sessions, Invoices, Payments, AuditLogs, Messages, Notifications) |
| **Infra** | Zod validation, centralized errors, Winston + CloudWatch, AWS Secrets Manager |
| **Auth** | JWT 15min access + 7-day rotating refresh; bcrypt (12 rounds); OTP password reset (10 min); session management, forced logout, device tokens; rate limiting per user/IP |

### HealthOS / Additions — how to build M1 correctly

| Topic | Implementation detail |
|---|---|
| **Schema as blueprint** | Prisma models must support the full hierarchy (§1.2) even if routes come in later milestones — avoids rework |
| **Tenant scoping** | Every query middleware should accept `organizationId` / `branchId` context from the authenticated user |
| **State machine prep** | Add status enums + transition validators as shared utilities; routes in M2+ call them |
| **Audit foundation** | Log: login, logout, password change, MFA, role changes, deactivation. Fields: `userId`, `action`, `resourceType`, `resourceId`, `timestamp`, `ipAddress`, `deviceInfo` |
| **Adaptive UI shell** | Role-based nav sidebars per proposal roles (Family, Patient, Coordinator, Clinical Staff, Support Worker, Admin) — not legacy marketplace-only nav |
| **RBAC depth** | Start with 6 roles; design permission middleware to extend to full matrix above |

### What to build (checklist)

**Backend**
- [ ] Verify JWT 15min access + 7-day rotating refresh (hash refresh tokens in DB, rotate on use)
- [ ] Org CRUD: `POST/GET/PATCH/DELETE` organizations, branches (clinics), departments
- [ ] RBAC middleware: 6 proposal roles + route protection on all existing routes
- [ ] Granular permission helper (Create/Edit/Delete/Approve) — stub for M2+
- [ ] AuditLog: add `ipAddress`, `deviceInfo`; middleware to log auth + admin actions
- [ ] Winston + CloudWatch structured logging
- [ ] AWS Secrets Manager integration
- [ ] Forced logout + device token management endpoints
- [ ] Rate limiting on `/login`, `/register`, `/otp`, etc.
- [ ] Confirm Prisma schema covers all proposal entities; run migrations

**Frontend**
- [ ] Adaptive shell: role-based sidebar/nav for 6 proposal roles
- [ ] Login, register, OTP, password reset flows (web)
- [ ] Redirect to role dashboard after auth (`getRoleDashboard`)

**DevOps**
- [ ] Staging: AWS EC2 (API) + Vercel (client)
- [ ] Environment-specific configs (dev/staging/prod)

### Current status (PERN)

| Deliverable | Status |
|---|---|
| Auth (login, OTP, 2FA, httpOnly cookies) | `[x]` |
| JWT rotation | `[~]` verify 15m/7d end-to-end |
| Role guards (client + server) | `[~]` authenticate only; no Create/Edit/Delete gates |
| Org/branch/department routes | `[ ]` |
| Adaptive UI shell (proposal roles) | `[~]` legacy provider/careseeker/admin |
| Winston + CloudWatch | `[ ]` |
| AWS Secrets Manager | `[ ]` |
| Staging deploy | `[ ]` |
| Audit foundation | `[~]` model exists; incomplete fields/wiring |

---

## M2 — Onboarding, Patient Management & Assessments ($600) — Week 2

### What this milestone is about

Delivers the **intake and onboarding workflow end-to-end** — the entry point for every patient journey. After M2, a family can register, complete clinical intake, have a coordinator review it, and land in a Care Episode with assessments bookable.

### Signed proposal deliverables

- Complete multi-step family onboarding flow (web)
- Structured coordinator-led intake review workflow
- Patient and Care Unit profile management
- Care Episode creation and lifecycle management
- Assessment scheduling, booking, and reporting system
- Document upload and management (S3-backed)
- Coordinator onboarding queue and review dashboard

### Signed proposal technical requirements

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

### HealthOS / Additions — how to build M2 correctly

| Topic | HealthOS reference | Build in M2? |
|---|---|---|
| Family onboarding pipeline | §3.2: Account → Patient → Intake → Reports → Consent → Assessment Booking | **Yes** — skip Landing Page marketing, AI summary |
| Consent engine | §3.3: 7 consent types + immutable audit metadata | **Yes** — capture Privacy + Treatment (+ Telehealth if applicable) at intake |
| Assessment system | §8.1: Booking → Clinician → Session → Structured metrics → Report → Episode | **Yes** |
| ICD-10 diagnoses at intake | §4.2: structured diagnoses, no free text | **Yes** — use coded entries on intake form |
| Attachment categories | Additions: assessment, medical_report, referral, consent, etc. | **Yes** — enforce on `FileAttachment` |
| Patient timeline | Additions: Registration → Consultation → Assessment → … | **Partial** — auto-advance timeline on state transitions |
| Coordinator dashboard | Additions: assigned patients, pending assessments, queue | **Yes** — intake queue + filters minimum |
| Arabic-first landing / RTL | §3.1 | **No** — excluded §5.2 |
| AI intake summary | §3.2 | **No** — excluded §5.2 |
| Employee management module | Additions | **Defer** — not M2 deliverable |

**Consent types to support (when capturing at intake):**

| Type | When |
|---|---|
| Privacy Consent | Account / intake start |
| Treatment Consent | Before clinical data collection |
| Telehealth Consent | If telehealth interest selected |
| Data Sharing Consent | If external reports uploaded |
| Media Consent | Optional at intake |
| Care Plan / Quotation Approval | M3/M4 |

**Consent audit fields (immutable):** `documentVersion`, `timestamp`, `userId`, `deviceFingerprint`, `ipAddress`, `signatureStatus`

**Assessment flow (HealthOS §8.1):**
```
Booking Confirmed → Clinician Assigned → Session Completed
  → Structured Metrics Recorded → Clinical Report Generated → Linked to Care Episode
```

### Data models & API surfaces (M2)

| Model / Route | Purpose |
|---|---|
| `CareUnit` | Family care context (distinct from Patient) |
| `Patient` | Profile with version history |
| `IntakeRecord` | Immutable intake snapshot + status |
| `CareEpisode` | Parent for all downstream clinical data |
| `Assessment` | Scheduling, booking, `episodeId` FK required |
| `Consent` | Typed consent events with audit metadata |
| `FileAttachment` | S3-backed, categorized uploads |
| `GET /coordinator/intake-queue` | Filter by status, urgency |
| `POST /intake/:id/review` | Structured coordinator summary |

### What to build (checklist)

**Backend**
- [ ] `CareUnit` model + CRUD
- [ ] Multi-step intake API (wizard state or step endpoints)
- [ ] Intake state machine guard
- [ ] `CareEpisode` CRUD + episode state machine (starts at Draft / Assessment Pending)
- [ ] `Assessment` CRUD: schedule, book, complete, link to episode
- [ ] S3 signed URL upload (`GET /storage/signed-url`) with attachment categories
- [ ] `Consent` model: add audit fields; record at intake steps
- [ ] ICD-10 diagnosis entries on patient/intake (structured, not free text)
- [ ] Coordinator intake queue + structured review endpoint
- [ ] Versioned edit history on Patient / CareUnit profiles
- [ ] AuditLog on every intake review action

**Frontend**
- [ ] Multi-step family onboarding wizard (web)
- [ ] Document upload UI (drag-drop, progress, categories)
- [ ] Coordinator queue dashboard (status/urgency filters, detail view, review form)
- [ ] Patient / Care Unit profile management screens
- [ ] Assessment booking UI for family/coordinator

### Current status (PERN)

| Deliverable | Status |
|---|---|
| CareUnit model | `[ ]` |
| CareEpisode routes + lifecycle | `[~]` schema only |
| Assessment routes + episodeId | `[~]` schema only |
| Clinical intake onboarding | `[~]` generic onboarding, not clinical |
| Intake state machine | `[ ]` |
| Consent audit fields | `[~]` partial model |
| S3 intake uploads | `[~]` generic documents |
| Coordinator queue + review | `[ ]` |

---

## M3 — Care Planning, Scheduling & Care Delivery ($700) — Weeks 3–4

### What this milestone is about

The **most clinically complex milestone** — the operational heart of the platform. Delivers care plan builder, family approval workflow, staff scheduling, in-person care delivery, clinical documentation, and goal tracking.

### Signed proposal deliverables

- Structured care plan builder with full editing and version control
- Family care plan approval/rejection workflow
- Staff availability management and slot-based scheduling engine
- Recurring appointment generation with conflict detection
- In-person care delivery task workflows for Support Workers
- Structured clinical documentation system with immutable history
- Goal and progress tracking linked to Care Plan

### Signed proposal technical requirements

**Care plan builder (within Care Episode, post-assessment):**
- SMART Goals: title, description, target date, measurement criteria, status
- Services: type, frequency, duration, unit cost, assigned staff
- Reusable goal/service templates
- Version control: every edit → new version; prior versions immutable

**Approval workflow:**
```
Coordinator submits → Family notified (email + in-app)
  → Family: Approve | Request Changes | Reject
  → Clinical staff co-sign (optional)
  → On approval: Active + goals → trackable tasks
  → Material changes → re-approval required
```

**Scheduling:** Recurring availability, slot-based booking, conflict detection, recurring appointment generation.

**Care delivery:** Task-based in-person workflow for Support Workers with evidence upload.

**Clinical docs:** Immutable versioned notes per session.

**Goal tracking:** Progress against measurable criteria.

### HealthOS / Additions — how to build M3 correctly

**Care plan object (HealthOS §4):**

| Component | Required fields / rules |
|---|---|
| Patient link | Name, DOB, unique ref, POC, assigned coordinator, clinic/branch |
| Diagnoses | ICD-10 coded — `code`, `description`, `doctorName`, `specialty`, `date`, `episodeId` |
| Medical reports | `reportName`, `doctorName`, `specialty`, `date`, `fileAttachmentId` |
| Goals (tiered) | Short (1mo–1yr), Medium (6mo–3yr), Long (1–5yr) — not freeform |
| Goal schema | `title`, `tier`, `category` (Clinical/Functional/Behavioural/Mobility/Cognitive), `description`, `targetDuration`, `priority`, `assignedStaffId`, `measurableOutcome`, `status` |
| Achievements | Always linked to `goalId` — `description`, `evidenceFileId`, `date`, `verifiedBy`, `status` |
| Services | `Total = Frequency × Duration × Unit Cost` + assigned staff role |

**Care plan lifecycle (Proposed Additions):**
```
Assessment Complete → Coordinator builds Draft
  → Coordinator Review → Doctor Review (optional)
  → Family Review → Revision loop → Approval → Activation
  → Tasks Generated → Appointments Generated → Monitoring → Review → Version Archived
```

**Task engine (HealthOS §6 + Additions) — execution layer:**

Every task must have:
`taskId`, `careEpisodeId`, `carePlanId`, `goalId?`, `serviceId?`, `assignedEmployeeId`, `priority`, `dueDate`, `estimatedDuration`, `actualDuration`, `status`, `completionEvidence`, `notes`, `auditTrail`

**Task rules:**
- Recurring services auto-generate recurring tasks on plan activation
- Completing a task updates appointment + service progress
- Completed tasks cannot be edited — amendment or supervisor action only
- Missed tasks → coordinator alert
- Overdue critical tasks → auto-escalation

**Task types:** Clinical, Service, Administrative, System

**Three-way booking (HealthOS §7):**
- Family self-booking, Coordinator booking, Clinician booking
- Validation: roster compliance, care plan eligibility, skill matching, **no double bookings**

**Segregated notes (HealthOS §8.2) — no generic Note model:**

| Note type | Role |
|---|---|
| Clinical Notes | Doctors |
| Nursing Notes | Nurses |
| Shift Notes | Support Workers |
| Therapy Notes | Allied Health |
| Coordination Notes | Care Coordinators |

**Incident management (Additions — build in M3):**

Types: Falls, Medication errors, Complaints, Safeguarding, Missed visits, Clinical escalation, Near misses  
Fields: `patientId`, `episodeId`, `staffId`, `location`, `incidentType`, `severity`, `description`, `reportedAt`, `reportedBy`, `investigationStatus`, `resolutionNotes`, `resolvedAt`, `resolvedBy`

**Dashboards (wire minimum widgets):**

| Role | Key widgets |
|---|---|
| Coordinator | Assigned patients, today's appointments, pending assessments, pending approvals, high-risk flags, overdue docs, task completion % |
| Doctor | Today's patients, assessments due, telehealth queue, reports awaiting review |
| Family | *(basic)* active plan summary — full widgets in M4/M5 |

**Notifications (M3 events):**
- Assessment due → Coordinator
- Report uploaded → Coordinator, Doctor
- Care plan approved → Family, Coordinator
- Task overdue → Staff, supervisor
- Goal review due → Coordinator

### What to build (checklist)

**Backend**
- [ ] Care Plan builder API with Goals[] + Services[] nested create/update
- [ ] Care Plan version control (`previousVersionId` chain, lock prior versions)
- [ ] Goal CRUD with tiered schema
- [ ] `Achievement` model + routes (always `goalId` FK)
- [ ] `Diagnosis` model (ICD-10) linked to episode
- [ ] Family approval flow + notification triggers
- [ ] Auto-generate tasks from goals/services on plan activation
- [ ] Staff availability + slot booking + conflict detection
- [ ] Recurring appointment generation
- [ ] Segregated note routes (5 note types)
- [ ] Support Worker task completion + evidence upload
- [ ] `Incident` CRUD
- [ ] `EpisodeStaffAssignment` — assign clinical staff to episodes
- [ ] Coordinator + Doctor dashboard aggregation endpoints
- [ ] Wire M3 notification events

**Frontend**
- [ ] Care Plan builder UI (coordinator) — goals, services, templates
- [ ] Family plan review portal (approve / request changes / reject)
- [ ] Scheduling UI (availability, slots, recurring)
- [ ] Support Worker task list + evidence upload
- [ ] Clinical note entry (role-appropriate type)
- [ ] Goal progress tracking views
- [ ] Coordinator + Doctor dashboards

### Current status (PERN)

| Deliverable | Status |
|---|---|
| CarePlan CRUD + approval endpoints | `[~]` basic |
| Version control | `[ ]` |
| Goals / Achievements / Diagnoses | `[ ]` routes missing |
| Task engine (14 fields + rules) | `[~]` partial model |
| Scheduling + conflicts | `[ ]` |
| Segregated notes | `[ ]` single ClinicalNote |
| Incidents | `[ ]` |
| Dashboards | `[ ]` generic only |

---

## M4 — Telehealth, Payments & Communication ($600) — Week 5

### What this milestone is about

Integrates **telehealth** as a care delivery channel, builds the **billing/invoicing system** with Qatari bank payments, and delivers **secure messaging + notifications**.

### Signed proposal deliverables

- Telehealth video sessions (web + mobile-ready API)
- Waiting room, session controls, shared care plan view during calls
- Service pricing + automated QAR quotation generation
- Live Qatari bank / NAPS payment gateway (PayTabs, Fatora, or Skipcash)
- Invoice lifecycle, reconciliation, PDF export
- Secure multi-party messaging with real-time updates
- Notification system: in-app, email, mobile push

### Signed proposal technical requirements

**Telehealth (Daily.co or Twilio — not LiveKit):**
- Appointment confirmed → telehealth link → notification
- Waiting room: patient enters; staff admits
- Side panel: active Care Plan, goals, prior notes
- Session notes during/post-call; optional S3 recording

**Billing & payments:**
- Admin service pricing master (backend-calculated only)
- Auto QAR quotation on Care Plan approval
- Quotation PDF: service, rate, qty, subtotal, tax, total
- Invoice auto-generated on session/service completion
- Gateways: PayTabs / Fatora / Skipcash (NAPS, QNB, Doha Bank, CBQ, QIB)
- Webhooks: Pending → Successful / Failed / Refunded
- Invoice lifecycle: `Draft → Sent → Paid → Overdue → Disputed`
- Admin reconciliation dashboard
- Family pays via portal

**Communication:** Episode-linked threads, Socket.io real-time, payment event notifications.

### HealthOS / Additions — how to build M4 correctly

**Telehealth flow (Additions):**
```
Appointment → 24h Reminder → Waiting Room → Device Check
  → Join Meeting → Video → File Sharing → Clinical Notes
  → Session Complete → Stored in Care Episode
```
Rules: browser + mobile, digital consent before join, chat, file upload during session, session log, network quality log.

**Financial engine (HealthOS §5):**

Service categories:
- **Core Support:** Nursing, Support Workers, Daily Living, Community Access
- **Capacity Building:** Care Coordination, Physio, OT, Speech, Psychology, Allied Health

Additional cost lines per Care Plan:

| Line type | Key fields |
|---|---|
| Consumables | itemName, quantity, frequency, unitPrice, supplier, fundingCategory |
| Assistive Technology | deviceName, clinicalJustification, supplier, cost, approvalStatus |
| Home Modifications | modificationType, supplier, quotation, approvalStatus, installationDate |
| Equipment | equipmentName, usagePurpose, cost, supplier, maintenanceSchedule |

**Financial flow:**
```
Care Plan approved → auto-calculate quotation (grouped by category)
  → Family App: Approve / Request Changes / Reject
  → On approval → invoice line items generated
```

**Communication engine (Additions):**

| Feature | Requirement |
|---|---|
| Conversation types | Family↔Coordinator, Family↔Clinic, Coordinator↔Doctor, Internal Staff, Announcements |
| Episode link | Optional `episodeId` on every conversation |
| Read receipts | Per-message per participant |
| Attachments | In-conversation file upload |
| Pinned messages | Per conversation |
| Announcements | Broadcast-only clinic channel |

**Notification events (M4):**
- Appointment booked → Patient, staff
- Reminder 24h + 1h → Patient, staff
- Telehealth reminder 30min → Patient, clinician
- Invoice generated → Family
- Payment received / failed / overdue → Family, admin

**Global search (Additions — build in M4 if time):**
Span: patients, families, episodes, appointments, reports, goals, invoices, employees, messages.

### What to build (checklist)

**Backend**
- [ ] Swap LiveKit → Daily.co or Twilio Video
- [ ] Telehealth session create on appointment confirm
- [ ] Waiting room + admit flow
- [ ] Shared context API (plan, goals, notes for side panel)
- [ ] Session notes linked to episode
- [ ] `Quotation` model + auto-generation on plan approval
- [ ] `ConsumableItem`, `AssistiveTechnology`, `HomeModification`, `Equipment` models
- [ ] Quotation + invoice PDF generation
- [ ] Invoice auto-generation on service completion
- [ ] PayTabs, Fatora, Skipcash live integrations + webhooks
- [ ] Admin reconciliation dashboard
- [ ] Messaging: `episodeId` on Conversation, read receipts, pins, announcements
- [ ] Socket.io real-time message delivery
- [ ] Email + in-app notifications for M4 events
- [ ] Global search endpoint (stretch)

**Frontend**
- [ ] Telehealth join UI, waiting room, side panel
- [ ] Family invoice/quotation viewer + pay flow
- [ ] Admin pricing config + reconciliation dashboard
- [ ] Messaging UI with episode context
- [ ] Notification center

### Current status (PERN)

| Deliverable | Status |
|---|---|
| Telehealth | `[~]` LiveKit — must swap |
| Waiting room / side panel | `[ ]` |
| Quotation + PDF | `[ ]` |
| Qatari gateways | `[ ]` stubs |
| Invoice lifecycle | `[ ]` manual |
| Messaging (episode, receipts) | `[~]` partial |
| Notifications | `[~]` partial |

---

## M5 — Mobile App, GPS, Reporting & Launch ($600) — Week 6

### What this milestone is about

Final milestone: **React Native mobile app**, GPS worker tracking, **admin reporting & analytics**, full **audit/compliance module**, QA, and **production deployment**.

### Signed proposal deliverables

- React Native app (iOS + Android) — Family, Clinical Staff, Support Worker
- GPS check-in/check-out with geofencing + compliance reporting
- Admin analytics dashboards with CSV/PDF export
- Full audit log viewer + compliance module (payment + location logs)
- E2E QA across all roles
- Production deployment (AWS + Vercel + Expo EAS)
- Handover documentation and walkthrough

### Signed proposal technical requirements

**Mobile (Expo):**

| Role | Screens |
|---|---|
| Family | Onboarding, dashboard, episode, plan approval, booking, telehealth, messaging, invoices/payment, notifications |
| Clinical Staff | Patient list, daily schedule, assessments, session notes, telehealth, plan view |
| Support Worker | Schedule, GPS check-in/out, task checklist, notes, evidence photo upload |

Also: FCM push, offline read-only (plan + schedule), EAS → TestFlight + Play internal track.

**GPS:** Check-in/out only; geofence vs patient address (configurable radius); coordinator map; out-of-radius flags; audit trail.

**Admin reporting:**
- Care outcomes (active episodes, goals achieved, closure rate, avg duration)
- Service utilisation (by type, staff, telehealth vs in-person)
- Staff performance (sessions, doc turnaround, task completion, GPS compliance)
- Financial (revenue, invoiced vs collected, outstanding)
- Export: CSV + PDF with date range, clinic/department, staff/patient filters

**Audit & compliance:**
- Searchable audit log viewer (Admin)
- Care Plan version diff viewer
- Payment transaction log
- GPS log viewer + map replay per session
- Compliance export (CSV + JSON)
- Data retention policy + GDPR/HIPAA deletion workflow

**QA:** All role journeys, API tests, cross-browser + mobile, security/performance, payment sandbox→live cutover.

### HealthOS / Additions — how to build M5 correctly

**Reporting engine (Additions):**

| Type | Reports |
|---|---|
| Operational | Staff utilisation, patient growth, revenue, booking volume, telehealth split, task completion |
| Clinical | Goal achievement, care outcomes, assessment compliance, review compliance |

**Configuration engine (Additions — admin, no code changes):**
- Service catalog (types, names, pricing)
- Department structure, branch assignments
- Goal library / templates
- Assessment templates
- Notification message templates
- Role permission overrides (within boundaries)

**Employee management (Additions — if not done earlier):**
Employee ID, profession, qualifications, licences, languages, employment type, roster, leave, branch, department, supervisor, status, performance.

**Audit engine (expanded — Additions):**
Login, logout, downloads, plan edits, approvals, consent, messaging, file downloads, AI suggestions *(log only if AI added later)* — all timestamped.

**Family dashboard (full widgets — Additions):**
Upcoming appointments, active plan + goals, achievements, invoices, messages, Book Consultation, Join Telehealth, notifications, emergency contact.

### What to build (checklist)

**Mobile (`mern/mobile/` — new Expo project)**
- [ ] Auth: login, OTP, biometrics
- [ ] Family, Clinical Staff, Support Worker screen sets per table above
- [ ] Telehealth join (Daily.co/Twilio SDK)
- [ ] FCM push for all notification events (M3 + M4)
- [ ] Offline read-only cache for plan + schedule
- [ ] GPS check-in/out with geofencing
- [ ] Evidence photo upload (Support Worker)
- [ ] EAS build pipeline (TestFlight + Play internal)

**Backend**
- [ ] Geofencing validation API
- [ ] Coordinator map: active workers + last check-in
- [ ] Reporting aggregation endpoints (4 dashboard areas)
- [ ] CSV + PDF export for all reports
- [ ] Audit log viewer API (search, filter, paginate)
- [ ] Care Plan diff API (`previousVersionId` chain from M3)
- [ ] Payment transaction log API
- [ ] GPS replay API
- [ ] Data retention + patient deletion workflow
- [ ] Configuration engine APIs (catalog, templates)

**Frontend (web admin)**
- [ ] Analytics dashboards with filters + export
- [ ] Audit log viewer UI
- [ ] Plan diff viewer
- [ ] GPS log + map replay
- [ ] Configuration admin screens

**DevOps & QA**
- [ ] Production: AWS EC2 + RDS, Vercel, Expo EAS
- [ ] E2E tests all role journeys
- [ ] Security + performance testing
- [ ] Payment gateway live cutover test
- [ ] Handover documentation + walkthrough

### Current status (PERN)

| Deliverable | Status |
|---|---|
| React Native / Expo | `[ ]` no `mern/mobile/` |
| Geofencing | `[ ]` |
| Coordinator map | `[ ]` |
| Admin reporting | `[ ]` |
| Audit viewer | `[ ]` |
| FCM | `[ ]` |
| Production deploy | `[ ]` |

---

## Cross-Milestone Reference

### Attachment categories (M2+)

Enforce on `FileAttachment`:
```
assessment | medical_report | prescription | referral | invoice
| consent | photo | video | lab_result | other
```

### Audit logging by milestone

| Milestone | Scope |
|---|---|
| M1 | Auth + admin actions on all endpoints |
| M2 | Intake reviews, consent recorded, file uploads |
| M3 | Plan edits, approvals, clinical notes, incidents, task changes |
| M4 | Payments, messaging, telehealth sessions |
| M5 | Full searchable viewer + diff + export |

### HealthOS items excluded from all milestones

| HealthOS feature | Reason |
|---|---|
| Arabic-first RTL landing (§3.1) | Proposal §5.2 — no localization |
| AI intake summary (§3.2) | Proposal §5.2 — no AI summarisation |
| AI care plan drafting (`AI Generated` state) | Proposal §5.2 — coordinator builds plans manually |
| Public app store listing | Proposal §5.2 — internal tracks only |

### Document index

| Question | Read |
|---|---|
| Payment / deliverable gate | `Riayah_Plus_Proposal_v2.pdf` §3 |
| Data hierarchy & state machines | This doc § System Backbone |
| Goal/task/note schemas | This doc § M3 HealthOS section |
| Financial / telehealth / comms detail | This doc § M4 HealthOS section |
| RBAC matrix | This doc § RBAC + `Proposed Additions & Modules.pdf` §1 |
| Laravel parity gaps | `BACKEND_PARITY.md` |
| Next.js → Vite mapping | `FRONTEND_CONVERSION.md` |
