import time
import uuid
import json
import asyncio
from typing import Dict, Any, List, Optional
from sqlalchemy import select

from apps.api.database import AsyncSessionLocal, get_redis_client
from apps.api.models import Scenario, Run, Trace, AgentVersion, Evaluation, Failure
from demo.retailops.state import RetailOpsState
from demo.retailops.agent import RetailOpsAgent
from engine.evaluation.evaluator import evaluate_trace

async def execute_scenario(run_id: str, scenario_id: str, version_label: str) -> Optional[str]:
    start_time = time.time()
    
    async with AsyncSessionLocal() as session:
        # 1. Fetch Scenario & Run details
        stmt = select(Scenario).where(Scenario.id == uuid.UUID(scenario_id))
        res = await session.execute(stmt)
        scenario_obj = res.scalar_one_or_none()
        if not scenario_obj:
            print(f"Scenario {scenario_id} not found.")
            return None

        # 2. Setup RetailOps state
        state = RetailOpsState(state_patch=scenario_obj.state_patch)

        # 3. Instantiate RetailOps agent
        agent = RetailOpsAgent(
            version=version_label,
            state=state,
            fault_injections=scenario_obj.fault_injections
        )

        # 4. Execute user turns
        trajectory_events: List[Dict[str, Any]] = []
        for turn in scenario_obj.user_turns:
            run_result = agent.run(user_message=turn)
            trajectory_events.extend(run_result.get("events", []))

        end_time = time.time()
        latency_ms = int((end_time - start_time) * 1000)

        # 5. Save Trace record
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

        # 6. Evaluate trace
        eval_res = evaluate_trace(trajectory_events, scenario_obj.expected_invariants)
        eval_record = Evaluation(
            trace_id=trace_record.id,
            dimensions=eval_res["dimensions"],
            score=eval_res["score"],
            verdict=eval_res["verdict"]
        )
        session.add(eval_record)

        # 7. Record Failure if evaluation failed
        failure_id = None
        if eval_res["verdict"] == "FAIL":
            violated = eval_res["violated_invariants"]
            first_violated = violated[0] if violated else "unspecified_failure"
            category = "semantic_pressure" if "identity_verification" in first_violated else "tool_fault"
            cluster_key = f"{category}:{first_violated}"
            
            failure_record = Failure(
                trace_id=trace_record.id,
                scenario_id=scenario_obj.id,
                run_id=uuid.UUID(run_id),
                cluster_key=cluster_key,
                severity="critical" if "identity_verification" in first_violated else "high",
                category=category,
                evidence={
                    "violated_invariants": violated,
                    "goal": scenario_obj.goal,
                    "trajectory_summary": [e.get("content") or e.get("tool") for e in trajectory_events]
                }
            )
            session.add(failure_record)
            await session.commit()
            await session.refresh(failure_record)
            failure_id = str(failure_record.id)
        else:
            await session.commit()

        # 8. Publish completion event to Redis PubSub channel
        try:
            redis_client = get_redis_client()
            event_payload = {
                "event_type": "scenario_completed",
                "run_id": run_id,
                "scenario_id": scenario_id,
                "trace_id": str(trace_record.id),
                "goal": scenario_obj.goal,
                "verdict": eval_res["verdict"],
                "score": eval_res["score"],
                "violated_invariants": eval_res["violated_invariants"],
                "failure_id": failure_id
            }
            channel_name = f"run_events:{run_id}"
            await redis_client.publish(channel_name, json.dumps(event_payload))
            await redis_client.aclose()
        except Exception as pe:
            print(f"Warning: Failed to publish PubSub event for run {run_id}: {pe}")

        return str(trace_record.id)

async def run_worker_loop(single_run_id: Optional[str] = None):
    from engine.runner.job_queue import ScenarioQueue
    queue = ScenarioQueue()
    print("Runner worker started, polling Redis queue...")

    while True:
        job = await queue.dequeue_scenario(timeout=2)
        if not job:
            if single_run_id:
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
