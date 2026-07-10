# Milestone 1 — Foundation & Infrastructure

**Budget:** $500 | **Week:** 1  
**Status:** ~91% complete  
**Last updated:** 2026-07-09

> Source of truth for deliverables: `Riayah_Plus_Proposal_v2.pdf` § M1  
> Detailed spec: `MILESTONE_SPECS.md` § M1  
> **Not M1:** clinical intake, family onboarding, Arabic landing, care episodes UI

---

## Signed Deliverable Status (Client Review)

| # | Deliverable | Status | Notes |
|---|---|---|---|
| 1 | Auth system (web) | **~90%** | Login/register/logout, email verify, password reset, sessions, refresh rotation + hashing, device tokens, 2FA enable/disable. **Gaps:** 2FA code step on login pages (backend ready); phone OTP returns `503` until SMS gateway wired |
| 2 | PostgreSQL + schema + migrations | **~80%** | 74-model schema synced locally; initial migration applied via `migrate dev`. **Gaps:** `prisma/migrations/` not committed to git; no `db:deploy` script; staging RDS not migrated |
| 3 | RBAC middleware | **~85%** | Role gates on routes; granular Create/Edit/Delete/Approve stub (`permissions.ts`); tenant scoping stub (`tenantScope.ts`). **Gaps:** granular permissions only wired on org routes; tenant middleware not globally mounted |
| 4 | Org hierarchy (Admin) | **~95%** | Full CRUD API + `/admin/organizations` UI + seed data. Ready for client demo |
| 5 | Adaptive UI shell (6 roles) | **~90%** | `/family`, `/patient`, `/coordinator`, `/clinical`, `/support`, `/admin` shells with sidebars. Sub-pages are M2 placeholders ("—" stats) — acceptable for M1 shell deliverable |
| 6 | Audit logging foundation | **~90%** | `AuditService` + automatic middleware on mutating `/api` requests with `deviceInfo`; explicit logs on auth/admin/org mutations |
| 7 | Staging deploy (EC2 + Vercel) | **0%** | Not started — blocks formal M1 sign-off |

---

## What M1 Must Deliver (Signed Proposal)

1. Fully functional authentication system (web)
2. PostgreSQL database with complete schema and migrations
3. RBAC middleware protecting all routes
4. Org hierarchy management (Admin)
5. Adaptive UI shell with role-based navigation
6. Audit logging foundation on all endpoints
7. Deployed to staging (EC2 + Vercel)

---

## Codebase Snapshot

| Area | Current state |
|---|---|
| Stack | `server/` Express + Prisma + PostgreSQL · `client/` Vite + React Router |
| Prisma models | 74 models in schema |
| API routes | ~40 route files · ~300 endpoints (Laravel parity) |
| Frontend routes | ~110+ routes · Next.js → Vite conversion complete |
| Local dev | API `:5001` · Client `:5173` · DB `riayah_plus` |
| Unit tests | **51 passing** (`npm test -- --testPathPattern=unit`) |
| Integration tests | Require live PostgreSQL test DB — fail in sandbox without valid `DATABASE_URL` |
| Migrations | Initial migration exists locally (`prisma/migrations/20260708155751_07_08_2026/`); applied to dev DB via `migrate dev` — **not yet committed to git** |

### Key files added this session

| Area | Path |
|---|---|
| Granular RBAC | `server/src/middleware/permissions.ts` |
| Tenant scoping | `server/src/middleware/tenantScope.ts` |
| Refresh token hashing | `server/src/utils/refreshTokenHash.ts`, `refreshTokenStore.ts` |
| Device tokens | `server/src/controllers/auth/DeviceTokenController.ts` |
| State machines | `server/src/utils/stateMachine.ts` |
| Org admin UI | `client/src/pages/admin/OrganizationsPage.tsx` |
| Proposal role shells | `client/src/config/proposalRoleShells.ts`, `layouts/HealthRoleLayout.tsx`, `routes/ProposalRoleRoutes.tsx` |
| Audit middleware | `server/src/middleware/auditMiddleware.ts` |

---

## Done

### Backend — Auth & Security
- [x] Login, register, logout, logout-all
- [x] JWT access (15m) + refresh (7d) with rotation on refresh
- [x] httpOnly cookies + Bearer token support
- [x] `GET /auth/session` and `POST /auth/refresh`
- [x] OTP send/verify (10 min expiry) — **email only**
- [x] 2FA enable/verify/disable (TOTP) — backend complete
- [x] Password reset flow (forgot + reset pages wired)
- [x] Session list + revoke (`GET/DELETE /auth/sessions`)
- [x] bcrypt hashing (12 rounds)
- [x] Rate limiting (login, OTP, register, API-wide)
- [x] Centralized error handling + Zod validation on key routes
- [x] `authenticate` middleware on protected routes
- [x] **Email verification** — registration creates token; `GET /api/email/verify`; login gated on `isEmailVerified`
- [x] **Register requires email verification** — no JWT until verified; returns `requiresEmailVerification: true`
- [x] **Public resend verification** — `POST /api/email/resend-verification`
- [x] **Refresh token uniqueness** — `jti` UUID on refresh JWTs
- [x] **Refresh token hashing** — HMAC-SHA256 at rest (`refreshTokenHash.ts` + `refreshTokenStore.ts`); legacy plain rows supported until rotated
- [x] **Device token management** — `POST/GET/DELETE /api/device-tokens` (+ `/api/auth/device-tokens` aliases)
- [x] **Phone OTP honest error** — `POST /otp/send` with `type: 'phone'` returns `503` (not fake success)
- [x] **Zod `.refine()` formErrors** — `errorHandler` returns `formErrors` alongside `fieldErrors`
- [x] **Session revoke 404** — `DELETE /sessions/:id` returns `404` when not found / wrong user

### Backend — Database & Schema
- [x] Full Prisma schema (74 models)
- [x] Database synced locally (`prisma migrate dev`)
- [x] **Initial Prisma migration** — `prisma/migrations/20260708155751_07_08_2026/migration.sql`
- [x] Seed script (admin, coordinator, 6 proposal-role demos, clients, providers, bookings, org)
- [x] **Org hierarchy CRUD API** — `/api/admin/organizations`, `/clinics`, `/departments`
- [x] **Org seed data** — "Riayah Plus Health" with 2 clinics, 3 departments

### Backend — RBAC
- [x] Role-based middleware (`requireRole`, `requireAdmin`, `requireProvider`, `requireClient`, `requireCareCoordinator`)
- [x] Proposal roles in enum (`family`, `patient`, `care_coordinator`, `clinical_staff`, `support_worker`, `admin`)
- [x] **Granular permission helper (M1 stub)** — `permissions.ts`: `canCreate`/`canEdit`/`canDelete`/`canApprove` + `requirePermission`; wired on admin org/clinic/department routes
- [x] **Tenant scoping middleware (M1 stub)** — `tenantScope.ts`: `attachTenantContext`, `tenantWhere()`, `requireTenantOrganization` (not globally mounted yet)

### Backend — Clinical prep (M1 stubs for M2)
- [x] **State machine utilities** — `stateMachine.ts` for CareEpisode, CarePlan, Appointment transitions; wired in `CareEpisodeController`, `CarePlanController`, `booking.routes.ts`

### Backend — Audit
- [x] `AuditLog` model with `ipAddress`, `deviceInfo`
- [x] `AuditService` helper
- [x] Auth + admin + org mutation events logged explicitly
- [x] **Automatic audit middleware** — all `POST/PUT/PATCH/DELETE` under `/api` (skips `/health`, webhooks); redacted body + `deviceInfo`

### Backend — Infra (Partial)
- [x] Winston logger (console + file — no CloudWatch)
- [x] Modular Express structure
- [x] Redis + BullMQ workers scaffold
- [x] 16 cron jobs scheduled
- [x] Dockerfiles (root + client)
- [x] **Global async-error safety net** — `express-async-errors` in `app.ts`

### Frontend — Auth & Routing
- [x] Next.js → Vite conversion (0 TS build errors)
- [x] httpOnly cookie auth via Vite proxy
- [x] `AuthContext`, `AuthGate`, `ProtectedRoute`, `RoleRoute`, `PublicOnlyRoute`
- [x] Login, register, OTP, forgot/reset password, verify-email pending pages
- [x] **Register + login flows** handle `requiresEmailVerification` and redirect to `/verify-email`
- [x] Role-based redirect (`getRoleDashboard`) — proposal roles map to correct shells
- [x] Admin layout + `/admin/organizations` page wired to API

### Frontend — UI Shell
- [x] Legacy layouts: careseeker, provider, staff, trainer
- [x] **Proposal 6-role shells** — `/family`, `/patient`, `/coordinator`, `/clinical`, `/support`, `/admin/*`
- [x] Placeholder sub-pages marked for M2 API wiring
- [x] 10 demo coordinator pages (`/demo/coordinator/*`) — mock prototype retained

---

## Left To Do (M1 Sign-off Blockers)

### Must complete before client sign-off

| Priority | Item | Why it blocks |
|---|---|---|
| 🔴 P0 | **Staging deploy** — API on EC2, client on Vercel | Signed proposal deliverable #7 |
| 🔴 P0 | **Prisma migrations in git + `prisma migrate deploy` on staging RDS** | Signed proposal deliverable #2; add `db:deploy` npm script |
| 🔴 P0 | **Staging env vars documented + smoke test** (`GET /api/health`, login, CORS/cookies Vercel→EC2) | Required to verify deploy |

### Should complete for a strong M1 (not strictly blocking demo)

| Priority | Item | Notes |
|---|---|---|
| 🟡 P1 | **2FA login UI** — code entry step on login pages when `requires2fa` | Backend + `SecurityPage` enable/disable done; `AuthContext` throws `TwoFactorRequiredError` but login pages don't catch it yet |
| 🟡 P1 | **JWT refresh E2E browser test** | curl-verified; needs browser confirmation (login → 401 → refresh → retry) |
| 🟡 P1 | **`MAIL_FROM_ADDRESS` for prod SMTP** | Hostinger rejects mismatched sender; needs verified domain sender before prod email |
| 🟢 P2 | **Phone/SMS OTP delivery** | WhatsApp/SMS gateway (`WHATSAPP_*` in `.env`); currently honest `503` |
| 🟢 P2 | **Winston → CloudWatch** transport | Staging/prod observability |
| 🟢 P2 | **AWS Secrets Manager** | Prod secrets management |
| 🟢 P2 | **404 vs 401 on unknown `/api/*` routes** | Cosmetic — unauthenticated unknown paths return `401` instead of `404` due to `auth.routes.ts` catch-all `authenticate` |

### Explicitly deferred to M2 (do not block M1 shell sign-off)

| Item | Notes |
|---|---|
| Wire proposal shell dashboards to real APIs | Placeholder stats are expected for M1 adaptive shell deliverable |
| Mount `tenantScope` globally on clinical routes | Stub exists; wire when M2 patient/episode routes go live |
| Extend granular RBAC to all modules | Stub + org routes done; per-module gates ship in M2–M5 |

---

## Partial / Needs Verification

| Item | Status | Notes |
|---|---|---|
| JWT 15m / 7d rotation | ✅ curl-verified | Refresh hashed at rest; rotation revokes old token immediately |
| RBAC on all routes | ⚠️ Mostly done | `authenticate` on 37/38 route files; granular permissions only on org admin routes |
| Audit foundation | ✅ Done | Auto middleware + explicit auth/admin/org logs |
| Winston logging | ⚠️ Partial | Console + file in dev; **no CloudWatch** |
| Adaptive UI shell | ✅ Done | 6 proposal shells live; sub-pages are M2 placeholders by design |
| Org hierarchy | ✅ Done | API + UI + seed with 2 clinics, 3 departments |
| Auth — email flow | ✅ Done | Register → verify email → login; resend works |
| Auth — 2FA at login | ❌ Gap | Enable/disable on SecurityPage; **no login-page 2FA prompt** |
| Auth — phone OTP | ❌ Gap | Returns `503` until gateway integrated |
| Frontend `getRoleDashboard` | ✅ Fixed | Proposal roles route to `/family`, `/patient`, `/coordinator`, `/clinical`, `/support` |
| Seed `isEmailVerified` | ⚠️ Watch | Upsert `update` may not always refresh `isEmailVerified`; manual `updateMany` fix sometimes needed after re-seed |

---

## Explicitly Out of Scope (Do Not Add in M1)

| Item | Reason |
|---|---|
| Arabic-first / RTL landing | Proposal §5.2 — no localization |
| AI intake / care plan drafting | Proposal §5.2 — excluded |
| Clinical family onboarding wizard | M2 deliverable |
| Care episode intake queue UI | M2 deliverable |
| Telehealth / payments / mobile | M4–M5 |

---

## Suggested Finish Order (What's Left)

1. **Commit `prisma/migrations/` to git** + add `db:deploy` script
2. **Staging deploy** — EC2 API + Vercel client + env files
3. **Smoke test** — health, login, org admin, proposal role shells, CORS/cookies
4. **2FA login UI** (quick win — backend ready)
5. **JWT refresh E2E browser test**
6. **MAIL_FROM / CloudWatch / Secrets Manager** — can ship with staging or immediately after

---

## Test Credentials

After `npm run db:seed` in `server/`:

| Role | Email | Password | Dashboard |
|---|---|---|---|
| Super Admin | `superadmin@riayahplus.com` | `Password123!` | `/admin` |
| Admin | `admin@riayahplus.com` | `Password123!` | `/admin` |
| Care Coordinator | `coordinator@riayahplus.com` | `Password123!` | `/coordinator` |
| Family | `family@demo.com` | `Password123!` | `/family` |
| Patient | `patient@demo.com` | `Password123!` | `/patient` |
| Clinical Staff | `clinical@demo.com` | `Password123!` | `/clinical` |
| Support Worker | `support@demo.com` | `Password123!` | `/support` |
| Client (legacy) | `fatima@demo.com` | `Password123!` | `/careseeker` |
| Provider (legacy) | `dr.hassan@demo.com` | `Password123!` | `/provider` |

> If login returns "Email not verified", run:  
> `UPDATE users SET "isEmailVerified" = true WHERE email LIKE '%@demo.com' OR email LIKE '%@riayahplus.com';`

---

## Local Run Commands

```bash
# PostgreSQL + Redis must be running first

# Terminal 1 — API
cd server && npm run dev          # http://localhost:5001

# Terminal 2 — Client
cd client && npm run dev          # http://localhost:5173
```

---

## Related Docs

| Question | File |
|---|---|
| Full M1 spec + HealthOS guidance | `MILESTONE_SPECS.md` § M1 |
| Implementation handoff | `SESSION_HANDOFF.md` |
| Laravel route parity | `BACKEND_PARITY.md` |
| Frontend conversion status | `FRONTEND_CONVERSION.md` |
| Signed proposal wording | `Riayah_Plus_Proposal_v2.pdf` §3 |
