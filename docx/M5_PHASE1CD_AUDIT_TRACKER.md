# Milestone 5 — Phase 1C + 1D Audit Remediation Tracker

**Created:** 2026-09-17  
**Sources of truth (audits):**
- `audits/M5_PHASE1C_AUTH_SESSION_SECURITY.md` (Auth & Session)
- `audits/M5_PHASE1D_AUTHORIZATION_TENANT_SECURITY.md` (AuthZ / RBAC / IDOR / Tenant)
**Auditor:** Karim Ashraf, Cyber Security Engineer  
**Audit date:** 2026-09-12  
**Audit target:** `milestone-5-fetched` @ `72c6258b5d665bab7d96a46681eb24e30073c1b0`  
**Codebase:** `mern/server` (+ related client surfaces)  
**Overall status:** ✅ **P0–P3 code complete** — verification / secret rotation remain  
**Last updated:** 2026-09-17  
**Rule:** Check tasks off here as you fix and verify them. Use the audit markdown for *why*; use **this file** for *what to do next*.

---

## How to use this tracker

1. Work **P0 → P1 → P2 → P3** unless marked **∥ Parallel**.  
2. Do **not** mark Phase 1C/1D remediation complete until all **P0** items are 🧪 Verified.  
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
| | **Combined** | **7** | **1** | **17** | **16** | **41** |

### Release blockers (must fix before production)

| ID | Severity | One-line | Status |
|---|---|---|---|
| **AUTH-01** | High | Per-device session revoke uses wrong ID table → always 404 | ✅ Done |
| **AUTH-03** | High | 2FA enrollment can be silently replaced without re-auth | ✅ Done |
| **AUTH-04** | High | Admin mass-assignment can disable 2FA / rewrite credentials | ✅ Done |
| **AUTH-05** | High | Socket.IO sessions survive logout / reset / suspend | ✅ Done |
| **AUTHZ-01** | High | Care-summary PDF served from permanent public S3 URL | ✅ Done |
| **AUTHZ-02** | High | Agency staffing assign accepts any tenant’s booking/shift | ✅ Done |

---

## Progress snapshot

| Wave | Focus | Open | Status |
|---|---|---:|---|
| **P0** | Release blockers (AUTH-01/03/04/05 + AUTHZ-01/02) | **0** | ✅ Code done — verify next |
| **P1** | Before production (auth lifecycle + authz gates) | **0** | ✅ Code done — verify next |
| **P2** | Hardening | **0** | ✅ Code done — verify next |
| **P3** | Architecture / polish | **0** | ✅ Code done — verify next |

---

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
| Rotate `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_SECRET` | ⏸ Blocked | Ops / infra |
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

---

## Verification checklist (per closed finding)

- [ ] Code change matches audit **Recommendation**
- [ ] Retest procedure from audit section executed
- [ ] No new auth/authz bypass introduced (spot-check related routes)
- [ ] Tracker row → `🧪 Verified` + notes filled
- [ ] Related client UI updated if API contract changed (e.g. AUTH-01 sessions)
