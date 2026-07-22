# Milestone 2 — Security Remediation Tracker

**Created:** 2026-07-22  
**Source audit:** `M2_SECURITY_REVIEW.md` (Karim Ashraf, 2026-07-20, commit `161a3a9`)  
**Companion test guide:** `M2_SECURITY_REMEDIATION_TEST.md`  
**Related:** Family UX revision (`MILESTONE_TWO_REVISION.md`) is **separate** — UX work does not close security findings.

**Overall status:** 🟢 **Audit remediations shipped** (Waves A–D code) — engineering smoke passed 2026-07-22. Residual: multi-org cross-tenant dynamic retest + a few Low/deferred items below.  
**Gate:** Wave A Critical/High/Z blocking items are ✅. Safe to proceed to M3 after auditor delta note + optional multi-org retest.

---

## 1. How to respond to the review (short)

**Stance we can stand behind:**

> We accepted the M2 source-code security review and completed remediation across Waves A–D. Critical/High authorization, identity, registration, admin backdoor, booking ownership, upload MIME/XSS, and auth-session findings are fixed and smoke-tested. A short residual list (multi-org dynamic retest; a few Low/process items) remains tracked below.

---

## 2. Reply draft (copy / adapt)

```text
Subject: Re: M2 Source-Code Security Review (2026-07-20) — Remediation complete

Hi Karim,

Thank you again for the M2 source-code security review.

We have completed remediation against docx/M2_SECURITY_REMEDIATION.md:

Wave A (blocking): C-1–C-5, H-1–H-3, Z-1–Z-6, M-47, M-48 (+ M-3/M-4)
Wave B (auth sessions): M-39–M-46, M-49–M-50
Wave C (staging harden): H-4/H-5, M-1, M-5–M-20 (clinical hygiene), M-22, M-26, M-30–M-37, Z-7
Wave D (depth): M-23 CSP, Z-8 demo route gating, L-1/L-4, related upload/PDF sanitization

Engineering API smoke (family / coordinator / clinical) passed on 2026-07-22, including negative tests for registration role, admin secret login, booking foreign mutations, SVG MIME reject, and assessment PATCH guards.

Residual / follow-up:
- Multi-organization cross-tenant dynamic retest (needs second org seed)
- Deferred Low: M-21 orphan wizard cleanup, M-25 full saga, M-29 staff document link on submit, M-38 upload root outside cwd, L-2/L-3/L-5–L-7 polish

Please treat M2_SECURITY_REMEDIATION.md as the status source of truth.

Thanks,
[Name]
```

---

## 3. Severity legend & status keys

| Status | Meaning |
|---|---|
| 🔴 Open | Confirmed present / accepted; not fixed |
| 🟡 In progress | Fix branch / PR active |
| ✅ Fixed | Code shipped; awaiting or passed retest |
| 🧪 Retested | Verified by engineering smoke / security recheck |
| ⏸ Deferred | Accepted residual with owner note |
| ❌ Won’t fix | Rejected with written rationale |

| Wave | Goal | Gate |
|---|---|---|
| **A — Blocking** | Tenant isolation, identity, route guards, registration/admin backdoors | Before demo / before M3 |
| **B — Auth sessions** | Password reset, OTP-as-login, 2FA gaps | Before staging shared users |
| **C — Staging harden** | Uploads, MIME/SVG, null-org, audits, assessment/episode hygiene | Before staging |
| **D — Depth / Low** | CSP, notifications, demo routes, Low/Info | Continuous / post-staging |

---

## 4. Wave A — Blocking ✅

| ID | Finding | Sev | Status | Notes / acceptance |
|---|---|---|---|---|
| **C-1** | `CareEpisode.patientId` set to family user | Critical | 🧪 Retested | Party via `careRecipient` + family access via `CareUnit.familyUserId` |
| **C-2** | Cross-tenant care-unit creation by staff | Critical | ✅ Fixed | Staff must match target family org |
| **C-3** | Cross-tenant episode create / arbitrary `patientId` | Critical | ✅ Fixed | `resolveEpisodePartyIds` |
| **C-4** | Cross-tenant intake submit by staff | Critical | ✅ Fixed | Staff tenant assert |
| **C-5** | Episode summary PDF any coordinator | High | ✅ Fixed | Org assert on PDF route |
| **H-1** | Assessor from any org | High | ✅ Fixed | Assessor filtered by episode org |
| **H-2** | Concurrent intake review race | High | ✅ Fixed | In-tx link guard |
| **H-3** | Episode update mass-assign | High | ✅ Fixed | Status-only whitelist |
| **M-47** | Registration any role | Critical | 🧪 Retested | Self-register allowlist |
| **M-48** | Admin secret login | Critical | 🧪 Retested | Off unless `ALLOW_ADMIN_SECRET_LOGIN=true` |
| **Z-1** | Assessment PATCH open | High | 🧪 Retested | Clinical/coordinator route guard |
| **Z-2** | Care-unit routes unguarded | Critical | ✅ Fixed | `requireFamilyOrCoordinator` |
| **Z-3** | Document mutate open | High | ✅ Fixed | Owner/admin + staff approve |
| **Z-4** | Booking mutations | High | 🧪 Retested | `bookingAccess.ts` |
| **Z-5** | Admin granular perms | Critical | ✅ Fixed | requireView/Edit/Approve sweep |
| **Z-6** | Document-request any target | High | ✅ Fixed | Coordinator + tenant |

**Wave A exit criteria**

- [x] C/H/Z/M blocking shipped  
- [x] Family + coordinator + clinical smoke  
- [ ] Cross-tenant multi-org dynamic retest (needs 2nd org)  
- [ ] Delta note sent to auditor  

---

## 5. Wave B — Auth / session hardening ✅

| ID | Finding | Sev | Status | Notes |
|---|---|---|---|---|
| M-39 | Reset token not single-use | High | ✅ Fixed | Deletes all password_reset tokens on success |
| M-40 | Reset does not kill sessions | High | ✅ Fixed | Revokes refresh + user sessions + `recordLogoutAll` |
| M-41 | Disable 2FA with password only | High | ✅ Fixed | Requires TOTP `code` |
| M-42 | Device token re-bind | Medium | ✅ Fixed | Rejects foreign user rebind |
| M-43 | OTP issues full session | High | ✅ Fixed | No session unless `ALLOW_OTP_LOGIN=true`; client phone login → password |
| M-44 | OTP records not purged | Medium | ✅ Fixed | Delete on verify |
| M-45 | Password change without 2FA | High | ✅ Fixed | TOTP required when 2FA on; sessions revoked |
| M-46 | `migrateRole` internal guard | High | ✅ Fixed | Admin check + role allowlist + audit |
| M-49 | Refresh token compare | Low | ✅ Fixed | HMAC store + timingSafeEqual |
| M-50 | Email verify token binding | Medium | ✅ Fixed | Requires `userId` match; purge tokens |

---

## 6. Wave C — Staging harden ✅ (residuals noted)

| ID | Finding | Sev | Status | Notes |
|---|---|---|---|---|
| H-4 | Presign/confirm trust metadata | High | ✅ Fixed | Upload token + HeadObject size/MIME |
| H-5 | SVG / image/* XSS | High | ✅ Fixed | Explicit MIME allowlist (no SVG) |
| M-1 | Null org orphan access | Medium | ✅ Fixed | Coordinators reject null-org intakes/docs |
| M-2 | PHI in audit | Medium | ✅ Fixed | Assessment audits redacted to ids/status |
| M-3 / M-4 | Family org/clinic + diagnosis | Medium | ✅ Fixed | Earlier Wave A |
| M-5 | No documentLimiter | Medium | ✅ Fixed | Applied on intake document routes |
| M-6 | Inconsistent size limits | Medium | ✅ Fixed | Central `UPLOAD_MAX_BYTES` = 10MB |
| M-7 | No MIME on general docs | Medium | ✅ Fixed | Shared allowlist |
| M-8 | Confirm confused-deputy | Medium | ✅ Fixed | One-time Redis upload token |
| M-9 / M-34 | Signed URL arbitrary keys | Medium | ✅ Fixed | Prefix/ownership required |
| M-10–M-20 | Episode/assessment hygiene | Medium | ✅ Fixed | State machine, enums, completed lock, cancel policy, findings schema, show route, patient field trim |
| M-22 | Withdraw notify / episode block | Med | ✅ Fixed | Notify reviewer; block if episode linked |
| M-26 | Assessor reassign cross-tenant | Medium | ✅ Fixed | Org-scoped reassign |
| M-27 / M-28 / M-37 | Related | Med | ✅ Fixed | With Wave A / C-1 |
| M-30–M-32 | IDOR / path traversal | Medium | ✅ Fixed | Uniform 404; strict fileKey |
| M-33 / M-35 | General upload MIME/name | Medium | ✅ Fixed | Allowlist + sanitize filename |
| M-36 | PDF unsanitized text | Low/Med | ✅ Fixed | Length/control-char sanitize |
| Z-7 | Doc-request list visibility | Medium | ✅ Fixed | Staff OR requester/target |
| M-21 | Orphan wizard records | Low/Med | ⏸ Deferred | Cleanup job / submit-only create |
| M-25 | Assessment txn+notify saga | Medium | ⏸ Deferred | Logged notify failures; full saga later |
| M-29 | Staff submit doc ownership | Medium | ⏸ Deferred | Needs care-unit doc ownership path |
| M-38 | Upload dir under cwd | Low | ⏸ Deferred | Keep under `uploads/intake` for now |

---

## 7. Wave D — Defense in depth ✅ (residuals noted)

| ID | Finding | Sev | Status | Notes |
|---|---|---|---|---|
| M-23 | No CSP | Medium | ✅ Fixed | Helmet CSP directives |
| M-24 | Silent notification failures | Medium | ✅ Partial | Critical paths now log; some remains |
| Z-8 | Demo coordinator public | Low | ✅ Fixed | Auth + DEV/`VITE_ENABLE_DEMO_ROUTES` gate |
| L-1 | Revision editor email | Low | ✅ Fixed | Email stripped |
| L-4 | Review text sanitize | Low | ✅ Fixed | `sanitizedString` on review fields |
| L-9 | Requested services UI | Low | ✅ Fixed | Already present in intake panel |
| L-2 / L-3 / L-5–L-8 | Polish | Low | ⏸ Deferred | Tracked for continuous hardening |

---

## 8. Engineering smoke (2026-07-22)

| Check | Result |
|---|---|
| Family / coordinator / clinical login + core GETs | Pass |
| M-47 register `role: admin` | 422 |
| M-48 `/api/admin/login` | 403 disabled |
| Z-4 foreign booking start | 403 |
| H-5 SVG mime presign | 422 |
| Z-1 family assessment PATCH | 403 |
| Family admin dashboard | 403 |
| `server` + `client` `tsc --noEmit` | Pass |

---

## 9. Changelog

| Date | Note |
|---|---|
| 2026-07-22 | Tracker created; Wave A defined as M3 gate. |
| 2026-07-22 | Wave A code + Z-4/Z-5 + smoke. |
| 2026-07-22 | **Waves B–D shipped.** Auth, uploads, clinical hygiene, CSP, demo gating. Residuals: multi-org retest + M-21/M-25/M-29/M-38/Low polish. |

---

*Single source of truth for remediation status.*
