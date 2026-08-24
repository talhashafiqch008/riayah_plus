# Milestone 4 — Client Demo Flow (Manual, Fresh Accounts)

**App:** `http://localhost:5173` · **API:** `http://localhost:5001`  
**Password for all accounts:** `Password123!`  
**Estimated demo time:** ~35–45 min

---

## Your 6 Demo Accounts

| Role | Email | Portal |
|---|---|---|
| Admin | `admin@riayahplus.com` | `/admin` |
| Organisation Admin | `org@mailinator.com` | `/admin` (org-level) |
| Family | `family@mailinator.com` | `/family` |
| Coordinator | `coordinator@mailinator.com` | `/coordinator` |
| Clinical Staff | `clinical@mailinator.com` | `/clinical` |
| Support Staff | `staff@mailinator.com` | `/support` |

---

## Before Every Demo — Reset the Database

Run these two commands in order. This clears all care data for mailinator users (keeps the user accounts and passwords).

```bash
cd server

# Step 1 — dry run first to see what will be deleted
npx ts-node scripts/clear-mailinator-m4-demo-data.ts

# Step 2 — actually delete
npx ts-node scripts/clear-mailinator-m4-demo-data.ts --mode apply
```

---

## Before Every Demo — Start the Servers

Open **3 terminals**:

```bash
# Terminal 1
cd server && pnpm dev

# Terminal 2
cd client && pnpm dev

# Terminal 3 — needed for PayTabs payment webhooks
cd server && ./scripts/paytabs-ngrok.sh
```

After ngrok starts, copy the `https://....ngrok-free.app` URL.  
Open `server/.env`, update `BACKEND_URL=https://YOUR-NGROK-URL.ngrok-free.app`, save.  
Restart Terminal 1 (`Ctrl+C` → `pnpm dev`).

---

## Pre-Demo Checklist

```
☐ All 3 terminals running (server, client, ngrok)
☐ server/.env  →  BACKEND_URL = ngrok HTTPS URL
☐ Server restarted after .env change
☐ Database cleared with clear script above
☐ All browser tabs logged out / fresh incognito window
```

---

## Demo Flow

---

### Step 1 — Family: Submit a Care Request

**Login as:** `family@mailinator.com`  
**Go to:** `http://localhost:5173/family`

1. On the dashboard, click **"Request Care"** (or "New Care Request")
2. Fill in the form:
   - Patient name: anything (e.g. "Ahmed Al-Rashid")
   - Reason for care: "Physical therapy after knee surgery"
   - Urgency: Medium
3. Click **Submit**

**What to say:**
> "The family fills out a simple intake form. No phone calls, no paperwork. It goes directly to the assigned care coordinator."

**What to check:** You see a confirmation or the request appears in "Pending" state.

---

### Step 2 — Coordinator: Review Intake → Validate → Build Care Plan

**Login as:** `coordinator@mailinator.com`  
**Go to:** `http://localhost:5173/coordinator`

#### 2a — Open the Intake Queue

1. Click **"Intake Queue"** in the sidebar (or go to `/coordinator/intake-queue`)
2. You see the care request submitted by `family@mailinator.com`
3. Click on it to open the intake detail panel on the right

#### 2b — Validate the Intake (episode is created automatically)

4. Review the patient info, urgency, and reason for care
5. Make sure the **"Create care episode on validate"** checkbox is ticked ✅
6. Optionally type an episode title (e.g. "Physiotherapy – Ahmed")
7. Click **"Validate"** (or "Approve Intake")

> The system automatically creates a care episode and links it to this intake. You do NOT manually create an episode — it is created by validating the intake.

8. After validating, you will see a **"Linked episode"** link appear in the intake panel
9. Click **"Open episode"** to go to the episode page

#### 2c — Build a Care Plan

10. Go to **"Care Plans"** in the coordinator sidebar (`/coordinator/care-plans`)
11. On the Care Plans page, you see a section **"Choose an episode to build a plan"**
12. Click on the episode you just created (e.g. "Physiotherapy – Ahmed")
13. You land on the **Care Plan Builder** page
14. Add services from the catalog — for example:
    - Physiotherapy Session
    - Home Nursing Visit
15. **Important:** Prices come from the admin catalog — you cannot change them
16. Click **"Submit for Approval"** — this sends the plan to the family

**What to say:**
> "The coordinator reviews the intake, validates it, and an episode is created automatically. They then go to Care Plans, pick the episode, and build the plan from the service catalog. Prices are admin-controlled — coordinators cannot change them. The family is notified instantly."

**What to check:** Care plan status = `Submitted for Approval` · family gets a notification.

---

### Step 3 — Family: Approve Care Plan → Quotation Generated

**Login as:** `family@mailinator.com`  
**Go to:** `http://localhost:5173/family`

1. Check the **notification bell** (top right) — you should see "Care plan ready for review"
2. Click the notification or go to **Billing → Quotations** in the sidebar
3. Open the pending care plan
4. Read through the items and prices
5. Click **"Approve"**

**What to say:**
> "The family reviews the care plan and approves it. The moment they approve, the system automatically generates an itemised quotation in Qatari Riyals — including 5% tax."

#### 3a — View the Quotation

6. Go to **Billing → Quotations** (or `/family/billing?tab=quotations`)
7. You will see a new quotation (QUO-XXXX) in QAR
8. Click on it to open
9. Click **"Download PDF"** — show the PDF invoice with line items, tax, and total

**What to say:**
> "The quotation is a formal document the family can keep. The family cannot be charged until a session is actually completed."

**What to check:** Quotation exists · PDF opens · no "Pay Now" button on a quotation (quotations are not payable).

---

### Step 4 — Coordinator: Book a Telehealth Session

**Login as:** `coordinator@mailinator.com`  
**Go to:** `http://localhost:5173/coordinator/schedule`

The page has two sections: **Staff availability** (top) and **Book session** (bottom). You only need the **Book session** section.

1. Under **"Book session"**, open the **Care episode** dropdown → select the episode you just created
2. Open the **Assign to staff** dropdown → select `clinical@mailinator.com`
3. Open the **Session type** dropdown → select **"Telehealth (video call)"**
4. Set the **Start (local)** date/time — pick today, a few minutes from now
5. Leave duration as 60 min
6. Click **"Book"**

**What to say:**
> "When a telehealth appointment is booked, the system automatically provisions a LiveKit video room and notifies both the family and the clinical staff instantly."

**What to check:**
- A session appears in the list below the form with status `accepted`
- `clinical@mailinator.com` gets a `session_assigned` notification
- `family@mailinator.com` gets a `telehealth_ready` notification

---

### Step 5 — Family: Give Telehealth Consent + Join Waiting Room

**Login as:** `family@mailinator.com`  
**Go to:** `http://localhost:5173/family/telehealth`

1. You see the booked telehealth session in the list
2. Click **"Join Session"** or **"Open"**

#### If a consent wall appears (first time only):

3. Read the telehealth consent text
4. Click **"I Agree"** or **"Give Consent"**
5. You are now taken into the **Waiting Room**

#### In the Waiting Room:

6. You see a message like "Waiting for your clinician to admit you"
7. The video does NOT start yet — you are in the waiting room, not the call

**What to say:**
> "The family must consent to telehealth once — this is a regulatory requirement. They then enter a waiting room. They cannot join the actual call until the clinician admits them. This protects the clinical workflow."

**What to check:** Family sees "Waiting" state. Video is not active yet.

> **Keep this browser tab open** — family is waiting.

---

### Step 6 — Clinical: Admit Family + Start the Call + Add Session Note

**Login as:** `clinical@mailinator.com` (use a different browser or incognito tab)  
**Go to:** `http://localhost:5173/clinical/telehealth`

1. You see the telehealth session in the list
2. Click **"Open"** or **"Join"**
3. You land on the clinical telehealth join page
4. You see the **Lobby** — it shows that `family@mailinator.com` is **waiting**

#### Admit the family:

5. Click **"Admit"**
6. The family's browser automatically moves from the waiting room into the call
7. LiveKit video and audio starts for both sides

**What to say:**
> "The clinician sees exactly who is waiting and when they joined. One click admits them into the secure video call. The connection is end-to-end encrypted via LiveKit Cloud."

#### Side Panel (while in call):

8. Look at the **Side Panel** on the right — it shows:
   - The active care plan
   - Goals
   - Prior session notes
9. Click the note area at the bottom
10. Type a session note: "Patient demonstrated good range of motion. Recommended daily stretching exercises."
11. Click **Save Note**

**What to say:**
> "The clinician has the full care context without switching tabs — care plan, goals, prior notes. Notes are saved directly to the episode record in real time."

**What to check:** Note saved · note visible in coordinator's episode view.

#### (Optional — if LiveKit egress/recording is enabled):

12. Click **"Start Recording"**
13. Call continues — recording is in progress (shown by red dot)
14. Click **"Stop Recording"** when done
15. After about a minute, leave the call — the video recording appears on the session page

---

### Step 7 — Coordinator: Complete the Session → Invoice Generated

**Login as:** `coordinator@mailinator.com`  
**Go to:** `http://localhost:5173/coordinator` or `/coordinator/schedule`

1. Find the telehealth session (status: `in_progress` or `accepted`)
2. Click **"Complete Session"**
3. Confirm

**What to say:**
> "When a coordinator marks the session complete, an invoice is automatically generated — no manual data entry. The family is notified by bell and email."

**What to check:**
- Session status = `completed`
- A new invoice appears (INV-XXXX) with status = `sent`
- Family's notification bell shows "Invoice ready"

---

### Step 8 — Family: Pay the Invoice (PayTabs)

**Login as:** `family@mailinator.com`  
**Go to:** `http://localhost:5173/family/billing` → **Invoices tab**

1. You see the new invoice (INV-XXXX) with status `Sent` in amber
2. Click on the invoice to open it
3. Click **"Pay Now"**
4. You are redirected to the **PayTabs sandbox checkout page** (secure-doha.paytabs.com)

#### On the PayTabs checkout page:

5. Enter test card details:
   - Card number: `4111 1111 1111 1111`
   - Expiry: any future date (e.g. `12/27`)
   - CVV: any 3 digits (e.g. `123`)
   - Name: anything
6. Click **Pay**

7. You are redirected back to the app
8. Invoice status updates to **Paid** ✅
9. Notification bell shows "Payment received"

**What to say:**
> "The family pays through PayTabs — Qatar's licensed payment gateway. The payment webhook marks the invoice paid in real time and an instant notification is sent."

**What to check:** Invoice = `Paid` · payment record stored · notification fired.

> ⚠️ **If invoice stays `Sent` after payment:** ngrok is not running or `BACKEND_URL` is not updated. Fix: update `BACKEND_URL` in `.env` to the ngrok HTTPS URL and restart the server.

---

### Step 9 — Messaging: Family ↔ Coordinator

**Login as:** `family@mailinator.com`  
**Go to:** `http://localhost:5173/family/messages`

1. Open the episode conversation thread
2. Send a message: "When is my next session?"

**Switch to coordinator** (different browser/tab):  
**Login as:** `coordinator@mailinator.com`  
**Go to:** `http://localhost:5173/coordinator/messages`

3. See the family's message arrive in real time (no page refresh needed)
4. Reply: "We'll schedule your next session next week. Great progress today!"

Switch back to family browser — the reply appears instantly.

**What to say:**
> "Messaging is episode-linked — every conversation is tied to the care record. Real-time delivery via Socket.io. Coordinators, clinicians, and families communicate in one place with a full history."

**What to check:** Message appears on both sides · read receipts update.

---

### Step 10 — Admin: Pricing + Invoices + Reconciliation

**Login as:** `admin@riayahplus.com`  
**Go to:** `http://localhost:5173/admin`

#### Pricing

1. Go to **Admin → Pricing** (`/admin/pricing`)
2. Find a service (e.g. "Physiotherapy Session") — show the base rate in QAR
3. Click **Edit** — change the rate (e.g. from 150 to 160 QAR)
4. Save

**What to say:**
> "Admin controls all prices. Coordinators and families cannot manipulate costs. Every quotation and invoice enforces catalog pricing automatically."

#### Invoices

5. Go to **Admin → Invoices** (`/admin/invoices`)
6. Find the paid invoice — click it
7. Click **"Download PDF"** — show the invoice PDF
8. (Optional) Click **"Send"** to trigger an email copy

#### Reconciliation

9. Go to **Admin → Payments** (`/admin/payments`) → **Reconciliation tab**
10. Show the paid invoice matched to the PayTabs gateway payment record
11. Point out that mismatches would appear here as flags

**What to say:**
> "Reconciliation shows every invoice against the actual gateway payment. Finance can audit without touching the payment gateway dashboard. Any mismatch — wrong amount, missing payment, or orphaned charge — is flagged automatically."

**What to check:** Service rate updated · invoice PDF downloads · paid invoice in reconciliation list.

---

## What Is Live vs Pending

| Feature | Status | Notes |
|---|---|---|
| Care request → episode → care plan | ✅ Live | Full manual UI flow |
| Quotation (QAR) + PDF | ✅ Live | Auto-generated on care plan approval |
| Invoice on session complete | ✅ Live | Auto-generated, not manual |
| PayTabs checkout | ✅ Live (sandbox) | Needs ngrok for webhook |
| Invoice → Paid via webhook | ✅ Live | ngrok must be running |
| Telehealth waiting room + admit | ✅ Live | Full UI |
| Live video/audio | ✅ Live (sandbox) | LiveKit Cloud keys in `.env` |
| Clinical side panel + notes | ✅ Live | No LiveKit needed |
| Messaging (real-time) | ✅ Live | Socket.io |
| In-app notifications | ✅ Live | Bell icon |
| Admin pricing + reconciliation | ✅ Live | Full UI |
| Recording to S3 | ✅ Live (sandbox) | Clinical starts/stops recording; MP4 saved to S3 |
| Phone push notifications (FCM) | ⏭ Deferred | Firebase credentials not yet provided |

---

## Routes Quick Reference

| Role | Route | What you do there |
|---|---|---|
| Family | `/family` | Dashboard, care request |
| Family | `/family/billing` | Quotations + Invoices + Pay Now |
| Family | `/family/telehealth` | Join session, waiting room |
| Family | `/family/messages` | Messaging |
| Coordinator | `/coordinator` | Episodes, care plans |
| Coordinator | `/coordinator/schedule` | Book sessions |
| Coordinator | `/coordinator/messages` | Messaging |
| Clinical | `/clinical/telehealth` | Lobby, admit, notes, recording |
| Clinical | `/clinical/messages` | Messaging |
| Admin | `/admin/invoices` | All invoices |
| Admin | `/admin/payments` | Reconciliation |
| Admin | `/admin/pricing` | Service catalog pricing |

---

## PayTabs Test Card

| Field | Value |
|---|---|
| Card number | `4111 1111 1111 1111` |
| Expiry | Any future date (e.g. `12/27`) |
| CVV | Any 3 digits (e.g. `123`) |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Invoice stays `sent` after PayTabs payment | ngrok not running OR `BACKEND_URL` in `.env` not updated to ngrok HTTPS URL — restart server after fix |
| PayTabs 502 "Invalid Callback URL" | `BACKEND_URL` must start with `https://` — use the ngrok URL, not localhost |
| Clinical telehealth list is empty | Coordinator must have assigned `clinical@mailinator.com` as the provider when booking the session |
| Family sees consent wall | This is normal on first join — read and click "I Agree" |
| Family telehealth shows nothing | Run `npx ts-node scripts/setup-mailinator-telehealth-demo.ts` to create a session via script if booking via UI didn't work |
| Empty invoices tab | Invoices are only created after a session is **completed** — quotations are not invoices |
| ngrok URL changed | Free tier URL changes on every restart — update `BACKEND_URL` and restart the server |
| Video not starting | Confirm LiveKit keys in `.env` match what the client provided. Restart server. |
| Recording button fails | LiveKit egress/recording must be enabled on the client's LiveKit Cloud project — contact Ahmed |

---

*Related docs: `docx/M4_TASK_TRACKER.md` · `docx/MILESTONE_FOUR_TEST.md` · `docx/M4_DEMO_SCRIPT.md`*
