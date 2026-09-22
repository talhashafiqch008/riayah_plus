# Milestone 5 — Phase 1C + 1D + 1E + 1F Audit Remediation Tracker

**Created:** 2026-09-17  
**Sources of truth (audits):**
- `audits/M5_PHASE1C_AUTH_SESSION_SECURITY.md` (Auth & Session)
- `audits/M5_PHASE1D_AUTHORIZATION_TENANT_SECURITY.md` (AuthZ / RBAC / IDOR / Tenant)
- `audits/M5_PHASE1E_INPUT_INJECTION_XSS_SSRF_SECURITY.md` (Input validation / Injection / XSS / SSRF)
- `audits/M5_PHASE1F_MOBILE_CLIENT_APPLICATION_HARDENING.md` (Mobile & Client Application Hardening)
**Auditor:** Karim Ashraf, Cyber Security Engineer  
**Audit date:** 2026-09-12 (1C–1F); 1F-V artifact validation 2026-09-12  
**Audit target:** `milestone-5-fetched` @ `72c6258b5d665bab7d96a46681eb24e30073c1b0`  
**Codebase:** `mern/server` + `mern/client` + `mern/mobile`  
**Overall status:** ✅ **1C/1D/1E complete** · ✅ **1F code done** · ⏸ **Live secret rotation + release signing keys still ops**  
**Last updated:** 2026-09-22  
**Rule:** Check tasks off here as you fix and verify them. Use the audit markdown for *why*; use **this file** for *what to do next*.

---

## How to use this tracker

1. Work **P0 → P1 → P2 → P3** unless marked **∥ Parallel**.  
2. Do **not** mark a phase’s remediation complete until all its **P0** items are 🧪 Verified.  
3. Update **Status**: `⬜ Todo` → `🟡 Doing` → `✅ Done` → `🧪 Verified`.  
4. Link PRs/commits in **Notes** when closing a finding.  
5. Re-run the audit’s Retest procedure after each fix.

| Status | Meaning |
|---|---|
| ⬜ Todo | Not started |
| 🟡 Doing | Fix in progress |
| ✅ Done | Code/docs complete |
| 🧪 Verified | Adversarial or scripted verification passed |
| ⏸ Blocked | Needs infra / Legal / product decision |
| ❌ Won’t fix | Explicit product accept-risk (document why) |

---

## Scorecard

| Phase | Dimension | High | Med-High | Medium | Low / Info | Total |
|---|---|---:|---:|---:|---:|---:|
| **1C** | Auth & Session | 5 | 0 | 12 | 9 | **26** |
| **1D** | AuthZ / Tenant | 2 | 1 | 5 | 7 | **15** |
| **1E** | Input / Injection / XSS / SSRF | 1 | 0 | 5 | 6 | **12** |
| **1F** | Mobile / Client Hardening | 3 | 0 | 5 | 13 | **21** |
| | **Combined** | **11** | **1** | **27** | **35** | **74** |

### Release blockers (must fix before production)

| ID | Severity | One-line | Status |
|---|---|---|---|
| **AUTH-01** | High | Per-device session revoke uses wrong ID table → always 404 | ✅ Done |
| **AUTH-03** | High | 2FA enrollment can be silently replaced without re-auth | ✅ Done |
| **AUTH-04** | High | Admin mass-assignment can disable 2FA / rewrite credentials | ✅ Done |
| **AUTH-05** | High | Socket.IO sessions survive logout / reset / suspend | ✅ Done |
| **AUTHZ-01** | High | Care-summary PDF served from permanent public S3 URL | ✅ Done |
| **AUTHZ-02** | High | Agency staffing assign accepts any tenant’s booking/shift | ✅ Done |
| **INJ-01** | High | Unauthenticated formula injection into admin audit-log CSV | 🧪 Verified |
| **MOB-02** | High | Logout does not clear caches → cross-user PHI on shared device | ✅ Done |
| **MOB-03** | High | Realtime socket survives logout (`releaseRealtimeSocket` dead) | ✅ Done |
| **MOB-05** | High | Release APK signed with public Android debug key | ✅ Done (needs upload keystore in CI/EAS) |

---

## Progress snapshot

| Wave | Focus | Open | Status |
|---|---|---:|---|
| **1C/1D P0** | Release blockers (AUTH-01/03/04/05 + AUTHZ-01/02) | **0** | ✅ Code done — verify next |
| **1C/1D P1** | Before production (auth lifecycle + authz gates) | **0** | ✅ Code done — verify next |
| **1C/1D P2** | Hardening | **0** | ✅ Code done — verify next |
| **1C/1D P3** | Architecture / polish | **0** | ✅ Code done — verify next |
| **1E P0** | CSV formula injection (INJ-01) | **0** | 🧪 Verified (unit retest) |
| **1E P1** | CSV / IP export path (INJ-02/03) | **0** | 🧪 Verified (unit + XFF sanitize middleware) |
| **1E P2** | Prisma operators, pagination, WhatsApp sig (INJ-04/05/10) | **0** | 🧪 Verified (D-01/D-03 scripted) |
| **1E P3** | URL schemes, email/HTML, sanitization consistency (INJ-06–09/11/12) | **0** | 🧪 Verified (unit) |
| **1F P1** | Mobile release blockers (MOB-02/03/05) | **0** | ✅ Code done — device retest next |
| **1F P2** | Storage / GPS / 401 / screenshots / media (MOB-01/06/07/08/10) | **0** | ✅ Code done — device retest next |
| **1F P3** | Tokens, env, guards, WebView, R8, telehealth teardown | **0** | ✅ Code done — ops/infra items remain |

---

## Phase 1E — What this audit is about (brief)

**Scope:** Can attacker-controlled input be interpreted as code, query logic, HTML/JS, network destination, filesystem path, shell, template, spreadsheet formula, or structured abuse?

**Headline result:** Input posture is **strong overall** — **no SQLi, no stored/reflected/DOM XSS, no SSRF to private ranges, no OS command injection, no path traversal, no SSTI, no reachable prototype pollution**. The one high-value class is **CSV / spreadsheet formula injection**, including an **unauthenticated** path that writes attacker-shaped values into audit logs which admins later export.

**Confirmed dangerous path (INJ-01):**
```
Unauthenticated POST/PUT/PATCH/DELETE to any /api path
  → auditMiddleware stores entity/entityId from the request path
  → admin GET /api/admin/audit-logs/export (CSV)
  → spreadsheet may execute =HYPERLINK(...) / formula cells
```

---

# Phase 1E — Input / Injection / XSS / SSRF

## 1E P0 — Release blocker

| ID | Finding | Severity | Owner files (audit) | Status | Notes |
|---|---|---|---|---|---|
| **INJ-01** | Unauthenticated formula injection into admin audit-log CSV (`entity`/`entityId` from raw path) | High | `auditMiddleware.ts`; `AuditService.logHttpMutation`; `admin.routes` `/audit-logs/export` | 🧪 Verified | `injPhase1eRetest` + `csvSafe` tests |

## 1E P1 — Before production

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **INJ-02** | Formula injection from user fields in booking/user CSV exports | Medium | 🧪 Verified | `encodeCsvRecord` + `csvSafe` tests |
| **INJ-03** | Audit IP column stores raw `X-Forwarded-For`; exported unescaped | Medium | 🧪 Verified | `sanitizeClientIp` + XFF sanitize middleware + nginx overwrite; hop count still env-specific |

## 1E P2 — Hardening

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **INJ-04** | Prisma query-operator injection via extended `qs` (`?status[not]=…`) | Medium (LIKELY) | 🧪 Verified | Simple parser + `queryString`; D-01 retest proves bracket keys stay flat |
| **INJ-05** | Unbounded pagination `take` on ~16 list endpoints (incl. public marketplace/courses) | Medium | 🧪 Verified | `parsePagination` `MAX_TAKE=100`; D-03 unit clamp proven (optional staging load doc) |
| **INJ-10** | WhatsApp webhook has no signature verification; forged payloads create records | Medium | 🧪 Verified | HMAC unit tests (missing → 401; valid → accept) |

## 1E P3 — Architecture / polish

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **INJ-06** | `z.string().url()` accepts `javascript:`/`data:` etc. on avatar | Low | 🧪 Verified | `avatarUrlSchema` / `httpUrl` |
| **INJ-07** | HTML injection into transactional emails via unsanitized names | Low | 🧪 Verified | `escapeHtml()` on EmailService + billing/telehealth templates |
| **INJ-08** | Chat message **edit** stores unsanitized content (send is sanitized) | Low | 🧪 Verified | `sanitizedString` on `editMessage` |
| **INJ-09** | AI-generated care-plan text stored with type-only validation | Low | 🧪 Verified | AI draft schemas sanitized |
| **INJ-11** | `updateProfile` name unsanitized (inconsistent with registration) | Info | 🧪 Verified | `sanitizedString` on profile + org names |
| **INJ-12** | Recording-key extraction uses substring host check | Info | 🧪 Verified | Anchored S3 host; unit test rejects lookalikes |

### Phase 1E — explicitly cleared (no ticket)

SQL injection · stored/reflected/DOM XSS · SSRF · OS command injection · path traversal · SSTI · prototype pollution · open redirect · CRLF/header injection · unsafe PDF generation · ReDoS

### Phase 1E — dynamic retest backlog (from audit §35.1)

| # | Finding | Need | Status | Notes |
|---|---|---|---|---|
| D-01 | INJ-04 | Confirm operator broadening unreachable | 🧪 Verified | Simple parser; `injPhase1eRetest` contrasts extended qs vs production |
| D-02 | INJ-03 | Confirm Nginx/ALB XFF + `TRUST_PROXY_HOPS` topology | 🧪 App-verified | XFF sanitize + rate-limit IP + nginx `$remote_addr`; confirm hops in each env (`TRUST_PROXY_TOPOLOGY.md`) |
| D-03 | INJ-05 | Load/staging measure of large `limit` amplification | 🧪 Code-verified | Unit clamp proven; optional staging: `docx/ops/PAGINATION_LOAD_CHECK.md` |

---

# Phase 1F — Mobile & Client Application Hardening

## 1F — What this audit is about (brief)

**Scope:** If an attacker controls, steals, roots, debugs, backs up, instruments, repackages, proxies, or shares a device running Riayah Plus, what credentials, PHI, privileges, communications, location evidence, or trusted behaviour can they obtain beyond what the platform intends?

**Headline:** Backend remains the authority (good), but the **mobile local-data lifecycle is not production-ready**. Three **release blockers**: cross-user PHI after logout (MOB-02), release signed with the **public debug key** (MOB-05, runtime-confirmed), realtime socket survives logout (MOB-03). Stolen-device path yields onboarding PII draft + cache-dir media without the app password.

**App:** `com.raiyahplus.app` — Expo SDK 54 / RN 0.81.5, Android-only committed native project.

## 1F P1 — Release blockers

| ID | Finding | Severity | Owner files (audit) | Status | Notes |
|---|---|---|---|---|---|
| **MOB-02** | Logout does not clear TanStack/Zustand/nav → cross-user PHI on shared device | High | `stores/authStore.ts:logout`; `lib/query/client.ts` | ✅ Done | `purgeLocalSession()` clears query cache + `RAIYAH_QUERY_CACHE_V1`, drafts, shift, socket |
| **MOB-05** | Release build signed with public AOSP debug keystore | High | `android/app/build.gradle`; committed `debug.keystore` | ✅ Done | Release no longer uses debug signing; requires `RAIYAH_UPLOAD_*` / EAS (`docx/ops/MOBILE_RELEASE_SIGNING.md`) |
| **MOB-03** | Realtime socket survives logout (`releaseRealtimeSocket` never called) | High | `lib/realtime.ts`; `authStore.logout` | ✅ Done | `releaseRealtimeSocket()` in `purgeLocalSession` |

## 1F P2 — Before production

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **MOB-01** | PHI/PII in plaintext AsyncStorage (onboarding draft today; query cache latent) | Medium | ✅ Done | Draft cleared on logout; PHI query keys no longer dehydrated |
| **MOB-06** | GPS attendance client-supplied, un-attested; server accepts out-of-radius | Medium | ✅ Done | Server rejects out-of-radius (422); client mock-location gate + accuracy; `GPS_ALLOW_OUT_OF_RADIUS` escape hatch |
| **MOB-10** | No 401 handling / no refresh → stale cached data after expiry | Medium | ✅ Done | Failed refresh → `hardSessionReset()` purge + login redirect |
| **MOB-07** | PHI screens unprotected vs screenshots / recent apps / recording | Medium | ✅ Done | `expo-screen-capture` + app-switcher overlay on telehealth / voice / care plans |
| **MOB-08** | PHI media/docs persist in `cacheDirectory` and are shared externally | Medium | ✅ Done | Temp delete after upload/view/share + logout sweep; invoice share warning |

## 1F P3 — Hardening / polish

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **MOB-09** | Push device token not revoked on logout/switch | Low (Med once push ships) | ✅ Done | `revokePushToken()` before logout |
| **MOB-11** | Committed `mobile/.env` has LAN HTTP API URL + Maps key | Low | ✅ Done | `.env` gitignored + untracked; `.env.example` added |
| **MOB-12** | Deep-link scheme without group-level auth guards | Low | ✅ Done | `RequireAuth` on family/clinical/support/coord/org/admin/onboarding |
| **MOB-13** | Over-broad release permissions | Low | ✅ Done | `tools:node="remove"` for SYSTEM_ALERT_WINDOW + external storage |
| **MOB-14** | LiveKit WebView `originWhitelist:['*']` / mixed content | Low | ✅ Done | Restricted origins; `mixedContentMode=never` |
| **MOB-15** | Release minify/R8 disabled; no integrity/attestation | Low | ✅ Done | R8 + shrink enabled in `gradle.properties` (Play Integrity still optional) |
| **MOB-16** | No explicit telehealth teardown on logout/token-expiry | Info | ✅ Done | `registerTelehealthSession` + logout teardown |

### Phase 1F — informational / cleared (no P0–P2 ticket)

| ID | Notes | Status |
|---|---|---|
| **MOB-04** | Backup AsyncStorage claim **RUNTIME-FALSIFIED** (artifact): `database` domain not in allowlist | ❌ Won’t fix (optional `allowBackup=false` defence-in-depth) |
| **MOB-17** | No root/hook/emulator detection | Info — optional resilience |
| **MOB-18** | LiveKit patch is non-security FGS race fix | Info |
| **MOB-19** | Maps key restriction status unknown | ⏸ Blocked (infra — Google Cloud) |
| **MOB-20** | OTA updates not configured | Info |
| **MOB-21** | Extra exported library components (PreviewActivity, CropImage…) | ✅ Done — crop activities stripped via `tools:node="remove"` |

### Phase 1F — dynamic / infra retest backlog (audit §43 / §46)

| # | Finding | Need | Status |
|---|---|---|---|
| M-01 | MOB-02/03 | Emulator + backend: A→logout→B offline + socket closed | ⬜ Todo |
| M-02 | MOB-05 | `apksigner verify --print-certs` on release → non-debug cert | ⬜ Todo |
| M-03 | MOB-04 | After Expo upgrades, re-decode APK backup XMLs (`database` still excluded) | ⬜ Todo |
| M-04 | MOB-19 | Confirm Maps key package + SHA-1 restrictions in Google Cloud | ⏸ Blocked (infra) |
| M-05 | MOB-08 | Inspect merged FileProvider / `file_paths.xml` scope | ⬜ Todo |
| M-06 | MOB-05 | Confirm Play App Signing on production distribution | ⏸ Blocked (infra) |

---

# Phase 1C + 1D (prior) — Authentication / Authorization

## P0 — Release blockers

### Phase 1C — Authentication

| ID | Finding | Owner files (audit) | Status | Notes |
|---|---|---|---|---|
| **AUTH-01** | Per-device session revocation is a non-functional control (`UserSession.id` listed, `RefreshToken.id` revoked) | `AuthController.listSessions`, `AuthController.revokeSession`; UI `SecurityPage` | ✅ Done | Always list/revoke `RefreshToken.id`; `current` flag fixed; AUTH-26 UX fixed as side effect |
| **AUTH-03** | 2FA enrollment can be silently replaced without re-auth | `POST /api/2fa/enable`, `verify2faSetup` | ✅ Done | Pending secret in Redis; password (+ TOTP if already enabled) required; live secret unchanged until verify |
| **AUTH-04** | Admin mass-assignment + over-broad projection expose/mutate auth fields | `PATCH/GET /api/admin/users/:id`; `/me` | ✅ Done | `ADMIN_USER_SELECT` + whitelist; forbidden fields → 422; `/me` sanitized |
| **AUTH-05** | Realtime sessions outlive all revocation events | Socket.IO handshake; logout / logout-all / reset / change / suspend | ✅ Done | `disconnectUserSockets`; 60s revalidation; join_conversation rechecks; wired into logout/reset/password/suspend/deletion |

### Phase 1D — Authorization

| ID | Finding | Owner files (audit) | Status | Notes |
|---|---|---|---|---|
| **AUTHZ-01** | Care-summary PDF is a permanent unauthenticated S3 URL | `GET /episodes/:id/summary-pdf`; `CareSummaryPDFService` | ✅ Done | phiS3 private upload; store key; 300s signed URL on read; legacy URL→key parse |
| **AUTHZ-02** | Agency staffing assignments accept any tenant’s booking/shift | `StaffController.assign` | ✅ Done | Booking must be agency client/provider; shift worker same org or agency user |

---

## P1 — Before production

### Phase 1C

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **AUTH-02** | Refresh rotation racy; no reuse / family detection | High | ✅ Done | Atomic `updateMany` claim + `familyId` revoke on reuse |
| **AUTH-06** | TOTP `code` written to audit logs (setup/failure paths) | Medium→Low | ✅ Done | `code`/`totp` in `SENSITIVE_KEYS` |
| **AUTH-07** | `logout-all` fails open when Redis is down | Medium | ✅ Done | DB `tokensInvalidBefore` watermark; Redis cache; fail closed |
| **AUTH-08** | Refresh token returned in login/refresh JSON body | Medium | ✅ Done | Cookie-only; optional `x-refresh-token` header for mobile |
| **AUTH-12** | Suspension does not revoke credentials; refresh still issues | Medium | ✅ Done | Revoke on admin/org deactivate; `isActive` gate in refresh |
| **AUTH-14** | Auth security events under-audited | Medium | ✅ Done | `login_failed`, `2fa_failed/enabled/disabled`, `logout_all`, `session_revoked`, `otp_*`, `password_reset_requested` |
| **AUTH-25** | OTP-login path skips account-state + MFA checks | Medium (if flag on) | ✅ Done | `isActive` + 2FA challenge before issuing tokens |

### Phase 1D

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **AUTHZ-03** | Intra-org clinician over-read on clinical notes | Med-High | ✅ Done | Care-relationship gate (coordinator / session provider / assessor / author / admin) |
| **AUTHZ-07** | Admin CSV exports platform-wide, no tenant filter | Medium | ✅ Done | Cap 1000; optional `organizationId`/`role` filters |
| **AUTHZ-15** | No export-specific audit events | Low | ✅ Done | `admin_export_bookings` / `admin_export_users` |
| **AUTHZ-06** | Dual telehealth join paths enforce different rules | Medium | ✅ Done | Meeting join uses `meetingAccessRow` + episode org |
| **AUTHZ-05** | Voice-recording `sessionId`/`meetingId` unvalidated FKs | Medium | ✅ Done | Validate existence + patient/actor relationship |

---

## P2 — Hardening

### Phase 1C

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **AUTH-09** | Concurrent OTP send → multiple valid codes | Medium | ✅ Done | `@@unique([identifier, type])` + upsert |
| **AUTH-10** | TOTP replayable within window | Medium | ✅ Done | `lastTotpStep` + `verifyTotpNoReplay` |
| **AUTH-11** | `verify2faLogin` trusts client-supplied user id | Medium | ✅ Done | Signed `mfaPendingToken` (≤5m, single-use) |
| **AUTH-13** | Role/org claims stale until access-token expiry | Medium | ✅ Done | Fresh role/email from DB each request (30s cache) |
| **AUTH-17** | Session revoke + refresh endpoints unrated / IP-keyed only | Medium | ✅ Done | Composite IP+identifier keys; `refreshLimiter` |
| **AUTH-16** | Mobile has no refresh flow / no 401 handling | Medium | ✅ Done | SecureStore refresh + `X-Client: mobile` header + 401 interceptor |
| **AUTH-21** | Refresh-token metadata stored but not enforced | Low | ❌ Won’t fix | Forensic-only by design (documented in `refreshTokenStore`) |

### Phase 1D

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **AUTHZ-08** | Admin signed-URL paths bypass all prefix checks | Low-Med | ✅ Done | Allowlist `documents/`+`intake/`; TTL clamp; audit |
| **AUTHZ-04** | `GET /documents/statistics` shadowed by `/:id` | Medium | ✅ Done | Mount `documentsRoutes` before `documentRoutes` |
| **AUTHZ-09** | Care-plan list scope narrower than detail | Low | ✅ Done | List uses patientId ∨ careUnit.familyUserId |
| **AUTHZ-12** | Family care-unit access may over-read recipients | Low (LIKELY) | ❌ Won’t fix | Household model: account holder sees all unit recipients |

---

## P3 — Architecture / polish

### Phase 1C

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **AUTH-24** | No `iss`/`aud`/`sub`/`typ` on JWTs | Info | ✅ Done | Access/refresh carry iss/aud/sub/typ; verify enforces |
| **AUTH-19** | OTP keyspace below NIST guidance | Low | ✅ Done | `randomInt(0,1e6)` + `padStart(6,'0')` (~20 bits) |
| **AUTH-23** | Reset token retained in browser URL | Low | ✅ Done | Capture then `history.replaceState` scrub |
| **AUTH-18** | Access tokens remain valid after single logout | Low | ❌ Won’t fix | Stateless JWT tradeoff; 15m TTL (logout-all still watermarks) |
| **AUTH-20** | `__Host-` prefixes absent in non-production | Info | ❌ Won’t fix | Intentional for local HTTP; prod uses `__Host-` |
| **AUTH-22** | Soft-deleted users’ tokens/sockets survive | Low | ✅ Done | Soft-delete revokes refresh + watermark + sockets |
| **AUTH-15** | Admin break-glass login passwordless / MFA-free | Med (flag) | ✅ Done | Timing-safe secret; bound `ADMIN_BREAK_GLASS_USER_ID`; loginLimiter |
| **AUTH-26** | Session-revocation UI shows error but leaves device listed | Low (UX) | ✅ Done | Fixed as part of AUTH-01 |

### Phase 1D

| ID | Finding | Severity | Status | Notes |
|---|---|---|---|---|
| **AUTHZ-10** | Route vs controller authZ layering inconsistent | Info | ❌ Won’t fix | Documented inconsistency; all paths guarded (product cleanup later) |
| **AUTHZ-11** | Coordinator scope inconsistent across surfaces | Info | ❌ Won’t fix | Product decision (assignment vs org-wide) |
| **AUTHZ-13** | Platform admins excluded from GPS map endpoints | Info | ✅ Done | Admins in `MAP_ROLES` + purpose audit on map access |
| **AUTHZ-14** | Marketplace public read exposes provider detail | Info | ✅ Done | Public offer detail selects name/rating/bio only |

### Infra carry-over (from Phase 1C §29 P0)

| Item | Status | Notes |
|---|---|---|
| Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_SECRET` | 🟡 App-ready | Dual-secret verify + `npm run secrets:generate`; **ops must set live values** — `docx/ops/SECRET_ROTATION.md` |
| Remove `.env` from tracking; add ignore rules | ✅ Done | `mern/server/.gitignore` includes `.env`; root already ignored |

---

## Working log

| Date | IDs | What changed | Commit / PR |
|---|---|---|---|
| 2026-09-17 | — | Tracker created; audits copied to `audits/` | — |
| 2026-09-17 | AUTH-01 | `listSessions` always returns RefreshToken IDs; revoke matches; `current` flag works | — |
| 2026-09-17 | AUTH-03 | Staged TOTP in Redis; password (+ current TOTP on replace) required; client SecurityPage updated | — |
| 2026-09-17 | AUTH-04 | Admin user GET/PATCH whitelist + sanitize; `/me` strips secrets | — |
| 2026-09-17 | AUTH-05 | `disconnectUserSockets` + 60s revalidation; hooked to logout/reset/password/suspend/delete | — |
| 2026-09-17 | AUTHZ-01 | Care summary uses phiS3 + key storage + 300s signed download URL | — |
| 2026-09-17 | AUTHZ-02 | Agency assign validates booking/shift tenant ownership | — |
| 2026-09-17 | AUTH-02/07 | `familyId` + atomic claim; `tokensInvalidBefore` DB watermark | — |
| 2026-09-17 | AUTH-06/08/12/14/25 | Redact TOTP; cookie-only refresh; suspend revoke; audits; OTP gates | — |
| 2026-09-17 | AUTHZ-03/05/06/07/15 | Clinical care-relationship; voice FKs; unify join; export caps+audit | — |
| 2026-09-17 | AUTH-09/10/11/13/17 | OTP upsert; TOTP replay; MFA pending JWT; fresh role; rate limits | — |
| 2026-09-17 | AUTHZ-04 | Mount documents stats router before `/:id` | — |
| 2026-09-17 | AUTH-16/21, AUTHZ-08/09/12 | Mobile refresh; signed-URL allowlist; care-plan list; household accept | — |
| 2026-09-17 | migrations | Applied P1/P2 SQL; baselined `_prisma_migrations`; DB schema up to date | — |
| 2026-09-17 | AUTH-15/19/22/23/24, AUTHZ-13/14 | Break-glass harden; OTP entropy; soft-delete revoke; URL scrub; JWT claims; GPS admins; marketplace minimize | — |
| 2026-09-18 | — | Phase 1E audit copied to `audits/`; INJ-01…12 tickets added to tracker | — |
| 2026-09-18 | INJ-01/02/03 | `csvSafe` util; audit entity/IP sanitize; formula-encode audit/bookings/users CSV; unit tests | — |
| 2026-09-18 | INJ-04…12 | query parser simple + queryString; parsePagination; WhatsApp HMAC; httpUrl/escapeHtml/sanitize edit+AI; S3 host anchor | — |
| 2026-09-18 | D-01/D-03 | `injPhase1eRetest` verifies simple parser + take clamp; ops checklists for D-02 + secret rotation | — |
| 2026-09-18 | D-02 + secrets | XFF sanitize middleware; rate-limit trusted IP; nginx overwrite; JWT `*_PREVIOUS` verify; `secrets:generate` | — |
| 2026-09-22 | — | Phase 1F audit copied to `audits/`; MOB-01…21 tickets added to tracker | — |
| 2026-09-22 | MOB-01…16 | Mobile logout purge, socket release, release signing, GPS reject, 401 hard reset, screen capture, media cleanup, push revoke, auth layouts, R8 | — |

---

## Verification checklist (per closed finding)

- [x] Phase 1E code change matches audit **Recommendation** (INJ-01…12)
- [x] Retest procedures for INJ-01/03/04/05/10 executed via `injPhase1e*.test.ts`
- [x] No new injection bypass introduced (spot-check query parser + pagination + CSV)
- [x] Tracker rows → `🧪 Verified` for INJ-01…12 (D-02 + secret rotation remain ops)
- [x] Related client UI updated if API contract changed (N/A for 1E)
- [x] Phase 1F MOB-02/03/05 code complete (device A→logout→B + release cert retest still open)
- [ ] Phase 1F device retest M-01/M-02 (emulator logout cross-user + `apksigner` non-debug cert)
