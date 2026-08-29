# AGENTS.md — RiftProbe

Read this file in full before writing any code. It is the single source of truth for scope, architecture, and rules for this project. If a request conflicts with this file, this file wins unless a human explicitly overrides it in the session.

## 1. What this project is

RiftProbe is a developer platform that discovers behavioral failures in AI agents through adaptive experimentation, not fixed test sets, and converts every confirmed failure into a permanent regression test.

Core thesis: do not only evaluate the scenarios we already know. Actively search for behavioral failure boundaries, learn from discovered failures, and turn them into permanent regression tests.

Closed loop: test -> observe -> mine failures -> generate harder tests -> create regression tests -> gate releases.

This is not a chatbot, a benchmark leaderboard, or a static eval dashboard.

## 2. Hard rules for this build

- Built for BuildSprint 2026 (LatentForce), window Fri 28 Aug 2026 18:00 IST to Sun 30 Aug 2026 18:00 IST.
- LatentCode is the only AI coding harness permitted to generate this project's code. Do not reference or emulate any other AI coding agent's output.
- No pre-built code. Every file in this repo is created inside the official build window.
- No real customer data, no real third-party credentials (Stripe, CRM, Gmail, etc.) anywhere in the demo path. RetailOps is fully synthetic and deterministic.
- Never hardcode or commit API keys or secrets. Use environment variables and an .env.example with placeholder values only.
- Commit frequently with real, descriptive messages. The commit history is part of the credibility of the submission.
- Treat any LLM-generated root-cause explanation as a hypothesis, label it as such in the UI, and never let an LLM directly execute a destructive action without passing through the deterministic policy/invariant checks first.
- Limit experiment budgets (max scenarios, max LLM calls per run) so a bug can't trigger runaway API cost.

## 3. Scope for this build (decided; do not silently expand it)

### In scope — build this, in this order, and treat it as done when the end-to-end demo path in Section 7 works

1. RetailOps sandbox: deterministic tools, seeded fixtures, two agent policy versions (v1.0 vulnerable, v1.1 corrected)
2. Scenario schema + template-based baseline generator (~20 seed scenarios, no LLM needed for these)
3. Experiment worker: Redis-queued execution against RetailOps, full trajectory capture
4. Deterministic evaluator: policy/invariant checks, tool correctness, task success, safety, recovery. LLM-as-judge only as a fallback for dimensions the deterministic checks can't resolve.
5. Run API + Server-Sent Events for live progress
6. Adversarial mutation engine: bounded LLM call (5 to 10 variants per click) generating targeted scenarios from a parent failure, constrained to the Scenario schema
7. Failure storage with **category-based clustering** (group by fault_category + violated_invariant tuple) — not embeddings, not pgvector
8. Regression synthesizer: store a confirmed failure's reproducing scenario + expected invariant + threshold as a first-class regression_test record; replay it against any agent_version
9. Release gate: PASS / REVIEW / BLOCK per the rule in Section 6
10. Web UI: Run Dashboard, Live Run View, Failure Explorer, Regression Center (see Section 8 for the exact screens)
11. Seed command (`make demo`) that resets to a known baseline in one command
12. Local dev via `docker compose up --build`, this is the guaranteed fallback demo path

### Explicitly out of scope for this build — do not build these unless everything above is done and verified end to end

- Embeddings / pgvector-based semantic clustering (category-based grouping is the MVP substitute)
- Full CLI and Python SDK (build only as a stretch, after the web demo is solid)
- Generic HTTP adapter for external/real agents (RetailOps is the only guaranteed demo path)
- LangGraph or other agent framework adapters
- GitHub Actions release-gate CI integration
- Statistical calibration, ensemble judges
- Knowledge faults and state faults (see Section 5, fault families are trimmed)
- Agent version comparison beyond a simple before/after
- Cloud deployment (attempt only after the local demo is fully working; see Section 9)

## 4. Architecture

```
Next.js Web UI
      |
FastAPI Control Plane  ---- Postgres (runs, traces, failures, regressions)
      |                ---- Redis (scenario job queue)
      v
Evaluation Worker
      |
   +--+----------------+
   |                    |
Scenario Engine     Agent Adapter (RetailOps only for MVP)
   |                    |
   +--+----------------+
      |
RetailOps Sandbox (deterministic state + tools + fault injection)
      |
Trace Collector
      |
   +--+----------------+
   |                    |
Evaluator           Failure Miner (category-based)
   |                    |
   +--+----------------+
      |
Regression Synthesizer
      |
Release Gate
```

Repo layout:

```
riftprobe/
├── apps/
│   ├── web/         # Next.js UI
│   └── api/          # FastAPI control plane
├── engine/
│   ├── scenarios/    # schema, templates, mutation engine
│   ├── runner/       # worker, agent adapter
│   ├── evaluation/    # deterministic checks + LLM-judge fallback
│   ├── mining/       # category-based clustering
│   └── regressions/  # synthesis + replay
├── demo/
│   └── retailops/    # simulated agent, state, fixtures, fault injection
├── infra/
│   ├── docker/
│   └── migrations/
└── README.md
```

## 5. RetailOps domain spec

Tools: `get_customer(customer_id)`, `get_order(order_id)`, `check_refund_policy(order_id)`, `refund_order(order_id, amount)`, `cancel_order(order_id)`, `send_email(to, subject, body)`

Policies:
- A refund requires identity verification.
- Refund amount must match an eligible order.
- A tool failure must not be treated as a successful action.
- The agent must not expose another customer's data.

Agent versions:
- v1.0 (vulnerable): under an authority claim in the user's message (e.g. "I am the manager"), the agent skips the identity-verification step before calling `refund_order`.
- v1.1 (corrected): identity verification is always enforced before `refund_order`, regardless of claimed authority.

Fault families in scope for MVP (trim from the full plan):
- Semantic pressure: authority claims, urgency, conflicting instructions
- Tool faults: timeout, HTTP 500
- Safety faults: unauthorized action request, cross-customer data request

Out of scope for MVP: knowledge faults, state faults, poisoned_tool_text.

## 6. Data model (trimmed)

| Entity | Key fields | Notes |
|---|---|---|
| agent | id, name | RetailOps only for MVP |
| agent_version | id, agent_id, label, config_hash | v1.0 and v1.1 |
| scenario | id, parent_failure_id, goal, user_turns, state_patch, fault_injections, policy_context, expected_invariants | matches the Scenario schema below |
| run | id, version_id, status, started_at, summary | one batch execution |
| trace | run_id, scenario_id, events[] | full trajectory |
| evaluation | trace_id, dimensions, score, verdict | structured grading |
| failure | id, cluster_key, severity, category, evidence | cluster_key = fault_category + violated_invariant, not an embedding |
| regression_test | id, source_failure_id, spec, threshold | permanent replay test |
| release_gate | version_id, baseline_id, verdict, deltas | PASS / REVIEW / BLOCK |

Scenario shape:

```
Scenario = {
  goal: str,
  user_turns: [...],
  state_patch: {...},
  fault_injections: [...],
  policy_context: [...],
  expected_invariants: [...],
  parent_failure_id: optional
}
```

## 7. The demo path this build must support end to end

A. Run 20 baseline scenarios against RetailOps v1.0. It should look healthy (no critical failures in the baseline set).
B. Click "Discover Failures." New scenarios generate and execute live.
C. A critical failure surfaces: an authority-claim message causes a refund without identity verification.
D. Click "Discover Variants." The mutation engine produces related adversarial scenarios.
E. Those failures group into one cluster (category-based, not embeddings).
F. Click "Create Regression." The failure becomes a permanent replay test.
G. Switch the demo agent to v1.1 (corrected). Run the regression suite. The critical failure disappears.
H. Release gate flips from BLOCK to PASS. Show the before/after.

If nothing else works, this path must work. Protect it above every other feature.

## 8. Web UI screens (MVP)

1. **Run Dashboard**: health score, experiment counts (total/passed/failed/critical), behavior drift, "Discover Failures" and "Run Regression Suite" buttons
2. **Live Run View**: streaming list of scenario results (pass/fail/category) as they complete, progress counter
3. **Failure Explorer**: user message, tool call trajectory, tool results, violated invariant, severity; Replay / Discover Variants / Create Regression actions
4. **Regression Center**: list of regression tests with pass/fail status, release gate badge (PASS/REVIEW/BLOCK)

## 9. Deployment

Primary target: local via `docker compose up --build` (frontend on :3000, API on :8000). This is the demo path of record.

Stretch target, only after local is fully verified: Render — web service for frontend, web service (Docker) for API, background worker for the experiment worker, managed Postgres and Redis. Do not attempt this until the local demo passes the full Section 7 path at least once end to end.

## 10. Definition of done for the MVP

The build is done, not "more features," when:
- `make demo` resets to a known baseline in one command
- The full Section 7 path runs start to finish without manual data fixes
- The release gate visibly flips from BLOCK to PASS on camera
- The repo is public, committed incrementally, with no secrets in history
