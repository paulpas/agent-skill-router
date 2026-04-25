#!/usr/bin/env python3
"""Metrics collection and analysis for benchmark exercises."""

import time
import json
from dataclasses import dataclass, asdict
from typing import List, Dict, Set, Tuple
from datetime import datetime, timezone


@dataclass
class ExerciseMetrics:
    """Metrics for a single exercise run."""

    name: str
    tier: str
    expected_skills: List[str]
    actual_skills: List[str]
    with_router_ms: float
    without_router_ms: float
    router_latency_ms: float = 0.0
    iterations: int = 1
    tokens_with_router: int = 0
    tokens_without_router: int = 0
    prompt_tokens_with_router: int = 0
    response_tokens_with_router: int = 0
    prompt_tokens_without_router: int = 0
    response_tokens_without_router: int = 0
    token_efficiency_ratio: float = 0.0
    cost_with_router_usd: float = 0.0
    cost_without_router_usd: float = 0.0

    @property
    def overhead_ms(self) -> float:
        """Additional latency from router."""
        return self.with_router_ms - self.without_router_ms

    @property
    def overhead_pct(self) -> float:
        """Overhead as percentage of baseline."""
        if self.without_router_ms == 0:
            return 0.0
        return (self.overhead_ms / self.without_router_ms) * 100

    @property
    def correct(self) -> bool:
        """Whether correct skills were selected."""
        return set(self.actual_skills) == set(self.expected_skills)

    @property
    def skill_count_ratio(self) -> float:
        """Ratio of actual to expected skill count."""
        if len(self.expected_skills) == 0:
            return 1.0
        return len(self.actual_skills) / len(self.expected_skills)

    @property
    def precision(self) -> float:
        """Correct skills / all selected skills."""
        if len(self.actual_skills) == 0:
            return 1.0 if len(self.expected_skills) == 0 else 0.0
        correct_count = len(set(self.actual_skills) & set(self.expected_skills))
        return correct_count / len(self.actual_skills)

    @property
    def recall(self) -> float:
        """Correct skills selected / expected skills."""
        if len(self.expected_skills) == 0:
            return 1.0
        correct_count = len(set(self.actual_skills) & set(self.expected_skills))
        return correct_count / len(self.expected_skills)

    @property
    def token_savings_pct(self) -> float:
        """Token reduction from using router."""
        if self.tokens_without_router == 0:
            return 0.0
        return (
            (self.tokens_without_router - self.tokens_with_router)
            / self.tokens_without_router
        ) * 100

    @property
    def cost_savings_usd(self) -> float:
        """Dollar savings from router optimization."""
        return self.cost_without_router_usd - self.cost_with_router_usd

    @property
    def cost_savings_pct(self) -> float:
        """Cost reduction percentage."""
        if self.cost_without_router_usd == 0:
            return 0.0
        return (self.cost_savings_usd / self.cost_without_router_usd) * 100

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "name": self.name,
            "tier": self.tier,
            "expected_skills": self.expected_skills,
            "expected_skills_count": len(self.expected_skills),
            "actual_skills": self.actual_skills,
            "actual_skills_count": len(self.actual_skills),
            "correct": self.correct,
            "with_router_ms": round(self.with_router_ms, 2),
            "without_router_ms": round(self.without_router_ms, 2),
            "overhead_ms": round(self.overhead_ms, 2),
            "overhead_pct": round(self.overhead_pct, 2),
            "router_latency_ms": round(self.router_latency_ms, 2),
            "skill_count_ratio": round(self.skill_count_ratio, 3),
            "precision": round(self.precision, 3),
            "recall": round(self.recall, 3),
            "iterations": self.iterations,
            "tokens": {
                "prompt_with_router": self.prompt_tokens_with_router,
                "response_with_router": self.response_tokens_with_router,
                "total_with_router": self.tokens_with_router,
                "prompt_without_router": self.prompt_tokens_without_router,
                "response_without_router": self.response_tokens_without_router,
                "total_without_router": self.tokens_without_router,
                "token_savings_pct": round(self.token_savings_pct, 1),
                "cost_with_router_usd": round(self.cost_with_router_usd, 4),
                "cost_without_router_usd": round(self.cost_without_router_usd, 4),
                "cost_savings_usd": round(self.cost_savings_usd, 4),
                "cost_savings_pct": round(self.cost_savings_pct, 1),
            },
        }


class MetricsCollector:
    """Collects and aggregates metrics across exercises."""

    def __init__(self):
        self.metrics: List[ExerciseMetrics] = []
        self.start_time = datetime.now(timezone.utc)

    def add_metric(self, metric: ExerciseMetrics):
        """Add a metric to the collection."""
        self.metrics.append(metric)

    def get_tier_metrics(self, tier: str) -> Tuple[float, float, float, float]:
        """Get aggregated metrics for a tier.

        Returns: (accuracy, avg_overhead_ms, avg_router_latency_ms, avg_skill_ratio)
        """
        tier_metrics = [m for m in self.metrics if m.tier == tier]
        if not tier_metrics:
            return 0.0, 0.0, 0.0, 0.0

        accuracy = sum(1 for m in tier_metrics if m.correct) / len(tier_metrics)
        avg_overhead = sum(m.overhead_ms for m in tier_metrics) / len(tier_metrics)
        avg_router_latency = sum(m.router_latency_ms for m in tier_metrics) / len(
            tier_metrics
        )
        avg_skill_ratio = sum(m.skill_count_ratio for m in tier_metrics) / len(
            tier_metrics
        )

        return accuracy, avg_overhead, avg_router_latency, avg_skill_ratio

    def get_overall_metrics(self) -> Dict[str, float]:
        """Get overall metrics across all exercises."""
        if not self.metrics:
            return {}

        total_correct = sum(1 for m in self.metrics if m.correct)
        total_accuracy = total_correct / len(self.metrics) if self.metrics else 0.0

        avg_overhead = sum(m.overhead_ms for m in self.metrics) / len(self.metrics)
        avg_router_latency = sum(m.router_latency_ms for m in self.metrics) / len(
            self.metrics
        )
        avg_precision = sum(m.precision for m in self.metrics) / len(self.metrics)
        avg_recall = sum(m.recall for m in self.metrics) / len(self.metrics)

        # Token metrics
        total_tokens_with_router = sum(m.tokens_with_router for m in self.metrics)
        total_tokens_without_router = sum(m.tokens_without_router for m in self.metrics)
        total_cost_with_router = sum(m.cost_with_router_usd for m in self.metrics)
        total_cost_without_router = sum(m.cost_without_router_usd for m in self.metrics)

        token_savings_pct = (
            (total_tokens_without_router - total_tokens_with_router)
            / total_tokens_without_router
            * 100
            if total_tokens_without_router > 0
            else 0.0
        )
        cost_savings_usd = total_cost_without_router - total_cost_with_router

        return {
            "total_exercises": len(self.metrics),
            "overall_accuracy": round(total_accuracy, 3),
            "avg_overhead_ms": round(avg_overhead, 2),
            "avg_router_latency_ms": round(avg_router_latency, 2),
            "avg_precision": round(avg_precision, 3),
            "avg_recall": round(avg_recall, 3),
            "total_tokens_with_router": total_tokens_with_router,
            "total_tokens_without_router": total_tokens_without_router,
            "token_savings_pct": round(token_savings_pct, 1),
            "total_cost_with_router_usd": round(total_cost_with_router, 4),
            "total_cost_without_router_usd": round(total_cost_without_router, 4),
            "cost_savings_usd": round(cost_savings_usd, 4),
        }

    def generate_report(self) -> dict:
        """Generate comprehensive benchmark report."""
        tiers = {"simple": [], "medium": [], "heavy": []}

        for metric in self.metrics:
            tiers[metric.tier].append(metric.to_dict())

        tier_summaries = {}
        for tier_name in ["simple", "medium", "heavy"]:
            tier_metrics = [m for m in self.metrics if m.tier == tier_name]
            if tier_metrics:
                accuracy, overhead, latency, skill_ratio = self.get_tier_metrics(
                    tier_name
                )

                # Calculate tier-level token metrics
                tier_tokens_with = sum(m.tokens_with_router for m in tier_metrics)
                tier_tokens_without = sum(m.tokens_without_router for m in tier_metrics)
                tier_cost_with = sum(m.cost_with_router_usd for m in tier_metrics)
                tier_cost_without = sum(m.cost_without_router_usd for m in tier_metrics)

                tier_token_savings = (
                    (tier_tokens_without - tier_tokens_with) / tier_tokens_without * 100
                    if tier_tokens_without > 0
                    else 0.0
                )

                tier_summaries[tier_name] = {
                    "exercises": len(tier_metrics),
                    "accuracy": round(accuracy, 3),
                    "avg_overhead_ms": round(overhead, 2),
                    "avg_router_latency_ms": round(latency, 2),
                    "avg_skill_ratio": round(skill_ratio, 3),
                    "total_tokens_with_router": tier_tokens_with,
                    "total_tokens_without_router": tier_tokens_without,
                    "token_savings_pct": round(tier_token_savings, 1),
                    "total_cost_with_router_usd": round(tier_cost_with, 4),
                    "total_cost_without_router_usd": round(tier_cost_without, 4),
                    "cost_savings_usd": round(tier_cost_without - tier_cost_with, 4),
                    "results": [m.to_dict() for m in tier_metrics],
                }

        overall = self.get_overall_metrics()
        total_runtime = (datetime.now(timezone.utc) - self.start_time).total_seconds()

        # Calculate estimated monthly/annual savings
        monthly_savings = overall.get("cost_savings_usd", 0) * 30
        annual_savings = overall.get("cost_savings_usd", 0) * 365

        return {
            "timestamp": self.start_time.isoformat(),
            "duration_seconds": round(total_runtime, 2),
            "environment": self._get_environment(),
            "summary": {
                **overall,
                "duration_seconds": round(total_runtime, 2),
                "estimated_monthly_savings_usd": round(monthly_savings, 2),
                "estimated_annual_savings_usd": round(annual_savings, 2),
            },
            "tiers": tier_summaries,
        }

    @staticmethod
    def _get_environment() -> dict:
        """Get environment information."""
        import sys
        import platform

        return {
            "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "platform": sys.platform,
            "machine": platform.machine(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def print_summary(self):
        """Print human-readable summary."""
        report = self.generate_report()
        summary = report["summary"]

        print("\n" + "═" * 80)
        print(
            "║                  AGENT-SKILL-ROUTER BENCHMARK RESULTS                      ║"
        )
        print("═" * 80)

        # Overall stats
        print(
            f"║ Total Exercises:  {summary['total_exercises']:3d}                                       ║"
        )
        print(
            f"║ Duration:         {summary['duration_seconds']:6.1f}s                                     ║"
        )
        print("╠" + "═" * 78 + "╣")

        # Tier breakdowns
        for tier_name in ["simple", "medium", "heavy"]:
            if tier_name in report["tiers"]:
                tier = report["tiers"][tier_name]
                print(
                    f"║ {tier_name.upper():8s} Tier: {tier['exercises']:2d} ex, "
                    f"Accuracy: {tier['accuracy'] * 100:5.1f}%, "
                    f"Overhead: {tier['avg_overhead_ms']:6.1f}ms, "
                    f"Tokens: {tier['token_savings_pct']:5.1f}% saved ║"
                )

        print("╠" + "═" * 78 + "╣")
        print(
            f"║ ROUTING ACCURACY:      {summary['overall_accuracy'] * 100:5.1f}%                               ║"
        )
        print(
            f"║ AVG LATENCY OVERHEAD:  {summary['avg_overhead_ms']:6.1f}ms                                 ║"
        )
        print(
            f"║ ROUTER LATENCY:        {summary['avg_router_latency_ms']:6.1f}ms                                 ║"
        )
        print(
            f"║ AVG PRECISION:         {summary['avg_precision'] * 100:5.1f}%                                 ║"
        )
        print(
            f"║ AVG RECALL:            {summary['avg_recall'] * 100:5.1f}%                                 ║"
        )
        print("╠" + "═" * 78 + "╣")

        # Token metrics
        print(
            f"║ TOKEN USAGE (All Exercises):                                               ║"
        )
        print(
            f"║   With Router:  {summary['total_tokens_with_router']:8d} tokens                                ║"
        )
        print(
            f"║   Without:      {summary['total_tokens_without_router']:8d} tokens                                ║"
        )
        print(
            f"║   Savings:      {summary['token_savings_pct']:6.1f}%                                    ║"
        )
        print(
            f"║   Cost (Router):     ${summary['total_cost_with_router_usd']:8.4f}                                 ║"
        )
        print(
            f"║   Cost (Without):    ${summary['total_cost_without_router_usd']:8.4f}                                 ║"
        )
        print(
            f"║   Monthly Savings:   ${summary['estimated_monthly_savings_usd']:8.2f}                                 ║"
        )
        print(
            f"║   Annual Savings:    ${summary['estimated_annual_savings_usd']:8.2f}                                 ║"
        )
        print("╠" + "═" * 78 + "╣")

        # Verdict
        accuracy = summary["overall_accuracy"]
        overhead = summary["avg_overhead_ms"]

        if accuracy >= 0.95 and overhead < 100:
            verdict = "✅ PASS - Production ready"
        elif accuracy >= 0.90 and overhead < 150:
            verdict = "✅ PASS - Good for most use"
        elif accuracy >= 0.85 and overhead < 200:
            verdict = "⚠️  FAIR - Acceptable with caveats"
        else:
            verdict = "❌ FAIL - Needs investigation"

        print(f"║ VERDICT: {verdict:68s} ║")
        print("╚" + "═" * 78 + "╝")


def format_latency(ms: float, precision: int = 1) -> str:
    """Format latency for display."""
    if ms < 1:
        return f"{ms * 1000:.0f}µs"
    elif ms < 1000:
        return f"{ms:.{precision}f}ms"
    else:
        return f"{ms / 1000:.{precision}f}s"


def format_percentage(value: float, precision: int = 1) -> str:
    """Format percentage for display."""
    return f"{value * 100:.{precision}f}%"
