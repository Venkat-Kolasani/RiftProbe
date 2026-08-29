import pytest
from fastapi.testclient import TestClient
from apps.api.standalone_demo_server import app

client = TestClient(app)

def test_standalone_demo_server():
    # 1. Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["service"] == "riftprobe-demo-api"

    # 2. Create Run
    res_run = client.post("/v1/runs", json={"version_label": "v1.0"})
    assert res_run.status_code == 201
    run_id = res_run.json()["run_id"]

    # 3. Get Run Details
    res_details = client.get(f"/v1/runs/{run_id}")
    assert res_details.status_code == 200

    # 4. Get Failures
    res_failures = client.get(f"/v1/runs/{run_id}/failures")
    assert res_failures.status_code == 200
    assert res_failures.json()["total_failures"] == 1

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
