# Milestone 2 — Security Remediation Test Guide

Use with `M2_SECURITY_REMEDIATION.md`.

**Last updated:** 2026-07-22  
**Source audit:** `M2_SECURITY_REVIEW.md`  
**Tracker:** `M2_SECURITY_REMEDIATION.md`

---

## Status

| Wave | Test section | Status |
|---|---|---|
| A — Blocking | Flow A1–A7 | 🟢 RETESTED (API smoke) — multi-org A2 still needs 2nd org |
| B — Auth sessions | Flow B1–B3 | 🟢 CODE READY / partial dynamic |
| C — Staging harden | Flow C1–C3 | 🟢 CODE READY / MIME + guards smoke |
| D — Depth / Low | Flow D1 | 🟢 CODE READY |
| Regression | Flow REG-M2 | ✅ READY |

---

## Prerequisites

```bash
cd server && npm run dev   # :5001
cd client && npm run dev   # :5173
```

Demo passwords: `Password123!`

| Role | Email |
|---|---|
| Family | `family@demo.com` |
| Coordinator | `coordinator@riayahplus.com` |
| Clinical | `clinical@demo.com` |

---

## Flow REG-M2 — Product still works

1. Family onboarding → intake in coordinator queue  
2. Coordinator structured review → episode  
3. Schedule assessment → clinical complete  

**Pass if:** Happy path still works.

---

## Flow A4 — M-47 / M-48 ✅

1. `POST /api/auth/register` with `role: admin` + `consentAccepted: true` → **422** Invalid role  
2. `POST /api/admin/login` → **403** Admin secret login is disabled  

---

## Flow A7 — Z-4 booking ✅

1. Family creates booking with clinical provider  
2. Coordinator non-party mutations → **403**  
3. Client can cancel  

---

## Flow B1 — Password reset (M-39/M-40)

1. Request reset → reset password  
2. Old refresh token / sessions no longer work  
3. Same reset token cannot be reused  

---

## Flow B2 — OTP (M-43/M-44)

1. Verify OTP → `{ verified: true, loginRequired: true }` **without** accessToken (unless `ALLOW_OTP_LOGIN=true`)  
2. Phone login UI redirects to password login after verify  

---

## Flow B3 — 2FA (M-41/M-45)

1. Disable 2FA without TOTP → **422**  
2. Change password with 2FA enabled without TOTP → **422**  

---

## Flow C1 — Uploads (H-4/H-5/M-5–M-8)

1. Presign with `image/svg+xml` → **422**  
2. Presign returns `uploadToken`; confirm without token → **422**  
3. Rate limiter present on `/intake/documents/*`  

---

## Flow C2 — Clinical hygiene (M-16–M-20)

1. Episode cannot jump `intake_submitted → validated` via free PATCH  
2. Assessment `type` outside enum → **422**  
3. Clinical cannot cancel assessment → **403**  

---

## Flow D1 — CSP / demo (M-23/Z-8)

1. API responses include Content-Security-Policy  
2. `/demo/coordinator` requires auth (and is off in prod unless `VITE_ENABLE_DEMO_ROUTES=true`)  

---

## Report back (2026-07-22)

```text
Wave: A–D
Date: 2026-07-22
IDs fixed: See M2_SECURITY_REMEDIATION.md
Tests run: API smoke (auth roles, M-47/M-48, Z-1/Z-4, H-5 MIME, core GETs); tsc server+client
Pass / Fail: Pass
Residual: multi-org A2; M-21/M-25/M-29/M-38; Low polish L-2/L-3/L-5–L-8
```

---

## Changelog

| Date | Note |
|---|---|
| 2026-07-22 | Skeleton + Wave A retest. |
| 2026-07-22 | Waves B–D test stubs + smoke results. |
