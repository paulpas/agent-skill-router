---
name: event-driven-patterns
description: Implements event-driven architecture patterns (pub/sub, event sourcing,
  CQRS, saga orchestration, outbox pattern) for building decoupled, scalable systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event-driven, event driven architecture, pub/sub, event sourcing, CQRS,
    saga pattern, outbox pattern, message queue, eventual consistency
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
  related-skills: microservices-patterns, architecture-decision-records, domain-driven-design,
    test-driven-development
------
# Event-Driven Architecture Patterns

Implements event-driven design patterns to build decoupled, resilient, and scalable systems. Covers the core EDA patterns — pub/sub, event sourcing, CQRS, saga orchestration, outbox pattern, and event versioning — with practical implementations and anti-patterns to avoid.

## TL;DR Checklist

- [ ] Choose the right EDA pattern for the coupling and consistency requirements
- [ ] Define typed event schemas before implementing any handlers
- [ ] Use an EventBus or message broker for inter-component communication (never direct calls between domain components)
- [ ] Make events immutable after creation — frozen dataclasses or equivalent
- [ ] Implement dead letter queues for failed event processing
- [ ] Version all event schemas and support backward-compatible evolution

---

## When to Use

Use this skill when:

- Architecting a new system that needs loose coupling between components
- Refactoring a tightly-coupled monolith toward modular, event-based communication
- Implementing audit trails or replayable state via event sourcing
- Building microservices that need eventual consistency without distributed transactions
- Designing real-time notification systems, dashboards, or live data pipelines
- Migrating from synchronous RPC calls to asynchronous event-driven flows

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications where direct function calls are simpler and faster (use straightforward synchronous patterns)
- Real-time systems requiring strict strong consistency without any lag — EDA provides eventual consistency, not linearizability
- Single-threaded batch processing with no concurrent components — the overhead of event infrastructure is unnecessary
- When all consumers can be started synchronously before producers begin — blocking initialization may be simpler

---

## Core Workflow

1. **Analyze System Boundaries** — Identify bounded contexts or service boundaries that will communicate via events. Apply the Single Responsibility Principle (SOLID): each bounded context must have exactly one reason to change. **Checkpoint:** Each boundary should have a single, unambiguous responsibility. If a context has two responsibilities, split it first.

2. **Select EDA Patterns** — Choose which patterns apply:
   - Pub/Sub → Decoupled notification delivery (multiple consumers, fire-and-forget)
   - Event Sourcing → Reconstruct state by replaying all past events
   - CQRS → Separate read and write models for independent scaling
   - Saga → Orchestrate distributed transactions across services
   - Outbox Pattern → Guarantee event delivery alongside database writes

3. **Define Event Schema** — Create typed, immutable event structures with a schema version. Follow the DRY principle: define each data element once and reuse it across all event schemas (e.g., a shared `OrderId`, `UserId` type) rather than repeating raw strings or ints in every event. **Checkpoint:** Every field must have a clear type. No `dict[str, Any]` for public-facing events.

4. **Implement EventBus / Message Broker** — Choose your transport layer:
    - In-process: Custom EventBus (small services, single process)
    - Distributed: Redis Streams, RabbitMQ, Kafka, or NATS (microservices, multi-process)
    Guideline from the Unix Philosophy: each event handler should do one thing and do it well. A handler that performs multiple unrelated side effects violates this principle and makes event flow impossible to reason about.

5. **Wire Handlers and Verify** — Register handlers for each event type. Run integration tests verifying end-to-end event flow from publish to all handler completions.

---

## Implementation Patterns

### Pattern 1: EventBus with Pub/Sub Decoupling

This pattern shows the contrast between tight coupling (direct calls) and proper pub/sub decoupling using an in-memory event bus.

```python
# ❌ BAD — Tight coupling: OrderService directly calls InventoryService, NotificationService, AnalyticsService
class OrderService_Bad:
    def __init__(self):
        self.inventory = InventoryService()
        self.notifications = NotificationService()
        self.analytics = AnalyticsService()

    def create_order(self, user_id: str, items: list[dict]) -> dict:
        order = self._create_order_record(user_id, items)
        # Direct calls — tightly coupled, hard to test, impossible to add new consumers
        self.inventory.reserve_items(order["id"], items)
        self.notifications.send_confirmation(order["user_id"], order["id"])
        self.analytics.track_order_created(order)
        return order
```

```python
# ✅ GOOD — Pub/Sub via EventBus: components communicate only through events
import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable


class EventType(str, Enum):
    ORDER_CREATED = "order.created"
    ORDER_CANCELLED = "order.cancelled"
    ORDER_UPDATED = "order.updated"


@dataclass(frozen=True)
class OrderCreatedEvent:
    """Immutable event payload — frozen prevents post-creation mutation."""
    order_id: str
    user_id: str
    items: list[dict]
    total_amount: float
    timestamp: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    @classmethod
    def from_create_request(cls, order_id: str, user_id: str, items: list[dict]) -> "OrderCreatedEvent":
        """Factory method — validates inputs before creating the event."""
        if not order_id or not user_id:
            raise ValueError("order_id and user_id are required")
        if not items:
            raise ValueError("items must not be empty")
        total = sum(item.get("quantity", 0) * item.get("price", 0) for item in items)
        return cls(order_id=order_id, user_id=user_id, items=items, total_amount=total)


class EventBus:
    """In-process pub/sub event bus with sync and async handler support."""

    def __init__(self) -> None:
        self._handlers: dict[EventType, list[Callable[[Any], None]]] = {}
        self._async_handlers: dict[EventType, list[Callable[[Any], None]]] = {}

    def subscribe(self, event_type: EventType, handler: Callable[[Any], None]) -> None:
        """Register a synchronous handler for an event type."""
        if not event_type or handler is None:
            raise ValueError("event_type and handler are required")
        self._handlers.setdefault(event_type, []).append(handler)

    async def subscribe_async(
        self, event_type: EventType, handler: Callable[[Any], None]
    ) -> None:
        """Register an asynchronous handler for an event type."""
        if not event_type or handler is None:
            raise ValueError("event_type and handler are required")
        self._async_handlers.setdefault(event_type, []).append(handler)

    def publish(self, event: Any) -> None:
        """Publish an event — dispatches to all synchronous handlers immediately."""
        if not isinstance(event, OrderCreatedEvent):
            raise TypeError(f"Unsupported event type: {type(event).__name__}")
        for handler in self._handlers.get(EventType.ORDER_CREATED, []):
            try:
                handler(event)
            except Exception:
                # Never let one handler crash others — log and continue
                import logging
                logging.exception("Sync handler failed for %s", EventType.ORDER_CREATED)

    async def publish_async(self, event: Any) -> None:
        """Publish an event — dispatches to all asynchronous handlers via the running loop."""
        if not isinstance(event, OrderCreatedEvent):
            raise TypeError(f"Unsupported event type: {type(event).__name__}")
        for handler in self._async_handlers.get(EventType.ORDER_CREATED, []):
            try:
                asyncio.create_task(handler(event))
            except Exception:
                import logging
                logging.exception("Async handler failed for %s", EventType.ORDER_CREATED)


# Usage — handlers are registered once at startup, never tightly coupled
def on_order_created_sync(event: OrderCreatedEvent) -> None:
    """Synchronous handler — runs immediately during publish()."""
    print(f"[Sync] Order {event.order_id} created for user {event.user_id}")


async def on_order_created_async(event: OrderCreatedEvent) -> None:
    """Asynchronous handler — dispatched via create_task."""
    await asyncio.sleep(0.1)  # Simulate I/O: send email, update dashboard, etc.
    print(f"[Async] Email confirmation queued for order {event.order_id}")


bus = EventBus()
bus.subscribe(EventType.ORDER_CREATED, on_order_created_sync)
asyncio.run(bus.subscribe_async(EventType.ORDER_CREATED, on_order_created_async))

event = OrderCreatedEvent.from_create_request("ORD-001", "USER-42", [{"id": "ITEM-A", "quantity": 2, "price": 29.99}])
bus.publish(event)
asyncio.run(bus.publish_async(event))
```

**Key principles demonstrated:**
- Events are **immutable** (`frozen=True` dataclass)
- Handler registration is **decoupled** from business logic
- Each handler failure is **isolated** — one bad handler cannot crash the bus
- Factory method validates inputs at event construction time (**fail fast**)

---

### Pattern 2: Event Sourcing with Snapshot Capability

Event sourcing reconstructs state by replaying all past events. Snapshots optimize read performance for frequently accessed aggregates.

```python
from uuid import UUID, uuid4
from collections import defaultdict


class AggregateSnapshot:
    """Checkpoint of aggregate state at a specific event number."""

    def __init__(self, aggregate_id: str, state: dict, snapshot_event_number: int) -> None:
        self.aggregate_id = aggregate_id
        self.state = state
        self.snapshot_event_number = snapshot_event_number


class EventStore:
    """In-memory event store with append-only log and snapshot support."""

    def __init__(self) -> None:
        # aggregate_id -> list of events in order
        self._event_log: dict[str, list[dict]] = defaultdict(list)
        # aggregate_id -> latest snapshot
        self._snapshots: dict[str, AggregateSnapshot] = {}
        self._snapshot_interval: int = 100  # Save snapshot every N events

    def append_event(self, aggregate_id: str, event_type: str, payload: dict) -> int:
        """Append an event to the store. Returns the new event number (1-indexed)."""
        event_number = len(self._event_log[aggregate_id]) + 1
        event = {
            "aggregate_id": aggregate_id,
            "event_type": event_type,
            "payload": payload,
            "event_number": event_number,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        self._event_log[aggregate_id].append(event)

        # Auto-snapshot at intervals
        if event_number % self._snapshot_interval == 0:
            self.save_snapshot(aggregate_id)

        return event_number

    def load_events(self, aggregate_id: str, from_event_number: int = 1) -> list[dict]:
        """Load events for an aggregate, starting from a given event number."""
        if aggregate_id not in self._event_log:
            return []
        return [
            e for e in self._event_log[aggregate_id]
            if e["event_number"] >= from_event_number
        ]

    def save_snapshot(self, aggregate_id: str) -> None:
        """Save a snapshot of current aggregate state. Called when the aggregate is fully reconstructed."""
        events = self.load_events(aggregate_id)
        if not events:
            return
        # State is built by replaying events — in production this comes from the aggregate's apply() method
        current_event = events[-1]
        self._snapshots[aggregate_id] = AggregateSnapshot(
            aggregate_id=aggregate_id,
            state=current_event["payload"].copy(),
            snapshot_event_number=current_event["event_number"],
        )

    def load_with_snapshot(self, aggregate_id: str) -> list[dict]:
        """Load events using the latest snapshot as a starting point."""
        if aggregate_id not in self._snapshots:
            return self.load_events(aggregate_id)

        snapshot = self._snapshots[aggregate_id]
        new_events = self.load_events(aggregate_id, from_event_number=snapshot.snapshot_event_number + 1)
        # In production: apply snapshot state first, then apply new events on top
        return [snapshot.state | {"_source": "snapshot", "event_number": snapshot.snapshot_event_number}] + new_events


# Usage example
store = EventStore()

store.append_event("cart-001", "item.added", {"item_id": "SKU-A", "quantity": 3})
store.append_event("cart-001", "item.added", {"item_id": "SKU-B", "quantity": 1})
store.append_event("cart-001", "checkout.initiated", {})

# Replay all events for reconstruction
events = store.load_events("cart-001")
for event in events:
    print(f"Event #{event['event_number']}: {event['event_type']}")
    # In production: aggregate.apply(event) would mutate state
```

**Key principles demonstrated:**
- Events are **append-only** — never modify or delete past events
- State is **derived from events**, never stored independently
- Snapshots **optimize replay** without losing the audit trail
- Every event has a **monotonically increasing number** for ordered replay

---

### Pattern 3: CQRS — Separate Read and Write Models

Command Query Responsibility Segregation separates commands (writes) from queries (reads), allowing each to scale independently.

```python
from dataclasses import dataclass
from typing import Protocol


# --- WRITE MODEL ---

@dataclass
class CreateProductCommand:
    product_id: str
    name: str
    price: float
    category: str


class ProductRepository(Protocol):
    """Write model repository — persists domain events."""

    async def save(self, product_id: str, name: str, price: float, category: str) -> None: ...
    async def exists(self, product_id: str) -> bool: ...


class ProductCommandHandler:
    """Handles write commands — validates business rules and persists to the write model."""

    def __init__(self, repository: ProductRepository, event_bus: EventBus) -> None:
        self._repo = repository
        self._bus = event_bus

    async def handle(self, command: CreateProductCommand) -> None:
        if not command.name or not command.category:
            raise ValueError("name and category are required")
        if command.price < 0:
            raise ValueError("price must be non-negative")

        await self._repo.save(command.product_id, command.name, command.price, command.category)

        # Publish event to update the read model (eventually consistent)
        bus_event = OrderCreatedEvent.from_create_request(
            order_id=command.product_id,
            user_id="system",
            items=[{"id": command.name, "quantity": 1, "price": command.price}],
        )
        self._bus.publish(bus_event)


# --- READ MODEL ---

@dataclass
class ProductView:
    product_id: str
    name: str
    price: float
    category: str


class ProductReadStore:
    """Read model store — optimized for queries, denormalized from events."""

    def __init__(self) -> None:
        self._products: dict[str, ProductView] = {}

    def upsert(self, product_id: str, name: str, price: float, category: str) -> None:
        """Upsert a product view — called by event handlers updating the read model."""
        self._products[product_id] = ProductView(
            product_id=product_id, name=name, price=price, category=category
        )

    def get_by_id(self, product_id: str) -> ProductView | None:
        return self._products.get(product_id)

    def search_by_category(self, category: str) -> list[ProductView]:
        return [p for p in self._products.values() if p.category == category]


# --- EVENT HANDLER (Read Model Side) ---

class ProductReadModelHandler:
    """Updates the read model when product events occur."""

    def __init__(self, read_store: ProductReadStore) -> None:
        self._store = read_store

    def handle_product_created(self, event: OrderCreatedEvent) -> None:
        # In production: a real domain-specific event type would be used here
        pass  # Placeholder — in reality this handles ProductCreatedEvent


# Usage
async def run_cqrs_example() -> None:
    repo = ProductRepository()  # Would be implemented against PostgreSQL/Postgres
    bus = EventBus()
    read_store = ProductReadStore()

    command_handler = ProductCommandHandler(repo, bus)
    handler = ProductReadModelHandler(read_store)

    command = CreateProductCommand("PROD-001", "Widget", 19.99, "gadgets")
    await command_handler.handle(command)

    # Read model is eventually consistent — populated by event handlers
    product = read_store.get_by_id("PROD-001")
    print(f"Read model: {product.name} @ ${product.price}")
```

**Key principles demonstrated:**
- Commands and queries are **strictly separated** — no mixed read/write methods
- The read model is **denormalized** for query performance
- Read model updates happen via **event handlers** (eventual consistency)
- Each side can be **scaled, indexed, and modeled independently**

---

### Pattern 4: Outbox Pattern for Reliable Event Delivery

The outbox pattern guarantees that an event is published only when the database transaction committing the business data succeeds. Events are stored in an "outbox" table and polled by a separate process.

```python
import threading
import time
from queue import Empty


class OutboxEntry:
    """Represents an event waiting to be published to the message broker."""

    def __init__(self, event_type: str, aggregate_id: str, payload: dict, status: str = "pending") -> None:
        self.event_type = event_type
        self.aggregate_id = aggregate_id
        self.payload = payload
        self.status = status  # pending -> published | failed

    def to_dict(self) -> dict:
        return {
            "event_type": self.event_type,
            "aggregate_id": self.aggregate_id,
            "payload": self.payload,
            "status": self.status,
        }


class DatabaseWithOutbox:
    """Simulates a database that supports transactional outbox writes."""

    def __init__(self) -> None:
        self._transactions: list[list[dict]] = []  # Each inner list = one transaction
        self._outbox: list[OutboxEntry] = []

    def execute_transaction(self, operations: list[dict]) -> None:
        """Execute all operations atomically. If any fail, none are committed."""
        try:
            for op in operations:
                if not self._simulate_db_op(op):
                    raise RuntimeError(f"DB operation failed: {op}")
            # Only commit if ALL operations succeed
            self._transactions.append(operations)
            print(f"Transaction committed with {len(operations)} operations")
        except RuntimeError as e:
            # Rollback — nothing is persisted
            print(f"Transaction rolled back: {e}")
            raise

    @staticmethod
    def _simulate_db_op(op: dict) -> bool:
        """Simulate DB operation. In production, this would be a real SQL execute."""
        return True  # Simulating success for all ops

    def add_outbox_entry(self, entry: OutboxEntry) -> None:
        """Add to outbox table — part of the same transaction as business data write."""
        self._outbox.append(entry)

    def get_pending_events(self, limit: int = 50) -> list[dict]:
        """Poll for pending events — called by the outbox poller (separate process)."""
        pending = [e.to_dict() for e in self._outbox if e.status == "pending"][:limit]
        # Mark as being processed to avoid duplicate delivery
        for entry in self._outbox:
            if entry.status == "pending" and entry.event_type in [p["event_type"] for p in pending]:
                entry.status = "processing"
        return pending

    def mark_published(self, event_type: str) -> None:
        """Mark an event as published — called by the poller after successful broker delivery."""
        for entry in self._outbox:
            if entry.event_type == event_type and entry.status == "processing":
                entry.status = "published"
                break


class OutboxPoller:
    """Background process that reads from outbox table and publishes to message broker."""

    def __init__(self, db: DatabaseWithOutbox, broker_publish_fn) -> None:
        self._db = db
        self._broker_publish = broker_publish_fn
        self._running = False

    def start(self) -> None:
        self._running = True
        thread = threading.Thread(target=self._poll_loop, daemon=True)
        thread.start()

    def stop(self) -> None:
        self._running = False

    def _poll_loop(self) -> None:
        while self._running:
            pending_events = self._db.get_pending_events()
            for event_data in pending_events:
                try:
                    self._broker_publish(event_data["event_type"], event_data["payload"])
                    self._db.mark_published(event_data["event_type"])
                    print(f"Published: {event_data['event_type']}")
                except Exception as e:
                    print(f"Failed to publish {event_data['event_type']}: {e}")
                    # Event remains in 'processing' state — will be retried next poll cycle
            time.sleep(1)  # Poll interval

    def wait(self) -> None:
        while self._running:
            time.sleep(0.5)


# Usage example
def simulate_broker_publish(event_type: str, payload: dict) -> None:
    """Simulate publishing to a message broker (Kafka, RabbitMQ, etc.)."""
    print(f"  [Broker] Published {event_type}: {payload}")


db = DatabaseWithOutbox()

# Simulate an application write that includes both business data and an outbox event
operations = [
    {"type": "INSERT", "table": "products", "data": {"id": "PROD-001", "name": "Widget"}},
]
db.execute_transaction(operations)

# Add outbox event in the SAME transaction
outbox_entry = OutboxEntry("product.created", "PROD-001", {"product_id": "PROD-001", "name": "Widget"})
db.add_outbox_entry(outbox_entry)

# The poller picks up the pending event and publishes it
poller = OutboxPoller(db, simulate_broker_publish)
poller.start()
time.sleep(1.5)  # Let poller do one cycle
poller.stop()
```

**Key principles demonstrated:**
- Event publishing is **transactional with business data** — either both succeed or neither does
- A **separate poller process** decouples event delivery from the write transaction
- Events in **"processing" state** are retried on next poll cycle (at-least-once delivery)
- The broker connection failure cannot roll back the database commit

---

### Pattern 5: Saga Orchestration for Distributed Transactions

Saga pattern coordinates long-running distributed transactions across multiple services using a sequence of compensating actions.

```python
from enum import Enum
from dataclasses import dataclass, field


class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    COMPENSATED = "compensated"


@dataclass
class OrderSagaState:
    """Tracks saga progress and enables compensation on failure."""
    order_id: str
    payment_status: PaymentStatus = PaymentStatus.PENDING
    inventory_reserved: bool = False
    shipping_scheduled: bool = False

    def is_complete(self) -> bool:
        return (
            self.payment_status == PaymentStatus.COMPLETED
            and self.inventory_reserved
            and self.shipping_scheduled
        )


class OrderSagaOrchestrator:
    """Orchestrates a multi-step saga with automatic compensation on failure."""

    def __init__(self) -> None:
        # In production: state would be persisted in a database, not in-memory dict
        self._states: dict[str, OrderSagaState] = {}

    def initiate_order(self, order_id: str) -> bool:
        """Execute all saga steps. Compensates backwards if any step fails."""
        state = OrderSagaState(order_id=order_id)
        self._states[order_id] = state
        steps = [
            ("Payment", self._process_payment),
            ("Inventory", self._reserve_inventory),
            ("Shipping", self._schedule_shipping),
        ]

        for step_name, step_fn in steps:
            print(f"  Executing: {step_name}")
            try:
                step_fn(state)
            except RuntimeError as e:
                print(f"  FAILED at {step_name}: {e}")
                self._compensate(state, reversed(steps))
                return False

        print(f"  Saga complete for order {order_id}")
        return True

    def _process_payment(self, state: OrderSagaState) -> None:
        """Simulate payment — 80% success rate."""
        import random
        if random.random() < 0.2:  # 20% failure rate for demo
            raise RuntimeError("Payment gateway timeout")
        state.payment_status = PaymentStatus.COMPLETED

    def _reserve_inventory(self, state: OrderSagaState) -> None:
        """Simulate inventory reservation — always succeeds in this demo."""
        state.inventory_reserved = True

    def _schedule_shipping(self, state: OrderSagaState) -> None:
        """Simulate shipping schedule — 50% failure rate for demo."""
        import random
        if random.random() < 0.5:  # 50% failure rate for demo
            raise RuntimeError("Shipping provider unavailable")
        state.shipping_scheduled = True

    def _compensate(self, state: OrderSagaState, completed_steps: list[tuple[str, callable]]) -> None:
        """Undo all completed steps in reverse order."""
        print(f"  Compensating order {state.order_id}...")
        for step_name, step_fn in completed_steps:
            if step_name == "Shipping" and state.shipping_scheduled:
                print(f"    Undo: Cancel shipping")
                state.shipping_scheduled = False
            elif step_name == "Inventory" and state.inventory_reserved:
                print(f"    Undo: Release inventory reservation")
                state.inventory_reserved = False
            elif step_name == "Payment" and state.payment_status == PaymentStatus.COMPLETED:
                print(f"    Undo: Refund payment")
                state.payment_status = PaymentStatus.COMPENSATED


# Usage — demonstrates compensation on failure
print("=== Running saga (may fail and compensate) ===")
orchestrator = OrderSagaOrchestrator()

for i in range(5):
    order_id = f"ORDER-{i:03d}"
    success = orchestrator.initiate_order(order_id)
    print(f"  Result: {'SUCCESS' if success else 'COMPENSATED'}\n")
```

**Key principles demonstrated:**
- Each step has a **compensating action** that reverses its effect
- Compensation runs in **reverse order** — undo the last successful step first
- The saga state is **persisted between steps** so it can resume or compensate after restart
- No distributed transactions (2PC) — each service commits independently

---

### Pattern 6: Event Versioning for Schema Evolution

Events evolve over time. This pattern provides backward-compatible event versioning that allows old consumers to process new events and vice versa.

```python
from enum import IntEnum


class SchemaVersion(IntEnum):
    V1 = 1
    V2 = 2
    V3 = 3


@dataclass(frozen=True)
class OrderEventV1:
    """Original event schema — minimal fields."""
    order_id: str
    user_id: str
    timestamp: str


@dataclass(frozen=True)
class OrderEventV2:
    """Added 'items' and 'total_amount' fields (backward-compatible additions)."""
    version: SchemaVersion = SchemaVersion.V2
    order_id: str
    user_id: str
    items: list[dict] = field(default_factory=list)
    total_amount: float = 0.0
    timestamp: str = ""


@dataclass(frozen=True)
class OrderEventV3:
    """Latest schema — added 'shipping_address' and 'payment_method'."""
    version: SchemaVersion = SchemaVersion.V3
    order_id: str
    user_id: str
    items: list[dict] = field(default_factory=list)
    total_amount: float = 0.0
    shipping_address: dict = field(default_factory=dict)
    payment_method: str = "unknown"
    timestamp: str = ""


class EventVersionRouter:
    """Routes events to the correct handler based on schema version."""

    # Version → handler mapping — each handler knows its expected schema
    _handlers: dict[SchemaVersion, callable] = {}

    @classmethod
    def register(cls, version: SchemaVersion, handler: callable) -> None:
        cls._handlers[version] = handler

    @classmethod
    def route_and_dispatch(cls, event_data: dict) -> None:
        """Detect schema version from event data and dispatch to the correct handler."""
        version = SchemaVersion(event_data.get("version", 1))
        handler = cls._handlers.get(version)
        if handler is None:
            raise ValueError(f"No handler registered for event version {version}")
        handler(event_data)


# Handler implementations — each knows its own schema
def handle_v1(event_data: dict) -> None:
    """Process V1 events — no items or total_amount."""
    order_id = event_data["order_id"]
    user_id = event_data["user_id"]
    print(f"[V1 Handler] Order {order_id} by user {user_id}")


def handle_v2(event_data: dict) -> None:
    """Process V2 events — items and total_amount available."""
    order_id = event_data["order_id"]
    user_id = event_data["user_id"]
    items = event_data.get("items", [])
    total = event_data.get("total_amount", 0.0)
    print(f"[V2 Handler] Order {order_id} by user {user_id}: {len(items)} items, ${total:.2f}")


def handle_v3(event_data: dict) -> None:
    """Process V3 events — full schema with shipping and payment."""
    order_id = event_data["order_id"]
    user_id = event_data["user_id"]
    address = event_data.get("shipping_address", {})
    payment = event_data.get("payment_method", "unknown")
    print(f"[V3 Handler] Order {order_id} by user {user_id}: ship to {address}, paid via {payment}")


# Register handlers
EventVersionRouter.register(SchemaVersion.V1, handle_v1)
EventVersionRouter.register(SchemaVersion.V2, handle_v2)
EventVersionRouter.register(SchemaVersion.V3, handle_v3)

# Demonstrate — all three versions are processed by the correct handler
old_event = {"order_id": "ORD-001", "user_id": "USER-A", "timestamp": "2026-01-01T00:00:00Z"}
mid_event = {"version": 2, "order_id": "ORD-002", "user_id": "USER-B", "items": [{"id": "X"}], "total_amount": 9.99, "timestamp": "2026-06-01T00:00:00Z"}
new_event = {"version": 3, "order_id": "ORD-003", "user_id": "USER-C", "items": [{"id": "Y"}], "total_amount": 49.99, "shipping_address": {"city": "Portland"}, "payment_method": "stripe", "timestamp": "2026-12-01T00:00:00Z"}}

EventVersionRouter.route_and_dispatch(old_event)
EventVersionRouter.route_and_dispatch(mid_event)
EventVersionRouter.route_and_dispatch(new_event)
```

**Key principles demonstrated:**
- Each version is a **separate, frozen dataclass** — never mutate existing schemas
- Version field is the **first field** in each schema for easy detection
- Handlers are **isolated per version** — no conditional logic inside handlers
- New fields are always **optional with defaults** — old consumers won't break on unknown fields

---

## Constraints

### MUST DO
- Follow the Single Responsibility Principle (SOLID): each event handler must handle exactly one concern — if a handler performs multiple unrelated side effects, split it into separate handlers for distinct events
- Make all event dataclasses immutable (`frozen=True` or equivalent) to prevent post-creation mutation
- Define explicit event schemas — never use `dict[str, Any]` for events that cross service boundaries
- Implement dead letter queues for events that fail processing after the maximum retry count (typically 3 retries)
- Add correlation IDs and trace IDs to every event payload for end-to-end debugging
- Version all event schemas with a monotonically increasing version number as the first field
- Log every event publish, handler invocation, and failure — never silently drop events
- Test event replay: verify that replaying stored events from an empty store produces identical state

### MUST NOT DO
- Use synchronous RPC calls between components that should communicate via events — this creates tight coupling
- Mutate event payloads inside handlers — handlers receive immutable events and produce side effects only
- Skip event versioning — unversioned schemas will break consumers when new fields are added
- Bypass error handling in event handlers — one handler's exception must never stop other handlers from receiving the event
- Store derived state independently of events (event sourcing) — if you use event sourcing, state is always reconstructed from events

---

## Output Template

When implementing or reviewing an event-driven architecture, produce:

1. **Pattern Selection** — Which EDA patterns apply and why (pub/sub for notifications, event sourcing for audit trails, etc.)
2. **Event Schema Definitions** — Typed dataclasses or Pydantic models with version field, validation, and factory methods
3. **EventBus / Transport Choice** — In-process EventBus vs. distributed broker (Kafka, RabbitMQ, Redis Streams) with justification
4. **Handler Registry** — Complete list of event types and their sync/async handlers, including error isolation strategy
5. **Consistency Model** — Document whether the system uses eventual consistency, and which guarantees are required at each boundary

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservices-patterns` | Complements EDA with microservice decomposition strategies |
| `domain-driven-design` | Bounded contexts define natural event boundaries |
| `architecture-decision-records` | Documents why a specific EDA pattern was chosen over alternatives |
| `test-driven-development` | Test strategies for event-driven systems (integration, contract, replay tests) |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Event-Driven Computing — AWS Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/event-driven-computing/introduction.html)
- [Kafka Event Streaming Documentation](https://kafka.apache.org/documentation/)
- [RabbitMQ Events and Messaging Guide](https://www.rabbitmq.com/tutorials/tutorial-one-python)
- [Event Sourcing vs Event-Driven Architecture (ThoughtWorks)](https://www.thoughtworks.com/insights/articles/event-sourcing-vs-event-driven-architecture)
- [Asynchronous Cloud Architectures with Amazon SQS and SNS](https://docs.aws.amazon.com/AmazonS3/latest/dev/notify-events.html)
