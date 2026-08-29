from typing import List, Dict, Any
from collections import defaultdict

def compute_cluster_key(category: str, violated_invariant: str) -> str:
    """Computes cluster_key = fault_category + violated_invariant tuple string."""
    return f"{category}:{violated_invariant}"

def group_failures_by_cluster(failures: List[Any]) -> List[Dict[str, Any]]:
    """
    Groups failure records sharing a cluster_key into failure clusters
    with frequency, highest severity, and a representative failure.
    """
    clusters: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
        "cluster_key": "",
        "category": "",
        "frequency": 0,
        "severity": "medium",
        "representative_failure": None,
        "failures": []
    })

    severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}

    for f in failures:
        # Handle dict or ORM model object
        if hasattr(f, "cluster_key"):
            ckey = f.cluster_key
            cat = f.category
            sev = f.severity
            fid = str(f.id)
            sc_id = str(f.scenario_id)
            ev = f.evidence
            created_at = f.created_at.isoformat() if hasattr(f.created_at, "isoformat") else str(f.created_at)
        else:
            ckey = f.get("cluster_key", "")
            cat = f.get("category", "")
            sev = f.get("severity", "medium")
            fid = f.get("id")
            sc_id = f.get("scenario_id")
            ev = f.get("evidence", {})
            created_at = f.get("created_at")

        cluster = clusters[ckey]
        cluster["cluster_key"] = ckey
        cluster["category"] = cat
        cluster["frequency"] += 1
        
        # Track highest severity
        if severity_order.get(sev, 1) >= severity_order.get(cluster["severity"], 1):
            cluster["severity"] = sev

        failure_item = {
            "id": fid,
            "scenario_id": sc_id,
            "severity": sev,
            "evidence": ev,
            "created_at": created_at
        }
        cluster["failures"].append(failure_item)

        # Set representative failure (keep first encountered unless higher severity comes along)
        if cluster["representative_failure"] is None:
            cluster["representative_failure"] = failure_item

    return list(clusters.values())
