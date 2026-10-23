# Internal System Codename Reference

This document is an internal reference for the backend monolith's hidden system codename architecture. These names are intended for maintainers and operations engineers, not as a public project announcement.

## Core System Alliance
The backend is organized around eight internal subsystems that coordinate clinical operations, academic attendance, evaluations, reporting, AI automation, security, configuration, and asynchronous orchestration.

### K.R.Y.S.T.A.
* **Full Codename**: Klinical Rotations Year-long Scheduler and Timeline & Attendance system
* **Domain**: Hospital & Clinical Operations
* **Responsibilities**:
  * Clinical rotations schedule generation and student/supervisor group assignments.
  * Department, unit, and posting allocations for medical student placements.
  * Clinical attendance tracking, record validation, and timeline statistics.
  * Practical logbooks, procedure logging, reflection entries, and supervisor reviews.

### L.A.T.I.F.A.H.
* **Full Codename**: Lecture Attendance Tracker & Instance Fetcher, Authorization Handler
* **Domain**: On-Campus Academic Operations
* **Responsibilities**:
  * Timetable and subject-to-class mapping.
  * Lecture attendance sessions, student attendance status authentication, and presence logging.
  * Staff clearance logic for teaching attendance and lecture instance validation.

### M.A.R.C.U.S.
* **Full Codename**: Marks, Assessments, Results, and Clinical-Academic Unified Scoring
* **Domain**: Evaluation Gateway
* **Responsibilities**:
  * Exam administration, assessment scheduling, and score compilation.
  * Grading workflows and standardized results publication.
  * Clinical-academic score aggregation and GPA-related calculations.

### I.A.N.
* **Full Codename**: Interface, Analytics, and Networks
* **Domain**: Reporting & Experience Aggregator
* **Responsibilities**:
  * Role-based portal experiences for students, staff, parents, and administrators.
  * Consolidated overview metrics and dashboard visualizations.
  * Interface orchestration across platform segments.

### M.O.R.D.R.E.D.
* **Full Codename**: Medical Operations & Rational Data Reasoning Engine Dispatcher
* **Domain**: Cognitive Intelligence Layer
* **Responsibilities**:
  * AI-assisted guidance and reasoning across the LMS.
  * Predictive trend detection, attendance optimization, and placement conflict inference.
  * Automated insight generation and intelligent workflow recommendations.

### V.A.L.
* **Full Codename**: Validator of Authentication & Access Levels
* **Domain**: Perimeter Security & Middleware
* **Responsibilities**:
  * Authentication, JWT processing, and access control.
  * Global middleware, CORS, body parsing, and request lifecycle protection.
  * RBAC enforcement across API routes.

### A.D.A.M.
* **Full Codename**: Administrative Data & Architecture Matrix
* **Domain**: Infrastructure Bedrock
* **Responsibilities**:
  * Institutional setup data and global configuration metadata.
  * Core tenant settings and system variables used throughout the monolith.

### T.I.N.A.S.H.A.
* **Full Codename**: Tracking, Incidents, Notifications, and Alerts Handler and Automation
* **Domain**: Asynchronous Nervous System
* **Responsibilities**:
  * Logging automation, incident tracking, and system alert workflows.
  * Notification dispatch, real-time alerting, and background orchestration.
  * Inngest event handling, workflow loops, and multi-step automation.
  * Reconcile each class's Academic Clock phase with configured KRYSTA posting and LATIFAH timetable schedules, and alert administrators/class teachers when required phase schedules are missing.

## Academic Clock Phase Synchronization

- The class Academic Clock is the source of truth for the active phase and its date boundaries.
- Administrators associate each phase with an existing KRYSTA rotation plan/posting, a LATIFAH timetable source, relevant class courses, and phase learning activities.
- KRYSTA continues to own posting data and LATIFAH continues to own timetable data; TINASHA reconciles phase changes and reports missing configuration.
- The student current-posting endpoint filters configured postings by the active clock phase. The reconciliation job checks schedules every minute and sends deduplicated in-app notifications to administrators and the class teacher when a timetable or required posting is unavailable.
- Phase learning activities are stored with the clock and exposed in the current clinical posting response. Assignment, research, and seminar submission workflows are not automatically created by this association.
- `GET /academic-clocks/class/:classId/active-phase` is the server-resolved phase read for page consumers; it returns the active phase and its boundaries rather than requiring each page to trust a persisted `clockPhase` value.
- The frontend `adminData` resource cache shares class, clock, course, timetable, rotation schedule/event, clinical attendance/session, hospital unit, academic year, department, exam, and visible-class reads across migrated pages. It scopes cached data by authenticated user and role and invalidates active resources after successful mutations. This currently serves Academic Year, Clinical Rotations, Courses, Timetable, Clinical Schedules, Rotation Schedules, Clinical Attendance, Departments/Units, Exams, and Study Materials. It is a client reuse layer, not a replacement for backend authorization or data ownership; remaining page-specific lists and user data still need migration.

## Notes

- This file is intentionally kept as an internal architecture reference.
- The main public README contains a high-level project description and operational instructions, while this document contains the hidden subsystem codename definitions.
