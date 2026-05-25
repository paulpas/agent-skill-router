---
name: idempotent-distributed-operations
description: Implements idempotency patterns for distributed microservice systems
  including idempotency keys, request deduplication, optimistic concurrency control,
  and idempotent handlers to ensure exactly-once semantics in event-driven architectures.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: idempotency, idempotent, idempotency key, request deduplication, exactly
    once, duplicate detection, optimistic concurrency, idempotent handler, outbox
    pattern, race condition prevention
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
  related-skills: microservice-resilience-patterns, microservices-architecture, event-driven-patterns,
    database-design-modeling
------
# Idempotent Distributed Operations

Implements idempotency guarantees across distributed microservice systems by combining request-level deduplication via idempotency keys, optimistic concurrency control with version vectors, idempotent event consumers, and database-level unique constraints — ensuring that repeated execution of the same operation never produces side effects beyond the first application.

## TL;DR Checklist

- [ ] Assign a stable `idempotency_key` (UUIDv7 or ULID) to every external request before processing
- [ ] Store idempotency keys in a database with a unique constraint and check before executing business logic
- [ ] Add an `updated_at` version column to mutable tables and validate it matches the expected value on write
- [ ] Wrap event consumers in a try/except that handles duplicate detection without retrying already-successful operations
- [ ] Enforce UNIQUE constraints at the database level for natural deduplication (e.g., composite unique on resource_id + operation_type)

---

## When to Use

Use this skill when:

- Building microservice APIs where network retries (from load balancers, proxies, or HTTP clients) can cause duplicate request delivery
- Designing event-driven consumers (Kafka, RabbitMQ, SQS) that may receive the same message multiple times due to at-least-once delivery guarantees
- Implementing payment processing, order creation, or any financial transaction where double-charging is unacceptable
- Designing distributed systems operating under CAP theorem trade-offs where network partitions can cause request duplication across replicas
- Integrating with third-party webhooks that do not guarantee single delivery and may resend events on timeout
- Building idempotent background job processors where workers crash mid-execution and the orchestrator re-enqueues the same job

---

## When NOT to Use

Avoid this skill for:

- **Idempotent-only operations** — GET requests, pure lookups, or reads that produce no side effects already satisfy idempotency by nature. Adding key tracking creates unnecessary overhead.
- **Single-threaded synchronous systems** — if there is only one execution path with no concurrency, retries are impossible and idempotency keys add latency without benefit.
- **Real-time streaming systems requiring strict ordering** — event-driven streams with sequence-number-based ordering (e.g., Kafka partition ordering) handle deduplication at the log level; adding per-message idempotency keys is redundant.

---

## Core Workflow

1. **Identify Idempotency Needs** — Audit all external-facing endpoints and event consumers. Mark operations as idempotent-required if they (a) produce side effects (writes, external calls), (b) accept data from untrusted or unreliable sources, and (c) can be called multiple times due to retries or network partitions. **Checkpoint:** Produce an inventory table mapping each endpoint/event handler to its idempotency requirement level (none / soft / hard).

2. **Design Key Schema** — Define the structure of your `idempotency_key`. Use ULID (time-sortable, 128-bit) or UUIDv7 for monotonic ordering and TTL-friendly partitioning. The key must uniquely identify: the requesting principal, the target resource, the operation type, and any distinguishing input parameters. Store keys with a `status` enum (`pending`, `completed`, `failed`) and a `result_cache` column for returning cached responses. **Checkpoint:** Verify the key schema supports composite uniqueness (e.g., UNIQUE constraint on `(idempotency_key, tenant_id)`) and that TTL expiration can be applied via an index on `expires_at`.

3. **Implement Handler-Level Deduplication** — In every HTTP handler or RPC method, extract or generate the idempotency key from request headers (e.g., `Idempotency-Key`), validate it against the storage layer, and short-circuit to the cached result if a previous invocation already completed. If the key is missing, reject with `400 Bad Request`. If found and pending, return `429 Too Many Requests` with a retry-after header rather than executing again. **Checkpoint:** Run an integration test that sends the same request twice within 50ms — the second must return `200 OK` with the exact cached response body without hitting downstream services.

4. **Add Optimistic Concurrency Control** — For mutable entities updated by multiple concurrent requests, add an `updated_at` timestamp column or a monotonically increasing version number (e.g., BIGINT) to every table that supports in-place updates. In UPDATE statements, include `WHERE updated_at = :expected_timestamp` (or `AND version = :expected_version`). On affected-row count of 0, raise an `OptimisticConcurrencyError` that the caller can retry with refreshed data. **Checkpoint:** Simulate two concurrent requests updating the same entity — one must succeed and the other must receive a conflict error; verify the retried request reflects the committed state.

5. **Enforce Database-Level Unique Constraints** — Beyond application-layer deduplication, create UNIQUE or partial UNIQUE constraints on columns that naturally prevent duplication. Examples: `(order_id, status)` to prevent duplicate status transitions, `(external_ref_id)` for webhook processing, or a unique index on `(consumer_group, partition, offset)` for exactly-once event consumption. Use database-level enforcement as the final safety net — application checks are fast, but only the database can guarantee atomic uniqueness under concurrent load. **Checkpoint:** Run `EXPLAIN` on the UNIQUE constraint indexes to confirm they use B-tree or BRIN indexes appropriate for your data volume and access patterns.

6. **Integrate with Event Consumers** — In each message handler (Kafka consumer, RabbitMQ queue worker, SQS listener), extract or generate an idempotency key from the message metadata (e.g., `message_id`, Kafka headers). Before processing, insert a record into the idempotency store with status `pending`. If the insertion fails due to a unique constraint violation, skip processing and acknowledge the message as a duplicate. After successful processing, update the status to `completed` and persist any result payload for replay queries. **Checkpoint:** In a stress test that delivers 10,000 messages with 30% duplicates at high concurrency (50 consumers), verify zero duplicated side effects and 100% correct deduplication rate.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Idempotency Key Validation — Request-Level Deduplication

This pattern intercepts incoming HTTP requests, validates the idempotency key against a persistent store, and returns cached results for already-processed operations. The key is generated from request context (user identity, target resource, operation payload hash) and stored with the response result so that retries return consistent data.

```python
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Optional
from dataclasses import dataclass, field

# --- Data Models ---

class IdempotencyStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass(frozen=True)
class IdempotencyRecord:
    """Immutable record of an idempotent operation execution."""
    idempotency_key: str
    status: IdempotencyStatus
    result: Optional[dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc) + timedelta(hours=24)
    )


@dataclass
class IdempotencyStore:
    """Interface for persisting idempotency records."""

    def get(self, key: str) -> Optional[IdempotencyRecord]: ...
    def put(self, record: IdempotencyRecord) -> None: ...
    def update_status(self, key: str, status: IdempotencyStatus, result: dict | None = None) -> bool: ...


@dataclass
class ConflictError(Exception):
    """Raised when an idempotency key is already in use with a pending operation."""

    key: str
    retry_after_seconds: int = 30


# --- Core Handler ---

class IdempotencyMiddleware:
    """HTTP middleware that enforces idempotency on POST/PATCH/PUT endpoints."""

    TTL_SECONDS = 86400  # 24-hour expiration window

    def __init__(self, store: IdempotencyStore) -> None:
        self._store = store

    @staticmethod
    def compute_key(
        method: str,
        path: str,
        tenant_id: str,
        body_hash: Optional[str] = None,
    ) -> str:
        """Generate a deterministic idempotency key from request context.

        Uses ULID-based construction with component hashing for collision resistance.
        The key encodes: HTTP method, target path, tenant isolation, and (optionally)
        body fingerprint — ensuring different operations on the same resource are distinct.
        """
        components = f"{method}:{path}:{tenant_id}"
        if body_hash:
            components += f":{body_hash}"

        raw_hash = hashlib.sha256(components.encode("utf-8")).hexdigest()[:32]
        return f"idem_{raw_hash}"

    def handle_request(
        self,
        method: str,
        path: str,
        tenant_id: str,
        body: Optional[dict],
        handler_fn: Any,
    ) -> dict[str, Any]:
        """Execute a request through the idempotency guard.

        Flow:
          1. Compute key from request context.
          2. Lookup existing record — return cached result if completed.
          3. Check for pending conflict — reject with retry-after.
          4. Mark as pending, execute handler.
          5. Store completed result and return.
        """
        body_hash = hashlib.sha256(
            str(body or {}).encode("utf-8")
        ).hexdigest()[:16] if body else None

        key = self.compute_key(method, path, tenant_id, body_hash)

        # Step 1: Check for existing completed result (cache hit)
        existing = self._store.get(key)
        if existing is not None:
            if existing.status == IdempotencyStatus.COMPLETED:
                return {"status": "cached", "data": existing.result}
            if existing.status == IdempotencyStatus.FAILED:
                # Allow retry on previous failure — clear and re-execute
                self._store.update_status(key, IdempotencyStatus.PENDING)

        # Step 2: Guard against concurrent duplicate requests (pending conflict)
        if self._store.get(key) is not None:
            raise ConflictError(key=key, retry_after_seconds=self.TTL_SECONDS // 60)

        # Step 3: Mark as pending — execute handler under the idempotency key
        record = IdempotencyRecord(
            idempotency_key=key,
            status=IdempotencyStatus.PENDING,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=self.TTL_SECONDS),
        )
        self._store.put(record)

        try:
            result = handler_fn()
        except Exception as exc:
            self._store.update_status(
                key, IdempotencyStatus.FAILED, error_message=str(exc)
            )
            raise

        # Step 4: Store the successful result for future lookups
        final_record = IdempotencyRecord(
            idempotency_key=key,
            status=IdempotencyStatus.COMPLETED,
            result=result,
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=self.TTL_SECONDS),
        )
        self._store.put(final_record)
        return result
```

### Pattern 2: Optimistic Concurrency Control — Version-Based Conflict Detection

This pattern adds a version column to mutable entities and includes it in every UPDATE's WHERE clause. When two concurrent requests target the same row, only one succeeds (the first to commit); the other receives an affected-row count of zero, triggering a retry with the refreshed entity state. This approach follows the ETag/If-Match pattern from HTTP semantics and is essential when multiple services may concurrently modify the same resource.

```python
from dataclasses import dataclass, field
from typing import Optional
import time


@dataclass
class VersionedEntity:
    """A database entity protected by optimistic concurrency control."""

    id: str
    name: str
    value: float
    version: int = 0  # Monotonically increasing version counter
    updated_at: Optional[float] = None  # Unix timestamp of last modification


class OptimisticConcurrencyManager:
    """Manages concurrent updates using version-based conflict detection.

    Works under the assumption that conflicts are rare (short write windows).
    Under high contention, this degrades to retries with exponential backoff,
    consistent with the CAP theorem's availability vs consistency trade-off
    in partition-tolerant systems.
    """

    def __init__(self, store: IdempotencyStore) -> None:
        self._store = store
        self.max_retries: int = 3
        self.base_delay_ms: float = 100.0

    def update_with_version_check(
        self,
        entity_id: str,
        expected_version: int,
        updates: dict[str, Any],
    ) -> VersionedEntity:
        """Atomically update an entity only if its version matches the caller's snapshot.

        Args:
            entity_id: The primary key of the entity to update.
            expected_version: The version the caller read before modifying.
            updates: Dict of field_name -> new_value to apply.

        Returns:
            The updated entity with incremented version.

        Raises:
            ConflictError: If the entity's current version differs from expected_version,
                           indicating another writer committed in the meantime.
        """
        # Read current state
        record = self._store.get(entity_id)  # type: ignore[union-attr]
        if record is None:
            raise ValueError(f"Entity {entity_id} not found")

        current_version = record.version  # type: ignore[attr-defined]

        # Version check — this is the optimistic concurrency guard
        if current_version != expected_version:
            raise ConflictError(
                key=entity_id,
                retry_after_seconds=max(1, (expected_version - current_version)),
            )

        # Apply updates and increment version atomically
        for attr, new_value in updates.items():
            setattr(record, attr, new_value)  # type: ignore[union-attr]
        record.version += 1  # type: ignore[attr-defined]
        record.updated_at = time.time()

        self._store.put(record)  # type: ignore[arg-type]
        return record  # type: ignore[return-value]

    def update_with_retry(
        self,
        entity_id: str,
        snapshot_fn: Any,  # Function that returns (entity, version) from external source
        apply_fn: Any,     # Function that takes entity and returns updates dict
    ) -> VersionedEntity:
        """Execute an update with automatic retry on version conflicts.

        Uses exponential backoff starting at base_delay_ms * 2^attempt.
        Each retry re-reads the latest state via snapshot_fn before applying.

        This implements the standard optimistic concurrency retry loop used in
        databases like PostgreSQL (MVCC) and Redis (optimistic locks).
        """
        last_exc: Optional[Exception] = None

        for attempt in range(self.max_retries):
            try:
                entity, current_version = snapshot_fn(entity_id)
                updates = apply_fn(entity)
                return self.update_with_version_check(entity_id, current_version, updates)
            except ConflictError as exc:
                last_exc = exc
                if attempt < self.max_retries - 1:
                    delay_ms = self.base_delay_ms * (2 ** attempt)
                    time.sleep(delay_ms / 1000.0)
                continue

        raise last_exc or RuntimeError("Update failed after max retries")
```

### Pattern 3: Idempotent Message Handler — Event Consumer Safety

This pattern wraps event consumer logic so that duplicate messages (delivered at-least-once by Kafka, RabbitMQ, or SQS) are detected and skipped without re-executing business logic. The handler extracts a `message_id` from the event metadata and checks an idempotency store before processing. Messages already marked `completed` are silently acknowledged; messages with unique keys proceed normally.

```python
import uuid
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


@dataclass
class EnvelopeMessage:
    """Abstract representation of a message from any event broker."""

    message_id: str
    topic: str
    payload: dict[str, Any]
    headers: dict[str, str] = field(default_factory=dict)
    timestamp: Optional[datetime] = None
    retry_count: int = 0


@dataclass
class MessageIdempotencyRecord:
    """Tracks which messages have been processed."""

    message_id: str
    topic: str
    status: str  # "pending", "completed", "failed"
    consumer_group: str
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class IdempotentEventConsumer:
    """Event consumer that safely handles duplicate messages from at-least-once delivery.

    Each consumer group gets its own idempotency namespace (via composite key on
    message_id + consumer_group), allowing the same message to be processed independently
    by different consumers while preventing double-processing within a single group.

    This pattern is critical for Kafka consumers with auto-commit enabled, where a
    consumer may crash after processing but before committing its offset — causing
    the broker to redeliver the message on recovery.
    """

    def __init__(
        self,
        store: IdempotencyStore,
        consumer_group: str,
        max_retry_count: int = 3,
    ) -> None:
        self._store = store
        self._consumer_group = consumer_group
        self._max_retries = max_retry_count

    def handle_message(
        self,
        message: EnvelopeMessage,
        handler_fn: Callable[[dict[str, Any]], dict[str, Any]],
    ) -> dict[str, Any]:
        """Process a message with duplicate detection and idempotency guarantees.

        Flow:
          1. Generate composite key from (message_id + consumer_group).
          2. Check idempotency store — skip if already completed.
          3. If failed and within retry limit, allow reprocessing.
          4. Mark as pending, execute handler.
          5. On success, mark completed and return result.
          6. On failure, increment retry count or mark permanently failed.

        Args:
            message: The incoming event/message from the broker.
            handler_fn: Business logic to process the message payload.

        Returns:
            Result dict from the handler, or an error envelope.

        Raises:
            ValueError: If message exceeds max retry count (dead-letter).
        """
        # Composite key: unique per (message, consumer_group) pair
        composite_key = f"{self._consumer_group}:{message.message_id}"

        # Step 1: Check for already-processed message (skip duplicate)
        existing = self._store.get(composite_key)  # type: ignore[union-attr]
        if existing is not None:
            status = getattr(existing, "status", None)
            if status == "completed":
                logger.info("Skipping duplicate message %s for group %s",
                            message.message_id, self._consumer_group)
                return {"status": "skipped_duplicate", "message_id": message.message_id}
            if status == "failed" and message.retry_count >= self._max_retries:
                raise ValueError(
                    f"Message {message.message_id} exceeded max retries ({self._max_retries})"
                )

        # Step 2: Mark as pending to prevent concurrent reprocessing
        pending_record = MessageIdempotencyRecord(
            message_id=message.message_id,
            topic=message.topic,
            status="pending",
            consumer_group=self._consumer_group,
        )
        try:
            self._store.put(pending_record)  # type: ignore[arg-type]
        except Exception:
            # Insert might have failed due to unique constraint — message is being processed
            return {"status": "skipped_duplicate", "message_id": message.message_id}

        # Step 3: Execute business handler
        try:
            result = handler_fn(message.payload)
        except Exception as exc:
            logger.error("Handler failed for message %s: %s",
                         message.message_id, exc)
            self._update_completion(composite_key, "failed")
            raise

        # Step 4: Mark as completed — duplicate messages will be skipped
        self._update_completion(composite_key, "completed")
        logger.info("Message %s processed successfully for group %s",
                    message.message_id, self._consumer_group)
        return {"status": "completed", "message_id": message.message_id, "result": result}

    def _update_completion(self, composite_key: str, status: str) -> None:
        """Update the idempotency record status after processing."""
        self._store.update_status(composite_key, status if status == "completed" else "failed")  # type: ignore[arg-type]


# Example usage with Kafka-like consumer
def example_kafka_consumer(store: IdempotencyStore) -> None:
    """Demonstrates an idempotent Kafka consumer loop."""

    def process_order(payload: dict[str, Any]) -> dict[str, Any]:
        """Process an order creation event — must be idempotent."""
        order_id = payload["order_id"]
        amount = payload["amount"]
        # ... business logic (create order, charge payment, etc.)
        return {"processed_order_id": order_id, "amount": amount}

    consumer = IdempotentEventConsumer(
        store=store,
        consumer_group="order-processor-v1",
        max_retry_count=3,
    )

    # Simulated incoming messages (Kafka would deliver these)
    messages = [
        EnvelopeMessage(message_id=str(uuid.uuid4()), topic="orders", payload={"order_id": "ORD-001", "amount": 99.99}),
        EnvelopeMessage(message_id=str(uuid.uuid4()), topic="orders", payload={"order_id": "ORD-002", "amount": 149.50}),
    ]

    for msg in messages:
        consumer.handle_message(msg, process_order)
```

### Pattern 4: Database-Level Unique Constraints with Conflict Resolution

Application-layer deduplication can fail under concurrent load (race between check-and-insert). The final defense is a database-level UNIQUE constraint that guarantees atomic uniqueness regardless of application behavior. This pattern shows how to combine unique indexes with ON CONFLICT / upsert semantics for graceful conflict resolution, and how to use partial unique indexes for conditional deduplication.

```python
import sqlite3
from datetime import datetime, timezone
from typing import Any
from dataclasses import dataclass


@dataclass
class WebhookDelivery:
    """Represents a webhook delivery record with idempotency guarantees."""

    delivery_id: str
    event_type: str
    target_url: str
    payload: dict[str, Any]
    status: str  # "pending", "delivered", "failed"
    attempt_count: int = 0
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class DatabaseIdempotencyGuard:
    """Database-level idempotency enforcement using unique constraints and conflict resolution.

    Uses SQLite for demonstration; the same patterns apply to PostgreSQL, MySQL, etc.

    Key techniques demonstrated:
      - UNIQUE constraint on (idempotency_key) prevents duplicate entries atomically.
      - ON CONFLICT DO NOTHING for fire-and-forget deduplication.
      - ON CONFLICT DO UPDATE for conditional upserts (e.g., retry with incremented counter).
      - Partial unique indexes for scoped uniqueness (e.g., per-tenant deduplication).
    """

    def __init__(self, db_path: str = ":memory:") -> None:
        self._conn = sqlite3.connect(db_path)
        self._conn.execute("PRAGMA journal_mode=WAL")
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        """Create the idempotency store tables with proper constraints.

        Schema design decisions:
          - UNIQUE(idempotency_key) on idempotency_store: prevents duplicate operations.
          - UNIQUE(consumer_group, message_id): per-group deduplication for event consumers.
          - UNIQUE(event_type, webhook_ref_id) WHERE status = 'pending': ensures each unique
            event type with a given external reference has exactly one pending delivery.
        """
        self._conn.executescript("""
            -- Core idempotency store for HTTP request deduplication
            CREATE TABLE IF NOT EXISTS idempotency_store (
                idempotency_key TEXT PRIMARY KEY,
                status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
                result_json TEXT,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );

            -- Event consumer idempotency: composite unique per consumer group
            CREATE TABLE IF NOT EXISTS event_consumer_store (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                consumer_group TEXT NOT NULL,
                message_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(consumer_group, message_id)  -- Key constraint for deduplication
            );

            -- Partial unique index: only one pending webhook per (event_type, external_ref)
            CREATE TABLE IF NOT EXISTS webhook_deliveries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                webhook_ref_id TEXT NOT NULL,
                target_url TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'delivered', 'failed')),
                attempt_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            -- Partial unique index: enforces at-most-one pending delivery per event + ref
            CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_pending_unique
                ON webhook_deliveries(event_type, webhook_ref_id)
                WHERE status = 'pending';
        """)
        self._conn.commit()

    def upsert_idempotency_record(self, key: str, expires_at: datetime) -> bool:
        """Insert an idempotency record, silently ignoring duplicates.

        Returns True if the row was inserted (this is the first attempt).
        Returns False if a conflicting key already exists (duplicate detected).

        Uses ON CONFLICT DO NOTHING — the caller must then check whether the
        existing row is completed (return cached result) or pending/partially
        failed (wait or retry).
        """
        try:
            self._conn.execute(
                """
                INSERT INTO idempotency_store (idempotency_key, status, expires_at)
                VALUES (?, 'pending', ?)
                """,
                (key, expires_at.isoformat()),
            )
            self._conn.commit()
            return True
        except sqlite3.IntegrityError:
            self._conn.rollback()
            return False

    def mark_completed(self, key: str, result_json: str) -> bool:
        """Update an idempotency record to completed status.

        Returns True if the row was found and updated (the operation succeeded).
        Returns False if no pending record existed (already completed or never created).
        """
        cursor = self._conn.execute(
            """
            UPDATE idempotency_store
            SET status = 'completed', result_json = ?
            WHERE idempotency_key = ? AND status = 'pending'
            """,
            (result_json, key),
        )
        self._conn.commit()
        return cursor.rowcount > 0

    def insert_or_retry_webhook(self, delivery: WebhookDelivery) -> int | None:
        """Insert a webhook delivery or retry an existing pending one.

        Uses ON CONFLICT DO UPDATE to atomically retry pending deliveries
        (incrementing attempt_count) rather than creating duplicates.

        Returns the new row ID if inserted, or existing row ID if updated.
        Returns None if the conflict was not a pending entry (e.g., already delivered).
        """
        cursor = self._conn.execute(
            """
            INSERT INTO webhook_deliveries
                (event_type, webhook_ref_id, target_url, payload_json, attempt_count)
            VALUES (?, ?, ?, ?, 1)
            ON CONFLICT(event_type, webhook_ref_id) DO UPDATE SET
                attempt_count = webhook_deliveries.attempt_count + 1,
                status = 'pending',
                created_at = CURRENT_TIMESTAMP
            WHERE excluded.status = 'pending' OR webhook_deliveries.status = 'pending'
            RETURNING id;
            """,
            (
                delivery.event_type,
                delivery.webhook_ref_id,
                delivery.target_url,
                str(delivery.payload),
            ),
        )
        self._conn.commit()
        return cursor.fetchone()[0]

    def cleanup_expired_records(self, cutoff: datetime) -> int:
        """Delete expired idempotency records and event consumer entries.

        Returns the number of rows deleted. Run periodically (e.g., via cron)
        to prevent unbounded growth of the deduplication store.
        """
        cursor = self._conn.execute(
            "DELETE FROM idempotency_store WHERE expires_at < ?",
            (cutoff.isoformat(),),
        )
        self._conn.commit()
        return cursor.rowcount
```

---

## Constraints

### MUST DO

1. **Always include the idempotency key in request headers** — Use a standard header like `Idempotency-Key` or `X-Idempotency-Key` so that load balancers and proxies can pass it through without special routing logic.
2. **Store the full response result alongside the idempotency key** — Returning cached results for retried requests ensures callers receive consistent responses even after network failures that prevent the original response from reaching them.
3. **Use database-level UNIQUE constraints as the final safety net** — Application-layer checks are fast but vulnerable to race conditions; only the database can guarantee atomic uniqueness under concurrent insertions from multiple service instances.
4. **Set explicit TTLs on idempotency records** — Expire records after 24 hours (or the maximum reasonable retry window) to prevent unbounded storage growth. Use a scheduled cleanup job that deletes expired entries in batches.
5. **Scope idempotency keys per tenant or context** — Always include a `tenant_id` or `user_id` component in the key computation to prevent cross-tenant deduplication collisions in multi-tenant systems.

### MUST NOT DO

1. **Never rely solely on application-layer deduplication without database constraints** — A missing UNIQUE constraint means concurrent requests can both pass the check-and-insert gate, defeating the entire idempotency mechanism.
2. **Never use random or non-deterministic keys** — Keys must be derived from request context (headers + body hash) so that genuine retries produce the same key. Random keys provide zero deduplication value.
3. **Never skip storing the result for completed operations** — If a client never received the original response (network timeout), it will retry and expect the same result. Without cached results, retried requests return no data.
4. **Never use idempotency keys for GET or read-only endpoints** — Idempotency key tracking adds latency and storage overhead. Read operations are naturally idempotent and do not require deduplication stores.
5. **Never allow a pending request to block indefinitely** — If a handler crashes mid-execution, the pending record must either time out (TTL) or be detectable by a cleanup process. Never leave stale "pending" records that permanently block legitimate retries.

---

## Output Template

When implementing idempotency for a system, produce output in this structure:

1. **Idempotency Inventory** — A table listing every external-facing endpoint and event consumer with columns: `path/handler`, `method/type`, `idempotency_required` (yes/no), `key_source` (header/body/computed), and `dedup_scope` (global/tenant/user).
2. **Key Schema Design** — Documentation of the idempotency key format, including the components hashed, the storage table schema (columns, types, constraints), and TTL policy.
3. **Implementation Code** — Typed Python implementations for: the middleware/guard class, the store interface and concrete implementation, the event consumer wrapper, and any optimistic concurrency helpers. Include docstrings on all public methods.
4. **Database Migration Scripts** — SQL DDL statements for creating the idempotency tables, UNIQUE constraints, and partial unique indexes, with rollback scripts included.
5. **Verification Test Suite** — Integration tests that verify: (a) duplicate requests return cached results, (b) concurrent duplicates are rejected or deduplicated, (c) expired keys allow new operations, and (d) optimistic concurrency conflicts are detected and retried correctly.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservice-resilience-patterns` | Circuit breakers, retries, bulkheads, and timeout management that complement idempotency in fault-tolerant microservices |
| `microservices-architecture` | Service decomposition, inter-service communication patterns, and API gateway design where idempotent endpoints are required |
| `event-driven-patterns` | Event sourcing, CQRS, saga orchestration, and outbox pattern — all of which depend on idempotent consumers for correctness |
| `database-design-modeling` | Normalization, indexing strategies, constraint design, and transaction isolation levels that support atomic deduplication at the data layer |
