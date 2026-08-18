# M5 Mobile — Phase 1: Foundation Layer
### Cursor Task File

**App directory:** `mern/mobile/`  
**Design spec:** `mern/docx/M5_MOBILE_DESIGN_SPEC.md` (read this first for full context)  
**Tech stack:** Expo SDK 54 · Expo Router v6 · React 19 · NativeWind v4 · Zustand v5 · TanStack Query v5

---

## Before You Start

1. Read `mern/docx/M5_MOBILE_DESIGN_SPEC.md` fully — it contains wireframes, API endpoints, and role logic for every screen.
2. The boilerplate already has Redux installed (`@reduxjs/toolkit`, `react-redux`, `redux-persist`, `redux-thunk`). Phase 1 replaces Redux entirely with Zustand.
3. All packages in `package.json` are already declared. Run `npm install` (or `npx expo install --fix`) at the start.
4. Color palette is defined in `tailwind.config.js`. Always use NativeWind className props — never inline StyleSheet objects except where NativeWind is unsupported (e.g., react-native-maps).
5. Do not touch any files under `app/(family)/`, `app/(staff)/`, `app/(coordinator)/`, `app/(org)/`, `app/(admin)/`, or `app/(onboarding)/` during Phase 1 — those are Phase 2 and beyond. The layout stubs (`_layout.tsx`) for each group ARE in scope and must be implemented.

---

## Task 1 — Install & Configure NativeWind

**Files:** `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css` (new)

### 1a. Update `babel.config.js`
Add NativeWind babel preset. The file currently only has `expo-router/babel`. Replace the entire content:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

### 1b. Create / update `metro.config.js`
If the file doesn't exist, create it:

```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

### 1c. Create `global.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 1d. Verify `tailwind.config.js` exists
The file already exists in the repo. Confirm it has the `nativewind/preset` and the Riayah color palette (teal-600 = `#0D9488`). Do not overwrite unless it's missing.

### 1e. Import `global.css` in root layout
In `app/_layout.tsx`, add this import at the very top (before all other imports):
```ts
import '../global.css';
```

---

## Task 2 — Remove Redux Boilerplate

**Files to delete:**
- `store/` folder (entire directory — contains Redux store, slices, etc.)
- Any Redux provider wrappers in `app/_layout.tsx`

**Imports to remove from `app/_layout.tsx`:**
- `Provider` from `react-redux`
- `PersistGate` from `redux-persist/integration/react`
- Any `store`, `persistor` imports

Do NOT remove: `@react-native-async-storage/async-storage` — it is used by TanStack Query persister.

---

## Task 3 — Implement Zustand Stores

Stub files already exist in `stores/`. Replace their content with full implementations.

### 3a. `stores/authStore.ts` — Auth + User State

```ts
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../lib/api/client';
import { router } from 'expo-router';

export type UserRole =
  | 'family' | 'client' | 'consumer' | 'patient'
  | 'support_worker' | 'clinical_staff' | 'doctor' | 'nurse'
  | 'physiotherapist' | 'occupational_therapist' | 'speech_therapist'
  | 'psychologist' | 'dietitian' | 'therapist' | 'caregiver' | 'companion'
  | 'care_coordinator' | 'admin' | 'super_admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  organizationId?: string | null;
  careUnitId?: string | null;
}

export const FAMILY_ROLES: UserRole[] = ['family', 'client', 'consumer', 'patient'];
export const STAFF_ROLES: UserRole[] = [
  'support_worker', 'clinical_staff', 'doctor', 'nurse',
  'physiotherapist', 'occupational_therapist', 'speech_therapist',
  'psychologist', 'dietitian', 'therapist', 'caregiver', 'companion',
];
export const COORDINATOR_ROLES: UserRole[] = ['care_coordinator', 'admin'];
export const ORG_ADMIN_ROLES: UserRole[] = ['admin'];
export const SUPER_ADMIN_ROLES: UserRole[] = ['super_admin'];

const TOKEN_KEY = 'auth_token';

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  token: null,
  user: null,
  isLoading: true,

  hydrate: async () => {
    try {
      const stored = await SecureStore.getItemAsync(TOKEN_KEY);
      if (stored) {
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${stored}`;
        const { data } = await apiClient.get('/api/users/me');
        set({ token: stored, user: data.user ?? data, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({ token: null, user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await apiClient.post('/api/auth/login', { email, password });
    const jwt: string = data.token ?? data.access_token;
    await SecureStore.setItemAsync(TOKEN_KEY, jwt);
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    const me = await apiClient.get('/api/users/me');
    const user: AuthUser = me.data.user ?? me.data;
    set({ token: jwt, user });
    routeByRole(user);
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    delete apiClient.defaults.headers.common['Authorization'];
    set({ token: null, user: null });
    router.replace('/(auth)/login');
  },

  setUser: (user) => set({ user }),
}));

function routeByRole(user: AuthUser) {
  const { role, careUnitId } = user;
  if (FAMILY_ROLES.includes(role)) {
    router.replace(careUnitId ? '/(family)' : '/(onboarding)/step-1-care-unit');
  } else if (SUPER_ADMIN_ROLES.includes(role)) {
    router.replace('/(admin)');
  } else if (role === 'admin') {
    // org-level admin routes to (org)
    router.replace('/(org)');
  } else if (role === 'care_coordinator') {
    router.replace('/(coordinator)');
  } else {
    router.replace('/(staff)');
  }
}
```

### 3b. `stores/shiftStore.ts` — Support Worker Shift Timer

```ts
import { create } from 'zustand';

interface ShiftState {
  isOnShift: boolean;
  shiftStartTime: number | null;
  sessionId: string | null;
  checkInLocation: { lat: number; lng: number } | null;
  startShift: (sessionId: string, lat: number, lng: number) => void;
  endShift: () => void;
  elapsedSeconds: () => number;
}

export const useShiftStore = create<ShiftState>()((set, get) => ({
  isOnShift: false,
  shiftStartTime: null,
  sessionId: null,
  checkInLocation: null,

  startShift: (sessionId, lat, lng) =>
    set({ isOnShift: true, shiftStartTime: Date.now(), sessionId, checkInLocation: { lat, lng } }),

  endShift: () =>
    set({ isOnShift: false, shiftStartTime: null, sessionId: null, checkInLocation: null }),

  elapsedSeconds: () => {
    const start = get().shiftStartTime;
    return start ? Math.floor((Date.now() - start) / 1000) : 0;
  },
}));
```

### 3c. `stores/offlineStore.ts` — Network State

```ts
import { create } from 'zustand';
import NetInfo from '@react-native-community/netinfo';

interface OfflineState {
  isOnline: boolean;
  startListening: () => () => void;
}

export const useOfflineStore = create<OfflineState>()((set) => ({
  isOnline: true,

  startListening: () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      set({ isOnline: state.isConnected ?? true });
    });
    return unsubscribe;
  },
}));
```

### 3d. `stores/onboardingStore.ts` — Family Onboarding Wizard State

```ts
import { create } from 'zustand';

interface OnboardingData {
  // Step 1
  careUnitName?: string;
  relationship?: string;
  // Step 2
  patientFirstName?: string;
  patientLastName?: string;
  patientDob?: string;
  patientGender?: string;
  // Step 3
  primaryCaregiverName?: string;
  primaryCaregiverPhone?: string;
  // Step 4
  reasonForCare?: string;
  urgencyLevel?: 'low' | 'medium' | 'high';
  // Step 5
  diagnoses?: string[];
  medications?: string[];
  allergies?: string[];
  // Step 6
  serviceInterests?: string[];
}

interface OnboardingState {
  intakeId: string | null;
  currentStep: number;
  data: OnboardingData;
  setIntakeId: (id: string) => void;
  setStep: (step: number) => void;
  updateData: (patch: Partial<OnboardingData>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  intakeId: null,
  currentStep: 1,
  data: {},

  setIntakeId: (id) => set({ intakeId: id }),
  setStep: (step) => set({ currentStep: step }),
  updateData: (patch) => set((s) => ({ data: { ...s.data, ...patch } })),
  reset: () => set({ intakeId: null, currentStep: 1, data: {} }),
}));
```

---

## Task 4 — Rewrite `app/_layout.tsx`

Replace the Redux-based root layout with this structure. This is the single most important file in Phase 1 — get it right.

**Requirements:**
- Import `../global.css` at the top
- Wrap app in `QueryClientProvider` with the persisted query client from `lib/query/client.ts`
- Show a loading spinner while `useAuthStore.isLoading` is true (call `hydrate()` in `useEffect` on mount)
- Wrap in `ToastProvider` from `react-native-toast-notifications`
- Wrap in `GestureHandlerRootView` from `react-native-gesture-handler`
- Wrap in `BottomSheetModalProvider` from `@gorhom/bottom-sheet`
- Wrap in `SafeAreaProvider` from `react-native-safe-area-context`
- Register push notification token after hydration (see Task 8)
- Monitor network state with `offlineStore.startListening()` in `useEffect`

```tsx
import '../global.css';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ToastProvider } from 'react-native-toast-notifications';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { persistOptions, queryClient } from '../lib/query/client';
import { useAuthStore } from '../stores/authStore';
import { useOfflineStore } from '../stores/offlineStore';
import { registerPushToken } from '../lib/notifications';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isLoading = useAuthStore((s) => s.isLoading);
  const startListening = useOfflineStore((s) => s.startListening);

  useEffect(() => {
    hydrate();
    const unsubscribe = startListening();
    return unsubscribe;
  }, []);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50">
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ToastProvider>
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }} />
            </BottomSheetModalProvider>
          </ToastProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

---

## Task 5 — Implement `app/index.tsx` (Role-Based Entry Router)

This file decides where the authenticated user lands on app open. Auth hydration happens in `_layout.tsx`; by the time this screen renders, `useAuthStore` has a resolved `user` or `null`.

```tsx
import { Redirect } from 'expo-router';
import { useAuthStore, FAMILY_ROLES, COORDINATOR_ROLES, SUPER_ADMIN_ROLES } from '../stores/authStore';

export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (!user) return <Redirect href="/(auth)/login" />;

  const { role, careUnitId } = user;

  if (FAMILY_ROLES.includes(role)) {
    return <Redirect href={careUnitId ? '/(family)' : '/(onboarding)/step-1-care-unit'} />;
  }
  if (SUPER_ADMIN_ROLES.includes(role)) {
    return <Redirect href="/(admin)" />;
  }
  if (role === 'admin') {
    return <Redirect href="/(org)" />;
  }
  if (role === 'care_coordinator') {
    return <Redirect href="/(coordinator)" />;
  }
  return <Redirect href="/(staff)" />;
}
```

---

## Task 6 — Implement Auth Screens

### 6a. `app/(auth)/_layout.tsx`
Stack navigator for auth screens. No header. Redirect authenticated users away.

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

### 6b. `app/(auth)/login.tsx` — Login Screen

**UI:**
- Riayah Plus logo (image or text) centered at top
- Email field (keyboard type: email-address)
- Password field (secureTextEntry)
- "Forgot password?" link → `/(auth)/forgot-password`
- "Sign In" button (teal-600, full width, loading state)
- Biometric login button (Face ID / Touch ID icon) below — only shown if device supports it
- Error message below form on failed login

**Logic:**
- Form validation with `react-hook-form` + Zod: email must be valid, password min 6 chars
- On submit: call `useAuthStore.login(email, password)`
- On error: display API error message
- Biometric flow: use `expo-local-authentication` to authenticate, then call stored credentials or use a "biometric token" pattern (store email in SecureStore, prompt bio auth, then call login API)

**API:** `POST /api/auth/login` → handled inside `authStore.login()`

### 6c. `app/(auth)/otp.tsx` — OTP Verification Screen

**UI:**
- Title: "Enter verification code"
- Subtitle: "We sent a 6-digit code to {email}"
- 6-cell OTP input (individual digit inputs, auto-advance on entry)
- "Resend code" link (with 60s countdown timer before re-enabling)
- "Verify" button (teal-600)

**Logic:**
- Receives `email` as route param: `useLocalSearchParams<{ email: string }>()`
- On submit: `POST /api/auth/verify-otp { email, otp }`
- On success: navigate to login or auto-login with returned token
- Resend: `POST /api/auth/resend-otp { email }`

### 6d. `app/(auth)/forgot-password.tsx` — Forgot Password Screen

**UI:**
- Email field
- "Send reset link" button
- Success state: "Check your email" message
- Back to login link

**Logic:**
- `POST /api/auth/forgot-password { email }`
- No Zod needed — just validate email format client-side with react-hook-form

---

## Task 7 — Design System Components

All components live in `components/ui/`. Use NativeWind className for all styling. Export each component from `components/ui/index.ts` for easy importing.

### 7a. `Button.tsx`

```tsx
// Props: variant ('primary' | 'secondary' | 'ghost' | 'destructive'), size ('sm' | 'md' | 'lg'),
//        onPress, isLoading, disabled, children (ReactNode), className (override)
// Primary: bg-teal-600, white text
// Secondary: border border-teal-600, teal-600 text, transparent bg
// Ghost: no border, teal-600 text
// Destructive: bg-red-600, white text
// Loading state: shows ActivityIndicator in place of children
// Disabled: opacity-50
```

### 7b. `Input.tsx`

```tsx
// Props: label, placeholder, value, onChangeText, error, secureTextEntry,
//        keyboardType, multiline, numberOfLines, leftIcon, rightIcon
// Label: text-sm text-stone-700 mb-1
// Input: border border-stone-300 rounded-lg px-3 py-2.5 text-stone-900
// Error state: border-red-500 + red error message below
// Focus state: border-teal-500 (use onFocus/onBlur state)
```

### 7c. `Card.tsx`

```tsx
// Props: children, className (passthrough), onPress (optional — makes it touchable), shadow
// Base: bg-white rounded-xl p-4
// Shadow: shadow-sm (iOS shadow props + Android elevation=2)
// If onPress provided: wrap in TouchableOpacity
```

### 7d. `Avatar.tsx`

```tsx
// Props: uri (string | null | undefined), name (string), size ('sm' | 'md' | 'lg' | 'xl')
// If uri: show Image
// Else: show initials circle (teal-100 bg, teal-700 text, up to 2 chars from name)
// sm=32, md=40, lg=48, xl=64 (dimensions in px)
```

### 7e. `StatusBadge.tsx`

```tsx
// Props: status (string), size ('sm' | 'md')
// Status → color map:
//   active / approved / completed / checked_in → green
//   pending / in_review / scheduled → yellow/amber
//   cancelled / rejected / inactive → red
//   on_hold / draft → gray
// Pill shape: rounded-full px-2 py-0.5, text-xs font-medium
// Capitalize status text, replace underscores with spaces
```

### 7f. `ScreenHeader.tsx`

```tsx
// Props: title, subtitle (optional), leftAction (optional: { icon, onPress }),
//        rightAction (optional: { icon, onPress } | ReactNode)
// Default left: back chevron (via router.back()) if navigation stack has >1 screen
// Height: 56px, bg-white, border-b border-stone-100
// Title: text-lg font-semibold text-stone-900
// Subtitle: text-sm text-stone-500
```

### 7g. `EmptyState.tsx`

```tsx
// Props: icon (Ionicons name), title, subtitle (optional), action (optional: { label, onPress })
// Centered layout: icon (size 48, text-stone-400) + title + subtitle + optional button
// Used on all list screens when data is empty
```

### 7h. `StaffCard.tsx`

```tsx
// Props: name, role, avatarUrl, status, specialization (optional), onPress
// Horizontal card: Avatar (md) + name (font-medium) + role badge + status indicator dot
// Used in coordinator and org admin staff lists
```

### 7i. `components/ui/index.ts` — Barrel Export

Export all components from this file so screens can import with:
```ts
import { Button, Card, Input, Avatar, StatusBadge } from '../../components/ui';
```

---

## Task 8 — Push Notification Token Registration

**File:** `lib/notifications.ts` (create if it doesn't exist)

```ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiClient } from './api/client';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<void> {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  await apiClient.post('/api/users/push-token', { token });
}
```

Call `registerPushToken()` in `app/_layout.tsx` after `hydrate()` resolves (inside the same `useEffect`, after the `await hydrate()` call).

---

## Task 9 — Role Group Layout Stubs (`_layout.tsx` for each tab group)

Implement the `_layout.tsx` for each of the 6 role groups. Each must:
- Use `Tabs` from `expo-router`
- Show the correct tabs for the role (see M5_MOBILE_DESIGN_SPEC.md §4 for exact tab lists)
- Use `@expo/vector-icons` (Ionicons) for tab icons
- Apply NativeWind for tab bar styling (teal-600 active color, stone-400 inactive)
- For `(staff)/_layout.tsx`: read `useAuthStore` role to conditionally render either Clinical tabs or Support Worker tabs

### Tab specifications (implement exactly):

**`(auth)/_layout.tsx`** — already done in Task 6a.

**`(onboarding)/_layout.tsx`** — Stack (no tabs). Progress bar showing current step (from `useOnboardingStore.currentStep` / 7). No back button on step 1.

**`(family)/_layout.tsx`** — 5 tabs:
| Tab | Icon | Route |
|-----|------|-------|
| Home | `home` | `index` |
| Episode | `heart-outline` | `episode/index` |
| Book | `calendar-plus` or `add-circle-outline` | `book/index` |
| Messages | `chatbubble-outline` | `messages/index` |
| Profile | `person-outline` | `profile/index` |

**`(staff)/_layout.tsx`** — 2 different tab sets based on role:

*Clinical Staff tabs (doctor, nurse, physiotherapist, occupational_therapist, speech_therapist, psychologist, dietitian, therapist, clinical_staff):*
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | `home` | `index` |
| Schedule | `calendar-outline` | `schedule/index` |
| Patients | `people-outline` | `patients/index` |
| Assessments | `clipboard-outline` | `assessments/index` |
| Profile | `person-outline` | `profile/index` |

*Support Worker tabs (support_worker, caregiver, companion):*
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | `home` | `index` |
| Schedule | `calendar-outline` | `schedule/index` |
| Tasks | `checkmark-circle-outline` | `tasks/index` |
| Shift | `time-outline` | `shift` |
| Profile | `person-outline` | `profile/index` |

**`(coordinator)/_layout.tsx`** — 5 tabs:
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | `home` | `index` |
| Intake | `document-text-outline` | `intake/index` |
| Episodes | `heart-outline` | `episodes/index` |
| Schedule | `calendar-outline` | `schedule/index` |
| Map | `map-outline` | `map` |

**`(org)/_layout.tsx`** — 5 tabs:
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | `home` | `index` |
| Staff | `people-outline` | `staff/index` |
| Requests | `notifications-outline` | `requests/index` |
| Analytics | `bar-chart-outline` | `analytics/index` |
| Profile | `person-outline` | `profile/index` |

**`(admin)/_layout.tsx`** — 5 tabs:
| Tab | Icon | Route |
|-----|------|-------|
| Dashboard | `home` | `index` |
| Analytics | `bar-chart-outline` | `analytics/index` |
| Audit Log | `shield-outline` | `audit/index` |
| GPS | `location-outline` | `gps/index` |
| Organizations | `business-outline` | `organizations/index` |

---

## Task 10 — Home Screen Stubs for All 6 Roles

Each home screen (`index.tsx`) should be a minimal but visually recognizable shell showing:
- `ScreenHeader` with the role's title
- A greeting with the user's name from `useAuthStore`
- 2–3 placeholder stat cards (Card component with dummy text)
- One empty state message pointing to the spec for Phase 2

This gives Cursor something to render when testing navigation in Phase 1.

**Screens to stub:**
- `app/(family)/index.tsx`
- `app/(staff)/index.tsx`
- `app/(coordinator)/index.tsx`
- `app/(org)/index.tsx`
- `app/(admin)/index.tsx`

---

## Task 11 — Verify TypeScript Compiles

After completing Tasks 1–10, run:
```bash
cd mern/mobile
npx tsc --noEmit
```

Fix all TypeScript errors before considering Phase 1 complete. Common issues to watch for:
- Zustand `create<State>()()` double-call syntax (Zustand v5 requirement)
- `expo-router` `Redirect` vs `router.replace` — use `Redirect` in render, `router.replace` in event handlers
- NativeWind className on View/Text — requires types from `nativewind/types` (already in the project)

---

## Phase 1 Completion Checklist

- [ ] NativeWind configured (babel, metro, global.css)
- [ ] Redux fully removed (store folder, all imports)
- [ ] `zustand` installed (`npm install` ran successfully)
- [ ] All 4 Zustand stores implemented with correct types
- [ ] `app/_layout.tsx` rewritten with correct providers
- [ ] `app/index.tsx` routes correctly by role
- [ ] Auth screens implemented: login, otp, forgot-password
- [ ] All 9 design system components in `components/ui/`
- [ ] `components/ui/index.ts` barrel export created
- [ ] Push notification token registration working
- [ ] All 6 `_layout.tsx` files implemented with correct tabs
- [ ] Home screen stubs for all 6 roles
- [ ] `npx tsc --noEmit` passes with 0 errors

---

## What Phase 1 Does NOT Include

These are Phase 2+ tasks — do not implement them in Phase 1:

- Any real data fetching (TanStack Query hooks) in role screens
- Family onboarding 7-step wizard implementation
- Family booking screen
- Staff shift GPS check-in/check-out logic
- Coordinator intake review / care plan builder
- Any org admin or admin real data views
- Telehealth video (Daily.co)
- In-app messaging
- Offline cache persistence (the TanStack Query persister is wired up but not tested)

---

## File Reference Map

```
mern/mobile/
├── app/
│   ├── _layout.tsx          ← Task 4 (rewrite)
│   ├── index.tsx            ← Task 5 (rewrite)
│   ├── (auth)/
│   │   ├── _layout.tsx      ← Task 6a
│   │   ├── login.tsx        ← Task 6b
│   │   ├── otp.tsx          ← Task 6c
│   │   └── forgot-password.tsx ← Task 6d
│   ├── (onboarding)/
│   │   └── _layout.tsx      ← Task 9
│   ├── (family)/
│   │   ├── _layout.tsx      ← Task 9
│   │   └── index.tsx        ← Task 10
│   ├── (staff)/
│   │   ├── _layout.tsx      ← Task 9 (role-adaptive)
│   │   └── index.tsx        ← Task 10
│   ├── (coordinator)/
│   │   ├── _layout.tsx      ← Task 9
│   │   └── index.tsx        ← Task 10
│   ├── (org)/
│   │   ├── _layout.tsx      ← Task 9
│   │   └── index.tsx        ← Task 10
│   └── (admin)/
│       ├── _layout.tsx      ← Task 9
│       └── index.tsx        ← Task 10
├── components/ui/
│   ├── index.ts             ← Task 7i (barrel)
│   ├── Button.tsx           ← Task 7a
│   ├── Input.tsx            ← Task 7b
│   ├── Card.tsx             ← Task 7c
│   ├── Avatar.tsx           ← Task 7d
│   ├── StatusBadge.tsx      ← Task 7e
│   ├── ScreenHeader.tsx     ← Task 7f
│   ├── EmptyState.tsx       ← Task 7g
│   └── StaffCard.tsx        ← Task 7h
├── stores/
│   ├── authStore.ts         ← Task 3a (replace stub)
│   ├── shiftStore.ts        ← Task 3b (replace stub)
│   ├── offlineStore.ts      ← Task 3c (replace stub)
│   └── onboardingStore.ts   ← Task 3d (replace stub)
├── lib/
│   ├── api/client.ts        ← existing, do not modify
│   ├── query/client.ts      ← existing, do not modify
│   └── notifications.ts     ← Task 8 (create)
├── babel.config.js          ← Task 1a (modify)
├── metro.config.js          ← Task 1b (create/modify)
├── global.css               ← Task 1c (create)
└── tailwind.config.js       ← Task 1d (verify, do not overwrite)
```
