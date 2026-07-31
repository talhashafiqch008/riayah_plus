# Org / family / coordinator onboarding — status

**Plan:** Org onboarding assigned-only intake  
**Updated:** 2026-07-30  
**Verdict:** **Complete and manually tested** (end-to-end smoke passed).

Related docs: [`ORG_FLOW_GAPS.md`](./ORG_FLOW_GAPS.md), [`../flow.md`](../flow.md)

---

## Done (by plan phase)

### Phase A — Schema and seed
- [x] `org_admin` on `UserRole` (`schema.prisma` + migration)
- [x] `User.assignedCoordinatorId` (family → primary coordinator)
- [x] `User.mustSetPassword` + invite placeholder password + invite token helper
- [x] Seeded demo org admin: `orgadmin@riayahplus.com` / `Password123!`
- [x] Demo family seeded with org + assigned coordinator

### Phase B — Admin creates org → magic link
- [x] `createOrganization` requires admin email (+ optional `adminName`); creates `org_admin` + invite email
- [x] `POST /admin/organizations/:id/resend-invite` (API)
- [x] Admin Organizations form: admin name + invite email fields

### Phase C — Family login gate + Admin Families
- [x] Registration still leaves `organizationId: null`
- [x] Login rejects `family` / `patient` with null org (403 awaiting assignment)
- [x] Login rejects users with `mustSetPassword` until password is set
- [x] `GET /admin/families`, `PATCH /admin/families/:id/organization` (+ care unit / intake backfill)
- [x] Admin **Families** page + nav (+ refresh; Unassigned only = unassigned / all)
- [x] Email when family is assigned to an org (link → `/login?portal=family`)

### Phase D — Org shell + set-password
- [x] `/org` shell in `proposalRoleShells` (Dashboard, Pending, Families, Coordinators)
- [x] Shared `/set-password` page; post-success → role portal login (`/login?portal=org` or `coordinator`)
- [x] `org_admin` tenant-scoped to own `organizationId` on org APIs

### Phase E — Org creates coordinators
- [x] `GET/POST/PATCH /api/org/coordinators` + resend-invite
- [x] Org Coordinators UI (list / invite / deactivate / resend / refresh)

### Phase F — Org families + assign coordinator
- [x] `GET /api/org/families`, `PATCH /api/org/families/:id/coordinator`
- [x] Org Families UI with coordinator picker (+ refresh)
- [x] Care unit / intake create inherits family org; null org → 422
- [x] Email to coordinator when assigned to a family

### Phase G — Split queues
- [x] `GET /api/org/pending-intakes` + Org Pending requests UI (assign coordinator + refresh)
- [x] Coordinator intake queue filtered to `assignedCoordinatorId === current user`
- [x] Episode create prefers family’s assigned coordinator
- [x] Coordinator cannot show/review intake assigned to someone else
- [x] Coordinator UI: no assign/reassign-coordinator dropdowns (org owns assignment)

### Docs / smoke
- [x] `ORG_FLOW_GAPS.md` + `flow.md` updated
- [x] **Manual smoke verified** (2026-07-30)

---

## Remaining (non-blocking polish)

- [ ] **Admin Organizations UI:** “Resend invite” button — API exists; UI not wired yet
- [ ] **Org Dashboard `/org`:** live stats from `GET /org/dashboard` (shell still shows `—`)
- [ ] Clinic / department assignment (Gap 5) — out of this plan
- [ ] Sidebar nav badges (Admin / Org / Coord) — shipped; keep an eye on during M3 testing

---

## Demo accounts

| Role | Email | Path |
|------|-------|------|
| Org Admin | `orgadmin@riayahplus.com` | `/org` |
| Coordinator | `coordinator@riayahplus.com` | `/coordinator` |
| Family | `family@demo.com` | `/family` |
| Family B | `family.b@demo.com` | `/family` |

Password: `Password123!`
