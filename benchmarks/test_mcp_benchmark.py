#!/usr/bin/env python3
"""Test script for the real MCP benchmark system.

This script demonstrates the real MCP benchmark with actual HTTP calls.
It can run WITH or WITHOUT a real router.
"""

import sys
import os
import asyncio
import json
from pathlib import Path

# Add harness to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "harness"))

from mcp_benchmark import RealMCPBenchmark, run_benchmark_async


def create_test_exercises():
    """Create a small set of test exercises for demonstration."""
    return [
        {
            "name": "Code Review Basic",
            "tier": "simple",
            "task_description": "Review this Python code for quality and security issues",
            "required_skills": ["coding-code-review", "coding-security-review"],
            "description": "Basic code review exercise",
        },
        {
            "name": "Architecture Review",
            "tier": "medium",
            "task_description": "Review the architectural design patterns and suggest improvements",
            "required_skills": ["coding-architectural-patterns", "coding-code-review"],
            "description": "Architectural review exercise",
        },
        {
            "name": "Git Workflow Optimization",
            "tier": "medium",
            "task_description": "Help set up optimal git branching strategy for team collaboration",
            "required_skills": [
                "coding-git-branching-strategies",
                "coding-git-advanced",
            ],
            "description": "Git workflow optimization",
        },
        {
            "name": "Security Audit",
            "tier": "heavy",
            "task_description": "Perform comprehensive security audit checking for OWASP vulnerabilities",
            "required_skills": [
                "coding-security-review",
                "coding-cve-dependency-management",
            ],
            "description": "Security audit with CVE checking",
        },
    ]


async def test_router_health():
    """Test router health check."""
    print("\n" + "=" * 70)
    print("TEST 1: Router Health Check")
    print("=" * 70)

    benchmark = RealMCPBenchmark(verbose=True)
    is_healthy, error = await benchmark.health_check()

    if is_healthy:
        print("✅ Router is healthy!")
        return True
    else:
        print(f"⚠️  Router check failed: {error}")
        return False


async def test_router_stats():
    """Test fetching router stats."""
    print("\n" + "=" * 70)
    print("TEST 2: Router Statistics")
    print("=" * 70)

    benchmark = RealMCPBenchmark(verbose=True)
    stats = await benchmark.get_router_stats()

    if stats:
        print(f"✅ Successfully fetched router stats")
        print(f"   Total skills: {stats.total_skills}")
        print(f"   Total requests: {stats.total_requests}")
        return True
    else:
        print("⚠️  Could not fetch router stats")
        return False


async def test_single_routing():
    """Test single task routing."""
    print("\n" + "=" * 70)
    print("TEST 3: Single Task Routing")
    print("=" * 70)

    benchmark = RealMCPBenchmark(verbose=True)

    result = await benchmark.route_task(
        "Review this Python code for quality and security issues"
    )

    if result.success:
        print(f"✅ Routing successful")
        print(f"   Task: {result.task_description[:50]}...")
        print(f"   Selected {len(result.selected_skills)} skills:")
        for skill in result.selected_skills:
            confidence = result.confidence_scores.get(skill, 0.0)
            print(f"     - {skill} (confidence: {confidence:.2f})")
        print(f"   HTTP Latency: {result.http_latency_ms:.1f}ms")
        return True
    else:
        print(f"❌ Routing failed: {result.error}")
        return False


async def test_full_comparison():
    """Test full performance comparison."""
    print("\n" + "=" * 70)
    print("TEST 4: Full Performance Comparison")
    print("=" * 70)

    exercises = create_test_exercises()

    benchmark = RealMCPBenchmark(verbose=True)
    comparisons = await benchmark.compare_performance(exercises)

    # Print summary
    benchmark.print_summary(comparisons)

    return True


async def main():
    """Run all tests."""
    print("\n")
    print("╔" + "=" * 68 + "╗")
    print("║" + " REAL MCP BENCHMARK SYSTEM - DEMONSTRATION ".center(68) + "║")
    print("╚" + "=" * 68 + "╝")
    print("\nThis test demonstrates the Real MCP Benchmark system which makes")
    print("ACTUAL HTTP calls to the skill router and measures real performance")
    print("with vs without the router.")
    print("\nNote: This requires the skill router to be running at localhost:3000")

    tests = [
        ("Router Health Check", test_router_health),
        ("Router Statistics", test_router_stats),
        ("Single Task Routing", test_single_routing),
        ("Full Performance Comparison", test_full_comparison),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\n❌ Test failed with exception: {e}")
            import traceback

            traceback.print_exc()
            results.append((test_name, False))

    # Print summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)

    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")

    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")

    if passed < total:
        print("\n⚠️  Some tests failed. The router may not be running.")
        print("   Run the router with: docker run -p 3000:3000 skill-router")
        return 1

    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
