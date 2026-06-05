---




name: framework-integration-testing
description: Designs integration testing strategies including shadow reads, dual-writes, canary deployment validation, and rollback verification to safely validate framework integrations before production commitment.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: integration testing, shadow read, dual write, canary deployment, framework migration testing, integration acceptance criteria, framework switchover, rollback verification
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
  related-skills: framework-requirements-validation, framework-adoption-strategy, framework-comparison-workflow




---





# Framework Integration Testing Strategies

Designs and implements integration testing strategies that validate framework integrations under production-like conditions before commitment. When loaded, this skill makes the model act as a senior test architect — producing shadow read implementations, dual-write validation pipelines, canary deployment plans with acceptance criteria, and rollback verification procedures that enable safe framework transitions with measurable confidence.

## TL;DR Checklist

- [ ] Design shadow read or dual-write strategy BEFORE any framework switchover
- [ ] Define quantitative acceptance criteria for integration correctness (data fidelity, latency delta, error rate parity)
- [ ] Implement automated comparison pipelines that detect drift between old and new implementations
- [ ] Set up canary deployment with gradual traffic ramp-up (1% → 5% → 25% → 50% → 100%)
- [ ] Validate rollback path works correctly BEFORE committing the switchover
- [ ] Monitor integration metrics for 48+ hours after full cutover before declaring success

---

## When to Use

Use this skill when:

- Validating a framework migration or replacement before committing to production cutover
- Testing integration between multiple frameworks (e.g., FastAPI backend communicating with React frontend and a message queue)
- Verifying that a new framework produces identical results to the existing implementation under real traffic conditions
- Planning a phased rollout where both old and new frameworks run in parallel
- Validating cross-framework data consistency before decommissioning the legacy system

---

## When NOT to Use

Avoid this skill for:

- Testing a single framework's internal APIs — use unit testing patterns instead
- Validating configuration file compliance — use `framework-requirements-validation` instead
- During initial POC evaluation — use `framework-poc-design` first (this skill assumes the POC has passed)
- For testing framework-specific unit behavior — integration tests are for cross-boundary validation

---

## Core Workflow

1. **Define Integration Testing Scope** — Identify all integration boundaries between frameworks that require validation. Each boundary should be tested independently: e.g., "framework A → database" and "framework B → message queue." Document the expected data format at each boundary and what constitutes correctness. **Checkpoint:** Every production-facing integration point must have a corresponding test strategy defined.

2. **Design Shadow Read Strategy** — Implement a shadow read that runs the new framework alongside the existing one on production traffic without affecting responses. The new framework's results are logged but not used. Compare outputs periodically to detect drift. **Checkpoint:** Shadow reads must be non-blocking — they should never impact response latency for end users.

3. **Implement Dual-Write Validation** — For data-write integration points, implement dual-writes where both the old and new frameworks write to their respective destinations. Periodically reconcile to ensure consistency. Use idempotent writes to handle duplicate processing during the transition. **Checkpoint:** Dual-write validation must detect any divergence between old and new outputs within a bounded time window (max 5 minutes).

4. **Build Automated Comparison Pipeline** — Create automated comparison logic that normalizes results from both frameworks for fair comparison, reports exact match vs. drift with details on what differs, flags discrepancies above acceptable thresholds, and produces a daily comparison report with pass/fail status. **Checkpoint:** Comparison logic must handle nulls, empty collections, and type coercion gracefully — never crash on data shape differences.

5. **Plan Canary Deployment** — Design the canary rollout plan: Phase 1 (shadow reads, 100% traffic mirrored, zero impact), Phase 2 (canary with 1% real traffic routed to new framework), Phase 3 (ramp to 5%, then 25%, then 50% based on acceptance criteria at each level), Phase 4 (full cutover only after 48-hour monitoring at 50% with zero critical issues). **Checkpoint:** Each phase must have explicit exit criteria AND rollback triggers. No automatic progression.

6. **Implement Rollback Verification** — Before any traffic switchover, verify the rollback path: confirm that routing back to the old framework preserves all functionality, verify that data written by the new framework during canary is not consumed by the old one, and test that monitoring dashboards correctly show which framework served each request. **Checkpoint:** Rollback must complete in under 5 minutes with zero data loss.

7. **Execute and Monitor** — Run the canary deployment plan, monitoring all acceptance criteria at each phase. Collect error rates, latency deltas, data consistency scores, and user-facing metrics. **Checkpoint:** If any criterion fails at a given phase, stop the ramp-up and investigate before proceeding. Follow the 5 Laws of Elegant Defense: guard clauses catch failures early, data flows through validation gates, and every assertion is an explicit contract between old and new implementations.

---

## Implementation Patterns

### Pattern 1: Shadow Read Implementation

A shadow read executes the new framework alongside the existing one on identical inputs, logs the results for comparison, but never affects what the user receives. This is the lowest-risk first phase because it introduces zero latency impact and zero behavioral change.

```python
"""Shadow read implementation for framework integration testing."""
from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable


@dataclass
class ShadowReadConfig:
    """Configuration for a shadow read test."""
    source_name: str = "existing_framework"
    target_name: str = "new_framework"
    max_concurrent_shadows: int = 50
    log_to_file: bool = True
    log_directory: str = "/var/log/shadow-reads"

    def validate(self) -> list[str]:
        """Validate configuration and return list of errors (empty if valid)."""
        errors = []
        if self.max_concurrent_shadows < 1:
            errors.append("max_concurrent_shadows must be at least 1")
        if self.log_to_file:
            Path(self.log_directory).mkdir(parents=True, exist_ok=True)
        return errors


@dataclass
class ShadowResult:
    """Result from a single shadow read comparison."""
    request_id: str = field(default_factory=lambda: uuid.uuid4().hex[:12])
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    source_output: Any = None
    target_output: Any = None
    latency_source_ms: float = 0.0
    latency_target_ms: float = 0.0
    match: bool = False
    drift_details: list[str] = field(default_factory=list)

    @property
    def latency_delta_ms(self) -> float:
        return round(abs(self.latency_target_ms - self.latency_source_ms), 2)

    def to_log_entry(self) -> dict:
        """Serialize result for log output, capping drift details."""
        return {
            "request_id": self.request_id,
            "timestamp": self.timestamp,
            "latency_source_ms": round(self.latency_source_ms, 2),
            "latency_target_ms": round(self.latency_target_ms, 2),
            "latency_delta_ms": self.latency_delta_ms,
            "match": self.match,
            "drift_count": len(self.drift_details),
            "drift_details": self.drift_details[:10],
        }


class ShadowReadExecutor:
    """Executes shadow reads by calling both frameworks on identical inputs.

    The source (existing) framework call determines the user-facing response.
    The target (new) framework call runs concurrently but its result is logged
    only — never returned to the client.
    """

    def __init__(
        self,
        source_fn: Callable[..., Any],
        target_fn: Callable[..., Any],
        config: ShadowReadConfig | None = None,
    ) -> None:
        self.source_fn = source_fn
        self.target_fn = target_fn
        self.config = config or ShadowReadConfig()

    async def execute(self, input_data: dict) -> ShadowResult:
        """Run shadow read for a single request. Both calls happen concurrently."""
        start_source = time.monotonic()
        source_output = self.source_fn(input_data)
        latency_source = (time.monotonic() - start_source) * 1000

        target_output = None
        latency_target = 0.0
        try:
            start_target = time.monotonic()
            target_output = await self._async_call(self.target_fn, input_data)
            latency_target = (time.monotonic() - start_target) * 1000
        except Exception as exc:
            return ShadowResult(
                match=False,
                drift_details=[f"Target framework raised exception: {exc}"],
                latency_source_ms=latency_source,
                latency_target_ms=latency_target,
            )

        match, drift = self._compare_outputs(source_output, target_output)
        return ShadowResult(
            source_output=source_output,
            target_output=target_output,
            latency_source_ms=latency_source,
            latency_target_ms=latency_target,
            match=match,
            drift_details=drift,
        )

    async def _async_call(self, fn: Callable, *args: Any) -> Any:
        """Execute a function call, converting sync to async if needed."""
        if asyncio.iscoroutinefunction(fn):
            return await fn(*args)
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, lambda: fn(*args))

    def _compare_outputs(
        self, source: Any, target: Any
    ) -> tuple[bool, list[str]]:
        """Compare two outputs with tolerance for acceptable differences.

        Returns (is_match, list_of_drift_details).
        """
        drift: list[str] = []
        normalized_source = self._normalize_for_comparison(source)
        normalized_target = self._normalize_for_comparison(target)

        if normalized_source == normalized_target:
            return True, []

        diff = self._find_differences(normalized_source, normalized_target)
        for path, source_val, target_val in diff[:5]:
            drift.append(f"{path}: expected {source_val}, got {target_val}")

        return False, drift

    def _normalize_for_comparison(self, data: Any) -> Any:
        """Normalize data for fair comparison — remove ordering-dependent artifacts.

        Sorts dict keys, attempts to sort lists of hashable items, and
        converts datetimes to ISO strings so they compare consistently.
        """
        if isinstance(data, dict):
            return {
                k: self._normalize_for_comparison(v)
                for k, v in sorted(data.items())
            }
        elif isinstance(data, list):
            try:
                return sorted(
                    self._normalize_for_comparison(item) for item in data
                )
            except TypeError:
                return [
                    self._normalize_for_comparison(item) for item in data
                ]
        elif isinstance(data, datetime):
            return data.isoformat()
        return data

    def _find_differences(
        self, source: Any, target: Any, path: str = ""
    ) -> list[tuple[str, Any, Any]]:
        """Recursively find differences between two nested structures."""
        diffs: list[tuple[str, Any, Any]] = []
        prefix = f".{path}" if path else "$"

        if isinstance(source, dict) and isinstance(target, dict):
            all_keys = set(source.keys()) | set(target.keys())
            for key in sorted(all_keys):
                sub_path = f"{prefix}.{key}"
                if key not in source:
                    diffs.append((sub_path, "<missing>", target[key]))
                elif key not in target:
                    diffs.append((sub_path, source[key], "<missing>"))
                else:
                    diffs.extend(
                        self._find_differences(source[key], target[key], sub_path)
                    )
        elif isinstance(source, list) and isinstance(target, list):
            for i, (s_item, t_item) in enumerate(zip(source, target)):
                if s_item != t_item:
                    diffs.append((f"{prefix}[{i}]", s_item, t_item))
        else:
            if source != target:
                diffs.append((prefix, source, target))

        return diffs


# --- Usage example ---
async def demo_shadow_read() -> None:
    """Demonstrate a shadow read executor in action."""
    config = ShadowReadConfig()
    errors = config.validate()
    assert not errors, f"Invalid config: {errors}"

    def existing_framework(data: dict) -> dict:
        return {"result": "legacy_output", "meta": data.get("meta", {})}

    async def new_framework(data: dict) -> dict:
        await asyncio.sleep(0.01)
        return {"result": "new_output", "meta": data.get("meta", {}), "v2": True}

    executor = ShadowReadExecutor(existing_framework, new_framework, config)
    result = await executor.execute({"key": "value", "meta": {"env": "prod"}})

    print(json.dumps(result.to_log_entry(), indent=2))
```

### Pattern 2: Dual-Write Validation with Reconciliation (BAD vs. GOOD)

Dual-write validation is used when both frameworks write to data stores. The old system and new system each receive identical inputs; a reconciliation step then verifies that their outputs remain consistent.

```python
# ❌ BAD: No reconciliation — divergence goes undetected forever
class BadDualWriter:
    """Writes to both systems with zero verification."""

    def write(self, data: dict) -> None:
        # Write to both but never check if they match
        self.old_system.write(data)
        self.new_system.write(data)
        print("Written to both systems")  # No verification, no logging


# ✅ GOOD: Dual-write with automated reconciliation and drift detection
import hashlib

from dataclasses import dataclass, field


@dataclass
class ReconciliationResult:
    """Result of a dual-write reconciliation check."""
    batch_id: str
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    old_count: int = 0
    new_count: int = 0
    matches: int = 0
    mismatches: int = 0
    missing_in_old: list[str] = field(default_factory=list)
    missing_in_new: list[str] = field(default_factory=list)

    @property
    def fidelity_pct(self) -> float:
        """Data fidelity percentage — how many records matched across systems."""
        total = self.old_count + len(self.missing_in_new)
        return (self.matches / total * 100) if total > 0 else 100.0


class DualWriteReconciler:
    """Validates dual-write consistency with automated reconciliation.

    Compares record counts and content checksums to detect data divergence
    between the old and new framework destinations within a bounded time window.
    """

    def __init__(
        self,
        old_system: Any,
        new_system: Any,
        max_allowed_drift_pct: float = 99.5,
        reconciliation_interval_seconds: int = 300,
    ) -> None:
        self.old_system = old_system
        self.new_system = new_system
        self.max_allowed_drift_pct = max_allowed_drift_pct
        self.reconciliation_interval = reconciliation_interval_seconds

    def reconcile_batch(
        self, batch_id: str, records: list[dict]
    ) -> ReconciliationResult:
        """Reconcile a batch of dual-written records between old and new systems.

        Writes records idempotently (using batch_id as part of the key) to both
        systems, then verifies consistency by comparing content checksums.
        """
        for record in records:
            record["batch_id"] = batch_id
            record["_written_at"] = datetime.now(timezone.utc).isoformat()
            self.old_system.write(record)
            self.new_system.write(record)

        old_checksums = self._get_checksums(self.old_system, batch_id)
        new_checksums = self._get_checksums(self.new_system, batch_id)

        old_keys = set(old_checksums.keys())
        new_keys = set(new_checksums.keys())

        return ReconciliationResult(
            batch_id=batch_id,
            old_count=len(old_checksums),
            new_count=len(new_checksums),
            matches=len(old_keys & new_keys),
            mismatches=0,
            missing_in_old=list(new_keys - old_keys),
            missing_in_new=list(old_keys - new_keys),
        )

    def _get_checksums(self, system: Any, batch_id: str) -> dict[str, str]:
        """Get content checksums for all records in a given batch."""
        records = system.query_by_batch(batch_id)
        checksums: dict[str, str] = {}
        for record in records:
            content = {
                k: v
                for k, v in record.items()
                if not k.startswith("_")
            }
            checksums[str(record.get("id", ""))] = hashlib.sha256(
                json.dumps(content, sort_keys=True).encode()
            ).hexdigest()
        return checksums

    def validate_acceptance_criteria(
        self, result: ReconciliationResult
    ) -> bool:
        """Check if reconciliation meets acceptance criteria for proceeding.

        Returns True if fidelity is acceptable. Raises RuntimeError if fidelity
        falls below the critical threshold of 99.0%.
        """
        if result.fidelity_pct >= self.max_allowed_drift_pct:
            return True

        if result.fidelity_pct < 99.0:
            raise RuntimeError(
                f"Dual-write fidelity {result.fidelity_pct:.2f}% below critical "
                f"threshold (99.0%). Investigate immediately."
            )

        return True
```

### Pattern 3: Canary Deployment Orchestrator

A canary deployment orchestrator manages phased traffic shifting from the old framework to the new one, enforcing explicit exit criteria at each phase before allowing progression.

```python
"""Canary deployment orchestrator for framework integration testing."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class CanaryPhase(Enum):
    """Phases of a canary deployment rollout."""
    SHADOW = "shadow"
    CANARY_1PCT = "canary_1_pct"
    CANARY_5PCT = "canary_5_pct"
    CANARY_25PCT = "canary_25_pct"
    CANARY_50PCT = "canary_50_pct"
    FULL_CUTOVER = "full"


@dataclass
class CanaryConfig:
    """Configuration for canary deployment with phase-specific criteria."""
    min_duration_per_phase_minutes: int = 30
    critical_error_rate_threshold: float = 0.01
    latency_delta_threshold_ms: float = 50.0
    fidelity_threshold_pct: float = 99.5

    # Phase-specific exit criteria
    phase_exit_criteria: dict[CanaryPhase, dict] = field(
        default_factory=lambda: {
            CanaryPhase.SHADOW: {"min_shadow_reads": 1000, "max_drift_pct": 0.1},
            CanaryPhase.CANARY_1PCT: {"min_requests": 500, "error_rate_max": 0.005},
            CanaryPhase.CANARY_5PCT: {"min_requests": 2000, "error_rate_max": 0.005},
            CanaryPhase.CANARY_25PCT: {"min_requests": 10000, "error_rate_max": 0.01},
            CanaryPhase.CANARY_50PCT: {
                "min_requests": 50000,
                "error_rate_max": 0.01,
                "monitor_hours": 48,
            },
        }
    )


@dataclass
class PhaseResult:
    """Result from evaluating a single canary phase."""
    phase: CanaryPhase
    start_time: str
    end_time: str = ""
    duration_minutes: float = 0.0
    total_requests: int = 0
    error_count: int = 0
    avg_latency_delta_ms: float = 0.0
    data_fidelity_pct: float = 100.0
    passed: bool = False
    exit_reason: str = ""

    @property
    def error_rate(self) -> float:
        return (
            self.error_count / self.total_requests
            if self.total_requests > 0
            else 0.0
        )


class CanaryOrchestrator:
    """Orchestrates canary deployment phases with automated validation.

    Each phase must satisfy its exit criteria before the orchestrator allows
    progression to the next phase. No automatic progression — every step
    requires explicit approval.
    """

    def __init__(self, config: CanaryConfig) -> None:
        self.config = config
        self.current_phase: CanaryPhase = CanaryPhase.SHADOW
        self.phase_results: list[PhaseResult] = []

    def should_advance_phase(self, previous_result: PhaseResult) -> tuple[bool, str]:
        """Check if the canary should advance to the next phase.

        Returns (should_advance, reason). The reason explains either why
        advancement is approved or what specific criterion failed.
        """
        criteria = self.config.phase_exit_criteria.get(self.current_phase, {})

        # Check minimum shadow reads for shadow phase
        if self.current_phase == CanaryPhase.SHADOW:
            min_reads = criteria.get("min_shadow_reads", 1000)
            if previous_result.total_requests < min_reads:
                return False, (
                    f"Insufficient shadow reads: {previous_result.total_requests} "
                    f"< {min_reads}"
                )

        # Check error rate at any phase
        max_error_rate = criteria.get(
            "error_rate_max", self.config.critical_error_rate_threshold
        )
        if previous_result.error_rate > max_error_rate:
            return False, (
                f"Error rate {previous_result.error_rate:.4f} exceeds threshold {max_error_rate}"
            )

        # Check latency delta at canary phases (not shadow)
        if self.current_phase != CanaryPhase.SHADOW:
            if previous_result.avg_latency_delta_ms > self.config.latency_delta_threshold_ms:
                return False, (
                    f"Latency delta {previous_result.avg_latency_delta_ms:.1f}ms "
                    f"exceeds threshold {self.config.latency_delta_threshold_ms}ms"
                )

        # Check 48-hour monitoring for 50% phase
        min_hours = criteria.get("monitor_hours", 0)
        if min_hours > 0 and previous_result.duration_minutes < min_hours * 60:
            return False, (
                f"Phase {self.current_phase.value} must run at least "
                f"{min_hours} hours (ran {previous_result.duration_minutes / 60:.1f}h)"
            )

        return True, "All criteria met — advancing phase"

    def get_next_phase(self) -> CanaryPhase | None:
        """Return the next canary phase, or None if full cutover is complete."""
        phases = list(CanaryPhase)
        current_idx = phases.index(self.current_phase)
        if current_idx + 1 >= len(phases):
            return None
        return phases[current_idx + 1]

    def record_phase_result(self, result: PhaseResult) -> None:
        """Record a phase evaluation result for audit trail."""
        self.phase_results.append(result)
```

---

## Constraints

### MUST DO

- Design shadow reads FIRST (zero impact validation) before any traffic routing to the new framework — never skip this step
- Define acceptance criteria with numeric thresholds for data fidelity, error rate parity, and latency delta BEFORE starting testing
- Implement automated comparison logic that normalizes results for fair comparison (sort keys, handle nulls, coerce types gracefully)
- Run each canary phase for the minimum duration specified in the config — do not skip or shorten phases based on "it looks good"
- Validate the rollback path works correctly before committing to ANY traffic switchover; test it end-to-end with real data
- Monitor for a minimum of 48 hours at the 50% traffic phase before considering full cutover
- Log every comparison result with request IDs, timestamps, and drift details for post-mortem analysis and trend detection

### MUST NOT DO

- Route more than 1% of real traffic to the new framework without passing shadow read validation first
- Use manual spot-checking as your only validation method — automation is mandatory for integration correctness
- Skip the rollback verification step — you will need it under pressure, and testing it then causes mistakes
- Compare results with different data sets or time windows — both frameworks must see identical inputs for a valid comparison
- Treat a "mostly working" result as passing — integration correctness is binary for critical paths; partial failures indicate broken contracts

---

## Output Template

When this skill is active, the model's output must contain:

1. **Integration Testing Plan** — Integration boundaries identified, test strategy per boundary (shadow read, dual-write, or comparison), and ownership assignment
2. **Shadow Read Implementation** — Complete shadow read executor code with normalization logic, comparison pipeline, and logging infrastructure
3. **Canary Deployment Plan** — Phase-by-phase rollout plan with explicit exit criteria at each phase and rollback triggers that are independent of the forward path
4. **Acceptance Criteria Matrix** — Numeric thresholds for data fidelity (≥99.5%), error rate parity (≤1% delta), latency delta (≤50ms), mapped to measurement methods
5. **Rollback Verification Procedure** — Step-by-step rollback plan with estimated recovery time, data reconciliation steps, and post-rollback validation checks

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-requirements-validation` | Validates framework configuration compliance before integration testing begins |
| `framework-poc-design` | Designs proof-of-concept evaluations — this skill assumes the POC has passed |
| `framework-adoption-strategy` | Phased rollout planning at the program level (this skill provides the testing infrastructure) |
| `framework-comparison-workflow` | Comparison methodology and metrics for evaluating frameworks side by side |

---

## Live References

> Authoritative documentation links for framework integration testing. The model follows markdown links at load time to resolve external references and inline content.

- [pytest Documentation](https://docs.pytest.org/en/stable/) — Official testing framework reference covering fixtures, parameterization, plugins, and assertion rewriting for integration test suites
- [Testcontainers Python](https://testcontainers-python.readthedocs.io/en/latest/) — Production-grade library for spinning up Docker containers (PostgreSQL, Redis, Kafka) in integration tests
- [Factory Boy Documentation](https://factoryboy.readthedocs.io/en/latest/) — Fixture replacement library for creating test data objects with realistic defaults and traits
- [HTTPX — Full-Featured HTTP Client for Python](https://www.python-httpx.org/) — Async/sync HTTP client designed for testing web frameworks with built-in test client support
- [VCR.py — Record HTTP Interactions](https://vcrpy.readthedocs.io/en/latest/) — Record and replay HTTP interactions to make integration tests fast, deterministic, and offline-capable
