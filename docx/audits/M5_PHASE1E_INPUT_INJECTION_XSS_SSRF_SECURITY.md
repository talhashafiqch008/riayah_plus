# M5 Phase 1E — Input Validation, Injection, XSS, SSRF & Server-Side Abuse

**Target:** `milestone-5-fetched` @ `72c6258b5d665bab7d96a46681eb24e30073c1b0`
**Baseline:** `milestone-4-fetched` @ `9c6b26cec57dbe5cecade322aa338a67a97c33b3`
**Date:** 2026-09-12
**Method:** read-only static data-flow tracing + isolated local reproductions (standalone harnesses against the app's own `express@4.22.2`, `qs@6.15.3`, `zod@3.25.76`, `csv-writer`, `sanitize-html`, `@aws-sdk`). No application code, config, schema, migration, `.env`, or dependency was modified; nothing was committed; no production system was touched.

> **Central question:** Can attacker-controlled input cross a Riayah Plus trust boundary and cause unintended interpretation as code, query logic, HTML/JavaScript, URL/network destination, filesystem/object-storage path, shell input, template content, spreadsheet formula, or structured data?
>
> **Answer:** Yes, in one high-value class — **spreadsheet/formula injection into admin-downloaded CSV exports, reachable unauthenticated through the audit-log write path**. Beyond that, the input-handling posture is strong: no SQL injection, no stored/reflected DOM XSS, no SSRF to private ranges, no OS command execution, no path traversal, no template injection, and prototype pollution is not reachable. The residual Medium/Low issues are object/operator injection into Prisma filters (runtime-unverified), unbounded pagination, scheme-accepting URL validation, and unsanitized fields in email/notification/CSV rendering.

---

## 1. Executive Summary

**Overall Phase-1E posture: strong input handling with one high-value, fully-reproduced injection class (CSV formula) and a small tail of Medium/Low hardening gaps.**

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 1 |
| Medium | 5 |
| Low | 4 |
| Informational | 2 |
| **Total** | **12** |

**Confirmed vs Likely:** **10 CONFIRMED · 2 LIKELY** (INJ-04 and INJ-05 have confirmed mechanics; INJ-04's end-to-end impact is DB-runtime-dependent and INJ-05's worst-case amplification is deployment-dependent).

**Release blockers:** **INJ-01** (unauthenticated formula injection reachable into a platform-admin-downloaded CSV) is the only Phase-1E item that meets the release-blocking bar. INJ-02 and INJ-03 are P1.

**Strongest controls observed:**
- **No raw SQL reachable from any request.** The only `$executeRawUnsafe` in the repo is a test helper iterating a hardcoded table list (`server/src/tests/helpers/db.ts`). Every production query is a parameterised Prisma call.
- **No HTML injection sink in the web client.** Zero `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` in `client/src`; all user content renders through React's escaped text nodes.
- **Markdown rendering is sanitized.** `react-markdown@9` with `rehype-sanitize` and no `rehype-raw`; link `href` values pass a scheme allowlist.
- **No OS command execution.** No `child_process`/`exec`/`spawn` anywhere in server, client, or mobile code.
- **Path/S3-key guards work under encoding attacks.** Intake, avatar, and chat key validators reject `..`, absolute paths, backslashes, and both raw and percent-encoded traversal (VER-1E-05).
- **Prototype pollution is not reachable.** `qs@6.15.3` drops `__proto__` keys and does not mutate `Object.prototype` (VER-1E-03).
- **CRLF/header injection is blocked by the runtime.** Node rejects CRLF in response headers with `ERR_INVALID_CHAR` (VER-1E-07).

**Most dangerous attacker-controlled data path (confirmed):**

```
Unauthenticated attacker
  → POST /api/<arbitrary>            (any mutating method, no auth required)
  → auditMiddleware writes AuditLog.entity / entityId VERBATIM from the raw path
  → platform admin downloads GET /api/admin/audit-logs/export (text/csv)
  → spreadsheet interprets "=HYPERLINK(...)" in the ENTITY column (impact depends on app/version/security settings)
```

**Direct answers to the headline questions:**

| Question | Answer |
|---|---|
| SQL injection? | **No.** No attacker-reachable raw query. |
| XSS? | **No stored/reflected/DOM XSS confirmed.** No HTML sink in the web client; markdown sanitized; mobile WebView interpolation is JSON-escaped and inputs are not attacker-controlled. |
| SSRF? | **No.** All outbound destinations are env-configured fixed hosts; no attacker-controlled URL reaches an HTTP client. |
| OS command injection? | **No.** No process-execution sink exists. |
| Path traversal? | **No.** Guards hold under raw and encoded traversal. |
| CSV formula injection? | **Yes — CONFIRMED**, including an unauthenticated path into the admin audit CSV (INJ-01). |
| Open redirect? | **No.** Payment return URLs are allowlisted; client redirects are hardcoded. |
| Unsafe upload behaviour? | **No active content executes** (S3 `ContentDisposition: attachment`, strict MIME allowlist, magic-byte re-check on avatar serving). |
| Unsafe PDF generation? | **No.** `pdfkit` writes strings to an in-memory buffer; no HTML renderer, no remote fetch. |
| Resource-exhaustion paths? | **Yes — bounded/Medium.** Unbounded `take` on list endpoints including one public endpoint (INJ-05). |

---

## 2. Scope & Methodology

Phase 1E reviewed the entire M5 delta and the surrounding input-handling surface: Express routers, controllers, services, middleware, validators, the web client, the Expo mobile app, webhook receivers, AI integration, and the generated-artifact paths (CSV/PDF/email).

Method:
1. **Source inventory** — enumerate every attacker-controlled input channel (§4).
2. **Sink inventory** — enumerate every dangerous interpreter/sink (§5).
3. **Forward trace** — source → validation → transformation → sink → consequence, for each candidate.
4. **Falsification** — for each suspicion, actively search for a compensating control, an unreachable branch, or a mis-reading; withdraw anything invalidated (§34, §31).
5. **Local reproduction** — where a claim is testable without a database or production, reproduce it against the app's exact library versions in an isolated harness (§32, §40).

**Read-only guarantee.** No source/config/schema/migration/`.env`/lockfile was edited. Temporary harnesses were created outside the repository and deleted. `git status` on `server/src`, `server/prisma`, `client/src`, and `mobile` was clean after the review; the pinned ref was unchanged.

**Explicit non-duplication.** Prior phases established committed secrets, admin credential-field exposure, audit redaction gaps, mobile plaintext cache, S3 lifecycle/orphan issues, GPS retention, debug mobile signing, PayTabs amount verification, session revocation, refresh race, 2FA replacement, realtime revocation lifetime, permanent care-summary URL, agency cross-tenant assignment, clinical-note over-read, admin bulk exports, and voice-recording metadata linkage. This report repeats none of these except where Phase 1E found a **distinct input-processing consequence**.

---

## 3. Input Validation Architecture

**Validation stack:** Zod only. No `express-validator`, Joi, Yup, or Ajv.

| Layer | Mechanism | Notes |
|---|---|---|
| Body parsing | `express.json({ limit: '10mb' })`, `express.urlencoded({ extended: true, limit: '10mb' })` | Extended parser = `qs` semantics (arrays/objects from query). |
| Query parsing | Express default (`qs`) | `?a[b]=c` → nested object; `?a[]=1&a[]=2` → array. |
| Route validation | `z.object({...}).parse(req.body)` inline in handlers | Fails → `ZodError` → 400 with `fieldErrors`. |
| Preprocessing | `sanitizedString()` / `optionalSanitizedString()` (`utils/sanitize.ts`) | Runs `sanitize-html` (`allowedTags: []`) then `.trim()`; strips HTML tags but **not** formula prefixes. |
| Tenant scoping | `tenantWhere` / `assertTenantOrgAccess` | See Phase 1D. |
| File uploads | multer memory storage + `assertAllowedUploadMime` | MIME allowlist; size limits centralized. |

**Key observation — type validation ≠ security validation.** Zod enforces shape/length but not sink safety. `z.string()` on a URL sink does not stop SSRF; `z.string().url()` (Zod 3) accepts any `URL` scheme including `javascript:`/`data:` (see INJ-06); `z.string()` on a CSV-bound field does not stop formula injection.

**Validation coverage is uneven between create and update paths and between sanitized and unsanitized string helpers** — see INJ-08/INJ-11. Registration uses `sanitizedString` for names; `UserProfileController.updateProfile` and `OrgPortalController` use plain `z.string()`.

---

## 4. Attacker-Controlled Source Inventory

| Source | Type | Validation | Normalization | Sink | Privilege | Persisted | Later consumer |
|---|---|---|---|---|---|---|---|
| `req.body` (JSON) | object | Zod per-route | varies | Prisma, S3, email, notification | any | yes | many |
| `req.query` | string **or object/array** (qs) | often none/partial | none | Prisma `where`, `take`, `skip` | any | no | direct |
| `req.params` | string | route-dependent | none | Prisma `where`, S3 key, audit `entityId` | any | yes (audit) | admin CSV |
| `req.path` / `req.originalUrl` | string | none | none | **AuditLog.entity** | **none** | yes | **admin CSV** |
| `req.ip` (via `X-Forwarded-For`) | string | none | none | **AuditLog.ipAddress** | **none** | yes | **admin CSV** |
| `req.headers` | string | none | none | user-agent → audit | any | yes | admin UI |
| `req.file` / multipart | buffer+meta | MIME allowlist, size | `sanitizeUploadFilename` | S3, local disk | auth | yes | download |
| `socket.handshake.*` | string | JWT verify | none | auth identity | auth | no | realtime |
| Webhook payloads (Stripe/PayTabs/LiveKit/WhatsApp) | object | signature (3 of 4) | JSON.parse | Prisma, payment state | **none for WhatsApp** | yes | many |
| AI service output | object | Zod schemas | none | care plan, notes, PDF | n/a (3rd party) | yes | UI, PDF, CSV |
| Google Maps response | object | ad-hoc | none | coordinates | n/a | yes | GPS |
| S3 object metadata | string | none | none | download disposition | n/a | yes | browser |
| DB values originally user-supplied | string | at write time | varies | email/notification/CSV/PDF | varies | yes | **second-order** |

**Second-order sources (persisted, consumed later):** user names, org names, booking `serviceType`/notes, chat content, care-plan titles/notes, AI draft text, `AuditLog.entity`/`entityId`, `req.ip`. These are the primary Phase-1E concern.

---

## 5. Dangerous Sink Inventory

| Sink | Present? | Reachable from attacker input? | Verdict |
|---|---|---|---|
| Raw SQL (`$queryRawUnsafe` etc.) | Test-only | No | **No SQLi** |
| Prisma dynamic `where`/`orderBy` keys | Partial | Object values yes, key names no | INJ-04 (operator injection) |
| `innerHTML`/`dangerouslySetInnerHTML`/`eval` | No | No | **No client code injection** |
| Markdown → HTML | Yes (`react-markdown`+`rehype-sanitize`) | Yes (AI/chat), sanitized | Safe |
| `child_process`/shell | No | No | **No RCE** |
| Filesystem (`fs.writeFileSync`/`readFileSync`) | Yes (intake/avatar) | Path guarded | Safe |
| S3 object key | Yes | Prefix-validated | Safe (non-admin) |
| Outbound HTTP (`axios`) | Yes | Fixed hosts only | **No SSRF** |
| `res.redirect` | Yes (1) | S3 signed URL | Safe |
| CSV writer | Yes | Formula not escaped | **INJ-01/02** |
| PDF (`pdfkit`) | Yes | Text-only, in-memory | Safe |
| Server template engine | No | No | **No SSTI** |
| `new RegExp` | 1 (fixed pattern) | No | No ReDoS |
| Email HTML | Yes | Unescaped names | INJ-07 |
| Notification title/body | Yes | Unescaped text | Rendered escaped (React) |

---

## 6. SQL / Prisma Injection

**Conclusion: no attacker-controlled raw SQL execution path was found.**

Global search:

```
git grep -nE '\$queryRaw|\$executeRaw|Prisma\.raw|Prisma\.sql|Prisma\.join|Prisma\.empty' milestone-5-fetched -- server/src
→ server/src/tests/helpers/db.ts:40  await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`)
```

The single hit is a **test helper** whose `t` iterates a hardcoded `tables` array; it is not reachable from any HTTP route and does not use request data. No `sequelize`/`knex`/`pg.query`/`.query()`/`.execute()` production sinks exist.

**Dynamic Prisma object construction** — see §7/INJ-04. Field names are always hardcoded; only *values* can be attacker-controlled, and via the `qs` parser some values can become operator objects.

**Determination:** attacker input never becomes SQL syntax or uncontrolled query *structure* at the key level. The residual is operator-object values (INJ-04), not string-concatenated SQL.

---

## 7. Object / Prototype / Query-Structure Injection

**Prototype pollution — FALSIFIED (not reachable).** `qs@6.15.3` is used by Express's extended query parser. Reproduced (VER-1E-03): `?__proto__[polluted]=yes` is dropped, `?constructor[prototype][x]=1` is preserved as a plain nested object but does **not** mutate `Object.prototype`. No `Object.assign(target, req.body)` or `{...req.body}` spread into a sensitive object was found. No `lodash` on the server. **Not a finding.**

**Query-operator object injection — LIKELY (INJ-04).** With extended `qs`, `?field[not]=x` and `?field[in][]=a` produce object values. Several controllers assign query values directly into Prisma `where` fields:

```ts
// AdminDocumentController.listPending
const { page='1', limit='20', type } = req.query as Record<string,string>;
if (type) where.type = type;            // ?type[not]=x → { not: 'x' } at runtime

// AuditService.getAll
if (userId) where.userId = userId;      // same shape risk
if (entity) where.entity = entity;
if (action) where.action = action;

// CareNeedController (provider branch)
if (serviceType) where.serviceType = serviceType;
// InvoiceController
if (status) where.status = status; if (type) where.type = type; if (clientId) where.clientId = clientId;
// ClientOfferController, CareEpisodeController(status), AssessmentController(status/episodeId) …
```

The TypeScript cast `as Record<string,string>` is **compile-time only** and does not coerce at runtime. Where the destination is a security filter (e.g. `where.clientId`, `where.status`), a crafted operator could broaden a filter. **However**, the affected endpoints are either admin-gated, or role-scoped such that the operator sits inside an already tenant-scoped predicate. The end-to-end blast radius could not be confirmed without a live database (the only differential available locally was "shape accepted vs connection refused"), hence **LIKELY**, not CONFIRMED. See §32 for the reproduction limits and §35 for the required runtime check.

**Mitigation precedent already present:** `TaskController` validates `status` against `validStatuses` before assignment; `AuditService` should do the same for `entity`/`action`.

---

## 8. Stored / Reflected / DOM XSS

**Conclusion: no exploitable XSS was found.**

Searches (all empty in production code):

```
git grep -nE 'dangerouslySetInnerHTML|innerHTML|document\.write|insertAdjacentHTML|createContextualFragment|eval\(|new Function' -- client/src   → (none)
git grep … -- server/src   → (none)
```

**Stored-XSS source tracing (all negative for execution):**

| Source | Rendered by | Context | Result |
|---|---|---|---|
| Chat message | React text node | HTML body | Escaped |
| Chat message (edit) | React text node | HTML body | Escaped (INJ-08 is a sanitization inconsistency only) |
| Intake free text | React text / inputs | HTML body | Escaped |
| Clinical note content | React text | HTML body | Escaped |
| Assessment findings | React text | HTML body | Escaped |
| Care-plan title/notes/goals | React text | HTML body | Escaped |
| Care-recipient/profile fields | React text | HTML body | Escaped |
| Organization / staff / service names | React text | HTML body | Escaped |
| Booking/session/GPS notes | React text | HTML body | Escaped |
| Voice/meeting titles | React text | HTML body | Escaped |
| Notification title/body | React text | HTML body | Escaped |
| AI output (Raiyah) | `react-markdown` + `rehype-sanitize` | HTML sanitized | Safe |
| Marketplace public content | React text | HTML body | Escaped |

**Markdown pipeline** (VER-confirmed): `react-markdown@9.0.1`, `remark-gfm`, `rehype-sanitize@6`, **no `rehype-raw`** → raw HTML in markdown is not rendered. `AIMeetPage`/`RaiyahPage` additionally run link `href` through `sanitizeHref` (http/https/`/`/`#`/`mailto`/`tel` only). No `rehype-raw` anywhere.

**Mobile WebView** — investigated and **falsified**: `LiveKitRoomWebView` builds inline HTML and interpolates `token` and `serverUrl` into a `<script>`. Both values are injected with `JSON.stringify()` (which does **not** escape `</script>`), so a `</script><script>…` breakout would be possible *if* either value contained that sequence. It cannot: `serverUrl` is `env.LIVEKIT_URL` (server env, same for all), and the LiveKit `token` is a JWT base64url alphabet that excludes `<` and `>`. Not a finding.

**CSP** (defense-in-depth): `defaultSrc 'self'`, `scriptSrc 'self'`, `objectSrc 'none'`, `frameAncestors 'none'`, `baseUri 'self'`, `formAction 'self'`, `imgSrc 'self' data: https:`. `styleSrc` allows `'unsafe-inline'` but `scriptSrc` does not — so even a hypothetical markup injection could not execute inline script.

---

## 9. URL & Scheme Injection

- **Client navigation sinks:** `window.location.href`/`assign` are fed by hardcoded paths (`/login`, `/verify-email...`) or server-provided same-origin URLs; `ErrorFallback.shouldRedirect` is only ever set to the constant `/login` (`domain.ts`). No attacker-controlled open redirect in the client.
- **`window.open`:** admin `DocumentsPage` opens `req.url || req.file_url` only when it `startsWith("http")` else prefixes the API base; these URLs are server-stored document paths, not arbitrary user input. `PaymentDetailPage` opens a constant Stripe URL.
- **Server `res.redirect`:** one occurrence, redirecting to an AWS SDK-signed URL (fixed bucket). Safe.
- **`z.string().url()` (Zod 3)** accepts `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `intent:` (reproduced, VER-1E-04). See **INJ-06** — the only field using it (`avatar`) renders into `<img src>`/RN `Image`, neither of which executes script.

---

## 10. SSRF

**Conclusion: no attacker-controlled backend HTTP destination exists.**

Outbound `axios` inventory (all server-side):

| Caller | Destination | Destination controlled by | Credentials attached | Verdict |
|---|---|---|---|---|
| `CurrencyConversionService` | `https://openexchangerates.org/...` | fixed | API key | Safe |
| `GPSService.geocodeAddress` | `https://maps.googleapis.com/maps/api/geocode/json` + `params:{address,key}` | fixed host; path params encoded | API key | Safe |
| `QatariPaymentService` | `env.PAYTABS_BASE_URL` | env | server key | Safe |
| `RiayahAiClient` | `env.AI_SERVICE_URL` (baseURL) | env | API key | Safe |
| `WhatsAppService` | `${env.WHATSAPP_BASE_URL}/...` | env | bearer | Safe |

- No user-controlled URL reaches `fetch`/`axios`/`got`/`http.request`.
- Google Maps input is passed via Axios `params` (URL-encoded), so address text cannot alter the host.
- `s3KeyFromRecordingUrl` parses a stored URL and extracts a **key** used against the app's own bucket — the destination bucket is never attacker-controlled (see INJ-12 for the substring-check nit).
- **Redirects:** Axios follows redirects by default, but since no attacker-controlled URL is requested, there is no redirect-based SSRF. No `file:`/`gopher:`/`dict:` protocol is ever passed to a client.
- **Metadata reachability:** with no arbitrary-destination fetch, `169.254.169.254` is unreachable through user input.

---

## 11. Command / Process Injection

**No server-side OS command execution sink was found.**

```
git grep -nE 'child_process|execSync|spawnSync|execFile|spawn\(' -- server/src client/src mobile | grep -v tests → (empty)
```

No ffmpeg/ImageMagick/LibreOffice/Chromium/wkhtmltopdf/PDF-tool invocation exists. PDFs are generated in-process by `pdfkit`; media is handled by LiveKit Egress via SDK calls, not shell. There is no `shell: true`, no filename-to-argv path, and no archive extraction.

---

## 12. File Upload Security

| Upload | Auth | Size | MIME allowlist | Magic bytes | Filename | Key | Disposition |
|---|---|---|---|---|---|---|---|
| General document (`/documents/upload`) | yes | 10 MB | PDF/Word/JPEG/PNG/WebP | via multer mimetype allowlist | `sanitizeUploadFilename` | `documents/{userId}/{uuid}-{name}` | `attachment` |
| Intake document | yes | 10 MB | same allowlist | client MIME (S3) / re-checked on download | `sanitizeUploadFilename` | `intake/{userId}/{uuid}-{name}`; one-time Redis token | `attachment`; prefix-validated |
| Chat attachment | yes (participant) | 10 MB | same allowlist | — | `sanitizeUploadFilename` | `chat/{convId}/{uuid}-{name}` | `attachment`; `isChatAttachmentKey` |
| Avatar | staff | 2 MB | JPEG/PNG/WebP | **magic-byte re-check on serving** | fixed `profile.{ext}` | `avatars/{userId}/profile.{ext}` | `inline` + `nosniff` |
| Voice recording | yes | 25 MB | audio allowlist | — | sanitized | `voice-recordings/...` | playback signed |
| Care-summary / invoice PDF | system-generated | — | — | — | server | server | see Phase 1D AUTHZ-01 |

**Findings:** upload MIME is validated from the client-declared type, but no executable upload path exists because (a) storage is S3 with `ContentDisposition: attachment` or a non-executing local store, (b) avatar serving re-verifies magic bytes and sets `nosniff`, and (c) there is no server-side parsing of uploads (no archive/office/media processing). **SVG is not on the allowlist**, so the classic stored-XSS-via-SVG vector is absent. No malware scanning exists (documented as a gap, not a Phase-1E injection finding).

---

## 13. Path Traversal / S3 Key Security

Reproduced (VER-1E-05): the intake, avatar, and chat key guards reject `..`, `/`, `\`, absolute keys, and percent-encoded traversal — both raw and once-decoded produce a `contains('..')` true → REJECTED. The chat download path `decodeURIComponent(fileName)` is followed by `isChatAttachmentKey` prefix + regex validation. Avatar serving applies a strict `^profile\.(jpg|jpeg|png|webp)$` allowlist **and** resolves/contains under the user dir. `dataExportCrypto` uses server-generated `exportRequest.id` (cuid), so `requestId` cannot traverse.

**No cross-user S3 key manipulation possible for non-admin** (consistent with Phase 1D's signed-URL finding). Admin `isAdmin` sign-any behaviour is a Phase 1D finding and is not duplicated.

---

## 14. CRLF / Header Injection

**Falsified at the runtime layer.** Reproduced (VER-1E-07): setting a header value containing `\r\n` throws `ERR_INVALID_CHAR: Invalid character in header content ["Content-Disposition"]` — Node rejects it before any response is written. Filename values reaching `Content-Disposition` are additionally `sanitizeUploadFilename`-ed (strips everything outside `[A-Za-z0-9._-]`). `res.redirect` targets are signed AWS URLs. No email-header fields are populated from user input (subject/from are constructed server-side; `familyName` only appears in the body). **No CRLF/header injection.**

---

## 15. Open Redirects

- **PayTabs return URL:** `InvoiceController` reads `req.body.returnUrl` but only accepts it when `isAllowedFrontendOrigin()` passes (scheme http/https, host must equal configured `FRONTEND_URL` host or be a localhost dev host). Otherwise it falls back to an env-based path. Not attacker-controllable to an arbitrary domain.
- **Stripe return:** `${env.FRONTEND_URL}/bookings/{id}` — fixed origin.
- **Client redirects:** hardcoded (`/login`, `/verify-email`). `ErrorFallback.shouldRedirect` is a constant.
- **`//evil.tld`, `https://trusted@evil`, backslash** variants are irrelevant because no user value reaches a redirect target. **No open redirect.**

---

## 16. Webhook Input Abuse

| Webhook | Signature | Raw body | Parser notes |
|---|---|---|---|
| Stripe (`/wallet/stripe/webhook`) | `constructEvent` + `STRIPE_WEBHOOK_SECRET` | `express.raw` | verified before use |
| PayTabs (`/wallet/paytabs/webhook`) | HMAC `PAYTABS_WEBHOOK_SECRET`, **required** (503 if unset) | raw buffer | JSON-or-form fallback; amount re-verified against invoice with 0.01 tolerance |
| LiveKit (`/livekit/webhook`) | `WebhookReceiver` with API key/secret | raw buffer (400 if not) | verified |
| WhatsApp (`/webhook/whatsapp`) | **none** | JSON | see INJ-10 |

**Type-confusion / parser notes:** PayTabs `hasWebhookSignature` reads `payload.signature` as a fallback source, but the signature is still HMAC-verified against the raw body; amount is validated (`Number(cart_amount)` vs `Number(invoice.total)`), so `-1`/`0`/huge/`NaN` do not silently fulfil. Stripe credits only the stored `topup.amount`, never a webhook-supplied amount. Duplicate JSON keys resolve to the last occurrence per `JSON.parse` semantics and cannot create a second field. Deep nesting is bounded by the 10 MB body limit; no schema recursion exists.

---

## 17. CSV / Spreadsheet Formula Injection

**Confirmed — see INJ-01, INJ-02, INJ-03.** Three CSV-producing paths:

1. **`GET /api/admin/audit-logs/export`** — manual CSV. Escaping is only `String(v).replace(/"/g,'""')`; cells beginning with `=`, `+`, `-`, `@` are preserved verbatim. The `entity`/`entityId` columns come from the request path (unauthenticated, see INJ-01); `ipAddress` comes from `req.ip` (attacker-controlled when `trust proxy` is set, INJ-03).
2. **`GET /api/admin/export/bookings`** — `csv-writer@1.6.0` (`createObjectCsvStringifier`). Reproduced (VER-1E-01): a value `"=HYPERLINK(""http://evil.example"",""click"")"` is emitted as a quoted-but-unprefixed formula, which spreadsheet applications interpret as a formula. Columns include `client_name`, `provider_name`, `service_type` — user-controlled.
3. **`GET /api/admin/export/users`** — same library; `name` column user-controlled.

**CSV quoting does not prevent formula injection** — quoting only protects delimiters. No apostrophe-prefixing, no leading-character filter exists anywhere in these paths. `sanitizePlainText` is applied to some names (registration) but **not** to booking `serviceType`, provider/client display names, or the audit `entity`/`ipAddress` columns, and `sanitize-html` does not touch `=`/`+`/`-`/`@` (VER-1E-02).

---

## 18. PDF / Document Generation

**No unsafe PDF generation.** `CareSummaryPDFService` and `InvoicePDFService` use `pdfkit@0.15` to write strings into an in-memory buffer, then upload to S3. There is **no HTML-to-PDF renderer** (no Puppeteer/Playwright/wkhtmltopdf/html-pdf on the server), so there is no remote-fetch/`file://`/SSRF surface in PDF generation. `pdfkit` `.text()` does not interpret HTML and does not fetch external resources. The client uses `jspdf` only in `client/src/demo/coordinator/pdf-export.ts`, entirely client-side. Filenames for downloads are `sanitizeUploadFilename`-generated server-side. (The permanent-public-URL issue is Phase 1D AUTHZ-01, not repeated here.)

---

## 19. Template Injection

**No server-side template engine exists.** Search for `ejs|pug|handlebars|mustache|nunjucks|liquid|eta|lodash.template` in `server/package.json` and `server/src` returns nothing. Emails are built with template literals (`EmailService.ts`), i.e. attacker strings are inserted as *values*, never evaluated as template source. No `render_template_string`/`Template()`-equivalent path.

---

## 20. ReDoS

**No ReDoS.** Only one runtime-constructed `RegExp` exists:

```ts
// realtimeRooms.ts — cookie extraction
new RegExp(`(?:^|;\\s*)${name}=([^;]*)`)   // name is a literal from ['token','__Host-token']
```

The pattern is a literal (no attacker-controlled fragment) and is linear. Reproduced (VER-1E-06): 200 k adversarial characters executed in **0.39 ms**; a second adversarial form in **1.86 ms**. All other regexes are fixed literals (`isValidAvatarUserId`, `isValidAvatarFilename`, `isValidIntakeFileKey`, `sanitizeUploadFilename`, `isPrivateLanHost`). No catastrophic backtracking.

---

## 21. Resource-Consumption Abuse

**INJ-05 (Medium/Likely): unbounded `take`.** Multiple list endpoints do `take: parseInt(limit)` with no upper clamp:

```
AdminDocumentController (listPending, listApproved) · AdminPayoutController · AdminProviderController (×3)
· InvoiceController · BookingExtrasController · ClientOfferController · CareEpisodeController
· MarketplaceOfferController.listPublic (PUBLIC) · ProviderBookingController (×2) · ProviderPayoutController
· ProviderReportController · CourseController.list (PUBLIC)
```

`GET /api/marketplace/offers?limit=100000000` is reachable **without authentication** and drives an unbounded `findMany` + a `count`. This is application-level resource consumption / third-party-cost amplification (each row hydrates a provider relation). Endpoints with a clamp (e.g. `TaskController` `min(...,100)`, `ChatMessageService` `min(...,100)`, `CareSummaryController` `min(...,200)`) show the intended pattern is simply not applied everywhere.

**Other limits that hold:** global `apiLimiter` (100/min/IP), `express.json` 10 MB, multer 10 MB/25 MB, AI timeout 90 s, upload size validated at presign. **Distinct from prior phases** because this is the specific amplification sink, not a generic rate-limiter note.

---

## 22. Parameter Pollution / Type Confusion

- **Duplicate params:** Express yields an **array** (`?page=1&page=999999` → `["1","999999"]`). `parseInt(["1","999999"])` coerces to `1` (first element), so pagination is not escalated that way, but `where.type = ["a","b"]` would reach Prisma as an array — a type-confusion primitive feeding INJ-04.
- **Array/object vs scalar:** confirmed reachable via qs (VER-1E-03): `?type[$ne]=x`, `?type[]=a&type[]=b`, `?limit[gt]=0`.
- **Numeric coercion:** `parseInt`/`Number` are used; `NaN`/negative values generally fall back via `|| default` (e.g. `Number(limit)||20`) on the clamped paths, but not on the unclamped `parseInt(limit)` paths.
- **No security decision** could be shown to flip from a duplicate/array parameter in the time available (auth/tenant predicates are applied separately); the residual risk is the Prisma operator injection of INJ-04.

---

## 23. JSON Parser / Prototype Abuse

`express.json` uses native `JSON.parse` with no reviver. `__proto__` in a JSON body is an ordinary own property (it does not pollute the prototype on parse). No merge/spread of request bodies into configuration objects was found. No `structuredClone`. **No prototype-pollution impact reachable** (confirmed by reproduction, §7).

---

## 24. AI Output as Untrusted Input

AI output (Riayah AI callback + Gemini) is treated as data:
- **Structured output is Zod-validated** (`carePlanDraftCallbackSchema`, `draftSchema`, `smartGoalSchema`, `plannedServiceSchema`, `riskFlagSchema`). Unknown top-level keys are stripped by `z.object` (the `draftSchema` is `.passthrough()`, but it only feeds typed fields).
- **Rendered as text** in the web UI (React escaping) or via sanitized markdown; **not** rendered as HTML.
- **Can it inject markup?** AI strings (goal `title`/`description`, `clinicalNotes`) are stored with `.min(1)`-type validation only, so they may contain `=`/`+`/HTML. They then flow to the UI (escaped), PDF (text), and potentially exports. No script execution path; see INJ-09.
- **Can it influence auth identifiers?** No — AI output never sets `userId`/`organizationId`/role.
- **Oversized responses:** bounded by the AI client timeout (90 s) and response slicing (`detail.slice(0,200)` in error paths); no explicit max-body cap on AI responses is configured (a hardening gap, not a finding).
- **Prompt injection is not classified as XSS** — and here it does not reach any unsafe interpreter.

---

## 25. Third-Party Response Trust

| Vendor | Schema-validated? | Values copied to DB | URLs trusted? | Notes |
|---|---|---|---|---|
| Stripe | SDK events | `intent.id` only; amount from stored topup | No | safe |
| PayTabs | ad-hoc field reads | `tran_ref`, `cart_id`, `payment_result.response_status`, amount re-verified | `redirect_url` used as navigation target | amount-checked |
| LiveKit | SDK `WebhookReceiver` + typed egress | `location` (recording key) | stored; key extracted & signed to own bucket | INJ-12 nit |
| Google Maps | ad-hoc `results[0].geometry.location` | lat/lng numbers | No | `typeof`/presence checked |
| Gemini / Riayah AI | Zod schemas | typed fields | No | safe |
| WhatsApp (outbound) | n/a | n/a | fixed host | — |
| SMTP | n/a | n/a | n/a | — |

Malformed third-party responses degrade gracefully (try/catch returning `null`), so they cannot drive injection. The one thing to watch is PayTabs `redirect_url` — it is used as a client navigation target, but it is the payment gateway's own hosted-checkout URL and is not reflected back into an HTML/JS sink.

---

## 26. Error / Information Disclosure

The global `errorHandler` returns `{ message: 'Internal server error.' }` for unknown errors in production and never serialises stacks. `ZodError` → 400 with `fieldErrors` (safe, no values echoed beyond field names). `AppError` returns its message (operational). `notFound` echoes `req.originalUrl` in the 404 message — this is reflected into a JSON body, not HTML, and the client renders it escaped (no XSS). Prisma errors are caught and mapped to operational messages in the main paths; the default branch returns a generic 500. **No sensitive stack/SQL/path disclosure driven by malformed input was found.**

---

## 27. Client vs Server Validation

| Decision | Client-enforced | Server-enforced |
|---|---|---|
| Max lengths | yes (forms) | Zod `.max` on most; **missing on some names/org fields** (INJ-11) |
| Allowed enums | yes | Zod `.enum` on most; `status`/`type` string fields not always enum-checked (INJ-04) |
| File type | yes | MIME allowlist + magic re-check (avatar) |
| Amounts | yes | PayTabs amount re-verified vs invoice |
| GPS bounds | yes | partial (`pairFromLatLng` validation) |
| URL scheme (avatar) | yes | **`z.string().url()` accepts any scheme** (INJ-06) |
| `expiresIn` | yes | **no clamp** (Phase 1D AUTHZ-08a) |

Conclusion: critical decisions (auth, tenant, amount) are server-side. The gaps are in length/enum/scheme enforcement, which map to the INJ findings.

---

## 28. Abuse Cases

**Unauthenticated attacker:** can write arbitrary `AuditLog.entity`/`entityId` via any mutating method to any path (INJ-01/INJ-03); can query public marketplace/course lists with unbounded `limit` (INJ-05); can forge WhatsApp webhook payloads (INJ-10); can query `?field[not]=` operator shapes on unauthenticated/public filter endpoints (INJ-04).

**Family user:** can set unsanitized display name (INJ-11) that renders into coordinator emails (INJ-07); bookings carry `serviceType`/notes into admin CSV (INJ-02).

**Clinician:** clinical-note content is escaped everywhere and immutable; no injection.

**Coordinator:** care-plan title/notes escaped; AI drafts escaped; no injection.

**Support worker:** GPS/visit notes escaped; no injection.

**Org admin:** staff/coordinator names unsanitized → org emails (INJ-07); org-scoped list filters expose INJ-04 shapes.

**Platform admin:** downloads CSVs that can contain attacker formulas (INJ-01/02/03); sign-any S3 key (Phase 1D); export endpoints unscoped (Phase 1D).

**External vendor / manipulated response:** signature-verified webhooks (3 of 4); malformed responses degrade to null; WhatsApp has no signature (INJ-10).

---

## 29. Attack Trees

### AT-INJ-01 — Execute attacker-controlled JavaScript in a privileged browser
```
Compromise privileged browser
├── Stored XSS via chat/notes/plans ............ ✗ React escaping, no HTML sink
├── Markdown → HTML ............................ ✗ rehype-sanitize, no rehype-raw
├── SVG/HTML upload → inline render ............ ✗ SVG not allowlisted; attachment disposition
├── PDF link/javascript ....................... ✗ pdfkit text-only, no remote fetch
├── AI-generated markup ....................... ✗ escaped text / sanitized markdown
├── Notification rendering ..................... ✗ escaped text
└── Admin/report rendering ..................... ✗ escaped text
=> No viable branch. VERDICT: not exploitable.
```

### AT-INJ-02 — Reach internal infrastructure through SSRF
```
SSRF to internal/cloud metadata
├── Direct URL parameter ....................... ✗ no user-controlled URL to HTTP client
├── Redirect-based SSRF ........................ ✗ no attacker-controlled initial URL
├── DNS rebinding .............................. ✗ destination host fixed
├── Image/PDF remote fetch ..................... ✗ pdfkit in-memory; uploads not fetched
└── Third-party callback config ................ ✗ webhook URLs are env/server-generated
=> No viable branch. VERDICT: not reachable.
```

### AT-INJ-03 — Manipulate backend/database interpretation
```
Alter query interpretation
├── SQL string injection ....................... ✗ no raw SQL reachable
├── Prisma dynamic key names ................... ✗ keys hardcoded
├── Operator object via qs ..................... △ INJ-04 (Medium/Likely) — bounded by tenant/role scoping
├── Prototype pollution ........................ ✗ qs 6.15.3; no merge sink
└── Parser/type confusion ...................... △ feeds INJ-04
=> One partially-reachable branch (operator injection), no SQLi.
```

### AT-INJ-04 — Execute or alter server-side file/process behaviour
```
Server-side code execution / file manipulation
├── Filename/path traversal .................... ✗ guards + decode checks hold
├── Command arguments / shell .................. ✗ no process execution
├── PDF converter gadgets ...................... ✗ no HTML renderer
├── Media tooling (ffmpeg) ..................... ✗ not present server-side
└── Archive processing ......................... ✗ no archive handling
=> No viable branch. VERDICT: not reachable.
```

### AT-INJ-05 — Compromise a privileged analyst through exported artifacts
```
Attacker → privileged analyst
├── CSV formula in audit ENTITY column ......... ✓ INJ-01 (unauthenticated, HIGH)
├── CSV formula in booking/user exports ........ ✓ INJ-02 (Medium)
├── CSV formula via spoofed IP column .......... ✓ INJ-03 (Medium)
├── PDF active content / hyperlinks ............ ✗ text-only
└── Email HTML injection ....................... △ INJ-07 (Low; client-dependent)
=> Primary viable branch. This is the report's release blocker.
   Impact: formula interpretation → data exfiltration / phishing / external requests;
   higher-impact formula/DDE behaviour depends on the spreadsheet application/version
   and its remote-content / DDE security configuration.
```

### AT-INJ-06 — Exhaust application or third-party resources
```
Resource exhaustion
├── Huge JSON body ............................. ✗ 10 MB cap
├── Unbounded list `take` ...................... ✓ INJ-05 (incl. public endpoint)
├── Upload abuse ............................... ✗ size caps + rate limiters
├── Geocoding amplification .................... ✗ not reachable from public input
├── AI cost amplification ...................... ✗ auth + aiLimiter + 90 s timeout
├── PDF generation ............................. ✗ auth-gated, per-episode
└── ReDoS ...................................... ✗ linear patterns
=> One viable branch (unbounded pagination). VERDICT: bounded/Medium.
```

---

## 30. Source → Sink Attack Paths

**INJ-01 (confirmed):**
```
Attacker role: unauthenticated
Input: HTTP request path, e.g. POST /api/=HYPERLINK("http://evil.example","x")
Endpoint: any path under /api (auditMiddleware runs before routes)
Source: req.path
Validation: none (auditMiddleware has no schema)
Transformation: resolveEntity() splits path on '/' and title-cases the first non-admin segment
Sink: prisma.auditLog.create({ entity })
Then: GET /api/admin/audit-logs/export → manual CSV quoting only
Why controls fail: audit logging is unauthenticated and status-agnostic; CSV writer escapes quotes, not formulas
Impact: formula interpretation in the analyst's spreadsheet (data exfiltration / phishing / external requests; higher-impact formula/DDE behaviour depends on the spreadsheet stack and its security settings)
Cross-tenant: no
Victim interaction: download + open the CSV
Persistent: yes (DB row)
Preconditions: admin exports audit logs
Confidence: High (reproduced end-to-end, VER-1E-08)
```

**INJ-04 (likely):**
```
Attacker role: any authenticated user (and unauthenticated on public list endpoints)
Input: ?status[not]=x / ?type[in][]=a / ?clientId[contains]=...
Endpoint: admin document/payout/provider lists, invoice list, care-need list, client offers, episodes
Source: req.query (qs extended)
Validation: TypeScript cast only
Transformation: direct assignment into prisma `where`
Sink: prisma.*.findMany({ where })
Why controls fail: no runtime scalar coercion; where security filters are object-shaped
Impact: filter broadening within an already-applied tenant/role scope (worst case: broader reads than intended)
Confidence: LIKELY (needs a DB to demonstrate; §35)
```

---

## 31. Findings

### INJ-01 — Unauthenticated formula injection into the admin audit-log CSV export

**Severity:** High
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-1236 (CSV Formula Injection), CWE-20
**OWASP:** A03 Injection

**Affected components**
- `server/src/middleware/auditMiddleware.ts` (`resolveEntity`, `resolveEntityId`)
- `server/src/services/AuditService.ts:logHttpMutation`
- `server/src/routes/admin.routes.ts:131` (`/audit-logs/export`)

**Attacker role**
Unauthenticated.

**Description**
`auditMiddleware` is mounted at `routes/index.ts:68`, **before** all route families, and logs every `POST/PUT/PATCH/DELETE` to any `/api` path with no authentication and no status-code filter. `resolveEntity` derives the audit `entity` column from `req.path` verbatim (title-cased). `resolveEntityId` reads `req.params.id`. Both values are persisted and later emitted by the admin CSV export, which only escapes double quotes.

**Source**
`req.path` / `req.params` (request line).

**Validation / transformation path**
None. `resolveEntity` → `segments.find(...)` → `.split('-').map(titleCase).join('')`.

**Sink**
`GET /api/admin/audit-logs/export` → `rows.map(v => \`"${String(v).replace(/"/g,'""')}"\`)` → `text/csv`.

**Evidence**
```ts
// auditMiddleware.ts
router.use(auditMiddleware);   // routes/index.ts:68 — before all routes, no auth
res.on('finish', () => { ... AuditService.logHttpMutation({ entity: resolveEntity(req), ... }) });

// routes/admin.routes.ts
const rows = logs.map((log) => [log.id, log.userId ?? '', log.action, log.entity ?? '', log.entityId ?? '', log.ipAddress ?? '', ...]
  .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
```

**Attack path**
1. Attacker sends `POST /api/=HYPERLINK("http://evil.example","click")` (unauthenticated; 404 or any status).
2. `auditMiddleware` writes `AuditLog.entity = '=HYPERLINK("http:'` and, when a route id is present, `entityId` from `req.params`.
3. Admin opens Audit Logs and clicks Export.
4. The CSV cell begins with `=` and is interpreted as a formula by the spreadsheet.

**Reproduction**
```
POST /api/=HYPERLINK("http://evil","x") HTTP/1.1   (raw TCP, no auth)
→ 404, and audit row written with entity = '=HYPERLINK("http:', entityId = undefined
```

**Column-trigger matrix (adversarial pass).** `resolveEntity` does `resource.split('-').map(titleCase).join('')`, so a **leading hyphen is consumed** in the `entity` column. The other three spreadsheet triggers survive in `entity`, and **all four** survive in `entityId` (from `req.params.id`, not split) and `ipAddress` (from `req.ip`, not split):

| Trigger | `entity` (path, split on `-`) | `entityId` (param, not split) | `ipAddress` (XFF, not split) |
|---|---|---|---|
| `=` | `=HYPERLINK(x)` ✅ | `=1+1` ✅ | ✅ |
| `+` | `+SUM(1)` ✅ | `+1+1` ✅ | ✅ |
| `@` | `@cmd` ✅ | `@1+1` ✅ | ✅ |
| `-` | `2+3` ❌ (consumed) | `-1+1` ✅ | ✅ |

So even though the `entity` column does not preserve a leading `-`, the payload class is fully reachable via `=`/`+`/`@` in `entity`, and via all four triggers in `entityId`/`ipAddress`.

**Preconditions**
Admin exports audit logs (routine).

**Security impact**
Formula interpretation in the analyst's spreadsheet can enable **data exfiltration, phishing, external requests, and — depending on spreadsheet application/version/security configuration — higher-impact formula/DDE behaviour**. Because the write path is unauthenticated, any internet client can plant payloads. Impact severity therefore depends on the recipient's spreadsheet stack and its remote-content/DDE settings; the persistence and unauthenticated reachability are unconditional.

**Tenant / PHI impact**
No PHI is read by the attacker, but the exported CSV itself contains audit metadata (user IDs, actions, IPs) that a formula can exfiltrate.

**Existing controls**
`requireView('user')` on the export; nothing on the write path; no formula escaping.

**Adversarial verification / falsification attempt**
Checked whether a status filter exists (none); whether auth is required to write the audit row (none); whether the CSV writer escapes formulas (only quotes); whether the `entity` derivation can be influenced (yes, raw path); reproduced the write with a raw TCP request and confirmed the exact stored string.

**Why the issue remains**
The export applies quoting, which protects delimiters but not formulas, and the write side has no validation by design.

**Recommendation**
Escape formula-leading cells at export time in every CSV producer: if the first non-whitespace character is `=`, `+`, `-`, `@`, tab, or CR, prefix a single quote (`'`) and/or wrap the value. Also bound `entity`/`entityId` to known values (map unknown paths to a constant) and consider requiring authentication before writing audit rows for unmatched routes.

**Retest procedure**
Send an unauthenticated mutating request with a path starting `=`; export audit logs; assert the CSV cell is prefixed/quoted so no spreadsheet evaluates it.

---

### INJ-02 — Formula injection from user-controlled fields in booking and user CSV exports

**Severity:** Medium
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-1236
**OWASP:** A03

**Affected components**
- `server/src/controllers/admin/AdvancedAdminController.ts` (`exportBookings`, `exportUsers`)

**Attacker role**
Any authenticated user who can influence a booking or a profile display name.

**Description**
Both exports use `csv-writer@1.6.0`, which quotes but does not prefix formula-leading values. Exported columns include `client_name`, `provider_name`, `service_type`, and user `name` — all user-controlled. `serviceType` is `z.string()` with no format constraint (e.g. a booking created with any string), and `sanitizePlainText` (where applied) does not remove `=`/`+`/`-`/`@`.

**Source** `req.body.serviceType` / profile `name`.

**Validation / transformation path** Zod `.string()` (or `sanitizedString` for registration) → DB → export mapper.

**Sink** `createObjectCsvStringifier(...).stringifyRecords(...)`.

**Evidence**
```
Reproduced with the installed csv-writer:
input  = '=HYPERLINK("http://evil.example","click")'
output = "=HYPERLINK(""http://evil.example"",""click"")"   ← still a formula
```

**Attack path**
1. Attacker creates a booking with `serviceType = '=cmd|\\' /C calc\\'!A0'` (or sets a display name).
2. Admin exports bookings/users.
3. The spreadsheet interprets the cell as a formula.

**Preconditions** Admin exports; attacker has a booking/profile.

**Security impact** Formula interpretation in the analyst's spreadsheet (same class as INJ-01, narrower reach; impact depends on the spreadsheet stack and its security configuration).

**Tenant / PHI impact** The export contains names/emails; a formula can exfiltrate them.

**Existing controls** `requireView('booking'|'user')`; JSON response only if not exported.

**Adversarial verification** Confirmed `csv-writer` output preserves the formula; confirmed `sanitize-html` leaves formula prefixes; confirmed booking `serviceType` accepts arbitrary strings (booking.routes.ts create).

**Why the issue remains** No export-time formula escaping.

**Recommendation** Centralise CSV cell encoding in one helper and use it for all three exports: prefix `'` when the first non-whitespace char is `= + - @ \t \r`. Alternatively constrain `serviceType` to an enum.

**Retest procedure** Create a booking with a `=`-prefixed serviceType; export as admin; assert the cell is neutralised.

---

### INJ-03 — Audit IP column stores raw `X-Forwarded-For` and is exported unescaped

**Severity:** Medium
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-1236, CWE-20
**OWASP:** A03

**Affected components**
- `server/src/services/AuditService.ts` (`ipAddress: req.ip`)
- `server/src/middleware/requestLogger.ts`
- `server/src/routes/admin.routes.ts:131`

**Attacker role**
Unauthenticated (for writes) / any (for log noise).

**Description**
With `app.set('trust proxy', 1)` (production), Express takes the **leftmost** `X-Forwarded-For` value as `req.ip`. When the client can send XFF directly (or the proxy appends rather than overwrites), the stored value is an arbitrary attacker string, not an IP. It is then written to `AuditLog.ipAddress` and exported in the CSV with no formula escaping.

**Source** `X-Forwarded-For` header.

**Validation / transformation path** none — `req.ip` is stored verbatim.

**Sink** `audit-logs/export` CSV `ipAddress` column.

**Evidence**
```
Reproduced with the app's express@4.22.2 (trust proxy = 1):
X-Forwarded-For: "=cmd|' /C calc'!A0"   → req.ip === "=cmd|' /C calc'!A0"
X-Forwarded-For: "+SUM(1+1)"             → req.ip === "+SUM(1+1)"
X-Forwarded-For: "javascript:alert(1)"   → req.ip === "javascript:alert(1)"
```

**Attack path**
1. Attacker sends any mutating request with a formula-shaped XFF and crafted path.
2. Audit row stores the payload as both `entity` and `ipAddress`.
3. Admin exports → formula in a second column.

**Preconditions** `trust proxy` enabled with a hop count that leaves a client-supplied value leftmost (the configured default of 1 means the value immediately to the left of the proxy is trusted).

**Security impact** Same spreadsheet-execution class plus audit-integrity loss (IP column is unreliable).

**Existing controls** `trust proxy` is needed for correct rate-limit IPs; no validation of the stored value.

**Adversarial verification** Reproduced with the exact trust-proxy setting; confirmed the raw string reaches `req.ip`; confirmed audit export column order includes `ipAddress`.

**Why the issue remains** `req.ip` is trusted as a network identity without validating it is an IP.

**Recommendation** Validate/discard non-IP `req.ip` before storing (e.g. accept only well-formed IPv4/IPv6, else store `null` or the socket address); and apply the CSV formula guard (INJ-01) to the IP column. Document the required `TRUST_PROXY_HOPS` for the actual deployment topology.

**Retest procedure** Send a mutating request with `X-Forwarded-For: =1+1`; assert the stored/exported value is not formula-evaluable.

---

### INJ-04 — Prisma query-operator injection via the extended query parser

**Severity:** Medium
**Confidence:** Medium
**Status:** LIKELY
**CWE:** CWE-915 / CWE-20
**OWASP:** API3 (mass assignment / excessive data exposure-adjacent)

**Affected components**
`AdminDocumentController`, `AdminPayoutController`, `AdminProviderController`, `InvoiceController`, `ClientOfferController`, `CareEpisodeController`, `AssessmentController`, `CareNeedController`, `AuditService.getAll`.

**Attacker role** Any authenticated user; unauthenticated on public lists.

**Description**
Express's default query parser (`qs` extended) turns `?type[not]=x`, `?status[in][]=a`, `?clientId[contains]=…` into objects. Controllers cast `req.query as Record<string,string>` (compile-time only) and assign values directly into Prisma `where` fields. Prisma accepts operator objects on scalar fields, so an attacker can supply a *different predicate* than intended.

**Source** `req.query`.

**Validation / transformation path** none (TS cast does not coerce).

**Sink** `prisma.*.findMany({ where })`.

**Evidence**
```
Reproduced with the app's qs@6.15.3:
?type[not]=invoice     → { type: { not: 'invoice' } }
?type[]=a&type[]=b     → { type: ['a','b'] }
?limit[gt]=0           → { limit: { gt: '0' } }

Code pattern (AdminDocumentController):
const { type } = req.query as Record<string,string>;
if (type) where.type = type;      // runtime value may be an operator object
```

**Runtime verification limit (important).** Prisma Client validates the query **against the schema after establishing a database connection**, so in a no-DB environment a malformed query is indistinguishable from a valid one. Reproduced: with no reachable DB, *all* of `{type:{not:'x'}}`, `{type:{bogusOperatorXYZ:1}}`, `{type:'x'}`, and `{bogusFieldXYZ:'x'}` return the identical `Can't reach database server` error. Therefore the earlier hypothesis "the client accepts the operator shape (no validation error)" **could not be substantiated and is withdrawn** — an accepted shape and a rejected shape look the same without a DB. The finding rests on the *code pattern* (raw query value → Prisma `where` field) plus the `qs` behaviour, not on a demonstrated broadened result set. Status is **LIKELY** for exactly this reason.

**Attack path**
1. Attacker requests `GET /api/admin/documents/pending?type[not]=invoice` (admin) or a scoped list endpoint with `?status[not]=…`.
2. If Prisma accepts the object as an operator on that field, the filter broadens.
3. Response reveals rows that the intended scalar equality would have excluded.

**Preconditions** A filter endpoint assigns a query value into a `where` field without scalar coercion; the field must accept the operator (Prisma scalar fields generally do); any surrounding tenant/role predicate still applies, which limits blast radius.

**Security impact** Potential broader-than-intended reads within an existing role/tenant scope; possible filter bypass on role-scoped lists. **Not** SQL injection and **not** a cross-tenant break by itself.

**Existing controls** Role/tenant predicates applied around the filter; admin gating on most affected endpoints; `TaskController` validates `status` against an enum (good precedent).

**Adversarial verification / falsification attempt**
Attempted to demonstrate the operator reaching Prisma with a broadened result. **Failed to obtain any differential**: without a reachable database, valid operators, invalid operators, valid fields, and bogus fields all surface the same connection error, so the "shape accepted" hypothesis is unprovable locally and was withdrawn. Attempted to find a case where this flips a security decision (auth/tenant): none found — the operator sits *inside* already-applied scoping. Confirmed the `qs` object shapes and the un-coerced assignment by reproduction. **Therefore kept at LIKELY**, pending a DB-backed demonstration (§35).

**Why the issue remains** Runtime values are not coerced to scalars, and the qs parser is not restricted.

**Recommendation** Either set `app.set('query parser', 'simple')` (rejects bracket syntax) or coerce/validate every query value with Zod (`z.coerce.string()` / `z.string()`), and never assign a raw query value into a Prisma `where` without a scalar schema. For enum filters, validate against the allowed set (as `TaskController` already does).

**Retest procedure** Against a test DB, call an affected endpoint with `?status[not]=<value>` and confirm the result set is identical to the invalid-input baseline (rejected) rather than broadened.

---

### INJ-05 — Unbounded pagination `take` on list endpoints (including a public endpoint)

**Severity:** Medium
**Confidence:** High (mechanics) / deployment-dependent (amplification)
**Status:** LIKELY
**CWE:** CWE-400
**OWASP:** API4 (Unrestricted Resource Consumption)

**Affected components** ~16 controllers; notably `MarketplaceOfferController.listPublic` and `CourseController.list` (public), `AdminDocumentController`, `AdminPayoutController`, `AdminProviderController`, `InvoiceController`, `BookingExtrasController`, `ClientOfferController`, `CareEpisodeController`, `ProviderBookingController`, `ProviderPayoutController`, `ProviderReportController`.

**Attacker role** Unauthenticated on public lists; authenticated elsewhere.

**Description** `const { limit = '20' } = req.query as Record<string,string>; take: parseInt(limit)` with no upper clamp. A request with `?limit=100000000` drives an unbounded `findMany` (and a `count`) with relation hydration.

**Source** `req.query.limit`.

**Validation / transformation path** `parseInt` only.

**Sink** `prisma.*.findMany({ take })` + `count`.

**Evidence**
```
MarketplaceOfferController.listPublic:
const { page='1', limit='20', ... } = req.query as Record<string,string>;
prisma.providerMarketplaceOffer.findMany({ where, skip, take: parseInt(limit),
  include: { provider: { select: { id, name, providerProfileExt: { averageRating, bio } } } } });
// route: GET /api/marketplace/offers  — public (no authenticate)
```

**Attack path** 1. Attacker calls the public offers endpoint with `limit=100000000`. 2. Server loads/serialises an enormous result set. 3. Repeated across the global rate-limit window.

**Preconditions** none beyond the public route.

**Security impact** Application-level DoS / memory-CPU pressure / response-size amplification. The global `apiLimiter` (100/min/IP) bounds request count but not per-request cost.

**Existing controls** `apiLimiter`; clamped limits exist on several sibling endpoints (`TaskController` ≤100, `ChatMessageService` ≤100, `CareSummary` ≤200).

**Adversarial verification** Confirmed the unclamped `take` in the pinned source and that `/marketplace/offers` has no `authenticate`; did **not** execute against a live DB (would be DoS). Confirmed the clamped sibling pattern shows the fix is intended but inconsistently applied.

**Why the issue remains** Clamping was applied ad hoc rather than centrally.

**Recommendation** Add a shared `parsePagination(req)` helper that clamps `limit` to a global maximum (e.g. 100) and `page` to ≥1, and use it in every list controller. Add a hard `maxTake` constant.

**Retest procedure** Call each list endpoint with `limit=1000000`; assert the effective `take` is clamped.

---

### INJ-06 — `z.string().url()` accepts dangerous URL schemes for the avatar field

**Severity:** Low
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-20
**OWASP:** A03

**Affected components** `server/src/controllers/users/UserProfileController.ts` (`avatar: z.string().url()`).

**Attacker role** Any authenticated user updating their own profile.

**Description** Zod 3's `.url()` validates that a string parses as a `URL`, not that the scheme is safe. `javascript:`, `data:`, `file:`, `blob:`, `vbscript:`, `intent:` all pass.

**Source** `req.body.avatar`.

**Validation / transformation path** `z.string().url()` → stored on `User.avatar`.

**Sink** Client `<img src={avatar}>` and mobile RN `<Image source={{uri}}>`. `resolveMediaUrl` additionally passes `data:` through.

**Evidence**
```
Reproduced with zod@3.25.76:
'javascript:alert(1)'              → passes .url()
'data:text/html,<script>...'       → passes
'file:///etc/passwd'               → passes
'vbscript:msgbox(1)'               → passes
```

**Attack path** Attacker sets `avatar` to a `javascript:`/`data:` URL; it renders as an image source (no script execution in modern browsers or RN Image).

**Preconditions** The value must reach an executable context. It does not: `<img src>` does not execute `javascript:`; RN `Image` only fetches images.

**Security impact** Low — currently no execution sink. Risk materialises only if the value is later reused in a navigation (`href`/`window.open`) or server-side fetch context.

**Existing controls** `resolveMediaUrl` allows only http/https/blob/data and prefixes relative paths; no scheme allowlist on write.

**Adversarial verification** Traced every render site for `avatar`; none places it in `href`/`window.open`/iframe/CSS context. Confirmed `<img src>` inert for these schemes. **Kept as Low** (validation hardening), not raised to a live XSS.

**Recommendation** Replace with an explicit allowlist: `z.string().url().refine(u => /^https?:$/.test(new URL(u).protocol))`, or require a relative `/api/avatars/...` path.

**Retest procedure** Attempt to save `javascript:alert(1)` as avatar; expect 400.

---

### INJ-07 — HTML injection into transactional emails via unsanitized profile/organization names

**Severity:** Low
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-79 (context: email HTML)
**OWASP:** A03

**Affected components** `server/src/services/EmailService.ts` (`sendFamilyOrgAssigned`, `sendCoordinatorFamilyAssigned`), callers in `AdminFamilyController`/`OrgPortalController`; `UserProfileController.updateProfile` (`name: z.string().min(2)`).

**Attacker role** A family user (own `name`) or an org admin (staff/coordinator `name`).

**Description** Email bodies interpolate names with template literals and **no HTML escaping** (`<p>Hello ${data.name}</p>`). Registration names pass `sanitizedString` (strips tags), but `updateProfile` and org create/update use plain `z.string()`, so `<b>`, `<img>`, links survive into the email HTML.

**Source** `User.name`, org/staff names.

**Validation / transformation path** `z.string().min(2)` (no tag stripping) → DB → template literal.

**Sink** Email HTML.

**Evidence**
```
// EmailService.ts
`<p>Hello ${data.name},</p>`
`<p>Your account has been linked to <strong>${data.organizationName}</strong>.</p>`
`<p>Organization: <strong>${data.organizationName}</strong>`
// UserProfileController: name: z.string().min(2).optional()   ← not sanitizedString
```

**Attack path** 1. Family user sets name to `<img src="https://attacker/pixel?u=x">` or a spoofed link. 2. Coordinator is assigned → email renders the markup. 3. Tracking / phishing content displays.

**Preconditions** Email client that renders remote images/HTML (common in corporate webmail).

**Security impact** Low–Medium: HTML/markup injection into a trusted transactional email (tracking, phishing framing, layout spoofing). Script execution is generally neutralised by mail clients; no browser-session compromise.

**Existing controls** Registration uses `sanitizedString`; email transport requires TLS; subject/from are server-constructed.

**Adversarial verification** Confirmed `EmailService` has no `escapeHtml`; confirmed `updateProfile`/org schemas are not sanitized; confirmed the values are user-writable and flow to the coordinator email.

**Why the issue remains** Inconsistent use of `sanitizedString`; no HTML-escape on the email template layer.

**Recommendation** Escape all interpolated values in email templates (an `escapeHtml()` helper applied to every `${...}`), and use `sanitizedString` for all display-name schemas including `updateProfile` and org staff.

**Retest procedure** Set a name containing `<b>`; trigger the assignment email; assert the tag is escaped in the rendered body.

---

### INJ-08 — Chat message edit stores unsanitized content (inconsistent with send)

**Severity:** Low
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-20 (inconsistent sanitization)

**Affected components** `server/src/controllers/chat/ChatController.ts:editMessage`.

**Attacker role** Message author.

**Description** `send` runs `sanitizePlainText(content)`; `editMessage` stores `z.object({content: z.string()}).parse(req.body)` directly, so an edited message can retain HTML markup that a sent message could not.

**Source** `req.body.content` on `PATCH /chat/messages/:id`.

**Sink** `prisma.message.update({ data: { content } })`, later rendered (escaped) in the UI.

**Evidence**
```ts
static async editMessage(req, res) {
  const { content } = z.object({ content: z.string() }).parse(req.body);   // no sanitizePlainText
  ...
  data: { content, editedAt: new Date() },
}
// vs send: const text = opts.content ? sanitizePlainText(opts.content) : '';
```

**Security impact** **No XSS** (React escapes text nodes). The consequence is stored inconsistency and a latent hazard if the rendering context ever changes.

**Adversarial verification** Confirmed the React renderer escapes; confirmed no `dangerouslySetInnerHTML`; therefore no execution. Kept Low.

**Recommendation** Apply `sanitizePlainText` in `editMessage` (and any other mutation path) exactly as `send` does.

**Retest procedure** Edit a message to include `<b>x</b>`; assert the stored content is stripped.

---

### INJ-09 — AI-generated care-plan text stored with type-only validation

**Severity:** Low
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-20

**Affected components** `server/src/services/AiCarePlanDraftService.ts` (draft schemas), `CarePlanDraftCallbackController`.

**Attacker role** Third-party/malformed AI service (or a coordinator triggering a draft).

**Description** AI output fields (`title`, `description`, `notes`, `serviceType`, `evidence`, `recommendedAction`) are validated by type/length but not sanitized. They flow into the UI (escaped), PDF (text), and potentially CSV. Treated as untrusted input per §24.

**Source** AI callback body.

**Sink** `carePlan`/goal/item rows; rendered escaped; PDF text.

**Security impact** **No execution** — no HTML/CSV/PDF interpreter misuse confirmed. Latent second-order hazard if AI text ever reaches a CSV or an unescaped email/HTML template.

**Adversarial verification** Traced AI strings to UI (React escaping) and PDF (`pdfkit` text); confirmed sanitized markdown path for chat-style AI; no CSV/HTML sink today.

**Recommendation** Apply `sanitizePlainText` to AI-provided free text at persistence, and include AI-derived fields in the export-formula guard if they ever enter CSV.

---

### INJ-10 — WhatsApp webhook has no signature verification; forged payloads create records

**Severity:** Medium
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-345 (Insufficient Verification of Data Authenticity)
**OWASP:** API10 (Unsafe Consumption of APIs)

**Affected components** `server/src/routes/whatsapp.routes.ts` (POST `/webhook/whatsapp`), `WhatsAppBookingFlowService`.

**Attacker role** Unauthenticated.

**Description** The POST webhook processes attacker-supplied JSON into data mutations with **no authenticity check of any kind** (no `X-Hub-Signature-256`, no HMAC, no shared secret). The root control gap — the missing signature — was already identified in **Phase 1A** (which recorded `⚠️ no signature check in code`); Phase 1E's contribution is the **concrete integrity consequence**: a forged body drives `WhatsAppBookingFlowService`'s state machine into creating `booking` rows and `emergencyRequest` rows and persisting attacker-supplied `content`/`metadata` on `whatsAppMessage` — for any phone number whose last-9 digits match an existing user. This is a real unauthenticated write primitive, not merely a control observation, which is why it is classified **Medium/CONFIRMED** here rather than left informational.

**Source** `req.body.entry[0].changes[0].value.messages[0]`.

**Validation / transformation path** none. `phone` is matched against users by last-9-digit suffix; a matched user is required to progress beyond the welcome message. Message `text` is otherwise unvalidated.

**Sink** `prisma.booking.create`, `prisma.emergencyRequest.create`, `prisma.whatsAppMessage.create`.

**Attack path**
1. Attacker sends a forged Meta-shaped POST to `/api/webhook/whatsapp` with `from` set to a target's phone number.
2. If the phone matches a user (last-9 digits), the bot state machine proceeds (`book` → service → date → provider → `yes`).
3. A `booking` row is created under the victim's `clientId`; `confirm`/`emergency` branches create `emergencyRequest` rows; message content is stored.

**Preconditions** Knowledge/guess of a target phone number that maps to a registered user; the handler always returns 200 and processes asynchronously.

**Security impact** Unauthenticated record creation under another user's identity (booking spam, fraudulent booking rows, spurious emergency requests, message-history pollution). No data is disclosed and there is no cross-tenant read — hence Medium, not High. The integrity impact is concrete and demonstrable in source: `handleInbound` gates only on phone-suffix match, then writes.

**Tenant / PHI impact** Writes are keyed to the matched user; no PHI is read. Emergency-record pollution could trigger operational responses.

**Existing controls** `webhookLimiter`; the GET verification endpoint checks a verify token (POST has none); the phone must match a user.

**Adversarial verification** Confirmed zero `X-Hub-Signature`/HMAC checks on the POST path; confirmed the flow creates `booking` and `emergencyRequest` rows from message text; confirmed the phone-suffix match is the only gate. Classified **Medium/CONFIRMED** on the demonstrated write primitive; the root missing-signature issue is attributed to Phase 1A to avoid double-counting.

**Why the issue remains** No authenticity control on an endpoint that performs writes.

**Recommendation** Verify Meta's `X-Hub-Signature-256` HMAC over the raw body before any processing; rate-limit per sender; treat message text as untrusted (bound length, validate) before it reaches the state machine or storage.

**Retest procedure** POST a forged payload with a valid signature → accepted; with an invalid/absent signature → rejected (401/403) before any DB write.

---

### INJ-11 — `updateProfile` name is unsanitized (inconsistent with registration)

**Severity:** Informational
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-20

**Affected components** `server/src/controllers/users/UserProfileController.ts`.

**Description** `updateProfileSchema.name = z.string().min(2)` while `RegistrationController` uses `sanitizedString(z.string().min(2))`. The inconsistency is the root of INJ-07 and allows stored markup.

**Recommendation** Use `sanitizedString`/`optionalSanitizedString` consistently for all display-name fields; add a lint/convention note.

---

### INJ-12 — Recording-key extraction uses a substring host check

**Severity:** Informational
**Confidence:** High
**Status:** CONFIRMED
**CWE:** CWE-20

**Affected components** `server/src/services/TelehealthRecordingService.ts:s3KeyFromRecordingUrl`.

**Description** `parsed.hostname.includes('amazonaws.com')` (and `.includes('.s3.')`) is a substring match; a host such as `notamazonaws.com` or `x.s3.evil` would pass. The extracted value is only ever used as an object **key** against the app's own `env.AWS_BUCKET`, and `recordingUrl` is written only from signed LiveKit webhook egress events — so the destination bucket is never attacker-controlled.

**Security impact** None confirmed (no cross-bucket signing). Recorded because the check is fragile if this helper is ever reused for a cross-bucket copy.

**Recommendation** Match the host with an anchored suffix (`.amazonaws.com` with a leading dot and/or an allowlist of the configured bucket host), not `includes`.

---

## 32. Dynamic / Runtime Test Matrix

| # | Test | Harness (app's own deps) | Result |
|---|---|---|---|
| 1 | CSV formula cells preserved | `csv-writer` in `server/node_modules` | `=HYPERLINK(...)` emitted as formula → **CONFIRMED** (VER-1E-01) |
| 2 | `sanitize-html` vs formula chars | `sanitize-html` | `=`/`+`/`-`/`@` preserved; tags stripped → **CONFIRMED** (VER-1E-02) |
| 3 | qs operator/proto handling | `express@4.22.2` + `qs@6.15.3` | operators become objects; `__proto__` dropped; prototype intact → INJ-04 + pollution falsified (VER-1E-03) |
| 4 | Zod `.url()` scheme acceptance | `zod@3.25.76` | `javascript:`/`data:`/`file:`/`vbscript:` pass → INJ-06 (VER-1E-04) |
| 5 | Path-encoded traversal guards | re-implemented guard logic | raw + `%2e%2e`/`%2f` rejected; case prefix rejected; NUL rejected → **falsified** (VER-1E-05) |
| 6 | ReDoS on cookie regex | Node 26 | 0.39 ms / 1.86 ms adversarial → **falsified** (VER-1E-06) |
| 7 | CRLF in response header | Node 26 `setHeader` | `ERR_INVALID_CHAR` → **falsified** (VER-1E-07) |
| 8 | Audit entity from raw request line | Express harness mirroring `auditMiddleware` | raw TCP `=HYPERLINK(...)` stored verbatim → **CONFIRMED** (VER-1E-08) |
| 9 | XFF → `req.ip` under trust proxy | `express@4.22.2`, `trust proxy=1` | arbitrary string stored → **CONFIRMED** (VER-1E-09) |
| 10 | Prisma operator acceptance differential | `@prisma/client` (no DB) | valid op / invalid op / valid field / bogus field all give the **same** connection error → **no differential obtainable** (INJ-04 LIKELY, evidence claim withdrawn) |
| 11 | Prototype pollution via qs | `express@4.22.2` | no `Object.prototype` mutation → **falsified** |
| 12 | Markdown raw-HTML rendering | source inspection | `rehype-sanitize`, no `rehype-raw` → **falsified** |
| 13 | WebView `</script>` breakout | source inspection | JWT alphabet + env-only URL → **falsified** |
| 14 | PayTabs amount tampering | source inspection | amount vs invoice within 0.01 → **falsified** |
| 15 | Open redirect via returnUrl | source inspection | `isAllowedFrontendOrigin` allowlist → **falsified** |

**Reproduced vs inferred:** tests 1–3, 5–9, 11 are reproduced locally against the app's own libraries. Tests 4, 10 are library-behaviour reproductions (4 reproduced; 10 shape-only). Tests 12–15 are source-inspection determinations.

**Environmental limits:** no database was available, so query *result* semantics (INJ-04) could not be observed; no live environment was used, so DoS amplification (INJ-05) was not executed (by policy). Both are flagged for the retests in §36.

---

## 33. M4 Regression Verification

| M4 control | Expected | Status |
|---|---|---|
| `sanitizePlainText` (tag stripping) | still applied on write paths | ⚠ **partially regressed/inconsistent** — applied on chat `send` and AI chat, **not** on `editMessage`, `updateProfile.name`, org staff names (INJ-08/11) |
| `uploadAllowlist` (MIME/size, magic bytes) | enforced | ✅ held (`assertAllowedUploadMime`, avatar magic re-check) |
| Path containment (M-31/M-32) | enforced | ✅ held (intake/avatar resolve+startsWith checks; reproduced under encoding) |
| Filename sanitization | enforced | ✅ held (`sanitizeUploadFilename`) |
| Request-log URL stripping | query stripped | ✅ held (`redactUrlForLog` cuts at `?`) |
| Sentry scrubbers | wired | ✅ held (`beforeSendScrub`/`scrubSentryEvent` on both hooks) |
| Public AI sanitization | applied | ✅ held (`sanitizePlainText` on Gemini chat in/out) |
| PHI upload logic (`phiS3`) | used for PHI | ⚠ unchanged from Phase 1D AUTHZ-01 (care-summary uses bare client) — not a Phase-1E regression |
| LiveKit raw-body handling | raw + signature | ✅ held (`express.raw` + `WebhookReceiver`; 400 on non-buffer) |

**Determination:** the M4 input-security controls that exist are intact where applied; the regression is **inconsistent application** of `sanitizePlainText` (INJ-08/11), not a broken control.

---

## 34. Withdrawn Suspicions

| Suspicion | Why withdrawn | Evidence |
|---|---|---|
| SQL injection via Prisma | Only raw query is a test helper with a hardcoded table list | `db.ts:40`; no route reachability |
| Prototype pollution (`__proto__`/`constructor`) | `qs@6.15.3` drops `__proto__`; no merge/spread sink; no lodash | VER-1E-03 |
| CRLF / header injection via filename | Node throws `ERR_INVALID_CHAR`; filename additionally sanitized | VER-1E-07 |
| Path traversal in intake/avatar/chat keys | Guards reject `..`, absolute, backslash, and encoded variants; prefix+regex enforced | VER-1E-05 |
| Cross-user S3 signing via `contains` fallback | Filename sanitizer strips separators; Phase 1D already verified prefix confinement | Phase 1D VER-1D-02/04 |
| Chat stored XSS | React escapes; no `dangerouslySetInnerHTML`; markdown sanitized | §8 |
| Mobile WebView XSS via token/serverUrl | JWT alphabet excludes `<`/`>`; `serverUrl` is env-only | §8 |
| Markdown → raw HTML XSS | `rehype-sanitize`, no `rehype-raw` | §8 |
| SSRF via image/PDF/geocode/callback | No attacker-controlled destination; hosts fixed; params encoded | §10 |
| OS command injection | No `child_process`/shell anywhere | §11 |
| Template injection | No template engine in deps | §19 |
| ReDoS | Only pattern is literal and linear (≤1.86 ms) | VER-1E-06 |
| Open redirect via payment returnUrl | `isAllowedFrontendOrigin` restricts to configured origin | §15 |
| PDF SSRF / local file read | `pdfkit` in-memory, no HTML renderer, no remote fetch | §18 |
| Path traversal via export `requestId` | Server-generated cuid | §13 |
| `resolveMediaUrl` `data:` XSS | Only used in `<img src>` context | §9/INJ-06 |
| `ErrorFallback.shouldRedirect` open redirect | Constant `/login` | §15 |
| WhatsApp webhook SQL/type confusion | No SQL path; flow is typed and user-matched | §16/INJ-10 |

---

## 35. Unknowns / Infrastructure Verification

1. **Effective `trust proxy` topology** — the leftmost-XFF exposure in INJ-03 depends on how Nginx/ALB is configured (append vs overwrite) and the real `TRUST_PROXY_HOPS`. **Infra check needed.**
2. **Global request body cap on AI responses** — no explicit AI-response size limit was found; verify the upstream client/gateway bounds it.
3. **Bucket policy for uploads** — S3 upload objects use `ContentDisposition: attachment` and (for PHI paths) KMS SSE, but the bucket's default ACL/policy is not in the repo. Verify no public-read default (related to Phase 1D AUTHZ-01).
4. **Email client rendering** — INJ-07 impact depends on the recipient's mail client remote-content settings.

### 35.1 Dynamic Retest Backlog

Not a Phase 1E completion gap — this is test-environment work that does not block the next static audit phase (Phase 1F). Each item below is a static finding whose *runtime confirmation* needs infrastructure the review environment did not have.

| # | Finding | Static status | What is demonstrated | What needs a test environment | Exit criterion |
|---|---|---|---|---|---|
| D-01 | **INJ-04** — Prisma query-operator injection | LIKELY | The qs object-injection primitive (`?status[not]=…` → operator object) and the un-coerced assignment into Prisma `where` are both demonstrated in code and reproduced at the parser level. | A reachable PostgreSQL test DB seeded with known rows, to observe whether the operator actually broadens the result set (the no-DB environment could not differentiate valid operators, invalid operators, valid fields, or bogus fields — all return the same connection error). | `?status[not]=<value>` returns the same result set as the rejected-input baseline (fix works), or a demonstrably broadened set (finding confirmed). |
| D-02 | **INJ-03** — leftmost-XFF acceptance | CONFIRMED | Raw XFF string stored as `req.ip` under `trust proxy=1`. | Read the deployed Nginx/ALB config to establish whether XFF is overwritten or appended and the real `TRUST_PROXY_HOPS`. | Recorded effective topology; if XFF can be client-supplied leftmost, INJ-03 applies in production. |
| D-03 | **INJ-05** — unbounded pagination | CONFIRMED (mechanics) | `take: parseInt(limit)` with no clamp on ~16 endpoints incl. a public route. | A load-test/staging environment to measure the actual amplification (response size / DB time) at large `limit`. | Clamped `take` verified on every list endpoint; worst-case response budget documented. |

**Disposition:** D-01 is scheduled as retest work and does **not** hold up Phase 1F; INJ-04 stays LIKELY until D-01 closes. D-02/D-03 are infra/load checks for the environment owner.

---

## 36. Recommended Remediation Sequence

**P1 (release-blocking / immediate):**
1. **INJ-01** — Add a single `encodeCsvCell(value)` helper (prefix `'` when the first non-whitespace char is `= + - @ \t \r`) and route **all three** CSV producers through it; bound/label unknown audit `entity` values.
2. **INJ-02** — Same helper for booking/user exports; constrain `serviceType` to an enum where possible.
3. **INJ-03** — Validate `req.ip` is a well-formed IP before storing (else `null`); document `TRUST_PROXY_HOPS`.

**P2:**
4. **INJ-04** — Set `app.set('query parser', 'simple')` **or** coerce every query value with Zod before assigning into Prisma; enum-validate filter fields.
5. **INJ-05** — Introduce a shared `parsePagination()` with a hard `maxTake` and apply it everywhere.
6. **INJ-10** — Verify Meta `X-Hub-Signature-256` on the WhatsApp webhook before processing.

**P3:**
7. **INJ-06** — Scheme-allowlist the avatar URL (`https?` only).
8. **INJ-07** — `escapeHtml()` every interpolation in email templates; use `sanitizedString` for all display-name schemas (INJ-11).
9. **INJ-08** — Apply `sanitizePlainText` on chat edit.
10. **INJ-09 / INJ-12** — Sanitize AI free text; anchor the S3 host check.

**Layer guidance:** CSV helper in the **export function**; scheme allowlist in the **route schema**; query coercion in the **route schema/middleware**; IP validation in the **audit service/storage layer**; email escaping in the **template layer**; upload/key checks already in the **storage layer**.

---

## 37. Top 10 Phase 1E Risks

1. **INJ-01** — Unauthenticated CSV formula injection into the admin audit export. *(P1 / release blocker)*
2. **INJ-02** — Formula injection from booking/user fields into admin exports.
3. **INJ-03** — Raw XFF stored and exported as an unescaped audit column.
4. **INJ-04** — Prisma query-operator injection via the extended query parser *(Likely; dynamic retest backlog)*.
5. **INJ-05** — Unbounded pagination on list endpoints (one public).
6. **INJ-10** — Unsigned WhatsApp webhook → unauthenticated booking/emergency record creation *(Medium/CONFIRMED; root gap from Phase 1A)*.
7. **INJ-07** — HTML injection into transactional emails via unsanitized names.
8. **INJ-06** — URL scheme acceptance on the avatar field.
9. **INJ-08** — Inconsistent chat edit sanitization.
10. **INJ-09** — AI free text stored without sanitization.

*(INJ-11 and INJ-12 are informational and fall outside the Top 10.)*

## 38. Top 10 Retests

1. Unauthenticated `POST /api/=…` → export audit CSV → assert no live formula (INJ-01).
2. Booking with `=`-prefixed `serviceType` → export bookings → assert neutralised (INJ-02).
3. `X-Forwarded-For: =1+1` → export audit CSV → assert not formula-evaluable (INJ-03).
4. `?status[not]=…` on each affected endpoint against a test DB → assert no broadened result (INJ-04).
5. Every list endpoint with `limit=1000000` → assert clamped `take` (INJ-05).
6. Save `javascript:alert(1)` as avatar → assert 400 (INJ-06).
7. Name containing `<b>` → assignment email → assert escaped (INJ-07).
8. Chat edit with `<b>x</b>` → assert stripped (INJ-08).
9. WhatsApp webhook with missing/invalid signature → assert rejected (INJ-10).
10. Re-run the encoded-traversal suite (VER-1E-05) after any key-handling change → assert all rejected.

## 39. Answers to Required Security Questions

1. **Raw SQL reachable?** No — only a test helper.
2. **Modify Prisma query structure?** Field *keys* no; *values* can be operator objects (INJ-04).
3. **Property names reach `where`/`orderBy`/`select`/`include`?** No — keys are hardcoded.
4. **Prototype-pollution impact?** No reachable impact (qs 6.15.3; no merge sink).
5. **`dangerouslySetInnerHTML`?** No.
6. **User content rendered as raw HTML?** No (React escaping; sanitized markdown).
7. **Low-privilege content rendered by admins?** Only via escaped UI and CSV/email (INJ-01/02/07).
8. **Chat content → stored XSS?** No.
9. **Clinical-note content → stored XSS?** No.
10. **Care-plan content → stored XSS?** No.
11. **AI output → XSS?** No (escaped/sanitized).
12. **Notification content → XSS?** No.
13. **Dangerous URL schemes injectable?** Accepted on avatar (INJ-06) but no executing sink.
14. **Attacker-controlled backend HTTP destination?** No.
15. **SSRF to private ranges?** No.
16. **Redirects followed on outbound?** Yes by default (Axios), but no attacker-controlled URL to redirect.
17. **Redirect-based SSRF bypass?** No.
18. **Cloud metadata reachable via user input?** No.
19. **Google geocoding input alter host?** No (params-encoded, fixed host).
20. **OS command execution?** No.
21. **User input to a shell?** No.
22. **Local path traversal?** No (guards hold).
23. **Cross-user S3 key manipulation?** No for non-admin.
24. **Uploaded SVG/HTML executes in browser?** No — SVG not allowlisted; attachment disposition.
25. **MIME trusted without content inspection?** Mostly yes at upload; avatar re-checks magic bytes on serve. Not exploitable (no execution path).
26. **Uploads parsed server-side?** No.
27. **Filename inject response headers?** No (sanitized + Node rejects CRLF).
28. **CRLF/header injection?** No.
29. **Open redirects?** No.
30. **Payment return URLs attacker-controlled?** No (allowlisted).
31. **Duplicate params change security decisions?** Not demonstrated; feeds INJ-04 shapes.
32. **Arrays/objects bypass scalar validation?** Yes — into Prisma values (INJ-04).
33. **Deeply nested JSON bounded?** Yes (10 MB + native parse).
34. **Page sizes capped?** Not everywhere (INJ-05).
35. **Expensive queries attacker-amplified?** Yes via unbounded `take` (INJ-05).
36. **AI cost-amplified?** Auth + `aiLimiter` + 90 s timeout; not demonstrated.
37. **Geocoding cost-amplified?** No public route reaches geocoding.
38. **PDF generation resource-amplified?** Auth-gated per episode; not demonstrated.
39. **ReDoS?** No.
40. **Exported CSV cells contain formulas?** Yes (INJ-01/02/03).
41. **Family user injects formulas an admin later opens?** Yes (INJ-01 unauthenticated; INJ-02 authenticated).
42. **Generated PDFs fetch remote URLs?** No.
43. **Generated PDFs access local files?** No.
44. **Third-party responses schema-validated?** Mostly yes; PayTabs ad-hoc but amount-checked.
45. **Third-party URLs propagate to privileged clients?** PayTabs `redirect_url` used as a navigation target (gateway-hosted, not injectable to arbitrary host); LiveKit recording key signed to own bucket.
46. **Malformed webhook input → unsafe state transitions?** WhatsApp (INJ-10); others signature-gated.
47. **AI structured output inject unexpected fields?** Top-level extra keys stripped except `draftSchema.passthrough()` feeding typed fields; no auth impact.
48. **User input → dynamic template?** No.
49. **Unsafe deserialization?** No.
50. **`eval`/`new Function`?** No.
51. **Malformed input → sensitive stack traces?** No (generic 500 in prod).
52. **CSP limits XSS?** Yes — `scriptSrc 'self'` blocks inline script (defence in depth).
53. **All security-critical validations server-side?** Auth/tenant/amount yes; length/enum/scheme partially (INJ-04/06/11).
54. **Update as strict as create?** No — `updateProfile`/`editMessage` weaker than create/send (INJ-08/11).
55. **Unknown object properties stripped?** Zod objects strip by default; `draftSchema` uses `.passthrough()` (non-security fields).
56. **Max input lengths consistent?** Mostly; some names/org fields lack `.max` (INJ-11 context).
57. **Numeric values bounded?** Amounts yes; `limit` no (INJ-05).
58. **Date ranges bounded?** Admin exports accept `from`/`to` without range cap (low impact).
59. **Second-order stored data → dangerous interpreter?** Yes — audit entity/IP → CSV (INJ-01/03).
60. **Phase-1E release blocker?** Yes — **INJ-01**.

---

## 40. Conclusion

Phase 1E traced every meaningful attacker-controlled source in Riayah Plus to every dangerous sink and found the input-handling posture to be **substantially strong on the classic injection classes**: there is no reachable SQL injection, no stored/reflected DOM XSS, no SSRF, no OS command execution, no path traversal, no template injection, and no prototype-pollution impact. These negatives are supported by reproduction against the application's own library versions, not merely by grep.

The one high-value, fully-reproduced weakness is **spreadsheet formula injection into admin CSV exports**, reachable **unauthenticated** through the audit-log write path (INJ-01) — a low-effort, persistent payload whose interpretation in the analyst's spreadsheet can enable data exfiltration, phishing, external requests, and — depending on the spreadsheet application/version/security configuration — higher-impact formula/DDE behaviour. Its authenticated variants (INJ-02) and the spoofable IP column (INJ-03) reinforce the same root cause: exported user-influenced values are quoted but never formula-neutralised.

The remainder is a short, well-characterised tail: query-operator object injection into Prisma filters (INJ-04, Likely — dynamic retest backlog D-01), unbounded pagination including a public endpoint (INJ-05), a scheme-accepting URL validator (INJ-06), inconsistent sanitization of names and chat edits (INJ-07/08/11), and an **unsigned WhatsApp webhook that accepts forged payloads to create booking/emergency records** (INJ-10, Medium/CONFIRMED — the missing-signature root gap was identified in Phase 1A; Phase 1E adds the demonstrated write consequence).

**Phase 1E verdict: READY WITH P1 FIXES.**

**Release blockers:**
- **INJ-01** — Unauthenticated CSV formula injection into the admin audit-log export.

**Recommended next phase:** **Phase 1F — Mobile / Client Application Hardening.**

*This phase is assessment and evidence gathering only. No remediation was performed. No application code, configuration, schema, migration, environment, or dependency was modified; nothing was committed; no production system was contacted. All credential values are redacted; no patient data is included.*

---

## 41. Adversarial Verification Record (2026-09-12)

Per `/adversarial-verification`, every finding was re-attacked — the goal was to **break** it, not confirm it. Reproductions ran against the app's own `express@4.22.2`, `qs@6.15.3`, `zod@3.25.76`, `csv-writer`, `sanitize-html`, and Node 26. No application file was modified.

### 41.1 Falsification results

| Finding | Falsification hypothesis tested | Result | Action |
|---|---|---|---|
| INJ-01 | "The audit write path requires auth / filters status / the CSV escapes formulas / the path is not stored" | **Failed to falsify by reproduction** — raw TCP `POST /api/=HYPERLINK("http://evil","x")` (no auth) stored `entity` verbatim; export uses quote-only escaping; `auditMiddleware` is pre-route and status-agnostic | Unchanged (High) |
| INJ-02 | "`csv-writer` escapes formula prefixes / `sanitizePlainText` removes them / `serviceType` is an enum" | **Failed to falsify** — `csv-writer` output preserves `=HYPERLINK(...)`; `sanitize-html` does not touch `=`/`+`/`-`/`@`; booking `serviceType` is `z.string()` | Unchanged (Medium) |
| INJ-03 | "`req.ip` always returns a validated IP / the proxy overwrites XFF" | **Failed to falsify** — with the configured `trust proxy=1`, a raw XFF string (`=cmd|' /C calc'!A0`) becomes `req.ip` verbatim | Unchanged (Medium) |
| INJ-04 | "TypeScript cast coerces to string / a DB rejects operator objects / a security predicate blocks it" | **Partially falsified** — the cast does **not** coerce (confirmed). The "Prisma accepts the operator shape" hypothesis was **withdrawn**: without a DB, valid operators, invalid operators, valid fields, and bogus fields all produce the identical connection error, so no differential exists. No case flips an auth/tenant decision | Kept **LIKELY**; evidence claim withdrawn, retest flagged |
| INJ-05 | "A clamp exists / the public route is authenticated / a limiter bounds cost" | **Failed to falsify** — `take: parseInt(limit)` unclamped; `/marketplace/offers` has no `authenticate`; the limiter bounds request count, not per-request cost | Unchanged (Medium) |
| INJ-06 | "Zod's `.url()` rejects dangerous schemes / the value reaches an executing sink" | **Partly falsified** — `.url()` accepts `javascript:`/`data:`/etc. (confirmed), **but** every render site is `<img src>`/RN `Image`, which do not execute | Kept **Low**; sink claim withdrawn |
| INJ-07 | "Names are sanitized / email templates escape / mail clients execute script" | **Partly falsified** — `updateProfile`/org names are **not** sanitized and templates do not escape (confirmed), but mail clients generally neutralise script | Kept **Low** (HTML/phishing, not session compromise) |
| INJ-08 | "React renders this as HTML" | **Falsified** — React escapes the text node; no `dangerouslySetInnerHTML`; therefore no XSS. Retained only as a sanitization-inconsistency (defence-in-depth) | Kept **Low** |
| INJ-09 | "AI text reaches a CSV/HTML sink" | **Falsified** — AI text reaches escaped UI / `pdfkit` text only; no CSV/HTML sink today | Kept **Low** (latent) |
| INJ-10 | "WhatsApp webhook verifies a signature / a forged message can read data" | **Partly falsified** — no signature exists (confirmed) and no data is disclosed, **but** the forged payload drives concrete writes (`booking`, `emergencyRequest`, message rows) for a matched phone | Kept **Medium/CONFIRMED** — the demonstrated write primitive is a real integrity impact, not informational |
| INJ-11 | "Registration sanitization protects updates too" | **Falsified** — `updateProfileSchema.name` is plain `z.string()` | Kept **Informational** |
| INJ-12 | "The substring host check enables cross-bucket signing" | **Falsified** — the extracted value is only a key against the app's own bucket; the destination is never attacker-controlled | Kept **Informational** |
| *(withdrawn)* SQLi | "Raw SQL is reachable" | **Falsified** — only a test helper with a hardcoded table list | Withdrawn (§34) |
| *(withdrawn)* Prototype pollution | "`__proto__`/`constructor` pollute via qs or a merge" | **Falsified by reproduction** — `qs@6.15.3` drops `__proto__`; `Object.prototype` unchanged; no merge sink | Withdrawn (§34) |
| *(withdrawn)* CRLF | "A filename injects headers" | **Falsified by reproduction** — Node `ERR_INVALID_CHAR`; filename also sanitized | Withdrawn (§34) |
| *(withdrawn)* Traversal | "Encoded traversal bypasses key guards" | **Falsified by reproduction** — raw/`%2e%2e`/`%2f`/case-prefix/NUL all rejected | Withdrawn (§34) |
| *(withdrawn)* WebView XSS | "`</script>` breakout via token/serverUrl" | **Falsified** — JWT alphabet + env-only URL | Withdrawn (§34) |
| *(withdrawn)* Markdown XSS | "`rehype-raw` renders HTML" | **Falsified** — `rehype-sanitize`, no `rehype-raw` | Withdrawn (§34) |
| *(withdrawn)* ReDoS | "Cookie regex catastrophically backtracks" | **Falsified by timing** — ≤1.86 ms on 200 k adversarial chars | Withdrawn (§34) |

### 41.2 Corrections applied during verification

| # | Change | Finding |
|---|---|---|
| C-1E-01 | Confirmed the release blocker with an end-to-end raw-TCP reproduction (not just source reading) | INJ-01 |
| C-1E-02 | Downgraded INJ-04 to **LIKELY** because no DB was available to observe a broadened result set, and no auth/tenant decision was shown to flip | INJ-04 |
| C-1E-03 | Withdrew the "execution sink" claim for INJ-06 — the scheme acceptance is real but every sink is inert | INJ-06 |
| C-1E-04 | Reframed INJ-08 from XSS to a sanitization inconsistency (React escaping falsified the XSS hypothesis) | INJ-08 |
| C-1E-05 | Scoped INJ-10's impact: unauthenticated record creation for a matched phone, no data disclosure | INJ-10 |
| C-1E-06 | Recorded the eighteen withdrawn suspicions with their falsifying evidence | §34 |
| C-1E-07 | **Withdrew the unsupported "Prisma accepts the operator shape" evidence** for INJ-04 — a bogus field produces the same connection error as a valid operator, so no differential was ever obtained; the finding now rests on the code pattern + qs behaviour only | INJ-04 |
| C-1E-08 | **Added the per-column trigger matrix** for INJ-01: `resolveEntity` consumes a leading `-` (split on `-`), so `entity` preserves only `=`/`+`/`@`; `entityId` and `ipAddress` are not split and preserve all four triggers | INJ-01 |
| C-1E-09 | Corrected the §41.4 withdrawn count from 8 to 18 | §41.4 |
| C-1E-10 | **Reclassified INJ-10 from Informational to Medium/CONFIRMED** — a forged unsigned payload demonstrably creates `booking`/`emergencyRequest` rows, a concrete unauthenticated write primitive; the root missing-signature gap is explicitly attributed to Phase 1A to avoid double-counting | INJ-10 |
| C-1E-11 | **Tempered INJ-01's impact language** — replaced the categorical "DDE command execution" claim with "formula interpretation can enable data exfiltration, phishing, external requests, and — depending on spreadsheet application/version/security configuration — higher-impact formula/DDE behaviour" | INJ-01 |
| C-1E-12 | **Consolidated the INJ-04 dynamic retest into the §35 backlog** — the qs object-injection primitive is demonstrated; proving actual Prisma result broadening requires a test database and is scheduled as retest work, not a Phase 1E blocker for Phase 1F | INJ-04/§35 |

### 41.3 Reproduction evidence (copy-paste outputs)

**VER-1E-01 — `csv-writer` formula preservation:**
```
input  = '=HYPERLINK("http://evil.example","click")'
output = "=HYPERLINK(""http://evil.example"",""click"")"    ← formula intact
input  = '+SUM(1+1)'      → +SUM(1+1)
input  = '@cmd'           → @cmd
```

**VER-1E-02 — `sanitize-html` (sanitizePlainText) leaves formula prefixes:**
```
'=HYPERLINK("http://evil","x")' → unchanged
'+SUM(1+1)'                     → unchanged
'@cmd'                          → unchanged
'<b>=1+1</b>'                   → '=1+1'     (tags stripped, formula kept)
```

**VER-1E-03 — qs operator + prototype handling (`express@4.22.2`, `qs@6.15.3`):**
```
?type=invoice            → { type: 'invoice' }
?type[$ne]=invoice       → { type: { $ne: 'invoice' } }
?type[not]=invoice       → { type: { not: 'invoice' } }
?type[]=a&type[]=b       → { type: ['a','b'] }
?__proto__[polluted]=yes → {} and Object.prototype.polluted === undefined
```

**VER-1E-04 — Zod `.url()` scheme acceptance (`zod@3.25.76`):**
```
'javascript:alert(1)'           → true
'data:text/html,<script>…'      → true
'file:///etc/passwd'            → true
'vbscript:msgbox(1)'            → true
'//evil.example/x.png'          → false
```

**VER-1E-05 — encoded traversal vs key guards:**
```
intake/uid/…-a.pdf                         → ALLOWED
intake/uid/…-../../other/x.pdf             → REJECTED
intake/uid/%2e%2e%2fother                  → REJECTED
intake/uid/..%2fother                      → REJECTED
intake/uid/…-a%00.pdf                      → REJECTED
```

**VER-1E-06 — ReDoS timing:**
```
200k adversarial chars → 0.39 ms
second adversarial form → 1.86 ms
```

**VER-1E-07 — CRLF in header:**
```
setHeader('Content-Disposition','…\r\nInjected: yes')
→ ERR_INVALID_CHAR: Invalid character in header content
```

**VER-1E-08 — Audit entity from raw request line (unauthenticated):**
```
POST /api/=HYPERLINK("http://evil","x")  → status 404, auditEntity = '=HYPERLINK("http:'
POST /api/+SUM(1+1)                      → auditEntity = '+SUM(1+1)'
POST /api/@cmd                           → auditEntity = '@cmd'
```

**VER-1E-09 — XFF → req.ip under `trust proxy=1`:**
```
X-Forwarded-For: "=cmd|' /C calc'!A0" → req.ip = "=cmd|' /C calc'!A0"
X-Forwarded-For: "+SUM(1+1)"          → req.ip = "+SUM(1+1)"
```

### 41.4 Verification verdict

| Area | Findings checked | Unfalsified | Downgraded | Withdrawn/corrected |
|---|---:|---:|---:|---:|
| CSV / second-order (INJ-01, 02, 03) | 3 | 3 | 0 | 0 |
| Query / parser (INJ-04, 11) | 2 | 1 | 1 | 0 |
| Resource (INJ-05) | 1 | 1 | 0 | 0 |
| Validation / rendering (INJ-06, 07, 08, 09) | 4 | 4 | 0 | 3 (scope corrected) |
| Integration (INJ-10, 12) | 2 | 2 | 0 | 1 |
| **Withdrawn suspicions** | 18 | — | — | **18** |
| **Total** | **12 findings + 18 withdrawn** | **11** | **1** | **12 corrections** |

**Verdict: PASS with corrections.** Eleven of twelve findings survived falsification unchanged; one (INJ-04) was correctly downgraded to LIKELY after its only runtime evidence claim was withdrawn — because a bogus field name produces the same database-connection error as a valid query, no differential was obtainable. **Scope/severity refinements went in both directions as the evidence demanded:** two findings were narrowed (INJ-06 sink withdrawn, INJ-08 reclassified from XSS to a sanitization inconsistency), and **one was raised** (INJ-10 reclassified from Informational to Medium/CONFIRMED after the forged-payload write path — booking and emergency record creation — was traced; the missing-signature root gap remains attributed to Phase 1A). INJ-01's impact language was tempered to state config-dependent formula/DDE outcomes rather than a categorical command-execution claim. **Eighteen suspicions were withdrawn** on reproduction evidence (SQLi, prototype pollution, CRLF, path traversal, WebView XSS, markdown XSS, ReDoS, cross-user S3 signing, SSRF variants, OS command injection, template injection, open redirect, PDF SSRF, export path traversal, `data:` XSS, `shouldRedirect` redirect, and the WhatsApp SQL/type-confusion framing), demonstrating the review did not pattern-match on grep. The single confirmed release blocker (INJ-01) rests on an end-to-end unauthenticated reproduction, not inference — and the adversarial pass further refined it by mapping exactly which spreadsheet triggers survive per CSV column.
