# Clinical rotations improvements (working plan)

- [ ] Add persisted fields for signup:
  - [ ] `studentName` (primary) to `ClinicalRotation` model
  - [ ] `supervisorName` to `ClinicalRotation` model
- [ ] Update `/clinical-rotations/:id/signup` endpoint to set:
  - [ ] `studentName` from requesting student
  - [ ] `supervisorName` from selected `rotationSupervisor` (or existing)
  - [ ] enforce eligibility for students based on the current “available” rules
- [ ] Extend supervisor notifications:
  - [ ] Send notification to the chosen supervisor user: "<studentName> has signed up for the rotation <rotationName>"
- [ ] Update frontend:
  - [ ] Show saved `studentName` and `supervisorName` in available postings dialog and rotations table
- [ ] Quick manual verification:
  - [ ] Student signs up -> rotation document stores names
  - [ ] Supervisor dashboard receives notification
  - [ ] UI shows updated names without relying on populate

