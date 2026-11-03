# Institution Deploy Guide — School-Dash / MedLog LMS

School-Dash is deployed as **one isolated instance per institution**. There is
**no shared database and no multi-tenant code path**: every institution gets
its own GitHub fork (or branch), its own MongoDB database, its own Render
backend, its own Vercel frontend, and its own environment keys. A central
control-plane app to provision instances automatically is a **future, separate
project** — this guide documents the manual per-instance spin-up process that
the control plane will eventually automate.

The production reference instance (JUTH — Jos University Teaching Hospital,
medical students) runs at:

- Backend: https://medlog-lms.onrender.com
- Frontend: Vercel (school-dash frontend)

## 1. What each instance owns

| Resource | Per institution | Notes |
| --- | --- | --- |
| Code | Fork or branch of this repo | Pin to a release tag |
| Database | Dedicated MongoDB Atlas cluster | Never share between instances |
| Backend host | One Render web service | Bun runtime |
| Frontend host | One Vercel project | Vite build |
| AI keys | Own Mistral + Google key pool | See §4 |
| Domain | Own (sub)domain, e.g. `lms.<institution>.edu` | Optional |

## 2. Backend (Render)

1. **New Render web service** → connect the fork/branch.
2. Root directory: `backend`; runtime: Bun.
3. Build command and start command: use the existing repo settings from the
   JUTH instance (Render dashboard keeps them per service).
4. Set **all** environment variables from §4 (backend column).
5. Deploy, then verify: `GET https://<service>.onrender.com/` returns
   `{ "status": "ok", ... , "commit": "<deployed sha>" }` — the `commit` must
   match the branch HEAD you deployed.
6. **Inngest Cloud**: register the app id `medlog-lms` against the service
   (`<backend-url>/api/inngest`) from the Inngest dashboard using
   `INNGEST_SIGNING_KEY` + `INNGEST_EVENT_KEY`. Scheduled functions (cron
   jobs: DM auto-clear, attendance/rotation jobs, etc.) run through Inngest —
   set `USE_INNGEST_SCHEDULING=true` so crons are registered.

## 3. Frontend (Vercel)

1. **New Vercel project** → same fork/branch; root directory `frontend`.
2. Set `VITE_BACKEND_URL` to the Render service URL from §2.
3. Redeploys on Vercel are **manual (READY)**: after each merge, press
   *Redeploy* on the deployment, then hard-refresh the app.
4. Verify smoke flow: login works, DALE chat replies, DMs tab visible.

## 4. Environment variables (verified against code)

### Backend (Render)

| Variable | Required | Purpose |
| --- | --- | --- |
| `MEDLOG_MONGO_URL` | ✔ | MongoDB connection string (also accepts `MONGODB_URI` / `MONGO_URI`) |
| `JWT_SECRET` | ✔ | Auth token signing (HS512, 30-day tokens) |
| `CLIENT_URL` | ✔ | CORS origin — the frontend URL (comma-separated list allowed) |
| `NODE_ENV` | ✔ | `production` (also switches Inngest to Cloud mode) |
| `MISTRAL_API_KEY`, `MISTRAL_API_KEY_2` | ✔ (≥1) | DALE/DM AI primary pool (Mistral) |
| `GOOGLE_GENERATIVE_AI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY_2` | optional | AI fallback pool (Gemini). **Without at least one AI key the DM AI-moderation pass silently runs deterministic-only** |
| `AI_GATEWAY_API_KEY`, `GEMINI_API_KEY` | optional | Alternate Gemini key names recognized by the engine |
| `INNGEST_SIGNING_KEY` | ✔ | Inngest Cloud signature validation (production) |
| `INNGEST_EVENT_KEY` | ✔ | Inngest Cloud event key |
| `USE_INNGEST_SCHEDULING` | ✔ | `true` → cron jobs registered via Inngest |
| `RENDER_GIT_COMMIT` | auto | Render injects the deployed commit sha |
| `MORDRED_MISTRAL_MODEL`, `MORDRED_MODEL` | optional | Override AI model ids |
| `QR_SIGNING_SECRET` | recommended | Distinct secret for QR payload signing (falls back to `JWT_SECRET`) |
| `GOOGLE_DRIVE_CLIENT_ID`, `GOOGLE_DRIVE_CLIENT_SECRET` | optional | Google Drive class-materials integration |
| `GOOGLE_DRIVE_ACCESS_TOKEN` | optional | Drive fallback token |
| `EXPRESS_BODY_LIMIT` | optional | JSON body limit (default `10mb`) |
| `PORT` | auto | Set by the host |

### Frontend (Vercel)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_BACKEND_URL` | ✔ | Base URL of the Render backend |
| `VITE_API_BASE_URL` | optional | Explicit API base (defaults to `VITE_BACKEND_URL` handling) |

> Never commit real keys. Use the host dashboard (Render/Vercel) env UI.
> `.env.example` files in `backend/` and `frontend/` list every variable with
> safe placeholder values for local development.

## 5. Institution configuration

Instance-level customization is **config-file based**, not database-tenant
based. When spinning up a new institution, review and adapt the
institution-specific values that currently ship JUTH-tuned:

1. **Institution identity / branding** — app title, logo, and theme colors in
   the frontend settings/theme components.
2. **Role-based theme colors** — dashboard themes per role
   (`frontend/src` theme tokens; keep the 60/30/10 palette balance).
3. **Departments, classes, and courses** — seeded per instance via the admin
   setup flows after first admin registration; never copy JUTH's data.
4. **Grading & progression policy** — CA/exam weight split (JUTH uses the
   40/60 CA/exam weights), pass thresholds, clock phases, and penalty ladder
   wording: these live in the backend grading/config services; adjust them in
   the fork for the new institution's rules before go-live.
5. **DM moderation keyword lists & penalty ladder** —
   `backend/src/utils/dmModeration.ts` (deterministic rules) and
   `backend/src/services/dmService.ts` (AI escalation): tune keyword sets and
   penalty durations to the institution's code of conduct.
6. **Clock / rotation schedules** — rotation schedule routes and subs
   (`backend/src/subs/…`) are instance data; configure after first deploy.

The long-term pattern (next evolution) is an `institution.config.ts` file per
instance, synced into the DB during setup — departments, classes, CA/exam
parameters, clock phases, and progression policy — so a new instance is fully
defined by one config file plus env keys.

## 6. New-instance smoke-test checklist

- [ ] `GET /` on the backend returns `status: ok` and the expected commit sha
- [ ] First admin can register and sign in; JWT cookie issued
- [ ] CORS: frontend can call the backend (no console CORS errors)
- [ ] DALE AI chat replies to a message (AI keys live)
- [ ] DMs: send a DM between two test users; soft-flagged keyword produces a
      moderation case visible in the admin queue; `GET /dm/admin/transparency`
      lists admin activity
- [ ] Inngest Cloud shows registered functions and next cron run times
      (incl. `DM-Auto-Clear`)
- [ ] Attendance QR generation/signing round-trips (if `QR_SIGNING_SECRET` set)
- [ ] Password reset / account approval flow logs correctly
- [ ] Frontend hard-refresh shows latest deploy (no stale cache)

## 7. Upgrades

Instances upgrade independently: bump the fork to the chosen release tag,
Render auto-deploys on push (if auto-deploy enabled), Vercel requires a
manual READY redeploy. Always verify the `commit` sha in `GET /` after a
backend deploy.
