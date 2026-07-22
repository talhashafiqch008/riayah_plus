# Milestone 2 — Source-Code Security Review Report

**Date:** 2026-07-20  
**Auditor:** Karim Ashraf  
**Target branch:** `milestone-2` (commit `161a3a9`)  
**Scope:** Family onboarding, intake review, care units, care episodes, assessments, intake documents, consent capture, and authorization-bypass review of related routes and controllers.

> **Remediation tracker (living status):** `M2_SECURITY_REMEDIATION.md`  
> **Remediation tests:** `M2_SECURITY_REMEDIATION_TEST.md`  
> Wave A–D remediations shipped 2026-07-22 — see tracker for Fixed / Deferred / Retested. Do not treat this report as closed until tracker residuals (multi-org retest + deferred Lows) are accepted.

---

## 1. Executive Summary

This report is a **pure source-code review** of the M2 clinical surfaces. No dynamic/manual testing artifacts are included. All findings are backed by exact file paths and line numbers verified against the current branch.

**Top-line verdict:** The M2 backend introduces a critical data-model bug (`CareEpisode.patientId` points to the family user), cross-tenant authorization regressions, and broad route-level authorization gaps. The most severe route-level issues (unguarded care-unit, document mutation, admin granular-permission bypass, and arbitrary document requests) must be fixed before the client demo. Additional API-hygiene, business-logic, audit, file-upload, and XSS defense-in-depth issues are documented for the staging hardening pass.

No code changes were made to produce this report.

---

## 2. Critical Findings

| # | Finding | CWE | Severity | File / Lines | Evidence | Recommended Fix |
|---|---|---|---|---|---|---|
| C-1 | **`CareEpisode.patientId` is set to the family user, not the care recipient** | — | Critical | `server/src/controllers/patients/IntakeController.ts:539` | `review()` creates episode with `patientId: intake.familyUserId`. `CareEpisode.patientId` is the FK to `User` representing the actual patient. | Set `patientId` to the care recipient (or introduce a `CareRecipient` → `User` relation if the recipient must map to a user). Update all downstream scoping that relies on `patientId`. |
| C-2 | **Cross-tenant care-unit creation by staff** | 639 | Critical | `server/src/controllers/patients/CareUnitController.ts:148-194` | `store()` allows coordinators/admins to supply `familyUserId` and `organizationId` in the body. No check that the target family user belongs to the caller's tenant. | Reject `familyUserId`/`organizationId` for non-admin roles, or validate that the target user belongs to the caller's organization. |
| C-3 | **Cross-tenant episode creation / arbitrary `patientId` binding** | 639 | Critical | `server/src/controllers/patients/CareEpisodeController.ts:78-123` | `store()` accepts `patientId`, `careRecipientId`, and `careUnitId` from the body. Only `careUnitId` is tenant-checked; `patientId`/`careRecipientId` are not verified. | Verify that `patientId` and `careRecipientId` belong to the care unit (and therefore the tenant) before creating the episode. |
| C-4 | **Cross-tenant intake submission by staff** | 639 | Critical | `server/src/controllers/patients/IntakeController.ts:184-226` | `submit()` loads the care unit by `id` only. Family ownership is checked for family role, but coordinator/admin path has no tenant check. | Call `assertTenantOrgAccess(req, unit.organizationId)` for staff before creating the intake. |
| C-5 | **Episode summary PDF accessible to any coordinator** | 284 | High | `server/src/routes/episode.routes.ts:18-35` | Inline handler checks `req.user.role` includes `care_coordinator` but does not assert the coordinator belongs to `episode.organizationId`. | Call `assertTenantOrgAccess(req, episode.organizationId)` before serving the PDF. |

### 2.1 Why these are critical

- **C-1** corrupts every patient-centric query (family episode list, family bookings, assessment `patientId`, PDF party check). Fixing it breaks family access unless C-10/C-11 are fixed together.
- **C-2 + C-3 + C-4** allow a coordinator in one organization to read/write records belonging to another organization.
- **C-5** exposes episode summary PDFs (PHI) across organizational boundaries.
- **Z-2** allows any authenticated user to create/modify care units and patients because care-unit routes have no role guards.
- **Z-5** lets any admin perform any admin action because most admin routes bypass the existing granular permission middleware.
- **M-46** is partially fixed at the route level but the controller still accepts arbitrary `userId`/`role` and casts with `as any`.
- **M-47** lets an unauthenticated registrant choose any role, including platform admin.
- **M-48** is a shared-secret backdoor that bypasses password and 2FA for any admin account.

---

## 3. High Findings

| # | Finding | CWE | Severity | File / Lines | Evidence | Recommended Fix |
|---|---|---|---|---|---|---|
| H-1 | **Assessment assessor can be assigned from any organization** | 639 | High | `server/src/controllers/patients/AssessmentController.ts:181-204` | Assessor query filters by `id`, `isActive`, `deletedAt`, and clinical role but not `organizationId`. | Add `organizationId: episode.organizationId` to the assessor query. |
| H-2 | **Race condition: concurrent intake review can create duplicate care episodes** | 362 | High | `server/src/controllers/patients/IntakeController.ts:487-568` | `intake.status` is read outside the transaction; two coordinators reviewing the same submitted intake concurrently can both create episodes. | Re-check status inside the transaction with `where: { id, status: 'submitted' }`, or add a unique constraint on `careEpisode.intakeRecordId`. |
| H-3 | **Episode `update` mass-assigns request body and uses loose status schema** | 915 / 20 | High | `server/src/controllers/patients/CareEpisodeController.ts:146-167` | `data: { ...data, ... }` spreads the request body into the Prisma update; `status` is `z.string().optional()` instead of the enum. | Restrict `updateIntakeSchema` to allowed fields, use `CareEpisodeStatus` enum for `status`, and strip `intakeSummary` except during the validation transition. |
| H-4 | **Presign/confirm endpoints trust client-supplied file metadata** | 345 / 918 | High | `server/src/controllers/patients/IntakeDocumentController.ts:97-184` | `presign()` accepts arbitrary `mimeType`/`size` and issues an S3 PUT URL with no size/MIME limits. `confirm()` stores user-supplied `mimeType`/`size`/`name` without re-verifying against the S3 object. | In `confirm()`, `HeadObject` the key to verify size/content-type, reject disallowed types, and enforce the 15 MB limit. |
| H-5 | **Stored XSS via SVG file upload** | 79 | High | `server/src/controllers/patients/IntakeDocumentController.ts:46` | `file.mimetype.startsWith('image/')` bypasses the explicit allowlist and accepts `image/svg+xml`. SVG can contain `<script>`. | Remove the `image/*` wildcard; use an explicit MIME allowlist and serve uploads with `Content-Disposition: attachment`. |

---

## 4. Medium Findings

| # | Finding | CWE | Severity | File / Lines | Evidence | Recommended Fix |
|---|---|---|---|---|---|---|
| M-1 | **Orphan-record access via null `organizationId`** | 284 | Medium | `server/src/controllers/patients/IntakeController.ts:160-176`, `IntakeDocumentController.ts:274-282`, `CareUnitController.ts:66-72` | Access helpers treat `organizationId === null` as allowed (`!org \|\| org === tw.organizationId`), so unscoped records are cross-tenant visible to coordinators. | Reject null-organization records for coordinators; default new records to the family's organization. |
| M-2 | **PHI written into audit `after` / `before` objects** | 532 | Medium | `AssessmentController.ts:310-318`, `CareUnitController.ts:184-191` and `222-230`, `IntakeController.ts:331-343` | Full database rows (diagnoses, medical history, medications, findings) are written to `AuditService.log` without redaction. | Redact PHI from audit `before`/`after`; store only identifiers, status, and changed non-PHI fields. |
| M-3 | **Family users can mass-assign `organizationId`/`clinicId` on care-unit updates** | 915 / 284 | Medium | `server/src/controllers/patients/CareUnitController.ts:209-220` | `updateCareUnitSchema` is `createCareUnitSchema.partial()` and still accepts `organizationId`/`clinicId` for family users. | Strip `organizationId`/`clinicId` from the update DTO for non-admin roles. |
| M-4 | **Family users can overwrite patient diagnosis codes** | 284 / 915 | Medium | `server/src/controllers/patients/CareUnitController.ts:303-335` | `updatePatient()` accepts `diagnosisCodes` from any role and writes it directly to `CareRecipient`. | Gate `diagnosisCodes` to coordinator/clinical roles, or require clinical sign-off. |
| M-5 | **Memory-based upload DoS and no rate limit on intake document endpoints** | 400 / 770 | Medium | `server/src/controllers/patients/IntakeDocumentController.ts:34-52`, `server/src/routes/intake.routes.ts:16-33` | Multer uses `memoryStorage` with a 15 MB limit; `/intake/documents/*` routes have no `documentLimiter`. | Apply `documentLimiter` to all intake document routes and consider streaming multipart to disk. |
| M-6 | **Inconsistent upload size limits across document endpoints** | 400 | Medium | `IntakeDocumentController.ts:36` vs general `DocumentController` | Intake documents allow 15 MB; other document endpoints allow 5 MB. | Centralize and document size limits. |
| M-7 | **No file-type allowlist on general document uploads** | 434 | Medium | General `DocumentController` upload path | No MIME/extension allowlist is enforced for non-intake documents. | Add the same explicit MIME allowlist to all upload paths. |
| M-8 | **S3 `confirm` is a confused-deputy: key prefix is not a pending upload token** | 918 / 922 | Medium | `server/src/controllers/patients/IntakeDocumentController.ts:143-184` | `confirm()` only checks that the key starts with `intake/{userId}/`; any object the user previously uploaded to that prefix can be confirmed. | Issue a one-time upload token in `presign()` and require it in `confirm()`. |
| M-9 | **General document signed URL signs arbitrary S3 keys without ownership check** | 639 | Medium | `server/src/controllers/DocumentController.ts` | Same anti-pattern as M-8: signed URLs can be requested for keys the caller does not own. | Verify ownership of the S3 key against the `Document` table before signing. |
| M-10 | **Episode `submitIntake` and `update` both set `validated`; `update` lacks required review fields** | 841 | Medium | `server/src/routes/episode.routes.ts:14-15`, `CareEpisodeController.ts:146-167`, `179-205` | Both endpoints can transition to `validated`; only `submitIntake` guarantees `intakeSummary`. | Remove `validated` from `updateIntakeSchema`, or require `intakeSummary` and review fields for the transition. |
| M-11 | **Episode `update` allows `intakeSummary` to be overwritten at any status** | 829 / 284 | Medium | `server/src/controllers/patients/CareEpisodeController.ts:146-167` | `updateIntakeSchema` accepts `intakeSummary` regardless of current status. | Block `intakeSummary` edits after validation; log revisions if edits are permitted. |
| M-12 | **`PATCH /api/intake/:id/status` is open to all authenticated roles at route level** | 285 | Medium | `server/src/routes/intake.routes.ts:36` | Route uses only `authenticate`; role checks happen inside the handler. Clinical/admin roles reach the handler unnecessarily. | Restrict the route to `requireCareCoordinator` plus family ownership. |
| M-13 | **Intake `show`/`updateStatus` load by ID without tenant pre-filter** | 284 | Medium | `server/src/controllers/patients/IntakeController.ts:353`, `440`, `assertIntakeAccess:160-176` | Intake is loaded by `id` only; coordinator access helper allows null-org records. | Pre-filter loads with `organizationId` or reject null-org intakes for coordinators. |
| M-14 | **Registered `GET /api/assessments/:id` has no handler** | 706 | Medium | `server/src/routes/assessment.routes.ts:12` | `router.get('/:id', AssessmentController.show)` is mounted, but `AssessmentController` has no `show` method. | Implement `AssessmentController.show` with `assertAccess`, or remove the route. |
| M-15 | **`GET /api/episodes/:id` returns full family-user profile** | 201 | Medium | `server/src/controllers/patients/CareEpisodeController.ts:126-142` | Coordinator view includes `patient: true` (full family account object) plus `careRecipient: true`. | Select only needed fields for `patient`; do not include full profile. |
| M-16 | **Episode can bypass `under_review` and jump from `intake_submitted` to `validated` or `closed`** | 841 | Medium | `server/src/utils/stateMachine.ts:19` | State machine allows `intake_submitted → validated`. | Restrict `intake_submitted` to only `under_review` and `closed`; require `under_review` before `validated`. |
| M-17 | **Assessment `type` is free-form string, not a fixed enum** | 20 | Medium | `server/src/controllers/patients/AssessmentController.ts:32` | `createSchema.type` uses `z.string().min(2).max(80).default('initial')`. | Use `z.enum(['initial', 'follow_up', 'discharge'])` or the Prisma `AssessmentStatus` enum. |
| M-18 | **Completed assessment can be rescheduled/retyped/reassigned** | 841 / 284 | Medium | `server/src/controllers/patients/AssessmentController.ts:247-329` | `update()` accepts `scheduledAt`, `type`, `assessorId`, and `findings` even after `status: 'completed'`. | Reject field updates to completed assessments except for coordinator-managed corrections. |
| M-19 | **Clinical staff can cancel assigned assessments without coordinator approval** | 285 | Medium | `server/src/controllers/patients/AssessmentController.ts:260-267` | Clinical staff can patch their own assessment; the state machine allows `scheduled → cancelled`. | Document intended permissions; require coordinator role for cancellation if policy demands it. |
| M-20 | **Assessment findings schema allows arbitrary JSON keys** | 20 | Medium | `server/src/controllers/patients/AssessmentController.ts:43` | `updateSchema.findings` is `z.record(z.unknown()).optional()`. | Define a strict findings schema with known string/null keys. |
| M-21 | **Family onboarding creates care-unit/patient records before intake submission** | 837 | Low/Medium | `client/src/pages/family/FamilyOnboardingPage.tsx:265-399` | `ensureCareUnitId`, `createPatient`, and `updateCareUnit` run during upload and final submit. Abandoned wizards leave orphan records. | Create care unit and patient only at final submit, or add a cleanup job for empty units/patients. |
| M-22 | **Intake withdrawal does not notify the coordinator or cancel the linked episode** | 841 | Low/Medium | `server/src/controllers/patients/IntakeController.ts:439-481` | `withdrawn` status is allowed, but there is no notification to the coordinator and no check for an already-created episode. | On withdrawal, notify the coordinator and consider blocking further episode actions. |
| M-23 | **No Content-Security-Policy configured by Helmet** | 693 | Medium | `server/src/app.ts:69` | `helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })` is mounted, but no CSP policy is set. | Add a strict CSP via `helmet.contentSecurityPolicy()`. |
| M-24 | **Silent notification failures** | 778 | Medium | `server/src/controllers/patients/AssessmentController.ts:235,242,326`, `IntakeController.ts:601` | `NotificationService.create(...).catch(() => undefined)` swallows all errors. | Remove `.catch(() => undefined)`; log failures and surface a non-blocking warning or queue with retry. |
| M-25 | **Assessment scheduling/update is not transactional with audit/notification** | 707 | Medium | `server/src/controllers/patients/AssessmentController.ts:208-244`, `291-329` | DB mutation succeeds even if `AuditService.log` or `NotificationService.create` fails. | Wrap DB mutation + audit + notification in a transaction or compensating saga. |
| M-26 | **Coordinator can reassign an assessment to any active clinical user in the platform** | 639 | Medium | `server/src/controllers/patients/AssessmentController.ts:264-265`, `296` | `update()` accepts `assessorId` for coordinators, and `store()` does not restrict assessor to the episode's org (H-1). A coordinator can reassign assessments across tenants. | Gate `assessorId` updates to users in the same organization as the assessment's episode. |
| M-27 | **`AssessmentController.index` `episodeId` query parameter is not tenant-validated** | 639 | Medium | `server/src/controllers/patients/AssessmentController.ts:119-159` | The endpoint accepts `episodeId` from query and filters directly. Coordinator/admin path does not verify the episode belongs to the caller's tenant before returning assessments. | Verify the referenced episode belongs to the caller's tenant, or reject `episodeId` for non-platform-admin roles. |
| M-28 | **Assessment `patientId` inherits the wrong `episode.patientId`** | 840 | Medium | `server/src/controllers/patients/AssessmentController.ts:212` | `store()` sets `patientId: episode.patientId`. Because `episode.patientId` is currently the family user (C-1), the assessment's patient relation is also wrong. | Fix C-1, then verify assessment `patientId` points to the care recipient. |
| M-29 | **Coordinator submitting intake cannot link family-owned documents** | 841 | Medium | `server/src/controllers/patients/IntakeController.ts:304-318` | Document-ownership check uses `userId = req.user!.userId`. A coordinator submitting on behalf of a family does not own the family's documents, so submission fails if documents are attached. | For staff submissions, verify documents belong to the intake's care unit rather than the submitting user. |
| M-30 | **Episode `show`/`update`/`submitIntake` leak existence via 404 before auth check** | 204 | Medium | `server/src/controllers/patients/CareEpisodeController.ts:126-142`, `146-167`, `179-205` | Each handler loads the episode by `id`, throws `404` if missing, then calls `assertEpisodeAccess`. A cross-tenant caller can enumerate episode IDs and learn which exist. | Return a uniform 404 for both missing and unauthorized records, or pre-filter the load with tenant scoping. |
| M-31 | **Document-download status codes leak document existence and file presence** | 204 | Low/Medium | `server/src/controllers/patients/IntakeDocumentController.ts:258-314` | Returns 404 for missing document, 403 for unauthorized, and 404 for missing local file. An attacker learns whether a given ID exists and whether the backing file exists. | Return a uniform 404 for missing/unauthorized and a generic 500/log for missing backing file. |
| M-32 | **Local file download is vulnerable to path traversal via poisoned `metadata.fileKey`** | 22 / 73 | Medium | `server/src/controllers/patients/IntakeDocumentController.ts:286-291` | `fileKey` is read from user-influenced `doc.metadata`. `path.basename(fileKey)` does not strip all traversal forms; `fileKey = '..'` yields `path.join(dir, '..')`, escaping the upload root. | Validate `fileKey` against a strict pattern (e.g., `intake/{uuid}/{safeName}`) and reject `..`, leading slash, or non-allowed characters. |
| M-33 | **General `DocumentController` upload stores files with raw `originalname` and no MIME allowlist** | 434 / 20 | Medium | `server/src/controllers/DocumentController.ts:62-99` | `uploadMiddleware` uses `memoryStorage` with 20 MB limit and no file-type filter. `key` embeds `req.file.originalname` directly. No MIME/extension allowlist. | Add the same explicit MIME allowlist used for intake documents; sanitize or reject special characters in `originalname`. |
| M-34 | **`POST /document/signed-url` signs any S3 key without ownership or prefix validation** | 918 / 639 | Medium | `server/src/routes/document.routes.ts:49-54` | Accepts arbitrary `key` from body and calls `getSignedUrl` without verifying the caller owns the object or that the key starts with `documents/{userId}/`. | Look up the `Document` row by `fileKey` and verify `userId` matches the caller before signing. |
| M-35 | **S3 key in document upload routes embeds unsanitized `originalname`** | 20 | Low/Medium | `server/src/routes/document.routes.ts:22`, `server/src/controllers/DocumentController.ts:68-69` | `key = \`documents/${userId}/${uuidv4()}-${req.file.originalname}\`` allows special characters, leading to S3 object-key pollution and potential traversal-like behavior in downstream consumers. | Strip or replace characters outside `[a-zA-Z0-9._-]` in `originalname` before composing the key. |
| M-36 | **Episode summary PDF uses `patient.name`/`email` without input sanitization** | 79 | Low/Medium | `server/src/services/CareSummaryPDFService.ts:60-75` | `PDFDocument.text()` is called with user-controlled `episode.patient.name` and `email`. PDFKit escapes text, but malicious Unicode or overlong strings could affect rendering or layout. | Apply length limits and plain-text sanitization before writing into the PDF. |
| M-37 | **Document request `documentType` is a free-form string used directly in notifications** | 20 / 79 | Low/Medium | `server/src/controllers/documents/DocumentRequestController.ts:7-12`, `31-37` | `documentType` is `z.string()` and inserted into notification body. If rendered in HTML/email clients without escaping, it becomes a stored XSS vector. | Use an enum for `documentType` and sanitize before inserting into messages. |
| M-38 | **Local upload directory is under `process.cwd()` and not hardened** | 73 | Low | `server/src/controllers/patients/IntakeDocumentController.ts:21` | `LOCAL_UPLOAD_ROOT = path.join(process.cwd(), 'uploads', 'intake')`. If the working directory is writable or shared, uploads can escape intended isolation. | Store uploads outside the application root, enforce per-user subdirectories, and restrict filesystem permissions. |
| M-39 | **Password reset token is not single-use and not bound to user state** | 640 | High | `server/src/controllers/auth/AuthController.ts:254-300` | `resetPassword()` marks `verifiedAt` but does not revoke sessions or invalidate other active reset tokens for the same user. An old/stolen reset token can still change the password after the user logs back in. | Delete all `password_reset` tokens for the user on successful reset, rotate the password hash version, and terminate all active sessions/refresh tokens. |
| M-40 | **Password reset does not invalidate existing sessions** | 613 | High | `server/src/controllers/auth/AuthController.ts:280-300` | After `resetPassword`, no `logoutAll` or refresh-token revocation occurs. An attacker who already has a session remains logged in even after the victim resets the password. | Call `logoutAll` semantics (revoke refresh tokens + `recordLogoutAll`) after every successful password reset. |
| M-41 | **2FA disable only requires the current password** | 287 | High | `server/src/controllers/auth/AuthController.ts:334-348` | `disable2fa` verifies password but does not require a fresh 2FA code. A password-only phish or credential-stuffing result fully disables 2FA. | Require a valid TOTP code or re-authentication with 2FA before disabling 2FA. |
| M-42 | **Device token registration allows re-binding an existing token to a new account** | 284 | Medium | `server/src/controllers/auth/DeviceTokenController.ts:18-34` | `register()` finds a token by value and updates `userId`. An attacker can register a victim's leaked FCM/APNs token to their own account and receive victim push notifications. | Reject tokens already bound to a different `userId`; require token ownership proof. |
| M-43 | **OTP verification logs the user in without requiring a password** | 287 | High | `server/src/controllers/auth/OtpController.ts:56-125` | `verify()` issues access/refresh cookies for any verified email or phone OTP. If OTP is leaked or brute-forced, the account is fully compromised without a password. | Do not issue full session cookies from OTP verification; use OTP only for verification, then require password/MFA. |
| M-44 | **OTP table keeps used codes indefinitely, enabling replay after rotation** | 613 | Medium | `server/src/controllers/auth/OtpController.ts:70-82` | `verify()` matches on `verifiedAt: null` and marks it on use, but records are never purged. A stolen or guessed OTP reused within the expiry window is accepted. | Enforce strict rate limiting, short expiry, and delete OTP records immediately after successful verification. |
| M-45 | **`/api/user/password` does not require 2FA even when 2FA is enabled** | 287 | High | `server/src/controllers/users/UserProfileController.ts:34-52` | `updatePassword` only checks current password. If 2FA is enabled, changing credentials should require a second factor. | Require a fresh 2FA TOTP code for password change when `twoFactorEnabled` is true. |
| M-46 | **`migrateRole` controller still lacks internal guard; route now requires admin** | 284 | High | `server/src/controllers/users/UserProfileController.ts:134-141`; `server/src/routes/auth.routes.ts:80` | The route was fixed to `requireAdmin`, but the controller method still accepts arbitrary `userId`/`role` and casts `role as any`. A future route misconfiguration or direct import would re-introduce privilege escalation. | Keep the route guard, add an internal `requireAdmin` check inside `migrateRole`, restrict target role to allowed values, and log every role change. |
| M-47 | **Registration accepts any `role` from the `UserRole` enum** | 269 | Critical | `server/src/controllers/auth/RegistrationController.ts:12-69` | `registerSchema` allows `role: z.nativeEnum(UserRole).optional()`. A new user can sign up as `admin`, `super_admin`, or `care_coordinator`. | Default role to `client` and reject explicit role assignment except by an admin-invite flow. |
| M-48 | **Admin secret login bypasses password and 2FA entirely** | 287 / 798 | Critical | `server/src/routes/auth.routes.ts:17-28` | `/admin/login` issues a full session from a single shared `ADMIN_SECRET` and email. Anyone with the secret can log in as any admin without password or 2FA. | Remove or gate behind MFA, IP allowlist, and audit every use; rotate `ADMIN_SECRET` regularly. |
| M-49 | **Refresh token lookup is by plaintext token, enabling timing attacks** | 208 | Low | `server/src/utils/refreshTokenStore.ts` | If tokens are stored and compared as plaintext/hashed without constant-time comparison, an attacker with DB access can replay tokens. | Hash refresh tokens with HMAC before storage and compare using constant-time comparison. |
| M-50 | **Email verification link token is not bound to the user ID in the query** | 640 | Medium | `server/src/controllers/auth/AuthController.ts:480-519` | `verifyEmailLink` matches on `identifier: email` + `otp: token`. If an attacker requests verification for their own email and the victim clicks a crafted link, the token can be replayed. | Include a signed user-id bound token or verify the token belongs to the user whose email is being verified. |
| Z-1 | **`PATCH /assessments/:id` is open to all authenticated users** | 285 | **High** | `server/src/routes/assessment.routes.ts:13` | `AssessmentController.update` has handler-level checks, but the route only uses `authenticate`. Any authenticated role (family, provider, staff) reaches the update handler and can hit edge cases or future code paths. | Add `requireCareCoordinator` to `PATCH /assessments/:id` (or require clinical ownership explicitly at the route level). |
| Z-2 | **Care-unit routes have no role guards — any authenticated user can create/modify care units and patients** | 285 | **Critical** | `server/src/routes/careUnit.routes.ts:8-16` | `GET /, POST /, GET /:id, PATCH /:id, GET /:id/patients, POST /:id/patients, PATCH /:id/patients/:patientId` all use only `authenticate`. Controllers perform some access checks, but a provider/staff/client can reach `store`, `update`, `createPatient`, `updatePatient`, and `patientRevisions`. | Apply `requireCareCoordinator` (or family+coordinator+admin) to write routes and validate the caller’s tenant/family ownership before mutation. |
| Z-3 | **Document approve/reject/delete and fetch allow any authenticated user** | 285 | **High** | `server/src/routes/document.routes.ts:66-94` | `GET /:id`, `DELETE /:id`, `POST /:id/approve`, and `POST /:id/reject` only use `authenticate`. No ownership or admin check. Any user can approve, reject, soft-delete, or leak metadata of any document. | Add ownership/admin checks or reuse `requirePermission` middleware; reject cross-user document mutations. |
| Z-4 | **Booking mutation routes lack consistent ownership checks** | 285 / 862 | **High** | `server/src/routes/booking.routes.ts:94-246` | `PATCH /:id/status`, `POST /:id/start`, `POST /:id/complete`, `POST /:id/counter-offer`, `POST /:id/no-show`, `POST /:id/provider-no-show`, `POST /:id/pay-with-credits`, and extras routes do not verify the caller is the assigned client/provider before loading the booking. Some handlers check providerId, but status/counter-offer/no-show/pay paths accept any authed user. | Centralize `assertBookingAccess` and call it before every booking mutation. |
| Z-5 | **Many admin routes bypass granular permission middleware** | 285 | **Critical** | `server/src/routes/admin.routes.ts:90-449` | Endpoints such as `/admin/payouts/*`, `/admin/documents/*`, `/admin/reports/*`, `/admin/platform-staff/*`, `/admin/bookings/:id/force-cancel`, and advanced-admin routes are protected only by top-level `requireAdmin`, not by `requireView`/`requireEdit`/`requireDelete`/`requireApprove`. Any admin can perform any admin action. | Apply the existing `requireView`/`requireEdit`/`requireDelete`/`requireApprove` factories to every admin route. |
| Z-6 | **Any authenticated user can request documents from arbitrary target users** | 285 | **High** | `server/src/controllers/documents/DocumentRequestController.ts:14-43` | `DocumentRequestController.create` lacks role/tenant check. A client/provider can POST `targetUserId` and `documentType`, creating a request and notification for any user. | Restrict `create` to coordinators/admins; verify target user belongs to the caller’s tenant. |
| Z-7 | **Document-request list conflates requester visibility with target visibility** | 285 | **Medium** | `server/src/controllers/documents/DocumentRequestController.ts:45-61` | `isAdmin` includes `care_coordinator`, but the query filters by `requestedById` for admins and `targetUserId` for non-admins. Coordinators see only their own requests, not targets; non-coordinator users could see requests targeting them if they were ever marked admin elsewhere. | Use `hasPermission` or explicit role checks; separate requester and target queries. |
| Z-8 | **Demo coordinator routes are publicly accessible** | 200 | **Low/Info** | `client/src/routes/index.tsx:395-406` | `/demo/coordinator/*` uses `DemoCoordinatorLayout` only (no `ProtectedRoute`). The demo prototype pages expose UI/components that mirror real coordinator functionality. | Gate demo routes behind authentication or move them behind a feature flag/dev-only build. |

---

## 5. Low / Informational Findings

| # | Finding | CWE | Severity | File / Lines | Evidence | Recommended Fix |
|---|---|---|---|---|---|---|
| L-1 | **Patient revision endpoint exposes editor email unnecessarily** | 201 | Low | `server/src/controllers/patients/CareUnitController.ts:359-372` | Revisions include `changedBy: { id, name, email }`. | Strip `email` from `changedBy` unless the viewer is an admin managing the editor. |
| L-2 | **Patient/care-unit revisions record full snapshots but do not diff fields** | — | Low | `server/src/controllers/patients/CareUnitController.ts:337-344`, `222-230` | Every update creates a snapshot, but no field-level diff is computed. | Add diff computation and block changes to ownership/foreign-key fields. |
| L-3 | **Client renders document URLs directly into `<a href>` without scheme validation** | 79 / 602 | Low | `client/src/pages/careseeker/DocumentsPage.tsx:607-616` | `file_url` is passed straight to an anchor `href`. | Validate URL scheme server-side (allow only `https://`, `/api/...`, configured S3 host) and reject `javascript:`, `data:`, `blob:`. |
| L-4 | **Latent stored XSS in coordinator review summary** | 79 | Low | `server/src/controllers/patients/IntakeController.ts:52-60` | `reviewSchema` does not sanitize review text fields. React escapes them today, but future PDF/email exports could execute stored HTML/JS. | Apply `sanitizePlainText`/`sanitizedString` to all review text fields. |
| L-5 | **`Consent` table only keeps latest consent per `(userId, consentType)`** | — | Low | `server/src/controllers/patients/IntakeController.ts:95-118` | `Consent` is upserted by `(userId, consentType)`, so per-intake state is lost. Immutable `ConsentLog` preserves history. | Document that `ConsentLog` is the source of truth, or add `intakeRecordId` to the `Consent` unique key. |
| L-6 | **`wizardPayload` is not deeply validated** | 20 | Low | `server/src/controllers/patients/IntakeController.ts:40` | Schema is `z.record(z.unknown()).optional()`. | Tighten the schema or strip unexpected keys. |
| L-7 | **No dedicated coordinator dashboard endpoint** | — | Low | `client/src/lib/api/shellStats.ts:110-138` | Dashboard stats are aggregated client-side from four endpoints; failures silently fall back to `0`. | Add a server-side `GET /api/coordinator/dashboard` endpoint. |
| L-8 | **Demo label mismatch: "Reduced mobility" vs chip option "mobility"** | — | Info | `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx:35` | `CONCERN_OPTIONS` contains `mobility`. | Align demo script or rename chip label. |
| L-9 | **Original `serviceInterests` not shown in coordinator intake detail panel** | — | Low | `client/src/pages/coordinator/CoordinatorIntakeQueuePage.tsx:392-409` | Read-only summary does not render `detail.serviceInterests`. | Add a read-only **"Requested services"** field. |

---

## 6. Consolidated Remediation Order

### Before client demo
1. Fix `CareEpisode.patientId` mapping in `IntakeController.review` (C-1).
2. Fix cross-tenant intake submission in `IntakeController.submit` (C-4).
3. Fix cross-tenant episode creation in `CareEpisodeController.store` (C-3).
4. Fix cross-tenant care-unit creation in `CareUnitController.store` (C-2).
5. Fix summary-PDF org bypass in `episode.routes.ts` (C-5).
6. Fix assessor cross-organization assignment in `AssessmentController.store` (H-1).
7. Fix episode `update` mass-assignment and loose status schema (H-3).
8. Fix concurrent intake-review race condition (H-2).
9. Remove or restrict `UserProfileController.migrateRole` (M-46).
10. Reject arbitrary role registration (M-47).
11. Remove or harden admin secret login (M-48).
12. Make password reset terminate all sessions and revoke all reset tokens (M-39, M-40).
13. Require 2FA for password change when 2FA is enabled (M-45).
14. Stop issuing full sessions from OTP verification (M-43).
15. Add role guards to all care-unit write routes (Z-2).
16. Add ownership/admin checks to document approve/reject/delete/fetch routes (Z-3).
17. Centralize `assertBookingAccess` on all booking mutation routes (Z-4).
18. Apply granular `requireView/Edit/Delete/Approve` middleware across admin routes (Z-5).
19. Restrict document-request creation to coordinators/admins with tenant validation (Z-6).
20. Add `requireCareCoordinator` to `PATCH /assessments/:id` (Z-1).

### Before staging
21. Harden S3 presign/confirm with upload tokens and `HeadObject` verification (H-4, M-8, M-9).
22. Add rate limiting to intake/assessment/document routes (M-5).
23. Remove `image/*` wildcard and centralize MIME allowlists across upload paths (H-5, M-7).
24. Fix orphan-record / null-organization access across intake, documents, care units (M-1).
25. Redact PHI from audit `before`/`after` objects (M-2).
26. Strip `organizationId`/`clinicId` from care-unit updates for non-admins (M-3).
27. Gate patient `diagnosisCodes` edits to clinical/coordinator roles (M-4).
28. Centralize and document upload size limits (M-6).
29. Remove `validated` from episode `update` or require `intakeSummary` and review fields (M-10).
30. Block `intakeSummary` edits after validation in `CareEpisodeController.update` (M-11).
31. Restrict intake status route to coordinator + family owner (M-12).
32. Pre-filter intake loads by tenant and reject null-org access (M-13).
33. Implement or remove `GET /api/assessments/:id` (M-14).
34. Select only needed patient fields in `GET /api/episodes/:id` (M-15).
35. Restrict episode state machine so `intake_submitted → validated` is disallowed (M-16).
36. Use fixed enum for assessment `type` and block edits to completed assessments (M-17, M-18).
37. Define clinical cancellation policy and enforce in `AssessmentController.update` (M-19).
38. Strictly validate assessment findings schema (M-20).

### Defense in depth / reliability
39. Add a strict CSP via Helmet (M-23).
40. Remove `.catch(() => undefined)` from notification calls and log/queue failures (M-24).
41. Wrap assessment DB mutation + audit + notification in a transaction or saga (M-25).
42. Strip editor email from patient revisions (L-1).
43. Add field-level diffs to patient/care-unit revisions and block ownership-field changes (L-2).
44. Validate document URL scheme server-side (L-3).
45. Sanitize coordinator review summary text fields (L-4).
46. Document `ConsentLog` as immutable source of truth or add `intakeRecordId` to `Consent` key (L-5).
47. Tighten `wizardPayload` schema (L-6).
48. Harden local file download path construction and validate `fileKey` strictly (M-32, M-38).
49. Add MIME allowlist and filename sanitization to general document upload (M-33, M-35).
50. Verify S3 key ownership before signing in `/document/signed-url` (M-34).
51. Sanitize patient data before PDF generation (M-36).
52. Restrict `DocumentRequest.documentType` to an enum and sanitize notification text (M-37).
53. Make password reset tokens single-use and terminate all sessions on reset (M-39, M-40).
54. Require 2FA code to disable 2FA and to change password when 2FA is enabled (M-41, M-45).
55. Prevent device push tokens from being re-bound across accounts (M-42).
56. Do not issue full login sessions from OTP verification alone (M-43, M-44).
57. Remove or strictly gate `UserProfileController.migrateRole` (M-46).
58. Reject arbitrary role registration and admin backdoor login (M-47, M-48).
59. Harden refresh-token storage and email-verification token binding (M-49, M-50).
60. Fix document-request list visibility logic (Z-7).
61. Gate demo coordinator routes behind auth or dev-only flag (Z-8).

### UI / demo polish
62. Add server-side coordinator dashboard endpoint (L-7).
63. Add "Requested services" read-only field to intake detail panel (L-9).
64. Align "Reduced mobility" demo script wording with the `mobility` chip option (L-8).

---

## 7. Chained Exploitation Scenarios

1. **C-1 → M-15 / M-13 / API family scoping:** Fixing the patient mapping cascades into broken family access and assessment scoping. All related findings must be fixed together.
2. **C-2 → C-3 → C-5:** A coordinator in org A creates a care unit tied to a family in org B, binds an episode, and reads the episode summary PDF because the PDF endpoint lacks org scoping.
3. **H-4 → H-5:** A malicious user uploads a 50 MB SVG via presign/confirm bypassing the 15 MB limit and the MIME allowlist, achieving stored XSS without a CSP to block it.
4. **M-10 → M-11 → M-16:** A coordinator bypasses structured review by calling `PATCH /episodes/:id` with `status: validated`, then later overwrites `intakeSummary`, undermining the clinical audit trail.
5. **Z-2 → C-1 → C-5:** Because care-unit routes are unguarded, an attacker can create a care unit, trigger an intake review, and the resulting episode has `patientId = familyUserId` (C-1); the same attacker can then request the episode summary PDF because the route treats them as a party/coordinator.
6. **Z-5 → Z-3:** Any admin can approve/reject/soft-delete any document because admin routes lack granular permissions and document mutation routes lack ownership checks.

---

## 8. Sign-off

- **Source-code review methodology:** CodeGraph-indexed, exact line-number verification.
- **Scope:** M2 controllers, routes, middleware helpers, client rendering paths, and authorization model.
- **No dynamic testing:** Findings are source-code only.
- **No code edits made:** Report is read-only relative to branch `milestone-2`.
- **Report status:** Ready for the development team.
- **Next step:** Address critical findings C-1 through C-5, Z-2, Z-5, M-47, and M-48 before the client demo; address high and medium findings before staging.

---

*Report generated from `milestone-2` branch, commit `161a3a9`, by pure source-code review. No code edits were made.*
