# Star Health Insurance CRM

## Overview

A production-ready CRM for managing insurance leads, customers, and policy workflows. It gives operations teams a single place to track clients, policies, renewals, claims, and tasks—with role-based access for administrators and assistants.

## Features

- **Lead management** — Capture, assign, and track prospects through the sales and onboarding funnel.
- **Customer profiles** — Policy history, dependents, interactions, and renewal context in one view.
- **Policy workflow tracking** — Policies, sum insured, premiums, and expiry signals for proactive follow-up.
- **Dashboard with key metrics** — Book of business, renewals, claims pipeline, and performance indicators.
- **Responsive UI** — Works on phone, tablet, and desktop for field and desk teams.

## Tech Stack

| Layer | Technology |
| --- | --- |
| **Frontend** | React 18, Vite 5, React Router, Tailwind CSS 4, Axios, Recharts |
| **Backend** | Node.js, Express, JWT auth, PostgreSQL (or PGlite for embedded local DB) |
| **Tooling** | npm workspaces, optional OpenAI for draft reminders and emails |

The stack is chosen for fast local development, clear API boundaries, and straightforward deployment of the static UI.

## Getting Started

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org) or `brew install node`
- **PostgreSQL 14+** (optional if you use embedded PGlite) — e.g. `brew install postgresql@16` and `brew services start postgresql@16`

### Install and run (full stack)

From the repository root:

```bash
npm install
npm run dev
```

- **API:** `http://localhost:4000` — health: `GET /health`
- **Web app:** `http://localhost:5173` (Vite proxies API paths in development)

### Run with one script (browser-friendly)

Uses portable Node from `.tools/node` when present, frees ports 4000/5173, and can enable PGlite if Postgres is unavailable:

```bash
bash ./start-live.sh
```

Same as `npm run browser` when `npm` is on your `PATH`.

### Database setup (PostgreSQL)

1. Create a database, e.g. `createdb insurance_crm`
2. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`
3. From `backend/`:

```bash
npm install
npm run db:init
npm run db:seed
npm run dev
```

For **PGlite** (embedded, no install), set `USE_PGLITE=1` in `backend/.env` — data lives under `backend/.data/pglite`.

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_ORIGIN` in `frontend/.env` when the API is not on the same origin (see `frontend/.env.example`).

### Demo logins

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@crm.local | admin123 |
| Assistant (policies) | assistant1@crm.local | assist123 |
| Assistant (renewals) | assistant2@crm.local | assist123 |

### Optional: OpenAI

Set `OPENAI_API_KEY` in `backend/.env` for AI-assisted **renewal reminders** and **draft emails**.

### API reference

See [backend/API.md](backend/API.md).

## Deployment

### Vercel (frontend)

This repo’s UI is a **Vite SPA**. Deploy the **`frontend`** directory (or set the project root to `frontend` in Vercel) so static assets and SPA rewrites apply. `frontend/vercel.json` already maps routes to `index.html`.

1. Install the [Vercel CLI](https://vercel.com/docs/cli) or connect the GitHub repo in the Vercel dashboard.
2. Configure **`VITE_API_ORIGIN`** in Vercel project settings to your production API URL (no trailing slash).
3. Deploy: `cd frontend && npx vercel --prod` (or push to a connected branch for automatic builds).

Host the Node API separately (Railway, Render, Fly.io, EC2, etc.) with `FRONTEND_ORIGIN` set to your Vercel domain for CORS.

## Demo

**Live URL (Vercel):** [https://frontend-red-omega-34.vercel.app](https://frontend-red-omega-34.vercel.app)

Set **`VITE_API_ORIGIN`** in the Vercel project to your deployed API URL so login and data load in production. Until the API is configured, use the app locally with `bash ./start-live.sh` and open `http://localhost:5173`.

---

### MacBook troubleshooting

If Postgres is not on `:5432`, `start-live.sh` can start Docker Postgres when available, or fall back to **PGlite**.

Homebrew Postgres often uses your macOS username (not `postgres`/`postgres`) in `DATABASE_URL`. Example:

`DATABASE_URL=postgresql://YOUR_USERNAME@localhost:5432/insurance_crm`

If `npm run dev` in the backend complains about `--watch`, use Node 20+ or `npm run dev:simple` from `backend/`.
