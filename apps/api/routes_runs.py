import uuid
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.database import get_db, get_redis_client, AsyncSessionLocal
from apps.api.models import AgentVersion, Scenario, Run, Trace, Evaluation, Failure
from engine.runner.job_queue import ScenarioQueue
from engine.runner.worker import execute_scenario
from engine.mining.miner import group_failures_by_cluster

router = APIRouter(prefix="/v1/runs", tags=["runs"])

class CreateRunRequest(BaseModel):
    version_label: str = Field(default="v1.0", description="Agent version label, e.g. v1.0 or v1.1")
    scenario_ids: Optional[List[str]] = Field(default=None, description="Optional scenario IDs to execute. If omitted, runs all scenarios.")

async def process_run_in_background(run_id: str, scenario_ids: List[str], version_label: str):
    for sc_id in scenario_ids:
        await execute_scenario(run_id=run_id, scenario_id=sc_id, version_label=version_label)
    
    # Mark run completed
    async with AsyncSessionLocal() as session:
        stmt = select(Run).where(Run.id == uuid.UUID(run_id))
        res = await session.execute(stmt)
        run_obj = res.scalar_one_or_none()
        if run_obj:
            run_obj.status = "completed"
            await session.commit()

@router.post("", status_code=201)
async def create_run(
    req: CreateRunRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    # Resolve agent version
    stmt_v = select(AgentVersion).where(AgentVersion.label == req.version_label)
    res_v = await db.execute(stmt_v)
    version_obj = res_v.scalar_one_or_none()
    if not version_obj:
        raise HTTPException(status_code=404, detail=f"Agent version '{req.version_label}' not found")

    # Resolve scenarios
    if req.scenario_ids:
        scenario_uuids = [uuid.UUID(sid) for sid in req.scenario_ids]
        stmt_sc = select(Scenario).where(Scenario.id.in_(scenario_uuids))
    else:
        stmt_sc = select(Scenario)
    
    res_sc = await db.execute(stmt_sc)
    scenarios = res_sc.scalars().all()
    if not scenarios:
        raise HTTPException(status_code=400, detail="No scenarios found to run")

    # Create Run record
    run_obj = Run(
        version_id=version_obj.id,
        status="running",
        summary={"total_scenarios": len(scenarios)}
    )
    db.add(run_obj)
    await db.commit()
    await db.refresh(run_obj)

    scenario_id_strs = [str(sc.id) for sc in scenarios]

    # Enqueue background execution task
    background_tasks.add_task(process_run_in_background, str(run_obj.id), scenario_id_strs, req.version_label)

    return {
        "run_id": str(run_obj.id),
        "status": run_obj.status,
        "version_label": req.version_label,
        "scenarios_count": len(scenarios)
    }

@router.get("/{run_id}")
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)):
    try:
        r_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id format")

    stmt = select(Run).where(Run.id == r_uuid)
    res = await db.execute(stmt)
    run_obj = res.scalar_one_or_none()
    if not run_obj:
        raise HTTPException(status_code=404, detail="Run not found")

    # Fetch traces and evaluations
    stmt_traces = select(Trace).where(Trace.run_id == r_uuid)
    res_traces = await db.execute(stmt_traces)
    traces = res_traces.scalars().all()

    trace_ids = [t.id for t in traces]
    evals = []
    if trace_ids:
        stmt_evals = select(Evaluation).where(Evaluation.trace_id.in_(trace_ids))
        res_evals = await db.execute(stmt_evals)
        evals = res_evals.scalars().all()

    total_scenarios = run_obj.summary.get("total_scenarios", len(traces))
    completed_scenarios = len(traces)
    passed_count = sum(1 for e in evals if e.verdict == "PASS")
    failed_count = sum(1 for e in evals if e.verdict == "FAIL")

    # Calculate health score (passed / completed)
    health_score = round((passed_count / completed_scenarios) * 100, 1) if completed_scenarios > 0 else 100.0

    return {
        "id": str(run_obj.id),
        "status": run_obj.status,
        "version_id": str(run_obj.version_id),
        "started_at": run_obj.started_at.isoformat() if run_obj.started_at else None,
        "summary": {
            "total_scenarios": total_scenarios,
            "completed_scenarios": completed_scenarios,
            "passed_count": passed_count,
            "failed_count": failed_count,
            "health_score": health_score
        }
    }

@router.get("/{run_id}/failures")
async def get_run_failures(run_id: str, db: AsyncSession = Depends(get_db)):
    try:
        r_uuid = uuid.UUID(run_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid run_id format")

    stmt = select(Failure).where(Failure.run_id == r_uuid)
    res = await db.execute(stmt)
    failures = res.scalars().all()

    failure_clusters = group_failures_by_cluster(failures)

    return {
        "run_id": run_id,
        "total_failures": len(failures),
        "total_clusters": len(failure_clusters),
        "failure_clusters": failure_clusters,
        "failures": [
            {
                "id": str(f.id),
                "scenario_id": str(f.scenario_id),
                "cluster_key": f.cluster_key,
                "severity": f.severity,
                "category": f.category,
                "evidence": f.evidence,
                "created_at": f.created_at.isoformat()
            }
            for f in failures
        ]
    }

@router.get("/{run_id}/events")
async def stream_run_events(run_id: str):
    async def event_generator():
        redis_client = get_redis_client()
        pubsub = redis_client.pubsub()
        channel_name = f"run_events:{run_id}"
        await pubsub.subscribe(channel_name)

        yield f"event: connected\ndata: {json.dumps({'message': f'Subscribed to run {run_id}'})}\n\n"

        try:
            timeout_counter = 0
            while True:
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    data = message.get("data")
                    yield f"data: {data}\n\n"
                    timeout_counter = 0
                else:
                    timeout_counter += 1
                    # Send periodic keepalive heartbeat
                    yield ": keepalive\n\n"
                    if timeout_counter > 60:  # Exit after 60s idle
                        break
                await asyncio.sleep(0.5)
        finally:
            await pubsub.unsubscribe(channel_name)
            await redis_client.aclose()

    return StreamingResponse(event_generator(), media_type="text/event-stream")
