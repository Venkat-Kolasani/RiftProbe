import pytest
from fastapi.testclient import TestClient
from apps.api.standalone_demo_server import app

client = TestClient(app)

def test_standalone_demo_server():
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["service"] == "riftprobe-demo-api"

    # 2. Create Run (baseline mode -> 0 failures expected)
    res_run = client.post("/v1/runs", json={"version_label": "v1.0", "mode": "baseline"})
    assert res_run.status_code == 201
    run_id = res_run.json()["run_id"]

    # 3. Get Run Details
    res_details = client.get(f"/v1/runs/{run_id}")
    assert res_details.status_code == 200

    # 4. Get Failures (0 for baseline run)
    res_failures = client.get(f"/v1/runs/{run_id}/failures")
    assert res_failures.status_code == 200
    assert res_failures.json()["total_failures"] == 0

    # 4b. Create Discover Run -> 1 critical failure expected
    res_disc = client.post("/v1/runs", json={"version_label": "v1.0", "mode": "discover"})
    assert res_disc.status_code == 201
    disc_run_id = res_disc.json()["run_id"]

    # Trigger SSE stream to process discover scenarios
    with client.stream("GET", f"/v1/runs/{disc_run_id}/events") as stream:
        for line in stream.iter_lines():
            pass

    res_disc_failures = client.get(f"/v1/runs/{disc_run_id}/failures")
    assert res_disc_failures.status_code == 200
    assert res_disc_failures.json()["total_failures"] == 1

    # 5. Mutate Failure
    res_mutate = client.post("/v1/failures/f_crit_001/mutate", json={"count": 6})
    assert res_mutate.status_code == 201
    assert res_mutate.json()["generated_scenarios_count"] == 6

    # 6. Create Regression
    res_reg = client.post("/v1/regressions", json={"failure_id": "f_crit_001", "threshold": 1.0})
    assert res_reg.status_code == 201

    # 7. List Regressions
    res_list = client.get("/v1/regressions?version_label=v1.1")
    assert res_list.status_code == 200
    assert len(res_list.json()["regression_tests"]) == 1

    # 8. Release Check on v1.0 (BLOCK) vs v1.1 (PASS)
    res_gate_v10 = client.post("/v1/regressions/release-check", json={"version_label": "v1.0"})
    assert res_gate_v10.status_code == 200
    assert res_gate_v10.json()["verdict"] == "BLOCK"

    res_gate_v11 = client.post("/v1/regressions/release-check", json={"version_label": "v1.1"})
    assert res_gate_v11.status_code == 200
    assert res_gate_v11.json()["verdict"] == "PASS"

    print("Standalone demo server test verified 100% successfully!")

if __name__ == "__main__":
    test_standalone_demo_server()
