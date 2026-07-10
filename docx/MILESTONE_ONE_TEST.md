# Milestone 1 — Manual Visual Test Guide

Use this document to run the app locally and visually verify everything built so far.

**Last updated:** 2026-07-09  
**Companion doc:** `MILESTONE_ONE.md` (status tracker)

---

## What Has Been Built (Summary)

| Area | What you can test |
|---|---|
| **Auth** | Register, email verification, login, logout, forgot/reset password, sessions, refresh tokens (hashed in DB), device token API |
| **RBAC** | Role-based route protection; 6 proposal roles + legacy roles; admin-only org API |
| **Org hierarchy** | Admin UI to manage organizations → clinics → departments |
| **UI shells** | Separate portals for Family, Patient, Coordinator, Clinical, Support, Admin |
| **Audit** | Auto-logging on API mutations + Admin Audit Logs page |
| **Backend stubs** | Granular permissions, tenant scoping, state machines (mostly API-level; not all visible in UI) |

**Not ready yet:** staging deploy, phone/SMS OTP, 2FA code step on login pages, real data on proposal shell dashboards (placeholders show "—").

---

## 1. Prerequisites

### Required services

- **PostgreSQL** — database `riayah_plus`
- **Redis** — `localhost:6379` (rate limiting + jobs)
- **Node.js** — v18+ recommended

### One-time setup

```bash
# From repo root
cd server
npm install
cp .env.example .env   # if you don't already have .env
```

In `server/.env`, confirm at minimum:

```env
PORT=5001
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/riayah_plus?schema=public"
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
```

For **email verification / password reset** tests, SMTP must be configured (`MAIL_HOST`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`). Without SMTP, registration still works but you won't receive verify/reset emails.

### Database migrate + seed

```bash
cd server
npm run db:migrate    # or: npx prisma migrate dev
npm run db:seed
```

If seeded logins say **"Email not verified"**, fix once in psql or Prisma Studio:

```sql
UPDATE users
SET "isEmailVerified" = true, "emailVerifiedAt" = NOW()
WHERE email LIKE '%@demo.com' OR email LIKE '%@riayahplus.com';
```

### Client setup

```bash
cd client
npm install
```

---

## 2. Start the App

**Terminal 1 — API**

```bash
cd server
npm run dev
# Expected: listening on http://localhost:5001
```

**Terminal 2 — Client**

```bash
cd client
npm run dev
# Expected: http://localhost:5173
```

**Quick health check**

Open: http://localhost:5173/api/health  
(or http://localhost:5001/api/health)

Expected JSON with a healthy/up status.

---

## 3. Seeded Test Accounts

All passwords: **`Password123!`**

| Role | Email | After login you should land on |
|---|---|---|
| Admin | `admin@riayahplus.com` | `/admin` |
| Care Coordinator | `coordinator@riayahplus.com` | `/coordinator` |
| Family | `family@demo.com` | `/family` |
| Patient | `patient@demo.com` | `/patient` |
| Clinical Staff | `clinical@demo.com` | `/clinical` |
| Support Worker | `support@demo.com` | `/support` |
| Client (legacy) | `fatima@demo.com` | `/careseeker` |
| Provider (legacy) | `dr.hassan@demo.com` | `/provider/dashboard` (login at `/provider/login`; role is `doctor` not `clinical_staff`) |

> **Provider note:** Roles like `doctor`, `nurse`, `physiotherapist` use `/provider/login` — not `/clinical`. After login, if you see "Unauthorized access", re-run seed (`npm run db:seed`) so providers get `onboardingStatus: complete`.

**Seeded org data:** "Riayah Plus Health" with 2 clinics and 3 departments (visible in Admin → Organizations).

---

## 4. Full Visual Test Flows

Work through these in order. Check off each box as you go.

---

### Flow A — Proposal role shells (5 min)

**Goal:** Confirm each role gets its own portal with sidebar navigation.

1. **Unauthenticated deep link:** Open http://localhost:5173/family directly (not logged in)
   - **Expected:** URL becomes `/login?portal=family` with **Family Portal** login screen (not careseeker login)
2. Repeat for `/patient` → `/login?portal=patient`, etc.
3. Log in with the matching account and confirm you land back on the portal:

| Login as | Expected URL | What to look for |
|---|---|---|
| `family@demo.com` | `/family` | "Family Portal" sidebar: Dashboard, Care Plans, Bookings, Documents, Messages |
| `patient@demo.com` | `/patient` | "Patient Portal" sidebar |
| `coordinator@riayahplus.com` | `/coordinator` | "Coordinator Portal" + Intake Queue placeholder |
| `clinical@demo.com` | `/clinical` | "Clinical Portal" |
| `support@demo.com` | `/support` | "Support Portal" |

4. **Wrong portal:** On `/login?portal=family`, try logging in as `patient@demo.com` — should show error, not redirect.
5. **Admin login guard:** On http://localhost:5173/admin/login, try `family@demo.com` — should show "Access denied. Admin credentials required." and stay on admin login (not redirect to `/family`).
6. Click a sub-page (e.g. `/family/bookings`) — placeholder page loads without crash.

**Pass if:** Each role gets correct portal login + dashboard; admin login rejects non-admin; placeholders load.

---

### Flow B — Admin org hierarchy (10 min)

**Goal:** Test org CRUD UI wired to real API.

1. Log in as `admin@riayahplus.com` / `Password123!`
2. Go to **Admin → Config → Organizations**  
   URL: http://localhost:5173/admin/organizations
3. **View seed data** — expand "Riayah Plus Health"; you should see clinics and departments.
4. **Create organization** — click Add Organization, name e.g. `Test Clinic Group`, save.
5. **Add clinic** — select org → Add Clinic → name e.g. `Doha Branch`.
6. **Add department** — expand clinic → Add Department → e.g. `Physiotherapy`.
7. **Edit** — rename org or clinic; confirm changes persist after refresh.
8. **Deactivate** (if UI offers toggle) or delete a test department/clinic you created.
9. Try delete on org with children — should fail gracefully (409) if users/clinics linked.

**Pass if:** Full tree CRUD works; seed org still visible; no 403/500 errors.

---

### Flow C — Admin audit logs (3 min)

**Goal:** Confirm mutations are logged.

1. Still logged in as admin
2. Go to **Admin → Audit Logs**  
   URL: http://localhost:5173/admin/audit-logs
3. You should see entries from your org tests (`organization_created`, `http.post`, login events, etc.)
4. Check columns include action, user, timestamp, and device/browser info where shown.

**Pass if:** New org actions appear in the list after Flow B.

---

### Flow D — Registration + email verification (10 min)

**Goal:** New user cannot log in until email is verified.

> Requires working SMTP in `server/.env`.

1. Log out
2. Go to http://localhost:5173/register
3. Click **"I Need Care"** (Family members & care seekers) — this opens the registration form  
   - Shortcut: http://localhost:5173/register?role=family skips straight to the form
4. Register with a **real email you can access**, e.g. `you+test@gmail.com`, password `Password123!`
5. **Expected:** Redirect to `/verify-email?email=...` with message to check inbox — **not** logged in yet
6. Open email → click verification link (`GET /api/email/verify?token=...&email=...`)
7. **Expected:** Browser page "Email verified successfully" → redirects to login with `?verified=1`
8. Log in with the new account
9. **Expected:** Login succeeds and redirects to `/family` (family role) or `/careseeker` (client role)

**Also test resend:**

1. Register another email (or use unverified account)
2. On `/verify-email` page → click **Resend verification**
3. **Expected:** Success toast; new email arrives

**Pass if:** No JWT/session until verified; login blocked with 403 before verify; works after verify.

---

### Flow E — Forgot / reset password (5 min)

**Goal:** Password reset email flow.

> Requires SMTP.

1. Log out
2. Go to http://localhost:5173/forgot-password
3. Enter `fatima@demo.com` (or your test email)
4. **Expected:** Generic success message (no user enumeration)
5. Open reset email → link goes to `/reset-password?token=...&email=...`
6. Set new password `NewPassword123!`
7. Log in with new password
8. Try old password — should fail

**Pass if:** Reset link works once; old password rejected.

---

### Flow F — Sessions + logout (5 min)

**Goal:** Multi-device sessions and revoke.

> **Restart the API server** after pulling this fix (`cd server && npm run dev`).

1. Log out everywhere first (clear old sessions)
2. Log in as `fatima@demo.com` in **Chrome** at `/careseeker/login`
3. Log in as same user in **Firefox or Incognito** (separate cookie jar = separate session)
4. In **Chrome**: go to http://localhost:5173/careseeker/settings/security
5. **Connected Devices** should list **2 sessions**, e.g. `Chrome on macOS` and `Firefox on macOS`
6. One row should show green **"This device"** badge (Chrome) — only the *other* row has a trash icon
7. Click trash on the **Firefox** session → confirm
8. In **Firefox**: navigate to another page (e.g. `/careseeker/bookings`) — within ~15 min the access token may still work; after it expires, refresh fails and you are signed out. For a quicker check, close Firefox and reopen, or wait until access token expires.
9. **Sign out all other devices** (top-right button) — revokes every session except current
10. **Log out** from app menu — redirects to login; `/careseeker` should require login again

**Pass if:** Session list shows device names + IP; "This device" is marked; revoke removes other session from list; logout works.

**If you see "No active sessions":** API field mismatch was fixed — hard refresh the page.

**If only 1 session:** Make sure you used two different browsers (not two tabs in the same browser).

---

### Flow G — 2FA enable (optional, 5 min)

**Goal:** TOTP setup on Security page (login-step 2FA UI not built yet).

1. Log in as `fatima@demo.com`
2. Go to http://localhost:5173/careseeker/settings/security
3. Enable 2FA → scan QR with Google Authenticator
4. Enter 6-digit code → **Expected:** 2FA enabled
5. Log out and log in again
6. **Known gap:** Login page may **not** show 2FA code prompt yet (`TwoFactorRequiredError` not handled in UI). If login fails oddly, disable 2FA with password on Security page.

**Pass if:** Enable/disable works on Security page. Login 2FA prompt = future fix.

---

### Flow H — Legacy portals still work (3 min)

**Goal:** Old careseeker/provider flows not broken.

| Account | URL after login | Spot-check |
|---|---|---|
| `fatima@demo.com` | `/careseeker` | Dashboard loads |
| `dr.hassan@demo.com` | `/provider` | Provider dashboard loads |

**Pass if:** Legacy routes work alongside new proposal shells.

---

### Flow I — Demo coordinator prototype (2 min)

**Goal:** Mock coordinator demo still available.

1. Open http://localhost:5173/demo/coordinator/dashboard
2. **Expected:** Demo UI with mock data (not wired to API)

This is separate from the real `/coordinator` shell.

---

## 5. API-Only Checks (Optional — Terminal)

Use these if you want to verify backend without UI.

### Login + cookies

```bash
curl -c cookies.txt -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@riayahplus.com","password":"Password123!"}'
```

### Session check

```bash
curl -b cookies.txt http://localhost:5001/api/auth/session
```

### Refresh token rotation

```bash
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5001/api/auth/refresh
```

### Device token register

```bash
curl -b cookies.txt -X POST http://localhost:5001/api/device-tokens \
  -H "Content-Type: application/json" \
  -d '{"token":"test-fcm-token-123","platform":"web"}'
```

### List organizations (admin)

```bash
curl -b cookies.txt http://localhost:5001/api/admin/organizations
```

### Phone OTP (should fail honestly)

```bash
curl -X POST http://localhost:5001/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{"identifier":"+97450000000","type":"phone"}'
```

**Expected:** `503` with message that phone OTP is not available.

---

## 6. What You Should See vs What Is Placeholder

| Feature | Real / working | Placeholder / not yet |
|---|---|---|
| Login, logout, sessions | ✅ | |
| Email verify, password reset | ✅ (needs SMTP) | |
| Admin org tree CRUD | ✅ | |
| Audit logs page | ✅ | |
| 6 role shells + sidebar | ✅ | |
| Shell dashboard stats ("—") | | M2 API |
| Shell sub-pages (bookings, intake queue, etc.) | | M2 placeholders |
| 2FA at login | | UI gap |
| Phone login | | Returns 503 |
| Staging deploy | | Not deployed |

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `Email not verified` on seed accounts | Run SQL in section 1 or re-seed with verified flag |
| Client can't reach API | Confirm API on `:5001`; Vite proxy in `client/vite.config.ts` points to `5001` |
| Redis connection error | Start Redis: `redis-server` or Docker |
| Rate limit 429 during testing | Wait 1 minute or restart Redis to clear `rl:*` keys |
| No verification email | Check `MAIL_*` in `.env`; check server console for mail errors |
| 403 on `/admin/organizations` | Log in as `admin@riayahplus.com`, not a non-admin role |
| Wrong dashboard after login | Clear cookies/localStorage; check user `role` in DB |

---

## 8. Suggested Test Order (30–45 min total)

1. Start servers + health check  
2. **Flow A** — All 6 proposal role shells  
3. **Flow B** — Admin organizations  
4. **Flow C** — Audit logs  
5. **Flow F** — Sessions/logout  
6. **Flow D** — Register + verify (if SMTP configured)  
7. **Flow E** — Password reset (if SMTP configured)  
8. **Flow H** — Legacy portals  
9. Optional API curls from section 5  

---

## 9. Report Back

After testing, note:

- Which flows passed / failed
- Screenshots worth sharing with client (org admin, role shells, audit logs)
- Blockers (SMTP, DB, Redis, etc.)

Then we can pick the next task: staging deploy, 2FA login UI, or migrations commit.
