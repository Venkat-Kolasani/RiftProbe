import time
import uuid
import asyncio
from typing import Dict, Any, List, Optional
from sqlalchemy import select

from apps.api.database import AsyncSessionLocal
from apps.api.models import Scenario, Run, Trace, AgentVersion
from demo.retailops.state import RetailOpsState
from demo.retailops.agent import RetailOpsAgent

async def execute_scenario(run_id: str, scenario_id: str, version_label: str) -> Optional[str]:
    start_time = time.time()
    
    async with AsyncSessionLocal() as session:
        # 1. Fetch Scenario & Run details from DB
        stmt = select(Scenario).where(Scenario.id == uuid.UUID(scenario_id))
        res = await session.execute(stmt)
        scenario_obj = res.scalar_one_or_none()
        if not scenario_obj:
            print(f"Scenario {scenario_id} not found.")
            return None

        # 2. Setup RetailOps state with state_patch
        state = RetailOpsState(state_patch=scenario_obj.state_patch)

        # 3. Instantiate RetailOps agent with fault injections
        agent = RetailOpsAgent(
            version=version_label,
            state=state,
            fault_injections=scenario_obj.fault_injections
        )

        # 4. Execute user turns against agent and collect trajectory events
        trajectory_events: List[Dict[str, Any]] = []
        for turn in scenario_obj.user_turns:
            run_result = agent.run(user_message=turn)
            trajectory_events.extend(run_result.get("events", []))

        end_time = time.time()
        latency_ms = int((end_time - start_time) * 1000)

        # 5. Build full trace record
        trace_record = Trace(
            run_id=uuid.UUID(run_id),
            scenario_id=uuid.UUID(scenario_id),
            events={
                "trajectory": trajectory_events,
                "latency_ms": latency_ms,
                "fault_injections": scenario_obj.fault_injections,
                "expected_invariants": scenario_obj.expected_invariants
            }
        )
        session.add(trace_record)
        await session.commit()
        await session.refresh(trace_record)
        return str(trace_record.id)

async def run_worker_loop(single_run_id: Optional[str] = None):
    from engine.runner.job_queue import ScenarioQueue
    queue = ScenarioQueue()
    print("Runner worker started, polling Redis queue...")

    while True:
        job = await queue.dequeue_scenario(timeout=2)
        if not job:
            if single_run_id:
                # If we're draining a specific run, exit once queue is empty
                q_len = await queue.queue_length()
                if q_len == 0:
                    break
            await asyncio.sleep(0.5)
            continue

        run_id = job["run_id"]
        scenario_id = job["scenario_id"]
        version_label = job["version_label"]

        print(f"Worker executing scenario {scenario_id} for run {run_id} ({version_label})...")
        trace_id = await execute_scenario(run_id, scenario_id, version_label)
        print(f"Finished scenario {scenario_id}, created trace {trace_id}")
