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

FROM HERE ABOVE, TASKS ARE COMPLETE! DON NOT PERFORM THEM ANYMORE!


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

1 UJ/2013/MD/0149 RINJI TANIMU GOTAN 
2 UJ/2015/MD/0091 IJOKO SUNDAY OORI 
3 UJ/2015/MD/0126 ZAKKA LUMI 
4 UJ/2015/MD/0226 CHUNGYANG DACHUNG ISHAKU 
5 UJ/2015/MD/0238 LOHPON PONNAN NIMKUR 
6 UJ/2016/MD/0034 BELLO HARUNA DABO 
7 UJ/2016/MD/0092 ISMAILA FARUK 
8 UJ/2016/MD/0182 PANYIL MITONG DAKWOM 
9 UJ/2016/MD/0205 EGGA JOEL AMOS 
10 UJ/2016/MD/0213 GIDEON DANJUMA 
11 UJ/2016/MD/0228 DANIANG JOSEPH NAANYONG 
12 UJ/2016/MD/0230 RAYMOND JONAH JACOB 
13 UJ/2016/MD/0263 DAKOGOL FRANKLIN 
14 UJ/2016/MD/0268 YILYOK JOSEPH NAANGOE’AN 
15 UJ/2016/MD/0272 WUSHANGKA PEACE NENKIMUN 
16 UJ/2017/MD/0001 OLAJE BONIFACE IDU 
17 UJ/2017/MD/0007 DANLADI JOY ASABA-SHAAMU 
18 UJ/2017/MD/0043 DASHAP NANDAN GIDEON 
19 UJ/2017/MD/0051 ONOJA GRACIELLE ELEOJO 
20 UJ/2017/MD/0123 WULAPBA FAVOUR PINZUMMWA 
21 UJ/2017/MD/0132 ABDULRAZAK IBRAHIM 
22 UJ/2017/MD/0179 ADENIKEN DAVID OLUWATOSIN 

23 UJ/2017/MD/0238 ANYUABAGA HARRY DANIEL 
24 UJ/2017/MD/0303 JOEL MALGWI DAVID 
25 UJ/2017/MD/0323 GOEWAM JOSEPH MANAANAH 
26 UJ/2017/MD/0330 DANIANG GOEWAM SABASTINE 
27 UJ/2017/MD/0368 TABOET NAANSHANGAN MOSES 
28 UJ/2017/MD/0399 ENIOLOMINDA OLUFEMI DAYO 
29 UJ/2017/MD/0427 LAAH NICHOLAS BAYO 
30 UJ/2017/MD/0492 ABOJE JAMES OCHE 
31 UJ/2017/MD/0600 ASIEBA JOSHUA JAMES 
32 UJ/2017/MD/0641 DUNG KELVIN JEREMIAH 
33 UJ/2017/MD/0669 MUHAMMAD AMINU KASSIM 
34 UJ/2017/MD/0730 ZAILANI ABDULLAHI YAHAYA 
35 UJ/2018/CS/0001 NWALI DESTINY CHIKA 
36 UJ/2018/CS/0006 WILLIAMS KACHIRA NYIOR 
37 UJ/2018/CS/0018 OKYAUWA CONSTANCE ONYAWOLE 
38 UJ/2018/CS/0021 GYANG BYONG BULUS 
39 UJ/2018/CS/0038 TUKURA LIYATU YAMMA 
40 UJ/2018/CS/0045 DAJIN NAANTAGAM AMOS 
41 UJ/2018/CS/0058 DADEON PATIENCE 
42 UJ/2018/CS/0059 ALIYU TAFIDA RAMATU 
43 UJ/2018/CS/0066 KWATMEN ABBA PESA’AN 
44 UJ/2018/CS/0067 GYARA SINKUUL HABILA 
45 UJ/2018/CS/0068 AGYON MATHEW EWA 
46 UJ/2018/CS/0072 SANI ANNA UNEKWU–OJO 
47 UJ/2018/CS/0076 ADAMS ISTIFANUS DANJA 
48 UJ/2018/CS/0081 OKE JOY KIKELOMO 
49 UJ/2018/CS/0090 EMMANUEL ALERO SHALOM 
50 UJ/2018/CS/0096 MUSA FARIDA LAMISHI 
51 UJ/2018/CS/0099 ROTJI WOKJI LAR 
52 UJ/2018/CS/0109 AGADA VICTOR ONOJA 
53 UJ/2018/CS/0113 HAYAB GYENOM FAITH 
54 UJ/2018/CS/0114 SHEILA JACK OONYE 
55 UJ/2018/CS/0115 DALANG KIRKI 