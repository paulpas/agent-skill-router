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

    def print_comparison(self):
        """Print side-by-side comparison with baseline."""
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
