# Pagination amplification check (Phase 1E D-03 / INJ-05)

**Code control:** `parsePagination()` with `MAX_TAKE = 100` is applied on list endpoints (including public marketplace offers). Unit retests assert `limit=1000000` → `take=100`.

**Staging load check (optional, ops):** measure response size / DB time for `GET /api/marketplace/offers?limit=1000000` and confirm the server only returns ≤100 rows and finishes within the normal p95 budget. This does not change the code gate — it documents worst-case cost under the hard cap.

| # | Check | Pass criteria |
|---|---|---|
| 1 | Unit retest | `injPhase1eRetest.test.ts` D-03 cases green |
| 2 | Public offer list | Response `meta.limit` / row count ≤ 100 for `limit=1000000` |
| 3 | (Optional) APM | No memory spike vs `limit=20` beyond expected 5× payload |

Mark tracker **D-03** → 🧪 Verified after (1)+(2) in staging, or keep ✅ Code verified if only (1) is run locally.
