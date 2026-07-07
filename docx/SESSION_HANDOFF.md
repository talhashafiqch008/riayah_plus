# MERN/PERN Session Handoff

*Condensed from the Cursor agent session (2026-07-06 → 2026-07-07). Read this first, then `MILESTONE_SPECS.md` for milestone scope.*

---

## What This Folder Is

`mern/` is the **Node.js + PostgreSQL + Vite/React** conversion of the Riayah Plus care platform. It replaces the production stack in `backend/` (Laravel 12) and `frontend/` (Next.js 16) over 5 proposal milestones ($3,000 / 6 weeks).

| Path | Role |
|---|---|
| `mern/server/` | Express + Prisma + PostgreSQL API |
| `mern/client/` | Vite + React Router SPA (ported from Next.js) |
| `docx/MILESTONE_SPECS.md` | **Source of truth for milestone deliverables** (aligned to signed proposal) |
| `docx/BACKEND_PARITY.md` | Laravel → Express parity gaps and schema fixes |
| `docx/FRONTEND_CONVERSION.md` | Next.js → Vite migration notes |
| `docx/Riayah_Plus_Proposal_v2.pdf` | Signed proposal — milestone scope & payment |
| `docx/Riayah_Plus_HealthOS_Specification.docx` | Architectural mandates (not extra milestone scope) |
| `docx/Proposed Additions & Modules.pdf` | Module detail / RBAC extensions |

> **Note:** `docx/README.md` is outdated (still says Next.js, port 3000/5000, all milestones ✅). Trust this file and `MILESTONE_SPECS.md` instead.

---

## Local Dev (Current)

```bash
# Terminal 1 — API (default PORT in .env may be 5001; Vite proxy expects 5001)
cd mern/server && npm install && npm run db:generate && npm run dev

# Terminal 2 — Client
cd mern/client && npm install && cp .env.example .env && npm run dev
```

| Service | URL |
|---|---|
| MERN client | http://localhost:5173 |
| MERN API | http://localhost:5001 (Vite proxies `/api` → here) |
| Original Laravel API | http://localhost:8000 (`cd backend && php artisan serve`) |
| Original Next.js UI | http://localhost:3000 (`cd frontend && pnpm dev`) |

**Client env:** `VITE_API_URL=/api` (uses Vite proxy, not direct backend URL).  
**Auth:** httpOnly cookies — no `localStorage` token. Axios uses `withCredentials: true`.

### Seed / test logins

After `npm run db:seed` in `mern/server`:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@riayahplus.com` | `Password123!` |
| Super Admin | `superadmin@riayahplus.com` | `Password123!` |

Admin dashboards: `/admin/dashboard`, `/admin/staff`, etc. (role guard must match `admin` / `super_admin`).

---

## Work Completed This Session

### Client (`mern/client`)

- **Next.js → Vite/React Router** migration fixes: `useNavigate`, `Link to=`, `useSearchParams`; removed App Router patterns.
- **Build:** TypeScript build passes (was 126+ errors → 0).
- **Auth parity:** httpOnly cookies via proxy; removed localStorage tokens; `AuthGate.tsx`; `withCredentials` on Axios.
- **Route guards:** `ProtectedRoute`, `RoleRoute`, `getLoginRedirectForPath.ts`, `getRoleDashboard` aligned with original `frontend/src/middleware.ts`.
- **Demo coordinator pages:** 10 routes under `/demo/coordinator/*` ported.
- **Bug fix:** `StaffPage.tsx` — normalize `name` → `firstName`/`lastName`, null-safe filters.
- **Docker:** `Dockerfile` + `nginx.conf` for Vite SPA; root `mern/Dockerfile` for unified image.
- **E2E:** Playwright config updated for port 5173.

### Server (`mern/server`)

- **Build:** TypeScript/Jest issues resolved; `npm run build` passes.
- **httpOnly cookies:** `utils/authCookies.ts`, `cookie-parser`, `authenticate` reads cookie or Bearer.
- **Auth routes:** `POST /auth/refresh`, `GET /auth/session`; login/register/OTP/2FA set cookies; logout clears cookies.
- **Security:** `migrate-role` behind `authenticate` + `requireAdmin`.
- **Admin:** `AdminProviderController.listStaff` — Laravel-shaped response, broader roles, `firstName`/`lastName` from `name`.

### Documentation

- Moved proposal/spec PDFs into `mern/`.
- **Rewrote `MILESTONE_SPECS.md`** against the signed Proposal PDF (see below).

---

## Critical: Milestone Scope Corrections

The old `MILESTONE_SPECS.md` incorrectly mixed HealthOS spec items into milestone deliverables. **Fixed 2026-07-07.**

### Scope hierarchy

1. **`Riayah_Plus_Proposal_v2.pdf`** — what each milestone must deliver (payment gate).
2. **HealthOS Spec + Proposed Additions** — how to build in-scope features; do **not** add deliverables.

### Explicitly OUT OF SCOPE (Proposal §5.2)

| Excluded | Do not schedule in M1–M5 |
|---|---|
| Multi-language / localization | **No Arabic-first landing, RTL, or language toggle** |
| AI/LLM intake summarisation, care plan drafting, risk detection | No AI intake summary in M2 |
| Public App Store listing | M5 = TestFlight + Play internal track only |
| Continuous GPS outside check-in/out | M5 = visit start/end only |

### M1 actual scope (Week 1, $500)

Auth (web), full Prisma schema + migrations, RBAC (6 roles), org hierarchy admin, adaptive UI shell, audit foundation, staging (EC2 + Vercel), Winston + CloudWatch, AWS Secrets Manager, Zod validation, rate limiting, device tokens, forced logout.

**Not M1:** Arabic landing, clinical intake, family onboarding.

### M2 actual scope (Week 2, $600)

Multi-step **clinical intake** (Care Unit → Patient → medical history → S3 docs), intake status machine (`Submitted → Under Review → Validated → Episode Created`), coordinator queue + structured review, Patient/Care Unit profiles, Care Episodes, Assessments.

**Not M2:** marketing landing redesign, AI intake summary, consent engine as a standalone deliverable (HealthOS guidance only).

---

## M1 Status Snapshot (where to continue)

| Area | Status |
|---|---|
| Auth (login, OTP, 2FA, httpOnly cookies) | Mostly done — verify 15m/7d JWT rotation end-to-end |
| Route / role guards (client) | Done — may need tuning vs proposal 6 roles |
| Prisma schema models | Exist — many lack routes/controllers |
| Org/branch/department CRUD | Not built |
| Granular RBAC (Create/Edit/Delete/Approve) | Not built — authenticate-only today |
| Adaptive UI shell (proposal roles) | Partial — legacy provider/careseeker/admin roles |
| Audit log foundation | Model exists; missing `ipAddress`/`deviceInfo`; not on all endpoints |
| Winston + CloudWatch | Not configured |
| AWS Secrets Manager | Not configured |
| Staging deploy (EC2 + Vercel) | Not done |

**Suggested next M1 tasks:** org management routes → granular RBAC → audit fields/wiring → logging/secrets → staging deploy. See `MILESTONE_SPECS.md` § M1 “What to Build”.

---

## Architecture Notes

### Auth flow (MERN)

```
Browser → Vite :5173 (/api/* proxied)
       → Express :5001
       → Sets httpOnly cookies (access + refresh)
       → GET /api/auth/session for bootstrap
       → POST /api/auth/refresh for rotation
```

Original stack used Next.js BFF routes (`frontend/src/app/api/auth/*`) + dual cookie/localStorage. MERN uses direct Express cookies only.

### Key client files

| File | Purpose |
|---|---|
| `src/lib/api/client.ts` | Axios instance, `withCredentials` |
| `src/contexts/AuthContext.tsx` | Session state |
| `src/components/AuthGate.tsx` | Blocks render until session resolved |
| `src/routes/index.tsx` | All routes |
| `src/lib/getRoleDashboard.ts` | Post-login redirect |
| `src/components/ProtectedRoute.tsx` | Auth guard |
| `src/components/RoleRoute.tsx` | Role guard |

### Key server files

| File | Purpose |
|---|---|
| `src/utils/authCookies.ts` | Cookie set/clear helpers |
| `src/middleware/authenticate.ts` | Cookie or Bearer JWT |
| `src/routes/auth.routes.ts` | Login, refresh, session, logout |
| `prisma/schema.prisma` | Full schema (many models unused) |
| `prisma/seed.ts` | Admin users + sample data |

---

## Parity vs Original Stack (high level)

| Area | MERN | Original |
|---|---|---|
| Frontend framework | Vite + React Router | Next.js 16 App Router |
| API | Express + Prisma | Laravel 12 + Eloquent |
| Auth transport | httpOnly cookies (Express) | httpOnly cookie + localStorage bridge + Next BFF |
| Route coverage | ~97%+ (demo coordinator pages added) | Reference |
| Telehealth | LiveKit (swap to Daily.co/Twilio in M4) | LiveKit |
| Payments | Stripe + Qatari stubs | Stripe + more |
| Milestones M2–M5 | Schemas/partials exist; most clinical flows not wired | Production features |

Deep audit lives in agent history; use `BACKEND_PARITY.md` and `FRONTEND_CONVERSION.md` for file-level gaps.

---

## Builds & Tests

```bash
cd mern/client && npm run build    # should pass
cd mern/server && npm run build    # should pass
cd mern/server && npm test         # Jest unit/integration
cd mern/client && npm run test:e2e # Playwright (needs dev server)
```

---

## Git / What to Push

Untracked/new under `mern/` includes docs, client/server source, dist assets, deploy configs, and proposal PDFs. **Review before commit:**

- Exclude `mern/client/dist/` if not needed in repo (built artifacts).
- Exclude `.env` files (keep `.env.example`).
- Include: `docx/SESSION_HANDOFF.md`, `docx/MILESTONE_SPECS.md`, source, `Dockerfile`, specs in `docx/` if team wants them in-repo.

---

## Quick Doc Index

| Question | Read |
|---|---|
| What must M1 deliver? | `MILESTONE_SPECS.md` § M1 |
| What’s out of scope? | `MILESTONE_SPECS.md` § Scope Exclusions |
| Laravel endpoint parity? | `BACKEND_PARITY.md` |
| Next.js page mapping? | `FRONTEND_CONVERSION.md` |
| Signed milestone wording? | `Riayah_Plus_Proposal_v2.pdf` §3 |
| HealthOS data hierarchy / state machines? | `MILESTONE_SPECS.md` § Core Architecture |

---

*Last updated: 2026-07-07. Update this file when milestone work lands or scope decisions change.*
