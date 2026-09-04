# Milestone 4 — Revision Tracker (Security / GDPR / HIPAA)

**Created:** 2026-09-01  
**Branch:** `milestone-4-revision` (from `landing-pages`)  
**Source of truth (audit):** `docx/M4_REVISION_FINDINGS.md`  
**Detailed evidence:** `docx/M4_SECURITY_FINDINGS.md`  
**Prior backlog:** `docx/M4_SECURITY_BACKLOG.md`  
**Auditor:** Karim Ashraf, Cyber Security Engineer  
**Audit target:** `milestone-4` (verified via `milestone-4-fetched` on 2026-08-27)  
**Overall status:** 🟢 **Revision code-complete** — Phases A (code), B, C, D done; Legal BAA signatures + Ahmed KMS still ⏸ infra  
**Last updated:** 2026-09-01  
**Rule:** Check tasks off here as you fix and verify them. Use `M4_REVISION_FINDINGS.md` for *why*; use **this file** for *what to do next*.

> **Note (2026-09-01):** **C1 / MF3** (rate limiters) are intentionally **last** — re-enabling caused request timing issues. All other Phase A items proceed first.

---

## Executive outline

Milestone 4 adds telehealth (LiveKit), invoicing, Qatari payments, AI care-plan drafting, and real-time messaging. Several **Wave 1 billing security fixes are verified**, but three **systemic regressions** dominate remaining risk:

| Theme | Risk | Finding IDs |
|---|---|---|
| **Disabled rate limiting** | Brute-force, abuse, AI flooding, webhook spam on every endpoint | C1, MF3 |
| **Unencrypted PHI/PII at rest** | Recordings, chat files, invoice PDFs, transcripts, export key fallback | H1, HP2, HP3, H7, L5 |
| **Third-party processor gaps** | No in-repo BAA/DPA register; AI/Sentry/email without consent gates | G7, G10, G11, HP8, HP10, HP11, HP12 |

### Scorecard (deduplicated)

| Dimension | Critical | High | Medium | Low/Info | Total |
|---|---:|---:|---:|---:|---:|
| Security (Phase 1) | 2 | 7 | 19 | 5 | 33 |
| GDPR / PDPL (Phase 2) | 0 | 3 | 5 | 3 | 11 |
| HIPAA (Phase 3) | 0 | 5 | 6 | 1 | 12 |
| Missing related (MF) | 0 | 0 | 4 | 0 | 4 |
| **Consolidated unique** | **2** | **15** | **34** | **9** | **49** |

### Domain risk heat map

| Domain | Combined risk | Primary IDs |
|---|---|---|
| Telehealth / recordings | **Critical** | C1, H1, H3, HP3, M12, M13, M15 |
| Auth / sessions | **Critical** | C1, C2, H4, M11, M16 |
| Payments / wallet | **Critical** | C1, C2, H6, M3–M6, MF1, MF2, MF4 |
| AI / care-plan / intake | **High** | C1, H2, HP8, G10, HP11, MF3 |
| Messaging / chat | **High** | HP2, M14, HP5 |
| Invoices / billing | **High** | M1, M3, M17, L1, L4, L5 |
| Notifications / email | **High** | HP4, M7, M15, G6 |
| Observability / logs | **High** | M7, M8, M9, M10, G5, G7, HP5, HP12 |
| Dependencies | **Medium** | M18, M19, H5 |

---

## How to use this tracker

1. Work **Phase A → B → C** in order unless marked **∥ Parallel**.  
2. Do **not** mark M4 revision complete until all **Phase A (pre-deploy)** items are 🧪 Verified.  
3. Update **Status**: `⬜ Todo` → `🟡 Doing` → `✅ Done` → `🧪 Verified`.  
4. Link PRs/commits in **Notes** when closing a finding.  
5. Re-run verification commands from `M4_REVISION_FINDINGS.md` Appendix C after each phase.

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🟡 Doing | Fix in progress |
| ✅ Done | Code/docs complete |
| 🧪 Verified | Adversarial or scripted verification passed |
| ⏸ Blocked | Needs Legal / vendor BAA / infra key |
| ✅ Fixed (M4) | Already verified fixed in audited M4 baseline |

---

## Progress snapshot

| Phase | Focus | Open | Status |
|---|---|---:|---|
| **—** | Already fixed in M4 (Wave 1) | 0 | ✅ Verified in audit |
| **A** | Pre-deploy blockers (12 active + C1 last) | **0** | ✅ Code done — BAA signatures ⏸ Legal |
| **D** | Rate limiting (C1, MF3) — **do last** | **0** | ✅ Done |
| **B** | Sprint 1 — two weeks post-deploy (10 controls) | **0** | ✅ Done |
| **C** | Sprint 2 / ongoing (16 controls) | **0** | ✅ Done |
| **∥** | Dependency CVEs (M18, M19) | **0** | ✅ Client 0 High/Critical; server moderate only (transitive) |

**Current “NOW” pointer:**

> **NOW →** **Deploy prep:** `npx prisma migrate deploy` on staging/prod · Ahmed prod KMS CMK · Legal BAA/DPA signatures on SUBPROCESSORS.md

---

## Latest progress (2026-09-01)

**Shipped in working tree** (not yet committed):

| ID | Fix | Files |
|---|---|---|
| **C2** | Stripe PM ownership on attach / setDefault / detach + audit deny | `PaymentMethodController.ts`, `StripeService.ts` |
| **H4** | Access cookie `SameSite=Strict` | `authCookies.ts` |
| **H6** | PayTabs webhooks HMAC-only (`PAYTABS_WEBHOOK_SECRET`) | `QatariPaymentService.ts` |
| **H7** | Dedicated export key; prod boot guard; no JWT fallback | `dataExportCrypto.ts`, `env.ts` |
| **H2 / G10 / HP11** | `/api/ai/public/chat` requires auth + `ai_chat` consent; output sanitized | `ai.routes.ts`, `GeminiChatService.ts`, `aiChatConsent.ts` |
| **H3** | Meeting schedule requires booking/episode + relationship gates | `MeetingSchedulerController.ts`, `meetingScheduleAccess.ts` |
| **M8** | Audit middleware logs `audit_log_failure` | `auditMiddleware.ts` |
| **H1 / HP2** | S3 KMS SSE + `ACL: private`; removed chat local-disk fallback; prod KMS boot guards | `phiS3.ts`, `TelehealthRecordingService.ts`, `ChatMessageService.ts`, `InvoicePDFService.ts`, `env.ts` |
| **HP4** | SMTP `requireTLS` + cert validation; prod TLS verify at boot | `EmailService.ts`, `app.ts` |
| **HP9** | Removed blanket admin telehealth access; org_admin org-scoped join; purpose-of-use audit | `LiveKitAccess.ts`, `careAccess.ts`, `TelehealthController.ts`, `telehealthPurposeLog.ts` |
| **M1** | Removed duplicate invoice PDF response send | `invoice.routes.ts` |
| **M3 / MF2** | Reuse pending PayTabs checkout; store `redirectUrl` on payment | `InvoiceController.ts` |
| **M4–M6 / MF1 / MF4** | Atomic wallet debit/escrow; idempotent top-up credit | `WalletService.ts`, `wallet.routes.ts`, `wallet-webhook.routes.ts` |
| **M7 / M10 / HP5** | Redact emails in mail logs; strip query strings from request logs | `EmailService.ts`, `requestLogger.ts`, `auditRedact.ts` |
| **M12** | LiveKit webhook rejects non-raw body (400) | `MeetingSchedulerController.ts` |
| **M13 / HP7** | Family telehealth context excludes all clinical notes | `TelehealthContextService.ts` |
| **M14** | Chat edit/delete requires conversation membership | `ChatController.ts` |
| **M9 / G5** | Removed user profile from `localStorage`; auth via `/me` + httpOnly cookies | `AuthContext.tsx`, `client.ts`, consumers |
| **HP3** | Encrypt `recordingTranscript` at rest (AES-256-GCM) + access audit | `recordingTranscriptCrypto.ts`, `RecordingTranscriptService.ts`, `TelehealthController.ts` |
| **M2 / C1** | PayTabs `tran_ref` Redis lock; HMAC-only webhooks (no query fallback) | `QatariPaymentService.ts`, `paytabsWebhookLock.ts` |
| **M11 / C3** | JWT default-secret guard for all non-development envs | `env.ts` |
| **M15 / G6 / C2** | Telehealth reminder emails require telehealth + email consent | `TelehealthReminderService.ts`, `communicationConsent.ts` |
| **M17 / C4** | Uniform 404 for missing vs unauthorized invoices | `InvoiceController.ts`, `invoice.routes.ts` |
| **L1 / C5** | `isBillingStaffRole` aligns org_admin billing access | `careAccess.ts`, `rbac.ts`, invoice routes |
| **L2 / C6** | Warn when PayTabs callback dropped; fatal in production | `QatariPaymentService.ts` |
| **L3 / C7** | PricingEngine fails closed on unknown catalog service | `PricingEngine.ts` |
| **L4 / C8** | Normalize `lineItems` to allowed fields only | `invoiceLineItems.ts`, `InvoiceController.ts`, `InvoiceService.ts` |
| **H5 / C16** | Removed Vite proxy `secure: false` | `client/vite.config.ts` |
| **G1 / C10** | Hash foreign user IDs in GDPR exports | `exportRedact.ts`, `PrivacyController.ts` |
| **G2 / C11** | Anonymization: random placeholder email, hard-delete messages/notifications, clear recordings | `anonymizeUser.ts` |
| **G3 / C12** | `processingRestricted` enforced on billing notifications + reminders | `BillingNotificationService.ts`, `TelehealthReminderService.ts`, `auth.ts` |
| **G8 / C13** | `retentionExpiresAt` columns + daily M4 purge cron | `schema.prisma`, `RetentionPurgeService.ts`, `scheduler.ts` — **deploy:** `npx prisma generate && npx prisma migrate deploy` (see below) |
| **M18 / C15** | Server `@sentry/node` 10.73 + `nodemailer` 9.1; client `@sentry/react` 10.73, `jspdf` 4.2, `react-router-dom` 7.18 — **0 prod CVEs on client** | `package.json` (server + client) |
| **C1 / MF3 / A1 / D** | Redis-backed rate limiters restored; `trust proxy` in prod | `rateLimiter.ts`, `app.ts` |
| **G11 / C14 / A9** | `docx/ROPA.md` + `docx/SUBPROCESSORS.md` published | `docx/` |
| **HP8 / A9** | AI care-plan payload minimized; `ai_care_plan` consent + audit | `AiCarePlanDraftService.ts`, `aiCarePlanConsent.ts` |
| **G7 / A11** | Sentry gated on cookie consent + `beforeSend` scrubbers | `sentry.ts`, `SentryProvider.tsx`, `sentryScrub.ts` |

**Tests:** Telehealth consent suite 6/6 pass. Targeted revision tests 26/26 pass (phiS3, LiveKitAccess, TelehealthRecording, TelehealthContext).

**Still open (non-code):** Ahmed prod KMS CMK (H1/HP2) · Legal BAA/DPA signatures on vendors in `SUBPROCESSORS.md`

### ⏸ Infra action — KMS key (Ahmed) — H1 / HP2

**Owner:** Ahmed (AWS / DevOps)  
**Status:** ⬜ Pending — dev uses `alias/aws/s3`; **production needs a customer-managed CMK** before deploy.  
**Code refs:** `server/src/utils/phiS3.ts`, `server/src/config/env.ts` (A3)

**Message to send Ahmed (copy/paste):**

> **Subject:** Production KMS key needed for PHI at rest (M4 security revision — H1 / HP2)
>
> Hi Ahmed,
>
> As part of the M4 security audit remediation, we’ve added KMS-backed encryption for PHI stored in S3 (telehealth recordings, chat attachments, and invoice PDFs). The application code is in place; we need your help on the AWS side before production deploy.
>
> **What we need**
>
> 1. **Create one customer-managed KMS key (CMK)** in the production AWS account/region (e.g. `me-south-1` or wherever the prod S3 bucket lives). One key is fine for all PHI buckets/paths to start.
> 2. **Enable default bucket encryption (SSE-KMS)** on the production S3 bucket(s) used for uploads, using that CMK. This is especially important for **telehealth recordings** — LiveKit egress uploads directly to S3 and relies on bucket default encryption (our app cannot set KMS headers on that path).
> 3. **Grant the API IAM role/user** permission to use the key: `kms:Encrypt`, `kms:Decrypt`, `kms:GenerateDataKey`, `kms:DescribeKey` (plus existing `s3:PutObject` / `s3:GetObject` on the bucket).
> 4. **Send back the key ARN** (e.g. `arn:aws:kms:REGION:ACCOUNT:key/...`) so we can set these production env vars (same ARN for all four is OK):
>    - `TELEHEALTH_RECORDING_KMS_KEY`
>    - `CHAT_ATTACHMENT_KMS_KEY`
>    - `INVOICE_PDF_KMS_KEY` (optional; can match the above)
>    - `AWS_KMS_KEY_ID` (optional fallback)
>
> **Notes**
>
> - **Dev/staging:** we’re using AWS’s managed alias `alias/aws/s3` — no CMK required for local work.
> - **Production:** the API **will not start** without `TELEHEALTH_RECORDING_KMS_KEY` and `CHAT_ATTACHMENT_KMS_KEY` set.
> - KMS keys are **not** the same as `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — credentials authenticate; KMS encrypts at rest.
> - Audit findings: **H1** (recordings), **HP2** (chat + invoice PDFs). Tracker: `docx/M4_REVISION_TRACKER.md` → A3.
>
> Thanks — let me know once the CMK ARN and bucket encryption are in place so we can update prod secrets and verify uploads show `ServerSideEncryption: aws:kms`.

### ⏸ Deploy action — Prisma migrations (C13 / G8)

**Owner:** Backend / DevOps  
**Status:** ⬜ Required before staging/prod deploy — migration added in working tree, **not** applied via `migrate deploy` on all environments yet.  
**Migration:** `prisma/migrations/20260901_retention_expires_at/` — adds `retentionExpiresAt` + indexes on `messages`, `notifications`, `meetings`, `sessions`, `user_sessions`, `documents`.

**Staging / production (preferred):**

```bash
cd mern/server
npx prisma generate
npx prisma migrate deploy
```

Run **`migrate deploy`** on every deploy that includes schema changes (CI/CD or release script). Do **not** use `migrate dev` on production.

**Local dev (this machine):** `migrate deploy` may fail with **P3005** if the DB was created without Prisma migration history. Options:

1. **One-off SQL** (what we used locally):
   ```bash
   cd mern/server
   npx prisma db execute --file prisma/migrations/20260901_retention_expires_at/migration.sql
   npx prisma generate
   ```
2. **Baseline** an existing DB, then use `migrate deploy` going forward: [Prisma baselining](https://www.prisma.io/docs/guides/migrate/developing-with-create-only)

**Verify after apply:**

```bash
# columns exist (PostgreSQL)
psql "$DATABASE_URL" -c '\d messages' | grep retentionExpiresAt
```

Restart the API after `prisma generate` so `RetentionPurgeService` types match the client.

## Already fixed in M4 (do not re-open)

| Backlog item | Evidence | Tracker |
|---|---|---|
| Anyone can mark any invoice as paid | `InvoiceController.markPaid` + `requireAdmin` | ✅ Fixed (M4) |
| Anyone can create invoice billed to another user | `assertCanBillClient` on store | ✅ Fixed (M4) |
| Anyone can view/send any invoice | `assertCanAccessInvoice` on show/send/pay/PDF | ✅ Fixed (M4) |
| PayTabs webhook accepted any POST | Raw body + HMAC via `PAYTABS_WEBHOOK_SECRET` (H6 fixed) | ✅ Fixed (revision) |
| Payment method attach/setDefault IDOR | Stripe `assertPaymentMethodOwnedByCustomer` + audit | ✅ Fixed (revision) |
| Refund / reconciliation races | `RefundService` atomic `updateMany WHERE status='paid'` | ✅ Fixed (M4) |

---

## Top 10 — fix first

| Rank | ID | Title | Severity | Phase | Status |
|---:|---|---|---|---|---|
| 1 | C1 | All rate limiters are passthrough no-ops | Critical | D | ✅ Done |
| 2 | C2 | Payment-method `attach`/`setDefault` lack ownership checks | Critical | A | ✅ Done |
| 3 | H1 | Telehealth recordings stored in S3 without SSE | High | A | ✅ Done |
| 4 | H2 | Public AI chat returns unsanitized LLM output | High | A | ✅ Done |
| 5 | H3 | Meeting scheduler accepts arbitrary participant/booking/episode IDs | High | A | ✅ Done |
| 6 | H4 | Access-token cookie is `SameSite=Lax` | High | A | ✅ Done |
| 7 | H6 | PayTabs webhook accepts server API key as fallback | High | A | ✅ Done |
| 8 | H7 | Export encryption key falls back to JWT secret | High | A | ✅ Done |
| 9 | HP2 | Chat attachments and invoice PDFs without SSE / local-disk fallback | High | A | ✅ Done |
| 10 | HP8 | AI care-plan draft sends episode PHI to Riayah AI without BAA | High | A | ✅ Done (code) |

---

## Phase A — Pre-deploy blockers

*Do not ship M4 without these. Maps to `M4_REVISION_FINDINGS.md` §5.1.*

| # | Roadmap | Finding(s) | Control | Primary file(s) | Owner | Status | Verification |
|---:|---|---|---|---|---|---|---|
| A1 | 1 | C1, MF3 | Restore Redis rate limiters | `rateLimiter.ts` | Platform | ✅ Done | 20× caps in dev; audit baselines in prod |
| A2 | 2 | C2 | Stripe PM ownership on attach/setDefault/detach | `PaymentMethodController.ts`, `StripeService.ts` | Backend | ✅ Done | Foreign PM → 403 + audit |
| A3 | 3 | H1, HP2, G4, L5 | KMS SSE + private ACL; remove PHI disk fallback | `phiS3.ts`, `TelehealthRecordingService.ts`, `ChatMessageService.ts`, `InvoicePDFService.ts` | Backend / Infra | ✅ Done (code) — ⏸ Ahmed: prod CMK | See **Infra action — KMS key (Ahmed)** above |
| A4 | 4 | H4 | `sameSite: 'strict'` access cookie | `authCookies.ts` | Backend | ✅ Done | |
| A5 | 5 | H6 | HMAC-only PayTabs webhooks | `QatariPaymentService.ts` | Backend | ✅ Done | |
| A6 | 6 | H7, G9 | Dedicated export key; prod boot guard | `dataExportCrypto.ts`, `env.ts` | Backend | ✅ Done | |
| A7 | 7 | H2, G10, HP11 | Auth + consent + sanitize AI output | `ai.routes.ts`, `GeminiChatService.ts` | Backend | ✅ Done | |
| A8 | 8 | H3 | Meeting schedule relationship gates | `MeetingSchedulerController.ts` | Backend | ✅ Done | |
| A9 | 9 | HP8 | Sub-processor doc + minimize AI payload | `AiCarePlanDraftService.ts`, `SUBPROCESSORS.md` | Backend / Legal | ✅ Done (code) | BAA signatures ⏸ Legal |
| A10 | 10 | HP4 | SMTP `requireTLS` + cert validation | `EmailService.ts`, `app.ts` | Backend / DevOps | ✅ Done | |
| A11 | 11 | G7, HP12 | Sentry behind consent + scrubbers | `SentryProvider.tsx`, `sentry.ts`, `sentryScrub.ts` | Frontend / Legal | ✅ Done (code) | Sentry BAA ⏸ Legal |
| A12 | 12 | HP9 | Per-permission session access + purpose logging | `LiveKitAccess.ts`, `careAccess.ts`, `TelehealthController.ts` | Backend | ✅ Done | |
| A13 | 13 | M8, HP6 | Log audit write failures | `auditMiddleware.ts` | Backend | ✅ Done | |

**Phase A exit**

- [x] 12 of 12 active controls ✅ Done (uncommitted)  
- [ ] Legal: vendor BAA/DPA signatures recorded in `SUBPROCESSORS.md`  
- [ ] Ahmed: production KMS CMK (see infra action above)  
- [ ] All done items 🧪 Verified with manual checks

---

## Phase B — Sprint 1 (within 2 weeks of deploy)

*Maps to `M4_REVISION_FINDINGS.md` §5.2.*

| # | Roadmap | Finding(s) | Control | Primary file(s) | Status | Verification |
|---:|---|---|---|---|---|---|
| B1 | 14 | M1 | Remove duplicate PDF response send | `invoice.routes.ts` | ✅ Done | No `ERR_HTTP_HEADERS_SENT`; single PDF body |
| B2 | 15 | M3, MF2 | Idempotency on invoice pay / `gatewayRef` unique constraint | `InvoiceController.ts`, `QatariPaymentService.ts` | ✅ Done | Reuses pending PayTabs session |
| B3 | 16 | M4, M5, MF1, MF4 | Atomic wallet top-up/debit/escrow (`updateMany` + count check) | `wallet.routes.ts`, `wallet-webhook.routes.ts`, `WalletService.ts` | ✅ Done | Webhook replay no double credit; no overdraft |
| B4 | 17 | M7, M10, HP5, G5 | Redact emails/tokens/query strings in logs via `auditRedact.ts` | `EmailService.ts`, `requestLogger.ts` | ✅ Done | Logs omit email and query tokens |
| B5 | 18 | M9, G5 | Remove user profile from `localStorage`; fetch `/me` on load | `AuthContext.tsx`, consumers | ✅ Done | No `user` key written; legacy cleared on boot |
| B6 | 19 | M12 | LiveKit webhook requires raw `Buffer` body | `MeetingSchedulerController.ts`, `app.ts` | ✅ Done | Parsed JSON body → 400 |
| B7 | 20 | M13, HP7 | Default telehealth context: no clinical notes for family | `TelehealthContextService.ts` | ✅ Done | Family context has no notes |
| B8 | 21 | M14 | Edit/delete requires conversation membership | `ChatController.ts` | ✅ Done | Left conversation edit → 403 |
| B9 | 22 | M16 | Remove legacy Socket.IO `query.userId` trust | `RealtimeService.ts` | ✅ Verified | JWT middleware only; no `query.userId` |
| B10 | 23 | HP3 | Encrypt `recordingTranscript` at rest + access audit | `recordingTranscriptCrypto.ts`, `RecordingTranscriptService.ts` | ✅ Done | `enc:v1:` ciphertext; `transcript_view` audit on read |

**Phase B exit**

- [x] Financial races closed (B2, B3)  
- [x] PHI logging and family note disclosure closed (B4, B7)  
- [x] Chat + realtime auth hardened (B8, B9)  
- [x] B5 localStorage profile removal  
- [x] B10 transcript encryption

---

## Phase C — Sprint 2 / ongoing

*Maps to `M4_REVISION_FINDINGS.md` §5.3.*

| # | Roadmap | Finding(s) | Control | Primary file(s) | Status |
|---:|---|---|---|---|---|
| C1 | 24 | M2 | PayTabs `tran_ref` idempotency lock | `QatariPaymentService.ts`, `paytabsWebhookLock.ts` | ✅ Done | Redis NX lock + HMAC-only webhooks |
| C2 | 25 | M15, G6 | Per-channel email/reminder consent before send | `TelehealthReminderService.ts`, `communicationConsent.ts` | ✅ Done | Skips email without telehealth + email consent |
| C3 | 26 | M11 | Default JWT secret guard for staging/test | `server/src/config/env.ts` | ✅ Done | Fatal outside `development` |
| C4 | 27 | M17 | Uniform 404 for missing vs unauthorized invoices | `InvoiceController.ts` | ✅ Done | All unauthorized → 404 |
| C5 | 28 | L1 | Align `org_admin` billing role lists | `careAccess.ts`, `invoice.routes.ts`, `rbac.ts` | ✅ Done | `isBillingStaffRole` + `requireCareCoordinator` |
| C6 | 29 | L2 | Warn/fail when PayTabs callback URL dropped | `QatariPaymentService.ts` | ✅ Done | Warn dev; fatal prod |
| C7 | 30 | L3 | Fail closed when service missing from pricing catalog | `PricingEngine.ts` | ✅ Done | Unknown service → 422 |
| C8 | 31 | L4 | Normalize `lineItems` to allowed fields only | `invoiceLineItems.ts`, services | ✅ Done | Extra JSON fields stripped |
| C9 | 32 | L5 | Explicit `ACL: private` on invoice PDF uploads | `InvoicePDFService.ts` | ✅ Done | Via `phiS3.ts` (Phase A) |
| C10 | 33 | G1 | Hash/strip foreign user IDs in data exports | `exportRedact.ts`, `PrivacyController.ts` | ✅ Done | Foreign party IDs → `user_<hmac>` |
| C11 | 34 | G2 | Hard-delete/anonymize child records after legal hold | `anonymizeUser.ts` | ✅ Done | Random email; delete messages/notifications |
| C12 | 35 | G3 | Enforce `processingRestricted` on mutating paths | `BillingNotificationService.ts`, `auth.ts` | ✅ Done | Billing + reminder skips when restricted |
| C13 | 36 | G8 | `retentionExpiresAt` + purge cron for M4 tables | `schema.prisma`, `RetentionPurgeService.ts` | ✅ Done | Daily `retention:m4-purge` cron; **run `prisma migrate deploy` on staging/prod** |
| C14 | 37 | G11, HP10 | Create `docx/ROPA.md` + `docx/SUBPROCESSORS.md` | `docx/` | ✅ Done | Legal to sign BAA column |
| C15 | 38 | M18, M19 | Patch server/client dependency CVEs | `package.json`, lockfiles | ✅ Done | Client `npm audit --omit=dev`: 0 vulns; server: moderate transitive only |
| C16 | 39 | H5 | Remove Vite proxy `secure: false` | `client/vite.config.ts` | ✅ Done | `secure: false` removed |

**Phase C exit**

- [x] RoPA + sub-processor register published (`docx/ROPA.md`, `docx/SUBPROCESSORS.md`)  
- [x] Retention jobs scheduled (`retention:m4-purge` cron)  
- [ ] **Prisma:** `cd mern/server && npx prisma generate && npx prisma migrate deploy` on staging/prod (migration `20260901_retention_expires_at`)  
- [x] Client `npm audit --omit=dev` zero High/Critical  
- [ ] Server `npm audit --omit=dev` zero High/Critical (12 moderate transitive — `uuid`/`request` via Google Cloud)

---

## Full finding register (49 unique)

*One row per deduplicated finding. Phase refs = original audit IDs.*

### Critical

| ID | Phase refs | Title | Primary file(s) | Phase | Status | Owner |
|---|---|---|---|---|---|---|
| **C1** | P1 | All rate limiters are passthrough no-ops | `rateLimiter.ts` | D | ✅ Done | Platform |
| **C2** | P1 | Payment-method `attach`/`setDefault` lack ownership checks | `PaymentMethodController.ts` | A | ✅ Done | Backend |

### High

| ID | Phase refs | Title | Primary file(s) | Phase | Status | Owner |
|---|---|---|---|---|---|---|
| **H1** | P1, G4, HP1 | Telehealth recordings in S3 without SSE | `phiS3.ts`, `TelehealthRecordingService.ts` | A | ✅ Done | Backend / Infra |
| **H2** | P1, G10, HP11 | Public AI chat unsanitized + unauthenticated | `ai.routes.ts`, `GeminiChatService.ts` | A | ✅ Done | Backend / AI |
| **H3** | P1 | Meeting scheduler arbitrary participant/booking/episode IDs | `MeetingSchedulerController.ts` | A | ✅ Done | Backend |
| **H4** | P1, P2, P3 | Access-token cookie `SameSite=Lax` | `authCookies.ts` | A | ✅ Done | Backend |
| **H5** | P1 | Vite dev proxy `secure: false` | `client/vite.config.ts` | C | ⬜ | Frontend |
| **H6** | P1 | PayTabs webhook server API key fallback | `QatariPaymentService.ts` | A | ✅ Done | Backend |
| **H7** | P1, G9 | Export encryption key falls back to JWT secret | `dataExportCrypto.ts` | A | ✅ Done | Backend |
| **HP2** | P3 | Chat attachments + invoice PDFs no SSE / disk fallback | `ChatMessageService.ts`, `InvoicePDFService.ts`, `phiS3.ts` | A | ✅ Done | Backend / Infra |
| **HP4** | P3 | SMTP does not enforce TLS / cert validation | `EmailService.ts`, `app.ts` | A | ✅ Done | Backend / DevOps |
| **HP8** | P3 | AI care-plan sends episode PHI without BAA/minimization | `AiCarePlanDraftService.ts`, `AiIntakeSummaryService.ts` | A | ⏸ | Backend / Legal |
| **HP9** | P3 | Broad admin/coordinator session access without filtering | `LiveKitAccess.ts`, `careAccess.ts` | A | ✅ Done | Backend |

### Medium

| ID | Phase refs | Title | Primary file(s) | Phase | Status | Owner |
|---|---|---|---|---|---|---|
| **M1** | P1 | Invoice PDF route double-sends response | `invoice.routes.ts` | B | ⬜ | Backend |
| **M2** | P1 | PayTabs webhook `queryTransaction` fallback when sig missing | `QatariPaymentService.ts` | C | ⬜ | Backend |
| **M3** | P1, MF2 | Invoice `pay` duplicate pending; paid payment race | `InvoiceController.ts` | B | ⬜ | Backend |
| **M4** | P1, MF1 | Stripe wallet webhook lacks atomic idempotency | `StripeService.ts` | B | ⬜ | Backend |
| **M5** | P1 | Wallet `/topup/:id/confirm` races with webhook | `wallet.routes.ts` | B | ⬜ | Backend |
| **M6** | P1, MF4 | `WalletService` overdraft under concurrency | `WalletService.ts` | B | ⬜ | Backend |
| **M7** | P1, G5 | `EmailService` logs raw recipient addresses | `EmailService.ts` | B | ⬜ | Backend |
| **M8** | P1, HP6 | `auditMiddleware` swallows audit failures | `auditMiddleware.ts` | A | ✅ Done | Backend |
| **M9** | P1, G5 | Client persists user profile in `localStorage` | `AuthContext.tsx` | B | ⬜ | Frontend |
| **M10** | P1, G5, HP5 | `requestLogger` logs full query strings | `requestLogger.ts` | B | ⬜ | Backend |
| **M11** | P1 | Default JWT secrets as dev fallbacks | `env.ts` | C | ⬜ | Backend |
| **M12** | P1 | LiveKit webhook re-serializes parsed JSON | `MeetingSchedulerController.ts` | B | ⬜ | Backend |
| **M13** | P1, HP7 | Telehealth context exposes clinical notes to family | `TelehealthContextService.ts` | B | ⬜ | Backend |
| **M14** | P1 | Chat edit/delete lacks participation check | `ChatController.ts` | B | ⬜ | Backend |
| **M15** | P1 | Telehealth reminder emails without consent check | `TelehealthReminderService.ts` | C | ⬜ | Backend |
| **M16** | P1 | Legacy Socket.IO trusts `query.userId` | `app.ts` | B | ⬜ | Backend |
| **M17** | P1 | Invoice detail leaks existence via 404/403 ordering | `InvoiceController.ts` | C | ⬜ | Backend |
| **M18** | P1 | Server deps: 37 vulns (4 High) | `server/package.json` | C | ⬜ | DevOps |
| **M19** | P1 | Client deps: 6 vulns (1 Critical, 1 High) | `client/package.json` | C | ⬜ | DevOps |
| **G1** | P2 | Data export over-collects related-user identifiers | `PrivacyController.ts` | C | ⬜ | Backend / Legal |
| **G2** | P2 | Account deletion leaves re-linkable shells | `AccountDeletionService.ts` | C | ⬜ | Backend / Legal |
| **G3** | P2 | `processingRestricted` stored but not enforced | `PrivacyController.ts`, schema | C | ⬜ | Backend |
| **G6** | P2, P3 | No consent gate before telehealth/email sends | `TelehealthReminderService.ts` | C | ⬜ | Backend / Legal |
| **G7** | P2, HP12 | Sentry loads without cookie consent | `SentryProvider.tsx`, `sentry.ts` | A | ⏸ | Frontend / Legal |
| **G8** | P2 | Retention lacks TTLs/purge jobs for most M4 data | `schema.prisma`, `scheduler.ts` | C | ⬜ | Backend / Legal |
| **G10** | P2, HP11 | Public AI without legal-basis check | `ai.routes.ts` | A | ✅ Done | Backend / Legal |
| **G11** | P2, HP10 | No RoPA / sub-processor inventory | `docx/` | C | ⏸ | Legal |
| **HP3** | P3 | Recording transcript plaintext in DB | `recordingTranscriptCrypto.ts`, `RecordingTranscriptService.ts` | B | ✅ Done | Backend |
| **HP5** | P3 | `requestLogger` logs full URLs (PHI/tokens) | `requestLogger.ts` | B | ⬜ | Backend |
| **MF1** | P1 | Stripe wallet webhook double-credit on retry | `wallet-webhook.routes.ts` | B | ⬜ | Backend |
| **MF2** | P1 | Invoice pay + PayTabs race duplicate `paid` | `InvoiceController.ts` | B | ⬜ | Backend |
| **MF3** | P1 | `publicAiLimiter` / `aiLimiter` no-ops (via C1) | `ai.routes.ts` | D | ⏸ Last | Backend |
| **MF4** | P1 | `releaseEscrow` missing escrow ≥ amount validation | `WalletService.ts` | B | ⬜ | Backend |

### Low / Info

| ID | Phase refs | Title | Primary file(s) | Phase | Status | Owner |
|---|---|---|---|---|---|---|
| **L1** | P1 | `org_admin` inconsistently treated as billing actor | `InvoiceController.ts`, routes | C | ⬜ | Backend |
| **L2** | P1 | PayTabs drops callback URL on non-public hosts | `QatariPaymentService.ts` | C | ⬜ | Backend |
| **L3** | P1 | `PricingEngine` defaults 50 QAR/hr when service missing | `PricingEngine.ts` | C | ⬜ | Backend |
| **L4** | P1 | `lineItems` JSON allows arbitrary extra fields | `QuotationService.ts` | C | ⬜ | Backend |
| **L5** | P1 | Invoice PDF S3 upload without explicit `ACL: private` | `InvoicePDFService.ts`, `phiS3.ts` | C | ✅ Done | Backend |

---

## Cross-cutting themes (checklist)

Use one fix to close multiple findings.

| Theme | Findings | Phase | Done |
|---|---|---|---|
| Real rate limiting | C1, MF3, amplifies H2/M15 | D | ✅ |
| Object-level authorization | C2, H3, M13, M14, HP7, HP9 | A–B | 🟡 C2, H3, HP9 done |
| Encryption at rest | H1, HP2, HP3, H7, L5 | A–B | ✅ H1, HP2, HP3, H7, L5 done |
| Encryption in transit / cookies | H4, HP4, H5 | A, C | 🟡 H4, HP4 done |
| Log / observability hygiene | M7, M10, HP5, G5, G7, HP12 | A–B | 🟡 M8 done |
| Atomic financial ops | M3–M6, MF1, MF2, MF4 | B | ⬜ |
| Consent / processor governance | G6, G7, G10, G11, HP8, HP10, HP11, HP12 | A, C | 🟡 G10 done |
| Audit controls | M8, HP6 | A | ✅ |
| Retention / erasure | G2, G8, HP3 | B–C | ⬜ |
| Dependency hygiene | M18, M19 | C | ⬜ |

---

## Regulatory mapping (quick reference)

| Control theme | OWASP | GDPR | HIPAA | Findings |
|---|---|---|---|---|
| Rate limiting | A07 | Art. 32 | §164.312(a)(1) | C1, MF3 |
| Object authorization | A01 | Art. 5, 25, 32 | §164.312(a)(1), §164.502(b) | C2, H3, M13, M14, HP7, HP9 |
| Encryption at rest | A02 | Art. 32 | §164.312(a)(2)(iv) | H1, HP2, HP3, H7, L5 |
| Transit / cookies | A02, A07 | Art. 32 | §164.312(e)(1) | H4, HP4, H5 |
| Log hygiene | A09 | Art. 5, 32 | §164.312(b), §164.514(b) | M7, M10, G5, G7, HP12 |
| Financial atomicity | A04, A08 | Art. 5(1)(d) | §164.312(c)(1) | M3–M6, MF1–MF4 |
| Consent / processors | A09 | Art. 6, 7, 9, 28, 30 | §164.502(e) | G6–G11, H2, HP8–HP12 |
| Audit | A09 | Art. 32 | §164.312(b) | M8, HP6 |
| Retention | — | Art. 5, 17 | §164.530(j) | G2, G8, HP3 |
| Dependencies | A06 | Art. 32 | §164.308(a)(8) | M18, M19 |

---

## Verification commands

```bash
# Rate limiters
grep -n "passthrough" server/src/middleware/rateLimiter.ts

# Payment-method ownership
# manual: attempt foreign paymentMethodId on attach/setDefault → 403

# S3 encryption
git diff main..HEAD -- server/src/services/TelehealthRecordingService.ts \
  server/src/services/ChatMessageService.ts server/src/services/InvoicePDFService.ts

# Cookie SameSite
git diff main..HEAD -- server/src/utils/authCookies.ts

# PayTabs webhook
git diff main..HEAD -- server/src/services/QatariPaymentService.ts

# Export key
git diff main..HEAD -- server/src/utils/dataExportCrypto.ts

# AI auth + sanitization
git diff main..HEAD -- server/src/routes/ai.routes.ts server/src/services/GeminiChatService.ts

# Meeting scheduler
git diff main..HEAD -- server/src/controllers/telehealth/MeetingSchedulerController.ts

# Sentry consent
git diff main..HEAD -- client/src/components/SentryProvider.tsx client/src/lib/sentry.ts

# Dependency audits
cd server && npm audit --omit=dev
cd client && npm audit --omit=dev
```

---

## Quick links

| Doc | Role |
|---|---|
| `docx/M4_REVISION_FINDINGS.md` | Consolidated audit report (executive + roadmap) |
| `docx/M4_REVISION_TRACKER.md` | **This file** — remediation checklist |
| `docx/M4_SECURITY_FINDINGS.md` | Per-finding evidence and code snippets |
| `docx/M4_SECURITY_BACKLOG.md` | Original M4 billing security backlog |
| `docx/M4_TASK_TRACKER.md` | M4 feature delivery tracker (separate) |
| `docx/MILESTONE_FOUR.md` | M4 product spec |

---

## Revision ship gate

Milestone 4 revision is **ready for re-audit** when:

- [ ] Phase A: all 13 pre-deploy controls 🧪 Verified  
- [ ] Phase B: all 10 sprint-1 controls 🧪 Verified  
- [ ] Phase C: legal docs (RoPA, SUBPROCESSORS) published or ⏸ waived in writing  
- [ ] Full register: zero **Critical** / **High** remain open (or accepted risk register signed)  
- [ ] Adversarial re-check scheduled against `milestone-4-revision`

---

*Update statuses as fixes land. When the ship gate is green, set Overall status to 🟢.*
