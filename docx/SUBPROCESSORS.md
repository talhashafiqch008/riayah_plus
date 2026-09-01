# Sub-processor Register

**Controller:** Riayah Plus / HealthOS Platform  
**Document owner:** Legal / Compliance  
**Last updated:** 2026-09-01  
**Audit findings:** **G11**, **HP8**, **HP10**, **HP12**

> Status key: **Signed** = executed DPA/BAA on file · **Pending** = vendor engaged, contract in progress · **N/A** = no PHI / not used in prod · **Review** = needs Legal confirmation

---

## Register

| Processor | Service | Data categories sent | PHI / special category? | Region | DPA status | BAA (HIPAA) | Safeguards in app | Owner |
|---|---|---|---|---|---|---|---|---|
| **Amazon Web Services** | S3 object storage (recordings, chat files, invoice PDFs, documents) | Files, metadata | **Yes** | `me-south-1` (prod target) | **Signed** (AWS Customer Agreement + DPA) | **Pending** — CMK required for prod | KMS SSE (`phiS3.ts`); `ACL: private`; prod boot guards | Infra |
| **Amazon Web Services** | RDS / self-managed PostgreSQL hosting | All application DB rows | **Yes** | Same as deployment | **Signed** | **Pending** | Encryption at rest (infra); access via private network | Infra |
| **Redis** (ElastiCache or self-hosted) | Sessions, rate limits, PayTabs locks, queues | Session IDs, counters | Low — no clinical content | Same as deployment | **Review** | N/A | No PHI in keys; TTL on locks | Infra |
| **Stripe** | Card payments, payment methods, wallet top-up webhooks | Billing identity, payment method refs, amounts | No | US / EU | **Signed** (Stripe DPA) | **N/A** (PCI scope) | Webhook signature verification; PM ownership checks | Backend |
| **PayTabs** | Qatar payment gateway (invoices, wallet) | Payer email/phone, amount, `tran_ref` | No | Qatar / MENA | **Pending** | N/A | HMAC-only webhooks; `tran_ref` idempotency lock | Backend |
| **LiveKit** | WebRTC telehealth, recording egress to S3 | A/V streams, room metadata, egress to customer bucket | **Yes** | Configurable | **Pending** | **Pending** | Webhook raw-body HMAC; recording KMS via bucket default encryption | Backend |
| **Google (Gemini API)** | Authenticated AI chat (`GeminiChatService`) | User prompts (sanitized), session context | **Yes** (user-entered health text) | US / multi | **Review** | **Pending** | Auth + `ai_chat` consent; output sanitization; rate limits | Backend / Legal |
| **Riayah AI** | Care-plan draft generation (`RiayahAiClient`) | Minimized episode: diagnosis codes, service interests, assessment types/recommendations — **no DOB, no full history, no raw findings** | **Yes** (minimized) | Per contract | **Pending** | **Pending** | `ai_care_plan` consent; audit log `ai_care_plan_request`; payload minimization (HP8) | Backend / Legal |
| **Sentry** | Error + performance monitoring (server `@sentry/node`, client `@sentry/react`) | Stack traces, URLs (scrubbed), user id | Must not include PHI | US / EU | **Review** | **Pending** or replace | `beforeSend` scrubbers; client init gated on `__RAIYAH_ANALYTICS__` cookie consent | Frontend / Legal |
| **SMTP provider** (e.g. Gmail, SES, SendGrid) | Transactional email | Recipient address, message body | May include appointment context | Varies | **Review** | **Pending** if PHI in templates | `requireTLS`; cert validation; email redaction in logs | DevOps |
| **Firebase Cloud Messaging** | Push notifications | Device tokens, notification payload | Low | Google | **Review** | N/A | No clinical content in push title/body where possible | Backend |
| **Pusher** (optional / legacy) | Real-time events | User id, event names | Low | EU (`ap2`) | **Review** | N/A | Auth on broadcast channels | Backend |
| **Meta WhatsApp Cloud API** | WhatsApp booking bot | Phone, message content | May include scheduling | US / EU | **Pending** | N/A | Webhook verification; rate limits | Backend |
| **Google Maps** | Geocoding / distance (if enabled) | Coordinates, addresses | Location | US | **Review** | N/A | GPS logs retention per G8 | Backend |
| **SkipCash** | Alternate Qatar gateway (optional) | Payment metadata | No | Qatar | **Pending** | N/A | Webhook secret env | Backend |

---

## Code references (minimization & consent)

| Processor | Enforcement files |
|---|---|
| Riayah AI | `server/src/services/AiCarePlanDraftService.ts`, `server/src/utils/aiCarePlanConsent.ts` |
| Google Gemini | `server/src/utils/aiChatConsent.ts`, `server/src/services/GeminiChatService.ts` |
| Sentry | `server/src/utils/sentryScrub.ts`, `client/src/lib/sentry.ts`, `client/src/components/CookieConsentBanner.tsx` |
| AWS S3 | `server/src/utils/phiS3.ts`, `server/src/config/env.ts` |
| LiveKit | `server/src/utils/LiveKitAccess.ts`, `server/src/controllers/telehealth/MeetingSchedulerController.ts` |
| PayTabs | `server/src/services/QatariPaymentService.ts`, `server/src/utils/paytabsWebhookLock.ts` |

---

## Onboarding checklist (new processor)

1. Legal reviews DPA/SCCs and HIPAA BAA if PHI is possible  
2. Add row to this table before production credentials are issued  
3. Engineering: minimize payload, add consent gate if special-category data  
4. Update `ROPA.md` processing activity if purpose or categories change  
5. Security: add to `npm audit` / vendor review cycle  

---

## Change log

| Date | Change |
|---|---|
| 2026-09-01 | Initial M4 sub-processor register — 15 processors with DPA/BAA status placeholders for Legal |
