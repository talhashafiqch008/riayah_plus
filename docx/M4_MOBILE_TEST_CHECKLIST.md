# M4 Mobile Test Checklist

**Branch:** `milestone-5` (local only — do not push until M5 is done)

**Password (all accounts):** `Password123!`

## Implementation status (code)


| Area                                                        | Status                   |
| ----------------------------------------------------------- | ------------------------ |
| API modules (conversations, invoices, telehealth, realtime) | Done                     |
| Family / clinical / coordinator Messages                    | Done                     |
| Family Billing (list, detail, PDF, Pay now)                 | Done                     |
| Family telehealth (pay-before-join, native LiveKit call UI) | Done                     |
| Clinical telehealth (lobby, admit, context, notes)          | Done                     |
| Nav links (More menus)                                      | Done                     |
| Keyboard-safe message composer                              | Done                     |
| Support Messages                                            | Intentional empty state  |
| Manual QA (A–C)                                             | Done                     |
| Family self-book (open slots, no clinician picker)          | Done (code) — QA pending |
| Assessments hidden from family                              | Done (code) — QA pending |
| Notification smoke (D18)                                    | Not verified yet         |


---



## Credentials (The General Hospital)


| Role        | Email                         | Device                              |
| ----------- | ----------------------------- | ----------------------------------- |
| Family      | `shahbaztayyab1386@gmail.com` | **Phone (native build)**            |
| Coordinator | `zzohaib953@gmail.com`        | **Browser**                         |
| Clinical    | `clinical-general@demo.com`   | **Browser** (other tab / incognito) |


Optional: org admin `shahbaztayyab1386@outlook.com` (browser only)

## Before you start

- [x] API running (`cd mern/server && npm run dev`)
- [x] Web running (`cd mern/client && npm run dev`)
- [x] Family signed in on phone; coordinator signed in on browser
- [x] `mobile/.env` API URL: `EXPO_PUBLIC_API_URL=http://192.168.18.127:5001`
- [x] Mobile uses a **native development build** (not Expo Go) for video

Native build / Metro:

```bash
cd mern/mobile
npx expo run:android
# later sessions:
npx expo start --dev-client
# USB backup if Wi-Fi Metro fails:
adb reverse tcp:8081 tcp:8081
```

**Note:** Open **Riayah Plus** from the app drawer (or scan the `--dev-client` QR). Do not use Expo Go for LiveKit video.

---



## A — Messages

- [x] **A3** Coordinator (web): Messages → start/open thread with family → send text
- [x] **A4** Family (phone): More → Messages → open thread → see message
- [x] **A5** Family (phone): reply with text
- [x] **A5b** Family (phone): tap input — keyboard must **not** cover the composer
- [x] **A6** Coordinator (web): see family reply (realtime or refresh)
- [x] **A7** Family (phone): send a small PDF or image attachment



## B — Billing

Telehealth invoices appear when the coordinator **books** the video session (not after complete). Quotations still appear on care-plan approval.

- [x] **B8** Family (phone): More → Billing → list loads (Invoices / Quotations tabs)
- [x] **B9** Open one document → totals / line items look right
- [x] **B10** Download PDF → share sheet / file opens
- [x] **B11** If status is Due / Overdue: Pay now (PayTabs checkout, or clear "not available" toast if keys missing)



## C — Video visit

- [x] **C12** Coordinator (web): book a **telehealth** session for this family, assign `clinical-general@demo.com`
- [x] **C12b** Family (phone): More → Billing → new invoice for that session appears (Due)
- [x] **C13** Family (phone): More → Video visits → session appears → Join → **blocked until paid**
- [x] **C13b** Family pays invoice → Join again → consent / waiting room
- [x] **C14** Consent if asked → accept → land in **waiting room**
- [x] **C15** Clinical (web): Telehealth → open session → family in lobby → **Admit**
- [x] **C16** Family (phone): leaves waiting room / admitted (joins video if LiveKit configured)
- [x] **C17** Clinical (web): context panel visible + save a session note



## D — Notifications

> **D18 is the in-app list** (More → Notifications), not phone OS push banners.  
> The “Expo Go doesn’t support expo-notifications” message is about **push tokens** (SDK 53+). It is harmless for this checklist — ignore it in Expo Go, or use the native Riayah Plus build where push registration is skipped/fails quietly without FCM.

**How to test D18**

1. As family on phone: **More → Notifications** (or the bell on Home).
2. Trigger events that create family notifications, then pull-to-refresh the list:
  - Coordinator books a telehealth session → look for **Invoice ready** / invoice generated
  - Family pays an invoice → look for **Payment received** (if wired)
  - Care-plan / quotation events → quotation-related items if present
3. Open an unread item → it should mark read / clear badge count on Home.

- [x] **D18** Family (phone): Notifications → items from booking / invoice / telehealth steps above



## E — Family self-book (open slots)

Family does **not** choose the clinician. Coordinator assigns (prior session or assessment). Family only picks an open time from the clinician’s availability. Assessments are **coordinator/clinical only** — hidden on family care journeys.

**Prep (coordinator, browser)**

1. Open the family’s care episode.
2. Ensure a clinician is assigned: schedule an assessment **or** book at least one session with `clinical-general@demo.com`.
3. Set that clinician’s weekly availability (Schedule / availability slots) so open times exist for the next few days.

**Family (phone)**

- [x] **E19** Care Journey → open episode → **no Assessments / Consultations section**; Sessions + **Book session** only
- [x] **E20** Appointments (or Book session) → assigned clinician shown **read-only** (no clinician picker)
- [x] **E21** Pick duration + date → open time slots appear (empty if no availability / no clinician)
- [x] **E22** Confirm slot → session booked → telehealth invoice created (Due) in Billing
- [x] **E23** Appointments / Home “next visit” show the new care **session** (not an assessment)
- [x] **E24** Pay invoice → Video visits → Join works (same pay-before-join as C13–C13b)

**Negative / edge**

- [x] **E25** Episode with **no** clinician assigned yet → book flow shows clear “no clinician assigned” message (no crash)
- [x] **E26** Coordinator (web): Care episode still shows **Assessments** section + can schedule assessments

Optional (web family): `/family/bookings` → Book session → same open-slot flow as E20–E22.

---



## Notes

- Video waiting room + admit work without LiveKit; live camera needs real `LIVEKIT_*` in `server/.env`.
- Telehealth invoices are created when the session is booked (not on complete). Family must pay before join.
- Family self-book uses the assigned clinician’s open slots only — coordinator must assign clinician + set availability first.
- Mobile video controls (camera, mic, chat, screen share) need a native build (`npx expo run:android`), not Expo Go.
- Pay now end-to-end needs PayTabs keys (+ ngrok for webhook paid status).
- **Push banners** (lock screen) need Expo projectId + FCM/APNs — out of scope for D18. D18 only needs the in-app Notifications screen.
- Support messaging stays a calm empty state on purpose (not primary M4 mobile shell).



## Pass / fail log


| Step    | Result | Notes                                                 |
| ------- | ------ | ----------------------------------------------------- |
| Prep    | Pass   | Native dev build + Metro                              |
| A3–A7   | Pass   | Messaging + attachments + realtime                    |
| B8–B11  | Pass   | Billing + PayTabs pay flow                            |
| C12–C17 | Pass   | Pay-before-join + native LiveKit (cam/mic/chat/share) |
| D18     |        |                                                       |
| E19–E26 |        | Family self-book + assessments hidden                 |


