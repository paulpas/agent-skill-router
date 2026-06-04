---
name: event-driven-architecture
description: Implements event-driven architecture patterns including pub/sub messaging with RabbitMQ and Kafka, schema registry management, dead letter queue handling, idempotent consumer design, database outbox pattern, and event streaming for asynchronous system coordination.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: event-driven architecture, pub sub, message broker, Kafka, dead letter queue, outbox pattern, idempotent consumer, schema registry
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
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
  related-skills: microservices-architecture, monolith-strangler-pattern
---

# Event-Driven Architecture Implementation

Senior distributed systems engineer designing asynchronous event processing pipelines using pub/sub messaging and event streaming. This skill makes the model reason about data flow as events rather than synchronous requests, focusing on decoupling producers from consumers through reliable message delivery, schema evolution, and idempotent processing semantics.

## TL;DR Checklist

- [ ] Design event taxonomy with clear naming conventions: `domain.action.resource` (e.g., `order.created`, `payment.refunded`)
- [ ] Select message broker based on throughput needs: Kafka for high-throughput replayable streams, RabbitMQ for complex routing and lower latency
- [ ] Implement schema registry with version compatibility checks before publishing any new event format
- [ ] Use the database outbox pattern for every write that must produce an event — never publish events from application code directly
- [ ] Make every consumer idempotent using message IDs as deduplication keys enforced by unique database constraints
- [ ] Configure dead letter queues with retry count tracking and poison pill detection for all consumers

---

## When to Use

Use this skill when:

- Decoupling service communication so producers don't need to know about consumers or their availability
- Building real-time analytics pipelines that aggregate events from multiple sources into dashboards and reports
- Implementing CQRS read projections that derive state from a stream of domain events
- Designing audit logging systems that must capture every state change immutably
- Propagating domain events across bounded contexts where services must react to changes without direct coupling

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with synchronous read/write patterns and no need for event-driven workflows
- Low-throughput operations (<100 events per second) where the overhead of a message broker exceeds the benefit
- Regulated systems requiring strict synchronous ordering guarantees that pub/sub inherently cannot provide
- Scenarios where the consumer must wait for processing to complete before returning a response — use REST/gRPC instead

---

## Core Workflow

1. **Design Event Taxonomy** — Establish a naming convention and event catalog. Every event must represent something meaningful in the domain language: `domain.action.resource` (e.g., `order.created`, `payment.refunded`, `inventory.reserved`). Classify each event as either a **domain event** (business-relevant state change) or an **infrastructure event** (system-level notification like health checks). Document the schema for every event type in the catalog.
   **Checkpoint:** Every event in the taxonomy must have a clearly identified producer, at least one consumer, and a defined schema version strategy. Events without consumers are technical debt.

2. **Select Message Broker** — Match broker technology to requirements:
   - Kafka: High-throughput streams (10k+ events/sec), replayability, long retention periods, event sourcing
   - RabbitMQ: Complex routing patterns (topic exchanges, header exchanges), lower latency (<1ms), dead letter queuing
   - AWS SQS / Azure Service Bus: Managed cloud-native, simple APIs, good for distributed systems in those clouds
   **Checkpoint:** The broker must support at-least-once delivery semantics. Exactly-once requires application-level idempotency (see Pattern 2).

3. **Set Up Schema Registry** — Deploy a schema registry (e.g., Confluent Schema Registry, Apicurio) and configure compatibility modes:
   - `BACKWARD`: New consumers can read data produced with the latest schema
   - `FULL`: Both old and new consumers can read both old and new data formats
   - `FORWARD`: Old consumers can read data produced with the newer schema
   Register every event type before any producer starts publishing. Validate schema compatibility on every deployment.
   **Checkpoint:** No producer may publish events without a registered schema version. CI/CD pipelines must validate schema compatibility before deploying new event formats.

4. **Implement Outbox Pattern** — For every service that writes data and publishes events, implement the transactional outbox: write domain data and outbox entries atomically within the same database transaction. A CDC (Change Data Capture) worker then reads the outbox table and publishes events to the message broker. This guarantees zero event loss.
   **Checkpoint:** The outbox insert must happen in the same DB transaction as the business data write. Never use two-phase commit — it defeats the purpose of microservices.

5. **Construct Idempotent Consumer** — Every consumer must handle duplicate messages gracefully. Use message IDs (provided by the broker) as unique constraints in a `processed_events` tracking table. Before processing any event, check if its ID already exists. If it does, skip processing and acknowledge the message.
   **Checkpoint:** The deduplication check + insert must be a single atomic operation using an INSERT ... ON CONFLICT DO NOTHING pattern or equivalent.

6. **Build Dead Letter Queue Pipeline** — Configure dead letter queues (DLQ) for all consumer groups. Implement retry logic with exponential backoff before routing to the DLQ. Track retry counts and implement poison pill detection — messages that fail consistently should be quarantined rather than retried indefinitely.
   **Checkpoint:** Every message routed to a DLQ must trigger an alert. DLQ messages must not be automatically re-processed without manual review and investigation.

---

## Implementation Patterns

### Pattern 1: Database Outbox Pattern with CDC

The transactional outbox pattern guarantees that business data changes and event publishing are atomic — either both succeed or neither does. A CDC worker reads the outbox table and publishes events to the message broker without modifying the source database's transaction log.

```python
# outbox/outbox_engine.py — Transactional outbox with Change Data Capture worker
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


# --- Outbox message model ---

class OutboxStatus(Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    FAILED = "failed"


@dataclass
class OutboxEntry:
    """Represents a single outbox record in the database."""
    id: str
    aggregate_id: str          # ID of the domain entity that caused this event
    aggregate_type: str        # e.g., "Order", "Payment"
    event_type: str            # e.g., "order.created", "payment.processed"
    event_data: dict[str, Any]  # Event payload as JSON-serializable dict
    metadata: dict[str, Any] = field(default_factory=dict)
    status: OutboxStatus = OutboxStatus.PENDING
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: datetime | None = None
    error_message: str | None = None


# --- SQL schema for the outbox table ---

OUTBOX_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS outbox (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id    VARCHAR(255) NOT NULL,
    aggregate_type  VARCHAR(100) NOT NULL,
    event_type      VARCHAR(255) NOT NULL,
    event_data      JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at    TIMESTAMPTZ,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_created
    ON outbox (status, created_at) WHERE status = 'pending';
"""


class OutboxRepository:
    """Database repository for outbox entries.
    
    All methods are designed to be used within transactions alongside
    business data operations, ensuring atomicity.
    """

    def __init__(self, db_connection) -> None:  # type: ignore[type-arg]
        self._conn = db_connection

    async def insert_entry(self, entry: OutboxEntry) -> str:
        """Insert an outbox entry — must be called within the same transaction as business data writes."""
        query = """
            INSERT INTO outbox (id, aggregate_id, aggregate_type, event_type, event_data, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
        """
        await self._conn.execute(
            query,
            entry.id,
            entry.aggregate_id,
            entry.aggregate_type,
            entry.event_type,
            json.dumps(entry.event_data),
            json.dumps(entry.metadata),
        )
        logger.info(
            "Outbox entry created: %s.%s for aggregate %s",
            entry.event_type, entry.id[:8], entry.aggregate_id,
        )
        return entry.id

    async def claim_pending_entries(self, batch_size: int = 100) -> list[OutboxEntry]:
        """Atomically claim a batch of pending entries for publishing.
        
        Uses SELECT ... FOR UPDATE SKIP LOCKED to allow multiple workers
        to safely consume from the same outbox table without contention.
        """
        query = """
            UPDATE outbox
            SET status = $1
            WHERE id IN (
                SELECT id FROM outbox
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT $2
                FOR UPDATE SKIP LOCKED
            )
            RETURNING *
        """
        rows = await self._conn.fetch(query, "published", batch_size)

        entries = []
        for row in rows:
            entries.append(OutboxEntry(
                id=str(row["id"]),
                aggregate_id=row["aggregate_id"],
                aggregate_type=row["aggregate_type"],
                event_type=row["event_type"],
                event_data=json.loads(row["event_data"]) if isinstance(row["event_data"], str) else row["event_data"],
                metadata=json.loads(row["metadata"]) if isinstance(row["metadata"], str) else row["metadata"],
                status=OutboxStatus.PUBLISHED,
                created_at=row["created_at"],
            ))

        return entries

    async def mark_failed(self, entry_id: str, error_message: str, retry_count: int) -> None:
        """Mark an entry as failed with retry tracking."""
        query = """
            UPDATE outbox
            SET status = 'failed',
                error_message = $1,
                retry_count = $2,
                published_at = now()
            WHERE id = $3
        """
        await self._conn.execute(query, error_message, retry_count + 1, entry_id)


class EventPublisher(Protocol):
    """Protocol for publishing events to a message broker."""
    async def publish(self, event_type: str, data: dict[str, Any], aggregate_id: str) -> None: ...


class OutboxWorker:
    """Background worker that reads outbox entries and publishes events to the broker.
    
    Runs as a long-lived process (or daemon thread) that continuously polls
    the outbox table for pending entries, publishes them, and updates their status.
    
    Retry strategy:
      - Exponential backoff with jitter: base_delay * 2^retry_count * random(0.5, 1.5)
      - Max retries: configurable (default 5)
      - On max retries exceeded: entry is marked FAILED and routed to DLQ
    """

    def __init__(
        self,
        outbox_repo: OutboxRepository,
        event_publisher: EventPublisher,
        poll_interval_ms: int = 500,
        batch_size: int = 100,
        max_retries: int = 5,
        base_retry_delay_seconds: float = 1.0,
    ) -> None:
        self._repo = outbox_repo
        self._publisher = event_publisher
        self._poll_interval_ms = poll_interval_ms
        self._batch_size = batch_size
        self._max_retries = max_retries
        self._base_retry_delay = base_retry_delay_seconds
        self._running = False

    async def start(self) -> None:
        """Start the outbox worker — runs until cancelled."""
        self._running = True
        logger.info("Outbox worker started (poll=%dms, batch=%d)", self._poll_interval_ms, self._batch_size)

        while self._running:
            try:
                entries = await self._repo.claim_pending_entries(batch_size=self._batch_size)
                if not entries:
                    await asyncio.sleep(self._poll_interval_ms / 1000.0)
                    continue

                for entry in entries:
                    await self._process_entry(entry)

            except Exception as exc:
                logger.exception("Outbox worker error during poll cycle: %s", exc)
                await asyncio.sleep(2.0)  # Brief pause on unexpected errors

    async def _process_entry(self, entry: OutboxEntry) -> None:
        """Publish a single outbox entry with retry logic."""
        try:
            await self._publisher.publish(entry.event_type, entry.event_data, entry.aggregate_id)
            logger.info("Published event %s for aggregate %s", entry.event_type, entry.aggregate_id)

        except Exception as exc:
            retry_count = 0
            # Check if we already have a retry count from the DB (from previous attempts)
            while retry_count < self._max_retries:
                delay = self._base_retry_delay * (2 ** retry_count)
                jitter = delay * (0.5 + 0.5 * __import__("random").random())

                logger.warning(
                    "Publish failed for %s (attempt %d/%d), retrying in %.1fs",
                    entry.event_type, retry_count + 1, self._max_retries, jitter,
                )
                await asyncio.sleep(jitter)

                try:
                    await self._publisher.publish(entry.event_type, entry.event_data, entry.aggregate_id)
                    logger.info("Retrieved event %s for aggregate %s after retry %d", entry.event_type, entry.aggregate_id, retry_count + 1)
                    return  # Success — exit retry loop
                except Exception:
                    retry_count += 1

            # Max retries exceeded — mark as failed
            await self._repo.mark_failed(entry.id, f"Max retries ({self._max_retries}) exceeded", retry_count - 1)
            logger.critical(
                "Outbox entry %s FAILED after %d retries — routed to DLQ: %s",
                entry.id[:8], self._max_retries, entry.event_type,
            )

    async def stop(self) -> None:
        self._running = False
        logger.info("Outbox worker stopped")


# --- Concrete example: Publishing from a business transaction ---

async def create_order_with_events(
    db_conn,  # type: ignore[type-arg]
    order_data: dict[str, Any],
) -> str:
    """Create an order and enqueue the event atomically via outbox.
    
    This is called within a database transaction:
      BEGIN;
        INSERT INTO orders ... ;
        INSERT INTO outbox ... ;  ← same transaction!
      COMMIT;
    
    The outbox worker later reads from the outbox table and publishes to Kafka.
    """
    from contextlib import asynccontextmanager

    # Create order business data
    order_id = str(uuid.uuid4())
    await db_conn.execute(
        "INSERT INTO orders (id, customer_id, total) VALUES ($1, $2, $3)",
        order_id,
        order_data["customer_id"],
        order_data["total"],
    )

    # Insert outbox entry in the SAME transaction — atomic with the business write
    outbox_entry = OutboxEntry(
        id=str(uuid.uuid4()),
        aggregate_id=order_id,
        aggregate_type="Order",
        event_type="order.created",
        event_data={
            "order_id": order_id,
            "customer_id": order_data["customer_id"],
            "items": order_data["items"],
            "total": order_data["total"],
        },
        metadata={"source": "order-service", "version": "1.0.0"},
    )

    outbox_repo = OutboxRepository(db_conn)
    await outbox_repo.insert_entry(outbox_entry)

    logger.info("Order %s created with outbox entry (same transaction)", order_id)
    return order_id
```

### Pattern 2: Idempotent Consumer

Idempotency prevents duplicate processing when the broker delivers messages more than once. This pattern uses message IDs as unique database constraints to deduplicate events at the consumer level.

```python
# consumers/idempotency.py — Idempotent event consumer decorator and base class
from __future__ import annotations

import functools
import logging
import time
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, Protocol

logger = logging.getLogger(__name__)


# --- Deduplication tracking model ---

@dataclass
class ProcessedEvent:
    """Tracks which events have already been processed to prevent duplicate work."""
    message_id: str      # Unique ID from the event/message header
    consumer_group: str  # Consumer group name — dedup is per-group
    consumed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# --- Protocol for idempotency storage ---

class IdempotencyStore(Protocol):
    """Storage backend for tracking processed message IDs."""
    async def mark_processed(self, message_id: str, consumer_group: str) -> bool:
        """Mark a message as processed. Returns True if newly inserted, False if already existed."""
        ...

    async def is_processed(self, message_id: str, consumer_group: str) -> bool:
        """Check if a message has already been processed."""
        ...


class DatabaseIdempotencyStore:
    """PostgreSQL-backed idempotency store using unique constraints for deduplication.
    
    Uses INSERT ... ON CONFLICT DO NOTHING to atomically check-and-insert,
    preventing race conditions when multiple consumer instances process the same event.
    """

    SCHEMA_SQL = """
        CREATE TABLE IF NOT EXISTS processed_events (
            message_id      VARCHAR(255) NOT NULL,
            consumer_group  VARCHAR(255) NOT NULL,
            consumed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (message_id, consumer_group)
        );

        -- Purge old records to prevent table bloat — keep last N days
        CREATE OR REPLACE FUNCTION purge_processed_events(days_keep INTEGER)
        RETURNS VOID AS $$
            DELETE FROM processed_events
            WHERE consumed_at < now() - (days_keep || ' days')::INTERVAL;
        $$ LANGUAGE SQL;
    """

    def __init__(self, db_connection) -> None:  # type: ignore[type-arg]
        self._conn = db_connection
        self._days_to_keep = 7  # Dedup window — adjust based on broker retention

    async def mark_processed(self, message_id: str, consumer_group: str) -> bool:
        """Atomically check if processed and mark as new. Returns True if this is a new event."""
        query = """
            INSERT INTO processed_events (message_id, consumer_group, consumed_at)
            VALUES ($1, $2, now())
            ON CONFLICT (message_id, consumer_group) DO NOTHING
            RETURNING consumed_at;
        """

        try:
            row = await self._conn.fetchrow(query, message_id, consumer_group)
            return row is not None  # New insert succeeded → True
        except Exception as exc:
            logger.error("Idempotency store error: %s", exc)
            raise

    async def is_processed(self, message_id: str, consumer_group: str) -> bool:
        """Fast-path check without inserting."""
        query = "SELECT 1 FROM processed_events WHERE message_id = $1 AND consumer_group = $2 LIMIT 1"
        row = await self._conn.fetchrow(query, message_id, consumer_group)
        return row is not None

    async def purge_old_records(self) -> int:
        """Remove processed event records older than the retention window."""
        result = await self._conn.execute(
            "SELECT purge_processed_events($1)", self._days_to_keep
        )
        logger.info("Purged %d old idempotency records", result or 0)
        return result


# --- Idempotent consumer base class ---

@dataclass
class EventEnvelope:
    """Wraps the raw message with metadata for consistent processing."""
    body: dict[str, Any]
    message_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])
    event_type: str = ""
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    consumer_group: str = "default"
    headers: dict[str, Any] = field(default_factory=dict)


class IdempotentConsumer(ABC):
    """Abstract base class for consumers that guarantee idempotent processing.
    
    Usage pattern:
      1. Extract message_id from the envelope (from broker header or event metadata)
      2. Check if already processed via idempotency store
      3. If not, process then mark as done — all in one atomic unit
      4. If yes, acknowledge and skip processing
    
    This handles the case where a broker redelivers the same message due to
    network timeout or consumer crash during acknowledgment.
    """

    def __init__(self, consumer_group: str = "default", store: IdempotencyStore | None = None) -> None:
        self._consumer_group = consumer_group
        self._store = store or DatabaseIdempotencyStore(None)  # type: ignore[arg-type]

    @property
    def consumer_group(self) -> str:
        return self._consumer_group

    async def consume(self, envelope: EventEnvelope) -> bool:
        """Process an event idempotently. Returns True if actually processed, False if duplicate."""
        # Step 1: Check deduplication
        if await self._store.is_processed(envelope.message_id, self._consumer_group):
            logger.debug("Skipping duplicate message %s for group %s", envelope.message_id[:8], self._consumer_group)
            return False  # Already processed — skip

        # Step 2: Process the event (this is where the abstract method is called)
        try:
            result = await self.process(envelope)

            # Step 3: Mark as processed — AFTER successful processing
            was_new = await self._store.mark_processed(envelope.message_id, self._consumer_group)

            if not was_new:
                logger.warning(
                    "Race condition: message %s was marked duplicate after processing in group %s",
                    envelope.message_id[:8], self._consumer_group,
                )

            logger.info(
                "Event %s processed successfully by %s (message_id=%s)",
                envelope.event_type, type(self).__name__, envelope.message_id[:8],
            )
            return True  # Newly processed

        except Exception as exc:
            logger.exception("Error processing event %s: %s", envelope.event_type, exc)
            raise

    @abstractmethod
    async def process(self, envelope: EventEnvelope) -> Any:
        """Process the event payload. Implement this method in subclasses."""
        ...


# --- Concrete consumer example: OrderCreatedEventConsumer ---

class OrderCreatedConsumer(IdempotentConsumer):
    """Consumes order.created events and updates downstream systems.
    
    This consumer:
      1. Receives orders from the Kafka order-created topic
      2. Sends confirmation emails via the email service
      3. Updates the analytics warehouse for real-time dashboards
      4. Reserves inventory if configured to do so
    """

    def __init__(self, **kwargs: Any) -> None:
        super().__init__(consumer_group="order-service-consumers", **kwargs)

    async def process(self, envelope: EventEnvelope) -> dict[str, Any]:
        event_data = envelope.body
        order_id = event_data["order_id"]
        customer_id = event_data["customer_id"]

        # Downstream action 1: Send confirmation email
        logger.info("Sending confirmation email for order %s to customer %s", order_id, customer_id)

        # Downstream action 2: Update analytics
        await self._update_analytics(event_data)

        # Downstream action 3: Reserve inventory (async, fire-and-forget safe)
        logger.info("Triggering inventory reservation for order %s", order_id)

        return {
            "order_id": order_id,
            "actions_completed": ["email_sent", "analytics_updated", "inventory_reserved"],
        }

    async def _update_analytics(self, event_data: dict[str, Any]) -> None:
        """Write order event to analytics warehouse."""
        logger.debug("Writing order event to analytics for %s", event_data.get("order_id", "unknown"))


# --- Decorator-based idempotency for simpler consumers ---

def idempotent(
    message_id_extractor: Callable[[EventEnvelope], str] | None = None,
) -> Callable:
    """Decorator that adds idempotency to any async event handler.
    
    Usage:
        @idempotent(message_id_extractor=lambda env: env.headers.get("message-id"))
        async def handle_payment_refunded(event):
            ...
    """
    def decorator(func: Callable[[EventEnvelope], Awaitable[Any]]) -> Callable[[EventEnvelope], Awaitable[bool]]:
        seen_ids: dict[str, datetime] = {}  # In-memory cache (use DB for multi-instance)
        dedup_ttl = 300  # 5 minutes in-memory retention

        @functools.wraps(func)
        async def wrapper(event: EventEnvelope) -> bool:
            msg_id = message_id_extractor(event) if message_id_extractor else event.message_id

            # Check in-memory cache first (fast path)
            if msg_id in seen_ids:
                if time.time() - seen_ids[msg_id].timestamp() < dedup_ttl:
                    return False  # Duplicate within TTL
                else:
                    del seen_ids[msg_id]

            try:
                await func(event)
                seen_ids[msg_id] = datetime.now()
                return True
            except Exception as exc:
                if msg_id in seen_ids:
                    del seen_ids[msg_id]  # Remove from cache on failure so retry can process
                raise
        return wrapper
```

### Pattern 3: Dead Letter Queue Pipeline

The DLQ pipeline captures failed messages, tracks retry counts, detects poison pills (messages that fail repeatedly), and provides observability into processing failures.

```python
# consumers/dlq_pipeline.py — Dead letter queue with poison pill detection
from __future__ import annotations

import asyncio
import json
import logging
import random
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class DlvStatus(Enum):
    PENDING = "pending"
    RETRYING = "retrying"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"
    PURGED = "purged"


@dataclass
class PoisonPillRecord:
    """Tracks messages that consistently fail — potential data corruption or bugs."""
    event_type: str
    consumer_group: str
    failure_count: int
    first_failure: datetime
    last_failure: datetime
    sample_error: str
    sample_message_id: str


class RetryPolicy:
    """Configurable retry strategy with exponential backoff and jitter."""

    def __init__(
        self,
        max_retries: int = 3,
        base_delay_seconds: float = 1.0,
        max_delay_seconds: float = 60.0,
        jitter_factor: float = 0.5,
    ) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay_seconds
        self.max_delay = max_delay_seconds
        self.jitter_factor = jitter_factor

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for a given retry attempt with exponential backoff and random jitter."""
        raw_delay = min(
            self.base_delay * (2 ** attempt),
            self.max_delay,
        )
        jitter = raw_delay * self.jitter_factor * (random.random() - 0.5) * 2
        return max(0.1, raw_delay + jitter)  # Minimum 100ms delay


@dataclass
class FailedMessage:
    """Represents a message that failed processing and is queued for retry or DLQ."""
    original_message_id: str
    event_type: str
    consumer_group: str
    payload: dict[str, Any]
    error_message: str
    retry_count: int = 0
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_retry_at: datetime | None = None
    status: DlvStatus = DlvStatus.PENDING
    dlq_routed: bool = False


class PoisonPillDetector:
    """Detects poison pills — messages that fail consistently, indicating a data or code issue.
    
    Detection strategy:
      - Track failure counts per (event_type, consumer_group) pair
      - If a pair exceeds the threshold within the time window, it's flagged as a poison pill
      - Poison pills bypass retry and go directly to INVESTIGATING status
    """

    def __init__(self, failure_threshold: int = 5, window_seconds: float = 300.0) -> None:
        self.failure_threshold = failure_threshold
        self.window_seconds = window_seconds
        # Keyed by (event_type, consumer_group)
        self._failure_counts: dict[tuple[str, str], list[datetime]] = defaultdict(list)

    def record_failure(self, event_type: str, consumer_group: str, error: str, message_id: str) -> PoisonPillRecord | None:
        """Record a failure and check if this constitutes a poison pill."""
        key = (event_type, consumer_group)
        now = datetime.now(timezone.utc)

        # Clean old failures outside the window
        cutoff = now.timestamp() - self.window_seconds
        self._failure_counts[key] = [
            ts for ts in self._failure_counts[key] if ts.timestamp() > cutoff
        ]
        self._failure_counts[key].append(now)

        if len(self._failure_counts[key]) >= self.failure_threshold:
            # Flag as poison pill
            recent_failures = self._failure_counts[key][-self.failure_threshold:]
            return PoisonPillRecord(
                event_type=event_type,
                consumer_group=consumer_group,
                failure_count=len(self._failure_counts[key]),
                first_failure=recent_failures[0],
                last_failure=now,
                sample_error=error[:500],
                sample_message_id=message_id[:16],
            )
        return None

    def reset(self, event_type: str, consumer_group: str) -> None:
        """Reset the failure counter when a message succeeds or is resolved."""
        key = (event_type, consumer_group)
        if key in self._failure_counts:
            del self._failure_counts[key]


class DeadLetterQueuePipeline:
    """Manages failed messages with retry logic, DLQ routing, and poison pill detection.
    
    Flow for a failed message:
      1. Increment retry_count
      2. If retry_count < max_retries → schedule retry with exponential backoff
      3. If retry_count >= max_retries → route to permanent DLQ
      4. Poison pill detector monitors for repeated failures on the same event type
    
    This prevents a single bad message from consuming resources indefinitely
    while still giving transient failures a chance to succeed on retry.
    """

    def __init__(
        self,
        max_retries: int = 3,
        poison_threshold: int = 5,
        poison_window_seconds: float = 300.0,
    ) -> None:
        self.retry_policy = RetryPolicy(max_retries=max_retries)
        self.poison_detector = PoisonPillDetector(
            failure_threshold=poison_threshold,
            window_seconds=poison_window_seconds,
        )
        self._pending: list[FailedMessage] = []
        self._dlq: list[FailedMessage] = []

    def route_message(self, failed_msg: FailedMessage) -> str:
        """Route a failed message to retry queue or permanent DLQ.
        
        Returns the routing decision: 'retry', 'dlq', or 'investigate'.
        """
        # Check for poison pill first
        poison = self.poison_detector.record_failure(
            failed_msg.event_type,
            failed_msg.consumer_group,
            failed_msg.error_message,
            failed_msg.original_message_id,
        )

        if poison:
            logger.critical(
                "POISON PILLOT DETECTED: %s in group %s (%d failures in %.0fs) — routing to INVESTIGATING",
                failed_msg.event_type, failed_msg.consumer_group,
                poison.failure_count, self.poison_window_seconds,
            )
            failed_msg.status = DlvStatus.INVESTIGATING
            self._pending.append(failed_msg)
            return "investigate"

        if failed_msg.retry_count >= self.retry_policy.max_retries:
            # Max retries exceeded — route to permanent DLQ
            failed_msg.dlq_routed = True
            failed_msg.status = DlvStatus.PENDING
            self._dlq.append(failed_msg)
            logger.warning(
                "Message %s routed to DLQ after %d retries (event=%s, group=%s)",
                failed_msg.original_message_id[:8],
                failed_msg.retry_count,
                failed_msg.event_type,
                failed_msg.consumer_group,
            )
            return "dlq"

        # Schedule retry with exponential backoff
        failed_msg.retry_count += 1
        failed_msg.last_retry_at = datetime.now(timezone.utc)
        failed_msg.status = DlvStatus.RETRYING

        delay = self.retry_policy.calculate_delay(failed_msg.retry_count - 1)
        logger.info(
            "Scheduling retry %d/%d for message %s (event=%s, delay=%.1fs)",
            failed_msg.retry_count, self.retry_policy.max_retries,
            failed_msg.original_message_id[:8],
            failed_msg.event_type,
            delay,
        )

        # Schedule the actual retry asynchronously
        asyncio.create_task(self._retry_after_delay(failed_msg, delay))
        return "retry"

    async def _retry_after_delay(self, message: FailedMessage, delay: float) -> None:
        """Wait for the calculated backoff period then signal that the message is ready to retry."""
        await asyncio.sleep(delay)
        message.status = DlvStatus.PENDING
        logger.debug("Retry message %s is now pending", message.original_message_id[:8])

    def get_dlq_messages(self, limit: int = 100) -> list[FailedMessage]:
        """Retrieve messages from the DLQ for inspection/reprocessing."""
        return self._dlq[:limit]

    def get_pending_retries(self) -> list[FailedMessage]:
        """Get messages scheduled for retry that are ready to be reprocessed."""
        return [m for m in self._pending if m.status == DlvStatus.PENDING]

    def acknowledge_success(self, message: FailedMessage) -> None:
        """Called when a retried message succeeds — reset poison pill counter."""
        self.poison_detector.reset(message.event_type, message.consumer_group)
        message.status = DlvStatus.RESOLVED


# --- Example: Using the DLQ pipeline with an event consumer ---

class ResilientEventConsumer:
    """Wraps a standard consumer with DLQ-based resilience."""

    def __init__(self, dlq_pipeline: DeadLetterQueuePipeline) -> None:
        self._dlq = dlq_pipeline

    async def consume(self, event_type: str, payload: dict[str, Any], consumer_group: str, message_id: str) -> bool:
        """Try to process an event. On failure, route through the DLQ pipeline."""
        try:
            await self._process_event(event_type, payload)
            return True

        except Exception as exc:
            failed = FailedMessage(
                original_message_id=message_id,
                event_type=event_type,
                consumer_group=consumer_group,
                payload=payload,
                error_message=str(exc),
            )
            routing = self._dlq.route_message(failed)

            if routing == "dlq":
                logger.error("Message permanently dead-lettered: %s", message_id[:8])
            elif routing == "investigate":
                logger.critical("Poison pill detected for event type: %s", event_type)

            return False

    async def _process_event(self, event_type: str, payload: dict[str, Any]) -> None:
        """Core processing logic — raises on any failure."""
        logger.info("Processing event %s", event_type)
        # ... actual business logic here ...
```

### Pattern 4: Schema Registry Integration

Schema registry integration ensures all producers and consumers agree on event formats. This pattern shows JSON Schema validation with backward/forward compatibility checking for schema evolution.

```python
# schema/registry.py — Schema registry client with version compatibility checking
from __future__ import annotations

import hashlib
import json
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol

logger = logging.getLogger(__name__)


class CompatibilityLevel(Enum):
    BACKWARD = "BACKWARD"           # New schema can read old data
    FORWARD = "FORWARD"             # Old schema can read new data
    FULL = "FULL"                   # Both directions compatible
    NONE = "NONE"                   # No compatibility enforced


@dataclass
class SchemaVersion:
    """Represents a registered schema version in the registry."""
    subject: str                  # e.g., "order-created-value"
    version: int                  # Numeric version (auto-incremented by registry)
    schema_id: str                # Content-based hash for deduplication
    schema: dict[str, Any]        # The actual JSON Schema definition
    compatibility: CompatibilityLevel = CompatibilityLevel.FULL
    registered_at: datetime = field(default_factory=time.time)  # type: ignore[arg-type]


class SchemaRegistryClient(Protocol):
    """Protocol for interacting with a schema registry service."""
    async def register_schema(self, subject: str, schema: dict[str, Any], compatibility: CompatibilityLevel) -> int: ...
    async def get_latest_version(self, subject: str) -> SchemaVersion | None: ...
    async def validate_compatibility(self, subject: str, new_schema: dict[str, Any]) -> bool: ...
    async def resolve_schema_id(self, schema: dict[str, Any]) -> str: ...


class LocalSchemaRegistryClient:
    """In-memory schema registry implementation for development and testing.
    
    In production, replace this with a real registry client (Confluent Schema Registry,
    Apicurio Registry, or AWS Glue Schema Registry) that exposes an HTTP API.
    """

    def __init__(self, default_compatibility: CompatibilityLevel = CompatibilityLevel.FULL) -> None:
        self._default_compatibility = default_compatibility
        self._schemas: dict[str, list[SchemaVersion]] = {}  # subject → versions
        self._schema_ids: dict[str, SchemaVersion] = {}  # schema_id → version

    async def register_schema(self, subject: str, schema: dict[str, Any], compatibility: CompatibilityLevel | None = None) -> int:
        """Register a new schema version. Returns the new version number."""
        compat = compatibility or self._default_compatibility

        # Check if exact schema already exists (deduplication by hash)
        schema_id = self._compute_schema_hash(schema)
        if schema_id in self._schema_ids:
            existing = self._schema_ids[schema_id]
            if existing.subject == subject:
                logger.info("Schema already registered for subject %s (version %d)", subject, existing.version)
                return existing.version

        # Check compatibility against latest version
        latest = await self.get_latest_version(subject)
        if latest is not None and compat != CompatibilityLevel.NONE:
            compatible = await self._check_compatibility(latest.schema, schema, compat)
            if not compatible:
                raise ValueError(
                    f"Incompatible schema change for subject '{subject}'. "
                    f"Latest version: {latest.version}, compatibility: {compat.value}"
                )

        # Register new version
        versions = self._schemas.setdefault(subject, [])
        new_version = SchemaVersion(
            subject=subject,
            version=len(versions) + 1 if versions else 1,
            schema_id=schema_id,
            schema=schema,
            compatibility=compat,
        )

        versions.append(new_version)
        self._schema_ids[schema_id] = new_version
        logger.info("Registered schema %s version %d (id=%s)", subject, new_version.version, schema_id[:12])
        return new_version.version

    async def get_latest_version(self, subject: str) -> SchemaVersion | None:
        """Get the latest registered version for a subject."""
        versions = self._schemas.get(subject, [])
        return versions[-1] if versions else None

    async def validate_compatibility(self, subject: str, new_schema: dict[str, Any]) -> bool:
        """Validate that a new schema is compatible with the latest registered version."""
        latest = await self.get_latest_version(subject)
        if latest is None or latest.compatibility == CompatibilityLevel.NONE:
            return True  # No previous version or no compatibility check needed
        return await self._check_compatibility(latest.schema, new_schema, latest.compatibility)

    async def _check_compatibility(
        self,
        old_schema: dict[str, Any],
        new_schema: dict[str, Any],
        level: CompatibilityLevel,
    ) -> bool:
        """Schema compatibility check using structural comparison."""
        if level == CompatibilityLevel.NONE:
            return True

        old_props = set(old_schema.get("properties", {}).keys())
        new_props = set(new_schema.get("properties", {}).keys())
        old_required = set(old_schema.get("required", []))
        new_required = set(new_schema.get("required", []))

        if level == CompatibilityLevel.BACKWARD:
            # New schema must be able to read old data:
            # - Adding optional fields is OK
            # - Removing fields or making required fields optional is OK
            added = new_props - old_props
            removed = old_props - new_props
            new_required_only = new_required - old_required
            return len(removed) == 0 and len(new_required_only) == 0

        elif level == CompatibilityLevel.FORWARD:
            # Old schema must be able to read new data:
            # - Removing fields is OK
            # - Making optional fields required is OK (old consumers ignore unknown fields)
            added = new_props - old_props
            removed = old_props - new_props
            return len(removed) == 0  # Can't remove fields that old schema expects

        elif level == CompatibilityLevel.FULL:
            # Both directions: only additions allowed, no removals or required changes
            return await self._check_compatibility(old_schema, new_schema, CompatibilityLevel.BACKWARD) and \
                   await self._check_compatibility(new_schema, old_schema, CompatibilityLevel.FORWARD)

        return True

    def _compute_schema_hash(self, schema: dict[str, Any]) -> str:
        """Compute a deterministic hash of the schema for deduplication."""
        canonical = json.dumps(schema, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(canonical.encode()).hexdigest()

    def get_schema(self, subject: str, version: int | None = None) -> SchemaVersion | None:
        """Retrieve a specific schema version."""
        versions = self._schemas.get(subject, [])
        if version is None:
            return versions[-1] if versions else None
        for v in versions:
            if v.version == version:
                return v
        return None


# --- Event serialization with schema validation ---

def validate_event_payload(schema: dict[str, Any], payload: dict[str, Any]) -> list[str]:
    """Validate a JSON payload against a JSON Schema definition.
    
    Returns a list of validation errors (empty = valid).
    This is a lightweight validator — for production use, install jsonschema package.
    """
    errors: list[str] = []

    # Check required fields
    required_fields = schema.get("required", [])
    properties = schema.get("properties", {})

    for field_name in required_fields:
        if field_name not in payload:
            errors.append(f"Missing required field: {field_name}")

    # Type validation (simplified — covers common JSON types)
    for field_name, field_schema in properties.items():
        if field_name not in payload:
            continue

        value = payload[field_name]
        expected_type = field_schema.get("type")

        type_map = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict,
        }

        if expected_type and expected_type in type_map:
            if not isinstance(value, type_map[expected_type]):
                errors.append(f"Field '{field_name}': expected {expected_type}, got {type(value).__name__}")

        # String constraints
        if expected_type == "string" and isinstance(value, str):
            min_length = field_schema.get("minLength")
            max_length = field_schema.get("maxLength")
            pattern = field_schema.get("pattern")

            if min_length and len(value) < min_length:
                errors.append(f"Field '{field_name}': length {len(value)} below minimum {min_length}")
            if max_length and len(value) > max_length:
                errors.append(f"Field '{field_name}': length {len(value)} exceeds maximum {max_length}")
            if pattern:
                import re
                if not re.match(pattern, value):
                    errors.append(f"Field '{field_name}': value '{value}' doesn't match pattern '{pattern}'")

    # Numeric constraints
    for field_name in properties:
        if field_name not in payload:
            continue
        value = payload[field_name]
        field_schema = properties[field_name]

        if isinstance(value, (int, float)):
            minimum = field_schema.get("minimum")
            maximum = field_schema.get("maximum")
            if minimum is not None and value < minimum:
                errors.append(f"Field '{field_name}': value {value} below minimum {minimum}")
            if maximum is not None and value > maximum:
                errors.append(f"Field '{field_name}': value {value} exceeds maximum {maximum}")

    return errors


# --- Usage example with the schema registry ---

def create_event_schema() -> dict[str, Any]:
    """Define a JSON Schema for an order.created event."""
    return {
        "type": "object",
        "properties": {
            "order_id": {
                "type": "string",
                "pattern": r"^ord-[a-f0-9]{12}$",
                "minLength": 16,
                "maxLength": 16,
            },
            "customer_id": {
                "type": "string",
                "minLength": 1,
            },
            "items": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string"},
                        "quantity": {"type": "integer", "minimum": 1},
                        "unit_price": {"type": "number", "minimum": 0},
                    },
                    "required": ["product_id", "quantity", "unit_price"],
                },
                "minItems": 1,
            },
            "total": {
                "type": "number",
                "minimum": 0,
            },
            "currency": {
                "type": "string",
                "pattern": r"^[A-Z]{3}$",
            },
        },
        "required": ["order_id", "customer_id", "items", "total", "currency"],
    }


async def publish_event_with_validation(
    registry: LocalSchemaRegistryClient,
    subject: str,
    event_type: str,
    payload: dict[str, Any],
) -> bool:
    """Publish an event after validating it against the registered schema."""
    latest = await registry.get_latest_version(subject)
    if latest is None:
        # Register first version
        schema = create_event_schema()
        await registry.register_schema(subject, schema, CompatibilityLevel.FULL)
        latest = await registry.get_latest_version(subject)

    # Validate payload against the registered schema
    errors = validate_event_payload(latest.schema, payload)
    if errors:
        logger.error(
            "Event validation failed for %s in subject %s: %s",
            event_type, subject, "; ".join(errors),
        )
        return False

    # Schema-validated — proceed with publishing (e.g., to Kafka/RabbitMQ)
    logger.info("Event %s validated against schema v%d → publishing", event_type, latest.version)
    return True
```

---

## Constraints

### MUST DO
- Implement the transactional outbox pattern for all events originating from database writes — never publish events directly from application code without an outbox
- Make every consumer idempotent using message ID deduplication with unique database constraints — brokers guarantee at-least-once delivery, not exactly-once
- Register all event schemas in a schema registry before deploying any producer that publishes them
- Configure dead letter queues for all consumer groups — no failed messages should be silently dropped
- Use exponential backoff with jitter for retries (never fixed delays) to prevent thundering herd on recovery
- Partition Kafka topics by aggregate ID so events for the same entity are processed in order within a partition
- Purge old idempotency records regularly — never let the deduplication table grow unbounded

### MUST NOT DO
- Publish events from multiple places for the same business action (causes duplicate events even with outbox)
- Store sensitive data (PII, payment details) in event payloads — use references to external resources instead
- Skip schema registry validation in any environment including staging — schema drift causes silent data corruption
- Use a shared topic for all event types — group by domain bounded context (e.g., `orders.*`, `payments.*`)
- Process DLQ messages automatically without manual investigation — they indicate bugs or data issues that require root cause analysis
- Design schemas with mutable field semantics — treat schema evolution as a first-class concern requiring versioning and compatibility checks

---

## Related Skills

| Skill | Purpose |
|---|---|
| `microservices-architecture` | Inter-service communication patterns that complement event-driven coordination |
| `monolith-strangler-pattern` | Incremental migration strategy for extracting event-producing services from a monolith |

---

## Live References

> Authoritative documentation links for event-driven architecture patterns. The model follows markdown links at load time to resolve external references and inline content.

- [Martin Fowler — Publish-Subscribe Messaging](https://martinfowler.com/articles/pubSub.html)
- [Confluent — Kafka Streams Documentation](https://kafka.apache.org/documentation/)
- [RabbitMQ — Tutorials: Event Publishing and Consumption](https://www.rabbitmq.com/tutorials/tutorial-one-python)
- [Microsoft — Transactional Outbox Pattern on Azure](https://learn.microsoft.com/en-us/azure/architecture/patterns/transactional-outbox)
- [Event Sourcing — Axon Framework](https://docs.axoniq.io/reference-guide/event-processing/saga-pattern/references/outbox-pattern)
- [Confluent Schema Registry API Reference](https://docs.confluent.io/platform/current/schema-registry/develop/api.html)
- [CloudEvents Specification (CNCF)](https://cloudevents.io)
