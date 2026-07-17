# M2 Schema Design — Care Unit / Patient / IntakeRecord

**Date:** 2026-07-14  
**Status:** Approved — implemented in `20260714_m2_care_unit_intake`  
**Approved approach:** **B** (recommended)  
**Companion:** `docx/MILESTONE_TWO.md`  
**Plan:** `docs/superpowers/plans/2026-07-14-m2-care-unit-intake-schema.md`

---

## 1. Goal

Lock a schema so family onboarding, coordinator intake review, Care Episodes, and Assessments share one clear hierarchy that matches the signed proposal — without a risky rename of existing marketplace models.

---

## 2. Domain mapping

| Proposal term | Database model | Notes |
|---|---|---|
| Care Unit | **`CareUnit`** (new) | Family household / care context |
| Patient (clinical person) | **`CareRecipient`** (existing, extended) | Add `careUnitId`; treat as clinical patient in APIs/UI |
| Family account | `User` with `role = family` | Owns Care Units |
| Portal patient login | `User` with `role = patient` | Optional app login; **not** required for every CareRecipient |
| IntakeRecord | **`IntakeRecord`** (new) | Immutable snapshot after submit |
| Care Episode | `CareEpisode` (existing) | Parent for assessments, plans, docs |
| Assessment | `Assessment` (existing) | Must have `episodeId` |

**Hierarchy:**

```
Family User
  └── CareUnit (+ organizationId?, clinicId?)
        └── CareRecipient  (= clinical Patient)
              └── CareEpisode[]
                    ├── IntakeRecord (immutable; status machine)
                    ├── Assessment[]
                    └── Document[]
```

---

## 3. New / changed models

### 3.1 `CareUnit` (new)

| Field | Type | Notes |
|---|---|---|
| `id` | cuid | PK |
| `familyUserId` | String FK → User | Owner (family role) |
| `organizationId` | String? FK → Organization | Set when assigned to org |
| `clinicId` | String? FK → Clinic | Optional branch |
| `name` | String | e.g. "Al-Mansoori Family" |
| `primaryCaregiverName` | String? | Snapshot convenience |
| `primaryCaregiverPhone` | String? | |
| `primaryCaregiverRelation` | String? | |
| `address` | String? | |
| `city` | String? | |
| `country` | String | default `"QA"` |
| `createdAt` / `updatedAt` | DateTime | |
| `deletedAt` | DateTime? | soft delete |

Indexes: `familyUserId`, `organizationId`.

### 3.2 `CareRecipient` (extend)

Add:

| Field | Type | Notes |
|---|---|---|
| `careUnitId` | String? FK → CareUnit | Required for **new** M2 creates; nullable for legacy rows |
| `externalRef` | String? @unique | System patient reference number |
| `pocName` / `pocPhone` | String? | Point of contact |
| `diagnosisCodes` | String[] | ICD-10 / coded entries (prefer over free text) |

Keep existing: `userId` (creating family user), `name`, `dateOfBirth`, `gender`, `relationship`, `medicalInfo`, `notes`.

### 3.3 `CareRecipientRevision` (new — versioned edit history)

| Field | Type | Notes |
|---|---|---|
| `id` | cuid | |
| `careRecipientId` | FK | |
| `changedById` | FK → User | |
| `snapshot` | Json | Full profile snapshot after change |
| `changeSummary` | String? | |
| `createdAt` | DateTime | |

Every profile update writes a revision row (immutable history).

### 3.4 `IntakeRecord` (new)

Immutable after `submitted`. Edits to clinical content are **not** allowed; only status + review fields update via controlled transitions.

| Field | Type | Notes |
|---|---|---|
| `id` | cuid | |
| `careUnitId` | FK → CareUnit | |
| `careRecipientId` | FK → CareRecipient | |
| `familyUserId` | FK → User | Submitter |
| `organizationId` | String? | Tenant scope |
| `careEpisodeId` | String? @unique FK → CareEpisode | Set when episode created |
| `status` | `IntakeStatus` | see §4 |
| `urgencyLevel` | UrgencyLevel? | |
| `reasonForCare` | String | |
| `medicalHistory` | String? | |
| `currentMeds` | String? | |
| `diagnoses` | String[] | **Coded** (ICD-10 / directory codes) |
| `serviceInterests` | ServiceCategory[] | |
| `primaryCaregiverName` | String? | Denormalized from wizard |
| `primaryCaregiverPhone` | String? | |
| `primaryCaregiverRelation` | String? | |
| `wizardPayload` | Json? | Full step snapshot at submit (immutable) |
| `submittedAt` | DateTime | |
| `reviewedAt` | DateTime? | |
| `reviewerId` | String? FK → User | |
| `reviewSummary` | Json? | Structured: keyConcerns, urgencyIndicators, suggestedServiceCategories, riskFlags |
| `createdAt` / `updatedAt` | DateTime | `updatedAt` only for status/review |

**Immutability rule (app layer):** After `submitted`, reject PATCH to clinical content fields. Only `status`, `reviewSummary`, `reviewedAt`, `reviewerId`, `careEpisodeId` may change.

### 3.5 `CareEpisode` (extend, keep legacy fields)

Add:

| Field | Type | Notes |
|---|---|---|
| `careUnitId` | String? FK → CareUnit | |
| `organizationId` | String? | Tenant filter |
| `intakeRecordId` | String? @unique | Back-link optional if 1:1 via IntakeRecord.careEpisodeId only |

Keep existing `patientId` (User) for backward compatibility with current episode API.  
**M2 rule for new episodes:** Prefer `careRecipientId` + `careUnitId`; set `patientId` to family user **or** linked patient portal user when present.

Existing intake-ish columns on episode (`reasonForCare`, `medicalHistory`, …) remain for backward compat; **source of truth for new intakes is `IntakeRecord`**. On episode create from intake, copy summary fields onto episode for convenience.

### 3.6 `Document` (extend)

Add optional:

| Field | Type | Notes |
|---|---|---|
| `intakeRecordId` | String? FK → IntakeRecord | |
| `careUnitId` | String? | |
| `category` | `IntakeDocumentCategory`? | see §4 |

---

## 4. Enums

### `IntakeStatus` (new)

```
submitted
under_review
validated
episode_created
withdrawn   // optional cancel by family before review
```

Proposal mapping:

| Proposal | Enum |
|---|---|
| Submitted | `submitted` |
| Under Review | `under_review` |
| Validated | `validated` |
| Episode Created | `episode_created` |

### `CareEpisodeStatus` (unchanged)

Keep: `intake_submitted | under_review | validated | active | on_hold | closed`.

When intake reaches `episode_created`, episode should be at least `validated` (then `active` when assessment/care starts — M2/M3 boundary).

### Intake state machine (new util)

```
submitted → under_review | withdrawn
under_review → validated | submitted (send back) | withdrawn
validated → episode_created
episode_created → (terminal for intake)
withdrawn → (terminal)
```

### `IntakeDocumentCategory` (new)

```
referral
prior_assessment
insurance
medical_report
consent
other
```

---

## 5. Tenant scoping

- `CareUnit.organizationId`, `IntakeRecord.organizationId`, `CareEpisode.organizationId` support `tenantWhere(req)`.
- Family users may have `organizationId` null until coordinator assigns unit to an org/clinic.
- Coordinators listing intake queue filter by their `organizationId` (STUB-001).

---

## 6. Out of scope for this migration

- Assessment API/UI (model already exists)
- Family wizard / coordinator UI
- Renaming `CareRecipient` table to `patients`
- Removing legacy episode intake fields
- AI intake tables (leave `AiIntakeSummary`; do not build product flows)

---

## 7. Migration plan

1. Add enums `IntakeStatus`, `IntakeDocumentCategory`
2. Create `care_units`, `intake_records`, `care_recipient_revisions`
3. Alter `care_recipients` — add nullable `careUnitId`, `externalRef`, POC fields, `diagnosisCodes`
4. Alter `care_episodes` — add nullable `careUnitId`, `organizationId`
5. Alter `documents` — add nullable `intakeRecordId`, `careUnitId`, `category`
6. Add FK indexes
7. Seed: ensure seed family user gets one demo `CareUnit` + optional recipient (later)

No data backfill required for empty clinical tables in typical local seed.

---

## 8. API surface (next plan — not this migration alone)

| Endpoint | Purpose |
|---|---|
| `POST/GET /care-units` | Family CRUD |
| `POST/GET /care-units/:id/patients` | CareRecipient under unit |
| `POST /intake` (wizard submit) | Create IntakeRecord `submitted` |
| `GET /coordinator/intake-queue` | Filter status/urgency |
| `POST /intake/:id/review` | Structured review + transitions |
| Existing `/episodes` | Create from validated intake |

---

## 9. Success criteria

- [ ] Prisma migrate applies cleanly on local DB
- [ ] Hierarchy docs match proposal language in `MILESTONE_TWO.md`
- [ ] `IntakeRecord` cannot mutate clinical content after submit (enforced in controllers next)
- [ ] `tenantWhere` can filter on `organizationId` for intake/episode lists

---

## 10. Open decisions (defaults chosen)

| Topic | Default |
|---|---|
| Rename CareRecipient → Patient in DB? | **No** — API/UI labels say "Patient" |
| Require CareUnit before intake? | **Yes** for new M2 flows |
| One open intake per recipient? | **Yes** (app rule: block second `submitted`/`under_review`) |
| Episode `patientId` User FK | Keep required for now; set to family user when no patient portal user |

---

## Self-review

- No TBD placeholders for required fields  
- No contradiction with proposal status names (mapped in §4)  
- Scope limited to schema + mapping; UI deferred  
- Approach B only — A/C discarded by user approval
