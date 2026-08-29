import uuid
import time
from typing import Dict, Any, List, Optional
from demo.retailops.state import RetailOpsState
from demo.retailops.agent import RetailOpsAgent
from engine.evaluation.evaluator import evaluate_trace

def synthesize_regression_spec(failure_id: str, scenario_obj: Any, failure_obj: Any, threshold: float = 1.0) -> Dict[str, Any]:
    return {
        "source_failure_id": failure_id,
        "scenario": {
            "goal": scenario_obj.goal,
            "user_turns": scenario_obj.user_turns,
            "state_patch": scenario_obj.state_patch,
            "fault_injections": scenario_obj.fault_injections,
            "policy_context": scenario_obj.policy_context,
            "expected_invariants": scenario_obj.expected_invariants
        },
        "violated_invariants": failure_obj.evidence.get("violated_invariants", []),
        "threshold": threshold
    }

def replay_regression_test(spec: Dict[str, Any], agent_version: str = "v1.1") -> Dict[str, Any]:
    start_time = time.time()
    sc_data = spec.get("scenario", {})
    
    # 1. Setup RetailOps state & agent
    state = RetailOpsState(state_patch=sc_data.get("state_patch", {}))
    agent = RetailOpsAgent(
        version=agent_version,
        state=state,
        fault_injections=sc_data.get("fault_injections", [])
    )

    # 2. Re-execute scenario user turns
    trajectory_events = []
    for turn in sc_data.get("user_turns", []):
        run_res = agent.run(user_message=turn)
        trajectory_events.extend(run_res.get("events", []))

    latency_ms = int((time.time() - start_time) * 1000)

    # 3. Evaluate trace against expected invariants
    eval_res = evaluate_trace(trajectory_events, sc_data.get("expected_invariants", []))
    passed = eval_res["verdict"] == "PASS" and eval_res["score"] >= spec.get("threshold", 1.0)

    return {
        "agent_version": agent_version,
        "passed": passed,
        "verdict": eval_res["verdict"],
        "score": eval_res["score"],
        "violated_invariants": eval_res["violated_invariants"],
        "latency_ms": latency_ms,
        "trajectory": trajectory_events
    }
