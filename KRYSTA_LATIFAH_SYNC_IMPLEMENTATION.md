# KRYSTA-LATIFAH Sync Implementation

## Overview

This implementation provides **real-time synchronization** between **KRYSTA** (Clinical Attendance) and **LATIFAH** (Lecture Attendance) subsystems in MedLog LMS, with **proximity-based checkins** and **compliance validation** to ensure students attend lectures before clinical sessions.

## Key Features Implemented

### 1. Proximity Checkin System
**Purpose**: Enable location-based attendance marking for both lecture and clinical sessions

**Files Created**:
- `backend/src/models/proximityCheckin.ts` - Proximity checkin model with:
  - Multiple checkin methods: QR code, NFC, biometric, manual, GPS
  - GPS coordinates validation with configurable range (default: 100m)
  - Support for both lecture (LATIFAH) and clinical (KRYSTA) sessions
  - Offline queue support for network issues
  - Automatic cleanup via TTL index (7 days)

**Supported Checkin Types**:
- `lecture_hall` - For academic lecture attendance
- `clinical_ward` - For hospital/clinic checkins
- `lab` - For laboratory sessions
- `classroom` - For general classroom checkins
- `other` - For miscellaneous locations

### 2. Compliance Rule Engine
**Purpose**: Define and enforce attendance policies between KRYSTA and LATIFAH

**Files Created**:
- `backend/src/models/complianceRule.ts` - Rule definition model with:
  - 5 rule types: `lecture_before_clinical`, `minimum_lecture_attendance`, `clinical_attendance_required`, `sequential_attendance`, `time_window_validation`
  - Configurable conditions (minimum attendance %, time windows, etc.)
  - Flexible actions (notifications, blocking, auto-marking)
  - Class-specific or global application

- `backend/src/models/complianceLog.ts` - Violation tracking with:
  - 5 violation types matching rule types
  - Resolution workflow (open → acknowledged → resolved → escalated → waived)
  - Action tracking (who was notified, what was done)
  - Offline status tracking

### 3. Sync Service (TINASHA Subsystem)
**Purpose**: Core synchronization logic between KRYSTA and LATIFAH

**File Created**:
- `backend/src/subs/tinasha/krystaLatifahSync.ts` - Main sync service with:
  
**Key Functions**:
- `processProximityCheckin()` - Process checkins with proximity validation
- `validateProximity()` - GPS-based location validation (Haversine formula)
- `validateCompliance()` - Validate lecture-before-clinical and other rules
- `syncAllClasses()` - Periodic sync for all classes (every 5 minutes)
- `getUnifiedAttendanceReport()` - Combined KRYSTA + LATIFAH report
- `getClassComplianceSummary()` - Class-level compliance analytics

**Configuration**:
```typescript
const SYNC_CONFIG = {
  MAX_HOURS_AFTER_LECTURE: 4,     // Clinical must start within 4 hours after lecture
  MIN_LECTURE_ATTENDANCE_PERCENTAGE: 80,  // Minimum 80% lecture attendance
  PROXIMITY_RANGE_METERS: 100,      // 100m from target location
  OFFLINE_RETRY_INTERVAL_MS: 60000, // 1 minute between retries
  MAX_SYNC_RETRIES: 3,              // Max retry attempts
};
```

### 4. Controllers & API Endpoints

#### Proximity Checkin Controller (`backend/src/controllers/proximityCheckin.ts`)

**Endpoints**:
- `POST /api/proximity/` - Create proximity checkin
- `POST /api/proximity/qr` - Create checkin with QR code
- `POST /api/proximity/validate` - Validate checkin proximity
- `GET /api/proximity/history` - Get student's checkin history
- `GET /api/proximity/today/:classId` - Get today's checkins for a class
- `POST /api/proximity/manual-mark` - Manual attendance marking (for network issues)

**Features**:
- QR code support for fast checkins
- GPS-based validation
- Session validation (lecture/clinicial)
- Time window validation
- Manual override capability

#### Compliance Controller (`backend/src/controllers/compliance.ts`)

**Endpoints**:
- `POST /api/compliance/rules` - Create compliance rule (admin)
- `GET /api/compliance/rules` - Get all compliance rules
- `GET /api/compliance/rules/:id` - Get single rule
- `PATCH /api/compliance/rules/:id` - Update rule (admin)
- `DELETE /api/compliance/rules/:id` - Delete rule (admin)
- `POST /api/compliance/check` - Trigger compliance check
- `GET /api/compliance/violations` - Get student violations
- `PATCH /api/compliance/violations/:id` - Resolve violation
- `POST /api/compliance/violations/:id/escalate` - Escalate violation
- `GET /api/compliance/summary/:classId` - Get class compliance summary
- `GET /api/compliance/report` - Get unified attendance report
- `GET /api/compliance/dashboard` - Get compliance dashboard

### 5. Routes

**Files Created**:
- `backend/src/routes/proximityCheckin.ts` - Proximity checkin routes
- `backend/src/routes/compliance.ts` - Compliance routes

**Updated**:
- `backend/src/server.ts` - Added new route imports and mounting

### 6. Inngest Workflows (Offline Support)

**Functions Added** (`backend/src/inngest/functions.ts`):

1. **`processOfflineProximityCheckin`**
   - Trigger: `krysta-latifah/checkin.offline`
   - Processes checkins queued during network outages

2. **`processOfflineComplianceCheck`**
   - Trigger: `krysta-latifah/compliance.offline`
   - Processes compliance checks queued offline

3. **`scheduledKrystaLatifahSync`**
   - Trigger: Every hour (cron: `0 * * * *`)
   - Runs full sync across all classes

4. **`processPendingCheckins`**
   - Trigger: Every 5 minutes (cron: `*/5 * * * *`)
   - Processes pending checkins from offline queue

5. **`notifyOfflineStatus`**
   - Trigger: Every 2 hours (cron: `0 */2 * * *`)
   - Notifies admins if checkins are pending > 2 hours

## How It Works

### Normal Flow (Online)

```
1. Student arrives at lecture/clinicial location
2. Student checks in via QR code, GPS, or manual method
3. System validates proximity (if GPS provided)
4. System creates ProximityCheckin record with status="verified"
5. System updates corresponding Attendance/ClinicalAttendance record
6. System triggers compliance validation
7. If violation found, logs to ComplianceLog and notifies stakeholders
8. Returns success to student
```

### Network Issue Flow (Offline)

```
1. Student attempts checkin but network is down
2. Checkin added to offline queue in memory
3. System tries to process queue every minute (configurable)
4. After network restored, queue items are processed automatically
5. If still failing after 3 retries, checkin marked as syncStatus="failed"
6. Inngest scheduled jobs (every 5 min) pick up pending checkins
7. Admins notified if checkins remain pending > 2 hours
```

### Compliance Validation Flow

```
1. Compliance check triggered (manual or scheduled)
2. System retrieves all active compliance rules for the class
3. For each rule type:
   - lecture_before_clinical: Verifies lecture attendance before clinical
   - minimum_lecture_attendance: Checks if student meets minimum %
   - time_window_validation: Ensures clinical within hours after lecture
4. Violations logged to ComplianceLog
5. Notifications sent based on rule configuration
6. Violations appear in student/teacher/admin dashboards
```

## Compliance Rules Explained

### 1. Lecture Before Clinical (`lecture_before_clinical`)
**Purpose**: Ensure students attend morning lectures before clinical sessions

**Conditions**:
- `requiredLectureStatus`: Which lecture statuses are acceptable
- `maxLectureAbsencesAllowed`: Maximum allowed lecture absences

**Validation**:
- Checks if student has lecture attendance recorded
- Lecture must have ended at least 30 minutes before clinical starts
- Clinical session is blocked if rule violated (configurable)

### 2. Minimum Lecture Attendance (`minimum_lecture_attendance`)
**Purpose**: Require minimum lecture attendance percentage

**Conditions**:
- `minimumAttendancePercentage`: e.g., 80 for 80%
- `minimumAttendanceCount`: e.g., 5 lectures minimum

**Validation**:
- Calculates attendance rate for current academic year
- Flags student if below threshold
- Can auto-mark clinical attendance as absent (configurable)

### 3. Time Window Validation (`time_window_validation`)
**Purpose**: Ensure clinical sessions start within acceptable time after lectures

**Conditions**:
- `maxHoursAfterLecture`: Maximum hours allowed (default: 4)

**Validation**:
- Checks time difference between last lecture and clinical session
- Flags if clinical starts too long after lecture

## API Usage Examples

### Create a Proximity Checkin

```bash
POST /api/proximity/
Content-Type: application/json
Authorization: Bearer <student_token>

{
  "locationType": "lecture_hall",
  "locationName": "Medicine Lecture Hall A",
  "gpsCoordinates": {
    "latitude": 6.5244,
    "longitude": 3.3792,
    "accuracy": 10
  },
  "checkinMethod": "gps",
  "lectureSessionId": "60d5ec9f8b3e4b001f8e4a11"
}
```

### Check Compliance for a Student

```bash
POST /api/compliance/check
Content-Type: application/json
Authorization: Bearer <token>

{
  "studentId": "60d5ec9f8b3e4b001f8e4a01",
  "classId": "60d5ec9f8b3e4b001f8e4a02",
  "academicYear": "60d5ec9f8b3e4b001f8e4a03"
}
```

### Get Unified Attendance Report

```bash
GET /api/compliance/report?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer <token>
```

### Get Class Compliance Summary

```bash
GET /api/compliance/summary/60d5ec9f8b3e4b001f8e4a02
Authorization: Bearer <teacher_or_admin_token>
```

### Manual Attendance Marking (Network Issues)

```bash
POST /api/proximity/manual-mark
Content-Type: application/json
Authorization: Bearer <teacher_token>

{
  "sessionId": "60d5ec9f8b3e4b001f8e4a11",
  "sessionType": "clinical",
  "studentId": "60d5ec9f8b3e4b001f8e4a01",
  "reason": "Network was down, student was present"
}
```

## Configuration

### Environment Variables
No new environment variables required. Uses existing:
- `MONGODB_URI` - MongoDB connection
- `JWT_SECRET` - JWT signing
- `INNGEST_EVENT_KEY` - Inngest for async workflows

### Customization

Modify `SYNC_CONFIG` in `backend/src/subs/tinasha/krystaLatifahSync.ts`:

```typescript
const SYNC_CONFIG = {
  MAX_HOURS_AFTER_LECTURE: 4,     // Adjust based on your schedule
  MIN_LECTURE_ATTENDANCE_PERCENTAGE: 80,  // Adjust minimum requirement
  PROXIMITY_RANGE_METERS: 100,      // Adjust GPS validation range
  OFFLINE_RETRY_INTERVAL_MS: 60000, // Adjust retry frequency
  MAX_SYNC_RETRIES: 3,              // Adjust max retry attempts
};
```

## Deployment Notes

### 1. Database Models
All new models are automatically registered when the server starts:
- ProximityCheckin
- ComplianceRule
- ComplianceLog

### 2. Routes
New routes are mounted under `/api/`:
- `/api/proximity/*` - Proximity checkin endpoints
- `/api/compliance/*` - Compliance management endpoints

### 3. Inngest Functions
New Inngest functions are automatically registered with the Inngest server.

### 4. Testing

**Manual Testing**:
1. Start the backend server
2. Use Postman or curl to test the new endpoints
3. Verify checkins are created and compliance checks run

**Automated Testing**:
- Create test scripts for each endpoint
- Test offline scenarios by disconnecting network
- Verify retry and recovery behavior

## Integration with Existing Systems

### KRYSTA (Clinical Attendance)
- Clinical sessions automatically link to proximity checkins via `clinicalSessionId`
- Clinical attendance updated when checkin is processed
- Compliance validation runs automatically for clinical sessions

### LATIFAH (Lecture Attendance)
- Lecture sessions automatically link to proximity checkins via `lectureSessionId`
- Lecture attendance updated when checkin is processed
- Compliance validation ensures lectures are attended before clinicals

### TINASHA (Notifications)
- Compliance violations trigger notifications via existing notification system
- Admins notified of prolonged offline status
- Students notified of their own compliance issues

### IAN (Reporting)
- Unified attendance reports combine KRYSTA and LATIFAH data
- Compliance dashboards show violations across both systems
- Exportable data for analytics

## Network Issues Handling

The system is designed to handle network problems gracefully:

1. **In-Memory Queue**: Checkins are queued in memory if network fails
2. **Automatic Retries**: Queue is processed every minute with up to 3 retries
3. **Inngest Fallback**: Scheduled Inngest jobs process pending items every 5 minutes
4. **Admin Notifications**: Admins are notified if items remain pending > 2 hours
5. **Manual Override**: Teachers/admins can manually mark attendance via `/api/proximity/manual-mark`

### Recovery Process

```
1. Network goes down
2. Student attempts checkin → added to offline queue
3. Retry every 1 minute (up to 3 times)
4. Network comes back
5. Queue processed automatically
6. If still failing, Inngest picks up every 5 minutes
7. If pending > 2 hours, admin notified
8. Admin can manually mark attendance if needed
```

## Security Considerations

- All endpoints require authentication via JWT
- Role-based access control enforced
- Students can only access their own data
- Teachers can only access their classes' data
- Admins have full access
- GPS coordinates stored but can be disabled if privacy concerns

## Performance Considerations

- Indexes created for all common query patterns
- TTL indexes for automatic cleanup of old data
- Pagination on all list endpoints
- Scheduled jobs run at off-peak times
- Compliance checks are batched by class

## Future Enhancements

1. **Biometric Integration**: Add fingerprint/face recognition support
2. **NFC Tags**: Support NFC-based checkins for classrooms
3. **Geofencing**: Advanced location validation with polygon boundaries
4. **AI Anomaly Detection**: Detect suspicious checkin patterns
5. **Parent Notifications**: Notify parents of student compliance issues
6. **Automated Reporting**: Generate and email compliance reports
7. **Mobile App Integration**: Native mobile app for checkins
8. **QR Code Generation**: Auto-generate QR codes for sessions

## File Structure

```
backend/src/
├── models/
│   ├── proximityCheckin.ts        # Proximity checkin model
│   ├── complianceRule.ts          # Compliance rule model
│   └── complianceLog.ts           # Compliance violation log model
│
├── subs/
│   └── tinasha/
│       ├── index.ts               # Updated to export sync service
│       ├── notificationService.ts # Existing
│       └── krystaLatifahSync.ts    # Main sync service
│
├── controllers/
│   ├── proximityCheckin.ts        # Proximity checkin controller
│   └── compliance.ts              # Compliance controller
│
├── routes/
│   ├── proximityCheckin.ts        # Proximity checkin routes
│   └── compliance.ts              # Compliance routes
│
├── inngest/
│   └── functions.ts               # Updated with offline sync functions
│
└── server.ts                      # Updated with new routes and models
```

## Support

For issues or questions:
1. Check server logs for errors
2. Verify database connection
3. Ensure Inngest is properly configured
4. Test with small datasets first
5. Review compliance rule configurations

## Version

1.0.0 - Initial Implementation
