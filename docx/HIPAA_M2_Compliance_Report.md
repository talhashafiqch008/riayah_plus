# HIPAA Compliance Assessment — Milestone 2

**Generated:** 2026-07-23
**Audited by:** Karim Ashraf — Security & Compliance Reviewer
**Target branch:** `milestone-2` (commit `161a3a9`)
**Scope:** Source-code review of M2 surfaces that create, receive, maintain, or transmit electronic Protected Health Information (ePHI). Security vulnerabilities are intentionally excluded and referenced from `docx/M2_SECURITY_REVIEW.md`. GDPR-specific privacy findings are intentionally excluded and referenced from `docx/GDPR_M2_Compliance_Report.md`.

---

## Executive Summary

This report assesses M2 against the HIPAA Privacy, Security, and Breach Notification Rules from a source-code perspective only. M2 introduces several clinical data surfaces — care recipients, intake records, care episodes, assessments, clinical notes, emergency requests, GPS logs, and AI-derived intake summaries — all of which constitute ePHI when used in a US healthcare context. The platform has basic access authentication and audit logging, but it does not yet meet HIPAA requirements for access control granularity, transmission and storage security, business associate governance, breach notification, or minimum-necessary design.

**Top-line verdict:** M2 has the foundational shape of a HIPAA-bound system (authenticated access, consent capture, audit logs, soft-delete + anonymization), but the safeguards are too coarse and too incomplete for production use as a covered entity or business associate. The most urgent HIPAA-specific gaps are: (1) no encryption at rest or in transit configuration beyond defaults, (2) no BAA or vendor-risk registry for third-party services that touch ePHI, (3) no breach notification workflow or risk assessment, (4) no role-based minimum-necessary enforcement on clinical endpoints, (5) full ePHI snapshots stored in audit logs, and (6) ePHI flowing to unapproved AI/observability providers without a BAA.

No code changes were made to produce this report.

---

## Scope

- **In scope:** M2 clinical controllers, services, routes, Prisma schema, logging, third-party integrations, and client storage patterns that handle ePHI.
- **Out of scope:** General application security findings (see `docx/M2_SECURITY_REVIEW.md`) and GDPR privacy findings (see `docx/GDPR_M2_Compliance_Report.md`). This report references those documents rather than duplicating them.
- This is a pure source-code review with exact file paths and line numbers verified against `milestone-2`. No dynamic testing artifacts are included.

---

## M2 PHI Inventory

| # | Surface | ePHI Categories | HIPAA Rule | Status |
|---|---|---|---|---|
| P-1 | `CareRecipient` model and controllers | Names, DOB, gender, diagnosis codes, medical info, notes, contact data | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-2 | `IntakeRecord` model and `IntakeController` | Medical history, meds, diagnoses, caregiver contacts, intake summaries | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-3 | `CareEpisode` model and `CareEpisodeController` | Episode medical history, diagnoses, care plans, consent flags, documents | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-4 | `Assessment` model and `AssessmentController` | Findings, recommendations, notes, assessor/patient linkage | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-5 | `ClinicalNote` model | Free-text clinical notes tied to sessions/episodes | Privacy §164.502/506, Security §164.312 | ❌ Non-compliant |
| P-6 | `AiIntakeSummary` model | AI-derived key concerns, urgency indicators, risk factors, clinical impressions | Privacy §164.502/506, Security §164.312, Minimum Necessary | ❌ Non-compliant |
| P-7 | `Document` / `IntakeDocument` uploads | Medical records, identity documents, intake files stored in S3/local disk | Security §164.312(d/e), Privacy §164.502 | ⚠️ Partial |
| P-8 | `EmergencyRequest` model and `EmergencyController` | Precise location, health context, descriptions | Privacy §164.502/506, Security §164.312 | ❌ Non-compliant |
| P-9 | `GpsLog` model and `GPSService` | Continuous precise location tied to users/sessions | Security §164.312, Privacy §164.502 | ❌ Non-compliant |
| P-10 | `WhatsAppService` / `WhatsAppMessage` model | Phone numbers + message content | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-11 | `NotificationService` / notifications | Notification body/title may contain names, session details, emergency context | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-12 | `Message` / chat (Socket.io) | Chat content between users and AI | Privacy §164.502/506, Security §164.312 | ⚠️ Partial |
| P-13 | `GeminiChatService` / `AIDoctorController` | User health questions and AI responses persisted to `Message` | Privacy §164.502/506, Security §164.312, BAA | ❌ Non-compliant |
| P-14 | `AuditService` / audit logs | Full `before`/`after` snapshots of care recipient and care unit records | Security §164.312(b), Privacy §164.502 | ⚠️ Partial |
| P-15 | Sentry error tracking | Frontend + backend error events may include request context with ePHI | Security §164.312, Privacy §164.502 | ⚠️ Partial |

**Summary:** Of 15 M2 ePHI surfaces, **0 are fully HIPAA-compliant**, **9 are partially compliant**, and **6 are non-compliant**.

---

## HIPAA-Specific Findings

### H-1 — No Business Associate Agreement (BAA) registry or vendor-risk controls

**Severity:** High
**Rule:** 45 CFR §164.502(e), §164.504(e), §164.314(a)

**Evidence:**
- The codebase integrates multiple third-party services that will touch ePHI:
  - **AWS S3** for document storage: `server/src/controllers/DocumentController.ts:10`, `server/src/controllers/patients/IntakeDocumentController.ts:24-31`.
  - **LiveKit** for telehealth: `server/src/controllers/telehealth/TelehealthController.ts:3`, `18-32`.
  - **Stripe / PayTabs / Fatora** for payments: `server/src/controllers/payments/BookingPaymentController.ts:12-13`, `61-80`.
  - **Google Gemini (Google Generative AI)** for AI chat and AI doctor: `server/src/services/GeminiChatService.ts:1`, `6`, `27`; `server/src/controllers/AIDoctorController.ts:2`, `7`, `27-33`.
  - **Sentry** for error tracking: `server/src/app.ts:10`, `35-41`; `client/src/lib/sentry.ts:6-45`.
  - **WhatsApp (Meta)** for messaging: `server/src/services/WhatsAppService.ts:8-22`.
  - **Email (SMTP via nodemailer)** for notifications: `server/src/services/EmailService.ts:1-13`.
- There is no model, configuration, or documented check for whether these providers are under a BAA, what data they process, or whether they are approved for HIPAA-bound workloads.

**Gap:** HIPAA requires covered entities and business associates to obtain satisfactory assurances (typically a BAA) before permitting a business associate to create, receive, maintain, or transmit ePHI. Without a registry, the organization cannot demonstrate that each ePHI-touching vendor is appropriately contracted.

**Recommended fix:** Create a `VendorBaa` or `BusinessAssociateAgreement` registry with fields for vendor name, service, BAA signed date, data categories permitted, and US-region-only flag. Gate integrations on this registry at startup; block ePHI flows to vendors without a signed BAA.

---

### H-2 — AI/LLM services process ePHI without BAA or de-identification safeguards

**Severity:** High
**Rule:** 45 CFR §164.502(e), §164.514(b), Minimum Necessary §164.502(b), Security §164.312

**Evidence:**
- `GeminiChatService.sendMessage` loads the last 20 messages of a conversation and sends them to Google Gemini (`server/src/services/GeminiChatService.ts:92-103`, `36-47`).
- `AIDoctorController.doctorChat` sends the user message directly to Gemini with a clinical system prompt (`server/src/controllers/AIDoctorController.ts:24-33`, `9-18`).
- No BAA status check, no de-identification of the message content, no opt-in consent specific to AI processing of health data, and no audit of outbound prompts.

**Gap:** Sending ePHI to a public AI model provider without a BAA and without de-identification is a direct HIPAA violation. Even with a BAA, HIPAA minimum-necessary and access-control rules would require explicit consent and auditability.

**Recommended fix:** Either (a) obtain a HIPAA-compliant BAA with Google Cloud and route through a de-identification proxy with explicit AI-health-data consent, or (b) prevent AI chat from accepting or returning PHI until a BAA and consent flow are in place.

---

### H-3 — No encryption at rest or explicit transmission-security configuration for ePHI

**Severity:** High
**Rule:** 45 CFR §164.312(a)(2)(iv), §164.312(e)(1), §164.312(d)

**Evidence:**
- Source-code search for `encrypt`, `decrypt`, `KMS`, `AES`, `column.*encrypt`, or `atRest` in `server/src` returned zero results.
- Prisma schema stores `CareRecipient.medicalInfo`, `CareRecipient.notes`, `IntakeRecord.medicalHistory`, `CareEpisode.intakeSummary`, `Assessment.findings`, `ClinicalNote.content`, and `AiIntakeSummary.flaggedRiskFactors` as plain text (`server/prisma/schema.prisma:565-566`, `615-621`, `689`, `762-765`, `920`, `732-733`).
- S3 uploads are sent with `ContentType` only; no server-side encryption headers are set (`server/src/controllers/DocumentController.ts:71-77`; `server/src/controllers/patients/IntakeDocumentController.ts:210-216`).
- Email transport uses TLS only when port is 465; STARTTLS on port 587 is not forced (`server/src/services/EmailService.ts:5-13`).

**Gap:** HIPAA requires ePHI to be encrypted when stored and transmitted unless a documented risk analysis demonstrates encryption is unreasonable. No such alternative safeguard or documentation exists in the source.

**Recommended fix:** Enable PostgreSQL volume/TDE encryption at the infrastructure level; add KMS-backed column-level encryption for selected ePHI fields; enforce S3 SSE-KMS and HTTPS-only buckets; force TLS for SMTP; ensure all third-party APIs use HTTPS.

---

### H-4 — Clinical routes lack role-based minimum-necessary enforcement

**Severity:** High
**Rule:** 45 CFR §164.502(b), §164.312(a)(1), §164.308(a)(4)

**Evidence:**
- `careUnit.routes.ts` mounts `authenticate` only; `POST /`, `GET /:id/patients`, `POST /:id/patients`, `PATCH /:id/patients/:patientId`, `GET /:id/patients/:patientId/revisions` have no role guard (`server/src/routes/careUnit.routes.ts:6-16`).
- `intake.routes.ts` mounts `authenticate` only for most endpoints; only `/queue` and `/:id/review` require `requireCareCoordinator` (`server/src/routes/intake.routes.ts:10-37`).
- `episode.routes.ts` mounts `authenticate` only for `GET /` and `GET /:id`; the summary-PDF route checks only broad role categories (`server/src/routes/episode.routes.ts:9-13`, `18-35`).
- `assessment.routes.ts` mounts `authenticate` only for `GET /` and `GET /:id`; `PATCH /:id` has no role guard (`server/src/routes/assessment.routes.ts:7-13`).

**Gap:** HIPAA requires access to ePHI to be limited to the minimum necessary. M2 authenticates users but does not consistently enforce that only authorized roles (family, coordinator, clinical staff, admin) can access specific ePHI records, and it does not scope responses to the smallest necessary fields.

**Recommended fix:** Add role-specific middleware to every clinical route and scope all Prisma queries by role + tenant/care-unit ownership. Return DTOs that exclude unnecessary ePHI fields for each role.

---

### H-5 — `ClinicalNote` model exists in schema with no access controls

**Severity:** High
**Rule:** 45 CFR §164.312(a)(1), §164.502(a)(4)(ii), §164.308(a)(3)

**Evidence:**
- The `ClinicalNote` model stores free-text clinical content, author linkage, and episode/session linkage (`server/prisma/schema.prisma:912-929`).
- Source-code search returns no controller or route for `ClinicalNote` in `server/src/controllers` or `server/src/routes`.

**Gap:** An ePHI-bearing table exists with no implemented access controls, authorization logic, audit trail, or consent flow. If it is deployed, it would be an uncontrolled ePHI repository.

**Recommended fix:** Either remove `ClinicalNote` from M2 or implement full CRUD routes with role-based access, consent, audit logging, and retention before deploying.

---

### H-6 — `AiIntakeSummary` stores clinical inferences without approval or access controls

**Severity:** High
**Rule:** 45 CFR §164.308(a)(1), §164.312(a)(1), §164.502(b)

**Evidence:**
- `AiIntakeSummary` stores AI-derived `keyConcerns`, `urgencyIndicators`, `flaggedRiskFactors`, and `clinicalImpressions` (`server/prisma/schema.prisma:721-743`).
- It has `approvedById`/`approvedAt` fields, but source-code search shows no controller or route that surfaces, approves, or gates the AI summary.
- The model is created during intake review but no access-control logic governs who can read it.

**Gap:** Automated clinical inferences are persisted before human review is completed, and there is no mechanism to enforce minimum necessary access or clinician attestation. This violates both access-control and integrity/confidentiality safeguards.

**Recommended fix:** Do not persist AI inferences until a clinician approves them. Implement an approval workflow and role-gated read access before enabling the feature.

---

### H-7 — Audit logs persist full ePHI snapshots

**Severity:** High
**Rule:** 45 CFR §164.312(b), §164.308(a)(1), §164.502(b)

**Evidence:**
- `AuditService.log` stores `before` and `after` objects as JSON without field-level redaction of ePHI (`server/src/services/AuditService.ts:54-55`).
- `CareUnitController.createPatient` stores `after: patient` (`server/src/controllers/patients/CareUnitController.ts:291-298`).
- `CareUnitController.updatePatient` stores `before: existing, after: updated` (`server/src/controllers/patients/CareUnitController.ts:346-354`).
- `CareRecipientRevision.snapshot` stores full patient snapshots (`server/src/controllers/patients/CareUnitController.ts:282-289`, `337-344`).
- `auditRedact.ts` only redacts passwords/tokens; it does not redact health data, diagnosis codes, names, or contact details (`server/src/utils/auditRedact.ts:1-17`).

**Gap:** Audit logs become a second, unencrypted copy of ePHI with the same retention and broader access, increasing breach impact and complicating log retention.

**Recommended fix:** Redact ePHI from audit `before`/`after` snapshots. Store only changed-field keys, non-sensitive identifiers, and metadata. If full revision snapshots are required, place them in a separate encrypted store with shorter retention and stricter access.

---

### H-8 — No breach notification workflow or risk assessment documentation

**Severity:** High
**Rule:** 45 CFR §164.400-§164.414 (Breach Notification Rule), §164.308(a)(1)(ii)(A) (Risk Analysis)

**Evidence:**
- Source-code search for `breach`, `incident response`, `risk assessment`, `risk analysis`, `security officer`, `privacy officer`, or `compliance officer` in `server/src` returned zero results.
- There is no documented breach determination procedure, no notification timer logic, no affected-individual registry, and no HHS/OCR notification workflow.

**Gap:** HIPAA requires covered entities and business associates to conduct a risk analysis, document security risk management, and follow a breach notification timeline. M2 has none of these artifacts.

**Recommended fix:** Create a `SecurityIncident` or `BreachAssessment` model, implement a documented breach-determination decision tree, and add notification-state tracking for affected individuals, HHS, and business associates.

---

### H-9 — Socket.io rooms join based on unverified `userId` query parameter

**Severity:** Medium
**Rule:** 45 CFR §164.312(a)(1), §164.312(d)

**Evidence:**
- `server/src/app.ts:55-60` reads `socket.handshake.query.userId` and immediately joins `chat.{userId}` and `notification.user.{userId}` without validating the socket identity against the JWT cookie or session.

**Gap:** Real-time channels carrying notifications and chat messages (which may include ePHI) are joined based on a client-supplied string. A user could subscribe to another user's room and receive ePHI-bearing notifications.

**Recommended fix:** Authenticate Socket.io connections via the httpOnly cookie/JWT before joining rooms, and verify that the requested `userId` matches the authenticated identity.

---

### H-10 — Notification service can carry ePHI in title/body without consent or redaction

**Severity:** Medium
**Rule:** 45 CFR §164.502(a)(1), §164.508(a), §164.312(e)(1)

**Evidence:**
- `NotificationService.create` accepts arbitrary `title` and `body` strings and stores them unredacted (`server/src/services/NotificationService.ts:15-25`).
- `EmergencyController.raise` creates notifications with the emergency description embedded in the body (`server/src/controllers/emergency/EmergencyController.ts:42-49`, `57-63`).
- `TelehealthController.createRoom` includes the provider name in the notification body (`server/src/controllers/telehealth/TelehealthController.ts:64-70`).
- No consent or opt-out logic governs notification content, and push/email delivery may expose ePHI on lock screens or third-party email inboxes.

**Gap:** Unconsented or unredacted ePHI in notifications increases the risk of impermissible disclosure.

**Recommended fix:** Add a notification content policy that redacts or generalizes ePHI in titles/bodies; require explicit consent for push/email channels; use generic action categories ("new message", "emergency alert") instead of detailed health content.

---

### H-11 — Emergency geolocation and health context retained indefinitely

**Severity:** High
**Rule:** 45 CFR §164.502(b), §164.530(c) ( Safeguards ), §164.312(a)(1)

**Evidence:**
- `EmergencyController.raise` stores `latitude`, `longitude`, `address`, `location`, and `description` (`server/src/controllers/emergency/EmergencyController.ts:23-33`).
- `EmergencyRequest` has no retention limit, no automatic purge, and no access-logic beyond the request creator or any admin/coordinator (`server/src/prisma/schema.prisma:1726-1745`; `server/src/controllers/emergency/EmergencyController.ts:75-93`).

**Gap:** Precise location + health context are collected for immediate response but retained indefinitely with broad access, violating minimum necessary and safeguard principles.

**Recommended fix:** Define a retention period for emergency requests (e.g., 90 days post-resolution), then delete or anonymize location/description fields. Restrict list access to the requestor and explicitly authorized coordinators.

---

### H-12 — GPS logs have no retention, pseudonymization, or purpose limitation

**Severity:** High
**Rule:** 45 CFR §164.502(b), §164.530(c), §164.312(a)(1)

**Evidence:**
- `GpsLog` model stores continuous precise location (`server/prisma/schema.prisma:1367-1386`).
- `GPSService.logCheckin` and `logCheckout` create records with latitude, longitude, and address (`server/src/services/GPSService.ts:95-109`).
- No controller or cron job enforces retention or pseudonymization for GPS data in M2.

**Gap:** Indefinite retention of precise location data for staff check-ins/telehealth geofencing violates storage limitation and privacy-by-default.

**Recommended fix:** Add a retention policy (e.g., 90 days), then aggregate/pseudonymize location data beyond that period. Document the clinical or operational purpose for GPS retention.

---

### H-13 — `PrivacyController.requestDataExport` omits M2 ePHI

**Severity:** High
**Rule:** 45 CFR §164.524 (Right of Access)

**Evidence:**
- The export collects only `user`, `bookings`, `payments`, `messages`, `notifications`, `documents`, `reviews`, and `wallet` (`server/src/controllers/privacy/PrivacyController.ts:15-24`).
- It does not include `CareRecipient`, `IntakeRecord`, `CareEpisode`, `Assessment`, `ClinicalNote`, `AiIntakeSummary`, `EmergencyRequest`, `GpsLog`, or `FamilyMember` data.

**Gap:** A patient or authorized representative exercising the HIPAA right of access would not receive their complete M2 clinical record.

**Recommended fix:** Extend the export to include all ePHI categories grouped by data subject, and record the export request in a durable `DataExportRequest` queue.

---

### H-14 — Account deletion / anonymization does not cascade through ePHI

**Severity:** High
**Rule:** 45 CFR §164.524(a)(2)(i), §164.526(a)(2), §164.530(j)

**Evidence:**
- `PrivacyController.requestAccountDeletion` only checks active bookings and soft-deletes the user (`server/src/controllers/privacy/PrivacyController.ts:50-80`).
- `UserProfileController.destroy` provides a second deletion route with no obligation check (`server/src/controllers/users/UserProfileController.ts:116-127`; `server/src/routes/auth.routes.ts:92`).
- `anonymizeUser` renames the user and nulls some profile fields but does not cascade through `CareRecipient`, `IntakeRecord`, `CareEpisode`, `Assessment`, `ClinicalNote`, `AiIntakeSummary`, `EmergencyRequest`, `GpsLog`, `Document`, `Message`, `Notification`, or `WhatsAppMessage` (`server/src/utils/anonymizeUser.ts:5-38`).

**Gap:** The user row is pseudonymized while the full clinical history remains discoverable through related records, defeating erasure and complicating right-of-access accounting.

**Recommended fix:** Consolidate deletion into one service that checks all clinical/legal obligations and cascades anonymization or deletion through related ePHI records.

---

### H-15 — `WhatsAppService` logs phone numbers and may transmit ePHI without BAA

**Severity:** Medium
**Rule:** 45 CFR §164.312(b), §164.502(e), §164.530(c)

**Evidence:**
- `WhatsAppService.sendText` logs `phone` on failure (`server/src/services/WhatsAppService.ts:24`).
- WhatsApp admin route uses the phone number as a URL path parameter (`server/src/routes/whatsapp.routes.ts:132`).
- There is no evidence of a BAA with Meta for WhatsApp Business API processing ePHI.

**Gap:** Phone numbers are identifiers under HIPAA; logging them unmasked and placing them in URL paths increases disclosure risk. Without a BAA, ePHI must not flow through WhatsApp.

**Recommended fix:** Mask or hash phone numbers in logs and URLs; ensure a signed BAA with Meta before enabling ePHI over WhatsApp; otherwise restrict WhatsApp messages to non-PHI appointment logistics.

---

### H-16 — Sentry may receive ePHI in error events

**Severity:** Medium
**Rule:** 45 CFR §164.502(e), §164.312(b), §164.530(c)

**Evidence:**
- Backend Sentry captures error context including `req` objects (`server/src/app.ts:35-41`; `server/src/middleware/errorHandler.ts:39`, `45`).
- Frontend Sentry captures exceptions and may include page/context data (`client/src/lib/sentry.ts:6-45`); the `beforeSend` filter only drops network errors.
- No BAA status check or PII scrubber is configured before sending events to Sentry.

**Gap:** Error reports can contain request bodies, URLs, user IDs, or stack-trace-adjacent values that include ePHI. Without a BAA and scrubbing, Sentry is not a permissible ePHI recipient.

**Recommended fix:** Confirm Sentry Business plan with signed BAA and configure PII scrubbing (URL params, request body, user names/phones) before enabling in production; otherwise disable Sentry for ePHI-bearing environments.

---

### H-17 — No documented sanctions policy, workforce training, or access review process

**Severity:** Medium
**Rule:** 45 CFR §164.308(a)(1)(ii)(C) (Sanction Policy), §164.530(b) (Workforce Training), §164.308(a)(4)(ii)(C) (Access Establishment/Modification)

**Evidence:**
- No code, configuration, or documentation in the repo implements workforce access reviews, termination-triggered access revocation beyond the existing logout-all feature, or a sanctions policy.

**Gap:** HIPAA administrative safeguards require documented policies for workforce clearance, authorization, and termination. M2 relies only on technical authentication.

**Recommended fix:** Add admin workflows to review and revoke user access, document termination procedures, and maintain a sanctions/training policy outside the code repository.

---

### H-18 — CORS `allowedHeaders` exposes `X-Admin-Request`

**Severity:** Low/Medium
**Rule:** 45 CFR §164.312(a)(1), §164.308(a)(1)

**Evidence:**
- `server/src/app.ts:80` lists `X-Admin-Request` in `allowedHeaders`.
- The `requireAdmin` middleware correctly rejects the header (`server/src/middleware/rbac.ts:81`), but the CORS allowance is a leftover artifact.

**Gap:** Keeping a legacy admin-bypass header in the CORS allowlist is a hygiene issue that could facilitate social engineering or future regression.

**Recommended fix:** Remove `X-Admin-Request` from the CORS `allowedHeaders` array.

---

## Cross-References to Other Reports

The following HIPAA-adjacent risks are covered in detail elsewhere and are **not duplicated** here:

| HIPAA area | Finding location | Reference |
|---|---|---|
| Access controls (cross-tenant, role escalation, unguarded routes, including document approve/reject/delete) | M2 security review | C-1 to C-5, Z-1 to Z-8, M-46 to M-48 in `docx/M2_SECURITY_REVIEW.md`; Z-3 specifically covers arbitrary document access/approval |
| Encryption at rest / column-level | GDPR M2 report | G-28 in `docx/GDPR_M2_Compliance_Report.md` |
| PII in URL paths (WhatsApp phone) | GDPR M2 report | G-23 in `docx/GDPR_M2_Compliance_Report.md` |
| Stack traces / phone numbers in logs | GDPR M2 report | G-24, G-25 in `docx/GDPR_M2_Compliance_Report.md` |
| Local storage of tokens/user data | GDPR M2 report | G-7 in `docx/GDPR_M2_Compliance_Report.md` |
| Cookie banner / consent categorization | GDPR M2 report | G-6 in `docx/GDPR_M2_Compliance_Report.md` |
| Right of access completeness | GDPR M2 report | G-21 in `docx/GDPR_M2_Compliance_Report.md` |
| Processing restriction / erasure | GDPR M2 report | G-2, G-3, G-14 in `docx/GDPR_M2_Compliance_Report.md` |
| Emergency geolocation retention | GDPR M2 report | G-16 in `docx/GDPR_M2_Compliance_Report.md` |
| GPS data retention | GDPR M2 report | G-20 in `docx/GDPR_M2_Compliance_Report.md` |
| Audit logs storing full PHI snapshots | M2 security review | M-2 in `docx/M2_SECURITY_REVIEW.md` |

---

## Compliance Matrix

| # | HIPAA Requirement | Status | Evidence | Notes |
|---|---|---|---|---|
| 1 | **§164.502(a)** Permitted uses/disclosures | ⚠️ Partial | Consent capture exists; no minimum-necessary enforcement | H-4 |
| 2 | **§164.502(b)** Minimum necessary | ❌ Non-compliant | API responses over-include ePHI; broad role access | H-4, H-7, G-27 (ref) |
| 3 | **§164.502(e)** Business associate safeguards | ❌ Non-compliant | No BAA registry | H-1, H-2, H-15, H-16 |
| 4 | **§164.506** Treatment/payment/healthcare ops | ⚠️ Partial | Implicit TPO basis; no explicit basis mapping | H-4 |
| 5 | **§164.508** Authorization for non-TPO | ❌ Non-compliant | No HIPAA-style authorization model for non-TPO uses | H-2 |
| 6 | **§164.524** Right of access | ⚠️ Partial | Export exists but omits M2 ePHI | H-13 |
| 7 | **§164.526** Amendment | ⚠️ Partial | Rectification exists; no amendment tracking | — |
| 8 | **§164.528** Accounting of disclosures | ❌ Non-compliant | No accounting-of-disclosures log | H-1, H-8 |
| 9 | **§164.530(c)** Safeguards | ❌ Non-compliant | No PHI safeguard policy or technical implementation beyond auth | H-11, H-12, H-17 |
| 10 | **§164.312(a)(1)** Access control | ⚠️ Partial | Authenticated access; missing role/record-level enforcement | H-4, H-5, H-9 |
| 11 | **§164.312(a)(2)(iii)** Unique user IDs | ✅ Compliant | JWT `userId` identifies each user; no shared accounts | `server/src/middleware/auth.ts:11-16` |
| 12 | **§164.312(a)(2)(iv)** Encryption/decryption | ❌ Non-compliant | No ePHI encryption implementation | H-3 |
| 13 | **§164.312(b)** Audit controls | ⚠️ Partial | Audit logs exist but store full ePHI snapshots | H-7 |
| 14 | **§164.312(c)(1)** Integrity | ⚠️ Partial | No integrity-check mechanism beyond Prisma constraints | — |
| 15 | **§164.312(d)** Person/entity authentication | ⚠️ Partial | JWT + httpOnly cookies; Socket.io not authenticated | H-9 |
| 16 | **§164.312(e)(1)** Transmission security | ⚠️ Partial | HTTPS by default; no forced TLS for email/SMTP | H-3 |
| 17 | **§164.308(a)(1)** Risk analysis | ❌ Non-compliant | No documented risk analysis | H-8 |
| 18 | **§164.308(a)(1)(ii)(C)** Sanction policy | ❌ Non-compliant | No sanctions workflow | H-17 |
| 19 | **§164.308(a)(4)** Access authorization/establishment | ⚠️ Partial | Role middleware exists but not consistently applied | H-4; see M2 security review Z-1 to Z-8 for specific route gaps |
| 20 | **§164.404-414** Breach notification | ❌ Non-compliant | No breach workflow | H-8 |
| 21 | **§164.530(b)** Workforce training | ❌ Non-compliant | No training artifacts | H-17 |

---

## Risk Assessment Matrix

| Risk | Likelihood | Impact | Risk Level | Mitigation Priority |
|---|---|---|---|---|
| ePHI sent to AI providers without BAA/de-id | High | High | 🔴 High | Immediate |
| No encryption at rest or explicit transmission security | High | High | 🔴 High | Immediate |
| No BAA registry for any ePHI vendor | High | High | 🔴 High | Immediate |
| Minimum-necessary access not enforced on clinical routes | High | High | 🔴 High | Immediate |
| Unwired `ClinicalNote` model = uncontrolled ePHI store | Medium | High | 🔴 High | Immediate |
| AI clinical inferences persisted without approval/access controls | Medium | High | 🔴 High | Immediate |
| Audit logs retain full ePHI snapshots | High | High | 🔴 High | Immediate |
| No breach notification workflow or risk analysis | High | High | 🔴 High | Immediate |
| Account deletion/anonymization does not cascade ePHI | Medium | High | 🔴 High | Immediate |
| Data export omits M2 ePHI | High | High | 🔴 High | Immediate |
| Emergency geolocation retained indefinitely | Medium | High | 🔴 High | Immediate |
| GPS logs retained indefinitely | Medium | High | 🔴 High | Immediate |
| Socket.io joins rooms on unverified userId | Medium | High | 🔴 High | Immediate |
| WhatsApp ePHI without BAA + phone in logs/URLs | Medium | Medium | 🟠 Medium | High |
| Sentry may receive ePHI without BAA/scrubbing | Medium | Medium | 🟠 Medium | High |
| Notifications may expose ePHI on lock screens/email | Medium | Medium | 🟠 Medium | High |
| No workforce sanctions/training/access review | Medium | Medium | 🟠 Medium | High |
| Arbitrary document access/approval via unguarded `/documents` routes (see M2 security review Z-3) | High | High | 🔴 High | Immediate |
| Legacy `X-Admin-Request` still in CORS allowlist | Low | Low | 🟡 Low | Medium |

---

## Remediation Roadmap

### Before client demo
1. Block AI chat/doctor endpoints from accepting or returning ePHI until a BAA + de-id proxy + explicit consent are in place (H-2, H-6).
2. Remove or fully implement `ClinicalNote` with role-based access and audit logging (H-5).
3. Add role guards to all clinical routes (`careUnit`, `intake`, `episode`, `assessment`) and scope queries by role + tenant (H-4; also address M2 security review Z-1 to Z-8).
4. Redact ePHI from audit `before`/`after` snapshots and `CareRecipientRevision.snapshot` (H-7; also address M2 security review M-2).

### Before staging
5. Implement a `VendorBaa` registry and gate all ePHI-touching integrations on it (H-1).
6. Add KMS-backed column-level encryption for selected ePHI fields and S3 SSE-KMS for documents (H-3).
7. Authenticate Socket.io via JWT cookie and verify room ownership (H-9).
8. Implement a breach notification workflow with incident state tracking (H-8).
9. Extend `requestDataExport` to include all M2 ePHI categories and record the request (H-13).
10. Consolidate account deletion into one service with full ePHI cascade and obligation checks (H-14).

### Defense in depth
11. Define retention periods for emergency requests and GPS logs, then enforce them via cron (H-11, H-12).
12. Add notification content policy to redact ePHI and require channel consent (H-10).
13. Mask phone numbers in WhatsApp logs/URLs and confirm BAA with Meta (H-15).
14. Configure Sentry BAA + PII scrubbing, or disable Sentry for ePHI environments (H-16).
15. Document sanctions policy, workforce training, and access review procedures (H-17).
16. Remove `X-Admin-Request` from CORS allowlist (H-18).
17. Address all M2 security review findings that affect access controls, XSS, file upload, and cross-tenant authorization (including Z-3 for document access/approval).

---

## Sign-off

- **Source-code review methodology:** Exact line-number verification against `milestone-2`. Callers and callees of clinical controllers, privacy controllers, audit services, notification services, and third-party integrations were re-verified; schema and logging were checked against HIPAA Privacy and Security Rule criteria.
- **Scope:** Clinical controllers, consent/privacy controllers, document upload, telehealth, AI services, WhatsApp, email, Sentry, Socket.io, Prisma schema, audit logging, and client storage patterns.
- **No dynamic testing:** Findings are source-code only.
- **No code edits made:** Report is read-only relative to branch `milestone-2`.
- **Report status:** Ready for the development team.
- **Next step:** Address H-1 through H-9 and H-18 before the client demo; complete remaining items before staging.

---

*Report generated from `milestone-2` branch, commit `161a3a9`, by pure source-code review. No code edits were made.*
