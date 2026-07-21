# Environment & Deployment Setup Guide

This document explains the local vs production environment separation and how configuration flows through the system.

## Quick Reference

| Aspect | Local Dev | Vercel Production |
|--------|-----------|-------------------|
| **Backend Port** | 5000 (localhost) | Serverless function (api/index.js) |
| **Frontend Port** | 5173 (localhost) | Served from frontend/dist |
| **API Base URL** | `/api` (Vite proxy) | `/api` (Vercel rewrites) |
| **Config Location** | `backend/.env` | Vercel Dashboard → Project Settings → Environment Variables |
| **Runtime Detection** | `NODE_ENV=development` | `NODE_ENV=production` + `VERCEL=1` |
| **CORS Origins** | localhost variants | Production domain |

## Local Development Setup

### 1. Create `backend/.env`
Copy from [backend/.env.example](./backend/.env.example):

```bash
PORT=5000
NODE_ENV=development
LOCAL_CLIENT_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
MEDLOG_MONGO_URL=mongodb+srv://Mordred:...@medlog.vnqgtsm.mongodb.net/medlog?appName=Medlog
JWT_SECRET=your_dev_secret_key
GOOGLE_GENERATIVE_AI_API_KEY=your_optional_key
```

**Key Points:**
- `NODE_ENV=development` prevents Vercel detection (see [backend/src/server.ts](./backend/src/server.ts) line ~63)
- Both `LOCAL_CLIENT_URL` and `CLIENT_URL` point to localhost:5173
- MongoDB URL can be local or Atlas (both work)
- JWT_SECRET can be any string for local dev

### 2. Start Backend
```bash
cd backend
npm start
# Logs should show: 🟩 LOCAL DEVELOPMENT
```

### 3. Start Frontend (separate terminal)
```bash
cd frontend
npm run dev
# Opens http://localhost:5173
# Vite proxy forwards API calls to http://localhost:5000/api
```

## Vercel Production Setup

### 1. Environment Variables
Set these in **Vercel Dashboard → Project Settings → Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Triggers Vercel detection in server.ts |
| `MEDLOG_MONGO_URL` | Your MongoDB Atlas URL | KEEP PRIVATE - only in Vercel dashboard |
| `JWT_SECRET` | Strong random string | KEEP PRIVATE - only in Vercel dashboard |
| `CLIENT_URL` | `https://your-vercel-domain.vercel.app` | Production frontend URL |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Your API key | Optional, if using Mordred AI |

**Vercel automatically provides:**
- `VERCEL=1`
- `VERCEL_URL=your-domain.vercel.app`
- `NODE_ENV` (from your settings above)

### 2. Build Process
[build.js](../../build.js) runs during `npm run vercel-build`:

1. Bundles backend TypeScript (backend/src/server.ts) as serverless function
   - Input: backend/src/server.ts
   - Output: api/index.js (Vercel recognizes as serverless function)
2. Builds frontend (Vite)
   - Input: frontend/src/
   - Output: frontend/dist/ (static files)

Result: 
- `/api/*` requests → `api/index.js` (backend handler)
- All other requests → `frontend/dist/index.html` (React routing)

### 3. Request Flow
```
Client → Vercel
  ↓
Vercel rewrite /api/* → api/index.js
  ↓
backend/src/server.ts (serverless handler)
  - Detects: VERCEL=1 + NODE_ENV=production
  - Sets apiBase = "" (no prefix needed)
  - Routes mounted at /users, /courses, etc. (not /api/users)
  ↓
Response back to client
```

## Runtime Detection Logic

The backend uses [backend/src/server.ts](./backend/src/server.ts#L63-L67) to detect runtime:

```typescript
const isVercelRuntime =
  process.env.VERCEL === "1" ||
  process.env.VERCEL === "true" ||
  (Boolean(process.env.VERCEL_URL) && process.env.NODE_ENV === "production");
const apiBase = isVercelRuntime ? "" : "/api";
```

**When routes are mounted:**
- **Local Dev** (`isVercelRuntime=false`): `app.use("/api/users", userRoutes)`
- **Vercel** (`isVercelRuntime=true`): `app.use("/users", userRoutes)`

This is because Vercel strips the `/api` prefix before passing to the serverless function.

### Debug Output
When the backend starts, it logs (see [backend/src/server.ts](./backend/src/server.ts#L69-L77)):

**Local:**
```
🚀 Backend Server Initialization:
   Environment: 🟩 LOCAL DEVELOPMENT
   Port: 5000
   Node Env: development
   API Base: /api
   Vercel Flag: not set
   Vercel URL: not set
```

**Vercel:**
```
🚀 Backend Server Initialization:
   Environment: 🟦 VERCEL/SERVERLESS
   Port: 5000
   Node Env: production
   API Base: (root)
   Vercel Flag: 1
   Vercel URL: medloglms.vercel.app
```

## Troubleshooting

### Backend 404 errors on Vercel
- Check: `NODE_ENV=production` in Vercel dashboard
- Check: Routes mounted at root, not `/api/...`
- Check: [vercel.json](../../vercel.json#L31) rewrites point to `/api/:path*`

### Frontend can't reach backend locally
- Check: `LOCAL_CLIENT_URL=http://localhost:5173` in [backend/.env](./backend/.env)
- Check: Vite proxy in [frontend/vite.config.ts](../frontend/vite.config.ts#L20) points to `http://localhost:5000`
- Check: Backend started with `npm start` (should log 🟩 LOCAL DEVELOPMENT)

### CORS errors
- Local: Check [backend/src/server.ts](./backend/src/server.ts#L80) normalizes origins correctly
- Vercel: Check `CLIENT_URL=https://your-vercel-domain.vercel.app` is set exactly

### Production values in local .env
- **Do NOT commit secrets** to git
- **Use `.env.example`** as template (has no real credentials)
- **Production variables** (like real JWT_SECRET, MongoDB URL) go ONLY in Vercel dashboard

## Files Reference

| File | Purpose |
|------|---------|
| [backend/.env.example](./backend/.env.example) | Template for local .env (check this for all variables) |
| [backend/.env](./backend/.env) | Local development config (NOT in git) |
| [backend/src/server.ts](./backend/src/server.ts) | Runtime detection & CORS setup |
| [vercel.json](../../vercel.json) | Vercel build & deployment config |
| [build.js](../../build.js) | Bundles backend for serverless & copies to api/index.js |
| [frontend/vite.config.ts](../frontend/vite.config.ts) | Frontend dev server proxy & build config |
| [api/package.json](../../api/package.json) | Marks api/ as serverless function |
| [api/index.js](../../api/index.js) | Generated serverless handler (do NOT edit directly) |

## Next Steps

After setup:
1. ✅ Verify local dev works: `npm start` in backend, `npm run dev` in frontend
2. ✅ Test login endpoint: `curl -X POST http://localhost:5000/api/users/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"test"}'`
3. ✅ Deploy to Vercel: Push to main branch, Vercel auto-deploys
4. ✅ Verify production: Test login on deployed site, check [Vercel Logs](https://vercel.com/dashboard)
