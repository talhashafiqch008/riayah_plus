# DPIA — Milestone 2 Health-Data Processing (Article 35)

**Document ID:** DPIA-M2-2026-07  
**Date:** 2026-07-22  
**Owner:** Riayah Plus Engineering / Privacy  
**Related audit:** `docx/GDPR_M2_Compliance_Report.md` (G-13)  
**Status:** Draft for stakeholder review — required before production use of M2 clinical surfaces

---

## 1. Purpose of this DPIA

M2 introduces processing of **special-category health data** (GDPR Art 9) through care units, care recipients, intake records, care episodes, assessments, AI intake summaries, documents, and emergency geolocation.

This DPIA assesses necessity, risks, and mitigations for that processing.

---

## 2. Description of processing

| Item | Description |
|---|---|
| **Controller** | Riayah Plus (platform operator) |
| **Processors** | Hosting (DB/S3), payment gateways, WhatsApp/email providers as configured |
| **Data subjects** | Family/guardian users; care recipients (patients); clinical/coordinator staff |
| **Categories of data** | Identity; contact; health (diagnoses, meds, history, findings); location (emergency/GPS); documents |
| **Purposes** | Care coordination intake → episode → assessment → care delivery |
| **Lawful basis** | Art 6(1)(b) contract; Art 6(1)(a)/Art 9(2)(a) explicit consent (including guardian consent for recipients); Art 6(1)(d)/Art 9(2)(c) vital interests for emergencies |
| **Recipients** | Organization-scoped coordinators/clinical staff; family owners of care units |
| **Transfers** | As required by configured cloud region / processors — contractual SCCs where applicable |
| **Retention** | Account anonymization 30 days after deletion; emergency location 90 days post-resolution; GPS 90 days; notifications 1 year; OTP 24h; clinical records retained while account/episode obligations require, then anonymized |

---

## 3. Necessity and proportionality

- Health data is collected only to triage and deliver care (intake → review → episode → assessment).
- Family/guardian consent is captured at intake; M2 also records `care_recipient_health:{recipientId}` consent documenting guardian/legal-care basis (G-15 remediation).
- Access is tenant-scoped and role-guarded (see M2 security remediation).
- Data minimization applied to API responses and audit redaction of health fields.

---

## 4. Risks to data subjects

| Risk | Likelihood | Impact | Residual after mitigations |
|---|---|---|---|
| Unauthorized cross-tenant access to health records | Medium | High | Low (tenant checks + route guards) |
| Incomplete erasure leaving PHI in related tables | High | High | Low/Med (cascade anonymization G-3) |
| Restriction of processing ignored | High | High | Low (middleware enforces G-1) |
| Indefinite location retention | Medium | High | Low (90-day purge/redact) |
| Breach of database backups | Medium | High | Med (volume encryption ops-owned; column encryption deferred G-28) |
| Over-collection via AI inferences | Medium | High | Med (AI model gated / approval fields exist; full Art 22 UX deferred) |

---

## 5. Mitigations implemented in code (2026-07-22)

- Honor `processingRestricted` on mutating API calls (G-1)
- Consolidated account deletion with obligation checks (G-2/G-14)
- Cascading anonymization of related PHI (G-3)
- DSAR export includes M2 care/health categories + request records (G-4/G-21)
- Care-recipient health consent recorded at intake (G-15)
- Emergency/GPS retention jobs (G-16/G-20)
- Audit health-field redaction (G-26)
- No PII phone in WhatsApp admin URL (G-23)
- Masked phone in WhatsApp error logs (G-25)
- Reduced stack-trace logging (G-24)

---

## 6. Residual / deferred items

- Full column-level encryption / KMS (G-28) — infrastructure track
- Formal ROPA / DPO appointment documentation (Art 30/37) — legal track
- Breach notification playbook (Art 33) — ops track
- AI Art 22 contest UI + non-persist until approval (G-18) — product track
- Cookie category integration with analytics vendors (G-6) — product track

---

## 7. Consultation & sign-off

| Role | Name | Date | Decision |
|---|---|---|---|
| Product owner | | | |
| Engineering lead | | | |
| Privacy / DPO (or interim) | | | |
| Security reviewer | Karim Ashraf (source audit) | 2026-07-21 | Findings accepted |

**Decision required before production:** Approve this DPIA or document residual risk acceptance for deferred items above.

---

*Living document — update when M2 processing changes.*
