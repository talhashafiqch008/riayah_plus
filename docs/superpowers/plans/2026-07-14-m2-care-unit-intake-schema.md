# M2 Care Unit / Intake Schema Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `CareUnit`, `IntakeRecord`, `CareRecipientRevision`, and related fields/enums so M2 clinical hierarchy matches Approach B.

**Architecture:** Additive Prisma migration; extend `CareRecipient` / `CareEpisode` / `Document`; add intake status machine in `stateMachine.ts`. No API controllers in this plan (next plan).

**Tech Stack:** Prisma 5 · PostgreSQL · Jest unit tests · Express (unchanged)

**Spec:** `docs/superpowers/specs/2026-07-14-m2-care-unit-intake-schema-design.md`

## Global Constraints

- Do not rename `CareRecipient` table to `patients`
- Keep existing `CareEpisode` intake columns (legacy)
- Episode ↔ Intake link only via `IntakeRecord.careEpisodeId` (no circular `CareEpisode.intakeRecordId`)
- Family users may have null `organizationId` until assigned

## File map

| File | Role |
|---|---|
| `server/prisma/schema.prisma` | Models + enums |
| `server/prisma/migrations/20260714_m2_care_unit_intake/migration.sql` | SQL migration |
| `server/src/utils/stateMachine.ts` | Intake transitions |
| `server/src/tests/unit/stateMachine.test.ts` | Intake transition tests |
| `server/prisma/seed.ts` | Demo CareUnit + CareRecipient for family |
| `docx/MILESTONE_TWO.md` | Mark schema decision Done |
| `docx/MILESTONE_TWO_TEST.md` | Note schema ready |

---

### Task 1: Prisma schema + migration

**Files:**
- Modify: `server/prisma/schema.prisma`
- Create: `server/prisma/migrations/20260714_m2_care_unit_intake/migration.sql`

- [ ] **Step 1: Add enums and models to schema.prisma** (per spec §3–4)
- [ ] **Step 2: Write migration.sql** matching schema
- [ ] **Step 3: Run `npx prisma generate` and `npx prisma migrate deploy` (or migrate dev)**
- [ ] **Step 4: Confirm client exports `CareUnit`, `IntakeRecord`, `IntakeStatus`**

---

### Task 2: Intake state machine + unit tests

**Files:**
- Modify: `server/src/utils/stateMachine.ts`
- Modify: `server/src/tests/unit/stateMachine.test.ts`

- [ ] **Step 1: Add `intake` entity + `assertIntakeTransition`**
- [ ] **Step 2: Add Jest cases for allowed/blocked transitions**
- [ ] **Step 3: Run `npm run test:unit -- --testPathPattern=stateMachine`**

---

### Task 3: Seed demo CareUnit + docs update

**Files:**
- Modify: `server/prisma/seed.ts`
- Modify: `docx/MILESTONE_TWO.md`
- Modify: `docx/MILESTONE_TWO_TEST.md`
- Modify: design status to Approved

- [ ] **Step 1: Seed CareUnit + CareRecipient under `family@demo.com`**
- [ ] **Step 2: Update MILESTONE_TWO status for schema mapping**
- [ ] **Step 3: Add note in MILESTONE_TWO_TEST that schema/migration is ready**

---

## Spec coverage check

| Spec § | Task |
|---|---|
| CareUnit | Task 1 |
| CareRecipient extensions | Task 1 |
| CareRecipientRevision | Task 1 |
| IntakeRecord | Task 1 |
| CareEpisode org/careUnit | Task 1 |
| Document category/links | Task 1 |
| Intake state machine | Task 2 |
| Seed CareUnit | Task 3 |

**Out of this plan:** Care Unit API, intake API, UI wizard (follow-up plan).
