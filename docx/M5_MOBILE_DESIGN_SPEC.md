# M5 — Mobile App Design Specification
**Project:** Riayah Plus HealthOS  
**Platform:** React Native (Expo SDK 54, Expo Router v6 / React Navigation v6)  
**Target:** iOS (TestFlight) + Android (Play internal track)  
**Roles:** Family · Clinical Staff · Support Worker · Coordinator · Org Admin · Admin/Super Admin  
**Boilerplate base:** `mern/mobile/` (already renamed + packages updated)  
**Last updated:** 2026-08-12

---

## 1. Tech Stack

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | Expo SDK 54 + Expo Router v6 | File-based routing on top of React Navigation v6 |
| Language | TypeScript strict | Matches server/web codebase |
| Styling | NativeWind v4 | Tailwind utility classes for React Native |
| Client state | **Zustand** | Auth, UI state, shift timer, offline flag — replaces Redux |
| Server state / cache | **TanStack Query v5** | All API fetching, background refetch, offline persister |
| Offline persist | `@tanstack/query-async-storage-persister` + AsyncStorage | Plan + schedule + tasks survive app restart |
| Forms | React Hook Form + Zod | Matches web form layer |
| HTTP | Axios (`lib/api/client.ts`) | Token injected from Zustand auth store |
| Auth token storage | `expo-secure-store` | Encrypted on-device; never AsyncStorage for tokens |
| Push | `expo-notifications` + FCM/APNs | Expo push token registered on login |
| Maps / GPS | `expo-location` + `react-native-maps` | Check-in/out + coordinator active-worker map |
| Camera / uploads | `expo-image-picker` + `expo-camera` | Evidence photo, profile photo, documents |
| Biometrics | `expo-local-authentication` | Optional after first login |
| Telehealth | `@daily-co/react-native-daily-js` | Install separately — not in boilerplate |
| Bottom sheets | `@gorhom/bottom-sheet` | Task detail, session quick-actions |

### Already in boilerplate (no install needed)
`expo`, `expo-router`, `expo-font`, `expo-image-picker`, `expo-av`, `expo-haptics`, `expo-linear-gradient`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-web-browser`, `@expo/vector-icons`, `@gorhom/bottom-sheet`, `@react-native-async-storage/async-storage`, `axios`, `lottie-react-native`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-paper`

### Added to boilerplate (already in package.json — run `npm install`)
`zustand`, `expo-secure-store`, `expo-location`, `expo-notifications`, `expo-camera`, `expo-local-authentication`, `react-native-maps`, `nativewind`, `tailwindcss`, `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`, `react-hook-form`, `@hookform/resolvers`, `zod`

### Migration notes for Cursor
1. **Remove** Redux: delete `stores/` folder, remove `redux-persist`, `react-redux`, `@reduxjs/toolkit`, `redux-thunk` from dependencies
2. **Replace** `app/_layout.tsx` Redux Provider/PersistGate with Zustand auth initialiser + TanStack QueryClientProvider
3. **Replace** initial route from `(routes)/splash` to `(auth)/login`
4. **Setup NativeWind**: add `import 'nativewind/preset'` to `tailwind.config.js`; wrap metro config with `withNativeWind` in `babel.config.js`
5. Token lives in `expo-secure-store` (encrypted). Zustand holds the decoded user object and token in memory, hydrated from SecureStore on app start

---

## 2. Design System

### Colors (`tailwind.config.js` — already created)

```js
teal:  { 50: '#F0FDFA', 600: '#0D9488', 700: '#0F766E' }
stone: { 50: '#FAFAF9', 100: '#F5F5F4', 200: '#E7E5E4', 400: '#A8A29E', 600: '#57534E', 700: '#44403C', 900: '#1C1917' }
amber: { 50: '#FFFBEB', 400: '#FBBF24', 500: '#F59E0B' }
red:   { 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' }
green: { 50: '#F0FDF4', 500: '#22C55E', 600: '#16A34A' }
```

| Token | Value | Use |
|-------|-------|-----|
| Primary | teal-600 `#0D9488` | Buttons, active tabs, links |
| Background | stone-50 `#FAFAF9` | All screen backgrounds |
| Card | white `#FFFFFF` | Cards, list items |
| Border | stone-200 `#E7E5E4` | Input borders, dividers |
| Text primary | stone-900 `#1C1917` | Headings, body |
| Text muted | stone-400 `#A8A29E` | Labels, captions |
| Danger | red-600 `#DC2626` | Errors, destructive |
| Warning | amber-500 `#F59E0B` | Pending, caution |
| Success | green-600 `#16A34A` | Active, completed |

### Typography — system fonts (SF Pro / Roboto, no custom load)

| Role | Class |
|------|-------|
| Screen title | `text-2xl font-bold text-stone-900` |
| Section header | `text-base font-semibold text-stone-900` |
| Body | `text-base text-stone-700` |
| Caption | `text-sm text-stone-400` |
| Button | `text-base font-semibold` |
| Badge | `text-xs font-semibold` |

### Spacing
- Screen padding: `px-4` (16px) · Card padding: `p-4` · Gap between sections: `gap-3`
- Card radius: `rounded-2xl` · Button/input radius: `rounded-xl`

### Card shadow
```js
shadowColor: '#1C1917', shadowOffset: {width:0, height:1}, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2
```

### StatusBadge colors
| Status | Dot | Bg | Text |
|--------|-----|----|------|
| active / accepted | green-500 | green-50 | green-600 |
| pending | amber-400 | amber-50 | amber-600 |
| under_review / submitted_for_approval | teal-600 | teal-50 | teal-600 |
| cancelled / overdue | red-500 | red-50 | red-600 |
| completed / draft | stone-400 | stone-100 | stone-600 |

---

## 3. State Management

### Zustand Auth Store (`stores/authStore.ts`)

```ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../lib/api/client';

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  isLoading: true,
  hydrate: async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (!token) { set({ isLoading: false }); return; }
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
      const { data } = await apiClient.get('/api/users/me');
      set({ token, user: data.user ?? data, isLoading: false });
    } catch {
      await SecureStore.deleteItemAsync('auth_token');
      set({ isLoading: false });
    }
  },
  login: async (email, password) => {
    const { data } = await apiClient.post('/api/auth/login', { email, password });
    const token = data.token ?? data.access_token;
    await SecureStore.setItemAsync('auth_token', token);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    const me = await apiClient.get('/api/users/me');
    set({ token, user: me.data.user ?? me.data });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    delete apiClient.defaults.headers.common['Authorization'];
    set({ token: null, user: null });
  },
}));
```

### Other Zustand stores (create as needed)
- `stores/shiftStore.ts` — active shift state (startedAt, status, timer tick)
- `stores/offlineStore.ts` — network status flag, stale banner visibility
- `stores/onboardingStore.ts` — wizard step data (careUnitId, patientId, intakeId)

---

## 4. Project Structure

```
mern/mobile/
├── app/
│   ├── _layout.tsx                      # Root: QueryClientProvider + AuthGate + ToastProvider
│   ├── index.tsx                        # Hydrate auth → route to correct group
│   ├── (auth)/
│   │   ├── _layout.tsx                  # Stack, no tab bar
│   │   ├── login.tsx
│   │   ├── otp.tsx
│   │   └── forgot-password.tsx
│   ├── (onboarding)/                    # New family users (no Care Unit yet)
│   │   ├── _layout.tsx                  # Stack + progress bar
│   │   ├── step-1-care-unit.tsx
│   │   ├── step-2-patient.tsx
│   │   ├── step-3-caregiver.tsx
│   │   ├── step-4-reason.tsx
│   │   ├── step-5-medical.tsx
│   │   ├── step-6-services.tsx
│   │   └── step-7-documents.tsx
│   ├── (family)/
│   │   ├── _layout.tsx                  # Tabs: Home | Care | Book | Messages | Profile
│   │   ├── index.tsx                    # Dashboard
│   │   ├── episode/
│   │   │   ├── index.tsx                # Tabbed: Overview | Care Plan | Sessions | Assessments
│   │   │   ├── care-plan.tsx            # Goals + Approve / Request Changes
│   │   │   ├── sessions.tsx
│   │   │   └── assessments.tsx
│   │   ├── book/index.tsx               # Book appointment
│   │   ├── telehealth/[id].tsx          # Waiting room + Daily.co join
│   │   ├── messages/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── invoices/                    # ⏸ DEFERRED (M4)
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── notifications.tsx
│   │   └── profile/index.tsx
│   ├── (staff)/                         # Clinical Staff + Support Worker (role-adaptive)
│   │   ├── _layout.tsx                  # Role-adaptive tabs
│   │   ├── index.tsx                    # Today view
│   │   ├── schedule/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx                 # Session detail (GPS for support / clinical notes for clinical)
│   │   ├── tasks/index.tsx
│   │   ├── patients/                    # Clinical roles only
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── assessments/                 # Clinical roles only
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── telehealth/[id].tsx          # Clinical roles only
│   │   ├── shift.tsx                    # Support worker shift management
│   │   ├── availability.tsx
│   │   ├── notifications.tsx
│   │   └── profile/
│   │       ├── index.tsx
│   │       └── edit.tsx                 # Self-managed profile (PE-01)
│   ├── (coordinator)/
│   │   ├── _layout.tsx                  # Tabs: Home | Intakes | Episodes | Plans | Schedule
│   │   ├── index.tsx                    # Dashboard: queue count, active episodes, today's sessions
│   │   ├── intake/
│   │   │   ├── index.tsx                # Intake queue list
│   │   │   └── [id].tsx                 # Intake detail + actions (approve / request info / validate)
│   │   ├── episodes/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx                 # Episode detail + staff assignment + status
│   │   ├── plans/
│   │   │   ├── index.tsx
│   │   │   ├── new.tsx                  # Care plan builder + AI Draft button
│   │   │   └── [id].tsx                 # Plan detail + submit for approval + version history
│   │   ├── schedule/index.tsx           # All sessions across assigned patients
│   │   ├── map.tsx                      # Active worker GPS map
│   │   ├── notifications.tsx
│   │   └── profile/index.tsx
│   ├── (org)/
│   │   ├── _layout.tsx                  # Tabs: Dashboard | Staff | Coordinators | Requests | Analytics
│   │   ├── index.tsx                    # Org overview dashboard
│   │   ├── staff/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── coordinators/
│   │   │   ├── index.tsx
│   │   │   └── [id].tsx
│   │   ├── requests/index.tsx           # Pending family requests — approve / assign coordinator
│   │   ├── analytics/index.tsx          # 4-area dashboard scoped to org
│   │   ├── notifications.tsx
│   │   └── profile/index.tsx
│   └── (admin)/
│       ├── _layout.tsx                  # Tabs: Dashboard | Analytics | Audit | GPS | Orgs
│       ├── index.tsx
│       ├── analytics/index.tsx          # All orgs, 4 dashboards
│       ├── audit/index.tsx              # Audit log viewer (search/filter)
│       ├── gps/
│       │   ├── index.tsx                # GPS log list
│       │   └── [sessionId].tsx          # Map replay per session
│       ├── organizations/index.tsx
│       ├── notifications.tsx
│       └── profile/index.tsx
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── StatusBadge.tsx
│   │   ├── Avatar.tsx
│   │   ├── StaffCard.tsx               # PE-05
│   │   ├── ScreenHeader.tsx
│   │   └── EmptyState.tsx
│   ├── session/SessionCard.tsx
│   ├── episode/
│   │   ├── EpisodeCard.tsx
│   │   └── GoalList.tsx
│   └── shift/ShiftTimer.tsx
├── stores/
│   ├── authStore.ts                     # Zustand auth (token + user + hydrate + login + logout)
│   ├── shiftStore.ts                    # Active shift state + timer
│   ├── offlineStore.ts                  # Network status flag
│   └── onboardingStore.ts               # Wizard step data
├── lib/
│   ├── api/
│   │   ├── client.ts                    # Axios instance (EXPO_PUBLIC_API_URL)
│   │   ├── auth.ts
│   │   ├── episodes.ts
│   │   ├── sessions.ts
│   │   ├── tasks.ts
│   │   ├── shifts.ts
│   │   ├── assessments.ts
│   │   ├── messages.ts
│   │   ├── carePlans.ts
│   │   ├── intake.ts
│   │   └── profile.ts
│   ├── query/client.ts                  # TanStack Query client + AsyncStorage persister
│   └── utils/
│       ├── date.ts
│       ├── status.ts
│       └── roles.ts                     # Role arrays + isClinical() / isSupport() helpers
├── assets/images/
├── app.json                             # Updated (Riayah Plus, com.raiyahplus.app)
├── package.json                         # Updated (all deps added)
├── tailwind.config.js                   # Riayah color palette
└── tsconfig.json                        # @/* alias configured
```

---

## 5. Navigation Architecture

### Routing logic (`app/index.tsx`)

```
On mount: useAuthStore.hydrate()
  → isLoading = true → show splash / nothing
  → no token → (auth)/login
  → token valid → read role + careUnitId
      family/client/consumer/patient
          → has careUnitId  → (family)
          → no careUnitId   → (onboarding)/step-1-care-unit
      support_worker / caregiver / companion
          → (staff)  [support tab set]
      clinical_staff / doctor / nurse / physio / OT / speech / psych / dietitian / therapist
          → (staff)  [clinical tab set]
      care_coordinator
          → (coordinator)
      admin (org/clinic admin)
          → (org)
      super_admin / support_admin
          → (admin)
```

### Tab navigators

**Family `(family)/_layout.tsx`**
| Tab | Icon | Route |
|-----|------|-------|
| Home | house | `(family)/index` |
| Care | heart-pulse | `(family)/episode/index` |
| Book | plus-circle | `(family)/book/index` |
| Messages | message-circle | `(family)/messages/index` |
| Profile | user | `(family)/profile/index` |

**Clinical Staff `(staff)/_layout.tsx`** (role = clinical_staff/doctor/nurse/physio/…)
| Tab | Icon | Route |
|-----|------|-------|
| Home | home | `(staff)/index` |
| Patients | users | `(staff)/patients/index` |
| Schedule | calendar | `(staff)/schedule/index` |
| Tasks | check-square | `(staff)/tasks/index` |
| Profile | user | `(staff)/profile/index` |

**Support Worker `(staff)/_layout.tsx`** (role = support_worker/caregiver/companion)
| Tab | Icon | Route |
|-----|------|-------|
| Home | home | `(staff)/index` |
| Schedule | calendar | `(staff)/schedule/index` |
| Tasks | check-square | `(staff)/tasks/index` |
| Profile | user | `(staff)/profile/index` |

**Coordinator `(coordinator)/_layout.tsx`**
| Tab | Icon | Route |
|-----|------|-------|
| Home | home | `(coordinator)/index` |
| Intakes | inbox | `(coordinator)/intake/index` |
| Episodes | folder | `(coordinator)/episodes/index` |
| Plans | file-text | `(coordinator)/plans/index` |
| Schedule | calendar | `(coordinator)/schedule/index` |

**Org Admin `(org)/_layout.tsx`**
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | home | `(org)/index` |
| Staff | users | `(org)/staff/index` |
| Coordinators | user-check | `(org)/coordinators/index` |
| Requests | bell | `(org)/requests/index` |
| Analytics | bar-chart | `(org)/analytics/index` |

**Admin `(admin)/_layout.tsx`**
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | home | `(admin)/index` |
| Analytics | bar-chart-2 | `(admin)/analytics/index` |
| Audit | shield | `(admin)/audit/index` |
| GPS | map-pin | `(admin)/gps/index` |
| Orgs | building | `(admin)/organizations/index` |

Active tab: teal-600. Inactive: stone-400. Tab bar bg: white with top border stone-200.

---

## 6. Screen Specifications

### 6.0 Onboarding (Family new users)

7-step wizard. Progress bar at top. Stack navigation, no tab bar. Each step: content + Next button (primary) + Back button (ghost, except step 1). Wizard state held in `onboardingStore`.

| Step | File | Fields | API |
|------|------|--------|-----|
| 1 | `step-1-care-unit` | Care unit name, relationship to patient (select) | `POST /api/care-units` |
| 2 | `step-2-patient` | Full name, DOB (DatePicker), Gender, Nationality | `POST /api/patients` |
| 3 | `step-3-caregiver` | Caregiver name, phone, email, address | `PATCH /api/care-units/:id` |
| 4 | `step-4-reason` | Reason for care (textarea), urgency (segmented: Routine / Urgent / Emergency) | `POST /api/intake` |
| 5 | `step-5-medical` | ICD-10 diagnoses (searchable), medications (repeating rows), allergies (chips) | `PATCH /api/intake/:id` |
| 6 | `step-6-services` | Multi-select grid: Nursing, Support Worker, Physio, OT, Speech, Psychology, Dietitian, Companion, Home Mods | `PATCH /api/intake/:id` |
| 7 | `step-7-documents` | File upload (expo-image-picker / document picker), Privacy consent ☑, Treatment consent ☑, Submit | S3 presign → `POST /api/intake/:id/submit` |

On step 7 success → `router.replace('/(family)')`.

---

### 6.1 Auth Screens

**Login (`(auth)/login.tsx`)**
```
┌────────────────────────────────┐
│  [Logo 80px]                   │
│  Riayah Plus   ← teal-600 bold │
│  HealthOS Platform ← stone-400 │
│                                │
│  [Email input]                 │
│  [Password input  👁]          │
│  Forgot password? → right      │
│                                │
│  [ Sign In ] ← full-width h-14 │
│  ─── or ───                    │
│  [ Face ID / Touch ID ] ← if enrolled
└────────────────────────────────┘
```
- No registration — admin-invited users only
- On success: `useAuthStore.login()` → `app/index.tsx` routes by role

---

### 6.2 Family Screens

**Home (`(family)/index.tsx`)**

Active episode card (teal-50 bg) → episode title, status badge, coordinator name  
Next session → StaffCard compact (provider photo + name + role) + date/time  
Goals progress → ProgressBar (teal-600) + "X/Y complete"  
Quick actions → [Book Service] [Join Telehealth] (if telehealth session today)  
Recent notifications (unread 3)

API: `GET /api/care-episodes?patientId=me&status=active` · `GET /api/scheduling/sessions?episodeId=:id` · `GET /api/notifications?unread=true&limit=3`

**Episode (`(family)/episode/index.tsx`)**  
Horizontal scroll tabs: **Overview** | **Care Plan** | **Sessions** | **Assessments**
- Overview: title, status, coordinator StaffCard full, key dates
- Care Plan: → `care-plan.tsx`
- Sessions: SessionCard list (StaffCard compact + time + type badge + status)
- Assessments: clinician StaffCard full + date + status badge

**Care Plan (`(family)/episode/care-plan.tsx`)**  
Version + status badge. If `submitted_for_approval`: [Approve Plan] + [Request Changes] buttons.  
Goals list (GoalList component). Services planned list.  
API: `GET /api/care-plans?episodeId=:id&isCurrentVersion=true` · `POST /api/care-plans/:id/approve` · `POST /api/care-plans/:id/request-revision`

**Book (`(family)/book/index.tsx`)**  
Step 1: Service type grid (tap to select)  
Step 2: Date picker row + available providers (StaffCard compact + time slot per provider)  
Step 3: Notes textarea (optional)  
Step 4: Summary → Confirm Booking  
API: `GET /api/scheduling/staff?role=:type` · `GET /api/availability/slots?providerId=:id&date=:d` · `POST /api/scheduling/sessions`

**Messages (`(family)/messages/`)**  
List: conversation cards (avatar, name, last message, unread badge, timestamp)  
Thread: right bubbles stone-100 (outgoing) / left bubbles teal-600 white (incoming) · input bar + send + attach

**Telehealth (`(family)/telehealth/[id].tsx`)**  
Waiting room UI while `status=waiting`. On admit: full-screen Daily.co room. Controls: mute, camera, leave.  
API: `GET /api/sessions/:id/telehealth-token` → `{ roomUrl, token }`

---

### 6.3 Staff Screens (Clinical + Support Worker — same route group, role-adaptive)

**Home (`(staff)/index.tsx`)**  
Active shift card (ShiftTimer live) OR [Start Shift] button  
Today's sessions list — if clinical + telehealth session → [Join] button per row  
Pending tasks count + top 2 tasks

**Schedule (`(staff)/schedule/[id].tsx`)**

*Support Worker view:*  
Client avatar + name + time. Map snapshot (react-native-maps). Distance indicator (✓ Within 200m / ⚠ 450m away). [GPS Check-in] button. Notes textarea. [+ Add Photo]. [GPS Check-out & Complete] button.  
API: `POST /api/sessions/:id/checkin { lat, lng }` · `POST /api/sessions/:id/checkout { lat, lng, notes }`

*Clinical Staff view (same route, role-branched render):*  
Patient name + time + type badge. [Join Telehealth] (if telehealth). Care plan summary accordion. Session note textarea + note type selector (clinical_note / nursing_note / therapy_note). [Save Note].  
API: `POST /api/notes { sessionId, type, content }`

**Tasks (`(staff)/tasks/index.tsx`)**  
Filter chips: All | Pending | Completed. Tap task → `@gorhom/bottom-sheet` detail + complete form.  
API: `GET /api/tasks?assignee=me` · `PATCH /api/tasks/:id/status`

**Patients (`(staff)/patients/`) — Clinical only**  
List: patient avatar, name, age, episode status, last assessment date.  
Detail: profile summary, active episode, GoalList (read), last 3 session notes, action buttons.

**Assessments (`(staff)/assessments/`) — Clinical only**  
List: patient name + assessment date + status badge (filter: Scheduled / In Progress / Completed).  
Detail: structured fields + Start/Complete actions + notes entry + report upload.

**Telehealth (`(staff)/telehealth/[id].tsx`) — Clinical only**  
Waiting room: patient cards with [Admit] button. On admit: Daily.co room. Side panel bottom sheet: care plan summary + prior notes. Controls: mute, camera, leave.

**Shift (`(staff)/shift.tsx`) — Support Worker**  
[Start Shift] → [Take Break] / [End Shift]. ShiftTimer live. Booking reference shown.  
API: `POST /api/shifts/start` · `PATCH /api/shifts/:id`

**Profile Edit (`(staff)/profile/edit.tsx`) — PE-01**  
Avatar tap → change photo. Non-editable: Name, Role. Editable: DOB, Gender, Nationality, Experience, Languages (chips), Bio. Internal: Qatar ID, Emergency Contact.  
API: `PATCH /api/users/me/profile` · `POST /api/users/me/avatar`

---

### 6.4 Coordinator Screens

**Home (`(coordinator)/index.tsx`)**  
Open intakes count card (urgency breakdown). Active episodes count. Today's sessions (first 3). Unread notifications badge.

**Intake Queue (`(coordinator)/intake/`)**  
List: patient name, urgency badge, submission time, status badge. Filter: All / Pending / Under Review.  
Detail (`[id].tsx`): intake summary — patient info, reason, urgency, medical history, service interests, uploaded documents. Actions: [Mark Under Review] · [Validate & Create Episode] · [Request More Info]. AI intake summary panel (if available) with [Approve Summary] button.  
API: `GET /api/coordinator/intake-queue` · `PATCH /api/intake/:id/status` · `POST /api/intake/:id/review`

**Episodes (`(coordinator)/episodes/`)**  
List: episode title, patient name, status badge, last activity.  
Detail: episode status + state machine actions (advance/revert), assigned staff list, assessments, open tasks, linked care plans.  
API: `GET /api/care-episodes` · `PATCH /api/care-episodes/:id`

**Care Plans (`(coordinator)/plans/`)**  
List: plan title, episode name, version, status badge.  
Builder (`new.tsx`):
```
┌────────────────────────────────┐
│  New Care Plan                 │
│  Episode: [name]               │
│                                │
│  [AI intake summary panel]     │
│  [Approve Summary] ← if draft  │
│                                │
│  Title [input]                 │
│  Notes [textarea]              │
│                                │
│  Goals          [+ Add]        │
│  ┌─────────────────────────┐   │
│  │ Title | Measurement | ✕ │   │
│  │ Description             │   │
│  └─────────────────────────┘   │
│                                │
│  Services       [+ Add]        │
│  ┌─────────────────────────┐   │
│  │ Type | Freq | Duration  │   │
│  │ Unit cost            ✕  │   │
│  └─────────────────────────┘   │
│                                │
│  [Create Draft] [✨ AI Draft]  │
└────────────────────────────────┘
```
AI Draft: `POST /api/care-plans/ai-draft/:episodeId` → navigates to draft detail on success  
Detail (`[id].tsx`): read plan, [Submit for Approval], version history list with diff per version  
API: mirrors web `lib/api/carePlans.ts`

**Schedule (`(coordinator)/schedule/index.tsx`)**  
All sessions across assigned patients, grouped by day. Each row: patient name + provider StaffCard compact + time + type + status. Tap → read-only session detail.

**GPS Map (`(coordinator)/map.tsx`)**  
`react-native-maps` MapView. Markers for each active worker (last known position). Tap marker → worker name + client name + check-in time.  
API: `GET /api/staff/active-locations`

---

### 6.5 Org Admin Screens

**Dashboard (`(org)/index.tsx`)**  
Summary cards: total staff, total coordinators, active episodes, pending requests (with badge).

**Staff (`(org)/staff/`)**  
List: avatar, name, role, status badge (active/inactive). Tap → detail with profile info, shift history, current assignments. Actions: [Deactivate] / [Reactivate].  
API: mirrors `OrgPortalController` staff endpoints

**Coordinators (`(org)/coordinators/`)**  
List + detail. Detail shows assigned episodes count, pending approvals.  
Actions: [Deactivate] / [Reassign Episodes].

**Pending Requests (`(org)/requests/index.tsx`)**  
Family care requests pending org assignment. Each card: family name, patient name, urgency, submitted date. Actions: [Assign Coordinator ▼] (select picker) · [Accept] · [Decline].  
API: `GET /api/org/pending-requests` · `PATCH /api/org/requests/:id`

**Analytics (`(org)/analytics/index.tsx`)**  
4 tabbed cards: Care Outcomes · Service Utilisation · Staff Performance · Financial  
Date range picker (last 7d / 30d / 90d / custom). Charts via `react-native-chart-kit` or Victory Native.  
All data filtered to this org automatically by backend.  
Export: [Export CSV] → email download link (no in-app file save needed).  
API: `GET /api/reports/care-outcomes?orgId=me` etc.

---

### 6.6 Admin / Super Admin Screens

**Analytics (`(admin)/analytics/index.tsx`)**  
Same 4 tabs as org analytics. Org filter dropdown (select any org or "All"). Date range picker.  
API: `GET /api/reports/care-outcomes` (unscoped — admin sees all)

**Audit Log (`(admin)/audit/index.tsx`)**  
Search input + filters (action type, date range, user). Infinite scroll list.  
Each row: action, user, entity, timestamp. Tap → detail modal with full before/after JSON.  
Export: [Export CSV] / [Export JSON] buttons.  
API: `GET /api/audit-logs?search=&action=&from=&to=&userId=`

**GPS Logs (`(admin)/gps/`)**  
List: worker name + session date + client name + within_geofence badge.  
Session map replay (`[sessionId].tsx`): polyline of check-in → check-out on MapView + timestamps.  
API: `GET /api/gps-logs` · `GET /api/gps-logs/:sessionId/replay`

**Organizations (`(admin)/organizations/index.tsx`)**  
List of all orgs with active episode count, staff count, status. Tap → org detail (read-only overview, link to web for edits).

> GDPR deletion workflows, data retention config, compliance export, and configuration engine (service catalog, templates) are **web-only** — high-stakes actions that require deliberate desktop environment.

---

### 6.7 Shared — StaffCard Component (PE-05)

```
compact: [Avatar 40px]  Name · Role · X yrs
full:    [Avatar 64px]  Name
                        Role · X yrs exp
                        🌐 Arabic, English
                        📍 Lusail, West Bay
                        "Bio excerpt..."
```

Used in: Family sessions/assessments, Coordinator schedule, Booking staff picker, Staff profile preview.

---

## 7. GPS & Geofencing

Check-in endpoint: `POST /api/sessions/:id/checkin { lat, lng, timestamp }`  
Check-out endpoint: `POST /api/sessions/:id/checkout { lat, lng, notes }`  
Backend: Haversine distance vs client address coordinates → store `{ withinGeofence, distanceMeters }` in `ShiftCheckIn`.  
Default radius: 300m (org-configurable).  
Mobile: request `expo-location` `foregroundPermissions` only. No background tracking.

---

## 8. Offline Capability

Persist these TanStack Query keys to AsyncStorage (24h TTL):
- `['care-plan', episodeId]`
- `['sessions', 'me']`
- `['tasks', 'me', 'pending']`
- `['care-episodes', 'active']`

Show `⚠ Offline — showing saved data` banner (amber-50 bg) when `useNetInfo().isConnected === false`.  
On reconnect: `queryClient.invalidateQueries()` to force refetch.

---

## 9. Push Notifications

Register on login:
```ts
const token = await Notifications.getExpoPushTokenAsync();
await apiClient.patch('/api/users/me/push-token', { expoPushToken: token.data });
```

Events:
| Event | Who receives |
|-------|-------------|
| `session_assigned` | Clinical Staff / Support Worker |
| `care_plan_submitted` | Family |
| `care_plan_approved` | Coordinator |
| `task_assigned` | All staff |
| `intake_status_changed` | Coordinator |
| `message_received` | All roles |
| `assessment_due` | Clinical Staff, Coordinator |
| `shift_reminder` | Support Worker (30 min before session) |

---

## 10. Build & Deployment

```bash
cd mern/mobile
npm install
npx expo start          # dev
eas build --platform ios --profile preview      # TestFlight
eas build --platform android --profile preview  # Play internal
```

`eas.json`:
```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "simulator": false }
    }
  }
}
```

---

## 11. Scope Boundaries

### ✅ Built in mobile (all 6 roles)
Family: full onboarding, dashboard, episode, care plan approval, booking, telehealth, messages, notifications  
Clinical Staff: patient list, schedule, assessments, session notes, telehealth  
Support Worker: schedule, GPS check-in/out, tasks, shift management, evidence upload  
Coordinator: intake queue + actions, episodes, care plan builder + AI draft, schedule, GPS map  
Org Admin: staff, coordinators, pending requests, org analytics  
Admin: analytics (all orgs), audit log viewer, GPS logs + map replay, org list

### ⏸ Deferred (build after M4)
Family invoices + in-app payment

### ❌ Web-only (not on mobile)
GDPR/data retention workflows · Compliance export (CSV/JSON bulk) · Configuration engine (service catalog, templates, goal library) · Care plan diff viewer (complex side-by-side — stays in web coordinator plan detail) · Public App Store listing · Arabic/RTL · Continuous GPS
