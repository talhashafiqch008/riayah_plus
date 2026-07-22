# GDPR Compliance Audit Report — Milestone 2

**Generated:** 2026-07-21
**Audited by:** Karim Ashraf — Security Auditor & Reviewer
**Target branch:** `milestone-2` (commit `161a3a9`)
**Scope:** Source-code review of M2 privacy, consent, retention, and erasure surfaces. Security findings are intentionally excluded and referenced from `docx/M2_SECURITY_REVIEW.md`.

> **Remediation tracker:** `docx/M2_GDPR_REMEDIATION.md`  
> **DPIA (G-13):** `docx/M2_DPIA.md`  
> Engineering remediations for demo-blocking items shipped 2026-07-22 — see tracker for Fixed / Deferred.

---

## Executive Summary

This report is a **pure source-code review** of M2's GDPR-relevant surfaces. No dynamic/manual testing artifacts are included. All findings are backed by exact file paths and line numbers verified against the current branch. Findings that overlap with the M2 security review (authz bypass, XSS, file upload, ATO, etc.) are referenced rather than duplicated.

**Top-line verdict:** M2 introduces several concrete privacy improvements over M1: the `CookieConsentBanner`, the `POST /api/privacy/restrict-processing` endpoint, the `User.processingRestricted` flag, and a 30-day anonymization cron job. However, the improvements remain incomplete. The processing-restriction flag is written but never read (no callers or query sites outside its own definition in the source), the consent log and metadata are now populated correctly, and retention jobs exist only for OTP and refresh tokens. Core governance gaps from M1 (DPO, DPIA, ROPA, DB encryption, breach notification, cookie categorization) persist unchanged.

No code changes were made to produce this report.

---

## M2 Improvements Over M1

| # | Area | M1 State | M2 State | Evidence |
|---|---|---|---|---|
| 1 | **Cookie consent banner** | Non-existent | Implemented (essential only / accept all) | `client/src/components/CookieConsentBanner.tsx:11-77` |
| 2 | **Right to restriction of processing** | No endpoint | `POST /api/privacy/restrict-processing` exists | `server/src/controllers/privacy/PrivacyController.ts:95-124` |
| 3 | **`processingRestricted` flag** | Absent | Added to `User` model | `server/prisma/schema.prisma:317` |
| 4 | **Account deletion / erasure** | Soft delete only | Soft delete + scheduled anonymization after 30 days | `server/src/cron/scheduler.ts:354-375`, `server/src/utils/anonymizeUser.ts:5-38` |
| 5 | **Consent log population** | Never written | Now written on grant and revoke | `server/src/controllers/caremanagement/ConsentController.ts:57-65`, `86-95` |
| 6 | **Consent metadata capture** | Never populated | Now sets `documentVersion`, `deviceFingerprint`, `ipAddress`, `signatureStatus` | `server/src/controllers/caremanagement/ConsentController.ts:31-55` |
| 7 | **Right of access (download)** | Inline JSON | Returns JSON as downloadable attachment | `server/src/controllers/privacy/PrivacyController.ts:40-43` |
| 8 | **Deleted-account status checks** | Only in login | Now in `authenticate` and `getUserFromRequest` | `server/src/middleware/auth.ts:57-69`, `146-148` |
| 9 | **`requireAdmin` backdoor** | Present (`x-admin-request`) | Removed | `server/src/middleware/rbac.ts:70-87` |

---

## M2 Data Handling Inventory

The following table inventories M2 surfaces that process personal data, mapped to GDPR data categories and evaluated against a GDPR data-handling compliance checklist (lawful basis/consent, purpose limitation, retention, data-subject rights). Findings are based on controller and Prisma model inspection.

| # | Surface | Personal Data Categories | Lawful Basis / Consent | Retention | DSR / Subject Rights | Status |
|---|---|---|---|---|---|---|
| D-1 | `UserProfileController` (`PUT /api/user/profile`, `PUT /api/client/profile`) | Basic PII (name, phone, avatar) | Implicit contract | Indefinite | Rectification exists; no erasure beyond soft delete | ⚠️ Partial |
| D-2 | `RegistrationController` (`POST /api/register`) | Basic PII | Pre-consent creation | Indefinite | No DSAR integration | ⚠️ Partial |
| D-3 | `CareRecipientController` (`/care-recipients`) | Basic PII + health data (special category) | No explicit consent recorded for care recipient | Indefinite | No DSAR integration | ⚠️ Partial |
| D-4 | `CareUnitController.createPatient` (`/care-units/:id/patients`) | Basic PII + health data (diagnosis codes, medical info) | No consent captured per patient | Indefinite | No DSAR integration | ❌ Non-compliant |
| D-5 | `IntakeController.submit` (`/api/intake`) | Special-category health data (diagnoses, meds, history, caregiver contacts) | `privacy`/`treatment` consents recorded for family user; recipient themselves may not have consented | Indefinite | Not included in data export | ⚠️ Partial |
| D-6 | `CareEpisodeController` (`/api/episodes`) | Special-category health data (episode medical history, diagnoses, intake summary) | `consentGiven` Boolean but no version/timestamp | Indefinite | Not included in data export | ⚠️ Partial |
| D-7 | `AssessmentController` (`/api/assessments`) | Special-category health data (findings, recommendations, notes) | No per-assessment consent | Indefinite | Not included in data export | ⚠️ Partial |
| D-8 | `ClinicalNote` model (unwired in M2) | Special-category health data | N/A — no routes/controllers | Indefinite | N/A | ❌ Non-compliant |
| D-9 | `AiIntakeSummary` (created on episode/intake) | AI-derived clinical inferences | No separate consent for automated processing of health data | Indefinite | Not included in data export | ❌ Non-compliant |
| D-10 | `DocumentController.uploadFile` (`/upload`) | Identity documents, medical records | No purpose-specific consent; no MIME allowlist (see M2 security review) | Indefinite | Included in data export | ⚠️ Partial |
| D-11 | `ChatController.store` (`/api/chat`) | Message content, sender/receiver metadata | Implicit contract | Indefinite | Included in data export (sent messages only) | ⚠️ Partial |
| D-12 | `BookingPaymentController.initiatePayment` | Financial data, PII shared with Stripe/PayTabs | Contract + payment processor necessity | Indefinite | Payments included in export | ⚠️ Partial |
| D-13 | `InvoiceController.store` | Billing data, client/episode linkage | Contract | Indefinite | Invoices not in data export | ⚠️ Partial |
| D-14 | `EmergencyController.raise` (`/api/emergency`) | Precise geolocation + health context | Vital interests / contract | Indefinite | Not in data export; no retention limit | ❌ Non-compliant |
| D-15 | `CareMatchingController.findProviders` | Provider profiles + careseeker needs (scored) | Contract; automated scoring flagged under Art 22 | Indefinite | Matching history retained | ⚠️ Partial |
| D-16 | `FamilyMember` model | Contact data, emergency status | No consent for updates; `canReceiveUpdates` not enforced | Indefinite | Not in data export | ⚠️ Partial |
| D-17 | `GpsLog` model (M5, schema present) | Precise continuous location | No purpose or retention defined | None | Not in data export | ❌ Non-compliant |
| D-18 | `NotificationService.create` | Notification content + metadata | Implicit service communication | Indefinite | Notifications included in export | ⚠️ Partial |
| D-19 | `WhatsAppService.sendText` | Phone number + message content | Contract/necessary communication; no opt-out per message type | Indefinite (`WhatsAppMessage`) | WhatsApp messages not in export | ⚠️ Partial |

**Summary:** Of 19 M2 data-handling surfaces, **0 are fully compliant**, **14 are partially compliant**, and **5 are non-compliant**. The dominant gaps are: missing retention schedules, missing DSAR coverage for special-category data, no per-purpose consent capture, no lawful-basis registry, PII in URLs, over-inclusion in API responses, and absence of encryption.

**Engineering-specific gaps identified via GDPR engineering criteria:**
- No `RetentionExpiresAt` columns are defined for any personal data table.
- No column-level or database-at-rest encryption is implemented.
- A phone number appears in a URL path (`/api/whatsapp/admin/messages/:phone`), which leaks PII into access logs and browser history.
- Error logging includes stack traces that can expose internal paths and potentially PII.
- Audit `before`/`after` snapshots persist full health records (e.g., `CareRecipient` snapshots in `CareUnitController`).
- API responses include more data than necessary (e.g., `CareEpisodeController.show` returns full `patient` and `careRecipient` objects; `AssessmentController` returns assessor/patient email addresses).

---

## M2-Specific GDPR Gaps

### G-1 — Processing restriction flag is set but never honored (Article 18)

**Severity:** High

**Evidence:**
- `User.processingRestricted` is defined in the schema at `server/prisma/schema.prisma:317`.
- `POST /api/privacy/restrict-processing` toggles the flag at `server/src/controllers/privacy/PrivacyController.ts:95-124`.
- Source-code search for `restrictProcessing` returns only the method definition; there are zero callers or query sites outside `PrivacyController`.

**Gap:** A data subject can invoke the right to restriction, but the system continues to process their data as normal. For example, bookings, messages, notifications, and analytics are not gated by the flag.

**Recommended fix:** Add a middleware or service-layer check that returns `409 Conflict` (or a suitable response) for mutating/processing operations when `processingRestricted === true`, with explicit carve-outs where processing is necessary to establish, exercise, or defend legal claims.

---

### G-2 — Account deletion only blocks active bookings, not other obligations (Article 17)

**Severity:** High

**Evidence:**
- `PrivacyController.requestAccountDeletion` checks only `booking.status IN ['pending', 'accepted', 'in_progress']` at `server/src/controllers/privacy/PrivacyController.ts:56-59`.
- `UserProfileController.destroy` at `server/src/controllers/users/UserProfileController.ts:116-127` exposes a second deletion route (`DELETE /api/user`, `server/src/routes/auth.routes.ts:92`) that performs the soft delete without any active-obligation check.
- Neither path checks for open invoices, unresolved disputes, pending payouts, active care episodes, or assessments in progress.

**Gap:** Data required for legal/tax/accounting obligations may be erased prematurely, or conversely, deletion may proceed while contractual obligations are unresolved.

**Recommended fix:** Expand the active-obligation check to include invoices, payouts, disputes, care episodes, and assessments. Return a clear list of blocking items to the user instead of a generic error.

---

### G-3 — Anonymization is incomplete and leaves related PHI intact (Article 17)

**Severity:** High

**Evidence:**
- `anonymizeUser` renames the user and nulls `phone`, `avatar`, `twoFactorSecret`, and some client/provider profile fields at `server/src/utils/anonymizeUser.ts:5-38`.
- `anonymizeUser` is invoked only by `server/src/cron/scheduler.ts:368` and the `UserProfileController.anonymizeDeletedUser` wrapper at `server/src/controllers/users/UserProfileController.ts:130-132`.
- It does **not** touch related records: `Booking`, `Message`, `Notification`, `Document`, `Review`, `ClinicalNote`, `CareRecipient`, `IntakeRecord`, `CareEpisode`, `Assessment`, `Invoice`, `Payment`, `WhatsAppMessage`, or location/GPS data.
- The `Consent` and `ConsentLog` records tied to the user are not purged.

**Gap:** The user row is pseudonymized at best; the full personal and health history remains discoverable through related records, defeating the purpose of erasure.

**Recommended fix:** Extend the anonymization transaction to cascade through related tables, or delete records where retention is no longer required. Keep only non-identifiable data needed for legal/statistical purposes.

---

### G-4 — No `DataExportRequest` or `AccountDeletionRequest` records are created (Articles 15, 17)

**Severity:** Medium

**Evidence:**
- The Prisma schema defines `DataExportRequest` and `AccountDeletionRequest` models at `server/prisma/schema.prisma:2006-2035`.
- Source-code search returns no results for `DataExportRequest` or `AccountDeletionRequest` outside the Prisma schema — the models are unwired.
- `PrivacyController.requestDataExport` returns data directly and never writes a `DataExportRequest` row (`server/src/controllers/privacy/PrivacyController.ts:10-47`).
- `PrivacyController.requestAccountDeletion` performs the soft delete directly and never writes an `AccountDeletionRequest` row (`server/src/controllers/privacy/PrivacyController.ts:50-80`).

**Gap:** There is no durable queue or audit trail of export/deletion requests, their status, or fulfillment history, which complicates demonstrating compliance.

**Recommended fix:** Create the corresponding request rows with status transitions (`pending`, `ready`, `completed`, `expired`) and expose a status endpoint.

---

### G-5 — Data export lacks format choice and scope controls (Articles 15, 20)

**Severity:** Medium

**Evidence:**
- `requestDataExport` always returns the same fixed JSON bundle at `server/src/controllers/privacy/PrivacyController.ts:26-36`.
- No option for CSV, PDF, or a scoped subset (e.g., messages only, bookings only).
- The response is synchronous; large datasets could time out.

**Gap:** GDPR does not mandate a specific format, but portability is stronger when common machine-readable formats and scope selection are offered.

**Recommended fix:** Accept an optional `format` and `categories` parameter, move large exports to an async job, and email a secure download link.

---

### G-6 — Cookie consent is binary and not integrated with analytics (ePrivacy / Articles 7, 25)

**Severity:** Medium

**Evidence:**
- `CookieConsentBanner.tsx` offers only "Essential only" and "Accept all" at `client/src/components/CookieConsentBanner.tsx:58-72`.
- Choice is persisted in `localStorage` under `riayah_cookie_consent_v1` at `client/src/components/CookieConsentBanner.tsx:3`, `37`.
- The only integration is a global flag `window.__RAIYAH_ANALYTICS__` at `client/src/components/CookieConsentBanner.tsx:23`, `41`.
- Source-code search for `__RAIYAH_ANALYTICS__` returns zero consumers; the flag is a dead signal.
- `CookieConsentBanner` is imported only in `client/src/App.tsx:8`; it has no script-gating consumers.
- There is no cookie policy page or granular category (Functional, Analytics, Marketing).

**Gap:** Users cannot consent per category, and the banner cannot actually block non-essential trackers today.

**Recommended fix:** Implement a cookie policy page, categorize scripts, and gate all non-essential script injection behind the consent state. Record the consent choice server-side via the existing `ConsentController` (e.g., `consentType: 'cookies_analytics'`).

---

### G-7 — Local storage is used for sensitive tokens despite cookie-based auth (Articles 5.1.f, 32)

**Severity:** Medium

**Evidence:**
- Multiple pages store tokens, user objects, onboarding drafts, and location in `localStorage`/`sessionStorage`: `client/src/lib/safe-storage.ts`, `client/src/pages/careseeker/PhoneLoginPage.tsx:84-87`, `client/src/pages/public/DeleteAccountPage.tsx:40-42`, `client/src/pages/careseeker/OnboardingPage.tsx:110-178`, `client/src/pages/careseeker/ProvidersPage.tsx:243-256`.
- The project convention is httpOnly cookies only (`client/src/lib/api/client.ts:8`).

**Gap:** `localStorage` tokens are vulnerable to XSS and accessible to any client script, undermining the httpOnly cookie strategy. This is partially covered by M2 security findings M-23 (CSP) and XSS-related items, but the storage pattern itself is a privacy/control gap.

**Recommended fix:** Remove token/user storage from `localStorage`; rely on the `/api/auth/session` bootstrap. Move onboarding drafts to server-side drafts or encrypt-at-rest client stores where justified.

---

### G-8 — Privacy policy API endpoints still return placeholder text (Articles 12–14)

**Severity:** Medium

**Evidence:**
- `server/src/routes/public.routes.ts:11-13` returns `"Please contact support@riayahplus.com for our privacy policy."`.
- `server/src/routes/care-summary.routes.ts:22-24` returns hardcoded `"Raiyah Privacy Policy"` with stale date `2025-01-01`.
- `client/src/pages/public/PrivacyPage.tsx:147` shows a hardcoded "Last Updated: January 5, 2026" date and lacks sections on retention, DPO, third-party processors, international transfers, or cookies.

**Gap:** Transparency obligations are not met for M2 data subjects. These placeholders were already flagged in M1 and remain unchanged.

**Recommended fix:** Replace both API placeholders with a versioned policy document sourced from a CMS or bundled markdown; update the client page to cover M2 processing activities.

---

### G-9 — Consent alias routes bypass the controller and lose metadata (Article 7.3)

**Severity:** Medium

**Evidence:**
- `server/src/routes/caremanagement.routes.ts:26-48` defines `/consent/record`, `/consent/status`, and `/consent/history`.
- `/consent/record` reuses `ConsentController.grant`, which correctly logs metadata.
- `/consent/status` and `/consent/history` are inline handlers that read but never write `ConsentLog`; they return only the latest consent state or the last 50 logs.

**Gap:** History queries are read-only, but the alias path could mislead consumers into thinking `/consent/record` is the only way to grant consent. More importantly, there is no server-side check that a required consent (e.g., `termsAccepted`) is current before sensitive processing begins.

**Recommended fix:** Create a `ConsentService.requireConsent(userId, consentType)` helper and call it before processing health data or marketing communications.

---

### G-10 — No retention schedule beyond OTP and refresh tokens (Article 5.1.e)

**Severity:** Medium

**Evidence:**
- `server/src/cron/scheduler.ts:324-352` purges expired OTP and stale refresh tokens.
- No cron job purges messages, notifications, audit logs, GPS logs, device tokens, `ConsentLog`, `DataExportRequest`, `AccountDeletionRequest`, soft-deleted user backups, or `UserSession` history.
- The anonymization job at `server/src/cron/scheduler.ts:354-375` runs only on soft-deleted accounts older than 30 days and is limited to 100 users per run.

**Gap:** Most personal data categories have no defined retention limit, creating indefinite retention by default.

**Recommended fix:** Define retention periods per category (e.g., messages 3 years post-last activity, audit logs 2 years, OTP 24 hours, notifications 1 year) and add cron jobs to enforce them.

---

### G-11 — Right to rectification is split across multiple endpoints and does not notify data subjects (Article 16)

**Severity:** Low/Medium

**Evidence:**
- Profile updates are handled by `UserProfileController` (`PUT /api/user/profile`) and `ClientProfileController` (`PUT /api/client/profile`), verified in prior reports.
- In M2, care-recipient and patient records can be updated by coordinators/family via `CareUnitController` and `CareRecipientController`.
- No notification or audit trail is sent to the data subject when an admin or coordinator modifies their profile or care record.

**Gap:** Data subjects are not informed when their personal data is rectified by third parties, which weakens transparency.

**Recommended fix:** Send an in-app notification or email when a coordinator/admin changes a user's profile or care-recipient record, and log the change.

---

### G-12 — `AccountDeletionRequest` and `DataExportRequest` models are unwired (Article 30)

**Severity:** Low/Medium

**Evidence:**
- Models exist at `server/prisma/schema.prisma:2006-2035` but are never referenced in any controller or service.

**Gap:** The processing activity "Data subject rights requests" is not traceable in the system, missing a key element for Records of Processing Activities.

**Recommended fix:** Wire the models into the request flows and expose admin endpoints to list and fulfill pending requests.

---

### G-13 — No DPIA for M2 health-data processing (Article 35)

**Severity:** High

**Evidence:**
- No DPIA document exists in `docx/` for M2.
- M2 introduces `CareEpisode`, `Assessment`, `ClinicalNote`, `IntakeRecord`, and care-recipient health data that constitute special-category data under GDPR Article 9.

**Gap:** High-risk processing of health data requires a DPIA under Article 35.

**Recommended fix:** Conduct and document a DPIA for M2 before production use.

---

### G-14 — Duplicate account-deletion route bypasses active-obligation check (Article 17)

**Severity:** High

**Evidence:**
- `PrivacyController.requestAccountDeletion` at `server/src/controllers/privacy/PrivacyController.ts:50-80` checks active bookings but is mounted at `POST /api/privacy/delete-account` (`server/src/routes/privacy.routes.ts:12`).
- `UserProfileController.destroy` at `server/src/controllers/users/UserProfileController.ts:116-127` is mounted at `DELETE /api/user` (`server/src/routes/auth.routes.ts:92`) and performs the same soft delete without any obligation check.
- `UserProfileController.destroy` has no other callers; it is reached directly through the auth router.

**Gap:** Two user-facing deletion paths exist with inconsistent safeguards. A user with active bookings can delete via `DELETE /api/user` while the privacy route would block them.

**Recommended fix:** Consolidate account deletion into a single service function that performs the full obligation check, and have both routes call it.

---

### G-15 — Special-category health data captured without data-subject consent (Articles 6, 9)

**Severity:** High

**Evidence:**
- `IntakeController.submit` records `privacy`, `treatment`, `telehealth`, and `data_sharing` consents against `familyUserId` at `server/src/controllers/patients/IntakeController.ts:184-245`.
- The actual data subject is the `CareRecipient` (patient), whose `dateOfBirth`, `gender`, `medicalInfo`, `diagnosisCodes`, and intake health data are stored at `server/prisma/schema.prisma:555-583` and `server/prisma/schema.prisma:600-640`.
- No consent record is created for the care recipient themselves; if the recipient is a child or an adult lacking capacity, there is no guardian/authority check.

**Gap:** Processing special-category health data requires a lawful basis under Article 9 (typically explicit consent or health-care necessity). The system records consent from the family submitter but not from the data subject or their legal representative.

**Recommended fix:** Capture consent on behalf of the care recipient with a documented legal basis (e.g., parental responsibility, power of attorney, or health-care necessity), and store it in `Consent` with a clear `consentType`.

---

### G-16 — Emergency geolocation retained indefinitely without purpose limit (Article 5.1.b/e)

**Severity:** High

**Evidence:**
- `EmergencyController.raise` stores `latitude`, `longitude`, `address`, and `location` at `server/src/controllers/emergency/EmergencyController.ts:18-37`.
- `EmergencyRequest` model has no `retentionUntil` or automatic purge at `server/prisma/schema.prisma:1726-1745`.

**Gap:** Precise location and health context are collected for an immediate emergency purpose but retained indefinitely, exceeding storage limitation.

**Recommended fix:** Define a retention period for emergency requests (e.g., 90 days post-resolution), then anonymize or delete location and description fields.

---

### G-17 — `ClinicalNote` model is unwired in M2 (Articles 5, 25, 30)

**Severity:** Medium

**Evidence:**
- `CareEpisode.clinicalNotes` relation exists at `server/prisma/schema.prisma:704`.
- Source-code search for `ClinicalNote` controller or route returns no results in `server/src/controllers` or `server/src/routes`.

**Gap:** A planned special-category data store exists in the schema with no access controls, consent flow, audit trail, or DSAR coverage implemented.

**Recommended fix:** Either remove the model from M2 schema or implement the full controller/routes with consent, access control, and retention before deploying.

---

### G-18 — AI intake summary persists clinical inferences without approval safeguards (Articles 9, 22)

**Severity:** High

**Evidence:**
- `AiIntakeSummary` model stores AI-derived `keyConcerns`, `urgencyIndicators`, `flaggedRiskFactors`, and `clinicalImpressions` at `server/prisma/schema.prisma:721-743`.
- The model has `status: String @default("draft")` and `approvedById`/`approvedAt`, but no controller or route surfaces or gates the AI summary.

**Gap:** Automated processing of health data is persisted before human review is completed, and there is no visible mechanism for the data subject to contest or request human intervention.

**Recommended fix:** Do not persist AI inferences until a clinician approves them; expose an approval workflow and an Art 22 contest/human-review path.

---

### G-19 — `FamilyMember` contact data lacks consent enforcement (Articles 6, 7)

**Severity:** Medium

**Evidence:**
- `FamilyMember` model stores name, email, phone, relationship, and `canReceiveUpdates` at `server/prisma/schema.prisma:642-657`.
- No controller validates `canReceiveUpdates` before sending updates, and no `Consent` record is created for family members.

**Gap:** Marketing/service updates may be sent to family members without a recorded lawful basis or consent.

**Recommended fix:** Create a `Consent` record for each family member when `canReceiveUpdates` is true, and check it before sending communications.

---

### G-20 — `GpsLog` model has no retention or pseudonymization policy (Articles 5.1.e, 25)

**Severity:** Medium

**Evidence:**
- `GpsLog` model stores continuous precise location at `server/prisma/schema.prisma:1367-1386`.
- No controller or cron job enforces retention or pseudonymization for GPS data in M2.

**Gap:** If GPS tracking is enabled in M5, indefinite retention of precise location data violates storage limitation and privacy-by-default principles.

**Recommended fix:** Add a retention policy (e.g., 90 days) and pseudonymize/session-aggregate location data beyond that period.

---

### G-21 — Data export omits M2 special-category data (Articles 15, 20)

**Severity:** High

**Evidence:**
- `PrivacyController.requestDataExport` collects `user`, `bookings`, `payments`, `messages`, `notifications`, `documents`, `reviews`, and `wallet` at `server/src/controllers/privacy/PrivacyController.ts:15-24`.
- It does not include `CareRecipient`, `CareEpisode`, `IntakeRecord`, `Assessment`, `ClinicalNote`, `AiIntakeSummary`, `EmergencyRequest`, `GpsLog`, `FamilyMember`, or `Invoice` data.

**Gap:** A data subject exercising the right of access would not receive their complete M2 health and care record.

**Recommended fix:** Extend the export query to include all M2 personal data categories, grouped by data subject (family user and care recipient).

---

### G-22 — No retention-expiration columns or enforced schedules (Article 5.1.e)

**Severity:** High

**Evidence:**
- Prisma schema review shows `createdAt` on nearly every model but **zero** `RetentionExpiresAt` or equivalent columns.
- The only automated purges are for `OtpVerification` and `RefreshToken` at `server/src/cron/scheduler.ts:324-352`.
- `deletedAt` is nullable with no default; soft-deleted records are retained indefinitely unless the 30-day anonymization cron reaches them.

**Gap:** GDPR engineering criteria require a defined TTL at schema design time and automatic enforcement. The current design defaults to indefinite retention.

**Recommended fix:** Add `retentionExpiresAt` to every personal-data table and schedule a retention enforcement job that anonymizes or deletes expired rows.

---

### G-23 — PII in URL path (`/api/whatsapp/admin/messages/:phone`) (Article 32 / logging)

**Severity:** Medium

**Evidence:**
- `server/src/routes/whatsapp.routes.ts:132` defines `GET /api/whatsapp/admin/messages/:phone`.
- The phone number is used directly as a path parameter, which means it appears in access logs, reverse-proxy logs, CDN logs, and browser history.

**Gap:** Personal data must not be placed in URL path segments or query parameters because logs cannot be easily purged and URLs are frequently shared/cached.

**Recommended fix:** Change the endpoint to accept the phone number in the request body or as a POST search request.

---

### G-24 — Error logs include stack traces (Articles 5.1.f, 32)

**Severity:** Medium

**Evidence:**
- `server/src/middleware/errorHandler.ts:39` and `:45` log `{ stack: err.stack }`.
- `server/src/app.ts:31` logs uncaught exceptions with `{ stack: err.stack }`.

**Gap:** Stack traces can leak internal file paths, module names, and occasionally values from the error context. They also complicate log retention because they are not easily redacted.

**Recommended fix:** Log stack traces to a separate internal error tracking channel (e.g., Sentry) with restricted retention; application logs should contain only a correlation ID and a generic message.

---

### G-25 — `WhatsAppService` logs phone number on failure (Article 32)

**Severity:** Medium

**Evidence:**
- `server/src/services/WhatsAppService.ts:24` calls `logger.error('WhatsApp send failed', { phone, error: err })`.

**Gap:** Phone numbers are personal data; logging them without masking creates a PII leak in application logs.

**Recommended fix:** Mask or hash the phone number in logs, or log only a correlation ID and the last 4 digits.

---

### G-26 — Audit logs persist full `before`/`after` snapshots of health data (Articles 5.1.f, 32)

**Severity:** High

**Evidence:**
- `CareUnitController.createPatient` stores `after: patient` at `server/src/controllers/patients/CareUnitController.ts:291-298`.
- `CareUnitController.updatePatient` stores `before: existing, after: updated` at `server/src/controllers/patients/CareUnitController.ts:346-354`.
- `CareUnitController.update` stores `before: existing, after: updated` at `server/src/controllers/patients/CareUnitController.ts:222-230`.
- `CareUnitController.store` stores `after: unit` at `server/src/controllers/patients/CareUnitController.ts:184-191`.
- `CareRecipientRevision.snapshot` stores full patient snapshots at `server/src/controllers/patients/CareUnitController.ts:286`, `341`.
- `auditRedact.ts` only redacts passwords/tokens; it does not redact health data, diagnosis codes, or contact details.

**Gap:** Audit logs become a second copy of special-category personal data with the same (or worse) retention and access controls, increasing breach impact.

**Recommended fix:** Store only identifiers, changed fields, and non-sensitive metadata in audit logs. Keep full revision snapshots in a separate encrypted store with shorter retention, or pseudonymize them.

---

### G-27 — API responses over-include personal data (Article 5.1.c)

**Severity:** Medium

**Evidence:**
- `CareEpisodeController.show` includes `patient: true` and `careRecipient: true` at `server/src/controllers/patients/CareEpisodeController.ts:129-132`.
- `AssessmentController` returns assessor and patient `email` addresses via `ASSESSMENT_INCLUDE` at `server/src/controllers/patients/AssessmentController.ts:50-56`.
- `CareUnitController.patientRevisions` returns `changedBy { id, name, email }` at `server/src/controllers/patients/CareUnitController.ts:370`.

**Gap:** Data minimization requires returning only the fields necessary for the caller. Returning full profile objects and email addresses increases exposure.

**Recommended fix:** Use response DTOs/projections and strip email addresses from responses unless the viewer is an admin managing the editor.

---

### G-28 — No encryption at rest or column-level encryption (Article 32)

**Severity:** High

**Evidence:**
- Source-code search for `encrypt`, `decrypt`, `KMS`, `AES`, `column.*encrypt`, or `atRest` in `server/src` returned zero results.
- Prisma schema stores `name`, `email`, `phone`, `medicalInfo`, `diagnoses`, `notes`, and `address` as plain text.

**Gap:** Health and contact data are not protected against database compromise or backup theft.

**Recommended fix:** Enable PostgreSQL volume encryption at a minimum; add column-level encryption for health data, phone numbers, and addresses using a KMS-backed envelope scheme.

---

### G-29 — Accounts default to active and verified-email defaults to false (Article 25.2)

**Severity:** Low/Medium

**Evidence:**
- `User.isActive` defaults to `true` at `server/prisma/schema.prisma:316`.
- `User.isEmailVerified` defaults to `false` at `server/prisma/schema.prisma:312`.

**Gap:** While email verification defaults off (good), account activity defaults on, meaning a user can use the platform before verifying their email. This is a moderate privacy-by-default gap.

**Recommended fix:** Default `isActive` to `false` and activate only after email verification, or restrict functionality until verification is complete.

---

## Cross-References to M2 Security Review

The following GDPR-adjacent risks are covered in detail by `docx/M2_SECURITY_REVIEW.md` and are **not duplicated** here:

| GDPR article | M2 security finding(s) | Location in security review |
|---|---|---|
| Art 5.1.f (integrity/confidentiality) | CSP missing, XSS via SVG, no DB encryption, `image/*` wildcard | M-23, H-5, and M1-carryover encryption gap; see M2 review sections 4–5 |
| Art 25 (data protection by design) | Mass assignment, loose enums, no purpose validation | H-3, M-10, M-11, M-16, M-17, M-20 |
| Art 32 (security of processing) | S3 confused-deputy, path traversal, file upload allowlists | H-4, M-8, M-9, M-32, M-33, M-34, M-35 |
| Art 5.1.a / Art 8 (lawful/fair/transparent) | Cross-tenant access, unguarded routes, admin backdoor, arbitrary role registration | C-1 to C-5, Z-1 to Z-8, M-46 to M-48 |
| Art 22 (automated decision-making) | Algorithmic provider matching | M2 review references `CareMatchingController`; see M1 verified report for detailed Article 22 analysis |
| Art 33 (breach notification) | No incident response plan | Carried from M1; not implemented in M2 |

---

## Compliance Matrix (M2 Relevant Items)

| # | Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | **Art 5.1(a)** Lawful, fair, transparent | ⚠️ Partial | `PrivacyPage.tsx`, placeholders | Cross-tenant issues handled in security review |
| 2 | **Art 5.1(b)** Purpose limitation | ⚠️ Partial | No purpose registry | No change from M1 |
| 3 | **Art 5.1(c)** Data minimization | ⚠️ Partial | Pre-consent creation persists | No change from M1 |
| 4 | **Art 5.1(d)** Accuracy | ⚠️ Partial | Rectification exists, no notification | G-11 |
| 5 | **Art 5.1(e)** Storage limitation | ⚠️ Partial | OTP/refresh purge only | G-10 |
| 6 | **Art 5.1(f)** Integrity/confidentiality | ⚠️ Partial | Cookie banner added, encryption still missing | See M2 security review |
| 7 | **Art 6** Lawful basis | ⚠️ Partial | Consent metadata now captured | No explicit basis mapping |
| 8 | **Art 7.1–7.3** Consent | ✅ Mostly compliant | `ConsentController` + `ConsentLog` | Metadata now populated |
| 9 | **Art 12–14** Transparency | ⚠️ Partial | Placeholder endpoints remain | G-8 |
| 10 | **Art 15** Right of access | ⚠️ Partial | Downloadable JSON export | No request record, no format choice (G-4, G-5) |
| 11 | **Art 16** Right to rectification | ⚠️ Partial | Multiple endpoints | No notification to subject | G-11 |
| 12 | **Art 17** Right to erasure | ⚠️ Partial | Soft delete + anonymization cron | Anonymization incomplete, obligations check narrow | G-2, G-3 |
| 13 | **Art 18** Right to restriction | ⚠️ Partial | Endpoint + flag exist | Flag not honored | G-1 |
| 14 | **Art 20** Data portability | ⚠️ Partial | JSON export | No CSV or scope choice | G-5 |
| 15 | **Art 22** Automated decision-making | ❌ Non-compliant | `CareMatchingController` | No M2 safeguards added |
| 16 | **Art 25** Data protection by design | ⚠️ Partial | Cookie banner added | Security gaps persist; see M2 security review |
| 17 | **Art 30** Records of processing | ❌ Non-compliant | Unwired request models | G-12 |
| 18 | **Art 32** Security of processing | ⚠️ Partial | `requireAdmin` backdoor removed | Encryption still missing |
| 19 | **Art 33** Breach notification | ❌ Non-compliant | No incident plan | Carried from M1 |
| 20 | **Art 35** DPIA | ❌ Non-compliant | No M2 DPIA | G-13 |
| 21 | **Art 37** DPO | ❌ Non-compliant | Generic support email | Carried from M1 |
| 22 | **Cookie consent** (ePrivacy) | ⚠️ Partial | Banner exists, not integrated | G-6 |
| 23 | **Local storage of tokens** | ❌ Non-compliant | `PhoneLoginPage`, `DeleteAccountPage` | G-7 |
| 24 | **Health data consent (Art 9)** | ❌ Non-compliant | Consent recorded for family user, not care recipient | G-15 |
| 25 | **Emergency data retention** | ❌ Non-compliant | `EmergencyRequest` retained indefinitely | G-16 |
| 26 | **Clinical notes / AI inferences** | ❌ Non-compliant | Unwired model + unpersisted AI summary | G-17, G-18 |
| 27 | **Family member consent** | ⚠️ Partial | `canReceiveUpdates` not enforced | G-19 |
| 28 | **GPS data retention** | ❌ Non-compliant | `GpsLog` no retention/pseudonymization | G-20 |
| 29 | **Right of access completeness** | ❌ Non-compliant | M2 health data omitted from export | G-21 |
| 30 | **Retention expiration columns** | ❌ Non-compliant | No `RetentionExpiresAt` in any personal-data table | G-22 |
| 31 | **PII in URLs** | ❌ Non-compliant | Phone number in WhatsApp admin route path | G-23 |
| 32 | **Error logging** | ⚠️ Partial | Stack traces logged to application logs | G-24 |
| 33 | **Logging of PII** | ❌ Non-compliant | Phone number logged in WhatsApp error | G-25 |
| 34 | **Audit-log data minimization** | ❌ Non-compliant | Full health snapshots in audit logs | G-26 |
| 35 | **API response minimization** | ⚠️ Partial | Over-inclusion of patient/assessor data | G-27 |
| 36 | **Encryption at rest / column-level** | ❌ Non-compliant | No encryption implementation found | G-28 |
| 37 | **Data protection by default** | ⚠️ Partial | `User.isActive` defaults to `true` | G-29 |

---

## Risk Assessment Matrix

| Risk | Likelihood | Impact | Risk Level | Mitigation Priority |
|---|---|---|---|---|
| Processing restriction flag ignored | High | High | 🔴 High | Immediate |
| Incomplete anonymization leaves PHI | High | High | 🔴 High | Immediate |
| No DPIA for M2 health data | High | High | 🔴 High | Immediate |
| Account deletion ignores non-booking obligations / duplicate route | Medium | High | 🔴 High | Immediate |
| Cookie banner cannot block trackers | Medium | Medium | 🟠 Medium | High |
| Indefinite retention of most data | High | Medium | 🟠 Medium | High |
| No export/deletion request records | Medium | Medium | 🟠 Medium | High |
| Tokens in localStorage | Medium | Medium | 🟠 Medium | High |
| Privacy policy placeholders | Medium | Low | 🟡 Low | Medium |
| No rectification notification | Medium | Low | 🟡 Low | Medium |
| Health data consent gap (care recipient) | High | High | 🔴 High | Immediate |
| Emergency geolocation indefinite retention | Medium | High | 🔴 High | Immediate |
| AI clinical inferences without safeguards | Medium | High | 🔴 High | Immediate |
| Data export omits M2 health data | High | High | 🔴 High | Immediate |
| No retention expiration columns / schedules | High | High | 🔴 High | Immediate |
| No encryption at rest or column-level | Medium | High | 🔴 High | Immediate |
| Full health snapshots in audit logs | High | High | 🔴 High | Immediate |
| Unwired ClinicalNote model | Medium | Medium | 🟠 Medium | High |
| Family member consent not enforced | Medium | Medium | 🟠 Medium | High |
| GPS log retention undefined | Medium | Medium | 🟠 Medium | High |
| PII in URL path (phone) | Medium | Medium | 🟠 Medium | High |
| Stack traces in application logs | Medium | Medium | 🟠 Medium | High |
| Phone number logged by WhatsApp service | Medium | Medium | 🟠 Medium | High |
| API response over-inclusion | Medium | Low | 🟡 Low | Medium |
| Account active by default | Medium | Low | 🟡 Low | Medium |

---

## Remediation Roadmap

### Before client demo
1. Honor `User.processingRestricted` in all mutating operations (G-1).
2. Expand active-obligation check before account deletion and consolidate the two deletion routes (G-2, G-14).
3. Complete `anonymizeUser` to cascade through related PHI (G-3).
4. Conduct a DPIA for M2 health-data processing (G-13).

### Before staging
5. Wire `DataExportRequest` and `AccountDeletionRequest` models into request flows (G-4, G-12).
6. Add async/scoped export options (G-5).
7. Integrate cookie banner with actual analytics scripts and add cookie policy (G-6).
8. Remove tokens from localStorage and rely on httpOnly cookies (G-7).
9. Replace placeholder privacy policy endpoints and update client page (G-8).
10. Add `requireConsent` checks for sensitive processing (G-9).

### Defense in depth
11. Define and implement retention schedules for all personal data categories (G-10, G-16, G-20, G-22).
12. Notify data subjects when coordinators/admins modify their records (G-11).
13. Capture care-recipient consent/legal basis for special-category health data (G-15).
14. Extend the data export to include all M2 personal data categories (G-21).
15. Remove or fully implement the `ClinicalNote` model and gate AI inferences behind human approval (G-17, G-18).
16. Enforce `FamilyMember.canReceiveUpdates` via `Consent` records (G-19).
17. Add `RetentionExpiresAt` columns and a scheduled enforcement job (G-22).
18. Move PII out of URL paths; use POST body or query-token lookups (G-23).
19. Stop logging stack traces and phone numbers in application logs (G-24, G-25).
20. Redact health data from audit `before`/`after` snapshots (G-26).
21. Apply response DTOs to minimize returned fields (G-27).
22. Implement encryption at rest and column-level encryption for health/PII data (G-28).
23. Default `User.isActive` to `false` until email verification is complete (G-29).
24. Address M2 security review findings that affect GDPR Articles 5.1.f, 25, 32, and 22.

---

## Sign-off

- **Source-code review methodology:** Exact line-number verification against `milestone-2`. Callers and callees of `PrivacyController`, `ConsentController`, `anonymizeUser`, `CookieConsentBanner`, `restrictProcessing`, `DataExportRequest`, `AccountDeletionRequest`, and M2 clinical controllers were re-verified; schema and logging were checked against GDPR engineering criteria.
- **Scope:** Privacy controllers, consent controllers, M2 clinical controllers, cron jobs, anonymization utility, client cookie banner, privacy page, Prisma schema, logging, and API response patterns.
- **No dynamic testing:** Findings are source-code only.
- **No code edits made:** Report is read-only relative to branch `milestone-2`.
- **Report status:** Ready for the development team.
- **Next step:** Address G-1 through G-4, G-13, and G-14 before the client demo; complete remaining items before staging.

---

*Report generated from `milestone-2` branch, commit `161a3a9`, by pure source-code review. No code edits were made.*
