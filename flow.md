## M3 Handoff

Please use these docs as source of truth:
1. `docx/MILESTONE_THREE.md` — scope/spec
2. `docx/M3_TASK_TRACKER.md` — exact build order + current status
3. `docx/MILESTONE_THREE_TEST.md` — testing / smoke flows (**API curl recipes** + website flows)

### Current verified progress

- Waves 1–4 backend APIs verified (care plans, AI, notes, goals, co-sign, scheduling, delivery)
- **Wave 5 frontend shipped** (placeholders replaced):
  - Coordinator: `/coordinator/plans`, builder, detail+submit, AI draft/summary, `/coordinator/schedule`
  - Family: `/family/care-plans` + review (approve / revision / reject)
  - Clinical: `/clinical/notes`, episode notes, `/clinical/plans/:id` co-sign
  - Support: `/support/shifts`, `/support/tasks`
- **Org onboarding (assigned-only intake):** ✅ **manually verified** (2026-07-30)
  - Admin: `/admin/families` assign org; create org invites `org_admin` via magic link `/set-password`
  - Org portal: `/org` — Families, Coordinators, Pending requests
  - Care requests without a primary coordinator go to **org pending**; after assignment → that coordinator’s intake queue only
  - Family cannot log in until an org is assigned; emails + nav badges + refresh controls shipped
  - See `docx/ORG_FLOW_GAPS.md` / `docx/ORG_ONBOARDING_STATUS.md`

### Servers

- API: `http://localhost:5001`
- Client: `http://localhost:5173`

### Your manual check (website) — resume here (Wave 5 UI smoke)

Org flow is done. Next is **website smoke of Wave 5** (pages shipped; still need pass/fail on UI), then **Wave 6**.

Password for all: `Password123!`

1. Login `coordinator@riayahplus.com` → Care Plans → New plan → submit for approval  
2. Login `family@demo.com` → Care Plans → Approve / Request changes / Reject  
3. Login `clinical@demo.com` → Session Notes + co-sign a plan  
4. Login `support@demo.com` → Start shift → complete task  

Full recipes: `docx/MILESTONE_THREE_TEST.md` (website flows 1–10; then Flow 11 E2E).  
Tracker next coding gate: Wave 6 (`M3-6.1` checklist + `M3-6.2` M2 regression).

### What to do next

1. **Wave 5 website smoke** (steps above) — mark acceptance map items in `M3_TASK_TRACKER.md` / test doc  
2. **Wave 6** — hardening: checklist, M2 regression, AI-down / callback retests  
3. Optional: `M3-3.5` templates

### Execution guidance

- Keep trackers + test doc updated.
- Prefer website smoke for Wave 5; API curls remain in `MILESTONE_THREE_TEST.md` for backend re-runs.
