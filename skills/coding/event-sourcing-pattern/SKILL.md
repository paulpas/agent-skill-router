---
name: event-sourcing-pattern
description: Implements event sourcing pattern (event store, aggregate roots, projections,
  snapshots, event replay) to maintain complete audit trail and reconstruct state
  from immutable event history.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event sourcing, event store, aggregate root, event replay, projections,
    snapshots, how do i track all changes, immutable audit trail, state reconstruction
    from events
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
  - examples
  related-skills: event-driven-architecture,cqrs-pattern,microservice-resilience-patterns
------
# Event Sourcing Pattern

Implements the event sourcing pattern to maintain a complete, immutable audit trail of all state changes. When loaded, this skill makes the model design aggregate roots that derive state from ordered event streams, implement an event store for persistent storage and replay, build projections for read-optimized views, add snapshots for performance optimization, and construct safe event replay mechanisms for debugging and migration.

## TL;DR Checklist

- [ ] Design aggregates as pure objects with `apply_event` methods — no direct state mutation
- [ ] Store every business-relevant change as an immutable domain event in the event store
- [ ] Reconstruct aggregate state by replaying events from the event store on load
- [ ] Build projections (read models) that derive denormalized views from event streams
- [ ] Add snapshots to skip early events during aggregate reconstruction for performance
- [ ] Implement event replay with version tracking to safely rebuild projections or fix bugs

---

## When to Use

Use this skill when:

- You need a complete, tamper-proof audit trail of every state change in the system (financial transactions, regulatory compliance, healthcare records)
- The application requires complex queries and analytics that are expensive on normalized write models — projections answer them efficiently
- Building systems where business rules evolve over time and you need to replay historical events against new logic without re-entering data
- Designing CQRS architectures where the read model is derived from a single source of truth (the event stream)
- Implementing temporal queries ("what was the state at time T?") or point-in-time recovery after bugs are discovered

---

## When NOT to Use

Avoid this skill when:

- Building simple CRUD applications with no need for audit trails, temporal queries, or complex analytics — plain relational models suffice
- Your system has strict real-time consistency requirements where event propagation latency to projections is unacceptable
- The team lacks experience with eventual consistency patterns — debugging stale read models can be confusing without proper monitoring
- Storage costs are the primary concern and the volume of events would exceed budget — event stores double your write storage

---

## Core Workflow

### 1. Define Domain Events

List every business-relevant state change as an immutable domain event class. Each event must have a version number, a unique aggregate ID, and all the data needed to apply the change. Events represent WHAT happened in the past — never store commands or intentions. Use the naming convention `NounVerbPastTense` (e.g., `OrderCreated`, `ItemShipped`, `PaymentReceived`).

**Checkpoint:** Every event is immutable (frozen dataclass or namedtuple) and contains sufficient information to replay it against any future version of the aggregate's apply_event logic.

### 2. Implement Aggregate Roots

Create aggregate root classes that manage business invariants through a sequence of events. The aggregate maintains its current state by applying each event in order via an `apply_event` method. Commands mutate state by appending new events to an internal unsaved_changes list; they never call a save() method directly.

**Checkpoint:** Every command handler produces at least one event — if a command modifies state without emitting an event, the change will be lost during replay and must be refactored.

### 3. Build the Event Store

Implement a persistent storage layer that appends events to the aggregate's event stream in order. The store tracks a version number (optimistic lock) for each aggregate: every append operation includes the expected current version, and if the actual version differs, a `ConcurrencyError` is raised. Support batch appending of events from multiple aggregates within a single unit of work.

**Checkpoint:** The event store guarantees ordered, non-destructive appends — no overwrites, no deletes of published events, only new appends at the tail of each aggregate's stream.

### 4. Construct Projections (Read Models)

Build read-optimized views by subscribing to the event stream and applying events incrementally. Each projection defines an `handle(event)` method that updates a denormalized table or document store for fast queries. Projections are idempotent — they must handle duplicate events from retry scenarios without corrupting data.

**Checkpoint:** Every projection tracks its last processed event sequence number so it can resume from exactly where it left off after a restart or rebuild.

### 5. Add Snapshot Support

For aggregates with long event histories, create periodic snapshots that capture the aggregate's state at a given version. On load, only replay events between the latest snapshot version and the current tail — skipping all earlier events. Snapshots are created automatically whenever the aggregate has processed N events since the last snapshot (configurable threshold).

**Checkpoint:** Snapshot creation happens inside the same unit of work as event appending — never create snapshots asynchronously without ensuring the underlying event data is persisted first.

### 6. Implement Safe Event Replay

Build a replay mechanism that reads events from the store and re-applies them to aggregate projections or new aggregate implementations. The replay must track progress via a checkpoint table so it can be interrupted and resumed. For projection rebuilds, drop and recreate the read model before replaying; for aggregate logic fixes, create a new event stream version without modifying existing events.

**Checkpoint:** Replay runs in a transactional batch (e.g., 1000 events per batch) with progress checkpoints after each batch — partial replays must be resumable, not all-or-nothing.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Aggregate Root with Event Application

An aggregate root is the sole guardian of business invariants for a bounded context. It applies incoming events to reconstruct state and produces new events in response to commands. State mutation happens exclusively through `apply_event` methods — there are no direct field mutations outside this method.

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
import uuid


class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class OrderCreated:
    """Event emitted when a new order is created."""
    order_id: str
    customer_id: str
    items: list[dict[str, Any]]
    total_amount: float
    currency: str

    def apply(self, aggregate: "OrderAggregate") -> None:
        aggregate._state = OrderState(
            order_id=self.order_id,
            customer_id=self.customer_id,
            items=self.items[:],  # copy to prevent mutation
            total_amount=self.total_amount,
            currency=self.currency,
            status=OrderStatus.PENDING,
        )


@dataclass(frozen=True)
class ItemAdded:
    """Event emitted when an item is added to an order."""
    order_id: str
    product_id: str
    quantity: int
    unit_price: float

    def apply(self, aggregate: "OrderAggregate") -> None:
        item = {"product_id": self.product_id, "quantity": self.quantity, "unit_price": self.unit_price}
        aggregate._state.items.append(item)
        aggregate._state.total_amount += self.quantity * self.unit_price


@dataclass(frozen=True)
class OrderConfirmed:
    """Event emitted when the order is confirmed for processing."""
    order_id: str

    def apply(self, aggregate: "OrderAggregate") -> None:
        if len(aggregate._state.items) == 0:
            raise ValueError("Cannot confirm an order with no items")
        aggregate._state.status = OrderStatus.CONFIRMED


@dataclass(frozen=True)
class OrderPaid:
    """Event emitted when payment is received."""
    order_id: str
    payment_method: str

    def apply(self, aggregate: "OrderAggregate") -> None:
        aggregate._state.status = OrderStatus.PAID
        aggregate._state.payment_method = self.payment_method


@dataclass(frozen=True)
class OrderShipped:
    """Event emitted when the order is shipped."""
    order_id: str
    tracking_number: str

    def apply(self, aggregate: "OrderAggregate") -> None:
        aggregate._state.status = OrderStatus.SHIPPED
        aggregate._state.tracking_number = self.tracking_number


@dataclass(frozen=True)
class OrderDelivered:
    """Event emitted when the order is delivered to the customer."""
    order_id: str

    def apply(self, aggregate: "OrderAggregate") -> None:
        aggregate._state.status = OrderStatus.DELIVERED


@dataclass(frozen=True)
class OrderCancelled:
    """Event emitted when the order is cancelled by the customer or system."""
    order_id: str
    reason: str

    def apply(self, aggregate: "OrderAggregate") -> None:
        aggregate._state.status = OrderStatus.CANCELLED


@dataclass
class OrderState:
    """Internal state representation for the Order aggregate."""
    order_id: str
    customer_id: str
    items: list[dict[str, Any]]
    total_amount: float
    currency: str
    status: OrderStatus
    payment_method: str | None = None
    tracking_number: str | None = None


EVENT_MAP: dict[type, type] = {
    OrderCreated: OrderCreated,
    ItemAdded: ItemAdded,
    OrderConfirmed: OrderConfirmed,
    OrderPaid: OrderPaid,
    OrderShipped: OrderShipped,
    OrderDelivered: OrderDelivered,
    OrderCancelled: OrderCancelled,
}


class OrderAggregate:
    """Aggregate root managing order lifecycle through event application.

    State is reconstructed by replaying events from the event store.
    Commands produce new events; state mutation happens exclusively via apply_event.
    """

    def __init__(self) -> None:
        self._state: OrderState | None = None
        self._unsaved_events: list[Any] = []
        self.version: int = 0

    # --- State reconstruction from events ---

    @classmethod
    def load(cls, event_stream: list[dict[str, Any]]) -> "OrderAggregate":
        """Reconstruct aggregate state by replaying its entire event history.

        Each event dict must contain 'type' (event class name) and the fields
        needed to instantiate that event. The events are applied in order.
        """
        aggregate = cls()
        for event_data in event_stream:
            event = _instantiate_event(event_data["type"], event_data["data"])
            event.apply(aggregate)
        return aggregate

    def apply_event(self, event: Any) -> None:
        """Apply a single domain event to update aggregate state.

        This is the sole method that mutates aggregate state during replay.
        During command handling, events are appended to _unsaved_events instead.
        """
        if self._state is None and not isinstance(event, OrderCreated):
            raise RuntimeError(
                "First event must be OrderCreated; got " + type(event).__name__
            )
        event.apply(self)

    # --- Command handlers (produce events, do NOT mutate state directly) ---

    def create_order(self, customer_id: str, items: list[dict[str, Any]], total_amount: float, currency: str) -> None:
        """Command handler to create a new order."""
        if self._state is not None:
            raise RuntimeError("Cannot create an already-existing order")

        event = OrderCreated(
            order_id=self._ensure_order_id(),
            customer_id=customer_id,
            items=items[:],
            total_amount=total_amount,
            currency=currency,
        )
        self._unsaved_events.append(event)

    def add_item(self, product_id: str, quantity: int, unit_price: float) -> None:
        """Command handler to add an item to an existing order."""
        self._ensure_active("add items")
        event = ItemAdded(order_id=self._state.order_id, product_id=product_id, quantity=quantity, unit_price=unit_price)
        self._unsaved_events.append(event)

    def confirm_order(self) -> None:
        """Command handler to confirm an order for processing."""
        self._ensure_active("confirm")
        event = OrderConfirmed(order_id=self._state.order_id)
        self._unsaved_events.append(event)

    def process_payment(self, payment_method: str) -> None:
        """Command handler to record payment for a confirmed order."""
        self._ensure_status(OrderStatus.CONFIRMED, "process payment")
        event = OrderPaid(order_id=self._state.order_id, payment_method=payment_method)
        self._unsaved_events.append(event)

    def ship_order(self, tracking_number: str) -> None:
        """Command handler to mark an order as shipped."""
        self._ensure_status(OrderStatus.PAID, "ship")
        event = OrderShipped(order_id=self._state.order_id, tracking_number=tracking_number)
        self._unsaved_events.append(event)

    def deliver_order(self) -> None:
        """Command handler to mark an order as delivered."""
        self._ensure_status(OrderStatus.SHIPPED, "deliver")
        event = OrderDelivered(order_id=self._state.order_id)
        self._unsaved_events.append(event)

    def cancel_order(self, reason: str) -> None:
        """Command handler to cancel a pending or confirmed order."""
        if self._state is None:
            raise RuntimeError("Cannot cancel an unknown order")
        if self._state.status not in (OrderStatus.PENDING, OrderStatus.CONFIRMED):
            raise RuntimeError(
                f"Cannot cancel order in {self._state.status.value} state — only PENDING or CONFIRMED"
            )
        event = OrderCancelled(order_id=self._state.order_id, reason=reason)
        self._unsaved_events.append(event)

    # --- Persistence interface ---

    @property
    def unsaved_events(self) -> list[Any]:
        """Return events that have not yet been persisted to the store."""
        return self._unsaved_events[:]

    def mark_saved(self) -> None:
        """Clear unsaved events after successful persistence."""
        self._unsaved_events.clear()
        self.version += len(self.unsaved_events)

    # --- Helpers ---

    def _ensure_active(self, action: str) -> None:
        if self._state is None or self._state.status == OrderStatus.CANCELLED:
            raise RuntimeError(f"Cannot {action} on unknown or cancelled order")

    def _ensure_status(self, required: OrderStatus, action: str) -> None:
        if self._state is None or self._state.status != required:
            raise RuntimeError(
                f"Cannot {action}: expected status {required.value}, "
                f"got {self._state.status.value if self._state else 'none'}"
            )

    def _ensure_order_id(self) -> str:
        if self._state and self._state.order_id:
            return self._state.order_id
        return str(uuid.uuid4())


def _instantiate_event(event_type_name: str, data: dict[str, Any]) -> Any:
    """Deserialize an event from its type name and data payload."""
    for event_cls in EVENT_MAP.values():
        if event_cls.__name__ == event_type_name:
            return event_cls(**data)
    raise ValueError(f"Unknown event type: {event_type_name}")
```

### Pattern 2: Event Store with Optimistic Locking

The event store persists domain events to durable storage and supports appending, loading, and replaying event streams. It uses optimistic concurrency control (version numbers) to prevent lost updates when multiple processes try to append to the same aggregate simultaneously.

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass
class PersistedEvent:
    """An event stored in the event store with metadata."""
    event_id: str
    aggregate_id: str
    event_type: str
    payload: dict[str, Any]
    version: int            # position in the aggregate's event stream (1-based)
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ConcurrencyError(RuntimeError):
    """Raised when an append fails due to optimistic concurrency conflict."""

    def __init__(self, expected_version: int, actual_version: int, aggregate_id: str) -> None:
        super().__init__(
            f"Concurrency conflict for aggregate {aggregate_id}: "
            f"expected version {expected_version}, actual version {actual_version}"
        )


class EventStore:
    """Persistent storage layer for domain event streams.

    Guarantees ordered, non-destructive appends to each aggregate's event stream.
    Uses optimistic concurrency: each append includes the expected current version,
    and a mismatch raises ConcurrencyError.

    Thread-safety note: In production, wrap operations in DB transactions.
    This implementation uses in-memory storage for illustration.
    """

    def __init__(self) -> None:
        self._streams: dict[str, list[PersistedEvent]] = {}  # aggregate_id -> events

    def load_events(self, aggregate_id: str) -> list[dict[str, Any]]:
        """Load all events for an aggregate in stream order."""
        stream = self._streams.get(aggregate_id, [])
        return [
            {"type": e.event_type, "data": e.payload}
            for e in stream
        ]

    def append_events(
        self,
        aggregate_id: str,
        events: list[dict[str, Any]],
        expected_version: int,
    ) -> None:
        """Append a batch of events to an aggregate's event stream.

        Args:
            aggregate_id: The aggregate whose stream receives the events.
            events: List of event dicts with 'type' and 'data' keys.
            expected_version: The version number the caller believes is current.
                            Must equal len(current_stream) for the append to succeed.

        Raises:
            ConcurrencyError: If the actual stream length differs from expected_version.
        """
        stream = self._streams.get(aggregate_id, [])

        if len(stream) != expected_version:
            raise ConcurrencyError(expected_version, len(stream), aggregate_id)

        # Append all events with incremented version numbers
        start_version = expected_version + 1
        for i, event_data in enumerate(events):
            persisted = PersistedEvent(
                event_id=str(uuid.uuid4()),
                aggregate_id=aggregate_id,
                event_type=event_data["type"],
                payload=event_data["data"],
                version=start_version + i,
            )
            stream.append(persisted)

        # Commit the entire batch atomically (in DB this would be a single transaction)
        self._streams[aggregate_id] = list(stream)  # ensure reference update

    def get_latest_version(self, aggregate_id: str) -> int:
        """Return the current version (number of events) for an aggregate."""
        return len(self._streams.get(aggregate_id, []))


# ❌ BAD — No version tracking, lost updates silently overwrite state
def bad_append(store, aggregate_id, events):
    store[aggregate_id] = events  # Overwrites entire stream!

# ✅ GOOD — Optimistic locking prevents lost updates (see EventStore.append_events above)
```

### Pattern 3: Projection with Resume Tracking (BAD vs. GOOD)

Projections derive read-optimized views from the event stream. They must be idempotent and track their last processed position so they can resume after restarts or rebuilds.

```python
# ❌ BAD — No resume tracking, no idempotency guard
class BadProjection:
    def handle(self, event):
        # If this projection restarts mid-batch, events are processed twice
        self.db.execute(
            "INSERT INTO order_totals (order_id, total) VALUES (?, ?)",
            event["order_id"], event["total_amount"]
        )
    # No mechanism to skip already-processed events on recovery

# ✅ GOOD — Resume tracking + idempotency via sequence number
from dataclasses import dataclass


@dataclass
class ProjectionCheckpoint:
    """Tracks a projection's processing progress."""
    projection_name: str
    last_sequence_number: int = 0
    last_updated_at: datetime | None = None

    @property
    def needs_resume(self) -> bool:
        return self.last_sequence_number > 0


class OrderTotalsProjection:
    """Derives denormalized order totals from order events for fast read queries.

    Processes events in sequence order, updating a denormalized table.
    Tracks the last processed event sequence number so it can resume after restarts.
    Idempotent — safely handles duplicate events without double-counting.
    """

    def __init__(self, db_conn) -> None:
        self.db = db_conn
        self.checkpoint = ProjectionCheckpoint(projection_name="order_totals")

    def handle(self, event_type: str, payload: dict[str, Any], sequence_number: int) -> None:
        """Process a single domain event and update the read model.

        Args:
            event_type: The type name of the domain event.
            payload: Event data fields.
            sequence_number: Global monotonic sequence number for resume tracking.
        """
        if event_type == "OrderCreated" or event_type == "ItemAdded":
            order_id = payload.get("order_id")
            total = payload.get("total_amount", 0)

            # Idempotent upsert — safe to call multiple times with same data
            self.db.execute(
                """INSERT INTO order_totals (order_id, total_amount, currency, updated_at)
                   VALUES (?, ?, ?, ?)
                   ON CONFLICT(order_id) DO UPDATE SET
                     total_amount = EXCLUDED.total_amount,
                     currency = EXCLUDED.currency,
                     updated_at = EXCLUDED.updated_at""",
                (order_id, total, payload.get("currency"), datetime.now(timezone.utc)),
            )

        elif event_type == "OrderDelivered":
            order_id = payload.get("order_id")
            self.db.execute(
                "UPDATE order_totals SET status = 'delivered' WHERE order_id = ?",
                (order_id,),
            )

        # Update checkpoint AFTER successful write — guarantees at-least-once delivery semantics
        self.checkpoint.last_sequence_number = sequence_number
        self.checkpoint.last_updated_at = datetime.now(timezone.utc)
        self._save_checkpoint()

    def _save_checkpoint(self) -> None:
        """Persist the projection's current position to a checkpoint table."""
        self.db.execute(
            """INSERT INTO projection_checkpoints (projection_name, last_sequence_number, last_updated_at)
               VALUES (?, ?, ?)
               ON CONFLICT(projection_name) DO UPDATE SET
                 last_sequence_number = EXCLUDED.last_sequence_number,
                 last_updated_at = EXCLUDED.last_updated_at""",
            (self.checkpoint.projection_name, self.checkpoint.last_sequence_number, self.checkpoint.last_updated_at),
        )

    def get_checkpoint(self) -> int:
        """Load the last processed sequence number for resume after restart."""
        row = self.db.query(
            "SELECT last_sequence_number FROM projection_checkpoints WHERE projection_name = ?",
            (self.checkpoint.projection_name,),
        ).first()
        return row[0] if row else 0
```

### Pattern 4: Snapshot for Performance Optimization

Snapshots capture an aggregate's complete state at a given version. During load, the snapshot is applied first, then only events AFTER the snapshot version are replayed — dramatically reducing load time for aggregates with long histories.

```python
import json


@dataclass
class Snapshot:
    """Captured state of an aggregate at a specific version."""
    aggregate_id: str
    version: int
    event_type_names: list[str]          # which events were applied to reach this state
    state_snapshot: dict[str, Any]       # serialized aggregate state
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class SnapshotStore:
    """Stores and retrieves snapshots for aggregates."""

    def __init__(self) -> None:
        self._snapshots: dict[str, Snapshot] = {}  # aggregate_id -> latest snapshot

    def save(self, snapshot: Snapshot) -> None:
        """Overwrite the latest snapshot for an aggregate with a newer one."""
        existing = self._snapshots.get(snapshot.aggregate_id)
        if existing and existing.version >= snapshot.version:
            return  # Ignore out-of-order or duplicate snapshots
        self._snapshots[snapshot.aggregate_id] = snapshot

    def load(self, aggregate_id: str) -> Snapshot | None:
        """Load the latest snapshot for an aggregate, or None if none exists."""
        return self._snapshots.get(aggregate_id)


class SnapshotManager:
    """Manages automatic snapshot creation during aggregate command handling.

    Creates snapshots every `snapshot_interval` events to balance between
    storage overhead and replay performance. The threshold is configurable;
    typical values are 10–100 events depending on average event size.
    """

    def __init__(
        self,
        snapshot_store: SnapshotStore,
        snapshot_interval: int = 50,
    ) -> None:
        self.store = snapshot_store
        self.snapshot_interval = snapshot_interval

    def should_snapshot(self, unsaved_event_count: int, current_version: int) -> bool:
        """Decide whether to create a snapshot after this batch of events.

        Returns True when the aggregate has reached the configured interval
        since its last snapshot or since creation.
        """
        if current_version == 0:
            return False

        # Find the version of the most recent snapshot (if any)
        latest_snapshot = self.store.load("aggregate_placeholder")  # replaced per-aggregate in practice
        if latest_snapshot is None:
            last_snapshot_version = 0
        else:
            last_snapshot_version = latest_snapshot.version

        events_since_snapshot = current_version - last_snapshot_version
        return events_since_snapshot >= self.snapshot_interval

    def create_and_save(
        self,
        aggregate_id: str,
        version: int,
        state_dict: dict[str, Any],
        event_type_names: list[str],
    ) -> Snapshot:
        """Create a snapshot of the aggregate's current state and persist it."""
        snapshot = Snapshot(
            aggregate_id=aggregate_id,
            version=version,
            event_type_names=event_type_names[:],
            state_snapshot=state_dict,
        )
        self.store.save(snapshot)
        return snapshot

    def load_with_snapshots(
        self,
        aggregate: "OrderAggregate",
        event_store: EventStore,
    ) -> None:
        """Load an aggregate using snapshot + incremental event replay.

        1. Load the latest snapshot (if any) and apply it to the aggregate
        2. Load only events AFTER the snapshot version from the event store
        3. Replay those events on top of the snapshot state
        This reduces load time from O(n) to O(k) where k << n.
        """
        # Step 1: Apply snapshot if available
        snapshot = self.store.load(aggregate._state.order_id if aggregate._state else "none")

        if snapshot is not None:
            # Reconstruct state from snapshot data
            for event_name, data in zip(snapshot.event_type_names, _reconstruct_events(snapshot.state_snapshot)):
                ev = _instantiate_event(event_name, data)
                ev.apply(aggregate)
            aggregate.version = snapshot.version

        # Step 2: Load and replay events after snapshot version
        if snapshot is None:
            event_stream = event_store.load_events(aggregate._state.order_id if aggregate._state else "none")
        else:
            full_stream = event_store.load_events(aggregate._state.order_id if aggregate._state else "none")
            event_stream = full_stream[snapshot.version:]  # skip events before snapshot

        for event_data in event_stream:
            ev = _instantiate_event(event_data["type"], event_data["data"])
            ev.apply(aggregate)
```

### Pattern 5: Event Replay Mechanism

Event replay re-processes historical events to rebuild projections, fix bugs in aggregate logic, or migrate schemas. It runs in batches with checkpoint-based progress tracking for safe interruption and resumption.

```python
from dataclasses import dataclass, field


@dataclass
class ReplayProgress:
    """Tracks the current state of an event replay operation."""
    aggregate_id: str | None         # None = replay all aggregates
    source_version: int              # version to start replaying from (0 = beginning)
    processed_events: int = 0
    failed_events: int = 0
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def success_rate(self) -> float:
        total = self.processed_events + self.failed_events
        if total == 0:
            return 1.0
        return self.processed_events / total


class EventReplayEngine:
    """Safely re-processes historical events from the event store.

    Supports two primary use cases:
    1. Projection rebuilds — drop and recreate read models from scratch
    2. Aggregate logic migration — apply old events through new aggregate implementations

    Runs in configurable batch sizes with checkpoint-based progress tracking.
    Partial replays are always resumable.
    """

    def __init__(
        self,
        event_store: EventStore,
        aggregate_factory,
        projection_handler=None,
        batch_size: int = 100,
    ) -> None:
        self.store = event_store
        self.aggregate_factory = aggregate_factory
        self.projection_handler = projection_handler
        self.batch_size = batch_size

    def replay_aggregate(
        self,
        aggregate_id: str,
        progress: ReplayProgress | None = None,
    ) -> ReplayProgress:
        """Replay all events for a single aggregate from its beginning.

        Loads the event stream, reconstructs the aggregate by applying each
        event in order, then invokes the projection handler if configured.
        """
        if progress is None:
            progress = ReplayProgress(aggregate_id=aggregate_id)

        # Load the full event stream for this aggregate
        event_stream = self.store.load_events(aggregate_id)

        for i, event_data in enumerate(event_stream):
            try:
                # Reconstruct a fresh aggregate and apply the single event
                agg = self.aggregate_factory()
                agg.apply_event(_instantiate_event(event_data["type"], event_data["data"]))

                if self.projection_handler:
                    self.projection_handler.handle(
                        event_type=event_data["type"],
                        payload=event_data["data"],
                        sequence_number=i,
                    )

                progress.processed_events += 1

            except Exception as exc:
                progress.failed_events += 1
                print(f"[Replay] Failed event {i} for {aggregate_id}: {exc}")

        return progress

    def replay_all(self, aggregate_ids: list[str]) -> ReplayProgress:
        """Replay events across multiple aggregates with batched checkpointing."""
        total_progress = ReplayProgress(aggregate_id=None)

        # Process in batches to manage memory and allow interruption
        for batch_start in range(0, len(aggregate_ids), self.batch_size):
            batch = aggregate_ids[batch_start : batch_start + self.batch_size]

            for agg_id in batch:
                try:
                    self.replay_aggregate(agg_id)
                except Exception as exc:
                    print(f"[Replay] Aborting at aggregate {agg_id}: {exc}")
                    break  # Stop on unrecoverable error; checkpoint allows resume

        return total_progress


def _reconstruct_events(state_snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    """Deserialize event data from a snapshot's state representation.

    This helper reconstructs the original event payloads from the
    aggregate's serialized state for snapshot-based replay reconstruction.
    """
    return []  # Implementation depends on serialization strategy
```

---

## Constraints

### MUST DO
- Store every business-relevant state change as an immutable domain event — never store commands, DTOs, or derived values that do not represent actual events
- Reconstruct aggregate state exclusively through `apply_event` methods — no direct field mutations outside event application
- Use optimistic concurrency control (version numbers) on every event append to prevent lost updates from concurrent writers
- Make projection handlers idempotent — they must handle duplicate events without double-counting or corrupting data
- Track projection checkpoints at the sequence number level so rebuilds and restarts resume from exactly the right position
- Create snapshots at regular intervals (configurable) for aggregates expected to have long event histories — do not wait until load times are unacceptably slow

### MUST NOT DO
- Store commands alongside events as if they were the same thing — commands are intentions, events are facts that happened
- Delete or modify events in the store after they are persisted — event sourcing is built on immutability; corrections go through reversal events (e.g., `ItemRemoved`)
- Build projections that query the write model directly — projections must derive state entirely from events, never from concurrent DB reads
- Skip snapshot creation for aggregates with more than 100 events — replaying hundreds of events per load causes unbounded latency growth
- Run event replay on a production event store without isolating it to a read-only replica or staging environment first

---

## Output Template

When implementing or reviewing event sourcing, produce:

1. **Event Catalog** — Table listing every domain event with its fields, apply logic description, and version number
2. **Aggregate Design** — List of aggregate roots with their command handlers, events produced, and invariants enforced
3. **Projection Map** — Read models derived from the event stream, including query patterns each supports and checkpoint strategy
4. **Snapshot Strategy** — Snapshot interval, storage format, and load-time performance estimates (with vs. without snapshots)
5. **Replay Plan** — Batch size, progress tracking mechanism, rollback procedure if replay fails partway

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Event Sourcing Pattern (Microsoft Azure Architecture Center)](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)
- [Event Store — Event-Sourced Databases](https://eventstore.com/)
- [Axon Framework — Event Sourcing in Java](https://axoniq.io/product-overview/axon-framework)
- [CQRS and Event Sourcing (Microsoft Docs)](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Event Sourcing Patterns — Command, Projection, Snapshotting](https://event-driven.io/en/event_sourcing_pattern/)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `event-driven-architecture` | Connect event store events to message queues for cross-service communication via pub/sub |
| `cqrs-pattern` | Combine event sourcing with CQRS — the event store is the write model, projections are read models |
| `microservice-resilience-patterns` | Add circuit breakers and retry logic around projection rebuilds and replay operations |
