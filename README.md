# RiftProbe

RiftProbe is a developer platform that discovers behavioral failures in AI agents through adaptive experimentation, not fixed test sets, and converts every confirmed failure into a permanent regression test.

## Project Structure

```
riftprobe/
├── apps/
│   ├── web/          # Next.js app, TypeScript
│   └── api/          # FastAPI app, Python
├── engine/
│   ├── scenarios/    # Scenario schema, baseline generator, mutation engine
│   ├── runner/       # Worker and agent adapters
│   ├── evaluation/   # Deterministic evaluator + LLM judge fallback
│   ├── mining/       # Category-based failure clustering
│   └── regressions/  # Regression synthesis and replay
├── demo/
│   └── retailops/    # RetailOps simulated agent and sandbox
├── infra/
│   ├── docker/       # Docker configuration
│   └── migrations/   # Database migrations
└── README.md
```

## Running with Docker Compose

```bash
docker compose up --build
```

Services:
- Web UI: http://localhost:3000
- API Server: http://localhost:8000 (Health check: http://localhost:8000/health)
- Postgres: localhost:5432
- Redis: localhost:6379
