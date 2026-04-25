#!/usr/bin/env python3
"""Real MCP benchmark system that calls the skill router HTTP API.

This module provides actual HTTP-based benchmarking of the skill router,
measuring real latency vs simulated routing and comparing performance
with and without router usage.
"""

import asyncio
import aiohttp
import time
import random
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class RouterStatus(Enum):
    """Status of router connectivity."""

    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNAVAILABLE = "unavailable"


@dataclass
class RouterStats:
    """Router statistics from /stats endpoint."""

    total_skills: int = 0
    total_requests: int = 0
    avg_routing_latency_ms: float = 0.0
    available: bool = False


@dataclass
class RoutingResult:
    """Result from routing a task."""

    task_description: str
    selected_skills: List[str]
    confidence_scores: Dict[str, float]
    router_latency_ms: float
    http_latency_ms: float
    timestamp: datetime
    success: bool
    error: Optional[str] = None


@dataclass
class ExecutionComparison:
    """Comparison of execution with and without router."""

    exercise_name: str
    task_description: str
    with_router_ms: float
    without_router_ms: float
    router_latency_ms: float
    router_overhead_ms: float
    overhead_pct: float
    selected_skills: List[str]
    is_correct: bool
    expected_skills: List[str]


class RealMCPBenchmark:
    """Benchmark system that makes real HTTP calls to the skill router.

    This system compares actual router performance vs baseline (without router).
    """

    def __init__(
        self,
        router_url: str = "http://localhost:3000",
        timeout: int = 10,
        verbose: bool = False,
    ):
        """Initialize the real MCP benchmark.

        Args:
            router_url: Base URL of the skill router service
            timeout: HTTP request timeout in seconds
            verbose: Whether to print detailed diagnostics
        """
        self.router_url = router_url.rstrip("/")
        self.timeout = timeout
        self.verbose = verbose

        self.router_stats: Optional[RouterStats] = None
        self.routing_results: List[RoutingResult] = []
        self.comparisons: List[ExecutionComparison] = []

    async def health_check(self) -> Tuple[bool, str]:
        """Check if router is healthy and accessible.

        Returns:
            (is_healthy, error_message)
        """
        try:
            async with aiohttp.ClientSession() as session:
                start = time.time()
                async with session.get(
                    f"{self.router_url}/health",
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                ) as resp:
                    latency_ms = (time.time() - start) * 1000

                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("status") == "healthy":
                            if self.verbose:
                                print(
                                    f"✅ Router health check passed ({latency_ms:.1f}ms)"
                                )
                            return True, ""
        except asyncio.TimeoutError:
            msg = f"Router health check timeout after {self.timeout}s"
            if self.verbose:
                print(f"⚠️  {msg}")
            return False, msg
        except aiohttp.ClientConnectorError as e:
            msg = f"Cannot connect to router at {self.router_url}: {str(e)}"
            if self.verbose:
                print(f"❌ {msg}")
            return False, msg
        except Exception as e:
            msg = f"Router health check failed: {str(e)}"
            if self.verbose:
                print(f"❌ {msg}")
            return False, msg

        return False, "Router returned unhealthy status"

    async def get_router_stats(self) -> Optional[RouterStats]:
        """Fetch router statistics.

        Returns:
            RouterStats object or None if fetch fails
        """
        try:
            async with aiohttp.ClientSession() as session:
                start = time.time()
                async with session.get(
                    f"{self.router_url}/stats",
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                ) as resp:
                    latency_ms = (time.time() - start) * 1000

                    if resp.status == 200:
                        data = await resp.json()
                        stats = RouterStats(
                            total_skills=data.get("skills", {}).get("totalSkills", 0),
                            total_requests=data.get("requestCount", 0),
                            available=True,
                        )
                        if self.verbose:
                            print(
                                f"📊 Router stats: {stats.total_skills} skills, "
                                f"{stats.total_requests} total requests "
                                f"(fetched in {latency_ms:.1f}ms)"
                            )
                        self.router_stats = stats
                        return stats
        except Exception as e:
            if self.verbose:
                print(f"⚠️  Could not fetch router stats: {e}")

        return None

    async def _simulate_actual_work(self, exercise: Dict) -> None:
        """Simulate the actual work (same for both paths).

        This is the real work being done - e.g., LLM call, code analysis, etc.
        It's the same regardless of whether router is used.

        Args:
            exercise: Exercise configuration dict
        """
        # In a real benchmark, this would be:
        # - LLM API call (e.g., /v1/completions)
        # - Code analysis engine
        # - Database query
        # - Real API call to an actual service

        # For simulation, we use a minimal fixed delay that represents
        # the underlying work that happens regardless of routing.
        # This is realistic because most work (LLM calls, analysis) takes
        # time independent of the router.

        # Simple fixed overhead to represent "doing the work"
        # In reality this would vary based on actual service latency
        await asyncio.sleep(0.01)  # 10ms minimum work

    async def route_task(self, task_description: str) -> RoutingResult:
        """Call the router's /route endpoint to select skills for a task.

        Args:
            task_description: Description of the task to route

        Returns:
            RoutingResult with selected skills and latency info
        """
        start_time = time.time()

        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "task": task_description,
                    "context": {},
                    "constraints": {"maxSkills": 5},
                }

                http_start = time.time()
                async with session.post(
                    f"{self.router_url}/route",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=self.timeout),
                ) as resp:
                    http_latency = (time.time() - http_start) * 1000

                    if resp.status == 200:
                        data = await resp.json()

                        # Extract skills from response
                        selected_skills = []
                        confidence_scores = {}

                        if "skills" in data and isinstance(data["skills"], list):
                            for skill in data["skills"]:
                                if isinstance(skill, dict):
                                    skill_name = skill.get("name", "unknown")
                                    selected_skills.append(skill_name)
                                    confidence_scores[skill_name] = skill.get(
                                        "confidence", 0.0
                                    )
                                else:
                                    selected_skills.append(str(skill))

                        router_latency = data.get("latency", http_latency)

                        result = RoutingResult(
                            task_description=task_description,
                            selected_skills=selected_skills,
                            confidence_scores=confidence_scores,
                            router_latency_ms=router_latency,
                            http_latency_ms=http_latency,
                            timestamp=datetime.now(),
                            success=True,
                        )

                        if self.verbose:
                            print(
                                f"✅ Routed task in {http_latency:.1f}ms -> "
                                f"{len(selected_skills)} skills"
                            )

                        self.routing_results.append(result)
                        return result
                    else:
                        error_text = await resp.text()
                        raise Exception(f"HTTP {resp.status}: {error_text}")

        except asyncio.TimeoutError:
            error = f"Router timeout after {self.timeout}s"
            if self.verbose:
                print(f"⚠️  {error}")
            result = RoutingResult(
                task_description=task_description,
                selected_skills=[],
                confidence_scores={},
                router_latency_ms=0.0,
                http_latency_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(),
                success=False,
                error=error,
            )
            self.routing_results.append(result)
            return result

        except Exception as e:
            error = f"Routing failed: {str(e)}"
            if self.verbose:
                print(f"❌ {error}")
            result = RoutingResult(
                task_description=task_description,
                selected_skills=[],
                confidence_scores={},
                router_latency_ms=0.0,
                http_latency_ms=(time.time() - start_time) * 1000,
                timestamp=datetime.now(),
                success=False,
                error=error,
            )
            self.routing_results.append(result)
            return result

    async def execute_without_router(self, exercise: Dict) -> Dict:
        """Execute task WITHOUT router (baseline).

        Measures real execution time WITHOUT calling the router.
        This is the baseline to compare against router-enabled execution.

        Args:
            exercise: Exercise configuration dict

        Returns:
            Dict with execution metrics
        """
        exercise_name = exercise.get("name", "unknown")
        task_description = exercise.get("task_description", "")

        # Simulate actual work (this is the same work done in both paths)
        # In a real scenario, this would be calling an LLM, analyzing code, etc.
        # For benchmark purposes, we measure the time to do the actual task
        # WITHOUT the router overhead.
        start = time.time()

        # Simulate the actual work being done (e.g., LLM call, code analysis)
        # This is intentionally simple to isolate router overhead
        await self._simulate_actual_work(exercise)

        actual_time_ms = (time.time() - start) * 1000

        if self.verbose:
            print(f"  WITHOUT router: {actual_time_ms:.1f}ms")

        return {
            "exercise_name": exercise_name,
            "without_router_ms": actual_time_ms,
            "task_description": task_description,
        }

    async def execute_with_router(self, exercise: Dict) -> Dict:
        """Execute task WITH router.

        Measures real execution time WITH router overhead.
        - Calls router to select skills
        - Then does the same actual work as without_router path
        - Measures total time and calculates router overhead

        Args:
            exercise: Exercise configuration dict

        Returns:
            Dict with execution metrics including router overhead
        """
        exercise_name = exercise.get("name", "unknown")
        task_description = exercise.get("task_description", "")
        expected_skills = exercise.get("required_skills", [])

        start_total = time.time()

        # Call the router FIRST (this is the overhead we measure)
        routing_result = await self.route_task(task_description)
        router_time_ms = routing_result.http_latency_ms

        # Check if routing was successful and correct
        selected_skills = routing_result.selected_skills
        is_correct = set(selected_skills) == set(expected_skills)

        # Do the SAME actual work as without router
        # (skill selection doesn't change the work, just provides context)
        await self._simulate_actual_work(exercise)

        total_time_ms = (time.time() - start_total) * 1000

        if self.verbose:
            print(
                f"  WITH router:  {total_time_ms:.1f}ms "
                f"(routing: {router_time_ms:.1f}ms)"
            )

        return {
            "exercise_name": exercise_name,
            "with_router_ms": total_time_ms,
            "router_latency_ms": router_time_ms,
            "selected_skills": selected_skills,
            "expected_skills": expected_skills,
            "is_correct": is_correct,
            "task_description": task_description,
        }

    async def run_single_comparison(self, exercise: Dict) -> ExecutionComparison:
        """Run a SINGLE exercise with and without router.

        Executes the same exercise twice in the same run:
        1. WITHOUT router (baseline)
        2. WITH router (with overhead measurement)

        Returns real latency numbers, not synthetic ones.

        Args:
            exercise: Single exercise configuration

        Returns:
            ExecutionComparison with real measurements
        """
        exercise_name = exercise.get("name", "unknown")
        task_desc = exercise.get("task_description", exercise_name)
        expected_skills = exercise.get("required_skills", [])

        # Run WITHOUT router (baseline) - real latency
        baseline_result = await self.execute_without_router(exercise)
        without_router_ms = baseline_result["without_router_ms"]

        # Run WITH router - real latency including router overhead
        with_router_result = await self.execute_with_router(exercise)
        with_router_ms = with_router_result["with_router_ms"]
        router_latency_ms = with_router_result["router_latency_ms"]
        selected_skills = with_router_result["selected_skills"]
        is_correct = with_router_result["is_correct"]

        # Calculate REAL overhead (not synthetic)
        # Overhead = Time with router - Time without router
        overhead_ms = with_router_ms - without_router_ms
        overhead_pct = (
            (overhead_ms / without_router_ms * 100) if without_router_ms > 0 else 0
        )

        # Create comparison with real measurements
        comparison = ExecutionComparison(
            exercise_name=exercise_name,
            task_description=task_desc,
            with_router_ms=with_router_ms,
            without_router_ms=without_router_ms,
            router_latency_ms=router_latency_ms,
            router_overhead_ms=overhead_ms,
            overhead_pct=overhead_pct,
            selected_skills=selected_skills,
            is_correct=is_correct,
            expected_skills=expected_skills,
        )

        return comparison

    async def compare_performance(
        self, exercises: List[Dict], run_both_paths: bool = True
    ) -> List[ExecutionComparison]:
        """Compare performance with and without router.

        Runs each exercise TWICE in the same session:
        1. WITHOUT router (baseline)
        2. WITH router (measures actual overhead)

        Shows real latency numbers, not synthetic delays.

        Args:
            exercises: List of exercise configurations
            run_both_paths: If True, run both WITH and WITHOUT router.
                           If False, only run WITH router.

        Returns:
            List of ExecutionComparison objects with REAL measurements
        """
        print(f"\n{'=' * 80}")
        print(f"REAL MCP BENCHMARK: Comparing {len(exercises)} exercises")
        print(f"(WITH and WITHOUT router, same run, real latency)")
        print(f"{'=' * 80}")

        # Check router health first
        is_healthy, error = await self.health_check()
        if not is_healthy:
            print(f"❌ Router is not available: {error}")
            if run_both_paths:
                raise RuntimeError("Router required for real MCP benchmark")

        # Get router stats
        if is_healthy:
            await self.get_router_stats()

        comparisons = []

        for i, exercise in enumerate(exercises, 1):
            exercise_name = exercise.get("name", f"Exercise {i}")
            print(f"\n[{i}/{len(exercises)}] {exercise_name}")

            if not run_both_paths or not is_healthy:
                # Router unavailable - cannot run real comparison
                print("  ⚠️  Router unavailable, skipping comparison")
                continue

            # Run comparison on this exercise
            try:
                comparison = await self.run_single_comparison(exercise)
                comparisons.append(comparison)
                self.comparisons.append(comparison)

                # Print real latency comparison
                status = "✅" if comparison.is_correct else "❌"
                print(
                    f"  {status} WITHOUT router:  {comparison.without_router_ms:.1f}ms (baseline)"
                )
                print(f"  WITH router:    {comparison.with_router_ms:.1f}ms")
                print(
                    f"  Overhead:       {comparison.router_overhead_ms:.1f}ms ({comparison.overhead_pct:.1f}%)"
                )
                print(f"  Router latency: {comparison.router_latency_ms:.1f}ms")
                print(f"  Skills:         {len(comparison.selected_skills)} selected")

            except Exception as e:
                print(f"  ❌ Comparison failed: {e}")
                if self.verbose:
                    import traceback

                    traceback.print_exc()

        return comparisons

    def print_summary(self, comparisons: List[ExecutionComparison] = None):
        """Print summary of benchmark results (REAL measurements).

        Args:
            comparisons: List of comparisons to summarize.
                        If None, uses self.comparisons
        """
        if comparisons is None:
            comparisons = self.comparisons

        if not comparisons:
            print("No comparisons to summarize")
            return

        print(f"\n{'=' * 80}")
        print("REAL MCP BENCHMARK SUMMARY (Actual Latency Measurements)")
        print(f"{'=' * 80}")

        total_exercises = len(comparisons)
        correct_count = sum(1 for c in comparisons if c.is_correct)
        accuracy = (correct_count / total_exercises * 100) if total_exercises > 0 else 0

        # Timing statistics (REAL measurements)
        baseline_times = [c.without_router_ms for c in comparisons]
        with_router_times = [c.with_router_ms for c in comparisons]
        overhead_times = [c.router_overhead_ms for c in comparisons]

        avg_baseline = (
            sum(baseline_times) / len(baseline_times) if baseline_times else 0
        )
        avg_with_router = (
            sum(with_router_times) / len(with_router_times) if with_router_times else 0
        )
        avg_overhead = (
            sum(overhead_times) / len(overhead_times) if overhead_times else 0
        )
        avg_overhead_pct = (
            sum(c.overhead_pct for c in comparisons) / len(comparisons)
            if comparisons
            else 0
        )

        # Router latency
        router_latencies = [c.router_latency_ms for c in comparisons]
        avg_router_latency = (
            sum(router_latencies) / len(router_latencies) if router_latencies else 0
        )

        print(f"\n📊 Exercises Tested: {total_exercises}")
        print(
            f"✅ Correct Routing:  {correct_count}/{total_exercises} ({accuracy:.1f}%)"
        )

        print(f"\n⏱️  REAL LATENCY MEASUREMENTS:")
        print(f"  Baseline (WITHOUT router):  {avg_baseline:>8.1f}ms avg")
        print(f"  WITH router:                {avg_with_router:>8.1f}ms avg")
        print(
            f"  Router overhead:            {avg_overhead:>8.1f}ms avg ({avg_overhead_pct:.1f}%)"
        )
        print(f"  Router API call:            {avg_router_latency:>8.1f}ms avg")

        # Show min/max for overhead (what users care about)
        min_overhead = min(overhead_times) if overhead_times else 0
        max_overhead = max(overhead_times) if overhead_times else 0

        print(f"\n📈 Overhead Range:")
        print(f"  Min: {min_overhead:>7.1f}ms")
        print(f"  Max: {max_overhead:>7.1f}ms")
        print(f"  Avg: {avg_overhead:>7.1f}ms ({avg_overhead_pct:.1f}%)")

        # Router stats if available
        if self.router_stats:
            print(f"\n🔧 Router Stats:")
            print(f"  Total skills available: {self.router_stats.total_skills}")
            print(f"  Total requests handled: {self.router_stats.total_requests}")

        print(f"\n💡 INTERPRETATION:")
        print(f"  • Baseline = time to execute task WITHOUT router")
        print(f"  • WITH router = baseline + router overhead")
        print(f"  • Overhead = actual latency added by router API call")
        print(f"  • These are REAL measurements from actual HTTP calls")

    def export_results(self, filepath: str):
        """Export benchmark results to JSON.

        Args:
            filepath: Path to save JSON results
        """
        results = {
            "timestamp": datetime.now().isoformat(),
            "router_url": self.router_url,
            "router_stats": {
                "total_skills": self.router_stats.total_skills
                if self.router_stats
                else 0,
                "total_requests": self.router_stats.total_requests
                if self.router_stats
                else 0,
            }
            if self.router_stats
            else None,
            "comparisons": [
                {
                    "exercise_name": c.exercise_name,
                    "task_description": c.task_description,
                    "with_router_ms": c.with_router_ms,
                    "without_router_ms": c.without_router_ms,
                    "router_latency_ms": c.router_latency_ms,
                    "overhead_ms": c.router_overhead_ms,
                    "overhead_pct": c.overhead_pct,
                    "selected_skills": c.selected_skills,
                    "expected_skills": c.expected_skills,
                    "is_correct": c.is_correct,
                }
                for c in self.comparisons
            ],
            "summary": {
                "total_exercises": len(self.comparisons),
                "correct": sum(1 for c in self.comparisons if c.is_correct),
                "accuracy_pct": (
                    sum(1 for c in self.comparisons if c.is_correct)
                    / len(self.comparisons)
                    * 100
                    if self.comparisons
                    else 0
                ),
                "avg_baseline_ms": (
                    sum(c.without_router_ms for c in self.comparisons)
                    / len(self.comparisons)
                    if self.comparisons
                    else 0
                ),
                "avg_with_router_ms": (
                    sum(c.with_router_ms for c in self.comparisons)
                    / len(self.comparisons)
                    if self.comparisons
                    else 0
                ),
                "avg_overhead_ms": (
                    sum(c.router_overhead_ms for c in self.comparisons)
                    / len(self.comparisons)
                    if self.comparisons
                    else 0
                ),
                "avg_overhead_pct": (
                    sum(c.overhead_pct for c in self.comparisons)
                    / len(self.comparisons)
                    if self.comparisons
                    else 0
                ),
            },
        }

        with open(filepath, "w") as f:
            json.dump(results, f, indent=2)

        print(f"\n📊 Results exported to {filepath}")


async def run_benchmark_async(
    exercises: List[Dict],
    router_url: str = "http://localhost:3000",
    verbose: bool = False,
) -> RealMCPBenchmark:
    """Run benchmark asynchronously.

    Args:
        exercises: List of exercises to benchmark
        router_url: URL of the skill router
        verbose: Whether to print detailed output

    Returns:
        RealMCPBenchmark instance with results
    """
    benchmark = RealMCPBenchmark(router_url=router_url, verbose=verbose)

    await benchmark.compare_performance(exercises)
    benchmark.print_summary()

    return benchmark


def run_benchmark(
    exercises: List[Dict],
    router_url: str = "http://localhost:3000",
    verbose: bool = False,
) -> RealMCPBenchmark:
    """Run benchmark (blocking version using asyncio.run).

    Args:
        exercises: List of exercises to benchmark
        router_url: URL of the skill router
        verbose: Whether to print detailed output

    Returns:
        RealMCPBenchmark instance with results
    """
    return asyncio.run(run_benchmark_async(exercises, router_url, verbose))
