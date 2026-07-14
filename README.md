# School Dash

A monorepo for the School Dash application with a React/Vite frontend and a TypeScript/Express backend.

## Project Structure

- `frontend/` - React application built with Vite and TypeScript
- `backend/` - Express backend, TypeScript, MongoDB, serverless support for Vercel
- `api/` - generated Vercel serverless entrypoint for the backend
- `build.js` - root helper that bundles the backend serverless function and copies it into `api/index.js`
- `vercel.json` - Vercel rewrite rules and deployment configuration

## Getting Started

### Install dependencies

From the repository root:

```bash
npm install
```

Then install frontend and backend dependencies if you need to work inside each package separately:

```bash
cd frontend && npm install
cd ../backend && npm install
```

## Local Development

### Backend

From `backend/`:

```bash
npm run dev
```

This starts the backend in watch mode using Bun and Nodemon. The backend expects local environment variables in `backend/.env`.

### Frontend

From `frontend/`:

```bash
npm run dev
```

The frontend uses Vite. In development, it proxies API requests to the backend.

## Backend Build and Vercel Deployment

### Build for Vercel

From the repository root:

```bash
npm run vercel-build
```

This runs `build.js` to bundle the backend serverless entrypoint from `backend/api/index.ts` into `backend/dist/index.js`, then copies it to `api/index.js`.

It also builds the frontend via the root `package.json` script.

### Vercel Behavior

- `api/index.js` is the serverless function entrypoint for the backend
- `vercel.json` rewrites `/api/*` to the backend function
- frontend static assets are served from `frontend/dist`

## Important Environment Variables

The backend requires these environment variables:

- `MEDLOG_MONGO_URL` or `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JSON Web Token secret
- `CLIENT_URL` - frontend URL used for CORS and redirects
- `FRONTEND_URL` - frontend URL used for redirect generation
- `NODE_ENV` - should be `development` locally and `production` in Vercel
- `GOOGLE_GENERATIVE_AI_API_KEY` - optional AI feature key

### Local environment

Create a `backend/.env` file with values similar to this:

```ini
NODE_ENV=development
PORT=5000
LOCAL_CLIENT_URL=http://localhost:5173
CLIENT_URL=http://localhost:5173
MEDLOG_MONGO_URL=your-mongodb-connection-string
JWT_SECRET=some-dev-secret
```

### Production environment

Set these in Vercel project settings:

- `NODE_ENV=production`
- `MEDLOG_MONGO_URL` or `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL=https://your-frontend.vercel.app`
- `FRONTEND_URL=https://your-frontend.vercel.app`

## Notes

- The backend uses serverless entrypoint `backend/api/index.ts` and bundles it with `esbuild`.
- The generated backend function file is `api/index.js`.
- Local backend route prefix is `/api`, while Vercel serverless function receives routes at the root path after rewrites.
- Keep `backend/ChatGPT Image Jul 9, 2026, 04_20_31 AM.png` and other image files out of commits unless they are intentionally part of the repo.

## Useful Commands

```bash
# Build backend and frontend for deployment
npm run vercel-build

# Frontend development
cd frontend && npm run dev

# Backend development
cd backend && npm run dev

# Build backend only
cd backend && npm run build:vercel
```

## Additional docs

- `backend/README.md` contains backend-specific install and run notes
- `DEPLOYMENT_VERIFICATION.md` documents deployment and build verification status
