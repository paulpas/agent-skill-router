---
name: coding-event-bus
description: Async pub/sub event bus with typed events, mixed sync/async dispatch,
  and singleton initialization for trading systems
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: async, event bus, event-bus, events, typed, eventbridge, event routing
---




# Skill: coding-event-bus

# Async pub/sub event bus with typed events, mixed sync/async dispatch, and singleton initialization for trading systems

## Role / Purpose

This skill covers the canonical pattern for building an internal event bus in a trading system. It handles typed event dispatch, separates sync and async handler registries, and enforces a module-level singleton so the bus is initialized once and accessed safely throughout the application.

---

## Key Patterns

### 1. `EventType(str, Enum)` — Parse at Boundary, Trust Internally

By inheriting from both `str` and `Enum`, event types serialize to plain strings in JSON/dicts but behave as typed enum members internally. Parse at the outermost boundary; once inside the system the type is trusted.

```python
class EventType(str, Enum):
    SIGNAL = "signal"
    ORDER_CREATED = "order_created"
    ORDER_FILLED = "order_filled"
    ORDER_CANCELLED = "order_cancelled"
    POSITION_OPENED = "position_opened"
    POSITION_CLOSED = "position_closed"
    TRADE_COMPLETED = "trade_completed"
    RISK_LIMIT_HIT = "risk_limit_hit"
    ACCOUNT_UPDATED = "account_updated"
    ERROR = "error"
    HEARTBEAT = "heartbeat"
```

---

### 2. Frozen `@dataclass` Event with Factory Classmethods

Events are immutable after creation (`frozen=True`). Factory classmethods validate inputs at construction — fail fast on empty/invalid data — then return a fully-trusted `Event` object.

```python
@dataclass(frozen=True)
class Event:
    """Event for pub/sub - immutable after creation."""

    type: EventType
    timestamp: datetime
    payload: dict[str, Any]

    @classmethod
    def signal(cls, signal: SignalEvent) -> "Event":
        """Parse signal event - fail fast on invalid signal."""
        if not signal or not signal.signal_type:
            raise ValueError("SignalEvent cannot be empty")
        return cls(
            type=EventType.SIGNAL,
            timestamp=signal.timestamp,
            payload={"signal": signal.model_dump()},
        )

    @classmethod
    def order_created(cls, order_id: str, symbol: str) -> "Event":
        """Parse order created event."""
        if not order_id or not symbol:
            raise ValueError("Order ID and symbol cannot be empty")
        return cls(
            type=EventType.ORDER_CREATED,
            timestamp=datetime.utcnow(),
            payload={"order_id": order_id, "symbol": symbol},
        )

    @classmethod
    def trade_completed(cls, trade_id: str, pnl: float) -> "Event":
        """Parse trade completed event."""
        if not trade_id:
            raise ValueError("Trade ID cannot be empty")
        return cls(
            type=EventType.TRADE_COMPLETED,
            timestamp=datetime.utcnow(),
            payload={"trade_id": trade_id, "pnl": pnl},
        )

    @classmethod
    def error(cls, source: str, error: str, traceback: str | None = None) -> "Event":
        """Parse error event - fail fast on missing error."""
        if not source or not error:
            raise ValueError("Source and error message required")
        payload: dict[str, Any] = {"source": source, "error": error}
        if traceback:
            payload["traceback"] = traceback
        return cls(
            type=EventType.ERROR,
            timestamp=datetime.utcnow(),
            payload=payload,
        )
```

---

### 3. `EventBus` with Separate Sync and Async Handler Dicts

Two separate registries prevent confusion about dispatch context. Sync handlers run immediately in `publish()`; async handlers are dispatched via `asyncio.create_task()`.

```python
class EventBus:
    """Internal event bus - no shared mutable state."""

    def __init__(self) -> None:
        self._handlers: dict[EventType, list[Callable[[Event], Any]]] = {}
        self._async_handlers: dict[EventType, list[Callable[[Event], Any]]] = {}
        self._queue: Queue[Event] | None = None
```

---

### 4. `subscribe` / `subscribe_async` — Fail Fast on Invalid Inputs

Guard clauses at the top of both methods ensure the bus never silently accepts bad registrations.

```python
def subscribe(self, event_type: EventType, handler: Callable[[Event], Any]) -> None:
    """Subscribe handler for event type - fail fast on invalid inputs."""
    if not event_type:
        raise ValueError("Event type cannot be empty")
    if handler is None:
        raise ValueError("Handler cannot be None")

    if event_type not in self._handlers:
        self._handlers[event_type] = []
    self._handlers[event_type].append(handler)

def subscribe_async(
    self, event_type: EventType, handler: Callable[[Event], Any]
) -> None:
    """Subscribe async handler for event type."""
    if not event_type:
        raise ValueError("Event type cannot be empty")
    if handler is None:
        raise ValueError("Handler cannot be None")

    if event_type not in self._async_handlers:
        self._async_handlers[event_type] = []
    self._async_handlers[event_type].append(handler)
```

---

### 5. `publish` — Sync Handlers Checked for Accidental Async Return

If a handler accidentally returns an awaitable from a sync `publish()` call, the bus raises immediately rather than silently swallowing it. Async handlers are dispatched via `create_task` when a running event loop exists.

```python
def publish(self, event: Event) -> None:
    """Publish event - fail fast on invalid event."""
    if not event or not event.type:
        raise ValueError("Event cannot be empty")

    # Sync handlers
    for handler in self._handlers.get(event.type, []):
        try:
            result = handler(event)
            # Catch accidental async return in sync context
            if result is not None and hasattr(result, "__await__"):
                raise RuntimeError(
                    "Async handler called from sync publish - use publish_async"
                )
        except Exception as e:
            error_event = Event.error(
                source="event_bus",
                error=f"Handler failed for {event.type}: {str(e)}",
            )
            self._publish_internal(error_event)

    # Async handlers — queue for async processing via create_task
    async_handlers = self._async_handlers.get(event.type, [])
    if async_handlers and self._queue:
        import asyncio
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self._dispatch_async(event, async_handlers))
        except RuntimeError:
            pass  # No event loop, skip async dispatch
```

---

### 6. Error Events Created Without Crashing Other Handlers

Handler failures produce an `ERROR` event rather than propagating the exception. One bad handler never crashes the whole publish chain.

```python
async def _dispatch_async(
    self, event: Event, handlers: list[Callable[[Event], Any]]
) -> None:
    """Dispatch to async handlers."""
    for handler in handlers:
        try:
            await handler(event)
        except Exception as e:
            error_event = Event.error(
                source="event_bus_async",
                error=f"Async handler failed for {event.type}: {str(e)}",
            )
            await self._dispatch_async(error_event, [])
```

---

### 7. Module-Level Singleton — `init_bus()` Raises if Already Initialized

The bus is a module-level optional. `init_bus()` raises if called twice; `get_bus()` raises if not yet initialized. Neither silently returns `None`.

```python
_bus: EventBus | None = None


def get_bus() -> EventBus:
    """Get event bus - fail loud if not initialized."""
    if _bus is None:
        raise RuntimeError("EventBus not initialized. Call init_bus() first.")
    return _bus


def init_bus(bus: EventBus | None = None) -> EventBus:
    """Initialize event bus - single entry point."""
    global _bus
    if _bus is not None:
        raise RuntimeError("EventBus already initialized")
    _bus = bus or EventBus()
    return _bus
```

---

### 8. Module-Level Convenience Wrappers

```python
def publish(event: Event) -> None:
    """Publish event to global bus."""
    get_bus().publish(event)


def subscribe(event_type: EventType, handler: Callable[[Event], Any]) -> None:
    """Subscribe handler to global bus."""
    get_bus().subscribe(event_type, handler)


async def publish_async(event: Event) -> None:
    """Publish event to async queue."""
    bus = get_bus()
    if bus._queue:
        await bus._queue.put(event)
    else:
        bus.publish(event)
```

---

## Code Examples

### Full Usage Pattern

```python
from apex.core.events import EventType, Event, init_bus, get_bus, subscribe, publish

# 1. Initialize once at application startup
bus = init_bus()

# 2. Subscribe sync handler
def on_order_created(event: Event) -> None:
    order_id = event.payload["order_id"]
    print(f"Order created: {order_id}")

subscribe(EventType.ORDER_CREATED, on_order_created)

# 3. Subscribe async handler
async def on_trade_completed(event: Event) -> None:
    trade_id = event.payload["trade_id"]
    pnl = event.payload["pnl"]
    print(f"Trade {trade_id} completed, PnL: {pnl}")

bus.subscribe_async(EventType.TRADE_COMPLETED, on_trade_completed)

# 4. Create and publish events
order_event = Event.order_created(order_id="ORD-001", symbol="BTC/USDT")
publish(order_event)

trade_event = Event.trade_completed(trade_id="TRD-001", pnl=150.0)
publish(trade_event)

# 5. Anywhere else in the codebase — get_bus() is always safe after init
current_bus = get_bus()
```

### EventHandler Protocol

```python
from typing import Protocol

class EventHandler(Protocol):
    """Event handler protocol - pure function contract."""

    async def __call__(self, event: Event) -> None:
        """Handle event - pure function, no mutations."""
        ...
```

---

## Philosophy Checklist

- **Early Exit**: Guard clauses in `subscribe`, `subscribe_async`, `publish`, factory classmethods
- **Parse Don't Validate**: `EventType(str, Enum)` parsed at boundary; factory classmethods validate then produce trusted objects
- **Atomic Predictability**: `Event` is frozen; `publish` does not mutate state; handlers receive immutable events
- **Fail Fast**: `init_bus()` raises on double-init; `get_bus()` raises if not initialized; accidental async return raises immediately
- **Intentional Naming**: `subscribe_async`, `publish_async`, `_dispatch_async` read clearly as distinct concerns
