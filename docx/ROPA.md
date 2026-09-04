# Record of Processing Activities (RoPA)

**Controller:** Riayah Plus / HealthOS Platform  
**Document owner:** Legal / Data Protection  
**Last updated:** 2026-09-01  
**Scope:** `mern/server` API, `mern/client` web portal, mobile clients  
**Legal basis reference:** GDPR Art. 30; Qatar PDPL equivalent processing register

> This RoPA is the in-repo processing inventory required by M4 audit findings **G11** and **HP10**. Sub-processor contracts (BAA/DPA) are tracked in [`SUBPROCESSORS.md`](./SUBPROCESSORS.md).

---

## 1. Processing activities

| ID | Activity | Data subjects | Categories of personal data | Special category (health) | Purpose | Legal basis | Retention | Recipients / processors |
|---|---|---|---|---|---|---|---|---|
| PA-01 | User registration & authentication | Care seekers, providers, staff, family | Name, email, phone, role, credentials (hashed), device/session metadata | No (unless profile extended) | Account creation, login, RBAC | Contract (Art. 6(1)(b)); consent for marketing where applicable | Account lifetime + 90d session purge (G8) | PostgreSQL (self-hosted / cloud), Redis |
| PA-02 | Care episode & intake | Patients, care recipients, coordinators | Demographics, care needs, diagnoses codes, assessments, documents | **Yes** — clinical intake, care plans | Care coordination, service delivery | Contract; explicit consent for health data (Art. 9(2)(a)) | Episode + document retention per policy; `retentionExpiresAt` purge jobs | AWS S3 (KMS), Riayah AI (minimized payloads) |
| PA-03 | Telehealth (LiveKit) | Patients, providers, family (waiting room) | Session metadata, recordings, transcripts (encrypted), join tokens | **Yes** | Virtual care sessions | Contract; telehealth consent (`telehealth`) | Recordings/transcripts: 90d purge; meetings 365d | LiveKit, AWS S3 (recordings) |
| PA-04 | Secure messaging | Users in conversations | Message content, attachments, read receipts | May include PHI in free text | Care communication | Contract | Messages: 730d (`retentionExpiresAt`) | AWS S3 (chat attachments, KMS) |
| PA-05 | Billing & payments | Clients, providers | Invoice line items, payment refs, wallet balance | No (financial) | Invoicing, PayTabs/Stripe checkout | Contract; legal obligation (tax) | Per finance retention schedule | Stripe, PayTabs |
| PA-06 | AI-assisted features | Authenticated users | Chat prompts (sanitized), minimized episode fields for care-plan draft | **Yes** when health-related | Care-plan drafting, intake summary, doctor chat | Explicit consent (`ai_chat`, `ai_care_plan`) | Prompts not stored in third-party logs beyond processor policy | Google Gemini, Riayah AI |
| PA-07 | Notifications & email | All users | Email address, notification body, channel prefs | May include appointment/reminder context | Service notifications | Contract; per-channel consent (`email_notifications`, `telehealth`) | Notifications: 365d purge | SMTP provider, Firebase (push) |
| PA-08 | GDPR data subject rights | Data subjects | Export bundle (pseudonymized foreign IDs), deletion/anonymization | May include PHI in export | Access, portability, erasure | Legal obligation (Art. 15–17) | Export files: TTL (`DATA_EXPORT_TTL_HOURS`); encrypted at rest | None (self-processed) |
| PA-09 | Security monitoring | Users (indirect) | IP, user agent, stack traces (scrubbed), performance traces | Must not include PHI in Sentry | Error detection, incident response | Legitimate interest / consent for client SDK (G7) | Per Sentry project retention (configure ≤ 30d) | Sentry |
| PA-10 | WhatsApp booking flows | Users with phone on file | Phone, booking context | May include care scheduling | Alternative booking channel | Contract / consent | Per messaging retention | Meta WhatsApp Cloud API |
| PA-11 | Audit & compliance logs | Staff, patients (actor IDs) | Action, resource ID, redacted metadata | Metadata only — PHI redacted via `auditRedact` | Security audit, HIPAA accounting | Legal obligation / legitimate interest | Aligned with security log retention | PostgreSQL |

---

## 2. International transfers

| Processor | Primary region | Transfer mechanism |
|---|---|---|
| AWS | Configurable (target: `me-south-1`) | SCCs / AWS DPA |
| Google (Gemini) | US / multi-region | Google Cloud DPA; data minimization + consent gates |
| Stripe | US / EU | Stripe DPA |
| LiveKit | Configurable cloud | LiveKit DPA |
| Sentry | US / EU | Sentry DPA; BAA required for PHI — **client gated behind analytics consent** |
| Riayah AI | Staging/prod per contract | DPA/BAA — see SUBPROCESSORS.md |

---

## 3. Technical and organizational measures (summary)

- Encryption at rest: KMS SSE for S3 PHI (recordings, chat, invoice PDFs); AES-256-GCM for export files and recording transcripts  
- Encryption in transit: TLS 1.2+; SMTP `requireTLS`; cookies `SameSite=Strict`  
- Access control: RBAC, object-level authorization, telehealth purpose-of-use logging  
- Rate limiting: Redis-backed `express-rate-limit` (auth, AI, API, webhooks)  
- Retention: `retentionExpiresAt` columns + daily `retention:m4-purge` cron  
- Consent: granular `consents` table; AI and telehealth gated before third-party calls  
- Logging hygiene: `auditRedact.ts`, query-string stripping, email redaction  

---

## 4. Review cadence

| Review | Frequency | Owner |
|---|---|---|
| RoPA accuracy vs production | Quarterly | DPO / Legal |
| Sub-processor register | On new vendor or contract change | Legal |
| Retention TTLs | Annually | Legal + Engineering |

---

## 5. Change log

| Date | Change |
|---|---|
| 2026-09-01 | Initial M4 revision RoPA — 11 processing activities, links to SUBPROCESSORS.md |
