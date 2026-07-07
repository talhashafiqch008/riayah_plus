# FRONTEND KNOWLEDGE BASE

**Generated:** 2026-04-28

## OVERVIEW

Next.js 16 App Router application for the care platform web UI. Serves five user roles through segmented route prefixes.

## STRUCTURE

```
src/
├── app/               # Next.js App Router pages
│   ├── (marketing)/   # Public pages: /, /find-care, /find-support, /browse
│   ├── careseeker/    # Family/careseeker dashboard and flows
│   ├── provider/      # Provider dashboard, onboarding, scheduling
│   ├── admin/         # Admin analytics, bookings, payouts, compliance
│   ├── staff/         # Staff shifts, tasks, notes
│   └── trainer/       # Training content and course management
├── components/        # React components
│   ├── ui/            # Reusable primitives (buttons, inputs, modals)
│   ├── chat/          # Messaging and conversation UI
│   ├── telehealth/    # LiveKit video meeting components
│   ├── payments/      # Stripe integration UI
│   ├── booking/       # Booking flows and scheduling
│   └── admin/         # Admin-specific tables and filters
├── lib/               # Core business logic
├── hooks/             # Custom React hooks
├── contexts/          # AuthContext
├── types/             # Shared TypeScript definitions
└── middleware.ts      # Route redirects (no auth enforcement here)
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API client | `src/lib/api.ts` | ~62KB Axios client with interceptors, retry logic, typed endpoints |
| Care intent logic | `src/lib/care-intent-engine.ts` | Care need analysis and recommendation engine |
| Provider matching | `src/lib/matching-engine.ts` | Matching algorithm and scoring |
| Questionnaire flow | `src/lib/questionnaire-engine.ts` | Dynamic assessment question logic |
| Real-time notifications | `src/hooks/useEcho.ts` | Laravel Echo + Pusher for live updates |
| Auth state | `src/contexts/AuthContext.tsx` | JWT handling, role-based user state |
| Role route guards | `src/middleware.ts` | Redirects only; auth enforced by backend + client guards |
| Telehealth/video | `src/components/telehealth/` | LiveKit Components React integration |
| Payments | `src/components/payments/` | Stripe Elements wrappers |
| E2E tests | `tests/e2e/` | Playwright test suite |

## CONVENTIONS

- **Routes:** Role-prefixed paths (`/careseeker/*`, `/provider/*`, `/admin/*`). Marketing pages are unprefixed.
- **File naming:** Page components use `page.tsx`. Shared components use PascalCase. Hooks use camelCase prefixed with `use`.
- **Data fetching:** Server state uses TanStack Query (`useQuery`/`useMutation`). API calls go through `src/lib/api.ts`.
- **Validation:** Zod schemas for form and API payload validation.
- **Styling:** Tailwind v4 with `clsx` + `tailwind-merge` for conditional classes.
- **Images:** Use Next.js `<Image>`; remotePatterns configured in `next.config.ts`.

## COMMANDS

```bash
pnpm install          # Install dependencies (uses pnpm, not npm)
pnpm dev              # Next.js dev server
pnpm build            # Production build (standalone output for Docker)
pnpm start            # Start production server
pnpm lint             # ESLint check
pnpm test:e2e         # Playwright E2E tests headless
pnpm test:e2e:ui      # Playwright tests with UI mode
```

## NOTES

- **Auth is not enforced in middleware.** `middleware.ts` only handles legacy redirects. Authentication and role guards happen via `AuthContext` + backend validation.
- **Backend dependency:** The app expects the Laravel API at runtime. Many features will fail without it.
- **Standalone build:** `next.config.ts` sets `output: 'standalone'` for Docker deployment.
- **i18n ready:** `i18next` is configured but translations live in `src/locales/`.
- **Socket connections:** `useEcho.ts` initializes Laravel Echo globally; check connection state before subscribing to channels.
