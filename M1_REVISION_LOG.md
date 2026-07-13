# M1 Revision Log

**Platform:** Riayah Plus — PERN Stack  
**Milestone:** M1 post-live-test fixes  
**Date:** 2026-07-13

All items below were identified during M1 live testing and fixed in this session.

---

## Bug Fixes

### AUTH — Logout-all did not revoke active JWT access tokens

**Root cause:** `logoutAll` only revoked rows in `RefreshToken`. The `UserSession` table (which `listSessions` reads) was never touched, so session counts stayed the same and in-flight access tokens remained valid for their full 15-minute TTL.

**Fix:**
- `AuthController.logoutAll` now revokes both `RefreshToken` and `UserSession` rows in parallel.
- `auth.ts` middleware gained two new helpers — `recordLogoutAll` (writes a Redis key `auth:logoutall:<userId>` with TTL = 7 days) and `wasLoggedOutAll` (checks that key against the token's `iat`). Both are checked on every authenticated request; tokens issued before the logout-all timestamp are rejected immediately with `401 Session terminated.`

**Files:** `server/src/controllers/auth/AuthController.ts`, `server/src/middleware/auth.ts`

---

### AUTH — 2FA settings showed "Enable" even after 2FA was already enabled

**Root cause:** Both login response shapes (regular login and 2FA-complete login) were missing the `twoFactorEnabled` field. `AuthContext.mapUserData` couldn't populate `user.two_factor_enabled`, so the 2FA settings card always defaulted to the "Enable" state.

**Fix:** Added `twoFactorEnabled: user.twoFactorEnabled` to both response objects in `AuthController.login` and `AuthController.complete2FALogin`.

**File:** `server/src/controllers/auth/AuthController.ts`

---

### ORG — Duplicate organization names were allowed

**Root cause:** No uniqueness check in `createOrganization` or `updateOrganization`.

**Fix:** Added a `prisma.organization.findFirst({ where: { name } })` check before create, and a `where: { name, id: { not: existingId } }` check before update. Both throw `AppError('...', 409)` on conflict.

**File:** `server/src/controllers/admin/OrganizationController.ts`

---

### ORG — Duplicate clinic/department names returned 500

**Root cause:** Prisma P2002 unique constraint error was not caught, bubbling up as an unhandled server error.

**Fix:** Added `catch` blocks in `createClinic` and `createDepartment` that detect `err.code === 'P2002'` and return a `409` with a human-readable message.

**File:** `server/src/controllers/admin/OrganizationController.ts`

---

### AUDIT — Date range filter off by one day

**Root cause:** The `to` filter used the raw date string (midnight), so logs created later the same day were excluded.

**Fix:** When a `to` date is provided, it is extended to `23:59:59.999` before being applied as a `lte` filter.

**File:** `server/src/services/AuditService.ts`

---

### AUTH — Wrong-portal login redirected to home page (Test 3F)

**Root cause:** `finishAdminLogin` in `AdminLoginPage.tsx` called `logout()` on role mismatch, which clears the session and navigates to `/`.

**Fix:** Replaced `await logout()` with `navigate(getRoleDashboard(userData.role))` so the user is sent directly to their correct portal with an info toast. `logout` is no longer imported.

**File:** `client/src/pages/admin/LoginPage.tsx`

---

## Features Added

### 2FA management UI — Admin Settings

Added a "Two-Factor Authentication" card to the Admin Settings page with full enable/disable flow:
- **Enable flow:** click Enable → QR code modal opens → scan with authenticator → enter 6-digit code to confirm → recovery codes displayed.
- **Disable flow:** click Disable → password confirmation modal → 2FA turned off.
- Card status reflects `user.two_factor_enabled` from AuthContext (seeded on mount, updated after each action).

**File:** `client/src/pages/admin/SettingsPage.tsx`

---

### 2FA management UI — Provider Settings

Same enable/disable flow added to the Provider Settings page as a `SectionCard` between "Change Password" and "Language & Region".

**File:** `client/src/pages/provider/SettingsPage.tsx`

---

## Test Guide Corrections

The following errors in `M1_TEST_GUIDE.md` were corrected:

| Section | Was | Now |
|---------|-----|-----|
| 4c logout-all URL | `/api/auth/logout-all` | `/api/logout-all` |
| 10a consent grant | `/api/consents` | `/api/client/consents` |
| 10b consent history | `/api/consent/history` | `/api/client/consent/history` |
| 10c revoke | `/api/consents/marketing` | `/api/client/consents/marketing` |
| 10d data export | `GET /api/privacy/data-export` | `POST /api/privacy/data-export` |
| 10f account delete | `DELETE /api/user/profile` | `POST /api/privacy/delete-account` |
| 4c explanation | Device 2 described as still working | Clarified: session count drops to 0 immediately; access token valid for up to 15 min (TTL) |
| 8c note | No note | Added: API auto-extends `to` to 23:59:59 so same-day filter works |
| 10 (all) | No login step shown | Login step added at top of section; all sub-tests use `/tmp/fatima.txt` |

---

## M1 Pass / Fail Final State

| #    | Test                                             | Result |
|------|--------------------------------------------------|--------|
| 1    | Cookie consent banner appears on first visit     | Passed |
| 2a   | Register without consent → 422                   | Passed |
| 2b   | Register with consent → 201                      | Passed |
| 2c   | XSS in name field stripped                       | Passed |
| 3a–e | All role logins work                             | Passed |
| 3f   | Wrong-portal redirect enforced                   | Fixed  |
| 4a   | Session list shows UserSession rows              | Passed |
| 4b   | Logout clears cookies                            | Passed |
| 4c   | Logout-all revokes all sessions immediately      | Fixed  |
| 5a   | x-admin-request header → 401                     | Passed |
| 5b   | Suspended user → 403 within 30s                  | Passed |
| 6b   | Provider cannot access /admin/users              | Passed |
| 7c   | Duplicate org name rejected                      | Fixed  |
| 7d   | Clinic modal has no email/website fields         | Passed |
| 7e   | Duplicate clinic name in same org rejected       | Fixed  |
| 7f   | Clinic search filters correctly                  | Passed |
| 7k   | Delete org cascades to clinics and depts         | Passed |
| 8a   | Audit log table shows real data                  | Passed |
| 8b   | userId filter works                              | Passed |
| 8c   | Date range filter works (same-day)               | Fixed  |
| 8e   | Pagination controls present                      | Passed |
| 8f   | Export CSV downloads a file                      | Passed |
| 9a–e | 2FA enable, confirm, login, wrong-code           | Passed |
| 9f   | 2FA settings card in Admin/Provider Settings     | Fixed  |
| 10b  | Consent history returns entries (not empty)      | Passed |
| 10d  | Data export downloads a file                     | Passed |
| 10e  | Processing restriction endpoint returns 200      | Passed |
| 11   | Matching response includes requiresReview: true  | Passed |
| 15   | Rate limiting kicks in after repeated failures   | Passed |
