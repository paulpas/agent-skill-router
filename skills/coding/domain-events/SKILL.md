---
name: domain-events
description: Implements domain events for decoupled communication between aggregates and bounded contexts — event definition, publishing, handling, idempotency, and lifecycle management with typed Python implementations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: domain events, domain event, event publishing, event handler, event dispatcher, in-process event bus, how do i decouple aggregates, idempotent event handling
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, event-sourcing-pattern, event-driven-architecture
---

# Domain Events

Implements domain events as a tactical DDD pattern for decoupled communication between aggregates, bounded contexts, and application services. Produces immutable past-tense event definitions, typed event registries, in-process dispatchers with error handling strategies, and idempotent handlers that safely process duplicate deliveries without side effects.

## TL;DR Checklist

- [ ] Define events as frozen dataclasses with NounVerbPastTense naming (e.g., `OrderCreated`, not `OrderCreate`)
- [ ] Include required metadata on every event: `occurred_at`, `aggregate_id`, and optionally `correlation_id` / `causation_id`
- [ ] Publish events AFTER mutating state — never before, never in a separate pre-flight check
- [ ] Ensure the publisher has zero knowledge of who subscribes to its events (Open/Closed Principle)
- [ ] Make every event handler idempotent: processing the same event twice must yield the same observable result
- [ ] Decide error strategy upfront — fail-fast (rollback everything) or continue (log and compensate later)
- [ ] Use the Outbox pattern for cross-context events to guarantee delivery

---

## When to Use

Use this skill when:

- An aggregate needs to notify other parts of the system about a state change without creating a direct dependency
- Multiple bounded contexts need to react to the same domain fact (e.g., `OrderCreated` triggers inventory reservation, notification sending, and analytics tracking)
- You are decoupling application services from domain model internals so that new handlers can be added without modifying existing code
- Building an event-driven architecture within a single bounded context using in-process event buses
- Implementing CQRS or Event Sourcing where events are the authoritative source of truth

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD operations with no downstream reactions — the overhead of event infrastructure is not justified when one service handles everything
- Synchronous, real-time communication requirements where the caller must wait for all side effects to complete before returning (use direct method calls or RPC instead)
- Cross-service communication that requires guaranteed delivery over network boundaries without the Outbox pattern — use a proper message broker (RabbitMQ, Kafka) with persistence guarantees
- Event naming where the past-tense convention does not apply — if you cannot describe what happened as a completed fact, it is not a domain event

---

## Core Workflow

1. **Define the Domain Event** — Create an immutable frozen dataclass named in NounVerbPastTense (e.g., `ItemAdded`, `OrderCancelled`). Include all data needed by downstream handlers so they never have to query the aggregate. Add standard metadata (`occurred_at`, `aggregate_id`). **Checkpoint:** Every event field must be necessary for at least one handler — if no handler uses it, remove it to keep the event lean.

2. **Register Events with the Dispatcher** — Build a registry that maps each event type (by class name) to a list of registered handlers. The dispatcher owns this mapping; aggregates and application services never maintain their own subscriptions. **Checkpoint:** After registration, verify that `dispatcher.get_handlers(OrderCreated)` returns exactly the expected handler functions or methods.

3. **Publish Events After State Mutation** — When an aggregate or domain service changes state, call the event publisher with the newly created event object. The publisher routes it to all registered handlers synchronously (in-process) or enqueues it (cross-context). **Checkpoint:** If publishing raises an unhandled exception, the aggregate's state mutation has already happened — decide whether this is acceptable for your error strategy.

4. **Execute Handlers with the Chosen Error Strategy** — Determine at dispatcher construction time: should a handler failure roll back all other handlers' work (fail-fast), or should it log the error and continue dispatching remaining handlers (continue-and-compensate)? Apply this consistently across all event types. **Checkpoint:** For fail-fast mode, verify that state changes made by earlier handlers are rolled back (via transactions or compensating actions) before re-raising the original exception.

5. **Ensure Idempotency on All Handlers** — Every handler must safely handle receiving the same event more than once. Use the event's `correlation_id` as an idempotency key, store processed IDs in a deduplication store (in-memory set for tests, Redis/SQL for production), and skip duplicate processing without errors. **Checkpoint:** Process the identical event object through the handler twice — the second invocation must produce no additional side effects.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Event Definition and Registry

Domain events are immutable records of facts that happened in the past. They carry all the contextual data downstream handlers need so those handlers never have to reach back into the aggregate for information. Naming follows `NounVerbPastTense` (e.g., `OrderCreated`, `PaymentReceived`, `ItemRemoved`) to make clear these describe completed events, not pending actions.

Every event inherits from a base `DomainEvent` that standardizes metadata: `occurred_at` timestamp, `aggregate_id` identifying the originating aggregate root, and optional `correlation_id` (shared across a business transaction spanning multiple aggregates) and `causation_id` (ID of the command or prior event that triggered this one).

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Protocol


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events. Immutable, past-tense named facts."""
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    aggregate_id: str = ""

    @property
    def event_name(self) -> str:
        """The class name used as the routing key in the event registry."""
        return self.__class__.__name__


@dataclass(frozen=True)
class OrderCreated(DomainEvent):
    order_id: str
    customer_email: str
    item_count: int
    total_amount: float


@dataclass(frozen=True)
class ItemAdded(DomainEvent):
    order_id: str
    product_id: str
    quantity: int


@dataclass(frozen=True)
class PaymentReceived(DomainEvent):
    order_id: str
    amount: float
    payment_method: str


# ❌ BAD: Mutable event — state can change after creation, breaking audit trails
class BadDomainEvent:
    def __init__(self, name: str, data: dict[str, Any]) -> None:
        self.name = name          # Mutable — can be reassigned
        self.data = data          # Mutable dict — handlers cannot trust contents
        self.occurred_at = None   # Lazy initialization is ambiguous

    @property
    def event_name(self) -> str:
        return self.name          # Could change between creation and processing


# ✅ GOOD: Frozen dataclass with value equality — events are immutable facts
@dataclass(frozen=True)
class OrderConfirmed(DomainEvent):
    order_id: str
    customer_email: str
    item_count: int
    total_amount: float

    # Value equality works correctly: two identical event objects compare equal
    assert OrderConfirmed(
        aggregate_id="ORD-123",
        occurred_at=datetime(2026, 5, 20, tzinfo=timezone.utc),
        order_id="ORD-123",
        customer_email="alice@example.com",
        item_count=3,
        total_amount=99.97,
    ) == OrderConfirmed(
        aggregate_id="ORD-123",
        occurred_at=datetime(2026, 5, 20, tzinfo=timezone.utc),
        order_id="ORD-123",
        customer_email="alice@example.com",
        item_count=3,
        total_amount=99.97,
    )


# Registry: maps event type names to lists of callable handlers.
class EventHandler(Protocol):
    """Any callable that accepts a DomainEvent and returns None."""
    def __call__(self, event: DomainEvent) -> None: ...


class EventRegistry:
    """Maps event types (by name) to handler callables. Owned by the dispatcher."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}

    def register(self, event_type: type[DomainEvent], handler: EventHandler) -> None:
        """Register a handler for a specific event type."""
        name = event_type.__name__
        if name not in self._handlers:
            self._handlers[name] = []
        self._handlers[name].append(handler)

    def get_handlers(self, event: DomainEvent) -> list[EventHandler]:
        """Return all handlers registered for the given event. Returns empty list if none."""
        return list(self._handlers.get(event.event_name, []))

    def has_handler_for(self, event_type: type[DomainEvent]) -> bool:
        return event_type.__name__ in self._handlers


# ❌ BAD: Handler registry scattered across aggregates — violates Open/Closed Principle
class BadAggregateWithOwnRegistry:
    def __init__(self) -> None:
        self.subscribers: list[Any] = []  # Aggregate manages its own subscriptions

    def subscribe(self, subscriber: Any) -> None:
        self.subscribers.append(subscriber)  # New subscriber requires modifying aggregate


# ✅ GOOD: Central registry owned by the dispatcher — aggregates just publish
registry = EventRegistry()
inventory_handler = lambda e: print(f"Reserve inventory for {e.order_id}")
analytics_handler = lambda e: print(f"Track analytics for order {e.order_id}")

registry.register(OrderCreated, inventory_handler)
registry.register(OrderCreated, analytics_handler)
# Aggregates never touch this registry — they only call dispatcher.publish()
```

### Pattern 2: Event Publisher / Dispatcher

The dispatcher is the sole mediator between event publishers and handlers. Publishers (aggregates or domain services) call `publish(event)` without knowing who handles the event. Handlers are decoupled because they know nothing about what triggered their event — they only react to facts that happened.

Two dispatch strategies exist: **in-process** (all handlers run synchronously in the same thread, same transaction boundary) and **cross-context** (events are persisted via the Outbox pattern and consumed asynchronously by other bounded contexts). The dispatcher supports both by accepting an error-handling strategy at construction time.

Error handling is the critical decision point:
- **Fail-fast**: A handler exception rolls back all work — earlier handlers' side effects must be undone, typically via a database transaction rollback. This guarantees consistency but loses partial progress.
- **Continue-and-compensate**: Failed handlers are logged; remaining handlers still execute. Compensation happens asynchronously (e.g., sending a recovery notification). This maximizes throughput but requires explicit compensating actions for failed work.

```python
from __future__ import annotations

import logging
from enum import Enum
from typing import Callable


logger = logging.getLogger(__name__)


class ErrorStrategy(Enum):
    """How the dispatcher handles handler failures."""
    FAIL_FAST = "fail_fast"          # Roll back everything on first failure
    CONTINUE_AND_COMPENSATE = "continue"  # Log and keep going


class EventDispatcher:
    """Routes events from publishers to registered handlers.

    Aggregates and application services call `publish()` without knowing who handles
    the event. This enforces the Open/Closed Principle — new handlers can be added
    without modifying any existing publisher code.
    """

    def __init__(self, registry: EventRegistry, error_strategy: ErrorStrategy = ErrorStrategy.FAIL_FAST) -> None:
        self._registry = registry
        self._error_strategy = error_strategy
        self._published_events: list[DomainEvent] = []  # For testing / auditing

    def publish(self, event: DomainEvent) -> None:
        """Publish an event to all registered handlers.

        If error_strategy is FAIL_FAST, any handler exception stops dispatch
        and the original exception is re-raised after rolling back earlier work.
        If CONTINUE_AND_COMPENSATE, failed handlers are logged and remaining
        handlers still execute.
        """
        handlers = self._registry.get_handlers(event)

        if not handlers:
            logger.warning("No handlers registered for event %s", event.event_name)
            return

        handler_results: list[Exception | None] = []

        for handler in handlers:
            try:
                handler(event)
                handler_results.append(None)
            except Exception as exc:
                handler_results.append(exc)
                logger.error(
                    "Handler %s failed for event %s: %s",
                    handler.__name__ if hasattr(handler, "__name__") else repr(handler),
                    event.event_name,
                    exc,
                    exc_info=True,
                )

                if self._error_strategy == ErrorStrategy.FAIL_FAST:
                    # Roll back all previously successful handlers before re-raising
                    self._compensate(event, handler_results)
                    raise RuntimeError(
                        f"Event dispatch failed for {event.event_name}: "
                        f"{sum(1 for r in handler_results if r is None)} succeeded, "
                        f"{sum(1 for r in handler_results if r is not None)} failed"
                    ) from exc

        self._published_events.append(event)

    def _compensate(self, event: DomainEvent, results: list[Exception | None]) -> None:
        """Rollback all successfully executed handlers before this one failed.

        In a production system, compensation typically means running inverse
        operations in reverse order and/or rolling back a database transaction.
        For demonstration, we log each rollback attempt.
        """
        # In real code, you'd use a unit of work / transaction manager here.
        for i, result in enumerate(results):
            if result is None:  # This handler succeeded — compensate it
                logger.info("Compensating previously successful handler at index %d", i)


# ❌ BAD: Publisher directly calls handlers — tight coupling, no dispatch control
class BadPublisher:
    def __init__(self) -> None:
        self.handlers: list[Callable] = []  # Publisher knows about handlers

    def publish(self, event: DomainEvent) -> None:
        for handler in self.handlers:
            handler(event)  # No error isolation — one failure corrupts all others


# ✅ GOOD: Dispatcher owns routing, aggregates just call publish()
registry = EventRegistry()
dispatcher = EventDispatcher(registry, ErrorStrategy.FAIL_FAST)

def reserve_inventory(event: DomainEvent) -> None:
    if isinstance(event, OrderCreated):
        print(f"Reserving inventory for order {event.order_id}")

def send_confirmation_email(event: DomainEvent) -> None:
    if isinstance(event, OrderCreated):
        print(f"Sending confirmation to {event.customer_email}")

registry.register(OrderCreated, reserve_inventory)
registry.register(OrderCreated, send_confirmation_email)

# Aggregate publishes — it does not know about reserve_inventory or send_confirmation_email
order_event = OrderCreated(
    aggregate_id="ORD-123",
    order_id="ORD-123",
    customer_email="alice@example.com",
    item_count=2,
    total_amount=49.98,
)
dispatcher.publish(order_event)
```

### Pattern 3: Idempotent Event Handler with Deduplication

Domain events can be delivered more than once due to network retries, crash recovery during asynchronous processing, or duplicate outbox entries. Every handler MUST be idempotent — the same event processed twice must produce exactly the same observable result as being processed once. This is achieved through an idempotency key (typically the `correlation_id`) and a deduplication store that tracks which events have already been processed.

For in-process handlers, a simple set of seen IDs suffices. For cross-context / outbox consumers, use Redis with TTL or a SQL table with unique constraints on the correlation ID. The handler checks the deduplication store before processing; if the event is already present, it returns immediately without performing any side effects.

```python
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Set


logger = logging.getLogger(__name__)


class IdempotencyStore:
    """Tracks processed event correlation IDs to prevent duplicate handling.

    For in-process use: pass an instance of this class (uses an in-memory set).
    For cross-context / production use: replace with a Redis-backed or SQL-backed
    implementation that persists across process restarts.
    """

    def __init__(self, ttl_seconds: int = 3600) -> None:
        self._processed_ids: dict[str, datetime] = {}
        self._ttl_seconds = ttl_seconds

    def is_processed(self, correlation_id: str) -> bool:
        """Return True if this event has already been processed."""
        if correlation_id not in self._processed_ids:
            return False
        # Expire stale entries
        last_seen = self._processed_ids[correlation_id]
        if datetime.now(timezone.utc) - last_seen > __import__("datetime").timedelta(seconds=self._ttl_seconds):
            del self._processed_ids[correlation_id]
            return False
        return True

    def record_processed(self, correlation_id: str) -> None:
        """Mark this event as processed."""
        self._processed_ids[correlation_id] = datetime.now(timezone.utc)


def make_idempotent_handler(
    handler: EventHandler,
    dedup_store: IdempotencyStore | None = None,
) -> EventHandler:
    """Wrap any handler with idempotency checks.

    If the event has a non-empty correlation_id and that ID is already in the
    deduplication store, the original handler is never called — returning None
    immediately instead. This guarantees exactly-once semantics for handlers
    even when events are delivered multiple times.
    """
    if dedup_store is None:
        dedup_store = IdempotencyStore()

    def wrapper(event: DomainEvent) -> None:
        correlation_id = getattr(event, "correlation_id", None)

        # If no correlation_id on the event, skip idempotency check
        if not correlation_id:
            handler(event)
            return

        if dedup_store.is_processed(correlation_id):
            logger.info(
                "Skipping duplicate event %s with correlation_id=%s",
                event.event_name,
                correlation_id,
            )
            return

        handler(event)
        dedup_store.record_processed(correlation_id)

    return wrapper


# ✅ GOOD: Idempotent handler for inventory reservation
inventory_dedup = IdempotencyStore()

def _reserve_inventory_impl(event: DomainEvent) -> None:
    if isinstance(event, OrderCreated):
        print(f"[INVENTORY] Reserving {event.item_count} items for order {event.order_id}")
        # In production: call inventory_service.reserve(order_id=event.order_id, ...)


reserve_inventory_handler = make_idempotent_handler(_reserve_inventory_impl, inventory_dedup)

# ✅ GOOD: Idempotent handler for email notifications
email_dedup = IdempotencyStore()

def _send_confirmation_impl(event: DomainEvent) -> None:
    if isinstance(event, OrderCreated):
        print(f"[EMAIL] Sending confirmation to {event.customer_email}")
        # In production: call notification_service.send(...)

send_confirmation_handler = make_idempotent_handler(_send_confirmation_impl, email_dedup)


# ❌ BAD: Non-idempotent handler — duplicates cause double-charging or double-reservation
def bad_order_handler(event: DomainEvent) -> None:
    """This handler causes damage if called twice with the same event."""
    if isinstance(event, OrderCreated):
        charge_customer(event.customer_email, event.total_amount)  # Charged twice!
        reserve_inventory(event.order_id, event.item_count)         # Reserved twice!


def charge_customer(email: str, amount: float) -> None:
    print(f"Charging {email} ${amount}")

def reserve_inventory(order_id: str, count: int) -> None:
    print(f"Reserving {count} items for {order_id}")


# Demonstration: same event processed twice with idempotent handler — only one charge
print("=== With idempotent handlers (correct) ===")
first_event = OrderCreated(
    occurred_at=datetime(2026, 5, 20, tzinfo=timezone.utc),
    aggregate_id="ORD-123",
    correlation_id="corr-abc-789",  # Shared ID for the business transaction
    order_id="ORD-123",
    customer_email="alice@example.com",
    item_count=2,
    total_amount=49.98,
)

registry = EventRegistry()
dispatcher = EventDispatcher(registry, ErrorStrategy.CONTINUE_AND_COMPENSATE)
inventory_dedup = IdempotencyStore()
email_dedup = IdempotencyStore()

registry.register(OrderCreated, make_idempotent_handler(_reserve_inventory_impl, inventory_dedup))
registry.register(OrderCreated, make_idempotent_handler(_send_confirmation_impl, email_dedup))

dispatcher.publish(first_event)   # Processes normally
dispatcher.publish(first_event)   # Skipped — same correlation_id already recorded

print("=== Without idempotency (broken — would double-charge) ===")
registry2 = EventRegistry()
bad_dispatcher = EventDispatcher(registry2, ErrorStrategy.CONTINUE_AND_COMPENSATE)
registry2.register(OrderCreated, bad_order_handler)
bad_dispatcher.publish(first_event)
bad_dispatcher.publish(first_event)  # Second call damages the customer!
```

### Pattern 4: Cross-Context Events with Outbox Pattern

When events must cross bounded context boundaries, in-process dispatching is insufficient because other contexts may be running as separate services. The Outbox pattern guarantees delivery by persisting events atomically with the domain state change within a single database transaction. An outbox consumer (separate process or background job) reads un-sent outbox rows and publishes them to a message broker or API endpoint.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum as PyEnum


@dataclass(frozen=True)
class OutboxMessage(DomainEvent):
    """An event persisted in the outbox table, awaiting delivery to another context."""
    correlation_id: str = ""
    causation_id: str = ""
    source_context: str = ""        # Which bounded context published this event
    payload: dict[str, object] = field(default_factory=dict)

    @property
    def status(self) -> OutboxStatus:
        return OutboxStatus.PENDING


class OutboxStatus(PyEnum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"


# In production, you would use an ORM model like this (illustrative):
#
# class OutboxEntry(Base):
#     __tablename__ = "outbox"
#     id: Mapped[str] = mapped_column(primary_key=True)
#     event_type: Mapped[str]
#     payload_json: Mapped[str]  # JSON-serialized event data
#     occurred_at: Mapped[datetime]
#     status: Mapped[OutboxStatus] = OutboxStatus.PENDING
#     source_context: Mapped[str]
#     correlation_id: Mapped[str | None]


def persist_event_in_outbox(
    event: DomainEvent,
    source_context: str,
) -> OutboxMessage:
    """Convert an in-domain event into an outbox message for cross-context delivery.

    This is called within the same database transaction that persists the aggregate's
    state change — ensuring atomicity. An outbox consumer process later reads un-sent
    outbox rows and publishes them externally.
    """
    payload = {k: v for k, v in event.__dict__.items() if k != "occurred_at" and k != "aggregate_id"}

    return OutboxMessage(
        occurred_at=event.occurred_at,
        aggregate_id=event.aggregate_id,
        correlation_id=getattr(event, "correlation_id", ""),
        causation_id=getattr(event, "causation_id", ""),
        source_context=source_context,
        payload=payload,
    )


# Example: Order context publishes to Inventory and Notification contexts
order_event = OrderCreated(
    aggregate_id="ORD-123",
    order_id="ORD-123",
    customer_email="bob@example.com",
    item_count=1,
    total_amount=29.99,
)

outbox_entry = persist_event_in_outbox(order_event, source_context="order-context")
# In production: INSERT INTO outbox (id, event_type, payload_json, status, ...) VALUES (...)
# This happens in the SAME transaction that saves the Order aggregate to the database.
# If the transaction rolls back, the outbox entry is rolled back too — zero phantom events.
```

---

## Constraints

### MUST DO
- **Name every event in NounVerbPastTense** — `OrderCreated`, `ItemRemoved`, `PaymentReceived`. These are facts about what already happened, not instructions for what should happen. Past-tense naming prevents confusion between events and commands.
- **Make all event dataclasses frozen** — use `@dataclass(frozen=True)` to enforce immutability at the type level. Events represent historical facts; mutating them after creation corrupts audit trails and makes debugging impossible.
- **Include standard metadata on every event** — `occurred_at` (UTC timestamp), `aggregate_id`, and optionally `correlation_id` and `causation_id`. These fields enable event tracing, ordering, and deduplication across the entire system.
- **Publish events AFTER state mutation** — always mutate aggregate state first, then call `publish(event)`. If publishing fails, the state change has already happened — handle this via compensation or transaction rollback. Never publish before mutating (you would create phantom events).
- **Keep handlers idempotent** — every handler must safely process the same event twice without producing duplicate side effects. Use the event's `correlation_id` as an idempotency key and track processed IDs in a deduplication store.
- **Decide error strategy at dispatcher construction time** — choose FAIL_FAST (rollback everything) or CONTINUE_AND_COMPENSATE (log and proceed) once, then apply it consistently across all event types. Document the decision.

### MUST NOT DO
- **Let aggregates manage their own subscriptions** — aggregates should never maintain lists of subscribers or call handlers directly. The dispatcher owns the registry; aggregates only call `publish()`. This enforces the Open/Closed Principle: you can add new handlers without modifying existing aggregate code.
- **Put business logic inside event handlers that duplicates aggregate invariants** — if a handler checks "does this order have items?" that check belongs in the aggregate's constructor or methods. Handlers should react to facts, not re-validate the aggregate's internal state.
- **Use domain events for synchronous inter-method communication within the same aggregate** — if method A needs data from method B, call B directly. Events are for cross-boundary communication, not for organizing code flow within a single aggregate's lifecycle.
- **Omit correlation_id when events span multiple aggregates in one business transaction** — if `OrderCreated` triggers `InventoryReserved` which triggers `NotificationSent`, all three events should share the same `correlation_id` to enable tracing and debugging.
- **Allow handlers to modify the event object** — events are immutable frozen dataclasses. Handlers that need to transform event data should create new objects rather than mutating the event in place. Mutation breaks idempotency guarantees.

---

## Output Template

When applying this skill, produce:

1. **Event Definitions** — Frozen dataclasses for each domain event with NounVerbPastTense naming, carrying all necessary contextual data plus standard metadata (`occurred_at`, `aggregate_id`, `correlation_id`/`causation_id` when applicable).

2. **Event Registry + Dispatcher** — An `EventRegistry` that maps event type names to handler lists, paired with an `EventDispatcher` that routes events to handlers using the chosen error strategy (`FAIL_FAST` or `CONTINUE_AND_COMPENSATE`).

3. **Idempotency Wrappers** — Handlers wrapped with deduplication logic using `correlation_id` as the idempotency key. Include an in-memory `IdempotencyStore` for in-process use and note the production replacement (Redis/SQL).

4. **Cross-Context Support** — If events cross bounded context boundaries, include the Outbox pattern: an `OutboxMessage` dataclass and a persistence function that stores events atomically with domain state changes.

All code must use Python 3.10+ type hints, docstrings on every public method, and follow SOLID principles — specifically Open/Closed (new handlers require no publisher changes) and Single Responsibility (publishers publish, handlers react).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD patterns including aggregates, value objects, and bounded contexts — domain events are a tactical DDD pattern defined within this skill's scope |
| `event-sourcing-pattern` | Event Sourcing uses domain events as the authoritative data store — this skill handles the event publishing/handling mechanics that Event Sourcing builds upon |
| `event-driven-architecture` | System-level architecture using asynchronous message brokers and event streaming — extends in-process domain events to distributed cross-service communication |

> 📖 skill(local cache): coding-domain-events, coding-clean-architecture, coding-cqrs-pattern, trading-order-lifecycle-engine