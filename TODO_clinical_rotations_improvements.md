# Clinical rotations improvements (working plan)

- [X] Add persisted fields for signup (Completed)
  - [X] `studentName` (primary) to `ClinicalRotation` model
  - [X] `supervisorName` to `ClinicalRotation` model
- [X] Update `/clinical-rotations/:id/signup` endpoint to set (Completed)
  - [X] `studentName` from requesting student
  - [X] `supervisorName` from selected `rotationSupervisor` (or existing)
  - [X] enforce eligibility for students based on the current "available" rules
- [X] Extend supervisor notifications (Completed)
  - [X] Send notification to the chosen supervisor user: "<studentName></studentname> has signed up for the rotation <rotationName></rotationname>"
- [X] Update frontend (Completed)
  - [X] Show saved `studentName` and `supervisorName` in available postings dialog and rotations table
- [X] Quick manual verification (Completed)
  - [X] Student signs up -> rotation document stores names
  - [X] Supervisor dashboard receives notification
  - [X] UI shows updated names without relying on populate
