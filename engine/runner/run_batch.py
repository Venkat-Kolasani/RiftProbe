import asyncio
import uuid
from typing import Optional
from sqlalchemy import select

from apps.api.database import AsyncSessionLocal
from apps.api.models import AgentVersion, Scenario, Run
from engine.scenarios.generator import generate_baseline_scenarios
from engine.runner.job_queue import ScenarioQueue
from engine.runner.worker import run_worker_loop

async def run_baseline_batch(version_label: str = "v1.0") -> str:
    async with AsyncSessionLocal() as session:
        # 1. Resolve agent version
        stmt = select(AgentVersion).where(AgentVersion.label == version_label)
        res = await session.execute(stmt)
        v_obj = res.scalar_one_or_none()
        if not v_obj:
            raise ValueError(f"Agent version '{version_label}' not found in DB.")

        # 2. Fetch or seed baseline scenarios
        stmt_sc = select(Scenario)
        res_sc = await session.execute(stmt_sc)
        scenarios = res_sc.scalars().all()

        if len(scenarios) < 20:
            print("Seeding baseline scenarios...")
            baseline_scenarios = generate_baseline_scenarios()
            for s in baseline_scenarios:
                sc_model = Scenario(
                    goal=s.goal,
                    user_turns=s.user_turns,
                    state_patch=s.state_patch,
                    fault_injections=s.fault_injections,
                    policy_context=s.policy_context,
                    expected_invariants=s.expected_invariants
                )
                session.add(sc_model)
            await session.commit()
            
            res_sc = await session.execute(select(Scenario))
            scenarios = res_sc.scalars().all()

        # 3. Create a new Run record
        run_obj = Run(
            version_id=v_obj.id,
            status="running",
            summary={"scenario_count": len(scenarios)}
        )
        session.add(run_obj)
        await session.commit()
        await session.refresh(run_obj)
        run_id = str(run_obj.id)

        print(f"Created Run {run_id} for agent version '{version_label}' with {len(scenarios)} scenarios.")

        # 4. Enqueue scenarios into Redis
        queue = ScenarioQueue()
        for sc in scenarios:
            await queue.enqueue_scenario(run_id=run_id, scenario_id=str(sc.id), version_label=version_label)

        # 5. Process queue until empty
        await run_worker_loop(single_run_id=run_id)

        # 6. Mark run completed
        run_obj.status = "completed"
        await session.commit()

        print(f"Batch run {run_id} completed successfully!")
        return run_id

if __name__ == "__main__":
    asyncio.run(run_baseline_batch("v1.0"))
