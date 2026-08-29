import asyncio
import uuid
from typing import Dict, Any, List
from demo.retailops.state import RetailOpsState
from demo.retailops.agent import RetailOpsAgent
from engine.scenarios.generator import generate_baseline_scenarios

class MockTraceCollector:
    def __init__(self):
        self.traces: List[Dict[str, Any]] = []

    def record_trace(self, scenario_goal: str, version_label: str, events: List[Dict[str, Any]], latency_ms: int):
        trace_record = {
            "trace_id": str(uuid.uuid4()),
            "scenario_goal": scenario_goal,
            "version_label": version_label,
            "events_count": len(events),
            "latency_ms": latency_ms,
            "events": events
        }
        self.traces.append(trace_record)
        return trace_record

def run_mock_baseline_batch(version_label: str = "v1.0"):
    scenarios = generate_baseline_scenarios()
    collector = MockTraceCollector()

    print(f"Executing batch runner for {len(scenarios)} scenarios on agent version '{version_label}'...")
    
    for idx, sc in enumerate(scenarios, 1):
        state = RetailOpsState(state_patch=sc.state_patch)
        agent = RetailOpsAgent(
            version=version_label,
            state=state,
            fault_injections=sc.fault_injections
        )

        trajectory_events = []
        for turn in sc.user_turns:
            run_result = agent.run(user_message=turn)
            trajectory_events.extend(run_result.get("events", []))

        trace = collector.record_trace(
            scenario_goal=sc.goal,
            version_label=version_label,
            events=trajectory_events,
            latency_ms=12
        )
        print(f"  [{idx}/{len(scenarios)}] Executed: '{sc.goal}' -> Recorded Trace {trace['trace_id'][:8]} ({len(trajectory_events)} events)")

    print(f"\nBatch run completed! Total traces collected: {len(collector.traces)}")
    return collector.traces

if __name__ == "__main__":
    run_mock_baseline_batch("v1.0")
