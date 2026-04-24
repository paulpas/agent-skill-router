"""
Test utilities for oracle generator.
"""

import sys

sys.path.insert(0, "/home/paulpas/git/skills/agent-test-oracle-generator")

from reference.test_oracle import (
    verify_composite_oracle,
    aggregate_oracle_results,
    TestOracle,
    OracleStatus,
)


def test_verify_composite_oracle():
    """Test composite oracle verification."""
    oracles = [
        TestOracle("test1", 1, 1, OracleStatus.PASS, ["valid"]),
        TestOracle("test2", 2, 3, OracleStatus.FAIL, ["invalid"]),
        TestOracle("test3", 3, 3, OracleStatus.PASS, ["valid"]),
    ]

    result = verify_composite_oracle(oracles)

    assert result["total"] == 3
    assert result["pass"] == 2
    assert result["fail"] == 1
    assert result["error"] == 0
    assert result["overall"] == "fail"
    print("✅ Composite oracle verification works")


def test_aggregate_oracle_results():
    """Test aggregating multiple oracle results."""
    results = [
        {"name": "group1", "total": 3, "pass": 2, "fail": 1, "error": 0, "skip": 0},
        {"name": "group2", "total": 5, "pass": 5, "error": 0, "skip": 0, "fail": 0},
        {"name": "group3", "total": 2, "pass": 1, "fail": 0, "error": 1, "skip": 0},
    ]

    aggregated = aggregate_oracle_results(results)

    assert aggregated["total_oracles"] == 10
    assert aggregated["total_pass"] == 8
    assert aggregated["total_fail"] == 1
    assert aggregated["total_error"] == 1
    assert aggregated["overall"] == "fail"
    assert len(aggregated["tests"]) == 3
    print("✅ Oracle result aggregation works")


if __name__ == "__main__":
    test_verify_composite_oracle()
    test_aggregate_oracle_results()
    print("\n✅ All tests passed!")
