import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.database import get_db
from apps.api.models import Failure, Scenario, RegressionTest, AgentVersion
from engine.regressions.synthesizer import synthesize_regression_spec, replay_regression_test

router = APIRouter(prefix="/v1/regressions", tags=["regressions"])

class CreateRegressionRequest(BaseModel):
    failure_id: str = Field(..., description="Confirmed failure ID to turn into a permanent regression test")
    threshold: float = Field(default=1.0, ge=0.0, le=1.0, description="Passing score threshold")

class ReplayRegressionRequest(BaseModel):
    version_label: str = Field(default="v1.1", description="Agent version to replay regression against")

@router.post("", status_code=201)
async def create_regression_test(
    req: CreateRegressionRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        f_uuid = uuid.UUID(req.failure_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid failure_id format")

    # Fetch failure and its reproducing scenario
    stmt_f = select(Failure).where(Failure.id == f_uuid)
    res_f = await db.execute(stmt_f)
    failure_obj = res_f.scalar_one_or_none()
    if not failure_obj:
        raise HTTPException(status_code=404, detail="Failure record not found")

    stmt_s = select(Scenario).where(Scenario.id == failure_obj.scenario_id)
    res_s = await db.execute(stmt_s)
    scenario_obj = res_s.scalar_one_or_none()
    if not scenario_obj:
        raise HTTPException(status_code=404, detail="Reproducing scenario not found")

    # Synthesize spec
    spec = synthesize_regression_spec(
        failure_id=str(failure_obj.id),
        scenario_obj=scenario_obj,
        failure_obj=failure_obj,
        threshold=req.threshold
    )

    regression_record = RegressionTest(
        source_failure_id=failure_obj.id,
        spec=spec,
        threshold=req.threshold
    )
    db.add(regression_record)
    await db.commit()
    await db.refresh(regression_record)

    return {
        "id": str(regression_record.id),
        "source_failure_id": str(failure_obj.id),
        "threshold": regression_record.threshold,
        "spec": regression_record.spec,
        "created_at": regression_record.created_at.isoformat()
    }

@router.get("")
async def list_regression_tests(db: AsyncSession = Depends(get_db)):
    stmt = select(RegressionTest)
    res = await db.execute(stmt)
    tests = res.scalars().all()

    items = []
    for t in tests:
        spec = t.spec or {}
        sc = spec.get("scenario", {})
        items.append({
            "id": str(t.id),
            "source_failure_id": str(t.source_failure_id),
            "goal": sc.get("goal", "Regression test"),
            "threshold": t.threshold,
            "expected_invariants": sc.get("expected_invariants", []),
            "created_at": t.created_at.isoformat()
        })

    return {
        "total": len(items),
        "regression_tests": items
    }

@router.post("/{id}/replay")
async def replay_regression_endpoint(
    id: str,
    req: ReplayRegressionRequest,
    db: AsyncSession = Depends(get_db)
):
    try:
        t_uuid = uuid.UUID(id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid regression test ID format")

    stmt = select(RegressionTest).where(RegressionTest.id == t_uuid)
    res = await db.execute(stmt)
    reg_test = res.scalar_one_or_none()
    if not reg_test:
        raise HTTPException(status_code=404, detail="Regression test not found")

    replay_result = replay_regression_test(
        spec=reg_test.spec,
        agent_version=req.version_label
    )

    return {
        "regression_test_id": str(reg_test.id),
        "agent_version": req.version_label,
        "passed": replay_result["passed"],
        "verdict": replay_result["verdict"],
        "score": replay_result["score"],
        "violated_invariants": replay_result["violated_invariants"],
        "latency_ms": replay_result["latency_ms"]
    }
