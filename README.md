# School Dash

School Dash is a full-stack school administration dashboard — backend API (Bun + Express + MongoDB) and a Vite + React frontend.

This repository contains the backend and frontend for the School Dash application used to manage attendance, timetables, notifications and more for school users (admins, teachers, students, parents).

## Features

- Centralized notifications with unread counters and per-user seen state
- Attendance tracking and reporting
- Timetable and class management
- Role-based access (admin, teacher, student, parent)
- Inngest jobs and AI-assisted helpers (Google generative API usage in some workers)

## Tech stack

- Backend: Bun, Express (v5), TypeScript, Mongoose (MongoDB), Inngest
- Frontend: React (v19) + Vite, TypeScript, Tailwind, Radix UI

## Repository layout

- `backend/` — TypeScript Bun backend, API routes and controllers
- `frontend/` — Vite + React frontend app
- `scripts/` — project-level scripts (seeding, etc.)

## Prerequisites

- Node.js >= 18+ (for some developer tools) — recommended
- Bun (recommended for backend) — https://bun.sh
- MongoDB instance (Atlas or local)
- Git

## Environment variables

Create a `.env` file in `backend/` with at least the following values (example):

```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/school-dash
JWT_SECRET=your_jwt_secret_here
CLIENT_URL=http://localhost:5173
GOOGLE_GENERATIVE_AI_API_KEY=YOUR_GOOGLE_AI_KEY  # optional (used by some jobs)
NODE_ENV=development
```

Adjust names if your hosting provider uses different variable names; the backend will check common names like `MONGO_URI`, `MONGO_URL`, or `MEDLOG_MONGO_URL`.

## Local development

### Backend (recommended with Bun)

1. Install Bun: https://bun.sh
2. From the repo root, run:

```bash
cd backend
bun install
# Development (uses nodemon -> runs Bun):
bun run dev

# Or run the server in watch mode:
bun run start
```

Notes:

- The `backend/package.json` contains scripts: `dev`, `start`, and `server` (inngest helper). See [backend/package.json](backend/package.json#L1) for details.

### Frontend

1. Install dependencies and start the Vite dev server:

```bash
cd frontend
npm install
npm run dev
```

2. Open the app at `http://localhost:5173` (Vite default).

Frontend scripts are defined in [frontend/package.json](frontend/package.json#L1).

## API & Notifications behavior

- Notifications endpoints used by the frontend include `/notifications` and `/notifications/unread-count`.
- The frontend hook `useNotifications` (in `frontend/src/hooks/useNotifications.ts`) fetches the list and unread count; the app will PATCH endpoints like `/notifications/:id/read` and `/notifications/read-all` to mark items as seen.

## Seeding demo data

- The backend includes a seed script at `backend/scripts/seedDemoUsers.ts` that can create demo users. Run using Bun or directly with `ts-node` if you prefer:

```bash
cd backend
# with bun
bun run scripts/seedDemoUsers.ts

# or using ts-node (if installed globally):
npx ts-node scripts/seedDemoUsers.ts
```

## Running jobs / Inngest

- The repo includes Inngest handlers under `backend/src/inngest/`. The `backend` package.json has a `server` script that helps run the Inngest dev server. See `backend/package.json` for the `server` script.

## Linting & building

- Frontend lint: `cd frontend && npm run lint`
- Frontend build (production): `cd frontend && npm run build-script---change to build on production` (this repo has a custom script name — consider adding a `build` script that runs `vite build`)

## Deployment

- Typical deployment flow:
  - Provision a MongoDB database (Atlas recommended)
  - Set backend environment variables in your host (PORT, MONGO_URI, JWT_SECRET, CLIENT_URL)
  - Build and serve the frontend (`vite build`) and host the static output (Netlify, Vercel, static host) or serve from a Node server
  - For backend, deploy with Bun-capable environment (or adapt to Node) and ensure the environment provides required env vars

## Contributing

- Welcome — please open an issue or PR. Follow these conventions:
  - Create a feature branch from `main`.
  - Keep changes small and focused.
  - Add tests for new backend behavior where possible.

## License

This repository does not include a license file. Add a `LICENSE` (e.g., MIT) to clarify terms.

## Where to look next

- Backend entry: [backend/src/server.ts](backend/src/server.ts#L1)
- Frontend entry: [frontend/src/main.tsx](frontend/src/main.tsx#L1)
- Notifications hook: [frontend/src/hooks/useNotifications.ts](frontend/src/hooks/useNotifications.ts#L1)
