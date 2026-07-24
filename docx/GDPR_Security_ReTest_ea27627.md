# M2 Re-Test Report — GDPR + Security + HIPAA

**Date:** 2026-07-23
**Auditor:** Karim Ashraf
**Branch:** `milestone2-revisions`
**Previous re-test commit:** `d4980d1`
**Current commit:** `ea27627`
**Scope:** Source-code review of changes introduced by `c2a074d` ("Ahmed M2 revisions") plus the rename commit `ea27627`. No dynamic testing.

---

## Executive Summary

The new commits on `milestone2-revisions` introduce product-level changes requested by Ahmed:
- Coordinator assignment workflow for care episodes.
- Family onboarding flow simplification.
- Retirement of `/provider/*` and `/careseeker/*` route trees.
- Backend self-registration limited to `family` and `patient`.
- UI improvements (breadcrumbs, mobile sidebar).

This re-test evaluates those changes for GDPR, security, HIPAA, and business-logic impact.

**Verdict:**
- The coordinator assignment feature is **well-designed** from an authorization standpoint: it uses tenant scoping, `assertEpisodeAccess`, and audit logging.
- `IntakeController.review` **does not accept an arbitrary `coordinatorId`** in this branch; episode creation always uses the reviewing coordinator. A prior high-severity finding to that effect was **withdrawn** after re-verification.
- The family onboarding redirect and registration simplification **reduce attack surface** but the registration endpoint still accepts any `UserRole` in its schema, which is both a security and a GDPR purpose-limitation issue (R-3).
- A focused business-logic pass of payment, wallet, refund, marketplace, and booking surfaces identified additional medium- and high-severity findings (R-13 through R-21 and HIPAA mirrors H-33 through H-36), including missing ownership checks in payment verification, unverified PayTabs webhooks, and unverified provider self-refunds.
- Several **security findings from the original `M2_SECURITY_REVIEW.md` remain unaddressed** because they are unrelated to Ahmed's revisions; this report does not re-score the entire codebase, only the changed surfaces and the payment/booking business-logic paths directly related to M2 care workflows.

No code changes were made to produce this report.

---

## 1. Coordinator Assignment Feature

### 1.1 New endpoints

| Method | Path | Handler | Route guard |
|---|---|---|---|
| GET | `/api/episodes/coordinators` | `CareEpisodeController.coordinators` | `requireCareCoordinator` |
| PATCH | `/api/episodes/:id/assign-coordinator` | `CareEpisodeController.assignCoordinator` | `requireCareCoordinator` |

### 1.2 Source-code observations

**`CareEpisodeController.coordinators` (`server/src/controllers/patients/CareEpisodeController.ts:1-205`)**
- Builds a `where` with `role: 'care_coordinator'` and calls `mergeTenantOrg(req, where)`.
- Returns `id`, `name`, `email`.
- **Positive:** tenant-scoped; only coordinators in the caller's organization are returned.
- **GDPR note (G-27):** Returns `email` to the coordinator client, which is needed for the assignment dropdown. This is acceptable for the purpose but should be documented; consider not returning `email` if the UI only needs `name`.
- **GDPR note:** Returns sequential/internal `id` values. While this is not by itself a GDPR violation, it increases enumeration surface when combined with the assignment endpoint and conflicts with the GDPR preference for opaque identifiers.

**`CareEpisodeController.assignCoordinator` (`server/src/controllers/patients/CareEpisodeController.ts:1-205`)**
- Loads episode by `id`, calls `assertEpisodeAccess(req, episode)`.
- Loads target coordinator by `coordinatorId`, verifies `role === 'care_coordinator'`.
- Calls `assertTenantOrgAccess(req, coordinator.organizationId)`.
- Updates `CareEpisode.coordinatorId`.
- Logs via `AuditService.log` with `before`/`after` coordinator IDs.
- **Positive:**
  - Cross-tenant reassignment is blocked by `assertTenantOrgAccess`.
  - Family cannot call it because of `requireCareCoordinator` route guard.
  - Audit trail exists.
- **Security note:** If `coordinator.organizationId` is `null`, `assertTenantOrgAccess` returns early (no-op for platform admins). A platform admin could be assigned to an org-scoped episode. This is consistent with existing platform-admin design but worth documenting.
- **GDPR note:** The audit log stores `before`/`after` coordinator IDs. These are non-sensitive identifiers; with the H-7 redaction fix in `d4980d1`, this is acceptable.

### 1.3 Security verdict

| Concern | Status | Notes |
|---|---|---|
| Cross-tenant coordinator reassignment | ✅ Mitigated | `assertTenantOrgAccess` on both episode and coordinator. |
| Family/self-service reassignment | ✅ Blocked | `requireCareCoordinator` route guard. |
| IDOR / arbitrary episode access | ✅ Mitigated | `assertEpisodeAccess` returns uniform 404. |
| Audit trail | ✅ Present | `episode_coordinator_assigned` logged. |
| Over-inclusion of coordinator email | ⚠️ Low | `email` returned; review if UI actually needs it. |
| Internal ID exposure | ⚠️ Low | Sequential `id` returned; consider UUIDs or response-only IDs. |
| Function-level auth on coordinator list | ✅ Mitigated | `requireCareCoordinator` route guard. |
| Object-level auth on assignment endpoint | ✅ Mitigated | Episode access + tenant check on target coordinator. |

---

## 2. Intake Review

### 2.1 Change

`reviewSchema` in `server/src/controllers/patients/IntakeController.ts:52-60` no longer accepts an optional `coordinatorId`. The episode is always created with the reviewing coordinator as the episode coordinator (`coordinatorId: req.user!.userId` at line 538). Coordinator reassignment must happen afterward via `PATCH /api/episodes/:id/assign-coordinator`, which does validate role and tenant.

### 2.2 Source-code observations

- Episode creation is guarded by `requireCareCoordinator` at `server/src/routes/intake.routes.ts:37`.
- `assertIntakeAccess` ensures the coordinator belongs to the intake's organization.
- The created episode uses `intake.organizationId`, `intake.careUnitId`, `intake.careRecipientId`, and `intake.familyUserId`, all taken from the already-validated intake.

### 2.3 Security / GDPR verdict

| Concern | Status | Notes |
|---|---|---|
| Cross-tenant episode creation | ✅ Mitigated | Access check on intake + org-scoped episode. |
| Arbitrary coordinator assignment at review time | ✅ N/A | `coordinatorId` is not accepted from the client. |
| Family triggering review | ✅ Blocked | `requireCareCoordinator` route guard. |
| Audit trail | ✅ Present | `intake_reviewed` + `careEpisode` creation logged. |

### 2.4 GDPR observations

- The review copies `medicalHistory`, `currentMeds`, `diagnoses`, and `serviceInterests` from the intake into the episode. This is purpose-consistent (health data for care delivery) but relies on the family/guardian consent captured at intake submission, not on consent from the care recipient themselves.
- The audit log for `intake_submitted` records `diagnoses` (special-category data) in the `after` blob. GDPR logging rules recommend not logging health data; consider logging only metadata (count, status) rather than codes.
- Consent for intake is recorded against `familyUserId`, with types `privacy`, `treatment`, `telehealth`, and `data_sharing`. There is **no `care_recipient_health:{recipient.id}` consent** recorded on behalf of the care recipient. Any prior report claiming this is incorrect.

---

## 3. Family Onboarding Flow

### 3.1 Changes

- `RegisterPage.tsx`: self-registration is always `family`; no role picker.
- `HealthRoleLayout.tsx`: redirects family/patient users with incomplete onboarding to `/family/onboarding`.
- `OnboardingPage.tsx`: calls `completeClientOnboarding()` and `refreshUser()` before navigating.

### 3.2 GDPR observations

**Positive**
- Reduces role-selection ambiguity.
- Forces completion of onboarding before accessing family portal, improving consent/data-quality posture.

**Observation (not a finding)**
- The redirect in `HealthRoleLayout.tsx` uses `user.onboarding_status` from the auth context. If the auth context is stale, the redirect may loop or fail. The `refreshUser()` call in onboarding mitigates this.
- Registration defaults to `family`. If a patient needs an independent account, an admin-invite flow is required. This is a product decision, not a compliance issue.

### 3.3 Security / GDPR observations

- Removing `/provider/*` and `/careseeker/*` route trees eliminates a large surface area of potentially unmaintained pages.
- The catch-all redirect (`/provider/*` and `/careseeker/*` → `/login?portal=family`) could be used to phish users with legacy bookmarks, but the redirect target is safe.
- **R-3 — Mass assignment / role tampering:** `RegistrationController.register` uses `registerSchema` with `role: z.nativeEnum(UserRole).optional()` (`server/src/controllers/auth/RegistrationController.ts:20`). The controller then falls back to `const role = data.role ?? 'client'` (line 59), which defaults to `client` — a role that is not in the intended public self-registration set. There is no `PUBLIC_SELF_REGISTER_ROLES` whitelist in this file; the restriction appears to be UI-only. A crafted request can still submit any Prisma `UserRole`. This is both a security (mass assignment) and GDPR (purpose limitation / data minimization) issue because an unintended role changes the processing purpose and access scope.
  - **Recommended fix:** Change schema to `z.enum(['family', 'patient']).default('family')` and reject any explicit role outside that set. Also align the fallback default with the UI (`family`).
- **R-7 — Excessive registration response:** The registration response returns `{ id, name, email, role, onboardingStatus }` (`server/src/controllers/auth/RegistrationController.ts:106-114`). Under GDPR data minimization, the client only needs to know that verification is required; returning the full user record is excessive.
  - **Recommended fix:** Return only `{ success, requiresEmailVerification, message, user: { id, onboardingStatus } }` or remove `user` entirely.
- **R-8 — Unmasked IP in consent records:** `RegistrationController` (line 80) and `ConsentController` (`server/src/controllers/caremanagement/ConsentController.ts:42`) store `req.ip` directly in `Consent.ipAddress` and `ConsentLog.ipAddress`. GDPR best practice is to anonymize IPs (mask last octet for IPv4, last 80 bits for IPv6) before storage.
  - **Recommended fix:** Apply an anonymization helper before writing `ipAddress` to consent and consent-log tables.
- **Self-approval / maker-checker note:** The registration flow itself both creates the user and records `consent` as granted. There is no independent verification step for public self-registration; this is expected for a self-service signup but should be documented in the data governance record.

---

## 4. Role Retirement

### 4.1 Changes

- Backend registration no longer restricts roles via a server-side whitelist; the UI restricts roles only.
- Removed entire `/provider/*` and `/careseeker/*` client route blocks.

### 4.2 GDPR impact

- Reduces the number of roles that can access personal data, supporting data minimization and access control (Art. 5.1(c), 32).
- Does not change retention, erasure, or export logic.

### 4.3 Security impact

- Positive: removes legacy routes that may have had weaker guards.
- The backend still contains `UserRole` enum values for `provider`, `client`, `consumer`, etc. Admin/migration routes could still create such users. This is acceptable as long as admin routes remain guarded.

---

## 5. UI Improvements

### 5.1 Changes

- `Breadcrumb.tsx` new component.
- Mobile sidebar close button.
- Breadcrumbs on care detail pages.

### 5.2 Security / GDPR / HIPAA impact

- No direct security or GDPR impact.
- Breadcrumb labels may display patient/care-unit names. This is expected for authenticated care pages and does not leak data to unauthorized users.
- Under HIPAA minimum-necessary, ensure breadcrumbs do not expose `externalRef` or other patient identifiers to users who do not need them.

---

## 6. HIPAA Assessment

### 6.1 Scope

This section applies HIPAA-specific guardrails to the changed surfaces:
- Coordinator assignment endpoints (`CareEpisodeController.coordinators`, `CareEpisodeController.assignCoordinator`).
- Intake review → episode creation (`IntakeController.review`).
- Family onboarding / registration simplification (`RegistrationController.register`).

Assumption: Riayah Plus may process PHI (names, health data, diagnoses, care episodes) for US healthcare workflows.

### 6.2 PHI identification

| Field / data | PHI? | Notes |
|---|---|---|
| `CareEpisode.title` (`Care episode — {careRecipient.name}`) | ✅ Yes | Contains care-recipient name. |
| `CareEpisode.reasonForCare`, `medicalHistory`, `currentMeds`, `diagnoses` | ✅ Yes | Explicit health data. |
| `CareRecipient.name`, `externalRef`, `diagnosisCodes`, `dateOfBirth`, `medicalInfo` | ✅ Yes | Identifiers + health data. |
| `User.email`, `name` | ⚠️ Indirect identifier | Identifies the data subject when combined with role/context. |
| Coordinator `email`, `name` | ⚠️ Provider directory info | May be business contact info, but in this context it identifies a workforce member tied to a patient. |
| Audit log `before`/`after` blobs | Depends | If they contain health data, they are PHI at rest. |

### 6.3 Minimum necessary access

| Endpoint | Observation | HIPAA status |
|---|---|---|
| `GET /api/episodes/coordinators` | Returns `id`, `name`, `email` to any coordinator. | ⚠️ Low risk; email may be more than necessary for a dropdown. |
| `GET /api/episodes` (`CareEpisodeController.index`) | Returns `patient.email` and `careRecipient.externalRef` in list projection. | ⚠️ Risk | Patient email and external reference in a list endpoint exceed minimum necessary; `externalRef` may be an MRN. |
| `GET /api/episodes/:id` (`CareEpisodeController.show`) | Returns full nested `patient`, `careRecipient`, `assessments`, `carePlans`, `sessions`, `documents`, `invoices`. | ⚠️ Risk | No response projection; returns all related PHI. Should scope to what the caller role needs. |
| `POST /api/intake/:id/review` | Copies intake health fields into episode. | ✅ Acceptable | Purpose-consistent; access already scoped to coordinator/admin + tenant. |
| `POST /api/auth/register` | Returns full `user` object. | ⚠️ Low risk | Email + name returned unnecessarily; not health data but still identifying. |

### 6.4 Audit controls (§164.312(b))

- `CareEpisodeController.assignCoordinator` logs `episode_coordinator_assigned` with `before`/`after` coordinator IDs. IDs alone are not PHI.
- `CareEpisodeController.store` and `update` call `AuditService.log` but only pass `req`, not `before`/`after` health data. This is good.
- `IntakeController.review` logs `reviewSummary` (structured review fields) in the `after` blob. `reviewSummary` does not include free-text medical history, but it does include `keyConcerns`, `urgencyIndicators`, `suggestedServiceCategories`, `riskFlags`, and `notes`. If `notes` or `riskFlags` contain PHI, the audit log stores PHI.
- `AuditService.logHttpMutation` redacts `password`, tokens, etc., but `redactForAudit` does **not** redact health fields such as `medicalHistory`, `diagnoses`, `reasonForCare`, etc. If HTTP mutation logging is enabled for intake/episode endpoints, PHI could be persisted in audit logs.

### 6.5 Transmission / notification security

- `NotificationService.create` stores `title` and `body` in `Notification` table. The changed surface sends: `"Your care coordinator has reviewed your intake and your episode is now active."` — no PHI in the body.
- Other unchanged controllers include provider names in notification bodies (e.g., `Join your session with ${session.provider.name}`). This is a workforce-member identifier, not patient PHI, but should be documented if notifications are pushed to mobile/email sub-processors.

### 6.6 Encryption and third-party posture

- This is a source-code review only. Encryption at rest, TLS in transit, KMS usage, business-associate status of email/notification/SMS/cloud providers, and backup-region compliance are **not verifiable from code** and must be confirmed via infrastructure/configuration review.

### 6.7 HIPAA finding summary

| ID | Finding | Severity | Location | Recommended fix |
|---|---|---|---|---|
| **H-27** | `CareEpisodeController.index` returns `patient.email` and `careRecipient.externalRef` in episode list | Medium | `server/src/controllers/patients/CareEpisodeController.ts:64-67` | Remove `email` and `externalRef` from list projection; return only fields needed for the list view. |
| **H-28** | `CareEpisodeController.show` returns full nested PHI across all related models without role-based projection | Medium | `server/src/controllers/patients/CareEpisodeController.ts:126-143` | Scope the `include` to the caller role's minimum necessary set. |
| **H-29** | `redactForAudit` does not redact health-data fields | Low | `server/src/utils/auditRedact.ts:1-36` | Extend `SENSITIVE_KEYS` to include health-data field names (`medicalHistory`, `diagnoses`, `reasonForCare`, `currentMeds`, `medicalInfo`, `notes`, etc.). |
| **H-30** | `IntakeController.review` audit log may include PHI in `reviewSummary.notes` | Low | `server/src/controllers/patients/IntakeController.ts:581-592` | Avoid logging free-text `notes` in audit; log structured, non-PHI metadata only. |

---

## 7. New Finding Summary

### 7.1 GDPR / Security

| ID | Finding | Severity | Category | Location | Recommended fix |
|---|---|---|---|---|---|
| **R-1 (removed)** | ~~`IntakeController.review` accepts arbitrary `coordinatorId`~~ | — | — | — | Finding withdrawn: the current branch does not accept `coordinatorId` in `reviewSchema`; episode creation always uses `req.user!.userId`. |
| **R-2** | `CareEpisodeController.coordinators` returns coordinator `email`; verify UI needs it | Low | GDPR (minimization) / API excessive exposure | `server/src/controllers/patients/CareEpisodeController.ts` | Remove `email` from response if the dropdown only displays `name`. |
| **R-3** | `RegistrationController` schema accepts any `UserRole`; defaults to `client` rather than the intended public role | Medium | Security (mass assignment) / GDPR purpose limitation | `server/src/controllers/auth/RegistrationController.ts:12-70` | Tighten schema to `z.enum(['family', 'patient']).default('family')` and reject any explicit role outside that set. |
| **R-6** | `CareEpisodeController.coordinators` returns sequential/internal `id` values plus emails; combined with assignment endpoint enables coordinator enumeration | Low | API security / Information disclosure / GDPR (identifiers) | `server/src/controllers/patients/CareEpisodeController.ts` | Return only the fields the UI needs; consider opaque response IDs. |
| **R-7** | Registration response returns full `user` object (`id`, `name`, `email`, `role`, `onboardingStatus`) | Low | GDPR (data minimization) | `server/src/controllers/auth/RegistrationController.ts:101-114` | Return only the metadata required for the verification flow. |
| **R-8** | `Consent` and `ConsentLog` store unmasked `ipAddress` | Low | GDPR (logging / data minimization) | `server/src/controllers/auth/RegistrationController.ts:80`, `server/src/controllers/caremanagement/ConsentController.ts:42` | Anonymize IPs (mask last octet / 80 bits) before storing in consent tables. |
| **R-9 — Admin route group missing granular permission gates** | Several destructive/administrative routes under `/api/admin` are mounted after `requireAdmin` and `adminLimiter`, but do not apply the granular `requireCreate`/`requireEdit`/`requireDelete`/`requireView` middleware used elsewhere in the same file. For example, `PATCH /api/admin/payouts/:id/approve`, `PATCH /api/admin/payouts/:id/reject`, `GET /api/admin/payouts`, `GET /api/admin/documents`, `POST /api/admin/users/:id/restore`, `PATCH /api/admin/platform-staff/:id/role`, `POST /api/admin/bookings/:id/force-cancel`, `GET /api/admin/reports/*`, and many AdvancedAdminController routes are reachable by any admin-level user without further action-level scoping. | Medium | Security (broken function-level authorization) | `server/src/routes/admin.routes.ts:89-448` | Apply granular permission middleware (`requireEdit`, `requireApprove`, `requireDelete`, `requireView`) to each admin action, or introduce role-based admin sub-roles (e.g., finance-admin, compliance-admin). |
| **R-10 — Authenticated users can create courses and quizzes** | `lms.routes.ts` mounts `router.post('/', authenticate, CourseController.create)` and `router.patch('/:id', authenticate, CourseController.update)` without role checks. The trainer-gated `/trainer/*` equivalents exist, but the root-level course mutation endpoints let any authenticated user (including family/patient) create, update, or delete courses. Likewise, `router.post('/:id/lessons/:lessonId/complete', authenticate, ...)` does not verify the caller is enrolled. | Medium | Security (BFLA) | `server/src/routes/lms.routes.ts:18-24` | Move all course creation, update, deletion, and lesson/quiz management under `requireRole(trainerRoles)` or merge with `/trainer/*` equivalents; remove the unguarded root-level mutation routes. |
| **R-11 — `/api/admin/disputes` shadows public dispute routes without explicit admin permission gate** | Inside `admin.routes.ts`, `GET /api/admin/disputes` and `POST /api/admin/disputes/:disputeId/resolve` are mounted without per-route permission checks; they rely only on the router-level `authenticate, requireAdmin, adminLimiter` middleware. While the router prefix is admin-only, the inconsistency with `dispute.routes.ts` (which declares `/api/disputes/admin/all` with explicit `requireAdmin`) increases risk if the router-level guard is ever moved or weakened. | Low | Security (function-level auth consistency) | `server/src/routes/admin.routes.ts:241-248` | Explicitly apply `requireAdmin` or a granular dispute-resolution permission on each `/api/admin/disputes*` route; align with `/api/disputes/admin/all`. |
| **R-12 — `provider-booking.routes.ts` uses a broad provider role list without action scoping** | All actions under `/api/provider/*` (reports, marketplace offers, self-refund, booking notes, client access) share a single `requireRole(providerRoles)` guard at the router level. A cleaner/gardener can call `POST /api/provider/reports`, `POST /api/provider/marketplace-offers`, and `POST /api/provider/self-refund` with the same role check as a nurse or doctor. There is no action-level separation between clinical and non-clinical provider functions. | Medium | Security (BFLA / role broadening) | `server/src/routes/provider-booking.routes.ts:17` | Apply per-route `requireRole` calls with the minimum role set for each action (e.g., only clinical roles for clinical notes/reports; only approved/verified providers for marketplace offers). |
| **R-13 — `BookingPaymentController.verifyPayment` does not verify booking ownership before marking payment paid** | `POST /api/bookings/:bookingId/payment/verify` retrieves the Stripe PaymentIntent by ID, then updates the matching `payment` row to `paid` and the booking to `accepted`. It does not check that the caller owns the booking or that the PaymentIntent amount matches the booking total. A user with a valid PaymentIntent ID from any of their own payments could apply it to another booking they own, or a replayed/misrouted webhook confirmation could advance the wrong booking. | Medium | Security (business logic / payment state) | `server/src/controllers/payments/BookingPaymentController.ts:113-132` | Verify `booking.clientId === req.user!.userId` and that the PaymentIntent amount/currency matches the booking before updating status. |
| **R-14 — `BookingPaymentController.selfRefund` does not reverse wallet credits when payment gateway was Stripe** | Client self-refund only calls `StripeService.refundPayment` for Stripe bookings; it does not record a refund `Payment` row or restore wallet balance. For wallet bookings it credits the wallet, but for Stripe bookings the client receives a Stripe refund while the provider may still be paid from the wallet/escrow, creating a double-refund risk if the same booking is also disputed or admin-refunded. | Medium | Security (business logic / financial integrity) | `server/src/controllers/payments/BookingPaymentController.ts:134-171` | After Stripe refund, create a matching refund `Payment` record and reconcile provider escrow/wallet. Prevent concurrent dispute resolution on the same booking. |
| **R-15 — `ProviderBookingController.selfRefund` allows provider to create an unverified refund record** | `POST /api/provider/self-refund` lets any provider create a `Payment` row with `type: 'refund'`, `status: 'paid'`, and `amount: payment.amount` without debiting the provider's wallet, checking admin approval, or verifying the original payment was still valid. This creates a fake refund record that could be used to claim refunds were issued. | Medium | Security (business logic / financial integrity) | `server/src/controllers/provider/ProviderBookingController.ts:131-164` | Require admin approval or wallet debit for provider refunds; validate original payment state and prevent duplicate refund records. |
| **R-16 — Booking status transitions lack role enforcement** | `PATCH /api/bookings/:id/status` accepts `accepted`, `rejected`, or `cancelled` from any authenticated user. The route checks only `assertAppointmentTransition` but does not verify the caller is the client, provider, or admin. A client can reject their own booking, but the same endpoint also lets any authenticated user move another user's booking to `cancelled` or `rejected`. | Medium | Security (business logic / state-machine authorization) | `server/src/routes/booking.routes.ts:94-114` | Enforce role-based transition permissions (provider accepts/rejects; client cancels; admin can override). |
| **R-17 — `POST /api/bookings/:id/counter-offer` lacks ownership check** | The counter-offer route updates `totalAmount` and sets `isCounterOffered` without verifying the caller is the provider for the booking. Any authenticated user can submit a counter-offer on any booking, altering its price. | Medium | Security (business logic / price tampering) | `server/src/routes/booking.routes.ts:159-174` | Verify `req.user!.userId === booking.providerId` before allowing counter-offers. |
| **R-18 — Marketplace offer creation accepts any positive price but no verification of provider entitlement** | `offerSchema` accepts `price: z.number().positive()` and the provider can create/update offers. While the price is provider-set, there is no check that the provider is verified or approved before listing services, and the public marketplace lists offers immediately with `status: 'active'`. | Low | Security / Compliance (business logic / marketplace trust) | `server/src/controllers/provider/MarketplaceOfferController.ts:122-152` | Gate marketplace offer creation on `verificationStatus === 'approved'` and add an admin moderation step or cooling-off period. |
| **R-19 — `QatariPaymentService.handleWebhook` does not validate PayTabs signature** | `POST /api/wallet/webhook/paytabs` passes the raw body to `QatariPaymentService.handleWebhook`, which updates invoice/payment status based on `payment_result.response_status` without validating the webhook signature or request origin. An attacker can POST a fake approval notification and mark invoices as paid. | High | Security (business logic / payment webhook) | `server/src/services/QatariPaymentService.ts:82-133`, `server/src/routes/wallet.routes.ts:42-45` | Validate PayTabs webhook signature/server-key against the received payload before updating invoice status. |
| **R-20 — `WalletService.credit` accepts negative amount via `z.number()` in callers** | While `WalletService.credit` itself has no amount validation, callers such as `AdvancedAdminController.creditAdjustment` use `z.number().positive()`. However, `credit` is a generic helper; any future caller that omits positive validation could decrement a user's balance by passing a negative amount. | Low | Security (business logic / defensive coding) | `server/src/services/WalletService.ts:18-50` | Add an explicit `amount > 0` guard inside `WalletService.credit` and `WalletService.debit`. |
| **R-21 — `AdvancedAdminController.creditAdjustment` can debit more than wallet balance** | The admin credit/debit endpoint calls `WalletService.debit` without first checking the user's balance. `WalletService.debit` throws if balance is insufficient, but the error is a generic 422 and the audit log is written only on success. More importantly, an admin (or compromised admin account) can arbitrarily drain or inflate any wallet. This is expected admin power, but there is no dual-control or upper-limit check. | Low | Security / Compliance (business logic / admin power) | `server/src/controllers/admin/AdvancedAdminController.ts:130-151` | Add a second-approver requirement or daily limit for large admin credit/debit adjustments; log all attempts including failures. |

### 7.2 HIPAA

| ID | Finding | Severity | Category | Location | Recommended fix |
|---|---|---|---|---|---|---|
| **H-27** | `CareEpisodeController.index` returns `patient.email` and `careRecipient.externalRef` in episode list | Medium | HIPAA (minimum necessary) | `server/src/controllers/patients/CareEpisodeController.ts:64-67` | Remove `email` and `externalRef` from list projection; return only fields needed for the list view. |
| **H-28** | `CareEpisodeController.show` returns full nested PHI across all related models without role-based projection | Medium | HIPAA (minimum necessary) | `server/src/controllers/patients/CareEpisodeController.ts:126-143` | Scope the `include` to the caller role's minimum necessary set. |
| **H-29** | `redactForAudit` does not redact health-data fields | Low | HIPAA (audit controls / PHI in logs) | `server/src/utils/auditRedact.ts:1-36` | Extend `SENSITIVE_KEYS` to include health-data field names (`medicalHistory`, `diagnoses`, `reasonForCare`, `currentMeds`, `medicalInfo`, `notes`, etc.). |
| **H-30** | `IntakeController.review` audit log may include PHI in `reviewSummary.notes` | Low | HIPAA (audit controls / PHI in logs) | `server/src/controllers/patients/IntakeController.ts:581-592` | Avoid logging free-text `notes` in audit; log structured, non-PHI metadata only. |
| **H-31 — LMS endpoints allow any authenticated user to manage courses and quizzes** | Root-level course creation/update/deletion and lesson/quiz management in `lms.routes.ts` only require `authenticate`, not a trainer/admin role. A family or patient account can create courses and modify quizzes, which is an action-level authorization failure for an LMS administration function. | Medium | HIPAA / Security (minimum necessary / function-level auth) | `server/src/routes/lms.routes.ts:18-24` | Restrict course/quiz administration to trainer/admin roles; remove redundant unguarded root-level mutation routes. |
| **H-32 — Admin-only dispute resolution lacks explicit action-level permission** | `GET /api/admin/disputes` and `POST /api/admin/disputes/:disputeId/resolve` are admin-only by router prefix but lack per-route permission checks. If the router-level `requireAdmin` is ever weakened, dispute resolution becomes unguarded. | Low | HIPAA / Security (function-level auth consistency) | `server/src/routes/admin.routes.ts:241-248` | Add explicit `requireAdmin` or a granular dispute-resolution permission to each admin dispute route. |
| **H-33 — Booking payment verification does not confirm ownership before updating PHI-linked care session** | `POST /api/bookings/:bookingId/payment/verify` advances the booking status to `accepted`, which may trigger care-provider assignment and PHI disclosure. The endpoint does not verify the caller owns the booking, so a misrouted or replayed PaymentIntent could advance the wrong care session. | Medium | HIPAA / Security (minimum necessary / payment-state authorization) | `server/src/controllers/payments/BookingPaymentController.ts:113-132` | Check `booking.clientId === req.user!.userId` and match PaymentIntent amount/currency before updating booking status. |
| **H-34 — Provider self-refund creates refund records without verification, risking false reimbursement claims for care services** | `POST /api/provider/self-refund` creates a `Payment` row with status `paid` and a client-visible refund amount without verifying the original payment or debiting the provider. This could be used to falsely document that a client was refunded for a care session. | Medium | HIPAA / Security (audit integrity / business logic) | `server/src/controllers/provider/ProviderBookingController.ts:131-164` | Require admin approval and wallet reconciliation; validate the original payment state and prevent duplicate refund records. |
| **H-35 — Counter-offer endpoint allows unauthorized price changes for care bookings** | `POST /api/bookings/:id/counter-offer` updates the booking `totalAmount` without verifying the caller is the assigned provider. A compromised or curious account could alter the price of a care booking before PHI is exchanged. | Medium | HIPAA / Security (business logic / authorization) | `server/src/routes/booking.routes.ts:159-174` | Enforce `req.user!.userId === booking.providerId` before accepting counter-offers. |
| **H-36 — PayTabs webhook does not validate origin, enabling fake payment confirmations for care invoices** | `POST /api/wallet/webhook/paytabs` marks wallet invoices as paid based on unverified PayTabs payloads. Care invoices or deposits paid through this channel could be falsely marked as complete, leading to inappropriate PHI access or provider assignment. | High | HIPAA / Security (business logic / payment webhook integrity) | `server/src/services/QatariPaymentService.ts:82-133`, `server/src/routes/wallet.routes.ts:42-45` | Validate the PayTabs webhook signature/server-key against the payload before changing invoice status. |

---

## 8. Previously Reported Findings — Status at `ea27627`

This section updates the status of earlier GDPR, HIPAA, and security findings that were touched by the Ahmed revision. Findings not listed remain in their prior state.

### 8.1 GDPR

| Finding | Prior status | Status at `ea27627` | Reason |
|---|---|---|---|
| G-11 — rectification split across endpoints | Open | Unchanged | Not touched by Ahmed revision. |
| G-15 — special-category health data without care-recipient consent | Open | Unchanged | Intake consent is recorded against `familyUserId` only (`privacy`, `treatment`, `telehealth`, `data_sharing`). No `care_recipient_health:{recipient.id}` consent exists in this branch; prior claim that this was added is incorrect. |
| G-21 — data export omits M2 health data | Resolved in `f4019d2` | Still resolved | Not changed. |
| G-27 — API response over-inclusion | Open | Slightly improved | Coordinator list purpose is clearer, but `email` is still returned. |

### 8.2 Security

| Finding | Prior status | Status at `ea27627` | Reason |
|---|---|---|---|
| C-1 — `CareEpisode.patientId` set to family user | Open | Unchanged | `IntakeController.review` sets `patientId: intake.familyUserId` and `careRecipientId: intake.careRecipientId`. The `patientId` label remains semantically misleading. |
| C-5 — episode summary PDF org bypass | Resolved in `d4980d1` | Still resolved | PDF route checks `assertTenantOrgAccess`. |
| M-47 — registration accepts any role | Open | Partially mitigated (R-3) | No `PUBLIC_SELF_REGISTER_ROLES` backend whitelist exists; schema still broad. UI-only restriction is insufficient. |
| Z-1 to Z-8 | Open/resolved per earlier report | Mostly unchanged | Route guards addressed in `d4980d1`; this revision does not regress them. |

### 8.3 GDPR cross-check

Applying the GDPR checklist to changed surfaces:

- **Data minimization (Art. 5.1(c)):**
  - `coordinators` returns `email` when the UI likely only needs `name`/`id` (R-2).
  - Registration response returns full `user` object (R-7).
  - `Consent.ipAddress` and `ConsentLog.ipAddress` store full IPs (R-8).
  - `AuditService.log` for `intake_submitted` includes `diagnoses` (special-category data) in the `after` blob.
- **Purpose limitation (Art. 5.1(b)):**
  - `RegistrationController` accepting any `UserRole` can create users whose processing purpose/role is outside the public self-registration flow (R-3).
- **Privacy by design / by default (Art. 25):**
  - No retention-expiry columns (`retentionExpiresAt`) on `Consent` or `ConsentLog` for the new consent events.
  - No dedicated care-recipient consent record for special-category health data; consent is recorded on behalf of the family/guardian user (G-15).
- **Security of processing (Art. 32):**
  - `assignCoordinator` and `coordinators` are correctly scoped by tenant. No new object-level authorization issues introduced.
  - `IntakeController.review` does **not** accept a client-provided `coordinatorId`, so the prior function-level authorization concern is not present in this branch.
- **Self-approval / segregation of duties:** Public registration records its own consent; acceptable for self-service but should be documented in the data governance record.

### 8.4 HIPAA cross-check

Applying the HIPAA checklist to changed surfaces:

- **Minimum necessary (§164.502(b), §164.514(d)):**
  - `CareEpisodeController.index` returns `patient.email` and `careRecipient.externalRef` in a list endpoint (H-27).
  - `CareEpisodeController.show` returns all nested related models without role-based projection (H-28).
  - `coordinators` endpoint returns coordinator `email`; likely more than minimum necessary for a dropdown.
- **Audit controls (§164.312(b)):**
  - `AuditService.log` allows arbitrary `before`/`after` objects; callers must ensure these do not contain PHI.
  - `redactForAudit` only redacts credentials/tokens, not health-data fields (H-29).
  - `IntakeController.review` logs `reviewSummary` including free-text `notes` (H-30).
- **Access control (§164.312(a)(1)):**
  - New coordinator endpoints correctly use `requireCareCoordinator` + tenant scoping.
  - `IntakeController.review` does not accept arbitrary `coordinatorId`, so no new access-control bypass.
- **Transmission / notification security:**
  - Changed-surface notification body does not include PHI.
- **Encryption / third-party posture:**
  - Not verifiable from source code; requires infrastructure and vendor review.

---

## 8. Compliance Matrix Update

| Requirement | Status at `ea27627` | Notes |
|---|---|---|
| GDPR Art. 5.1(a) Lawfulness, fairness, transparency | ⚠️ Partial | Care-recipient health data relies on guardian/family consent; no recipient-specific consent record (G-15). |
| GDPR Art. 5.1(b) Purpose limitation | ⚠️ Partial | Registration schema accepts any `UserRole`, allowing role outside intended public purpose (R-3). |
| GDPR Art. 5.1(c) Data minimization | ⚠️ Partial | Coordinator email over-shared (R-2); registration response over-inclusive (R-7); full IPs stored (R-8). |
| GDPR Art. 25 Data protection by design | ⚠️ Partial | Access controls present on coordinator endpoints, but consent/retention design gaps remain. |
| GDPR Art. 32 Security of processing | ⚠️ Partial | `assignCoordinator` correctly scoped; `IntakeController.review` no longer accepts arbitrary `coordinatorId`. |
| HIPAA §164.312(a)(1) Access control | ⚠️ Partial | LMS root-level mutations and admin dispute routes rely on coarse guards; provider router uses one broad role list (H-31, H-32, R-12). |
| HIPAA §164.312(b) Audit controls | ⚠️ Partial | `redactForAudit` misses health-data fields; `IntakeController.review` logs `reviewSummary.notes` (H-29, H-30). |
| HIPAA §164.502(b) / §164.514(d) Minimum necessary | ⚠️ Partial | Episode list/show return more PHI than necessary (H-27, H-28); LMS course admin functions open to all authenticated users (H-31). |
| OWASP API Security Top 10 — Broken Object Level Auth | ✅ Mitigated | `assignCoordinator` checks episode access and tenant. |
| OWASP API Security Top 10 — Broken Function Level Auth | ⚠️ Partial | Admin actions lack granular gates; root-level LMS mutations ungated; provider router uses one broad role list (R-9, R-10, R-12). |
| OWASP API Security Top 10 — Excessive Data Exposure | ⚠️ Partial | R-2 / R-6 / H-27 / H-28: coordinator email + patient email/externalRef + broad episode reads. |
| OWASP API Security Top 10 — Mass Assignment | ⚠️ Partial | R-3: role enum tampering in registration. |
| OWASP API Security Top 10 — Insecure Design (business logic) | ⚠️ Partial | R-9 / R-10 / R-12: coarse role checks at router level instead of per action; R-13 / R-15 / R-17 / R-19: missing ownership and webhook validation in payment/booking flows. |

---

## 9. BFLA-specific cross-check

In addition to the changed surfaces, the route layer was reviewed for action-level authorization inconsistencies across the whole API mount. The following patterns were checked:

- **HTTP verb drift:** Routes that apply `authenticate` or role guards at the router level, then declare per-method handlers. No method-level guard inversion was found (e.g., `GET` guarded but `POST` unguarded on the same path).
- **Route shadowing / legacy prefixes:** `index.ts` mounts multiple routers under overlapping or legacy-looking prefixes (`/providers`, `/matching`, `/chat`, `/conversations`, `/client`, `/family-members`). Each mounted router re-applies its own guards, so the same logical action is not exposed under a weaker prefix.
- **Feature-flag or beta endpoints:** No `/beta`, `/preview`, or header-gated endpoints were found in the route index.
- **Batch / job endpoints:** No `/batch`, `/jobs`, `/cron`, or `/queue` endpoints are exposed through Express routes; cron jobs and workers run server-side.
- **Transport protocol inconsistency:** The API is REST-only. No GraphQL mutations, gRPC services, or WebSocket action handlers were found that would bypass REST middleware.
- **Content-type middleware gaps:** All admin/mutating routes use standard JSON body parsing; no XML or multipart-specific handlers bypass auth.

The BFLA/business-logic findings above (R-9 through R-12 and their HIPAA mirrors H-31/H-32) stem from **router-level role broadening** and **missing per-action gates**. The payment/booking business-logic findings (R-13 through R-21 and HIPAA mirrors H-33 through H-36) stem from **missing ownership checks, missing financial reconciliation, and unverified webhooks**, not from verb drift or transport bypass.

---

## 10. Cache-poisoning cross-check

A cache-poisoning review was performed against the Express application and the Nginx client configuration. The goal was to identify any server-side processing of cache-unkeyed inputs (e.g., `X-Forwarded-Host`, `X-Original-URL`) or cache-deception-prone URL patterns.

### 10.1 Findings

| ID | Finding | Severity | Category | Location | Recommended fix |
|---|---|---|---|---|---|
| **C-1 — SPA wildcard fallback does not disable caching** | In production, `server/src/app.ts:99-104` mounts `express.static(clientDist)` and then `app.get('*', ...)` returns `index.html` for any non-API path. The fallback handler does not set `Cache-Control: no-store, no-cache, must-revalidate, private` or a `Vary: Cookie` header. If a CDN or Nginx proxy is placed in front of the Express server and applies a rule that caches URLs ending in static-looking extensions (`*.css`, `*.js`, `*.jpg`), an authenticated request such as `/family/dashboard/settings.css` would receive the dynamic SPA HTML and could be cached under that path. A later unauthenticated request to the same path would receive the cached SPA shell, which is a Web Cache Deception / cache-deception primitive. | Low | Security (cache / Web Cache Deception) | `server/src/app.ts:102-104` | Add explicit anti-caching headers on the SPA fallback: `Cache-Control: no-store, no-cache, must-revalidate, private` and `Pragma: no-cache`. Ensure any upstream CDN/proxy never caches the wildcard fallback or non-hashed dynamic paths. |
| **C-2 — `client/nginx.conf` does not set cache policy for the SPA entry point** | The Nginx configuration sets `expires 1y` and `Cache-Control: public, max-age=31536000, immutable` only for `/assets/`. The root `location /` block (`client/nginx.conf:35-37`) uses `try_files` to serve `index.html` for any path but does not set `Cache-Control`. An upstream CDN/proxy may therefore cache `index.html` or fallback responses with default TTLs, increasing the risk that a cached SPA entry point is served with stale content or that dynamic paths are stored. | Low | Security / Reliability (cache policy) | `client/nginx.conf:35-37` | Add `add_header Cache-Control "no-store, no-cache, must-revalidate, private" always;` to the `location /` block serving the SPA fallback, or explicitly disable caching for `index.html`. |
| **C-3 — API responses lack default `Cache-Control` / `Vary` headers** | The Express API does not set `Cache-Control`, `Vary`, `ETag`, or `Last-Modified` on authenticated JSON responses by default. The only explicit cache header found is `Cache-Control: no-cache` in the AI chat SSE stream (`server/src/controllers/ai/AIChatController.ts:58`). Without `Cache-Control: no-store` or `Vary: Cookie`, an upstream cache that ignores cookie-based segmentation could cache and replay private JSON responses (e.g., care episodes, bookings, documents) under the same URL for different users. | Low | Security / Privacy (cache policy) | `server/src/app.ts` (global response middleware) | Add a global middleware that sets `Cache-Control: no-store, no-cache, must-revalidate, private` and `Pragma: no-cache` on all API responses, then allow specific public endpoints (e.g., `/api/health`, static assets) to override it. Add `Vary: Cookie, Authorization` where appropriate. |
| **C-4 — Document download redirect lacks explicit anti-cache headers** | `GET /api/documents/:id/download` (`DocumentController.downloadDocument`) returns an HTTP 302 redirect to a signed S3 URL. The 302 response itself has no `Cache-Control` or `Location`-validation headers. While 302 redirects are not cacheable by default without explicit `Cache-Control`, a permissive CDN/proxy could cache the redirect if `Cache-Control: public` is added elsewhere or if the upstream defaults to caching redirects. | Low | Security / Privacy (cache policy) | `server/src/controllers/DocumentController.ts:102-117` | Set `Cache-Control: no-store, no-cache, must-revalidate, private` on the 302 response before calling `res.redirect(url)`. |

### 10.2 What was *not* found

- No server-side processing of `X-Forwarded-Host`, `X-Forwarded-Scheme`, `X-Original-URL`, `X-Rewrite-URL`, or `Forwarded` headers for URL generation, redirects, or canonical links.
- No `Cache-Control: public, max-age=...` on dynamic API responses.
- No cacheable authentication endpoints or affiliate/link-shortener flows.
- No route patterns that mix dynamic content with static-looking extensions under a cacheable prefix.

Because no unkeyed header reflection or dynamic-content-under-static-extension pattern was identified, these cache findings are **defensive / architectural** rather than confirmed exploitable cache-poisoning bugs. They should be addressed before any CDN is placed in front of the application.

---

## 11. Host-header injection cross-check

A Host-header injection review was performed against the authentication, email, and routing surfaces. The review looked for: password-reset poisoning, email-verification link poisoning, OAuth/OIDC redirect/issuer poisoning, routing-based SSRF, path-override (`X-Original-URL` / `X-Rewrite-URL`), and `X-Forwarded-Host` reflection into cacheable responses.

### 11.1 Findings

| ID | Finding | Severity | Category | Location | Recommended fix |
|---|---|---|---|---|---|
| **H-1 — No `ALLOWED_HOSTS` / Host allowlist in Express** | `server/src/app.ts` does not configure `app.set('trust proxy', ...)` and has no Host-header allowlist or validation. While the current code does **not** build URLs from `req.headers.host`, the lack of `ALLOWED_HOSTS` is a defense-in-depth gap: a future feature or misconfigured reverse proxy could start trusting the request Host for URL generation. | Low | Security (host-header hardening) | `server/src/app.ts` | Add an `ALLOWED_HOSTS` env var (or hardcoded list) and validate `req.headers.host` at the earliest middleware; reject requests whose Host is not in the allowlist. If the app is deployed behind a trusted reverse proxy, configure `trust proxy` explicitly and validate `X-Forwarded-Host` against the same allowlist. |
| **H-2 — Password reset and email verification links are env-driven, not Host-derived (negative finding)** | `AuthController.forgotPassword` builds the reset URL as `${env.FRONTEND_URL}/reset-password?token=...` (`server/src/controllers/auth/AuthController.ts:273`), and `sendEmailVerificationForUser` builds the verification URL as `${env.APP_URL}/api/email/verify?token=...` (`server/src/utils/emailVerification.ts:12`). Neither uses `req.get('host')`, `req.headers.host`, or `X-Forwarded-Host`. Therefore the classic password-reset poisoning and email-verification poisoning attacks do not apply to this codebase as currently written. | N/A | Security (architecture note) | `server/src/controllers/auth/AuthController.ts:273`, `server/src/utils/emailVerification.ts:12` | Keep building these links from environment variables; do not switch to request-derived hosts. Document this decision in the security runbook so future developers do not introduce Host-derived URLs. |
| **H-3 — No OAuth/OIDC/SAML or path-override processing found** | The server code does not contain OAuth authorization endpoints, OIDC discovery, SAML AssertionConsumerService, or `X-Original-URL` / `X-Rewrite-URL` / `X-Override-URL` handling. | N/A | Security (architecture note) | `server/src/routes/index.ts`, `server/src/app.ts` | N/A — continue to avoid Host-derived URL generation if these flows are added later. |

### 11.2 What was *not* found

- No password-reset link built from `req.headers.host` or `X-Forwarded-Host`.
- No email-verification link built from request Host.
- No OAuth `redirect_uri`, OIDC `issuer`, or SAML `Destination` / `Recipient` derived from Host.
- No reverse-proxy routing logic that uses Host to select upstream (the Express app is a single origin, not a gateway).
- No `X-Original-URL` / `X-Rewrite-URL` path override.

The Host-header review therefore found **no exploitable Host-header injection** in the current branch, but it identified the defense-in-depth gap H-1.

---

## 12. Business-logic cross-check

A business-logic review was performed against the payment, booking, invoice, wallet, marketplace, care-order, and provider-payout flows. The review focused on: financial state-machine bypasses (marking things paid/refunded without funds movement), repeated/redundant financial actions, ownership/role checks on state-changing endpoints, price/amount/currency trust, invoice lifecycle integrity, no-show penalties, and counter-offer abuse.

### 12.1 Findings

| ID | Finding | Severity | Category | Location | Recommended fix |
|---|---|---|---|---|---|
| **BL-1 — Any authenticated user can mark any invoice as paid without receiving payment** | `InvoiceController.markPaid` (`server/src/controllers/billing/InvoiceController.ts:135-161`) updates the invoice status to `paid` and optionally creates a `Payment` row simply from the invoice ID. It performs no ownership check, no admin check, and no verification that money was actually received. Because `invoice.routes.ts:15` mounts `POST /:id/mark-paid` under `authenticate` only, any logged-in user (including a freshly registered client) can mark any invoice as paid by iterating invoice IDs. This directly bypasses the billing workflow. | **Critical** | Security / Business logic (financial bypass) | `server/src/controllers/billing/InvoiceController.ts:135-161`; `server/src/routes/invoice.routes.ts:15` | Require an admin or finance role, or validate a real payment webhook/callback before marking an invoice paid. Never allow arbitrary authenticated users to flip an invoice to `paid`. |
| **BL-2 — Any authenticated user can create an invoice billed to any other user** | `InvoiceController.store` (`server/src/controllers/billing/InvoiceController.ts:69-94`) accepts a `clientId` from the request body and creates an invoice for that client. There is no check that the caller is the client, an admin, or authorized to bill that client. An attacker can generate invoices in another user's name, which may then be sent or paid fraudulently. | **High** | Security / Business logic (IDOR / billing fraud) | `server/src/controllers/billing/InvoiceController.ts:69-94`; `server/src/routes/invoice.routes.ts:12` | Restrict invoice creation to admin/finance roles, or to providers who have a confirmed booking relationship with the target client. Validate `clientId` against the caller's role and relationships. |
| **BL-3 — Invoice show and send endpoints lack ownership/admin checks** | `InvoiceController.show` (`server/src/controllers/billing/InvoiceController.ts:96-103`) returns the full invoice including the `client` object and `payments` for any invoice ID, with no role or ownership check. `InvoiceController.send` (`server/src/controllers/billing/InvoiceController.ts:105-133`) similarly sends the invoice email and updates status to `sent` for any invoice ID without verifying the caller is the issuer or an admin. Both routes are protected only by `authenticate` (`server/src/routes/invoice.routes.ts:11,14`). | **High** | Security / Business logic / Privacy (IDOR / PII exposure) | `server/src/controllers/billing/InvoiceController.ts:96-133`; `server/src/routes/invoice.routes.ts:11,14` | Add ownership/admin checks to `show` and `send`: allow only the invoice issuer (admin/finance), the client, or an admin. Log `send` as an audit event. |
| **BL-4 — Payment-method detach endpoint lacks ownership check** | `PaymentMethodController.detach` (`server/src/controllers/payments/PaymentMethodController.ts:52-59`) calls `stripe.paymentMethods.detach(paymentMethodId)` using the `paymentMethodId` from the URL. It does not verify that the payment method belongs to the current user's Stripe customer. Any authenticated user who knows or guesses another user's Stripe payment-method ID can detach that user's saved card. | **High** | Security / Business logic ( Stripe account tampering) | `server/src/controllers/payments/PaymentMethodController.ts:52-59`; `server/src/routes/payment.routes.ts:48` | List the user's payment methods and verify the requested ID is in that list before detaching. Alternatively, retrieve the PM from Stripe and confirm its `customer` matches the current user's customerId. |
| **BL-5 — Booking payment verify endpoint lacks ownership and amount/currency validation** | `BookingPaymentController.verifyPayment` (`server/src/controllers/payments/BookingPaymentController.ts:113-132`) retrieves a Stripe PaymentIntent by ID and, if its status is `succeeded`, marks the booking's payment as `paid`. It does not verify that the caller owns the booking, that the PaymentIntent belongs to the booking, or that the PaymentIntent amount/currency matches `booking.totalPrice`. A user who obtains a succeeded PaymentIntent ID (e.g., from their own wallet top-up) could attempt to mark another booking as paid. Although the update is scoped by `bookingId` + `gatewayRef`, the endpoint still accepts a payment intent ID from the request body without binding checks. | **High** | Security / Business logic (payment bypass) | `server/src/controllers/payments/BookingPaymentController.ts:113-132`; `server/src/routes/booking.routes.ts:235` | Verify `booking.clientId === req.user!.userId`, ensure the PaymentIntent metadata contains the matching `bookingId`, and compare the PaymentIntent amount/currency to the booking total before updating status. |
| **BL-6 — Provider self-refund can be triggered repeatedly for the same booking, creating duplicate refund records** | `ProviderBookingController.selfRefund` (`server/src/controllers/provider/ProviderBookingController.ts:132-164`) checks that a booking is `completed` and has a `paid` payment, then creates a new `Payment` row with `type: 'refund'` and `status: 'paid'`. It does not check whether a refund was already issued, does not update the original payment status, does not debit the provider's wallet, and does not issue a real Stripe refund for Stripe payments. Calling the endpoint repeatedly creates multiple paid refund records for the same booking. | **High** | Security / Business logic (financial reconciliation failure) | `server/src/controllers/provider/ProviderBookingController.ts:132-164`; `server/src/routes/provider-booking.routes.ts:29` | Add a unique constraint or status check to prevent duplicate refunds; update the original `payment.status` to `refunded`; perform the actual wallet debit or Stripe refund; require admin approval or idempotency key. |
| **BL-7 — Client self-refund is non-atomic and raceable** | `BookingPaymentController.selfRefund` (`server/src/controllers/payments/BookingPaymentController.ts:134-171`) credits the wallet and updates the payment/booking status, but these operations are not wrapped in a single transaction with row-level locking. A race condition could allow two concurrent refund requests to both pass the `payment.status === 'paid'` check and double-credit the wallet before either updates the payment to `refunded`. | **Medium** | Security / Business logic (race condition / double-spend) | `server/src/controllers/payments/BookingPaymentController.ts:134-171`; `server/src/routes/booking.routes.ts:236` | Wrap the balance check, wallet credit, payment status update, and booking cancellation in one Prisma transaction with a pessimistic lock on the payment row. |
| **BL-8 — Counter-offer creation has no ownership or role check** | `booking.routes.ts` defines `POST /bookings/:id/counter-offer` inline (`server/src/routes/booking.routes.ts:160-174`) and updates the booking's `totalAmount`, `isCounterOffered`, and `counterOffer` fields without checking that the caller is the assigned provider or the client. Any authenticated user can modify the price of any booking in `pending` or `accepted` status. | **High** | Security / Business logic (price tampering) | `server/src/routes/booking.routes.ts:160-174` | Move the counter-offer logic into a controller, verify `req.user!.userId === booking.providerId`, and assert the booking is in a state that allows counter-offers. |
| **BL-9 — No-show endpoints have no role or permission checks** | `POST /bookings/:id/no-show` and `POST /bookings/:id/provider-no-show` (`server/src/routes/booking.routes.ts:177-194`) call `NoShowPenaltyService.applyClientNoShow` / `applyProviderNoShow` without verifying that the caller is the other party, an admin, or authorized to record a no-show. Any authenticated user can trigger penalties or full refunds against arbitrary bookings. | **High** | Security / Business logic (penalty/refund abuse) | `server/src/routes/booking.routes.ts:177-194`; `server/src/services/NoShowPenaltyService.ts` | Add explicit role/ownership checks (client can record provider no-show, provider/admin can record client no-show) and ensure the booking status and scheduled time make a no-show valid before applying penalties. |
| **BL-10 — Care orders can be edited after activation with no state checks or recipient ownership validation** | `CareOrderController.update` (`server/src/controllers/caremanagement/CareOrderController.ts:109-128`) allows a client (or admin) to update `budget`, `currency`, `startDate`, `endDate`, `recipientId`, `hoursPerWeek`, etc. via `createSchema.partial()`. It does not check whether the order is still `active`, whether the recipient belongs to the client, or whether the new budget/startDate combination is valid. A malicious client could reassign an order to another user's recipient or alter funding terms after coordinators have started work. | **Medium** | Security / Business logic (workflow bypass / IDOR) | `server/src/controllers/caremanagement/CareOrderController.ts:109-128`; `server/src/routes/care-orders.routes.ts:11` | Add status validation (e.g., only `draft` or `active` orders editable), verify `recipientId` belongs to the client's care recipients, and log significant changes (budget, dates, recipient) as audit events. |
| **BL-11 — Stripe top-up creates a payment intent using user-supplied currency without a whitelist** | `wallet.routes.ts` `POST /wallet/topup` (`server/src/routes/wallet.routes.ts:63-83`) creates a Stripe PaymentIntent using `amount` and `currency` from the request body. While `amount` is required positive, `currency` is not validated against an allowed list. An attacker could specify a low-value currency for the same numeric amount, potentially bypassing platform pricing intent or causing accounting mismatches. | **Low** | Security / Business logic (currency manipulation) | `server/src/routes/wallet.routes.ts:63-83` | Whitelist allowed currencies (e.g., `QAR`, `USD`) and store the canonical currency with the top-up record; reject unsupported values before calling Stripe. |
| **BL-12 — Admin wallet credit/debit adjustments are not idempotent and lack daily limits** | `AdvancedAdminController.creditAdjustment` (`server/src/controllers/admin/AdvancedAdminController.ts:130-151`) directly calls `WalletService.credit` or `WalletService.debit` for any user. There is no idempotency key, no daily ceiling, no dual-approval, and no check that the target user exists before the wallet operation. A compromised admin session or replayed request can move unlimited funds. | **Medium** | Security / Business logic (financial integrity) | `server/src/controllers/admin/AdvancedAdminController.ts:130-151`; `server/src/routes/admin.routes.ts:228` | Require idempotency keys, enforce per-admin daily adjustment limits, verify the target user exists, and require a second admin approval for adjustments above a threshold. |

### 12.2 What was *not* found

- **Client-side price override:** booking and invoice totals are derived server-side from `booking.totalPrice` / `invoice.total`; the client does not send a `total` field that overrides the database value.
- **Negative or zero price acceptance:** `BookingPaymentController.initiatePayment` rejects `amount <= 0` (`server/src/controllers/payments/BookingPaymentController.ts:32-33`); wallet top-up requires `amount: z.number().positive()` (`server/src/routes/wallet.routes.ts:64`); invoice line items require `quantity` and `unitPrice` positive (`server/src/controllers/billing/InvoiceController.ts:9-13`).
- **Coupon/discount/promotion race:** no coupon, credit, or promotion redemption system exists in the current branch.
- **Unauthenticated internal/employee portals:** all `/admin/*`, `/provider/*`, `/coordinator/*`, and staff routes require `authenticate` plus role guards.
- **PayTabs signature validation:** the webhook at `POST /wallet/paytabs/webhook` (`server/src/routes/wallet.routes.ts:42-45`) forwards the payload to `QatariPaymentService.handleWebhook` without signature validation. This is tracked separately as R-19 / H-36 and is not repeated here.

The business-logic review therefore found no pure price-tampering or coupon-race primitive, but it identified several high-impact ownership/state-transition gaps in invoices, refunds, payment verification, counter-offers, and no-show handling.

---

## 13. Account takeover (ATO) cross-check

An ATO taxonomy review was performed against the authentication, session-management, password-reset, email-verification, 2FA, OTP, and OAuth/OIDC/SAML surfaces. The review looked for: password-reset poisoning, weak/predictable reset tokens, token reuse/expiry, reset-token leakage in Referer/open redirects, email change without re-auth, JWT manipulation, password change without step-up, login timing oracles, social recovery / security-question abuse, OAuth device-code/PKCE/redirect_uri attacks, cross-tenant token replay, and session fixation.

### 12.1 Findings

| ID | Finding | Severity | Category | Location | Recommended fix |
|---|---|---|---|---|---|
| **A-1 — OTP verify endpoint has no rate limit; 6-digit OTPs are brute-forceable** | `OtpController.verify` accepts a 6-digit `otp` and has no dedicated rate limiter in `auth.routes.ts` (`/otp/verify` and `/auth/otp-verify` are mounted without `otpLimiter`). The `otpLimiter` (3 req/min) only protects the `send` endpoint. `OtpController.send` generates `crypto.randomInt(100000, 999999)` with a 10-minute expiry. A 1,000,000-keyspace code can be exhausted against an unthrottled verify endpoint, and multiple active codes per identifier can exist because each `send` creates a new record without invalidating prior ones. | **High** | Security (authentication / brute-force) | `server/src/controllers/auth/OtpController.ts:32, 56-80`; `server/src/routes/auth.routes.ts:45-46` | Apply the existing `otpLimiter` to the verify endpoints and add per-identifier attempt counters (e.g., Redis) that hard-lock after a small number of failed guesses. Reduce OTP lifetime further, or switch to time-based/code-rotating OTP if feasible. |
| **A-2 — 2FA verify endpoint is unthrottled and uses the user ID as the challenge token** | `AuthController.verify2faLogin` (`server/src/controllers/auth/AuthController.ts:129-163`) accepts `userId`/`two_fa_token` (both set to `user.id` in `login`) and a 6-digit TOTP code. The route is mounted without any rate limiter in `auth.routes.ts:42-43`. Because `two_fa_token` is just the user ID, an attacker who can enumerate or guess a user ID can brute-force TOTP codes directly against `/2fa/verify`. The TOTP window is 1 (≈ 3 valid codes). With no throttling, an attacker can replay guesses until one matches within the time window. | **High** | Security (2FA bypass / brute-force) | `server/src/controllers/auth/AuthController.ts:101-102, 129-148`; `server/src/routes/auth.routes.ts:42-43` | Mount `/2fa/verify` and `/auth/2fa-verify` under a strict per-identifier rate limiter. Use a short-lived, opaque, random state token for the 2FA flow instead of the user ID. Consider device/IP-based throttling and global account lockout after repeated 2FA failures. |
| **A-3 — JWT secrets have weak environment defaults** | `server/src/config/env.ts:20-21` falls back to hard-coded values `'change-me-access-secret'` and `'change-me-refresh-secret'` for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`. If an instance is deployed without overriding these env vars, an attacker can forge access and refresh tokens, bypassing authentication entirely. The refresh-token HMAC key also uses `env.JWT_REFRESH_SECRET` in `refreshTokenHash.ts:6`, compounding the impact. | **Critical** | Security (cryptographic failure / default credentials) | `server/src/config/env.ts:20-21`; `server/src/utils/refreshTokenHash.ts:6` | Refuse to start the server if JWT secrets are still at their default values (or require a minimum entropy check). Generate long random secrets in `.env.example` documentation and deployment scripts, never ship production defaults. |
| **A-4 — OtpController.verify stores refresh tokens in plaintext, not hashed** | `OtpController.verify` (`server/src/controllers/auth/OtpController.ts:102-109`) creates a `refreshToken` row containing `token: refreshToken` directly, bypassing the `persistRefreshToken` helper that hashes tokens in `AuthController.login`/`refresh`. This means OTP-authenticated sessions store reversible refresh tokens in PostgreSQL, while password-based sessions store SHA-256 HMAC hashes. A DB read compromised through SQL injection or backup exposure yields usable refresh tokens for OTP-authenticated users. | **High** | Security (credential storage inconsistency) | `server/src/controllers/auth/OtpController.ts:102-109`; `server/src/utils/refreshTokenStore.ts:8-22` | Reuse `persistRefreshToken` (which calls `hashRefreshToken`) inside `OtpController.verify`, and remove the plaintext `token` column usage. Add a migration to hash or rotate any existing plaintext OTP refresh tokens. |
| **A-5 — Reset-token table accepts multiple concurrent valid tokens** | `AuthController.forgotPassword` (`server/src/controllers/auth/AuthController.ts:260-271`) inserts a new `otpVerification` row for each reset request without invalidating previous `password_reset` rows for the same `identifier`. `resetPassword` (`server/src/controllers/auth/AuthController.ts:280-300`) consumes the first matching unexpired token. As a result, several reset links can be active simultaneously; compromise of any one (e.g., from an old email thread or forwarded message) allows account takeover until the 1-hour expiry, even if the user requested a newer reset. | **Medium** | Security (session / token management) | `server/src/controllers/auth/AuthController.ts:260-271, 280-300` | On each new `forgotPassword` request, mark all prior `password_reset` rows for that identifier as consumed (or delete them). Limit active reset tokens to one per user at a time. |
| **A-6 — `device-tokens` endpoints can reassign a push token to the attacker’s account** | `DeviceTokenController.register` (`server/src/controllers/auth/DeviceTokenController.ts:18-35`) looks up a `pushNotificationToken` by raw FCM/APNs token value. If the token already exists, it updates the row to the current authenticated `userId`. A user who can obtain another user’s push token (e.g., via shared-device / push-service misconfiguration) can reassign it to their own account and receive that user’s push notifications, which may contain sensitive metadata. The token is not scoped to the original user in the update path. | **Medium** | Security (push-notification misrouting) | `server/src/controllers/auth/DeviceTokenController.ts:18-35` | In the existing-token branch, require that the existing `userId` matches the current user, or force deletion + re-creation rather than silently reassigning ownership. Log ownership changes as security events. |
| **A-7 — No global `Referrer-Policy` header, and reset/verify links carry tokens in URL query strings** | The reset link (`server/src/controllers/auth/AuthController.ts:273`) and email-verification link (`server/src/utils/emailVerification.ts:12`) place secrets in URL query parameters. The client reset page (`client/src/pages/public/ResetPasswordPage.tsx:11-12`) reads these from `window.location`. If the page or any referenced asset sends a `Referer` header to a third party, the token leaks. The Express app does not set a global `Referrer-Policy: no-referrer` header, and the email templates (`server/src/services/EmailService.ts:47-72`) do not include a `<meta name="referrer" content="no-referrer">` tag. | **Medium** | Security (information disclosure / token leak) | `server/src/controllers/auth/AuthController.ts:273`; `server/src/utils/emailVerification.ts:12`; `server/src/services/EmailService.ts:47-72`; `server/src/app.ts` | Add a global `Referrer-Policy: strict-origin-when-cross-origin` or `no-referrer` header in Express, and include `<meta name="referrer" content="no-referrer">` in all emails that contain authentication secrets. Prefer moving secrets to a POST body or fragment where feasible. |
| **A-8 — `sameSite: 'lax'` on auth cookies** | `server/src/utils/authCookies.ts:15` sets `sameSite: 'lax'`. While this is the modern default and prevents CSRF on cross-site POSTs, it still allows cookies to be sent on top-level navigations from other sites. For an application handling health/payment data, `__Host-` prefix and `sameSite: 'strict'` (or at least explicit `__Host-` + `sameSite: 'none'` with `secure` for cross-site mobile-web requirements) should be evaluated, especially for the refresh token. | **Low** | Security (session hardening) | `server/src/utils/authCookies.ts:11-17` | Evaluate `__Host-` prefix and `sameSite: 'strict'` for the refresh cookie in production, ensuring any legitimate cross-origin flows are covered. Document the cookie security model. |
| **A-9 — Login response timing can leak whether an email exists** | `AuthController.login` (`server/src/controllers/auth/AuthController.ts:79-99`) performs a DB lookup and then `bcrypt.compare`. If the user does not exist, the function returns immediately with "Invalid credentials."; if the user exists but the password is wrong, it pays the bcrypt cost. Network timing differences can therefore reveal account existence, even though the error message is constant. The generic message prevents direct enumeration, but the timing side channel remains. | **Low** | Security (user enumeration / side channel) | `server/src/controllers/auth/AuthController.ts:79-99` | Always run `bcrypt.compare` against a dummy hash when the user is not found, so both paths incur comparable compute time. Alternatively, introduce a small, randomized delay before returning the generic error. |
| **A-10 — Refresh-token legacy plaintext fallback remains active** | `refreshTokenStore.ts:25-34` and `revokeRefreshTokenByPlain:36-48` include a code path that accepts legacy rows storing the raw JWT (`isLegacyPlainRefreshToken`). This creates a downgrade risk: if a plaintext row is ever inserted (as `OtpController.verify` does at `server/src/controllers/auth/OtpController.ts:105`), it is treated as valid under the legacy path. | **Medium** | Security (credential storage inconsistency) | `server/src/utils/refreshTokenStore.ts:24-34, 36-48` | Remove the legacy plaintext fallback, hash all stored refresh tokens, and add a data-migration step to re-hash existing plaintext rows. |

### 12.2 What was *not* found

- **Password reset poisoning via Host header:** reset URL built from `env.FRONTEND_URL`, not `req.headers.host` or `X-Forwarded-Host` (see H-2).
- **Email verification poisoning via Host header:** verification URL built from `env.APP_URL`, not request Host (see H-2).
- **Email change without re-auth:** the API does not expose an email-change endpoint; `UserProfileController.updateProfile` only allows `name`, `phone`, and `avatar` on the `User` model.
- **Password change without step-up:** `UserProfileController.updatePassword` correctly requires the current password (`server/src/controllers/users/UserProfileController.ts:43-45`).
- **OAuth / OIDC / SAML / device-code / PKCE flows:** none exist in the server code.
- **Social recovery / security-question flows:** none exist.
- **JWT algorithm confusion / `alg:none`:** `jsonwebtoken` defaults to HS256 and verifies against the configured secrets; no `algorithms` bypass or `kid` injection surface found.
- **Reset token predictability:** tokens are `crypto.randomBytes(32).toString('hex')` (256 bits).
- **Reset token reuse after consumption:** single-use enforced via `verifiedAt: null`.

The ATO review therefore found **no classic Host-header / OAuth / password-change ATO primitive**, but it identified concrete brute-force and token-storage findings (A-1 through A-4, A-10) that can lead to account takeover.

---

## 14. Testing Notes

This re-test combined diff analysis of `d4980d1..ea27627` with targeted source-code reads of changed controllers, routes, and helper files. The review covered GDPR rules, OWASP API security patterns, business-workflow logic, and HIPAA requirements.

No dynamic testing was performed; findings are code-level.

## 15. Recommended Next Steps

1. **Fix R-3** — tighten the registration schema to `z.enum(['family', 'patient']).default('family')` so the backend cannot accept arbitrary roles.
2. **Evaluate R-2 / R-6 / H-27** — decide whether the coordinator dropdown and episode list need `email` or `externalRef`. If not, remove them from the API responses.
3. **Fix H-28** — add role-based projection to `CareEpisodeController.show` so only the minimum necessary PHI is returned.
4. **Fix H-29** — extend `redactForAudit` to cover health-data field names (`medicalHistory`, `diagnoses`, `reasonForCare`, `currentMeds`, `medicalInfo`, `notes`).
5. **Fix H-30** — avoid logging free-text `reviewSummary.notes` in the `IntakeController.review` audit log; log structured metadata only.
6. **Fix R-7** — reduce the registration response to the minimum required for the verification flow.
7. **Fix R-8** — anonymize IP addresses before writing to `Consent` and `ConsentLog`.
8. **Fix R-9** — apply granular permission middleware to each `/api/admin` action (payout approvals, user restore, platform-staff role changes, force-cancel, reports, AdvancedAdminController routes) instead of relying solely on the router-level `requireAdmin` guard.
9. **Fix R-10 / H-31** — remove or role-gate the root-level course/quiz mutation routes in `lms.routes.ts`; ensure only trainers/admins can create, update, delete, or manage courses/quizzes/lessons.
10. **Fix R-11 / H-32** — add explicit `requireAdmin` or a dispute-resolution permission gate on each `/api/admin/disputes*` route.
11. **Fix R-12** — split the provider role list in `provider-booking.routes.ts` and apply the minimum role set per action (clinical vs. non-clinical, verified vs. unverified).
12. **Fix R-13 / H-33** — verify `booking.clientId` and PaymentIntent amount/currency in `BookingPaymentController.verifyPayment` before marking a booking paid.
13. **Fix R-14** — create a refund `Payment` record and reconcile provider escrow/wallet after a Stripe self-refund.
14. **Fix R-15 / H-34** — require admin approval or wallet debit for provider self-refunds; validate original payment state and prevent duplicate refund records.
15. **Fix R-16** — enforce role-based permissions on `PATCH /api/bookings/:id/status` (provider accepts/rejects; client cancels; admin overrides).
16. **Fix R-17 / H-35** — verify `req.user!.userId === booking.providerId` before accepting counter-offers.
17. **Fix R-18** — gate marketplace offer creation on verified/approved provider status and add moderation or cooling-off before public listing.
18. **Fix R-19 / H-36** — validate the PayTabs webhook signature/server-key in `QatariPaymentService.handleWebhook` before updating invoice status.
19. **Fix R-20** — add an explicit positive-amount guard inside `WalletService.credit` and `WalletService.debit`.
20. **Fix R-21** — add dual-control or daily limits for large admin wallet credit/debit adjustments and log all attempts.
21. **Document G-15** — record the legal basis for processing care-recipient health data on guardian/family consent in the data governance record, and decide whether recipient-direct consent is required.
22. After fixing R-3, R-9, R-10, R-13, R-15, R-17, R-19, and H-29, re-test the registration endpoint, admin actions, LMS admin routes, payment/booking flows, provider refund flow, and audit-log content.
23. **Fix C-1 / C-2** — add anti-caching headers to the SPA wildcard fallback in `server/src/app.ts` and to the root `location /` block in `client/nginx.conf`.
24. **Fix C-3** — add a global API middleware that sets `Cache-Control: no-store, no-cache, must-revalidate, private` on authenticated JSON responses, allowing only explicitly public endpoints to override it.
25. **Fix C-4** — set anti-cache headers on the `302` redirect in `DocumentController.downloadDocument`.
26. **Fix H-1** — add an `ALLOWED_HOSTS` allowlist and validate the `Host` / `X-Forwarded-Host` header in Express middleware, especially before any future code starts deriving URLs from the request.
27. **Fix A-1** — rate-limit `/otp/verify` and `/auth/otp-verify` with per-identifier attempt counters; invalidate prior OTPs when a new one is sent.
28. **Fix A-2** — mount `/2fa/verify` and `/auth/2fa-verify` under a strict per-identifier rate limiter and replace the user-ID `two_fa_token` with an opaque random state token.
29. **Fix A-3** — refuse server startup if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` still uses the default placeholder; enforce minimum entropy and document secret generation.
30. **Fix A-4 / A-10** — use `persistRefreshToken` (which hashes the token) inside `OtpController.verify`; remove the plaintext refresh-token fallback from `refreshTokenStore.ts` and migrate existing plaintext rows.
31. **Fix A-5** — on each `forgotPassword` request, revoke or delete all prior `password_reset` rows for the same email so only the latest token is valid.
32. **Fix A-6** — do not silently reassign an existing push token to a different userId; enforce ownership checks in `DeviceTokenController.register`.
33. **Fix A-7** — set a global `Referrer-Policy` header and add `<meta name="referrer" content="no-referrer">` to emails that contain reset/verification secrets.
34. **Fix A-8** — evaluate `__Host-` prefix and `sameSite: 'strict'` for the refresh token, with documented cross-origin compatibility notes.
35. **Fix A-9** — run a dummy `bcrypt.compare` when the login email/phone is not found, or add a randomized delay, to close the timing-based user-enumeration side channel.
36. **Fix BL-1** — restrict `POST /invoices/:id/mark-paid` to admin/finance roles or require a verified payment callback; do not let arbitrary authenticated users mark invoices paid.
37. **Fix BL-2** — validate `clientId` in `InvoiceController.store` against the caller's role and relationships; only admins or providers with a confirmed booking relationship should be able to invoice a client.
38. **Fix BL-3** — add ownership/admin checks to `GET /invoices/:id` and `POST /invoices/:id/send`; log `send` as an audit event.
39. **Fix BL-4** — verify the payment method belongs to the current user's Stripe customer before detaching.
40. **Fix BL-5** — in `BookingPaymentController.verifyPayment`, verify booking ownership, ensure the PaymentIntent metadata contains the matching `bookingId`, and compare amount/currency before marking paid.
41. **Fix BL-6** — prevent duplicate provider self-refunds by checking original payment status, updating it to `refunded`, and performing the actual wallet debit or Stripe refund.
42. **Fix BL-7** — wrap client self-refund (balance check, wallet credit, payment status update, booking cancellation) in one Prisma transaction with a pessimistic lock on the payment row.
43. **Fix BL-8** — move counter-offer creation into a controller, verify the caller is the assigned provider, and assert the booking is in a valid state for counter-offers.
44. **Fix BL-9** — add role/ownership checks to no-show endpoints; allow only the affected party or an admin to record a no-show, and validate booking status/scheduled time.
45. **Fix BL-10** — add care-order status validation, verify `recipientId` belongs to the client, and log budget/date/recipient changes as audit events.
46. **Fix BL-11** — whitelist allowed top-up currencies in `POST /wallet/topup` and store the canonical currency with the top-up record.
47. **Fix BL-12** — add idempotency keys, daily adjustment limits, target-user existence checks, and dual-approval thresholds for admin wallet credit/debit adjustments.

---

## 16. Sign-off

- **Methodology:** Diff analysis of `d4980d1..ea27627`, targeted reads of changed controllers/routes, and cross-framework review against GDPR rules, OWASP API security patterns, business-workflow logic, HIPAA requirements, cache-poisoning / Web Cache Deception surface, Host-header injection surface, account-takeover taxonomy, and business-logic financial flows.
- **No dynamic testing:** Findings are source-code only.
- **No code edits made:** Report is read-only.
- **Corrections applied:** R-1 was withdrawn after source re-verification; G-15 prior claim about `care_recipient_health` consent was corrected; `PUBLIC_SELF_REGISTER_ROLES` claim removed because no such backend constant exists.
- **BFLA cross-check added:** Reviewed the whole route mount for HTTP verb drift, route shadowing, feature-flag/beta paths, batch/job endpoints, transport protocol inconsistencies, and content-type gaps. Findings R-9 through R-12 and H-31/H-32 reflect router-level role broadening and missing per-action gates.
- **Business-logic / payment cross-check added:** Reviewed payment verification, refunds, wallet credit/debit, counter-offers, booking status transitions, marketplace offers, invoices, no-show handling, and payment webhooks. Findings R-13 through R-21, H-33 through H-36, and BL-1 through BL-12 reflect missing ownership checks, missing financial reconciliation, unverified webhook signatures, invoice lifecycle bypasses, and no-show/counter-offer abuse.
- **Cache-poisoning cross-check added:** Reviewed Express/Nginx cache headers, SPA wildcard fallback, static asset caching, and unkeyed-header processing. No exploitable cache-poisoning primitive was confirmed from source, but defensive findings C-1 through C-4 were added for hardening before any CDN deployment.
- **Host-header cross-check added:** Reviewed password reset, email verification, OAuth/OIDC/SAML, routing-based SSRF, path-override headers, and `X-Forwarded-Host` reflection. No exploitable Host-header injection was confirmed from source, but defensive finding H-1 (missing `ALLOWED_HOSTS` / Host allowlist) was added.
- **ATO cross-check added:** Reviewed password reset, OTP/2FA brute force, JWT secrets, refresh-token storage, session cookie attributes, device-token ownership, Referrer-Policy, and login timing side channels. No Host-header/OAuth/email-change ATO primitive was confirmed, but findings A-1 through A-10 identify concrete paths to account takeover via brute force, weak defaults, and plaintext token storage.
- **Report status:** Ready for the development team.

---

*Report generated from `milestone2-revisions` branch, commit `ea27627`, by pure source-code review. No code edits were made.*
