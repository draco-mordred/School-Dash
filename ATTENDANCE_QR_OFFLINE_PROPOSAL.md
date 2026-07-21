# In-Hospital Attendance QR Module Proposal

## Goal
Create an offline-friendly attendance flow for in-hospital clinical activities where:
- a student can generate a QR code when requesting attendance,
- a lecturer/supervisor can approve it by scanning the QR code,
- the approval captures the student’s matriculation number (idNumber), student user ObjectId, supervisor ObjectId, and timestamp,
- the record is linked to the current clinical activity/session and can later be synchronized when connectivity is restored.

## Why this fits the current app
The repository already has a clinical attendance foundation in:
- [backend/src/models/clinicalAttendance.ts](backend/src/models/clinicalAttendance.ts)
- [backend/src/controllers/clinicalAttendance.ts](backend/src/controllers/clinicalAttendance.ts)
- [frontend/src/pages/ClinicalCheckInOut.tsx](frontend/src/pages/ClinicalCheckInOut.tsx)
- [frontend/src/pages/ClinicalAttendance.tsx](frontend/src/pages/ClinicalAttendance.tsx)

This means the feature can be added as an extension of the existing clinical attendance flow rather than as a completely separate module.

---

## Proposed user flow

### 1) Student side
1. Student opens the clinical attendance screen.
2. The app loads the current active clinical session/activity.
3. The student taps “Generate QR Check-In”.
4. The app creates a signed request payload containing:
   - student user ObjectId,
   - student idNumber,
   - activity/session id,
   - supervisor ObjectId (if known),
   - timestamp,
   - a unique nonce/idempotency key.
5. The QR code is generated locally and displayed to the student.

### 2) Supervisor side
1. Supervisor opens the attendance scanner screen.
2. The supervisor scans the student’s QR code.
3. The app validates the payload locally and creates a pending attendance approval record.
4. If the device is online, the record is posted to the backend immediately.
5. If the device is offline, the record is stored locally and queued for sync.

### 3) Backend reconciliation
1. When the app regains connectivity, pending records are uploaded in order.
2. The backend verifies:
   - student exists,
   - activity/session exists,
   - supervisor is authorized for that activity,
   - the attendance request is still valid for the current session/time window.
3. If valid, the attendance record is saved permanently.
4. If duplicate or expired, the backend returns a safe status such as already-approved or expired.

---

## Recommended data model
A new attendance approval record should be stored in the backend with fields like:

```ts
interface AttendanceApprovalRecord {
  studentUserId: ObjectId;
  studentIdNumber: string;
  supervisorUserId: ObjectId;
  activityId: ObjectId;
  sessionId?: ObjectId;
  checkedAt: Date;
  source: "qr" | "manual";
  status: "pending" | "approved" | "rejected" | "synced" | "duplicate";
  deviceId?: string;
  clientTimestamp: Date;
  syncStatus: "local" | "queued" | "synced" | "failed";
  queueId?: string;
  idempotencyKey: string;
  notes?: string;
}
```

### Important cross-reference fields
The approval must be traceable by:
- student user ObjectId,
- student idNumber,
- supervisor ObjectId,
- activity/session id,
- timestamp.

This gives the system a reliable audit trail and prevents duplicate approvals.

---

## Offline-first implementation strategy

### A. Local-first storage
Use a client-side database such as IndexedDB via Dexie or localforage.

Recommended local queues:
- pendingQrApprovals
- generatedQrPayloads
- syncMetadata

Why this works:
- scans and approvals can still be captured with poor or no connectivity,
- data is preserved until network recovery,
- duplicates are prevented with idempotency keys.

### B. Sync queue and background sync
When the device is online:
- the app sends queued approvals to the backend,
- each record is marked as synced only after confirmation,
- failed uploads stay in the queue and are retried automatically.

### C. Idempotency and conflict handling
Use a stable key such as:

```text
studentUserId + activityId + clientTimestamp + supervisorUserId
```

or a generated UUID nonce.

This prevents double submissions when the same QR is scanned twice or sync retries occur.

### D. Expiry window
QR approvals should be valid only for a short period, for example:
- 5–15 minutes for a session-based attendance request,
- or until the session is marked completed.

This avoids stale approvals from being accepted later.

---

## Backend plan

### New endpoints
- POST /api/clinical-attendance/qr/generate
  - creates a QR payload for the current activity/session.
- POST /api/clinical-attendance/qr/approve
  - accepts a QR approval payload and saves it as pending or approved.
- POST /api/clinical-attendance/qr/sync
  - accepts a batch of queued approval records from the client.
- GET /api/clinical-attendance/qr/status/:id
  - allows checking whether an approval was accepted or rejected.

### Server-side validation
The backend should verify:
- the student belongs to the activity/session,
- the supervisor is allowed to approve for that activity,
- the request is still within the valid attendance window,
- the same approval has not already been processed.

---

## Frontend plan

### New UI surfaces
- Student screen: “Generate QR Check-In”
- Supervisor screen: “Scan QR Attendance”
- Pending sync state view for offline approvals
- Activity detail view showing approved attendance count and pending approvals

### Suggested libraries
- QR generation: qrcode.react or html5-qrcode
- Offline storage: Dexie or localforage
- Network detection: navigator.onLine + online/offline events
- Optional: service worker / PWA support for better offline experience

---

## Recommended implementation phases

### Phase 1 – Foundation
- Extend the clinical attendance schema to support QR-based approvals.
- Add backend endpoints for generating and approving QR-based attendance.
- Add basic UI for student QR generation and supervisor QR scanning.

### Phase 2 – Offline queue
- Add local storage for pending approvals.
- Add upload retry and sync status handling.
- Add duplicate prevention with idempotency keys.

### Phase 3 – Hardening
- Add session expiry and time-window validation.
- Add supervisor authorization checks.
- Add audit logs and admin visibility for pending/synced approvals.

### Phase 4 – UX polish
- Show offline/online state clearly.
- Show “queued”, “synced”, and “failed” states in the UI.
- Add notification banners for successful sync or failed retry.

---

## Suggested rollout approach
A low-risk rollout would be:
1. Introduce QR attendance for one activity type first, such as ward rounds.
2. Enable it only for supervisors and students already in the current clinical flow.
3. Keep manual attendance as a fallback.
4. Add offline sync only after the online path is stable.

This reduces risk and makes validation easier.

---

## Summary recommendation
The best approach is an offline-first, queue-based QR attendance module built on the existing clinical attendance system.

It should:
- capture student user ObjectId and idNumber,
- capture supervisor ObjectId and timestamp,
- tie the approval to a specific clinical activity/session,
- store records locally when offline,
- sync them automatically when connectivity returns,
- use idempotency to avoid duplicate approvals.

This gives a practical, production-ready path for poor-network environments while keeping the implementation aligned with the current codebase.

---

## Suggested review questions
1. Should this be scoped to clinical sessions only, or should it also support lecture-style attendance later?
2. Should QR approval be restricted to a short time window after session start?
3. Should the approval be visible to both student and supervisor immediately, even before sync completes?
4. Should duplicate approval handling be strict (reject duplicate) or soft (mark as already present)?
