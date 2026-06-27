# Department Validation Implementation - Test Guide

## ✅ Completed Implementation

### 1. Backend Department Seeding & Endpoints

#### Endpoint: POST `/api/courses/seed/departments`
- **Access**: Admin only
- **Purpose**: Seed all 8 departments into MongoDB
- **Response**: 
```json
{
  "message": "Successfully seeded 8 departments",
  "departments": [
    { "name": "Department of Medicine", "code": "MED", "departmentID": "MED-2026-001", "_id": "..." },
    { "name": "Department of Surgery", "code": "SUR", "departmentID": "SUR-2026-001", "_id": "..." },
    // ... 6 more departments
  ]
}
```

#### Endpoint: GET `/api/courses/departments`
- **Access**: Protected (authenticated users)
- **Purpose**: Fetch available departments for forms
- **Response**: Same as seed endpoint

#### Endpoint: POST `/api/courses` (Enhanced)
- **New Validations**:
  1. Department exists: `Department.findById(department)` 
  2. Unit exists: `Unit.findById(unit)`
  3. Unit belongs to department: `unit.department === selected department`
- **Error Responses**:
  - 404: Department not found
  - 404: Unit not found
  - 400: Unit does not belong to department

### 2. Frontend Department Integration

#### Department-Based Unit Filtering
- **Location**: `frontend/src/pages/academics/Courses.tsx`
- **Feature**: When user selects a department, unit dropdown only shows units from that department
- **Implementation**: `filteredUnits` useMemo watches department selection

#### Course Creation Form
- Department dropdown: Shows all available departments
- Unit dropdown: Dynamically filters by selected department
- Error messages: Display validation errors from backend

### 3. Backend Constants System
- **Location**: `backend/src/constants/departments.ts`
- **Contains**: 
  - `DepartmentName` enum (8 departments)
  - `DepartmentCode` enum 
  - `DEPARTMENTS_METADATA` with full metadata
  - Helper functions: `getDepartmentMetadata()`, `getAllDepartments()`

---

## 🧪 Manual Testing Steps

### Step 1: Seed Departments
```bash
curl -X POST http://localhost:3000/api/courses/seed/departments \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json"
```
**Expected**: 200 response with 8 departments

### Step 2: Verify Departments in Database
```bash
# Check MongoDB
db.departments.find({}).pretty()
# Should show 8 departments with code, name, departmentID
```

### Step 3: Test Course Creation with Invalid Department
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d {
    "name": "Test Course",
    "code": "TEST-01",
    "courseID": "TEST",
    "department": "invalid-id",
    "unit": "valid-unit-id",
    "academicYearId": "valid-year-id"
  }
```
**Expected**: 404 response "Department not found"

### Step 4: Test Course Creation with Invalid Unit
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d {
    "name": "Test Course",
    "code": "TEST-01",
    "courseID": "TEST",
    "department": "valid-dept-id",
    "unit": "invalid-id",
    "academicYearId": "valid-year-id"
  }
```
**Expected**: 404 response "Unit not found"

### Step 5: Test Course Creation with Mismatched Unit-Department
```bash
curl -X POST http://localhost:3000/api/courses \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d {
    "name": "Test Course",
    "code": "TEST-01",
    "courseID": "TEST",
    "department": "medicine-dept-id",
    "unit": "surgery-unit-id",  // Unit belongs to different department
    "academicYearId": "valid-year-id"
  }
```
**Expected**: 400 response "Unit X does not belong to department Y"

### Step 6: Test Successful Course Creation
1. Get department ID from seeded departments
2. Get unit ID that belongs to that department
3. Create course with matching department/unit
**Expected**: 201 response with created course

### Step 7: Test Frontend Form
1. Open course creation form
2. Select a department from dropdown
3. Verify unit dropdown only shows units from selected department
4. Try to submit invalid department/unit combo (should fail on backend)

---

## 📋 Validation Checklist

- [ ] Departments can be seeded via POST `/api/courses/seed/departments`
- [ ] All 8 departments exist in MongoDB with correct metadata
- [ ] GET `/api/courses/meta` returns departments with code and departmentID
- [ ] Course creation fails with 404 if department doesn't exist
- [ ] Course creation fails with 404 if unit doesn't exist  
- [ ] Course creation fails with 400 if unit doesn't belong to department
- [ ] Frontend unit dropdown filters by selected department
- [ ] Course creation succeeds with valid department/unit combo
- [ ] Error messages display correctly on frontend
- [ ] Department validation works for both createCourse and createCourseSubject

---

## 🔍 Implementation Details

### Files Modified:
1. **backend/src/controllers/courses.ts**
   - Updated `createCourse()` with department/unit validation
   - Updated `createCourseSubject()` with department/unit validation
   - Added `seedDepartments()` endpoint
   - Added `getAvailableDepartments()` endpoint

2. **backend/src/routes/courses.ts**
   - Added route: POST `/seed/departments`
   - Added route: GET `/departments`

3. **frontend/src/pages/academics/Courses.tsx**
   - Added `filteredUnits` useMemo for department-based filtering
   - Updated unit dropdown to use `filteredUnits`

### Constants Used:
- **backend/src/constants/departments.ts** - All 8 departments with metadata

---

## 🚀 Next Steps

1. **Seed departments** in development database
2. **Create units** for each department (if not already done)
3. **Test course creation** via API and frontend
4. **Apply same validation pattern** to:
   - Unit creation endpoint
   - Staff assignment to departments
   - Any other department-related operations

5. **Consider adding**:
   - Department-based filtering in GET courses endpoints
   - Staff roster by department
   - Department-based timetable views
