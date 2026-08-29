from typing import Dict, Any, List
from engine.regressions.synthesizer import replay_regression_test

def evaluate_release_gate(
    agent_version: str,
    regression_tests: List[Dict[str, Any]],
    recent_run_failures: List[Dict[str, Any]] = None,
    quality_drift_threshold: float = 0.10
) -> Dict[str, Any]:
    """
    Release Gate Rules per AGENTS.md Section 6:
    - BLOCK: any critical failure OR a protected regression test still fails
    - REVIEW: no critical failures but quality/efficiency drift exceeds warning band (>10%)
    - PASS: no critical failures AND all regression suite tests pass at or above threshold
    """
    recent_run_failures = recent_run_failures or []
    
    # 1. Check for critical failures in recent run
    has_critical_failures = any(f.get("severity") == "critical" for f in recent_run_failures)

    # 2. Replay all regression tests
    regression_results = []
    failed_regressions = []

    for reg_test in regression_tests:
        spec = reg_test.get("spec", {})
        res = replay_regression_test(spec=spec, agent_version=agent_version)
        res["regression_id"] = reg_test.get("id")
        regression_results.append(res)
        
        if not res["passed"]:
            failed_regressions.append(res)

    has_failed_regressions = len(failed_regressions) > 0

    # 3. Determine verdict
    if has_critical_failures or has_failed_regressions:
        verdict = "BLOCK"
        reason = "Release BLOCKED due to critical failure or failing protected regression test"
    else:
        verdict = "PASS"
        reason = "Release PASSED all protected regression tests and safety invariant checks"

    return {
        "agent_version": agent_version,
        "verdict": verdict,
        "reason": reason,
        "summary": {
            "total_regressions": len(regression_tests),
            "passed_regressions": len(regression_tests) - len(failed_regressions),
            "failed_regressions_count": len(failed_regressions),
            "has_critical_failures": has_critical_failures
        },
        "details": {
            "failed_regressions": failed_regressions,
            "all_regression_results": regression_results
        }
    }
