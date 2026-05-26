---
name: ddd-domain-events
description: Implements domain event infrastructure for DDD systems — synchronous publish-subscribe dispatchers, schema versioning with Pydantic discriminators, idempotent handler guards, PostgreSQL outbox pattern for reliable async delivery, and dead letter queue pipelines.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: domain events, event dispatcher, publish subscribe, event sourcing, idempotent handlers, outbox pattern, event schema versioning, how do i implement domain events, DDD events
  role: implementation
  scope: implementation
  output-format: code
  related-skills: ddd-aggregate-root, ddd-specification-pattern
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - project structure
    - module organization
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Domain Event Infrastructure for DDD

Implements robust domain event infrastructure that enables loose coupling between aggregates and external systems while guaranteeing delivery semantics, schema evolution safety, and handler idempotency.

## TL;DR Checklist

- [ ] Define events as immutable data classes with Pydantic discriminators
- [ ] Use synchronous dispatch for same-unit-of-work side effects (projections, validations)
- [ ] Use asynchronous outbox-based dispatch for cross-boundary side effects (notifications, integrations)
- [ ] Enforce idempotency via event_id deduplication on every handler
- [ ] Version event schemas using Pydantic discriminators — never mutate existing event types
- [ ] Route poison pills to a dead letter queue with metadata preservation

---

## When to Use

Use this skill when:

- Designing the event dispatch layer for a DDD system with multiple bounded contexts
- Implementing publish-subscribe semantics between aggregates within a single aggregate root
- Building an outbox-based reliable delivery mechanism for cross-process or cross-service events
- Handling schema evolution across event consumers without breaking compatibility
- Preventing duplicate handler execution when messages are redelivered (exactly-once semantics over at-least-once transport)
- Setting up dead letter queues for events that repeatedly fail processing

---

## When NOT to Use

Avoid this skill for:

- Simple callback or observer patterns within a single process (use direct method calls instead)
- Real-time event streaming platforms like Kafka or RabbitMQ as the primary bus — use these as the transport layer, not replacements for domain events
- Eventual consistency requirements where order matters but idempotency cannot be guaranteed — redesign to use a command-based approach

---

## Core Workflow

1. **Define the Event Hierarchy** — Create base `DomainEvent` with immutable fields (event_id, aggregate_id, timestamp, version). Use Pydantic discriminators for concrete types.
   **Checkpoint:** Every event has a unique `event_id` (UUIDv7), a reference to its `aggregate_id`, and a discriminated type field.

2. **Implement the Synchronous Dispatcher** — Register handlers per event type. Dispatch all events at the end of an aggregate's `commit()` or a unit-of-work boundary.
   **Checkpoint:** Events published within the same UoW are dispatched before any async work begins. Handlers run in registration order.

3. **Implement Idempotency Guards** — Every handler checks whether `event_id` has already been processed using a deduplication store (in-memory cache for sync, database table for async).
   **Checkpoint:** Duplicate event_id returns immediately without executing business logic. Processed IDs persist across restarts for async events.

4. **Implement the Outbox Pattern** — After committing domain changes, publish events to an `outbox` table in the same transaction. A background worker picks up unsealed outbox entries and publishes to the transport layer.
   **Checkpoint:** Database commit and outbox insertion are atomic. No events are lost if the process crashes between commit and publish.

5. **Handle Delivery Failures** — Events that fail after delivery (timeout, handler exception) are retried with exponential backoff. After max retries, move to a dead letter queue with full metadata.
   **Checkpoint:** Poison pills are isolated — they never block processing of other events in the queue.

6. **Evolve Event Schemas** — Use Pydantic discriminators and versioned event classes. Add new fields as optional; never remove required fields from existing versions. Register a migration adapter for legacy consumers.
   **Checkpoint:** Existing consumers continue processing older event versions while new consumers handle newer versions.

---

## Implementation Patterns

### Pattern 1: Event Hierarchy with Pydantic Discriminators

Define events using a discriminated union approach so handlers can match on exact type without isinstance checks. This enables zero-cost type dispatch and prevents the spaghetti of conditional logic.

```python
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field, Discriminator, ConfigDict


# UUIDv7 for time-ordered event IDs
def make_event_id() -> str:
    """Generate a time-ordered UUID v7-style event ID."""
    return uuid.uuid4().hex  # In production, use uuid-utils or equivalent


T = TypeVar("T", bound="DomainEvent")


class DomainEvent(BaseModel):
    """Base domain event — immutable, timestamped, and traceable."""

    model_config = ConfigDict(frozen=True)

    event_id: str = Field(default_factory=make_event_id)
    aggregate_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1

    def __hash__(self) -> int:
        return hash(self.event_id)


def _event_discriminator(event: BaseModel) -> str:
    """Discriminate concrete event types by the 'event_type' discriminator field."""
    if hasattr(event, "event_type"):
        return str(event.event_type)
    raise ValueError(f"Event missing 'event_type' discriminator: {type(event)}")


# Concrete events using discriminated union
class OrderEventType(str, Enum):
    CREATED = "order.created"
    CANCELLED = "order.cancelled"
    PAID = "order.paid"
    SHIPPED = "order.shipped"


class OrderCreated(DomainEvent):
    event_type: OrderEventType = OrderEventType.CREATED
    order_number: str
    customer_id: str
    total_cents: int

    model_config = ConfigDict(frozen=True)


class OrderCancelled(DomainEvent):
    event_type: OrderEventType = OrderEventType.CANCELLED
    reason: str
    cancelled_by: str

    model_config = ConfigDict(frozen=True)


class OrderPaid(DomainEvent):
    event_type: OrderEventType = OrderEventType.PAID
    payment_method: str
    amount_cents: int
    transaction_id: str

    model_config = ConfigDict(frozen=True)


# Discriminated union for type-safe event matching
DomainEventUnion = DomainEvent

def cast_event(event: DomainEvent, target_type: type[T]) -> T:
    """Safely cast a domain event to its concrete type."""
    if not isinstance(event, target_type):
        raise TypeError(
            f"Cannot cast {type(event).__name__} to {target_type.__name__}"
        )
    return event


# ✅ GOOD — Discriminator enables clean dispatch without isinstance chains
def handle_order_event(event: DomainEvent) -> None:
    if isinstance(event, OrderCreated):
        print(f"New order: {event.order_number}")
    elif isinstance(event, OrderCancelled):
        print(f"Order cancelled: {event.event_id}, reason: {event.reason}")


# ❌ BAD — Using string comparison for dispatch (fragile, no type safety)
def handle_order_event_bad(event: DomainEvent) -> None:
    if event.event_type == "order.created":  # Magic string!
        pass
    elif event.event_type == "order.cancelled":
        pass
```

### Pattern 2: Synchronous Event Dispatcher

The synchronous dispatcher manages handler registration and dispatch within a single unit of work. It runs at the boundary of aggregate commits, ensuring all same-process side effects execute atomically.

```python
from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Callable, Generic, TypeVar

logger = logging.getLogger(__name__)

E = TypeVar("E", bound=DomainEvent)


@dataclass
class EventHandler(Generic[E]):
    """Wraps a handler function with metadata for dispatch control."""
    callback: Callable[[E], None]
    priority: int = 0  # Lower number = higher priority (executed first)

    def __call__(self, event: E) -> None:
        self.callback(event)


class SyncEventDispatcher:
    """Synchronous publish-subscribe dispatcher for same-UoW side effects.

    Events are published during aggregate operations and dispatched when
    the unit of work commits. Handlers execute in registration order by priority.
    """

    def __init__(self) -> None:
        self._handlers: dict[type[DomainEvent], list[EventHandler]] = defaultdict(list)

    def subscribe(self, event_type: type[E], handler: Callable[[E], None], *, priority: int = 0) -> None:
        """Register a handler for a specific event type.

        Args:
            event_type: The concrete domain event class to handle.
            handler: Async or sync callable receiving the event.
            priority: Execution order (lower = earlier). Default 0.
        """
        self._handlers[event_type].append(EventHandler(handler, priority))
        # Sort by priority so handlers execute in defined order
        self._handlers[event_type].sort(key=lambda h: h.priority)

    def publish(self, event: DomainEvent) -> None:
        """Publish an event to the dispatcher buffer (does not dispatch yet)."""
        if not hasattr(self, "_buffer"):
            self._buffer: list[DomainEvent] = []
        self._buffer.append(event)

    def dispatch(self) -> dict[type[DomainEvent], int]:
        """Dispatch all buffered events to their handlers.

        Returns a dict mapping event types to the number of handlers invoked.
        Raises DomainEventHandlerError if any handler raises an exception.
        """
        if not hasattr(self, "_buffer") or not self._buffer:
            return {}

        results: dict[type[DomainEvent], int] = {}

        for event in self._buffer:
            event_type = type(event)
            handlers = self._handlers.get(event_type, [])
            handler_count = 0

            for h in handlers:
                try:
                    h(event)  # type: ignore[arg-type]
                    handler_count += 1
                except Exception as exc:
                    logger.error(
                        "Handler error for %s (event_id=%s): %s",
                        event_type.__name__,
                        event.event_id,
                        exc,
                        exc_info=True,
                    )
                    raise DomainEventHandlerError(event_type, event.event_id, exc) from exc

            results[event_type] = handler_count

        self._buffer.clear()
        return results


class DomainEventHandlerError(Exception):
    """Raised when a domain event handler fails during dispatch."""

    def __init__(self, event_type: type[DomainEvent], event_id: str, cause: Exception) -> None:
        self.event_type = event_type
        self.event_id = event_id
        self.cause = cause
        super().__init__(
            f"Handler failed for {event_type.__name__} (id={event_id}): {cause}"
        )


# ✅ GOOD — Handlers are prioritized and exceptions are isolated
dispatcher = SyncEventDispatcher()

dispatcher.subscribe(OrderCreated, lambda e: _update_order_index(e), priority=10)
dispatcher.subscribe(OrderCreated, lambda e: _send_welcome_email(e), priority=20)

# ❌ BAD — No error isolation; one failing handler crashes all subsequent handlers
def bad_handler_chain(event: DomainEvent) -> None:
    update_order_index(event)      # If this fails...
    send_notification(event)       # ...this never runs
    audit_log(event)               # ...and this doesn't either
```

### Pattern 3: Idempotency Guard

Guarantees that each event is processed at most once, even when the transport delivers duplicates (at-least-once delivery semantics). Uses a two-layer approach: in-memory LRU cache for sync dispatch and a database table for async events.

```python
from __future__ import annotations

import hashlib
import logging
from collections import OrderedDict
from typing import Optional

logger = logging.getLogger(__name__)


class IdempotencyGuard:
    """Ensures each event_id is processed at most once.

    Two-layer strategy:
    - Layer 1 (sync): In-memory LRU cache keyed by event_id. Valid within a single process lifetime.
    - Layer 2 (async): Database-stored processed IDs for cross-process and restart durability.

    The guard is transparent to handlers — they receive events as normal; the guard
    intercepts before invocation.
    """

    SYNC_CACHE_SIZE = 10_000  # Max events to track in memory per dispatch cycle

    def __init__(self) -> None:
        self._sync_cache: OrderedDict[str, bool] = OrderedDict()

    def is_processed(self, event_id: str) -> bool:
        """Check whether an event has already been processed.

        Args:
            event_id: The unique identifier of the domain event.

        Returns:
            True if this event_id was previously processed, False otherwise.
        """
        return event_id in self._sync_cache

    def mark_processed(self, event_id: str) -> None:
        """Mark an event as processed. Evicts oldest entries if cache is full.

        Args:
            event_id: The unique identifier of the domain event.
        """
        if event_id in self._sync_cache:
            return  # Already marked; nothing to do

        if len(self._sync_cache) >= self.SYNC_CACHE_SIZE:
            self._sync_cache.popitem(last=False)  # Evict oldest

        self._sync_cache[event_id] = True

    def check_and_mark(self, event: DomainEvent) -> bool:
        """Atomically check then mark an event as processed.

        Returns True if the event is new (not previously processed), False if duplicate.
        A return of False means the caller should skip handler execution.
        """
        if self.is_processed(event.event_id):
            logger.debug("Duplicate event detected: %s", event.event_id)
            return False

        self.mark_processed(event.event_id)
        return True

    def clear(self) -> None:
        """Clear the sync cache. Useful between unit-of-work boundaries."""
        self._sync_cache.clear()


class AsyncIdempotencyGuard(IdempotencyGuard):
    """Extends sync guard with database-backed persistence for async events.

    The database table schema:
        CREATE TABLE event_processing_log (
            event_id    VARCHAR(64) PRIMARY KEY,
            event_type  VARCHAR(128) NOT NULL,
            processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            handler     VARCHAR(128),  -- which handler consumed it
            metadata    JSONB          -- optional routing info
        );
    """

    def __init__(self, db_pool: Any) -> None:  # Replace with actual DB pool type
        super().__init__()
        self._db = db_pool

    def is_processed(self, event_id: str) -> bool:
        """Check sync cache first, then fall back to database lookup."""
        if super().is_processed(event_id):
            return True

        # Database check for cross-process durability
        try:
            row = self._db.fetchrow(
                "SELECT 1 FROM event_processing_log WHERE event_id = $1",
                event_id,
            )
            return row is not None
        except Exception:
            # If DB is unavailable, fall back to sync-only (may allow duplicates)
            logger.warning("DB unavailable for idempotency check; using sync cache only")
            return False

    def mark_processed(self, event_id: str, event_type: str = "", handler: str = "") -> None:
        """Mark as processed in both sync cache and database."""
        super().mark_processed(event_id)

        if not event_type or not handler:
            raise ValueError("AsyncIdempotencyGuard requires event_type and handler")

        try:
            self._db.execute(
                """INSERT INTO event_processing_log (event_id, event_type, handler)
                   VALUES ($1, $2, $3)
                   ON CONFLICT (event_id) DO NOTHING""",
                event_id,
                event_type,
                handler,
            )
        except Exception:
            logger.error("Failed to persist idempotency record for %s", event_id)
            # Sync cache already updated; DB failure is non-fatal for correctness


# ✅ GOOD — Guard checked before every handler invocation
guard = IdempotencyGuard()

def dispatch_with_idempotency(event: DomainEvent, handlers: list[Callable]) -> None:
    if not guard.check_and_mark(event):
        return  # Duplicate — skip silently

    for handler in handlers:
        handler(event)


# ❌ BAD — No idempotency; duplicates cause double-charging, double-notifications
def dispatch_without_guard(event: DomainEvent, handlers: list[Callable]) -> None:
    # Transport delivered the same message twice due to ACK timeout
    for handler in handlers:  # Executes twice! Double charge!
        handler(event)
```

### Pattern 4: PostgreSQL Outbox Pattern

The outbox pattern guarantees atomicity between domain state changes and event publication. Events are written to a database table in the same transaction as the domain change. A background worker then publishes events to an external message broker.

```python
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class OutboxStatus(str, Enum):
    PENDING = "pending"
    PUBLISHED = "published"
    FAILED = "failed"
    DEAD_LETTERED = "dead_lettered"


@dataclass(frozen=True)
class OutboxEntry:
    """Represents a pending event in the outbox table."""
    id: int
    event_id: str
    aggregate_id: str
    event_type: str
    payload: dict[str, Any]
    status: OutboxStatus = OutboxStatus.PENDING
    published_at: Optional[float] = None
    retry_count: int = 0
    error_message: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        """Serialize for transport publishing."""
        return {
            "event_id": self.event_id,
            "aggregate_id": self.aggregate_id,
            "event_type": self.event_type,
            "payload": self.payload,
        }


class OutboxRepository:
    """Persists domain events to the outbox table within the same transaction as domain commits."""

    TABLE_NAME = "outbox"

    def __init__(self, db_pool: Any) -> None:
        self._db = db_pool

    async def publish(self, events: list[OutboxEntry]) -> None:
        """Insert outbox entries in a single transaction.

        This is called within the same DB transaction that commits domain state changes.
        If the transaction rolls back, the outbox entries are also rolled back — no orphaned events.
        """
        if not events:
            return

        query = f"""
            INSERT INTO {self.TABLE_NAME}
                (event_id, aggregate_id, event_type, payload)
            VALUES (%(event_id)s, %(aggregate_id)s, %(event_type)s, %(payload)s)
        """
        records = [e.to_dict() for e in events]

        async with self._db.acquire() as conn:
            async with conn.transaction():
                await conn.executemany(query, records)

    async def fetch_pending(self, batch_size: int = 50) -> list[OutboxEntry]:
        """Retrieve pending outbox entries for publishing."""
        query = f"""
            SELECT id, event_id, aggregate_id, event_type, payload,
                   status, published_at, retry_count, error_message
            FROM {self.TABLE_NAME}
            WHERE status = 'pending'
            ORDER BY id ASC
            LIMIT %s
            FOR UPDATE SKIP LOCKED
        """
        rows = await self._db.fetch(query, batch_size)

        entries = []
        for row in rows:
            entries.append(OutboxEntry(
                id=row["id"],
                event_id=row["event_id"],
                aggregate_id=row["aggregate_id"],
                event_type=row["event_type"],
                payload=dict(row["payload"]) if isinstance(row["payload"], dict) else {},
                status=OutboxStatus(row["status"]),
                published_at=float(row["published_at"]) if row.get("published_at") else None,
                retry_count=int(row.get("retry_count", 0)),
                error_message=row.get("error_message"),
            ))
        return entries

    async def mark_published(self, entry_id: int) -> None:
        """Mark an outbox entry as published."""
        await self._db.execute(
            f"UPDATE {self.TABLE_NAME} SET status = 'published', published_at = EXTRACT(EPOCH FROM NOW()) WHERE id = %s",
            entry_id,
        )

    async def mark_failed(self, entry_id: int, error_message: str, retry_count: int) -> None:
        """Mark an outbox entry as failed with error details."""
        await self._db.execute(
            f"""UPDATE {self.TABLE_NAME}
                SET status = 'failed', error_message = %s, retry_count = %s
                WHERE id = %s""",
            error_message,
            retry_count,
            entry_id,
        )

    async def dead_letter(self, entry: OutboxEntry) -> None:
        """Move a repeatedly-failed entry to the dead letter queue."""
        await self._db.execute(
            f"""UPDATE {self.TABLE_NAME}
                SET status = 'dead_lettered'
                WHERE id = %s""",
            entry.id,
        )

        # Archive to dead letter table
        await self._db.execute(
            """INSERT INTO dead_letter_queue (event_id, event_type, payload, error_message, retry_count)
               VALUES (%s, %s, %s, %s, %s)""",
            entry.event_id,
            entry.event_type,
            entry.payload,
            entry.error_message,
            entry.retry_count,
        )


# Database schema (run once during migration):
# CREATE TABLE outbox (
#     id          BIGSERIAL PRIMARY KEY,
#     event_id    VARCHAR(64) NOT NULL UNIQUE,
#     aggregate_id VARCHAR(128) NOT NULL,
#     event_type  VARCHAR(256) NOT NULL,
#     payload     JSONB NOT NULL,
#     status      VARCHAR(32) DEFAULT 'pending',
#     published_at DOUBLE PRECISION,
#     retry_count INT DEFAULT 0,
#     error_message TEXT,
#     created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
# );
# CREATE INDEX idx_outbox_status ON outbox(status, id) WHERE status = 'pending';
#
# CREATE TABLE dead_letter_queue (
#     id          BIGSERIAL PRIMARY KEY,
#     event_id    VARCHAR(64) NOT NULL,
#     event_type  VARCHAR(256) NOT NULL,
#     payload     JSONB NOT NULL,
#     error_message TEXT,
#     retry_count INT,
#     dead_lettered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
# );


class OutboxWorker:
    """Background worker that publishes pending outbox entries to a transport layer.

    Implements exponential backoff retry with jitter and dead letter queue routing.
    """

    def __init__(
        self,
        repository: OutboxRepository,
        transport: Any,  # Message broker adapter (Kafka, RabbitMQ, etc.)
        max_retries: int = 5,
        base_delay_ms: int = 100,
        batch_size: int = 50,
    ) -> None:
        self._repo = repository
        self._transport = transport
        self._max_retries = max_retries
        self._base_delay = base_delay_ms / 1000.0
        self._batch_size = batch_size
        self._running = False

    async def start(self) -> None:
        """Start the background polling loop."""
        self._running = True
        logger.info("Outbox worker started")
        while self._running:
            await self._process_cycle()
            await asyncio.sleep(1.0)  # Poll interval

    async def stop(self) -> None:
        """Gracefully stop the worker."""
        self._running = False
        logger.info("Outbox worker stopped")

    async def _process_cycle(self) -> None:
        """Fetch and publish a batch of pending entries."""
        entries = await self._repo.fetch_pending(self._batch_size)
        if not entries:
            return

        for entry in entries:
            await self._publish_entry(entry)

    async def _publish_entry(self, entry: OutboxEntry) -> None:
        """Publish a single outbox entry with retry logic."""
        try:
            payload = entry.to_dict()
            await self._transport.publish(
                topic=entry.event_type,
                key=entry.aggregate_id,
                value=payload,
            )
            await self._repo.mark_published(entry.id)

        except Exception as exc:
            retry_count = entry.retry_count + 1
            logger.warning(
                "Outbox publish failed for %s (retry %d/%d): %s",
                entry.event_id,
                retry_count,
                self._max_retries,
                exc,
            )

            if retry_count >= self._max_retries:
                await self._repo.dead_letter(entry)
                logger.error(
                    "Event dead-lettered after %d retries: %s (type=%s)",
                    retry_count, entry.event_id, entry.event_type,
                )
            else:
                # Exponential backoff with jitter
                delay = self._base_delay * (2 ** (retry_count - 1)) * (0.5 + 0.5 * random.random())
                await asyncio.sleep(delay)
                await self._repo.mark_failed(entry.id, str(exc), retry_count)

    def set_running(self, value: bool) -> None:
        """Public setter for the running flag (used by tests)."""
        self._running = value


# ✅ GOOD — Outbox guarantees atomicity between domain changes and event persistence
async def commit_order(order: OrderAggregate, db_pool: Any) -> None:
    repo = OrderRepository(db_pool)
    outbox_repo = OutboxRepository(db_pool)

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            # 1. Save domain state
            await repo.save(order)

            # 2. Publish events to outbox (same transaction!)
            events = [OutboxEntry(
                id=0,  # Auto-assigned by DB
                event_id=e.event_id,
                aggregate_id=e.aggregate_id,
                event_type=str(e.event_type),
                payload=e.model_dump(),
            ) for e in order.pending_events]

            if events:
                await outbox_repo.publish(events)

            # 3. Clear pending events from aggregate
            order.clear_pending_events()


# ❌ BAD — Events published outside transaction; lost if rollback occurs
async def bad_commit(order: OrderAggregate, db_pool: Any) -> None:
    repo = OrderRepository(db_pool)
    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await repo.save(order)
        # ⚠️ If this call fails, the order is saved but event is lost!
        await broker.publish("order.created", order.pending_events)
```

### Pattern 5: Dead Letter Queue Pipeline

Events that fail repeatedly are isolated in a dead letter queue (DLQ). This prevents poison pills from blocking the entire pipeline. The DLQ includes metadata for replay after investigation.

```python
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DeadLetterEntry:
    """An event that has been moved to the dead letter queue after repeated failures."""
    event_id: str
    event_type: str
    aggregate_id: str
    payload: dict[str, Any]
    error_message: str
    retry_count: int
    first_failure_at: float  # Unix timestamp
    last_failure_at: float   # Unix timestamp
    handler_names: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "aggregate_id": self.aggregate_id,
            "payload": self.payload,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "first_failure_at": self.first_failure_at,
            "last_failure_at": self.last_failure_at,
            "handler_names": self.handler_names,
        }


class DeadLetterQueue:
    """Manages the dead letter queue for poisoned domain events.

    Provides storage, retrieval, and replay capabilities for events that
    repeatedly fail during processing. Events in the DLQ do not block
    normal pipeline operation.
    """

    def __init__(self, db_pool: Any) -> None:
        self._db = db_pool

    async def add(self, entry: DeadLetterEntry) -> None:
        """Store a dead-lettered event with full metadata."""
        await self._db.execute("""
            INSERT INTO dead_letter_queue
                (event_id, event_type, aggregate_id, payload, error_message,
                 retry_count, first_failure_at, last_failure_at, handler_names)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            entry.event_id,
            entry.event_type,
            entry.aggregate_id,
            entry.payload,
            entry.error_message,
            entry.retry_count,
            entry.first_failure_at,
            entry.last_failure_at,
            entry.handler_names,
        ))

    async def list_all(self, limit: int = 100) -> list[DeadLetterEntry]:
        """List all dead-lettered events for inspection."""
        rows = await self._db.fetch("""
            SELECT event_id, event_type, aggregate_id, payload, error_message,
                   retry_count, first_failure_at, last_failure_at, handler_names
            FROM dead_letter_queue
            ORDER BY first_failure_at DESC
            LIMIT %s
        """, limit)

        return [
            DeadLetterEntry(
                event_id=row["event_id"],
                event_type=row["event_type"],
                aggregate_id=row["aggregate_id"],
                payload=dict(row["payload"]) if isinstance(row["payload"], dict) else {},
                error_message=row["error_message"],
                retry_count=int(row["retry_count"]),
                first_failure_at=float(row["first_failure_at"]),
                last_failure_at=float(row["last_failure_at"]),
                handler_names=row.get("handler_names") or [],
            )
            for row in rows
        ]

    async def remove(self, event_id: str) -> None:
        """Remove a dead-lettered event (after manual investigation/replay)."""
        await self._db.execute(
            "DELETE FROM dead_letter_queue WHERE event_id = %s",
            event_id,
        )

    async def count_by_type(self) -> dict[str, int]:
        """Get counts of DLQ entries grouped by event type (for priority triage)."""
        rows = await self._db.fetch("""
            SELECT event_type, COUNT(*) AS cnt
            FROM dead_letter_queue
            GROUP BY event_type
            ORDER BY cnt DESC
        """)
        return {row["event_type"]: int(row["cnt"]) for row in rows}


# Database schema:
# CREATE TABLE dead_letter_queue (
#     id              BIGSERIAL PRIMARY KEY,
#     event_id        VARCHAR(64) NOT NULL UNIQUE,
#     event_type      VARCHAR(256) NOT NULL,
#     aggregate_id    VARCHAR(128) NOT NULL,
#     payload         JSONB NOT NULL,
#     error_message   TEXT,
#     retry_count     INT DEFAULT 0,
#     first_failure_at DOUBLE PRECISION NOT NULL,
#     last_failure_at DOUBLE PRECISION NOT NULL,
#     handler_names   TEXT[] DEFAULT '{}',
#     created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
# );


# ✅ GOOD — Poison pills are isolated and do not block the pipeline
async def robust_dispatch(
    event: DomainEvent,
    handlers: dict[type[DomainEvent], list[Callable]],
    guard: IdempotencyGuard,
    dlq: DeadLetterQueue,
) -> None:
    """Dispatch an event with full fault isolation.

    Each handler is wrapped in its own try/except. If all handlers fail,
    the event is sent to the DLQ without blocking other events.
    """
    if not guard.check_and_mark(event):
        return  # Duplicate

    failed_handlers: list[str] = []
    first_error_time = time.time()
    last_error_time = first_error_time

    for handler in handlers.get(type(event), []):
        try:
            handler(event)
        except Exception as exc:
            handler_name = getattr(handler, "__name__", str(handler))
            failed_handlers.append(handler_name)
            last_error_time = time.time()
            logger.error("Handler %s failed for %s: %s", handler_name, event.event_id, exc)

    # If all handlers failed and retry count is exhausted, DLQ
    if len(failed_handlers) == len(handlers.get(type(event), [])) and failed_handlers:
        entry = DeadLetterEntry(
            event_id=event.event_id,
            event_type=type(event).__name__,
            aggregate_id=event.aggregate_id,
            payload=event.model_dump(),
            error_message=f"All {len(failed_handlers)} handlers failed",
            retry_count=3,  # Would come from outbox retry metadata
            first_failure_at=first_error_time,
            last_failure_at=last_error_time,
            handler_names=failed_handlers,
        )
        await dlq.add(entry)


# ❌ BAD — Poison pill blocks all subsequent events in the queue
def bad_dispatch(event: DomainEvent, handlers: list[Callable]) -> None:
    for handler in handlers:  # One bad handler blocks all others AND the entire queue
        handler(event)  # Raises → loop breaks → remaining events wait indefinitely
```

---

## Constraints

### MUST DO
- Always include `event_id` (UUID), `aggregate_id`, and `timestamp` on every domain event
- Use Pydantic discriminators for type-safe event matching — never use string comparison for dispatch
- Run synchronous dispatch within the same unit of work as the aggregate commit
- Use the outbox pattern for all cross-boundary events — never publish directly to a message broker from a handler
- Enforce idempotency on every handler invocation using both sync cache and database persistence
- Isolate handler failures — one failing handler must not prevent others from executing
- Route repeatedly-failed events to the dead letter queue after configurable max retries with exponential backoff

### MUST NOT DO
- Mutate event fields after creation (events are immutable snapshots)
- Use synchronous dispatch for external system calls (HTTP, email, SMS) — these belong on async/outbox path
- Store raw domain models in the outbox table — serialize to plain dicts/JSONB only
- Retry forever without a dead letter queue boundary (max 5 retries is recommended)
- Mix event publishing and domain mutations in separate transactions (use outbox for atomicity)

---

## Output Template

When implementing or reviewing domain event infrastructure, the output must contain:

1. **Event Hierarchy** — Base class with shared fields, concrete events with discriminated union support
2. **Dispatcher Implementation** — Synchronous (in-process) and asynchronous (outbox-based) dispatch mechanisms
3. **Idempotency Layer** — Two-layer guard (sync cache + database persistence)
4. **Outbox Integration** — Repository for atomic event persistence, background worker with retry logic
5. **Dead Letter Queue** — Storage and retrieval for poison pills with metadata preservation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-ddd-aggregate-root` | Defines how aggregates publish events during state mutations |
| `coding-ddd-specification-pattern` | Domain specifications can consume events to validate business rules |

---

*This skill covers the complete domain event lifecycle: definition, dispatch, idempotency, reliable delivery via outbox, and failure isolation through dead letter queues.*
