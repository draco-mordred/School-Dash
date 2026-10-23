# MedLog LMS — Backend Monolith v2.0

An enterprise-grade, event-driven Medical Learning Management System (LMS) built with Node.js, Express, TypeScript, and MongoDB. The platform utilizes a specialized role-based architecture, powered by an asynchronous nervous system for real-time task orchestration.

## Core architecture
The backend is organized around a set of internal subsystems with dedicated responsibilities for clinical operations, academic attendance, evaluation, reporting, AI intelligence, security, configuration, and asynchronous orchestration.

> Core subsystem codenames are intentionally maintained as an internal reference. See `backend/INTERNAL_SYSTEMS.md` for the hidden architecture map.

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
