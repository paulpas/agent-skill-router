---




name: ddd-aggregate-lifecycle
description: Implements aggregate lifecycle management patterns — snapshotting, schema versioning, optimistic concurrency control, aggregate root splitting strategies, and consistency boundary enforcement for high-throughput domain-driven systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: aggregate lifecycle, aggregate snapshotting, aggregate versioning, optimistic concurrency, event sourcing snapshot, how do i scale aggregates, aggregate consistency at scale, ddd performance
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, ddd-context-mapping, event-sourcing-pattern, cqrs-pattern




---





# Aggregate Lifecycle Management

Acts as a senior DDD architect managing the full lifecycle of aggregate roots — from persistence through snapshotting and versioning to consistency enforcement at scale. When loaded, the model implements efficient aggregate storage patterns including periodic snapshotting, schema migration strategies, optimistic concurrency control, and aggregate root splitting heuristics that preserve consistency boundaries while maintaining high throughput under load.

## TL;DR Checklist

- [ ] Add a `version` field to every aggregate root for optimistic concurrency detection
- [ ] Compute snapshot intervals based on mutation frequency (e.g., every N domain events)
- [ ] Store snapshots as full serialized state with schema version metadata, not partial diffs
- [ ] On load: fetch latest snapshot, replay only events after the snapshot's sequence number
- [ ] Assign a `schema_version` to each aggregate and write migration functions for every version bump
- [ ] Split an aggregate when it handles more than 20–30 methods or multiple bounded concerns
- [ ] Never call another aggregate's public API from within a transaction boundary — use domain events instead

---

## When to Use

Use this skill when:

- An aggregate root is replaying hundreds or thousands of events on every load, causing unacceptable latency (>100ms for a single read)
- The team needs to add new fields or change the structure of an existing aggregate without breaking historical event streams
- Two or more bounded concerns are co-located within a single aggregate (e.g., Order management + Inventory reservation in one class)
- Concurrent users are updating the same aggregate and conflict detection is needed to prevent lost updates
- The repository layer needs to coordinate snapshot loading, event replay, and merge logic into a consistent retrieval pipeline
- Designing an event-sourcing-backed aggregate where state reconstruction from events is the primary persistence strategy

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD aggregates with 1–2 methods that load and save in under 5ms — snapshotting adds more overhead than benefit
- Read-model projections or query-side models (use `cqrs-pattern` instead)
- Cross-aggregate consistency decisions (use `ddd-context-mapping` for bounded context boundaries)
- Database-level locking strategies (Pessimistic concurrency control is outside aggregate lifecycle scope)

---

## Core Workflow

1. **Assess the aggregate's size and access patterns.** Profile read frequency, mutation frequency, and average event stream length. Determine if snapshotting will reduce replay cost by >50%. **Checkpoint:** Event stream exceeds 100 events per load cycle, or single-load latency exceeds 50ms on a warm cache — snapshotting is warranted.

2. **Implement optimistic concurrency control.** Every aggregate root must carry a `version` integer (starting at 0). Increment it on every mutation. The repository checks the version against the stored value before writing. **Checkpoint:** Every `save()` call includes a `WHERE version = ?` guard in the persistence layer.

3. **Create snapshot points based on mutation thresholds.** Configure snapshot intervals using one of two strategies: fixed event count (e.g., every 50 domain events) or time-based (e.g., every 1 hour of active mutations). Store the full serialized state plus metadata (aggregate ID, version at snapshot time, schema version, timestamp). **Checkpoint:** Snapshot store returns a snapshot within the configured interval; never skip more than one snapshot between saves.

4. **Design the schema versioning strategy.** Each aggregate stores a `schema_version` integer that increments when the domain model structure changes. Write migration functions that transform old state to the new format. The repository applies migrations during load when the stored `schema_version` differs from the current code version. **Checkpoint:** After every domain model change, at least one migration function exists and is tested against a representative snapshot.

5. **Build the repository layer that orchestrates load → apply → restore → merge → save.** Load retrieves the latest snapshot, replays only events after the snapshot point, merges into the aggregate instance, then saves write-backs atomically with version check. **Checkpoint:** End-to-end test loads a 500-event aggregate and confirms it reconstructs correctly from a snapshot + ~50 replayed events in under 10ms on warm storage.

6. **Implement aggregate root splitting when necessary.** When an aggregate grows beyond 20–30 public methods or encapsulates multiple bounded concerns, split it into two aggregates connected by domain events. Replace direct cross-aggregate calls with event-driven coordination. **Checkpoint:** Each new aggregate has a single clear responsibility and its own bounded consistency context.

7. **Enforce consistency boundaries.** No aggregate may directly modify another aggregate's state within the same transaction. Communicate across boundaries exclusively through immutable domain events, published after the committing aggregate's transaction succeeds. **Checkpoint:** Code review confirms zero inter-aggregate method calls within transactional boundaries.

---

## Implementation Patterns

### Pattern 1: Snapshot Pattern

Save and restore the full serialized state of an aggregate at defined intervals to avoid replaying hundreds or thousands of events. The snapshot captures the complete domain state plus metadata (sequence number, schema version) so that reconstruction only requires replaying events emitted after the snapshot point.

**When to use:** Event stream exceeds ~100 events per aggregate load cycle, or single-load latency is unacceptable for the performance budget. Snapshots trade storage for read performance — each snapshot stores a full state copy but reduces event replay from O(N) to O(N - K) where K is the snapshot boundary.

```python
from __future__ import annotations
import json
import time
from dataclasses import dataclass, field, asdict
from typing import Any, Optional


@dataclass
class AggregateSnapshot:
    """Immutable representation of an aggregate's full state at a point in time.

    Attributes:
        aggregate_id: Unique identifier of the aggregate root.
        aggregate_type: Fully-qualified class name for deserialization.
        version: The version number at snapshot time.
        schema_version: The domain model schema version at snapshot time.
        sequence_number: Total events applied before this snapshot was taken.
        state: Full serialized state dict of the aggregate's data.
        created_at: Unix timestamp when the snapshot was captured.
    """

    aggregate_id: str
    aggregate_type: str
    version: int
    schema_version: int
    sequence_number: int
    state: dict[str, Any]
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        """Serialize the snapshot for storage."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> AggregateSnapshot:
        """Deserialize a stored snapshot back into an object."""
        return cls(**data)


class SnapshotStore:
    """Persists and retrieves aggregate snapshots.

    In production this would use Redis or a dedicated snapshot table.
    This implementation uses an in-memory dict for demonstration.
    """

    def __init__(self) -> None:
        self._store: dict[str, AggregateSnapshot] = {}

    def save(self, snapshot: AggregateSnapshot) -> None:
        """Save (overwrite) the latest snapshot for this aggregate."""
        existing = self._store.get(snapshot.aggregate_id)
        if existing is not None and existing.sequence_number >= snapshot.sequence_number:
            return  # No-op: newer snapshot already exists

        self._store[snapshot.aggregate_id] = snapshot

    def load(self, aggregate_id: str) -> Optional[AggregateSnapshot]:
        """Return the latest snapshot for the given aggregate ID."""
        return self._store.get(aggregate_id)

    def delete_before(self, aggregate_id: str, sequence_threshold: int) -> None:
        """Remove snapshots whose sequence number is below the threshold."""
        snapshot = self._store.get(aggregate_id)
        if snapshot and snapshot.sequence_number < sequence_threshold:
            del self._store[aggregate_id]
```

**Snapshot integration with event replay — BAD vs. GOOD:**

```python
# ❌ BAD: Replay ALL events from the beginning, ignoring snapshots
def bad_load_aggregate(event_store: EventStore, aggregate_id: str) -> OrderAggregate:
    """Replays every event — O(N) where N = total historical events."""
    aggregate = OrderAggregate(aggregate_id)
    for event in event_store.stream_all(aggregate_id):
        aggregate.apply_event(event)
    return aggregate


# ✅ GOOD: Load snapshot, then replay only delta events since the snapshot point
def good_load_aggregate(
    event_store: EventStore,
    snapshot_store: SnapshotStore,
    aggregate_id: str,
) -> OrderAggregate:
    """Reconstructs aggregate from snapshot + delta events — O(K) where K << N."""
    aggregate = OrderAggregate(aggregate_id)

    # Step 1: Restore from latest snapshot if available
    snapshot = snapshot_store.load(aggregate_id)
    if snapshot:
        _restore_snapshot_state(aggregate, snapshot)
        base_sequence = snapshot.sequence_number
    else:
        base_sequence = 0

    # Step 2: Replay only events AFTER the snapshot point
    for event in event_store.stream_after(aggregate_id, base_sequence):
        aggregate.apply_event(event)

    return aggregate


def _restore_snapshot_state(
    aggregate: OrderAggregate,
    snapshot: AggregateSnapshot,
) -> None:
    """Restore an aggregate's internal state from a snapshot dict."""
    for key, value in snapshot.state.items():
        if hasattr(aggregate, key):
            setattr(aggregate, key, value)
```

---

### Pattern 2: Optimistic Concurrency Control

Version-based conflict detection on every read-write cycle. Each aggregate carries a monotonically increasing version number that is checked during save. If the stored version differs from the expected version, the write is rejected and the caller must retry after reconciling with the latest state. This prevents lost updates in concurrent scenarios without requiring database-level row locks.

**When to use:** Multiple command handlers may target the same aggregate concurrently (e.g., two users modifying the same Order). Conflicts are rare enough that retries are cheap, but data integrity is critical. For high-contention workloads (>10% conflict rate), consider partitioning the aggregate or switching to a different consistency strategy.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Protocol


class VersionConflictError(Exception):
    """Raised when a save operation detects a version mismatch."""

    def __init__(self, expected_version: int, actual_version: int) -> None:
        super().__init__(
            f"Version conflict: expected {expected_version}, "
            f"actual {actual_version}. Reload the aggregate and retry."
        )
        self.expected_version = expected_version
        self.actual_version = actual_version


class EventStoreProtocol(Protocol):
    """Minimal event store interface for concurrency control."""

    def append_events(
        self,
        aggregate_id: str,
        events: list[Any],
        expected_version: int,
    ) -> int:
        """Append events atomically if version matches. Returns new version on success."""
        ...


class VersionedAggregateRoot(ABC):
    """Base class providing optimistic concurrency control for all aggregates.

    Subclasses call `increment_version()` before each state mutation and the
    repository enforces the version check during persistence.
    """

    def __init__(self, aggregate_id: str) -> None:
        self._aggregate_id = aggregate_id
        self._version: int = 0
        self._pending_events: list[Any] = []

    @property
    def aggregate_id(self) -> str:
        return self._aggregate_id

    @property
    def version(self) -> int:
        """Current version of the aggregate. Increments on each mutation."""
        return self._version

    @property
    def pending_events(self) -> list[Any]:
        """Unpersisted domain events awaiting save."""
        return list(self._pending_events)

    def increment_version(self) -> None:
        """Increment version before persisting a state-changing operation."""
        self._version += 1

    def apply_and_record(
        self, event: Any, *, mutator: Any = None
    ) -> None:
        """Apply an event to mutate state and record it for persistence.

        Args:
            event: The domain event to apply.
            mutator: Optional callable that modifies aggregate state given the event.
        """
        if mutator is not None:
            mutator(event)
        self._pending_events.append(event)
        self.increment_version()

    @abstractmethod
    def apply_event(self, event: Any) -> None:
        """Apply an event during reconstruction (from snapshot or replay)."""
        ...

    def clear_pending_events(self) -> None:
        """Consume the pending event buffer after a successful save."""
        self._pending_events.clear()


class AggregateRepository(ABC):
    """Base repository enforcing optimistic concurrency control on save."""

    def __init__(self, event_store: EventStoreProtocol) -> None:
        self.event_store = event_store

    def save(self, aggregate: VersionedAggregateRoot) -> None:
        """Persist pending events with version check.

        Raises:
            VersionConflictError: If the stored version no longer matches
                the aggregate's expected version (another writer intervened).
        """
        if not aggregate.pending_events:
            return  # Nothing to persist

        new_version = self.event_store.append_events(
            aggregate_id=aggregate.aggregate_id,
            events=aggregate.pending_events,
            expected_version=aggregate.version - len(aggregate.pending_events),
        )
        aggregate.clear_pending_events()


# ❌ BAD: Silently overwriting a concurrent update — data loss
def bad_save_with_overwrite(event_store: Any, aggregate: VersionedAggregateRoot) -> None:
    """Ignores version entirely — last write wins, intermediate changes lost."""
    event_store.write(aggregate.aggregate_id, aggregate.pending_events)
    # No version check at all — concurrent modifications are silently discarded


# ✅ GOOD: Version-checked save with retry logic for the caller
def good_save_with_retry(
    repository: AggregateRepository,
    aggregate: VersionedAggregateRoot,
    max_retries: int = 3,
) -> None:
    """Save with optimistic concurrency control and automatic retry.

    When a conflict is detected, reloads the aggregate from the event store
    and re-applies the pending changes before retrying the save.

    Args:
        repository: The repository performing the persistence.
        aggregate: The aggregate root to persist.
        max_retries: Maximum number of retries after conflict detection.

    Raises:
        VersionConflictError: If max retries exhausted without success.
    """
    for attempt in range(1, max_retries + 1):
        try:
            repository.save(aggregate)
            return  # Success — exit immediately
        except VersionConflictError as exc:
            if attempt == max_retries:
                raise  # Give up after max retries

            # Reload the aggregate to incorporate the other writer's changes
            # (in production, call a load method on the repository)
            _reload_aggregate(aggregate)
            # The caller's business logic should re-apply its command here
```

---

### Pattern 3: Schema Versioning and Migration

Handle structural changes to an aggregate's domain model across versions. Each stored snapshot and event stream carries a `schema_version` that indicates which version of the domain model produced it. When loading an aggregate, the repository compares the stored schema version against the current code version and applies migration functions in sequence to transform the state to the latest format.

**When to use:** You need to add, remove, or rename fields on an aggregate root while maintaining compatibility with existing snapshots and event streams. Each migration must be idempotent and forward-only (never write backward migrations).

```python
from __future__ import annotations
from typing import Callable, Optional


# Migration function type: transforms state dict from version N to version N+1
MigrationFn = Callable[[dict[str, Any]], dict[str, Any]]


class SchemaVersionedAggregateRoot(VersionedAggregateRoot):
    """Extension of the versioned aggregate that tracks its own schema version.

    Subclasses set `schema_version` to the current model version. During load,
    migration functions are applied when the stored version is behind.
    """

    schema_version: int = 1

    def __init__(self, aggregate_id: str) -> None:
        super().__init__(aggregate_id)


def apply_schema_migrations(
    state: dict[str, Any],
    current_schema_version: int,
    migrations: dict[int, MigrationFn],
) -> dict[str, Any]:
    """Apply migration functions to transform old state to the current schema version.

    Iteratively applies each migration in sequence from the stored schema version
    up to (but not including) the current schema version. Each migration receives
    the transformed state and returns it for the next migration.

    Args:
        state: The serialized state dict loaded from a snapshot or event stream.
        current_schema_version: The schema version of the running code.
        migrations: Mapping of (old_version -> new_version) to migration functions.

    Returns:
        The transformed state dict at the current schema version.

    Raises:
        ValueError: If a migration function is missing for a required version bump.
    """
    stored_version = state.get("schema_version", 0)

    if stored_version == current_schema_version:
        return state  # No migration needed

    if stored_version > current_schema_version:
        raise ValueError(
            f"Stored schema version {stored_version} is newer than "
            f"current version {current_schema_version}. Upgrade the code first."
        )

    version = stored_version
    while version < current_schema_version:
        migration_key = version
        if migration_key not in migrations:
            raise ValueError(
                f"No migration function defined for schema version {migration_key} "
                f"-> {migration_key + 1}"
            )
        state = migrations[migration_key](state)
        state["schema_version"] = version + 1
        version += 1

    return state


# --- Concrete Example: Adding a `shipping_method` field to an Order ---

def migrate_order_v1_to_v2(state: dict[str, Any]) -> dict[str, Any]:
    """Schema migration v1 → v2: add shipping_method field with sensible default."""
    # Ensure the new field exists with a default if migrating old records
    if "shipping_method" not in state:
        state["shipping_method"] = "standard"

    # Rename an existing field during this migration (optional)
    if "priority" in state and "shipping_priority" not in state:
        state["shipping_priority"] = state.pop("priority")

    return state


class OrderRepository(AggregateRepository):
    """Repository for the Order aggregate with schema migration support.

    The migration registry maps each version bump to its transformation function.
    In production, this could be populated dynamically via module scanning.
    """

    def __init__(self, event_store: EventStoreProtocol) -> None:
        super().__init__(event_store)
        self._migration_registry: dict[int, MigrationFn] = {
            1: migrate_order_v1_to_v2,
            # Add new migrations here as schema_version increases:
            # 2: migrate_order_v2_to_v3,
        }

    def _apply_migrations(self, state: dict[str, Any]) -> dict[str, Any]:
        """Delegate migration application to the shared utility function."""
        return apply_schema_migrations(
            state=state,
            current_schema_version=OrderAggregate.schema_version,
            migrations=self._migration_registry,
        )

    def load_snapshot_and_migrate(self, aggregate_id: str) -> Optional[dict[str, Any]]:
        """Load a snapshot and apply any required schema migrations."""
        snapshot = snapshot_store.load(aggregate_id)
        if snapshot is None:
            return None

        migrated_state = self._apply_migrations(snapshot.state.copy())
        return migrated_state
```

---

### Pattern 4: Aggregate Root Splitting (Bounded Context Decomposition)

When an aggregate grows beyond ~20–30 methods or handles multiple bounded concerns, split it into two smaller aggregates connected by domain events. The key principle is that each new aggregate must have a single clear responsibility and its own consistency boundary. Communication between the new aggregates happens through domain events published after the committing aggregate's transaction succeeds — never through direct method calls within a transaction.

**When to use:** An aggregate has accumulated methods from multiple bounded contexts (e.g., `OrderAggregate` handles both order state management AND inventory reservation). Signs include: many public methods (>20), cross-cutting concern clusters, or different concurrency patterns for different operations.

```python
from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Any
from enum import Enum


# --- Domain Events ---

@dataclass(frozen=True)
class OrderShipped:
    """Domain event published by OrderAggregate when an order ships."""

    aggregate_id: str
    order_id: str
    shipped_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": "OrderShipped",
            "aggregate_id": self.aggregate_id,
            "order_id": self.order_id,
            "shipped_at": self.shipped_at,
        }


@dataclass(frozen=True)
class InventoryReserved:
    """Domain event published by InventoryAggregate when items are reserved."""

    aggregate_id: str
    order_id: str
    item_sku: str
    quantity: int
    reservation_id: str = field(default_factory=lambda: "res-001")

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": "InventoryReserved",
            "aggregate_id": self.aggregate_id,
            "order_id": self.order_id,
            "item_sku": self.item_sku,
            "quantity": self.quantity,
            "reservation_id": self.reservation_id,
        }


@dataclass(frozen=True)
class OrderItemsReserved:
    """Domain event received by OrderAggregate when inventory reservation succeeds."""

    aggregate_id: str
    order_id: str
    reservation_id: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "type": "OrderItemsReserved",
            "aggregate_id": self.aggregate_id,
            "order_id": self.order_id,
            "reservation_id": self.reservation_id,
        }


# --- Split Aggregate 1: OrderAggregate (Order Management Only) ---

class OrderStatus(Enum):
    PENDING = "pending"
    RESERVED = "reserved"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"


class OrderAggregate(SchemaVersionedAggregateRoot):
    """Splits from the monolithic aggregate — now handles ONLY order lifecycle.

    Responsibility: manage order status transitions, customer info, and shipping.
    No longer directly manages inventory reservations or stock counts.
    Communicates with InventoryAggregate via domain events.
    """

    schema_version = 1

    def __init__(self, aggregate_id: str) -> None:
        super().__init__(aggregate_id)
        self._order_id: str = ""
        self._status: OrderStatus = OrderStatus.PENDING
        self._customer_email: str = ""
        self._shipped_at: Optional[float] = None

    # --- Domain commands (public API) ---

    def assign_customer(self, email: str) -> None:
        """Assign a customer to this order."""
        if self._status != OrderStatus.PENDING:
            raise RuntimeError(f"Cannot assign customer to order in {self._status.value} state")
        self._customer_email = email

    def confirm_and_reserve(self, item_sku: str, quantity: int) -> None:
        """Confirm the order and publish an event for inventory reservation.

        This method does NOT call InventoryAggregate directly. It records
        an OrderConfirmation event that a saga handler will use to reserve
        inventory asynchronously.
        """
        if self._status != OrderStatus.PENDING:
            raise RuntimeError(f"Cannot confirm order in {self._status.value} state")

        def _mutator(event: Any) -> None:
            self._order_id = event.order_id
            self._status = OrderStatus.RESERVED

        confirmation_event = OrderConfirmation(order_id=self.aggregate_id, sku=item_sku, qty=quantity)
        self.apply_and_record(confirmation_event, mutator=_mutator)

    def handle_inventory_reserved(self, reservation_id: str) -> None:
        """React to the InventoryReserved domain event from InventoryAggregate.

        This is an event handler — not a command. Called by the repository's
        event dispatcher when the inventory service confirms reservation.
        """
        if self._status != OrderStatus.RESERVED:
            raise RuntimeError(
                f"Cannot apply reservation to order in {self._status.value} state"
            )

        def _mutator(event: Any) -> None:
            self._status = OrderStatus.SHIPPED  # Simplified for demo; normally transitions via confirm_ship()

        self.apply_and_record(OrderItemsReserved(self.aggregate_id, self._order_id, reservation_id))

    def ship(self) -> None:
        """Mark the order as shipped and publish an event."""
        if self._status != OrderStatus.SHIPPED:
            raise RuntimeError(f"Cannot ship order in {self._status.value} state")

        def _mutator(event: Any) -> None:
            self._shipped_at = time.time()

        self.apply_and_record(OrderShipped(self.aggregate_id, self._order_id), mutator=_mutator)

    # --- Event replay (for reconstruction) ---

    def apply_event(self, event: Any) -> None:
        if isinstance(event, OrderConfirmation):
            self._order_id = event.order_id
            self._status = OrderStatus.RESERVED
        elif isinstance(event, OrderItemsReserved):
            pass  # Status transition handled in command handler for replay
        elif isinstance(event, OrderShipped):
            self._shipped_at = event.shipped_at


@dataclass(frozen=True)
class OrderConfirmation:
    """Internal event: order is confirmed and needs inventory reservation."""

    order_id: str
    sku: str
    qty: int


# --- Split Aggregate 2: InventoryAggregate (Stock Management Only) ---

class InventoryAggregate(SchemaVersionedAggregateRoot):
    """Splits from the monolithic aggregate — now handles ONLY inventory management.

    Responsibility: track stock levels, reserve items for orders, release reservations.
    Publishes InventoryReserved events that the OrderAggregate consumes.
    """

    schema_version = 1

    def __init__(self, aggregate_id: str) -> None:
        super().__init__(aggregate_id)
        self._sku: str = ""
        self._available_quantity: int = 0
        self._reserved_quantity: int = 0

    def reserve_for_order(self, order_id: str, quantity: int) -> InventoryReservation:
        """Reserve stock for an incoming order. Publishes InventoryReserved event."""
        if self.available_stock < quantity:
            raise ValueError(
                f"Insufficient stock: requested {quantity}, available {self.available_stock}"
            )

        def _mutator(event: Any) -> None:
            self._reserved_quantity += quantity

        reservation = InventoryReservation(self.aggregate_id, order_id, quantity)
        self.apply_and_record(reservation, mutator=_mutator)
        return reservation

    @property
    def available_stock(self) -> int:
        return self._available_quantity - self._reserved_quantity

    def apply_event(self, event: Any) -> None:
        if isinstance(event, InventoryReservation):
            self._reserved_quantity += event.quantity


@dataclass(frozen=True)
class InventoryReservation:
    """Internal event: inventory items reserved for an order."""

    aggregate_id: str
    order_id: str
    quantity: int


# --- ❌ BAD: Monolithic aggregate mixing two bounded concerns ---

class BadMonolithicAggregate(SchemaVersionedAggregateRoot):
    """An example of what we're splitting away from.

    This class handles BOTH order lifecycle AND inventory reservation,
    violating the single-responsibility boundary of a single aggregate.
    Cross-aggregate calls within transactions are avoided by design,
    but this class does the wrong thing internally — it manages two
    separate domains in one consistency boundary.
    """

    def __init__(self, aggregate_id: str) -> None:
        super().__init__(aggregate_id)
        self._order_status: OrderStatus = OrderStatus.PENDING
        self._sku: str = ""
        self._stock_level: int = 100

    def confirm_order_and_reduce_stock(self, sku: str, qty: int) -> None:
        """Mixes order state change AND inventory mutation in one method.

        This is the anti-pattern: two bounded concerns (order management
        and inventory management) are entangled in a single aggregate root.
        They evolve at different rates, have different concurrency patterns,
        and should be split into separate aggregates.
        """
        # ❌ Order state mutation AND inventory mutation in one transaction
        if self._stock_level < qty:
            raise ValueError("Insufficient stock")
        self._order_status = OrderStatus.RESERVED
        self._stock_level -= qty  # Inventory concern mixed with order concern

    def ship_order(self) -> None:
        """Yet another unrelated responsibility bundled in the same aggregate."""
        if self._order_status != OrderStatus.RESERVED:
            raise RuntimeError("Order not reserved")
        self._order_status = OrderStatus.SHIPPED
        # Shipping logic, tracking number generation, notification dispatch...


# --- ✅ GOOD: Inter-aggregate coordination via domain events (Saga handler) ---

class InventoryReservationSagaHandler:
    """Coordinates the two split aggregates using a saga pattern.

    This handler listens for OrderConfirmation events from OrderAggregate,
    invokes the InventoryAggregate to reserve stock, and publishes either
    InventoryReserved (success) or InventoryReservationFailed (failure).

    In production, this would be backed by an event bus or message broker.
    """

    def __init__(
        self,
        order_repo: OrderRepository,
        inventory_repo: "InventoryRepository",  # type: ignore[name-defined]
    ) -> None:
        self.order_repo = order_repo
        self.inventory_repo = inventory_repo

    def handle_order_confirmation(self, event: OrderConfirmation) -> None:
        """React to an OrderConfirmation event by reserving inventory."""
        # Load the inventory aggregate for this SKU
        inventory_agg = self.inventory_repo.load_by_sku(event.sku)

        # Attempt reservation — may raise ValueError if insufficient stock
        try:
            inventory_agg.reserve_for_order(event.order_id, event.qty)
            self.inventory_repo.save(inventory_agg)

            # Publish success event for the OrderAggregate to consume
            inventory_event = InventoryReserved(
                aggregate_id=inventory_agg.aggregate_id,
                order_id=event.order_id,
                item_sku=event.sku,
                quantity=event.qty,
            )
            self._publish_domain_event(inventory_event)

        except ValueError:
            # Handle failure: cancel the order or publish a compensation event
            self._handle_reservation_failure(event)

    def handle_inventory_reserved(self, event: InventoryReserved) -> None:
        """React to successful reservation by updating the OrderAggregate."""
        order_agg = self.order_repo.load(event.order_id)
        order_agg.handle_inventory_reserved(reservation_id=event.reservation_id)
        self.order_repo.save(order_agg)

    def _publish_domain_event(self, event: Any) -> None:
        """Publish a domain event to the event bus for other consumers."""
        pass  # In production: event_bus.publish(event.to_dict())

    def _handle_reservation_failure(self, event: OrderConfirmation) -> None:
        """Compensate for a failed inventory reservation."""
        # Load order and cancel it — different bounded context, communicated via events
        order_agg = self.order_repo.load(event.order_id)
        # ... publish OrderReservationFailed event, update status, etc.
```

---

## Constraints

### MUST DO

- Add a `version` field to every aggregate root and check it on every write — this is the baseline for optimistic concurrency control
- Store snapshots as full serialized state with schema_version metadata, never partial diffs or incremental changes
- On load: fetch the latest snapshot first, then replay only events whose sequence_number exceeds the snapshot's sequence_number
- Assign a `schema_version` integer to every aggregate and write a forward-only migration function for each version bump — never modify existing migrations, always append new ones
- Split an aggregate when it handles more than 20–30 methods or encapsulates multiple bounded concerns; use domain events (not direct calls) for inter-aggregate communication
- Never call another aggregate's public API directly from within a transaction boundary — publish domain events instead and let sagas/orchestrators handle cross-aggregate coordination
- Include the full serialized state in snapshot `to_dict()` output, including all nested entities and value objects

### MUST NOT DO

- Use pessimistic database row locks as your primary concurrency control — aggregates manage their own versioning, not the database
- Store partial snapshots (e.g., only changed fields) — they create complex merge logic and increase the chance of inconsistent reconstruction
- Mutate an aggregate's state without recording a domain event — every state change must be expressible as an immutable event
- Cross aggregate boundaries within a single transaction — each aggregate has its own consistency context; use domain events for cross-boundary communication
- Delete old snapshots before verifying that no replay needs them — retain at least the last N snapshots (configurable, default 3) and clean up in a background process

---

## Output Template

When implementing or reviewing aggregate lifecycle code, produce:

1. **Snapshot Design** — The `AggregateSnapshot` class definition with all required fields, plus the `SnapshotStore` interface with save/load/delete-before methods
2. **Concurrency Control** — The `VersionedAggregateRoot` base class with `version`, `pending_events`, and `increment_version()` methods; include the repository's version-checked `save()` method
3. **Schema Migration** — The `apply_schema_migrations()` utility function, the migration registry mapping in the repository, and at least one concrete migration function for the domain model change
4. **Split Design** — If splitting: the two resulting aggregate classes with single responsibilities, the domain event types connecting them, and the saga handler that orchestrates inter-aggregate coordination
5. **Integration Test** — A test case that loads a 100+ event aggregate from snapshot + delta replay, verifies correct state reconstruction, then applies a concurrent update that triggers `VersionConflictError`

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Foundational DDD patterns — aggregates, value objects, entities, bounded contexts, domain events (structural design) |
| `ddd-context-mapping` | Cross-bounded-context relationships — anti-corruption layers, shared kernels, conformist patterns for distributed domains |
| `event-sourcing-pattern` | Event store, event replay, projections, and the fundamental event sourcing architecture that provides the event stream |
| `cqrs-pattern` | Separation of command (write) and query (read) models — complements aggregate lifecycle by handling the read side |

---

## Live References

> Authoritative documentation links for DDD and event-sourcing patterns. The model follows markdown links at load time to resolve external references and inline content.

- [Domain-Driven Design Reference (Eric Evans, 2003)](https://domaindriven.design/book/)
- [Event Sourcing Patterns (Greg Young, Gregorio](https://eventstoredb.com/learn/patterns)
- [Microsoft Docs — CQRS Pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [Microservices.io — Saga Pattern](https://microservices.io/patterns/data/saga.html)
- [Martin Fowler — Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html)
