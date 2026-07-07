# Riayah Plus — PERN Stack

> Node.js + Express + PostgreSQL (Prisma) + Next.js + React Native

This folder contains the full Node.js conversion of the Riayah Plus HealthOS platform,
following the proposal milestones (`Riayah_Plus_Proposal_v2.pdf`).

## Structure

```
mern/
├── server/    Node.js + Express + PostgreSQL API
└── client/    Next.js 16 frontend (pointed at mern/server)
```

The `mern/server` replaces `backend/` (Laravel 12).
The `mern/client` is a copy of `frontend/` with env vars updated.

## Quick Start

### Server

```bash
cd mern/server

# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Start dev server
npm run dev

# In a separate terminal — start queue workers
npm run worker
```

Server runs at `http://localhost:5000`.

### Client

```bash
cd mern/client

pnpm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:5000/api
# Set API_INTERNAL_URL=http://localhost:5000/api

pnpm dev
```

Client runs at `http://localhost:3000`.

## Milestone Status

| Milestone | Focus | Status |
|---|---|---|
| M1 | Foundation, Auth, RBAC, Prisma schema | ✅ Built |
| M2 | Onboarding, Patients, Care Episodes, Assessments | ✅ Built |
| M3 | Care Plan builder, Approval workflow, Goals | ✅ Built |
| M4 | Telehealth (LiveKit), Invoices, Qatari payments (PayTabs), Chat (Socket.io) | ✅ Built |
| M5 | GPS tracking, Admin reporting, Cron jobs | ✅ Built (React Native app pending) |

## Key Endpoints

| Area | Path |
|---|---|
| Auth | `POST /api/login`, `POST /api/register`, `GET /api/me` |
| Care Episodes | `GET /api/episodes`, `POST /api/episodes` |
| Care Plans | `GET /api/care-plans`, `POST /api/care-plans/:id/submit` |
| Telehealth | `POST /api/telehealth/token`, `POST /api/telehealth/checkin` |
| Invoices | `GET /api/invoices`, `POST /api/invoices/:id/send` |
| Payments | `POST /api/topup`, webhook at `/api/stripe/webhook` |
| Chat | `GET /api/chat`, `POST /api/chat` |
| Admin | `GET /api/admin/dashboard`, `GET /api/admin/reports/financial` |
| WhatsApp | `POST /api/webhook/whatsapp` |
| Health | `GET /api/health` |

## Environment Variables

See `mern/server/.env.example` and `mern/client/.env.example`.

## Database

PostgreSQL with Prisma ORM. Schema at `mern/server/prisma/schema.prisma`.

After adding new models:
```bash
npm run db:generate   # Regenerate Prisma client
npm run db:migrate    # Create and apply migration
```

## Real-time

Socket.io is used for:
- `chat.{userId}` — incoming chat messages
- `notification.user.{userId}` — in-app notifications

Connect from the client with:
```js
const socket = io('http://localhost:5000', { query: { userId } });
socket.on('new_message', handler);
socket.on('notification', handler);
```

## Queue Workers

BullMQ workers process:
- Email delivery
- Notifications dispatch
- Payment refunds
- Booking status updates
- WhatsApp messages

Run workers: `npm run worker`

## Cron Jobs

All 12 scheduled tasks from the Laravel backend are ported to `node-cron` in
`src/cron/scheduler.ts`. They start automatically when the server boots.

| Job | Schedule |
|---|---|
| Booking reminders | Every minute |
| Expire pending bookings | Hourly |
| Expire counter offers | Daily |
| Expire bids | Daily |
| Release escrow | Daily |
| Auto clock-out shifts | Hourly |
| Reconcile credit topups | Every 30 min |
| Mark expired documents | Daily |
| Document renewal reminders | Daily at 09:00 |
| Payment reconcile (overdue invoices) | Every 30 min |
| Session/meeting cleanup | Daily at 04:00 |
| Flag missed GPS check-ins | Every 15 min |
