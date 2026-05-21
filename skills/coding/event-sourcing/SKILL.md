---
name: event-sourcing
description: Persists application state as an append-only immutable event log, enabling full state reconstruction, audit trails, temporal queries, and snapshot-based performance optimization for complex domain models.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: event sourcing, event store, aggregate, snapshots, optimistic concurrency, event versioning, projections, read models, replay events, domain events, event streams
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont]
  related-skills: cqrs-pattern, saga-pattern, idempotency-patterns
---

# Event Sourcing

Persists state as an append-only immutable event log, enabling full historical reconstruction, audit trails, and temporal queries. Uses snapshots for performance optimization, optimistic concurrency control via version columns, and projections to materialize read models from event streams.

## TL;DR Checklist

- [ ] Define all state changes as immutable domain events with UUIDv7 IDs
- [ ] Use PostgreSQL JSONB-backed event store with time-based partitioning
- [ ] Implement optimistic concurrency using aggregate version columns + advisory locks
- [ ] Create snapshots every ~20 events or 24 hours (hybrid strategy) to avoid replaying millions of events
- [ ] Build projections as incremental checkpoint-based consumers from the event stream
- [ ] Version all events with additive-only migration rules — never modify existing events
- [ ] Set up monitoring for projection lag and conflict rate metrics

## When to Use

Use this skill when:

- You need a complete audit trail of all state changes (financial systems, compliance)
- The domain model has complex business logic with many possible state transitions
- Temporal queries are needed ("what was the order status at time T?")
- Read/write data access patterns differ significantly (pairs naturally with CQRS)
- Multiple downstream systems need to react to state changes

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with fewer than 5 entity types and simple state machines
- Systems with no audit trail or regulatory requirement for event history
- Teams without distributed systems experience (adds significant complexity)
- High-write, high-read systems where replay latency is unacceptable (use snapshots aggressively)

## Core Workflow

1. **Design Domain Events** — For every meaningful state change, create a frozen dataclass event with UUIDv7 ID, aggregate type/id, event type string, version number (for schema evolution), and timestamp. Group related changes into single events rather than creating one event per field.
   **Checkpoint:** Each event must be immutable (use `frozen=True` in dataclass), serializable to JSONB, and include a clear business meaning (not an implementation detail).

2. **Implement the Event Store** — Create a PostgreSQL-backed event store using JSONB columns for payloads, time-range partitioning by `occurred_at`, and optimistic concurrency via aggregate version checks with advisory transaction locks (`pg_advisory_xact_lock`).
   **Checkpoint:** The append operation must check `expected_version == current_version` before writing and raise `ConflictError` on mismatch. Use partial indexes on `published_at IS NULL` for outbox queries.

3. **Build the Aggregate Root** — Create aggregate classes that hold domain state, accept commands, validate invariants, record new events (without immediately persisting), and provide an `apply_event(event)` method to replay events during reconstruction.
   **Checkpoint:** The aggregate must never write directly to the event store — it only records events for the UnitOfWork to commit.

4. **Configure Snapshot Strategy** — Implement a hybrid snapshot strategy: snapshot when either (a) event count since last snapshot exceeds 20, or (b) 24 hours have passed since the last snapshot. Store snapshots in a dedicated `aggregate_snapshots` table with version tracking.
   **Checkpoint:** Loading an aggregate must first load the latest snapshot, then replay only delta events from the snapshot version onward.

5. **Build Projections** — Implement event handlers that consume streams of domain events and materialize read models into optimized stores (denormalized tables, search indexes, caches). Use checkpoint persistence to resume from the last processed position after restarts.
   **Checkpoint:** Every projection handler must be idempotent — re-processing the same event must produce the same result without side effects.

6. **Handle Event Versioning** — When event schemas change, create new `_v2`, `_v3` variants rather than modifying existing events. Implement a deserialization router that maps event_type strings to the appropriate handler. Plan for additive-only changes and projection rebuilds during migrations.
   **Checkpoint:** All projections must handle both old and new event versions gracefully during migration windows.

## Implementation Patterns

### Pattern 1: Domain Event Definition and Aggregate Root

```python
from dataclasses import dataclass, field
from typing import Generic, TypeVar, List, Any, Callable
from uuid import UUID, uuid7
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum


T = TypeVar("T")


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events — immutable and serializable.

    Every event carries metadata (UUIDv7 ID, aggregate identity, timestamp)
    alongside its specific payload. Events are frozen dataclasses so they
    cannot be mutated after creation, preserving historical integrity.
    """
    event_id: UUID = field(default_factory=uuid7.uuid7)
    aggregate_type: str = ""
    aggregate_id: UUID = field(default_factory=uuid7.uuid7)
    event_type: str = ""
    version: int = 1  # Event schema version (not aggregate version)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        """Serialize event to dictionary for JSONB storage."""
        return {
            "event_id": str(self.event_id),
            "aggregate_type": self.aggregate_type,
            "aggregate_id": str(self.aggregate_id),
            "event_type": self.event_type,
            "version": self.version,
            "occurred_at": self.occurred_at.isoformat(),
        }


# ---- Concrete domain events ----

@dataclass(frozen=True)
class OrderPlaced(DomainEvent):
    event_type: str = "order_placed"
    customer_id: UUID
    items: List[dict]  # [{product_id, quantity, unit_price}]
    total: Decimal
    currency: str = "USD"


@dataclass(frozen=True)
class PaymentAuthorized(DomainEvent):
    event_type: str = "payment_authorized"
    order_id: UUID
    payment_method_id: UUID
    amount: Decimal


@dataclass(frozen=True)
class InventoryReserved(DomainEvent):
    event_type: str = "inventory_reserved"
    order_id: UUID
    reservation_id: UUID
    items: List[dict]


@dataclass(frozen=True)
class OrderConfirmed(DomainEvent):
    event_type: str = "order_confirmed"
    order_id: UUID
    payment_auth_id: UUID


@dataclass(frozen=True)
class OrderCancelled(DomainEvent):
    event_type: str = "order_cancelled"
    order_id: UUID
    reason: str


class OrderStatus(Enum):
    PLACED = "placed"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    SHIPPED = "shipped"
    DELIVERED = "delivered"


class ConflictError(Exception):
    """Raised when optimistic concurrency check fails."""
    def __init__(self, message: str, expected_version: int, current_version: int):
        super().__init__(message)
        self.expected_version = expected_version
        self.current_version = current_version


class AggregateRoot:
    """Base class for event-sourced aggregates.

    Aggregates accept commands (via subclasses), validate invariants,
    and record domain events without persisting them directly. Events are
    applied immediately to state via `_apply_*` methods, and persisted
    by an external UnitOfWork.
    """

    def __init__(self):
        self._version: int = 0
        self._pending_events: List[DomainEvent] = []
        self._applied = False

    @property
    def version(self) -> int:
        return self._version

    @property
    def is_new(self) -> bool:
        return self._version == 0

    @property
    def uncommitted_events(self) -> List[DomainEvent]:
        """Return events that have not yet been persisted."""
        return list(self._pending_events)

    def record_event(self, event: DomainEvent) -> None:
        """Record a domain event for later persistence. Event is applied to state immediately."""
        self._pending_events.append(event)
        self._version += 1
        self.apply_event(event)

    def apply_event(self, event: DomainEvent) -> None:
        """Apply an event to reconstruct or update aggregate state. Override in subclasses."""
        method_name = f"_apply_{event.event_type}"
        handler = getattr(self, method_name, None)
        if handler:
            handler(event)

    def clear_pending_events(self) -> None:
        """Clear pending events after successful persistence."""
        self._pending_events.clear()


class OrderAggregate(AggregateRoot):
    """
    Event-sourced aggregate for the Order domain.

    State is derived exclusively from replaying events via _apply_* handlers.
    Commands validate business rules before recording new events.

    Valid state transitions:
        NEW → PLACED → CONFIRMED → SHIPPED → DELIVERED
                     ↓
                   CANCELLED
    """

    def __init__(self):
        super().__init__()
        self.id: UUID = uuid7.uuid7()
        self.status: OrderStatus = OrderStatus.PLACED
        self.customer_id: UUID | None = None
        self.items: List[dict] = []
        self.total: Decimal = Decimal("0.00")
        self.currency: str = "USD"
        self.payment_auth_id: UUID | None = None
        self.cancellation_reason: str | None = None

    # ---- Command handlers (validate business rules) ----

    def place_order(
        self,
        customer_id: UUID,
        items: List[dict],
        currency: str = "USD",
    ) -> None:
        """Place a new order. Fails if order already exists."""
        if not self.is_new:
            raise ValueError("Cannot place an order on an existing aggregate")

        if not items:
            raise ValueError("Order must contain at least one item")

        total = sum(Decimal(str(item["unit_price"])) * item["quantity"] for item in items)

        event = OrderPlaced(
            aggregate_type="Order",
            aggregate_id=self.id,
            customer_id=customer_id,
            items=items,
            total=total,
            currency=currency,
        )
        self.record_event(event)

    def authorize_payment(self, payment_method_id: UUID, amount: Decimal) -> None:
        """Authorize payment for a placed order."""
        if self.status != OrderStatus.PLACED:
            raise ValueError(f"Cannot authorize payment for order in {self.status.value} state")

        event = PaymentAuthorized(
            aggregate_type="Order",
            aggregate_id=self.id,
            payment_method_id=payment_method_id,
            amount=amount,
        )
        self.record_event(event)

    def confirm_order(self) -> None:
        """Confirm order after payment authorization."""
        if self.status != OrderStatus.PLACED or not self.payment_auth_id:
            raise ValueError("Can only confirm orders with authorized payment")

        event = OrderConfirmed(
            aggregate_type="Order",
            aggregate_id=self.id,
            payment_auth_id=self.payment_auth_id,
        )
        self.record_event(event)

    def cancel_order(self, reason: str) -> None:
        """Cancel an order (only if not yet confirmed)."""
        if self.status == OrderStatus.CONFIRMED:
            raise ValueError("Cannot cancel a confirmed order — initiate refund instead")

        event = OrderCancelled(
            aggregate_type="Order",
            aggregate_id=self.id,
            reason=reason,
        )
        self.record_event(event)

    # ---- Event replay handlers (apply state changes from events) ----

    def _apply_order_placed(self, event: OrderPlaced) -> None:
        self.customer_id = event.customer_id
        self.items = event.items
        self.total = event.total
        self.currency = event.currency
        self.status = OrderStatus.PLACED

    def _apply_payment_authorized(self, event: PaymentAuthorized) -> None:
        self.payment_auth_id = event.payment_method_id

    def _apply_order_confirmed(self, event: OrderConfirmed) -> None:
        self.status = OrderStatus.CONFIRMED
        self.payment_auth_id = event.payment_auth_id

    def _apply_order_cancelled(self, event: OrderCancelled) -> None:
        self.status = OrderStatus.CANCELLED
        self.cancellation_reason = event.reason
```

### Pattern 2: PostgreSQL Event Store with Optimistic Concurrency

```python
import json
from dataclasses import dataclass
from typing import List, Optional
from uuid import UUID, uuid7


@dataclass
class StoredEvent:
    """Deserialized event from the event store."""
    id: UUID
    aggregate_id: UUID
    aggregate_type: str
    event_type: str
    version: int
    payload: dict
    occurred_at: datetime


class EventStore:
    """
    PostgreSQL-backed event store with optimistic concurrency control.

    Uses advisory transaction locks to prevent race conditions and
    version columns for optimistic concurrency checking.
    Supports snapshot loading and delta event replay.

    Table schema:
        CREATE TABLE event_store (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            aggregate_id UUID NOT NULL,
            aggregate_type VARCHAR(100) NOT NULL,
            event_type VARCHAR(200) NOT NULL,
            version INTEGER NOT NULL,
            payload JSONB NOT NULL,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        ) PARTITION BY RANGE (occurred_at);

    Index: ix_event_agg_ver ON event_store (aggregate_id, version)
    """

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS event_store (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        aggregate_id UUID NOT NULL,
        aggregate_type VARCHAR(100) NOT NULL,
        event_type VARCHAR(200) NOT NULL,
        version INTEGER NOT NULL,
        payload JSONB NOT NULL,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    ) PARTITION BY RANGE (occurred_at);

    CREATE INDEX IF NOT EXISTS ix_event_agg_ver
        ON event_store (aggregate_id, version);
    """

    def __init__(self, pool):
        self._pool = pool

    async def append(
        self,
        aggregate_id: UUID,
        aggregate_type: str,
        expected_version: int,
        events: List[DomainEvent],
    ) -> int:
        """
        Append events to the store with optimistic concurrency control.

        Args:
            aggregate_id: The aggregate this event belongs to
            aggregate_type: Type name for filtering (e.g., "Order")
            expected_version: Current version — must match, otherwise ConflictError
            events: List of domain events to persist

        Returns:
            The new aggregate version after appending

        Raises:
            ConflictError: When current version != expected_version
        """
        if not events:
            return expected_version

        lock_key = int.from_bytes(bytes(aggregate_id)[:8], "big")

        async with self._pool.acquire() as conn:
            # Acquire advisory transaction lock (auto-released on commit/rollback)
            await conn.execute(f"SELECT pg_advisory_xact_lock({lock_key})")

            # Check current version
            result = await conn.fetchval(
                "SELECT COALESCE(MAX(version), 0) FROM event_store WHERE aggregate_id = $1",
                aggregate_id,
            )
            current_version = result or 0

            if current_version != expected_version:
                raise ConflictError(
                    f"Version conflict: expected {expected_version}, got {current_version}. "
                    "The aggregate has been modified concurrently.",
                    expected_version,
                    current_version,
                )

            # Append all events with sequential versions
            new_version = expected_version + len(events)
            rows = [
                {
                    "aggregate_id": aggregate_id,
                    "aggregate_type": aggregate_type,
                    "event_type": evt.event_type,
                    "version": expected_version + i + 1,
                    "payload": json.dumps(evt.to_dict()),
                    "occurred_at": evt.occurred_at,
                }
                for i, evt in enumerate(events)
            ]

            await conn.executemany(
                """INSERT INTO event_store
                   (id, aggregate_id, aggregate_type, event_type, version, payload, occurred_at)
                   VALUES ($1, $2, $3, $4, $5, $6, $7)""",
                [
                    (
                        str(uuid7.uuid7()),
                        r["aggregate_id"],
                        r["aggregate_type"],
                        r["event_type"],
                        r["version"],
                        r["payload"],
                        r["occurred_at"],
                    )
                    for r in rows
                ],
            )

            return new_version

    async def load(
        self,
        aggregate_id: UUID,
        from_version: int = 0,
    ) -> List[StoredEvent]:
        """Load events for an aggregate, optionally starting from a specific version."""
        rows = await self._pool.fetch(
            """SELECT event_type, payload, version, occurred_at
               FROM event_store
               WHERE aggregate_id = $1 AND version > $2
               ORDER BY version""",
            aggregate_id,
            from_version,
        )

        return [
            StoredEvent(
                id=uuid7.uuid7(),  # Generated during append
                aggregate_id=aggregate_id,
                event_type=row["event_type"],
                version=row["version"],
                payload=json.loads(row["payload"]),
                occurred_at=row["occurred_at"],
            )
            for row in rows
        ]

    async def get_latest_version(self, aggregate_id: UUID) -> int:
        """Get the latest event version for an aggregate."""
        result = await self._pool.fetchval(
            "SELECT COALESCE(MAX(version), 0) FROM event_store WHERE aggregate_id = $1",
            aggregate_id,
        )
        return result or 0

    async def stream_events(
        self,
        event_type: str | None = None,
        from_version: int = 0,
    ):
        """Stream all events (optionally filtered by type) for projection consumption."""
        query = "SELECT id, aggregate_id, aggregate_type, event_type, version, payload, occurred_at FROM event_store WHERE version > $1"
        params: list = [from_version]

        if event_type:
            query += " AND event_type = $2"
            params.append(event_type)

        query += " ORDER BY version"

        async with self._pool.acquire() as conn:
            async for row in conn.cursor(query, *params):  # type: ignore[arg-type]
                yield StoredEvent(
                    id=UUID(row["id"]),
                    aggregate_id=UUID(row["aggregate_id"]),
                    aggregate_type=row["aggregate_type"],
                    event_type=row["event_type"],
                    version=row["version"],
                    payload=json.loads(row["payload"]),
                    occurred_at=row["occurred_at"],
                )
```

### Pattern 3: Snapshot Strategy and Projection System

```python
from typing import Protocol, runtime_checkable
import asyncio


class SnapshotStore:
    """
    Stores aggregate snapshots for fast state reconstruction.

    Hybrid strategy: snapshot when event count >= SNAPSHOT_THRESHOLD (20)
    or hours since last snapshot >= SNAPSHOT_HOURS (24).
    """

    SNAPSHOT_THRESHOLD = 20
    SNAPSHOT_HOURS = 24

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS aggregate_snapshots (
        aggregate_id UUID PRIMARY KEY,
        aggregate_type VARCHAR(100) NOT NULL,
        version INTEGER NOT NULL,
        state JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """

    def __init__(self, pool):
        self._pool = pool

    async def save(self, aggregate_id: UUID, aggregate_type: str, version: int, state: dict) -> None:
        """Save a snapshot of the aggregate state."""
        await self._pool.execute(
            """INSERT INTO aggregate_snapshots
               (aggregate_id, aggregate_type, version, state, created_at)
               VALUES ($1, $2, $3, $4, NOW())
               ON CONFLICT (aggregate_id) DO UPDATE
               SET version = EXCLUDED.version,
                   state = EXCLUDED.state,
                   created_at = NOW()""",
            aggregate_id, aggregate_type, version, json.dumps(state),
        )

    async def load(self, aggregate_id: UUID) -> Optional[dict]:
        """Load the latest snapshot for an aggregate."""
        row = await self._pool.fetchrow(
            "SELECT version, state FROM aggregate_snapshots WHERE aggregate_id = $1",
            aggregate_id,
        )
        if row:
            return {"version": row["version"], "state": json.loads(row["state"])}
        return None

    def should_snapshot(self, event_count_since_last: int, hours_since_last: float) -> bool:
        """Hybrid snapshot strategy: trigger when either condition is met."""
        return (event_count_since_last >= self.SNAPSHOT_THRESHOLD or
                hours_since_last >= self.SNAPSHOT_HOURS)


class CheckpointStore:
    """Persists projection checkpoint positions for crash recovery."""

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS projection_checkpoints (
        projection_name VARCHAR(200) PRIMARY KEY,
        last_event_version INTEGER NOT NULL DEFAULT 0,
        last_event_id UUID,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """

    def __init__(self, pool):
        self._pool = pool

    async def save(self, name: str, version: int, event_id: UUID) -> None:
        await self._pool.execute(
            """INSERT INTO projection_checkpoints
               (projection_name, last_event_version, last_event_id, updated_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (projection_name) DO UPDATE
               SET last_event_version = EXCLUDED.last_event_version,
                   last_event_id = EXCLUDED.last_event_id""",
            name, version, str(event_id),
        )

    async def load(self, name: str) -> dict:
        row = await self._pool.fetchrow(
            "SELECT last_event_version FROM projection_checkpoints WHERE projection_name = $1",
            name,
        )
        return {"last_event_version": row["last_event_version"]} if row else {"last_event_version": 0}


@runtime_checkable
class ProjectionHandler(Protocol):
    """Interface for projection event handlers."""
    async def handle(self, event: StoredEvent) -> None: ...


class OrderProjection:
    """
    Builds a denormalized order_summaries read table from order events.

    Idempotent: uses ON CONFLICT DO UPDATE so re-processing produces the same result.
    """

    TABLE = "order_summaries"

    SCHEMA = """
    CREATE TABLE IF NOT EXISTS order_summaries (
        order_id UUID PRIMARY KEY,
        customer_id UUID NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'placed',
        total DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        version INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """

    def __init__(self, event_store: EventStore, checkpoint_store: CheckpointStore):
        self._event_store = event_store
        self._checkpoint = checkpoint_store

    async def run(self) -> int:
        """Process all unprocessed events. Returns count of events processed."""
        checkpoint = await self._checkpoint.load("order_projection")
        from_version = checkpoint["last_event_version"]

        processed_count = 0

        async for event in self._event_store.stream_events(
            event_type=None,
            from_version=from_version,
        ):
            # Skip non-order events
            if event.aggregate_type != "Order":
                continue

            handler_name = f"_handle_{event.event_type}"
            handler = getattr(self, handler_name, None)
            if handler:
                await handler(event)

            # Update checkpoint after each event
            await self._checkpoint.save(
                "order_projection",
                version=event.version,
                event_id=event.id,
            )
            processed_count += 1

        return processed_count

    async def _handle_order_placed(self, event: StoredEvent) -> None:
        items = event.payload.get("items", [])
        total = sum(Decimal(str(item["unit_price"])) * item["quantity"] for item in items)

        await self._event_store._pool.execute(  # type: ignore[union-attr]
            f"""INSERT INTO {self.TABLE}
                (order_id, customer_id, status, total, currency, version, created_at)
                VALUES ($1, $2, 'placed', $3, $4, $5, $6)
                ON CONFLICT (order_id) DO UPDATE
                SET status = EXCLUDED.status, total = EXCLUDED.total,
                    version = EXCLUDED.version, updated_at = NOW()""",
            event.aggregate_id,
            event.payload.get("customer_id"),
            total,
            event.payload.get("currency", "USD"),
            event.version,
            event.occurred_at,
        )

    async def _handle_payment_authorized(self, event: StoredEvent) -> None:
        pass  # Payment auth doesn't change the read model directly

    async def _handle_order_confirmed(self, event: StoredEvent) -> None:
        await self._event_store._pool.execute(  # type: ignore[union-attr]
            f"UPDATE {self.TABLE} SET status = 'confirmed', version = $1, updated_at = NOW() WHERE order_id = $2",
            event.version,
            event.aggregate_id,
        )

    async def _handle_order_cancelled(self, event: StoredEvent) -> None:
        await self._event_store._pool.execute(  # type: ignore[union-attr]
            f"UPDATE {self.TABLE} SET status = 'cancelled', version = $1, updated_at = NOW() WHERE order_id = $2",
            event.version,
            event.aggregate_id,
        )


# Snapshot-based aggregate loading example

class SnapshotAwareAggregate(AggregateRoot):
    """
    Aggregate that loads from the latest snapshot, then replays delta events.

    Loading flow:
    1. Load snapshot → restore state to snapshot version
    2. Load delta events from snapshot_version + 1 onward
    3. Apply delta events → bring state up to current
    """

    def __init__(self, event_store: EventStore, snapshot_store: SnapshotStore):
        super().__init__()
        self._event_store = event_store
        self._snapshot_store = snapshot_store

    async def load(self, aggregate_id: UUID) -> None:
        """Load aggregate state from snapshot + delta events."""
        # Step 1: Try to load the latest snapshot
        snapshot = await self._snapshot_store.load(aggregate_id)

        if snapshot:
            self._version = snapshot["version"]
            self._restore_from_snapshot(snapshot["state"])
            start_version = snapshot["version"]
        else:
            start_version = 0

        # Step 2: Load and apply delta events after snapshot
        delta_events = await self._event_store.load(aggregate_id, from_version=start_version)
        for stored in delta_events:
            event_type = stored.event_type
            handler = getattr(self, f"_apply_{event_type}", None)
            if handler:
                # Reconstruct the concrete event from the dict payload
                self._version += 1
                handler(stored)

    def _restore_from_snapshot(self, state: dict) -> None:
        """Restore aggregate state from snapshot data. Override in subclasses."""
        pass

    async def persist_and_maybe_snapshot(self) -> int:
        """Persist pending events and potentially create a snapshot."""
        if not self._pending_events:
            return self._version

        new_version = await self._event_store.append(
            aggregate_id=self.id,
            aggregate_type="Order",
            expected_version=self._version - len(self._pending_events),
            events=list(self._pending_events),
        )

        # Clear pending events after successful persist
        self.clear_pending_events()

        # Check if we should create a snapshot
        event_count = len(self._pending_events) + len(self.uncommitted_events)  # Approximate
        await self._snapshot_store.save(
            aggregate_id=self.id,
            aggregate_type="Order",
            version=new_version,
            state=self._get_snapshot_state(),
        )

        return new_version

    def _get_snapshot_state(self) -> dict:
        """Serialize current aggregate state for snapshot. Override in subclasses."""
        return {}
```

## Constraints

### MUST DO
- Define all state changes as immutable frozen dataclasses (DomainEvent with `frozen=True`)
- Use PostgreSQL JSONB columns for event payload storage with time-range partitioning
- Implement optimistic concurrency by checking expected_version before append and raising ConflictError
- Create snapshots using a hybrid strategy (event count threshold OR time interval) to maintain read performance
- Build projections as incremental, checkpoint-based consumers — never replay all events from scratch on each run
- Version event schemas with additive-only changes; create new `_v2` classes for breaking changes
- Use `UUIDv7` for event IDs (time-ordered, B-tree friendly for partitioned tables)

### MUST NOT DO
- Modify or overwrite existing events — they are immutable historical records
- Replay all events from version 1 on every command execution without snapshots
- Share mutable state between concurrent aggregate instances operating on the same aggregate_id
- Skip idempotency in projection handlers — at-least-once delivery means events may be re-processed
- Delete historical events except via explicit compaction with rollup events (compliance requirements)

## Output Template

When implementing or reviewing event-sourced systems, produce:

1. **Event Catalog** — Table of all domain events per aggregate with fields, versions, and descriptions
2. **Aggregate Class** — Full implementation including command handlers, business rule validation, and `_apply_*` event replays
3. **Event Store Schema** — SQL DDL for the event store table with partitioning strategy and indexes
4. **Snapshot Strategy** — Threshold values (event count + time interval), snapshot table schema
5. **Projection Definitions** — For each read model: events consumed, handler methods, checkpoint persistence
6. **Migration Plan** — Steps for event schema evolution, including backward-compatible handler changes

## Related Skills

| Skill | Purpose |
|---|---|
| `cqrs-pattern` | CQRS provides the query model side — separate from but complementary to event sourcing |
| `saga-pattern` | Sagas coordinate multi-aggregate workflows that span multiple event-sourced aggregates |
| `idempotency-patterns` | Essential for projection handlers and outbox relay in event-driven architectures |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Event Sourcing — Microsoft Architecture Guide](https://learn.microsoft.com/en-us/azure/architecture/guide/design-patterns/event-sourcing)
- [Event Store Documentation](https://docs.geteventstore.com/)
- [Axon Framework Event Sourcing](https://docs.axoniq.io/reference-guide/event-processing/event-sourcing)
- [Npgsql Entity Framework Core — JSONB Support](https://learn.microsoft.com/en-us/ef/core/providers/postgresql/)
- [PostgreSQL Partitioning Documentation](https://www.postgresql.org/docs/current/ddl-partitioning.html)
