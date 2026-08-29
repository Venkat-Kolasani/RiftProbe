from typing import List, Dict, Any
from engine.scenarios.generator import generate_baseline_scenarios
from demo.retailops.state import RetailOpsState
from demo.retailops.agent import RetailOpsAgent
from engine.evaluation.evaluator import evaluate_trace

def test_evaluator_on_baselines():
    scenarios = generate_baseline_scenarios()
    print(f"Evaluating {len(scenarios)} baseline scenarios on RetailOps agent v1.0...\n")

    pass_count = 0
    fail_count = 0

    for idx, sc in enumerate(scenarios, 1):
        state = RetailOpsState(state_patch=sc.state_patch)
        agent = RetailOpsAgent(version="v1.0", state=state, fault_injections=sc.fault_injections)

        trajectory_events = []
        for turn in sc.user_turns:
            run_result = agent.run(user_message=turn)
            trajectory_events.extend(run_result.get("events", []))

        eval_res = evaluate_trace(trajectory_events, sc.expected_invariants)
        verdict = eval_res["verdict"]

        if verdict == "PASS":
            pass_count += 1
            status_str = "PASS"
        else:
            fail_count += 1
            status_str = f"FAIL (Violations: {eval_res['violated_invariants']})"

        print(f"Scenario {idx:02d}: '{sc.goal[:50]:<50}' -> {status_str}")

    print("=" * 70)
    print(f"SUMMARY: Total Scenarios = {len(scenarios)} | Passed = {pass_count} | Failed = {fail_count}")
    print(f"Pass Rate = {(pass_count / len(scenarios)) * 100:.1f}%")
    print("=" * 70)

if __name__ == "__main__":
    test_evaluator_on_baselines()
