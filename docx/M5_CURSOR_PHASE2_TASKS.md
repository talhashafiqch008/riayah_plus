# M5 Mobile — Phase 2: Core Screens
### Cursor Task File

**App directory:** `mern/mobile/`  
**Design spec:** `mern/docx/M5_MOBILE_DESIGN_SPEC.md`  
**Phase 1 base:** All providers, Zustand stores, tab navigators, and UI components are complete. Do not modify them unless a task explicitly says so.

> **SUPERSEDED (Family Tasks 2–5) — Aug 2026**  
> Source of truth is **`mern/client`** (Vite Family Portal), **not** root `frontend/` (Next.js).  
> Family mobile must mirror:
> - `/family/onboarding` → `CareOnboardingWizard` (`variant="family"`) in `mern/client/src/pages/careseeker/OnboardingPage.tsx`
> - `/family` dashboard → `RoleShellDashboard` family branch
> - `/family/care-unit`, `/family/episodes`, `/family/bookings`, `/family/care-plans` (shared care pages)
> - Documents / Messages = placeholders only  
> Do **not** implement the old clinical 7-step intake, fictional `/api/family/dashboard`, episode tab-strip, or availability booking wizard described in Tasks 3–5 below. Those sections are historical and wrong for the live portal.  
> Staff / coordinator Tasks 6–9 remain valid unless they conflict with `mern/client` role shells.

---

## Phase 2 Scope

This phase delivers every screen a user touches in their first session and their daily workflow. The goal is zero `<View />` stubs left in the flows below.

| # | Area | Files | Status |
|---|------|-------|--------|
| 1 | Login redesign | `(auth)/login.tsx` | Keep |
| 2 | Family care request | `(onboarding)/` — mirror `mern/client` wizard | **Rewrite — see supersession** |
| 3 | Family home | `(family)/index.tsx` — mirror `RoleShellDashboard` | **Rewrite — see supersession** |
| 4 | Family care journey | `(family)/episodes/` — mirror web episodes | **Rewrite — see supersession** |
| 5 | Family appointments / care-unit / care-plans | match web IA | **Rewrite — see supersession** |
| 6 | Support worker shift + GPS | `(staff)/shift.tsx`, `(staff)/index.tsx` (SW variant) | Keep unless conflicts |
| 7 | Clinical staff home + schedule | `(staff)/…` | Keep unless conflicts |
| 8 | Coordinator intake queue | `(coordinator)/intake/…` | Keep unless conflicts |
| 9 | Shared profile + notifications | `profile/`, `notifications` | Keep |

---

## Shared Patterns (apply everywhere in Phase 2)

Read these rules before writing any screen. They apply to every file below.

**Screen wrapper:**
```tsx
<SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
  <ScreenHeader title="..." />
  <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
    {/* content */}
  </ScrollView>
</SafeAreaView>
```
Use `FlatList` instead of `ScrollView` + `map()` whenever the list can be long (>5 items).

**Data fetching template:**
```tsx
const { data, isLoading, isError, refetch } = useQuery({
  queryKey: ['resource-name', param],
  queryFn: () => apiClient.get('/api/...').then(r => r.data),
});
```
Loading: show `<ActivityIndicator size="large" color="#0D9488" className="mt-12" />` centred.  
Error: show `<EmptyState icon="alert-circle-outline" title="Could not load" subtitle={error?.message} action={{ label: 'Try again', onPress: refetch }} />`.

**Pull-to-refresh:**
```tsx
<FlatList
  refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#0D9488" />}
  ...
/>
```

**Mutations:**
```tsx
const mutation = useMutation({
  mutationFn: (body) => apiClient.post('/api/...', body).then(r => r.data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['resource-name'] });
    useToast().show('Done', { type: 'success' });
  },
  onError: (e) => useToast().show(e.message, { type: 'danger' }),
});
```
Get `useToast` from: `import { useToast } from 'react-native-toast-notifications';`  
Get `queryClient` from: `import { queryClient } from '../../../lib/query/client';`

**Section heading:**
```tsx
<Text className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-stone-400">
  Section Title
</Text>
```

---

## Task 1 — Login Screen ✅ ALREADY IMPLEMENTED

**File:** `app/(auth)/login.tsx`

**Status: Complete — do not modify.** This screen has already been redesigned with:
- `LinearGradient(['#F0FDFA', '#FFFFFF', '#EFF6FF'])` full-screen background matching the web
- Wide horizontal logo (`Dimensions.get('window').width - 100` wide, 90px tall)
- Frosted white card (rgba white, borderRadius 20, stone shadow)
- Teal-shadowed Sign In button
- Biometric (Face ID / fingerprint) sign-in support
- Forgot password link → `(auth)/forgot-password`

Also complete: `(auth)/forgot-password.tsx` and `(auth)/otp.tsx` — same gradient/card aesthetic.

---

## Task 2 — Family Onboarding / New Care Request

**Files:** `(onboarding)/step-1-care-unit.tsx` through `step-6-services.tsx`

**Critical rule: Mirror the web exactly.**

Before writing a single line, read these web files in full:
- `frontend/src/app/careseeker/onboarding/page.tsx` — orchestrator, step enum, draft save/restore logic
- `frontend/src/app/careseeker/onboarding/steps/StepWelcome.tsx`
- `frontend/src/app/careseeker/onboarding/steps/StepCountryLanguage.tsx`
- `frontend/src/app/careseeker/onboarding/steps/StepCareNeeds.tsx`
- `frontend/src/app/careseeker/onboarding/steps/StepPreferences.tsx`
- `frontend/src/app/careseeker/onboarding/steps/StepSchedule.tsx`
- `frontend/src/app/careseeker/onboarding/steps/StepConsent.tsx`
- `frontend/src/lib/api/auth.ts` — find `completeClientOnboarding()` for the exact API call + payload shape

Implement each step to match the web's UX behavior, options, and API payload field-for-field. Do not invent steps or skip options.

**This flow is NOT one-time onboarding.** It is a "new care request" flow that users can re-enter any time they want to submit another care request — the same way the web works. The flow must be accessible from:
1. First login (when `user.careUnitId` is null — already handled in `routeByRole` in `authStore.ts`)
2. A "New Request" or "Find Care" button on the family home dashboard → `router.push('/(onboarding)/step-1-care-unit')`

**Current state of these files:** A partial implementation exists (steps 1–6 have some content). Read what's there, then rewrite each step to match the web components exactly. The existing `stores/onboardingStore.ts` data shape is a reasonable starting point but verify every field against the web's `completeClientOnboarding()` payload and adjust as needed.

**Step mapping (6 steps — skip the web's Registration step since mobile users are already logged in):**

| Mobile file | Web step | Content |
|-------------|----------|---------|
| `step-1-care-unit.tsx` | `WELCOME` | Welcome screen — logo, feature highlights, "Get Started" |
| `step-2-patient.tsx` | `LOCATION` | Country + language + who needs care (account type) |
| `step-3-caregiver.tsx` | `CARE_NEEDS` | Care categories grid + sub-options panel + NDIS details |
| `step-4-reason.tsx` | `PREFERENCES` | Provider gender + spoken languages + care location + address |
| `step-5-medical.tsx` | `SCHEDULE` | Frequency + preferred days + time slots + start timing |
| `step-6-services.tsx` | `CONSENT` | 3 consent items + submit → `POST /api/client-onboarding/complete` |

`step-7-documents.tsx` is a redirect stub — leave it as-is.

**After submit:** call `reset()` on the store, then `router.replace('/(family)')`. Do not navigate to an intake detail — the web redirects straight to the dashboard after consent.

---

## Task 3 — Family Home Dashboard

**File:** `app/(family)/index.tsx`

Replace `RoleHomeStub` with a real dashboard.

**Data:**
```ts
const { data, isLoading, refetch, isFetching } = useQuery({
  queryKey: ['family-dashboard'],
  queryFn: () => apiClient.get('/api/family/dashboard').then(r => r.data),
});
```
Response shape (assume): `{ episode: { id, status, careType, coordinatorName, startDate }, nextSession: { id, scheduledAt, providerName, serviceType } | null, unreadNotifications: number }`

**Layout:**
```
ScreenHeader: "Riayah Plus"  [bell icon badge with unreadNotifications count → notifications screen]

Greeting row: "Good morning, {name}" in text-stone-900 font-semibold

─── Active Episode Card ─────────────────
Card (onPress → episode/index):
  Row: teal-600 dot + "Active Episode"  StatusBadge(episode.status)
  Text: episode.careType (bold, stone-900)
  Text: "Coordinator: {episode.coordinatorName}" (stone-500, sm)
  Text: "Since {formatDate(episode.startDate)}" (stone-400, xs)
  Chevron right (stone-300)
─────────────────────────────────────────

─── Next Session ────────────────────────
If nextSession:
  Card:
    Row: calendar-outline icon (teal) + "Next Session"
    Text: formatDateTime(nextSession.scheduledAt) (bold)
    Text: "{nextSession.serviceType} with {nextSession.providerName}" (stone-500)
    Button variant="secondary" size="sm" "View Details" → /family/episode/sessions
If !nextSession:
  Card: EmptyState variant (smaller) "No upcoming sessions" + "Book a session" action → /family/book
─────────────────────────────────────────

─── Quick Actions ───────────────────────
Row of 3 action buttons (Card, flex-1, centered, onPress):
  [+ Book Session → /(family)/book]
  [📋 Episode → /(family)/episode]
  [💬 Messages → /(family)/messages]

Also add a secondary "New Care Request" link below the quick actions row
(text-sm text-teal-600 font-medium, centered) that pushes to:
  router.push('/(onboarding)/step-1-care-unit')
This is how users re-enter the onboarding flow to submit a new care request
after their first one is complete — same as the web.
─────────────────────────────────────────
```

**Date helper:**
```ts
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
```

---

## Task 4 — Family Episode Screen

**Files:** `(family)/episode/index.tsx`, `care-plan.tsx`, `sessions.tsx`, `assessments.tsx`

### 4a. `episode/index.tsx` — Episode Overview + Tab Strip

This screen uses a **manual horizontal tab strip** (not Expo Router tabs — those are for the bottom nav). Implement as a `useState` for the active tab and conditionally render content.

```ts
type EpisodeTab = 'overview' | 'care-plan' | 'sessions' | 'assessments';
const [activeTab, setActiveTab] = useState<EpisodeTab>('overview');
```

Tab strip (horizontal `ScrollView` with 4 tabs):
```tsx
const TABS: { key: EpisodeTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'care-plan', label: 'Care Plan' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'assessments', label: 'Assessments' },
];
```
Active tab: `border-b-2 border-teal-600 text-teal-600`. Inactive: `text-stone-400`.

**Data:**
```ts
const { data: episode } = useQuery({
  queryKey: ['family-episode'],
  queryFn: () => apiClient.get('/api/family/episode').then(r => r.data),
});
```

**Overview tab content:**
- Episode info card: status badge, care type, start date, care coordinator name + avatar
- Assigned staff list: FlatList of `StaffCard` (name, role, avatar)

**Care Plan tab:** import and render `<CarePlanTab episodeId={episode?.id} />`  
**Sessions tab:** import and render `<SessionsTab episodeId={episode?.id} />`  
**Assessments tab:** import and render `<AssessmentsTab episodeId={episode?.id} />`

### 4b. `episode/care-plan.tsx` — CarePlanTab component

Export a `CarePlanTab` component (not a screen):
```ts
export function CarePlanTab({ episodeId }: { episodeId?: string }) { ... }
```

Data: `GET /api/episodes/:episodeId/care-plan` → `{ title, notes, goals: [{ title, measurement, description }][], services: [{ serviceType, frequency, duration }][] }`

If no care plan yet: `EmptyState` "No care plan yet" with subtitle "Your coordinator is preparing one."

If has care plan:
- Plan title (text-lg font-bold) + notes (text-sm text-stone-600)
- **Goals section:** FlatList of goal cards — each card: goal number badge (teal circle), title (bold), measurement (stone-500), description (stone-400 text-sm, if present)
- **Services section:** FlatList — each row: service type chip + frequency + duration

### 4c. `episode/sessions.tsx` — SessionsTab component

Export: `SessionsTab({ episodeId })`

Data: `GET /api/episodes/:episodeId/sessions`  
Response: `{ sessions: [{ id, scheduledAt, status, serviceType, providerName, providerAvatar, notes }][] }`

FlatList of `SessionCard` (already exists in `components/session/SessionCard.tsx` — use it):
- Group by month using `SectionList` if more than 3 sessions
- Pull to refresh

### 4d. `episode/assessments.tsx` — AssessmentsTab component

Export: `AssessmentsTab({ episodeId })`

Data: `GET /api/episodes/:episodeId/assessments`  
Response: `{ assessments: [{ id, type, completedAt, completedBy, score, summary }][] }`

FlatList. Each row: Card with assessment type (bold), completed date, score badge, "Completed by {name}".  
If empty: EmptyState "No assessments yet".

---

## Task 5 — Family Booking Wizard

**File:** `app/(family)/book/index.tsx`

4-step wizard using `useState<Step>` within a single screen (not multi-route). Steps progress forward, back button in header returns to previous step.

```ts
type Step = 1 | 2 | 3 | 4;
const [step, setStep] = useState<Step>(1);
```

**Step 1 — Service type selection:**
Grid of service tiles (same style as onboarding step-6). Single-select (not multi).
```ts
const SERVICE_TYPES = [
  { id: 'nursing', icon: 'medical-outline', label: 'Nursing Care' },
  { id: 'support_worker', icon: 'people-outline', label: 'Support Worker' },
  { id: 'physiotherapy', icon: 'fitness-outline', label: 'Physiotherapy' },
  { id: 'occupational_therapy', icon: 'hand-left-outline', label: 'Occupational Therapy' },
  { id: 'speech_therapy', icon: 'chatbubbles-outline', label: 'Speech Therapy' },
  { id: 'psychology', icon: 'body-outline', label: 'Psychology' },
  { id: 'dietitian', icon: 'nutrition-outline', label: 'Dietitian' },
  { id: 'companion', icon: 'heart-outline', label: 'Companion / Caregiver' },
];
```
State: `const [serviceType, setServiceType] = useState<string | null>(null);`

**Step 2 — Date + time slot:**
- Date picker: simple 7-day horizontal scroll of date pills (`Pressable` chips: Sun 10, Mon 11, Tue 12...). Active: teal. Fetch from today.
- When a date is selected, fetch available slots: `GET /api/availability/slots?serviceType=:serviceType&date=:isoDate`  
  Response: `{ slots: [{ providerId, providerName, providerAvatar, startTime, endTime }][] }`
- Show slots in a `FlatList` of tappable rows: `Avatar(md) + providerName + "providerRole" + startTime-endTime`. Loading skeleton while fetching.
- State: `const [selectedDate, setSelectedDate] = useState<string>(today); const [selectedSlot, setSelectedSlot] = useState<{providerId,startTime,endTime,providerName} | null>(null);`

**Step 3 — Notes (optional):**
- `Input` multiline, label "Special requirements or notes", placeholder "e.g. wheelchair access needed, prefer female provider..."
- State: `const [notes, setNotes] = useState('');`

**Step 4 — Confirm + submit:**
Summary card:
```
Service type: {serviceType}
Provider: {providerName}
Date/Time: {formatDateTime(selectedSlot.startTime)}
Notes: {notes || 'None'}
```
"Confirm Booking" button → mutation.

```ts
const mutation = useMutation({
  mutationFn: () => apiClient.post('/api/scheduling/sessions', {
    episodeId: episode?.id,
    providerId: selectedSlot.providerId,
    scheduledAt: selectedSlot.startTime,
    type: serviceType,
    notes,
  }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['family-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['family-episode'] });
    router.replace('/(family)/episode');
    // toast shown from episode screen after navigation
  },
});
```

Episode ID: `useQuery({ queryKey: ['family-episode'], ... })` — read from cached data.

---

## Task 6 — Support Worker: Home Dashboard + Shift Screen

### 6a. `(staff)/index.tsx` — Role-Adaptive Home

The file currently renders `RoleHomeStub`. Replace it with a component that branches based on role:

```tsx
import { useAuthStore, CLINICAL_ROLES } from '../../stores/authStore';
const role = useAuthStore(s => s.user?.role);
const isClinical = role ? CLINICAL_ROLES.includes(role) : false;

if (isClinical) return <ClinicalDashboard />;
return <SupportWorkerDashboard />;
```

**`SupportWorkerDashboard` layout:**
```
ScreenHeader: "Dashboard"  [bell icon → notifications]

Active Shift Banner (if isOnShift from shiftStore):
  teal-600 bg card: "On Shift — 2h 14m" (live ShiftTimer)
  Button variant="destructive" size="sm" "Check Out" → shift screen

─── Today's Schedule ────────────────────
Text: "Today, {formatDate(today)}"
FlatList of today's session cards (from API):
  GET /api/scheduling/sessions/me?date=today
  Each card: SessionCard + StatusBadge
  Empty: EmptyState "No sessions today"
─────────────────────────────────────────

─── Pending Tasks ───────────────────────
GET /api/tasks/me?status=pending&limit=3
FlatList (max 3) + "View all" link → tasks/index
─────────────────────────────────────────
```

### 6b. `(staff)/shift.tsx` — GPS Check-In / Check-Out

**State dependencies:**
```ts
const { isOnShift, sessionId, startShift, endShift } = useShiftStore();
```

**Fetch active session if not on shift:**
```ts
const { data: activeSession } = useQuery({
  queryKey: ['my-active-session'],
  queryFn: () => apiClient.get('/api/scheduling/sessions/me/next').then(r => r.data),
  enabled: !isOnShift,
});
```

**Layout (not on shift):**
```
ScreenHeader: "Shift"

Card: Next session info
  providerName (patient name), address, scheduledAt

[Check In] button (disabled if >500m from location)
Distance indicator: "You are Xm from the location" (green if <100m, orange if <500m, red if >500m)
```

**GPS + geofencing logic:**
```ts
import * as Location from 'expo-location';

async function checkIn() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') { /* show alert */ return; }
  
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  const { latitude, longitude } = location.coords;
  
  // Calculate distance to patient address (use coords from activeSession.patientLat/Lng)
  const dist = haversineMetres(latitude, longitude, activeSession.patientLat, activeSession.patientLng);
  
  if (dist > 500) {
    Alert.alert('Too far', `You are ${Math.round(dist)}m from the location. Move closer to check in.`);
    return;
  }
  
  const { data } = await apiClient.post('/api/scheduling/sessions/check-in', {
    sessionId: activeSession.id,
    lat: latitude,
    lng: longitude,
  });
  
  startShift(activeSession.id, latitude, longitude);
}

// Haversine formula (copy this verbatim):
function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}
```

**Layout (on shift):**
```
Large teal card (full width, rounded-2xl):
  "On Shift" label (text-teal-100, sm)
  ShiftTimer component (live elapsed: "2h 14m 32s", large white font)
  Patient: name + address
  Break button (secondary, small) | End Shift button (destructive)

[If on break]: "On Break" amber card, Resume button

Session notes card below: Input multiline "Add session notes..."
```

**Check-out logic:**
```ts
async function checkOut() {
  const location = await Location.getCurrentPositionAsync({});
  await apiClient.post('/api/scheduling/sessions/check-out', {
    sessionId,
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    notes: sessionNotes,
  });
  endShift();
  queryClient.invalidateQueries({ queryKey: ['my-active-session'] });
}
```

**`ShiftTimer` component** (already exists at `components/shift/ShiftTimer.tsx` — check if implemented, implement if stub):
```tsx
export function ShiftTimer({ className }: { className?: string }) {
  const { isOnShift, elapsedSeconds } = useShiftStore();
  const [tick, setTick] = useState(0);
  
  useEffect(() => {
    if (!isOnShift) return;
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isOnShift]);
  
  const secs = elapsedSeconds();
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const display = h > 0
    ? `${h}h ${String(m).padStart(2,'0')}m`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  
  return (
    <Text className={`text-4xl font-bold text-white ${className}`}>{display}</Text>
  );
}
```

---

## Task 7 — Clinical Staff: Home + Schedule

### 7a. `ClinicalDashboard` (inside `(staff)/index.tsx`)

```
ScreenHeader: "Dashboard"  [bell icon]

─── Today ───────────────────────────────
Text: "Today, {date}"
GET /api/scheduling/sessions/me?date=today
FlatList of SessionCard — each: time, patient name (from session), service type, StatusBadge
─────────────────────────────────────────

─── Upcoming ────────────────────────────
GET /api/scheduling/sessions/me?from=tomorrow&limit=3
3 session rows + "View schedule" link → schedule/index
─────────────────────────────────────────

─── My Patients ─────────────────────────
GET /api/patients/me?limit=4
Horizontal FlatList of patient avatar chips (Avatar sm + name below)
"View all" → patients/index
─────────────────────────────────────────
```

### 7b. `(staff)/schedule/index.tsx` — Week Schedule

**Layout:** Segmented control at top: `[Week]  [Day]`. Default: Week.

**Week view:** 7-day column header row + FlatList of sessions grouped by day.
```tsx
// Day header chips
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// Render the 7 chips horizontally, active day: teal bg
// Below: FlatList of sessions for that day
```

Data: `GET /api/scheduling/sessions/me?from=:weekStart&to=:weekEnd`

**Day view:** Single-day vertical timeline. Each session block shows at the proportional time position (use a fixed height approach: each hour = 60px, position = (startHour - 7) * 60).

Each session item: tappable → `schedule/[id].tsx`

### 7c. `(staff)/schedule/[id].tsx` — Session Detail

Data: `GET /api/scheduling/sessions/:id`

Show:
- Patient name + avatar + episode type
- Date / time / duration
- Location (address or "Telehealth") with a map-pin icon
- StatusBadge
- Session notes (if any)
- Actions (if status = `scheduled`): `[Start Telehealth]` (→ telehealth/[id]) or `[Check In]` (→ shift tab)
- If status = `completed`: read-only notes

---

## Task 8 — Coordinator Intake Queue

### 8a. `(coordinator)/intake/index.tsx`

**Filter tabs (horizontal scroll at top):** Pending | In Review | Approved | Rejected | All  
Default: Pending

```ts
const [filter, setFilter] = useState<'pending' | 'in_review' | 'approved' | 'rejected' | ''>('pending');

const { data, isLoading, refetch } = useQuery({
  queryKey: ['intake-queue', filter],
  queryFn: () => apiClient.get('/api/intake', { params: { status: filter || undefined } }).then(r => r.data),
});
```

**FlatList item (IntakeCard):**
```
Card (onPress → intake/[id]):
  Row:
    Avatar(sm, name=patientName)
    Col: patientName (font-medium stone-900), careType (text-sm stone-400)
    StatusBadge(status)
  Row (mt-2):
    calendar-outline icon + submittedAt formatted date (text-xs stone-400)
    [Urgency chip if urgency=within_24h → amber "Urgent"]
  Chevron right
```

### 8b. `(coordinator)/intake/[id].tsx`

Use `useLocalSearchParams<{ id: string }>()` to get the intake ID.

Data: `GET /api/intake/:id`

**Section layout with `SectionList` or manual sections inside `ScrollView`:**

Section 1 — **Patient:** first/last name, DOB, gender  
Section 2 — **Caregiver:** name, phone, email  
Section 3 — **Reason for care:** text block + urgency badge  
Section 4 — **Medical:** diagnoses / medications / allergies tag pills  
Section 5 — **Services requested:** tag pills  
Section 6 — **Documents:** list of uploaded files with download-link icon  

**Bottom action bar** (fixed, above safe area):
```tsx
<View className="border-t border-stone-100 bg-white px-4 py-3">
  {status === 'pending' || status === 'in_review' ? (
    <View className="flex-row gap-3">
      <Button variant="destructive" className="flex-1" onPress={openRejectSheet}>Reject</Button>
      <Button className="flex-1" onPress={openApproveConfirm}>Approve</Button>
    </View>
  ) : (
    <StatusBadge status={status} size="md" />
  )}
</View>
```

**Approve flow:**
```ts
const approveMutation = useMutation({
  mutationFn: () => apiClient.post(`/api/intake/${id}/approve`),
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
    router.replace(`/(coordinator)/episodes/${res.data.episodeId}`);
  },
});
```

**Reject flow** — `BottomSheetModal` with a reason textarea:
```ts
const rejectMutation = useMutation({
  mutationFn: (reason: string) => apiClient.post(`/api/intake/${id}/reject`, { reason }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['intake-queue'] });
    router.back();
  },
});
```

---

## Task 9 — Shared Profile + Notifications Screens

These screens follow the same pattern across all roles. Build them once and call them from each role group.

### 9a. Profile screen (implement for all 5 role groups)

Each role's `profile/index.tsx`:
```tsx
import { ProfileScreen } from '../../../components/ProfileScreen';
export default function MyProfile() { return <ProfileScreen />; }
```

Create `components/ProfileScreen.tsx`:

```tsx
export function ProfileScreen() {
  const user = useAuthStore(s => s.user!);
  const logout = useAuthStore(s => s.logout);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [saving, setSaving] = useState(false);
  
  const save = async () => {
    setSaving(true);
    await apiClient.patch('/api/users/me', { name });
    useAuthStore.getState().setUser({ ...user, name });
    setSaving(false);
    setEditing(false);
  };
  
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader
        title="Profile"
        showBack={false}
        rightAction={editing
          ? { icon: 'checkmark', onPress: save }
          : { icon: 'create-outline', onPress: () => setEditing(true) }
        }
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Avatar section */}
        <View className="items-center py-6">
          <Avatar uri={user.avatarUrl} name={user.name} size="xl" />
          <Text className="mt-3 text-xl font-bold text-stone-900">{user.name}</Text>
          <StatusBadge status={user.role.replace(/_/g, ' ')} size="md" />
        </View>
        
        {/* Info section */}
        <View className="px-4 gap-3">
          <Card shadow={false}>
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Role" value={user.role.replace(/_/g, ' ')} />
            {user.organizationId ? <InfoRow label="Organization" value={user.organizationId} /> : null}
          </Card>
          
          {editing ? (
            <Input label="Display name" value={name} onChangeText={setName} />
          ) : null}
          
          <Button variant="ghost" onPress={() => router.push('/(auth)/forgot-password')}>
            Change Password
          </Button>
          
          <Button
            variant="destructive"
            onPress={() => Alert.alert('Sign out', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', style: 'destructive', onPress: logout },
            ])}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-stone-100 last:border-0">
      <Text className="text-sm text-stone-400">{label}</Text>
      <Text className="text-sm font-medium text-stone-900 capitalize">{value}</Text>
    </View>
  );
}
```

### 9b. Notifications screen (implement for all role groups)

Each role's `notifications.tsx`:
```tsx
import { NotificationsScreen } from '../../components/NotificationsScreen';
export default function MyNotifications() { return <NotificationsScreen />; }
```

Create `components/NotificationsScreen.tsx`:

```tsx
export function NotificationsScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get('/api/notifications').then(r => r.data.notifications ?? r.data),
  });
  
  const readMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/api/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  
  return (
    <SafeAreaView className="flex-1 bg-stone-50" edges={['top']}>
      <ScreenHeader title="Notifications" showBack={false} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#0D9488" />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => { readMutation.mutate(item.id); /* deep-link TBD in Phase 3 */ }}
            className={`mx-4 mb-2 rounded-xl p-4 ${item.readAt ? 'bg-white' : 'bg-teal-50'}`}
          >
            <View className="flex-row items-start gap-3">
              <View className="mt-1 h-2 w-2 rounded-full" style={{ backgroundColor: item.readAt ? 'transparent' : '#0D9488' }} />
              <View className="flex-1">
                <Text className="font-medium text-stone-900">{item.title}</Text>
                <Text className="mt-0.5 text-sm text-stone-500">{item.body}</Text>
                <Text className="mt-1 text-xs text-stone-300">{formatDate(item.createdAt)}</Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState icon="notifications-off-outline" title="All caught up" subtitle="No notifications yet." />
        }
      />
    </SafeAreaView>
  );
}
```

---

## Phase 2 Completion Checklist

**Auth:**
- [x] Login screen: gradient background, wide logo, frosted white card, teal button, biometrics ✅
- [x] Forgot password screen: same gradient/card aesthetic ✅
- [x] OTP screen: same gradient/card aesthetic, teal OTP cells ✅

**Family Onboarding / New Care Request (6 steps — must mirror web exactly):**
- [ ] Step 1: Welcome screen — logo, feature tiles, Get Started button
- [ ] Step 2: Country (flag tiles) + Language chips + Who needs care (3 account type cards)
- [ ] Step 3: Care categories grid + sub-options panel + NDIS section for disability
- [ ] Step 4: Provider gender + language chips + care location + address if home
- [ ] Step 5: Frequency + preferred days + time slots + start timing
- [ ] Step 6: 3 consent checkboxes + submit → POST /api/client-onboarding/complete
- [ ] Flow re-enterable from family home "New Care Request" link (not one-time)

**Family:**
- [ ] Home dashboard: episode card + next session card + quick actions
- [ ] Episode overview tab: episode info + assigned staff
- [ ] Care plan tab: goals list + services list
- [ ] Sessions tab: session FlatList (SessionCard)
- [ ] Assessments tab: assessment FlatList
- [ ] Booking wizard: 4 steps (service, date+slot, notes, confirm)

**Support Worker:**
- [ ] Home dashboard: today's schedule + pending tasks + active shift banner
- [ ] Shift screen: GPS check-in with haversine geofencing + live ShiftTimer + check-out + notes

**Clinical Staff:**
- [ ] Home dashboard: today's sessions + upcoming + patient chips
- [ ] Schedule week view: 7-day header + sessions by day
- [ ] Schedule day view: vertical timeline
- [ ] Session detail screen

**Coordinator:**
- [ ] Intake queue: filter tabs + FlatList with IntakeCard
- [ ] Intake detail: all sections + approve/reject action bar

**Shared:**
- [ ] `ProfileScreen` component used by all 5 role `profile/index.tsx` files
- [ ] `NotificationsScreen` component used by all role `notifications.tsx` files
- [ ] `ShiftTimer` component implemented (check if stub, replace if needed)

---

## What Phase 2 Does NOT Include

- Family in-app messaging (`messages/index.tsx`, `messages/[id].tsx`) — Phase 3
- Family invoices — deferred to M4
- Family telehealth — Phase 3
- Coordinator episode management + care plan builder — Phase 3
- Coordinator GPS map — Phase 3
- Staff patients list + assessments — Phase 3
- Staff assessments list/detail — Phase 3
- Org Admin screens (all) — Phase 3
- Super Admin screens (all) — Phase 3
