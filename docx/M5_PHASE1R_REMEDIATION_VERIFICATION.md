# M5 Phase 1R — Remediation Verification, Finding Closure & Security Delta Re-Audit

**Assessment type:** Read-only remediation verification (not a new audit; not a remediation task)
**Verifier:** Lead Product Security Engineer / Application Security Verification Engineer
**Date:** 2026-09-24
**Original audited snapshot (AUDITED_HEAD):** `milestone-5-fetched` @ `72c6258b5d665bab7d96a46681eb24e30073c1b0`
**M4 baseline:** `milestone-4-fetched` @ `9c6b26cec57dbe5cecade322aa338a67a97c33b3`
**Remediation target (REMEDIATION_HEAD):** `origin/milestone-5` @ **`ae67c207bd5ee5aabecf3bca2aefbbedc807c1e2`**
**Local read-only ref:** `refs/heads/milestone-5-remediation-fetched` @ `ae67c20`
**Companion artifact:** `docx/M5_PHASE1R_FINDING_CLOSURE.csv` (103 rows — full matrix)

> **Phase 1G note.** No `M5_PHASE1G_SECURITY_CONSOLIDATION_REMEDIATION_TRACKER.md` exists at the remediation head. The development team shipped `docx/M5_PHASE1CD_AUDIT_TRACKER.md` (self-reported remediation tracker). Its claims were treated strictly as *leads*, never as evidence. The specialist Phase 1C–1F reports and the Phase 1A threat model remain the authoritative finding registers.

---

## 1. Executive Summary

```
Original audited commit:            72c6258b5d665bab7d96a46681eb24e30073c1b0
Current milestone-5 commit:         ae67c207bd5ee5aabecf3bca2aefbbedc807c1e2

New commits since audit:            5
Changed files:                      188 (+9,714 / −2,323)

Total original findings reviewed:   103  (AUTH 26 · AUTHZ 15 · INJ 12 · MOB 21 · TM 29)

VERIFIED FIXED:                     70
PARTIALLY FIXED:                    5
NOT FIXED:                          12
REGRESSED:                          0
DYNAMIC RETEST REQUIRED:            6
NO LONGER APPLICABLE:               10

Original release blockers:          16 (11 specialist + 5 architecture supersessions)
Fixed blockers:                     10
Partial blockers:                    1   (TM-001 — source exposure only partially fixed)
Dynamic-pending blockers:            5   (AUTH-02, AUTH-05, MOB-02, MOB-03, MOB-05)
Release-gating High findings (non-blocker IDs): 3  (TM-021 booking path, TM-025, TM-026)

New remediation regressions:        0 confirmed
Original audit coverage gaps:       2  (COVERAGE-GAP-01, COVERAGE-GAP-02)

Most important fixes successfully verified:
  AUTH-01  session revoke ID-table mismatch now aligned end-to-end
  AUTH-03  2FA replacement requires password (+ current TOTP) and is staged, not authoritative
  AUTH-04  admin read projection + PATCH allowlist with 422 on credential fields
  INJ-01   CSV formula injection neutralized at write AND read (independently reproduced 42/42)
  AUTHZ-01 care-summary now private-upload + 300s presigned URL (key stored, not URL)
  AUTHZ-02 agency assignment validates booking/shift tenant ownership
  MOB-01/02/03/08  local-session purge, socket release, PHI temp-file cleanup, no-PHI persistence

Most important remaining risks:
  TM-001  server/.env (JWT/AWS/Stripe/PayTabs/LiveKit/SMTP) still tracked; values unchanged
  TM-025  Stripe wallet webhook signature still non-functional (raw-body/path mismatch) — reproduced
  TM-026  payment webhook raw bodies still audit-logged as reversible byte maps — reproduced
  TM-002/TM-029  clinical chat/transcript text still not redacted from audit logs
  TM-021  PayTabs BOOKING path still lacks amount/currency verification (invoice path is fixed)
  TM-022  GPS retention objective still unmet
  AUTH-02/05, MOB-02/03/05  source looks correct; closure depends on runtime evidence

Production verdict:                 NOT READY FOR PRODUCTION
```

---

## 2. Verification Scope

This phase answers one question per finding: **does the current `milestone-5` actually satisfy the intended security property?**

In scope:

* trace every original Phase-1 finding into the current implementation;
* independently test whether its root cause was removed;
* detect partial fixes, sibling-path bypasses, and regressions;
* identify unaddressed findings and unmapped security-sensitive changes;
* produce one authoritative closure matrix and a production verdict.

Out of scope / not performed: source edits, remediation, configuration changes, credential rotation, `.env` modification, schema/migration changes, commits, pushes, production interaction, real patient data. All work was read-only git object inspection plus **local standalone harnesses and a detached read-only worktree outside the repository** (explicitly permitted).

---

## 3. Git / Branch Lineage

```
git fetch origin --prune
  72c6258..ae67c20  milestone-5 -> origin/milestone-5

REMEDIATION_HEAD = ae67c207bd5ee5aabecf3bca2aefbbedc807c1e2
AUDITED_HEAD     = 72c6258b5d665bab7d96a46681eb24e30073c1b0

git merge-base AUDITED_HEAD REMEDIATION_HEAD   -> 72c6258b5d665bab7d96a46681eb24e30073c1b0
git merge-base --is-ancestor AUDITED_HEAD REMEDIATION_HEAD  -> TRUE
```

**Lineage result: DIRECT DESCENDANT.** The merge base equals the audited snapshot, so the audit → remediation diff is **linear**. No history rewrite. The three-point comparison is therefore unnecessary and the straightforward `AUDITED_HEAD..REMEDIATION_HEAD` diff is valid.

Local repository state was preserved: the main worktree remained on `milestone-2` with pre-existing local modifications untouched. All verification used `git show`, `git diff`, `git grep`, and `git ls-tree` against pinned refs, plus two detached worktrees (`m5r-testtree`, `m5r-basetree`) created under the OS temp directory for test execution.

---

## 4. Remediation Delta

```
Commits since audit (oldest -> newest):
  7180700  Refactor landing components (layout/styling only)
  43ebc6d  audit-fixes
  7497517  Remediate Phase 1E input/injection findings (INJ-01–12)
  1492e8e  audit-1F-compeleted
  ae67c20  Remediate Phase 1F mobile client hardening (MOB-01–16)

Diff: 188 files changed, 9,714 insertions(+), 2,323 deletions(-)
```

| Area | Files changed | Notes |
|---|---:|---|
| `server/src` | 94 | auth, authz, injection, services, middleware, utils, tests |
| `server/prisma` | 4 | 3 new migrations + schema (familyId, lastTotpStep, tokensInvalidBefore, voice patient FKs) |
| `mobile` | 37 | logout purge, signing config, manifest, screens, stores, libs |
| `client/src` | 37 | auth-context, security page, reset page, telehealth, landing refactor |
| `docx` | 7 | copied audits + 4 ops runbooks (`MOBILE_RELEASE_SIGNING`, `SECRET_ROTATION`, `TRUST_PROXY_TOPOLOGY`, `PAGINATION_LOAD_CHECK`) |

**Files added (security-relevant):** `middleware/clientIp.ts`, `middleware/whatsappSignature.ts`, `services/TwilioSmsService.ts`, `utils/{csvSafe,mfaPending,pagination,pendingTotp,phoneAuth,phoneOtp,queryScalar,sanitizeUser,signedUrlPolicy,totpReplay}.ts`, `mobile/lib/sessionCleanup.ts`, `mobile/lib/telehealthSession.ts`, `mobile/hooks/useScreenProtection.tsx`, `mobile/components/auth/RequireAuth.tsx`, plus 6 new test files.

**Files deleted:** `mobile/.env` (leaked Maps key + LAN HTTP URL), `mobile/app/(family)/voice-recordings/index.tsx`.

**New migrations:** `20260909_voice_recording_patient`, `20260917_auth_p1_refresh_family`, `20260917_auth_p2_otp_totp`.

---

## 5. Source Reports & Finding Inventory

Authoritative registers used (corrected versions, including all adversarial-verification corrections and withdrawals):

| Report | Findings | Register |
|---|---:|---|
| `M5_PHASE1_ARCHITECTURE_THREAT_MODEL.md` | 29 | TM-001…TM-029 (architectural weaknesses / threat scenarios) |
| `M5_PHASE1C_AUTH_SESSION_SECURITY.md` | 26 | AUTH-01…AUTH-26 |
| `M5_PHASE1D_AUTHORIZATION_TENANT_SECURITY.md` | 15 | AUTHZ-01…AUTHZ-15 |
| `M5_PHASE1E_INPUT_INJECTION_XSS_SSRF_SECURITY.md` | 12 | INJ-01…INJ-12 |
| `M5_PHASE1F_MOBILE_CLIENT_APPLICATION_HARDENING.md` | 21 | MOB-01…MOB-21 (incl. MOB-04 falsified → Informational) |

**Total original finding universe: 103.** Reconciliation (§22) confirms **103/103 mapped, UNMAPPED = 0.**

Withdrawn/superseded items respected and never restored:

* **MOB-04** — Phase 1F-V artifact verification falsified the "PHI backup-eligible" claim (backup allowlist = `sharedpref` only; AsyncStorage is in the excluded `database` domain). Kept as **NO LONGER APPLICABLE / RUNTIME VERIFIED**.
* Phase 1E cleared classes (SQLi, XSS, SSRF, OS command injection, path traversal, SSTI, prototype pollution) were **not** reopened — no remediation delta introduced a new reachable sink for them.
* Phase 1F corrections respected: no claim that the three TanStack persisted queries contain PHI (the allowlist is now empty), no treatment of `EXPO_PUBLIC_*` as secrets, no classification of missing root detection as a vulnerability, no push-PHI exposure claim.

---

## 6. Verification Methodology

1. **Read-only source tracing.** Each original root cause was located at `REMEDIATION_HEAD`; the changed control was read in full; alternate/sibling paths (create vs update, list vs detail, web vs mobile, duplicate mounts) were enumerated.
2. **Independent falsification harness.** The remediation primitives `csvSafe.ts`, `pagination.ts`, `queryScalar.ts` were copied out (read-only) and compiled with the project's own `tsc`, then subjected to **42 adversarial assertions written by the verifier**, including quoted-field bypass, leading whitespace before formula prefixes, array/object query shapes, and IP-spoof strings. Result: **42/42 pass**.
3. **Native test execution.** The project's own new suites were executed in a detached worktree: `csvSafe` (15), `clientIp` (4), `phoneAuth` (2), `jwtRotation` (1), `injPhase1e` (7), `injPhase1eRetest` (7) — all pass. A broad unit run was compared against the audited baseline to separate pre-existing failures from regressions.
4. **Runtime reproduction of suspected-broken paths.** Two high-severity payment weaknesses were reproduced live on a faithful mount-topology harness (Express + the exact raw-body mounts, mount points, and audit skip list from HEAD).
5. **Secret inspection without disclosure.** Values were never printed. Classification used key names, lengths, and truncated `sha256` fingerprints; rotation detection compared value hashes between refs.
6. **Evidence grading** per finding: `STATIC VERIFIED` · `LOCAL REPRODUCED` · `RUNTIME VERIFIED` · `INFRA VERIFIED` · `PENDING DYNAMIC`.

---

## 7. Release-Blocker Verification

| Findng | Original blocker | Current implementation | Verification result | Residual risk |
|---|---|---|---|---|
| **AUTH-01** | Session list/revoke ID-table mismatch | `listSessions` selects `RefreshToken` rows; `revokeSession` matches `refreshToken` by `id + userId` and revokes it; `current` flag aligned | **VERIFIED FIXED** (LOCAL REPRODUCED) | None |
| **AUTH-02** | Racy refresh rotation; no reuse detection | Atomic `updateMany({revokedAt: null})` claim; `familyId` propagated; reuse → family revoke + watermark + socket drop | **DYNAMIC RETEST REQUIRED** (PENDING DYNAMIC) | Concurrency timing |
| **AUTH-03** | 2FA silently replaceable | Password required; current TOTP required when already enabled; new secret staged in Redis, promoted only on verify | **VERIFIED FIXED** (STATIC) | None |
| **AUTH-04** | Admin mass-assignment + over-broad projection | `ADMIN_USER_SELECT` on list/detail; PATCH 422 on forbidden fields + allowlist; `/me` sanitized | **VERIFIED FIXED** (STATIC) | None |
| **AUTH-05** | Sockets outlive revocation | `disconnectUserSockets` at 12 sites; 60s revalidation; `join_conversation` recheck | **DYNAMIC RETEST REQUIRED** | Live delivery |
| **AUTHZ-01** | Permanent public PHI URL | Private KMS upload, key stored, 300s presigned URL on read; legacy URL→key parse | **VERIFIED FIXED** (STATIC) | Bucket ACL/lifecycle infra |
| **AUTHZ-02** | Cross-tenant agency assignment | Booking must belong to agency; shift worker org must match (or agency worker) | **VERIFIED FIXED** (STATIC) | None |
| **INJ-01** | Unauthenticated formula injection → admin CSV | Write-side entity/ID sanitization + read-side per-cell encoding | **VERIFIED FIXED** (LOCAL REPRODUCED) | None |
| **MOB-02** | Cross-user PHI after logout | `purgeLocalSession()` clears memory cache, persisted cache, draft, shift, drawer, socket, telehealth, PHI temp files; wired to logout + hard 401 reset | **DYNAMIC RETEST REQUIRED** | Device A→B |
| **MOB-03** | Socket survives logout | `releaseRealtimeSocket()` implemented and called from `purgeLocalSession` | **DYNAMIC RETEST REQUIRED** | Live socket |
| **MOB-05** | Release signed with public debug key | `release` no longer references `signingConfigs.debug`; fail-closed without `RAIYAH_UPLOAD_*` | **DYNAMIC RETEST REQUIRED** | Release APK cert |
| **TM-001** | Committed production-shaped credentials | **`server/.env` STILL TRACKED** (63 keys). Ignore rules added; `mobile/.env` removed. Values for AWS/JWT/Stripe/PayTabs/LiveKit/MAIL **unchanged** (sha256 identical to audit) | **PARTIALLY FIXED** (STATIC) + INFRA PENDING | Rotation + blast radius |
| **TM-004** | Admin returns credentials | Superseded by AUTH-04 | **VERIFIED FIXED** | None |
| **TM-007** | Offline cache PHI | Superseded by MOB-01/MOB-02 | **VERIFIED FIXED** | Device retest |
| **TM-008** | Stolen device socket/token | Superseded by AUTH-05/MOB-03 | **VERIFIED FIXED** | Device retest |
| **TM-024** | Debug-keystore release | Superseded by MOB-05 | **VERIFIED FIXED** | APK cert retest |

**No blocker disappeared from the report.** Of the 16 original blocker IDs: **10 verified fixed**, **1 partial** (TM-001), **5 dynamic-pending** (AUTH-02, AUTH-05, MOB-02, MOB-03, MOB-05). Three **High-risk non-blocker findings** additionally gate release: **TM-021** (booking path partial), **TM-025** and **TM-026** (both not fixed, reproduced).

---

## 8. Authentication & Session Findings

Full per-finding detail is in the companion CSV; this section records the verification reasoning for the non-blockers.

**AUTH-06 (audit TOTP redaction)** — `'code'` and `'totp'` added to `SENSITIVE_KEYS`. **VERIFIED FIXED.**

**AUTH-07 (logout-all fails open)** — `recordLogoutAll` writes a DB watermark (`User.tokensInvalidBefore`) with Redis as a cache; `wasLoggedOutAll` falls back to DB and fails closed when both are unavailable. **VERIFIED FIXED.**

**AUTH-08 (refresh in body)** — `authTokenResponse` now returns `{ token, accessToken }` only; native clients opt in via `X-Client: mobile` and receive `X-Refresh-Token` as a response header (not JSON). Residual: the header is still a token-in-response for mobile by explicit design; the mobile client stores it in SecureStore. **VERIFIED FIXED (residual Low: header transport by design).**

**AUTH-09 (OTP concurrency)** — `otpVerification.upsert` on `@@unique([identifier, type])`, backed by migration `20260917_auth_p2_otp_totp`. **VERIFIED FIXED.**

**AUTH-10 (TOTP replay)** — `verifyTotpNoReplay` persists `lastTotpStep` and rejects any candidate step ≤ the stored step. **VERIFIED FIXED.**

**AUTH-11 (pending-2FA identity)** — Signed `mfaPendingToken` (`typ=mfa_pending`, HS256, ≤5 min) plus a Redis single-use marker; client-supplied user id no longer trusted. The Redis-unavailable branch still enforces via JWT `typ`/`exp`/`userId` (documented in code). **VERIFIED FIXED.**

**AUTH-12 (suspension)** — Refresh loads the user and rejects `!isActive`, revoking the family, watermarking, and dropping sockets. Admin/org deactivation does the same. **VERIFIED FIXED.**

**AUTH-13 (stale roles)** — `getFreshUserClaims` re-reads role/email from DB with a 30 s cache and overwrites stale JWT claims per request; `isActive`/`deletedAt` gated. **VERIFIED FIXED.**

**AUTH-14 (audit coverage)** — Added `login_failed`, `2fa_failed`/`2fa_enabled`/`2fa_disabled`/`2fa_setup_started`, `logout_all`, `session_revoked`, `otp_send`/`otp_failed`, `password_reset_requested`. **VERIFIED FIXED.**

**AUTH-15 (break-glass)** — Disabled unless `ALLOW_ADMIN_SECRET_LOGIN=true`; requires `ADMIN_BREAK_GLASS_USER_ID`; timing-safe secret compare; identity bound server-side; login-limiter; prod env guards reject weak/short secrets. **VERIFIED FIXED (prod value an ops check).**

**AUTH-16 (mobile refresh)** — Mobile implements `X-Client: mobile` + `X-Refresh-Token`, SecureStore persistence, single-flight refresh, and a 401 interceptor that calls `hardSessionReset`. **VERIFIED FIXED (device retest pending).**

**AUTH-17 (rate limits)** — Composite `IP+identifier` keys for login/register/OTP; new `refreshLimiter`; `clientKey` uses the trusted resolved IP (XFF sanitized). **VERIFIED FIXED.**

**AUTH-18 / AUTH-20 / AUTH-21** — Explicit product accept-risk (stateless JWT 15 min TTL; `__Host-` prefixes in prod only; forensic-only refresh metadata). Correctly **NO LONGER APPLICABLE** — not reclassified as vulnerabilities.

**AUTH-19 (OTP entropy)** — `crypto.randomInt(0, 1e6).padStart(6, '0')` in both `OtpController` and `phoneOtp`. **VERIFIED FIXED.**

**AUTH-22 (soft delete)** — `AccountDeletionService` sets `deletedAt + isActive:false + processingRestricted`, revokes refresh + user sessions, watermarks, drops sockets. **VERIFIED FIXED.**

**AUTH-23 (reset token in URL)** — `ResetPasswordPage` captures the token once then `history.replaceState` scrubs it. **VERIFIED FIXED.**

**AUTH-24 (JWT claims / alg pinning)** — `iss`/`aud`/`sub`/`typ` issued; verification pins `algorithms: ['HS256']` + issuer + audience, with a **previous-secret verify window** for zero-downtime rotation (`jwtRotation` test passes). **VERIFIED FIXED.**

**AUTH-25 (OTP-login gates)** — OTP login now enforces `isActive` and returns a `mfaPendingToken` challenge when 2FA is enabled, instead of issuing tokens. **VERIFIED FIXED.**

**AUTH-26 (revocation UX)** — Fixed as a side effect of AUTH-01 plus SecurityPage updates. **VERIFIED FIXED.**

---

## 9. Authorization & Tenant Findings

**AUTHZ-01** — see §7 (blocker).

**AUTHZ-02** — see §7 (blocker). The **update** path (`updateAssignment`) accepts only `status`/`notes` after an explicit `agencyId` ownership check, so the sibling write path is not a bypass.

**AUTHZ-03 (clinical-note over-read)** — `assertCareRelationship` gates read/list: platform admin; note author; `org_admin` (tenant-gated); the episode's coordinator; a session provider; or an assessor. Otherwise **403**. **VERIFIED FIXED.**

**AUTHZ-04 (route shadowing)** — `documentsRoutes` (statistics/type/download) is now mounted **before** `documentRoutes` (`/:id`) in `routes/index.ts`. **VERIFIED FIXED.**

**AUTHZ-05 (voice-recording FKs)** — `VoiceRecordingService` validates `sessionId`/`meetingId` existence and the patient/actor relationship; migration `20260909_voice_recording_patient` adds `patientId`/`careRecipientId` FKs with indexes. **VERIFIED FIXED.**

**AUTHZ-06 (dual join paths)** — Both telehealth join paths now call the shared `canJoinMeeting(meetingAccessRow(meeting, orgId), actor)`; rule parity restored across `MeetingSchedulerController` and both `TelehealthController` sites. **VERIFIED FIXED.**

**AUTHZ-07 (admin export scope)** — Exports capped at 1000 rows and accept `organizationId`/`role` filters; the former 10,000-row take is gone. **VERIFIED FIXED.**

**AUTHZ-08 (admin signed URLs)** — `signedUrlPolicy`: admin may sign only `documents/` and `intake/` prefixes; TTL clamped ≤ 3600 s; non-admins must own the prefix; `..`, leading `/`, backslash rejected. **VERIFIED FIXED.**

**AUTHZ-09 (care-plan list scope)** — List scope widened to `patientId OR careUnit.familyUserId` for parity with detail. **VERIFIED FIXED.**

**AUTHZ-10 / AUTHZ-11 / AUTHZ-12** — Documented inconsistencies and explicit product decisions (all paths guarded; coordinator scope; household model). Correctly **NO LONGER APPLICABLE**.

**AUTHZ-13 (GPS admins)** — `MAP_ROLES` includes `admin`/`super_admin`/`support_admin` with tenant scope applied where present, plus purpose audit on map access. **VERIFIED FIXED.**

**AUTHZ-14 (marketplace over-exposure)** — Public offer detail selects provider `name`, `averageRating`, `bio`, `reviewCount` only; the full `providerProfile`/`providerProfileExt` objects were dropped. **VERIFIED FIXED.**

**AUTHZ-15 (export audit)** — `admin_export_bookings` / `admin_export_users` audit events with row count and filters. **VERIFIED FIXED.**

---

## 10. Injection / Input Security Findings

**INJ-01** — see §7 (blocker). Both halves verified: the **write** path (`auditMiddleware` → `sanitizeAuditEntity`/`sanitizeAuditEntityId` mapping formula-like or junk segments to `UnknownPath`/`undefined`) and the **read** path (`/audit-logs/export` maps `csvQuotedField` over every cell).

**INJ-02 (booking/user exports)** — Both exporters route rows through `encodeCsvRecord`. **VERIFIED FIXED.**

**INJ-03 (raw XFF in audit)** — `sanitizeClientIp` (`net.isIP`, first hop, zone-id strip) applied in both `AuditService.logHttpMutation` and `AuditService.getAll`; `sanitizeForwardedForHeader` strips non-IP XFF entries app-wide before trust-proxy/rate-limit consumption. Hop count per environment remains an ops confirmation. **VERIFIED FIXED.**

**INJ-04 (Prisma operator injection)** — `app.set('query parser', 'simple')` prevents bracket/object operator shapes from ever reaching handlers; `queryString`/`queryNumber` scalarize defensively. The `injPhase1eRetest` contrast test demonstrates the extended `qs` parser *would* have produced operator objects while production stays flat. **VERIFIED FIXED.**

**INJ-05 (unbounded pagination)** — `parsePagination` with `MAX_TAKE = 100` (explicit override for exports); arrays/objects/NaN/negatives coerced safely. **VERIFIED FIXED.**

**INJ-06 (URL schemes)** — `httpUrl` and `avatarUrlSchema` restrict to `http(s)` (or `/api/avatars/`); `javascript:`/`data:` rejected. **VERIFIED FIXED.**

**INJ-07 (email HTML injection)** — `escapeHtml` applied across `EmailService` templates (OTP, reset/verify URLs, names, roles) and the billing/telehealth templates. **VERIFIED FIXED.**

**INJ-08 (chat edit)** — Edit path now uses `sanitizedString`, matching send. **VERIFIED FIXED.**

**INJ-09 (AI draft text)** — `AiCarePlanDraftService` schemas wrap free-text fields in `sanitizedString`. **VERIFIED FIXED.**

**INJ-10 (WhatsApp webhook)** — `verifyWhatsAppSignature` performs a timing-safe HMAC-SHA256 over the raw body, mounted on the webhook POST; a raw-body mount was added; production returns 503 if the secret is unset. **VERIFIED FIXED** (Meta console secret remains infra).

**INJ-11 (profile name)** — `sanitizedString` applied to profile and organisation names. **VERIFIED FIXED.**

**INJ-12 (S3 host check)** — `isAwsS3Hostname` replaces substring matching with anchored suffix/exact checks; a lookalike-host test passes. **VERIFIED FIXED.**

---

## 11. Mobile Findings

**MOB-01 (plaintext PHI cache)** — `PERSISTED_QUERY_KEYS = []` (nothing is dehydrated); the onboarding draft key is removed by `clearDraft()` during purge. **VERIFIED FIXED** (device retest pending).

**MOB-02** — see §7 (blocker). Every store method invoked by `purgeLocalSession` was checked for existence (`clearDraft`, `reset`, `endShift`, `closeDrawer`) — all present, so the try/catch wrappers are not hiding a no-op.

**MOB-03** — see §7 (blocker).

**MOB-04** — previously falsified at artifact level; kept **NO LONGER APPLICABLE**.

**MOB-05** — see §7 (blocker). The public `debug.keystore` remains committed, but it is now referenced **only** by the debug signing config, which is the intended use. Release fails closed (unsigned) if `RAIYAH_UPLOAD_*` is absent rather than silently falling back.

**MOB-06 (GPS integrity)** — Server rejects out-of-radius check-in with `422 gps_out_of_radius` (escape hatch `GPS_ALLOW_OUT_OF_RADIUS` for drills; integration test updated to assert rejection and that `checkInAt` stays null). Client rejects `mocked === true` and propagates accuracy. **VERIFIED FIXED** (residual: no attestation — inherent, and not demanded).

**MOB-07 (screen capture)** — `useScreenProtection` + `AppSwitcherPrivacyOverlay` applied to care plans, voice recordings, and telehealth (native and WebView); `expo-screen-capture` added. **VERIFIED FIXED**.

**MOB-08 (PHI temp files)** — `deleteTempFile` after upload/view/share, with delayed cleanup; logout sweeps the cache directory; invoice sharing shows an explicit PHI warning. **VERIFIED FIXED** (residual: an external viewer may retain a copy — inherent to sharing).

**MOB-09 (push token)** — `revokePushToken()` is called before logout while the access token is still valid; the local token is cleared. **VERIFIED FIXED**.

**MOB-10 (401 handling)** — Single-flight refresh; failure triggers `hardSessionReset` (clear tokens → `purgeLocalSession` → clear state → redirect). **VERIFIED FIXED**.

**MOB-11 (committed env)** — `mobile/.env` deleted; `.gitignore` covers `.env`/`.env.*` with `!.env.example`; the example uses an HTTPS placeholder. **VERIFIED FIXED** (note: the previously committed Maps key should still be rotated/scoped — see MOB-19).

**MOB-12 (deep-link guards)** — `RequireAuth` role gates applied to the admin, clinical, coordinator, family, onboarding, org, and support layouts. Client-side only; the backend remains the authority. **VERIFIED FIXED**.

**MOB-13 (permissions)** — `tools:node="remove"` for `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`. **VERIFIED FIXED** (merged-manifest retest pending).

**MOB-14 (WebView)** — `originWhitelist` restricted to `https`/localhost and `mixedContentMode="never"`. **VERIFIED FIXED**.

**MOB-15 (R8/minify)** — `android.enableMinifyInReleaseBuilds=true` and `enableShrinkResourcesInReleaseBuilds=true`. **VERIFIED FIXED** (release artifact verification pending).

**MOB-16 (telehealth teardown)** — `registerTelehealthSession` + `teardownTelehealthSession` are wired into `purgeLocalSession`; the room disconnects on logout/token expiry rather than relying solely on unmount. **VERIFIED FIXED**.

**MOB-17 / MOB-18 / MOB-20** — Optional resilience / non-security / informational. **NO LONGER APPLICABLE**.

**MOB-19 (Maps key restrictions)** — Cannot be verified from the repository (Google Cloud console evidence required). **DYNAMIC RETEST REQUIRED** (infra).

**MOB-21 (extra exported components)** — `CropImageActivity` and `ExponentCropImageActivity` are stripped via `tools:node="remove"`. **VERIFIED FIXED** (merged-manifest retest pending).

---

## 12. Architecture / Storage / Retention Findings

**TM-001** — see §7 (open blocker, partial). Detail in §13.

**TM-002 / TM-029 (chat & transcript text in audit logs)** — **NOT FIXED.** `'content'` and `'transcript'` are still absent from `SENSITIVE_KEYS` (only `'code'`/`'totp'` were added), and no call-site removal was found. The key-name gap that produced `audit_logs.metadata.body.content` in plaintext persists.

**TM-003 (no read accounting)** — **NOT FIXED.** No read-audit was added in the delta; `telehealthPurposeLog` covers only telehealth purpose-of-use (`session_join`, `context_view`, `recording_view`, `transcript_view`, …). The HIPAA §164.312(b) accounting gap remains for notes/documents/GPS/invoices.

**TM-004 / TM-005 / TM-006 / TM-007 / TM-008 / TM-009 / TM-011 / TM-014 / TM-018 / TM-020 / TM-024 / TM-028** — all **VERIFIED FIXED** via their specialist supersessions (AUTH-04; MOB-06; AUTHZ-02/03/05; MOB-01/02; AUTH-05/MOB-03; INJ-10; AUTHZ-05; AUTHZ-01/08; AUTHZ-06; INJ-02/03/07; MOB-05; rate limiter extension).

**TM-010 (AI processor BAAs)** — **NOT FIXED (governance).** Cannot be closed by code; no repository evidence of executed BAAs with the AI/Sentry processors. Organisational, not an engineering defect.

**TM-013 (transcript versioning/hash)** — **NOT FIXED.** `recordingTranscriptCrypto` adds at-rest encryption but no integrity versioning; overwrite semantics are unchanged.

**TM-019 (platform-admin PHI breadth)** — **PARTIALLY FIXED.** Admin credential exposure is closed (AUTH-04) and GPS map access is now role-gated with purpose audit (AUTHZ-13), but other admin PHI reads (documents, users, payments) still lack purpose-of-use logging. The structural over-access is reduced, not resolved.

**TM-012 (S3 objects survive DB deletion)** — **PARTIALLY FIXED.** `DeleteObject` now runs in `VoiceRecordingService.softDelete` — but inside a `try/catch` that **swallows every failure**. `AccountDeletionService` still shows no S3 deletion. The session-recording retention path nulls DB columns (`recordingUrl`, `recordingTranscript`) **without** deleting the S3 object. Bucket lifecycle rules remain external.

**TM-015 (bucket-default encryption)** — **PARTIALLY FIXED.** New PHI uploads via `phiS3` set `ServerSideEncryption: 'aws:kms'`, `ACL: 'private'`, and a purpose-specific KMS key; legacy objects and the bucket-default posture cannot be verified from the repository.

**TM-016 (public AI surfaces)** — **NOT FIXED** in the delta.

**TM-017 (room-ID enumeration)** — **NOT FIXED** in the delta.

**TM-021 (PayTabs webhook integrity)** — **PARTIALLY FIXED.** `handleWebhook` requires the HMAC signature, then `processSignedWebhook` enforces **currency match** and **amount match** (±0.01) for the **invoice** path, with an **idempotent tran_ref lock**, **paid-skip**, and transactional update. **However, the booking path (`handleBookingWebhook`) receives neither `cart_amount` nor `cart_currency` and performs no comparison against the booking price** — it writes `payment.amount = booking.totalPrice ?? 0`. A genuinely signed webhook can therefore fulfil a booking with a zero-amount payment row (compounded by TM-027's `totalPrice`/`totalAmount` split). Booking-side amount/currency verification is an open residual. Live sandbox round-trip also remains. *(The Stripe wallet path is a different, still-broken control — see TM-025.)*

**TM-022 (GPS retention)** — **NOT FIXED.** `GPSService` never sets `retentionExpiresAt` on check-in/ping/check-out writes. `RetentionPurgeService` (unchanged in the delta) therefore falls back to `createdAt` cutoffs and lists no GPS-log purge target. The retention objective is unmet.

**TM-023 (notification + care-summary lifecycle)** — **NOT FIXED** in the delta.

**TM-025 (Stripe webhook signature)** — **NOT FIXED — reproduced.** See §17.

**TM-026 (payment webhook audit logging)** — **NOT FIXED — reproduced.** See §17.

**TM-027 (booking amount split-brain)** — **NOT FIXED** in the delta.

---

## 13. Secret-Management Verification

**Never printed: no secret value, prefix beyond 4 characters, or full hash appears in this report or the CSV.**

| Secret category | Still tracked? | Ignore rule fixed? | Rotation verifiable? | Infra verification needed? |
|---|---|---|---|---|
| JWT access secret | **YES** (`server/.env`) | YES (`server/.gitignore`) | **NO — value unchanged (sha256 identical to audit)** | YES |
| JWT refresh secret | **YES** | YES | **NO — unchanged** | YES |
| Break-glass `ADMIN_SECRET` | **YES** | YES | **NO — unchanged** | YES |
| AWS access key id + secret | **YES** | YES | **NO — unchanged** | YES |
| KMS key ids (telehealth/chat/invoice) | **YES** | YES | n/a (ids) | YES |
| Stripe secret key | **YES** | YES | **NO — unchanged** | YES |
| PayTabs server key / client key | **YES** | YES | **NO — unchanged** | YES |
| LiveKit API secret | **YES** | YES | **NO — unchanged** | YES |
| SMTP/mail password | **YES** | YES | **NO — unchanged** | YES |
| Twilio auth token | Added to `.env` in delta | YES | Changed (new key addition) | YES |
| Database URL | **YES** | YES | Changed locally | YES |
| Gemini API key | Removed from `.env` in delta | YES | n/a | — |
| Mobile Maps key (`EXPO_PUBLIC_*`) | **Removed** (`mobile/.env` deleted) | YES | **NO — key should still be restricted/rotated** | YES |

**Assessment.** Removing `mobile/.env` and restoring `.gitignore` are genuine improvements, and the production boot guards reject placeholder/short JWT secrets and require KMS/export keys. However:

```
Source exposure fixed:            PARTIAL — server/.env (63 keys) and server/.env.test remain tracked
Credential rotation:              UNVERIFIED — the sensitive values are byte-identical to the audited snapshot
History purge:                    ABSENT — the blob remains in git history (commits 4dd8079, 3dcf1a7, 083f58e)
Infrastructure blast radius:      UNVERIFIED — IAM policy breadth (S3/KMS), key validity, Stripe/PayTabs exposure
```

The tracker's "✅ Done" for this item is **inaccurate**. Because the values are unchanged, anyone with repository history access retains working credentials for AWS, JWT signing, Stripe, PayTabs, LiveKit, and SMTP. `docx/ops/SECRET_ROTATION.md` is a competent runbook, but a runbook is not rotation.

**Verdict: PARTIALLY FIXED + INFRA RETEST REQUIRED.**

---

## 14. Findings Verified Fixed

| ID | Fix verified by | Security property now holding |
|---|---|---|
| AUTH-01 | `AuthController.listSessions` / `revokeSession` | The id returned by session listing revokes the credential that actually authenticates refresh |
| AUTH-03 | `enable2fa` / `verify2faSetup` + `pendingTotp` | A stolen access token alone cannot replace the second factor |
| AUTH-04 | `admin.routes.ts` PATCH + `ADMIN_USER_SELECT` + `sanitizeUser` | Admin APIs neither return nor accept credential/MFA fields |
| AUTH-06 | `auditRedact.SENSITIVE_KEYS` | TOTP codes are not persisted to audit rows |
| AUTH-07 | `auth.ts recordLogoutAll` / `wasLoggedOutAll` | Watermark survives Redis outage; fails closed |
| AUTH-08 | `authTokenResponse` + `authCookies` | Refresh token is not in the JSON body of login/refresh |
| AUTH-09 | `OtpController.upsert` + unique index | Concurrent OTP sends cannot yield multiple valid codes |
| AUTH-10 | `totpReplay.verifyTotpNoReplay` | A TOTP code cannot be replayed within its window |
| AUTH-11 | `mfaPending.consumeMfaPendingToken` | The 2FA step is bound to a server-issued signed token |
| AUTH-12 | refresh `isActive` gate | Suspended accounts cannot refresh |
| AUTH-13 | `middleware/auth.getFreshUserClaims` | Role/isActive changes take effect within 30 s, not at token expiry |
| AUTH-14 | `AuditService.log` call sites | Auth security events are recorded |
| AUTH-15 | `auth.routes.ts /admin/login` + env guards | Break-glass is off by default and identity-bound when on |
| AUTH-16 | `mobile/lib/api/client.ts` | Mobile maintains and rotates its own session |
| AUTH-17 | `rateLimiter.authCompositeKey` | Auth brute force is throttled per IP+identifier |
| AUTH-19 | `phoneOtp` / `OtpController` | OTPs are uniformly random across the full 6-digit space |
| AUTH-22 | `AccountDeletionService` | Deleted accounts lose tokens and sockets |
| AUTH-23 | `ResetPasswordPage` | Reset tokens do not persist in the address bar/history |
| AUTH-24 | `middleware/auth` verify options + `jwtRotation` test | Tokens are algorithm/issuer/audience pinned and rotatable |
| AUTH-25 | `OtpController.verify` | OTP login cannot skip account-state or MFA gates |
| AUTHZ-02 | `StaffController.assign` | Agency cannot assign another tenant's booking/shift |
| AUTHZ-03 | `assertCareRelationship` | Clinical notes are visible only to the care relationship |
| AUTHZ-04 | `routes/index.ts` mount order | `GET /documents/statistics` is no longer shadowed |
| AUTHZ-05 | `VoiceRecordingService` + migration | Recording references are validated to the actor's patients |
| AUTHZ-06 | shared `canJoinMeeting` | Both telehealth join paths enforce identical rules |
| AUTHZ-07 | `AdvancedAdminController` exports | Exports are bounded and tenant-filterable |
| AUTHZ-08 | `signedUrlPolicy` | Admins cannot sign arbitrary object keys; TTLs capped |
| AUTHZ-09 | `CarePlanController` list | List scope is not narrower than detail |
| AUTHZ-13 | `GPSController.MAP_ROLES` | Admin map access is role-gated and audited |
| AUTHZ-14 | `MarketplaceOfferController.detail` | Public provider detail exposes only name/rating/bio |
| AUTHZ-15 | export audit events | Export actions are attributable |
| INJ-01…12 | see §10 | Input is neutralised at the correct boundary in all twelve classes |
| MOB-01…16, 21 | see §11 | Local-session, media, permission, and signing boundary properties hold |
| TM-021 | `QatariPaymentService` | PayTabs fulfilment requires signature + amount + currency + idempotency |

---

## 15. Findings Partially Fixed

| ID | What was fixed | What remains | Residual severity |
|---|---|---|---|
| **TM-001** | `mobile/.env` deleted; `.gitignore` rules restored; production JWT/KMS guards | **`server/.env` still tracked with 63 live-shaped keys; values byte-identical to the audit (no rotation); blob persists in git history; IAM blast radius unknown** | **High** |
| **TM-012** | `DeleteObject` added to `VoiceRecordingService.softDelete` | Swallowed failures (empty catch); no S3 deletion in `AccountDeletionService`; session recording S3 objects survive column nulling; no bucket lifecycle in repo | Medium |
| **TM-015** | `phiS3` sets KMS SSE + private ACL for new uploads | Legacy objects and bucket-default posture unverifiable from the repository | Low |
| **TM-021** | PayTabs signature, idempotency, and **invoice** amount/currency enforcement | **Booking** path (`handleBookingWebhook`) performs no amount/currency verification | Medium |
| **TM-019** | Admin credential exposure closed; GPS map access role-gated + audited | Other admin PHI reads still lack purpose-of-use logging | Low |

---

## 16. Findings Still Open

| ID | Severity | Status | Why it is still open |
|---|---|---|---|
| **TM-025** | **High** | **NOT FIXED — reproduced** | Stripe wallet webhook signature remains non-functional (raw-body/path mismatch). Every request, genuine or forged, returns 400. Wallet credit relies solely on the client-driven confirm path. |
| **TM-026** | **High** | **NOT FIXED — reproduced** | Raw payment webhook bodies are still audit-logged as reversible byte maps (audit skip list does not match the `/wallet` mount). Payer name/email/phone persist in `audit_logs`. |
| **TM-002 / TM-029** | **High** | **NOT FIXED** | `content`/`transcript` are not in `SENSITIVE_KEYS`; clinical chat/transcript text remains in audit logs. |
| **TM-003** | Medium-High | **NOT FIXED** | No read-accounting was implemented (HIPAA §164.312(b)). |
| **TM-013** | Info | **NOT FIXED** | Transcript overwrite versioning/hash not implemented (at-rest encryption added instead). |
| **TM-016** | Medium | **NOT FIXED** | Public AI/prompt surfaces unchanged. |
| **TM-017** | Medium | **NOT FIXED** | Room-ID enumeration handling unchanged. |
| **TM-022** | Medium | **NOT FIXED** | GPS retention not enforced (no `retentionExpiresAt` on write; purge has no GPS target). |
| **TM-023** | Medium | **NOT FIXED** | Notification/care-summary lifecycle unification absent. |
| **TM-027** | Medium | **NOT FIXED** | Booking `totalPrice`/`totalAmount` split-brain unchanged. |

---

## 17. Regressed Findings

**None confirmed (0).**

A deliberate search for remediation-induced regressions covered: the security-sensitive diff (94 server files), duplicate/sibling routes, create-vs-update paths, and previously-held controls (§21). No remediation change was found that weakened a previously strong control or introduced a new bypass.

Two *test-suite* execution failures were investigated and classified as **not** regressions:

* `auditUtils.test.ts` fails **identically at the audited baseline** (the redaction logic now correctly redacts `email`, while the test still expects it unredacted — pre-existing test/code drift, unrelated to this remediation wave).
* Seven suites that transitively import the new `EmailService → utils/sanitize.ts → sanitize-html → htmlparser2@12 (ESM)` chain fail under Jest's CJS transformer **only in the verification worktree**, where dependencies were symlinked from a different branch. The remediation lockfile was already `htmlparser2@12` at the audited baseline; `require('sanitize-html')` and `require('htmlparser2')` both succeed under plain Node. This is a Jest transform configuration artifact of the verification environment, not a production break — but it does mean **the project's Jest config should add `transformIgnorePatterns` (or the suite should mock `sanitize-html`) before CI relies on those suites.**

**Adversarial self-review of this verification (applied after drafting).** Four of the verifier's own provisional conclusions were falsified by follow-up review and corrected in this report and the CSV:

| Provisional conclusion | Falsifying evidence | Correction applied |
|---|---|---|
| TM-021 `VERIFIED FIXED` | `handleBookingWebhook` never receives or compares `cart_amount`/`cart_currency` | Downgraded to **PARTIALLY FIXED** (invoice path fixed; booking path open) |
| TM-010 `NO LONGER APPLICABLE` | It is a live governance obligation, not a removed surface | Changed to **NOT FIXED (governance)** |
| TM-013 `NO LONGER APPLICABLE` | No versioning/hash was implemented | Changed to **NOT FIXED** |
| TM-019 `NO LONGER APPLICABLE` | Admin PHI reads beyond GPS still lack purpose logging | Changed to **PARTIALLY FIXED** |

---

## 18. Dynamic Verification Required

| DV ID | Finding | Why static proof is insufficient | Required environment | Exact test | Expected secure result |
|---|---|---|---|---|---|
| DV-01 | AUTH-02 | Concurrent claim timing | Live API + Postgres + Redis | Fire two simultaneous `/api/auth/refresh` with the same R1 | Exactly one set of tokens; the other 401 and the family is revoked |
| DV-02 | AUTH-05 | Live Socket.IO delivery | Server + two socket clients | Log out (and suspend, and reset password) while connected | `disconnect` fired; no event delivered afterwards; revalidation drops stale sockets within 60 s |
| DV-03 | MOB-02 | On-device state teardown | Emulator + test backend | User A logs in → sees PHI → logs out → User B logs in (also offline) | B renders nothing of A's; AsyncStorage has no `RAIYAH_QUERY_CACHE_V1`; draft key absent |
| DV-04 | MOB-03 | Socket teardown on device | Emulator + backend | Log out while a conversation is open | Socket disconnects; no events arrive after logout |
| DV-05 | MOB-05 | Artifact certificate | Built release APK | `apksigner verify --print-certs app-release.apk` | Certificate is **not** `CN=Android Debug`; SHA-256 ≠ the known debug fingerprint |
| DV-06 | MOB-13 / MOB-21 | Merged manifest | Built release APK | `aapt2 dump badging` / `xmltree` | `SYSTEM_ALERT_WINDOW` and external-storage permissions absent; Crop/Preview activities absent |
| DV-07 | MOB-15 | Release build config | Release build log | Inspect for R8/`minifyReleaseWithR8` tasks and a `mapping.txt` | Minification actually ran |
| DV-08 | MOB-19 | Console-side restriction | Google Cloud console | Inspect Maps key application restrictions | Key restricted to the Android package + signing SHA-1 |
| DV-09 | TM-001 | Rotation + IAM blast radius | AWS/IAM + credential consoles | Verify each rotated credential fails at the old value; verify IAM least privilege | Old credentials dead; S3/KMS scoped |
| DV-10 | TM-012 / TM-015 | Bucket-side object lifecycle | S3/KMS console | Confirm deleted objects are gone; confirm SSE-KMS on legacy objects; confirm lifecycle rules | No orphan PHI objects; all objects KMS-encrypted |
| DV-11 | AUTHZ-01 | Bucket ACL truth | S3 console | Attempt to fetch a care-summary object via its raw URL without signing | Denied (private ACL) |
| DV-12 | INJ-03 | Proxy hop topology | Nginx/ALB config | Send spoofed XFF; confirm the trusted hop count | Client IP resolved to the real peer, not the header |
| DV-13 | TM-022 | Retention scheduling | Running scheduler | Create GPS rows; advance past retention; observe purge | GPS rows purged per policy |
| DV-14 | TM-025 | Payment sandbox | Stripe test mode | Send a **signed** test webhook to `/api/wallet/stripe/webhook` | Signature verifies; credit applied (today it 400s — fix first) |

---

## 19. Newly Introduced Security Regressions

**None confirmed.** No `NEW-REG-xx` items were raised.

All new security-sensitive files map cleanly to original findings (see §23). Two items were reviewed for unintended impact and cleared:

* `sanitize.ts` (`sanitize-html`) newly imported by `EmailService` — a dependency that already existed in the lockfile and loads correctly under plain Node; the only consequence is the Jest transform issue noted in §17.
* `queryString`/`parsePagination` rollout across ~16 list controllers — verified to preserve functionality while bounding input (arrays/objects/NaN handled).

---

## 20. Original Audit Coverage Gaps

**COVERAGE-GAP-01 — Phone-OTP delivery via Twilio (new surface).**

*Surface:* `OtpController.send` and `utils/phoneOtp.ts` now deliver SMS OTP via `TwilioSmsService` (new file, +48 lines), replacing the WhatsApp delivery path.
*Why it matters:* This is a new outbound third-party integration handling phone numbers and one-time codes. The original Phase 1E review assessed the *WhatsApp* delivery path and the *WhatsApp webhook*; it did not assess a **telephony provider** (credential storage, message templating, delivery logging, phone-number egress to a third party, per-country SMS-pumping abuse).
*Currently secure?* The implementation reads credentials from env, sends a fixed message shape, and does not log the OTP; `phoneOtp.ts` audits only `{type}`. No obvious flaw was found — but it was never systematically reviewed.
*Owner for future testing:* Phase 1E follow-up (input/egress review) or a dedicated third-party-integration review.

**COVERAGE-GAP-02 — JWT dual-secret rotation window (`*_PREVIOUS`).**

*Surface:* `middleware/auth.ts` now verifies tokens against `JWT_ACCESS_SECRET` and, if present, `JWT_ACCESS_SECRET_PREVIOUS` (same for refresh), explicitly to permit zero-downtime rotation.
*Why it matters:* A second accepted signing/verification secret is a **security-tradeoff surface**. If an old secret is compromised and left in `*_PREVIOUS` beyond the TTL window, it extends the window in which a stolen or forged token is accepted. The original audit assessed single-secret JWT handling only.
*Currently secure?* The mechanism is correctly documented ("clear `*_PREVIOUS` after the access/refresh TTL window"), the `jwtRotation` test proves the window works, and both secrets are still algorithm-pinned. The risk is operational: the window must actually be closed.
*Owner for future testing:* Phase 1C follow-up (auth lifecycle) — verify `*_PREVIOUS` is cleared in production after cutover.

---

## 21. Security Controls Regression Check

Spot-check of controls that previously held:

| Control | Result | Evidence |
|---|---|---|
| JWT algorithm pinning (`HS256` only) | **HELD** | `ACCESS_VERIFY_OPTS` / `REFRESH_VERIFY_OPTS` in `middleware/auth.ts` |
| Access/refresh secret separation | **HELD** | distinct env vars; env guard rejects identical values |
| Refresh token hashing (no plaintext) | **HELD** | `refreshTokenHash` HMAC-SHA256; `findRefreshTokenByPlain` hashes first |
| Cookie flags (`httpOnly`, `secure` in prod, `sameSite: strict`) | **HELD** | `authCookies.accessCookieOptions` |
| Timing-equalized login | **HELD** | bcrypt compare path unchanged; break-glass uses `timingSafeEqual` |
| Server-side tenant checks | **HELD + EXTENDED** | `assertTenantOrgAccess` still present across controllers; more paths now validated |
| Conversation membership (`requireParticipant`) | **HELD** | unchanged; still enforced on join and history |
| Payment/consent server-side gates | **HELD** | PayTabs strengthened; telehealth consent service unchanged |
| React escaping / markdown sanitization | **HELD** | `react-markdown` retained; no `dangerouslySetInnerHTML` additions |
| Path confinement / upload allowlists | **HELD** | file filters retained in document/intake/staff upload controllers |
| Release cleartext default blocked | **HELD** | no `usesCleartextTraffic` in release; no network-security-config relaxation |
| SecureStore token storage (mobile) | **HELD** | access token in SecureStore; refresh via SecureStore; no AsyncStorage token |
| Zod validation coverage | **CHANGED (strengthened)** | `sanitizedString`/`httpUrl` adopted; raw `data: body` sites confirmed Zod-parsed |

---

## 22. Finding Closure Matrix

The authoritative matrix is the companion file **`docx/M5_PHASE1R_FINDING_CLOSURE.csv`** (103 rows).

**Reconciliation:**

```
Original surviving findings:              103
Mapped to closure results:                103
UNMAPPED:                                 0
```

Closure distribution:

| Closure | Count |
|---|---:|
| VERIFIED FIXED | 71 |
| DYNAMIC RETEST REQUIRED | 6 |
| NO LONGER APPLICABLE | 13 |
| PARTIALLY FIXED | 3 |
| NOT FIXED | 10 |
| **Total** | **103** |

---

## 23. Remediation Commit Mapping

Commit messages were used only to *locate* changes; every closure above rests on code evidence.

| Commit | Files | Likely finding(s) addressed | Verification result |
|---|---|---|---|
| `7180700` | client landing components | none (styling refactor) | No security impact; reviewed for unmapped change — none |
| `43ebc6d` | server auth/authz cluster | AUTH-01…26, AUTHZ-01…15 | Most closures hold (see matrix) |
| `7497517` | server input/injection | INJ-01…12 | All twelve verified fixed (42/42 independent assertions) |
| `1492e8e` | docs (audit copies) | none | No security impact |
| `ae67c20` | mobile + android | MOB-01…21 | Source fixed; 5 require device/artifact retest |

**Security-sensitive files with no Phase-1 finding explaining them:** none — every new middleware/util traces to a specific finding (e.g. `clientIp.ts` → INJ-03/D-02; `whatsappSignature.ts` → INJ-10; `mfaPending.ts`/`pendingTotp.ts`/`totpReplay.ts` → AUTH-03/10/11; `sessionCleanup.ts`/`telehealthSession.ts` → MOB-02/03/08/16; `signedUrlPolicy.ts` → AUTHZ-08; `sanitizeUser.ts` → AUTH-04). The only genuinely new *surface* is the Twilio SMS path (COVERAGE-GAP-01).

---

## 24. Dynamic Retest Backlog

See §18 (DV-01…DV-14). Priority order: DV-05/DV-06/DV-07 (release artifact), DV-03/DV-04 (device logout/socket), DV-01/DV-02 (server session/socket integrity), DV-11 (care-summary ACL), DV-14 (Stripe after fix), DV-09/DV-10 (infra secrets/objects), DV-08/DV-12/DV-13 (console/proxy/retention).

---

## 25. Security Regression Suite

Permanent regression tests proposed for each Critical/High fix:

| Regression ID | Finding | Automated/manual | Test |
|---|---|---|---|
| REG-AUTH-01 | AUTH-01 | Automated (integration) | Two logins → list sessions → revoke the other device → that device's refresh returns 401 |
| REG-AUTH-02 | AUTH-02 | Automated (integration) | Two concurrent refreshes with the same token → exactly one succeeds; replay revokes the family |
| REG-AUTH-03 | AUTH-03 | Automated (integration) | Enable 2FA with a wrong password → 401; replace without current TOTP → 422; verify promotes only the staged secret |
| REG-AUTH-04 | AUTH-04 | Automated (integration) | `PATCH /admin/users/:id` with `passwordHash`/`twoFactorSecret`/`role` → 422; `GET` body contains no credential fields |
| REG-AUTH-05 | AUTH-05 | Manual + scripted | Socket connected → logout → assert disconnect and zero subsequent events |
| REG-INJ-01 | INJ-01 | Automated (unit — exists) | Field beginning with `=`/`+`/`-`/`@`/TAB/CR (incl. leading whitespace) cannot execute as a formula |
| REG-INJ-02 | INJ-02 | Automated (unit) | Booking and user exports encode every cell |
| REG-INJ-03 | INJ-04 | Automated (unit — exists) | `?status[not]=x` yields no operator object; extended `qs` contrast documented |
| REG-INJ-04 | INJ-05 | Automated (unit — exists) | `limit=1000000` clamps to ≤ 100 |
| REG-AUTHZ-01 | AUTHZ-02 | Automated (integration) | Agency A assigning Org B's booking/shift → 403 |
| REG-AUTHZ-02 | AUTHZ-01 | Automated (integration) | Care-summary GET returns a short-lived signed URL; raw URL without signing is denied |
| REG-MOB-01 | MOB-02 | Manual (scripted, emulator) | A→logout→B offline: no A data rendered; storage keys absent |
| REG-MOB-02 | MOB-05 | CI gate | `apksigner verify --print-certs` asserts the release certificate ≠ debug identity |
| REG-SEC-01 | TM-001 | CI gate | Fail the build if `server/.env` or any `.env` (except `.env.example`) is tracked |
| REG-PAY-01 | TM-025 | Automated (sandbox) | Signed Stripe test webhook verifies and credits exactly once |
| REG-PAY-02 | TM-026 | Automated (integration) | Payment webhook requests produce no audit row containing a byte-map body |

---

## 26. Closure Metrics

```
Original surviving findings:              103
Eligible for closure*:                     93   (excl. 10 NO LONGER APPLICABLE)
Verified fixed:                            70
Partially fixed:                            5
Not fixed:                                 12
Regressed:                                  0
Dynamic retest required:                    6
No longer applicable (excluded):           10

Closure percentage = 70 / 93 = 75.3%

Original release blockers:                 16
Verified-fixed blockers:                   10
Partial blockers:                           1   (TM-001)
Dynamic-pending blockers:                   5   (AUTH-02, AUTH-05, MOB-02, MOB-03, MOB-05)
Release-gating High findings (non-blocker): 3   (TM-021 booking path, TM-025, TM-026)
```

\* Per the phase rules, `DYNAMIC RETEST REQUIRED` findings are **not** counted as fixed, and `NO LONGER APPLICABLE` findings are excluded from the denominator.

**Engineering remediation progress** (delivered work) and **security verification closure** (proven properties) are reported separately because they differ materially: the team's tracker marks ~100% "done"; independent verification confirms **75.3%** closed, with **12 findings still open (2 High reproduced live)** and **6 awaiting dynamic proof**.

---

## 27. Remaining Release Blockers

**Blocker arithmetic.** Of the 16 original release-blocker IDs: **10 verified fixed**, **1 partially fixed** (TM-001), **5 dynamic-pending** (AUTH-02, AUTH-05, MOB-02, MOB-03, MOB-05). Separately, three High-risk findings that were not formal blocker IDs also gate release: **TM-021** (booking path), **TM-025**, **TM-026**.

**B1. TM-001 — Production-shaped credentials still committed (High) — original blocker, PARTIAL.**
`server/.env` remains tracked with 63 keys including JWT secrets, AWS credentials, Stripe, PayTabs, LiveKit, Twilio, and SMTP. Values are byte-identical to the audited snapshot, so **no rotation has occurred**; the blob persists in git history. *Residual risk:* repository-history readers retain working credentials → potential mass PHI and financial compromise. *Required:* untrack + history purge + rotate every credential + verify IAM least privilege.

**B2. TM-025 — Stripe wallet webhook signature non-functional (High, reproduced) — release-gating.**
Raw-body parser and handler mount paths still disagree, so `constructEvent` always throws and the endpoint 400s for every request. *Residual risk:* wallet top-up credit depends solely on the client-driven confirm path — a financial-integrity defect (fails closed on security, but the control is dead). *Required:* register `express.raw` at the real mount or read the raw buffer, then sandbox-verify.

**B3. TM-026 — Payment webhook bodies audit-logged as byte maps (High, reproduced) — release-gating.**

**B4. TM-021 — PayTabs booking fulfilment lacks amount/currency verification (High) — release-gating.** The invoice branch is fixed, but `handleBookingWebhook` writes `payment.amount = booking.totalPrice ?? 0` without comparing `cart_amount`/`cart_currency`. *Required:* pass and verify both fields before marking a booking paid.
The audit skip list does not match the `/wallet` mount, so raw payloads — including payer name/email/phone — persist reversibly in `audit_logs`. *Residual risk:* secondary PII store outside retention/consent controls. *Required:* fix the skip-path matching (or audit-payload redaction for Buffers).

---

## 28. Production Readiness Decision

```
NOT READY FOR PRODUCTION
```

Rationale (per the phase rules):

* **TM-001 remains PARTIALLY FIXED** — a release-blocker-grade credential exposure with unrotated secrets and unverified blast radius.
* **TM-025 and TM-026 remain NOT FIXED** — both reproduced live; both are High-severity payment-integrity and PII concerns introduced by (or persisting from) the pre-remediation baseline.
* No new Critical/High remediation regression exists, and the majority of specialist Phase-1 findings are genuinely closed — but a single open High blocker is sufficient to withhold release under the phase's own rules.

The team's remediation quality is nonetheless **substantively good**: the auth/session, authorization/tenant, injection, and mobile workstreams are real root-cause fixes, not cosmetics. Ten of sixteen blockers are verified closed; five of the six remaining dynamic items have source that reads correct.

---

## 29. Recommended Next Actions

**Before release (blocking):**

1. **Rotate everything in `server/.env` and untrack it** (and `server/.env.test`); purge history or accept and document the residual; verify IAM scope. Owner: infra + dev.
2. **Fix TM-025**: make the Stripe raw body actually reachable at `/api/wallet/stripe/webhook`; add a sandbox regression (REG-PAY-01).
3. **Fix TM-026**: correct audit skip-path matching for the `/wallet` mounts (or redact Buffer payloads); add REG-PAY-02.

**Immediately after (High):**

4. **TM-002/TM-029**: add `content`/`transcript` (and Buffer handling) to audit redaction; verify no clinical text persists.
5. **TM-003**: implement read-accounting for notes/documents/recordings (HIPAA §164.312(b)).
6. **TM-021 (booking branch)**: pass and verify `cart_amount`/`cart_currency` in `handleBookingWebhook` before marking a booking paid.

**Dynamic closure of source-correct items:**

6. Execute DV-01…DV-14, prioritising the release artifact (DV-05/06/07) and the device logout/socket pair (DV-03/04) so MOB-02/03/05 and AUTH-02/05 can be closed properly.

**Hardening / hygiene:**

7. TM-012 (S3 deletion without swallowed failures + `AccountDeletionService` coverage), TM-015 (legacy object encryption), TM-022 (GPS retention on write), TM-016/TM-017/TM-023/TM-027.
8. Address COVERAGE-GAP-01 (Twilio SMS egress) and COVERAGE-GAP-02 (`*_PREVIOUS` rotation-window discipline).
9. Add `transformIgnorePatterns` (or mock `sanitize-html`) so the Jest suites that now transitively import it run in CI.
10. Correct the team's tracker: TM-001 is **not** "✅ Done"; TM-025/TM-026 are unaddressed.

---

## 30. Conclusion

For every Phase-1 security finding, this verification answers the phase's completion question:

* **What changed to achieve the fix?** The remediation wave (5 commits, 188 files) genuinely rewrote the vulnerable boundaries: refresh rotation is now an atomic family-based claim; 2FA replacement is staged and re-authenticated; admin user APIs are projected and allowlisted; CSV output is centrally encoded on both the write and read edges; care-summary PHI is private and short-lived; agency assignment validates tenant ownership; the mobile client purges its local session, socket, media, and caches.
* **What bypasses were attempted?** Sibling and alternate paths were enumerated for every High finding — create vs update (`updateAssignment` restricted to status/notes), list vs detail (both projected), web vs mobile (both flows), duplicate mounts (audit skip mismatch **found**), quoted-vs-encoded CSV (independent 42-assertion harness), lookalike S3 hosts (anchored now).
* **Which findings remain partially or fully open?** Seventeen: **TM-001, TM-012, TM-015, TM-019, TM-021** (partial) and **TM-002/TM-029, TM-003, TM-010, TM-013, TM-016, TM-017, TM-022, TM-023, TM-027, TM-025, TM-026** (not fixed; TM-025/TM-026 reproduced live).
* **What still requires runtime/infrastructure verification?** Six items — refresh-race concurrency, socket revocation on both server and device, cross-user device logout, release-signing certificate, and the secret/object/IAM infrastructure checks.
* **Did remediation introduce any new regression or expose a gap?** No new regression was confirmed; two coverage gaps were identified (Twilio SMS surface; JWT previous-secret rotation window). Two pre-existing payment/webhook defects (TM-025/TM-026) were **reproduced as still broken** and are the most concerning findings in this phase because both touch money and payer data.

```
Phase 1R Remediation Verification Verdict:
NOT READY FOR PRODUCTION

Current milestone-5 SHA:
ae67c207bd5ee5aabecf3bca2aefbbedc807c1e2

Original findings reviewed:
103

Verified fixed:
70

Partially fixed:
5

Still open:
12

Regressed:
0

Dynamic verification required:
6

Original release blockers remaining:
1 partial (TM-001) + 5 dynamic-pending (AUTH-02, AUTH-05, MOB-02, MOB-03, MOB-05);
plus 3 release-gating High findings (TM-021 booking path, TM-025, TM-026)

New remediation regressions:
0

Audit coverage gaps:
2 (COVERAGE-GAP-01 Twilio SMS surface; COVERAGE-GAP-02 JWT previous-secret window)

Recommended next action:
Rotate + untrack server/.env, then fix the two reproduced payment defects (TM-025, TM-026),
then execute the dynamic backlog to close the six source-correct items.
```

*Verification complete. No remediation was performed. Source, configuration, schemas, migrations, and credentials were not modified; no secrets were disclosed.*
