# RiftProbe

RiftProbe is a developer platform that discovers behavioral failures in AI agents through adaptive experimentation, not fixed test sets, and converts every confirmed failure into a permanent regression test.

## Running the Demo Reset / Verification

To reset the system and execute the complete end-to-end demo path (Baseline Run &rarr; Failure Discovery &rarr; Adversarial Mutation &rarr; Clustering &rarr; Permanent Regression Creation &rarr; Release Gate Flip from BLOCK to PASS):

```bash
make demo
```

## Running Unit and Integration Tests

```bash
make test
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
