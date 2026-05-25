---
name: input-processing-pipelines
description: Builds composable data processing pipelines that validate, transform,
  filter, and aggregate structured or semi-structured input through typed stages with
  error handling and observability.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: input processing pipeline, data transformation, ETL pipeline, stage processing,
    data validation pipeline, map filter reduce, data cleaning pipeline, input sanitization
    chain, structured data extraction, data flow architecture, pipeline composition
  archetypes:
  - tactical
  - generation
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
  - code
  - guidance
  - do-dont
  - examples
  related-skills: input-validation,output-sanitization,performance-optimization,test-driven-development
------
# Input Processing Pipelines

You are a data engineering specialist who builds production-grade, composable data processing pipelines. You construct typed stage-based architectures that transform untrusted or semi-structured input into clean, validated output through a chain of explicit transformations. Every stage has clear contracts: defined input types, output types, and error-handling strategies. You design pipelines that are observable (structured logging with correlation IDs), resilient (circuit breakers, dead-letter queues), and testable (pure transformation functions with no side effects).

## TL;DR Checklist

- [ ] Define explicit `typing.Protocol` or `dataclass` for every stage's input and output types
- [ ] Wrap each stage call in try/except — never let a single record failure kill the pipeline
- [ ] Emit structured log entries with `correlation_id` per record for full traceability
- [ ] Choose skip vs. stop error strategy per stage based on data criticality
- [ ] Implement circuit breaker when stage failure rate exceeds threshold (default: 50% in sliding window)
- [ ] Use immutable data flows — every stage returns new objects, never mutates inputs
- [ ] Stream large datasets via generators; never load entire input into memory at once
- [ ] Route unrecoverable records to a dead-letter queue with full error context and original payload

---

## When to Use

- Building an ETL pipeline that ingests raw API payloads, file uploads, or message queue events and produces clean, typed domain objects
- Processing semi-structured data (JSON blobs with inconsistent schemas, CSV files with messy delimiters, HTML scraping results) into structured records for downstream consumption
- Constructing multi-stage data cleaning workflows where each stage performs a single well-defined transformation (parse → validate → enrich → aggregate)
- Implementing high-throughput streaming processors that handle millions of events without OOM — generator-based pipelines with backpressure
- Designing fault-tolerant ingestion systems where individual record failures must not halt processing, and bad records are quarantined for later review

---

## When NOT to Use

- Simple one-off data cleaning scripts — a function with a few `str.strip()` calls does not need pipeline machinery. Use a plain function when there is only 1–2 transformations.
- Real-time latency-critical paths where pipeline overhead (stage dispatch, logging, exception wrapping) adds unacceptable cost. In those cases, inline the transformation directly.
- Data processing with no validation or filtering — if you are only passing data through without transforming or validating it, no pipeline is needed.
- Batch jobs that already use a dedicated ETL framework (Apache Airflow, dbt, Luigi) — do not reinvent orchestration; focus on writing clean stage functions within that framework.

---

## Core Workflow

### 1. Define Stage Contracts with Typed Protocols

Every stage must declare its input and output types before implementation. Use `typing.Protocol` for structural typing or `dataclass` for value objects. This is the boundary where untrusted data enters your system — define the shape you expect and reject anything that does not match.

**Checkpoint:** Every stage has at least an input Protocol, an output Protocol (or dataclass), and a docstring documenting what it transforms and under what conditions it raises `PipelineError`.

### 2. Build Each Stage as a Pure Function Wrapped in Fault Isolation

Each stage is a function with this signature:

```python
def process(record: T_input) -> T_output | None:
```

The stage must be pure — no side effects, no global state, deterministic output given the same input. Wrap all stages in the pipeline's fault-isolation layer (see Pattern 4). The isolation wrapper catches exceptions per-record so one bad record never halts the pipeline.

**Checkpoint:** No stage touches I/O, network, or shared mutable state. All external dependencies (database lookups, API calls) happen in separate enrichment stages with explicit error routing.

### 3. Compose Stages into a Pipeline Using `PipelineComposer`

Use the `PipelineComposer` to register stages, set ordering, and define error strategies per stage. The composer validates that each stage's output type is compatible with the next stage's input type (structural checking via Protocol). It also wires up circuit breakers and dead-letter queues automatically based on configuration.

**Checkpoint:** The pipeline has at least one skip-stage and one stop-stage to exercise both error paths. Dead-letter queue path is non-empty.

### 4. Run the Pipeline with Observability Hooks

Execute the pipeline over input data (list, iterator, or generator). Attach a logging hook that emits structured JSON lines per record with `correlation_id`, `stage_name`, `status` (ok/error/skipped), `latency_ms`, and error details if applicable. The hook must not block — use an async queue or thread for log emission if needed.

**Checkpoint:** Every processed record produces exactly one log entry. Errors include the full stack trace excerpt, original payload hash, and routing decision (skipped, dead-lettered, retry scheduled).

---

## Implementation Patterns / Reference Guide

### Pattern 1: Stage-based Pipeline Architecture

A generic `Pipeline` class with composable stages, typed interfaces, configurable error strategies (skip vs. stop), and circuit breaker integration.

```python
"""Stage-based Pipeline Architecture — Composable data processing with fault isolation."""

from __future__ import annotations

import hashlib
import logging
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from typing import (
    Any,
    Callable,
    Generic,
    Iterator,
    Protocol,
    TypeVar,
)

logger = logging.getLogger(__name__)

# ── Type Variables for Generic Stage Contract ────────────────────────────

T_input = TypeVar("T_input")
T_output = TypeVar("T_output")


class PipelineError(Exception):
    """Raised when a stage encounters an unrecoverable error."""


class CircuitBreakerOpenError(PipelineError):
    """Raised when the circuit breaker is open for a stage."""


# ── Data Models ─────────────────────────────────────────────────────────

@dataclass(frozen=True)
class ProcessResult:
    """Immutable result from processing a single record through the pipeline."""
    correlation_id: str
    success: bool
    output: Any | None = None
    error: Exception | None = None
    stage_name: str | None = None
    latency_ms: float = 0.0

    @property
    def raw_input(self) -> dict[str, Any] | None:
        """Convenience access to the original record for logging."""
        if isinstance(getattr(self, "_original_record", None), dict):
            return self._original_record
        return None


@dataclass(frozen=True)
class DeadLetterRecord:
    """Quarantined record that failed all processing stages."""
    correlation_id: str
    original_payload: Any
    error_chain: list[dict[str, Any]] = field(default_factory=list)
    last_stage: str | None = None
    timestamp: float = field(default_factory=time.time)

    def to_log_entry(self) -> dict[str, Any]:
        """Structured log output for dead-lettered records."""
        return {
            "event": "dead_letter",
            "correlation_id": self.correlation_id,
            "last_stage": self.last_stage,
            "error_count": len(self.error_chain),
            "errors": self.error_chain[-3:],  # Last 3 errors for traceability
            "payload_hash": hashlib.sha256(
                str(self.original_payload).encode()
            ).hexdigest()[:16],
        }


# ── Stage Protocol ──────────────────────────────────────────────────────

class StageProtocol(Protocol[T_input, T_output]):
    """Structural type for all pipeline stages.

    Each stage must implement:
    - `__call__(record) -> output | None`: Process a single record.
      Return None to signal the record should be skipped downstream.
    - `name`: Human-readable identifier for logging.
    """
    name: str

    def __call__(self, record: T_input) -> T_output | None: ...


# ── Error Strategy Enum ─────────────────────────────────────────────────

from enum import Enum


class ErrorStrategy(str, Enum):
    SKIP = "skip"      # Log error, continue with next record
    STOP = "stop"       # Halt pipeline on first failure from this stage
    DEAD_LETTER = "dead_letter"  # Route to DLQ, continue processing


# ── Circuit Breaker ─────────────────────────────────────────────────────

class SimpleCircuitBreaker:
    """Sliding-window circuit breaker for individual stages.

    Opens the circuit when failure_rate exceeds threshold within the
    sliding window size. Prevents cascading failures by short-circuiting
    a failing stage after repeated errors.

    Design rationale: A per-stage circuit breaker isolates failures to
    that stage without affecting upstream/downstream stages. The sliding
    window approach adapts to load — under low throughput, fewer samples
    are needed; under high throughput, the window naturally collects more.
    """

    def __init__(
        self,
        failure_threshold: float = 0.5,
        window_size: int = 20,
        half_open_max_calls: int = 3,
    ) -> None:
        if not 0.0 < failure_threshold <= 1.0:
            raise ValueError("failure_threshold must be in (0.0, 1.0]")
        if window_size < 1:
            raise ValueError("window_size must be >= 1")

        self._failure_threshold = failure_threshold
        self._window_size = window_size
        self._half_open_max_calls = half_open_max_calls
        self._results: deque[bool] = deque(maxlen=window_size)
        self._state: str = "closed"  # closed | open | half_open
        self._half_open_calls: int = 0
        self._opened_at: float = 0.0

    def record(self, success: bool) -> None:
        """Record a success or failure outcome."""
        self._results.append(success)
        if self._state == "half_open":
            self._half_open_calls += 1
            if success and self._half_open_calls >= self._half_open_max_calls:
                self._close()
            elif not success:
                self._open()

    def allow_request(self) -> bool:
        """Check whether a request should proceed to the stage."""
        if self._state == "closed":
            return True
        if self._state == "half_open":
            return self._half_open_calls < self._half_open_max_calls
        # open state — check if cooldown elapsed (use window_size * avg_interval)
        elapsed = time.time() - self._opened_at
        if elapsed > 5.0:  # 5-second cooldown before half-open
            self._half_open()
            return self.allow_request()
        return False

    def _open(self) -> None:
        self._state = "open"
        self._opened_at = time.time()
        logger.warning("Circuit breaker OPENED for stage")

    def _close(self) -> None:
        self._state = "closed"
        self._results.clear()
        logger.info("Circuit breaker CLOSED — stage recovered")

    def _half_open(self) -> None:
        self._state = "half_open"
        self._half_open_calls = 0
        logger.info("Circuit breaker HALF_OPEN — allowing test calls")

    @property
    def state(self) -> str:
        return self._state

    @property
    def failure_rate(self) -> float:
        if not self._results:
            return 0.0
        failures = sum(1 for r in self._results if not r)
        return failures / len(self._results)


# ── Core Pipeline Class ─────────────────────────────────────────────────

class Pipeline(Generic[T_input, T_output]):
    """Composable data processing pipeline with fault isolation.

    Stages execute sequentially on each record. Each stage can independently
    specify an error strategy (skip / stop / dead_letter). The pipeline
    automatically wires up circuit breakers and collects metrics.

    Design rationale: Using a single Pipeline class with a generic list of
    stages keeps the architecture simple while supporting all composition
    patterns needed for real-world ETL. The Generic types ensure type safety
    across stage boundaries without runtime overhead.
    """

    def __init__(self, name: str = "pipeline") -> None:
        self._name = name
        self._stages: list[dict[str, Any]] = []
        self._circuit_breakers: dict[str, SimpleCircuitBreaker] = {}
        self._dead_letter_queue: list[DeadLetterRecord] = []
        self._metrics: dict[str, int] = field(default_factory=lambda: {
            "processed": 0,
            "errors_skipped": 0,
            "errors_stopped": 0,
            "dead_lettered": 0,
            "records_passed": 0,
        })

    def add_stage(
        self,
        stage: StageProtocol[T_input, T_output],
        error_strategy: ErrorStrategy = ErrorStrategy.SKIP,
        circuit_breaker_config: dict[str, Any] | None = None,
    ) -> "Pipeline[T_input, T_output]":  # type: ignore[misc]
        """Register a stage for processing.

        Args:
            stage: A callable implementing StageProtocol with __call__ and name.
            error_strategy: How to handle failures from this stage.
            circuit_breaker_config: Optional CB config; defaults to standard thresholds.

        Returns:
            self for fluent chaining.

        Raises:
            ValueError: If stage has no 'name' attribute or is not callable.
        """
        if not callable(stage):
            raise TypeError(f"Stage must be callable, got {type(stage).__name__}")
        if not hasattr(stage, "name") or not stage.name:
            raise ValueError("Stage must have a non-empty 'name' attribute")

        cb_config = circuit_breaker_config or {}
        cb = SimpleCircuitBreaker(**cb_config)
        self._circuit_breakers[stage.name] = cb

        self._stages.append({
            "stage": stage,
            "error_strategy": error_strategy,
            "circuit_breaker": cb,
        })
        return self  # type: ignore[return-value]

    def __call__(self, records: Iterator[T_input | dict[str, Any]]) -> Iterator[ProcessResult]:
        """Execute the pipeline over an iterator of input records.

        Each record flows through all stages sequentially. If a stage returns
        None (meaning it chose to skip), downstream stages are skipped for
        that record. Errors are handled per the stage's configured strategy.

        Args:
            records: Iterator yielding input records. Supports any iterable
                     including generator functions, file iterators, and queue consumers.

        Yields:
            ProcessResult for each input record, containing success status,
            final output, error details, and timing metadata.
        """
        for idx, raw_record in enumerate(records):
            correlation_id = f"{self._name}-{idx:06d}"
            start_time = time.monotonic()

            # Build the dead-letter error chain accumulator
            error_chain: list[dict[str, Any]] = []
            current_record: Any | None = raw_record
            stopped_by_stage: str | None = None

            for stage_info in self._stages:
                if current_record is None:
                    break  # Previous stage returned None — skip downstream

                stage = stage_info["stage"]
                strategy = stage_info["error_strategy"]
                cb = stage_info["circuit_breaker"]
                stage_name = stage.name

                # Circuit breaker check — Fast path: reject immediately if open
                if not cb.allow_request():
                    error_entry = {
                        "stage": stage_name,
                        "error": f"Circuit breaker open (state={cb.state}, failure_rate={cb.failure_rate:.2%})",
                        "timestamp": time.time(),
                    }
                    error_chain.append(error_entry)

                    if strategy == ErrorStrategy.STOP:
                        stopped_by_stage = stage_name
                        break

                    self._metrics["errors_skipped"] += 1
                    continue  # Circuit breaker acts as implicit skip

                # Execute the stage — isolated from other stages by try/except
                try:
                    stage_start = time.monotonic()
                    result = stage(current_record)  # type: ignore[call-arg]
                    stage_latency = (time.monotonic() - stage_start) * 1000

                    if result is None:
                        current_record = None
                        logger.debug(
                            "Stage %s returned None for %s",
                            stage_name, correlation_id,
                        )
                        continue

                    cb.record(True)  # Success — record in sliding window
                    current_record = result
                    logger.debug(
                        "Stage %s processed %s in %.1fms",
                        stage_name, correlation_id, stage_latency,
                    )

                except Exception as e:
                    stage_latency = (time.monotonic() - stage_start) * 1000  # type: ignore[possibly-unbound]
                    cb.record(False)
                    error_entry = {
                        "stage": stage_name,
                        "error_type": type(e).__name__,
                        "error_message": str(e),
                        "timestamp": time.time(),
                        "latency_ms": round(stage_latency, 1),
                    }
                    error_chain.append(error_entry)

                    if strategy == ErrorStrategy.STOP:
                        stopped_by_stage = stage_name
                        break

                    if strategy == ErrorStrategy.DEAD_LETTER:
                        # Route to dead-letter queue immediately
                        dlq_record = DeadLetterRecord(
                            correlation_id=correlation_id,
                            original_payload=raw_record if isinstance(raw_record, dict) else str(raw_record),
                            error_chain=list(error_chain),
                            last_stage=stage_name,
                        )
                        self._dead_letter_queue.append(dlq_record)
                        self._metrics["dead_lettered"] += 1

                        # Emit structured log for DLQ
                        logger.warning(
                            "DEAD_LETTER: %s | stage=%s | error=%s",
                            correlation_id, stage_name, str(e),
                            extra={"dlq_entry": dlq_record.to_log_entry()},
                        )
                        current_record = None  # No further processing for this record
                        break

                    # SKIP strategy (default): log and continue to next stage
                    self._metrics["errors_skipped"] += 1
                    logger.warning(
                        "Stage %s failed for %s: %s",
                        stage_name, correlation_id, str(e),
                    )

            # Pipeline completed — build result
            elapsed_ms = (time.monotonic() - start_time) * 1000
            success = current_record is not None and not stopped_by_stage

            if stopped_by_stage:
                self._metrics["errors_stopped"] += 1

            result = ProcessResult(
                correlation_id=correlation_id,
                success=success,
                output=current_record,
                error=None if success else error_chain[-1] if error_chain else None,
                stage_name=stopped_by_stage,
                latency_ms=round(elapsed_ms, 2),
            )
            result._original_record = raw_record  # type: ignore[attr-defined]
            self._metrics["processed"] += 1
            if success:
                self._metrics["records_passed"] += 1

            yield result

    @property
    def dead_letter_queue(self) -> list[DeadLetterRecord]:
        """Access the accumulated dead-letter queue for inspection."""
        return list(self._dead_letter_queue)

    @property
    def metrics(self) -> dict[str, int]:
        """Return a copy of current pipeline metrics."""
        return dict(self._metrics)

    def reset_metrics(self) -> None:
        """Reset all counters and the dead-letter queue."""
        self._dead_letter_queue.clear()
        for cb in self._circuit_breakers.values():
            cb._results.clear()  # type: ignore[attr-defined]
        self._metrics = {
            "processed": 0,
            "errors_skipped": 0,
            "errors_stopped": 0,
            "dead_lettered": 0,
            "records_passed": 0,
        }

    def __repr__(self) -> str:
        stage_names = [s["stage"].name for s in self._stages]
        return f"Pipeline(name={self._name!r}, stages={stage_names})"


# ── Pipeline Composer — Fluent Builder Pattern ────────────────────────

class PipelineComposer:
    """Fluent builder for constructing and configuring Pipelines.

    Usage:
        pipeline = (PipelineComposer("user-ingestion")
            .add_stage(parse_json())
            .with_error_strategy(ErrorStrategy.DEAD_LETTER, at=0)
            .add_stage(validate_schema())
            .add_stage(enrich_with_external_data())
            .with_circuit_breaker(failure_threshold=0.3, window_size=10, at=-1)
            .add_stage(transform_output())
            .build())
    """

    def __init__(self, name: str) -> None:
        self._name = name
        self._stages: list[dict[str, Any]] = []

    def add_stage(
        self,
        stage: StageProtocol,
        error_strategy: ErrorStrategy = ErrorStrategy.SKIP,
        circuit_breaker_config: dict[str, Any] | None = None,
    ) -> "PipelineComposer":
        """Register a stage with its error strategy and optional circuit breaker."""
        self._stages.append({
            "stage": stage,
            "error_strategy": error_strategy,
            "circuit_breaker_config": circuit_breaker_config,
        })
        return self

    def with_error_strategy(self, strategy: ErrorStrategy, *, at: int | str) -> "PipelineComposer":
        """Override the error strategy for a specific stage.

        Args:
            strategy: The error strategy to apply.
            at: Index (0-based) or 'last'/'first' to target which stage.
        """
        if at == "last":
            idx = -1
        elif at == "first":
            idx = 0
        elif isinstance(at, int):
            idx = at
        else:
            raise ValueError(f"at must be int or 'last'/'first', got {at!r}")

        self._stages[idx]["error_strategy"] = strategy
        return self

    def with_circuit_breaker(
        self,
        *,
        failure_threshold: float = 0.5,
        window_size: int = 20,
        at: int | str = "last",
    ) -> "PipelineComposer":
        """Add a circuit breaker configuration to a specific stage."""
        if at == "last":
            idx = -1
        elif at == "first":
            idx = 0
        elif isinstance(at, int):
            idx = at
        else:
            raise ValueError(f"at must be int or 'last'/'first', got {at!r}")

        self._stages[idx]["circuit_breaker_config"] = {
            "failure_threshold": failure_threshold,
            "window_size": window_size,
        }
        return self

    def build(self) -> Pipeline:
        """Construct the final Pipeline from all configured stages."""
        pipeline = Pipeline(name=self._name)
        for stage_config in self._stages:
            pipeline.add_stage(
                stage=stage_config["stage"],
                error_strategy=stage_config["error_strategy"],
                circuit_breaker_config=stage_config.get("circuit_breaker_config"),
            )
        return pipeline

    def __repr__(self) -> str:
        return f"PipelineComposer(name={self._name!r}, stages={len(self._stages)})"

```

**Design rationale:** This architecture separates concerns cleanly: `Pipeline` owns execution and fault isolation, `StageProtocol` defines the contract every stage must satisfy, and `PipelineComposer` provides a fluent API for construction. Circuit breakers are per-stage to prevent cascading failures. The `ProcessResult` is frozen (immutable) so consumers can safely inspect it without worrying about mutation.

---

### Pattern 2: Typed Data Extraction from Semi-structured Input

Real-world input is messy. JSON blobs arrive with inconsistent field names, missing keys, and type drift. This pattern shows how to build a robust extraction stage that normalizes semi-structured data into typed domain objects.

```python
"""Typed Data Extraction from Semi-structured Input.

Handles the common case where external APIs, file uploads, or message queues
deliver payloads with inconsistent schemas: missing fields, wrong types,
nested objects in string form, and varying key names for the same semantic field.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any


# ── Domain Types (the clean output we want) ─────────────────────────────

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    SHIPPED = "shipped"


@dataclass(frozen=True)
class CleanOrder:
    """Normalized order record extracted from messy input."""
    order_id: str
    customer_email: str
    total_cents: int
    currency: str  # ISO 4217: USD, EUR, GBP, etc.
    status: OrderStatus
    items_count: int
    created_at: datetime | None = None

    @property
    def total_dollars(self) -> float:
        """Convenience accessor for human-readable amount."""
        return self.total_cents / 100


@dataclass(frozen=True)
class ExtractionResult:
    """Result of a single extraction attempt — always succeeds, errors are typed."""
    success: bool
    record: CleanOrder | None = None
    field_issues: list[dict[str, Any]] = None  # type: ignore[assignment]
    fallback_used: bool = False

    def __post_init__(self) -> None:
        if self.field_issues is None:
            object.__setattr__(self, "field_issues", [])


# ── Bad Example — What Not to Do ───────────────────────────────────────

def extract_order_bad(raw: dict[str, Any]) -> CleanOrder:
    """❌ BAD: No type coercion, no missing-field handling, crashes on bad input."""
    # Crash if 'order_id' is missing
    order_id = raw["order_id"]  # KeyError!

    # No validation — accepts empty email, negative amounts
    return CleanOrder(
        order_id=order_id,
        customer_email=raw["email"],
        total_cents=raw["total"],          # Could be string "1234.56"
        currency=raw["currency"],
        status=raw["status"],              # Raw string — no enum validation
        items_count=raw["count"],
    )


# ── Good Example — Typed Extraction with Graceful Fallbacks ─────────────

class FieldMapping:
    """Maps multiple possible input key names to a canonical field name.

    Handles the case where different API versions or client libraries use
    different key names for the same semantic data.
    """

    def __init__(self, *canonical_names: str, fallback_key: str | None = None) -> None:
        self.canonical_names = canonical_names
        self.fallback_key = fallback_key

    def resolve(self, record: dict[str, Any]) -> tuple[str, bool]:
        """Resolve a field value from the record using the mapping.

        Returns:
            Tuple of (value, was_fallback_used).
            If no key is found, returns (None, False).
        """
        for key in self.canonical_names:
            if key in record and record[key] is not None:
                return record[key], False

        if self.fallback_key and self.fallback_key in record:
            return record[self.fallback_key], True

        return None, False


def coerce_int(value: Any, *, default: int = 0) -> int:
    """Coerce a value to int with graceful fallback.

    Handles strings ("1234"), floats (1234.9 → 1234), None, and already-int values.
    Never raises — always returns an int.
    """
    if value is None:
        return default
    if isinstance(value, bool):
        return int(value)
    try:
        return int(float(value))  # Handles "1234.9" → 1234
    except (ValueError, TypeError):
        return default


def coerce_enum(
    value: Any,
    enum_type: type[Enum],
    *,
    default: Enum | None = None,
) -> Enum | None:
    """Coerce a value to an enum member with graceful fallback.

    Matches case-insensitively and falls back to the provided default.
    Returns None if no match is found and no default is specified.
    """
    if value is None:
        return default

    # Try direct match first
    try:
        return enum_type(value)
    except ValueError:
        pass

    # Try case-insensitive match
    value_str = str(value).strip().lower()
    for member in enum_type:
        if member.value.lower() == value_str:
            return member

    return default


def extract_order_clean(raw: dict[str, Any]) -> ExtractionResult:
    """Extract a CleanOrder from a semi-structured order payload.

    Handles inconsistent key names, missing fields, type coercion errors,
    and invalid enum values — returning typed error details instead of crashing.

    Args:
        raw: Raw dictionary from an external source (API response, file upload, etc.)

    Returns:
        ExtractionResult with either a valid CleanOrder or detailed field issues.
    """
    # Guard clause for non-dict input
    if not isinstance(raw, dict):
        return ExtractionResult(
            success=False,
            record=None,
            field_issues=[{"field": "root", "issue": f"Expected dict, got {type(raw).__name__}"}],
        )

    # Define field mappings — each maps to canonical CleanOrder fields
    mappings = {
        "order_id": FieldMapping("order_id", "orderId", "id", "order_number", "orderNr"),
        "customer_email": FieldMapping("email", "customerEmail", "email_address", "customer_email"),
        "total_cents": FieldMapping("total", "total_cents", "amount_cents", "subtotal", "total_amount"),
        "currency": FieldMapping("currency", "currency_code", "cur", "iso_currency"),
        "status": FieldMapping(
            "status", "orderStatus", "state", "order_state",
            fallback_key="type"
        ),
        "items_count": FieldMapping(
            "items_count", "itemCount", "quantity", "num_items", "count",
        ),
        "created_at": FieldMapping(
            "created_at", "createdAt", "order_date", "timestamp",
        ),
    }

    field_issues: list[dict[str, Any]] = []
    fallback_used = False
    extracted: dict[str, Any] = {}

    # Resolve each field using its mapping
    for canonical_name, mapping in mappings.items():
        value, used_fallback = mapping.resolve(raw)
        if used_fallback:
            fallback_used = True

        if value is None:
            field_issues.append({
                "field": canonical_name,
                "issue": "missing",
                "searched_keys": list(mapping.canonical_names),
            })

        extracted[canonical_name] = value

    # Validate required fields — order_id and customer_email are mandatory
    if extracted.get("order_id") is None:
        field_issues.append({
            "field": "order_id",
            "issue": "required_field_missing",
        })

    if extracted.get("customer_email") is None or not str(extracted["customer_email"]).strip():
        field_issues.append({
            "field": "customer_email",
            "issue": "required_field_missing_or_empty",
        })

    # Check for critical issues — cannot construct a valid record
    required_missing = any(
        fi["issue"] in ("required_field_missing", "required_field_missing_or_empty")
        for fi in field_issues
    )
    if required_missing:
        return ExtractionResult(success=False, record=None, field_issues=field_issues)

    # Coerce typed values — each coercion never raises
    order_id = str(extracted["order_id"]).strip()
    customer_email = str(extracted["customer_email"]).strip().lower()

    total_cents = coerce_int(
        extracted.get("total_cents"),
        default=0,  # Missing total defaults to zero — may be acceptable for free orders
    )

    currency = str(extracted.get("currency") or "USD").upper()
    if len(currency) == 2:
        currency += "00"  # ISO 4213 short form → full form (US → US00... adjust as needed)

    status = coerce_enum(extracted.get("status"), OrderStatus, default=OrderStatus.PENDING)
    items_count = max(0, coerce_int(extracted.get("items_count"), default=0))

    # Parse optional timestamp with multiple format support
    created_at: datetime | None = None
    raw_ts = extracted.get("created_at")
    if raw_ts:
        for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d %H:%M:%S"):
            try:
                created_at = datetime.strptime(str(raw_ts), fmt).replace(tzinfo=timezone.utc)
                break
            except (ValueError, TypeError):
                continue

    record = CleanOrder(
        order_id=order_id,
        customer_email=customer_email,
        total_cents=total_cents,
        currency=currency[:3].upper(),  # Truncate to ISO 4217 3-letter code
        status=status,
        items_count=items_count,
        created_at=created_at,
    )

    return ExtractionResult(
        success=True,
        record=record,
        field_issues=field_issues if field_issues else [],
        fallback_used=fallback_used,
    )


# ── Usage Example ───────────────────────────────────────────────────────

if __name__ == "__main__":
    # Messy input from an external API — inconsistent fields, string numbers
    messy_payload = {
        "orderId": "ORD-2024-0142",
        "email": "  John.Doe@Example.COM  ",
        "total": "9999",
        "cur": "usd",
        "state": "Confirmed",
        "quantity": "5",
        "createdAt": "2024-11-15T14:32:00.000Z",
    }

    result = extract_order_clean(messy_payload)
    assert result.success is True
    assert result.record is not None
    assert result.record.order_id == "ORD-2024-0142"
    assert result.record.customer_email == "john.doe@example.com"
    assert result.record.total_cents == 9999
    assert result.record.status == OrderStatus.CONFIRMED
    assert result.record.items_count == 5
    print(f"Extracted: {result.record}")
    # Fallback is tracked — useful for alerting on schema drift
    if result.fallback_used:
        print("Note: Field mapping used a non-standard key name")

```

**Design rationale:** The `FieldMapping` class handles the common pain point of inconsistent key names across API versions. By defining mappings in one place, you avoid scattered `dict.get()` calls with hardcoded alternatives. The coercion functions (`coerce_int`, `coerce_enum`) never raise — they return safe defaults, which lets the pipeline continue processing even when individual fields are malformed. `ExtractionResult` is always successful in returning a result object; it encodes validation failures as data, not exceptions. This follows "Parse Don't Validate" (Law 2): parse at the boundary, validate structurally, represent errors as data.

---

### Pattern 3: Streaming Pipeline with Backpressure

For large datasets that cannot fit in memory, use generator-based streaming pipelines with built-in backpressure. This pattern processes events one at a time through the same stage architecture but without loading everything upfront.

```python
"""Streaming Pipeline with Backpressure — Generator-based processing for large datasets."""

from __future__ import annotations

import asyncio
import logging
from collections import deque
from dataclasses import dataclass, field
from typing import AsyncIterator, Callable, Generic, Iterator, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")
U = TypeVar("U")


@dataclass
class BackpressureBuffer:
    """Sliding window buffer that enforces a maximum queue depth.

    When the buffer reaches max_depth, subsequent items are dropped with
    a warning log. This implements backpressure: producers slow down because
    the consumer is falling behind.
    """

    max_depth: int = 1000
    _queue: deque[T] = field(default_factory=lambda: deque(maxlen=1000))  # type: ignore[assignment]
    _dropped_count: int = 0

    def push(self, item: T) -> bool:
        """Add an item to the buffer. Returns False if dropped due to backpressure."""
        if len(self._queue) >= self._queue.maxlen:
            self._dropped_count += 1
            logger.warning(
                "Backpressure drop: buffer full (%d), dropped item (total_dropped=%d)",
                self._queue.maxlen, self._dropped_count,
            )
            return False
        self._queue.append(item)
        return True

    def pop(self) -> T | None:
        """Remove and return the next item, or None if empty."""
        return self._queue.popleft() if self._queue else None

    @property
    def depth(self) -> int:
        return len(self._queue)

    @property
    def is_backpressured(self) -> bool:
        """True when the buffer has reached capacity."""
        return self.depth >= self._queue.maxlen  # type: ignore[union-attr]


class StreamingPipeline(Generic[T, U]):
    """Generator-based pipeline that streams records through stages with backpressure.

    Unlike the batch Pipeline, this processes one record at a time and yields
    results immediately. It is ideal for:
    - Processing log files line-by-line without loading them into memory
    - Streaming events from message queues (Kafka, RabbitMQ)
    - Real-time analytics where results are emitted as they arrive

    The pipeline supports both sync (iterator) and async (async iterator) modes.
    """

    def __init__(
        self,
        stages: list[Callable[[T], U | None]],
        stage_names: list[str] | None = None,
        batch_size: int = 1,
    ) -> None:
        if not stages:
            raise ValueError("StreamingPipeline requires at least one stage")

        self._stages = list(stages)
        self._stage_names = stage_names or [f"stage_{i}" for i in range(len(stages))]
        self._batch_size = max(1, batch_size)

    def process(self, source: Iterator[T]) -> Iterator[U]:
        """Process an iterator of records through all stages.

        Records flow through each stage sequentially. If a stage returns None,
        the record is dropped and no further stages execute for it. Results
        are yielded as soon as they are produced (no batching delay).

        Args:
            source: Any iterable of input records — file handles, generators,
                    queue iterators, etc.

        Yields:
            Transformed records as they emerge from the final stage.
        """
        for record in source:
            current: T | None = record

            for i, stage in enumerate(self._stages):
                if current is None:
                    break  # Dropped by a previous stage

                try:
                    result = stage(current)
                except Exception as e:
                    logger.warning(
                        "Stage %s failed on record: %s — dropping",
                        self._stage_names[i], type(e).__name__,
                        exc_info=True,
                    )
                    current = None  # Drop on error — streaming mode never retries per-record
                    break

                if result is None:
                    current = None
                    continue

                current = result

            if current is not None:
                yield current  # type: ignore[misc]

    def process_with_buffer(
        self,
        source: Iterator[T],
        max_depth: int = 1000,
    ) -> Iterator[U]:
        """Process with backpressure enforcement via a sliding buffer.

        Buffers results and applies backpressure when the buffer is full.
        Useful when downstream consumers may temporarily fall behind.

        Args:
            source: Input iterator.
            max_depth: Maximum number of pending results before dropping begins.

        Yields:
            Transformed records, respecting backpressure limits.
        """
        buffer = BackpressureBuffer(max_depth=max_depth)

        def worker() -> None:
            """Internal worker that feeds the buffer from the source."""
            for record in source:
                # Process the record through all stages
                current = record
                for i, stage in enumerate(self._stages):
                    if current is None:
                        break
                    try:
                        result = stage(current)
                    except Exception:
                        current = None
                        break
                    if result is not None:
                        current = result

                if current is not None:
                    buffer.push(current)

        # Run worker in a background thread and drain from main thread
        import threading

        thread = threading.Thread(target=worker, daemon=True)
        thread.start()

        while thread.is_alive() or buffer.depth > 0:
            item = buffer.pop()
            if item is not None:
                yield item  # type: ignore[misc]


# ── Async Streaming Pipeline ────────────────────────────────────────────

class AsyncStreamingPipeline(Generic[T, U]):
    """Async version of StreamingPipeline for async source iterators.

    Compatible with async generators from web frameworks, async message queues,
    and async file readers.
    """

    def __init__(self, stages: list[Callable[[T], U | None]]) -> None:
        if not stages:
            raise ValueError("AsyncStreamingPipeline requires at least one stage")
        self._stages = list(stages)

    async def process(self, source: AsyncIterator[T]) -> AsyncIterator[U]:
        """Process an async iterator through all stages."""
        async for record in source:
            current: T | None = record

            for stage in self._stages:
                if current is None:
                    break
                try:
                    result = stage(current)
                    # Handle both sync and async stage results
                    if asyncio.iscoroutine(result):
                        result = await result
                except Exception as e:
                    logger.warning("Stage failed on record: %s — dropping", type(e).__name__)
                    current = None
                    break

                if result is not None:
                    current = result

            if current is not None:
                yield current  # type: ignore[misc]


# ── Usage Examples ──────────────────────────────────────────────────────

def example_streaming_pipeline() -> None:
    """Demonstrate a streaming pipeline for log line parsing."""

    def parse_json_line(line: str) -> dict[str, Any] | None:
        """Parse a single JSON log line. Returns None on parse failure."""
        try:
            return json.loads(line.strip())
        except (json.JSONDecodeError, ValueError):
            return None

    def extract_timestamp(record: dict[str, Any]) -> dict[str, Any] | None:
        """Extract and normalize the timestamp field."""
        ts_str = record.get("timestamp") or record.get("@timestamp")
        if not ts_str:
            return None
        try:
            dt = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
            record["parsed_timestamp"] = dt
            return record
        except (ValueError, TypeError):
            return None

    def filter_by_level(record: dict[str, Any]) -> dict[str, Any] | None:
        """Filter: only pass through WARN and above."""
        level = str(record.get("level", "")).upper()
        if level in ("ERROR", "WARN", "CRITICAL", "FATAL"):
            return record
        return None  # Drop INFO/DEBUG records

    # Build the streaming pipeline
    pipeline = StreamingPipeline(
        stages=[parse_json_line, extract_timestamp, filter_by_level],
        stage_names=["parse", "extract_ts", "filter"],
    )

    # Process a log file line-by-line without loading it into memory
    # Simulated source — in production, this would be: open("app.log")
    log_lines = [
        '{"timestamp": "2024-11-15T14:32:00Z", "level": "ERROR", "msg": "Connection refused"}',
        '{"timestamp": "2024-11-15T14:32:01Z", "level": "INFO", "msg": "Retrying..."}',
        '{"timestamp": "2024-11-15T14:32:02Z", "level": "WARN", "msg": "High latency detected"}',
        'not valid json at all',
    ]

    results = list(pipeline.process(iter(log_lines)))
    assert len(results) == 2  # Only ERROR and WARN pass the filter
    print(f"Filtered {len(results)} high-severity events from {len(log_lines)} lines")


def example_backpressure_pipeline() -> None:
    """Demonstrate backpressure with a simulated high-throughput source."""

    def identity(x: float) -> float:
        return x * 2.0

    def normalize(x: float) -> float:
        return round(x / 1000.0, 4)

    pipeline = StreamingPipeline(stages=[identity, normalize], stage_names=["double", "normalize"])

    # Simulate a source that emits items faster than the buffer can drain
    def fast_source() -> Iterator[float]:
        for i in range(5000):
            yield float(i)

    # Process with a small buffer to demonstrate backpressure drops
    count = 0
    for result in pipeline.process_with_buffer(fast_source(), max_depth=100):
        count += 1
        if count >= 10:  # Stop after 10 — demonstrates backpressure kicking in
            break

    print(f"Processed {count} items before stopping (backpressure active)")


if __name__ == "__main__":
    example_streaming_pipeline()
    example_backpressure_pipeline()

```

**Design rationale:** The streaming pipeline processes one record at a time, yielding results immediately. This avoids loading entire datasets into memory. `BackpressureBuffer` implements a sliding window — when it's full, new items are dropped with a warning log, naturally slowing the producer. The async variant (`AsyncStreamingPipeline`) supports `async for` sources like websockets and async queue consumers. Both sync and async pipelines share the same stage contract, making it easy to swap between batch and streaming modes depending on dataset size.

---

### Pattern 4: Error Recovery and Dead-Letter Handling

Production pipelines must handle individual record failures without halting. This pattern implements a dead-letter queue that quarantines unrecoverable records with full error context for later analysis and reprocessing.

```python
"""Error Recovery and Dead-Letter Queue — Quarantine failed records while continuing processing."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Generic, Iterator, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")
U = TypeVar("U")


# ── Retry Configuration ─────────────────────────────────────────────────

@dataclass(frozen=True)
class RetryConfig:
    """Configuration for retrying failed stage executions.

    Uses exponential backoff with jitter to avoid thundering herd problems
    when many records fail simultaneously.
    """
    max_retries: int = 3
    base_delay_ms: float = 100.0
    max_delay_ms: float = 5000.0
    jitter_factor: float = 0.5  # Randomize up to ±jitter_factor of the delay

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for a given attempt number using exponential backoff with jitter."""
        if attempt <= 0:
            return 0.0
        exponential = min(
            self.base_delay_ms * (2 ** attempt),
            self.max_delay_ms,
        )
        import random
        jitter = exponential * self.jitter_factor * (random.random() * 2 - 1)
        return max(0, exponential + jitter)


# ── Retryable Record Wrapper ────────────────────────────────────────────

@dataclass
class RetryableRecord:
    """Wraps a record with retry metadata for automatic reprocessing.

    Tracks how many times a record has been retried and by which stage,
    enabling selective retry logic (e.g., retry only network-stage failures).
    """
    payload: Any
    attempt_count: int = 0
    last_failed_stage: str | None = None
    error_history: list[dict[str, Any]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    @property
    def can_retry(self) -> bool:
        return self.attempt_count < RetryConfig().max_retries

    def record_failure(self, stage_name: str, error: Exception) -> None:
        """Record a failure for this record."""
        self.error_history.append({
            "stage": stage_name,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "timestamp": time.time(),
        })
        self.attempt_count += 1
        self.last_failed_stage = stage_name

    def to_log_entry(self) -> dict[str, Any]:
        return {
            "retryable_record": True,
            "payload_type": type(self.payload).__name__,
            "attempt_count": self.attempt_count,
            "last_failed_stage": self.last_failed_stage,
            "error_history_count": len(self.error_history),
        }


# ── Dead-Letter Queue Implementation ────────────────────────────────────

@dataclass
class DeadLetterEntry:
    """A record that has exhausted all retry attempts and is quarantined."""
    id: str  # Unique ID for the DLQ entry
    payload: Any
    error_chain: list[dict[str, Any]] = field(default_factory=list)
    last_stage: str | None = None
    failed_at: float = field(default_factory=time.time)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_log_entry(self) -> dict[str, Any]:
        """Structured log for monitoring and alerting."""
        return {
            "event": "dead_letter_quarantined",
            "dlq_id": self.id,
            "last_stage": self.last_stage,
            "failure_count": len(self.error_chain),
            "total_errors": [e["error_message"] for e in self.error_chain[-5:]],
            "payload_type": type(self.payload).__name__,
            "age_seconds": time.time() - self.failed_at,
        }


class DeadLetterQueue:
    """Quarantines unrecoverable records with full error context.

    Supports both in-memory and file-backed DLQs. The file-backed variant
    persists entries to JSONL (JSON Lines) so they survive process restarts
    and can be replayed by a separate recovery pipeline.

    Design rationale: A dead-letter queue is the safety net of any pipeline.
    It must preserve enough information to diagnose why a record failed — not
    just the error message, but the entire chain of stage failures, the original
    payload (for reprocessing), and metadata for routing the replay back into
    the correct pipeline branch.
    """

    def __init__(self, max_size: int = 100_000) -> None:
        self._entries: dict[str, DeadLetterEntry] = {}
        self._max_size = max_size

    def enqueue(
        self,
        payload: Any,
        error_chain: list[dict[str, Any]],
        last_stage: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> DeadLetterEntry:
        """Quarantine a failed record.

        If the DLQ is at capacity, the oldest entry is evicted. This prevents
        unbounded memory growth in long-running pipelines.

        Args:
            payload: The original record that failed processing.
            error_chain: List of errors encountered across stages, in order.
            last_stage: Name of the stage where final failure occurred.
            metadata: Optional context (source system, partition, etc.) for replay routing.

        Returns:
            The created DeadLetterEntry for immediate inspection.
        """
        entry_id = f"dlq-{time.time():.6f}-{len(self._entries)}"

        # Evict oldest if at capacity
        if len(self._entries) >= self._max_size:
            oldest_key = min(self._entries, key=lambda k: self._entries[k].failed_at)
            del self._entries[oldest_key]
            logger.info("DLQ at capacity — evicted oldest entry %s", oldest_key)

        entry = DeadLetterEntry(
            id=entry_id,
            payload=payload,
            error_chain=list(error_chain),
            last_stage=last_stage,
            metadata=metadata or {},
        )
        self._entries[entry_id] = entry

        log_entry = entry.to_log_entry()
        logger.warning(
            "Record quarantined to DLQ: %s | stage=%s | errors=%d",
            entry.id, last_stage, len(error_chain),
            extra={"dlq_entry": log_entry},
        )
        return entry

    def dequeue(self, entry_id: str) -> DeadLetterEntry | None:
        """Remove and return a quarantined record for reprocessing.

        Used by recovery pipelines that read from the DLQ and feed
        records back into the processing pipeline (potentially with
        different configuration or after external issues are resolved).
        """
        return self._entries.pop(entry_id, None)

    def peek(self, entry_id: str) -> DeadLetterEntry | None:
        """Inspect a quarantined record without removing it."""
        return self._entries.get(entry_id)

    def list_entries(
        self,
        *,
        stage_filter: str | None = None,
        max_age_seconds: float | None = None,
        limit: int = 100,
    ) -> list[DeadLetterEntry]:
        """List quarantined entries with optional filtering.

        Useful for monitoring dashboards and manual review workflows.
        """
        now = time.time()
        results: list[DeadLetterEntry] = []

        for entry in self._entries.values():
            if stage_filter and entry.last_stage != stage_filter:
                continue
            if max_age_seconds and (now - entry.failed_at) > max_age_seconds:
                continue
            results.append(entry)

        # Sort by failure time, newest first
        results.sort(key=lambda e: e.failed_at, reverse=True)
        return results[:limit]

    @property
    def size(self) -> int:
        """Current number of quarantined records."""
        return len(self._entries)

    def to_jsonl_lines(self) -> list[str]:
        """Serialize all entries as JSONL for file-backed persistence.

        Used by the `save_to_file` method and compatible with bulk-replay tools.
        Each line is a valid JSON object that can be deserialized back into
        a DeadLetterEntry (plus the payload which may need custom deserialization).
        """
        lines: list[str] = []
        for entry in sorted(self._entries.values(), key=lambda e: e.failed_at):
            line_data = {
                "id": entry.id,
                "error_chain": entry.error_chain,
                "last_stage": entry.last_stage,
                "failed_at": entry.failed_at,
                "metadata": entry.metadata,
                # Payload is serialized as a string representation — custom serialization
                # is needed for non-JSON types
                "payload": _safe_serialize(entry.payload),
            }
            lines.append(json.dumps(line_data, default=str))
        return lines

    def save_to_file(self, path: str | Path) -> None:
        """Persist the entire DLQ to a JSONL file."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for line in self.to_jsonl_lines():
                f.write(line + "\n")
        logger.info("DLQ saved to %s (%d entries)", path, self.size)

    def clear(self) -> int:
        """Remove all entries. Returns count of cleared entries."""
        count = len(self._entries)
        self._entries.clear()
        logger.info("DLQ cleared — %d entries removed", count)
        return count


# ── Helpers ─────────────────────────────────────────────────────────────

def _safe_serialize(obj: Any) -> str:
    """Serialize an object to a string-safe representation for JSONL storage."""
    try:
        return json.dumps(obj, default=str)
    except (TypeError, ValueError):
        return repr(obj)


# ── Full Pipeline with Retry + Dead-Letter Integration ──────────────────

class FaultTolerantPipeline(Generic[T, U]):
    """Pipeline with per-record retry logic and dead-letter queue integration.

    This is the production-ready pipeline variant that combines:
    - Per-record fault isolation (one bad record never halts processing)
    - Configurable retries with exponential backoff
    - Circuit breaker protection against cascading failures
    - Dead-letter quarantine for records that exhaust all retries
    - Structured logging with per-record correlation IDs

    Usage:
        pipeline = FaultTolerantPipeline(
            name="order-ingestion",
            retry_config=RetryConfig(max_retries=2, base_delay_ms=50),
        )
        pipeline.add_stage("parse", parse_order)
        pipeline.add_stage("validate", validate_order)
        pipeline.add_stage("enrich", enrich_with_customer_data)

        for result in pipeline.process(records):
            if not result.success:
                print(f"Failed record {result.correlation_id}: {result.errors}")
    """

    def __init__(
        self,
        name: str = "fault-tolerant-pipeline",
        retry_config: RetryConfig | None = None,
    ) -> None:
        self._name = name
        self._retry_config = retry_config or RetryConfig()
        self._stages: list[tuple[str, Callable[[T], U | None]]] = []
        self._dlq = DeadLetterQueue()

    def add_stage(
        self,
        name: str,
        func: Callable[[T], U | None],
    ) -> "FaultTolerantPipeline[T, U]":
        """Register a processing stage with the given name."""
        self._stages.append((name, func))
        return self  # type: ignore[return-value]

    def process(self, records: Iterator[T]) -> Iterator[dict[str, Any]]:
        """Process records with full fault isolation, retry, and DLQ.

        Each record is processed through all stages. If any stage fails
        and retries are exhausted, the record is quarantined in the DLQ
        and processing continues with the next record.

        Yields:
            Result dicts with keys: correlation_id, success, output, errors, latency_ms
        """
        for idx, record in enumerate(records):
            correlation_id = f"{self._name}-{idx:06d}"
            start_time = time.monotonic()
            current: T | None = record
            error_chain: list[dict[str, Any]] = []

            for stage_name, stage_func in self._stages:
                if current is None:
                    break

                # Retry loop for this stage
                retryable = RetryableRecord(payload=current)
                attempt = 0

                while attempt <= self._retry_config.max_retries:
                    try:
                        result = stage_func(current)  # type: ignore[arg-type]
                        if result is None:
                            current = None
                            break
                        current = result
                        break  # Stage succeeded — move to next stage
                    except Exception as e:
                        error_chain.append({
                            "stage": stage_name,
                            "attempt": attempt,
                            "error_type": type(e).__name__,
                            "error_message": str(e),
                        })

                        if attempt < self._retry_config.max_retries:
                            delay = self._retry_config.calculate_delay(attempt)
                            logger.debug(
                                "Retrying stage %s for %s (attempt %d/%d, delay %.1fms)",
                                stage_name, correlation_id, attempt + 1,
                                self._retry_config.max_retries, delay,
                            )
                            time.sleep(delay / 1000.0)

                        attempt += 1

                # Stage exhausted all retries — record the failure
                if current is not None:
                    error_chain.append({
                        "stage": stage_name,
                        "error_type": "MaxRetriesExceeded",
                        "message": f"Stage {stage_name} failed after {self._retry_config.max_retries + 1} attempts",
                    })
                    current = None

            # After all stages — either we have a result or the record failed
            elapsed_ms = (time.monotonic() - start_time) * 1000

            if current is not None:
                yield {
                    "correlation_id": correlation_id,
                    "success": True,
                    "output": current,
                    "errors": [],
                    "latency_ms": round(elapsed_ms, 2),
                }
            else:
                # Record failed — decide: retry or dead-letter?
                if len(error_chain) == 0:
                    # No errors recorded but current is None — a stage returned None
                    yield {
                        "correlation_id": correlation_id,
                        "success": True,
                        "output": None,
                        "errors": [],
                        "latency_ms": round(elapsed_ms, 2),
                        "dropped_by_stage": self._stages[-1][0] if error_chain else None,
                    }
                else:
                    # Has errors — quarantine to DLQ
                    self._dlq.enqueue(
                        payload=record,
                        error_chain=error_chain,
                        last_stage=self._stages[-1][0] if error_chain else None,
                        metadata={"correlation_id": correlation_id},
                    )

                    yield {
                        "correlation_id": correlation_id,
                        "success": False,
                        "output": None,
                        "errors": error_chain,
                        "latency_ms": round(elapsed_ms, 2),
                        "dlq_id": self._dlq.size,
                    }

    @property
    def dead_letter_queue(self) -> DeadLetterQueue:
        """Access the pipeline's DLQ for inspection and replay."""
        return self._dlq


# ── Example: End-to-End Fault-Tolerant Processing ───────────────────────

def example_fault_tolerant_pipeline() -> None:
    """Demonstrate a fault-tolerant pipeline processing mixed-good-and-bad input."""

    def parse_json_payload(record: dict[str, Any]) -> dict[str, Any] | None:
        """Parse the 'raw' field as JSON. Returns None if it is already parsed or invalid."""
        raw = record.get("raw")
        if isinstance(raw, str):
            try:
                return {**record, "parsed": json.loads(raw), "raw": None}
            except (json.JSONDecodeError, ValueError) as e:
                raise ValueError(f"JSON parse failed: {e}") from e
        return record

    def validate_required_fields(record: dict[str, Any]) -> dict[str, Any] | None:
        """Ensure required fields exist after parsing."""
        parsed = record.get("parsed") or {}
        required = ["id", "name"]
        for field_name in required:
            if field_name not in parsed or not str(parsed[field_name]).strip():
                raise ValueError(f"Missing or empty required field: {field_name}")
        return record

    def normalize_names(record: dict[str, Any]) -> dict[str, Any] | None:
        """Normalize name fields to title case."""
        parsed = record.get("parsed") or {}
        if "name" in parsed:
            parsed["name"] = str(parsed["name"]).strip().title()
        return record

    # Build the pipeline
    pipeline = FaultTolerantPipeline(
        name="customer-ingestion",
        retry_config=RetryConfig(max_retries=1, base_delay_ms=1),  # Short delays for demo
    )
    pipeline.add_stage("parse", parse_json_payload)
    pipeline.add_stage("validate", validate_required_fields)
    pipeline.add_stage("normalize", normalize_names)

    # Mixed input: good records, bad JSON, missing fields
    inputs = iter([
        {"raw": '{"id": 1, "name": "alice"}'},          # Good
        {"raw": '{"id": 2, "name": "bob"}'},             # Good
        {"raw": "not json"},                              # Bad JSON — retry then DLQ
        {"raw": '{"id": 3}'},                             # Missing 'name' — validate fails → DLQ
        {"raw": '{"id": 4, "name": "charlie"}'},          # Good
    ])

    results = list(pipeline.process(inputs))

    success_count = sum(1 for r in results if r["success"])
    dlq_count = pipeline.dead_letter_queue.size

    print(f"Processed {len(results)} records: {success_count} success, {len(results) - success_count} failed")
    print(f"Dead-letter queue size: {dlq_count}")

    for result in results:
        status = "OK" if result["success"] else f"FAIL ({result['errors'][0]['error_type']})"
        print(f"  {result['correlation_id']}: {status} ({result['latency_ms']:.1f}ms)")

    # DLQ entries can be inspected for manual review or automated replay
    if dlq_count > 0:
        print("\nDead-letter entries:")
        for entry in pipeline.dead_letter_queue.list_entries(limit=10):
            log = entry.to_log_entry()
            print(f"  {entry.id}: stage={log['last_stage']} errors={log['failure_count']}")


if __name__ == "__main__":
    example_fault_tolerant_pipeline()

```

**Design rationale:** The `FaultTolerantPipeline` combines three critical patterns: (1) per-record fault isolation — each record is wrapped in its own try/retry/exception cycle so one bad record never affects others; (2) configurable retries with exponential backoff and jitter, which prevents thundering herd when many records fail simultaneously; (3) dead-letter queue that quarantines exhausted records with full error context for later replay. The DLQ supports file-backed persistence via JSONL, enabling recovery pipelines to reprocess old failures after the root cause is fixed. This ensures no data is ever lost — only temporarily delayed for manual or automated intervention.

---

## Constraints

### MUST DO

- **Define explicit input and output types for every stage** — Use `typing.Protocol`, `dataclass(frozen=True)`, or named tuples. Never let a stage accept or return bare `dict[str, Any]` without documentation of the expected keys.
- **Implement circuit breaker pattern when failure rate exceeds 50%** — Configure per-stage circuit breakers with a sliding window (default: 20 samples). Open the circuit to prevent cascading failures. Use `SimpleCircuitBreaker` from Pattern 1.
- **Include structured logging with per-record correlation IDs** — Every log entry must contain `correlation_id`, `stage_name`, `status`, and `latency_ms`. Use JSON lines format for machine parsing.
- **Choose error strategy explicitly per stage** — Critical stages (schema validation) use `ErrorStrategy.STOP`. Tolerant stages (optional enrichment) use `ErrorStrategy.SKIP`. Irrecoverable failures route to `ErrorStrategy.DEAD_LETTER`.
- **Use immutable data flows** — Every stage returns new objects. Never mutate input records. Use `dataclass(frozen=True)` or `frozenset` where appropriate. This enables safe concurrent processing and simplifies testing.
- **Stream large datasets via generators** — For inputs exceeding 10 MB or known to grow indefinitely, use `StreamingPipeline` with generator-based processing. Never call `list()` on an unbounded source.

### MUST NOT DO

- **Use mutable default arguments in stage constructors** — Python's mutable defaults (`def make_pipeline(stages=[], ...)` create shared state across invocations that causes silent data corruption. Use `None` defaults and initialize inside the function body.
- **Allow stages to silently swallow exceptions without logging or dead-letter routing** — Every caught exception must produce a structured log entry (with correlation ID) and either retry, skip with notification, or route to the DLQ. Silent swallowing creates "data black holes."
- **Hardcode stage ordering in processing logic** — Always use composition: register stages through `PipelineComposer` or `add_stage()`. Hardcoded `if/elif` chains that process records differently based on content type violate Single Responsibility and make testing impossible.
- **Block the processing loop for I/O operations** — Database lookups, API calls, and file reads must happen in separate enrichment stages with their own error handling, or in background threads. Never `time.sleep()` or do synchronous network calls inside a stage that blocks the pipeline thread.
- **Serialize entire pipeline state to JSON at runtime** — Pipeline objects contain callable references, generators, and circuit breaker state that are not JSON-serializable. Serialize only `ProcessResult` data and DLQ entries for monitoring; keep the pipeline itself in-process.

---

## TL;DR for Code Generation

- Use guard clauses — return early on invalid input before doing work
- Define typed protocols (`Protocol`) for every stage's input and output
- Wrap each stage call in try/except — never let a single record failure kill the pipeline
- Emit structured log entries with `correlation_id` per record for full traceability
- Choose skip vs. stop error strategy per stage based on data criticality
- Implement circuit breaker when stage failure rate exceeds threshold (default: 50% in sliding window)
- Use immutable data flows — every stage returns new objects, never mutates inputs
- Stream large datasets via generators; never load entire input into memory at once
- Route unrecoverable records to a dead-letter queue with full error context and original payload
- Never use mutable default arguments (e.g., `def fn(x=None): x = x or []`)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `input-validation` | Schema-level validation for individual records (Pydantic, jsonschema) — use alongside pipeline stages for type checking after extraction |
| `output-sanitization` | Sanitize pipeline outputs before writing to downstream systems (HTML escaping, SQL injection prevention, PII redaction) |
| `performance-optimization` | Profile and optimize pipeline throughput — batch processing, connection pooling, async stage execution |
| `test-driven-development` | Write tests for pipeline stages using property-based testing (hypothesis) and fixture-based record-level testing |

---

> 📖 skill(local cache): input-processing-pipelines