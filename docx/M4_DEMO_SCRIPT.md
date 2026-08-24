# M4 Client Demo Script + PayTabs ngrok Setup

**For:** Ahmed stakeholder walkthrough (`M4-6.6`)  
**Date:** 2026-08-17  
**App:** Client `http://localhost:5173` · API `http://localhost:5001`  
**Password (all demo users):** `Password123!`

---

## Part A — PayTabs: mark invoice **Paid** locally (ngrok)

Checkout already works. PayTabs cannot call `localhost` for the IPN. Use ngrok once to prove **sent → paid**.

### 1. Start app

```bash
# Terminal 1
cd server && pnpm dev

# Terminal 2
cd client && pnpm dev
```

### 2. Start ngrok

```bash
# Terminal 3
cd server && chmod +x scripts/paytabs-ngrok.sh && ./scripts/paytabs-ngrok.sh
```

Copy the **https** URL (e.g. `https://abc123.ngrok-free.app`).

### 3. Update env + restart API

In `server/.env`:

```env
BACKEND_URL=https://abc123.ngrok-free.app
```

Restart `pnpm dev` in Terminal 1.

### 4. Pay a sent invoice

1. Log in as **family@demo.com**
2. Go to **Billing** → open a **sent** invoice (not quotation)
3. Click **Pay Now** → complete PayTabs sandbox card (e.g. `4111111111111111`)
4. After redirect back, refresh invoice → status should be **paid**
5. Bell icon → **Payment received** notification

### 5. Admin reconciliation

1. Log in as **admin@riayahplus.com**
2. **Payments** → reconciliation tab → paid invoice should match gateway payment

### Troubleshooting

| Issue | Fix |
|---|---|
| Still **502 Invalid Callback URL** | `BACKEND_URL` must be `https://` ngrok URL, not localhost |
| Checkout works, invoice stays **sent** | ngrok not running, or API not restarted after `.env` change |
| ngrok URL changed | Update `BACKEND_URL` each time ngrok restarts (free tier) |

When done testing, set `BACKEND_URL=http://localhost:5001` again for normal dev.

---

## Part B — Client demo script (~25–35 min)

**Goal:** Show M4 product path without pretending live video or push are done.

### Opening (1 min)

> "Milestone 4 adds billing in QAR, telehealth with a waiting room, and secure messaging. Most of the product is built; live video needs your LiveKit keys, and phone push is deferred until Firebase."

---

### Act 1 — Care plan → quotation (Coordinator + Family) ~5 min

| Who | Do | Say |
|---|---|---|
| **Coordinator** | Log in → open an active episode → care plan approved path (or show existing quotation) | "When the family approves the care plan, the system auto-generates a QAR quotation with tax and line items from the service catalog." |
| **Family** | **Billing** → **Quotations** tab → open quotation → download PDF | "Family sees the quote before any charge. PDF is itemized." |

**Pass:** Quotation visible, PDF downloads, cannot pay a quotation.

---

### Act 2 — Session complete → invoice ~3 min

| Who | Do | Say |
|---|---|---|
| **Coordinator / Clinical** | Show a completed telehealth or booking that generated an invoice (or complete one in demo data) | "When a session is completed, an invoice is created automatically — not manual admin entry." |
| **Family** | **Billing** → **Invoices** → open **sent** invoice | "Invoice lifecycle: sent → paid. Admin can also mark paid manually; gateway payments go through PayTabs." |

---

### Act 3 — Pay invoice (Family) ~5 min

| Who | Do | Say |
|---|---|---|
| **You** | Confirm ngrok + `BACKEND_URL` if demoing **paid** status | "PayTabs sandbox is integrated. Checkout opens on secure-doha.paytabs.com." |
| **Family** | **Pay Now** → sandbox card → return to app | "Family pays in QAR via the Qatari gateway. Webhook marks the invoice paid and sends a notification." |
| **Family** | Check notification bell | "In-app notification: payment received." |

**If not using ngrok:** say checkout opens but invoice stays sent until staging HTTPS webhook is configured.

---

### Act 4 — Telehealth waiting room (Family + Clinical) ~8 min

| Who | Do | Say |
|---|---|---|
| **Coordinator** | Book or show existing **telehealth** session | "When a video appointment is confirmed, a LiveKit room is provisioned and everyone is notified." |
| **Family** | **Video** → join session → consent if prompted → **waiting room** | "Family must consent to telehealth. They wait until staff admits — not straight into the call." |
| **Clinical** | **Video** → same session → **Lobby** → **Admit** | "Clinician sees who is waiting and admits them. Side panel shows care plan, goals, and notes." |
| **Clinical** | Add a **session note** | "Notes are saved on the episode for the care team." |

**Honest caveat:**

> "The waiting room, admit flow, and clinical side panel are live. Actual video/audio needs your LiveKit Cloud URL + API key + secret — we're waiting on those three values."

---

### Act 5 — Messages (Family + Coordinator) ~5 min

| Who | Do | Say |
|---|---|---|
| **Family** | **Messages** → open episode thread → send a message | "Messaging is episode-linked and realtime." |
| **Coordinator** | **Messages** → same thread → reply | "Coordinator, clinical, and family can thread per episode. Attachments supported." |

---

### Act 6 — Admin oversight ~3 min

| Who | Do | Say |
|---|---|---|
| **Admin** | **Pricing** → edit a service base rate | "Pricing is admin-controlled; quotations use catalog rates, not client-submitted prices." |
| **Admin** | **Invoices** → send / PDF | "Admin can send invoices and download PDFs." |
| **Admin** | **Payments** → reconciliation | "Reconciliation flags mismatches between paid invoices and gateway records." |

---

### Act 7 — M3 still works ~2 min

| Who | Do | Say |
|---|---|---|
| **Coordinator** | Show care unit / episode list | "M3 intake → episode → care plan path is unchanged. M4 layers on top." |

---

### Closing — what's left (1 min)

| Item | Status |
|---|---|
| PayTabs checkout | ✅ Working (sandbox) |
| PayTabs → invoice **paid** | ✅ With ngrok or staging HTTPS |
| LiveKit video | ⏸ Waiting on URL + API key + secret |
| SkipCash | Keys received; adapter optional / later |
| FCM phone push | ⏭ Deferred (in-app + email cover billing/telehealth) |
| Recording to S3 | ⏸ Needs LiveKit + S3 |

**Ask Ahmed:**

1. LiveKit sandbox: **WebSocket URL**, **API Key**, **API Secret**
2. Confirm **PayTabs vs SkipCash** for production go-live
3. Schedule **staging URL** for permanent webhooks (replace ngrok)

---

## Demo logins (quick reference)

| Role | Email |
|---|---|
| Family | `family@demo.com` |
| Clinical | `clinical@demo.com` |
| Coordinator | `coordinator@riayahplus.com` |
| Admin | `admin@riayahplus.com` |

---

## Routes cheat sheet

| Role | Billing | Video | Messages |
|---|---|---|---|
| Family | `/family/billing` | `/family/telehealth` | `/family/messages` |
| Clinical | — | `/clinical/telehealth` | `/clinical/messages` |
| Coordinator | — | — | `/coordinator/messages` |
| Admin | `/admin/invoices`, `/admin/payments`, `/admin/pricing` | — | — |

---

*See also: `docx/MILESTONE_FOUR_TEST.md` Flow 8 · `docx/M4_TASK_TRACKER.md`*
