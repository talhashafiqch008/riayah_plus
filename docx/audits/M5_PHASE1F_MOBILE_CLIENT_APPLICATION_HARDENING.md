# M5 Phase 1F — Mobile & Client Application Security Hardening

**Target:** `milestone-5-fetched` @ `72c6258b5d665bab7d96a46681eb24e30073c1b0`
**Baseline:** `milestone-4-fetched` @ `9c6b26cec57dbe5cecade322aa338a67a97c33b3`
**Date:** 2026-09-12
**App:** `com.raiyahplus.app` — Expo SDK 54 / React Native 0.81.5, Android-only (no committed iOS native project)
**Method:** read-only source review of `mobile/` (JS/TS → Expo config → committed Android native project), plus local artifact inspection where possible (committed `debug.keystore` inspected with `keytool`). No source, config, `.env`, manifest, Gradle, or lockfile was modified; nothing was committed; no production system, account, or real patient data was used; no APK was built (see §39 for what that leaves unverified).

> **Central question:** If an attacker controls, steals, roots, debugs, backs up, instruments, repackages, proxies, or shares a device running Riayah Plus, what credentials, PHI, privileges, communications, location evidence, or trusted application behaviour can they obtain, retain, alter, or impersonate beyond what the platform intends?
>
> **Answer:** A **stolen/rooted/backed-up device** yields **plaintext PHI and PII** (query cache + onboarding draft in AsyncStorage), the **access token** (SecureStore — protected but not device-auth-bound), and **downloaded/recorded media** left in the cache dir. A **shared device** exposes the previous user's data because logout clears neither the in-memory TanStack cache, nor Zustand, nor navigation, nor the realtime socket. A **rooted/instrumented device or direct API client** can forge GPS attendance because coordinates are client-supplied with no attestation and the **server accepts out-of-radius check-ins**. The **release build is configured to ship signed with the publicly-known Android debug key** (RUNTIME-CONFIRMED via the committed keystore). Against these, the strongest genuine controls are: the backend re-authorizes every request (no client-trusted authorization), SecureStore for the token, Android's default cleartext prohibition in release, and the absence of any bundled server secret.

---

## 1. Executive Summary

**Overall mobile posture: not production-ready without fixes. The backend remains the authority, so the mobile findings are predominantly local-data, cross-user, and attendance-integrity problems rather than backend-compromise problems — but three of them are release-blocking in a healthcare context.**

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 3 |
| Medium | 5 |
| Low | 6 |
| Informational | 7 |
| **Total** | **21 findings** |

**Verification status:** **4 RUNTIME-CONFIRMED (MOB-05 full; MOB-13/MOB-15 artifact-verified; MOB-21 artifact-level) · 13 STATIC-CONFIRMED · 3 LIKELY · 1 RUNTIME-FALSIFIED (MOB-04)** — plus **11 withdrawn suspicions** (see §42) and the Phase 1F-V artifact validation below.

> **Phase 1F-V artifact validation (2026-09-12).** A debug APK and a genuine **release** APK were built from the pinned ref (`assembleDebug` + `assembleRelease`, both `BUILD SUCCESSFUL`) and inspected. This **confirmed MOB-05 and MOB-13 at the artifact level**, **falsified MOB-04's core claim** (the generated backup rules exclude the AsyncStorage database domain), **corrected targetSdk to 36** (was inferred 35), **confirmed minify remains disabled** (MOB-15 holds), and **discovered MOB-21** (library-added exported components). Full runtime interaction (login/logout/socket/GPS/cross-user flows) was **postponed** — see the companion dynamic report for status.

**Release blockers (see §40 and §44):**
1. **MOB-02** — Cross-user PHI on a shared device: logout purges neither the in-memory query cache nor onboarding state; no user-scoped cache keys → User B can render User A's PHI (confirmed statically; the offline case is indefinite).
2. **MOB-05** — Release build signs with the **public AOSP debug keystore** (`debug.keystore` committed; `build.gradle` `release { signingConfig signingConfigs.debug }`). RUNTIME-CONFIRMED.
3. **MOB-03** — Realtime socket survives logout (`releaseRealtimeSocket()` is dead code; `logout()` never disconnects) → a prior user's authenticated socket can keep receiving events.

**Most sensitive locally stored data (corrected after verification):** the **onboarding draft** (`raiyah:family_careseeker_onboarding_draft`) is the only **actively populated** plaintext store today — care-recipient type, care needs, practitioner/language preferences, and **address** (PII; health-adjacent), written on onboarding steps 1–4 and cleared only on step-5 completion. The persisted query cache `RAIYAH_QUERY_CACHE_V1` **currently stores no PHI** — all three of its allowlisted keys map to queries that never execute today (see §9) — but the **persistence policy is a latent hazard**: any future wiring of those routes will dehydrate PHI to plaintext AsyncStorage. Downloaded documents, invoices, and voice recordings also persist in `cacheDirectory` (PHI).

**Shortest stolen-device PHI path:** unlock the device (or `adb`/backup a backup-eligible install) → read AsyncStorage for the **onboarding PII draft** → also read `cacheDirectory` for downloaded PHI documents/invoices and voice recordings. Requires no app password. The access token itself is in SecureStore (not trivially extracted without root). If the persisted query keys become live, the same path would additionally yield cached care-plan/session/task PHI.

**Cross-user logout result:** **FAIL** — logout clears SecureStore + Zustand auth state only. TanStack memory cache, persisted AsyncStorage cache, onboarding draft, navigation stack, and the Socket.IO singleton all survive. See §12.

**Backup verdict:** **PROTECTED (artifact-verified 2026-09-12).** `allowBackup="true"`, but the built APK contains generated `res/xml/secure_store_backup_rules.xml` and `secure_store_data_extraction_rules.xml` whose rules **include only the `sharedpref` domain** (excluding `SecureStore`). AsyncStorage lives in the SQLite **`database` domain** (`RKStorage`), which is **not included** → **AsyncStorage is excluded from cloud backup and device transfer**. The original "PHI is backup-eligible" statement is **withdrawn**. See §15 / MOB-04.

**Release-signing verdict:** **FAIL** — release is configured to use the debug signing identity (MOB-05).

**Cleartext verdict:** debug permits cleartext (`usesCleartextTraffic="true"` in debug/debugOptimized manifests); **release does not** and defaults to cleartext-blocked under targetSdk ≥ 28. However the committed default API URL is **plain HTTP on a private LAN IP** (MOB-11), so the shipped default cannot work over HTTPS and hints at a dev config leak.

**TLS/pinning verdict:** default Android/network TLS; no pinning. **Not exploitable under baseline threat model**; pinning is optional defence-in-depth, not a blocker.

**Deep-link verdict:** `raiyahplus` scheme registered; no inbound token/payment links found; expo-router default handling; group layouts lack auth guards but the root redirect + backend re-auth contain exposure. Low (MOB-12).

**WebView verdict:** one LiveKit WebView (`originWhitelist:['*']`, `mixedContentMode:'always'`); inputs are JSON-escaped and not attacker-controlled; postMessage handler is non-privileged. Low (MOB-14).

**Notification verdict:** local/in-app notifications only; **server push dispatch is not implemented** (device tokens are registered but never used to send). Device-token lifecycle is unsafe for the future (MOB-09) but no live exposure today.

**GPS integrity verdict:** **FAIL for attendance as trustworthy evidence** — client sends only `{latitude, longitude}` with no mock/provider/timestamp; the server **accepts** out-of-radius check-ins and merely flags/notifies. Client-side 500 m enforcement is bypassable (MOB-06).

**Repackaging verdict:** the public debug signing key lowers the bar (anyone can produce a same-identity APK), but Play App Signing would re-sign the distributed artifact; the practical risk is side-loaded builds, Maps-key quota abuse, and phishing clones, not silent update replacement of a Play-distributed app (MOB-05, MOB-15).

**Sensitive logging verdict:** **clean** — no `console.log` of tokens/PHI, no mobile Sentry, no crash-reporter. (MOB-H12 WITHDRAWN.)

**Telehealth media-lifecycle verdict:** LiveKitRoom disconnects on unmount and stops the audio session; `leave()` calls `room.disconnect()`. Logout *during* a call is not explicitly handled but unmount terminates media. Low/Likely (MOB-16, Informational).

---

## 2. Scope & Methodology

Reviewed the entire `mobile/` tree (Expo config, `app/`, `lib/`, `stores/`, `hooks/`, `components/`, `services/`, `patches/`, and the committed `android/` native project), and cross-read server code where the mobile consequence depends on server behaviour (auth, device tokens, Socket.IO handshake, GPS check-in, telehealth token, notifications).

Method:
1. Reconstruct mobile architecture (§3) and Android build/release configuration (§4).
2. Inventory local persistence and trace what is actually stored (§8–§10).
3. Trace the **logout data-destruction path** across every persistence/lifecycle layer (§12).
4. Trace cross-user account-switch exposure (§12, §37, §38 AT-MOB-03).
5. Assess each MASVS domain: storage, crypto, auth, network, platform, code, resilience, privacy.
6. **Falsify** every candidate (e.g. "is the persisted key even reachable?", "does M-42 stop token reuse?", "does the JWT alphabet permit a WebView breakout?") and withdraw what does not survive (§42, §49).
7. Classify status strictly: source inspection is never labelled RUNTIME-CONFIRMED (§49).

**Prior-phase non-duplication:** Phase 1F repeats no prior finding except where a distinct mobile consequence exists (e.g. SecureStore token storage is acknowledged, not re-reported; the missing WhatsApp signature root cause stays in Phase 1E). The LiveKit WebView `</script>` hypothesis was already falsified in Phase 1E (JWT alphabet); Phase 1F re-examined it for a *mobile* path and withdrew it again.

**Read-only guarantee:** no application source, Expo/Android config, `.env`, schema, server code, dependency, or lockfile was modified. The committed `debug.keystore` was materialised to a temp dir solely to read its certificate with `keytool`, then deleted.

---

## 3. Mobile Architecture

| Property | Value |
|---|---|
| Framework | Expo SDK 54 (`expo ~54.0.37`), React Native 0.81.5, Expo Router ~6.0.24 |
| JS engine | Hermes (`hermesEnabled=true`) |
| New Architecture | enabled (`newArchEnabled=true`, Fabric/TurboModules) |
| Navigation | Expo Router file-based; role groups `(auth) (family) (onboarding) (staff) (clinical) (coordinator) (support) (admin) (org)` |
| State | Zustand (`authStore`, `onboardingStore`, `shiftStore`, `offlineStore`, `adminDrawerStore`) + TanStack Query v5 with AsyncStorage persister |
| Networking | Axios (`apiClient`), Socket.IO client, WebRTC/LiveKit (`@livekit/react-native`, `@livekit/react-native-webrtc` + a native patch), `react-native-webview` (LiveKit fallback) |
| Storage | `expo-secure-store` (token, biometric email), AsyncStorage (query cache, onboarding draft) |
| Media | `expo-av` (voice), `expo-camera`, `expo-image-picker`, `expo-file-system` (downloads), `expo-sharing`, `expo-intent-launcher` |
| Location | `expo-location` (foreground only) |
| Notifications | `expo-notifications` (Expo push token registration) |
| Auth | Bearer JWT in SecureStore; attached to REST + Socket.IO handshake; no refresh flow |
| applicationId | `com.raiyahplus.app` |
| iOS native project | none committed (iOS config exists in `app.json` only) |

**Role routing:** `routeByRole()` (`authStore.ts`) sends family → `(family)`/onboarding, platform admins → `(admin)`, org admins → `(org)`, coordinator → `(coordinator)`, clinical → `(clinical)`, support → `(support)`, everything else → `(staff)`.

**Component inventory (selected):**

| Component | Purpose | Sensitive data | Storage | Native capability | Security concern |
|---|---|---|---|---|---|
| `stores/authStore.ts` | auth lifecycle | token, user | SecureStore + memory | — | logout does not purge caches (§12) |
| `lib/query/client.ts` | persisted cache | care-plan/sessions/tasks | AsyncStorage | — | plaintext PHI, not cleared (§9) |
| `stores/onboardingStore.ts` | intake draft | care recipient, address | AsyncStorage | — | plaintext PII (§9) |
| `lib/realtime.ts` | Socket.IO singleton | chat/PHI events | memory | — | not released on logout (§14) |
| `lib/notifications.ts` | push registration | device token | server | notifications | stale token (§24) |
| `lib/location.ts`, `(staff)/shift.tsx` | GPS check-in | coordinates | server | location | spoofable, client-only gate (§25) |
| `components/voice/*`, `lib/api/conversations.ts`, `lib/api/invoices.ts` | media/docs | PHI audio/PDF | filesystem cache | mic/camera | temp files uncleaned (§30/§31) |
| `components/telehealth/LiveKit*` | video visits | tokens/media | WebView/memory | camera/mic/screen | lifecycle, WebView config (§29/§20) |

---

## 4. Build & Release Configuration

| Item | Value | Source |
|---|---|---|
| applicationId / namespace | `com.raiyahplus.app` | `app/build.gradle` |
| minSdk / targetSdk / compileSdk | **minSdk 24 · targetSdk 36 · compileSdk 36** — **artifact-verified** (Phase 1F-V); `expo-build-properties` is not in plugins, so these come from the Expo SDK 54 / RN plugin defaults resolved at build time | `aapt2 dump badging` on built APK |
| buildTypes | `debug`, `release` | `app/build.gradle` |
| **debug signing** | `signingConfigs.debug` → `debug.keystore`, `storePassword 'android'`, `keyAlias 'androiddebugkey'`, `keyPassword 'android'` | `app/build.gradle` |
| **release signing** | `signingConfig signingConfigs.debug` ← **release uses debug identity** | `app/build.gradle` |
| minifyEnabled (release) | resolves to `findProperty('android.enableMinifyInReleaseBuilds') ?: false` → **false** (property absent) | `app/build.gradle` + `gradle.properties` |
| shrinkResources (release) | `android.enableShrinkResourcesInReleaseBuilds ?: 'false'` → **false** | same |
| ProGuard rules | default template + reanimated/turbomodule keeps | `proguard-rules.pro` |
| `usesCleartextTraffic` | release: **not set** (default blocked, targetSdk≥28); debug/debugOptimized: **`true`** | manifests |
| networkSecurityConfig | **none** | manifests |
| allowBackup | **`true`** | main manifest |
| fullBackupContent / dataExtractionRules | `@xml/secure_store_backup_rules` / `@xml/secure_store_data_extraction_rules` — **XML files absent from the committed tree** | main manifest + tree listing |
| debuggable (release) | not set → false (debug-only by default) | manifests |
| EAS config (`eas.json`) | **absent** | tree |
| Expo Updates | `<meta-data ... ENABLED="false">`; `expo-updates` not a dependency → **OTA disabled** | main manifest + `package.json` |

---

## 5. APK / Artifact Analysis

**No APK was built.** Producing a release artifact would require `npm install` in `mobile/` and a full Android toolchain, and the committed tree is **missing the referenced backup-rule XMLs**, so a clean `assembleRelease` was not attempted. Consequently:

- **No merged-manifest inspection** was possible; findings that depend on the *final merged* manifest (backup rules, added permissions) are marked **LIKELY** and queued in §43.
- The **committed** manifest and Gradle files were inspected directly and are authoritative for what the project *configures*.
- The committed `debug.keystore` **was** inspected (it is a file in the tree) — see §6.

Every finding below states explicitly whether it is source-configuration or built-artifact behaviour.

---

## 6. Application Signing — MOB-05 (RUNTIME-CONFIRMED)

`mobile/android/app/debug.keystore` is committed and is the **well-known Android debug keystore**:

```
$ keytool -list -v -keystore debug.keystore -storepass android
Alias name: androiddebugkey
Creation date: Jan 1, 2014
Owner/Issuer: CN=Android Debug, OU=Android, O=Unknown, ...
SHA1:   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA256: FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
Signature algorithm: SHA1withRSA (weak)
```

And `app/build.gradle`:

```gradle
signingConfigs {
    debug { storeFile file('debug.keystore'); storePassword 'android'; keyAlias 'androiddebugkey'; keyPassword 'android' }
}
buildTypes {
    release {
        signingConfig signingConfigs.debug   // ← release inherits the public debug identity
```

The debug key's **password and alias are the public Android defaults**, so the same signing identity is reproducible by anyone. This is a genuine finding because the *build configuration* forces the release variant to use it — not merely because no production key is committed.

---

## 7. Reverse Engineering & Repackaging

The app is a standard Hermes/RN bundle; decompilation and JS inspection are expected and not themselves findings. Extractable configuration (§22) includes the API base URL and the Google Maps key. **No server secret is bundled** (checked: no `JWT_*`, AWS, Stripe, PayTabs, DB, or SMTP secrets under `EXPO_PUBLIC_*` or in `app.config.js`). Repackaging is analysed in AT-MOB-05 (§38) and is worsened by debug signing (MOB-05) but not by any bundled secret.

---

## 8. Local Data Inventory

| Key / path | Technology | Data | Sensitivity | TTL | Encrypted | Cleared on logout? | Backup-eligible? |
|---|---|---|---|---|---|---|---|
| `auth_token` | SecureStore | access JWT | authentication (critical) | token TTL (~15 min, but retained) | **platform-encrypted (Keystore)** | ✅ deleted | excluded by SecureStore rules (if generated) |
| `auth_bio_email` | SecureStore | email | PII | none | platform-encrypted | ❌ **retained** | excluded (if generated) |
| `RAIYAH_QUERY_CACHE_V1` | AsyncStorage | persisted TanStack cache shell: allowlists `care-plan`, `sessions-me`, `tasks-me-pending` — **all three queries currently never execute** → holds no PHI today | PHI-capable (latent) | 12 h (`maxAge`) | ❌ plaintext | ❌ **retained** | **eligible** |
| `raiyah:family_careseeker_onboarding_draft` | AsyncStorage | care recipient type, care needs, address, schedule, consents | **PII/PHI** | 24 h | ❌ plaintext | ❌ retained (cleared only on step-5 completion) | **eligible** |
| `expo-av` recordings | filesystem `cacheDirectory` | audio PHI | **PHI** | none | ❌ plaintext | ❌ retained | cache generally excluded from cloud backup, on-device persists |
| downloaded docs/invoices | filesystem `cacheDirectory` | PHI PDFs/docs | **PHI** | none | ❌ plaintext | ❌ retained | cache persists on device |
| Zustand (memory) | JS heap | auth user, role, shift, **query cache** | PHI/PII in memory | process life | ❌ | partially (auth only) | n/a |

**New persistence not previously catalogued in Phase 1A:** the `shiftStore` holds `checkInLocation` in memory only (not persisted). The `auth_bio_email` SecureStore entry is **not** cleared on logout. No SQLite/MMKV/Realm. No `expo-clipboard` usage.

---

## 9. PHI at Rest

Assume the device is lost, stolen, shared, rooted, backed up, `adb`-connected, or instrumented.

**Without unlocking SecureStore, an attacker with filesystem access (or an Android backup) can recover:**

- `RAIYAH_QUERY_CACHE_V1`: a serialized TanStack cache **shell**. Its allowlist covers `care-plan`, `sessions-me`, `tasks-me-pending`, whose payload shapes *would* carry **patient names** (`careEpisode.patient.name` / `careEpisode.careRecipient.name` from `/api/tasks`) and session data — **but those queries never execute today** (see the verification correction below), so the persisted file contains no PHI at present. The **latent risk**: wiring any of those routes writes this PHI to plaintext storage.
- The **onboarding draft**: care-recipient type, care needs, practitioner/language preferences, and **address** — family PII.
- Any **voice recordings** and **downloaded documents/invoices** still in `cacheDirectory`.

**Important verification correction (do not overstate):** re-checking the persisted keys under adversarial verification showed they **currently dehydrate no data at all** — the persister writes `{clientState:{queries:[],mutations:[]}}` today:
- `['care-plan', episodeId]` (`(family)/episode/care-plan.tsx`): `enabled: Boolean(episodeId)`, but the default export renders `<CarePlanTab />` with **no `episodeId`** and the file reads no route params — the query is permanently disabled, so it never fetches and never dehydrates.
- `['sessions-me']` / `['tasks-me-pending']`: consumed **only** by the `(staff)` group, whose `_layout` **always** redirects (clinical→clinical, support→support, else→login); those screens never render, so the queries never run.

So `RAIYAH_QUERY_CACHE_V1` is an **empty persisted shell today**; the **onboarding draft is the real PII at rest**, and the **policy** (plaintext, PHI-capable allowlist, never purged) is the latent defect that becomes live PHI the moment any of those routes is wired or linked. MOB-01 therefore rests on the onboarding draft + the latent policy; MOB-02 rests on the **in-memory** cache, which *is* populated by live screens (`['family-care-plans']`, `['family-episode', id]`, etc.).

---

## 10. SecureStore / Keystore

| Aspect | Observed |
|---|---|
| Keys | `auth_token`, `auth_bio_email` |
| Options | **None** — `SecureStore.setItemAsync(key, value)` with no `keychainAccessible`, `requireAuthentication`, or `authenticationPrompt` |
| Binding to device auth | **No** — the token is protected by the OS keystore at rest but is **not** gated by biometric/device-credential on read |
| Root threat model | A rooted device can defeat app-sandbox keystore access; expected |

**Verdict:** SecureStore use is correct for a bearer token and is **not** a vulnerability by itself. The two gaps are (a) the token is not bound to user/device authentication (acceptable baseline, optional hardening), and (b) the **PHI/PII in AsyncStorage is not equivalently protected**, and *should not be stored at all* rather than merely encrypted.

---

## 11. Query Cache / AsyncStorage

`lib/query/client.ts` persists only an allowlist of keys:

```ts
export const PERSISTED_QUERY_KEYS = ['care-plan', 'sessions-me', 'tasks-me-pending'] as const;
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage, key: 'RAIYAH_QUERY_CACHE_V1', throttleTime: 2000,
});
```

`PersistQueryClientProvider` is wired at the root (`app/_layout.tsx`). **Cache keys are not user-scoped** — e.g. `['sessions-me']`, `['family-care-plans']`, `['family-nav-badges']`, `['clinical-shell-stats']` carry no `userId`. This is the root of the cross-user finding: identical keys across accounts mean a stale entry is a candidate for the next user to render.

**No code path clears the persisted cache** (`RAIYAH_QUERY_CACHE_V1` is written, never removed): `git grep` for `queryClient.clear|removeQueries|resetQueries` returns nothing; no `AsyncStorage.removeItem('RAIYAH_QUERY_CACHE_V1')` exists.

---

## 12. Logout & Cross-User Isolation — MOB-02 (STATIC-CONFIRMED)

`authStore.logout()`:

```ts
logout: async () => {
  try { await apiClient.post('/api/auth/logout'); } catch { /* ignore */ }
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  setApiAuthToken(null);
  set({ token: null, user: null });
  router.replace('/(auth)/login');
},
```

It clears **only** SecureStore + Zustand auth slice. It does **not**:

| Layer | Cleared on logout? | Consequence |
|---|---|---|
| SecureStore token | ✅ | good |
| Zustand `authStore` | ✅ | good |
| **TanStack memory cache** | ❌ | User A's query data remains renderable by User B before/without refetch |
| **TanStack persisted cache** | ❌ | PHI survives process death (MOB-01) |
| Onboarding draft | ❌ | PII survives; cleared only at step-5 completion |
| Socket.IO singleton | ❌ | socket stays connected (MOB-03) |
| Navigation stack | ❌ (only `replace` to login) | back-stack/deep-link may reach stale screens |
| Push device token | ❌ (no revoke call) | stale token (MOB-09) |
| Downloaded/voice temp files | ❌ | PHI files persist (MOB-08) |

**Cross-user test (statically traced):** User A logs in → loads care plans/sessions → logout → User B logs in on the **same running app instance**. Because the memory cache is untouched and keys are not user-scoped, B's screens can display A's cached entries until a refetch resolves — and **indefinitely if B is offline or the request fails**. `logoutAll`/password reset are server-side only; the client is informed of neither, so the cache is not purged on those events either.

**This is the report's primary release blocker.** It is a real cross-account PHI exposure on shared devices (clinics, family-shared phones), mitigated only by the two users not sharing the same app process/session.

---

## 13. Authentication Lifecycle

- Login stores the access JWT in SecureStore and in the Axios default header. **No refresh-token flow exists in the mobile client** even though the server issues a refresh token (prior-phase finding); the mobile app ignores it.
- **No 401 interceptor** (`apiClient.interceptors.response` merely passes errors through). On token expiry (~15 min) the app keeps issuing requests that fail with 401; there is **no global re-auth redirect**. Screens relying on cached data continue to render it (see MOB-10).
- `hydrate()` on cold start reads the token and calls `/api/me`; on failure it **deletes the token** and drops to unauthenticated — good — **but does not clear AsyncStorage**, so the onboarding draft (and any live persisted cache) survives even the failure path.
- 2FA: OTP verify stores the returned token (`otp.tsx`). No refresh.
- `shiftStore` is memory-only and is **not** cleared on logout, so a lingering "on shift" state can survive an account switch in the same process.

**Verdict:** the token lifecycle is architecturally weak (no refresh, no 401 handling) — a **session-architecture defect** with a security edge (stale cached data outlives authorization) rather than a standalone credential theft.

---

## 14. Realtime / Socket Lifecycle — MOB-03 (STATIC-CONFIRMED)

`lib/realtime.ts` provides `releaseRealtimeSocket()` which disconnects and clears the singleton. **It is never called anywhere** (confirmed: the only reference is its own definition). `logout()` does not touch the socket. The socket is created in `MessagesInbox` via `getRealtimeSocket(token)` and reused while `sharedToken === token`.

Consequence: after logout, the socket **remains connected** with the previous user's JWT. The server validates auth at handshake only and checks `wasLoggedOutAll` on handshake (Phase 1C: handshake-only lifetime). Ordinary logout does **not** call `recordLogoutAll`, so the token stays valid until expiry and the socket keeps receiving `new_message` / `notification` events for that user. On a shared device, User B can therefore observe User A's realtime notifications/messages until the token expires or the app is killed.

**Mobile contribution (distinct from Phase 1C's server finding):** the client never releases the socket and never re-issues it on account change, so the server-side handshake-only lifetime is *never* exercised by a proactive client disconnect.

---

## 15. Android Backup / Restore — MOB-04 (LIKELY)

Main manifest: `android:allowBackup="true"`, with `android:fullBackupContent="@xml/secure_store_backup_rules"` and `android:dataExtractionRules="@xml/secure_store_data_extraction_rules"`.

**The two XML resources are absent from the committed tree** (`git ls-tree -r` for `mobile/android` shows no `res/xml/`; a repo-wide search for `secure_store_*` returns nothing). They are normally generated by the `expo-secure-store` config plugin during prebuild. Two possibilities, both requiring artifact verification:

1. **The plugin generates them at build time** → they will exclude **SecureStore** but **not AsyncStorage** → the PHI query cache and onboarding draft remain **backup-eligible** while the token is protected. (This is the ordinary expo-secure-store behaviour.)
2. **They are genuinely missing** → a resource-linking failure at build, **or** a merge that leaves AsyncStorage eligible.

Either way, **on the committed configuration AsyncStorage is not excluded from backup**, so the **onboarding PII draft** (and any live persisted PHI cache) can be carried off the device by cloud/device-to-device backup. The token is the only asset the intended exclusion protects. **Verdict: LIKELY; needs merged-manifest + backup-rule inspection (§43).**

---

## 16. Screenshots / Recent Apps / Clipboard — MOB-07 (STATIC-CONFIRMED)

- **No `FLAG_SECURE`** and **no `expo-screen-capture`** anywhere in the app (searched; only unrelated `ScreenCaptureController` references inside the LiveKit patch's build artifacts).
- Therefore PHI-heavy screens (care plan, patient/episode detail, clinical notes, telehealth, messages, GPS map, documents, billing) are **screenshot-able**, appear in **recent-apps thumbnails**, and can be **screen-recorded**. Android overlay apps can capture/interact per their own permissions.
- **Clipboard:** no `expo-clipboard` usage; the app does not copy tokens/PHI to the clipboard. **No clipboard finding.**

---

## 17. Android Manifest & Permissions

Final (committed main) manifest permissions:

| Permission | Feature requiring it | Runtime requested? | Needed in production? | Sensitive capability | Recommendation |
|---|---|---|---|---|---|
| ACCESS_FINE/COARSE_LOCATION | GPS check-in | yes | yes | precise location | keep |
| CAMERA | telehealth | yes | yes | camera | keep |
| RECORD_AUDIO | telehealth + voice notes | yes | yes | microphone | keep |
| MODIFY_AUDIO_SETTINGS | WebRTC audio | n/a | yes | audio routing | keep |
| POST_NOTIFICATIONS | notifications | via expo-notifications | yes | notifications | keep |
| VIBRATE | notifications | n/a | yes | — | keep |
| USE_BIOMETRIC / USE_FINGERPRINT | `expo-local-authentication` | no | **unused** | biometric | remove or implement (§14) |
| FOREGROUND_SERVICE | LiveKit recording/FGS | n/a | yes (call/record) | background service | keep |
| FOREGROUND_SERVICE_MEDIA_PROJECTION | screen share | n/a | yes (screen share) | screen capture | keep |
| **SYSTEM_ALERT_WINDOW** | **none found in app code** | no | **no** | draw over other apps | **remove** (MOB-13) |
| **READ_EXTERNAL_STORAGE** | none found | no | **obsolete (API ≤32)** | broad storage read | **remove** (MOB-13) |
| **WRITE_EXTERNAL_STORAGE** | none found | no | **obsolete** | broad storage write | **remove** (MOB-13) |

`SYSTEM_ALERT_WINDOW` also appears in the **debug** and **debugOptimized** manifests (where `expo-dev-client` needs it), but it is present in the **main/release** manifest too. `READ/WRITE_EXTERNAL_STORAGE` add an unnecessary file-access surface on older devices.

---

## 18. Exported Android Components

- **MainActivity** — `android:exported="true"` with the LAUNCHER intent-filter **and** a `raiyahplus` scheme VIEW filter. Exporting a launcher activity is required and **not** a finding by itself.
- **No other exported activities/services/receivers/providers** in the committed main manifest.
- The LiveKit `MediaProjectionService` (foreground service) is declared by the library; it is not exported with attacker-reachable extras.
- **No `FileProvider`** in the committed manifest (relevant to §31/§40 — see below).

---

## 19. Deep Links / Intents — MOB-12 (STATIC-CONFIRMED, Low)

- Scheme `raiyahplus` (app.json) → `AndroidManifest` VIEW filter. No host/path constraints.
- **No `Linking.getInitialURL` / `addEventListener('url')` handling in app code** → routing is Expo Router's default file-based resolution.
- **No inbound `raiyahplus://` links are generated anywhere** (server/emails/client checked) — no token/payment/reset links use the scheme.
- **Group layouts lack auth guards**: `(admin)/_layout.tsx`, `(family)/_layout.tsx`, etc. contain no `useAuthStore` user check; only `app/index.tsx` redirects by role, and `(staff)/_layout.tsx` redirects clinical/support. A crafted deep link such as `raiyahplus://(admin)/...` can route a screen **without a prior role check**.
- **Mitigations:** the backend re-authorizes every request (no client-trusted authorization; prior phases), and no PHI is present pre-auth *unless* it is in the cache (MOB-02). So a deep link alone does not disclose PHI; combined with the un-purged cache it could surface cached data to an unauthenticated context on a shared device.

**Verdict: Low.** Withdraw the "deep link → PHI" path unless chained with MOB-02.

---

## 20. WebView Security — MOB-14 (Low)

One WebView: `components/telehealth/LiveKitRoomWebView.tsx` (Expo Go fallback).

- `originWhitelist={['*']}`, `mixedContentMode="always"`, `javaScriptEnabled`, `domStorageEnabled`, `mediaCapturePermissionGrantType="grant"`, `source={{ html, baseUrl: 'https://localhost' }}`.
- Interpolated values are `JSON.stringify(token)` and `JSON.stringify(serverUrl)`; `serverUrl` is `env.LIVEKIT_URL` (server-side, same for all) and the token is a LiveKit JWT (base64url alphabet, no `<`/`>`). **The `</script>` breakout hypothesis is falsified** (same as Phase 1E).
- `onMessage` parses `event.nativeEvent.data` and only acts on `payload.type === 'disconnected'` — **no privileged native bridge**.
- `originWhitelist:['*']` allows navigation anywhere, but no attacker-controlled URL is ever loaded into it.

**Verdict: Low.** Harden `originWhitelist` to the LiveKit/CDN origins and set `mixedContentMode="never"`; no present exploit.

---

## 21. Network / TLS — MOB-11 (Low) + cleartext

- `apiClient` / `realtime` base URL resolution: `Constants.expoConfig.extra.apiUrl ?? EXPO_PUBLIC_API_URL ?? EXPO_PUBLIC_SERVER_BASE_URI ?? 'http://localhost:5001'`.
- The **committed `mobile/.env`** sets `EXPO_PUBLIC_API_URL=http://192.168.18.127:5001` — a **private LAN IP over plain HTTP** — and `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza…` (redacted value in this report).
- **Release cleartext:** no `usesCleartextTraffic` and no networkSecurityConfig in the main/release manifest → under targetSdk ≥ 28 cleartext is **blocked by default**. So a release build pointed at the committed HTTP LAN URL would fail; a real deployment must supply an HTTPS origin. **Debug** manifests set `usesCleartextTraffic="true"` (expected for dev).
- **Socket.IO** uses the same base URL; LiveKit uses `env.LIVEKIT_URL` (wss in practice). S3 downloads go through the authenticated API base, not directly to S3.

**Verdict:** the **security issue is the committed dev `.env` shipping a private LAN HTTP URL into the bundle** (MOB-11), not a release cleartext hole (release blocks cleartext). Debug cleartext is expected.

---

## 22. Environment & Bundled Configuration

`EXPO_PUBLIC_*` values are **public by design**. Bundled/derived values:

| Value | Classification |
|---|---|
| API base URL (`EXPO_PUBLIC_API_URL`, committed = HTTP LAN IP) | expected-public (but dev config leak — MOB-11) |
| Google Maps key (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`) | restricted-public-key (see §23) |
| `serverUrl` = LiveKit URL | expected-public |
| Expo/EAS projectId | expected-public |
| Sentry DSN | **not present** (no mobile Sentry) |
| Server secrets (JWT/AWS/Stripe/PayTabs/DB/SMTP) | **none bundled** — verified |

**Explicitly verified:** no **critical** or **sensitive** secret is bundled. The Maps key and API URL are the only extractable configuration, both expected to be public in a mobile client.

---

## 23. Maps Key Restrictions — MOB-19 (Informational / infra-unknown)

The key is extractable (expected). Whether extraction is *dangerous* depends on Google Cloud restrictions (Android package name + SHA-1 allowlist, API allowlist, quota/billing caps), which are **not in the repository**. The known issue that the same credential is used server-side belongs to a prior phase. **Mobile consequence:** if the key is unrestricted, an extracted copy can be used outside the signed app (quota/billing abuse); if it is Android-restricted to `com.raiyahplus.app` + the signing cert, extraction is largely inert — **except** that the app signs with the public debug key (MOB-05), so a SHA-1 restriction to that cert is reproducible by any attacker. Classify as **infrastructure verification** (§43).

---

## 24. Push Notifications / Device Tokens — MOB-09 (LIKELY, Low)

- `lib/notifications.ts` registers an Expo push token with `POST /api/device-tokens` after login (`app/_layout.tsx`), guarded by permission + `easConfig.projectId`.
- **Server push dispatch is not implemented** — no Expo push API / FCM send exists server-side; `NotificationService` writes in-app rows and emits over Socket.IO only. So **no push notifications actually reach devices today**, and the OS-UI PHI-disclosure tree (AT-MOB-07, §38) is **withdrawn for current behaviour**.
- **Token lifecycle is still unsafe for the future:** `logout()` never calls `revokeByToken`; the server's M-42 prevents re-binding a token to another account (returns 403, silently swallowed by the client). So after A logs out and B logs in on the same device, the token stays **bound to A**, B's registration fails, and — if push is ever implemented — A-addressed notifications would be delivered to a device now operated by B.
- **Verdict: Low today (no dispatch), Medium the moment push is enabled.** Must revoke the device token on logout and on account switch.

---

## 25. GPS / Location Integrity — MOB-06 (STATIC-CONFIRMED)

**Client:** `lib/location.ts` and `(staff)/shift.tsx` call `Location.getCurrentPositionAsync({ accuracy: High })` and submit **only** `{ sessionId, latitude, longitude }` to `/api/telehealth/checkin` (and checkout). No `accuracy`, `timestamp`, `provider`, `isFromMockProvider`, `mocked`, or device-integrity signal is sent. The client enforces a **500 m** radius before submit — **client-side only**.

**Server:** `TelehealthController.sessionCheckin` validates ranges only (`lat ∈ [-90,90]`, `lng ∈ [-180,180]`) and calls `GPSService.applySessionCheckin`, which:
- rejects closed/duplicate sessions,
- computes `evaluateGeofence(...)`,
- **persists the check-in and sets `isGeofenced`/`geofenceStatus`**,
- **does not reject out-of-radius** — it only notifies the coordinator (`gps_out_of_radius`).

**Therefore:** an attacker using a **mock-location app**, an **emulator**, **Frida** (replacing the coordinate values before submission), a **repacked client**, or a **direct API call with a stolen token** can record attendance at coordinates of their choosing. Out-of-radius check-ins are *flagged*, not blocked, so even the server-side geofence is advisory. There is **no mock-location detection, no Play Integrity/attestation, and no server-side anomaly detection**.

**Verdict:** GPS attendance is **not trustworthy evidence**. This is an **attendance-integrity** finding (Medium), distinct from privacy/authorization (which remain backend-enforced).

---

## 26. Device / App Attestation

No Play Integrity, SafetyNet, DeviceCheck, App Attest, or Firebase App Check anywhere in mobile or server. No business process cryptographically assumes device authenticity, but GPS attendance (§25) and financial/telehealth actions would benefit from it. **Not a standalone finding** — recorded as a residual control gap feeding MOB-06.

---

## 27. Root / Hook / Emulator Resilience

No root/jailbreak, Frida, emulator, or debugger detection; no integrity self-checks. Under the rooted-device threat model this is **expected** and not a vulnerability by itself. Root/instrumentation additionally enables: SecureStore token extraction, in-memory token/PHI reads, and coordinate/media hooking (which also worsens MOB-06). Classified **Informational** — root detection must not be used as a security boundary.

---

## 28. Logging / Logcat / Crash Reporting — MOB-H12 WITHDRAWN

- **App runtime code is clean:** `app/`, `lib/`, `stores/`, `components/`, `hooks/` contain **zero** `console.log/warn/error/debug` calls (verified; the only two `console.*` grep hits in those trees are the word "console" inside comments/UI text).
- **One dev-only exception:** `mobile/scripts/reset-project.js` (11 `console.*` calls) — a standalone Node utility referenced only by the `reset-project` npm script, **not imported by the app** and not part of the bundled `expo-router/entry` graph. It cannot execute on-device and carries no PHI/token.
- **No Sentry, no crash reporter, no analytics** in mobile (`package.json` checked).
- The LiveKit patch adds an `android.util.Log.e` for **screen-share capture failures** (no token, no coordinates, no PHI).
- Therefore **no token or PHI is written to logcat or sent to a crash service by app runtime code**. Withdrawn as a finding (the platform/OS may still log generic network metadata, which is not app-controlled).

---

## 29. Telehealth / LiveKit

- Token obtained from `POST /api/telehealth/token` and held in memory (`join` state / WebView prop); **not** persisted to disk or SecureStore; **not** logged.
- `TelehealthVideoRoom` picks native `LiveKitCallRoom` in dev/production builds, else the WebView fallback. `LiveKitCallRoom` uses `<LiveKitRoom connect audio video>` and stops the audio session on unmount; `leave()` calls `room.disconnect()`.
- `FOREGROUND_SERVICE_MEDIA_PROJECTION` + `MediaProjectionService` support screen share; the patch (§33) merely fixes a foreground-service race (blank first frame).
- **Logout during an active call** is not explicitly handled (no logout hook calls `room.disconnect()`), but navigation to the auth stack unmounts the room, which disconnects and stops media. **Verdict: Low/Likely** — recommend an explicit teardown on logout and on token expiry.

## 30. Voice / Camera / Media Files — MOB-08 (STATIC-CONFIRMED)

- Voice: `expo-av` `Recording.createAsync(HIGH_QUALITY)` writes to `cacheDirectory`; on stop, `stopAndUnloadAsync()` then upload. **The local audio file is never deleted** after a successful upload (no `FileSystem.deleteAsync`; grep for `deleteAsync|deleteFile|unlink` in `mobile/lib|components|app` returns nothing). Cancelled recordings likewise leave the partial cache file.
- Camera/photo: no `ImagePicker`/`launchCamera` usage found (no gallery writes to assess).
- **Consequence:** audio PHI accumulates in the app cache and is visible to the app (and, on rooted devices, to other tools); it survives logout.

## 31. File Download / External Viewer — MOB-08 (cont.)

- `lib/api/conversations.ts` downloads an attachment with the Bearer header into `cacheDirectory`, then on Android calls `IntentLauncher.startActivityAsync('android.intent.action.VIEW', { data: contentUri, flags: 1 })` — handing the file to an **external viewer app** via a content URI; on iOS it `Linking.openURL`. The file is **not deleted afterward**.
- `lib/api/invoices.ts` downloads the invoice PDF to `cacheDirectory` and calls `Sharing.shareAsync(...)` — PHI may leave to any chosen app; the file persists.
- No `FileProvider` is declared in the committed manifest; `getContentUriAsync` relies on the library/OS provider. Verify the shipped provider's path scope (§40/§43).

**Consequence:** PHI documents persist in the cache and are shared externally without cleanup or a user warning.

## 32. OTA / Update Security — MOB-20 (Informational)

`expo-updates` is **not** a dependency and the manifest sets `expo.modules.updates.ENABLED="false"`. **No OTA path exists** → no OTA trust problem. This *reduces* attack surface (no remote-code channel) at the cost of requiring store updates.

## 33. Dependencies & Native Patches — MOB-18 (Informational)

High-privilege deps (Expo modules, LiveKit/WebRTC, WebView, camera/audio, location, SecureStore, notifications, maps, file-system, async-storage, `patch-package`) are version-pinned. `mobile/patches/@livekit+react-native-webrtc+144.1.2.patch` is **161 KB**, but only **3 diffs are real source**:

- `AbstractVideoCaptureController.java` — replaces an ignored `startCapture` failure with a `Log.e` (diagnostic).
- `GetUserMediaImpl.java` — awaits foreground-service readiness before starting screen capture.
- `MediaProjectionService.java` — adds a `CountDownLatch` so `startForeground()` completes before capture begins (Android 14+ FGS race fix).

The other **222 diffs are committed `android/build/**` build artifacts** (`.dex`, `.class`, `.bin`) accidentally captured by `patch-package`. **No security-relevant behaviour is modified** (no TLS, permissions, or cert handling). **Finding: the patch file pollutes the repo with build artifacts and will not apply cleanly on a fresh machine** (informational hygiene, not security).

## 34. Client-Side Security Decisions

| Decision | Where | Classification |
|---|---|---|
| Role routing (`routeByRole`, group layouts) | client | **UX-only**; backend re-authorizes |
| 500 m geofence block before check-in | `(staff)/shift.tsx` | **client-trusted** (server accepts out-of-radius) → MOB-06 |
| Payment/consent gates | screens | server-rechecked (prior phases) |
| "Active shift" state | `shiftStore` | UX-only; memory; not cleared on logout |
| Notification badge counts | client query | UX-only |

Only the geofence gate is security-relevant and client-trusted; everything else is UX with backend enforcement.

---

## 35. Offline Security

`offlineStore` only tracks connectivity (NetInfo). With no network, TanStack serves cached data (memory + persisted). Because neither cache is purged on logout, **offline restart after logout can still surface the previous user's cached data** — from the **in-memory** cache for live screens within the same process, and from the persisted cache for any key that was populated (the persisted shell is empty today; the onboarding draft is real PII). This is confidentiality, not integrity: the app does not claim offline clinical accuracy. **Feeds MOB-01/MOB-02.**

## 36. App Lifecycle / Background Behaviour

- `AppState` is not used to gate sensitive screens; there is **no re-authentication after idle**. A backgrounded app with a live session shows PHI immediately on resume, and its recent-app thumbnail is unprotected (MOB-07).
- Media: LiveKit room is bound to the screen component and disconnects on unmount; the audio session is stopped on unmount. No explicit "stop on background".
- Token: no background refresh; expiry surfaces as failed requests (MOB-10).

---

## 37. Abuse Cases

**Local/opportunistic attacker (stolen or shared unlocked device):** reads AsyncStorage → the **onboarding PII draft** (+ any live persisted cache) and `cacheDirectory` → downloaded **PHI documents/invoices and voice recordings**; screenshots PHI screens; opens recent-app thumbnail; if the token is still valid, uses the app as the owner. → MOB-01/02/07/08.

**Shared device, sequential users:** logs out A, logs in B; B sees A's cached data (memory, offline-indefinite) and can receive A's realtime events until token expiry. → MOB-02/03.

**Rooted / instrumented attacker:** extracts SecureStore token, hooks coordinates/media, drives API directly. → MOB-05/06 + rooted model.

**Repackager / phishing:** builds a same-identity APK with the public debug key; side-loads or distributes a clone. → MOB-05.

**Attendance fraud (worker):** mocks location / calls API directly; server accepts. → MOB-06.

**External app:** receives downloaded PHI documents via VIEW/share intents; retains them. → MOB-08.

---

## 38. Attack Trees

### AT-MOB-01 — Fraudulently prove worker attendance
```
Worker (or holder of a worker token)
├── Mock-location app .............. POSSIBLE (no mock detection; server accepts)
├── Emulator location .............. POSSIBLE
├── Frida hook coordinates ......... POSSIBLE (rooted model)
├── Repacked client ................ POSSIBLE (MOB-05 lowers bar)
├── Direct API call ................ POSSIBLE (client gate bypassed; token needed)
├── Replay captured coords ......... POSSIBLE (no timestamp/nonce)
├── Out-of-radius check-in ......... POSSIBLE (server flags, does NOT reject)
├── Arbitrary accuracy ............. N/A (accuracy not sent)
└── On-site check-in then leave .... RESIDUAL business risk (no continuous tracking)
=> Attendance evidence is NOT trustworthy. (MOB-06)
```

### AT-MOB-02 — Obtain PHI from a stolen device
```
Stolen/borrowed device
├── Unlock app normally ............ needs app password (but AsyncStorage needs none)
├── AsyncStorage extraction ........ onboarding PII draft (MOB-01); persisted cache is empty today
├── Onboarding draft ............... SHORTEST PATH — PII (address, needs) (MOB-01)
├── cacheDirectory extraction ...... downloaded PHI docs/invoices + voice files (MOB-08)
├── Android backup ................. LIKELY-eligible for AsyncStorage (MOB-04)
├── adb / run-as ................... only if debuggable (release is not) or rooted
├── Root / SecureStore extraction .. token (root model)
├── Screenshots / recent-apps ...... PHI (MOB-07)
├── Downloaded docs / voice files .. PHI in cache (MOB-08)
├── Notification history ........... only in-app today (no push)
└── Logs / crash ................... CLEAN
=> Shortest path: filesystem/backup read of AsyncStorage; no app password required.
```

### AT-MOB-03 — User B obtains User A data on a shared device
```
A logout → B login (same app process)
├── In-memory TanStack cache ....... YES — not cleared, keys not user-scoped (MOB-02)
├── Persisted query cache .......... YES on disk; renderable via routes (MOB-01)
├── Onboarding draft ............... YES until step-5 completion (MOB-02)
├── Navigation back-stack .......... partially (replace only)
├── Realtime socket ................ YES until token expiry (MOB-03)
├── Push notifications ............. N/A (no dispatch); token stale (MOB-09)
├── Downloaded documents ........... YES (cache persists) (MOB-08)
├── Voice temp files ............... YES (cache persists) (MOB-08)
└── WebView storage ................ no persistent PHI
=> FAIL. (MOB-02 primary; MOB-01/03/08 contributing)
```

### AT-MOB-04 — Obtain or misuse the mobile bearer token
```
├── SecureStore at rest ............ protected (keystore) unless rooted (MOB-10 note)
├── Memory instrumentation ......... root model
├── Debugger ....................... release not debuggable
├── Frida .......................... root model
├── Logs ........................... CLEAN
├── Network MITM ................... TLS validated; no pinning (Info)
├── WebView ........................ token only in LiveKit WebView; not exfiltrated
├── Clipboard ...................... unused
├── Crash report ................... none
├── Background screenshot .......... screen, not memory
├── Backup ......................... SecureStore excluded (if rules generated)
└── Repacked APK ................... can call API with stolen creds (MOB-05)
=> Under non-root threat model, the token is adequately stored; the weaker assets are the onboarding PII draft, cached media/documents, and the un-purged in-memory cache.
```

### AT-MOB-05 — Produce a malicious Riayah Plus build
```
├── Extract bundle ................. trivial (JS/Hermes) — expected
├── Modify code .................... trivial
├── Re-sign APK .................... facilitated by PUBLIC debug key (MOB-05)
│    └── Cannot silently replace a Play-distributed app (Play re-signs with app-signing key)
├── Install (side-load) ............ works on user-enabled devices
├── Call production backend ........ YES if it accepts any client (no attestation)
├── Impersonate GPS ................ YES (MOB-06)
├── Capture credentials ............ via phishing UI in a clone
└── Maps key restriction .......... a SHA-1 bound to the debug cert is reproducible (MOB-05/§23)
=> Practical risk: phishing clones + quota abuse + side-load, not stealthy update replacement.
```

### AT-MOB-06 — Retain access to patient telehealth/media
```
├── Stolen LiveKit token ........... short TTL; server re-authorizes join
├── Open socket .................... survives logout (MOB-03)
├── Background media ............... disconnects on unmount; no explicit bg handling
├── WebView token extraction ....... JSON-escaped; not exfiltrated
├── Screen recording ............... allowed (MOB-07)
├── Replayed room token ............ server-side TTL/authorization (prior phases)
├── Old app session ................ token expiry + socket lifetime (MOB-03/10)
└── Repacked client ................ can request its own join (auth enforced server-side)
=> Media lifecycle is broadly sound; socket-lifetime and screenshots are the gaps.
```

### AT-MOB-07 — PHI disclosure through push/OS UI
```
├── Lock screen previews ........... N/A — server push NOT implemented
├── Stale user-device token ........ token not revoked (MOB-09) but unused today
├── Shared device .................. n/a without dispatch
├── Notification history ........... in-app only
└── Tap after logout ............... in-app list requires auth
=> WITHDRAWN for current behaviour; re-open when push dispatch is implemented.
```

---

## 39. Dynamic Test Matrix

| # | Test | Result classification |
|---|---|---|
| 1 | Extract AsyncStorage before logout | **STATIC ONLY** — onboarding PII draft present; persisted query cache currently empty |
| 2 | Extract AsyncStorage after logout | **STATIC ONLY** — not cleared (MOB-01) |
| 3 | A → logout → B (same process) | **STATIC ONLY** — memory cache not cleared (MOB-02) |
| 4 | App restart offline | **STATIC ONLY** — cache served from AsyncStorage |
| 5 | 15-min token expiry | **STATIC ONLY** — no 401 handler (MOB-10) |
| 6 | Logout with socket active | **STATIC ONLY** — `releaseRealtimeSocket` never called (MOB-03) |
| 7 | Password reset / logout-all → realtime ends | **STATIC ONLY** — server records it, client never disconnects |
| 8 | Proxy TLS test | **NOT TESTABLE** (no build) |
| 9 | Cleartext endpoint attempt | **STATIC** — release blocks; debug allows |
| 10 | Android backup inspection | **NOT TESTABLE** (no artifact); rules absent from tree (MOB-04) |
| 11 | Screenshot sensitive screen | **STATIC ONLY** — no FLAG_SECURE (MOB-07) |
| 12 | Recent-app preview | **STATIC ONLY** — unprotected (MOB-07) |
| 13 | Malicious deep link | **STATIC** — routing reachable, no PHI pre-auth without cache (MOB-12) |
| 14 | Direct route to admin group | **STATIC** — layout unguarded, backend denies data |
| 15 | Mock location | **STATIC ONLY** — accepted (MOB-06) |
| 16 | Repack/resign | **NOT TESTABLE** — signing config inspected instead (MOB-05) |
| 17 | Logcat capture | **STATIC ONLY** — no token/PHI logs (withdrawn) |
| 18 | Notification account switch | **STATIC** — M-42 blocks rebind; token stale (MOB-09) |
| 19 | Voice upload failure cleanup | **STATIC ONLY** — no delete anywhere (MOB-08) |
| 20 | Telehealth leave/logout | **STATIC ONLY** — disconnect on unmount; explicit logout teardown absent |
| 21 | App background during telehealth | **STATIC ONLY** — room bound to screen lifecycle |

**No test was executed** — the review host had no Android SDK/emulator and no build was produced. All statuses above are therefore STATIC (source-derived) or NOT TESTABLE; nothing is labelled RUNTIME. The single RUNTIME-CONFIRMED item in this report is the keystore inspection (a local file read, MOB-05).

---

## 40. Findings

### MOB-01 — PHI/PII persisted in plaintext AsyncStorage and never purged

**Severity:** Medium · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-STORAGE** · **CWE-312**
**Affected components:** `lib/query/client.ts`, `stores/onboardingStore.ts`, `app/_layout.tsx`

**Attacker model:** anyone with device/backup filesystem access (lost device, shared device, root, backup restore).
**Description:** the onboarding store writes care-recipient type, care needs, preferences, and **address** to `raiyah:family_careseeker_onboarding_draft` in **plaintext AsyncStorage**, cleared only on step-5 completion. The TanStack persister additionally allowlists `care-plan`/`sessions-me`/`tasks-me-pending` for `RAIYAH_QUERY_CACHE_V1`; those three queries **currently never execute** (see §9), so the cache is an empty shell today — but the **policy is a latent PHI hazard**: wiring any of those routes will write cached PHI to plaintext storage, and **no code path ever removes the persisted cache**.
**Evidence:** `PERSISTED_QUERY_KEYS = [...]`, `createAsyncStoragePersister({ key: 'RAIYAH_QUERY_CACHE_V1' })`; `persistDraft()` writes the draft on steps 1–4; no `queryClient.clear`/`removeQueries`/`removeItem('RAIYAH_QUERY_CACHE_V1')` anywhere.
**Data exposed:** **onboarding PII (address, needs) — present today**; cached care-plan/session/task PHI — **latent**, activates if the routes are wired.
**Existing controls:** none (token is in SecureStore, but the draft is not).
**Adversarial verification:** re-ran under `/adversarial-verification`: confirmed the draft is written on 4 onboarding steps; **corrected** an earlier overstatement — the persisted cache keys are inert because `['care-plan']` is gated on a never-supplied `episodeId` and the `(staff)` group always redirects, so the cache holds no PHI today. Persistence policy remains the defect.
**Recommendation:** do not persist PHI/PII at all unless offline is a product requirement; if it is, store the minimum fields encrypted with a Keystore-backed key, and purge the persisted cache + onboarding draft during logout/account switch.
**Retest:** complete onboarding steps 1–4, logout, kill/relaunch, inspect AsyncStorage for the draft; and if the persisted-query routes are wired, verify no PHI is stored or that it is purged.

---

### MOB-02 — Cross-user data on a shared device: logout does not clear caches

**Severity:** High · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-AUTH / MASVS-STORAGE** · **CWE-212 / CWE-488**
**Affected components:** `stores/authStore.ts:logout`, `lib/query/client.ts`, all query keys
**Attacker model:** second user on a shared clinic/family device.
**Description:** `logout()` clears only SecureStore + the Zustand auth slice. The TanStack **memory** cache, the **persisted** cache, the onboarding draft, the navigation stack, and the Socket.IO singleton all survive. Query keys are **not user-scoped** (`['sessions-me']`, `['family-care-plans']`, `['family-nav-badges']`…), so a stale entry is a direct candidate for the next user's screen. User B can render User A's PHI before a refetch resolves, and **indefinitely when offline**.
**Evidence:** `logout` body (above); no cache-clear calls; non-scoped keys.
**Cross-user impact:** PHI of user A visible to user B on the same device/session.
**Adversarial verification:** confirmed no clear path exists; confirmed keys lack `userId`; confirmed the root `PersistQueryClientProvider` is app-global; confirmed via re-verification that the persisted subset is currently an empty shell, so this finding rests on the **live in-memory** cache (populated by `['family-care-plans']`, `['family-episode', id]`, etc.).
**Recommendation:** in the logout/account-switch transaction: cancel in-flight queries, `queryClient.clear()`, delete `RAIYAH_QUERY_CACHE_V1`, clear/reset Zustand stores (auth/onboarding/shift), release the realtime socket, reset navigation, then transition to the auth stack.
**Retest:** A loads care plans → logout → login B offline → open care plans; assert B sees no A data.

---

### MOB-03 — Realtime socket survives logout (`releaseRealtimeSocket` is dead code)

**Severity:** High · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-AUTH** · **CWE-613**
**Affected components:** `lib/realtime.ts`, `stores/authStore.ts:logout`, `components/messages/MessagesInbox.tsx`
**Attacker model:** second user on a shared device / holder of the device after logout.
**Description:** `releaseRealtimeSocket()` exists but is never called; `logout()` never disconnects the singleton. The socket keeps the previous user's JWT and continues receiving `new_message`/`notification` events. Server auth is handshake-only (Phase 1C), and ordinary logout does not record a `logout-all`, so the token stays valid until expiry.
**Evidence:** sole reference to `releaseRealtimeSocket` is its definition; `logout` has no socket call.
**Adversarial verification:** confirmed no call site; confirmed the singleton is process-scoped; confirmed server validates at handshake only. Kept High.
**Recommendation:** call `releaseRealtimeSocket()` in `logout()` and on account switch/token expiry; have the server emit a logout event that terminates the user's sockets.
**Retest:** establish socket as A, logout, log in as B; assert A's socket is closed and no A events arrive.

---

### MOB-04 — Android backup rules protect AsyncStorage (artifact-verified)

**Severity:** Informational · **Confidence:** High · **Status:** RUNTIME-FALSIFIED (artifact-level) · **MASVS-STORAGE** · **CWE-312**
**Affected components:** `android/app/src/main/AndroidManifest.xml`, generated `res/xml/secure_store_backup_rules.xml`, `res/xml/secure_store_data_extraction_rules.xml`
**Correction (Phase 1F-V artifact validation, 2026-09-12):** a real APK was built (`assembleDebug` + `assembleRelease`) and the final artifact **contains both backup-rule XMLs** (generated by the `expo-secure-store` config plugin during prebuild). Decoded from the APK:

```xml
<!-- res/xml/secure_store_backup_rules.xml -->
<full-backup-content>
    <include domain="sharedpref" path="."/>
    <exclude domain="sharedpref" path="SecureStore"/>
</full-backup-content>
```
```xml
<!-- res/xml/secure_store_data_extraction_rules.xml -->
<data-extraction-rules>
    <cloud-backup>
        <include domain="sharedpref" path="."/>
        <exclude domain="sharedpref" path="SecureStore"/>
    </cloud-backup>
    <device-transfer>
        <include domain="sharedpref" path="."/>
        <exclude domain="sharedpref" path="SecureStore"/>
    </device-transfer>
</data-extraction-rules>
```

**Why this falsifies the original claim:** Android backup rules using `<include>` operate as an **allowlist** — only the included domains are backed up. These rules include **only `sharedpref`** (excluding `SecureStore`); the **`database` domain is not included**. AsyncStorage stores its data in **SQLite** (`RKStorage`, confirmed in `@react-native-async-storage/async-storage`'s `ReactDatabaseSupplier`/`StorageSupplier` → `getDatabasePath("RKStorage")` in the `databases/` directory), i.e. the **`database` domain**. Therefore AsyncStorage — including the onboarding PII draft — is **excluded from both cloud backup and device-to-device transfer** by omission. The token's `SecureStore` sharedpref is explicitly excluded as well. The original "PHI is backup-eligible" statement is **withdrawn**.

**Residual (Informational):** other sharedprefs besides `SecureStore` are backup-eligible. No PHI is known to be stored in sharedprefs (the app's only known sharedpref consumer is SecureStore itself), but this should be re-checked if any new native module begins writing PHI to SharedPreferences. `allowBackup="true"` remains, which is acceptable given the allowlist.

**Evidence:** `VER-1FV-A1` — APK built and inspected; decoded XML shown above; `aapt2 dump xmltree` on both artifacts confirmed `allowBackup=true`, `fullBackupContent=@0x7f160006`, `dataExtractionRules=@0x7f160007`.
**Recommendation:** none required for backup. Optionally set `allowBackup="false"` for defence-in-depth, and keep the generated rules under change control so a future plugin change that adds a `database` include does not silently re-expose AsyncStorage.
**Retest:** after any Expo/plugin upgrade, re-decode the built APK's `res/xml/secure_store_*` and assert the `database` domain is absent.

---

### MOB-05 — Release build is signed with the public Android debug key

**Severity:** High · **Confidence:** High · **Status:** RUNTIME-CONFIRMED · **MASVS-RESILIENCE / MASVS-CODE** · **CWE-321 / CWE-798**
**Affected components:** `android/app/build.gradle`, `android/app/debug.keystore`
**Description:** `release { signingConfig signingConfigs.debug }`; the committed `debug.keystore` is the well-known AOSP debug identity (public password `android`, alias `androiddebugkey`, SHA-256 `FA:C6:17:…`).
**Runtime evidence (Phase 1F-V 2026-09-12):** an actual **release APK** was produced (`./gradlew assembleRelease` → `BUILD SUCCESSFUL`, 162 MB) and verified: `apksigner verify --print-certs` reports **`CN=Android Debug`**, SHA-256 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c` — the same public debug identity. The debug APK reports the identical certificate. MOB-05 is therefore **RUNTIME-CONFIRMED on a genuine release artifact**, not merely on configuration. (`keytool -list -v` on the committed keystore is shown in §6.)
**Adversarial verification:** the defect is the **build configuration forcing release to the debug identity**, independent of Play App Signing. Distribution via Play (Play App Signing) would re-sign the shipped artifact, so a silent update of a Play-distributed app is **not** claimed. The reproducible-identity risk is real for side-loaded/pre-Play artifacts, phishing clones, and any Maps SHA-1 restriction bound to this cert.
**Recommendation:** remove `signingConfigs.debug` from `release`; sign via the controlled EAS/Play upload-key pipeline; verify produced fingerprints in CI.
**Retest:** `apksigner verify --print-certs` on a release artifact; assert a non-debug certificate.

---

### MOB-06 — GPS attendance integrity: client-supplied, un-attested, and not server-enforced

**Severity:** Medium · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-PLATFORM / MASVS-PRIVACY** · **CWE-290 / CWE-345**
**Affected components:** `lib/location.ts`, `app/(staff)/shift.tsx`, server `TelehealthController.sessionCheckin`, `GPSService.applySessionCheckin`
**Description:** the client sends only `{sessionId, latitude, longitude}`; no mock/provider/timestamp/accuracy/attestation. The client enforces a 500 m radius; the **server accepts out-of-radius check-ins** (flags `geofenceStatus` + notifies, never rejects). Mock location, emulators, Frida, repacked clients, and direct API calls all succeed.
**Adversarial verification:** confirmed the client gate is client-side; confirmed the server does not throw on `out_of_radius` (it only persists + notifies). Kept Medium (attendance fraud), not High (no PHI/authorization break).
**Recommendation:** treat client coordinates as untrusted evidence. Combine Play Integrity, mock-location signals, server-side plausibility/anomaly checks, and explicit fraud handling; decide whether out-of-radius check-ins should be rejected or only flagged per policy.
**Retest:** submit crafted coordinates from an emulator and via direct API; assert detection/attestation behaviour matches policy.

---

### MOB-07 — PHI screens unprotected against screenshots / recent apps / recording

**Severity:** Medium · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-PLATFORM / MASVS-PRIVACY** · **CWE-200**
**Affected components:** all PHI screens; absence of `FLAG_SECURE` / `expo-screen-capture`
**Description:** no screenshot/recording protection and no recent-app thumbnail suppression; PHI screens can be captured and appear in task switcher previews.
**Adversarial verification:** searched and confirmed no protection package or native flag.
**Recommendation:** apply `expo-screen-capture` (or `FLAG_SECURE`) to PHI-heavy screens per product policy, and blank sensitive content in the app-switcher via an `AppState` overlay. Prioritise telehealth, notes, care plans, billing.
**Retest:** attempt screenshot/recording on a PHI screen; inspect the recent-apps thumbnail.

---

### MOB-08 — PHI media/documents persist in cache and are shared externally

**Severity:** Medium · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-STORAGE / MASVS-PRIVACY** · **CWE-212 / CWE-459**
**Affected components:** `components/voice/VoiceRecordingsScreen.tsx`, `lib/api/conversations.ts`, `lib/api/invoices.ts`
**Description:** voice recordings and downloaded documents/invoices are written to `cacheDirectory` and **never deleted**; on Android the attachment is handed to an external viewer via a content URI, and invoices via the share sheet, without cleanup or a PHI warning.
**Adversarial verification:** confirmed no delete calls anywhere; confirmed the external-viewer/share handoff. Kept Medium (PHI on device + to third-party apps).
**Recommendation:** delete temp files after use and on logout/account switch; prefer in-app viewing; warn before sharing PHI externally; document FileProvider path scope.
**Retest:** record a voice note and download an invoice; assert temp files are removed after use and logout.

---

### MOB-09 — Push device token is not revoked on logout / account switch

**Severity:** Low (today) / Medium once push is enabled · **Confidence:** High · **Status:** LIKELY · **MASVS-AUTH / MASVS-PRIVACY** · **CWE-613**
**Affected components:** `lib/notifications.ts`, `stores/authStore.ts:logout`, server `DeviceTokenController`
**Description:** the app registers an Expo push token but never revokes it on logout; the server's M-42 refuses to re-bind a token to another account, so the token remains **owned by the previous user**. Server push dispatch is **not implemented**, so no notifications are sent today; when implemented, A-addressed pushes could reach a device now used by B.
**Adversarial verification:** confirmed no revoke call in the client; confirmed M-42 (403) prevents rebinding; confirmed no server push sender exists. Downgraded to Low today, flagged for the moment push ships.
**Recommendation:** revoke the device token on logout and account switch (`POST /api/device-tokens/revoke`); clear the token on token-expiry re-auth.
**Retest:** A register → logout → B login; assert A's token is revoked and B's fresh token is bound to B.

---

### MOB-10 — No 401 handling and no refresh flow: expired session serves stale cached data

**Severity:** Medium · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-AUTH** · **CWE-613**
**Affected components:** `lib/api/client.ts`, `stores/authStore.ts`
**Description:** the Axios response interceptor passes errors through; there is **no global 401 handler** and **no refresh-token flow** (the server-issued refresh token is ignored). After the ~15-minute access token expires, requests fail but the app neither re-authenticates nor purges caches, so the **previous session's cached data continues to render** (in-memory cache today; persisted PHI if those routes become live); `logout-all`/password reset are not communicated to the client.
**Adversarial verification:** confirmed the interceptor is a no-op and no refresh code exists. Classified as a session-architecture defect with a security edge (stale data outliving authorization), **not** a credential theft.
**Recommendation:** implement silent refresh with rotation, or a global 401 → purge caches + redirect to login; purge the cache on logout-all/password change.
**Retest:** set token TTL short; verify a 401 triggers safe re-auth and cache purge.

---

### MOB-11 — Committed `mobile/.env` ships a private LAN HTTP API URL and Maps key

**Severity:** Low · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-CODE / MASVS-PRIVACY** · **CWE-200 / CWE-538**
**Affected components:** `mobile/.env`, `mobile/.gitignore`
**Description:** `mobile/.env` is tracked and sets `EXPO_PUBLIC_API_URL=http://192.168.18.127:5001` (private LAN, plain HTTP) and the Google Maps key. `mobile/.gitignore` does **not** exclude `.env`. `EXPO_PUBLIC_*` is bundled into the client by design.
**Adversarial verification:** confirmed the file is tracked and not ignored; confirmed the values are bundled. Maps key is expected-public (see §23); the LAN HTTP URL is a dev-config leak and leaks internal network topology.
**Recommendation:** remove `.env` from VCS, add `.env`/`.env.*` to `mobile/.gitignore`, provide `.env.example`, and ensure the release URL is HTTPS.
**Retest:** confirm `.env` is untracked and the release build contains no LAN HTTP URL.

---

### MOB-12 — Deep-link scheme routes without group-level auth guards

**Severity:** Low · **Confidence:** Medium · **Status:** STATIC-CONFIRMED · **MASVS-PLATFORM / MASVS-AUTH** · **CWE-939**
**Affected components:** `app.json` scheme, `AndroidManifest` VIEW filter, group `_layout` files
**Description:** `raiyahplus` is registered with no host/path constraints and no custom link handler; only `app/index.tsx` and `(staff)/_layout.tsx` enforce role redirects, while `(admin)`/`(family)`/`(clinical)`/`(coordinator)`/`(org)`/`(support)` layouts have **no auth guard**. A crafted `raiyahplus://(admin)/…` can route a screen without a prior role check.
**Adversarial verification:** confirmed no inbound `raiyahplus://` links exist; confirmed backend re-authorizes every request; confirmed exposure requires the cache (MOB-02) to hold PHI. **Withdrew** the standalone "deep link → PHI" claim.
**Recommendation:** add an auth/role guard at each protected layout (or a router middleware) and constrain intent filters to intended hosts/paths.
**Retest:** invoke `raiyahplus://(admin)/…` while unauthenticated; assert redirect to login and no privileged data.

---

### MOB-13 — Over-broad permissions in the release manifest

**Severity:** Low · **Confidence:** High · **Status:** RUNTIME-CONFIRMED (artifact-verified) · **MASVS-PLATFORM** · **CWE-250**
**Affected components:** `android/app/src/main/AndroidManifest.xml`
**Description:** `SYSTEM_ALERT_WINDOW` (draw over other apps) and `READ/WRITE_EXTERNAL_STORAGE` (obsolete on modern Android) are declared in the **release** manifest though no app code uses them.
**Runtime evidence (Phase 1F-V 2026-09-12):** `aapt2 dump badging` on the built **release** APK confirms all three survive into the merged production artifact:
```
uses-permission: name='android.permission.SYSTEM_ALERT_WINDOW'
uses-permission: name='android.permission.READ_EXTERNAL_STORAGE' maxSdkVersion='32'
uses-permission: name='android.permission.WRITE_EXTERNAL_STORAGE'
```
(The `maxSdkVersion=32` cap on READ is Android's own default but does not remove the declaration.) Additional library-added permissions also appear (`BLUETOOTH`, `ACCESS_WIFI_STATE`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, c2dm, launcher-badge permissions) — normal for Firebase/Expo but worth a review pass.
**Adversarial verification:** confirmed no app usage of overlays or external storage; `SYSTEM_ALERT_WINDOW` originates from `expo-dev-client`, which should be debug-only — yet it is present in release.
**Recommendation:** remove these from the release manifest (e.g. via `tools:node="remove"` or manifest scoping) and keep dev-client permissions debug-only.
**Retest:** inspect the merged release manifest; assert absence.

---

### MOB-14 — LiveKit WebView is permissive

**Severity:** Low · **Confidence:** High · **Status:** STATIC-CONFIRMED · **MASVS-PLATFORM** · **CWE-1021**
**Affected components:** `components/telehealth/LiveKitRoomWebView.tsx`
**Description:** `originWhitelist={['*']}`, `mixedContentMode="always"`; inputs are JSON-escaped and the postMessage bridge is non-privileged.
**Adversarial verification:** re-tested the `</script>` hypothesis (LiveKit JWT alphabet excludes `<`/`>`; `serverUrl` is env-only) → **withdrawn**; confirmed no attacker-controlled URL is loaded. Kept Low.
**Recommendation:** restrict `originWhitelist` to the LiveKit/CDN origins and set `mixedContentMode="never"`.

---

### MOB-15 — Release minification/R8 disabled; no integrity/attestation

**Severity:** Low · **Confidence:** High · **Status:** RUNTIME-CONFIRMED (artifact-verified) · **MASVS-RESILIENCE** · **CWE-693**
**Affected components:** `app/build.gradle`, `gradle.properties`
**Description:** `minifyEnabled` resolves false and `shrinkResources` false in release; combined with the public debug signing (MOB-05) and no Play Integrity, repackaging friction is low.
**Runtime evidence (Phase 1F-V 2026-09-12):** the release build log contains **no R8/minify tasks** and produces **no `mapping.txt`** → minification remains disabled in the produced release artifact. (Note: the release APK's resource filenames appeared obfuscated, which is standard AAPT2 resource-name collapsing in release, **not** R8 code minification — a distinction Phase 1F-V checked.) Static claim **holds**.
**Adversarial verification:** decompilation is expected and not a finding; the *consequence* (easier repackaging + same-identity signing) is what raises it above Info.
**Recommendation:** enable R8/shrink in release and consider Play Integrity for high-risk flows (ties to MOB-06).

---

### MOB-16 — No explicit telehealth teardown on logout/token-expiry

**Severity:** Informational · **Status:** LIKELY · **MASVS-PLATFORM**
**Description:** media is bound to the room component and disconnects on unmount, so navigating to login ends media; but there is no explicit `room.disconnect()` in the logout/token-expiry path, so the guarantee depends on unmount. Recommend an explicit teardown.

### MOB-21 — Additional exported components from libraries (artifact-verified, informational)
**Severity:** Informational · **Status:** RUNTIME-CONFIRMED (artifact-level) · **MASVS-PLATFORM**
The built **release** manifest exports more than `MainActivity` (Phase 1F's static review saw only the committed manifest, which lacks library-merged components):
```
com.raiyahplus.app.MainActivity                       exported=true  (launcher + raiyahplus scheme — expected)
com.canhub.cropper.CropImageActivity                  exported=true  (cropper library)
com.google.firebase.iid.FirebaseInstanceIdReceiver    exported=true  (FCM, protected by c2dm permission — expected)
androidx.compose.ui.tooling.PreviewActivity           exported=true  (debug tooling — should not be in release)
androidx.work.impl.background.systemjob.SystemJobService exported=true (WorkManager — expected)
```
Only `androidx.compose.ui.tooling.PreviewActivity` is anomalous in release (dev tooling). `CropImageActivity` accepts an input URI from any app; it is a standard gallery-crop surface and should be reviewed for intent-extra handling if it ever receives PHI. No direct PHI disclosure was demonstrated (no runtime interaction performed). **Recommendation:** strip `PreviewActivity` from release; confirm `CropImageActivity`'s extras are not a data-exfiltration path.

### MOB-17 — No root/hook/emulator detection
**Severity:** Informational · **Status:** STATIC-CONFIRMED · **MASVS-RESILIENCE**
Expected under the rooted-device model; must not be used as a security boundary (see MOB-06).

### MOB-18 — LiveKit patch is a non-security FGS race fix
**Severity:** Informational · **Status:** STATIC-CONFIRMED
Three source diffs add logging + a foreground-service readiness latch for Android 14+ screen share; no TLS/permission/cert changes. (Also: 222 build-artifact diffs pollute the patch — hygiene only.)

### MOB-19 — Maps key restriction status unknown
**Severity:** Informational · **Status:** LIKELY (infra)
Extraction is expected; danger depends on Cloud restrictions not in the repo. Note the debug-cert SHA-1 is reproducible (MOB-05).

### MOB-20 — OTA updates not configured
**Severity:** Informational · **Status:** STATIC-CONFIRMED
`expo-updates` disabled/absent → no remote-code channel (surface reduction, not a defect).

---

## 41. Regression Verification (M4/M5)

| Control | Expected | Status |
|---|---|---|
| SecureStore token use | token in SecureStore | ✅ held |
| No web localStorage profile persistence | n/a (no such code) | ✅ held |
| Authorization backend-enforced | role routing is UX; APIs authorize | ✅ held |
| Release cleartext policy | release blocks cleartext | ✅ held (debug allows, as expected) |
| Socket.IO JWT handshake | JWT attached + verified | ✅ held (but no client disconnect — MOB-03) |
| Mobile upload allowlists | MIME/size on server | ✅ held (server-side) |
| Sentry scrubbing if mobile-integrated | no mobile Sentry | N/A (absent) |
| Payment/consent server-side gates | server-rechecked | ✅ held |
| Cache isolation on auth change | should purge | ❌ **regressed/absent** (MOB-01/02) |
| Device-token lifecycle on logout | revoke | ❌ absent (MOB-09) |

---

## 42. Withdrawn Suspicions

| Suspicion | Why withdrawn | Evidence |
|---|---|---|
| WebView `</script>` breakout via token/serverUrl (MOB-H14) | LiveKit JWT alphabet excludes `<`/`>`; `serverUrl` is `env.LIVEKIT_URL`; postMessage bridge non-privileged | §20 |
| Push notifications leaking PHI on the lock screen (MOB-H07/AT-MOB-07) | **Server push dispatch is not implemented**; only in-app + socket today | §24 |
| Token exposed in logs/Sentry (MOB-H12) | No `console.*` in mobile; no Sentry/crash reporter; only a non-sensitive LiveKit `Log.e` | §28 |
| Token in AsyncStorage | Token lives only in SecureStore; verified no AsyncStorage token write | §8/§10 |
| Deep link → immediate PHI disclosure (MOB-H11) | No inbound `raiyahplus://` links; backend re-authorizes; PHI would require the cache | §19 |
| `originWhitelist:['*']` navigation hijack | No attacker-controlled URL is ever loaded into the WebView | §20 |
| Debug signing enables silent update of the Play app | Play App Signing re-signs the distributed artifact; the config defect is real but replacement is not claimed | §6 |
| Certificate pinning absence as a finding | Platform TLS is sufficient for baseline; no specific high-risk requirement | §21 |
| Root detection absence as a finding | Not a security boundary; expected under rooted model | §27 |
| `releaseRealtimeSocket` is simply unused library code | It is exported and clearly intended for logout; its non-use **is** the defect (MOB-03) | §14 |
| Persisted query cache always contains PHI (MOB-H01 overstatement) | Verification showed the allowlisted keys' queries never execute today → empty shell; the onboarding draft is the real PII at rest | §9 |

---

## 43. Unknowns / Device & Infrastructure Verification

1. **Merged manifest + backup rules** (MOB-04): build an artifact and inspect the final `AndroidManifest.xml` and `res/xml/secure_store_*` to confirm AsyncStorage exclusion or absence.
2. **Google Maps key restrictions** (MOB-19): confirm package + SHA-1 API restrictions and quotas in Google Cloud.
3. **Deployed API origin / TLS**: confirm the release build points at an HTTPS origin (not the committed LAN HTTP URL).
4. **FileProvider path scope** (MOB-08): inspect the merged manifest's provider and `file_paths.xml` for over-broad roots.
5. **Runtime cross-user test** (MOB-02/03): requires an emulator + local backend to execute the A→logout→B sequence and the socket-liveness check.
6. **Play App Signing status** (MOB-05): confirm the production distribution uses Play App Signing (mitigates replacement, not the config defect).

---

## 44. Recommended Remediation Sequence

**P1 (release-blocking):**
1. **MOB-02** — Purge all client state on logout/account switch: `queryClient.clear()`, delete `RAIYAH_QUERY_CACHE_V1`, reset Zustand (auth/onboarding/shift), reset navigation. Scope query keys by user.
2. **MOB-05** — Remove `signingConfigs.debug` from `release`; sign via the controlled upload-key/EAS pipeline; verify fingerprints in CI.
3. **MOB-03** — Call `releaseRealtimeSocket()` in logout/account switch/token expiry; terminate server-side sockets on logout.

**P2:**
4. **MOB-01** — Stop persisting PHI (or encrypt minimum fields with a Keystore key) and purge on auth change.
5. **MOB-04** — `allowBackup="false"` or author+verify exclusion rules for AsyncStorage.
6. **MOB-06** — Add attestation + mock-location signals; decide server-side reject-vs-flag for out-of-radius.
7. **MOB-10** — Implement silent refresh + global 401 → purge/redirect.
8. **MOB-07 / MOB-08** — Screen-capture protection on PHI screens; delete temp media/documents after use and on auth change.

**P3:**
9. **MOB-09** — Revoke device token on logout/switch.
10. **MOB-11** — Untrack `.env`; provide `.env.example`; use HTTPS.
11. **MOB-12/13/14/15/16** — Layout auth guards; trim permissions; tighten WebView; enable R8; explicit telehealth teardown.

---

## 45. Top 10 Mobile Risks

1. **MOB-02** — Cross-user PHI on a shared device (cache not cleared). *(P1 blocker)*
2. **MOB-05** — Release signed with the public debug key. *(P1 blocker, RUNTIME-CONFIRMED)*
3. **MOB-03** — Realtime socket survives logout. *(P1 blocker)*
4. **MOB-01** — Plaintext PHI/PII in AsyncStorage, never purged.
5. **MOB-06** — GPS attendance spoofable and not server-enforced.
6. **MOB-04** — Android backup may include the AsyncStorage onboarding PII draft (and any live persisted cache).
7. **MOB-07** — Screenshots / recent-apps expose PHI.
8. **MOB-08** — Temp PHI media/documents persist and are shared externally.
9. **MOB-10** — No 401/refresh: stale data outlives authorization.
10. **MOB-09** — Stale push token (re-opens when push ships).

## 46. Top 10 Mobile Retests

1. A→logout→B offline: no A data on any screen (MOB-02).
2. `apksigner verify --print-certs` on release: non-debug cert (MOB-05).
3. Socket closed after logout; no A events to B (MOB-03).
4. AsyncStorage empty of PHI after logout/relaunch (MOB-01).
5. Backup/restore: no PHI (MOB-04).
6. Emulator + direct API check-ins: detected/rejected per policy (MOB-06).
7. Screenshot/recording/recent-apps on PHI screens: blocked (MOB-07).
8. Voice/invoice temp files removed after use + logout (MOB-08).
9. Short-TTL token: safe re-auth + cache purge on 401 (MOB-10).
10. A register → logout → B login: A token revoked, B bound correctly (MOB-09).

## 47. Answers to Required Questions

1. Release APK debug-signed? **Yes (configured).** 2. Release debuggable? **No.** 3. Minification? **No (disabled).** 4. Bundle recovery trivial & expose secrets? **Yes to recovery; no secrets exposed.** 5. Server secrets bundled? **No.** 6. `EXPO_PUBLIC_*` bundled? **API URL + Maps key.** 7. APK cleartext in release? **No (default-blocked).** 8. Debug cleartext? **Yes.** 9. Custom network security config? **No.** 10. Trusts user CAs? **Platform default (no app config).** 11. Pinning? **No.** 12. Pinning absence materially exploitable? **No (baseline).** 13. Token stored? **SecureStore.** 14. Token in AsyncStorage? **No.** 15. Token in logs? **No.** 16. Token in Sentry? **No (no Sentry).** 17. Token in WebView storage? **No.** 18. Token backed up? **Excluded (SecureStore rules, if generated).** 19. PHI in AsyncStorage? **Latent — the persisted query keys' queries never execute today (empty shell); becomes PHI if wired. PII (onboarding draft) is present now.** 20. PII in AsyncStorage? **Yes (onboarding draft).** 21. Onboarding persistence? **Draft with address/needs.** 22. Persisted data encrypted? **No (draft + any live cache are plaintext).** 23. Cleared on logout? **No.** 24. Memory cache cleared on logout? **No.** 25. Navigation cleared? **No.** 26. Socket disconnected on logout? **No.** 27. User B sees A data? **Yes (shared process/offline).** 28. B receives A realtime? **Yes until expiry.** 29. B receives A push? **No (no dispatch).** 30. Device token reassigned safely? **No — stale to A.** 31. Expiry forces safe reauth? **No (no 401 handler).** 32. Mobile refresh? **No.** 33. Sensitive ops after expiry? **Requests fail; cached data still shows.** 34. Offline after expiry? **Cached data readable.** 35. allowBackup includes AsyncStorage? **No (artifact-verified) — AsyncStorage is in the `database` domain, not included by the generated rules.** 36. Backup rules exclude SecureStore? **Yes (verified in built APK).** 37. Exclude PHI cache? **Yes by omission (`database` domain not included) — original finding withdrawn.** 38. adb extracts release data? **No (not debuggable) without root.** 39. Additional exposure with root? **Token + memory PHI + media.** 40. Screenshots allowed on PHI? **Yes.** 41. Recent-apps protected? **No.** 42. Screen recording captures PHI? **Yes.** 43. Clipboard sensitive? **No usage.** 44. SYSTEM_ALERT_WINDOW required? **No.** 45. Storage permissions necessary? **No.** 46. Unnecessary dangerous permissions? **Yes (3).** 47. Exported components? **MainActivity + (artifact-verified) CropImageActivity, FirebaseInstanceIdReceiver, SystemJobService, PreviewActivity (MOB-21); providers all non-exported.** 48. External Intent privileged behaviour? **No.** 49. `raiyahplus://` processes attacker params? **Routes; no privileged handler.** 50. Scheme collision impact? **Low (no token links).** 51. App Links verified? **No (custom scheme only).** 52. Deep link PHI pre-auth? **Only via cache (MOB-02).** 53. Deep link bypass role routing? **Layout unguarded; backend denies data.** 54. WebView inputs attacker-controlled? **No.** 55. WebView arbitrary origins? **originWhitelist `*` but no attacker URL.** 56. RN↔WebView bridge privileged? **No.** 57. LiveKit token leaks from WebView? **No.** 58. WebView unsafe file/universal access? **Not enabled.** 59. Proxy inspects release traffic? **No (TLS validated, no trust of user CAs).** 60. PHI over HTTP? **Release blocks; committed default is HTTP LAN (MOB-11).** 61. Extracted Maps key usable outside app? **Only if unrestricted (infra).** 62. Maps key package/signature restricted? **Unknown.** 63. GPS spoofable? **Yes.** 64. Mock status checked? **No.** 65. Server receives attestation? **No.** 66. Frida replaces GPS? **Yes.** 67. Repacked APK submits GPS? **Yes.** 68. Direct API bypasses geofence UX? **Yes.** 69. GPS attendance trustworthy? **No.** 70. Root detected? **No.** 71. Hooking detected? **No.** 72. Emulator detected? **No.** 73. Those protections necessary? **Not as boundaries; attestation useful for GPS.** 74. logcat PHI? **No.** 75. logcat tokens? **No.** 76. Release console logs? **None.** 77. Crash telemetry PHI? **None (no reporter).** 78. Crash telemetry tokens? **None.** 79. Notification body PHI? **In-app only; no push.** 80. Lock screen reveals PHI? **No (no push).** 81. Stale push tokens revoked? **No.** 82. Notification tap foreign object? **N/A (no dispatch).** 83. Camera stopped after telehealth? **On unmount.** 84. Mic stopped? **On unmount.** 85. Screen share stopped on leave? **Yes (`disconnect`).** 86. Media persists after logout? **No (unmount), but no explicit teardown.** 87. Voice recordings stored where? **`cacheDirectory`.** 88. Deleted? **No.** 89. Images to gallery? **No picker usage.** 90. Docs leave sandbox? **Yes (VIEW/share).** 91. Opened externally? **Yes.** 92. External apps retain files/URLs? **Possibly (files persist).** 93. OTA present? **No.** 94. OTA trust? **N/A.** 95. Runtime/channel separation? **N/A.** 96. LiveKit patch security-relevant? **No.** 97. Client role checks relied on as authz? **No (backend enforces).** 98. Payment/consent server-rechecked? **Yes.** 99. Caches keyed by user? **No.** 100. Phase-1F release blockers? **Yes — MOB-02, MOB-05, MOB-03.**

## 48. Conclusion

Treating the device and app as hostile, Riayah Plus's **security properties that hold** are enforced by the backend and the OS: authorization is re-checked server-side; the token is keystore-protected and never written to logs/AsyncStorage; release blocks cleartext; no server secret is bundled; no OTA channel exists. **What does not hold** is the local data lifecycle: plaintext PHI/PII persists in AsyncStorage, logout destroys almost none of the client state, the realtime socket outlives the session, the release build carries the public debug signing identity, and GPS attendance is client-asserted with no server enforcement. The shortest stolen-device path to PHI needs no app password — only filesystem or backup access to AsyncStorage.

**Phase 1F verdict:** **NOT READY FOR PRODUCTION**

**Release blockers:**
- **MOB-02** — Cross-user PHI on a shared device (logout does not clear caches; keys not user-scoped).
- **MOB-03** — Realtime socket survives logout.
- **MOB-05** — Release configured to sign with the public Android debug key (RUNTIME-CONFIRMED).

**Dynamic verification still required:**
- Build an artifact to verify the merged manifest, backup rules, and FileProvider scope (MOB-04/§43).
- Emulator + local backend for the A→logout→B cross-user and socket-liveness tests (MOB-02/03).
- Google Cloud inspection for Maps key restrictions (MOB-19).

**Phase 1 Security overall status:** Phases 0, 1A, 1C, 1D, 1E complete and delivered; Phase 1F complete. Cumulative release blockers span backend (Phase 1C/1D/1E) and mobile (this phase) and should be triaged together.

**Recommended next phase:** **Phase 2 — GDPR / PDPL Privacy & Data Protection Review.**

*Assessment and evidence gathering only. No remediation was performed. No application code, Expo/Android configuration, `.env`, schema, or dependency was modified; nothing was committed; no production system, account, or real patient data was used. Credential values are redacted; no patient data is included.*

---

## 49. Adversarial Verification Record (2026-09-12)

Per `/adversarial-verification`, each finding was re-attacked. Because **no APK was built**, no finding is labelled RUNTIME-CONFIRMED except the local keystore read, and every source-derived finding carries an explicit "why the issue remains" that survives the strongest available counter-argument.

### 49.1 Falsification results

| Finding | Falsification hypothesis tested | Result | Action |
|---|---|---|---|
| MOB-01 | "The persisted keys are never populated / data is not PHI" | **Partially falsified** — re-verification showed the persisted query keys' queries never execute (empty shell today), while the onboarding draft **is** actively written; persistence policy still defective | Kept Medium; overstatement corrected (§9/§40 MOB-01) |
| MOB-02 | "Logout clears the cache / keys are user-scoped / no cross-user path" | **Failed to falsify** — no clear path exists; keys lack `userId`; live in-memory cache is populated | Kept High/blocker |
| MOB-03 | "`releaseRealtimeSocket` is called somewhere / server kills sockets on logout" | **Failed to falsify** — no call site; server is handshake-only; ordinary logout is not a logout-all | Kept High/blocker |
| MOB-04 | "The generated rules exclude AsyncStorage / backup is impossible" | **Cannot confirm or deny without an artifact** — XMLs absent from tree; intended generation excludes SecureStore only | Kept LIKELY; queued |
| MOB-05 | "Release actually uses a production key / debug identity is irrelevant" | **Failed to falsify** — `release { signingConfig signingConfigs.debug }` + public debug keystore confirmed by `keytool` | Kept High; RUNTIME-CONFIRMED |
| MOB-06 | "The server rejects out-of-radius / accuracy is validated" | **Failed to falsify** — server flags but does not reject; accuracy not sent | Kept Medium |
| MOB-07 | "A protection exists somewhere" | **Failed to falsify** — no FLAG_SECURE/screen-capture | Kept Medium |
| MOB-08 | "Temp files are deleted after use" | **Failed to falsify** — no delete calls | Kept Medium |
| MOB-09 | "Logout revokes the token / push is implemented" | **Partially falsified** — no revoke, but **no server push dispatch**, so no live exposure | Downgraded to Low, flagged for push |
| MOB-10 | "There is a 401 handler / refresh flow" | **Failed to falsify** — interceptor is a no-op; no refresh | Kept Medium |
| MOB-11 | "`.env` is gitignored / values are secret" | **Failed to falsify** that it is tracked; **falsified** the "secret" framing (EXPO_PUBLIC is public) | Kept Low (dev-leak framing) |
| MOB-12 | "Deep link reaches PHI pre-auth" | **Falsified** — no inbound links, backend re-auth, PHI needs cache | Kept Low; standalone claim withdrawn |
| MOB-13 | "Those permissions are required by a feature" | **Failed to falsify** — no app usage; dev-client origin | Kept Low |
| MOB-14 | "WebView bridge is privileged / inputs attacker-controlled" | **Falsified** — non-privileged handler; token alphabet + env URL | Kept Low |
| MOB-16 | "Media persists after leave" | **Partially falsified** — disconnects on unmount | Kept Informational |
| MOB-18 | "Patch touches TLS/permissions/certs" | **Falsified** — FGS race fix + logging only | Kept Informational |
| *(withdrawn)* WebView `</script>` breakout | "Token/URL breaks out of inline script" | **Falsified** — JWT alphabet + env-only URL | Withdrawn (§42) |
| *(withdrawn)* Push PHI on lock screen | "Pushes leak PHI" | **Falsified** — no server push dispatch | Withdrawn (§42) |
| *(withdrawn)* Token in logs/Sentry | "Token/PHI logged" | **Falsified** — no console logging, no Sentry | Withdrawn (§42) |
| *(withdrawn)* Deep link → PHI | "Deep link discloses PHI pre-auth" | **Falsified** — no links; backend enforces | Withdrawn (§42) |
| *(withdrawn)* Debug signing ⇒ silent Play update | "Attacker updates the official app" | **Falsified** — Play App Signing re-signs | Withdrawn as stated (§6) |

### 49.2 Corrections applied

| # | Change | Finding |
|---|---|---|
| C-1F-01 | Added the reachability nuance: the persisted keys' consumer routes are currently unlinked/dormant, so the *policy* is the defect, not guaranteed populated data | MOB-01 |
| C-1F-02 | Grounded MOB-02 in the **live in-memory** cache and non-scoped keys rather than the dormant persisted subset | MOB-02 |
| C-1F-03 | Downgraded MOB-09 to Low because server push dispatch is not implemented; kept the token-lifecycle defect for when it ships | MOB-09 |
| C-1F-04 | Withdrew the standalone deep-link→PHI claim; kept the layout-guard hardening | MOB-12 |
| C-1F-05 | Withdrew the "secret" framing for `EXPO_PUBLIC_*`; retained the dev-config-leak framing | MOB-11 |
| C-1F-06 | Recorded all withdrawn suspicions with falsifying evidence | §42 |
| C-1F-07 | Marked every finding's status strictly (**1 RUNTIME / 15 STATIC / 4 LIKELY**); no source-derived finding labelled RUNTIME | §40/§49 |
| C-1F-08 | **Second-pass correction (post-delivery `/adversarial-verification`):** re-probing disproved the "consumer routes are dormant" wording — the persisted keys' queries **never execute at all** (`['care-plan']` is gated on a never-supplied `episodeId`; the `(staff)` group's layout always redirects). Rewrote §9/§8/MOB-01/§35/§37/§38/§47 to state the cache is an **empty shell today** and that the **onboarding draft** is the real PII at rest | MOB-01 |
| C-1F-09 | **Second-pass correction:** §28 claimed "no `console.*` in mobile source"; in fact `mobile/scripts/reset-project.js` contains 11 calls. They are **not bundled** (standalone npm script, absent from the `expo-router/entry` graph), so the finding stays withdrawn — but the wording was corrected | §28 |
| C-1F-10 | **Second-pass correction:** corrected the exec-summary "most sensitive data" and "shortest path" to lead with the onboarding draft + `cacheDirectory` media rather than a PHI query cache that holds nothing today | §1/§9 |

### 49.3 Reproduction evidence

**RUNTIME-CONFIRMED — committed debug keystore is the public AOSP debug identity (MOB-05):**
```
$ keytool -list -v -keystore debug.keystore -storepass android
Owner/Issuer: CN=Android Debug, OU=Android, O=Unknown ...
SHA1:   5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
SHA256: FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C
Alias: androiddebugkey   (password: android — public default)
```

**STATIC evidence anchors:**
```
mobile/android/app/build.gradle   release { signingConfig signingConfigs.debug }
mobile/android/gradle.properties  (no android.enableMinifyInReleaseBuilds → minify false)
mobile/android/app/src/main/AndroidManifest.xml  allowBackup="true"; fullBackupContent/dataExtractionRules → @xml/secure_store_* (absent from tree)
mobile/android/app/src/main/AndroidManifest.xml  SYSTEM_ALERT_WINDOW, READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE
mobile/lib/query/client.ts        key 'RAIYAH_QUERY_CACHE_V1'; PERSISTED_QUERY_KEYS = ['care-plan','sessions-me','tasks-me-pending']
mobile/stores/authStore.ts        logout(): SecureStore.delete + setApiAuthToken(null) + set({token:null,user:null}) ONLY
mobile/lib/realtime.ts            releaseRealtimeSocket() defined, never called
mobile/lib/api/client.ts          response interceptor: (err) => Promise.reject(err)   // no 401 handling
mobile/.env                       EXPO_PUBLIC_API_URL=http://192.168.18.127:5001 (tracked; .gitignore does not exclude .env)
server .../TelehealthController.ts sessionCheckin: lat/lng range only; GPSService.applySessionCheckin flags but does not reject out-of-radius
```

### 49.4 Verification verdict

| Area | Findings | Unfalsified | Narrowed/downgraded |
|---|---:|---:|---:|
| Storage / privacy | 4 (MOB-01, 04, 07, 08) | 3 | 1 (MOB-01) |
| Authentication / session | 4 (MOB-02, 03, 09, 10) | 3 | 1 (MOB-09) |
| Build / integrity | 3 (MOB-05, 15, 16) | 3 | 0 |
| Platform / network | 5 (MOB-06, 11, 12, 13, 14) | 4 | 1 (MOB-11) + 1 standalone withdrawn (MOB-12→§42) |
| Dependency / OTA / misc | 4 (MOB-17, 18, 19, 20) | 4 | 0 |
| **Finding subtotal** | **20** | **16** | **4** |
| **Withdrawn suspicions** | — | — | **11** |

**Verdict: PASS with corrections.** Sixteen of twenty findings survived falsification unchanged; three were narrowed (MOB-01 reachability, MOB-11 secret framing, MOB-12 standalone claim withdrawn) and one was downgraded (MOB-09). **Eleven suspicions were withdrawn** on evidence (WebView breakout, push-PHI, token-in-logs, token-in-AsyncStorage, deep-link→PHI, `originWhitelist` hijack, silent-Play-update, pinning-absence, root-detection-absence, `releaseRealtimeSocket` as inert library code, and the "persisted PHI always present" overstatement).

**Second pass (post-delivery `/adversarial-verification`, C-1F-08…10).** A re-run of the probes against the delivered report found and fixed **two factual errors** in it: (1) the persisted query cache was described as "dormant/unlinked" when in fact its queries **never execute at all** — the cache is an empty shell, and the onboarding draft is the real PII at rest; (2) §28 claimed "no `console.*` in mobile source" when `scripts/reset-project.js` contains 11 calls (dev-only, unbundled — finding still correctly withdrawn). The exec summary, §8/§9/§12/§28/§35/§37/§38/§42/§47 and MOB-01 were corrected accordingly. **The three release blockers were unaffected by either correction** and were independently re-confirmed (logout body unchanged; `release { signingConfig signingConfigs.debug }`; `releaseRealtimeSocket` still uncalled). The three release blockers rest on unambiguous configuration evidence — one of them (`MOB-05`) on a local runtime read — and none depends on an unbuilt artifact.
