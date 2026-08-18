# Riayah Plus — Mobile App Progress

**Project:** Riayah Plus HealthOS  
**Date:** 14 August 2026

This note records **what is in the mobile app now** and **what will be added after Milestone 4**. It is a progress snapshot, not a close-out.

Mobile follows the same structure and language as the live web portals.

---

## Approach

- Layout and wording match the web experience for each role.
- Only features that already work on the web and backend are on mobile. Nothing is invented for the app alone.
- Each role has a small set of main tabs, with extra items and sign-out under **More**.
- Long lists (for example choosing a clinician or coordinator) use a searchable picker.
- Error messages show what actually went wrong (including form validation, timeouts, and no connection), not a generic failure.

---

## What we have done

### Shared

- Sign-in with saved session, optional biometrics after the first login, and a consistent look (teal and stone).
- Profile and notifications available from each role.
- Clear error messages on actions (save, complete, invite, and similar).

### Family

- Care request, aligned with the web family flow.
- Home with live counts, suggested next steps, and shortcuts.
- Care unit (people in the household), care journey, appointments, and care plans (approve, request changes, or reject).
- **More:** profile, notifications, documents (short message for now), messages (short message for now), sign out.
- Document upload still works from the care request and care unit, as on the web.

### Organization

- Tabs: Home · Pending · Families · Coordinators · More.
- Live home counts.
- Assign a coordinator to pending requests and to families (searchable picker).
- Invite and activate coordinators and staff (Staff is under More).

### Coordinator

- Tabs: Home · Intake · Episodes · Plans · More.
- Live counts: pending intake, active journeys, plans waiting for review.
- Intake list and detail (approve or reject).
- Care journeys: list, family-facing milestones, status updates, book a consultation (clinician picker).
- Care plans: list, build, AI draft where the web already offers it, submit with notes.
- Schedule (availability and booking) and patients (care units) under More.

### Clinical

- Tabs: Home · Schedule · Patients · Notes · More.
- Home counts: today’s scheduled assessments, assigned patients, notes due.
- Schedule is the assessment list — complete with findings and recommendations or a report link.
- Patients are care journeys in the organization (read-only view, with a link to session notes).
- Session notes: choose a journey, add a note (cannot be edited after save; optional private).
- More: review care plans and optional clinical co-sign, messages (short message for now), profile, notifications, sign out.

### Support worker

- Tabs: Home · Shifts · Tasks · More.
- Home counts: shifts this week, open tasks. Notes pending stays at zero until shift notes exist.
- Shifts: start and end the current shift, plus history.
- Tasks: see assigned work; complete with notes or an evidence link (plain notes are accepted as notes, not as a required web address).
- More: shift notes (short message for now), messages (short message for now), profile, notifications, sign out.

### Platform admin

- Side menu with dashboard, users, families, organizations (including clinics and departments), providers, staff, bookings, and audit.
- Larger admin tools that exist on web are listed on mobile in a simpler form for now.

### Who lands where

- Family, organization admin, coordinator, clinical staff, support worker, and platform admin each open their own area of the app after sign-in.

---

## Held until Milestone 4

Milestone 4 covers **video visits, billing and payments, and messaging**. Those will be added on mobile once they are in place on web and the backend. The app already has space for them so they can be connected without building a separate product.

| Area | On mobile today | After Milestone 4 |
|------|-----------------|-------------------|
| **Secure messaging** | A short “coming later” message for Family, Clinical, Support, and Coordinator. | Real conversations linked to a care journey, live updates, attachments, and read receipts — same as web. |
| **Video visits** | Not joinable yet. | Waiting room, join the call, camera and mic controls, notes during or after the visit. |
| **Invoices and quotations** | Not built on mobile yet. | Quotation after a care plan is approved, invoice status, PDF, and pay from the family app. |
| **Payments** | Not on the family app. Admin can see a simple payouts list. | Chosen Qatari gateway, family checkout, and payment status (received, failed, overdue). |
| **Related alerts** | A general notifications list. | Reminders for appointments and video visits, invoice created, and payment received / failed / overdue — once those alerts exist on the server. |

These are parked until Milestone 4 is ready on web, so mobile can follow the same flows.
