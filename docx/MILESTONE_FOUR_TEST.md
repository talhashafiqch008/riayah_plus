# Milestone 4 — Website & API Test Guide

**Created:** 2026-08-12  
**Spec:** `docx/MILESTONE_FOUR.md`  
**Task tracker:** `docx/M4_TASK_TRACKER.md`  
**Security backlog:** `docx/M4_SECURITY_BACKLOG.md`  
**How to use:** Run flows **after** linked task IDs are ✅ / 🧪. If a flow says **Not built yet**, skip until that wave ships.

---

## Before you test

### URLs

| Service | URL |
|---|---|
| Client | `http://localhost:5173` |
| API | `http://localhost:5001` |

```bash
cd server && npm run dev
cd client && npm run dev
```

### Credentials

```
Password (all roles): Password123!
```

| Role | Email | Portal |
|---|---|---|
| Admin | `admin@riayahplus.com` | `/admin` |
| Coordinator | `coordinator@riayahplus.com` | `/coordinator` |
| Family | `family@demo.com` | `/family` |
| Clinical | `clinical@demo.com` | `/clinical` |
| Support | `support@demo.com` | `/support` |

### Test status legend

| Tag | Meaning |
|---|---|
| 🟢 | Ready to test (when task done) |
| 🟡 | Partial — API only or legacy UI |
| 🔴 | Not built yet |

**Baseline (2026-08-13):** Wave 1 billing security smoked. Telehealth product path = **LiveKit** (client confirmed). Prefer API smoke until Wave 5 UI lands.

---

## Recommended test order

```
1. REG / ORG — M3 + org routing still green
2. SEC        — Billing security (webhook + invoice authz)
3. BIL*       — Quotation → invoice → pay
4. TH*        — Telehealth join / waiting room / notes
5. MSG*       — Messaging + realtime
6. NOT*       — Payment + telehealth notifications
7. Full E2E demo (all roles)
```

---

## Flow 0 — M3 + Org regression (always first)

**Accept:** `REG`, `ORG`  
**Tasks:** `M4-6.2`, `M4-6.3`  
**Status:** 🧪 smoked 2026-08-13 — demo family has org; active episode + care plans; coordinator care unit list

### 0.1 Org routing still works

1. Create or use a family account  
2. Admin assigns organization  
3. Coordinator in that org sees intake  

**Pass:** Care request is not a black hole.

### 0.2 Care plan path still works

1. Coordinator creates episode + care plan → submit  
2. Family approve  
3. Support can see tasks  

**Pass:** M3 delivery path unchanged.

---

## Flow 1 — Billing security (do before payment demo)

**Accept:** `BIL5`, `BIL8`  
**Tasks:** `M4-1.1`–`M4-1.3`  
**Status:** 🧪 retested 2026-08-13 — foreign GET/mark-paid **403**; forged PayTabs webhook does not mark paid (503 when keys unset); unsigned LiveKit webhook **401**

### 1.1 Foreign invoice cannot be marked paid

1. Login as family A  
2. Attempt `POST` mark-paid on family B’s invoice  

**Pass:** `403`. Invoice unchanged.

### 1.2 Foreign invoice cannot be viewed/sent

1. Login as unrelated user  
2. `GET /api/invoices/:id` for another user’s invoice  

**Pass:** `403` / `404`.

### 1.3 Forged PayTabs webhook rejected

1. `POST` fake success payload to PayTabs webhook **without** valid signature  

**Pass:** Rejected; invoice not Paid.

### 1.4 Valid webhook marks paid

1. Complete sandbox payment (or signed test payload)  

**Pass:** Invoice → Paid; payment record stored; family notified (when NOT wired).

---

## Flow 2 — Quotation on care plan approval

**Accept:** `BIL1`, `BIL2`  
**Tasks:** `M4-2.1`, `M4-2.2`  
**Status:** 🟢 API smoked 2026-08-13 (approve → QAR quotation + PDF download)

### 2.1 Website (when UI ready)

1. Coordinator submits care plan; family **Approves**  
2. Family opens Quotations / Billing  

**Pass:**

- Quotation exists in **QAR**  
- Line items match care plan services  
- PDF downloads with rate, qty, subtotal, tax, total  

### 2.2 API smoke

```bash
# After family approves care plan <PLAN_ID>, list quotations/invoices for family
curl -s -b /tmp/family.txt "http://localhost:5001/api/invoices" | jq .
```

**Pass:** Quotation/invoice object created post-approval with QAR amounts.

---

## Flow 3 — Invoice on session completion + family pay

**Accept:** `BIL3`, `BIL4`, `BIL6`  
**Tasks:** `M4-2.4`–`M4-2.7`, `M4-5A.2`  
**Status:** 🟢 3.1 API smoked 2026-08-13 · 🔴 UI / PayTabs pay (`BIL4`) pending keys

### 3.1 Session complete → invoice

1. Complete a booked session (in-person or telehealth)  
2. Check invoices for that family/episode  

**Pass:** Invoice auto-created; status Draft or Sent per product rules.

### 3.2 Family pays via portal

1. Login family → Invoices  
2. Open unpaid invoice → **Pay**  
3. Complete PayTabs (or chosen gateway) sandbox checkout  

**Pass:**

- Redirect/return succeeds  
- Webhook sets Paid  
- Transaction reference stored  

*(UI wired 2026-08-13 at `/family/billing`; Pay now without sandbox keys → 503. Live checkout ⏸ keys.)*  

### 3.3 Lifecycle

1. Send invoice → Sent  
2. Leave unpaid past due date → Overdue (or cron)  
3. Dispute path if implemented → Disputed  

**Pass:** Status transitions follow state machine; illegal jumps rejected.

---

## Flow 4 — Admin pricing + reconciliation

**Accept:** `BIL7`  
**Tasks:** `M4-2.8`, `M4-2.9`, `M4-5C.*`  
**Status:** 🟡 API + admin UI 2026-08-13 — `/admin/pricing`, `/admin/payments` recon, `/admin/invoices`

### 4.1 Pricing master

1. Admin sets price for a service type (`PATCH /api/admin/services/:id`)  
2. New quotation uses backend price (not client-submitted unit cost alone)  

**Pass:** Tampered client price cannot underpay. *(smoked: `unitCost: 1` vs catalog 99 → QUO 103.95 QAR; family 403 on admin services)*

### 4.2 Reconciliation

1. Admin opens `GET /api/admin/payments/reconciliation`  
2. Paid invoices match gateway settlement entries; mismatches listed  

**Pass:** Mismatches visible; paid set reconciles. *(smoked: family 403; unmatched paid invoice flagged; matching PayTabs payment listed)*

---

## Flow 5 — Telehealth

**Accept:** `TH1`–`TH5`  
**Tasks:** `M4-3.*`, `M4-5A.3`, `M4-5B.1`  
**Status:** 🟡 Tokens + webhook + waiting/admit/side-panel UI smoked 2026-08-13 — live video ⏸ LiveKit URL

### 5.0 Token + webhook security

1. Family `POST /api/telehealth/token` for an unknown room → **404**  
2. Family token/createRoom for another family's session → **403**  
3. Unsigned `POST /api/livekit/webhook` → **401**  
4. Valid LiveKit webhook JWT → **200**

**Pass:** Strangers cannot mint room tokens; forged webhooks ignored.

### 5.0b Digital consent before join

1. Family without `telehealth` consent calls `POST /api/telehealth/token`  
2. Grant `POST /api/client/consents` `{ "consentType": "telehealth" }` then retry  

**Pass:** Missing/revoked consent → **403** `telehealth_consent_required`; after grant, token issues. Clinical join is not blocked. *(smoked 2026-08-13)*

### 5.1 Appointment → room + notify

1. Coordinator books a **telehealth** session (`POST /api/scheduling/sessions`)  
2. Confirm appointment (status `accepted` on create)  

**Pass:** Room created; family + clinician notified; join room name present. *(smoked 2026-08-13: `livekitRoomId` set; `telehealth_ready`; family token 200; in-person skips room)*

### 5.2 Waiting room + admit

1. Family opens join (`POST /api/telehealth/token`) → `phase=waiting`  
2. Clinical `GET /api/telehealth/sessions/:id/lobby` then `POST .../admit`  

**Pass:** Family cannot enter full call until admit. *(smoked 2026-08-13: waiting `__waiting` room; family lobby/admit 403; after admit `phase=in_call`. UI: `/family/telehealth` waiting; `/clinical/telehealth` lobby+admit; live video ⏸ LiveKit URL.)*

### 5.3 Side panel context

1. During call, open side panel  
2. `GET /api/telehealth/sessions/:id/context` as family and as clinician  

**Pass:** Active care plan, goals, prior notes visible. *(smoked 2026-08-13: episode + plan + goals; items have no `unitCost`; family public notes only; foreign family 403; clinical UI side panel 2026-08-13)*

### 5.4 Session notes

1. Clinical `POST /api/telehealth/sessions/:id/notes` during/after call  
2. Coordinator lists notes on the episode  

**Pass:** Note linked to episode; visible to coordinator. *(smoked 2026-08-13: 201 + `episodeId`; family/foreign 403; clinical UI note form on `/clinical/telehealth/:id`)*

### 5.5 Recording (if enabled)

1. Clinical `POST /api/telehealth/sessions/:id/recording/start`  
2. After `egress_ended` webhook, participant `GET .../recording`  

**Pass:** Recording URL stored; unauthorized user cannot download. *(smoked 2026-08-13: family start 403; start without LiveKit/S3 → 503 `recording_unavailable`; participant GET 200; foreign 403. Live S3 egress ⏸ vendor.)*

---

## Flow 6 — Messaging

**Accept:** `MSG1`–`MSG3`  
**Tasks:** `M4-4.1`–`M4-4.4`, `M4-5A.4`  
**Status:** 🟡 family + clinical + coordinator UI live; APIs smoked (threads, receipts, types, realtime)

### 6.1 Family ↔ coordinator

1. Family `/family/messages` → open/create thread with coordinator  
2. Send message  
3. Coordinator sees it (realtime or refresh per stack)  

**Pass:** Message persists; correct participants only. *(smoked 2026-08-13: family → coordinator text; foreign 403; receipts + attachments in 6.1b; family UI `/family/messages` 2026-08-13)*

### 6.1b Read receipts + attachments

1. Coordinator `POST /api/conversations/:id/read` after receiving a message  
2. Family `POST /api/conversations/:id/messages` with multipart `file`  

**Pass:** Message `status=read` + `readAt`; attachment downloadable by participants only. *(smoked 2026-08-13)*

### 6.2 Episode-linked thread

1. `POST /api/conversations/threads` `{ participantId, episodeId }` from an episode  
2. `GET /api/conversations?episodeId=`  

**Pass:** `episodeId` associated; filterable by episode. *(smoked 2026-08-13: type=episode; idempotent; coordinator sees it; foreign family 403; family UI start-thread 2026-08-13)*

### 6.2b Conversation types

1. Family opens a thread with coordinator vs clinician on the same episode  
2. `GET /api/conversations?type=family_clinical`  

**Pass:** Types are `family_coordinator` / `family_clinical` / `coordinator_clinical`; filter matches. *(smoked 2026-08-13)*

### 6.3 Realtime

1. Two browsers; send message  

**Pass:** Appears without full page reload (or documented polling interim). *(smoked 2026-08-13: coordinator cookie socket received `new_message` + `messages_read`; unsigned `connect_error unauthorized`; family UI subscribes on `/family/messages`)*

---

## Flow 7 — Notifications

**Accept:** `NOT1`–`NOT4`  
**Tasks:** `M4-4.5`–`M4-4.7`  
**Status:** 🟡 in-app + email attempt + role-shell bell UI; FCM open

### 7.1 Invoice generated

**Pass:** Family gets in-app + email when invoice created/sent. *(smoked 2026-08-13: `invoice_generated` / `invoice_sent` + realtime `notification`; email attempted; SMTP may be unset locally)*

### 7.2 Payment success / fail

**Pass:** Family notified on webhook outcome. *(smoked 2026-08-13: `payment_received` on mark-paid; `invoice_overdue` via job; PayTabs fail path in code, live ⏸ keys)*

### 7.3 Telehealth reminder

**Pass:** Reminder ~30 minutes before session (or documented schedule). *(smoked 2026-08-13: family + clinician `telehealth_reminder`; 2nd run 0 extras; cron every minute, 30±5 min window)*

### 7.4 Push (optional)

1. Register device token  
2. Trigger payment/invoice event  

**Pass:** Push received **or** marked ⏭ with Firebase credential note. *(2026-08-13: ⏭ — no Firebase creds; in-app + email cover billing/telehealth events)*

---

## Flow 8 — Full client demo (E2E)

**When:** Wave 6  

| Step | Role | Action |
|---|---|---|
| 1 | Family | Care request (org assigned) |
| 2 | Coordinator | Review → episode → care plan → family approve |
| 3 | System | Quotation generated (QAR) |
| 4 | Clinical | Telehealth session with waiting room + notes |
| 5 | System | Invoice on session complete |
| 6 | Family | Pay invoice via Qatari gateway |
| 7 | Family / Coord | Message about care |
| 8 | Admin | See paid invoice in reconciliation |
| 9 | All | Confirm M3 delivery path still works |

**Pass:** No placeholder pages on critical path; acceptance map 🧪.

---

## Acceptance checklist (sign-off)

| # | Test | Flow | Pass | Fail | Date |
|---|---|---|---|---|---|
| REG | M3 care path | 0.2 | 🧪 | | 2026-08-13 |
| ORG | Org routing | 0.1 | 🧪 | | 2026-08-13 |
| BIL8 | Invoice authz | 1.1–1.2 | 🧪 | | 2026-08-13 |
| BIL5 | Webhook security | 1.3–1.4 | 🧪 | live signed pay ⏸ | 2026-08-13 |
| BIL1 | Quotation on approval | 2 | ✅ | | 2026-08-13 |
| BIL2 | Quotation PDF | 2 | ✅ | | 2026-08-13 |
| BIL3 | Invoice on session complete | 3.1 | ✅ | | 2026-08-13 |
| BIL4 | Family pay | 3.2 | 🟡 | PayTabs keys | |
| BIL6 | Lifecycle | 3.3 | ✅ | | 2026-08-13 |
| BIL7 | Reconciliation | 4.2 | 🧪 | | 2026-08-13 |
| TH1 | Room + notify | 5.1 | 🧪 | | 2026-08-13 |
| TH2 | Waiting room + admit | 5.2 | 🧪 | live video ⏸ | 2026-08-13 |
| TH3 | Side panel | 5.3 | 🧪 | | 2026-08-13 |
| TH4 | Session notes | 5.4 | 🧪 | | 2026-08-13 |
| TH5 | Recording ACL | 5.5 | 🟡 | live egress ⏸ | 2026-08-13 |
| MSG1 | Messaging | 6.1 | 🧪 | | 2026-08-13 |
| MSG2 | Episode link | 6.2 | 🧪 | | 2026-08-13 |
| MSG3 | Realtime | 6.3 | 🧪 | | 2026-08-13 |
| NOT1 | Invoice notify | 7.1 | 🧪 | | 2026-08-13 |
| NOT2 | Payment notify | 7.2 | 🧪 | live fail ⏸ | 2026-08-13 |
| NOT3 | Telehealth reminder | 7.3 | 🧪 | | 2026-08-13 |
| NOT4 | Push | 7.4 | ⏭ | no Firebase | 2026-08-13 |

---

## What not to demo as finished M4

| Surface | Why |
|---|---|
| Live video / recording egress | Needs real `LIVEKIT_URL` + S3 keys |
| Family PayTabs checkout success | Needs PayTabs sandbox keys (UI shows clear 503) |
| FCM push | Deferred — no Firebase credentials (`NOT4` ⏭) |
| Careseeker/provider retired billing pages | Not proposal role shells |

---

## Quick links

| Doc | Purpose |
|---|---|
| `docx/MILESTONE_FOUR.md` | Scope + inventory |
| `docx/M4_TASK_TRACKER.md` | Build order |
| `docx/MILESTONE_FOUR_TEST.md` | **This file** |
| `docx/M4_SECURITY_BACKLOG.md` | Must-fix billing security |
| `docx/CARE_PLATFORM_FULL_FLOW.md` | End-to-end product story |

---

*Update flow tags as tasks complete in `M4_TASK_TRACKER.md`.*
