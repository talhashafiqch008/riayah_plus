# Milestone 1 — What You Delivered vs What the Client Audits Cover

**Created:** 2026-07-16  
**Purpose:** Clarify whether the client’s M1 audit files are “all Milestone 1” or something broader.

**Short answer:** The audits are **not** a Milestone 1 acceptance checklist. They are **whole-platform security / GDPR / HIPAA reviews** of the repo at a point in time. Only **some** findings belong to signed M1 deliverables; **most** touch code from later milestones (M2–M5) or things that are **client/ops** (BAAs, staging accounts, encryption policy).

---

## 1. What Milestone 1 Actually Is (Signed Contract)

**Source:** `Riayah_Plus_Proposal_v2.pdf` — *Milestone 1 — Foundation & Infrastructure (Week 1) | $500*

> “This milestone establishes the entire technical foundation. **No clinical features** are built until the architecture, database, and authentication are rock-solid.”

### The 7 signed M1 deliverables

| # | Deliverable (proposal wording) | What “done” means in practice |
|---|---|---|
| 1 | Fully functional authentication system (web) | Login, register, logout, email verify, password reset, sessions, refresh rotation, 2FA backend (+ UI on admin/provider; proposal portals partial) |
| 2 | PostgreSQL + complete schema + migrations | Prisma schema (~74 models), migrations applied locally, seed |
| 3 | RBAC middleware protecting routes | Role gates on API routes; granular permission **stub** on admin/org |
| 4 | Org hierarchy management (Admin) | CRUD API + `/admin/organizations` UI (org → clinic → department) |
| 5 | Adaptive UI shell (role-based navigation) | 6 proposal portals: Family, Patient, Coordinator, Clinical, Support, Admin — shells + nav (sub-pages can be placeholders) |
| 6 | Audit logging foundation on all endpoints | `AuditLog` model, `AuditService`, middleware on mutating `/api` requests |
| 7 | Deployed to staging (EC2 + Vercel) | **Still open** in your tracker — blocks formal M1 sign-off |

### Explicitly **not** Milestone 1 (proposal + your `MILESTONE_ONE.md`)

| Topic | Milestone |
|---|---|
| Family clinical onboarding / intake wizard | **M2** |
| Coordinator intake queue & structured review | **M2** |
| Patient / Care Unit profile screens | **M2** |
| Care Episode lifecycle UI | **M2** |
| Assessment schedule / complete / report | **M2** |
| Care plan builder & approval | **M3** |
| Telehealth, invoices, PayTabs, Socket.io chat productization | **M4** |
| Mobile app, GPS, full compliance module, production QA | **M5** |
| Arabic-first / RTL, AI intake | **Excluded** (proposal §5.2) |

**HealthOS spec** (`Riayah_Plus_HealthOS_Specification.docx`) and **Proposed Additions & Modules.pdf** describe the **full product vision**. They are guidance for how to shape data and UX — they do **not** mean every module must be finished in M1.

---

## 2. What You Actually Built for M1 (Repo Reality)

Your codebase is **larger than M1** because of Laravel → PERN parity (`BACKEND_PARITY.md`): many routes/controllers for bookings, telehealth, invoices, chat, AI, etc. exist **before** those milestones are “productized” in the UI.

| Layer | M1 contract | What exists in repo |
|---|---|---|
| Auth & sessions | ✅ Core M1 | Largely done; phone OTP needs WhatsApp env |
| Schema | ✅ Core M1 | Full schema (supports M2–M5) |
| RBAC | ✅ Core M1 | Role middleware done; tenant filter not everywhere |
| Org admin UI | ✅ Core M1 | Done |
| 6 role shells | ✅ Core M1 | Done (`proposalRoleShells.ts`, `ProposalRoleRoutes.tsx`) |
| Audit foundation | ✅ Core M1 | Done on POST/PATCH/DELETE |
| Staging deploy | ❌ M1 blocker | Not done |
| ~300 API endpoints | **Not required for M1 sign-off** | Parity / future milestones |

**Tracker:** `MILESTONE_ONE.md` (~91% complete) — aligned with the 7 deliverables above, not with “HIPAA 100%.”

---

## 3. What the Client Sent You (Audit Files)

### A. First audit pass (July 10–11, 2026) — tied to first M1 submission

| File | Type | Focus |
|---|---|---|
| `M1_GAPS.pdf` | Security / stub audit | API auth gaps, RBAC stubs, audit UI, org edge cases |
| `GDPR_M1.pdf` | GDPR audit | Consent, export, cookies, pre-consent registration, etc. |
| `M1_REVISION_FIXES.md` | Your fix tracker | 31 security + 20 GDPR items — **many fixed** in revision |
| `M1_REVISION_LOG.md` | Live test notes | Bugs found while retesting |

These were triggered by **M1 delivery**, but they still reviewed **the whole repo**, not only the 7 deliverables.

### B. New audit (July 15–16, 2026) — `milestone1-audit/`

| File | Type | Focus |
|---|---|---|
| `HIPAA_Audit_Report.md` | Markdown (same content as PDF) | **69 HIPAA requirements** + deep offensive security pass |
| `M1_Revision_HiPAA.pdf` | PDF | Same report |

**Important:** Title says “Milestone 1 Revision” because the **branch/commit** audited was the M1 revision — **not** because every finding is an M1 scope item.

**Headline from auditor:** ~**19% HIPAA compliance** (down from 26% after deeper API review). That is a **regulatory readiness score for the entire platform**, not “you failed Milestone 1.”

---

## 4. Mapping: Audit Finding → Milestone / Owner

### ✅ Mostly **M1** (foundation you already worked on)

| Theme | Examples | Your status (`M1_REVISION_FIXES.md`) |
|---|---|---|
| Admin backdoor | `x-admin-request` header | ✅ Fixed |
| Auth hardening | `isActive` / `deletedAt` on authenticate | ✅ Fixed |
| XSS / input sanitization | `sanitize.ts` | ✅ Fixed (extend as you touch controllers) |
| 2FA on login pages | Admin + provider + proposal portals | ✅ Fixed (SHELL-003) |
| Granular admin permissions | `permissions.ts` on admin routes | ✅ Fixed |
| Consent + ConsentLog | Registration + ConsentController | ✅ Fixed |
| Audit log UI / filters | Admin audit page | ✅ Fixed |
| Org hierarchy bugs | Uniqueness, indexes, clinic modal | ✅ Fixed |
| Migrations in git + `db:deploy` | Prisma | ✅ Fixed |
| **Staging deploy** | EC2 + Vercel | ❌ **Still M1 sign-off blocker** |
| **Tenant scoping in list APIs** | STUB-001 `tenantWhere()` | ✅ M2 clinical APIs; broader legacy admin review remains |

### 🟡 **M1 stub / M2 carry-forward** (started in M1, finish while building clinical)

| Theme | Examples |
|---|---|
| Tenant `tenantWhere` on all list/get | STUB-001 |
| Shell dashboard live stats | SHELL-002 (M2 polish) |
| Proposal portal 2FA | SHELL-003 |
| State machine for more entities | STUB-004 (Document/Invoice — M3/M4) |

### ❌ **Not M1** — later milestones or pre-existing parity code

Auditor cited these; they are **real bugs** but **not** what you sold in Week 1 for $500:

| Finding area | Typical routes / files | Likely milestone |
|---|---|---|
| Care episode / care plan IDOR | `GET /episodes/:id`, care plan approve | M2–M3 clinical |
| Documents / S3 signed URL | `GET /documents/:id`, `/storage/signed-url` | M2 uploads / M4 docs |
| Chat / Socket.io rooms | `chat.routes`, socket auth | M4 messaging |
| Invoices / payments | `InvoiceController`, PayTabs | M4 billing |
| Telehealth / LiveKit tokens | `TelehealthController` | M4 |
| Bookings / shifts / emergency | booking/shift controllers | M3–M5 operations |
| Google Gemini AI / maps | `GeminiChatService`, `GPSService` | Excluded AI / M5 GPS |
| Role escalation on register | `RegistrationController` | **Security — fix ASAP** but not a named M1 line item |

### 🏢 **Client / infrastructure / legal** (not a single dev milestone)

| Theme | Why it’s not “M1 only” |
|---|---|
| BAAs with Google, AWS, LiveKit, PayTabs, Sentry, Gmail | Legal/contracts — client accounts |
| Encryption at rest (DB, S3, Redis) | Infra + AWS config — often M5 / ops |
| Breach notification process | Policy / legal — M5 compliance module |
| CloudWatch, Secrets Manager | Proposal mentions for M1 **infra** — partially ops |
| PHI in localStorage | Client + auth architecture decision — fix matters but spans all milestones |

---

## 5. Simple Decision Table for You

| Client message sounds like… | It is probably… | Your response |
|---|---|---|
| “M1 auth / RBAC / audit / org admin doesn’t work” | **M1 acceptance** | Fix against `MILESTONE_ONE_TEST.md` + deliverables table |
| “HIPAA score is 19%” | **Whole-product compliance audit** | Separate roadmap; not equal to “redo M1” |
| “Anyone can read any episode/document/invoice” | **Platform security (IDOR)** | Prioritize by exposure; many map to M2–M4 routes |
| “No BAA / no encryption at rest” | **Ops + legal + M5** | Client-owned accounts and policies |
| “Deploy to staging” | **M1 deliverable #7** | Do before arguing M1 is complete |

---

## 6. What You Delivered for M1 (Client-Facing Summary)

Use this when explaining scope:

1. **Authentication (web)** — login, register, verify email, reset password, sessions, refresh token rotation (hashed), device tokens, 2FA (TOTP), rate limits.  
2. **Database** — PostgreSQL + Prisma full schema + migrations + seed (demo org + 6 roles).  
3. **RBAC** — middleware on protected routes; admin granular permissions; proposal roles in enum.  
4. **Org hierarchy** — admin UI + API for organizations, clinics, departments.  
5. **Adaptive shells** — six role portals with navigation (clinical content largely placeholder until M2+).  
6. **Audit foundation** — automatic logging on mutating API calls + explicit auth/admin logs.  
7. **Staging** — **not yet delivered** (explicit proposal item).

**Revision pass (post `M1_GAPS` / `GDPR_M1`):** Critical security and GDPR Phase-1 items addressed per `M1_REVISION_FIXES.md`.

**Not promised in M1:** HIPAA certification, full encryption program, securing every parity endpoint, clinical workflows, mobile, payments, telehealth go-live.

---

## 7. How the New HIPAA Audit Relates to M2 Work

You can **continue Milestone 2** for signed clinical features **while** treating the HIPAA report as a **parallel security backlog**:

| Priority | Action |
|---|---|
| P0 (security) | IDOR on clinical routes you **use in M2** (`/episodes`, `/intake`, `/care-units`, `/assessments`) — you’re already tightening intake queue org scope |
| P0 (M1 blocker) | Staging deploy |
| P1 | STUB-001 tenant scoping on list APIs |
| P2 | HIPAA ops items (BAAs, at-rest encryption) with client |
| P3 | M4/M5 modules (chat, telehealth, PayTabs) when those milestones start |

Do **not** read “19% HIPAA” as “only 19% of Milestone 1 done.” Your M1 functional tracker is ~91% on the **7 proposal items**; HIPAA is a **different ruler**.

---

## 8. Source Documents in `docx/`

| Document | Role |
|---|---|
| `Riayah_Plus_Proposal_v2.pdf` | **Contract** — M1 §7 deliverables |
| `MILESTONE_SPECS.md` § M1 | Build + HealthOS alignment for M1 |
| `MILESTONE_ONE.md` | Your delivery status |
| `MILESTONE_ONE_TEST.md` | How to visually sign off M1 |
| `M1_GAPS.pdf` / `GDPR_M1.pdf` | First client audits (July 10–11) |
| `M1_REVISION_FIXES.md` | Your response checklist |
| `milestone1-audit/HIPAA_Audit_Report.md` | Second client audit (July 15–16) — **full platform HIPAA** |
| `M2_M3_TEST_GUIDE.md` | Open tickets deferred past M1 |
| `MILESTONE_TWO.md` | Current M2 work (separate milestone) |

---

## 9. Recommended Reply to Client (Draft)

> Thank you for the HIPAA re-audit. We’ve mapped findings to scope: Milestone 1 (signed) covers foundation — auth, schema, RBAC, org admin, role shells, audit foundation, and staging deploy. We’ve already addressed the prior M1_GAPS/GDPR revision items listed in M1_REVISION_FIXES.md. The new report also covers platform areas scheduled for Milestones 2–5 (clinical records, documents, billing, telehealth, chat) and operational HIPAA requirements (BAAs, encryption at rest, breach process) that sit with infrastructure and legal setup. We propose: (1) close M1 with staging smoke test, (2) prioritize IDOR fixes on M2 clinical APIs we’re actively shipping, (3) schedule a separate compliance hardening track for BAAs/encryption with your AWS/legal contacts.

---

*This file is for internal alignment. Update when staging ships or when the client clarifies whether they want HIPAA remediation as a change request outside the $3k milestone plan.*
