# RiftProbe

RiftProbe is a developer platform that discovers behavioral failures in AI agents through adaptive experimentation — not fixed test sets — and converts every confirmed failure into a permanent regression test that gates releases.

**Live demo:** [riftprobe.venkatkolasani.in](https://riftprobe.venkatkolasani.in/)

---

## What it does

```
Baseline → Discover failures → Generate variants → Cluster → Regression test → Release gate
```

1. Run baseline scenarios against a support agent (should look healthy)
2. Hunt adversarial failures (authority claims, policy bypasses)
3. Mutate confirmed failures into harder variants
4. Group failures by category + violated invariant (not embeddings)
5. Freeze failures as permanent regression tests
6. Block broken agent versions; pass corrected ones

**RetailOps sandbox:** synthetic customers, orders, and tools. Two agent versions baked in — v1.0 (vulnerable) and v1.1 (corrected).

---

## Quick start (local)

### Standalone demo (matches cloud deployment)

```bash
# Terminal 1 — API
python3 -m venv venv && source venv/bin/activate
pip install -r apps/api/requirements.txt
PYTHONPATH=. uvicorn apps.api.standalone_demo_server:app --host 127.0.0.1 --port 8001

# Terminal 2 — Web UI
cd apps/web && npm install
NEXT_PUBLIC_API_URL=http://localhost:8001 npm run dev
```

Open http://localhost:3000

### Docker (full stack with Postgres + Redis)

```bash
docker compose up --build
```

- Web UI: http://localhost:3000
- API: http://localhost:8000/health

### Verify

```bash
make demo   # end-to-end CLI verification
make test   # unit + integration tests
```

---

## Cloud deployment

| Component | Platform | URL |
|-----------|----------|-----|
| Frontend | Vercel | https://riftprobe.venkatkolasani.in |
| Demo API | Render | `https://riftprobe-api.onrender.com` (or custom domain) |

**Deploy the API on Render in 5 minutes:**

1. Push repo to GitHub
2. [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint** → select repo
3. Apply `render.yaml` (creates `riftprobe-api` web service)
4. In Vercel, set `NEXT_PUBLIC_API_URL` to your Render API URL and redeploy

Full step-by-step guide: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

---

## Demo vs full implementation

| | Demo API (cloud) | Full stack (Docker) |
|---|---|---|
| Entrypoint | `standalone_demo_server.py` | `main.py` |
| Storage | In-memory | Postgres |
| Queue | Inline SSE | Redis |
| **Evaluator** | ✅ Real | ✅ Real |
| **RetailOps agent** | ✅ Real | ✅ Real |
| **Mutation engine** | ✅ Real | ✅ Real |
| **Release gate** | ✅ Real | ✅ Real |

The behavioral engine is the same code in both modes. The demo API trades persistent storage for simple, reliable cloud hosting.

---

## Project structure

```
riftprobe/
├── apps/
│   ├── web/          # Next.js UI (Vercel)
│   └── api/          # FastAPI control plane
├── engine/
│   ├── scenarios/    # schema, templates, mutation engine
│   ├── evaluation/   # deterministic checks + LLM-judge fallback
│   ├── mining/       # category-based clustering
│   └── regressions/  # synthesis + replay + release gate
├── demo/
│   └── retailops/    # synthetic agent, state, fault injection
├── infra/
│   ├── docker/       # Dockerfiles (api, api.demo, web)
│   └── migrations/   # Postgres schema + seed data
├── render.yaml       # Render Blueprint (one-click API deploy)
└── docker-compose.yml
```

---

## API endpoints (demo server)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/v1/runs` | Create run (`mode`: `baseline`, `discover`) |
| `GET` | `/v1/runs/{id}/events` | SSE live progress stream |
| `GET` | `/v1/failures` | List failure clusters |
| `POST` | `/v1/failures/{id}/mutate` | Generate adversarial variants |
| `POST` | `/v1/failures/{id}/replay` | Replay original failure |
| `POST` | `/v1/regressions` | Create regression test from failure |
| `GET` | `/v1/regressions` | List regressions with pass/fail per version |
| `POST` | `/v1/regressions/release-check` | Release gate verdict |

---

## License

Built for BuildSprint 2026 (LatentForce).
