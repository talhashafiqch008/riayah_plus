# Milestone 2 — GDPR Remediation Tracker

**Created:** 2026-07-22  
**Source audit:** `GDPR_M2_Compliance_Report.md` (Karim Ashraf, 2026-07-21)  
**DPIA:** `M2_DPIA.md` (G-13)  
**Related security work:** `M2_SECURITY_REMEDIATION.md` (does not replace this tracker)

**Overall status:** 🟢 Demo-blocking + high staging GDPR items shipped 2026-07-22. Residuals: encryption-at-rest (ops), Art 22 AI contest UI, full cookie vendor gating, legal ROPA/DPO/breach playbook.

---

## Reply draft (copy / adapt)

```text
Subject: Re: GDPR M2 Compliance Report (2026-07-21) — Remediation update

Hi Karim,

Thank you for the M2 GDPR compliance report.

We accepted the findings and remediations are tracked in docx/M2_GDPR_REMEDIATION.md with a DPIA at docx/M2_DPIA.md.

Completed (engineering):
- G-1 processingRestricted now enforced on mutating APIs
- G-2 / G-14 consolidated account deletion with expanded obligation checks + AccountDeletionRequest records
- G-3 cascading anonymization of related PHI
- G-4 / G-12 / G-21 DataExportRequest wired; export includes M2 care/health categories
- G-8 privacy/terms API placeholders replaced with versioned content
- G-13 DPIA drafted (M2_DPIA.md)
- G-15 care-recipient health consent recorded at intake
- G-16 / G-20 emergency + GPS retention jobs
- G-23 / G-24 / G-25 / G-26 / G-27 logging, URL PII, audit redaction, response minimization

Deferred / external:
- G-28 encryption at rest / column-level (infrastructure)
- G-6 full analytics script gating + cookie policy page polish
- G-7 remaining localStorage cleanup (phone login redirected to password path)
- G-17 / G-18 ClinicalNote / AI approval UX
- Art 30 ROPA, Art 33 breach playbook, Art 37 DPO appointment (legal/ops)

Please treat M2_GDPR_REMEDIATION.md as the status source of truth for this report.

Thanks,
[Name]
```

---

## Status table

| ID | Finding | Sev | Status | Notes |
|---|---|---|---|---|
| G-1 | processingRestricted not honored | High | ✅ Fixed | Enforced in `authenticate` for mutating methods |
| G-2 | Deletion obligations narrow | High | ✅ Fixed | Bookings, invoices, disputes, payouts, episodes, assessments |
| G-3 | Anonymization incomplete | High | ✅ Fixed | Cascades messages, docs, care, GPS, consents, etc. |
| G-4 / G-12 | Export/deletion request models unwired | Med | ✅ Fixed | Rows created; `GET /privacy/requests` |
| G-5 | Export format/scope | Med | ✅ Partial | Optional `categories`; JSON only (async/CSV deferred) |
| G-6 | Cookie banner not integrated | Med | ⏸ Deferred | Banner exists; vendor gating later |
| G-7 | Tokens in localStorage | Med | ⏸ Partial | OTP login no longer stores session tokens by default |
| G-8 | Privacy policy placeholders | Med | ✅ Fixed | Versioned API content |
| G-9 | requireConsent helper | Med | ⏸ Deferred | Intake consents already required |
| G-10 / G-22 | Retention schedules | Med/High | ✅ Partial | Jobs for emergency/GPS/notifications; full columns deferred |
| G-11 | Rectification notify | Low/Med | ⏸ Deferred | |
| G-13 | No DPIA | High | ✅ Fixed | `docx/M2_DPIA.md` |
| G-14 | Duplicate deletion route | High | ✅ Fixed | Both routes → `performAccountDeletion` |
| G-15 | Care recipient Art 9 consent | High | ✅ Fixed | `care_recipient_health:{id}` at intake |
| G-16 | Emergency indefinite retention | High | ✅ Fixed | 90-day redact cron |
| G-17 | ClinicalNote unwired | Med | ⏸ Deferred | Model unused — document risk |
| G-18 | AI inferences | High | ⏸ Deferred | Approval fields exist; approval UX later |
| G-19 | FamilyMember consent | Med | ⏸ Deferred | |
| G-20 | GpsLog retention | Med | ✅ Fixed | 90-day purge |
| G-21 | Export omits M2 health | High | ✅ Fixed | Care/intake/episode/assessment included |
| G-23 | PII in WhatsApp URL | Med | ✅ Fixed | POST search; GET deprecated 410 |
| G-24 | Stack traces in logs | Med | ✅ Fixed | No stack in structured logs |
| G-25 | Phone logged | Med | ✅ Fixed | Last-4 only |
| G-26 | Audit health snapshots | High | ✅ Fixed | `auditRedact` health keys |
| G-27 | API over-inclusion | Med | ✅ Partial | Assessment emails removed; episode show already limited |
| G-28 | Encryption at rest | High | ⏸ Deferred | Infra |
| G-29 | isActive default true | Low/Med | ⏸ Deferred | |

---

## Changelog

| Date | Note |
|---|---|
| 2026-07-22 | Tracker + DPIA created; demo-blocking and high engineering items shipped. |
