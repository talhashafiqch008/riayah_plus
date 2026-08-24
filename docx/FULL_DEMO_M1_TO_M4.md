# Riayah Plus — Full Client Demo (Milestone 1 → 4)

**App:** `http://localhost:5173` · **API:** `http://localhost:5001`  
**Password (all accounts):** `Password123!`  
**Estimated time:** 60–90 minutes (can shorten by skipping optional bits)  
**Purpose:** One continuous patient journey that proves M1 foundation → M2 intake → M3 care plan/delivery → M4 telehealth + billing.

---

## What You Are Proving (Say This First)


| Milestone | What to say in one sentence                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------ |
| **M1**    | Secure login, role-based portals, org hierarchy, and audit foundation.                                       |
| **M2**    | Family clinical onboarding → coordinator intake queue → care episode.                                        |
| **M3**    | Care plan builder, family approval, scheduling, clinical notes.                                              |
| **M4**    | QAR quotation/invoice, PayTabs pay, LiveKit telehealth + recording, messaging, admin pricing/reconciliation. |


> “Today we walk one real care journey end to end — from login to paid invoice — across every role.”

---



## Demo Accounts (Use These)


| Role        | Email                        | Portal URL             |
| ----------- | ---------------------------- | ---------------------- |
| Admin       | `admin@riayahplus.com`       | `/admin`               |
| Org Admin   | `org@mailinator.com`         | org portal / admin-org |
| Family      | `family@mailinator.com`      | `/family`              |
| Coordinator | `coordinator@mailinator.com` | `/coordinator`         |
| Clinical    | `clinical@mailinator.com`    | `/clinical`            |
| Support     | `staff@mailinator.com`       | `/support`             |


Use **2 browsers** (or 1 normal + 1 incognito):

- Browser A → Family  
- Browser B → Coordinator / Clinical / Admin (switch roles as needed)

---



## Part 0 — Before the Demo (Do This First)



### 0.1 Clear Milestone demo data (keep users)

```bash
cd server

# Preview what will be deleted
npx ts-node scripts/clear-mailinator-m4-demo-data.ts

# Actually delete
npx ts-node scripts/clear-mailinator-m4-demo-data.ts --mode apply
```

This clears care units, intakes, episodes, care plans, sessions, invoices, payments, messages, notifications for `@mailinator.com` users. **Accounts stay.**

Optional — if a draft care plan is stuck:

```bash
npx ts-node scripts/delete-draft-care-plans.ts
```



### 0.2 Start 3 terminals

```bash
# Terminal 1 — API
cd server && pnpm dev

# Terminal 2 — Client (network + HTTPS for camera on phones)
cd client && pnpm dev

# Terminal 3 — ngrok (PayTabs webhooks)
cd server && ./scripts/paytabs-ngrok.sh
```



### 0.3 Wire ngrok into `.env`

1. Copy the ngrok HTTPS URL from Terminal 3, e.g.
  `https://xxxx.ngrok-free.app`
2. Open `server/.env` and set:

```env
BACKEND_URL=https://xxxx.ngrok-free.app
FRONTEND_URL=http://localhost:5173
```

1. **Restart Terminal 1** (API) after changing `.env`.



### 0.4 Confirm critical env keys (already should be set)

```env
# LiveKit (telehealth video + recording)
LIVEKIT_URL=wss://...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...

# AWS S3 (recording storage) — must be a real bucket
AWS_BUCKET=licensecompanion
AWS_DEFAULT_REGION=us-west-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# PayTabs sandbox
PAYTABS_PROFILE_ID=...
PAYTABS_SERVER_KEY=...
```



### 0.5 Pre-demo checklist

```
☐ DB cleared with clear script
☐ API running on :5001
☐ Client running on :5173 (or https://192.168.x.x:5173 for LAN)
☐ ngrok online
☐ BACKEND_URL = current ngrok HTTPS URL
☐ API restarted after .env change
☐ All tabs logged out / fresh windows
☐ PayTabs test card ready: 4111 1111 1111 1111
☐ Two browsers ready (Family + Staff)
```

---



# DEMO SCRIPT

---



## PART A — Milestone 1: Foundation (5–8 min)

**Goal:** Show auth + role shells + admin org foundation.

### A1 — Login & role shells

1. Open `http://localhost:5173/login`
2. Login as **Family** → land on `/family`
  Point at sidebar: Care, Billing, Telehealth, Messages, etc.
3. Logout → login as **Coordinator** → `/coordinator`
4. Logout → login as **Clinical** → `/clinical`
5. Logout → login as **Admin** → `/admin`

**Say:**

> “Milestone 1 delivered authentication, role-based portals, and a secure API. Each role only sees what they are allowed to see.”



### A2 — Admin org hierarchy (quick)

1. Stay as `admin@riayahplus.com`
2. Open **Organizations** (`/admin/organizations` or similar)
3. Show org → clinics → departments structure

**Say:**

> “The platform is multi-org ready. Care data sits under an organization hierarchy.”



### A3 — Optional: audit / security one-liner

> “Mutating API calls are audited. Sessions use httpOnly cookies with short-lived access tokens.”

**Do not spend time on password reset / 2FA unless the client asks.**

---



## PART B — Milestone 2: Intake → Episode (10–15 min)

**Goal:** Family submits clinical intake; coordinator validates; episode is created.

### B1 — Family clinical onboarding / care request

**Login:** `family@mailinator.com`  
**Go to:** `/family` → **Request Care** / **Onboarding** / **Clinical onboarding**

Walk the intake (fill real demo values):

1. Care unit / household
2. Patient profile (e.g. **Muhammad Ahsan**)
3. Primary caregiver
4. Reason for care: `Post-surgery physiotherapy and home support`
5. Medical history / meds (short)
6. Urgency: Medium or High
7. Service interests: Physiotherapy / Nursing
8. Documents (optional PDF) + **Privacy + Treatment consent** (required)

Submit.

**Say:**

> “The family completes a structured clinical intake with mandatory consent. No phone handoff — it lands in the coordinator queue.”

**Pass:** Success / intake submitted.

> If the app says an open intake already exists: clear DB again, or open the existing submitted intake as coordinator and continue.



### B2 — Coordinator intake queue → Validate → Episode

**Login:** `coordinator@mailinator.com`  
**Go to:** `/coordinator/intake-queue` (or **Intake Queue**)

1. Open the family’s intake
2. Review reason, urgency, documents
3. Tick **"Create care episode on validate"** ✅
4. Optional episode title: `Physiotherapy – Muhammad Ahsan`
5. Click **Validate** / **Approve Intake**

**Important:** There is **no separate “Create Episode” button**. Validating with the checkbox **creates the episode automatically**.

1. Click **Open episode** / **Linked episode** when it appears

**Say:**

> “The coordinator performs a structured review. Validating the intake creates the care episode — the clinical journey record for this patient.”

**Pass:** Episode exists and is linked to the intake.

---



## PART C — Milestone 3: Care Plan + Delivery Context (10–15 min)

**Goal:** Build plan, submit for approval, show scheduling capability.

### C1 — Build care plan

**Login:** `coordinator@mailinator.com`  
**Go to:** `/coordinator/care-plans`

1. Under **“Choose an episode to build a plan”**, click the episode you just created
2. Opens **Care Plan Builder**
3. Add catalog services (e.g. Physiotherapy Session, Home Nursing)
4. Show that **prices come from admin catalog** (not free-typed)
5. Add a goal if the UI asks (e.g. “Improve mobility”)
6. Click **Submit for Approval**

**Say:**

> “Milestone 3 care planning: structured services and goals, versioned, submitted to the family for approval. Pricing is catalog-controlled.”

**Pass:** Status = Submitted for Approval · family notified.

### C2 — Family approves care plan (bridges into M4 quotation)

**Login:** `family@mailinator.com`  
**Go to:** notification bell **or** `/family/care-plans`

1. Open the pending care plan
2. Review items
3. Click **Approve**

**Say:**

> “Family approval is a real workflow — Approve, or request changes. Approval unlocks billing documents.”

**Pass:** Plan approved.

> Quotation generation on approve is an **M4** billing feature — show it next.

---



## PART D — Milestone 4: Billing + Telehealth + Pay (30–40 min)



### D1 — Quotation (QAR) + PDF

**Login:** `family@mailinator.com`  
**Go to:** `/family/billing?tab=quotations`

1. Open the new quotation (QUO-…)
2. Show line items, tax (5%), total in **QAR**
3. Click **Download PDF**

**Say:**

> “On care-plan approval the system auto-generates an itemised QAR quotation. Quotations are not payable — the family is charged only after a completed session.”

**Pass:** PDF opens · **no Pay Now** on quotation.

---



### D2 — Book telehealth session

**Login:** `coordinator@mailinator.com`  
**Go to:** `/coordinator/schedule`

Use the **Book session** section (bottom):

1. **Care episode** → select the episode
2. **Assign to staff** → `clinical@mailinator.com`
3. **Session type** → **Telehealth (video call)** ← critical
4. **Start** → today, a few minutes from now
5. Duration 60 · click **Book**

**Say:**

> “Booking telehealth provisions a LiveKit room and notifies family and clinician.”

**Pass:** Session listed with status `accepted`.

---



### D3 — Family waiting room + consent

**Login:** `family@mailinator.com` (Browser A)  
**Go to:** `/family/telehealth`

1. Open the session
2. If consent wall → tick agree → continue
3. You enter the **waiting room** (not the call yet)

**Say:**

> “Telehealth consent is required. The family waits until the clinician admits them.”

**Keep Browser A open on waiting room.**

---



### D4 — Clinical admit + call + note + recording

**Login:** `clinical@mailinator.com` (Browser B)  
**Go to:** `/clinical/telehealth`

1. Open the session
2. Lobby shows family waiting → click **Admit**
3. Both sides join LiveKit video/audio

**If using phone / LAN:** open `https://192.168.x.x:5173` (HTTPS). Plain `http://192.168…` blocks camera/mic.

1. Side panel → care plan / goals / notes
2. Save a session note:
  `Patient demonstrated improved range of motion. Continue home exercises.`



#### Recording (demo this)

1. Click **Start recording**
2. Talk 20–30 seconds
3. Click **Stop recording**
4. You may leave immediately after Stop — upload continues on LiveKit/S3
5. Wait ~1 minute → refresh / reopen session page → **Session recording** video player

**Say:**

> “Clinician admits from the lobby, documents in-session, and can record the visit to secure S3 storage.”

**Pass:** Video plays under Session recording · status **available** (not stuck on stopping forever).

> Completing the session later does **not** delete the recording. “This session cannot be joined” after complete is expected.

---



### D5 — Complete session → Invoice

**Login:** `coordinator@mailinator.com`  
**Go to:** `/coordinator/schedule`

1. Select the same episode
2. Find the session → click **Complete**
3. Confirm

**Say:**

> “Completing the session auto-generates a payable invoice. No manual invoice typing.”

**Pass:** Invoice INV-… status **sent** · family notified.

---



### D6 — Family pays with PayTabs

**Login:** `family@mailinator.com`  
**Go to:** `/family/billing` → **Invoices**

1. Open the sent invoice
2. Click **Pay Now**
3. PayTabs sandbox:


| Field  | Value                     |
| ------ | ------------------------- |
| Card   | `4111 1111 1111 1111`     |
| Expiry | any future (e.g. `12/27`) |
| CVV    | any 3 digits              |


1. Complete payment → return to app
2. Invoice becomes **Paid**

**Say:**

> “PayTabs is the Qatari gateway. Webhooks update the invoice; if IPN is delayed, the app also confirms payment on return.”

**Pass:** Paid · notification · payment in reconciliation later.

> If stuck on **Sent**: ngrok down or `BACKEND_URL` wrong → fix and restart API, then reopen the invoice / billing page.

### Replay Pay Now (without clearing the whole demo)

If the invoice is already **Paid** and you want to show checkout again:

```bash
cd server

# Preview
npx ts-node scripts/revert-mailinator-invoice-payment.ts

# Reset family paid invoices back to Sent
npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply

# Or one invoice only
npx ts-node scripts/revert-mailinator-invoice-payment.ts --mode apply --invoice INV-XXXX
```

Then refresh `/family/billing` and click **Pay Now** again.

This only resets **our database**. It does not refund PayTabs sandbox. That is fine for local demo.

---



### D7 — Messaging (family ↔ coordinator)

**Family:** `/family/messages` → send: `When is my next session?`  
**Coordinator:** `/coordinator/messages` → reply: `We'll book next week — great progress.`

**Say:**

> “Messaging is episode-linked and real-time.”

---



### D8 — Admin pricing + reconciliation

**Login:** `admin@riayahplus.com`

1. `/admin/pricing` — show catalog rate in QAR (edit optional)
2. `/admin/invoices` — open paid invoice, download PDF
3. `/admin/payments` → **Reconciliation** — show invoice matched to PayTabs payment

**Say:**

> “Admin owns pricing. Finance reconciles app invoices against gateway payments without leaving the platform.”

---



## Optional Short Cuts (If Time Is Tight)


| Skip                          | Keep                                         |
| ----------------------------- | -------------------------------------------- |
| Full 8-step onboarding detail | One short intake + validate                  |
| Support portal                | Mention only                                 |
| Org admin deep dive           | One org screen                               |
| Recording                     | Mention S3 recording works; skip live record |
| Messaging                     | Skip if overtime                             |


**Never skip for a full demo:** Intake → Episode → Care plan approve → Telehealth join → Complete → Pay Now.

---



## Live vs Deferred


| Feature                                  | Status                   |
| ---------------------------------------- | ------------------------ |
| Auth + role shells (M1)                  | ✅                        |
| Org hierarchy (M1)                       | ✅                        |
| Family intake + consents (M2)            | ✅                        |
| Intake queue + episode on validate (M2)  | ✅                        |
| Care plan builder + family approval (M3) | ✅                        |
| Scheduling telehealth (M3/M4)            | ✅                        |
| Clinical notes in call (M3/M4)           | ✅                        |
| Quotation + PDF (M4)                     | ✅                        |
| Invoice on complete (M4)                 | ✅                        |
| PayTabs sandbox pay (M4)                 | ✅ (needs ngrok)          |
| LiveKit video + waiting room (M4)        | ✅                        |
| Recording to S3 (M4)                     | ✅                        |
| Messaging (M4)                           | ✅                        |
| Admin pricing + reconciliation (M4)      | ✅                        |
| AWS Transcribe transcript                | ⏭ Removed for now        |
| FCM push notifications                   | ⏭ Deferred (no Firebase) |
| SkipCash adapter                         | ⏭ Not wired yet          |


---



## Routes Cheat Sheet


| Who                              | URL                                      |
| -------------------------------- | ---------------------------------------- |
| Family home                      | `/family`                                |
| Family onboarding / request care | `/family/onboarding` or Request Care CTA |
| Family care plans                | `/family/care-plans`                     |
| Family billing                   | `/family/billing`                        |
| Family telehealth                | `/family/telehealth`                     |
| Family messages                  | `/family/messages`                       |
| Coordinator intake               | `/coordinator/intake-queue`              |
| Coordinator care plans           | `/coordinator/care-plans`                |
| Coordinator schedule             | `/coordinator/schedule`                  |
| Coordinator messages             | `/coordinator/messages`                  |
| Clinical telehealth              | `/clinical/telehealth`                   |
| Admin pricing                    | `/admin/pricing`                         |
| Admin invoices                   | `/admin/invoices`                        |
| Admin payments                   | `/admin/payments`                        |


---



## Troubleshooting (Most Common)


| Problem                      | Fix                                                                     |
| ---------------------------- | ----------------------------------------------------------------------- |
| Old data / duplicate intake  | Re-run clear script `--mode apply`                                      |
| Invoice stays Sent after pay | ngrok + `BACKEND_URL` + restart API; reopen invoice                     |
| Clinical telehealth empty    | Book with **Telehealth** type + assign `clinical@mailinator.com`        |
| Camera/mic blocked on phone  | Use **https://** network URL, not http                                  |
| Recording stuck on STOPPING  | Wait 1–2 min + refresh; API must be restarted with latest recording fix |
| Session cannot be joined     | Normal after **Complete** — open page for recording only                |
| No invoice                   | Must **Complete** session first — quotation ≠ invoice                   |
| ngrok URL changed            | Free tier changes every restart — update `BACKEND_URL`                  |


---



## Suggested Client Closing Line

> “From Milestone 1 foundations through Milestone 4 billing and telehealth, this is one connected product: intake, care plan, video visit with recording, and Qatari payment — with role-based access and audit-ready records.”

---

*Related:* `docx/M4_CLIENT_DEMO_FLOW_FRESH_ACCOUNTS.md` *·* `docx/MILESTONE_TWO_CLIENT_DEMO.md` *·* `docx/M4_TASK_TRACKER.md` *·* `docx/M3_TASK_TRACKER.md`