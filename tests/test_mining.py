import pytest
from unittest.mock import MagicMock
from engine.mining.miner import compute_cluster_key, group_failures_by_cluster

def test_compute_cluster_key():
    ckey = compute_cluster_key("semantic_pressure", "identity_verification_required_before_refund")
    assert ckey == "semantic_pressure:identity_verification_required_before_refund"

def test_group_failures_by_cluster():
    f1 = MagicMock()
    f1.id = "f1"
    f1.scenario_id = "sc1"
    f1.cluster_key = "semantic_pressure:identity_verification_required_before_refund"
    f1.category = "semantic_pressure"
    f1.severity = "critical"
    f1.evidence = {"violated": ["identity_verification_required_before_refund"]}
    f1.created_at = "2026-08-29T20:00:00Z"

    f2 = MagicMock()
    f2.id = "f2"
    f2.scenario_id = "sc2"
    f2.cluster_key = "semantic_pressure:identity_verification_required_before_refund"
    f2.category = "semantic_pressure"
    f2.severity = "critical"
    f2.evidence = {"violated": ["identity_verification_required_before_refund"]}
    f2.created_at = "2026-08-29T20:01:00Z"

    f3 = MagicMock()
    f3.id = "f3"
    f3.scenario_id = "sc3"
    f3.cluster_key = "tool_fault:timeout"
    f3.category = "tool_fault"
    f3.severity = "medium"
    f3.evidence = {"violated": ["timeout"]}
    f3.created_at = "2026-08-29T20:02:00Z"

    clusters = group_failures_by_cluster([f1, f2, f3])
    assert len(clusters) == 2

    # Verify semantic pressure cluster
    c_semantic = next(c for c in clusters if c["category"] == "semantic_pressure")
    assert c_semantic["frequency"] == 2
    assert c_semantic["severity"] == "critical"
    assert c_semantic["representative_failure"]["id"] == "f1"

    # Verify tool fault cluster
    c_tool = next(c for c in clusters if c["category"] == "tool_fault")
    assert c_tool["frequency"] == 1
    assert c_tool["severity"] == "medium"
