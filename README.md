# Riayah Plus — PERN Stack

Node.js + Express + PostgreSQL (Prisma) + Vite/React client.

## Structure

```
mern/
├── docx/     Project documentation, specs, and handoff notes
├── server/   Express API
└── client/   Vite + React Router SPA
```

## Quick Start

```bash
# API
cd mern/server && npm install && npm run db:generate && npm run dev

# Client (separate terminal)
cd mern/client && npm install && cp .env.example .env && npm run dev
```

| Service | URL |
|---|---|
| Client | http://localhost:5173 |
| API | http://localhost:5001 |

## Documentation

All specs and handoff notes live in **`docx/`**. Start with:

- [`docx/SESSION_HANDOFF.md`](docx/SESSION_HANDOFF.md) — session summary for developers
- [`docx/MILESTONE_SPECS.md`](docx/MILESTONE_SPECS.md) — milestone scope (signed proposal)
