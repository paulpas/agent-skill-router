---




name: observer-pattern
description: Implements the GoF Observer pattern for decoupled event-driven architecture in Python using ABC-based subjects, weakref-based subscriptions, async observers with asyncio.create_task, and structured event dataclasses.
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
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: observer pattern, event-driven architecture, pub sub in python, how do i implement event notification, weakref observer, async observer pattern, decoupled event system
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: strategy-pattern, command-pattern, behavioral-design-patterns, event-driven-architecture




---





# Observer Pattern

Senior Python engineer implementing the Observer pattern as the foundation of event-driven architecture. This skill makes the model create decoupled notification systems using ABC-based subject/observable interfaces, weakref subscriptions to prevent memory leaks, async observers with `asyncio.create_task`, and structured event dataclasses for typed payloads.

## TL;DR Checklist

- [ ] Define Subject as an ABC with `subscribe()`, `unsubscribe()`, and `notify()` methods
- [ ] Use `weakref.ref` or `weakref.WeakSet` for subscriber storage to prevent memory leaks
- [ ] Wrap observer callbacks in `try/except` to prevent one failing callback from breaking the chain
- [ ] Use `asyncio.create_task` for async observers so notification is non-blocking
- [ ] Define event payloads as `@dataclass(frozen=True)` for immutable, hashable events

---

## When to Use

Use this skill when:

- Multiple components need to react to state changes without knowing about each other directly
- You are building an event bus or pub/sub system where publishers and subscribers are decoupled
- UI components need to update when underlying data models change (model-view binding)
- A service needs to broadcast events (order placed, user registered) to multiple downstream listeners
- You need to implement a notification system with pluggable handlers that can be added at runtime

---

## When NOT to Use

Avoid this skill for:

- Simple callbacks where only one listener exists — use direct function calls instead
- High-frequency events where notification overhead matters (use lock-free queues or ring buffers)
- Event ordering is critical and must be strictly sequential across all listeners (async fire-and-forget breaks ordering)
- You need request-response semantics — use Command pattern with a receiver instead

---

## Core Workflow

1. **Define the Event Dataclass** — Create frozen dataclasses for each event type. Each event carries its own typed payload. Frozen events prevent mutation after creation and are hashable, making them suitable for caching and deduplication. **Checkpoint:** Every field should be typed; use `Optional` only when a field may genuinely be absent.

2. **Define the Subject ABC** — Create an abstract base class with `subscribe()`, `unsubscribe()`, and `notify()` methods. The subject holds weakrefs to observers. Using `WeakSet` automatically removes dead references. **Checkpoint:** Verify that unsubscribing works correctly and that observer callbacks receive the event object, not raw arguments.

3. **Implement Weakref-Based Storage** — Use `weakref.WeakSet` or `weakref.ref` to store subscribers. This prevents memory leaks when observers go out of scope but are still referenced in the subject's list. **Checkpoint:** Test that observers are garbage collected properly after they are no longer referenced elsewhere.

4. **Add Exception Isolation** — Wrap each observer callback invocation in a `try/except` block so one failing observer cannot prevent other observers from receiving the event. Log failures separately. **Checkpoint:** No observer failure should cause partial notification — all subscribed observers must be called for every event.

5. **Support Async Observers** — Detect whether an observer is a coroutine function using `asyncio.iscoroutinefunction()`. If so, schedule it with `asyncio.create_task()` to avoid blocking the notification thread. **Checkpoint:** Ensure async tasks are tracked (store in a set) and awaited on shutdown to prevent task cancellation warnings.

6. **Provide Filtering Support** — Implement optional event type filtering so observers can subscribe to specific event types only. The subject dispatches each event to all matching subscribers. **Checkpoint:** Type-based filtering must be O(1) lookup, not linear scan of all events.

---

## Implementation Patterns

### Pattern 1: ABC-Based Observer with Weakrefs (Core Structure)

This is the canonical Observer pattern with Python's `weakref` module preventing memory leaks from stale observer references.

```python
import weakref
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Protocol


class EventType(Enum):
    """Enumeration of all event types in the system."""
    USER_CREATED = "user_created"
    USER_UPDATED = "user_updated"
    ORDER_PLACED = "order_placed"
    ORDER_SHIPPED = "order_shipped"
    PAYMENT_RECEIVED = "payment_received"


@dataclass(frozen=True)
class Event:
    """Immutable event payload that observers receive.

    Frozen ensures the event cannot be mutated after creation,
    preventing side effects in observer callbacks.
    """
    event_type: EventType
    payload: dict
    timestamp: float = field(compare=False, repr=False)

    def __post_init__(self) -> None:
        if not isinstance(self.payload, dict):
            raise TypeError("Event payload must be a dict")


class Observer(Protocol):
    """Protocol for objects that observe events."""

    def on_event(self, event: Event) -> None:
        """Handle an event notification.

        Args:
            event: The immutable event data to process.
        """
        ...


class Subject(ABC):
    """Abstract subject that manages observer subscriptions and notifications.

    Uses weakref.WeakSet internally so observers that go out of scope
    are automatically removed without explicit unsubscribe calls.
    """

    def __init__(self) -> None:
        # WeakSet automatically drops references to garbage-collected observers
        self._observers: weakref.WeakSet[Observer] = weakref.WeakSet()

    def subscribe(self, observer: Observer) -> None:
        """Register an observer for event notifications.

        Args:
            observer: Object implementing the Observer protocol with on_event().
        """
        if not hasattr(observer, "on_event") or not callable(getattr(observer, "on_event")):
            raise TypeError(f"{type(observer).__name__} does not implement on_event()")
        self._observers.add(observer)

    def unsubscribe(self, observer: Observer) -> None:
        """Remove an observer from event notifications.

        Args:
            observer: The observer to remove.
        """
        self._observers.remove(observer)

    @abstractmethod
    def notify(self, event_type: EventType, payload: dict) -> None:
        """Notify all subscribed observers of a new event.

        Each observer's on_event() is called in a try/except block so
        one failure does not prevent other observers from receiving the event.

        Args:
            event_type: The type of event being published.
            payload: Key-value data associated with the event.
        """
        ...
```

### Pattern 2: Concrete Subject with Exception Isolation (BAD vs. GOOD)

The BAD approach calls observers directly without error handling, so a single bad observer crashes notification for everyone. The GOOD approach isolates each call and logs failures separately.

```python
import time
import logging
from typing import Any


logger = logging.getLogger(__name__)


# ❌ BAD — No exception isolation; one failing observer breaks all others
class BadSubject(Subject):
    """Broken subject that crashes notification on any observer failure."""

    def __init__(self) -> None:
        super().__init__()

    def notify(self, event_type: EventType, payload: dict) -> None:
        event = Event(event_type=event_type, payload=payload, timestamp=time.time())
        # No try/except — if observer1 raises, observer2 never runs!
        for observer in self._observers:
            observer.on_event(event)


# ✅ GOOD — Exception isolation ensures all observers are notified
class GoodSubject(Subject):
    """Robust subject that isolates observer exceptions and logs failures."""

    def notify(self, event_type: EventType, payload: dict) -> None:
        """Notify all observers with exception isolation.

        Each observer runs in its own try/except block so failures are
        logged but do not prevent other observers from receiving the event.

        Args:
            event_type: The type of event being published.
            payload: Key-value data associated with the event.
        """
        event = Event(event_type=event_type, payload=payload, timestamp=time.time())

        for observer in list(self._observers):  # copy to avoid mutation during iteration
            try:
                observer.on_event(event)
            except Exception:
                logger.exception(
                    "Observer %s failed to handle event %s",
                    type(observer).__name__,
                    event_type.value,
                )


# Concrete observer implementations
class EmailNotifier(Observer):
    """Sends email notifications on specific events."""

    def __init__(self, recipient: str) -> None:
        self.recipient = recipient

    def on_event(self, event: Event) -> None:
        if event.event_type in (EventType.ORDER_PLACED, EventType.PAYMENT_RECEIVED):
            logger.info(
                "Sending email to %s for event %s",
                self.recipient,
                event.payload.get("order_id"),
            )


class AuditLogger(Observer):
    """Logs all events for audit trail compliance."""

    def __init__(self) -> None:
        self._log: list[Event] = []

    def on_event(self, event: Event) -> None:
        self._log.append(event)
        logger.debug("Audit log: %s payload=%s", event.event_type.value, event.payload)


# Usage:
# subject = GoodSubject()
# subject.subscribe(EmailNotifier("admin@example.com"))
# subject.subscribe(AuditLogger())
# subject.notify(EventType.ORDER_PLACED, {"order_id": "ORD-123", "amount": 99.99})
```

### Pattern 3: Async Observer with Task Tracking

For async applications, observers may be coroutines that need to be scheduled via `asyncio.create_task`. This pattern tracks tasks for proper lifecycle management.

```python
import asyncio
from typing import Any


class AsyncEventBus(Subject):
    """Async-compatible event bus using asyncio.create_task for non-blocking notification.

    Observers can be either synchronous (callable) or asynchronous (coroutine functions).
    The bus detects the type and handles each appropriately:
    - Synchronous observers: called directly (in a thread if blocking is a concern)
    - Async observers: scheduled with asyncio.create_task()
    """

    def __init__(self) -> None:
        super().__init__()
        self._pending_tasks: set[asyncio.Task] = set()

    async def notify(self, event_type: EventType, payload: dict) -> None:  # type: ignore[override]
        """Async notification that schedules all observers without blocking.

        Synchronous observers are run directly (suitable for fast callbacks).
        Async observers are scheduled as background tasks.

        Args:
            event_type: The type of event being published.
            payload: Key-value data associated with the event.
        """
        import asyncio as _asyncio

        event = Event(event_type=event_type, payload=payload, timestamp=_asyncio.get_event_loop().time())

        for observer in list(self._observers):
            try:
                callback = getattr(observer, "on_event")
                if asyncio.iscoroutinefunction(callback):
                    # Schedule async observer as a background task
                    task = asyncio.create_task(callback(event))
                    self._pending_tasks.add(task)
                    task.add_done_callback(self._pending_tasks.discard)
                else:
                    # Run sync observer directly
                    callback(event)  # type: ignore[call-arg]
            except Exception:
                logger.exception("Observer %s failed on event %s", type(observer).__name__, event_type.value)

    async def shutdown(self) -> None:
        """Wait for all pending observer tasks to complete.

        Call this before exiting the application to avoid
        'Task was destroyed but it is pending' warnings.
        """
        if self._pending_tasks:
            done, _ = await asyncio.wait(
                self._pending_tasks,
                timeout=5.0,
            )
            for task in done:
                if task.exception():
                    logger.warning("Observer task raised exception: %s", task.exception())


class AsyncOrderProcessor(Observer):
    """Async observer that processes order events asynchronously."""

    def __init__(self) -> None:
        self._processed_orders: list[str] = []

    async def on_event(self, event: Event) -> None:
        """Handle order events asynchronously."""
        if event.event_type in (EventType.ORDER_PLACED, EventType.ORDER_SHIPPED):
            order_id = event.payload.get("order_id", "unknown")
            # Simulate async processing (e.g., call external service)
            await asyncio.sleep(0.01)
            self._processed_orders.append(order_id)
            logger.info("Async processed order: %s", order_id)


# Usage example (not executed — illustrative):
# bus = AsyncEventBus()
# bus.subscribe(AsyncOrderProcessor())
# await bus.notify(EventType.ORDER_PLACED, {"order_id": "ORD-456"})
# await bus.shutdown()
```

---

## Constraints

### MUST DO
- Use `weakref.WeakSet` or `weakref.ref` to store observers and prevent memory leaks from stale references
- Wrap every observer invocation in a try/except block so one failure never breaks notification for others
- Define event payloads as frozen dataclasses for immutability and type safety
- Track async observer tasks and await them on shutdown to prevent task cleanup warnings
- Copy the observer list before iterating during `notify()` to handle unsubscribe mid-notification

### MUST NOT DO
- Use strong references to observers (creates memory leaks when observers are garbage collected)
- Block the notification thread with long-running synchronous operations in observer callbacks
- Store mutable state in event objects — events must be immutable after creation
- Call async observers synchronously or sync observers with `await`
- Allow unsubscribing during notification iteration without copying the list first

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `strategy-pattern` | Use Strategy when you need to swap algorithms at runtime; use Observer when you need multiple objects reacting to the same state change |
| `command-pattern` | Use Command when you need to encapsulate requests as objects with undo/redo; use Observer when you need fire-and-forget notification |
| `behavioral-design-patterns` | Broader catalog of GoF behavioral patterns including Mediator, State, and Visitor for comparison and pattern selection guidance |
| `event-driven-architecture` | System-level architecture using Event Sourcing, CQRS, and event buses — Observer is the core OO pattern beneath these architectures |

---

## Live References

> Authoritative documentation links for observer pattern and Python async programming.

- [Python dataclasses](https://docs.python.org/3/library/dataclasses.html) — Immutable data containers with `frozen=True`
- [Python weakref Module](https://docs.python.org/3/library/weakref.html) — Preventing memory leaks with weak references
- [asyncio.create_task](https://docs.python.org/3/library/asyncio-task.html#asyncio.create_task) — Non-blocking async task scheduling
- [GoF Observer Pattern (Refactoring.Guru)](https://refactoring.guru/design-patterns/observer) — Visual explanation and UML diagram
- [Python typing Protocol](https://docs.python.org/3/library/typing.html#typing.Protocol) — Structural subtyping for observer contracts
