# M5 Mobile — Later role portals (post–family parity)

**Source of truth:** `mern/client` role shells in [`proposalRoleShells.ts`](../client/src/config/proposalRoleShells.ts) + routes in [`ProposalRoleRoutes.tsx`](../client/src/routes/ProposalRoleRoutes.tsx).

Family portal parity is Phase A–D of the mirror plan. Remaining roles use the **same rule**: open the web page + API module first; port behavior to Expo; never invent fictional Phase 2 APIs when they conflict with `mern/client`.

## Suggested phase order

| Phase | Shell | Web base | Mobile group | Priority pages |
|-------|--------|----------|--------------|----------------|
| E | Admin / super | `/admin` | `(admin)/` | **Started** — drawer shell + dashboard + users/families/orgs/providers/staff/bookings/audit; denser modules placeholder |
| F | Coordinator | `/coordinator` | `(coordinator)/` | Intake queue/detail (exists), patients, episodes, plans, schedule |
| G | Clinical | `/clinical` | `(staff)/` clinical branch | Schedule, patients/episodes, session notes, care plans, profile |
| H | Support worker | `/support` | `(staff)/` support branch | Dashboard, shifts, tasks, notes placeholder, profile |
| I | Org admin | `/org` | `(org)/` | Families, coordinators, staff, pending requests |

## Existing mobile that may already be close

- Coordinator intake queue + detail (Phase 2 Task 8)
- Staff shift GPS + schedule (Phase 2 Tasks 6–7)
- Shared profile + notifications

**Action when starting Phase E+:** diff each screen against the matching `mern/client` page; rewrite mismatches the same way family onboarding was rewritten.

## Do not use as source of truth

- Root `frontend/` (Next.js legacy)
- `FamilyClinicalOnboardingPage` (unused on web)
- Fictional `/api/family/*` paths from old M5 Phase 2 drafts
