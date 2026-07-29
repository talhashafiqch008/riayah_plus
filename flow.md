## M3 Handoff

Please use these docs as source of truth:
1. `docx/MILESTONE_THREE.md` — scope/spec
2. `docx/M3_TASK_TRACKER.md` — exact build order + current status
3. `docx/MILESTONE_THREE_TEST.md` — testing / smoke flows

### Current verified progress

- `M3-0.2` done: `AI_SERVICE_URL` and `AI_SERVICE_API_KEY` added to `server/.env`
- `M3-1.1` done: `ai_intake_summaries` migration already run
- `M3-1.2` done + verified: care plan approve now creates one `Task` per `Goal`
- `M3-1.3` done + verified: `POST /api/care-plans/:id/reject` works
- API smoke already passed for:
  - family approve
  - family reject
  - goal -> task creation on approve
- Seed/demo login issue fixed: demo users now seed with both `isEmailVerified` + `emailVerifiedAt`

### Important notes

- Fresh seed may have no family-visible care plans by default
- If needed, first create an episode for the demo family, then create + submit a care plan before testing family actions

### What to do next

1. `M3-1.4` — re-approval gate when editing an active care plan
2. `M3-2.1` — build Riayah AI client
3. `M3-2.2` — hook intake summarize into `IntakeController.review` (non-blocking)
4. `M3-2.3` — add idempotent `POST /ai/callbacks/care-plan-draft`

### Execution guidance

- Do not start frontend yet.
- Backend Wave 1 + Wave 2 should be pushed further first.
- Keep `M3_TASK_TRACKER.md` and `MILESTONE_THREE_TEST.md` updated as tasks are completed and verified.
