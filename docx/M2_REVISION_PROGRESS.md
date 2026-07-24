# M2 Revision Progress Tracker

**Branch:** `milestone2-revisions`  
**Source brief:** `M2_REVISION_PLAN.md`  
**Last updated:** 2026-07-24  

> This file is the handoff doc. If the session ends, the next developer (Cursor or otherwise) should read this, check the current git status, and continue from the first 🔄 item.

---

## 🔴 CURRENT PRIORITY: Karim Re-Audit (ea27627) — Security & GDPR Fixes

**Full audit:** `mern/docx/GDPR_Security_ReTest_ea27627.md`  
**Commit audited:** `ea27627`  
**Ahmed's revision items (R-A through R-D): all committed and tested ✅ — see below.**

Scope: M2 findings (issues in files M2 changed) + M1 auth/session hardening findings (auth system touched in M1, should have been caught then). Payment, billing, LMS, cache, and infrastructure findings go to their respective future milestones and are not tracked here.

---

### M1 — Auth & Session Hardening

| ID | Severity | Finding | File | Fix |
|----|----------|---------|------|-----|
| **A-3** | 🔴 Critical | JWT secrets default to `'change-me-access-secret'` / `'change-me-refresh-secret'` — server starts and issues forgeable tokens if env vars not overridden | `server/src/config/env.ts:20-21` | Refuse to start if secrets equal default values |
| **A-1** | 🔴 High | OTP verify endpoints have no rate limiter — 6-digit OTP brute-forceable; prior OTPs not invalidated on new send | `server/src/controllers/auth/OtpController.ts:32,56-80`; `server/src/routes/auth.routes.ts:45-46` | Apply `otpLimiter` to verify endpoints; invalidate old OTPs on new send |
| **A-2** | 🔴 High | 2FA verify endpoint unthrottled; `two_fa_token` is just the user ID — TOTP brute-force possible | `server/src/controllers/auth/AuthController.ts:101-102,129-148`; `server/src/routes/auth.routes.ts:42-43` | Add per-identifier rate limiter; replace user-ID challenge with opaque random state token |
| **A-4** | 🔴 High | `OtpController.verify` stores refresh tokens in plaintext — password auth hashes them (inconsistency) | `server/src/controllers/auth/OtpController.ts:102-109` | Use `persistRefreshToken` (which hashes) inside `OtpController.verify` |
| **A-10** | 🟡 Medium | Legacy plaintext refresh-token fallback still active in `refreshTokenStore.ts` — downgrade path accepts plaintext tokens | `server/src/utils/refreshTokenStore.ts:24-48` | Remove legacy fallback; hash all stored refresh tokens |
| **A-5** | 🟡 Medium | Multiple concurrent valid password-reset tokens allowed per user — old email link still works after new reset requested | `server/src/controllers/auth/AuthController.ts:260-271,280-300` | Delete all prior `password_reset` rows for the identifier on each new `forgotPassword` |
| **A-6** | 🟡 Medium | `DeviceTokenController.register` silently reassigns push token to a different userId — enables push notification hijack | `server/src/controllers/auth/DeviceTokenController.ts:18-35` | Require `existing.userId === req.user.userId` before updating; otherwise delete + re-create |
| **A-7** | 🟡 Medium | No global `Referrer-Policy` header; reset/verify tokens in URL query strings can leak via Referer to third-party assets | `server/src/app.ts`; `server/src/services/EmailService.ts:47-72` | Add `Referrer-Policy: strict-origin-when-cross-origin` globally; add `<meta name="referrer">` in email templates |
| **A-8** | 🟢 Low | Auth cookies use `sameSite: 'lax'` — evaluate `strict` for a health-data platform | `server/src/utils/authCookies.ts:11-17` | Evaluate `sameSite: 'strict'` for the refresh cookie; document decision |
| **A-9** | 🟢 Low | Login timing oracle — missing user returns faster than wrong password (no dummy bcrypt call) | `server/src/controllers/auth/AuthController.ts:79-99` | Run dummy `bcrypt.compare` when user is not found |

---

### M2 — Findings in Files M2 Changed

| ID | Severity | Finding | File | Fix |
|----|----------|---------|------|-----|
| **R-3** | 🟡 Medium | Registration schema still accepts any `UserRole` via direct API — backend whitelist (R-C) was UI-only; defaults to `client` not `family` | `server/src/controllers/auth/RegistrationController.ts:12-70` | Change schema to `z.enum(['family', 'patient']).default('family')` |
| **H-27** | 🟡 Medium | `CareEpisodeController.index` returns `patient.email` + `careRecipient.externalRef` in list — more PHI than needed | `server/src/controllers/patients/CareEpisodeController.ts:64-67` | Remove `email` and `externalRef` from the list projection |
| **H-28** | 🟡 Medium | `CareEpisodeController.show` returns all nested PHI with no role-based projection | `server/src/controllers/patients/CareEpisodeController.ts:126-143` | Scope `include` to minimum necessary fields per caller role |
| **H-30** | 🟡 Medium | `IntakeController.review` audit log includes `reviewSummary.notes` which may contain free-text PHI | `server/src/controllers/patients/IntakeController.ts:581-592` | Strip `notes` from the audit blob; log structured metadata only |
| **R-2 / R-6** | 🟢 Low | `GET /episodes/coordinators` returns coordinator `email` + sequential IDs — probably unnecessary for a name dropdown | `server/src/controllers/patients/CareEpisodeController.ts` | Remove `email` from response if UI only needs `name`/`id` |
| **R-7** | 🟢 Low | Registration response returns full user object (`id`, `name`, `email`, `role`, `onboardingStatus`) — excessive for a verify-email flow | `server/src/controllers/auth/RegistrationController.ts:101-114` | Return only `{ id, onboardingStatus }` or `{ success, requiresEmailVerification }` |

---

### ✅ False Positives / Not an issue

| ID | Reason |
|----|--------|
| **R-1** | `IntakeController.review` accepting arbitrary `coordinatorId` — **withdrawn by Karim**. Branch does not accept `coordinatorId`; episode always uses `req.user!.userId`. |
| **R-9** | Admin routes missing granular permission gates — **false positive**. Every route Karim cited already has `requireView`/`requireApprove`/`requireEdit` from `permissions.ts`. Verified in source. |
| **R-11 / H-32** | Admin disputes routes missing per-route gate — **false positive**. Both routes have `requireView('booking')` and `requireApprove('booking')` respectively. Verified in source. |

---

## Cursor Handoff Instructions

**Read this first before touching any code.**

### What this project is

MERN stack health/care platform. Working directory is `mern/`. Server is Express + Prisma (PostgreSQL). Client is React + Vite + TypeScript + Tailwind.

- Server runs on `http://localhost:5001`
- Client runs on `http://localhost:5173`
- Branch: `milestone2-revisions`
- Latest commit: `ea27627` (rename + Ahmed revisions)

### What has been implemented and committed ✅

All four of Ahmed's revision items (R-A, R-B, R-C, R-D) are fully coded, tested, and committed in `c2a074d`. See the step tables below for the exact files changed.

### Current status: Karim re-audit fixes

Ahmed's revisions are done. Karim completed a GDPR/Security/HIPAA re-audit at `ea27627`. See the **CURRENT PRIORITY** section at the top of this file. Start with Critical, then High.

### Bug that was found and fixed in R-B (already in ea27627 — do NOT revert)

**File:** `mern/client/src/pages/careseeker/OnboardingPage.tsx`

**Problem:** Family onboarding wizard called `submitFamilyIntake()` but never `completeClientOnboarding()`. Backend `user.onboardingStatus` stayed `'pending'`, causing an infinite redirect loop.

**Fix applied:**
```typescript
await submitFamilyIntake();
await completeClientOnboarding({});  // marks onboardingStatus = 'complete'
await refreshUser();                  // refreshes AuthContext so guard sees 'complete'
localStorage.removeItem(draftKey);
setStep(OnboardingStep.COMPLETE);
```

### What Cursor needs to do next

Work through findings in this order:

**M1 Auth — Critical first:**
1. A-3 — JWT default secret startup check (`env.ts`)
2. A-1 — Rate-limit OTP verify endpoints + invalidate old OTPs (`OtpController.ts`, `auth.routes.ts`)
3. A-2 — Rate-limit 2FA verify + replace user-ID challenge token (`AuthController.ts`, `auth.routes.ts`)
4. A-4 + A-10 — Hash refresh tokens in OTP flow; remove plaintext fallback (`OtpController.ts`, `refreshTokenStore.ts`)
5. A-5 — Revoke old reset tokens on new forgotPassword (`AuthController.ts`)
6. A-6 — Push token ownership check (`DeviceTokenController.ts`)
7. A-7 — Global Referrer-Policy header + email meta tag (`app.ts`, `EmailService.ts`)
8. A-8, A-9 — sameSite cookie + dummy bcrypt on login miss

**M2 — after auth is done:**
9. R-3 — Tighten registration schema to `z.enum(['family', 'patient'])` (`RegistrationController.ts`)
10. H-27 — Remove `email` + `externalRef` from episode list projection (`CareEpisodeController.ts`)
11. H-28 — Scope episode show `include` to minimum necessary fields (`CareEpisodeController.ts`)
12. H-30 — Strip `notes` from intake review audit log (`IntakeController.ts`)
13. R-2/R-6 — Remove `email` from coordinator list response (`CareEpisodeController.ts`)
14. R-7 — Slim down registration response (`RegistrationController.ts`)

Commit after each logical group with message referencing the finding IDs.



### Key files for Karim audit fixes (for git staging)

**M1 — Auth & session hardening:**
```
mern/server/src/config/env.ts                          — A-3: JWT default secret startup check
mern/server/src/controllers/auth/OtpController.ts      — A-1, A-4: OTP rate limit + refresh token hashing
mern/server/src/controllers/auth/AuthController.ts     — A-2, A-5, A-9: 2FA throttle, reset token cleanup, timing
mern/server/src/controllers/auth/DeviceTokenController.ts — A-6: push token ownership
mern/server/src/utils/refreshTokenStore.ts             — A-10: remove plaintext fallback
mern/server/src/routes/auth.routes.ts                  — A-1, A-2: rate limiter wiring
mern/server/src/app.ts                                 — A-7: global Referrer-Policy header
mern/server/src/services/EmailService.ts               — A-7: meta referrer tag in email templates
mern/server/src/utils/authCookies.ts                   — A-8: sameSite evaluation
```

**M2 — Care episode PHI + registration:**
```
mern/server/src/controllers/patients/CareEpisodeController.ts  — H-27, H-28, R-2/R-6: list/show projection + coordinator email
mern/server/src/controllers/patients/IntakeController.ts        — H-30: notes in audit log
mern/server/src/controllers/auth/RegistrationController.ts      — R-3, R-7: schema tightening + slim response
```

---



## Status Legend


| Symbol | Meaning             |
| ------ | ------------------- |
| ✅      | Done and committed  |
| 🔄     | In progress         |
| ⬜      | Not started         |
| ❌      | Blocked — see notes |


---



## R-B — Family Post-Registration → Onboarding → Dashboard

**Goal:** After a family user registers, send them to `/family/onboarding`. After completing onboarding, send them to `/family`. Block `/family` dashboard if onboarding is still pending.


| Step | File                                                                                                                                                          | Status | Notes |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| B1   | `client/src/pages/public/RegisterPage.tsx` — fix post-registration redirect for family role to `/family/onboarding` (not `/careseeker/onboarding`)            | ✅      |       |
| B2   | `client/src/pages/public/RegisterPage.tsx` — remove `provider` option from role selector (already disabled in UI, make it gone entirely)                      | ✅      |       |
| B3   | `client/src/layouts/HealthRoleLayout.tsx` — add onboarding guard: if role is `family` and `onboarding_status === 'pending'`, redirect to `/family/onboarding` | ✅      |       |


---



## R-A — Coordinator Assignment

**Goal:** Multiple coordinators in org; coordinator can be assigned/reassigned to an episode; coordinator picker on intake review and episode detail.


| Step | File                                                                                                                                                             | Status | Notes                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| A1   | `server/src/routes/episode.routes.ts` — add `GET /episodes/coordinators` endpoint                                                                                | ✅      | Returns all `care_coordinator` users in the tenant |
| A2   | `server/src/controllers/patients/CareEpisodeController.ts` — add `coordinators()` handler + extend `updateEpisodeSchema` to allow `coordinatorId`                | ✅      |                                                    |
| A3   | `server/src/controllers/patients/IntakeController.ts` — allow optional `coordinatorId` in review body; use it instead of always defaulting to `req.user!.userId` | ✅      |                                                    |
| A4   | `client/src/lib/api/episodes.ts` — add `getCoordinators()` and `assignCoordinator(episodeId, coordinatorId)`                                                     | ✅      |                                                    |
| A5   | `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx` — add coordinator picker in the intake review modal                                                | ✅      |                                                    |
| A6   | `client/src/pages/care/EpisodeDetailPage.tsx` — show assigned coordinator; add reassign control (coordinator/admin only)                                         | ✅      |                                                    |


---



## R-C — Remove Provider / CareSeeker Roles (Phase 1)

**Goal:** Block self-registration as `provider`/`client`/`consumer` on backend. Remove provider/careseeker route trees from frontend. Keep page files on disk.


| Step | File                                                                                                                               | Status | Notes                                              |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| C1   | `server/src/controllers/auth/RegistrationController.ts` — remove `provider`, `client`, `consumer` from self-registration allowlist | ✅      | Staff roles still invite-only via admin            |
| C2   | `client/src/routes/index.tsx` — redirect `/provider/*` and `/careseeker/*` to `/login`                                             | ✅      | Files kept on disk, just routes removed/redirected |
| C3   | `client/src/pages/public/RegisterPage.tsx` — remove "I Provide Care" card entirely (was already disabled)                          | ✅      | Done as part of B2                                 |


---



## R-D — UI Improvements

**Goal:** Breadcrumbs on detail pages, mobile sidebar as drawer, consistent spacing/typography, page-level polish on highest-traffic pages.


| Step | File                                                                                                                                | Status | Notes |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ | ----- |
| D1   | `client/src/layouts/HealthRoleLayout.tsx` — improve mobile sidebar: proper overlay drawer, close on nav click, close button visible | ✅      |       |
| D2   | `client/src/components/ui/Breadcrumb.tsx` — create shared Breadcrumb component                                                      | ✅      |       |
| D3   | `client/src/pages/care/CareUnitDetailPage.tsx` — add breadcrumb                                                                     | ✅      |       |
| D4   | `client/src/pages/care/EpisodeDetailPage.tsx` — add breadcrumb                                                                      | ✅      |       |
| D5   | `client/src/pages/care/CarePatientDetailPage.tsx` — add breadcrumb                                                                  | ✅      |       |
| D6   | `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx` — spacing polish, card layout for mobile                              | ✅      |       |
| D7   | `client/src/pages/care/EpisodeListPage.tsx` — consistent card/row spacing                                                           | ✅      |       |
| D8   | `client/src/pages/care/AssessmentSchedulePage.tsx` — mobile layout improvements                                                     | ✅      |       |


---



## Testing Guide

> Run both dev servers before testing: `cd mern/server && npm run dev` and `cd mern/client && npm run dev`
> Client runs on `http://localhost:5173` — Server API on `http://localhost:5001`

---



### R-B — Family Onboarding Flow


| #   | URL / Action                     | Expected                                                          | Result |
| --- | -------------------------------- | ----------------------------------------------------------------- | ------ |
| 1   | `http://localhost:5173/register` | Only "Family Account" panel shown, no role picker                 | Passed |
| 2   | Register a new account           | Redirects to `http://localhost:5173/verify-email?email=...`       | Passed |
| 3   | Verify email → log in            | Lands on `http://localhost:5173/family/onboarding`, not `/family` | Passed |
| 4   | Complete onboarding              | Lands on `http://localhost:5173/family` dashboard                 | Passed |
| 5   | Log out → log back in            | Goes straight to `/family`, no onboarding loop                    | Passed |


---



### R-C — Provider/CareSeeker Retirement


| #   | URL / Action                                       | Expected                                                 | Result                                                                                                                                                                                                    |
| --- | -------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `http://localhost:5173/provider/dashboard`         | Redirects to `http://localhost:5173/login?portal=family` |                                                                                                                                                                                                           |
| 2   | `http://localhost:5173/careseeker/profile`         | Redirects to `http://localhost:5173/login?portal=family` |                                                                                                                                                                                                           |
| 3   | `http://localhost:5173/onboarding`                 | Redirects to `http://localhost:5173/family/onboarding`   | passed, took me to [http://localhost:5173/login?portal=family](http://localhost:5173/login?portal=family) since i was not logged in. After logging in i tried /onboardingly, took me to the correct path. |
| 4   | API: register with `role: "provider"` (curl below) | 422 error response                                       | Passed, got this{"message":"Invalid role for self-registration. Contact an administrator for staff accounts."}%                                                                                          |


```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","firstName":"Test","lastName":"User","role":"provider","consentAccepted":true}'
```

---



### R-A — Coordinator Assignment

**Backend**


| #   | URL / Action                                                                                      | Expected                                       | Result |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------ |
| 1   | `GET http://localhost:5001/api/episodes/coordinators` (with auth token)                           | Returns list of `care_coordinator` users       |        |
| 2   | `PATCH http://localhost:5001/api/episodes/<id>/assign-coordinator` with `{"coordinatorId":"..."}` | Returns updated episode with new coordinatorId |        |


```bash
# List coordinators
curl -H "Authorization: Bearer <token>" http://localhost:5001/api/episodes/coordinators

# Assign coordinator
curl -X PATCH http://localhost:5001/api/episodes/<episode-id>/assign-coordinator \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"coordinatorId":"<coordinator-user-id>"}'
```

**Intake Queue picker**


| #   | URL / Action                                                         | Expected                                    | Result |
| --- | -------------------------------------------------------------------- | ------------------------------------------- | ------ |
| 1   | `http://localhost:5173/coordinator/intake` — open a submitted intake | Intake detail loads                         | Passed |
| 2   | Click "Start review" → scroll to "Structured review"                 | "Assign coordinator" dropdown appears       | Passed |
| 3   | Select coordinator + fill chips + submit                             | Episode created with selected coordinatorId | Passed |


**Episode Detail reassign**


| #   | URL / Action                                             | Expected                                              | Result |
| --- | -------------------------------------------------------- | ----------------------------------------------------- | ------ |
| 1   | `http://localhost:5173/coordinator/episodes/<episodeId>` | Page loads, Lifecycle card visible                    | Passed |
| 2   | Scroll to bottom of Lifecycle card                       | "Assigned coordinator" name shown + reassign dropdown | Passed |
| 3   | Pick different coordinator → click "Reassign"            | Name updates without page reload                      | Passed |


> **Route sanity:** `GET /api/episodes/coordinators` must not return 404. Express static segments win over params, so this should be fine — confirm with the curl above.

---



### R-D — UI Improvements

**Mobile sidebar**


| #   | URL / Action                                     | Expected                                              | Result |
| --- | ------------------------------------------------ | ----------------------------------------------------- | ------ |
| 1   | `http://localhost:5173/family` at < 1024px width | Hamburger icon visible in header                      | Passed |
| 2   | Click hamburger                                  | Sidebar slides in with X button inside sidebar header | Passed |
| 3   | Click X button                                   | Sidebar closes                                        | Passed |
| 4   | Open sidebar → click a nav link                  | Sidebar closes automatically                          | Passed |


**Breadcrumbs**


| #   | URL                                                             | Expected breadcrumb                         | Result |
| --- | --------------------------------------------------------------- | ------------------------------------------- | ------ |
| 1   | `http://localhost:5173/coordinator/patients/:unitId`            | `Care Units › [Unit Name]`                  | Passed |
| 2   | `http://localhost:5173/coordinator/patients/:unitId/:patientId` | `Care Units › [Unit Name] › [Patient Name]` | Passed |
| 3   | `http://localhost:5173/coordinator/episodes/:episodeId`         | `Episodes › [Episode Title]`                | Passed |
| 4   | `http://localhost:5173/family/care-unit/:unitId`                | `Home › [Unit Name]`                        | Passed |
| 5   | Click first breadcrumb on any page                              | Navigates back correctly                    | Passed |


---



### Quick Smoke Test


| #   | URL                                        | Expected                       | Result |
| --- | ------------------------------------------ | ------------------------------ | ------ |
| 1   | `http://localhost:5173/family`             | Family dashboard loads         |        |
| 2   | `http://localhost:5173/coordinator/intake` | Coordinator intake queue loads |        |
| 3   | `http://localhost:5173/admin/dashboard`    | Admin dashboard loads          |        |


---



## Commit Log


| Commit                         | Hash      | What                                                                                 |
| ------------------------------ | --------- | ------------------------------------------------------------------------------------ |
| HIPAA M2 compliance fixes      | `d4980d1` | Previous work — not part of Ahmed revision                                           |
| Ahmed M2 revisions             | `c2a074d` | R-A coordinator assignment, R-B onboarding bug fix, R-C route retirement, R-D UI   |
| Rename docs                    | `ea27627` | AHMED_REVISION_PLAN → M2_REVISION_PLAN, AHMED_REVISION_PROGRESS → M2_REVISION_PROGRESS |
| Karim re-audit fixes           | `pending` | Security/GDPR/HIPAA findings from GDPR_Security_ReTest_ea27627.md                  |


---



## Key File Map (for Cursor)

```
mern/
├── server/src/
│   ├── controllers/
│   │   ├── auth/RegistrationController.ts     — R-C: remove provider/client from allowlist
│   │   ├── patients/CareEpisodeController.ts  — R-A: coordinators() + coordinatorId in update
│   │   └── patients/IntakeController.ts        — R-A: coordinator picker in review
│   └── routes/
│       └── episode.routes.ts                  — R-A: GET /episodes/coordinators
├── client/src/
│   ├── pages/public/RegisterPage.tsx           — R-B: post-reg redirect, remove provider card
│   ├── layouts/HealthRoleLayout.tsx            — R-B: onboarding guard + R-D: mobile sidebar
│   ├── pages/coordinator/
│   │   └── CoordinatorIntakeQueuePage.tsx      — R-A: coordinator picker in intake review
│   ├── pages/care/
│   │   ├── EpisodeDetailPage.tsx               — R-A: show/reassign coordinator + R-D breadcrumb
│   │   ├── EpisodeListPage.tsx                 — R-D: spacing
│   │   ├── CareUnitDetailPage.tsx              — R-D: breadcrumb
│   │   ├── CarePatientDetailPage.tsx           — R-D: breadcrumb
│   │   └── AssessmentSchedulePage.tsx          — R-D: mobile layout
│   ├── lib/api/episodes.ts                     — R-A: getCoordinators, assignCoordinator
│   ├── components/ui/Breadcrumb.tsx            — R-D: new shared component
│   └── routes/index.tsx                        — R-C: redirect /provider/* /careseeker/*
```

---



## What Is NOT in This Revision

- R-C Phase 2 (data migration of existing provider/client users) — M3
- R-C Phase 3 (schema UserRole enum cleanup) — M3
- R-D Tracks 3–4 (full page-by-page audit, 375px responsiveness) — ongoing M3
- Anything touching care plans, clinical notes, sessions, support worker tasks — M3 features

