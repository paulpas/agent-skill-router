#!/usr/bin/env python3
"""Comparison and analysis of benchmark results."""

import json
import argparse
import sys
from typing import Dict, Tuple
from datetime import datetime


class BenchmarkComparison:
    """Compare two benchmark result sets."""

    def __init__(self, current: dict, baseline: dict = None):
        self.current = current
        self.baseline = baseline

    @staticmethod
    def load_results(filepath: str) -> dict:
        """Load benchmark results from JSON file."""
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Error: File not found: {filepath}")
            sys.exit(1)
        except json.JSONDecodeError:
            print(f"Error: Invalid JSON in {filepath}")
            sys.exit(1)

    def get_metric_delta(self, path: str) -> Tuple[float, float, float]:
        """Get metric value and delta from baseline.

        Args:
            path: JSON path like 'summary.overall_accuracy'

        Returns:
            (current_value, baseline_value, delta_pct)
        """
        keys = path.split(".")
        current_val = self.current
        baseline_val = self.baseline if self.baseline else None

        for key in keys:
            if isinstance(current_val, dict):
                current_val = current_val.get(key)
            else:
                return None, None, None

            if baseline_val and isinstance(baseline_val, dict):
                baseline_val = baseline_val.get(key)
            else:
                baseline_val = None

        if current_val is None:
            return None, None, None

        if baseline_val is None:
            return current_val, None, None

        if baseline_val == 0:
            delta_pct = 0.0
        else:
            delta_pct = ((current_val - baseline_val) / baseline_val) * 100

        return current_val, baseline_val, delta_pct

    def print_comparison(self, include_llm: bool = True):
        """Print side-by-side comparison with baseline.

        Args:
            include_llm: Include LLM results in comparison if available
        """
        if not self.baseline:
            print("No baseline provided. Showing current results only.\n")
            self._print_results(self.current, "Current")
            return

        print("\n" + "═" * 100)
        print("║" + " " * 98 + "║")
        print("║  BENCHMARK COMPARISON".ljust(99) + "║")
        print("║" + " " * 98 + "║")
        print("═" * 100)

        current_ts = self.current.get("timestamp", "Unknown")
        baseline_ts = self.baseline.get("timestamp", "Unknown")

        print(f"Current:  {current_ts}")
        print(f"Baseline: {baseline_ts}")
        print()

        # Key metrics comparison
        metrics = [
            ("Overall Accuracy", "summary.overall_accuracy", "pct"),
            ("Avg Overhead (ms)", "summary.avg_overhead_ms", "ms"),
            ("Router Latency (ms)", "summary.avg_router_latency_ms", "ms"),
            ("Total Exercises", "summary.total_exercises", "count"),
        ]

        print("┌" + "─" * 98 + "┐")
        print("│ SUMMARY METRICS".ljust(99) + "│")
        print("├" + "─" * 98 + "┤")

        for metric_name, path, metric_type in metrics:
            current, baseline, delta = self.get_metric_delta(path)
            if current is None:
                continue

            if metric_type == "pct":
                current_str = f"{current * 100:6.1f}%"
                baseline_str = (
                    f"{baseline * 100:6.1f}%" if baseline is not None else "N/A"
                )
                delta_str = f"{delta:+6.1f}%" if delta is not None else "N/A"
            elif metric_type == "ms":
                current_str = f"{current:8.2f}ms"
                baseline_str = f"{baseline:8.2f}ms" if baseline is not None else "N/A"
                delta_str = f"{delta:+6.1f}%" if delta is not None else "N/A"
            else:  # count
                current_str = f"{int(current):3d}"
                baseline_str = f"{int(baseline):3d}" if baseline is not None else "N/A"
                delta_str = "N/A"

            status = (
                "✅"
                if delta is None or abs(delta) < 5
                else ("⚠️ " if abs(delta) < 10 else "❌")
            )

            print(
                f"│ {metric_name:25s} │ {current_str:>12s} │ {baseline_str:>12s} │ "
                f"{delta_str:>8s} │ {status}            │"
            )

        print("└" + "─" * 98 + "┘")

        # Tier-by-tier comparison
        print("\n" + "═" * 100)
        print("║ TIER-BY-TIER COMPARISON".ljust(99) + "║")
        print("═" * 100)

        for tier in ["simple", "medium", "heavy"]:
            current_tier = self.current.get("tiers", {}).get(tier)
            baseline_tier = (
                self.baseline.get("tiers", {}).get(tier) if self.baseline else None
            )

            if not current_tier:
                continue

            print(f"\n{tier.upper()} Tier:")
            print("─" * 80)

            tier_metrics = [
                ("Accuracy", "accuracy", "pct"),
                ("Avg Overhead", "avg_overhead_ms", "ms"),
                ("Avg Router Latency", "avg_router_latency_ms", "ms"),
                ("Exercises", "exercises", "count"),
            ]

            for metric_name, key, metric_type in tier_metrics:
                current = current_tier.get(key)
                baseline = baseline_tier.get(key) if baseline_tier else None

                if current is None:
                    continue

                if metric_type == "pct":
                    current_str = f"{current * 100:6.1f}%"
                    baseline_str = f"{baseline * 100:6.1f}%" if baseline else "N/A"
                elif metric_type == "ms":
                    current_str = f"{current:8.2f}ms"
                    baseline_str = f"{baseline:8.2f}ms" if baseline else "N/A"
                else:
                    current_str = f"{current:3d}"
                    baseline_str = f"{baseline:3d}" if baseline else "N/A"

                if baseline:
                    if metric_type == "count":
                        delta = 0.0
                    else:
                        delta = (
                            ((current - baseline) / baseline) * 100
                            if baseline != 0
                            else 0.0
                        )
                    delta_str = f"{delta:+6.1f}%"
                    status = (
                        "✅" if abs(delta) < 5 else ("⚠️ " if abs(delta) < 10 else "❌")
                    )
                else:
                    delta_str = "N/A"
                    status = "➖"

                print(
                    f"  {metric_name:25s}: {current_str:>12s} "
                    f"(vs {baseline_str:>12s}, {delta_str:>8s}) {status}"
                )

    def get_failing_exercises(self) -> list:
        """Get exercises where accuracy dropped."""
        failing = []

        for tier_name in ["simple", "medium", "heavy"]:
            current_tier = self.current.get("tiers", {}).get(tier_name)
            baseline_tier = (
                self.baseline.get("tiers", {}).get(tier_name) if self.baseline else None
            )

            if not current_tier or not baseline_tier:
                continue

            current_results = current_tier.get("results", [])
            baseline_results = {r["name"]: r for r in baseline_tier.get("results", [])}

            for result in current_results:
                name = result["name"]
                baseline_result = baseline_results.get(name)

                if (
                    baseline_result
                    and not result["correct"]
                    and baseline_result["correct"]
                ):
                    failing.append(
                        {
                            "tier": tier_name,
                            "name": name,
                            "expected": result["expected_skills"],
                            "actual": result["actual_skills"],
                        }
                    )

        return failing

    def print_recommendations(self):
        """Print optimization recommendations."""
        print("\n" + "═" * 100)
        print("║ RECOMMENDATIONS".ljust(99) + "║")
        print("═" * 100)

        if not self.baseline:
            print("\nNo baseline for comparison. Unable to provide recommendations.")
            return

        # Check for accuracy regression
        current_acc = self.current.get("summary", {}).get("overall_accuracy", 0)
        baseline_acc = self.baseline.get("summary", {}).get("overall_accuracy", 0)

        if current_acc < baseline_acc - 0.05:
            print("\n⚠️  ACCURACY REGRESSION DETECTED")
            print(
                f"   Current: {current_acc * 100:.1f}% → Baseline: {baseline_acc * 100:.1f}%"
            )
            failing = self.get_failing_exercises()
            if failing:
                print("\n   Exercises now failing:")
                for ex in failing:
                    print(
                        f"   - [{ex['tier'].upper()}] {ex['name']}: "
                        f"expected {ex['expected']}, got {ex['actual']}"
                    )
        else:
            print("\n✅ No accuracy regression detected.")

        # Check for performance regression
        current_overhead = self.current.get("summary", {}).get("avg_overhead_ms", 0)
        baseline_overhead = self.baseline.get("summary", {}).get("avg_overhead_ms", 0)
        overhead_delta = (
            ((current_overhead - baseline_overhead) / baseline_overhead * 100)
            if baseline_overhead
            else 0
        )

        if overhead_delta > 15:
            print(
                f"\n⚠️  PERFORMANCE REGRESSION: {overhead_delta:.1f}% increase in overhead"
            )
            print("   Consider:")
            print("   - Profiling the router search/ranking phases")
            print("   - Optimizing trigger matching with inverted index")
            print("   - Reducing trigger keyword count")
            print("   - Implementing caching for repeated tasks")
        elif overhead_delta > 5:
            print(
                f"\n⚠️  Minor performance increase: {overhead_delta:.1f}% overhead growth"
            )
            print("   Monitor trends over time.")
        else:
            print(f"\n✅ Performance stable ({overhead_delta:+.1f}% change)")

        # Check tier-specific issues
        for tier in ["simple", "medium", "heavy"]:
            current_tier = self.current.get("tiers", {}).get(tier)
            baseline_tier = (
                self.baseline.get("tiers", {}).get(tier) if self.baseline else None
            )

            if not current_tier or not baseline_tier:
                continue

            current_acc = current_tier.get("accuracy", 0)
            baseline_acc = baseline_tier.get("accuracy", 0)

            if current_acc < baseline_acc - 0.05:
                print(
                    f"\n⚠️  {tier.upper()} tier accuracy dropped: "
                    f"{baseline_acc * 100:.1f}% → {current_acc * 100:.1f}%"
                )

    def print_llm_comparison(self):
        """Print LLM code generation quality comparison."""
        current_llm = self.current.get("llm_results")
        baseline_llm = self.baseline.get("llm_results") if self.baseline else None

        if not current_llm:
            return

        print("\n" + "═" * 100)
        print("║ LLM CODE GENERATION QUALITY COMPARISON".ljust(99) + "║")
        print("═" * 100)

        if not baseline_llm:
            print(
                "\nNo baseline LLM results for comparison. Showing current results only.\n"
            )
            self._print_llm_results(current_llm, "Current")
            return

        # Create lookup for baseline results
        baseline_by_name = {r.get("exercise_name"): r for r in baseline_llm}

        print(f"\n{self.current.get('llm_model', 'Unknown')} Model")
        print("─" * 100)

        metrics_to_compare = [
            ("Code Correctness", "metrics.code_correctness_pct", "%"),
            ("Complexity", "metrics.cyclomatic_complexity", "score"),
            ("SLOC", "metrics.sloc", "lines"),
            ("Maintainability", "metrics.maintainability_score", "%"),
        ]

        for result in current_llm:
            name = result.get("exercise_name")
            baseline_result = baseline_by_name.get(name)

            if baseline_result:
                print(f"\n{name}:")
                for metric_name, path, unit in metrics_to_compare:
                    # Navigate path like "metrics.code_correctness_pct"
                    keys = path.split(".")
                    current_val = result
                    baseline_val = baseline_result

                    for key in keys:
                        current_val = (
                            current_val.get(key)
                            if isinstance(current_val, dict)
                            else None
                        )
                        baseline_val = (
                            baseline_val.get(key)
                            if isinstance(baseline_val, dict)
                            else None
                        )

                    if current_val is not None and baseline_val is not None:
                        if unit == "%":
                            delta = current_val - baseline_val
                            print(
                                f"  {metric_name:20s}: {current_val:6.1f}% (was {baseline_val:6.1f}%, {delta:+.1f}%)"
                            )
                        else:
                            delta_pct = (
                                ((current_val - baseline_val) / baseline_val * 100)
                                if baseline_val != 0
                                else 0
                            )
                            print(
                                f"  {metric_name:20s}: {current_val:6.0f} {unit:s} (was {baseline_val:6.0f}, {delta_pct:+.1f}%)"
                            )

    def _print_results(self, results: dict, label: str):
        """Print results without baseline comparison."""
        print(f"\n{label} Results:\n")
        summary = results.get("summary", {})
        print(f"Overall Accuracy: {summary.get('overall_accuracy', 0) * 100:.1f}%")
        print(f"Avg Overhead: {summary.get('avg_overhead_ms', 0):.2f}ms")
        print(f"Router Latency: {summary.get('avg_router_latency_ms', 0):.2f}ms")

    def print_token_comparison(self):
        """Print token usage and cost comparison analysis."""
        print("\n" + "═" * 100)
        print("║ TOKEN USAGE AND COST ANALYSIS".ljust(99) + "║")
        print("═" * 100)

        summary = self.current.get("summary", {})
        if not any(
            k in summary
            for k in [
                "total_tokens_with_router",
                "total_tokens_without_router",
            ]
        ):
            print("\nNo token metrics available in current results.\n")
            return

        print("\n📊 TOKEN USAGE BY TIER:")
        print("─" * 100)

        for tier in ["simple", "medium", "heavy"]:
            tier_data = self.current.get("tiers", {}).get(tier)
            if not tier_data:
                continue

            tokens_with = tier_data.get("total_tokens_with_router", 0)
            tokens_without = tier_data.get("total_tokens_without_router", 0)
            savings_pct = tier_data.get("token_savings_pct", 0.0)
            cost_with = tier_data.get("total_cost_with_router_usd", 0.0)
            cost_without = tier_data.get("total_cost_without_router_usd", 0.0)

            print(f"\n{tier.upper()} TIER ({tier_data.get('exercises', 0)} exercises):")
            print(
                f"  Tokens (with router): {tokens_with:>8d} "
                f"│ Tokens (without): {tokens_without:>8d} "
                f"│ Savings: {savings_pct:>6.1f}%"
            )
            print(
                f"  Cost (with router):   ${cost_with:>8.4f} "
                f"│ Cost (without):  ${cost_without:>8.4f} "
                f"│ Savings: ${cost_without - cost_with:>8.4f}"
            )

        print("\n" + "─" * 100)
        print("\n💰 OVERALL COST ANALYSIS:")
        print("─" * 100)

        total_with = summary.get("total_tokens_with_router", 0)
        total_without = summary.get("total_tokens_without_router", 0)
        token_savings = summary.get("token_savings_pct", 0.0)
        cost_with = summary.get("total_cost_with_router_usd", 0.0)
        cost_without = summary.get("total_cost_without_router_usd", 0.0)
        cost_savings = summary.get("cost_savings_usd", 0.0)
        monthly_savings = summary.get("estimated_monthly_savings_usd", 0.0)
        annual_savings = summary.get("estimated_annual_savings_usd", 0.0)

        print(f"Total Tokens (with router):    {total_with:>10d} tokens")
        print(f"Total Tokens (without router): {total_without:>10d} tokens")
        print(f"Token Savings:                 {token_savings:>10.1f}%")
        print()
        print(f"Total Cost (with router):      ${cost_with:>10.4f}")
        print(f"Total Cost (without router):   ${cost_without:>10.4f}")
        print(f"Cost Savings (per benchmark):  ${cost_savings:>10.4f}")
        print(f"Estimated Monthly Savings:     ${monthly_savings:>10.2f}")
        print(f"Estimated Annual Savings:      ${annual_savings:>10.2f}")

        # ROI analysis if we assume router has overhead
        if cost_savings > 0.01:  # Only show if meaningful savings
            print("\n" + "─" * 100)
            print("\n📈 ROI ANALYSIS (Assuming Router Infrastructure Costs):")
            print("─" * 100)
            assumed_monthly_cost = 100.0  # Assume $100/month infrastructure
            months_to_breakeven = assumed_monthly_cost / (
                monthly_savings if monthly_savings > 0 else 1
            )
            print(f"Assumed monthly router cost:   ${assumed_monthly_cost:.2f}")
            print(f"Months to break-even:          {months_to_breakeven:>10.1f} months")
            if months_to_breakeven < 12:
                print(
                    f"✅ Router investment breaks even in {months_to_breakeven:.0f} months!"
                )
            else:
                print(
                    "⚠️  Router infrastructure cost needs to be justified by other factors"
                )

        print("\n")

    def _print_llm_results(self, llm_results: list, label: str):
        """Print LLM results without baseline comparison."""
        print(f"{label} LLM Results:")
        print("─" * 100)

        for result in llm_results:
            metrics = result.get("metrics", {})
            print(f"\n{result.get('exercise_name')} [{result.get('tier').upper()}]:")
            print(f"  Code Correctness: {metrics.get('code_correctness_pct', 0):.1f}%")
            print(f"  Complexity: {metrics.get('cyclomatic_complexity', 0)}")
            print(f"  SLOC: {metrics.get('sloc', 0)}")
            print(f"  Maintainability: {metrics.get('maintainability_score', 0):.1f}")


def main():
    parser = argparse.ArgumentParser(description="Compare benchmark results")
    parser.add_argument(
        "--current",
        required=True,
        help="Current benchmark results JSON file",
    )
    parser.add_argument(
        "--baseline",
        help="Baseline benchmark results JSON file",
    )
    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Show detailed per-exercise results",
    )
    parser.add_argument(
        "--summarize",
        action="store_true",
        help="Generate summary report from latest results",
    )

    args = parser.parse_args()

    # Load current results
    current = BenchmarkComparison.load_results(args.current)

    # Load baseline if provided
    baseline = None
    if args.baseline:
        baseline = BenchmarkComparison.load_results(args.baseline)

    comparison = BenchmarkComparison(current, baseline)

    # Print comparison
    comparison.print_comparison()

    # Print token analysis
    comparison.print_token_comparison()

    # Print LLM comparison if available
    if baseline:
        comparison.print_llm_comparison()

    # Print recommendations if baseline provided
    if baseline:
        comparison.print_recommendations()

    # Print detailed results if requested
    if args.detailed:
        print("\n" + "═" * 100)
        print("║ DETAILED RESULTS".ljust(99) + "║")
        print("═" * 100)
        for tier in ["simple", "medium", "heavy"]:
            tier_data = current.get("tiers", {}).get(tier)
            if not tier_data:
                continue
            print(f"\n{tier.upper()} Tier ({tier_data['exercises']} exercises):")
            for result in tier_data.get("results", []):
                status = "✅" if result["correct"] else "❌"
                print(
                    f"  {status} {result['name']:40s} | "
                    f"Overhead: {result['overhead_ms']:7.1f}ms ({result['overhead_pct']:5.1f}%) | "
                    f"Precision: {result['precision']:.2f}, Recall: {result['recall']:.2f}"
                )


if __name__ == "__main__":
    main()
