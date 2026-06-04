---
name: data-intensive-systems
description: Implements data-intensive architecture patterns including stream processing,
  change data capture, lakehouse storage, event sourcing, and data mesh organizational
  design for high-throughput data systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: data architecture, stream processing, kafka, change data capture, CDC,
    event sourcing, lakehouse, data mesh, real-time analytics, batch processing, data
    pipeline design, how do i build a data pipeline, data streaming, Flink, Spark
    Streaming
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
  - config
  - do-dont
  related-skills: event-driven-architecture, database-design-modeling, observability-patterns,
    distributed-systems-architecture
---
# Data-Intensive Systems Architecture

Designs and implements data-intensive architectures that handle high-volume streaming, real-time processing, and scalable storage. When loaded, the model creates system designs combining stream processing (Kafka Streams, Flink), change data capture pipelines, lakehouse storage patterns (Delta Lake, Apache Iceberg), event sourcing implementations, and data mesh organizational principles to build systems where data flow is the primary architectural concern.

## TL;DR Checklist

- [ ] Choose between Lambda (batch + speed layers) and Kappa (unified stream) architecture based on latency requirements and operational complexity tolerance
- [ ] Implement exactly-once semantics using transactional producers with idempotent consumers and outbox pattern for database-to-stream synchronization
- [ ] Configure partition keys to ensure event ordering within logical partitions while enabling horizontal scalability across partitions
- [ ] Store raw data immutably in object storage (S3, GCS) as the single source of truth for the lakehouse layer
- [ ] Enforce schema evolution strategies (backward-compatible Avro/Protobuf with a dedicated schema registry)
- [ ] Design data products with clear ownership boundaries, SLAs, and discoverability for data mesh compliance

---

## When to Use

Use this skill when:

- Building real-time analytics platforms that must process millions of events per second with sub-second latency requirements
- Implementing change data capture (CDC) pipelines that keep read replicas, search indexes, or data warehouses synchronized with source databases in near-real-time
- Designing event sourcing architectures where the event log is the authoritative record of system state and must support full historical replay
- Migrating from traditional batch ETL to streaming data pipelines while maintaining backward compatibility for dashboards and reports
- Building data mesh organizational structures where domain teams own their data products as first-class assets with discoverability, quality SLAs, and self-service infrastructure
- Implementing fraud detection, real-time personalization, or live pricing systems that require processing events as they arrive

---

## When NOT to Use

Avoid data-intensive streaming architecture when:

- Processing volumes under 10,000 events per second with latency tolerance measured in minutes rather than seconds — batch processing (Apache Airflow, dbt) is simpler and more cost-effective
- Data consistency requirements demand strong ACID transactions across multiple systems where eventual consistency introduces unacceptable business risk — use synchronous APIs with database-level locking instead
- The data volume does not justify the operational complexity of maintaining Kafka clusters, stream processors, schema registries, and monitoring tooling — a well-tuned relational database with materialized views may suffice
- There is no clear downstream consumer that benefits from real-time processing — streaming adds cost and complexity for systems where batch refresh intervals are sufficient

---

## Core Workflow

1. **Select Processing Architecture: Lambda vs. Kappa** — Evaluate the trade-off between architectural complexity and latency requirements:
   - **Lambda Architecture**: Maintains separate batch and speed layers. The batch layer processes all historical data through a master dataset (e.g., Hadoop/Spark batch jobs), while the speed layer handles recent events in real-time (e.g., Kafka Streams). A serving layer merges both results for queries. Choose when you need precise, complete historical accuracy alongside real-time views and have sufficient engineering resources to maintain two pipelines.
   - **Kappa Architecture**: Treats all data as a stream. Historical reprocessing is achieved by replaying events from the streaming platform's retention log. Choose when latency requirements exceed batch processing capabilities, operational simplicity matters, and your streaming platform provides adequate retention (typically 7–30 days for replay).

   **Checkpoint:** If your system requires point-in-time accuracy beyond the stream retention window with sub-second query latency, Lambda architecture is justified. Otherwise, prefer Kappa's operational simplicity — it eliminates the complexity of maintaining two pipelines and reconciling discrepancies between batch and speed layer results.

2. **Design the Event Schema and Partitioning Strategy** — Define event schemas using a versioned format (Avro or Protobuf) registered in a centralized schema registry:
   ```python
   # Confluent Schema Registry Avro schema definition (schema-registry-config.yaml)
   # topic: com.payment-service.PaymentEvent
   subject: payment-service-value
   compatibility: BACKWARD
   schema: |
     {
       "type": "record",
       "name": "PaymentEvent",
       "namespace": "com.payment_service",
       "fields": [
         {"name": "event_id", "type": "string", "logicalType": "uuid"},
         {"name": "timestamp_ms", "type": "long"},
         {"name": "payment_id", "type": "string"},
         {"name": "user_id", "type": "string"},
         {"name": "amount_cents", "type": "int"},
         {"name": "currency", "type": "string", "default": "USD"},
         {"name": "status", "type": {"type": "enum", "name": "PaymentStatus", "symbols": ["AUTHORIZED", "CAPTURED", "REFUNDED", "FAILED"]}},
         {"name": "metadata", "type": ["null", {"type": "map", "values": "string"}], "default": null}
       ]
     }
   ```
   - Partition by a business key that defines the ordering guarantee (e.g., `user_id` for per-user ordering, `payment_id` for per-transaction ordering)
   - Ensure partition distribution is even — avoid hot partitions caused by low-cardinality keys (never partition by `event_type` if 90% of events share one type)

   **Checkpoint:** Send a representative volume of events through the producer and verify that no single partition receives more than 150% of the average partition count. If hot partitions exist, reconsider the partition key or implement salting (appending random suffixes for uniform distribution).

3. **Implement Change Data Capture with the Outbox Pattern** — Synchronize database changes to a streaming topic without adding coupling between application code and the messaging layer:

   ```python
   # Python: Transactional outbox publisher ensuring database writes and event publishing are atomic
   from sqlalchemy import create_engine, text
   from sqlalchemy.orm import Session
   from typing import Any

   ENGINE = create_engine("postgresql://db:user@localhost/payments")

   def process_payment_with_outbox(
       payment_id: str,
       user_id: str,
       amount_cents: int,
       currency: str = "USD"
   ) -> None:
       """Execute payment and publish event atomically using database transaction + outbox table."""

       with Session(ENGINE) as session:
           # 1. Write the business data
           session.execute(
               text("INSERT INTO payments (id, user_id, amount_cents, currency, status) "
                    "VALUES (:pid, :uid, :amt, :cur, 'AUTHORIZED')"),
               {"pid": payment_id, "uid": user_id, "amt": amount_cents, "cur": currency}
           )

           # 2. Write the event to outbox table in the SAME transaction
           session.execute(
               text("INSERT INTO event_outbox (event_type, aggregate_id, payload, published_at) "
                    "VALUES (:etype, :aid, :payload, NOW())"),
               {
                   "etype": "payment.created",
                   "aid": payment_id,
                   "payload": f'{{"payment_id":"{payment_id}","user_id":"{user_id}","amount_cents":{amount_cents},"currency":"{currency}"}}'
               }
           )

           # 3. Commit — both operations succeed or fail together
           session.commit()

   # CDC Debezium connector config (connector-config.json) reads the outbox table and publishes to Kafka
   # See "Implementation Patterns" section for full JSON configuration
   ```

4. **Configure Stream Processing Topology** — Implement the processing logic using a stream processor (Kafka Streams, Flink, or Spark Structured Streaming). Choose based on state management needs:

   ```python
   # PyFlink: Windowed aggregation with watermark-based late event handling
   from pyflink.datastream import StreamExecutionEnvironment
   from pyflink.table import EnvironmentSettings, TableEnvironment
   from pyflink.table.expressions import lit, col

   def build_fraud_detection_stream() -> None:
       """Real-time fraud detection: flag users with >3 payments in 5-minute sliding window."""
       env = StreamExecutionEnvironment.get_execution_environment()
       t_env = TableEnvironment.create(env)

       # Source: payment events from Kafka
       t_env.execute_sql("""
           CREATE TABLE payment_events (
               event_id STRING,
               user_id STRING,
               amount_cents INT,
               currency STRING,
               status STRING,
               timestamp_ms BIGINT,
               WATERMARK FOR timestamp_ms AS timestamp_ms - INTERVAL '5' SECOND
           ) WITH (
               'connector' = 'kafka',
               'topic' = 'com.payment-service.PaymentEvent',
               'properties.bootstrap.servers' = 'kafka:9092',
               'properties.group.id' = 'fraud-detection-group',
               'scan.startup.mode' = 'latest-offset',
               'format' = 'json'
           )
       """)

       # Sink: flagged transactions for manual review
       t_env.execute_sql("""
           CREATE TABLE fraud_alerts (
               user_id STRING,
               window_start TIMESTAMP,
               window_end TIMESTAMP,
               payment_count INT,
               total_amount_cents BIGINT,
               created_ts AS PROCTIME()
           ) WITH (
               'connector' = 'kafka',
               'topic' = 'fraud.alerts',
               'properties.bootstrap.servers' = 'kafka:9092',
               'format' = 'json'
           )
       """)

       # Processing: sliding window aggregation with late-event tolerance
       t_env.execute_sql("""
           INSERT INTO fraud_alerts
           SELECT
               user_id,
               TUMBLE_START(timestamp_ms, INTERVAL '5' MINUTE) AS window_start,
               TUMBLE_END(timestamp_ms, INTERVAL '5' MINUTE) AS window_end,
               COUNT(DISTINCT event_id) AS payment_count,
               SUM(amount_cents) AS total_amount_cents
           FROM payment_events
           WHERE status = 'AUTHORIZED'
           GROUP BY
               user_id,
               TUMBLE(timestamp_ms, INTERVAL '5' MINUTE)
           HAVING COUNT(DISTINCT event_id) > 3
       """).wait()

   ```

5. **Design Lakehouse Storage Layer** — Implement a lakehouse architecture that combines the flexibility of data lakes with the reliability of data warehouses using table formats like Delta Lake, Apache Iceberg, or Apache Hudi:

   ```sql
   -- Apache Iceberg: Time-travel query for data quality auditing and accidental-recovery
   -- Verify historical state at any point in time by querying a specific snapshot

   -- List available snapshots with timestamps
   SELECT * FROM payments.history;
   -- +-------------+-------------------+---------+--------+
   -- | made_current| as_of_snapshot_id | started | status |
   -- +-------------+-------------------+---------+--------+
   -- | false       | 12345             | ...     | added  |
   -- | true        | 67890             | ...     | current|
   -- +-------------+-------------------+---------+--------+

   -- Query table as of a specific snapshot (for auditing or accidental-recovery)
   SELECT * FROM payments FOR TIMESTAMP AS OF '2025-01-15T10:30:00Z' WHERE user_id = 'u12345';

   -- Schema evolution: safely add columns without breaking consumers
   ALTER TABLE payments ADD COLUMN refund_reason STRING;

   -- Time-travel rollback: restore table to previous state after bad write
   MERGE INTO payments p
   USING (SELECT * FROM payments FOR TIMESTAMP AS OF '2025-01-15T09:00:00Z') prev
   ON p.event_id = prev.event_id
   WHEN MATCHED THEN UPDATE SET *;
   ```

6. **Implement Data Mesh Governance** — Structure data products with domain ownership and platform support:
   - Each domain team owns a data product end-to-end (ingestion, storage, quality, serving)
   - Define standardized contracts: schema definitions, SLA targets, access controls, documentation
   - Publish data products to a centralized catalog with discoverability metadata (description, owner, freshness, sample data)
   - Enforce data quality SLAs through automated tests on ingestion pipelines and alerting on violations

   **Checkpoint:** A data consumer from another domain should be able to discover, understand, request access to, and consume a data product without contacting the owning team for basic usage — if they cannot, the product is not self-service compliant.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Debezium CDC Connector Configuration (Kafka Connect)

Complete configuration for a PostgreSQL Change Data Capture connector that captures row-level changes and publishes them to Kafka topics with automatic schema registration via Confluent Schema Registry.

```json
{
  "name": "payments-cdc-postgres",
  "config": {
    "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
    "tasks.max": "1",
    "database.hostname": "postgres-primary.internal",
    "database.port": "5432",
    "database.user": "debezium",
    "database.password": "${DEBEZIUM_DB_PASSWORD}",
    "database.dbname": "payments",
    "database.server.name": "prod-payment-cluster",
    "table.include.list": "public.payments,public.refunds,public.payment_methods",
    "schema.history.internal": "io.debezium.storage.file.history.FileSchemaHistory",
    "schema.history.internal.file.filename": "/debezium/schema-history.json",
    "transforms": "unwrap,reroute",
    "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState",
    "transforms.unwrap.delete.handling.mode": "rewrite",
    "transforms.unwrap.drop.tombstones": "true",
    "transforms.reroute.type": "io.debezium.transforms.ByLogicalTableRouter",
    "transforms.reroute.topic.regex": "(.*)\\.public\\.(.*)",
    "transforms.reroute.topic.replacement": "$1.com.payment-service.$2",
    "topic.creation.default.partitions": "12",
    "topic.creation.default.replication.factor": "3",
    "key.converter": "io.confluent.connect.avro.AvroConverter",
    "key.converter.schema.registry.url": "http://schema-registry.internal:8081",
    "value.converter": "io.confluent.connect.avro.AvroConverter",
    "value.converter.schema.registry.url": "http://schema-registry.internal:8081",
    "snapshot.mode": "initial",
    "publication.name": "debezium_pub",
    "slot.name": "debezium_payments"
  }
}
```

### Pattern 2: Event Sourcing Aggregate Root (Python)

Domain-driven event sourcing implementation with a typed event store, aggregate replay capability, and snapshot optimization for high-frequency aggregates.

```python
"""Event sourcing aggregate root with optimistic concurrency and snapshot support."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Generic, Protocol, Sequence, TypeVar
import json
import uuid


# ── Domain Event Types ──────────────────────────────────────────────────────

class PaymentStatus(Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    REFUNDED = "REFUNDED"
    FAILED = "FAILED"


@dataclass(frozen=True)
class Event:
    """Base event with unique identifier and timestamp."""
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class PaymentCreated(Event):
    payment_id: str
    user_id: str
    amount_cents: int
    currency: str = "USD"


@dataclass(frozen=True)
class PaymentAuthorized(Event):
    payment_id: str
    authorization_code: str


@dataclass(frozen=True)
class PaymentCaptured(Event):
    payment_id: str
    captured_amount_cents: int


@dataclass(frozen=True)
class PaymentRefunded(Event):
    payment_id: str
    refunded_amount_cents: int
    reason: str


# ── Event Store Protocol ────────────────────────────────────────────────────

class EventStore(Protocol):
    """Abstract event store interface for persistence."""

    async def append_events(self, aggregate_id: str, expected_version: int, events: Sequence[Event]) -> int:
        """Append events with optimistic concurrency control. Returns new version on success.

        Args:
            aggregate_id: The aggregate identifier to append events for
            expected_version: Current version of the aggregate (for optimistic locking)
            events: Sequence of domain events to persist

        Returns:
            New aggregate version after append

        Raises:
            ConcurrencyError: If expected_version does not match actual stored version
        """
        ...

    async def load_events(self, aggregate_id: str) -> tuple[list[Event], int]:
        """Load all events for an aggregate. Returns (events, current_version)."""
        ...


# ── Aggregate Root ─────────────────────────────────────────────────────────

T = TypeVar("T", bound="PaymentAggregateRoot")

class PaymentAggregateRoot:
    """Event-sourced aggregate root for payment domain."""

    def __init__(self, aggregate_id: str) -> None:
        self._aggregate_id = aggregate_id
        self._version: int = 0
        self._uncommitted_events: list[Event] = []

        # Current state derived from events
        self.payment_id: str | None = None
        self.user_id: str | None = None
        self.amount_cents: int = 0
        self.currency: str = "USD"
        self.status: PaymentStatus = PaymentStatus.CREATED
        self.authorization_code: str | None = None

    @property
    def aggregate_id(self) -> str:
        return self._aggregate_id

    @property
    def version(self) -> int:
        return self._version

    # ── Commands (state mutations that produce events) ──────────────────────

    def create(
        cls: type[T],
        payment_id: str,
        user_id: str,
        amount_cents: int,
        currency: str = "USD"
    ) -> T:
        """Factory method to create a new payment aggregate."""
        instance = cls(payment_id)
        event = PaymentCreated(
            payment_id=payment_id,
            user_id=user_id,
            amount_cents=amount_cents,
            currency=currency
        )
        instance._apply_and_stage(event)
        return instance

    def authorize(self, authorization_code: str) -> None:
        """Authorize the payment. Only valid when status is CREATED."""
        if self.status != PaymentStatus.CREATED:
            raise StateError(
                f"Cannot authorize payment in {self.status.value} state"
            )
        event = PaymentAuthorized(
            payment_id=self.payment_id,
            authorization_code=authorization_code
        )
        self._apply_and_stage(event)

    def capture(self, captured_amount_cents: int | None = None) -> None:
        """Capture authorized funds. Defaults to full authorized amount."""
        if self.status != PaymentStatus.AUTHORIZED:
            raise StateError(
                f"Cannot capture payment in {self.status.value} state"
            )
        amount = captured_amount_cents or self.amount_cents
        event = PaymentCaptured(
            payment_id=self.payment_id,
            captured_amount_cents=amount
        )
        self._apply_and_stage(event)

    def refund(self, refunded_amount_cents: int, reason: str) -> None:
        """Refund payment. Must be fully or partially authorized/captured first."""
        if self.status not in (PaymentStatus.AUTHORIZED, PaymentStatus.CAPTURED):
            raise StateError(
                f"Cannot refund payment in {self.status.value} state"
            )
        if refunded_amount_cents > self.amount_cents:
            raise ValueError("Refund amount exceeds original payment")
        event = PaymentRefunded(
            payment_id=self.payment_id,
            refunded_amount_cents=refunded_amount_cents,
            reason=reason
        )
        self._apply_and_stage(event)

    # ── Event Application (rehydration logic) ───────────────────────────────

    def apply_event(self, event: Event) -> None:
        """Apply a single event to reconstruct aggregate state. Called during replay."""
        match event:
            case PaymentCreated():
                self.payment_id = event.payment_id
                self.user_id = event.user_id
                self.amount_cents = event.amount_cents
                self.currency = event.currency
                self.status = PaymentStatus.CREATED
            case PaymentAuthorized():
                self.authorization_code = event.authorization_code
                self.status = PaymentStatus.AUTHORIZED
            case PaymentCaptured():
                self.status = PaymentStatus.CAPTURED
            case PaymentRefunded():
                self.status = PaymentStatus.REFUNDED

        self._version += 1

    def _apply_and_stage(self, event: Event) -> None:
        """Apply event to current state AND queue for persistence."""
        self.apply_event(event)
        self._uncommitted_events.append(event)

    def commit(self) -> list[Event]:
        """Return staged events and clear the uncommitted buffer. Returns empty if no changes."""
        events = list(self._uncommitted_events)
        self._uncommitted_events.clear()
        return events

    def save(self, store: EventStore) -> int:
        """Persist uncommitted events with optimistic concurrency control."""
        if not self._uncommitted_events:
            return self._version

        new_version = store.append_events(
            aggregate_id=self._aggregate_id,
            expected_version=self._version - len(self._uncommitted_events),
            events=self._uncommitted_events
        )
        self._uncommitted_events.clear()
        return new_version

    @classmethod
    async def replay(
        cls: type[T], store: EventStore, aggregate_id: str
    ) -> T:
        """Rehydrate aggregate from event store (for loading existing state)."""
        events, version = await store.load_events(aggregate_id)
        instance = cls(payment_id=aggregate_id)
        for event in events:
            instance.apply_event(event)
        instance._version = version
        return instance


class StateError(Exception):
    """Raised when a command is invalid for the current aggregate state."""
    pass
```

### Pattern 3: Delta Lake Table Format Configuration (Spark/SQL)

Delta Lake table with time travel, schema enforcement, and data quality constraints for reliable analytics storage.

```sql
-- Delta Lake table with constraints for data quality enforcement
CREATE TABLE IF NOT EXISTS payments_lakehouse (
    event_id STRING,
    payment_id STRING,
    user_id STRING,
    amount_cents INT CHECK (amount_cents > 0),
    currency STRING CHECK (currency IN ('USD','EUR','GBP','JPY','CAD')),
    status STRING,
    timestamp_ms TIMESTAMP,
    metadata_map MAP<STRING, STRING>
) USING delta
PARTITIONED BY (currency);

-- Optimize file sizes for query performance (small files hurt scan speed)
OPTIMIZE payments_lakehouse ZORDER BY (user_id, timestamp_ms);

-- Time-travel: verify data at a specific point in time
SELECT COUNT(*)
FROM payments_lakehouse TIMESTAMP AS OF date_sub(current_date(), 1);

-- Schema evolution: safely add new column without breaking existing queries
ALTER TABLE payments_lakehouse ADD COLUMNS (fraud_score DOUBLE);

-- Vacuum: reclaim storage by deleting old snapshots (retention set to 7 days for compliance)
VACUUM payments_lakehouse RETAIN 168 HOURS;
```

---

## Constraints

### MUST DO
- Use exactly-once semantics in stream processing: enable idempotent producers (`enable.idempotence=true`), implement at-least-once consumer processing with deduplication keys, and use transactional writes to downstream stores
- Configure watermark thresholds that balance late-event tolerance against memory pressure — too aggressive watermarks drop valid events; too lenient ones cause state store growth and OutOfMemory errors in stream processors
- Partition Kafka topics by business keys that require ordering guarantees (user_id, account_id) rather than event types or arbitrary identifiers — partition count should be set at creation time based on expected throughput (typically 12–48 partitions per topic)
- Implement schema registry compatibility checks (`BACKWARD`, `FULL`, or `FORWARD`) in CI/CD pipelines to prevent breaking changes from reaching production consumers before they are ready
- Store raw data immutably in object storage as the lakehouse layer's foundation — never update or delete records; use merge operations (Delta Lake MERGE, Iceberg DELETE+INSERT) for corrections

### MUST NOT DO
- Write application business logic directly into Kafka consumer code that also handles CDC — separate ingestion pipelines from processing logic using distinct consumer groups and topic boundaries
- Store large binary payloads (images, documents) in Kafka topics or event store tables — use object storage references with the payload URL embedded in the event instead
- Configure stream processor state stores without size limits or cleanup policies — unbounded state stores cause OOM kills under sustained high throughput
- Use timestamp-based watermarking for out-of-order events without considering clock skew between distributed sources — supplement with event-time watermarks and a configurable late-data tolerance window
- Deploy CDC connectors without monitoring lag metrics (`kafka-connect-consumer-lag`) — undetected lag causes data staleness in downstream consumers that may not be noticed until business decisions are made on stale reports

---

## Output Template

When designing or reviewing data-intensive system architecture, produce:

1. **Processing Architecture Recommendation** — Lambda vs. Kappa analysis with justification based on latency requirements, data volume, and operational complexity trade-offs
2. **Event Schema Definitions** — Avro or Protobuf schema definitions with registered subject names, compatibility modes, and field-level documentation for all events flowing through the system
3. **CDC Pipeline Specification** — Debezium connector configurations (or equivalent) with topic naming conventions, transformation chains, and key/value converter settings
4. **Stream Processing Topology** — Flink/Spark/Kafka Streams job definitions including source/sink connectors, windowing strategies, watermark configuration, and state store sizing estimates
5. **Lakehouse Storage Design** — Table format (Delta/Iceberg/Hudi) DDL statements with partitioning strategy, ZORDER/clustering columns, time-travel query patterns, and vacuum/compaction policies

---

## Related Skills

| Skill | Purpose |
|---|---|
| `event-driven-architecture` | Covers pub/sub messaging, saga coordination, and dead letter queues at the system level — complements this skill's stream processing and CDC patterns |
| `database-design-modeling` | Relational data modeling for OLTP workloads that serve as CDC source systems for streaming pipelines |
| `observability-patterns` | Metrics collection, log aggregation, and distributed tracing required to monitor data pipeline health, lag, and error rates |
| `distributed-systems-architecture` | Consistency models, partitioning, and fault tolerance patterns that govern how data flows across cluster boundaries in distributed data architectures |
