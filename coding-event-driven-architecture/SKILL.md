---
name: coding-event-driven-architecture
description: "Event-driven architecture for real-time trading systems: pub/sub patterns, event types, signal flow, strategy base, and common pitfalls"
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: event driven architecture, event-driven-architecture, event-driven, real-time, trading
---

# Skill: coding-event-driven-architecture

# Event-driven architecture for real-time trading systems: pub/sub patterns, event types, signal flow, strategy base, and common pitfalls

## Role / Purpose

This skill covers the architectural patterns underpinning a real-time trading platform built on event-driven principles. It explains why each layer exists, how data flows from exchange adapters through to execution, and which patterns and pitfalls are most relevant when building or extending such a system.

---

## Key Patterns

### 1. Four Core EDA Patterns

Trading platforms combine multiple event-driven patterns depending on the coupling and reliability requirements of each component:

| Pattern | Use Case | Coupling |
|---|---|---|
| **Pub/Sub** | Decoupled signal delivery across strategies | Loose |
| **Message Queues** | Reliable order delivery (RabbitMQ, Redis Streams) | Reliable |
| **Observer** | UI and internal component updates | Tight-ish |
| **Actor Model** | Isolated state management (Dramatiq, Akka) | Isolated |

---

### 2. Architecture Layers Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Exchange Adapters                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Binance │  │  Coinbase│  │  Kraken  │  │  Bybit   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Ingestion & Normalization                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │  Order Books    │  │  Tickers        │  │  Trades     │  │
│  │  WebSocket      │  │  REST Polling   │  │  Stream     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Event Bus / Message Queue                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Topics: data.price, data.trade, signal.generated      │ │
│  │  Queue:  orders.out, executions.in, positions.update   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────────┐  ┌───────────────────┐  ┌────────────────┐
│  Signal Engine    │  │  Risk Manager     │  │  Order Manager │
│  - Indicators     │  │  - Position Sizing│  │  - Order Life  │
│  - Confluence     │  │  - Heat Maps      │  │  - Execution   │
│  - Regime Detect  │  │  - Kill Switches  │  │  - Reconcile   │
└───────────────────┘  └───────────────────┘  └────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Execution Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Paper   │  │  Sim     │  │  Live    │  │  Hybrid  │    │
│  │  Trading │  │ ulated   │  │ Execution│  │  Mode    │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

### 3. Complete `EVENT_TYPES` Taxonomy

```python
EVENT_TYPES = {
    # Market Data Events
    'MARKET_DATA_BAR':       'Periodic price data',
    'MARKET_DATA_TICK':      'Individual trade events',
    'MARKET_DATA_ORDERBOOK': 'Level 2/3 order book updates',

    # Signal Events
    'SIGNAL_GENERATED':  'New trading signal',
    'SIGNAL_CONFIRMED':  'Signal passed confluence checks',
    'SIGNAL_CANCELED':   'Signal invalidated',

    # Order Events
    'ORDER_CREATED':          'Order submitted to exchange',
    'ORDER_PARTIALLY_FILLED': 'Partial fill received',
    'ORDER_FILLED':           'Order fully executed',
    'ORDER_CANCELLED':        'Order cancelled',
    'ORDER_REJECTED':         'Order rejected by exchange',

    # Position Events
    'POSITION_OPENED':   'New position established',
    'POSITION_ADJUSTED': 'Position size modified',
    'POSITION_CLOSED':   'Position fully closed',

    # Risk Events
    'RISK_THRESHOLD_CROSSED': 'Risk limit approached',
    'KILL_SWITCH_ACTIVATED':  'Emergency shutdown',
    'PAPER_TRADING_UPDATE':   'Simulated fill notification',
}
```

---

### 4. `Signal` Dataclass with Type/Strength/Timestamp/Metadata

```python
from dataclasses import dataclass, field
from enum import Enum

class SignalType(Enum):
    LONG = "long"
    SHORT = "short"
    CLOSE = "close"

@dataclass
class Signal:
    symbol: str
    signal_type: SignalType
    strength: float        # 0.0 to 1.0
    timestamp: float
    metadata: dict = field(default_factory=dict)
```

---

### 5. `SignalGenerator` Protocol Pattern

Protocols define the contract without inheritance. Any class with a `generate_signals(data)` method satisfies the protocol — enabling duck-typed strategy plugins.

```python
from typing import Protocol

class SignalGenerator(Protocol):
    async def generate_signals(self, data: dict) -> list[Signal]:
        """Generate trading signals from market data."""
        ...
```

---

### 6. `StrategyBase` with Async Queue, `process_bar()`, `handle_signal()`

```python
import asyncio
from asyncio import Queue

class StrategyBase:
    """Base class for trading strategies."""

    def __init__(self, name: str):
        self.name = name
        self.signals: Queue = Queue()
        self.active_positions: dict[str, dict] = {}

    async def process_bar(self, bar: dict):
        """Process a price bar and generate signals."""
        signals = await self.generate_signals(bar)
        for signal in signals:
            await self.signals.put(signal)

    async def handle_signal(self, signal: Signal):
        """Handle a generated signal."""
        current_pos = self.active_positions.get(signal.symbol)

        if signal.signal_type == SignalType.CLOSE and current_pos:
            await self._close_position(signal.symbol)
        elif signal.signal_type in (SignalType.LONG, SignalType.SHORT):
            if current_pos:
                await self._close_position(signal.symbol)
            await self._open_position(signal)

    async def _open_position(self, signal: Signal):
        self.active_positions[signal.symbol] = {
            'signal': signal,
            'entry_time': signal.timestamp,
            'status': 'open',
        }

    async def _close_position(self, symbol: str):
        if symbol in self.active_positions:
            del self.active_positions[symbol]
```

---

### 7. `EventBus` with Decorator-Style `subscribe`

The event bus returns an unsubscribe lambda from `subscribe()`, enabling clean teardown without tracking handler references separately.

```python
import asyncio
from collections import defaultdict
from typing import Callable, Any
from dataclasses import dataclass

@dataclass
class Event:
    type: str
    payload: Any
    timestamp: float

class EventBus:
    """Lightweight event bus for trading system."""

    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)
        self._queue: asyncio.Queue = asyncio.Queue()
        self._running = False
        self._worker_task = None

    def subscribe(self, event_type: str, callback: Callable):
        """Subscribe to an event type. Returns unsubscribe lambda."""
        self._subscribers[event_type].append(callback)
        return lambda: self._subscribers[event_type].remove(callback)

    async def publish(self, event_type: str, payload: Any):
        """Publish an event to the queue."""
        event = Event(
            type=event_type,
            payload=payload,
            timestamp=asyncio.get_event_loop().time(),
        )
        await self._queue.put(event)

    async def _worker(self):
        """Background worker to process events."""
        while self._running:
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                callbacks = self._subscribers.get(event.type, [])

                for callback in callbacks:
                    try:
                        if asyncio.iscoroutinefunction(callback):
                            await callback(event)
                        else:
                            callback(event)
                    except Exception as e:
                        print(f"Error in callback for {event.type}: {e}")

            except asyncio.TimeoutError:
                continue

    async def start(self):
        """Start the event bus worker."""
        self._running = True
        self._worker_task = asyncio.create_task(self._worker())

    async def stop(self):
        """Stop the event bus worker."""
        self._running = False
        if self._worker_task:
            self._worker_task.cancel()
            try:
                await self._worker_task
            except asyncio.CancelledError:
                pass
```

---

### 8. Decorator-Style Usage Pattern

```python
event_bus = EventBus()

@event_bus.subscribe('MARKET_DATA_BAR')
async def handle_bar(event: Event):
    bar = event.payload
    print(f"Bar for {bar['symbol']}: ${bar['close']}")

@event_bus.subscribe('SIGNAL_GENERATED')
async def handle_signal(event: Event):
    signal = event.payload
    print(f"Signal: {signal.signal_type} {signal.symbol} (strength: {signal.strength})")

async def main():
    await event_bus.start()

    await event_bus.publish('MARKET_DATA_BAR', {
        'symbol': 'BTC/USDT',
        'open': 65000,
        'high': 65500,
        'low': 64800,
        'close': 65200,
        'volume': 1234.5,
        'timestamp': 1234567890,
    })

    await asyncio.sleep(0.1)
    await event_bus.stop()
```

---

## Six Best Practices

1. **Decouple components** — Use events for all inter-component communication; never call strategy methods directly from data ingestion
2. **Make events immutable** — Don't modify event payloads after creation; freeze dataclasses or use Pydantic frozen models
3. **Use typed events** — Define event schemas (dataclasses or Pydantic) for type safety across the bus
4. **Add tracing** — Include correlation IDs in event payloads for debugging signal-to-order flows
5. **Handle failures gracefully** — Dead letter queues for failed events; one handler failure must not crash the bus
6. **Rate limiting** — Prevent event storming by rate-limiting publisher inputs at the ingestion layer

---

## Five Pitfalls to Avoid

1. **Direct function calls instead of events** — Creates tight coupling; strategies directly calling execution layers cannot be tested or replaced independently
2. **Blocking event handlers** — A blocking handler makes the entire async loop unresponsive; always use `await` for I/O in handlers
3. **No error handling in handlers** — One unhandled exception in a handler crashes all downstream processing; always wrap in try/except
4. **Missing event versioning** — Adding required fields to event payloads without versioning breaks all subscribers; version your schemas
5. **No monitoring** — Without metrics on queue depth and handler latency you cannot detect processing backlogs before they cascade

---

## Philosophy Checklist

- **Early Exit**: Guard clauses in handlers check event type/payload validity before processing
- **Parse Don't Validate**: Event payloads parsed from raw exchange data at the ingestion layer; handlers receive typed structures
- **Atomic Predictability**: Events are immutable; each handler is a pure side-effectful function that should not mutate the event
- **Fail Fast**: Dead letter queue or error log for failed handlers; bus never silently drops events
- **Intentional Naming**: `process_bar`, `handle_signal`, `publish`, `subscribe`, `start`, `stop` — every method name is a verb describing exactly one action
