# Ahmed Revision — Progress Tracker

**Branch:** `milestone2-revisions`  
**Source brief:** `AHMED_REVISION_PLAN.md`  
**Last updated:** 2026-07-23  

> This file is the handoff doc. If the session ends, the next developer (Cursor or otherwise) should read this, check the current git status, and continue from the first 🔄 item.

---

## Cursor Handoff Instructions

**Read this first before touching any code.**

### What this project is

MERN stack health/care platform. Working directory is `mern/`. Server is Express + Prisma (PostgreSQL). Client is React + Vite + TypeScript + Tailwind.

- Server runs on `http://localhost:5001`
- Client runs on `http://localhost:5173`
- Branch: `milestone2-revisions`
- Nothing has been committed yet — all changes are unstaged working tree edits



### What has been implemented (all ✅ in the tables below)

All four of Ahmed's revision items (R-A, R-B, R-C, R-D) are fully coded. See the step tables below for the exact files changed.

### Current status: testing in progress

The user is going through the Testing Guide section below. Tests R-B 4 and 5 failed — a bug was found and fixed. Everything else has not been tested yet.

### The bug that was found and fixed (do NOT revert)

**File:** `mern/client/src/pages/careseeker/OnboardingPage.tsx`

**Problem:** When a `family` user completes the onboarding wizard, `handleSubmit` called `submitFamilyIntake()` (creates care unit + intake) but never called `completeClientOnboarding()`. So the backend `user.onboardingStatus` stayed `'pending'`. The `HealthRoleLayout` guard saw `'pending'` and bounced the user back to `/family/onboarding` in a loop.

**Fix applied:**

```typescript
// In handleSubmit(), inside the isFamily branch:
await submitFamilyIntake();
await completeClientOnboarding({});  // ← added: marks onboardingStatus = 'complete' on backend
await refreshUser();                  // ← added: refreshes AuthContext so guard sees 'complete'
localStorage.removeItem(draftKey);
setStep(OnboardingStep.COMPLETE);
```

Also added `refreshUser` to the `useAuth()` destructure on line ~113.

### What Cursor needs to do next

1. **Re-test R-B steps 4 and 5** with a fresh account at `http://localhost:5173/register`
2. **Continue testing** the remaining items in the Testing Guide (R-C, R-A, R-D)
3. Fill in the Result column as you test each item
4. Once all tests pass, **commit all changes** in one commit with message: `feat: Ahmed M2 revisions — coordinator assignment, family onboarding, role retirement, UI improvements`
5. Push to `origin/milestone2-revisions`
6. Update the Commit Log table at the bottom of this file with the actual hash



### Key files changed in this session (for git staging)

```
mern/server/src/controllers/patients/CareEpisodeController.ts
mern/server/src/controllers/patients/IntakeController.ts
mern/server/src/controllers/auth/RegistrationController.ts
mern/server/src/routes/episode.routes.ts
mern/client/src/lib/api/episodes.ts
mern/client/src/lib/api/intake.ts
mern/client/src/pages/careseeker/OnboardingPage.tsx          ← bug fix
mern/client/src/pages/public/RegisterPage.tsx
mern/client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx
mern/client/src/pages/care/EpisodeDetailPage.tsx
mern/client/src/pages/care/CareUnitDetailPage.tsx
mern/client/src/pages/care/CarePatientDetailPage.tsx
mern/client/src/layouts/HealthRoleLayout.tsx
mern/client/src/components/ui/Breadcrumb.tsx                 ← new file
mern/client/src/routes/index.tsx
mern/docx/AHMED_REVISION_PROGRESS.md
mern/docx/AHMED_REVISION_PLAN.md
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


| Commit                    | Hash      | What                                                  |
| ------------------------- | --------- | ----------------------------------------------------- |
| HIPAA M2 compliance fixes | `d4980d1` | Previous work — not part of Ahmed revision            |
| Ahmed R-B + R-C Phase 1   | `pending` | Registration redirect, onboarding guard, role cleanup |
| Ahmed R-A                 | `pending` | Coordinator assignment backend + UI                   |
| Ahmed R-D                 | `pending` | UI improvements                                       |


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

