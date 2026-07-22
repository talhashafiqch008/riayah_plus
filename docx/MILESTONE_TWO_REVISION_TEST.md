# Milestone 2 Revision — Manual Visual Test Guide

Use this document to visually verify **M2 Family Experience revision** work as it ships.

**Last updated:** 2026-07-22 (R1–R6 done · polish logged · R7–R8 optional)  
**Companion tracker:** `MILESTONE_TWO_REVISION.md`  
**Scope audit:** `M2_FAMILY_EXPERIENCE_AUDIT.md`  
**Original M2 clinical tests:** `MILESTONE_TWO_TEST.md` (still valid for staff flows)  
**Handoffs:** `CHAT_CONTEXT_FAMILY_ONBOARDING_R3.md` · `CHAT_CONTEXT_M2_POLISH_2026-07-21.md`

> **Client decision:** `/family/onboarding` must show the **same careseeker 6-step UI**, not the clinical 8-step wizard. Backend intake → coordinator remains.

---

## How This Doc Is Maintained

> **Rule:** When a task in `MILESTONE_TWO_REVISION.md` moves to **Done**, expand the matching flow below from `NOT READY` → full click-through steps.

| Revision item (tracker) | Test flow below | Status |
|---|---|---|
| R1 Family language rename | **Flow R1** | ✅ READY |
| R2 Hide internal IDs / statuses | **Flow R2** | ✅ READY |
| R3 **Replace** family wizard with careseeker 6-step | **Flow R3** | ✅ READY |
| R4 Family dashboard cleanup | **Flow R4** | ✅ READY |
| R5 Care Journey milestones | **Flow R5** | ✅ READY |
| R6 Coordinator next-action polish | **Flow R6** | ✅ READY |
| R7 Talk to Us | **Flow R7** | ⏳ NOT READY |
| R8 Role blurbs | **Flow R8** | ⏳ NOT READY |
| Regression — staff M2 path still works | **Flow REG** | ✅ READY (existing M2) |

**Ready to test today:** Flow REG + **Flows R1–R6**.

---

## What This Revision Changes

| Area | Before (M2 clinical demo) | After (revision target) |
|---|---|---|
| Family onboarding | 8-step clinical wizard at `/family/onboarding` | **Same careseeker 6-step UI** at `/family/onboarding` → M2 intake |
| Family language | Episode / Assessment | Care Journey / Consultation |
| Family visibility | Internal IDs / raw statuses possible | Simple milestones only |
| Family dashboard | Shell + some clinical-like labels | Clean family-only sections |
| Staff portal | Full clinical power | Keep power + clearer next actions |

---

## 1. Prerequisites

```bash
# Terminal 1 — API
cd server && npm run dev          # http://localhost:5001

# Terminal 2 — Client
cd client && npm run dev          # http://localhost:5173
```

Health: http://localhost:5001/api/health

All passwords: **`Password123!`**

| Role | Email | Path |
|---|---|---|
| Family | `family@demo.com` or `family2@demo.com` | `/family` |
| Coordinator | `coordinator@riayahplus.com` | `/coordinator/intake` |
| Clinical | `clinical@demo.com` | `/clinical/schedule` |

---

## 2. Visual Test Flows

### Flow REG — Existing M2 staff path still works ✅ READY

> Run this after every revision change to confirm we did not break clinical M2.

**Goal:** Coordinator + clinical path still works.

1. Login `coordinator@riayahplus.com` → `/coordinator/intake`  
2. Open a Submitted intake (or create via family path)  
3. Structured review → episode / care journey created  
4. Open episode → schedule assessment / consultation for `clinical@demo.com`  
5. Login `clinical@demo.com` → `/clinical/schedule` → complete with findings + recommendations  

**Pass if:** No 500s; review still requires guided chips; assessment complete still requires findings.

---

### Flow R1 — Family language rename ✅ READY

> Family nav and family pages use Care Journey / Consultation wording.

**Goal:** Families see simple language; staff can keep clinical terms.

1. Login `family@demo.com` → `/family`  
2. Check sidebar / page titles:  
   - Prefer **Care Journey** (not “Episodes”)  
   - Prefer **Appointments** or **Consultations** (not raw “Assessments” if shown to family)  
3. Open Care Journey list/detail — headings use family language  
4. Open Appointments (`/family/bookings`) — title says Appointments; statuses say Consultation booked/completed  
5. Login coordinator — staff screens may still say Episode / Assessment  

**Pass if:** Family UI uses the language map; staff clinical terms remain clear.

---

### Flow R2 — Hide internal IDs / statuses ✅ READY

> Family screens hide episode IDs and raw status codes.

**Goal:** No hospital-system noise for families.

1. Login family → open Care Journey / request status  
2. Confirm you do **not** see:
   - Long Care Episode IDs as primary UI
   - Raw values like `under_review`, `episode_created`
   - Diagnoses / medical history / meds on family care-journey detail
3. Confirm you **do** see simple wording, for example:
   - Request received
   - Care team reviewing
   - Care journey started
   - Consultation booked / completed  

**Pass if:** Family can understand status without knowing internal workflow codes.

---

### Flow R3 — Replace family onboarding with careseeker 6-step UX ✅ READY

> **Shipped:** `/family/onboarding` shows careseeker steps (not clinical ICD wizard) and Finish creates M2 intake.

**Goal:** Family uses the **same** Location → Support → Preferences → Schedule → Account → Confirm screens as careseeker. System creates intake for coordinator. Clinical 8-step wizard is **not** what family sees.

**Reference UX:** `client/src/pages/careseeker/OnboardingPage.tsx`  
**Path under test:** http://localhost:5173/family/onboarding  

1. Login `family@demo.com` → `/family` → open **Onboarding** (or go directly to `/family/onboarding`)  
2. **Confirm UI:** progress shows LOCATION / SUPPORT / PREFERENCES / SCHEDULE / ACCOUNT / CONFIRM — **not** clinical steps (history / meds / ICD / urgency)  
3. **Location:** Select country + language; select **Family Guardian**  
4. Confirm Family Guardian card shows short role expectations  
5. **Support:** Select categories; if Qatar (or non-AU), **NDIS block is hidden**; if Australia, NDIS options show brief role help  
6. **Preferences:** Gender / languages / care location still simple  
7. **Schedule:** Frequency + preferred days; Custom Hours simplified if enhanced  
8. **Account:** Shows signed-in / verified state (role clarity if shipped)  
9. **Confirm:** Required consents → Finish  
10. Confirmation in plain language (“request received — care team will review”) — **not** intake ID as the hero message  
11. Login coordinator → `/coordinator/intake`  
12. **Expected:** New request appears as Submitted  
13. Coordinator can add/confirm clinical detail if missing, then structured review → episode created  

**Also verify careseeker still works:**

14. Open `/careseeker/onboarding` (marketplace path) — still loads and is usable  

**Negative checks:**

- Submit without required consent → blocked  
- Family does **not** see the old clinical 8-step form as the only/default path  
- NDIS fields do not appear for Qatar/non-AU flows  
- After R3, Flow REG still passes (staff intake → episode → assessment)

**Pass if:** `/family/onboarding` is the careseeker UX; Finish creates coordinator intake; careseeker route unbroken; staff M2 path unbroken.

---

### Flow R4 — Family dashboard cleanup ✅ READY

> Family dashboard/nav shows only useful family sections.

**Goal:** Family Home feels like a care service, not a staff console.

1. Login family → `/family`  
2. Confirm useful sections exist:
   - Home / dashboard with **What you can do** (request, journey, appointments, documents)
   - Care Journey / Appointments in nav (before Care Plans)
   - Documents / Messages placeholders OK
3. Confirm **Coming later** lists Care Plans + Messages (not presented as live builders)
4. Confirm family does **not** see:
   - Staff advance-status controls
   - Care Plan builder tools
   - Internal approval workflows  

**Pass if:** Dashboard is family-useful and uncluttered.

---

### Flow R5 — Care Journey milestones ✅ READY

> Family Care Journey shows simple milestone progress.

**Goal:** Family understands where they are in the journey.

1. Have a request that progressed at least to consultation scheduled/completed  
2. Login family → Care Journey detail  
3. Confirm a simple milestone list is visible:
   - Request received
   - Care team reviewing
   - Care journey started
   - Consultation booked
   - Consultation completed
   - Care plan ready (**Coming soon** / locked)  
4. Confirm staff coordinator episode detail still shows Lifecycle + advance controls  

**Pass if:** Milestones match real progress and are understandable without training.

---

### Flow R6 — Coordinator next-action polish ✅ READY

> Intake queue / detail shows clearer next actions.

**Goal:** Coordinator still owns clinical power, with clearer next steps.

1. Login coordinator → `/coordinator/intake`  
2. Open a new family request  
3. Confirm **Next actions** card shows relevant items, for example:
   - Review new request
   - Request missing documents
   - Schedule consultation (after episode exists)
   - Escalate urgency  
4. Try escalate → urgency badge rises; try request docs → family notified  
5. After structured review → **Schedule consultation** opens episode (coordinator can book)  
6. Complete structured review → journey/episode created  

**Pass if:** Actions are understandable; structured review still required (not free-text-only).

---

### Flow R7 — Talk to Us ⏳ NOT READY

> **Unlock when:** Help / Talk to Us entry exists for family.

**Goal:** Family can ask for help without knowing which service to pick.

1. Login family  
2. Open **Talk to Us** / Need help  
3. Describe situation (+ optional upload)  
4. Submit  
5. Confirm coordinator can see follow-up item / note / queue flag  

**Pass if:** Request reaches care coordination; family gets confirmation.

---

### Flow R8 — Role blurbs ⏳ NOT READY

> **Unlock when:** Short role descriptions appear in staff portals.

**Goal:** Clearer role expectations without building new modules.

1. Login coordinator → dashboard or about/help area  
2. Confirm short blurb: coordinator owns the care journey  
3. Login clinical → confirm clinical decision-making blurb  
4. Optional: family help text explains “request care / stay informed”  

**Pass if:** Role copy is visible and matches `Family Experience.pdf` intent.

---

## 3. End-to-End Revision Happy Path

Run this full story for client re-demo once R1–R5 (and ideally R3) are Done:

| Step | Actor | Action | Expected |
|---|---|---|---|
| 1 | Family | `/family/onboarding` = careseeker 6-step + consent | Confirmation: request received; intake in queue |
| 2 | Coordinator | Queue → review → complete clinical detail if needed | Structured review succeeds |
| 3 | System | Journey/episode created | Family milestone updates |
| 4 | Coordinator | Schedule consultation | Family sees Consultation booked |
| 5 | Clinical | Complete consultation findings | Family sees Consultation completed |
| 6 | Family | Open Care Journey + Appointments + Documents | Simple language, no IDs/raw statuses |

**Overall pass if:** Family path feels simple; staff path still has full M2 clinical control.

---

## 4. What You Should See vs Not Yet

| Feature | Revision target | Not in this revision |
|---|---|---|
| Family language map | ✅ | |
| Hide IDs / raw statuses | ✅ | |
| Family onboarding = careseeker 6-step at `/family/onboarding` | ✅ | |
| Care Journey milestones | ✅ | |
| Talk to Us | Optional P2 | Full messaging hub (M4) |
| Care Plan Ready milestone | Locked / coming soon OK | Full builder + approval (M3) |
| Self-book from live availability | | M3 scheduling engine |
| Telehealth join | | M4 |
| Payments / quotations | | M4 |
| AI care-plan draft | | Excluded / later |

---

## 5. Troubleshooting

| Problem | Fix |
|---|---|
| Family still sees “Episode” everywhere | R1 not done / cache hard refresh |
| Family sees `under_review` | R2 status map missing on that screen |
| Still see clinical 8-step (history/ICD) at `/family/onboarding` | R3 not shipped; do not demo as “done” |
| Careseeker `/careseeker/onboarding` broken after family swap | Shared components must keep careseeker variant working |
| Coordinator queue empty after family Finish | Check `submitIntake` mapping + consent flags |
| Assessment complete fails | Still needs findings + recommendations (unchanged M2 rule) |
| Confused by AI demo routes | Do not use `/demo/coordinator/*` |

---

## 6. Suggested Test Order

### Ready now (~20 min)

1. Flow R1  
2. Flow R2  
3. Flow R3  
4. Flow R4  
5. Flow R5  
6. Flow R6  
7. Flow REG  

### Optional P2

1. Flow R7  
2. Flow R8  

---

## 7. Pass / Fail Log

| # | Flow | Ready? | Pass | Fail | Notes |
|---|---|---|---|---|---|
| REG | Staff M2 regression | ✅ | | | |
| R1 | Family language | ✅ | | | |
| R2 | Hide IDs / statuses | ✅ | | | |
| R3 | Replace family onboarding with careseeker UX | ✅ | | | |
| R4 | Family dashboard cleanup | ✅ | | | |
| R5 | Care Journey milestones | ✅ | | | |
| R6 | Coordinator polish | ✅ | | | |
| R7 | Talk to Us | ⏳ | | | |
| R8 | Role blurbs | ⏳ | | | |
| E2E | Revision happy path §3 | ⏳ | | | |

---

## 8. Report Back

After each testing session, note:

- Which revision flows passed / failed  
- Screenshots for client (short request, family milestones, coordinator queue)  
- Anything that accidentally pulled M3/M4 scope in  

Then continue the next unchecked item in `MILESTONE_TWO_REVISION.md`.
