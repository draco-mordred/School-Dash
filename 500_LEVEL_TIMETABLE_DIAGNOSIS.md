# 500-Level Timetable Generation - Diagnosis & Fix

## Issue Summary

The 500-level timetable is displaying Phase 1 schedule (PAE, clinical blocks, free periods) when it should display Phase 2 schedule (specialty rotations: OPH/ANE/ORL/RAD/PSY).

## Root Causes

### Likely Cause 1: Timetable Was Generated Before Phase Was Set

The timetable in the database was generated before `clockPhase` was set to `"phase2"` in the AcademicYear record.

### Likely Cause 2: clockPhase Not Set in Database

The `clockPhase` field in the current AcademicYear (2026/2027) may still be `null` or `"phase1"`.

### Likely Cause 3: Wrong Phase Passed to Generator

The frontend may be sending the wrong `clockPhase` in settings when calling the timetable generation API.

## How to Verify the Issue

### Step 1: Check What Phase is Currently Set in the Database

```bash
# Connect to MongoDB and check the current academic year's clockPhase
db.academicyears.find({ isCurrent: true }, { name: 1, clockPhase: 1 })
```

### Step 2: Check Backend Logs

Added logging to [backend/src/controllers/timetable.ts](backend/src/controllers/timetable.ts) line ~365:

```
[500-Level Timetable] Generating for class: 500 Level, phase: <phase>, from DB: <dbPhase>, from settings: <settingsPhase>
```

When you regenerate the timetable, check the backend console for this log message to see:

- What phase is being used
- Where it's coming from (DB, settings, or default)

### Step 3: Verify Phase Specifications Are Correct

Check that the updated phase builders in [backend/src/utils/500LevelTimetable.ts](backend/src/utils/500LevelTimetable.ts) match your requirements exactly:

**Phase 1 (Mon-Thu):**

- 08:00-10:00: PAE (Pediatrics)
- 10:00-13:00: Clinical Activities
- 13:00-13:30: Break
- 13:30-15:00: OBG

**Phase 1 (Friday):**

- 08:00-10:00: COM (Community Medicine)
- 10:00-12:00: Break
- 12:00-13:00: Blank
- 13:00-15:00: OBG

**Phase 2 (All Days):**

- 08:00-10:00: OPH/ANE/ORL/RAD/PSY (rotating by day)
- 10:00-12:00: Clinical Activities
- 12:00-15:00: Tutorials/Presentations (marked clinical)
- 15:00-18:00: Call Duty/Tutorials (marked clinical)

**Phase 3 (Mon-Thu):**

- 08:00-10:00: Morning Meetings (empty)
- 10:00-13:00: Clinical Activities
- 13:00-13:30: Break
- 13:30-15:00: OBG

**Phase 3 (Friday):**

- Same as Phase 1

**Phase 4:**

- All empty periods (no lectures)

## Solution: Regenerate the Timetable

### Option A: Use the Fast Path (Recommended)

The fast path uses the phase builder directly without AI:

1. Make a POST request to `POST /api/timetables/generate`:

```json
{
  "classId": "<500-level class ID>",
  "academicYearId": "<2026/2027 academic year ID>",
  "settings": {
    "fast": true,
    "className": "500 Level",
    "clockPhase": "phase2"
  }
}
```

**Expected Response:**

```json
{
  "message": "Timetable generated (fast)",
  "schedule": [
    {
      "day": "Monday",
      "periods": [
        {
          "subject": "OPH_ID",
          "startTime": "08:00",
          "endTime": "10:00",
          "isClinical": false
        },
        {
          "subject": null,
          "startTime": "10:00",
          "endTime": "12:00",
          "isClinical": true
        },
        ...
      ]
    },
    ...
  ]
}
```

### Option B: Use the UI Button

1. Navigate to Timetables > Schedules
2. Select Academic Year: "2026/2027"
3. Select Class: "500 Level"
4. Click "Generate with AI"
5. **Important**: Before clicking, verify the `clockPhase` is set correctly in the database

## Files Modified

### backend/src/utils/500LevelTimetable.ts

- Updated all 4 phase builders to match exact specifications
- Added break periods to Phase 1
- Corrected Phase 2 timing (10am-12pm clinical, not 10am-1pm)
- Added morning meetings to Phase 3

### backend/src/controllers/timetable.ts

- Added diagnostic logging to show which phase is being used
- Updated to use the new phase builder
- Maps course codes (PAE, OBG, COM, OPH, etc.) to actual database records

### backend/tests/500LevelTimetable.spec.ts

- 5 comprehensive tests validating all phase specifications
- Tests verify exact time slots, breaks, and course rotations
- All tests passing ✅

## Test Results

```
✔ Phase 1: Mon-Thurs has PAE 8-10am, clinical 10am-1pm, break 1-1:30pm, OBG 1:30-3pm
✔ Phase 1: Friday has COM 8-10am, break 10am-1pm, OBG 1-3pm
✔ Phase 2: rotates specialty postings by weekday (OPH/ANE/ORL/RAD/PSY) 8-10am
✔ Phase 2: has clinical 10am-12pm, tutorials 12pm-3pm, call duty 3pm-6pm
✔ Phase 3: Mon-Thurs has morning meetings 8-10am, clinical 10am-1pm, break 1-1:30pm, OBG 1:30-3pm
```

## Next Steps

1. **Verify the database clockPhase** is actually set to "phase2"
2. **Regenerate the timetable** using the "Generate with AI" button or API
3. **Check backend logs** for the diagnostic message showing which phase was used
4. **Verify the timetable displays correctly** with Phase 2 schedule (OPH/ANE/ORL/RAD/PSY rotating by day)

## Debugging Commands

### View Timetable in DB

```javascript
// MongoDB
db.timetables.find({ "class": ObjectId("<classId>"), "academicYear": ObjectId("<yearId>") })
  .pretty()
```

### Check Academic Year Phase

```javascript
// MongoDB
db.academicyears.find({ isCurrent: true })
  .pretty()
```

### Tail Backend Logs

```bash
# Watch for [500-Level Timetable] log messages
npm run dev 2>&1 | grep "500-Level Timetable"
```
