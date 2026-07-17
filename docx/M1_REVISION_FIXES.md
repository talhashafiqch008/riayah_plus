# M1 Revision Fix Guide
**Source:** M1_GAPS.pdf (Security Audit) + GDPR_M1.pdf (GDPR Compliance Audit)  
**Auditor:** Karim Ashraf — 10–11 July 2026  
**Total gaps:** 31 security + 20 GDPR partial/non-compliant items  
**Last updated:** 2026-07-13 (post-implementation pass)

All paths below are relative to `mern/`. Server = `mern/server/`, Client = `mern/client/`.

### Status legend
- `✅` Done
- `[~]` Partial (code done; env/ops/UI follow-up remains)
- `[ ]` Not done

### Progress snapshot

| Bucket | Done | Partial | Open |
|---|---|---|---|
| CRITICAL | 3 | 0 | 0 |
| HIGH (code) | 4 | 1 (AUTH-002 needs WhatsApp env) | 1 (staging deploy) |
| MEDIUM | 15 | 1 (STUB-001) | 0 |
| LOW | 6 | 0 | 5 (shell polish + ORG-007 + STUB-004) |
| GDPR Phase 1 | 4 | 1 (G2 flag only; UI contest TBD) | 0 |
| GDPR Phase 2–3 | 1 (G10) | 0 | Rest open |

**Remaining for M1 sign-off:** staging deploy (EC2 + Vercel), WhatsApp env for live phone OTP, optional STUB-001 tenant query scoping.

---

## CRITICAL — Fix Immediately (Security Risk)

### STUB-006 — `requireAdmin` header backdoor `✅`
**File:** `server/src/middleware/rbac.ts`  
**Problem:** `requireAdmin` accepts `headers['x-admin-request'] === env.ADMIN_SECRET` as an alternative to having an admin role.  
**Fix applied:** Removed `x-admin-request` branch. Admin access is role-only (`admin` / `super_admin` / `support_admin`).

### STUB-007 — `authenticate` middleware doesn't check `isActive` or `deletedAt` `✅`
**File:** `server/src/middleware/auth.ts`  
**Problem:** Suspended/soft-deleted users retained API access until JWT expiry.  
**Fix applied:** After JWT verify, DB check for `isActive: true` and `deletedAt: null`, result cached in Redis (~30s TTL).

### GDPR — XSS Sanitization (Article 5.1.f / Art 32) `✅`
**File:** `server/src/utils/sanitize.ts` (+ registration/OTP schemas)  
**Problem:** Zod validated types but did not strip HTML → stored XSS risk.  
**Fix applied:** Added `sanitize-html` + `sanitizedString` / `optionalSanitizedString` Zod helpers; applied on registration and OTP free-text fields. Extend to remaining controllers as they are touched.

---

## HIGH — Fix Before M1 Sign-off

### AUTH-001 — 2FA UI missing on Admin and Provider login pages `✅`
**Files:** `client/src/pages/admin/LoginPage.tsx`, `client/src/pages/provider/LoginPage.tsx`  
**Fix applied:** Both pages catch `TwoFactorRequiredError`, show 6-digit code step, call `complete2faLogin()`.

### AUTH-002 — Phone OTP returns 503 `[~]`
**File:** `server/src/controllers/auth/OtpController.ts`  
**Fix applied:** Phone OTP path calls `WhatsAppService.sendText()` when `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` are set.  
**Still needed:** Configure WhatsApp Business API credentials in env (otherwise still returns 503).

### AUDIT-001 — Frontend AuditLog interface doesn't match backend schema `✅`
**File:** `client/src/pages/admin/AuditLogsPage.tsx`  
**Fix applied:** Columns aligned to backend (`userId`, `entity`, `entityId`, `action`, `createdAt`, `ipAddress`, `deviceInfo`, `metadata.statusCode`).

### M1 Sign-off Blocker — Prisma migrations not committed to git `✅`
**Fix applied:** `prisma/migrations/20260713_m1_revision/` created; `"db:deploy": "prisma migrate deploy"` added to `server/package.json`.  
**Note:** Ensure migration folder is committed on next git push.

### M1 Sign-off Blocker — Staging deploy not started (0%) `[ ]`
**Problem:** API on EC2 + client on Vercel not deployed. Blocks formal sign-off.  
**Fix (DevOps — still open):**  
1. Deploy `mern/server` to EC2, set env vars, run `npm run db:deploy`  
2. Deploy `mern/client` to Vercel, set `VITE_API_URL` pointing to EC2  
3. Smoke test: `GET /api/health`, login, CORS/cookie handshake Vercel→EC2

---

## MEDIUM — Fix Before M2 Start

### RBAC-002 — Granular permissions only wired on org routes `✅`
**File:** `server/src/routes/admin.routes.ts`  
**Fix applied:** `requireView` / `requireEdit` / `requireDelete` applied on users, bookings, payments, audit logs, settings routes.

### RBAC-003 — `tenantScope` not mounted globally `✅`
**Files:** `server/src/middleware/tenantScope.ts`, `server/src/middleware/auth.ts`  
**Fix applied:** `attachTenantContext` chained after successful authentication (auth is per-router, not a single global `/api` mount).

### STUB-001 — `tenantWhere()` query scoping `[~]`
**Files:** `server/src/middleware/tenantScope.ts`, `tenantAccess.ts`, M2 clinical controllers  
**Status:** M2 clinical APIs are tenant-scoped (episodes, care units/patients, assessments, care plans), including direct-ID access checks and second-org smoke tests. Broader legacy admin/marketplace endpoint review remains separate from M2 Flow L.

### STUB-002 — State machine not enforced on Booking status changes `✅`
**File:** `server/src/controllers/booking/BookingExtrasController.ts`  
**Fix applied:** `assertAppointmentTransition()` called before cancel/accept/reject status updates.

### STUB-003 — Permission matrix missing legacy provider roles `✅`
**File:** `server/src/middleware/permissions.ts`  
**Fix applied:** Legacy roles mapped to `clinical_staff` / `support_worker` / `family` equivalents.

### ORG-001 — Clinic and Department name uniqueness `✅`
**File:** `server/prisma/schema.prisma`  
**Fix applied:** `@@unique([organizationId, name])` on Clinic; `@@unique([clinicId, name])` on Department (in `20260713_m1_revision`).

### ORG-002 — No DB indexes on hierarchy foreign keys `✅`
**File:** `server/prisma/schema.prisma`  
**Fix applied:** Indexes on hierarchy FKs included in revision migration.

### ORG-004 — Clinic edit modal reuses org email/website fields `✅`
**File:** `client/src/pages/admin/OrganizationsPage.tsx`  
**Fix applied:** Clinic modal only shows name / phone / address; email & website are org-only.

### ORG-005 — Organization logo upload UI missing `✅`
**File:** `client/src/pages/admin/OrganizationsPage.tsx`  
**Fix applied:** Logo URL input + preview on org create/edit; persisted as `logoUrl`.

### AUDIT-002 — No `userId` filter on `/admin/audit-logs` `✅`
**File:** `server/src/routes/admin.routes.ts`  
**Fix applied:** `userId` from query passed to `AuditService.getAll()`.

### AUDIT-003 — No date range filter on audit logs `✅`
**File:** `server/src/services/AuditService.ts`  
**Fix applied:** `from` / `to` → `createdAt` gte/lte; exposed as query params; UI date inputs added.

### AUDIT-005 — Audit log table lacks pagination controls `✅`
**File:** `client/src/pages/admin/AuditLogsPage.tsx`  
**Fix applied:** Prev/next pagination with page/limit and total count.

### AUTH-005 — Session list returns RefreshToken rows, not UserSession `✅`
**File:** `server/src/controllers/auth/AuthController.ts`  
**Fix applied:** `UserSession` created on login/2FA; `listSessions` prefers `UserSession` when rows exist.

### GDPR — Pre-consent user creation `✅`
**Files:** `RegistrationController.ts`, register / onboarding UIs  
**Fix applied:** `consentAccepted: true` required before user create; Consent + ConsentLog written at registration; client sends flag from Terms checkbox.

### GDPR — ConsentLog never written `✅`
**File:** `server/src/controllers/caremanagement/ConsentController.ts`  
**Fix applied:** ConsentLog written on grant and revoke.

### GDPR — Consent metadata fields never populated `✅`
**File:** `ConsentController.ts`  
**Fix applied:** `documentVersion`, `ipAddress`, `deviceFingerprint`, `signatureStatus` set on grant.

---

## LOW — Fix When Convenient (Before M2 Polish)

### STUB-004 — State machine only covers 3 entity types `[ ]`
**File:** `server/src/utils/stateMachine.ts`  
**Still open:** Expand for Document, Invoice, PayoutRequest.

### STUB-005 — No runtime enum validation on `req.user.role` `✅`
**Files:** `server/src/middleware/rbac.ts`, `permissions.ts`  
**Fix applied:** `Object.values(UserRole).includes(role)` guard in RBAC chain.

### ORG-006 — Delete cascade missing `✅`
**File:** `server/prisma/schema.prisma`  
**Fix applied:** `onDelete: Cascade` on Clinic→Organization and Department→Clinic (revision migration).

### ORG-007 — No search/filter on clinics or departments `✅`
**File:** `server/src/controllers/admin/OrganizationController.ts`  
**Fix applied:** `search` (case-insensitive name match) and `active` query params added to `listClinics` and `listDepartments`.

### ORG-008 — Seed data uses hard-coded IDs `✅`
**File:** `server/prisma/seed.ts`  
**Fix applied:** Org/clinic/dept/users use `upsert` with unique lookup keys.

### SHELL-002 — Proposal role shell stats are placeholders `[ ]`
**File:** `client/src/pages/roles/RoleShellDashboard.tsx`  
**Still open / M2-acceptable:** Wire live API stats.

### SHELL-003 — No dedicated login pages for proposal roles `✅`
**Fix applied:** `ProposalPortalLoginPage` catches `TwoFactorRequiredError`, shows 6-digit TOTP step, calls `complete2faLogin()` (same as admin/provider).

### SHELL-006 — Admin layout badge count is static `[ ]`
**Still open:** Live badge counts via API/WebSocket.

### SHELL-007 — Role shells do not handle mobile deep linking `[ ]`
**Still open:** PWA / deep-link meta.

### AUDIT-006 — Export Logs button has no handler `✅`
**Fix applied:** Export button wired; `GET /admin/audit-logs/export` CSV + client fallback.

### AUDIT-007 — `deviceInfo` not displayed in audit log UI `✅`
**Fix applied:** Device column in `AuditLogsPage`.

### AUDIT-008 — No `@@index([createdAt])` on `AuditLog` `✅`
**Fix applied:** Index added in revision migration.

---

## GDPR — Non-Compliant Areas

### Phase 1 — Critical GDPR Fixes

#### G1 — Right to Restriction of Processing (Article 18) `✅`
**Fix applied:** `POST /privacy/restrict-processing` + `User.processingRestricted` field.  
**Follow-up:** Honor flag consistently in all data-access controllers.

#### G2 — Automated Decision-Making safeguards (Article 22) `[~]`
**Fix applied:** Matching response includes `requiresReview: true`.  
**Still open:** Careseeker UI “Request human review” flow.

#### G3 — Data Retention Policies (Article 5.1.e) `✅`
**Fix applied:** Cron purges OTP (>24h), stale refresh tokens (>7d); soft-deleted user anonymization (>30d).  
**Follow-up:** Optional audit-log retention (e.g. 90d) if required by policy.

#### G4 — Hard Delete / Anonymization (Article 17) `✅`
**Fix applied:** Soft delete retained; `anonymizeUser` helper + 30-day cron cleanup.

#### G5 — Cookie Consent Banner `✅`
**Fix applied:** `CookieConsentBanner` in `App.tsx` — essential vs accept-all; analytics flag gated.

### Phase 2 — High Priority GDPR Fixes

#### G6 — ROPA (Article 30) `[ ]`
#### G7 — Data Protection Officer (Article 37) `[ ]`
#### G8 — Placeholder privacy policy endpoint `[ ]`
#### G9 — ConsentLog Population `✅` (same as MEDIUM ConsentLog)
#### G10 — Data Portability downloadable file `✅`
**Fix applied:** `Content-Disposition: attachment` on data export.
#### G11 — Consent Granularity `[ ]`
#### G12 — Purpose Limitation documentation `[ ]`

### Phase 3 — Medium Priority GDPR Fixes (M2–M3) `[ ]`
- G13 — Restrict processing (covered by G1)
- G14 — LIA documentation
- G15 — SAST/DAST in CI/CD
- G16 — Pseudonymization for analytics
- G17 — Real privacy policy content
- G18 — Explicit “I agree” checkbox (partially covered on register/onboarding)
- G19 — DPIA for health data / matching / GPS

---

## Summary Table — Current Status

| Priority | ID | Status | Notes |
|---|---|---|---|
| CRITICAL | STUB-006 | `✅` | Admin header backdoor removed |
| CRITICAL | STUB-007 | `✅` | isActive + deletedAt + Redis cache |
| CRITICAL | GDPR-XSS | `✅` | sanitize-html helpers live |
| HIGH | AUTH-001 | `✅` | Admin + Provider 2FA UI |
| HIGH | AUTH-002 | `[~]` | WhatsApp wired; needs env credentials |
| HIGH | AUDIT-001 | `✅` | Audit UI schema aligned |
| HIGH | MIGRATIONS | `✅` | `20260713_m1_revision` + `db:deploy` |
| HIGH | STAGING | `[ ]` | **Sign-off blocker** — EC2 + Vercel |
| MEDIUM | RBAC-002 | `✅` | Granular admin permissions |
| MEDIUM | RBAC-003 | `✅` | Tenant context on auth |
| MEDIUM | STUB-001 | `[ ]` | **tenantWhere not used in controllers** |
| MEDIUM | STUB-002 | `✅` | Booking state machine |
| MEDIUM | STUB-003 | `✅` | Legacy role matrices |
| MEDIUM | ORG-001 | `✅` | Unique names |
| MEDIUM | ORG-002 | `✅` | FK indexes |
| MEDIUM | ORG-004 | `✅` | Clinic modal fields |
| MEDIUM | ORG-005 | `✅` | Logo URL + preview |
| MEDIUM | AUDIT-002 | `✅` | userId filter |
| MEDIUM | AUDIT-003 | `✅` | from/to dates |
| MEDIUM | AUDIT-005 | `✅` | Pagination UI |
| MEDIUM | AUTH-005 | `✅` | UserSession on login |
| MEDIUM | GDPR-CONSENT-ORDER | `✅` | consentAccepted required |
| MEDIUM | GDPR-CONSENTLOG | `✅` | Log on grant/revoke |
| MEDIUM | GDPR-CONSENT-META | `✅` | Metadata populated |
| LOW | STUB-004 | `[ ]` | Expand state machine entities |
| LOW | STUB-005 | `✅` | Runtime UserRole validation |
| LOW | ORG-006 | `✅` | onDelete Cascade |
| LOW | ORG-007 | `[ ]` | Clinic/dept search filters |
| LOW | ORG-008 | `✅` | Seed upserts |
| LOW | SHELL-002/003/006/007 | `[ ]` | Shell polish (M2-ok) |
| LOW | AUDIT-006 | `✅` | CSV export |
| LOW | AUDIT-007 | `✅` | deviceInfo column |
| LOW | AUDIT-008 | `✅` | createdAt index |
| GDPR-P1 | G1 | `✅` | restrict-processing |
| GDPR-P1 | G2 | `[~]` | requiresReview flag; UI TBD |
| GDPR-P1 | G3 | `✅` | Retention crons |
| GDPR-P1 | G4 | `✅` | 30-day anonymize |
| GDPR-P1 | G5 | `✅` | Cookie banner |
| GDPR-P2 | G6–G8, G11–G12 | `[ ]` | Docs / policy / DPO |
| GDPR-P2 | G9 | `✅` | ConsentLog |
| GDPR-P2 | G10 | `✅` | File download export |
| GDPR-P3 | G14–G19 | `[ ]` | M2–M3 |

---

## Next actions (recommended order)

1. **Staging deploy** — EC2 API + Vercel client + smoke tests (M1 sign-off blocker)
2. **Set `WHATSAPP_*` env** — make phone OTP live
3. **STUB-001** — apply `tenantWhere(req)` in list/get controllers
4. GDPR Phase 2 docs (ROPA, DPO, real privacy policy) when client provides contacts/content
