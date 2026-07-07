# Raiyah Plus — Frontend Conversion Plan
# Next.js 16 → Vite + React 18 + React Router v6

**Source:** `mern/client/` — Next.js 16 App Router, 424 TypeScript files, 284 routes  
**Target:** Plain React SPA — Vite, React Router v6, same UI components and API layer  
**Last updated:** 2026-07-07  
**Status:** Conversion complete — discrepancies logged in [Part 12](#part-12--post-conversion-audit)

---

## Overview

The frontend is a full Next.js 16 App Router application. The conversion removes the
Node.js runtime layer entirely (no more server-side rendering, no more Next.js API
routes, no more middleware.ts). Everything becomes a client-rendered SPA that talks
directly to the Express backend.

Three things make this conversion non-trivial:

1. **12 Next.js API routes** currently act as a proxy/security layer between the
   browser and the Express backend. These must either be moved into the Express
   server or collapsed into direct browser calls.

2. **middleware.ts** does auth-checking and role-based redirects on every navigation.
   This logic must move into React Router route guards.

3. **File-based routing** (App Router folder structure) must be converted to an
   explicit React Router route config. ~284 `page.tsx` files map to ~110 unique
   routes (the rest are `loading.tsx`, `error.tsx`, `layout.tsx` siblings).

---

## Part 1 — Next.js API Routes → Express Backend

These 12 files live in `src/app/api/` and currently run as Edge/Node functions.
After conversion they no longer exist. Every call they proxied now goes one of two ways:
- Direct from browser to Express (most cases)
- New Express route if the logic was non-trivial (admin proxy, token cookie management)

### 1.1 — Auth Routes (move to Express or collapse to direct calls)

| Next.js Route | Current Purpose | Migration Decision |
|---|---|---|
| `POST /api/auth/login` | Validates body with Zod, proxies to `backend/login`, sets httpOnly `token` cookie, returns user + token to client | **Keep as Express route** — `POST /api/auth/login` already exists in Express. The httpOnly cookie is no longer used (SPA stores token in memory/localStorage). Browser calls Express directly. |
| `POST /api/auth/register` | Validates body, proxies to `backend/register`, sets httpOnly cookie | **Collapse** — browser calls `POST /api/register` on Express directly. |
| `POST /api/auth/logout` | Clears httpOnly cookies, calls backend logout | **Collapse** — browser calls `POST /api/logout` on Express directly. localStorage cleared by AuthContext. |
| `POST /api/auth/refresh` | Reads httpOnly cookie, calls backend refresh, sets new cookie | **Collapse** — browser calls `POST /api/auth/refresh` on Express directly using token from localStorage. |
| `POST /api/auth/2fa-verify` | Validates 2FA code, sets httpOnly cookie | **Collapse** — browser calls `POST /api/2fa/verify` on Express directly. |
| `POST /api/auth/otp-verify` | Phone OTP verification, returns is_registered flag | **Collapse** — browser calls `POST /api/otp/verify` on Express directly. |
| `POST /api/auth/phone-otp-verify` | Alternative OTP route with country_code | **Collapse** — browser calls same OTP endpoint on Express. |

**Action:** Delete all 7 auth API route files. Update `localClient` calls in `src/lib/api/client.ts`
to point to `client` (direct to Express). Remove `localClient` entirely — there is only one axios
instance after conversion.

### 1.2 — Admin Proxy (add to Express)

| Next.js Route | Current Purpose | Migration Decision |
|---|---|---|
| `ALL /api/admin/[[...path]]` | Catch-all proxy: forwards request to Express `/admin/*` with `X-Admin-Request: {ADMIN_SECRET}` header. Handles JSON and multipart. | **Add to Express** as a passthrough that already happens server-side. In practice the browser just calls the Express admin routes directly. The `ADMIN_SECRET` header is added by the browser via an axios request interceptor (not visible to end users in normal operation). |

**Action:** Delete the catch-all admin route file. Add `ADMIN_SECRET` to the admin axios
interceptor in `src/lib/api/admin.ts` so it attaches `X-Admin-Request` header automatically.

### 1.3 — User Profile Proxy (collapse to direct calls)

| Next.js Route | Current Purpose | Migration Decision |
|---|---|---|
| `GET /api/users/me` | Reads token from httpOnly cookie, calls Express `/me`, returns user | **Collapse** — browser calls `GET /api/me` on Express directly with Bearer token. |
| `PATCH /api/users/me` | Proxies profile updates with file uploads | **Collapse** — browser calls `PATCH /api/me` or `POST /api/onboarding/complete` directly. |

### 1.4 — Onboarding Proxy (collapse to direct calls)

| Next.js Route | Current Purpose | Migration Decision |
|---|---|---|
| `POST /api/onboarding/profile` | Proxies profile update to Express `/client-onboarding/complete` | **Collapse** — browser calls Express directly. |
| `POST /api/onboarding/complete` | Handles FormData multipart, proxies to Express `/onboarding/complete` | **Collapse** — browser submits FormData directly to Express. |

### 1.5 — Health Check (add simple route)

| Next.js Route | Current Purpose | Migration Decision |
|---|---|---|
| `GET /api/health` | Returns `{ status: 'healthy' }` | **Keep in Express** — Express already has `GET /health`. Remove Next.js version. |

---

## Part 2 — middleware.ts → React Router Guards

The `middleware.ts` runs on every navigation server-side. In React Router it becomes
client-side route components that wrap protected routes.

### 2.1 — What middleware.ts does today

```
On every request to /, /provider/*, /careseeker/*, /admin/*, /staff/*, /trainer/*:
  1. Read `token` cookie
  2. If no token → allow public routes, redirect authenticated routes to login
  3. Check auth_cache (HMAC-signed, 5-min TTL) to avoid calling backend every request
  4. If cache miss → call GET /me to verify token + get role
  5. Route user to their canonical dashboard based on role
  6. Handle backward-compat redirects (/onboarding → /careseeker/onboarding)
  7. On 401 → clear cookies + redirect to login
```

### 2.2 — React Router equivalent

Replace with three route wrapper components:

**`ProtectedRoute.tsx`** — requires any valid token:
```
If no token in AuthContext → redirect to /
If auth loading → show spinner
Else → render <Outlet />
```

**`RoleRoute.tsx`** — requires specific role(s):
```
ProtectedRoute +
If user.role not in allowedRoles → redirect to user's canonical dashboard
Else → render <Outlet />
```

**`PublicOnlyRoute.tsx`** — for login/register pages:
```
If authenticated → redirect to user's canonical dashboard
Else → render <Outlet />
```

**`getRoleDashboard(role)`** — single source of truth for where each role lands:
```typescript
admin / super_admin       → /admin/dashboard
provider / doctor / nurse
  / physiotherapist / ...  → /provider/dashboard
client / consumer / family → /careseeker/dashboard
staff                      → /staff/dashboard
trainer                    → /trainer/dashboard
```

**Auth cache:** Remove the HMAC cookie cache entirely. The SPA has the user object in
memory (AuthContext). No round-trip to the backend on navigation — only on initial load
(token verification at app startup in AuthContext.checkAuth).

### 2.3 — Backward-compat redirects

Move these from middleware.ts to the React Router config as explicit `<Navigate>` elements:

| Old Path | New Path |
|---|---|
| `/onboarding` | `/careseeker/onboarding` |
| `/login?role=careseeker` | `/careseeker/login` |
| `/login?role=provider` | `/provider/signup` |

---

## Part 3 — File-Based Routing → React Router Config

App Router folder structure maps directly to React Router nested routes. The conversion
is mechanical: each `page.tsx` becomes a route component; each `layout.tsx` becomes a
layout route with `<Outlet />`; `loading.tsx` and `error.tsx` are handled by React
Query's loading/error states and React error boundaries.

### 3.1 — Route structure (React Router v6 declarative config)

```
/ (Root layout — providers: Auth, Query, i18n, Motion, Sentry, Toast)
│
├── Public routes (no auth required)
│   ├── / → HomePage
│   ├── /register → RegisterPage
│   ├── /forgot-password → ForgotPasswordPage
│   ├── /privacy → PrivacyPage
│   ├── /terms → TermsPage
│   ├── /browse → BrowsePage
│   ├── /find-care → FindCarePage
│   ├── /find-support → FindSupportPage
│   ├── /doctor/:id → PublicProviderProfilePage
│   └── /delete-account → DeleteAccountPage
│
├── Public-only routes (redirect if authenticated)
│   ├── /careseeker/login → CareseekerLoginPage
│   ├── /careseeker/phone-login → PhoneLoginPage
│   ├── /provider/login → ProviderLoginPage
│   └── /provider/signup → ProviderSignupPage
│
├── Admin routes (RoleRoute: ['admin', 'super_admin'])
│   ├── /admin/login → AdminLoginPage (public-only)
│   └── /admin/* (AdminLayout with sidebar)
│       ├── /admin/dashboard
│       ├── /admin/analytics
│       ├── /admin/assignments
│       ├── /admin/audit-logs
│       ├── /admin/bookings → AdminBookingsPage
│       ├── /admin/bookings/:id → AdminBookingDetailPage
│       ├── /admin/compliance
│       ├── /admin/disputes
│       ├── /admin/documents
│       ├── /admin/incidents
│       ├── /admin/payments/:id
│       ├── /admin/payouts/:id
│       ├── /admin/providers → AdminProvidersPage
│       ├── /admin/providers/:id → AdminProviderDetailPage
│       ├── /admin/providers/pending
│       ├── /admin/services
│       ├── /admin/sessions
│       ├── /admin/settings
│       ├── /admin/staff → AdminStaffPage
│       ├── /admin/staff/add → AdminAddStaffPage
│       ├── /admin/users
│       └── /admin/verifications
│
├── Careseeker routes (RoleRoute: ['client', 'consumer', 'family'])
│   └── /careseeker/* (CareseekerLayout with sidebar)
│       ├── /careseeker/onboarding (PublicOnlyRoute within careseeker)
│       ├── /careseeker/dashboard
│       ├── /careseeker/booking/:providerId
│       ├── /careseeker/bookings
│       ├── /careseeker/providers
│       ├── /careseeker/providers/:id
│       ├── /careseeker/marketplace
│       ├── /careseeker/marketplace/my-needs
│       ├── /careseeker/marketplace/post
│       ├── /careseeker/marketplace/offers/:id
│       ├── /careseeker/payment/checkout/:bookingId
│       ├── /careseeker/payment/success
│       ├── /careseeker/payments
│       ├── /careseeker/care-needs
│       ├── /careseeker/care-plans
│       ├── /careseeker/care-summary
│       ├── /careseeker/documents
│       ├── /careseeker/budget
│       ├── /careseeker/emergency
│       ├── /careseeker/family
│       ├── /careseeker/meet-with-ai
│       ├── /careseeker/messages
│       ├── /careseeker/offers
│       ├── /careseeker/disputes
│       ├── /careseeker/disputes/new
│       ├── /careseeker/reviews
│       ├── /careseeker/settings
│       ├── /careseeker/settings/security
│       ├── /careseeker/telehealth
│       ├── /careseeker/timeline
│       ├── /careseeker/video
│       ├── /careseeker/wallet
│       ├── /careseeker/wallet/payment-methods
│       ├── /careseeker/refund
│       └── /careseeker/matches
│
├── Provider routes (RoleRoute: provider roles)
│   └── /provider/* (ProviderLayout with sidebar)
│       ├── /provider/onboarding (PublicOnlyRoute within provider)
│       ├── /provider/account-pending (ProtectedRoute only — no role check)
│       ├── /provider/verification-pending
│       ├── /provider/dashboard
│       ├── /provider/account
│       ├── /provider/availability
│       ├── /provider/bids
│       ├── /provider/clients
│       ├── /provider/documents
│       ├── /provider/earnings
│       ├── /provider/job-requests
│       ├── /provider/marketplace
│       ├── /provider/marketplace/offers
│       ├── /provider/marketplace/offers/create
│       ├── /provider/messages
│       ├── /provider/offers
│       ├── /provider/patients/:id
│       ├── /provider/payouts
│       ├── /provider/pricing
│       ├── /provider/reports
│       ├── /provider/reviews
│       ├── /provider/schedule
│       ├── /provider/shifts/active
│       ├── /provider/self-refund
│       ├── /provider/settings
│       ├── /provider/staff
│       ├── /provider/tasks
│       ├── /provider/telehealth
│       ├── /provider/training
│       └── /provider/verification
│
├── Staff routes (RoleRoute: ['staff', 'admin'])
│   └── /staff/* (StaffLayout)
│       ├── /staff/dashboard
│       ├── /staff/messages
│       ├── /staff/notes
│       ├── /staff/profile
│       ├── /staff/shifts
│       └── /staff/tasks
│
├── Trainer routes (RoleRoute: ['trainer', 'admin'])
│   └── /trainer/* (TrainerLayout)
│       ├── /trainer/dashboard
│       ├── /trainer/analytics
│       ├── /trainer/certificates
│       ├── /trainer/courses
│       ├── /trainer/courses/create
│       ├── /trainer/quizzes
│       ├── /trainer/students
│       └── /trainer/upload
│
└── Shared authenticated routes (ProtectedRoute, any role)
    ├── /dashboard → role-aware redirect to canonical dashboard
    ├── /chat/:userId → DirectMessagePage
    ├── /conversations → ConversationsPage
    ├── /meeting/:roomId → VideoMeetingPage
    ├── /room/:id → VideoRoomPage
    └── /meet-ai → AIMeetPage
```

---

## Part 4 — Dependency Changes

### 4.1 — Remove (Next.js specific)

| Package | Replace With |
|---|---|
| `next@16` | `vite@6` + `@vitejs/plugin-react` |
| `next/navigation` (useRouter, usePathname, useSearchParams) | `react-router-dom` (useNavigate, useLocation, useParams, useSearchParams) |
| `next/link` | `react-router-dom` Link |
| `next/image` | `<img>` or `react-lazy-load-image-component` |
| `next/font` | Direct Google Fonts CSS import or `fontsource` packages |
| `@sentry/nextjs` | `@sentry/react` |
| `eslint-config-next` | Standard `eslint-config-react-app` or custom config |

### 4.2 — Add

| Package | Purpose |
|---|---|
| `react-router-dom@6` | Client-side routing |
| `@vitejs/plugin-react` | Vite React plugin |
| `vite@6` | Build tool (replaces next) |
| `vite-plugin-svgr` | SVG as React components (if needed) |

### 4.3 — Keep As-Is

All of these are framework-agnostic and require zero changes:
- `@tanstack/react-query`
- `axios`, `axios-retry`
- `react-hook-form`, `@hookform/resolvers`, `zod`
- `@radix-ui/*`, `lucide-react`, `tailwindcss`
- `framer-motion`, `react-hot-toast`, `react-tooltip`
- `@stripe/react-stripe-js`, `@stripe/stripe-js`
- `@livekit/components-react`, `livekit-client`
- `i18next`, `react-i18next`
- `recharts`, `d3-scale`
- `react-markdown`, `remark-gfm`
- `jspdf`, `jspdf-autotable`
- `lodash`
- `laravel-echo`, `pusher-js`
- `jwt-decode`
- `zxcvbn`
- `react-loading-skeleton`

---

## Part 5 — API Client Changes

### 5.1 — Remove `localClient`

`localClient` exists only to call Next.js API routes (`/api/auth/*`, `/api/users/me`).
After conversion there are no local API routes. Remove it entirely.

All calls that used `localClient` move to `client` (direct to Express):

| Old call (localClient) | New call (client) |
|---|---|
| `localClient.post('/auth/login', ...)` | `client.post('/login', ...)` |
| `localClient.post('/auth/register', ...)` | `client.post('/register', ...)` |
| `localClient.post('/auth/logout', ...)` | `client.post('/logout', ...)` |
| `localClient.post('/auth/refresh', ...)` | `client.post('/auth/refresh', ...)` |
| `localClient.post('/auth/2fa-verify', ...)` | `client.post('/2fa/verify', ...)` |
| `localClient.get('/users/me')` | `client.get('/me')` |
| `localClient.patch('/users/me', ...)` | `client.patch('/me', ...)` |
| `localClient.post('/onboarding/profile', ...)` | `client.post('/onboarding/complete', ...)` |
| `localClient.post('/onboarding/complete', ...)` | `client.post('/onboarding/complete', ...)` |

### 5.2 — Token handling

Today tokens flow: Express → Next.js API route → httpOnly cookie AND localStorage.
After conversion: Express → browser → localStorage only. No httpOnly cookie.

`src/lib/api/client.ts` changes:
- Remove `localClient` export
- Remove `withCredentials: true` (no cookies)
- Keep `getAccessToken()` / `setAccessToken()` backed by localStorage
- Keep 401 → refresh → retry logic (now calls Express `/auth/refresh` directly)
- Remove the admin path override that switched baseURL to `/api`

### 5.3 — Environment variables

| Old (Next.js) | New (Vite) | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `VITE_API_URL` | Vite requires `VITE_` prefix |
| `NEXT_PUBLIC_SOCKET_URL` | `VITE_SOCKET_URL` | |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `VITE_STRIPE_PUBLISHABLE_KEY` | |
| `NEXT_PUBLIC_SENTRY_DSN` | `VITE_SENTRY_DSN` | |
| `NEXT_PUBLIC_PUSHER_APP_KEY` | `VITE_PUSHER_APP_KEY` | |
| `NEXT_PUBLIC_PUSHER_APP_CLUSTER` | `VITE_PUSHER_APP_CLUSTER` | |
| `NEXT_PUBLIC_ENABLE_GEMINI_CHAT` | `VITE_ENABLE_GEMINI_CHAT` | |
| `NEXT_PUBLIC_APP_VERSION` | `VITE_APP_VERSION` | |
| `API_INTERNAL_URL` | **Remove** — server-only, no longer needed | |
| `AUTH_CACHE_SECRET` | **Remove** — middleware-only, no longer needed | |
| `ADMIN_SECRET` | **Remove from frontend** — add to admin axios interceptor instead | |

In component code, replace all `process.env.NEXT_PUBLIC_*` with `import.meta.env.VITE_*`.

---

## Part 6 — Component Code Changes

### 6.1 — Navigation (mechanical find+replace)

| Next.js | React Router |
|---|---|
| `import { useRouter } from 'next/navigation'` | `import { useNavigate } from 'react-router-dom'` |
| `const router = useRouter()` | `const navigate = useNavigate()` |
| `router.push('/path')` | `navigate('/path')` |
| `router.replace('/path')` | `navigate('/path', { replace: true })` |
| `router.back()` | `navigate(-1)` |
| `import { usePathname } from 'next/navigation'` | `import { useLocation } from 'react-router-dom'` |
| `const pathname = usePathname()` | `const { pathname } = useLocation()` |
| `import { useSearchParams } from 'next/navigation'` | `import { useSearchParams } from 'react-router-dom'` |
| `import { useParams } from 'next/navigation'` | `import { useParams } from 'react-router-dom'` |
| `import Link from 'next/link'` | `import { Link } from 'react-router-dom'` |

### 6.2 — Image component

Replace `next/image`:
```tsx
// Before
import Image from 'next/image';
<Image src={url} width={200} height={200} alt="..." />

// After
<img src={url} width={200} height={200} alt="..." loading="lazy" />
```

Or use `react-lazy-load-image-component` if lazy loading and blur-up are needed.

### 6.3 — Font loading

Replace `next/font/google`:
```tsx
// Before (in layout.tsx)
import { Inter } from 'next/font/google';
const inter = Inter({ subsets: ['latin'] });

// After (in index.html or main.tsx)
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
```

### 6.4 — Metadata

`export const metadata` in layouts/pages is Next.js-only. Replace with:
```tsx
// React Helmet (add react-helmet-async package)
import { Helmet } from 'react-helmet-async';
<Helmet>
  <title>Page Title — Riayah Plus</title>
</Helmet>
```

### 6.5 — 'use client' directives

Remove all `'use client'` directives — they are meaningless in a plain React SPA
(every component is a client component).

### 6.6 — Loading and error states

- Remove `loading.tsx` files — these are Next.js-specific. Replace with React Query
  `isLoading` / `isFetching` states and skeleton components per-page.
- Remove `error.tsx` files — replace with React Error Boundaries where needed, or
  React Query `isError` + error UI per-page.
- The root `ErrorBoundary.tsx` component (already exists) wraps the app.

---

## Part 7 — New File Structure (Vite SPA)

```
mern/client/
├── index.html                    ← Vite entry point (was _document.tsx)
├── vite.config.ts                ← Vite config (replaces next.config.ts)
├── .env                          ← VITE_ prefixed vars
├── src/
│   ├── main.tsx                  ← React root render (replaces app/layout.tsx)
│   ├── App.tsx                   ← React Router <BrowserRouter> + routes
│   ├── routes/
│   │   ├── index.tsx             ← Full route config (replaces app/ folder structure)
│   │   ├── ProtectedRoute.tsx    ← Auth guard
│   │   ├── RoleRoute.tsx         ← Role-based guard
│   │   └── PublicOnlyRoute.tsx   ← Redirect-if-authed guard
│   ├── pages/                    ← Renamed from app/ — page components moved here
│   │   ├── public/
│   │   ├── admin/
│   │   ├── careseeker/
│   │   ├── provider/
│   │   ├── staff/
│   │   └── trainer/
│   ├── layouts/                  ← Extracted from layout.tsx files
│   │   ├── RootLayout.tsx
│   │   ├── AdminLayout.tsx
│   │   ├── CareseekerLayout.tsx
│   │   ├── ProviderLayout.tsx
│   │   ├── StaffLayout.tsx
│   │   └── TrainerLayout.tsx
│   ├── components/               ← Unchanged
│   ├── contexts/                 ← Unchanged (AuthContext, NotificationContext, etc.)
│   ├── hooks/                    ← Unchanged
│   ├── lib/
│   │   └── api/
│   │       ├── client.ts         ← Modified: remove localClient
│   │       └── *.ts              ← Unchanged (all 28 API modules)
│   ├── config/                   ← Unchanged
│   ├── services/                 ← Unchanged
│   ├── types/                    ← Unchanged
│   ├── i18n/                     ← Unchanged
│   └── locales/                  ← Unchanged
└── tests/
    └── e2e/                      ← Playwright tests (update baseURL if port changes)
```

---

## Part 8 — What Does NOT Change

These require zero modification — they are already framework-agnostic:

| Area | Files |
|---|---|
| All UI components | `src/components/**` (74 files) |
| All API modules | `src/lib/api/*.ts` (28 files) — only localClient calls change |
| Auth context logic | `src/contexts/AuthContext.tsx` — token handling, user state, logout |
| All other contexts | `NotificationContext.tsx`, `CountryContext.tsx` |
| All custom hooks | `src/hooks/**` |
| Form validation | react-hook-form + Zod schemas |
| Data fetching | TanStack Query setup and all query/mutation hooks |
| Tailwind styling | All CSS classes, globals.css |
| i18n | All translation files and i18next config |
| Charts, maps, video | recharts, react-simple-maps, LiveKit — no changes |
| Payment | Stripe components — no changes |
| Real-time | laravel-echo + pusher-js — no changes |

---

## Part 9 — Express Backend Changes Required

The Express backend needs **two small additions** to support the SPA:

### 9.1 — Serve the Vite build

In `mern/server/src/app.ts` (or wherever express is configured), add static file serving:

```typescript
import path from 'path';
import express from 'express';

// After all API routes:
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});
```

This serves the React SPA and handles client-side routing (all routes return `index.html`).
Do this only in production. In development, Vite dev server runs separately on a different port.

### 9.2 — CORS

The SPA dev server runs on a different port (e.g., 5173) from Express (5000). Add the
Vite origin to Express CORS:

```typescript
cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000', // legacy
  ],
  credentials: true,
})
```

### 9.3 — No new API routes needed

All Next.js proxy routes collapsed into direct Express calls. Nothing new needs to be added
to Express for auth — the endpoints already exist.

---

## Part 10 — Conversion Checklist

### Phase 1 — Project Setup
- [x] Create `vite.config.ts` (replace `next.config.ts`)
- [x] Create `index.html` entry point
- [x] Create `src/main.tsx` (React root render)
- [x] Install: `react-router-dom`, `vite`, `@vitejs/plugin-react` (in package.json)
- [x] Install: `react-helmet-async` (for `<title>` management)
- [x] Uninstall: `next`, `@sentry/nextjs`, `eslint-config-next` (not in package.json)
- [x] Install: `@sentry/react` (replace `@sentry/nextjs`)
- [x] Rename all `NEXT_PUBLIC_*` env vars to `VITE_*` in `.env.example`
- [x] Update all `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`

### Phase 2 — Routing
- [x] Create `src/routes/index.tsx` with full React Router route config (~110 routes)
- [x] Create `ProtectedRoute.tsx`, `RoleRoute.tsx`, `PublicOnlyRoute.tsx`
- [x] Create `getRoleDashboard()` utility (from middleware.ts)
- [x] Add backward-compat `<Navigate>` redirects

### Phase 3 — Layouts
- [x] Extract `RootLayout.tsx` from `app/layout.tsx` (keep all providers)
- [x] Extract `AdminLayout.tsx` from `app/admin/layout.tsx`
- [x] Extract `CareseekerLayout.tsx` from `app/careseeker/layout.tsx`
- [x] Extract `ProviderLayout.tsx` from `app/provider/layout.tsx`
- [x] Extract `StaffLayout.tsx` from `app/staff/layout.tsx`
- [x] Extract `TrainerLayout.tsx` from `app/trainer/layout.tsx`
- [x] Replace layout `children` props with `<Outlet />`

### Phase 4 — Pages (move + clean)
- [x] Move `app/*/page.tsx` files to `src/pages/*/` (127 page files)
- [x] Remove all `'use client'` directives
- [x] Remove all `export const metadata` exports
- [x] Replace `next/navigation` with `react-router-dom` (find+replace, 0 remaining)
- [x] Replace `next/link` `<Link>` with react-router-dom `<Link>`
- [x] Replace `next/image` `<Image>` with `<img loading="lazy">`
- [x] Replace `next/font` with Google Fonts `<link>` in `index.html`
- [x] Remove `loading.tsx` files (not included in pages/, ignored)
- [x] Remove `error.tsx` files (not included in pages/, ignored)

### Phase 5 — API Client
- [x] Remove `localClient` from `src/lib/api/client.ts`
- [x] Update all `localClient.*` calls to `client.*` with correct Express paths
- [x] Remove `withCredentials: true`
- [x] Delete all files in `src/app/api/` (app/ dir removed)

### Phase 6 — Auth Flow
- [x] Update `AuthContext.tsx` — remove localClient usage, call Express directly
- [x] Remove middleware.ts (deleted from mern/client)
- [ ] Test login → dashboard redirect flow
- [ ] Test token refresh (401 → refresh → retry)
- [ ] Test logout + cross-tab sync

### Phase 7 — Express Integration
- [x] Add static file serving + SPA fallback to Express (`mern/server/src/app.ts`)
- [x] Update CORS origins to include Vite dev server URL (5173)
- [ ] Build React app and verify it's served by Express

### Phase 8 — Testing
- [ ] Update `playwright.config.ts` baseURL to Vite port (5173) or Express port
- [ ] Run existing Playwright E2E tests
- [ ] Test all role-based route guards manually
- [ ] Test onboarding flows (careseeker + provider)
- [ ] Test payment flow (Stripe)
- [ ] Test LiveKit video
- [ ] Test real-time notifications (Pusher/Echo)

### Cleanup (post-audit, see Part 12)
- [x] Remove `'use client'` directives from ~20 component files (0 remaining)
- [x] Delete `instrumentation.ts` (Next.js leftover)
- [x] Delete `src/lib/api/proxy-config.ts`
- [x] Delete duplicate nested dirs: `src/services/services/`, `src/types/types/`, `src/locales/locales/`, `src/lib/admin/admin/`
- [x] Delete leftover scratch files (`.py` scripts, audit `.md` files at client root)
- [x] Implement query-param login redirects (`/login?role=careseeker`, `/login?role=provider`) in `LoginPage.tsx`

---

## Part 11 — Risk Areas

| Area | Risk | Mitigation |
|---|---|---|
| httpOnly cookie loss | Auth is less secure (token in localStorage vs httpOnly cookie) | Use short-lived tokens + refresh rotation. Consider keeping a lightweight Express session route for security-sensitive operations. |
| SEO | Next.js SSR gave crawlable HTML. Vite SPA does not. | If SEO matters for public pages (`/`, `/browse`, `/find-care`, `/doctor/:id`), consider keeping those specific pages in Next.js or adding a pre-render step. For a healthcare app with auth-gated content, this is typically acceptable. |
| Real-time (Pusher/Echo) | `laravel-echo` is designed for Laravel backends. Works with Express via `pusher-js` but needs correct channel auth endpoint. | Verify `/broadcasting/auth` endpoint exists in Express (it does via `pusher.routes.ts`). |
| Admin proxy secret | Currently hidden in Next.js server. In SPA it's in memory. | Move `ADMIN_SECRET` to server-only. Admin API calls always go through the Express `/admin` routes which already check the header. Remove the client-side secret entirely — admin users are already auth-gated by role. |
| Vite code splitting | Vite auto-splits by route. Large pages (admin dashboard) may have large chunks. | Use `React.lazy()` + `Suspense` on route-level imports. This is standard React Router + Vite pattern. |
| `'use client'` removal | Some components may rely on Next.js behavior exposed by this directive. | All components in this codebase are already interactive — removing the directive changes nothing functionally. |

---

## Summary

| Item | Count | Effort |
|---|---|---|
| Next.js API routes to delete | 12 | Low |
| `localClient` call sites to update | ~20 | Low |
| `next/navigation` import replacements | ~150 | Medium (find+replace) |
| `'use client'` directives to remove | ~200 | Low (find+replace) |
| `loading.tsx` / `error.tsx` files to remove | ~60 | Low (delete) |
| `page.tsx` files to move to `src/pages/` | ~110 | Low (move + rename) |
| Layout files to convert to `<Outlet />` | 6 | Low |
| Route guards to write | 3 | Low |
| Route config to write | 1 large file | Medium |
| Environment variables to rename | 8 | Low |
| New Vite config | 1 | Low |
| Playwright test updates | minor | Low |

**Total estimated effort: 3–5 days** depending on how many edge cases surface in pages that
use Next.js-specific patterns beyond navigation (server components, async page props, etc.).

---

## Part 12 — Post-Conversion Audit (2026-07-07)

Verified against the actual `mern/client/` after the user completed the conversion.

### What is correctly done

| Item | Status |
|---|---|
| `next` removed from `package.json` | ✅ |
| `vite`, `@vitejs/plugin-react`, `react-router-dom`, `@sentry/react`, `react-helmet-async`, `react-lazy-load-image-component` installed | ✅ |
| `vite.config.ts` with `@` alias, proxy, and manual chunk splitting | ✅ |
| `index.html` entry point | ✅ |
| `src/main.tsx` React SPA root | ✅ |
| `src/App.tsx` with BrowserRouter + all providers | ✅ |
| `src/routes/index.tsx` — full route config, all ~110+ routes, lazy + Suspense | ✅ |
| `ProtectedRoute`, `RoleRoute`, `PublicOnlyRoute` route guards | ✅ |
| `getRoleDashboard` utility (matches middleware.ts role list exactly) | ✅ |
| All 6 layouts in `src/layouts/` using `<Outlet />` | ✅ |
| All pages moved to `src/pages/{role}/` | ✅ |
| `src/app/` directory removed | ✅ |
| No `next/` imports anywhere in `src/` | ✅ |
| `localClient` fully removed from `src/lib/api/client.ts` | ✅ |
| `VITE_API_URL` used in client (no `NEXT_PUBLIC_*` in source) | ✅ |
| `.env.example` uses `VITE_` prefix for all vars | ✅ |
| `AuthContext` calls Express directly via `client` | ✅ |
| Express: static serving + SPA fallback added (`app.ts`) | ✅ |
| Express: CORS updated with `http://localhost:5173` | ✅ |
| `/onboarding` → `/careseeker/onboarding` backward-compat redirect | ✅ |
| Route config additions beyond plan: `/careseeker/async-status`, `/careseeker/raiyah`, `/find-support/:id`, `/login` (general), admin payments+payouts list | ✅ (additions, not bugs) |

### Discrepancies

#### 1. `'use client'` directives not removed (low severity)

~20 component files still have `"use client"` at line 1. Vite ignores this directive — it is
dead code, not a bug. But the plan specified removal (Phase 4).

Files affected:
- `src/components/NotificationsDropdown.tsx`
- `src/components/RoleLoginForm.tsx`
- `src/components/I18nProvider.tsx`
- `src/components/ErrorBoundary.tsx`
- `src/components/Logo.tsx`
- `src/components/ui/DatePicker.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/label.tsx`
- `src/components/chat/ChatWindowWithHook.tsx`
- `src/components/chat/ChatWindowEcho.tsx`
- `src/components/admin/AdminPagination.tsx`
- `src/components/charts/RevenueChart.tsx`
- `src/components/charts/StatsChart.tsx`
- `src/components/staff/Topbar.tsx`, `Sidebar.tsx`
- `src/components/trainer/Topbar.tsx`, `Sidebar.tsx`
- `src/pages/DirectMessagePage.tsx`
- `src/pages/ConversationsPage.tsx`

**Fix:** `grep -rln '"use client"' src/ | xargs sed -i '' '/^"use client"/d'`

#### 2. `instrumentation.ts` leftover at `mern/client/` root (low severity)

This is a Next.js instrumentation file (`NEXT_RUNTIME` check). It is not imported by Vite or
referenced anywhere. It's dead code.

**Fix:** Delete `mern/client/instrumentation.ts`

#### 3. `src/lib/api/proxy-config.ts` stale (low severity)

The file still references `process.env.API_INTERNAL_URL` (Next.js server-only env var) with a
comment about "Next.js API route proxies". It is not imported anywhere in `src/` — dead code.

**Fix:** Delete `src/lib/api/proxy-config.ts`

#### 4. Duplicate nested directories (medium severity)

Accidental artifacts from the conversion process — directories were created inside themselves:

| Duplicate path | Canonical path |
|---|---|
| `src/services/services/chatService.ts` | `src/services/chatService.ts` |
| `src/types/types/api.ts` | `src/types/api.ts` |
| `src/types/types/care-intent.ts` | `src/types/care-intent.ts` |
| `src/types/types/chat.ts` | `src/types/chat.ts` |
| `src/locales/locales/en.json` | `src/locales/en.json` |
| `src/locales/locales/ar.json` | `src/locales/ar.json` |
| `src/lib/admin/admin/api.ts` | `src/lib/admin/api.ts` |
| `src/lib/admin/admin/constants.ts` | `src/lib/admin/constants.ts` |

**Fix:** Delete the nested directories — the canonical files at one level up are the ones in use.

```bash
rm -rf src/services/services src/types/types src/locales/locales src/lib/admin/admin
```

#### 5. Query-param backward-compat redirects not implemented (low severity)

The plan (Part 2.3) listed two more redirects:

| Old | New |
|---|---|
| `/login?role=careseeker` | `/careseeker/login` |
| `/login?role=provider` | `/provider/signup` |

These require runtime logic (React Router can't match on query params in route config). They
should be handled inside `src/pages/public/LoginPage.tsx` with `useSearchParams`:

```tsx
const [params] = useSearchParams();
const role = params.get('role');
if (role === 'careseeker') return <Navigate to="/careseeker/login" replace />;
if (role === 'provider') return <Navigate to="/provider/signup" replace />;
```

#### 6. Leftover scratch files (cosmetic)

The following files at `mern/client/` root are leftover from earlier development work and are
not part of the converted app. They can be deleted.

- `tst.txt`
- `fix_rd_chunk1.py`, `fix_rd_chunk2.py`, `fix_rd_chunk3.py`
- `fix_hydration.py`, `fix_setstate.py`, `fix_scale_broken.py`
- `replace_colors.py`
- `REACT_DOCTOR_WAVES_COMPLETE.md`, `WAVE5_AUDIT_REPORT.md`
- `PAYMENT_AUDIT_REPORT.md`, `CARESEEKER_LOGIN_AUDIT_REPORT.md`
- `REACT_DOCTOR_FINAL_REPORT.md`, `REACT_AUDIT_REPORT.md`
- `UI_REFACTOR_RECOMMENDATIONS.md`

#### 7. `<Link href=...>` in 45 component/page files — **FIXED**

React Router's `<Link>` uses the `to` prop, not `href`. Every `<Link href=...>` silently
fell back to a full page reload instead of client-side navigation. Found in 45 files across
pages and components. Fixed by bulk find-and-replace: `<Link href=` → `<Link to=`.

#### 8. `usePathname` in `useAdminAuth.ts`, `staff/Sidebar.tsx`, `trainer/Sidebar.tsx` — **FIXED**

`usePathname` does not exist in `react-router-dom` — it's `next/navigation`. All three files
imported it and called it; they would have thrown a runtime error. Fixed:
- `usePathname()` → `const { pathname } = useLocation()`
- `Link href=` → `Link to=` (both sidebars also had this issue)

#### 9. `useAdminAuth.ts` used `router` (undeclared) and `redirect` (wrong usage) — **FIXED**

`router` was referenced on 3 lines but never declared. `redirect` from `react-router-dom` is
for data router loaders/actions — calling it inside `useEffect`/`useCallback` is a no-op.
Rewrote the hook using `useNavigate()` for all programmatic navigation.

#### 10. `X-Admin-Request` header sends `'true'` not the secret

The original Next.js admin proxy injected `X-Admin-Request: {actual_secret}` server-side.
The SPA's `useAdminAuth` interceptor now sends `'true'`. The Express `requireAdmin` middleware
checks `!isAdmin && !hasAdminHeader` — both conditions must be false to block. Logged-in admin
role users pass the `isAdmin` check regardless of the header, so **normal admin UI use is
unaffected**. The header was an escape hatch for scripted access; the right long-term fix is to
remove the header check from the middleware entirely (role-based auth is sufficient for a web app).

---

## Part 13 — Parity Audit vs Original Next.js Frontend (2026-07-07)

### Section 12 cleanup — fully complete

All 6 cleanup items verified done: `'use client'` directives (0 remaining), `instrumentation.ts`
(deleted), `proxy-config.ts` (deleted), all 4 duplicate nested dirs (deleted), scratch files
(deleted), `Link href=` (0 remaining), `usePathname` from react-router-dom (0 remaining).

### Component / hook / context / API parity — 100%

| Layer | Original | MERN | Status |
|---|---|---|---|
| Components | 74 files | 74 files | ✅ Identical |
| Hooks | 6 files | 6 files | ✅ Identical |
| Contexts | 3 files | 3 files | ✅ Identical |
| API modules | 27 files | 27 files (proxy-config removed) | ✅ Identical |

### Page parity

All admin, careseeker, provider, staff, and trainer sub-pages are present. Three gaps found:

#### Gap 1: `trainer/DashboardPage.tsx` — MISSING → **FIXED**

The route config imported `@/pages/trainer/DashboardPage` but the file didn't exist — runtime
crash on `/trainer/dashboard`. Created from the original `frontend/src/app/trainer/page.tsx`
with `useRouter` → `useNavigate`.

#### Gap 2: `OnboardingRequiredPage` — MISSING → **FIXED**

The original has `app/onboarding-required/page.tsx` — a fallback page shown to users who
have an account but haven't completed onboarding. Used by middleware.ts redirects.
Created at `src/pages/public/OnboardingRequiredPage.tsx` and added route `/onboarding-required`.

#### Gap 3: `/demo/coordinator/*` — 10 pages not converted (intentional)

The original has 10 demo coordinator pages (`demo/coordinator/dashboard`,
`/bookings`, `/careseeker`, `/helper`, `/intake`, `/monitoring`, `/organization`,
`/provider`, `/reporting`). These are demo/prototype pages. They were not included
in the MERN conversion — add them if the demo area is needed in production.

#### Gap 4: `/chat-echo` page not converted (acceptable)

The original has `app/chat-echo/page.tsx` — a development test page for the Echo chat
implementation. Not included in MERN. Add only if needed for debugging.

### Verdict

The proxy layer is correctly eliminated — all 12 Next.js API routes are gone and all calls
go direct to Express with the right paths. The auth routes are dual-aliased in Express
(`/login` and `/auth/login` both work), so both naming styles used in the codebase are valid.

Three runtime crashes were found and fixed (`usePathname`, `router` undefined, `Link href`).
The remaining items are cleanup (dead directives, duplicate dirs, stale files) and one
security note (admin secret header).
