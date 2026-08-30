# RiftProbe Deployment Guide

This guide covers how to run RiftProbe locally, deploy the production-style Docker stack, and ship the **recommended cloud demo** (Vercel frontend + Render API).

---

## Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Vercel (frontend)                                          │
│  https://riftprobe.venkatkolasani.in                        │
│  Next.js · static + client-side API calls                   │
└──────────────────────────┬──────────────────────────────────┘
                           │ NEXT_PUBLIC_API_URL
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Render (demo API)                                          │
│  https://api.riftprobe.venkatkolasani.in                    │
│  FastAPI · standalone_demo_server · in-memory store        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Real engine code (same in all deployment modes)              │
│  RetailOps sandbox · deterministic evaluator · mutation     │
│  engine · regression synthesizer · release gate             │
└─────────────────────────────────────────────────────────────┘
```

### What is "demo" vs "full"?

| Layer | Demo deployment (Vercel + Render) | Full stack (`docker compose`) |
|-------|-----------------------------------|-------------------------------|
| **UI** | Vercel | Docker or Vercel |
| **API entrypoint** | `standalone_demo_server.py` | `main.py` |
| **Persistence** | In-memory (resets on restart) | Postgres |
| **Job queue** | Inline during SSE stream | Redis + background worker |
| **Evaluation engine** | ✅ Real | ✅ Real |
| **RetailOps agent** | ✅ Real (v1.0 / v1.1) | ✅ Real |
| **Mutation engine** | ✅ Real (template + bounded LLM) | ✅ Real |
| **Release gate** | ✅ Real rules | ✅ Real rules |

The **behavioral logic is real** — evaluator, agent policies, mutation, regressions, and release gate all run the same `engine/` and `demo/` code. The demo API uses an in-memory control plane so it deploys reliably on free-tier hosting without Postgres/Redis setup.

---

## Option 1 — Local development (fastest)

### Prerequisites

- Python 3.11+
- Node.js 20+
- `make`, `docker` (optional)

### Standalone demo (matches cloud deployment)

**Terminal 1 — API**

```bash
cd RiftProbe
python3 -m venv venv && source venv/bin/activate
pip install -r apps/api/requirements.txt

PYTHONPATH=. uvicorn apps.api.standalone_demo_server:app --host 127.0.0.1 --port 8001
```

**Terminal 2 — Web UI**

```bash
cd apps/web
npm install
NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

Open http://localhost:3000

> **Tip:** Restart the API server between demos to reset in-memory state (failures, regressions, runs).

### Full Docker stack (Postgres + Redis + API + Web)

```bash
cp .env.example .env   # optional: set OPENAI_API_KEY
docker compose up --build
```

| Service | URL |
|---------|-----|
| Web UI | http://localhost:3000 |
| API | http://localhost:8000/health |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

### Verify end-to-end

```bash
make demo    # CLI verification of Section 7 path
make test    # unit + integration tests
```

---

## Option 2 — Cloud demo (recommended for submission)

**Frontend:** Vercel  
**Backend API:** Render (this blueprint)

### Step 1 — Deploy API on Render

1. Push the repo to GitHub (must include `render.yaml` at repo root).
2. Go to [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect your GitHub account and select the `RiftProbe` repository.
4. Render reads `render.yaml` and creates a **Web Service** named `riftprobe-api`.
5. Click **Apply** and wait for the first deploy (~3–5 min).
6. Copy the service URL, e.g. `https://riftprobe-api.onrender.com`.
7. Verify health:

   ```bash
   curl https://riftprobe-api.onrender.com/health
   ```

   Expected:

   ```json
   {"status":"ok","service":"riftprobe-demo-api","mode":"local-standalone"}
   ```

#### Custom domain (optional)

1. Render → `riftprobe-api` → **Settings** → **Custom Domains**.
2. Add `api.riftprobe.venkatkolasani.in`.
3. Add the CNAME record Render provides in your DNS (same provider as your apex domain).
4. Wait for TLS certificate provisioning.

#### Free tier notes

- Service **spins down after 15 minutes** of inactivity; first request after idle may take 30–60s (cold start).
- In-memory data **resets on every deploy or restart**.
- For a live demo, hit `/health` 30s before you start recording.

### Step 2 — Connect Vercel frontend to Render API

1. Go to [Vercel Dashboard](https://vercel.com/) → your RiftProbe project.
2. **Settings** → **Environment Variables**.
3. Add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_API_URL` | `https://riftprobe-api.onrender.com` (or your custom API domain) |

4. Apply to **Production**, **Preview**, and **Development**.
5. **Deployments** → latest deployment → **Redeploy** (required — Next.js bakes this at build time).

### Step 3 — Smoke test the live demo

```bash
API=https://riftprobe-api.onrender.com   # or your custom domain

# Health
curl -sS $API/health

# Baseline run
curl -sS -X POST $API/v1/runs \
  -H 'Content-Type: application/json' \
  -d '{"version_label":"v1.0","mode":"baseline"}'

# Discover run
curl -sS -X POST $API/v1/runs \
  -H 'Content-Type: application/json' \
  -d '{"version_label":"v1.0","mode":"discover"}'
```

Then open https://riftprobe.venkatkolasani.in/dashboard and run through the UI.

---

## Option 3 — Manual Render deploy (without Blueprint)

If you prefer not to use `render.yaml`:

1. Render → **New** → **Web Service**.
2. Connect GitHub repo.
3. **Runtime:** Docker.
4. **Dockerfile path:** `infra/docker/Dockerfile.api.demo`
5. **Docker context:** `.` (repo root).
6. **Health check path:** `/health`.
7. **Instance type:** Free.
8. Deploy.

---

## Option 4 — Full production stack on Render (advanced)

The repo also includes a Postgres + Redis control plane (`apps/api/main.py`). This is **not** what the current Vercel UI buttons target (they send `mode: baseline|discover` which only the standalone server understands).

To deploy the full stack later:

| Render resource | Purpose |
|-----------------|---------|
| PostgreSQL | Runs, traces, failures, regressions |
| Key Value (Redis) | SSE pub/sub, job queue |
| Web Service (`Dockerfile.api`) | FastAPI control plane |
| Background Worker (optional) | `engine/runner/worker.py` if you split execution off the API process |

Use `docker compose up` locally to validate this path first. Migrations run automatically on API startup via `apps/api/migrations.py`.

---

## Environment variables reference

### Vercel (frontend)

| Variable | Required | Example |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://api.riftprobe.venkatkolasani.in` |

### Render (demo API)

| Variable | Required | Notes |
|----------|----------|-------|
| `PORT` | Auto | Set by Render |
| `PYTHONPATH` | Yes | `/app` (set in `render.yaml`) |

### Full stack API (`main.py`)

| Variable | Required | Example |
|----------|----------|---------|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host/db` |
| `REDIS_URL` | Yes | `redis://host:6379/0` |
| `OPENAI_API_KEY` | Optional | For LLM mutation variants only |

---

## Troubleshooting

### Build fails: `Could not open requirements file: requirements.txt`

**Cause:** Render created a **native Python** service instead of **Docker**. Python services look for `requirements.txt` at the repo root; this project keeps deps at `apps/api/requirements.txt` and needs the full repo (`engine/`, `demo/`) in the image.

**Fix (pick one):**

#### Option A — Change existing service to Docker (fastest)

1. Render Dashboard → your `riftprobe-api` service → **Settings**
2. Scroll to **Build & Deploy**
3. Set **Environment** (or **Runtime**) to **Docker**
4. Set **Dockerfile Path** to `Dockerfile` (repo root)
5. Set **Docker Context** to `.` (repo root)
6. Clear any custom **Build Command** like `pip install -r requirements.txt`
7. **Manual Deploy** → Deploy latest commit

Build logs should show `docker build`, not `pip install -r requirements.txt`.

#### Option B — Delete and recreate via Blueprint

1. Delete the broken web service
2. **New** → **Blueprint** → connect `RiftProbe` repo
3. Apply `render.yaml` — it sets `runtime: docker` explicitly
4. Wait for deploy, then verify:

   ```bash
   curl https://riftprobe-api.onrender.com/health
   ```

#### Option C — Manual Docker web service (no Blueprint)

1. **New** → **Web Service** → connect repo
2. **Language / Runtime:** **Docker** (not Python)
3. **Dockerfile Path:** `Dockerfile`
4. **Health Check Path:** `/health`
5. Deploy

### UI shows "API error" or buttons do nothing

- Confirm `NEXT_PUBLIC_API_URL` is set in Vercel and you **redeployed** after setting it.
- Open browser DevTools → Network → check requests go to your Render URL, not `localhost:8000`.
- Hit `https://<api-url>/health` directly.

### Render cold start / slow first load

Free tier sleeps after 15 min idle. Warm it up:

```bash
curl https://riftprobe-api.onrender.com/health
```

Wait ~30s, then start the demo.

### CORS errors

The demo API allows all origins (`allow_origins=["*"]`). If you see CORS errors, the request is likely hitting the wrong host.

### Data disappeared mid-demo

The demo API stores runs/failures/regressions **in memory**. Any deploy, restart, or new Render instance clears state. Restart from Step 1 (Baseline) of the demo script.

### `docker compose` API unhealthy

```bash
docker compose logs api
docker compose ps
```

Ensure Postgres and Redis health checks pass before the API starts.

---

## DNS checklist

| Record | Type | Value |
|--------|------|-------|
| `riftprobe.venkatkolasani.in` | CNAME or A | Vercel |
| `api.riftprobe.venkatkolasani.in` | CNAME | Render service hostname |

---

## Related files

| File | Purpose |
|------|---------|
| `render.yaml` | Render Blueprint (one-click API deploy) |
| `infra/docker/Dockerfile.api.demo` | Demo API Docker image |
| `infra/docker/Dockerfile.api` | Full control plane API image |
| `docker-compose.yml` | Local full stack |
| `apps/api/standalone_demo_server.py` | Demo API (cloud + local UI path) |
| `apps/api/main.py` | Full control plane API |
