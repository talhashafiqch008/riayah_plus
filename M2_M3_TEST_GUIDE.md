# M2 / M3 — Open Audit Tickets

**Platform:** Riayah Plus — PERN Stack  
**Base URLs:** Frontend `http://localhost:5173` · API `http://localhost:5001`  
**Audit source:** M1_GAPS.pdf + GDPR_M1.pdf — Karim Ashraf, 10–11 July 2026

> Items below are from the original audit report that were **not completed in M1**. Each section includes the ticket ID, what's missing, and how to verify the fix once implemented.

---

## STUB-001 — Multi-tenant Query Scoping (MEDIUM)

**Audit finding:** `tenantWhere()` helper exists in `server/src/middleware/tenantScope.ts` but is never merged into Prisma queries in list/get controllers. All admin list endpoints return data across all tenants.

**What needs doing:** Every list/get controller (Users, Bookings, Payments, Orgs) must call `tenantWhere(req)` and spread the result into its Prisma `where` clause.

**How to test once fixed:**

```bash
# Login as admin belonging to Tenant A
curl -s -c /tmp/tenant-a-admin.txt -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tenant-a.com","password":"Password123!"}' | jq .user.organizationId

# List users — should only return Tenant A users
curl -s -b /tmp/tenant-a-admin.txt http://localhost:5001/api/admin/users | jq '[.data[].organizationId] | unique'
```

**Expected:** Only the tenant A `organizationId` appears in the result.

---

## STUB-004 — State Machine: Missing Entity Types (LOW)

**Audit finding:** `server/src/utils/stateMachine.ts` only covers 3 entity types (Booking, Appointment, something else). Document, Invoice, and PayoutRequest transitions are not validated.

**What needs doing:** Add transition maps for Document, Invoice, and PayoutRequest. Apply the guard in the relevant controllers.

**How to test once fixed:**

```bash
# Attempt an illegal Invoice status jump (e.g. draft → paid, skipping submitted)
curl -s -b /tmp/admin.txt -X PATCH http://localhost:5001/api/admin/invoices/<invoiceId>/status \
  -H "Content-Type: application/json" \
  -d '{"status":"paid"}' | jq '{status: .status, message: .message}'
```

**Expected:** `422` — transition not allowed.

---

## SHELL-002 — Proposal Role Shell: Live Stats (LOW)

**Audit finding:** `client/src/pages/roles/RoleShellDashboard.tsx` shows static placeholder counts for Family, Patient, Clinical, Support portals.

**What needs doing:** Wire each stat card to the appropriate API endpoint so numbers reflect real data.

**How to test once fixed:**

1. Log in as `family@demo.com` → `http://localhost:5173/family`
2. **Expected:** Stat cards show real numbers (e.g. active bookings count, not `0` or `--`)

---

## SHELL-003 — Proposal Role Portals: 2FA Login Step (LOW)

**Audit finding:** Admin and Provider login pages handle 2FA (AUTH-001 fix). Family, Patient, Clinical, and Support portals use `ProposalPortalLoginPage` which has no 2FA step.

**What needs doing:** Add the same 6-digit code step to `ProposalPortalLoginPage` (catch `TwoFactorRequiredError`, show code input, call `complete2faLogin()`).

**How to test once fixed:**

1. Enable 2FA on `family@demo.com` via `POST /api/auth/2fa/enable` + `POST /api/auth/2fa/confirm`
2. Log out, go to `http://localhost:5173/family`
3. Enter credentials
4. **Expected:** 2FA step appears — enter authenticator code to complete login

---

## SHELL-006 — Admin Layout: Live Badge Counts (LOW)

**Audit finding:** Notification/alert badges in the admin sidebar are static numbers.

**What needs doing:** Fetch unread counts from the API (or subscribe via WebSocket) and update badge counts in real time.

**How to test once fixed:**

1. Log in as admin
2. Trigger a new event (new user registration, new booking)
3. **Expected:** Badge count increments without page refresh

---

## Staging Deploy — M1 Sign-off Blocker (HIGH)

**Audit finding:** API not deployed to EC2; client not deployed to Vercel. Formal M1 sign-off cannot happen without a working staging environment.

**Steps:**

1. Deploy `mern/server` to EC2; set all env vars; run `npm run db:deploy`
2. Deploy `mern/client` to Vercel; set `VITE_API_URL` to the EC2 endpoint
3. Smoke test:

```bash
# Health check
curl https://<ec2-domain>/api/health

# Login from Vercel origin (checks CORS + httpOnly cookie)
curl -s -c /tmp/staging.txt -X POST https://<ec2-domain>/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Origin: https://<vercel-domain>" \
  -d '{"email":"admin@riayahplus.com","password":"Password123!"}' | jq .user.role
```

**Expected:** `200` on health; login returns role; cookie set with `SameSite=None; Secure`.

---

## GDPR Phase 2 — High Priority (G6 / G7 / G8 / G11 / G12)

These require content/contacts from the client rather than code changes. File as a documentation task once the client provides details.

| Ticket | Requirement | Status |
|--------|-------------|--------|
| G6 | ROPA (Article 30) — Record of Processing Activities document | Open |
| G7 | Data Protection Officer designation (Article 37) | Open |
| G8 | Real privacy policy endpoint (not placeholder) | Open |
| G11 | Consent granularity — separate toggles per purpose | Open |
| G12 | Purpose Limitation documentation | Open |

**G2 follow-up (partial from M1):** Add a "Request human review" UI button to the careseeker matching flow. The backend already returns `requiresReview: true`; the frontend must surface it.

---

## GDPR Phase 3 — Medium Priority (G14–G19)

| Ticket | Requirement |
|--------|-------------|
| G14 | Legitimate Interest Assessment (LIA) documentation |
| G15 | SAST/DAST integrated into CI/CD pipeline |
| G16 | Pseudonymization for analytics data |
| G17 | Real privacy policy content (replace placeholder) |
| G18 | Explicit "I agree" checkbox on all data-collection forms |
| G19 | DPIA for health data / matching / GPS features |

---

## Pass / Fail Checklist

| #    | Ticket   | Description                                    | Pass | Fail |
|------|----------|------------------------------------------------|------|------|
| M2-1 | STUB-001 | Tenant-scoped list endpoints                   |      |      |
| M2-2 | STUB-004 | State machine: Document / Invoice / Payout     |      |      |
| M2-3 | SHELL-002 | Proposal role shells show live stats          |      |      |
| M2-4 | SHELL-003 | Proposal role portals handle 2FA login        |      |      |
| M2-5 | SHELL-006 | Admin badge counts are live                   |      |      |
| M2-6 | STAGING  | EC2 + Vercel smoke test passes                 |      |      |
| M2-7 | G2       | "Request human review" UI in matching flow     |      |      |
| M3-1 | G6       | ROPA document published                        |      |      |
| M3-2 | G7       | DPO designated                                 |      |      |
| M3-3 | G8       | Real privacy policy live                       |      |      |
| M3-4 | G11      | Per-purpose consent toggles                    |      |      |
| M3-5 | G15      | SAST/DAST in CI/CD                             |      |      |
| M3-6 | G16      | Analytics pseudonymized                        |      |      |
| M3-7 | G18      | "I agree" checkbox on all data forms           |      |      |
| M3-8 | G19      | DPIA completed for health / matching / GPS     |      |      |
