---
name: framework-poc-design
description: Designs proof-of-concept test harnesses with measurable success criteria, realistic data scenarios, and structured reporting to validate framework integration feasibility before production commitment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: proof of concept, POC design, test harness design, framework feasibility testing, POC success criteria, spike project, prototype validation, framework integration testing
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-requirements, framework-comparison-workflow, framework-evaluation-criteria
---

# Proof-of-Concept Design Engine

Designs proof-of-concept test harnesses that exercise the three most critical integration points of a framework under realistic conditions. When loaded, this skill makes the model act as a senior test engineer — producing structured POC plans with measurable success criteria, realistic data generation strategies, automated measurement pipelines, and comprehensive reports that enable evidence-based framework commitment decisions.

## TL;DR Checklist

- [ ] Identify the top 3 integration points from requirements before designing any tests
- [ ] Define quantitative success criteria (latency thresholds, throughput targets, error rate limits) BEFORE writing any POC code
- [ ] Use realistic data shapes — not toy examples with hardcoded single records
- [ ] Timebox each POC to 4–8 hours max; if it takes longer, the scope is too broad
- [ ] Run each candidate in isolation under identical conditions for fair comparison
- [ ] Collect metrics automatically (latency, memory, throughput) — never rely on manual observation
- [ ] Compare results against success criteria and produce a structured report with evidence

---

## When to Use

Use this skill when:

- Validating a single framework candidate's feasibility before committing to production use (not comparing multiple candidates — use `framework-comparison-workflow` for that)
- After requirements are defined but before starting full implementation, to validate integration points
- When a framework has been proposed based on reputation or popularity and needs hands-on validation
- Evaluating a framework's integration with specific infrastructure components (database, message queue, auth provider)
- Assessing whether a framework's claimed capabilities hold up under realistic data volumes

---

## When NOT to Use

Avoid this skill for:

- Comparing multiple frameworks side-by-side — use `framework-comparison-workflow` instead
- During active implementation of a framework already selected and validated — use `framework-utilization` instead
- For throwaway prototypes where no decision will be made based on results
- When requirements have not yet been elicited — go back to `framework-requirements` first

---

## Core Workflow

1. **Define POC Scope from Requirements** — Select the top 3 integration points from the project's requirements catalog (see `framework-requirements` Step 4). Each integration point should represent a distinct concern: e.g., database connection, authentication flow, external API call. Document what is EXPLICITLY OUT OF SCOPE to prevent scope creep. **Checkpoint:** POC must be completable within 8 hours by one developer. If it exceeds this, reduce scope.

2. **Define Measurable Success Criteria** — For each integration point, define quantitative thresholds. Never use "works" or "fast enough." Examples: "Database connection pool establishes in < 100ms under 50 concurrent connections," "Authentication flow completes in < 300ms with JWT token validation," "External API retry logic recovers from 3 consecutive failures without data loss." **Checkpoint:** Every criterion must have a numeric threshold and a measurement method.

3. **Design Test Harness Architecture** — Create a reusable test harness that:
   - Loads configuration from environment variables (not hardcoded values)
   - Uses realistic data generators that produce data matching production schemas (field types, lengths, nullable patterns)
   - Implements automated metrics collection (timing, memory usage, error rates)
   - Produces structured output (JSON) for each test run
   **Checkpoint:** Harness must run `python poc.py --candidate=framework-a --output=results.json` with zero manual intervention.

4. **Implement POC Tests** — Write concrete test cases that exercise each integration point:
   - Happy path: basic functionality under normal conditions
   - Boundary conditions: edge cases (empty data, large payloads, concurrent access)
   - Failure scenarios: what happens when the downstream service is unavailable, returns errors, or times out
   **Checkpoint:** Each test must produce measurable output — timing data, memory metrics, error counts.

5. **Execute and Collect Results** — Run each POC under identical conditions. Record raw metrics in structured format. Note any unexpected behavior, error messages, or configuration surprises. **Checkpoint:** All three integration points must be tested for each candidate with complete metrics collected.

6. **Analyze Against Success Criteria** — Compare measured results against the success criteria defined in Step 2. Classify each criterion as PASS (meets threshold), FAIL (does not meet), or WARN (meets but marginally). Document evidence for each classification. **Checkpoint:** Any FAIL on a Must-level requirement requires explicit stakeholder acknowledgment before proceeding.

7. **Produce Structured POC Report** — Generate a comprehensive report including: executive summary, detailed findings per integration point with evidence tables, risk assessment with severity levels, and a clear recommendation (proceed/modify/reject). **Checkpoint:** Report must be self-contained — any reviewer should make the same decision from it alone.

> **Philosophy Alignment:** This workflow follows the 5 Laws of Elegant Defense from `code-philosophy`. Success criteria are defined at boundaries before code touches them (Early Exit and Fail Fast). The harness parses raw metrics into typed data structures trusted internally (Parse Don't Validate). Each criterion evaluation is a pure function with no hidden state (Atomic Predictability). Failure scenarios are tested first to ensure the system fails safely (Fail Fast). Every metric, threshold, and result carries an intentional name that reads as English (Intentional Naming).

---

## Implementation Patterns

### Pattern 1: Test Harness Dataclasses

```python
"""POC test harness framework for framework feasibility validation."""
from __future__ import annotations

import json
import os
import time
import tracemalloc
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(frozen=True)
class POCConfig:
    """Configuration for a single POC run. Immutable to prevent accidental mutation."""
    candidate_name: str
    integration_points: list[str] = field(default_factory=list)
    success_criteria: dict[str, float] = field(default_factory=dict)  # criterion -> threshold_ms
    max_duration_seconds: int = 480  # 8 hour hard limit
    data_volume: int = 1000  # number of records to process

    def validate(self) -> list[str]:
        """Return validation errors. Empty list means config is valid."""
        errors: list[str] = []
        if not self.candidate_name.strip():
            errors.append("candidate_name must be non-empty")
        if len(self.integration_points) != 3:
            errors.append(
                f"Expected exactly 3 integration points, got {len(self.integration_points)}"
            )
        for point in self.integration_points:
            if point not in self.success_criteria:
                errors.append(f"No success criterion defined for integration point: {point}")
        return errors


@dataclass
class TestResult:
    """Results from a single POC test execution."""
    run_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    candidate_name: str = ""
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    integration_point: str = ""
    success: bool = False
    duration_ms: float = 0.0
    peak_memory_mb: float = 0.0
    error_count: int = 0
    threshold_ms: float = 0.0
    evidence: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        """Serialize to JSON-compatible dict with rounded floats."""
        return {
            "run_id": self.run_id,
            "candidate_name": self.candidate_name,
            "timestamp": self.timestamp,
            "integration_point": self.integration_point,
            "success": self.success,
            "duration_ms": round(self.duration_ms, 2),
            "peak_memory_mb": round(self.peak_memory_mb, 2),
            "error_count": self.error_count,
            "threshold_ms": self.threshold_ms,
            "evidence": self.evidence,
        }


@dataclass
class POCEvaluation:
    """Aggregated evaluation of a framework candidate across all POC tests."""
    candidate_name: str
    run_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    results: list[TestResult] = field(default_factory=list)

    @property
    def summary(self) -> dict:
        """Generate a summary for reporting."""
        total = len(self.results)
        if total == 0:
            return {
                "candidate_name": self.candidate_name,
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "pass_rate_pct": 0.0,
                "avg_duration_ms": 0.0,
            }
        passed = sum(1 for r in self.results if r.success)
        avg_duration = sum(r.duration_ms for r in self.results) / total
        return {
            "candidate_name": self.candidate_name,
            "total_tests": total,
            "passed": passed,
            "failed": total - passed,
            "pass_rate_pct": round((passed / total) * 100, 1),
            "avg_duration_ms": round(avg_duration, 2),
        }

    def to_json(self) -> str:
        """Serialize full evaluation to formatted JSON string."""
        return json.dumps({
            "candidate": self.candidate_name,
            "run_at": self.run_at,
            "results": [r.to_dict() for r in self.results],
            "summary": self.summary,
        }, indent=2)


def load_config_from_env(candidate: str) -> POCConfig:
    """Load POC configuration from environment variables.

    Required env vars:
        POC_INTEGRATION_POINTS: comma-separated list of exactly 3 integration points
        POC_DATA_VOLUME: number of synthetic records to generate (default: 1000)

    Thresholds are loaded via JSON object in POC_SUCCESS_CRITERIA, e.g.:
        {"db_connect": 100.0, "auth_flow": 300.0, "api_retry": 5000.0}
    """
    points_str = os.environ.get("POC_INTEGRATION_POINTS", "")
    integration_points = [
        p.strip() for p in points_str.split(",") if p.strip()
    ]

    criteria_raw = os.environ.get("POC_SUCCESS_CRITERIA", "{}")
    try:
        success_criteria = json.loads(criteria_raw)
    except json.JSONDecodeError:
        success_criteria = {}

    return POCConfig(
        candidate_name=candidate,
        integration_points=integration_points,
        success_criteria=success_criteria,
        data_volume=int(os.environ.get("POC_DATA_VOLUME", "1000")),
    )
```

### Pattern 2: Realistic Data Generator (BAD vs. GOOD)

```python
"""Data generators that produce production-matching synthetic data."""
from __future__ import annotations

import random
import time
from datetime import datetime, timedelta


# ❌ BAD: Toy data with hardcoded single record — doesn't test real-world patterns
# This is the most common mistake in POC design: using a single record
# or trivially small dataset that cannot exercise edge cases, concurrency,
# or performance characteristics of production workloads.
def generate_toy_data() -> list[dict]:
    """Generate toy data for demonstration — DO NOT use this in real POCs."""
    return [
        {"id": 1, "name": "John", "email": "john@example.com"},
    ]


# ✅ GOOD: Realistic data generator that produces data matching production schema
def generate_realistic_user_records(count: int = 1000) -> list[dict]:
    """Generate synthetic user records matching production database schema.

    Produces data with realistic field distributions, edge cases, and patterns:
    - Null/empty fields at production frequency (~2% for optional fields)
    - Realistic name/email patterns across diverse populations
    - Age distribution matching demographic data (18-75 range)
    - Date ranges spanning 10+ years (not all timestamps are recent)
    - Account status ratios reflecting real user bases

    Args:
        count: Number of records to generate. Defaults to 1000 for POC runs.

    Returns:
        List of dicts, each representing a user record matching production schema.
    """
    first_names = [
        "James", "Maria", "Wei", "Fatima", "Carlos", "Yuki", "Emma", "Omar",
        "Aisha", "Hiroshi", "Priya", "Elena", "Kwame", "Sofia", "Liam", "Mei",
    ]
    last_names = [
        "Smith", "Garcia", "Zhang", "Al-Rashid", "Silva", "Tanaka",
        "Mueller", "Patel", "Johansson", "Kim", "O'Brien", "Singh",
        "Andersen", "Moreau", "Nakamura", "Fischer",
    ]

    records: list[dict] = []
    for i in range(count):
        # ~2% of emails intentionally left blank (matches production)
        email = None if random.random() < 0.02 else (
            f"{random.choice(first_names).lower()}.{random.randint(1, 999)}@example.com"
        )

        # Name fields always populated in production (~0% null for required fields)
        first_name = random.choice(first_names)
        last_name = random.choice(last_names)

        record: dict[str, object] = {
            "id": i + 1,
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "age": random.randint(18, 75),
            # ~5% of accounts have no creation date yet (edge case)
            "created_at": _random_date_string() if random.random() > 0.05 else None,
            "is_active": random.choice([True, True, True, False]),  # 75% active ratio
        }
        records.append(record)

    return records


def _random_date_string() -> str:
    """Generate a random date string spanning 2014-2025 for realistic age distribution."""
    base = datetime(2014, 1, 1)
    span = timedelta(days=11 * 365)
    offset = timedelta(
        days=random.randint(0, int(span.days)),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    return (base + offset).strftime("%Y-%m-%d")


# --- Timestamps ---

# ❌ BAD: All timestamps are 'now' — doesn't test time-range queries
# Every record gets the same timestamp, which means any query filtering
# on date ranges will return all-or-nothing results. This fails to exercise
# pagination, range scans, or partitioned storage.
def generate_bad_timestamps(count: int) -> list[str]:
    """Generate identical timestamps — DO NOT use this in real POCs."""


# ✅ GOOD: Timestamps span realistic ranges with production-like edge cases
    now = datetime.now().isoformat()
    return [now for _ in range(count)]


def generate_realistic_timestamps(count: int = 1000) -> list[str]:
    """Generate timestamps spanning a production-like date range.

    Includes:
    - Dates spanning 3 years (not all recent, exercises range queries)
    - ~1% null timestamps (matching production data quality issues)
    - Realistic event distribution peaks (business hours > off-hours)

    Args:
        count: Number of timestamp strings to generate.

    Returns:
        List of ISO format timestamp strings with realistic distribution.
    """
    base_date = datetime(2022, 1, 1)
    three_years_days = 3 * 365

    timestamps: list[str] = []
    for _ in range(count):
        if random.random() < 0.01:
            timestamps.append("")  # Missing timestamp edge case (empty string, not None)
        else:
            random_offset = timedelta(
                days=random.randint(0, three_years_days),
                hours=random.randint(6, 22),  # Bias toward business hours
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59),
            )
            ts = base_date + random_offset
            timestamps.append(ts.isoformat())

    return timestamps


# --- Data Generation Harness Integration ---

def generate_dataset_for_integration_point(
    integration_point: str,
    volume: int,
    seed: int | None = None,
) -> list[dict] | list[str]:
    """Generate synthetic data tailored to a specific integration point.

    Different integration points need different data shapes:
    - "database_connection" → user records for bulk CRUD testing
    - "authentication_flow" → credential sets for login stress testing
    - "external_api_call" → timestamped events for API throughput testing

    Args:
        integration_point: Name of the integration point being tested.
        volume: Number of data items to generate.
        seed: Optional random seed for reproducible test runs.

    Returns:
        Data items matching the expected schema for the integration point.
    """
    if seed is not None:
        random.seed(seed)

    match integration_point:
        case "database_connection":
            return generate_realistic_user_records(volume)
        case "authentication_flow":
            users = generate_realistic_user_records(max(10, volume // 10))
            return [
                {"username": u["first_name"].lower() + str(u["id"]), "email": u["email"]}
                for u in users[:min(50, len(users))]
            ]
        case "external_api_call":
            return generate_realistic_timestamps(volume)
        case _:
            return generate_realistic_user_records(volume)
```

### Pattern 3: Automated Threshold Validation and Reporting

```python
"""Automated validation of POC results against success criteria."""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class CriterionStatus(Enum):
    """Classification of a criterion evaluation result."""
    PASS = "PASS"
    FAIL = "FAIL"
    WARN = "WARN"  # Met threshold but with < 20% margin


@dataclass(frozen=True)
class CriterionEvaluation:
    """Result of evaluating one success criterion against measured data."""
    integration_point: str
    criterion_name: str
    measured_value_ms: float
    threshold_ms: float
    status: CriterionStatus
    evidence: str

    def to_dict(self) -> dict:
        return {
            "integration_point": self.integration_point,
            "criterion_name": self.criterion_name,
            "measured_value_ms": round(self.measured_value_ms, 2),
            "threshold_ms": self.threshold_ms,
            "status": self.status.value,
            "evidence": self.evidence,
        }


def evaluate_criterion(
    measured_value_ms: float,
    threshold_ms: float,
    direction: str = "lower_is_better",
) -> tuple[CriterionStatus, str]:
    """Evaluate a single criterion against its threshold.

    Returns (status, evidence_message).

    WARN is returned when the threshold is met but with less than 20% margin,
    indicating the framework barely passes and may fail under heavier load.

    Args:
        measured_value_ms: The actual measured value in milliseconds.
        threshold_ms: The maximum acceptable value in milliseconds.
        direction: "lower_is_better" for latency/error rates,
                   "higher_is_better" for throughput/success rate.

    Returns:
        Tuple of (status classification, human-readable evidence string).
    """
    if direction == "lower_is_better":
        margin = (
            ((threshold_ms - measured_value_ms) / threshold_ms * 100)
            if threshold_ms > 0
            else 0
        )
        status = (
            CriterionStatus.WARN if 0 <= margin < 20
            else CriterionStatus.PASS if margin >= 20
            else CriterionStatus.FAIL
        )
        evidence = (
            f"Measured {measured_value_ms:.1f}ms vs threshold {threshold_ms:.1f}ms "
            f"({margin:.1f}% margin)"
        )
    else:
        margin = (
            ((measured_value_ms - threshold_ms) / threshold_ms * 100)
            if threshold_ms > 0
            else 0
        )
        status = (
            CriterionStatus.WARN if 0 <= margin < 20
            else CriterionStatus.PASS if margin >= 20
            else CriterionStatus.FAIL
        )
        evidence = (
            f"Measured {measured_value_ms:.1f}ms vs threshold {threshold_ms:.1f}ms "
            f"({margin:.1f}% above)"
        )

    return status, evidence


@dataclass
class RiskItem:
    """A risk identified during POC execution with severity rating."""
    description: str
    severity: str  # "high", "medium", "low"
    mitigation: str
    integration_point: str = ""

    def to_dict(self) -> dict:
        return {
            "description": self.description,
            "severity": self.severity,
            "mitigation": self.mitigation,
            "integration_point": self.integration_point,
        }


def generate_poc_report(
    evaluations: list[CriterionEvaluation],
    risks: list[RiskItem] | None = None,
) -> str:
    """Generate a human-readable POC report from collected evaluations.

    Produces a structured, self-contained report that any reviewer can read
    and understand without needing the POC author to explain findings.

    Args:
        evaluations: List of criterion evaluation results.
        risks: Optional list of identified risks with severity ratings.

    Returns:
        Formatted markdown report string.
    """
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    # Calculate aggregate statistics
    total = len(evaluations)
    passed = sum(1 for e in evaluations if e.status == CriterionStatus.PASS)
    failed = sum(1 for e in evaluations if e.status == CriterionStatus.FAIL)
    warned = sum(1 for e in evaluations if e.status == CriterionStatus.WARN)

    lines: list[str] = [
        "# POC Evaluation Report",
        f"**Generated:** {now}",
        f"**Total Criteria Evaluated:** {total}",
        "",
        "## Executive Summary",
        "",
        f"- **Passed:** {passed}/{total} ({(passed / total * 100) if total else 0:.1f}%)",
        f"- **Failed:** {failed}/{total}",
        f"- **Warnings:** {warned}/{total}",
        "",
    ]

    # High-level recommendation based on results
    if failed > 0:
        must_fail_count = sum(
            1 for e in evaluations
            if e.status == CriterionStatus.FAIL and "must" in e.criterion_name.lower()
        )
        if must_fail_count > 0:
            lines.append("> **Recommendation: REJECT** — Must-level criteria failed. ")
            lines.append("  Framework does not meet baseline requirements.")
        else:
            lines.append(
                "> **Recommendation: MODIFY** — Non-essential criteria failed. "
                "Framework may work with adjustments."
            )
    elif warned > total // 2:
        lines.append(
            "> **Recommendation: MODIFY** — Most criteria barely passed. "
            "Framework meets thresholds but with insufficient margin for production."
        )
    else:
        lines.append("> **Recommendation: PROCEED** — Framework meets success criteria "
                     "with adequate margin.")

    lines.extend(["", "---", "", "## Integration Point Results", ""])

    # Group evaluations by integration point
    by_point: dict[str, list[CriterionEvaluation]] = {}
    for eval_item in evaluations:
        by_point.setdefault(eval_item.integration_point, []).append(eval_item)

    for point_name, point_evals in by_point.items():
        lines.append(f"### {point_name}")
        lines.append("")
        lines.append("| Criterion | Measured | Threshold | Status | Evidence |")
        lines.append("|-----------|----------|-----------|--------|----------|")
        for ev in point_evals:
            status_icon = "✅" if ev.status == CriterionStatus.PASS else (
                "⚠️" if ev.status == CriterionStatus.WARN else "❌"
            )
            lines.append(
                f"| {ev.criterion_name} | {ev.measured_value_ms:.1f}ms | "
                f"{ev.threshold_ms:.1f}ms | {status_icon} {ev.status.value} | "
                f"{ev.evidence} |"
            )
        lines.append("")

    # Risk assessment section
    if risks:
        lines.extend(["---", "", "## Risk Assessment", ""])
        for risk in risks:
            severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(
                risk.severity, "⚪"
            )
            lines.append(f"- {severity_icon} **[{risk.severity.upper()}]** {risk.description}")
            lines.append(f"  Mitigation: {risk.mitigation}")
        lines.append("")

    # Raw data reference
    lines.extend(["---", "", "## Raw Data"])
    lines.append("Evaluation results are available as JSON for programmatic analysis.")

    return "\n".join(lines)


# --- CLI Entry Point ---

def run_poc(candidate_name: str, output_path: str | None = None) -> POCEvaluation:
    """Execute a full POC run and optionally save results to file.

    This is the entry point for `python poc.py --candidate=framework-a`.

    Args:
        candidate_name: Name of the framework being evaluated.
        output_path: Optional path to save JSON results. If None, prints to stdout.

    Returns:
        POCEvaluation with all collected test results.
    """
    config = load_config_from_env(candidate_name)

    validation_errors = config.validate()
    if validation_errors:
        print(f"Invalid POC configuration:")
        for error in validation_errors:
            print(f"  - {error}")
        sys.exit(1)

    evaluation = POCEvaluation(candidate_name=candidate_name)
    tracemalloc.start()

    try:
        for point in config.integration_points:
            tracemalloc.reset_peak()
            start = time.perf_counter_ns()

            # Execute the integration point test (framework-specific)
            data = generate_dataset_for_integration_point(point, config.data_volume)
            _run_integration_test(candidate_name, point, data)

            end = time.perf_counter_ns()
            peak_memory = tracemalloc.get_traced_memory()[1] / (1024 * 1024)

            duration_ms = (end - start) / 1_000_000
            threshold_ms = config.success_criteria.get(point, 0)

            status, evidence = evaluate_criterion(duration_ms, threshold_ms)
            success = status in (CriterionStatus.PASS, CriterionStatus.WARN)

            result = TestResult(
                candidate_name=candidate_name,
                integration_point=point,
                success=success,
                duration_ms=duration_ms,
                peak_memory_mb=peak_memory,
                threshold_ms=threshold_ms,
                evidence=[evidence],
            )
            evaluation.results.append(result)

    finally:
        tracemalloc.stop()

    # Output results
    json_output = evaluation.to_json()
    if output_path:
        with open(output_path, "w") as f:
            f.write(json_output)
        print(f"Results written to {output_path}")
    else:
        print(json_output)

    return evaluation


def _run_integration_test(
    candidate: str, integration_point: str, data: list[dict] | list[str]
) -> None:
    """Execute the actual integration test for a single point.

    This is where framework-specific code would go — the harness provides
    the structure; the implementer plugs in the real framework calls.

    Args:
        candidate: Framework being tested.
        integration_point: Which integration point is being exercised.
        data: Synthetic data to test with.
    """
    # Framework-specific integration code goes here.
    # The harness measures time, memory, and errors automatically.
    # Implementers override this function or pass custom test functions.
    _ = (candidate, integration_point, data)  # Placeholder for actual test code
```

---

## Constraints

### MUST DO
- Define measurable success criteria with numeric thresholds BEFORE writing any POC code — never proceed with subjective criteria like "works" or "fast enough"
- Use realistic data shapes that match production schema patterns (null fields, edge cases, diverse distributions) — not single-record toy examples
- Timebox each POC to 8 hours maximum; scope creep is the #1 cause of inconclusive POCs and wasted effort
- Run each candidate under identical conditions for fair comparison — same machine, same network, same data volume, same measurement methodology
- Collect metrics automatically (latency, memory, throughput, error counts) — never rely on manual observation or stopwatch timing
- Classify results as PASS/FAIL/WARN with evidence for each classification; WARN means threshold met but with less than 20% margin
- Include at least one failure scenario test per integration point to validate error handling and resilience
- Structure POC output in JSON format for programmatic analysis and comparison

### MUST NOT DO
- Design a POC that tests more than 3 integration points — scope will explode and conclusions become unclear
- Use hardcoded data where production data would have nulls, empty strings, or edge cases — these are where frameworks break
- Make success criteria subjective ("fast enough", "works as expected", "reasonable performance") — every criterion needs a number
- Run POCs with different machine resources or network conditions between candidates — unfair comparison invalidates results
- Skip the failure scenario tests — you only learn what happens when everything works, which is not how production behaves
- Produce a report that requires the POC author to explain — it must be self-contained with evidence tables and clear recommendations

---

## Output Template

When this skill is active, the model's output must contain:

1. **POC Scope Document** — Integration points selected (max 3) with justification for why each was chosen, success criteria with numeric thresholds and measurement methods for each point, explicit out-of-scope items listed as a bullet list
2. **Test Harness Code** — Complete, runnable test harness with typed dataclasses, realistic data generators that match production schemas, automated metrics collection (timing via `time.perf_counter_ns`, memory via `tracemalloc`), and structured JSON output
3. **Results Summary Table** — Per-candidate table showing PASS/FAIL/WARN for each criterion with measured values, thresholds, and evidence; grouped by integration point; includes pass rate percentage and average duration
4. **Risk Assessment** — High/Medium/Low risk items identified during the POC with severity ratings (🔴/🟡/🟢), descriptions, and specific mitigation suggestions per item
5. **Recommendation** — Clear proceed/modify/reject recommendation backed by evidence from the results table; if REJECT, cite which must-level criteria failed; if MODIFY, specify what adjustments are needed

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-requirements` | Source of integration points to test and requirements catalog (used in Step 1) |
| `framework-comparison-workflow` | Alternative workflow when comparing multiple candidates side-by-side instead of validating a single one |
| `framework-evaluation-criteria` | Evaluation dimension structure for defining measurable criteria with proper thresholds |

---

## Live References

> Authoritative documentation links for proof-of-concept design and evaluation. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — Proof of Concept](https://en.wikipedia.org/wiki/Proof_of_concept) — Definition, purpose, and lifecycle of PoCs in software engineering including when to use them vs prototypes vs spikes
- [Atlassian — Designing a Proof of Concept](https://www.atlassian.com/agile/project-management/poCs) — Practical guide to scoping PoCs, defining success criteria, and transitioning findings into production-ready implementations
- [Martin Fowler — Spike Solution](https://martinfowler.com/bliki/SpikeSolution.html) — Time-boxed investigation approach for reducing risk through experimental code before committing to an architecture
- [RICE Prioritization Framework (ProductPlan)](https://www.productplan.com/learning/rice-prioritization/) — Reach, Impact, Confidence, Effort scoring model for ranking PoC candidates by business value and feasibility
- [Scrum Guide — Sprint Structure for POCs](https://scrumguides.org/scrum-guide.html) — How to run time-boxed investigation sprints within Scrum ceremonies for framework evaluation
