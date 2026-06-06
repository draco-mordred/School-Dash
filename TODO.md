# TODO - School Dash (Sidebar/Layout)

- [X] Implement full 2-column shell layout in `frontend/src/components/layout/AppShell.tsx`:
  - [ ] Left sidebar: main (~14%) visible on wide screens
  - [ ] Left mini sidebar: icons-only visible on medium/smaller
  - [ ] Right column (~86%): sticky top nav, page title, bell -> /notifications, user dropdown
  - [ ] Right column main content + footer pinned bottom
- [ ] Add mini sidebar component (reuse existing nav data, icons-only)
- [ ] Create `frontend/src/pages/Notifications.tsx` with placeholder latest news
- [ ] Add compact footer matching spec (Avalon Industries + Private policy | Terms of use)
- [ ] Verify routes:
  - [ ] `/` and `/login` hide top nav + sidebars + footer
  - [ ] protected routes show layout
  - [ ] unknown routes show 404
- [ ] Run frontend checks (build/lint)

Okay, we're working on... Let's work properly now on the sidenav. 1. Let's ensure that the pages are split into: Left Side: Should contain the main Side bar (should be visible on all pages (except login and home) floating on the left side about 14% of the entire screen size and as tall as the screen height, Showing Buttons and Icons that link to The Other pages (only on fullscreen or wide screens), and a mini Sidebar (Which shows only Icons that link to the same Other pages as on the Main side bar (Only visible on medium and smaller screen sizes, e.g., mobile screens). Right Side: should float on the right, width about 86%, Shcould contain: The componenets of the Open pages, which include a Top Nav bar which is always visible on all pages (except for login and home), and should contain (A hamburger menu: that toggles that Sidebar open/close state, for both the Main and mini Side Bars; Page Title: on the Right side of the Hamburger menu Which displays the name of the current open page;; A Bell Icon: which redirects to Notifications page wherer latest news are shown - we'll need to create this page too; and A User Profile Icon: which is a dropdown that shows options for the currents logged in user (e.g., Logout, Edit Profile, Profile information, etc.,)); then The Main Page content like Dashboard page for Dashboard, and the like for the other pages. For pages that are unavailahble, we'll keep the 404 error page displayed for them, while we work on them. At the bottom of the page, we'll add a Footer section which shows copyright Avalon Industries (on the left side), Private policy | Terms of use (on the right side) Let's get to it. Let's continue from frontend/src/components/layout/AppSell.tsx fill we're working on previously.


Clinical Rotation: 
This should be created with the following fields provided:
- Rotation Name
- Rotation Description
- Rotation Type
- Rotation Start Date
- Rotation End Date
- Rotation Unit
- Rotation Supervisor
- Rotation Tutorials (an array of tutorials to be had in this rotation)
- Rotation Tutotial - personal (tutorial that is personal to the user)
- Rotation Status
- Patients clerked (an array of patients that the user has clerked in this rotation)
- Rotation Notes (Important actions)
- Rotation activities (number of weeks, number of consultant ward round, number of Clinics, number of Resident ward rounds, number of Call duty, number of Theatre days (if unit surgical))

The Clinical Rotation page should allow users to view, create, edit, and delete clinical rotations. The page should also allow users to filter and search through the rotations based on various criteria such as rotation type, rotation location, rotation supervisor, and rotation status. Additionally, the page should allow users to add notes to each rotation and view the notes when clicking on the rotation.

the clinical rotaion will have a schema object built for it, should look something like this:

```typescript
interface IClinicalRotation {
  id: string;
  rotationName: string;
  rotationDescription: string;
  rotationType: string;
  rotationStartDate: Date;
  rotationEndDate: Date;
  rotationUnit: string;
  rotationSupervisor: string;
  rotationStatus: string;
  rotationNotes: string;
  rotationActivities: {
    numberOfWeeks: number;
    numberOfConsultantWardRound: number;
    numberOfClinics: IClinicDays[];
    numberOfResidentWardRound: number;
    numberOfCallDuty: number;
    numberOfTheatreDays: number;
  };
  rotationTutorials: {
    // - list goes here
    []
  }
  rotationTutorialPersonal: string;
}
```

The page should also allow users to add notes to each rotation and view the notes when clicking on the rotation.

Log book entries:
The log book entries should be created with the fields based on the Clinical rotation: 
<!-- for example Medicine rotations are different within the units, and same for the surgical units -->
- Theatre (list of theatre days, with their props(id, week number, day/date, day number(if multiple days), attendance status for the student) based on day in the Clnical Rotation)
- Consultant Ward Rounds (list of Consultant Ward Round days, with their props(id, week number, day/date, day number(if multiple days), attendance status for the student)based on day in the Clinical Rotation)
- Resident Ward Rounds (list of Resident Ward Rounds days, with their props(id, week number, day/date, day number(if multiple days), attendance status for the student)based on day in the Clinical Rotation)
- Clinics (list of Clinic days, with their props(id, week number, day/date, day number(if multiple days), attendance status for the student) based on day in the Clinical Rotation)
- Call Duty (list of Call days, with their props(id, week number, day/date, day number(if multiple days), attendance status for the student) based on day in the Clinical Rotation)
- Other (based on day in the Clinical Rotation)
- Presentation/Tutorials (topics discussed/taught in the posting)
- Personal (any other notes)

The log book entries should also allow users to add notes to each rotation and view the notes when clicking on the rotation. The Logbook entries page should allow users to view, create, edit, and delete logbook entries. The page should also allow users to filter and search through the rotations based on various criteria such as rotation type, rotation location, rotation supervisor, and rotation status. Additionally, the page should allow users to add notes to each rotation and view the notes when clicking on the rotation.

Create schema object for Log book entries:
```typescript
interface ILogbookEntries {
  _id: mongoose.Types.ObjectId;
  studentId: studentId;
  rotation: Rotation;
  date: Date;
  attendanceStatus: AttendanceStatus;
  callDuty: CallDuty[];
  clinicDays: IClinicDays[];
  theatreDays: theaetreDays[];
  cwrDays: CWRDays[];
  rwrDays: RWRDays[];
  other: Other[];
  presentationTutorials: PresentationTutorials[];
  personal: Personal[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}


//let's biuld a schema for Clinicdays, Theatredays, CWRDays, RWRDays, CallDuty, presentationTutorials, Personal, Other

interface IClinicDays {
  _id: mongoose.Types.ObjectId;
  student?: mongoose.Types.ObjectId;
  numberOfDaysPerWeek: number;
  weekTotal: number;
  daysOfWeek: string[] //e.g., "Mondays", "Thursdays"
  attendace: IAttendance[];
}

interface ITheatreDays {
  _id: mongoose.Types.ObjectId;
  student?: mongoose.Types.ObjectId;
  numberOfDaysPerWeek: number;
  weekTotal: number;
  daysOfWeek: string[] //e.g., "Mondays", "Thursdays"
  attendace: IAttendance[];
}

```