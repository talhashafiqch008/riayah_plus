# Milestone 4 — Telehealth, Payments & Communication

**Status:** 🟡 Wave 6 hardening smoked 2026-08-13 — live PayTabs / LiveKit video / FCM still vendor-blocked; stakeholder demo open  
**Budget (signed):** $600  
**Timeline:** Week 5  
**Last updated:** 2026-08-13  
**Sources:** `Riayah_Plus_Proposal_v2.pdf` § Milestone 4 · `MILESTONE_SPECS.md` § M4 · codebase audit · `M4_SECURITY_BACKLOG.md`

### Client decisions (locked)

| Topic | Decision | When |
|---|---|---|
| Telehealth | **LiveKit** (not Daily.co / Twilio) | 2026-08-13 — Ahmed |
| Payments go-live | **PayTabs first**; Fatora/Skipcash later | 2026-08-12 |
| Architecture | Modular provider adapters (swap without core rewrites) | 2026-08-12 |
| Credentials | Env/secrets only; sandbox ≠ production | 2026-08-12 |
| Settlement | Confirm Himyan/NAPS + **QAR** in sandbox when keys arrive | Pending keys |

---

## How to read this doc

Use this as the **single working brief** before coding. It answers:

1. What the **signed proposal** requires for M4  
2. What already exists vs what is still missing in **this** repo  
3. Security findings that must be fixed while building billing  
4. Build order + pass/fail checks  

**Task tracker:** `docx/M4_TASK_TRACKER.md`  
**Website / API test flows:** `docx/MILESTONE_FOUR_TEST.md`  
**Prior milestone:** M3 complete (`docx/MILESTONE_THREE.md`) — do not regress care plans, org routing, or AI integration.

---

## Scope decision (important)

### Signed proposal (v2) — Milestone 4

> Telehealth as a primary care delivery channel, full billing/invoicing with local Qatari bank payment collection, and secure multi-party messaging + notifications.

| Deliverable | Description | Source |
|---|---|---|
| Telehealth video sessions | **LiveKit** (client-confirmed; proposal listed Daily.co/Twilio as options) | Client 2026-08-13 |
| Waiting room + session controls | Patient joins waiting room; clinical staff admits | Signed |
| Shared care context in call | Side panel: active Care Plan, goals, prior notes | Signed |
| Session notes + optional recording | Notes during/post-call; recording to S3 with access controls | Signed |
| Service pricing master | Admin configures pricing; backend-calculated only | Signed |
| Automated quotation (QAR) | Itemized quote on Care Plan approval + PDF export | Signed |
| Invoice generation + lifecycle | Draft → Sent → Paid → Overdue → Disputed | Signed |
| Qatari payment gateway | PayTabs / Fatora / Skipcash (NAPS + local bank cards) | Signed |
| Payment webhooks | Pending / Successful / Failed / Refunded | Signed |
| Admin payment reconciliation | Match gateway settlements to invoices | Signed |
| Family pay in portal | View quotations/invoices and pay | Signed |
| Secure multi-party messaging | Episode-linked threads, real-time (Socket.io) | Signed |
| Full notifications | In-app + email + mobile push (incl. payment events) | Signed |

### Explicitly out of M4 (do not pull in)

| Feature | Milestone |
|---|---|
| React Native mobile app | M5 |
| GPS geofencing / worker check-in productization | M5 |
| Admin analytics dashboards | M5 |
| Public app store listing | Client responsibility (§5.2) |
| Gateway subscription / transaction fees | Client accounts (§5.2) |

### Note on existing stacks

The repo already has **LiveKit** telehealth and **Stripe**/PayTabs payments scaffolding. Signed M4 product work now targets:

- Telehealth: **LiveKit** (client decision 2026-08-13 — keep/harden existing path; no Daily.co swap)
- Payments: **PayTabs** first for family invoice pay in QAR (Fatora/Skipcash later via adapters)

Stripe may remain for wallet/legacy flows if needed, but **family invoice payment for M4 must go through the Qatari gateway path**.

---

## Test Credentials

```
All passwords: Password123!
```

| Role | Email | Primary Path |
|---|---|---|
| Admin | `admin@riayahplus.com` | `/admin` |
| Care Coordinator | `coordinator@riayahplus.com` | `/coordinator` |
| Family | `family@demo.com` | `/family` |
| Clinical Staff | `clinical@demo.com` | `/clinical` |
| Support Worker | `support@demo.com` | `/support` |

Server: `http://localhost:5001`  
Client: `http://localhost:5173`

```bash
cd server && npm run dev
cd client && npm run dev
```

---

## 1. What Exists Today (audit)

### 1.1 Telehealth — 🟡 Partial

| Piece | Status | Notes |
|---|---|---|
| `Session` model (`dailyRoomUrl`, `livekitRoomId`, `recordingUrl`) | ✅ Schema | `dailyRoomUrl` unused in code |
| LiveKit token / room APIs | ✅ | Participant-checked; unknown/foreign rooms rejected (2026-08-13) |
| Meeting schedule / join / end | ✅ | Host/participant/admin; ended/cancelled blocked |
| Video UI (`/room/:id`) | 🟡 | LiveKit-based waiting/join |
| Family / clinical role-shell telehealth nav | ❌ | Not in proposal shells |
| LiveKit product path (client-confirmed) | 🟡 | Confirm → room + notify smoked; waiting room still open |
| Waiting room admit + side panel (plan/goals/notes) | 🟡 | Admit API smoked; side panel still open |
| LiveKit webhook signatures | ✅ | `POST /api/livekit/webhook` JWT + body sha256 |
| Session recording → S3 access controls | 🟡 | Fields exist; product flow incomplete |

### 1.2 Billing & payments — 🟡 Partial

| Piece | Status | Notes |
|---|---|---|
| `Invoice` / `Payment` models | ✅ | Invoice `type` can be `"quotation"` string — not a dedicated Quotation entity |
| `InvoicePDFService` | ✅ | PDF + S3 |
| `PricingEngine` | 🟡 | Marketplace pricing; not auto-quote on care-plan approval |
| `QatariPaymentService` | 🟡 | **PayTabs only**; Fatora/Skipcash missing |
| Stripe payments / webhooks | ✅ | Legacy marketplace / wallet |
| Invoice CRUD + send + mark-paid + PDF | 🟡 | Exists but **security gaps** (see §3) |
| Auto quotation on Care Plan approval | ✅ | `QuotationService` on family approve (2026-08-13) |
| Invoice auto-gen on session completion | ✅ | `InvoiceService` on session/booking complete (2026-08-13) |
| Admin service pricing master | ✅ | Catalog rate wins; `PATCH /api/admin/services/:id` (2026-08-13) |
| Admin reconciliation dashboard | ✅ | API + `/admin/payments` UI |
| Family invoice / quotation / pay UI | 🟡 | `/family/billing`; Pay now ⏸ until PayTabs keys |
| PayTabs webhook signature validation | ✅ | HMAC / server-key (Wave 1) |

### 1.3 Messaging — 🟡 Partial

| Piece | Status | Notes |
|---|---|---|
| `Conversation` / `Message` models | ✅ | Episode FK + read receipts |
| REST chat APIs | ✅ | Threads, receipts, attachments, role-derived types |
| Socket.io server emit | ✅ | Cookie/Bearer handshake; `new_message` / `messages_read` (2026-08-13) |
| Role-shell Messages pages | ❌ Placeholders | Family copy: “ships in Milestone 4” |
| Episode-linked threads, read receipts, pins, announcements | 🟡 | Threads + receipts done; pins/announcements not built |

### 1.4 Notifications — 🟡 Partial

| Piece | Status | Notes |
|---|---|---|
| In-app `Notification` model + API | ✅ | |
| `NotificationService` | ✅ | In-app + realtime `notification` emit |
| Email for invoices | ✅ | `notifyBillingEvent` + `EmailService.sendInvoice` |
| Device token storage (FCM-ready) | 🟡 | Tokens stored; **no firebase-admin push send** |
| Payment lifecycle notifications (PayTabs success/fail, overdue) | ✅ | API smoked 2026-08-13; live PayTabs fail ⏸ keys |
| Telehealth reminder 30min | ✅ | Cron; family + clinician; idempotent (2026-08-13) |

---

## 2. What Must Be Built (gaps)

### Telehealth
1. Harden **LiveKit** product path (room create/join tokens, webhook signature) — client confirmed LiveKit (not Daily.co)
2. On appointment confirm → create telehealth room → notify participants
3. Waiting room + staff admit
4. In-call side panel API + UI (care plan, goals, notes)
5. Session notes linked to episode; optional recording to S3
6. Role-shell join pages for family + clinical (+ coordinator if needed)

### Billing
1. Dedicated quotation generation on **Care Plan approval** (QAR, itemized)
2. Quotation / invoice PDF export (rate, qty, subtotal, tax, total)
3. Invoice auto-generation on session/service completion
4. Harden invoice ownership / mark-paid / create (security backlog)
5. Validate PayTabs webhook signatures; complete Pending→Paid/Failed/Refunded
6. At least one live Qatari gateway path for family invoice pay (PayTabs first; Fatora/Skipcash if credentials available)
7. Admin pricing master + reconciliation dashboard
8. Family portal: quotations, invoices, pay flow

### Messaging
1. Replace role-shell placeholders with real messaging UI
2. Episode-linked conversations; read receipts; attachments
3. Unify realtime (Socket.io end-to-end **or** document one stack and ship it consistently) — **done 2026-08-13** (cookie handshake)
4. Conversation types: Family↔Coordinator, Family↔Clinical, staff internal (as time allows)

### Notifications
1. Wire M4 events: appointment, telehealth reminder, invoice generated, payment received/failed/overdue — **invoice/payment/overdue + 30min reminder done 2026-08-13**
2. Email + in-app for all; push via FCM where tokens exist
3. Notify on PayTabs webhook outcomes — **in-app + email on success/fail; live keys ⏸**

---

## 3. Security backlog (must fix in M4)

Source: `docx/M4_SECURITY_BACKLOG.md` (Karim). Highest priority while touching billing:

| Finding | Severity |
|---|---|
| PayTabs webhook accepts any POST without signature validation | Critical |
| Any logged-in user can mark any invoice paid | Critical |
| Invoice create/view/send missing ownership checks | Critical |
| Booking payment verify lacks ownership + amount check | High |
| Self-refund race / duplicate / missing reconciliation | High |
| Payment method detach without ownership | High |

**Rule:** Do not ship family payment UI until webhook + invoice ownership fixes land.

---

## 4. Key files reference

| File | Purpose |
|---|---|
| `server/prisma/schema.prisma` | Session, Invoice, Payment, Conversation, Notification |
| `server/src/controllers/telehealth/*` | Current LiveKit / meeting APIs |
| `server/src/services/QatariPaymentService.ts` | PayTabs initiate + webhook |
| `server/src/services/StripeService.ts` | Stripe (legacy / wallet) |
| `server/src/services/InvoicePDFService.ts` | PDF export |
| `server/src/controllers/billing/InvoiceController.ts` | Invoice API (needs authz hardening) |
| `server/src/routes/chat.routes.ts` | Messaging REST |
| `server/src/services/RealtimeService.ts` | Socket.io auth, chat + notification rooms |
| `server/src/services/NotificationService.ts` | In-app notifications |
| `server/src/services/BillingNotificationService.ts` | Invoice/payment/overdue in-app + email |
| `server/src/services/TelehealthReminderService.ts` | ~30 min telehealth reminder cron |
| `client/src/pages/VideoRoomPage.tsx` | Current video join |
| `client/src/pages/clinical/ClinicalTelehealthJoinPage.tsx` | Clinical admit + context side panel |
| `client/src/components/roles/RoleNotificationBell.tsx` | Role-shell notification center (realtime + deep links) |
| `client/src/pages/roles/RoleMessagesPage.tsx` | Family / clinical / coordinator Messages UI |
| `client/src/routes/ProposalRoleRoutes.tsx` | Messages live for family / clinical / coordinator |
| `client/src/config/proposalRoleShells.ts` | Add telehealth + billing nav |
| `docx/M4_SECURITY_BACKLOG.md` | Billing security findings |

---

## 5. Build order (recommended)

### Phase A — Security + billing foundation
1. Fix invoice ownership / mark-paid / create authz  
2. Fix PayTabs webhook signature validation  
3. Fix booking payment verify ownership + amount  
4. Admin service pricing config (if missing)

### Phase B — Quotation + invoice product flow
1. Auto quotation on care plan approval (QAR)  
2. Family quotation view + approve/pay path  
3. Invoice auto-gen on session completion  
4. Lifecycle + overdue handling  
5. PDF export polish  
6. Admin reconciliation view  

### Phase C — Telehealth product path (LiveKit)
1. Confirm LiveKit env (`LIVEKIT_URL` / API key / secret) + webhook signing  
2. Room create on appointment confirm + notifications  
3. Waiting room + admit  
4. Side panel (plan / goals / notes)  
5. Session notes; optional recording  
6. Family + clinical join UI in role shells — **family waiting + clinical admit/side panel done**  

### Phase D — Messaging + notifications
1. Real messaging UI for family / coordinator / clinical — **done** (`RoleMessagesPage`)  
2. Episode-linked threads + read receipts  
3. Realtime delivery end-to-end — **done (Socket.io + httpOnly cookie)**  
4. M4 notification events + push send — **billing events done; FCM open**  

### Phase E — Hardening
1. Full pass/fail checklist  
2. M3 regression (care plans, org routing, AI)  
3. Payment negative tests (fake webhook rejected)  
4. Client demo dry-run  

---

## 6. Pass / Fail Checklist

| # | Check | Pass | Fail |
|---|---|---|---|
| TH1 | Appointment confirm creates telehealth room + notifies | 🧪 | |
| TH2 | Family joins waiting room; clinical admits | 🧪 UI | live video ⏸ LiveKit |
| TH3 | In-call side panel shows care plan / goals / notes | 🧪 | |
| TH4 | Session notes saved to episode | 🧪 | |
| TH5 | Optional recording stored with access control | 🟡 ACL | live S3 ⏸ LiveKit + AWS |
| BIL1 | Care plan approval generates QAR quotation | ✅ | |
| BIL2 | Quotation PDF has itemized breakdown | ✅ | |
| BIL3 | Session completion generates invoice | ✅ | |
| BIL4 | Family can view and pay invoice via Qatari gateway | 🟡 UI | live PayTabs ⏸ keys |
| BIL5 | Webhook updates status; forged webhook rejected | 🧪 | |
| BIL6 | Invoice lifecycle Draft→Sent→Paid (and Overdue/Disputed) | ✅ | |
| BIL7 | Admin reconciliation matches paid invoices | 🧪 | |
| BIL8 | Unauthorized mark-paid / view foreign invoice → 403 | 🧪 | |
| MSG1 | Family ↔ coordinator messaging works | 🧪 | |
| MSG2 | Messages can link to care episode | 🧪 | |
| MSG3 | Real-time delivery without full page refresh | 🧪 | |
| NOT1 | Invoice generated notifies family (in-app + email) | 🧪 | |
| NOT2 | Payment success/fail notifies family | 🧪 | live fail ⏸ keys |
| NOT3 | Telehealth reminder fires before session | 🧪 | |
| NOT4 | Push works when device token registered (or documented defer) | ⏭ | no Firebase creds |
| REG | M3 flows still work: intake → episode → care plan → delivery | 🧪 | |
| ORG | Org assignment / routing still works for new families | 🧪 | |

---

## 7. Open questions (ask client early)

1. ~~**Telehealth vendor:** Daily.co or Twilio?~~ → **LiveKit** (Ahmed, 2026-08-13)  
2. **Payment gateway for go-live:** PayTabs sandbox keys + confirm Himyan/NAPS + QAR settlement?  
3. Confirm **tax rate** and quotation line categories for QAR PDFs.  
4. Is **Stripe** still required alongside Qatari gateway for any family invoice path?  
5. Push notifications: FCM credentials ready for M4, or in-app + email only until M5 mobile?

---

*End of M4 working brief — keep in sync with `M4_TASK_TRACKER.md` as work lands.*
