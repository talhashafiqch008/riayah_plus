# Trust-proxy / X-Forwarded-For topology checklist (Phase 1E D-02 / INJ-03)

**Status:** App-side controls implemented; ops still confirms hop count in each env.

## App controls (shipped)

1. `sanitizeForwardedForHeader` strips non-IP / formula hops from `X-Forwarded-For` before rate limits / trust-proxy consumers.
2. `resolveTrustedClientIp()` used by rate limiters — never keys on formula strings.
3. `sanitizeClientIp()` on audit persist + CSV formula guard.
4. Production Nginx samples overwrite XFF with `$remote_addr`:
   - `mern/client/nginx.conf`
   - `mern/server/deploy/nginx-api.conf.example`

## Required topology (ops)

1. **Single reverse proxy:** `TRUST_PROXY=true` (or production default), `TRUST_PROXY_HOPS=1`. Edge **overwrites** XFF.
2. **Two proxies (CDN → ALB → Node):** `TRUST_PROXY_HOPS=2`.

## Nginx (overwrite, not append)

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-Proto $scheme;
```

Do **not** use `$proxy_add_x_forwarded_for` at the public edge.

## Verification

| # | Check | Pass |
|---|---|---|
| 1 | Env | `TRUST_PROXY_HOPS` matches hop count |
| 2 | Edge config | Uses `$remote_addr` overwrite |
| 3 | Synthetic | `curl -H 'X-Forwarded-For: =cmd|evil'` → rate-limit key / audit IP is never the formula |
| 4 | Unit tests | `clientIp.test.ts` + `injPhase1eRetest` green |

When hop topology is confirmed in prod, mark tracker **D-02** fully 🧪 Verified.
