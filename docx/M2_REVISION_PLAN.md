# Ahmed Elsayed Revision — Proposed Plan

**Date:** 2026-07-23  
**Branch:** `milestone2-revisions`  
**Source:** Ahmed's message 2026-07-23  
**Status:** Proposed — awaiting approval before any work starts

---

## Summary of Requests

| # | Request | Complexity | Recommended milestone |
|---|---|---|---|
| R-A | Multiple coordinators per org, coordinator assignment | Medium | M2 revision |
| R-B | Family post-registration → onboarding → dashboard flow | Small | M2 revision |
| R-C | Remove Provider and CareSeeker roles/pages | Large | M3 (planned retirement) |
| R-D | UI improvements — hierarchy, spacing, mobile | Large | M3 (parallel track) |

---

## R-A — Coordinator Assignment

### What exists today

- `CareEpisode.coordinatorId` is a single foreign key. Only one coordinator can own an episode.
- During intake review (`IntakeController.review`), the coordinator who clicks Review is auto-assigned: `coordinatorId: req.user!.userId`. There is no assignment UI.
- During episode creation (`CareEpisodeController.store`), the creating coordinator is auto-assigned.
- The org can already have multiple `care_coordinator` users — there is no limit — but there is no way to reassign an episode from one coordinator to another.

### What is needed

1. **Coordinator list endpoint** — `GET /coordinators` (or scoped to org) returning all `care_coordinator` users in the tenant. Already partially exists via admin user list; needs a dedicated lightweight endpoint.
2. **Assignment on intake review** — when a coordinator completes intake review, allow them to assign the resulting episode to any coordinator in the org (including themselves). If none is picked, default to self.
3. **Reassignment after episode creation** — `PATCH /episodes/:id/assign-coordinator` endpoint (coordinator or admin only) so episodes can be handed off as caseloads change.
4. **Coordinator filter on episode list** — `GET /episodes?coordinatorId=xxx` so each coordinator can see their own caseload separately from the full org list.
5. **UI** — assignment dropdown on the intake review modal and on episode detail (coordinator/admin only). Show assigned coordinator name on episode list rows.

### What is NOT needed (out of scope)

- Multiple coordinators per episode simultaneously (the ask is one-coordinator-per-episode, org can have many coordinators). Do not add a many-to-many `EpisodeCoordinator` join table unless explicitly requested.
- Coordinator workload balancing or auto-assignment logic.

### Schema change

None for the episode model. `coordinatorId` stays as-is. Only the API and UI change.

### Effort

Backend: ~1 day (new endpoint + PATCH route + controller logic).  
Frontend: ~1 day (dropdown component + episode list coordinator column).

---

## R-B — Family Post-Registration → Onboarding → Dashboard Flow

### What exists today

- Registration sets `onboardingStatus: 'pending'` in the DB.
- The registration API response already returns `onboarding_status`.
- `RoleLoginForm` checks `onboarding_status !== 'complete'` on **login** and redirects to the onboarding path if pending.
- There is no explicit redirect to `/family/onboarding` immediately after **registration** completes.
- After the family onboarding wizard finishes (`submitIntake`), it does not explicitly navigate to `/family`.

### What is needed

1. **Post-registration redirect** — after a family user registers and the API returns a token, the client should immediately navigate to `/family/onboarding` rather than `/family`. This is a client-side change in the registration success handler.
2. **Post-onboarding redirect** — when the family wizard calls `submitIntake` successfully (the Confirm step), navigate to `/family` (the dashboard). Confirm this is already in `FamilyOnboardingPage.tsx`; if not, add it.
3. **Guard: onboarding not yet complete** — if a family user with `onboarding_status: 'pending'` navigates to `/family` directly, redirect them to `/family/onboarding`. This prevents dashboard access before care request is submitted. Implement as a check in `HealthRoleLayout` or a dedicated guard wrapper for the family shell.
4. **Mobile note** — these are all routing changes; they apply to both web and future mobile since the API response drives the redirect logic.

### What is NOT needed

- A new onboarding page — it already exists at `/family/onboarding` (the careseeker 6-step UX, shipped in M2 R3).
- Backend changes — `onboardingStatus` field and logic already exist.

### Effort

Small — ~half a day of client-side routing changes across 2–3 files.

---

## R-C — Remove Provider and CareSeeker Roles

### What exists today

The codebase has two parallel user experiences built for a marketplace model:

| Role | Pages | What it does |
|---|---|---|
| `provider` | ~30 pages, 12,938 lines | Job board, bids, marketplace offers, earnings, marketplace shifts |
| `client` / `consumer` (careseeker) | ~38 pages, 16,818 lines | Browse providers, post needs, book sessions, payments |

These were built for M4 (marketplace / consumer-facing platform). They are **not** the same as:

| Role | Pages | What it does |
|---|---|---|
| `clinical_staff` | Care shell | Clinical assessments, session notes, schedule |
| `family` / `patient` | Care shell | Care journey, onboarding, episode view, appointments |

Ahmed's point is correct: in the context of this platform (M1–M3), `provider` duplicates `clinical_staff` and `careseeker/client` duplicates `family/patient`. Users should not be registering as `provider` or `careseeker` — they should register as `family` or be invited as `clinical_staff`.

### Proposed approach

**Phase 1 — Retire routes and registration (M3, low risk)**

- Remove `/provider/*` and `/careseeker/*` route trees from `client/src/routes/index.tsx`.
- Remove `provider` and `client`/`consumer` from the self-registration allowlist in `RegistrationController.ts` (they are currently allowed).
- Hide provider and careseeker login/signup pages.
- Keep the page files on disk temporarily (do not delete) in case UI components are reused.

**Phase 2 — Role mapping for existing users (M3, one-time migration)**

- Any existing `provider` users: migrate role to `clinical_staff`. Their marketplace-specific data (bids, marketplace offers) becomes orphaned but is not deleted — kept for audit purposes.
- Any existing `client`/`consumer` users: migrate role to `family`. Their marketplace bookings are kept; the care coordination flow becomes their primary interface.
- Write a Prisma migration script for this; run in staging first.

**Phase 3 — Schema cleanup (M4 or later)**

- The `Booking`, `ProviderOffer`, `ServiceProvider`, `ClientProfile`, `ProviderProfile` models and their relations remain for now — they are load-bearing for payment/invoice history.
- Do not drop these models until confirmed no financial data depends on them.
- Remove the `provider` and `consumer`/`client` enum values from `UserRole` only after all data is migrated and confirmed.

### What is NOT removed

- The `trainer` role (LMS) — separate system, unrelated.
- Marketplace-adjacent models in the DB — kept for financial/audit record integrity until explicitly decommissioned.
- `client`/`consumer` from RBAC arrays like `requireCareUser` — keep until migration script runs against prod.

### Risk

Medium-high. The `provider` role is referenced across ~50 server files (routes, controllers, RBAC). Removal needs a full grep-and-audit pass before touching anything. Phase 1 (hiding the routes) is safe and reversible; Phase 3 (schema changes) is not.

### Effort

Phase 1: ~1 day.  
Phase 2: ~1 day (migration script + staging verification).  
Phase 3: ~1 day (after full confirmation). Total: ~3 days spread across M3.

---

## R-D — UI Improvements

### Current state

The platform has several distinct visual contexts:

- **Role shells** (`HealthRoleLayout`) — sidebar nav, content area, used by family/coordinator/clinical/support
- **Demo coordinator pages** — richer mock UI, not wired to API
- **Careseeker/provider pages** — marketplace style, separate layout
- **Public pages** — login, onboarding wizard

Pain points from observation:
- Spacing is inconsistent between role shell pages (some tight, some loose).
- Navigation between modules requires returning to the sidebar rather than breadcrumb or in-page links.
- Mobile: the sidebar collapses but page content is not optimised for narrow viewports (tables overflow, form cards don't reflow well).
- Typography scale is mixed — some pages use `text-sm` throughout, others use `text-base`; headings vary.
- Component library is Tailwind utility-first but without a shared token layer, so similar components look slightly different across pages.

### Proposed approach

**Track 1 — Design token layer (1 day setup)**

Add a `client/src/lib/tokens.ts` (or Tailwind theme extension) that defines:
- Spacing scale for page padding, card gaps, section gaps
- Typography scale for page title, section heading, body, label, caption
- Color aliases for status badges (consistent across family + coordinator + clinical pages)

Apply tokens to `HealthRoleLayout`, `RoleShellDashboard`, and the two most-used care pages (`EpisodeDetailPage`, `CoordinatorIntakeQueuePage`) first — this covers most of what the user sees.

**Track 2 — Navigation improvements (1 day)**

- Add breadcrumb to care detail pages (`CareUnitDetailPage`, `EpisodeDetailPage`, `CarePatientDetailPage`) — currently there is no back-nav other than the browser button.
- Add tab persistence — when a user is on Episode Detail and switches to Appointments then back, restore the active tab.
- On mobile, make sidebar a bottom-tab-bar or hamburger drawer (rather than pushing content).

**Track 3 — Page-by-page polish (ongoing, 2–3 days)**

Priority order based on how often pages are seen in a live session:

1. `CoordinatorIntakeQueuePage` — table spacing, card layout for mobile, action button placement
2. `EpisodeDetailPage` — section dividers, milestone sidebar on mobile collapses to accordion
3. `FamilyOnboardingPage` (wizard) — step indicator spacing, confirm screen layout
4. `AssessmentSchedulePage` — calendar/list toggle more prominent
5. `RoleShellDashboard` (per role) — stat card grid reflowing at 320px

**Track 4 — Responsiveness audit (1 day)**

Run each key page at 375px (iPhone SE) and 768px (tablet). Fix overflow, font size, button tap targets. Focus on the family flow (most likely to be used on mobile per Ahmed's note).

### What is NOT in scope for UI work

- A design system / component library rebuild (Radix, shadcn swap-out, etc.) — too disruptive to M3 timeline.
- Dark mode.
- Animation or micro-interactions.
- Provider/careseeker pages (will be retired in R-C).

### Effort

Total UI track: ~5–6 days. Recommend doing Track 1 and Track 2 alongside M3 backend work; Track 3 and 4 as a final polish sprint before M3 demo.

---

## Recommended Build Order

```
M2 revision (current branch — ship soon)
├── R-B  Family post-registration → onboarding → dashboard   ~0.5 day
└── R-A  Coordinator assignment (endpoint + UI dropdown)      ~2 days

M3 (next branch)
├── R-C Phase 1  Hide provider/careseeker routes              ~1 day
├── R-C Phase 2  Role migration script                        ~1 day
├── R-D Track 1  Design token layer                           ~1 day
├── R-D Track 2  Navigation/breadcrumb/mobile sidebar         ~1 day
├── R-D Track 3  Page-by-page polish (alongside M3 features)  ~3 days
├── R-D Track 4  Responsiveness audit                         ~1 day
└── R-C Phase 3  Schema cleanup (end of M3)                   ~1 day
```

---

## Open Questions for Ahmed

1. **Coordinator assignment** — should intake review still auto-assign to the reviewing coordinator if they don't pick someone, or should assignment always be explicit?
2. **Role removal** — are there any existing `provider` or `client`/`consumer` accounts in staging/prod that we need to migrate? Or is the DB clean enough to just remove the routes?
3. **UI help offer** — Ahmed offered help with UI. Do you want to share design files / Figma, or work from written specs? That affects whether we build from our current Tailwind base or adopt a new component set.
4. **Mobile priority** — is the family flow the only mobile-critical path for the next demo, or do coordinator and clinical need mobile treatment too?
