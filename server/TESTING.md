# Testing & Migration Guide

## Table of Contents
1. [Migrations](#1-migrations)
2. [Running Tests](#2-running-tests)
3. [Test Architecture](#3-test-architecture)
4. [First-time Setup](#4-first-time-setup)
5. [CI / CD](#5-ci--cd)

---

## 1. Migrations

### Why the `migrations/` folder is empty

Prisma generates migration SQL by **diffing the schema against a real database**. Because no database was connected yet, `prisma migrate dev` has never been run — so no SQL migration files exist yet.

### Generating the initial migration

Once you have a running PostgreSQL instance:

```bash
cd mern/server

# Copy env and point to your DB
cp .env.example .env
# Edit DATABASE_URL in .env

# Generate and apply the first migration (creates all 71 tables)
pnpm db:migrate
# → Prompts for a migration name, e.g. "initial"
# → Creates prisma/migrations/TIMESTAMP_initial/migration.sql
# → Applies it to the database
```

After this, commit the generated `prisma/migrations/` folder to git. Every subsequent `pnpm db:migrate` will only generate the diff.

### Deploying migrations in production

```bash
# Does NOT prompt or create files — just applies pending migrations
npx prisma migrate deploy
```

### Other useful commands

| Command | What it does |
|---|---|
| `pnpm db:migrate` | Create + apply new migration (dev only) |
| `pnpm db:generate` | Regenerate Prisma Client after schema changes |
| `pnpm db:studio` | Open Prisma Studio (visual DB browser) |
| `pnpm db:seed` | Insert demo data (providers, clients, bookings…) |
| `pnpm db:reset:test` | Drop + recreate test DB and re-apply all migrations |

### Schema location

```
mern/server/prisma/schema.prisma   ← single source of truth (71 models)
mern/server/prisma/migrations/     ← generated SQL history (auto-managed by Prisma)
mern/server/prisma/seed.ts         ← demo data for dev / manual testing
```

---

## 2. Running Tests

### Prerequisites

```bash
# 1. PostgreSQL running locally
# 2. Create the test database
createdb riayah_plus_test

# 3. Install deps (if not already)
cd mern/server && pnpm install

# 4. Apply migrations to test DB
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/riayah_plus_test npx prisma migrate deploy
```

### Commands

```bash
# All tests (unit + integration), with coverage
pnpm test

# Unit tests only — fast, no DB required
pnpm test:unit

# Integration tests only — requires test PostgreSQL + Redis
pnpm test:integration

# Watch mode (unit tests only, re-runs on save)
pnpm test:watch
```

### Expected output

```
PASS src/tests/unit/PricingEngine.test.ts (5 tests)
PASS src/tests/unit/PayoutIdempotencyService.test.ts (6 tests)
PASS src/tests/unit/AuthController.test.ts (3 tests)
PASS src/tests/integration/auth.test.ts (7 tests)
PASS src/tests/integration/bookings.test.ts (7 tests)
PASS src/tests/integration/marketplace.test.ts (7 tests)
PASS src/tests/integration/reviews.test.ts (6 tests)
PASS src/tests/integration/lms.test.ts (8 tests)
PASS src/tests/integration/admin.test.ts (7 tests)

Coverage: ~60% lines / ~60% functions
```

---

## 3. Test Architecture

```
src/tests/
├── setup.ts                    ← Runs before every test file (env, logger mock, Sentry mock)
├── globalSetup.ts              ← Runs once before all suites (applies DB migrations)
├── globalTeardown.ts           ← Runs once after all suites (disconnect Prisma)
├── testSequencer.ts            ← Runs unit tests before integration tests
│
├── helpers/
│   ├── auth.ts                 ← makeToken(), authHeader(), getTestUser()
│   ├── app.ts                  ← getTestApp() — Express app without I/O services
│   ├── db.ts                   ← testPrisma, cleanDb(), createUser(), createBooking()…
│   └── prismaMock.ts           ← Deep-mocked PrismaClient for unit tests
│
├── unit/                       ← Fast, no DB, no network — pure logic
│   ├── PricingEngine.test.ts
│   ├── PayoutIdempotencyService.test.ts
│   └── AuthController.test.ts
│
└── integration/                ← Real DB, real HTTP, mocked external APIs
    ├── auth.test.ts
    ├── bookings.test.ts
    ├── marketplace.test.ts
    ├── reviews.test.ts
    ├── lms.test.ts
    └── admin.test.ts
```

### What is mocked in integration tests

| Service | Mock strategy |
|---|---|
| Stripe | Mock `StripeService` class — no real API calls |
| WhatsApp | `WhatsAppService.sendText()` is mocked |
| AWS S3 | `multer-s3` is mocked, returns a fake URL |
| Firebase FCM | `firebase-admin` is fully mocked in `setup.ts` |
| Email | `EmailService.send*` methods are mocked |
| Redis | Real Redis on `redis://localhost:6379/1` (index 1) |
| PostgreSQL | Real `riayah_plus_test` database |
| Gemini AI | `GeminiChatService.sendMessage` is mocked |
| LiveKit | `livekit-server-sdk` is mocked |

### Unit test pattern (Prisma mock)

```typescript
// In any unit test file
import '../helpers/prismaMock';          // auto-mocks prisma config/database
import { prismaMock } from '../helpers/prismaMock';

it('finds user by email', async () => {
  prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'u@test.com' } as any);
  // ... call your service/controller
});
```

### Integration test pattern

```typescript
import supertest from 'supertest';
import { getTestApp } from '../helpers/app';
import { createUser, cleanDb } from '../helpers/db';
import { makeToken } from '../helpers/auth';

const request = supertest(getTestApp());

beforeAll(() => cleanDb());

it('GET /api/bookings — returns 200', async () => {
  const user = await createUser();
  const token = makeToken('client', { id: user.id, email: user.email, name: user.name });
  const res = await request.get('/api/bookings').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
});
```

---

## 4. First-time Setup

```bash
# 1. Install Node deps
cd mern/server
pnpm install

# 2. Set up environment files
cp .env.example .env          # fill in DB, Redis, JWT secrets, etc.
cp .env.example .env.test     # already pre-filled for local test DB

# 3. Start local services (if using Docker)
cd mern && docker-compose up -d postgres redis

# 4. Generate initial migration
pnpm db:migrate               # name it "initial"
pnpm db:generate              # re-generate Prisma Client

# 5. Seed demo data
pnpm db:seed

# 6. Start the dev server
pnpm dev                      # http://localhost:5000

# 7. Run tests
pnpm test:unit                # no DB needed
pnpm test:integration         # needs running postgres + redis
```

---

## 5. CI / CD

### GitHub Actions example

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: riayah_plus_test
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        ports: ["6379:6379"]

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm, cache-dependency-path: mern/server/pnpm-lock.yaml }

      - name: Install dependencies
        run: pnpm install
        working-directory: mern/server

      - name: Apply migrations
        run: npx prisma migrate deploy
        working-directory: mern/server
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/riayah_plus_test

      - name: Run tests
        run: pnpm test
        working-directory: mern/server
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/riayah_plus_test
          REDIS_URL: redis://localhost:6379/1
          JWT_ACCESS_SECRET: ci-access-secret-32-characters-min
          JWT_REFRESH_SECRET: ci-refresh-secret-32-characters-min
          ADMIN_SECRET: ci-admin-secret
          NODE_ENV: test
```

---

## Coverage targets

| Area | Current target | Command |
|---|---|---|
| Services (unit) | 70%+ | `pnpm test:unit` |
| Controllers (integration) | 60%+ | `pnpm test:integration` |
| Overall | 60%+ | `pnpm test` |

Coverage report is written to `coverage/` — open `coverage/index.html` in a browser for the full breakdown.
