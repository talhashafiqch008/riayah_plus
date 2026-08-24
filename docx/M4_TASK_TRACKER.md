# Milestone 4 — Task Tracker

**Created:** 2026-08-12  
**Source of truth (scope/spec):** `docx/MILESTONE_FOUR.md`  
**Proposal:** `docx/Riayah_Plus_Proposal_v2.pdf` § Milestone 4  
**Security backlog:** `docx/M4_SECURITY_BACKLOG.md`  
**Overall status:** 🟡 Wave 6 hardening smoked 2026-08-13 — ship gate yellow until PayTabs / LiveKit / FCM keys + stakeholder demo  
**Rule:** Check tasks off here as you finish them. Keep `MILESTONE_FOUR.md` for *what/why*; use **this file** for *what to do next*.

### Client decisions (locked)

- Telehealth: **LiveKit** (Ahmed 2026-08-13 — not Daily.co)
- Payments: **PayTabs** first (Fatora/Skipcash later)
- Modular adapters + env secrets; sandbox ≠ production
- Verify Himyan/NAPS + QAR settlement when sandbox keys arrive

---

## How to use this tracker

1. Work **Wave 0 → Wave 6** in order unless a task is marked **∥ Parallel**.  
2. Do not ship payment UI before Wave 1 security fixes.  
3. Update **Status**: `⬜ Todo` → `🟡 Doing` → `✅ Done` → `🧪 Verified`.  
4. After each wave, tick **Wave exit criteria**.  
5. Final ship gate = **§ Acceptance map** all green + **REG** (M3 regression).

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🟡 Doing | In progress |
| ✅ Done | Code complete |
| 🧪 Verified | Smoke / checklist pass |
| ⏸ Blocked | Waiting on client / vendor / credentials |
| ⏭ Skip | Deferred with written note |

---

## Progress snapshot

| Wave | Focus | Status | Est. order |
|---|---|---|---|
| **0** | Kickoff / vendor decisions / env | 🟡 | LiveKit + PayTabs decided; waiting PayTabs sandbox keys |
| **1** | Billing security hardening | ✅ | Smoked 2026-08-12 |
| **2** | Quotation + invoice product flow | 🟡 | Pricing + recon APIs done; PayTabs live pay ⏸ keys; family UI later |
| **3** | Telehealth LiveKit product path | ✅ | APIs smoked; live recording egress ⏸ LiveKit URL + S3 keys |
| **4** | Messaging + notifications | 🟡 | APIs smoked except FCM ⏸; reminder + billing notify done |
| **5** | Frontend (family / clinical / admin / coordinator) | 🟡 | Family+clinical+messages+notify+admin billing UI; live pay/video ⏸ |
| **6** | Hardening, regression, acceptance | 🟡 | Security retest + unit suites + acceptance map; live pay/video/FCM ⏸; stakeholder demo open |

## Latest verified progress

**2026-08-13 — Wave 2.1/2.2 quotation landed + smoked:**

- Family approve care plan → `QUO-*` invoice `type=quotation` in **QAR** (5% tax)
- Line items from `CarePlanItem` + `ServiceType.baseRate` fallback; grouped by category
- Idempotent per carePlanId; empty items → approve still succeeds (`no_billable_items`)
- PDF downloads via `/api/invoices/:id/pdf` (inline fallback when S3 creds missing)
- Clinical approve never rolled back by billing failures

**2026-08-13 — Wave 2.4 invoice on completion smoked:**

- Provider complete booking → `INV-*` QAR invoice (80 + 5% = 84), status **sent**
- Coordinator complete telehealth session → invoice from catalog rate × hours
- Idempotent (2nd complete → `already_exists`); foreign family **403**
- Already-paid bookings get a **paid** invoice (no double charge)
- Complete hooks never fail the clinical/ops path if billing skips

**2026-08-13 — Wave 2.8 pricing master smoked:**

- Admin `PATCH /api/admin/services/:id` sets catalog `baseRate` (QAR); family **403**
- `catalogUnitPrice` always prefers catalog over submitted `unitCost`
- Tampered care-plan item `unitCost: 1` + catalog 99 → quotation **103.95** QAR (99 + 5%)

**2026-08-13 — Wave 2.9 reconciliation API smoked:**

- Admin `GET /api/admin/payments/reconciliation` matches paid invoices to gateway payments
- Flags `paid_invoice_no_payment`, amount/currency mismatch, unpaid-with-payment, orphans
- Family **403**; booking-only marketplace payments ignored; quotations skipped
- Admin UI: `/admin/payments` reconciliation (`M4-5C.3`)

**2026-08-13 — Wave 3.1/3.8 LiveKit harden smoked:**

- Token only for session/meeting participants (unknown room **404**, foreign **403**)
- Family cannot create rooms; identity is always the logged-in user
- `POST /api/livekit/webhook` mounted before auth; unsigned **401**; valid JWT **200**
- Ended/cancelled meetings cannot be joined

**2026-08-13 — Wave 3.2 appointment confirm → room + notify smoked:**

- Coordinator books `type=telehealth` → `livekitRoomId` set; family + clinician + coordinator get `telehealth_ready`
- In-person book does not provision a room
- Family can mint a join token for that room; foreign family **403**

**2026-08-13 — Wave 3.3 waiting room + admit smoked (API):**

- Family token → `phase=waiting` (`…__waiting`, cannot subscribe)
- Clinician token → `phase=in_call` (main room)
- `GET /api/telehealth/sessions/:id/lobby` staff-only; family **403**
- `POST /api/telehealth/sessions/:id/admit` staff-only; after admit family token is `in_call`
- UI join/admit still Wave 5

**2026-08-13 — Wave 3.4 shared context API smoked:**

- `GET /api/telehealth/sessions/:id/context` (and meetings `:id/context`) for call participants
- Returns episode, active care plan, goals, prior notes; strips `unitCost` from items
- Family sees public notes only; clinical/coordinator see private notes
- Foreign family **403**; clinical join UI `M4-5B.1` 🧪

**2026-08-13 — Wave 3.5 session notes from telehealth smoked:**

- Clinical `POST /api/telehealth/sessions/:id/notes` creates an immutable note linked to the **episode + session**
- Family and foreign family **403**; coordinator sees the note on the episode
- Same write path on `POST /api/meetings/:id/notes`

**2026-08-13 — Wave 3.7 telehealth consent before join smoked:**

- Family join (`POST /api/telehealth/token`) requires active M2 `telehealth` consent
- Missing/revoked → **403** `telehealth_consent_required`; grant via `POST /api/client/consents` then join
- Clinical staff can join without that consent; meetings join uses the same gate

**2026-08-13 — Wave 3.6 recording ACL smoked (live egress ⏸ vendor):**

- Staff `POST /api/telehealth/sessions/:id/recording/start` — family **403**; LiveKit/S3 missing → **503** `recording_unavailable`
- Participant `GET .../recording` only; foreign family **403**; signed S3 URL when AWS keys exist
- `egress_ended` webhook stores URL on session **or** meeting
- Live composite egress needs real `LIVEKIT_URL` + S3 credentials

**2026-08-13 — Wave 4.1 episode-linked conversations smoked:**

- Family `POST /api/conversations/threads` with `episodeId` + coordinator → thread `type=episode`
- Idempotent reuse of the same pair + episode; `GET /api/conversations?episodeId=` filters
- Foreign family **403** to create or list another family's episode threads

**2026-08-13 — Wave 4.2 read receipts + attachments smoked:**

- `POST /api/conversations/:id/messages` text or multipart `file` (PDF/Word/JPEG/PNG/WebP)
- Coordinator `POST .../read` sets `status=read` + `readAt`; participants only
- Attachment download `GET .../files/:fileName`; foreign family **403** on list/read/download

**2026-08-13 — Wave 4.4 conversation types smoked:**

- Types derived from roles: `family_coordinator`, `family_clinical`, `coordinator_clinical`, `internal_staff`
- `GET /api/conversations?type=` filters; invalid type **400**; client cannot spoof type

**2026-08-13 — Wave 4.3 realtime delivery smoked:**

- Socket.io handshake accepts httpOnly `token` cookie (SPA has no JS JWT); unsigned sockets get `connect_error unauthorized`
- Family `POST /api/conversations/:id/messages` → coordinator `new_message`; family `POST .../read` → coordinator `messages_read`
- Client `socket.io-client` via Vite `/socket.io` proxy (`withCredentials`)
- Messages UI: family `M4-5A.4`; clinical/coordinator `M4-5B.2` / `M4-5C.1`

**2026-08-13 — Wave 4.5 billing notification events smoked:**

- Invoice send → in-app `invoice_sent` + realtime `notification` + email attempt
- Session-complete invoices already create `invoice_generated`; quotations `quotation_generated`
- Past-due sent invoices → `invoice_overdue` (cron every 30 min; quotations skipped)
- Admin mark-paid / PayTabs success → `payment_received`; PayTabs fail → `payment_failed` (live gateway ⏸ keys)
- Foreign family does not receive another family's billing notifications

**2026-08-13 — Wave 4.6 telehealth reminder smoked:**

- Cron every minute; sessions `type=telehealth` + `accepted` in a 30±5 min window
- Family + clinician get in-app `telehealth_reminder` + email attempt; generic copy (no episode title)
- Idempotent (2nd run notifies 0); meetings `status=scheduled` use the same job; foreign family 0
- Book-time `telehealth_ready` still fires on coordinator book (`M4-4.8`)

**2026-08-13 — Wave 5A.1/5A.2 family billing UI:**

- `/family/billing` lists invoices + quotations; detail at `/family/billing/:id`
- Pay now → PayTabs checkout; without sandbox keys **503** with a clear toast
- Quotations cannot be paid; PDF download; foreign family **403**
- Nav: Billing in family shell (`M4-5D.1` partial)

**2026-08-13 — Wave 5A.3 family telehealth join:**

- `/family/telehealth` lists video sessions; join at `/family/telehealth/:sessionId`
- Consent gate (`telehealth_consent_required`) then waiting room; poll until clinician admits
- LiveKit connects when `LIVEKIT_URL` is real; otherwise admitted state is shown
- Family session list no longer depends on `provider_profiles.languages`

**2026-08-13 — Wave 5A.4 family Messages UI:**

- `/family/messages` lists episode threads; open pane at `/family/messages/:id`
- Send text + PDF/Word/image; mark read on open; Socket.io `new_message` / `messages_read`
- Start thread with episode coordinator (`POST /api/conversations/threads`)
- Shared `RoleMessagesPage` for clinical (`M4-5B.2`) and coordinator (`M4-5C.1`)
- Family placeholder removed (`M4-5D.2`)

**2026-08-13 — Wave 5B.1 clinical telehealth admit + side panel:**

- `/clinical/telehealth` lists sessions; join at `/clinical/telehealth/:sessionId`
- Staff skip waiting room; lobby list + Admit; context panel (episode / plan / goals / notes)
- Session notes via `POST /api/telehealth/sessions/:id/notes`; LiveKit when URL is real
- Nav: Video sessions in clinical shell

**2026-08-13 — Wave 5B.2 / 5C.1 clinical + coordinator Messages:**

- `/clinical/messages` and `/coordinator/messages` reuse `RoleMessagesPage`
- Staff can start episode threads with family / coordinator; placeholders removed (`M4-5D.2` ✅)

**2026-08-13 — Wave 5A.5 notification center polish:**

- Role-shell header bell (`RoleNotificationBell`) with unread badge
- Lists in-app notifications; mark read / mark all / delete
- Socket.io `notification` prepends live; deep-links billing / telehealth / messages by type
- Client API aligned to `PATCH /notifications/:id/read` + `read-all`

**2026-08-13 — Wave 5C.2–5C.4 admin billing UI:**

- `/admin/pricing` catalog edit (baseRate QAR); `/admin/services` redirects here
- `/admin/payments` defaults to invoice reconciliation; marketplace list is a tab
- `/admin/invoices` oversight: send / mark paid / PDF; links from recon mismatches

**2026-08-13 — Wave 6 hardening pass:**

- Security retest: foreign invoice GET/mark-paid **403**; forged PayTabs webhook rejected (503 unset keys / no status change); unsigned LiveKit webhook **401**
- Unit suites: reconciliation, quotation, overdue, LiveKit access, telehealth room/context, chat, billing notify, realtime rooms — **65 passed**
- REG/ORG smoke: family has `organizationId`; active M3 episode + care plans; coordinator care units + episodes load
- Acceptance map updated; overall stays 🟡 until PayTabs/LiveKit/FCM keys + stakeholder demo (`M4-6.6`)

**Current next:**

1. Stakeholder demo dry-run (`M4-6.6`) when ready  
2. Live PayTabs / LiveKit URL / FCM when sandbox keys arrive  
3. Mark overall 🟢 after demo + remaining ⏸ items justified  

---

## Dependency map

```
Wave 0 (vendor + env)
    │
    ├──────────────────────────┐
    ▼                          ▼
Wave 1 Billing security     Wave 3 Telehealth (∥)
    │                          │
    ▼                          │
Wave 2 Quotation / Invoice     │
    │                          │
    └──────────┬───────────────┘
               ▼
        Wave 4 Messaging + Notifications
               │
               ▼
        Wave 5 Frontend
               │
               ▼
        Wave 6 Acceptance + REG (M3)
```

---

## Wave 0 — Kickoff (do first)

| ID | Task | Depends on | Status | Notes |
|---|---|---|---|---|
| **M4-0.1** | Confirm telehealth vendor: LiveKit **or** Daily/Twilio | Client | ✅ | **LiveKit** (Ahmed 2026-08-13; was Daily.co briefly) |
| **M4-0.2** | Confirm go-live Qatari gateway (PayTabs first?) + sandbox keys | Client | ✅ | Standard Test API Profile 47347 in local `.env` 2026-08-14 |
| **M4-0.3** | Set env: LiveKit + PayTabs server key / profile id / webhook secret | M4-0.1, 0.2 | ⬜ | LiveKit env vars exist; PayTabs keys when arrive |
| **M4-0.4** | Re-read `M4_SECURITY_BACKLOG.md`; treat critical items as Wave 1 | — | ✅ | |
| **M4-0.5** | Confirm tax rate / quotation categories for QAR PDFs | Client | ⬜ | |

**Wave 0 exit**

- [ ] Vendor decisions recorded  
- [ ] Sandbox credentials in local `.env`  
- [ ] Ready to code security + billing  

---

## Wave 1 — Billing security (blocking)

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M4-1.1** | Invoice create/view/send: enforce issuer/client/org ownership | `InvoiceController` | BIL8 | ✅ | Family own; coord/org same org; admin full |
| **M4-1.2** | Restrict mark-paid to admin/gateway webhook only | `InvoiceController` + routes | BIL8 | ✅ | `requireAdmin` + idempotent |
| **M4-1.3** | Validate PayTabs webhook signature / server key | `QatariPaymentService` | BIL5 | ✅ | Auth header or HMAC; amount/currency checks |
| **M4-1.4** | Booking payment verify: ownership + amount/currency match | `BookingPaymentController` | — | ✅ | + idempotent already-paid |
| **M4-1.5** | Fix self-refund atomicity / duplicates / reconciliation | `RefundService` + payment controllers | — | ✅ | Claim-before-gateway; wallet tx; Stripe idempotency key; PaymentAudit |
| **M4-1.6** | Payment method detach ownership check | `PaymentMethodController` | — | ✅ | Must be on caller's Stripe customer |

**Wave 1 exit**

- [x] Fake PayTabs webhook rejected  
- [x] Foreign invoice mark-paid → 403  
- [x] Foreign invoice view/send → 403  

---

## Wave 2 — Quotation + invoice product flow

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M4-2.1** | Auto-generate QAR quotation on Care Plan approval | `QuotationService` + approve hook | BIL1 | ✅ | Itemized from CarePlanItem; ServiceType rates; idempotent |
| **M4-2.2** | Quotation PDF export (rate, qty, subtotal, tax, total) | `InvoicePDFService` | BIL2 | ✅ | QUOTATION title; inline PDF fallback if S3 unset |
| **M4-2.3** | Family can view quotation; approve / request changes path (if required) | API + later UI | BIL1 | 🟡 | List/filter `?type=quotation` works; UI later |
| **M4-2.4** | Auto-generate invoice on session/service completion | `InvoiceService` + complete hooks | BIL3 | ✅ | Session PATCH/checkout + booking complete; idempotent |
| **M4-2.5** | Invoice lifecycle: Draft → Sent → Paid → Overdue → Disputed | state machine + invoice routes | BIL6 | ✅ | Guards on send/mark-paid/dispute; overdue cron notifies |
| **M4-2.6** | Family pay invoice via PayTabs (initiate + return URL) | `POST /invoices/:id/pay` | BIL4 | 🟡 | Sandbox keys in local env; IPN still needs a public callback URL |
| **M4-2.7** | Webhook updates payment + invoice; notifies family | webhook + NotificationService | BIL5, NOT2 | ✅ | Wave 1 webhook + overdue notify |
| **M4-2.8** | Admin service pricing master (per service type) | admin routes + UI later | — | 🧪 | Catalog rate wins; UI `/admin/pricing` |
| **M4-2.9** | Admin reconciliation dashboard API | admin | BIL7 | 🧪 | API + `/admin/payments` UI |
| **M4-2.10** | *(If credentials)* Fatora and/or Skipcash adapters | payment services | — | ⬜ | Else ⏸ / ⏭ with note |

**Wave 2 exit**

- [x] Approve care plan → quotation exists in QAR  
- [ ] Family can open quotation detail / PDF in portal UI  
- [ ] Session complete → invoice (M4-2.4)  
- [x] Complete session → invoice exists  
- [x] Family pay + webhook → Paid  *(initiate ready; live PayTabs ⏸ keys)*  
- [x] Forged webhook does not mark paid  

---

## Wave 3 — Telehealth LiveKit (∥ Parallel)

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M4-3.1** | Harden LiveKit room create/join tokens + participant checks | telehealth services | TH1 | 🧪 | Unknown room 404; foreign 403; family cannot create |
| **M4-3.2** | On appointment confirm → create room → notify | booking/session hooks | TH1, NOT3 | 🧪 | Telehealth session book provisions room + `telehealth_ready` |
| **M4-3.3** | Waiting room + staff admit flow | API + UI | TH2 | 🧪 | API smoked; family waits until staff admit; UI `M4-5A.3`/`M4-5B.1` |
| **M4-3.4** | Shared context API: plan, goals, notes for episode | episode endpoints | TH3 | 🧪 | Participants only; family no private notes / no `unitCost`; UI `M4-5B.1` |
| **M4-3.5** | Persist session notes to episode from telehealth | clinical notes link | TH4 | 🧪 | `POST .../sessions/:id/notes` + meetings; family 403; UI Wave 5 |
| **M4-3.6** | Optional recording → S3 with access controls | recording pipeline | TH5 | 🧪 | ACL smoked; live egress ⏸ until real LiveKit URL + S3 keys |
| **M4-3.7** | Telehealth consent check before join | consent engine | — | 🧪 | Family needs active `telehealth` consent; staff skip; 403 code for UI |
| **M4-3.8** | Validate LiveKit webhook signatures | `livekit-webhook.routes` | — | 🧪 | JWT + sha256 body; unsigned 401 |

**Wave 3 exit**

- [x] Family can join waiting room *(API; UI later)*  
- [x] Clinical admits and starts call *(API; UI later)*  
- [x] Side panel data available *(API; UI later)*  
- [x] Notes attach to episode *(API; UI later)*  

---

## Wave 4 — Messaging + notifications

| ID | Task | File / area | Accept # | Status | Notes |
|---|---|---|---|---|---|
| **M4-4.1** | Episode-linked conversations (`episodeId`) | chat models/API | MSG2 | 🧪 | `POST /conversations/threads`; filter `?episodeId=`; foreign 403 |
| **M4-4.2** | Read receipts + attachments | chat API | MSG1 | 🧪 | Participant-only read + file upload/download; UI Wave 5 |
| **M4-4.3** | Realtime delivery end-to-end (Socket.io **or** one chosen stack) | server + client | MSG3 | 🧪 | Cookie handshake; `new_message` / `messages_read`; UI Wave 5 |
| **M4-4.4** | Conversation types (family↔coord, family↔clinical, etc.) | chat | MSG1 | 🧪 | Role-derived types + `?type=` filter |
| **M4-4.5** | Notification events: invoice generated, payment success/fail/overdue | NotificationService | NOT1, NOT2 | 🧪 | In-app + email attempt + socket; PayTabs fail live ⏸ keys |
| **M4-4.6** | Telehealth reminder (~30 min) | cron/scheduler | NOT3 | 🧪 | Family + clinician; idempotent; meetings too |
| **M4-4.7** | FCM push send when device token present | push service | NOT4 | ⏭ | Deferred — no Firebase creds; in-app + email cover NOT1–3 |
| **M4-4.8** | Appointment booked / reminder notifications | already partial — extend | — | 🧪 | Book: `telehealth_ready` / `meeting_scheduled`; 30min is 4.6 |

**Wave 4 exit**

- [x] Family messages coordinator with realtime update  
- [x] Payment events create in-app (+ email)  
- [x] Telehealth reminder path exists or scheduled  

---

## Wave 5 — Frontend

### 5A — Family portal

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M4-5A.1** | Quotations list + detail | `/family/billing` or `/family/quotations` | 🧪 | Hub `/family/billing?tab=quotations` |
| **M4-5A.2** | Invoices list + pay button | `/family/invoices` | 🧪 | Pay 503 until PayTabs keys; UI wired |
| **M4-5A.3** | Telehealth join / waiting room | `/family/telehealth` or `/family/appointments/:id/join` | 🧪 | Consent + waiting; live video ⏸ LiveKit URL |
| **M4-5A.4** | Replace Messages placeholder | `/family/messages` | 🧪 | Shared `RoleMessagesPage`; coordinator start CTA |
| **M4-5A.5** | Notification center polish | family shell | 🧪 | Header bell + realtime + deep links (all role shells) |

### 5B — Clinical portal

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M4-5B.1** | Telehealth admit + in-call UI + side panel | `/clinical/telehealth` | 🧪 | Lobby admit + context panel; live video ⏸ LiveKit URL |
| **M4-5B.2** | Replace Messages placeholder | `/clinical/messages` | 🧪 | Shared `RoleMessagesPage` + staff start |

### 5C — Coordinator / Admin

| ID | Task | Route | Status | Notes |
|---|---|---|---|---|
| **M4-5C.1** | Coordinator messages | `/coordinator/messages` | 🧪 | Shared `RoleMessagesPage` + staff start |
| **M4-5C.2** | Admin pricing config | `/admin/pricing` | 🧪 | Catalog baseRate edit; services → pricing |
| **M4-5C.3** | Admin payment reconciliation | `/admin/payments` enhance | 🧪 | Default tab = recon; marketplace secondary |
| **M4-5C.4** | Admin invoice oversight | `/admin` billing | 🧪 | `/admin/invoices` send / mark-paid / PDF |

### 5D — Nav / shells

| ID | Task | Status | Notes |
|---|---|---|---|
| **M4-5D.1** | Add telehealth + billing nav items to `proposalRoleShells.ts` | ✅ | Family billing + video; clinical video |
| **M4-5D.2** | Remove “ships in M4” messaging placeholders | ✅ | Family / clinical / coordinator live |

**Wave 5 exit**

- [ ] Family can pay an invoice from UI *(button wired; live gateway ⏸ keys)*  
- [ ] Family + clinical can join telehealth *(family waiting + clinical admit/side panel; live video ⏸ LiveKit URL)*  
- [x] Messages pages are real (not placeholders) *(family / clinical / coordinator; support still placeholder)*  

---

## Wave 6 — Hardening & ship gate

| ID | Task | Accept # | Status | Notes |
|---|---|---|---|---|
| **M4-6.1** | Full pass/fail from `MILESTONE_FOUR.md` §6 | all | 🧪 | Map filled; live pay/video/FCM justified ⏸ |
| **M4-6.2** | M3 regression: intake → episode → care plan → delivery | REG | 🧪 | Active episode + care plans + coord care unit smoke |
| **M4-6.3** | Org routing still works for new family signup | ORG | 🧪 | Demo family has org; coord sees care unit |
| **M4-6.4** | Security retest: fake webhook + foreign invoice | BIL5, BIL8 | 🧪 | Retested 2026-08-13 |
| **M4-6.5** | Update this tracker + `MILESTONE_FOUR.md` status to 🟢 | — | 🟡 | Docs updated; overall stays 🟡 for vendor keys |
| **M4-6.6** | Client demo dry-run | — | ⬜ | Path in test guide Flow 8 — run with stakeholders |

**Wave 6 exit = Milestone 4 ready for review**

- [x] Acceptance map complete or justified ⏭ / ⏸  
- [x] REG + ORG smoked on demo data  
- [ ] Demo path walked with stakeholders (`M4-6.6`)

---

## Acceptance map (from brief)

| # | Check | Task IDs | Status |
|---|---|---|---|
| TH1 | Room create + notify on appointment confirm | M4-3.2 | 🧪 |
| TH2 | Waiting room + admit | M4-3.3, M4-5A.3, M4-5B.1 | 🧪 |
| TH3 | Side panel context | M4-3.4, M4-5B.1 | 🧪 |
| TH4 | Session notes on episode | M4-3.5 | 🧪 |
| TH5 | Recording access control | M4-3.6 | 🟡 |
| BIL1 | Quotation on care plan approval | M4-2.1 | ✅ |
| BIL2 | Quotation PDF itemized | M4-2.2 | ✅ |
| BIL3 | Invoice on session complete | M4-2.4 | ✅ |
| BIL4 | Family pays via Qatari gateway | M4-2.6, M4-5A.2 | 🟡 |
| BIL5 | Webhook secure + status update | M4-1.3, M4-2.7 | 🧪 |
| BIL6 | Invoice lifecycle | M4-2.5 | ✅ |
| BIL7 | Admin reconciliation | M4-2.9, M4-5C.3 | 🧪 |
| BIL8 | Invoice authz hardened | M4-1.1, M4-1.2 | 🧪 |
| MSG1 | Multi-party messaging | M4-4.*, M4-5A.4, M4-5B.2, M4-5C.1 | 🧪 |
| MSG2 | Episode-linked threads | M4-4.1 | 🧪 |
| MSG3 | Realtime delivery | M4-4.3 | 🧪 |
| NOT1 | Invoice generated notify | M4-4.5 | 🧪 |
| NOT2 | Payment success/fail notify | M4-2.7, M4-4.5 | 🧪 |
| NOT3 | Telehealth reminder | M4-4.6 | 🧪 |
| NOT4 | Push (or deferred note) | M4-4.7 | ⏭ |
| REG | M3 still works | M4-6.2 | 🧪 |
| ORG | Org routing still works | M4-6.3 | 🧪 |

---

## Out of scope (do not add as Todo)

| Item | Why |
|---|---|
| React Native app | M5 |
| GPS geofence productization | M5 |
| Admin analytics dashboards | M5 |
| Building LLM / AI models | Momen / done in M3 |
| Public store listing | Client (§5.2) |

---

## Daily standup cheat sheet

| Day focus | Pick |
|---|---|
| Day 1 | Wave 0 decisions + Wave 1 security |
| Backend | Wave 2 billing then Wave 3 telehealth |
| Stuck on gateway keys | Continue Wave 3 / messaging; leave pay UI ⏸ |
| Frontend day | Only after Wave 1–2 APIs for billing; Wave 3 for telehealth |

**Current “NOW” pointer** *(edit each day):*

> **NOW →** Restart API, try family Pay Now (`M4-2.6`). LiveKit / FCM still ⏸. Demo dry-run `M4-6.6`.  

---

## Quick links

| Doc | Role |
|---|---|
| `docx/MILESTONE_FOUR.md` | Spec + inventory |
| `docx/M4_TASK_TRACKER.md` | **This file** |
| `docx/MILESTONE_FOUR_TEST.md` | Manual test flows |
| `docx/M4_SECURITY_BACKLOG.md` | Billing security findings |
| `docx/Riayah_Plus_Proposal_v2.pdf` | Signed scope |

---

*Update statuses as you go. When Wave 6 exits, set Overall status to 🟢.*
