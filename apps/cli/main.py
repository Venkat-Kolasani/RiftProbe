import argparse
import sys
import json
import httpx

API_BASE = "http://localhost:8000"

def init_cmd(args):
    print(f"Initializing RiftProbe environment against API {API_BASE}...")
    try:
        res = httpx.get(f"{API_BASE}/health")
        if res.status_code == 200:
            print(f"Connected to API successfully! Health: {res.json()}")
        else:
            print(f"API health check failed with status {res.status_code}")
    except Exception as e:
        print(f"Failed to connect to API: {e}")

def run_cmd(args):
    version = args.version or "v1.0"
    print(f"Triggering scenario batch run for agent version '{version}'...")
    try:
        res = httpx.post(f"{API_BASE}/v1/runs", json={"version_label": version})
        if res.status_code == 201:
            data = res.json()
            print(f"Run started! Run ID: {data['run_id']} | Scenarios Count: {data['scenarios_count']}")
        else:
            print(f"Failed to start run: {res.text}")
    except Exception as e:
        print(f"Error calling API: {e}")

def failures_cmd(args):
    run_id = args.run_id
    print(f"Fetching failure clusters for run '{run_id}'...")
    try:
        res = httpx.get(f"{API_BASE}/v1/runs/{run_id}/failures")
        if res.status_code == 200:
            data = res.json()
            print(f"Total Failures: {data.get('total_failures', 0)} | Total Clusters: {data.get('total_clusters', 0)}")
            print(json.dumps(data.get("failure_clusters", []), indent=2))
        else:
            print(f"Failed to fetch failures: {res.text}")
    except Exception as e:
        print(f"Error calling API: {e}")

def regression_create_cmd(args):
    failure_id = args.failure_id
    threshold = args.threshold or 1.0
    print(f"Creating permanent regression test for failure '{failure_id}'...")
    try:
        res = httpx.post(f"{API_BASE}/v1/regressions", json={"failure_id": failure_id, "threshold": threshold})
        if res.status_code == 201:
            data = res.json()
            print(f"Regression test created! ID: {data['id']} | Threshold: {data['threshold']}")
        else:
            print(f"Failed to create regression test: {res.text}")
    except Exception as e:
        print(f"Error calling API: {e}")

def release_check_cmd(args):
    version = args.version or "v1.0"
    print(f"Evaluating Release Gate check for agent version '{version}'...")
    try:
        res = httpx.post(f"{API_BASE}/v1/regressions/release-check", json={"version_label": version})
        if res.status_code == 200:
            data = res.json()
            print(f"==================================================")
            print(f"RELEASE GATE VERDICT: {data['verdict']}")
            print(f"Reason: {data['reason']}")
            print(f"Summary: {json.dumps(data['summary'], indent=2)}")
            print(f"==================================================")
        else:
            print(f"Failed to perform release check: {res.text}")
    except Exception as e:
        print(f"Error calling API: {e}")

def main():
    parser = argparse.ArgumentParser(prog="riftprobe", description="RiftProbe CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # riftprobe init
    subparsers.add_parser("init", help="Initialize and check RiftProbe API environment")

    # riftprobe run --version v1.0
    run_p = subparsers.add_parser("run", help="Trigger scenario run")
    run_p.add_argument("--version", "-v", default="v1.0", help="Agent version label")

    # riftprobe failures --run-id <id>
    fail_p = subparsers.add_parser("failures", help="List failure clusters for a run")
    fail_p.add_argument("--run-id", "-r", required=True, help="Run ID")

    # riftprobe regression create --failure-id <id>
    reg_p = subparsers.add_parser("regression-create", help="Create permanent regression test")
    reg_p.add_argument("--failure-id", "-f", required=True, help="Failure ID")
    reg_p.add_argument("--threshold", "-t", type=float, default=1.0, help="Score threshold")

    # riftprobe release-check --version v1.0
    gate_p = subparsers.add_parser("release-check", help="Evaluate Release Gate verdict")
    gate_p.add_argument("--version", "-v", default="v1.0", help="Agent version label")

    args = parser.parse_args()

    if args.command == "init":
        init_cmd(args)
    elif args.command == "run":
        run_cmd(args)
    elif args.command == "failures":
        failures_cmd(args)
    elif args.command == "regression-create":
        regression_create_cmd(args)
    elif args.command == "release-check":
        release_check_cmd(args)

if __name__ == "__main__":
    main()
