# Milestone 4 — Security, GDPR, and HIPAA Consolidated Review

**Prepared by:** Karim Ashraf, Cyber Security Engineer  
**Project:** Riayah Plus  
**Target:** `milestone-4` (audited via local ref `milestone-4-fetched`)  
**Base:** `main`  
**Repository:** `https://github.com/ahsan-dev-404/riayah_plus.git`  
**Review date:** 2026-08-27  
**Scope:** 385 source files changed in M4, excluding `client/dist/` build artifacts  
**Methodology:** Read-only static source review against `main..milestone-4-fetched`. No live traffic, no code edits.

<!-- prettier-ignore -->
> [!IMPORTANT]
> This is the Phase 4 consolidated deliverable. It synthesizes the Phase 1 security audit, the Phase 2 GDPR/PDPL review, and the Phase 3 HIPAA review into a single executive-facing report. The detailed per-phase findings remain in `docx/M4_SECURITY_FINDINGS.md`. All findings were adversarially verified on 2026-08-27 against the read-only `milestone-4-fetched` source.

---

## 1. Executive Summary

Milestone 4 introduces major care-platform capabilities — telehealth (LiveKit), invoicing, Qatari payments, AI-assisted care-plan drafting, and real-time messaging — while hardening several severe pre-existing billing and auth gaps. The adversarial re-check confirmed that the highest-priority backlog items from `M4_SECURITY_BACKLOG.md` are now enforced: invoice ownership, mark-paid admin gating, PayTabs webhook signatures, and payment-method detach ownership.

The remaining risk is dominated by **three systemic regressions** that affect every role and endpoint in M4:

1. **All server-side rate limiters are disabled.** A passthrough no-op removes brute-force, abuse, and volume protection from auth, OTP, payments, AI chat, telehealth, webhooks, and document upload.
2. **ePHI and personal data are stored unencrypted at rest.** Telehealth recordings, chat attachments, invoice PDFs, and the recording transcript column lack server-side encryption or a local-disk fallback that bypasses encryption entirely.
3. **Third-party processors are used without a demonstrable BAA/DPA inventory.** AI providers, observability tools, payment gateways, and messaging vendors flow health data without an in-repo sub-processor register or consent gate.

These issues are not isolated bugs; they are architectural controls that M4 left partially implemented or explicitly disabled. Until they are fixed, the platform cannot safely process PHI under HIPAA or personal data under GDPR/PDPL.

### 1.1 Risk scorecard

| Dimension | Critical | High | Medium | Low/Info | Total |
|---|---:|---:|---:|---:|---:|
| **Security (Phase 1)** | 2 | 7 | 19 | 5 | 33 |
| **GDPR / PDPL (Phase 2)** | 0 | 3 | 5 | 3 | 11 |
| **HIPAA (Phase 3)** | 0 | 5 | 6 | 1 | 12 |
| **Missing related findings (MF)** | 0 | 0 | 4 | 0 | 4 |
| **Total raw findings** | **2** | **15** | **34** | **9** | **60** |

After cross-phase deduplication, the consolidated register contains **49 unique findings** (11 findings map to more than one regulatory frame). The rest of this report focuses on the deduplicated set.

### 1.2 Consolidated severity map

| Severity | Count | Examples |
|---|---|---|
| **Critical** | 2 | Disabled rate limiters; payment-method attach/setDefault IDOR |
| **High** | 15 | Unencrypted recordings/attachments; unsanitized public AI output; arbitrary meeting scheduling; `SameSite=Lax` access cookie; PayTabs server-key fallback; export key fallback; SMTP TLS not enforced; AI PHI disclosure without BAA; Sentry without consent/scrubbing; legacy Socket.IO bypass |
| **Medium** | 34 | Invoice PDF double-send; PayTabs replay; duplicate pending payments; wallet race/overdraft; PII in logs; localStorage profile; audit-log failure swallowing; retention gaps; family note over-disclosure; chat edit/delete auth; dependency CVEs |
| **Low / Info** | 9 | Org_admin route mismatch; Vite TLS bypass; pricing default; line-item JSON pollution; public AI unthrottled |

### 1.3 Fixed in M4 (verified)

| Backlog item | Evidence |
|---|---|
| Anyone can mark any invoice as paid | `InvoiceController.markPaid` re-checks `isAdminRole`; route uses `requireAdmin` |
| Anyone can create an invoice billed to another user | `InvoiceController.store` calls `assertCanBillClient` |
| Anyone can view or send any invoice | `assertCanAccessInvoice` used across `show`, `send`, `pay`, `confirmPay`, `dispute`, PDF |
| PayTabs webhook accepted any POST | `wallet-webhook.routes.ts` forwards raw body; `hasWebhookSignature` checks server key or HMAC (server-key fallback still remains as High H6) |
| Payment method detach lacked ownership | `PaymentMethodController.detach` now lists customer methods and rejects unknown IDs |
| Refund / reconciliation races | `RefundService` uses atomic `updateMany WHERE status='paid'` |

### 1.4 What "world-class" means for this report

A world-class security and compliance report is:

- **Grounded.** Every claim maps to a specific file, line, and code snippet in `milestone-4-fetched`.
- **Prioritized.** Fix order is driven by exploitability, blast radius, and regulatory exposure, not severity alone.
- **Cross-regulatory.** The same control failure is traced through OWASP, GDPR Article, and HIPAA Rule citations so remediation fixes multiple obligations at once.
- **Honest.** False positives are removed, over-stated findings are narrowed, and missing related findings are added.
- **Actionable.** Each remediation names the exact file, function, or env var to change and describes a verification test.
- **Executive-readable.** Technical detail lives in appendices; the front pages give a decision-ready risk picture.

---

## 2. Top 10 Findings (Prioritized by Exploitability and Regulatory Exposure)

These are the issues that should be fixed first. Each is cross-referenced to its full entry in the detailed sections.

| # | ID | Title | Severity | Why it is in the top 10 | Regulatory frames |
|---|---|---|---|---|---|
| 1 | **C1** | All rate limiters are passthrough no-ops | Critical | Removes abuse protection from every endpoint; enables credential stuffing, invoice probing, AI prompt flooding, and webhook replay spam. | OWASP A07; GDPR Art. 32; HIPAA §164.312(a)(1) |
| 2 | **C2** | Payment-method `attach`/`setDefault` lack ownership checks | Critical | Any user can attach another user's Stripe payment method to their own account. | OWASP A01 (IDOR); PCI-DSS intent; HIPAA §164.312(a)(1) |
| 3 | **H1** | Telehealth recordings stored in S3 without SSE | High | Video/audio of care sessions contains PHI; plaintext S3 objects expose mass PHI on bucket misconfiguration or key leak. | GDPR Art. 32; HIPAA §164.312(a)(2)(iv), §164.312(e)(2)(ii) |
| 4 | **H2** | Public AI chat returns unsanitized LLM output | High | Prompt-injection → stored/reflected XSS; combined with no rate limiting, unauthenticated attackers can flood and phish users. | OWASP A03; GDPR Art. 32; HIPAA §164.312(c)(1) |
| 5 | **H3** | Meeting scheduler accepts arbitrary participant/booking/episode IDs | High | Any authenticated user can schedule sessions with any other user and join linked telehealth rooms. | OWASP A01; GDPR Art. 5, 32; HIPAA §164.502(b) |
| 6 | **H4** | Access-token cookie is `SameSite=Lax` | High | Cross-site top-level navigations carry the bearer token; state-changing GETs become CSRF-enablers. | OWASP A07; GDPR Art. 32; HIPAA §164.312(e)(1) |
| 7 | **H6** | PayTabs webhook accepts server API key as fallback | High | Same secret used for API calls authenticates webhooks; leaked server key → forged payment events. | OWASP A02/A09; PCI-DSS intent |
| 8 | **H7** | Export encryption key falls back to JWT secret | High | GDPR export security depends on JWT signing key; rotation breaks exports, compromise exposes all stored exports. | GDPR Art. 32; HIPAA §164.312(a)(2)(iv) |
| 9 | **HP2** | Chat attachments and invoice PDFs stored without SSE / local-disk fallback | High | PHI-bearing files uploaded to S3 unencrypted; fallback writes to local `uploads/chat/` without encryption. | GDPR Art. 32; HIPAA §164.312(a)(2)(iv) |
| 10 | **HP8** | AI care-plan draft sends episode-level PHI to Riayah AI without BAA or minimization | High | DOB, diagnoses, meds, history, and assessment findings flow to an undocumented sub-processor. | GDPR Art. 5, 6, 9; HIPAA §164.502(e), §164.514(d) |

---

## 3. Cross-Cutting Themes

Several failures recur across multiple domains. Fixing the theme once closes several findings at once.

### 3.1 Disabled or bypassed protective controls

- **Rate limiting (C1).** Every `*Limiter` export in `server/src/middleware/rateLimiter.ts` is a passthrough. This amplifies the impact of H2 (public AI XSS), MF3 (all AI endpoints unthrottled), H3 (meeting abuse), M15 (reminder spam), and every brute-force/IDOR vector.
- **Cookie `SameSite=Lax` (H4).** The access token is sent on cross-site top-level navigations, undermining CSRF protection that is otherwise present on the refresh token.
- **Default JWT secrets (M11).** `env.ts` falls back to `change-me-*` secrets except in `production`, leaving dev/staging/test instances forgeable.

### 3.2 Unencrypted or minimally protected personal data at rest

- **S3 uploads without SSE/KMS/ACL (H1, HP1, HP2, G4, L5).** Recordings, chat attachments, and invoice PDFs rely on bucket defaults. If the bucket policy drifts, data is exposed.
- **Local-disk fallback for chat attachments (HP2).** When S3 is not configured, PHI files are written to `uploads/chat/` on the server filesystem.
- **Plaintext recording transcript column (HP3).** `sessions.recordingTranscript` will store spoken PHI in PostgreSQL without encryption.
- **Export key fallback (H7 / G9).** Exports derive their AES-256-GCM key from the JWT secret when `DATA_EXPORT_ENCRYPTION_KEY` is unset.

### 3.3 PHI/PII leakage in observability, logs, and client storage

- **Full URLs in request logs (M10, HP5).** `requestLogger` logs `originalUrl`, including query strings that may contain tokens, reset codes, or emails.
- **Email addresses in `EmailService` error logs (M7, G5).** The `to` field is logged on failure.
- **User profile in `localStorage` (M9, G5).** Name, email, phone, role, and organization survive XSS and are readable by any same-origin script.
- **Sentry without scrubbing or consent (G7, HP12).** Server and client Sentry initialize without `beforeSend` redaction and without reading the cookie-consent flag.

### 3.4 Race conditions and missing atomic claims on financial flows

- **Wallet top-up double-credit (M4, M5, MF1).** Stripe webhook and client `confirm` both credit `WalletService` without an atomic `WHERE status='pending'` claim.
- **Invoice duplicate pending payments (M3).** Every `pay` call creates a new `pending` payment row.
- **Duplicate paid payments via webhook/confirm race (MF2).** `gatewayRef` is not protected by a unique constraint or idempotency lock.
- **Wallet overdraft / negative escrow (M6, MF4).** `debit`, `holdEscrow`, and `releaseEscrow` check balance before decrementing without an atomic guard.

### 3.5 Over-disclosure and minimum-necessary failures

- **Telehealth context notes to family (M13, HP7).** Non-private clinical notes are returned to family participants by default.
- **Blanket admin/coordinator session access (HP9).** `isAdminRole` grants full session/telehealth context access without field-level filtering or purpose-of-use logging.
- **AI prompts carry full episode PHI (HP8).** No field-level minimization or documented BAA.

### 3.6 Third-party processor governance gaps

- **No in-repo BAA/DPA inventory (G11, HP10).** Stripe, PayTabs, LiveKit, AWS S3, Google Gemini, Sentry, Riayah AI, Firebase, SMTP, and WhatsApp are not documented as approved processors.
- **Public AI chat unauthenticated (H2, G10, HP11).** Health disclosures may reach Google Gemini without consent or BAA.
- **Sentry loads without consent (G7, HP12).** Analytics/observability processor bypasses the cookie-consent banner.

---

## 4. Consolidated Finding Register (Deduplicated)

This register lists each unique finding once, with the original Phase 1/2/3 identifiers mapped. Full evidence and code snippets are in `docx/M4_SECURITY_FINDINGS.md`; only the key facts are repeated here.

| ID | Phase refs | Title | Severity | Primary file(s) | Status | Remediation owner |
|---|---|---|---|---|---|---|
| C1 | Phase 1 | All rate limiters are passthrough no-ops | Critical | `server/src/middleware/rateLimiter.ts` | New / regression | Platform / DevOps |
| C2 | Phase 1 | Payment-method `attach`/`setDefault` lack ownership checks | Critical | `server/src/controllers/payments/PaymentMethodController.ts` | New | Backend |
| H1 | P1, P2 G4, P3 HP1 | Telehealth recordings stored in S3 without SSE | High | `server/src/services/TelehealthRecordingService.ts` | New | Backend / Infra |
| H2 | P1, P2 G10, P3 HP11 | Public AI chat returns unsanitized LLM output, unauthenticated | High | `server/src/routes/ai.routes.ts`, `server/src/services/GeminiChatService.ts` | New | Backend / AI |
| H3 | Phase 1 | Meeting scheduler accepts arbitrary participant/booking/episode IDs | High | `server/src/controllers/telehealth/MeetingSchedulerController.ts` | New | Backend |
| H4 | P1, P2 cross-check, P3 | Access-token cookie is `SameSite=Lax` | High | `server/src/utils/authCookies.ts` | Present | Backend |
| H5 | Phase 1 | Vite dev proxy disables TLS verification (`secure: false`) | High | `client/vite.config.ts` | New / dev | Frontend |
| H6 | Phase 1 | PayTabs webhook accepts server API key as Authorization fallback | High | `server/src/services/QatariPaymentService.ts` | Partially fixed | Backend |
| H7 | P1, P2 G9 | Data-export encryption key falls back to JWT secret | High | `server/src/utils/dataExportCrypto.ts` | Present | Backend |
| HP2 | Phase 3 | Chat attachments and invoice PDFs stored without SSE / local-disk fallback | High | `server/src/services/ChatMessageService.ts`, `server/src/services/InvoicePDFService.ts` | New | Backend / Infra |
| HP4 | Phase 3 | SMTP email delivery does not enforce TLS or validate certificates | High | `server/src/services/EmailService.ts` | Present | Backend / DevOps |
| HP8 | Phase 3 | AI care-plan draft sends episode-level PHI to Riayah AI without BAA or minimization | High | `server/src/services/AiCarePlanDraftService.ts`, `server/src/services/AiIntakeSummaryService.ts` | New | Backend / Legal |
| HP9 | Phase 3 | Broad `isAdminRole` / coordinator access grants full episode data without filtering | High | `server/src/services/LiveKitAccess.ts`, `server/src/utils/careAccess.ts` | Present | Backend |
| M1 | Phase 1 | Invoice PDF route double-sends response | Medium | `server/src/routes/invoice.routes.ts` | New | Backend |
| M2 | Phase 1 | PayTabs webhook falls back to `queryTransaction` when signature missing | Medium | `server/src/services/QatariPaymentService.ts` | Partially fixed | Backend |
| M3 | Phase 1, MF2 | Invoice `pay` creates duplicate pending payments; paid payment race | Medium | `server/src/controllers/billing/InvoiceController.ts` | New | Backend |
| M4 | Phase 1, MF1 | Stripe `onPaymentIntentSucceeded` lacks atomic idempotency for wallet top-ups | Medium | `server/src/services/StripeService.ts` | Present | Backend |
| M5 | Phase 1 | Wallet `/topup/:id/confirm` is client-driven and races with webhook | Medium | `server/src/routes/wallet.routes.ts` | Present | Backend |
| M6 | Phase 1, MF4 | `WalletService.debit` / `holdEscrow` allow overdraft under concurrency | Medium | `server/src/services/WalletService.ts` | Present | Backend |
| M7 | P1, P2 G5 | `EmailService` logs raw recipient addresses | Medium | `server/src/services/EmailService.ts` | New | Backend |
| M8 | P1, P3 HP6 | `auditMiddleware` silently swallows audit-log failures | Medium | `server/src/middleware/auditMiddleware.ts` | New | Backend |
| M9 | P1, P2 G5 | Client persists user profile in `localStorage` | Medium | `client/src/contexts/AuthContext.tsx` | Present | Frontend |
| M10 | P1, P2 G5, P3 HP5 | `requestLogger` logs full query strings | Medium | `server/src/middleware/requestLogger.ts` | New / present | Backend |
| M11 | Phase 1 | Default JWT secrets exist as dev fallbacks | Medium | `server/src/config/env.ts` | Present | Backend |
| M12 | Phase 1 | LiveKit webhook handler re-serializes parsed JSON when raw body unavailable | Medium | `server/src/controllers/telehealth/MeetingSchedulerController.ts` | New | Backend |
| M13 | P1, P3 HP7 | Telehealth context exposes clinical notes to family participants | Medium | `server/src/services/TelehealthContextService.ts` | New | Backend |
| M14 | Phase 1 | Chat message edit/delete lacks conversation participation check | Medium | `server/src/controllers/chat/ChatController.ts` | New | Backend |
| M15 | Phase 1 | Telehealth reminder emails send PII without consent check | Medium | `server/src/services/TelehealthReminderService.ts` | New | Backend |
| M16 | Phase 1 | Legacy Socket.IO handler trusts `query.userId` | Medium | `server/src/app.ts` | Present | Backend |
| M17 | Phase 1 | Invoice detail endpoint leaks existence via 404/403 ordering | Medium | `server/src/controllers/billing/InvoiceController.ts` | New | Backend |
| M18 | Phase 1 | Server dependency audit: 37 vulnerabilities, 4 High | Medium | `server/package.json`, `server/package-lock.json` | Present | DevOps |
| M19 | Phase 1 | Client dependency audit: 6 vulnerabilities, 1 Critical, 1 High | Medium | `client/package.json`, `client/package-lock.json` | Present | DevOps |
| G1 | Phase 2 | Data export over-collects related-user identifiers despite strong encryption | Medium | `server/src/controllers/privacy/PrivacyController.ts` | Hardened | Backend / Legal |
| G2 | Phase 2 | Account deletion anonymization leaves re-linkable operational shells | Medium | `server/src/services/AccountDeletionService.ts`, `server/src/utils/anonymizeUser.ts` | Partially implemented | Backend / Legal |
| G3 | Phase 2 | `processingRestricted` flag is stored but never enforced | Medium | `server/src/controllers/privacy/PrivacyController.ts`, `server/prisma/schema.prisma` | New | Backend |
| G6 | P2, P3 consent cross-check | No consent gate before sending telehealth reminders or other emails | Medium | `server/src/services/TelehealthReminderService.ts`, `server/src/services/EmailService.ts` | New | Backend / Legal |
| G7 | P2, P3 HP12 | Sentry initializes in production regardless of cookie-consent choice | Medium | `client/src/components/SentryProvider.tsx`, `client/src/lib/sentry.ts` | Confirmed | Frontend / Legal |
| G8 | Phase 2 | Retention is partially designed but lacks explicit TTLs and purge jobs for most M4 data | Medium | `server/prisma/schema.prisma`, `server/src/cron/scheduler.ts` | Partially implemented | Backend / Legal |
| G10 | P2, P3 HP11 | Public AI chat endpoint processes personal data without legal-basis check | Medium | `server/src/routes/ai.routes.ts`, `server/src/services/GeminiChatService.ts` | New | Backend / Legal |
| G11 | P2, P3 HP10 | No Record of Processing Activities or sub-processor inventory | Medium | `docx/`, `server/.env.example`, `client/.env.example` | Present | Legal / Compliance |
| HP3 | Phase 3 | Recording transcript stored as plaintext in the database | Medium | `server/prisma/migrations/20260818_telehealth_recording_transcript/migration.sql` | New | Backend |
| HP5 | Phase 3 | `requestLogger` logs full request URLs (PHI/tokens) | Medium | `server/src/middleware/requestLogger.ts` | Present | Backend |
| MF1 | Phase 1 | Stripe wallet webhook `/stripe/webhook` also double-credits on retry | Medium | `server/src/routes/wallet-webhook.routes.ts` | New | Backend |
| MF2 | Phase 1 | Invoice `pay` and PayTabs webhook can race to create duplicate `paid` payments | Medium | `server/src/controllers/billing/InvoiceController.ts`, `server/src/services/QatariPaymentService.ts` | New | Backend |
| MF3 | Phase 1 | `publicAiLimiter` and `aiLimiter` are no-ops everywhere | Medium | `server/src/routes/ai.routes.ts` | Regression via C1 | Backend |
| MF4 | Phase 1 | `WalletService.releaseEscrow` does not validate escrow >= amount | Medium | `server/src/services/WalletService.ts` | New | Backend |
| L1 | Phase 1 | `org_admin` is inconsistently treated as a billing actor | Low | `server/src/controllers/billing/InvoiceController.ts`, `server/src/routes/invoice.routes.ts`, `server/src/middleware/auth.ts` | Partially fixed | Backend |
| L2 | Phase 1 | `QatariPaymentService.initiatePayment` silently drops callback URL on non-public hosts | Low | `server/src/services/QatariPaymentService.ts` | New | Backend |
| L3 | Phase 1 | `PricingEngine` defaults to 50 QAR/hr when service missing from catalog | Low | `server/src/services/PricingEngine.ts` | New | Backend |
| L4 | Phase 1 | Invoice/quotation `lineItems` JSON persists arbitrary extra fields | Low | `server/src/services/QuotationService.ts`, `server/src/services/InvoiceService.ts` | New | Backend |
| L5 | Phase 1 | `InvoicePDFService` uploads to S3 without explicit `ACL: 'private'` | Low | `server/src/services/InvoicePDFService.ts` | Present | Backend |

---

## 5. Prioritized Remediation Roadmap

The roadmap is grouped by when the fix must land relative to an M4 deploy. Each item includes the consolidated ID(s), the control to implement, and a concrete verification step.

### 5.1 Pre-deploy blockers (do not ship M4 without these)

| # | Finding | Control to implement | Verification |
|---|---|---|---|
| 1 | C1 | Replace passthrough limiters with real Redis-backed `express-rate-limit` exports. Minimum baselines: login/OTP 5/15min, public AI 30/5min, AI 60/5min, API 100/1min, webhooks 50/1min. | Run `grep -n "passthrough" server/src/middleware/rateLimiter.ts` and confirm zero matches. Hit `/api/ai/public/chat` 31 times in 5 min from one IP and receive 429. |
| 2 | C2 | In `PaymentMethodController.attach` and `setDefault`, list the caller's Stripe payment methods and reject `paymentMethodId` not in that set. Log to `AuditService`. | Attempt to set an unrelated payment method as default; expect 403. Check audit log contains `payment_method_set_default_denied`. |
| 3 | H1, HP2, G4 | Enable KMS SSE (`aws:kms`) and `ACL: 'private'` on all S3 uploads for recordings, chat attachments, and invoice PDFs. Remove local-disk fallback for PHI-bearing uploads. Refuse startup if `TELEHEALTH_RECORDING_KMS_KEY` or `CHAT_ATTACHMENT_KMS_KEY` is unset in production. | Inspect uploaded object headers: `ServerSideEncryption` must be `aws:kms`. Disable S3 config in dev; chat attachment upload must fail closed, not fall back to disk. |
| 4 | H4 | Change access-token cookie to `sameSite: 'strict'` in `authCookies.ts`. | Read `Set-Cookie` on login; `access_token` cookie must have `SameSite=Strict`. |
| 5 | H6 | Remove server-key Authorization fallback in `QatariPaymentService.hasWebhookSignature`. Require `PAYTABS_WEBHOOK_SECRET`. Fail closed if unset. | Send webhook with `Authorization: <PAYTABS_SERVER_KEY>`; expect 401. Send with valid webhook secret; expect 200. |
| 6 | H7, G9 | Refuse startup if `DATA_EXPORT_ENCRYPTION_KEY` is unset. Remove JWT fallback in `dataExportCrypto.ts`. | Run server without `DATA_EXPORT_ENCRYPTION_KEY`; expect fatal error during bootstrap. |
| 7 | H2, G10, HP11 | Require authentication and explicit consent before accepting health-related public AI chat. Sanitize AI output before persistence and delivery. | POST to `/api/ai/public/chat` without session cookie; expect 401. Inject `<script>alert(1)</script>` prompt; response must not contain executable HTML. |
| 8 | H3 | In `MeetingSchedulerController`, verify at least one relationship gate: `bookingId` → caller is `clientId`/`providerId`; `episodeId` → `assertEpisodeAccess`; otherwise reject. | Attempt to schedule a meeting linked to another user's booking; expect 403. |
| 9 | HP8 | Document Riayah AI as a sub-processor in `docx/SUBPROCESSORS.md` with BAA/DPA status. Minimize AI payload: exclude DOB, full medical history, and raw assessment findings unless required. Add `aiProcessingAuthorization` record. | Review `AiCarePlanDraftService.buildCarePlanPayloadFromEpisode`; DOB and full history must not be present. Check database has `aiProcessingConsent` rows. |
| 10 | HP4 | Add `requireTLS: true` and `tls: { rejectUnauthorized: true }` to `nodemailer.createTransport`. Refuse production startup if TLS cannot be negotiated. | Capture SMTP handshake with `tcpdump`/proxy; STARTTLS must be required and cert validated. |
| 11 | G7, HP12 | Gate Sentry initialization behind `window.__RAIYAH_ANALYTICS__ === true` on client; add `beforeSend`/`beforeSendTransaction` scrubbers on server and client. Confirm Sentry BAA or replace. | Choose "Essential only" in cookie banner; no Sentry network requests. Trigger exception with email in request body; Sentry payload must not contain the email. |
| 12 | HP9 | Replace blanket `isAdminRole` session access with per-permission checks. Add purpose-of-use logging. | Join a telehealth session as `org_admin` unrelated to the episode; expect 403 or field-redacted response. |
| 13 | M8, HP6 | Alert on audit-log write failures. Never silently drop. | Temporarily break audit DB write path; expect `logger.error('audit_log_failure')` and a health metric increment. |

### 5.2 Sprint 1 (fix within two weeks of deploy)

| # | Finding | Control to implement | Verification |
|---|---|---|---|
| 14 | M1 | Remove duplicated header/send block in `invoice.routes.ts` PDF handler. | Request invoice PDF; no `ERR_HTTP_HEADERS_SENT` in logs; response has single PDF body. |
| 15 | M3, MF2 | Add unique constraint on `(invoiceId, gatewayRef, status)` or idempotency lock; prevent duplicate pending and paid payments. | Click "Pay" twice rapidly; only one pending payment row. Replay webhook with same `gatewayRef`; only one paid payment row. |
| 16 | M4, M5, MF1, MF4 | Make wallet top-up/debit/escrow atomic. Use `updateMany WHERE status='pending' AND balance >= amount` and check `updated.count === 1`. | Replay Stripe webhook event ID twice; second receives 200 but does not credit. Concurrent debits cannot overdraft. |
| 17 | M7, M10, HP5, G5 | Redact `to`, `originalUrl` query params, emails, and national IDs before logging. Route logs through `auditRedact.ts`. | Trigger email failure and request with token in query string; logs must not contain email or token. |
| 18 | M9, G5 | Remove user profile and profile drafts from `localStorage`. Fetch `/me` on app load. | Inspect `localStorage` after login; no `user` or `careseeker_profile_draft` entries. |
| 19 | M12 | Harden LiveKit webhook raw-body handling. Assert `req.body` is `Buffer`; reject 400 if not. | Register `express.raw({ type: '*/*' })` before JSON parser for `/api/livekit/webhook`. Send JSON-parsed body; expect 400. |
| 20 | M13, HP7 | Default telehealth context to no clinical notes for family participants. Add explicit permission/audit if context is required. | Join as family role; context response contains no notes. |
| 21 | M14 | Load message with conversation participants and verify membership before edit/delete. | Attempt to edit a message from a conversation the user left; expect 403. |
| 22 | M16 | Remove legacy `io.on('connection')` handler that trusts `query.userId`. Rely on JWT-verified `attachRealtime`. | Connect Socket.IO with `?userId=<victim>` and no valid JWT; expect no room joins. |
| 23 | HP3 | Encrypt `recordingTranscript` at rest before writing. Add access audit. | Column must be ciphertext. Read transcript as family/coordinator; audit log records access. |

### 5.3 Sprint 2 / ongoing

| # | Finding | Control to implement | Verification |
|---|---|---|---|
| 24 | M2 | Add `tran_ref` idempotency lock for PayTabs webhooks. | Replay same `tran_ref` within lock TTL; second request is rejected or no-ops. |
| 25 | M15, G6 | Read per-channel consent flags before sending reminders/emails. Store granular consent with purpose, timestamp, version. | User with `emailConsent=false` receives no reminder email. |
| 26 | M11 | Extend default-secret guard to `staging`, `test`, and all non-development environments. | Start server in `staging` with default JWT secrets; expect fatal error. |
| 27 | M17 | Return uniform 404 for both non-existent and unauthorized invoices on detail endpoints. | Probe random invoice IDs; all return 404 regardless of existence. |
| 28 | L1 | Align `org_admin` role lists: add to `COORDINATOR_ROLES` or remove from billing write helpers. | `org_admin` can consistently create/send invoices, or consistently cannot. |
| 29 | L2 | Log warning when PayTabs callback is dropped; throw in production if callback required but suppressed. | Set non-public `BACKEND_URL`; expect warning in dev, fatal in production. |
| 30 | L3 | Fail closed in `PricingEngine` if service is missing from catalog. | Request quotation with unknown `serviceType`; expect 422. |
| 31 | L4 | Normalize line items before persistence, keeping only allowed fields. | POST extra fields in `lineItems`; response/persistence contains only allowed fields. |
| 32 | L5 | Add `ACL: 'private'` and bucket-owner-enforced to invoice PDF uploads. | Public bucket access test on invoice PDF key returns 403. |
| 33 | G1 | Strip or hash foreign-user identifiers in data exports. | Export messages/bookings; no `receiverId`/`clientId`/`providerId` in plaintext. |
| 34 | G2 | After legal hold, hard-delete or fully anonymize deleted-user child records. Use random placeholders, sever join keys. | Soft-deleted user older than 30 days has no re-linkable foreign keys. |
| 35 | G3 | Enforce `processingRestricted` across mutating services and communications. | User with `processingRestricted=true` cannot create booking or receive marketing reminder. |
| 36 | G8 | Add `retentionExpiresAt` columns and purge jobs for messages, notifications, invoices, payments, meetings, recordings, user sessions, expired documents, and orphan exports. | Cron jobs exist and tests confirm expired rows are purged. |
| 37 | G11, HP10 | Create `docx/ROPA.md` and `docx/SUBPROCESSORS.md` with DPA/BAA status, data categories, and safeguards. | Reviewers can open docs and confirm every third-party processor is listed with BAA flag. |
| 38 | M18, M19 | Patch server and client dependency CVEs. Re-run `npm audit --omit=dev` until zero High/Critical reachable. | `npm audit --omit=dev` shows no High/Critical in `dependencies`. |
| 39 | H5 | Remove `secure: false` from Vite dev proxy. Document that dev proxy must not point at production/staging. | `client/vite.config.ts` proxy has no `secure` key. |

---

## 6. Regulatory Mapping Matrix

Use this matrix to demonstrate that a single control change can satisfy multiple obligations.

| Control theme | OWASP | GDPR Article | HIPAA Rule | Findings addressed |
|---|---|---|---|---|
| Real rate limiting | A07 | Art. 32 | §164.312(a)(1) | C1, MF3, H2 amplification, M15 amplification |
| Object-level authorization | A01 | Art. 5, 25, 32 | §164.312(a)(1), §164.502(b) | C2, H3, M13, M14, HP7, HP9 |
| Encryption at rest | A02 | Art. 32 | §164.312(a)(2)(iv), §164.312(e)(2)(ii) | H1, HP1, HP2, HP3, G4, L5, H7/G9 |
| Encryption in transit / cookie security | A02, A07 | Art. 32 | §164.312(e)(1) | H4, HP4, H5 |
| Log/observability hygiene | A09 | Art. 5(1)(c), 32 | §164.312(b), §164.530(c), §164.514(b) | M7, M10, HP5, G5, G7, HP12 |
| Atomic financial operations | A04, A08 | Art. 5(1)(d) | §164.312(c)(1) | M3, M4, M5, M6, MF1, MF2, MF4 |
| Consent / processor governance | A09 | Art. 6, 7, 9, 28, 30 | §164.502(e), §164.504(e) | G6, G7, G10, G11, H2, HP8, HP10, HP11, HP12 |
| Audit controls | A09 | Art. 5(1)(d), 32 | §164.312(b) | M8, HP6 |
| Retention / erasure | — | Art. 5(1)(e), 17 | §164.530(j) | G2, G8, HP3 |
| Dependency hygiene | A06 | Art. 32 | §164.308(a)(8) | M18, M19 |

---

## 7. Adversarial Verification Statement

All Phase 1, Phase 2, and Phase 3 findings were re-checked against the read-only `milestone-4-fetched` source on 2026-08-27.

- **Phase 1:** 33 findings reviewed. 4 corrections applied (C2 scope narrowed, M16 origin clarified, M19 dependency relationship corrected, L1 reworded). 4 missing related findings added (MF1–MF4).
- **Phase 2:** 11 findings reviewed. 4 findings were narrowed after verification because controls originally reported absent were found to exist: export encryption/re-auth/TTL, scheduled anonymization, and partial retention design. None were removed as false positives; all were re-grounded in actual M4 source.
- **Phase 3:** 12 findings derived manually from telehealth, messaging, AI, audit, email, and infrastructure source. Where the same issue was already reported in Phase 1 or 2, it was re-framed with HIPAA-specific rule citations rather than duplicated.
- **Consolidation:** 60 raw findings were deduplicated into 49 unique findings. Severity labels were preserved from their source phases. No severities were downgraded to close findings.

No code edits were performed during this review.

---

## 8. Appendices

### Appendix A — Detailed finding sources

| This report ID | Location in `docx/M4_SECURITY_FINDINGS.md` |
|---|---|
| Phase 1 (C*, H*, M*, L*, MF*) | Sections 1–6 and §9–§10 |
| Phase 2 (G*) | Sections "Phase 2 — GDPR / PDPL Compliance Review" through "Phase 2 Adversarial Verification Notes" |
| Phase 3 (HP*) | Sections "Phase 3 — HIPAA Compliance Review" through "Phase 3 Adversarial Verification Notes" |

### Appendix B — Glossary

| Term | Meaning in this report |
|---|---|
| BAA | Business Associate Agreement (HIPAA) |
| DPA | Data Processing Addendum / Agreement (GDPR) |
| DPIA | Data Protection Impact Assessment |
| ePHI | Electronic Protected Health Information |
| IDOR | Insecure Direct Object Reference |
| KMS | AWS Key Management Service |
| OWASP | Open Web Application Security Project Top 10 |
| PDPL | Qatar Personal Data Privacy Law |
| PHI | Protected Health Information |
| RoPA | Record of Processing Activities (GDPR Art. 30) |
| SSE | Server-Side Encryption |
| TLS | Transport Layer Security |

### Appendix C — Verification commands

```bash
# Verify rate limiters are real, not passthroughs
git diff main..milestone-4-fetched -- server/src/middleware/rateLimiter.ts

# Verify payment-method ownership
git diff main..milestone-4-fetched -- server/src/controllers/payments/PaymentMethodController.ts

# Verify S3 encryption settings for recordings/attachments/PDFs
git diff main..milestone-4-fetched -- server/src/services/TelehealthRecordingService.ts server/src/services/ChatMessageService.ts server/src/services/InvoicePDFService.ts

# Verify cookie SameSite
git diff main..milestone-4-fetched -- server/src/utils/authCookies.ts

# Verify PayTabs webhook secret handling
git diff main..milestone-4-fetched -- server/src/services/QatariPaymentService.ts

# Verify export encryption key
git diff main..milestone-4-fetched -- server/src/utils/dataExportCrypto.ts

# Verify AI output sanitization and public endpoint auth
git diff main..milestone-4-fetched -- server/src/routes/ai.routes.ts server/src/services/GeminiChatService.ts

# Verify meeting scheduler relationship checks
git diff main..milestone-4-fetched -- server/src/controllers/telehealth/MeetingSchedulerController.ts

# Verify Sentry consent gating and scrubbers
git diff main..milestone-4-fetched -- client/src/components/SentryProvider.tsx client/src/lib/sentry.ts server/src/app.ts

# Run dependency audits
cd server && npm audit --omit=dev
cd client && npm audit --omit=dev
```

### Appendix D — Risk heat map by M4 domain

| Domain | Security | GDPR | HIPAA | Combined risk |
|---|---|---|---|---|
| Telehealth / recordings | Critical | High | High | **Critical** |
| Payments / wallet | Critical | Medium | Medium | **Critical** |
| AI / care-plan / intake | High | High | High | **High** |
| Auth / sessions | Critical | High | Medium | **Critical** |
| Messaging / chat | High | High | High | **High** |
| Invoices / billing | High | Medium | Medium | **High** |
| Notifications / email | Medium | High | Medium | **High** |
| Observability / logs | Medium | High | High | **High** |
| Dependencies | Medium | Medium | Low | **Medium** |

---

*End of consolidated Milestone 4 review.*
