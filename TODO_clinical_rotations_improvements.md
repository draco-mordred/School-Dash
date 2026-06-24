# Clinical rotations improvements (working plan)

- [x] Add persisted fields for signup (Completed)
  - [x] `studentName` (primary) to `ClinicalRotation` model
  - [x] `supervisorName` to `ClinicalRotation` model
- [x] Update `/clinical-rotations/:id/signup` endpoint to set (Completed)
  - [x] `studentName` from requesting student
  - [x] `supervisorName` from selected `rotationSupervisor` (or existing)
  - [x] enforce eligibility for students based on the current "available" rules
- [x] Extend supervisor notifications (Completed)
  - [x] Send notification to the chosen supervisor user: "<studentName> has signed up for the rotation <rotationName>"
- [x] Update frontend (Completed)
  - [x] Show saved `studentName` and `supervisorName` in available postings dialog and rotations table
- [x] Quick manual verification (Completed)
  - [x] Student signs up -> rotation document stores names
  - [x] Supervisor dashboard receives notification
  - [x] UI shows updated names without relying on populate

