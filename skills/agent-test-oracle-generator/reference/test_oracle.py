"""
Test utilities for oracle generator.

Contains helper functions for testing and validation.
"""

from typing import List, Dict, Any
from enum import Enum
from dataclasses import dataclass


class OracleStatus(Enum):
    """Status of a test oracle execution."""

    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"


@dataclass(frozen=True)
class TestOracle:
    """A single test oracle."""

    name: str
    expected: Any
    actual: Any
    status: OracleStatus
    conditions: List[str]


def verify_composite_oracle(oracle_list: List[TestOracle]) -> Dict[str, Any]:
    """
    Verify and summarize a list of oracles.

    Returns a summary dict with counts and overall status.
    """
    if not oracle_list:
        return {
            "total": 0,
            "pass": 0,
            "fail": 0,
            "error": 0,
            "skip": 0,
            "overall": "skip",
        }

    counts = {"pass": 0, "fail": 0, "error": 0, "skip": 0}

    for oracle in oracle_list:
        counts[oracle.status.value] += 1

    if counts["fail"] > 0 or counts["error"] > 0:
        overall = "fail"
    elif counts["skip"] == len(oracle_list):
        overall = "skip"
    else:
        overall = "pass"

    return {"total": len(oracle_list), **counts, "overall": overall}


def aggregate_oracle_results(results: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Aggregate results from multiple oracle generations.

    Combines multiple oracle summary dicts into a single report.
    """
    if not results:
        return {
            "total_oracles": 0,
            "total_pass": 0,
            "total_fail": 0,
            "total_error": 0,
            "total_skip": 0,
            "overall": "skip",
        }

    aggregated = {
        "total_oracles": 0,
        "total_pass": 0,
        "total_fail": 0,
        "total_error": 0,
        "total_skip": 0,
        "tests": [],
    }

    for result in results:
        if "name" in result:
            aggregated["tests"].append(result)

        for key in ["pass", "fail", "error", "skip"]:
            aggregated[f"total_{key}"] += result.get(key, 0)

        aggregated["total_oracles"] += result.get("total", 0)

    if aggregated["total_fail"] > 0 or aggregated["total_error"] > 0:
        aggregated["overall"] = "fail"
    elif aggregated["total_skip"] == aggregated["total_oracles"]:
        aggregated["overall"] = "skip"
    else:
        aggregated["overall"] = "pass"

    return aggregated
