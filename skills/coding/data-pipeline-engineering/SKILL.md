---




name: data-pipeline-engineering
description: Designs and implements production data pipelines (ETL, ELT, streaming)
  with data validation, schema evolution handling, idempotent processing, and quality
  gates for reliable data infrastructure.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: data pipeline, ETL, ELT, data ingestion, schema evolution, data validation, idempotent processing, data quality idempotent processing
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
  - examples
  - do-dont
  related-skills: ds-feature-engineering, production-logging, software-error-handling,
    coding-production-readiness




---




# Data Pipeline Engineering Framework

Designs and implements production-grade data pipelines that reliably move, transform, validate, and serve data across systems. This skill makes the model architect ETL/ELT workflows with built-in data quality gates, idempotent processing for exactly-once semantics, schema evolution strategies, and streaming/batch hybrid patterns — ensuring data is trustworthy, traceable, and resilient to failures at every stage.

## TL;DR Checklist

- [ ] Define explicit input/output schemas with Pydantic models before writing any transformation logic
- [ ] Implement idempotent processing: every record must have a unique ID and deduplication logic
- [ ] Add data quality gates at pipeline entry, after each transformation step, and before output
- [ ] Handle schema evolution with forward/backward compatibility — never break downstream consumers
- [ ] Implement retry with exponential backoff and dead-letter queue for failed records
- [ ] Log structured telemetry: record count, bytes processed, error rate, processing latency per batch

---

## When to Use

Use this skill when:

- Designing an ETL/ELT pipeline to ingest data from external APIs, databases, or message queues into a data warehouse or lake
- Building a streaming pipeline (e.g., Kafka consumers) that must handle backpressure, rebalancing, and exactly-once processing guarantees
- Implementing data quality validation at scale — checking for nulls, type mismatches, out-of-range values, referential integrity violations
- Designing schema evolution strategies for systems where producers change their output format without breaking existing consumers
- Building idempotent pipelines that can safely retry partial failures without duplicating records in the output store
- Creating data transformation layers that normalize raw ingestion into a consistent model for downstream analytics or ML

---

## When NOT to Use

Avoid this skill for:

- Simple file copy operations — use shell scripts or cloud storage copies instead of building pipeline infrastructure
- Real-time OLTP database writes — pipelines are batch/streaming oriented; OLTP needs transactional application logic
- Ad-hoc data exploration or one-off notebooks — these should use raw pandas/SQL, not engineered pipeline patterns
- ML feature engineering with model-specific transformations — use `ds-feature-engineering` instead

---

## Core Workflow

1. **Define Source and Target Contracts** — Write explicit Pydantic models for every input schema and output schema. Define required fields, optional fields, field types, constraints (min/max/regex), and defaults. **Checkpoint:** Every contract must be versioned (`SchemaV1`, `SchemaV2`) so schema evolution is tracked.

2. **Choose Pipeline Architecture** — Select batch, streaming, or hybrid based on data velocity and freshness requirements:
   - Batch (hourly/daily) → Airflow DAG + SQLAlchemy/Spark for high-throughput transforms
   - Streaming (real-time) → Kafka consumer with exactly-once processing using transactional writers
   - Hybrid → Kafka for ingestion, batch jobs for heavy transforms, streaming for hot paths
   **Checkpoint:** Every pipeline must define its expected latency budget and throughput target before implementation begins.

3. **Implement Idempotent Processing** — Every record gets a deterministic ID (`sha256(combined_key_fields)`). Write logic that checks if the record has already been processed before applying transformations. Use upsert patterns (INSERT ... ON CONFLICT UPDATE) rather than naive inserts to prevent duplicates on retries.

4. **Add Data Quality Gates** — At each pipeline stage, validate records against the current schema contract. Rejected records route to a dead-letter queue with full error context (original payload, validation errors, stage name, timestamp). Approved records continue through the pipeline. **Checkpoint:** Every quality gate must log: total records in, passed count, rejected count, rejection reasons — emitted as structured telemetry.

5. **Handle Schema Evolution Safely** — When input schemas change, support both forward and backward compatibility:
   - Backward compatible: new optional fields added (old consumers ignore them)
   - Forward compatible: old producers send data that new consumers can parse (unknown fields are skipped or stored in a `metadata` blob)
   **Checkpoint:** Schema changes must pass a compatibility test — load old schema validator with new sample data, and new schema validator with old sample data. Both must succeed.

6. **Implement Error Handling and Retries** — Transient failures (network timeout, DB lock contention) trigger exponential backoff retry (max 3 attempts). Permanent failures (schema validation error, missing required field) route immediately to dead-letter queue. Dead-letter records are stored in a dedicated table with full payload, error message, retry count, and processing stage for manual review.

7. **Emit Pipeline Telemetry** — At each batch boundary, emit structured metrics: total records ingested, successfully processed, rejected, average latency per record, peak throughput (records/sec). These feed into dashboards and alerting rules that trigger when error rates exceed defined thresholds (>0.1% for production pipelines).

---

## Implementation Patterns / Reference Guide

### Pattern 1: Idempotent Record Processing with Deduplication

```python
import hashlib
from dataclasses import dataclass, field
from typing import Optional
from datetime import datetime, timezone


@dataclass(frozen=True)
class PipelineRecord:
    """Immutable record with deterministic ID for idempotent processing."""
    source_system: str
    entity_type: str
    entity_id: str
    payload: dict
    received_at: datetime
    _id: str = field(init=False)

    def __post_init__(self):
        # Deterministic ID from content hash — same data always produces same ID
        raw = f"{self.source_system}:{self.entity_type}:{self.entity_id}:{hashlib.sha256(
            str(self.payload).encode()
        ).hexdigest()}"
        object.__setattr__(self, '_id', hashlib.sha256(raw.encode()).hexdigest()[:16])

    @property
    def record_id(self) -> str:
        return self._id


class IdempotentProcessor:
    """Processes records idempotently using a deduplication store.

    Before processing any record, checks if the record_id exists in the
    deduplication store. If found, skips processing (already handled).
    If not found, processes and inserts the record_id into the store
    with a TTL matching the pipeline's expected retry window.
    """

    def __init__(self, dedup_store, processor_fn):
        self._dedup = dedup_store
        self._processor = processor_fn
        self.DEDUP_TTL_SECONDS = 3600  # 1 hour retry window

    def process(self, record: PipelineRecord) -> Optional[dict]:
        """Process a record idempotently. Returns None if already processed."""
        if self._dedup.exists(record.record_id):
            return None
        result = self._processor(record)
        self._dedup.insert(record.record_id, self.DEDUP_TTL_SECONDS)
        return result
```

### Pattern 2: Data Validation with Pydantic (BAD vs. GOOD)

```python
from pydantic import BaseModel, Field, field_validator, ValidationError


# BAD — No validation constraints; silently accepts invalid data
class OrderRecordBad(BaseModel):
    order_id: str
    customer_email: str
    total_amount: float
    status: str
    items: list


# GOOD — Explicit constraints, typed fields, custom validators, and versioning
class OrderRecordV1(BaseModel):
    """Schema V1 for the orders pipeline. DO NOT modify existing fields."""
    order_id: str = Field(..., pattern=r"^ORD-[A-Z0-9]{8,}$", description="Unique order identifier")
    customer_email: str = Field(..., min_length=5, max_length=320)
    total_amount: float = Field(..., gt=0.0, le=1_000_000.0, description="Must be positive and under $1M")
    currency: str = Field(default="USD", pattern=r"^[A-Z]{3}$")
    status: str = Field(..., pattern=r"^(pending|confirmed|shipped|cancelled|refunded)$")
    items_count: int = Field(..., ge=0, le=10_000)
    created_at: Optional[str] = None

    @field_validator("customer_email")
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError(f"Invalid email format: {v}")
        return v.lower()

    class Config:
        extra = "forbid"  # Reject unknown fields to catch schema drift early
```

### Pattern 3: Schema Evolution with Forward/Backward Compatibility

```python
class SchemaEvolutionHandler:
    """Handles schema version transitions without breaking consumers."""

    @staticmethod
    def forward_compatible(record: dict, target_version: str) -> dict:
        """Transform old-format record to new schema version.

        Adds new required fields with safe defaults and migrates field names.
        Preserves unknown fields in a metadata blob for future use.
        """
        migrated = {}

        if "customer_email" in record:
            migrated["customer_email"] = record["customer_email"].lower()
        elif "email" in record:
            migrated["customer_email"] = record["email"].lower()

        if "total_amount" in record:
            migrated["total_amount"] = record["total_amount"]
        elif "total" in record:
            migrated["total_amount"] = float(record["total"])

        migrated.setdefault("items_count", 0)
        migrated.setdefault("currency", "USD")
        migrated.setdefault("status", "confirmed")
        migrated.setdefault("created_at", None)

        known_keys = {"order_id", "email", "customer_email", "total_amount",
                      "total", "items_count", "currency", "status", "created_at"}
        legacy_fields = {k: v for k, v in record.items() if k not in known_keys}
        if legacy_fields:
            migrated["_legacy_metadata"] = legacy_fields

        return migrated

    @staticmethod
    def backward_compatible(record: dict) -> dict:
        """Ensure new schema records can be processed by old consumers.

        Strips fields unknown to older schemas while preserving the core payload.
        """
        return {k: v for k, v in record.items()
                if k in ("order_id", "customer_email", "total_amount", "status")
                and not k.startswith("_")}


class DeadLetterQueue:
    """Stores rejected records with full context for manual review."""

    def __init__(self, store):
        self._store = store

    def reject(self, record_id, original_payload, errors, stage_name, pipeline_name):
        self._store.write(
            record_id=record_id,
            payload={
                "original": original_payload,
                "errors": errors,
                "rejected_at_stage": stage_name,
                "pipeline_name": pipeline_name,
                "retrieval_key": record_id,
            },
        )
```

### Pattern 4: Backpressure-Aware Streaming Consumer

```python
import logging
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from typing import Callable


class BackpressureAwareConsumer:
    """Streaming consumer that implements backpressure via rate limiting.

    When downstream processing falls behind, the consumer throttles
    message intake by limiting concurrent workers and dropping non-
    critical messages when the buffer reaches capacity.
    """

    def __init__(self, process_fn, max_workers=8, batch_size=100, backpressure_threshold=500):
        self.process_fn = process_fn
        self.max_workers = max_workers
        self.batch_size = batch_size
        self.backpressure_threshold = backpressure_threshold
        self._buffer: deque[dict] = deque()
        self._executor = ThreadPoolExecutor(max_workers=max_workers)

    def consume(self, message: dict) -> bool:
        buffer_len = len(self._buffer)
        if buffer_len >= self.backpressure_threshold:
            if message.get("priority") == "high":
                logging.warning("Buffer at capacity — accepting high-priority message")
            else:
                logging.warning("Buffer at capacity — dropping non-critical message")
                return False

        self._buffer.append(message)

        if len(self._buffer) >= self.batch_size:
            self._drain_batch()

        return True

    def _drain_batch(self):
        batch = []
        while len(batch) < self.batch_size and self._buffer:
            batch.append(self._buffer.popleft())

        for msg in batch:
            future = self._executor.submit(self.process_fn, msg)
            future.add_done_callback(
                lambda f: logging.error("Processing failed: %s", f.exception()) if f.exception() else None
            )

    def shutdown(self):
        while self._buffer:
            self._drain_batch()
        self._executor.shutdown(wait=True)
```

---

## Constraints

### MUST DO
- Every pipeline must have explicit input/output schemas defined as typed models (Pydantic or equivalent)
- Implement idempotent processing with deterministic record IDs to prevent duplicates on retry
- Route validation failures to a dead-letter queue — never silently discard records
- Support schema evolution with forward and backward compatibility testing for all version transitions
- Log structured telemetry at every batch boundary: record counts, error rates, latency percentiles
- Implement exponential backoff retries for transient failures (max 3 attempts)

### MUST NOT DO
- Process data without first validating against a defined schema — unvalidated pipelines produce garbage output
- Use SELECT * or wildcard column selection in pipeline queries — always explicitly name columns to catch schema drift
- Store sensitive data (PII, API keys, passwords) in dead-letter queues without encryption
- Remove records from the input stream before processing completes — use acknowledgment patterns instead
- Hardcode retry counts — configure them externally so operators can tune based on failure patterns observed in production

---

## Output Template

When designing or reviewing a data pipeline, produce:

1. **Pipeline Architecture** — Batch, streaming, or hybrid; processing engine; source and destination systems
2. **Schema Contracts** — Pydantic models for each version with field descriptions and constraints
3. **Idempotency Strategy** — How records are deduplicated (record ID format, store type, TTL)
4. **Data Quality Gates** — Where validation occurs in the pipeline, rejection handling, dead-letter queue design
5. **Error Handling Plan** — Retry strategy with backoff, transient vs permanent failure classification, DLQ ingestion rate
6. **Telemetry Specification** — Metrics emitted at each stage and their aggregation intervals

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ds-feature-engineering` | ML-specific feature transformations that consume clean pipeline outputs |
| `production-logging` | Structured logging patterns for pipeline telemetry |
| `software-error-handling` | General error handling patterns that complement pipeline retry logic |
| `coding-production-readiness` | Pipeline deployment criteria and operational checks |

---

## Live References

> Authoritative documentation links for data pipeline engineering. The model follows markdown links at load time to resolve external references and inline content.

- [Apache Kafka Streams Documentation](https://kafka.apache.org/documentation/streams/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/latest/)
- [Great Expectations Data Validation Framework](https://www.greatexpectations.io/docs/)
- [Airflow Pipeline Orchestration Patterns](https://airflow.apache.org/docs/apache-airflow/stable/)
- [Idempotent Database Operations Best Practices](https://martinfowler.com/articles/dsls.html)

