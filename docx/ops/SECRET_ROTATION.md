# Secret rotation runbook (Phase 1C infra carry-over)

## App support (shipped)

- Production refuses placeholder / short JWT secrets and identical access/refresh secrets.
- Break-glass (`ALLOW_ADMIN_SECRET_LOGIN`) requires a strong `ADMIN_SECRET` + `ADMIN_BREAK_GLASS_USER_ID`.
- **Zero-downtime JWT rotation:** set new secrets as `JWT_*_SECRET` and keep old values in `JWT_*_SECRET_PREVIOUS` (verify-only). Remove `*_PREVIOUS` after the access/refresh TTL window.
- Generate secrets: `cd mern/server && npm run secrets:generate`

## Secrets to rotate

| Secret | Env var | Notes |
|---|---|---|
| Access JWT | `JWT_ACCESS_SECRET` (+ optional `_PREVIOUS`) | Sign with current only |
| Refresh JWT | `JWT_REFRESH_SECRET` (+ optional `_PREVIOUS`) | Sign with current only |
| Break-glass | `ADMIN_SECRET` | Keep break-glass disabled unless needed |

Also rotate if leaked (TM-001 committed `.env` blast radius): `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, Stripe keys + webhook secret, PayTabs keys, LiveKit, Twilio, SMTP, Pusher, `AI_SERVICE_API_KEY`, KMS/data-export keys. Treat every value that was in the tracked `server/.env` as compromised until rotated. Git history still contains the old blob until a history purge (optional; rotation is the hard requirement).

## Procedure

1. `npm run secrets:generate` → store new values.
2. Deploy: `JWT_ACCESS_SECRET_PREVIOUS=<old access>`, `JWT_ACCESS_SECRET=<new access>` (same for refresh).
3. Restart all API / worker / scheduler processes.
4. After `JWT_ACCESS_EXPIRES_IN` + `JWT_REFRESH_EXPIRES_IN`, clear `*_PREVIOUS`.
5. Confirm break-glass stays off unless intentionally used.

## Verification

- Fresh login succeeds; tokens signed with the **old** secret still verify during the previous window.
- After clearing `*_PREVIOUS`, old tokens fail.
- Old `ADMIN_SECRET` fails break-glass.

Mark tracker “Rotate JWT_* / ADMIN_SECRET” → 🧪 Verified after prod cutover.
