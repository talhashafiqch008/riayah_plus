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

### Servers

- API: `http://localhost:5001`
- Client: `http://localhost:5173`

### Your manual check (website)

1. Login `coordinator@riayahplus.com` → Care Plans → New plan → submit  
2. Login `family@demo.com` → Care Plans → Approve / Request changes / Reject  
3. Login `clinical@demo.com` → Session Notes + co-sign a plan  
4. Login `support@demo.com` → Start shift → complete task  

(Password for all: `Password123!`)

### What to do next

1. Wave 6 hardening — checklist + M2 regression + AI-down / callback retests
2. Optional: `M3-3.5` templates

### Execution guidance

- Keep trackers + test doc updated.
- Prefer website smoke for Wave 5; API curls remain in `MILESTONE_THREE_TEST.md` for backend re-runs.
