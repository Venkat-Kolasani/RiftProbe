import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.database import get_db, AsyncSessionLocal
from apps.api.models import Failure, Scenario, Run, AgentVersion
from engine.scenarios.mutation import mutate_failure
from engine.runner.worker import execute_scenario

router = APIRouter(prefix="/v1/failures", tags=["failures"])

class MutateFailureRequest(BaseModel):
    count: int = Field(default=6, ge=1, le=10, description="Number of adversarial variant scenarios to generate (5 to 10)")
    version_label: str = Field(default="v1.0", description="Agent version to run mutated scenarios against")

async def process_mutated_scenarios_in_background(run_id: str, scenario_ids: List[str], version_label: str):
    for sc_id in scenario_ids:
        await execute_scenario(run_id=run_id, scenario_id=sc_id, version_label=version_label)

    async with AsyncSessionLocal() as session:
        stmt = select(Run).where(Run.id == uuid.UUID(run_id))
        res = await session.execute(stmt)
        run_obj = res.scalar_one_or_none()
        if run_obj:
            run_obj.status = "completed"
            await session.commit()

@router.post("/{failure_id}/mutate", status_code=201)
async def mutate_failure_endpoint(
    failure_id: str,
    req: MutateFailureRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    try:
        f_uuid = uuid.UUID(failure_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid failure_id format")

    # Fetch parent failure
    stmt_f = select(Failure).where(Failure.id == f_uuid)
    res_f = await db.execute(stmt_f)
    parent_failure = res_f.scalar_one_or_none()
    if not parent_failure:
        raise HTTPException(status_code=404, detail="Parent failure not found")

    # Generate 5-10 mutated scenarios tagged with parent_failure_id
    mutated_scenarios_schema = mutate_failure(
        parent_failure_id=str(parent_failure.id),
        failure_evidence=parent_failure.evidence,
        count=req.count
    )

    # Save generated scenarios to DB
    created_scenarios: List[Scenario] = []
    for sc_schema in mutated_scenarios_schema:
        sc_model = Scenario(
            parent_failure_id=parent_failure.id,
            goal=sc_schema.goal,
            user_turns=sc_schema.user_turns,
            state_patch=sc_schema.state_patch,
            fault_injections=sc_schema.fault_injections,
            policy_context=sc_schema.policy_context,
            expected_invariants=sc_schema.expected_invariants
        )
        db.add(sc_model)
        created_scenarios.append(sc_model)

    await db.commit()

    # Resolve agent version
    stmt_v = select(AgentVersion).where(AgentVersion.label == req.version_label)
    res_v = await db.execute(stmt_v)
    version_obj = res_v.scalar_one_or_none()
    if not version_obj:
        raise HTTPException(status_code=404, detail=f"Agent version '{req.version_label}' not found")

    # Create new Run for mutated scenarios
    mutated_run = Run(
        version_id=version_obj.id,
        status="running",
        summary={"total_scenarios": len(created_scenarios), "parent_failure_id": str(parent_failure.id)}
    )
    db.add(mutated_run)
    await db.commit()
    await db.refresh(mutated_run)

    scenario_id_strs = [str(sc.id) for sc in created_scenarios]

    # Enqueue execution in background
    background_tasks.add_task(
        process_mutated_scenarios_in_background,
        str(mutated_run.id),
        scenario_id_strs,
        req.version_label
    )

    return {
        "parent_failure_id": str(parent_failure.id),
        "mutation_run_id": str(mutated_run.id),
        "generated_scenarios_count": len(created_scenarios),
        "scenarios": [
            {
                "id": str(sc.id),
                "goal": sc.goal,
                "user_turns": sc.user_turns
            }
            for sc in created_scenarios
        ]
    }
