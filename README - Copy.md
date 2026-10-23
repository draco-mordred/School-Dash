# MedLog LMS — Backend Monolith v2.0

An enterprise-grade, event-driven Medical Learning Management System (LMS) built with Node.js, Express, TypeScript, and MongoDB. The platform utilizes a specialized role-based architecture, powered by an asynchronous nervous system for real-time task orchestration.

## 🌟 The Core System Alliance
The architecture is structured around eight dedicated, interconnected subsystems categorized by operational domain. This separation cleanly isolates business logic, platform intelligence, and security layers.

---

### 📦 Category 1: Operational Engines (Core Domain Systems)
This category contains the user-facing business logic driving daily academic, grading, and medical operations.

#### 🏥 K.R.Y.S.T.A.
* **Full Codename**: Klinical Rotations Year-long Scheduler and Timeline & Attendance system
* **Domain**: Hospital & Clinical Operations
* **Functions & Roles**:
  * Completely owns medical student clinical placements, group/unit rotations, and department assignments.
  * Regulates and manages clinical attendance records, metrics, and timeline statistics.
  * Tracks student practical logbooks, entry procedures, reflections, and supervisor review validations.

#### 🎓 L.A.T.I.F.A.H.
* **Full Codename**: Lecture Attendance Tracker & Instance Fetcher, Authorization Handler
* **Domain**: On-Campus Academic Operations
* **Functions & Roles**:
  * Controls institutional timetables and maps subjects to class schedules.
  * Handles classroom lecture attendance sessions, tracking, and instance logging.
  * Evaluates student academic attendance status authentication and daily staff clearance logic.

#### 📝 M.A.R.C.U.S.
* **Full Codename**: Marks, Assessments, Results, and Clinical-Academic Unified Scoring
* **Domain**: Evaluation Gateway
* **Functions & Roles**:
  * Orchestrates exam systems, question pools, and assessment scheduling workflows.
  * Compiles, standardizes, and publishes testing results across academic layers.
  * Generates unified clinical-academic scoring sheets and aggregated GPA calculations.

#### 🖥️ I.A.N.
* **Full Codename**: Interface, Analytics, and Networks
* **Domain**: Reporting & Experience Aggregator
* **Functions & Roles**:
  * Governs the unique role-based portal experiences (Students, Teachers, Admins, Parents, Clinical staff).
  * Consolidates multi-system metrics to serve overview reporting screens and visual dashboard layers.

---

### 🧠 Category 2: Core Intelligence
The automated, calculation-heavy decision layer of the application ecosystem.

#### 🔮 M.O.R.D.R.E.D.
* **Full Codename**: Medical Operations & Rational Data Reasoning Engine Dispatcher
* **Domain**: Cognitive Intelligence Layer
* **Functions & Roles**:
  * Serves as the core AI assistant and automation subservice.
  * Conducts logical system optimizations, predicting attendance trends and placement overlaps.
  * Offers intelligent automated insight generation across the LMS dataset.

---

### 🛡️ Category 3: System Utilities & Security
The infrastructure boundaries that secure your APIs, manage tenants, and protect core execution environments.

#### 🔑 V.A.L.
* **Full Codename**: Validator of Authentication & Access Levels
* **Domain**: Perimeter Security & Middleware
* **Functions & Roles**:
  * Enforces core security, user login, registration, password hashing, and JWT token processing.
  * Manages global middleware, CORS configurations, body parsing, timeouts, and route lifecycle protection.
  * Operates strict Role-Based Access Control (RBAC) to gate API access paths.

#### 🗺️ A.D.A.M.
* **Full Codename**: Administrative Data & Architecture Matrix
* **Domain**: Infrastructure Bedrock
* **Functions & Roles**:
  * Houses foundational institutional setup metadata and base configuration tables.
  * Dictates global multi-tenant settings and system variables referenced across compiling engines.

---

### 📡 Category 4: Telemetry & Asynchronous Orchestration
The active nervous system of your monolith that handles background events, workflows, and communication pipelines.

#### ⚡ T.I.N.A.S.H.A.
* **Full Codename**: Tracking, Incidents, Notifications, and Alerts Handler and Automation
* **Domain**: Asynchronous Nervous System
* **Functions & Roles**:
  * Operates platform system logging automation and tracks system incidents/errors.
  * Manages and triggers contextual real-time notifications (push feeds, email notifications, system alerts).
  * Orchestrates complex background jobs and multi-step approval workflows utilizing Inngest event loops.

---

## 🧱 Architecture Summary Map

| Category | System Codename | Explicit/Implicit Modules Covered | Role in the Monolith |
| :--- | :--- | :--- | :--- |
| **Operational Engines** | **K.R.Y.S.T.A.** | Clinical Rotations, Postings, Logbooks, Clinical Attendance | Hospital Operations |
|  | **L.A.T.I.F.A.H.** | Timetables, Academic Clock, Lectures, Lecture Attendance | Campus Operations |
|  | **M.A.R.C.U.S.** | Exam System, Assessments, Grading Metrics, GPA Calculations | Evaluation Gateway |
|  | **I.A.N.** | Role Portals, Dashboards, Global Reporting UI | Interface Orchestration |
| **Core Intelligence** | **M.O.R.D.R.E.D.** | AI Systems, Predictive Workflows, Automation | Cognitive Automation |
| **System Utilities** | **V.A.L.** | Auth, Middleware, Route Protection, Requests, CORS | Perimeter Security |
|  | **A.D.A.M.** | Institutional Setup, Global Configurations, Tenant Variables | Base Infrastructure |
| **Telemetry & Flow** | **T.I.N.A.S.H.A.** | Notifications, Logs, Inngest Jobs, Approval Workflow Loops | Asynchronous Nervous System |

---

## 📂 Codebase Repository Structure

This monorepo contains the backend monolith in `backend/`, a frontend client in `frontend/`, and a Vercel serverless bridge in `api/`.

```text
backend/
├── api/                     # Serverless entrypoint for deployment
├── config/                  # A.D.A.M. System configuration and DB connection helpers
├── constants/               # Domain constants used across engines
├── controllers/             # Business control plane for clinical, attendance, exam, user, and reporting flows
├── inngest/                 # T.I.N.A.S.H.A. event handlers and async workflows
├── middleware/              # V.A.L. security and route protection logic
├── models/                  # MongoDB schemas for users, classes, attendance, postings, and more
├── routes/                  # API endpoints organized by domain
├── services/                # Core engine logic for KRYSTA, LATIFAH, MARCUS, and MORDRED subsystems
├── utils/                   # Shared helpers and utilities
└── workers/                 # Background task workers and async processors
```

## ⚙️ Asynchronous Cross-System Workflow Example

1. **L.A.T.I.F.A.H.** registers a completed lecture session.
2. **L.A.T.I.F.A.H.** fires a telemetry signal into the backend event bus.
3. **T.I.N.A.S.H.A.** picks up the event and triggers Inngest background pipelines.
4. **M.A.R.C.U.S.** can consume those logs to match attendance records against exam eligibility.

## 🚀 Local Environment Execution

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure your local runtime profile (`backend/.env`):
   ```env
   NODE_ENV=development
   PORT=5000
   LOCAL_CLIENT_URL=http://localhost:5173
   CLIENT_URL=http://localhost:5173
   MEDLOG_MONGO_URL=your-mongodb-connection-string
   JWT_SECRET=some-dev-secret
   ```
3. Run the backend:
   ```bash
   cd backend && npm run dev
   ```

## 🔧 Useful Commands

```bash
# Build the root monorepo for deployment
npm run vercel-build

# Frontend development
cd frontend && npm run dev

# Backend development
cd backend && npm run dev

# Build backend only
cd backend && npm run build:vercel
```

## 📌 Notes

- The backend is bundled into `api/index.js` for Vercel deployment.
- Use `backend/api/index.ts` as the serverless bridge entrypoint.
- `frontend/` contains the React/Vite client.
- `backend/README.md` covers backend-specific install and run instructions.
