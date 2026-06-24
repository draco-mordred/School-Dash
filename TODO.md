# TODO

## Backend: Course + Subject revamp
- [x] Update `backend/src/models/courses.ts` schema to support embedded `subjects[]` with `subjectID`
- [ ] Add endpoint split:
  - [ ] `POST /api/courses` => create top-level course only
  - [ ] `POST /api/courses/:courseId/subjects` => add embedded subject (no duplicates by `subjectID`)
- [ ] Update `backend/src/controllers/courses.ts`:
  - [ ] implement `createCourse`
  - [ ] implement `createCourseSubject` (embedded)
  - [ ] (if needed) keep legacy endpoints working

## Frontend: Courses page UI
- [ ] Update `frontend/src/pages/academics/Courses.tsx`:
  - [ ] Course card create flow collects department/unit + class offering (as per your UI spec)
  - [ ] Add “Add Subject” per course
  - [ ] Implement Subject modal (subject name/code, lecturers, optional unit, isActive)
  - [ ] Call new backend endpoint for subject creation

## Verification
- [ ] `npm run lint` (backend)
- [ ] `npm run typecheck` (backend)
- [ ] Manual smoke test: create course -> add subject -> see in UI

