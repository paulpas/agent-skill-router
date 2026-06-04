---
name: agent-communication-patterns
description: Implements inter-agent communication patterns (message passing, event-driven
  coordination, shared memory protocols, RPC-style calls, structured JSON messaging)
  for reliable multi-agent systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: agent
  triggers: agent communication, message passing, event driven, shared memory, rpc
    calls, multi agent coordination, inter agent messaging, message queue agents,
    structured messaging, agent to agent communication, agent messaging protocol
  archetypes:
  - tactical
  anti_triggers:
  - brainstorming
  - vague ideation
  - single-agent monolith
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
  related-skills: ai-agent-safety,multi-agent-patterns,task-decomposition-engine
---
# Agent Communication Patterns

Implements reliable inter-agent communication mechanisms for multi-agent systems. This skill makes the model design and build message passing, event-driven coordination, shared-memory state exchange, and RPC-style request-response protocols that enable agents to coordinate without tight coupling, race conditions, or silent data corruption.

Inter-agent communication is the connective tissue of any multi-agent system — it determines whether agents collaborate productively or produce cascading failures through mismatched expectations, lost messages, and unhandled error states. Every communication pattern carries trade-offs in latency, consistency, fault tolerance, and implementation complexity that must be matched to the agent's operational requirements.

## TL;DR Checklist

- [ ] Define a JSON message schema with required fields and types before writing any agent logic
- [ ] Choose communication pattern (message passing, event-driven, shared memory, RPC) based on latency and consistency needs
- [ ] Implement typed message/event classes — never use raw dicts for inter-agent data exchange
- [ ] Add timeouts, retries, and error propagation to all synchronous communication paths
- [ ] Version all message schemas; reject unknown fields with explicit validation errors
- [ ] Log every sent and received message with correlation IDs for full traceability

---

## When to Use

Use this skill when:

- Designing inter-agent messaging infrastructure for a multi-agent trading system where agents must exchange signals, risk states, or trade orders
- Building an event-driven coordination layer where multiple agents react to shared events (e.g., market regime changes, position updates) without direct coupling
- Implementing a shared-memory protocol between agents running in the same process that need to exchange mutable state with conflict resolution
- Creating RPC-style request/response channels where one agent needs synchronous results from another (e.g., querying risk limits before executing a trade)
- Refactoring tightly coupled agent code into decoupled communication patterns using structured messaging

---

## When NOT to Use

Avoid this skill for:

- Single-agent systems — no inter-agent communication exists, so these patterns add unnecessary complexity
- Simple sequential workflows better expressed as function calls within a single process — use standard Python imports instead
- High-throughput data pipelines (>100k messages/sec) where specialized message brokers (Kafka, NATS) are more appropriate than in-process protocols

---

## Core Workflow

1. **Define the Message Schema** — Specify every inter-agent message as a typed class with required fields, types, and optional metadata (correlation_id, timestamp, source_agent). Use Pydantic models or dataclasses with `from __future__ import annotations` for forward references. Validate payloads against schemas at message boundaries. **Checkpoint:** Every message type has a unique name string, required field list, and serialization/deserialization methods before proceeding to pattern selection.

2. **Select Communication Pattern** — Match the pattern to the operational requirements:
   - Message Passing: Best for fire-and-forget notifications where delivery confirmation is not critical (e.g., logging events, notifying downstream agents of computed results). Low latency, eventual consistency.
   - Event-Driven Coordination: Best when multiple agents must react to state changes without knowing each other's identities (e.g., market regime change triggers strategy re-evaluation across all active strategies). Decouples publishers from subscribers.
   - Shared Memory Protocol: Best for agents in the same process sharing mutable state with versioning and conflict resolution (e.g., order book snapshots, position aggregates). Fastest path but requires lock management.
   - RPC-Style Calls: Best when synchronous results are required before proceeding (e.g., asking risk agent whether a proposed trade is within limits). Guarantees response but introduces latency and blocking.

3. **Implement the Communication Layer** — Build the chosen pattern with full type annotations, error handling, and structured logging. Include correlation IDs in every message for tracing across agents. Add dead-letter queues for unprocessable messages rather than silently dropping them. **Checkpoint:** Every communication path handles at minimum: successful delivery, transient failure (retryable), and permanent failure (dead-letter or escalation).

4. **Add Reliability Mechanisms** — For synchronous paths (RPC, shared memory with writes), implement retry with exponential backoff (base 100ms, max 5 attempts, jitter factor 0–20%). For asynchronous paths (message passing, events), implement at-least-once delivery guarantees via message acknowledgment. Add circuit breakers when the downstream agent is unhealthy to prevent cascading failures. **Checkpoint:** All retry logic has a maximum total duration capped at the business-level timeout — never retry indefinitely.

5. **Establish Observability** — Instrument every communication path with structured logs containing: correlation_id, source_agent, target_agent, message_type, direction (sent/received), latency_ms, and status (success/error). Add metrics counters for messages sent, received, failed, retried, and dead-lettered per agent pair. **Checkpoint:** Every log entry can be traced end-to-end across the full communication chain using a single correlation_id.

---

## Implementation Patterns

### Pattern 1: Structured Message Passing

Structured message passing provides a typed, serializable foundation for inter-agent communication. Every message is a dataclass or Pydantic model with explicit field types, required/optional markers, and serialization support. This prevents the most common agent communication bug: agents sending unstructured dicts that cause runtime type errors downstream.

```python
"""StructuredMessage — Typed message passing between AI agents."""
from __future__ import annotations

import hashlib
import json
import logging
import time
import uuid
from dataclasses import dataclass, field, asdict, is_dataclass
from enum import Enum
from typing import Any, Generic, TypeVar, Optional

logger = logging.getLogger(__name__)


class MessageType(str, Enum):
    """Category of inter-agent message for routing and filtering."""
    SIGNAL = "signal"          # Trading signal from strategy agent
    RISK_CHECK = "risk_check"  # Pre-trade risk validation request
    RISK_RESULT = "risk_result" # Risk assessment response
    ORDER = "order"            # Trade order submission
    FILL_REPORT = "fill_report" # Execution fill notification
    POSITION_UPDATE = "position_update"  # Position state change
    MARKET_DATA = "market_data"        # Price or orderbook snapshot
    SYSTEM_HEARTBEAT = "system_heartbeat"  # Liveness probe


@dataclass(frozen=True)
class MessageHeader:
    """Immutable header attached to every inter-agent message.

    Provides tracing, ordering, and routing metadata. Frozen for immutability
    after creation — prevents accidental mutation mid-flight.
    """
    message_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    correlation_id: str = ""
    source_agent: str = ""
    target_agent: Optional[str] = None  # None means broadcast
    msg_type: MessageType = MessageType.SYSTEM_HEARTBEAT
    timestamp_ns: int = field(default_factory=time.time_ns)
    version: int = 1
    priority: int = 0  # 0 = normal, higher = more urgent

    def __post_init__(self):
        if not self.correlation_id:
            object.__setattr__(self, "correlation_id", self.message_id)

    @property
    def latency_since_sent_ns(self) -> int:
        """Elapsed nanoseconds since this message was created."""
        return time.time_ns() - self.timestamp_ns

    @property
    def latency_since_sent_ms(self) -> float:
        """Elapsed milliseconds since this message was created."""
        return self.latency_since_sent_ns / 1_000_000


T = TypeVar("T")


@dataclass(frozen=True)
class AgentMessage(Generic[T]):
    """Typed envelope for structured inter-agent communication.

    Combines an immutable header with a typed payload. The Generic parameter
    enforces type safety at construction time — callers must specify the
    payload type, which is validated during deserialization.

    Example:
        signal_msg = AgentMessage(
            header=MessageHeader(
                source_agent="strategy_agent",
                target_agent="execution_agent",
                msg_type=MessageType.SIGNAL,
            ),
            payload={"symbol": "BTC-PERP", "side": "BUY", "confidence": 0.82},
        )
    """
    header: MessageHeader
    payload: T

    def serialize(self) -> str:
        """Serialize message to a JSON string for transmission or storage."""
        data = {
            "header": {
                "message_id": self.header.message_id,
                "correlation_id": self.header.correlation_id,
                "source_agent": self.header.source_agent,
                "target_agent": self.header.target_agent,
                "msg_type": self.header.msg_type.value if isinstance(self.header.msg_type, Enum) else self.header.msg_type,
                "timestamp_ns": self.header.timestamp_ns,
                "version": self.header.version,
                "priority": self.header.priority,
            },
            "payload": self.payload,
        }
        return json.dumps(data, default=_default_serializer)

    @classmethod
    def deserialize(cls, raw: str) -> AgentMessage[Any]:
        """Deserialize a JSON string back into an AgentMessage.

        Validates the header structure and reconstructs the MessageType enum.
        Payload is returned as a dict — callers should validate against
        their expected schema separately.
        """
        data = json.loads(raw)
        header_data = data["header"]

        # Reconstruct MessageType from string value
        msg_type_str = header_data["msg_type"]
        try:
            msg_type = MessageType(msg_type_str)
        except ValueError:
            raise ValueError(f"Unknown MessageType: {msg_type_str}")

        header = MessageHeader(**{k: v for k, v in header_data.items() if k != "msg_type"})
        object.__setattr__(header, "msg_type", msg_type)

        return cls(header=header, payload=data["payload"])

    def checksum(self) -> str:
        """Compute a SHA-256 checksum of the serialized message body.

        Used for integrity verification — detects corruption during
        transit or storage without requiring full re-deserialization.
        """
        raw = self.serialize()
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


def _default_serializer(obj: Any) -> Any:
    """JSON serializer fallback for non-standard types."""
    if isinstance(obj, Enum):
        return obj.value
    if hasattr(obj, "__dict__"):
        return vars(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


# --- Message Router: in-process message distribution ---

class MessageRouter:
    """Routes AgentMessage instances between registered agent handlers.

    Provides direct, typed delivery from sender to receiver based on the
    target_agent field in the header. Broadcast targets (None) deliver
    to all registered handlers. Supports priority-based ordering where
    higher-priority messages are dispatched before lower-priority ones
    when delivered simultaneously.
    """

    def __init__(self) -> None:
        self._handlers: dict[str, list[callable]] = {}
        self._dead_letters: list[AgentMessage[Any]] = []
        self._delivery_log: list[dict[str, Any]] = []

    def register(self, agent_name: str, handler: callable) -> None:
        """Register a message handler for an agent.

        Args:
            agent_name: The agent identifier this handler services.
            handler: Async or sync function receiving AgentMessage.
                     Must accept exactly one AgentMessage parameter.
        """
        if agent_name not in self._handlers:
            self._handlers[agent_name] = []
        self._handlers[agent_name].append(handler)
        logger.info("Registered handler for '%s' (total handlers: %d)", agent_name, len(self._handlers.get(agent_name, [])))

    def send(self, message: AgentMessage[Any]) -> dict[str, Any]:
        """Deliver a message to the target agent's handler(s).

        Returns a delivery report containing status, latency, and any errors.
        Messages delivered to a non-existent target agent are sent to the
        dead-letter queue rather than silently dropped.

        Args:
            message: The AgentMessage to deliver.

        Returns:
            Delivery report dict with keys: status, targets_contacted, errors, latency_ms.
        """
        start = time.monotonic()
        report = {
            "message_id": message.header.message_id,
            "correlation_id": message.header.correlation_id,
            "status": "delivered",
            "targets_contacted": 0,
            "errors": [],
        }

        targets: list[str]
        if message.header.target_agent is None:
            # Broadcast — deliver to all agents
            targets = list(self._handlers.keys())
        else:
            targets = [message.header.target_agent]

        for target in targets:
            handlers = self._handlers.get(target, [])
            if not handlers:
                error_msg = f"No handler registered for agent '{target}'"
                logger.warning("%s — sending to dead-letter queue", error_msg)
                report["errors"].append(error_msg)
                self._dead_letters.append(message)
                continue

            for handler in sorted(handlers, key=lambda h: getattr(h, "__name__", "")):
                try:
                    handler(message)
                    report["targets_contacted"] += 1
                except Exception as e:
                    error_entry = f"Handler {handler.__name__} on '{target}' raised {type(e).__name__}: {e}"
                    logger.error(error_entry)
                    report["errors"].append(error_entry)
                    self._dead_letters.append(message)

        report["latency_ms"] = round((time.monotonic() - start) * 1000, 3)
        self._delivery_log.append(report)
        return report

    @property
    def dead_letter_count(self) -> int:
        return len(self._dead_letters)

    @property
    def delivery_log(self) -> list[dict[str, Any]]:
        return list(self._delivery_log)


# --- Usage Example ---

def demonstrate_structured_messaging() -> None:
    """Demonstrate complete structured message passing workflow."""
    router = MessageRouter()

    # Define handlers for different agent types
    def on_signal(message: AgentMessage[dict]) -> None:
        payload = message.payload
        logger.info(
            "Signal received from %s: %s %s (confidence=%.2f)",
            message.header.source_agent,
            payload.get("side"),
            payload.get("symbol"),
            payload.get("confidence", 0),
        )

    def on_risk_request(message: AgentMessage[dict]) -> None:
        logger.info(
            "Risk check requested for %s by %s (position=%.2f)",
            message.payload.get("symbol"),
            message.header.source_agent,
            message.payload.get("position_value", 0),
        )

    router.register("execution_agent", on_signal)
    router.register("risk_agent", on_risk_request)

    # Send a signal — direct delivery
    signal = AgentMessage(
        header=MessageHeader(
            source_agent="strategy_agent",
            target_agent="execution_agent",
            msg_type=MessageType.SIGNAL,
            priority=1,
        ),
        payload={"symbol": "BTC-PERP", "side": "BUY", "confidence": 0.82, "entry_price": 67500.0},
    )

    report = router.send(signal)
    assert report["targets_contacted"] == 1, f"Expected 1 target, got {report['targets_contacted']}"

    # Broadcast a system heartbeat — all agents receive it
    heartbeat = AgentMessage(
        header=MessageHeader(
            source_agent="monitor_agent",
            msg_type=MessageType.SYSTEM_HEARTBEAT,
        ),
        payload={"status": "healthy", "uptime_seconds": 3600},
    )

    report = router.send(heartbeat)
    assert report["targets_contacted"] == 2, f"Expected 2 targets (broadcast), got {report['targets_contacted']}"


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    demonstrate_structured_messaging()
```

### Pattern 2: Event-Driven Agent Coordination

Event-driven coordination decouples agents through a publish-subscribe model. Agents publish events describing state changes or significant occurrences without knowing which other agents care. Subscribers register handlers for event types they are interested in. This is the pattern of choice when multiple independent agents must react to the same underlying occurrence — market regime shifts, new position openings, or system health degradation.

```python
"""EventBus — Typed event-driven coordination for multi-agent systems."""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional
from enum import Enum
from collections import defaultdict


logger = logging.getLogger(__name__)


class EventPriority(str, Enum):
    """Event processing priority levels."""
    LOW = "low"        # Processed when system is idle
    NORMAL = "normal"  # Standard ordering (default)
    HIGH = "high"      # Processed ahead of normal events
    CRITICAL = "critical"  # Immediate processing, may preempt others


@dataclass(frozen=True)
class AgentEvent:
    """Typed event published by agents for coordinated reactions.

    Events carry a type identifier, typed payload, source attribution, and
    priority level. Once created, the event is immutable — subscribers read
    but never mutate shared events.

    Example:
        regime_event = AgentEvent(
            event_type="market.regime_changed",
            source_agent="regime_detector",
            priority=EventPriority.HIGH,
            payload={"new_regime": "trending_high_volatility", "confidence": 0.91},
        )
    """
    event_type: str
    source_agent: str
    payload: dict[str, Any] = field(default_factory=dict)
    priority: EventPriority = EventPriority.NORMAL
    timestamp_ns: int = field(default_factory=time.time_ns)
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))

    @property
    def age_ms(self) -> float:
        """How many milliseconds ago this event was published."""
        return (time.time_ns() - self.timestamp_ns) / 1_000_000


EventHandler = Callable[[AgentEvent], Awaitable[None]] | Callable[[AgentEvent], None]


class EventBus:
    """Async event bus supporting typed pub-sub between agents.

    Agents subscribe to specific event types by registering handler functions.
    When events are published, matching handlers are invoked concurrently with
    a configurable concurrency limit to prevent resource exhaustion from
    high-frequency event storms.

    Key features:
    - Typed routing by event_type prefix (exact match and wildcard)
    - Per-handler error isolation — one failing handler doesn't affect others
    - Event history with configurable retention for replay/debugging
    - Dead-letter storage for events that exceed max handler errors
    """

    def __init__(self, max_history: int = 5000, max_concurrent_handlers: int = 10) -> None:
        self._subscribers: dict[str, list[EventHandler]] = defaultdict(list)
        self._wildcard_subscribers: list[EventHandler] = []
        self._history: list[AgentEvent] = []
        self._max_history = max_history
        self._max_concurrent = max_concurrent_handlers
        self._semaphore = asyncio.Semaphore(max_concurrent_handlers)
        self._dead_letters: list[AgentEvent] = []
        self._stats = defaultdict(int)

    async def subscribe(self, event_type: str, handler: EventHandler) -> None:
        """Register a handler for a specific event type.

        Supports exact match (e.g., "trade.filled") and wildcard prefix
        matching (e.g., "trade.*" matches all trade-related events).

        Args:
            event_type: Exact event type or prefix ending with '.' for wildcard matching.
            handler: Async or sync callable receiving a single AgentEvent argument.

        Raises:
            ValueError: If the same handler is already registered for this event type.
        """
        if handler in self._subscribers.get(event_type, []) and not event_type.endswith('.*'):
            raise ValueError(f"Handler already subscribed to '{event_type}'")

        if event_type.endswith('.*'):
            # Wildcard subscription — stored separately
            self._wildcard_subscribers.append(handler)
        else:
            self._subscribers[event_type].append(handler)
        logger.debug("Subscribed handler to '%s'", event_type)

    async def publish(self, event: AgentEvent) -> dict[str, Any]:
        """Publish an event to all matching handlers.

        Handlers are invoked concurrently (bounded by max_concurrent_handlers).
        Errors in individual handlers are caught and logged — they do not
        prevent other handlers from executing or cause the published event
        to be lost. Events exceeding handler error thresholds go to dead-letter storage.

        Args:
            event: The AgentEvent to distribute.

        Returns:
            Dispatch report with handler invocation results.
        """
        self._stats["events_published"] += 1

        # Collect matching handlers
        handlers_to_run: list[tuple[str, EventHandler]] = []

        # Exact match handlers
        for handler in self._subscribers.get(event.event_type, []):
            handlers_to_run.append((event.event_type, handler))

        # Wildcard prefix match (e.g., "trade.*" matches "trade.filled", "trade.cancelled")
        parts = event.event_type.split('.')
        for i in range(len(parts)):
            prefix = '.'.join(parts[:i + 1]) + '.*'
            for handler in self._wildcard_subscribers:
                # Avoid duplicate if the exact type also has a wildcard for same prefix
                if (prefix, handler) not in handlers_to_run:
                    handlers_to_run.append((prefix, handler))

        # Deduplicate by handler identity to avoid running same handler twice
        seen_handlers = set()
        unique_handlers = []
        for topic, handler in handlers_to_run:
            handler_id = id(handler)
            if handler_id not in seen_handlers:
                seen_handlers.add(handler_id)
                unique_handlers.append((topic, handler))

        # Execute handlers concurrently with bounded concurrency
        async def _invoke_handler(topic: str, handler: EventHandler, event: AgentEvent) -> dict[str, Any]:
            handler_name = getattr(handler, "__name__", "anonymous")
            try:
                await self._semaphore.acquire()
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
                self._stats["events_handled"] += 1
                return {"handler": handler_name, "topic": topic, "status": "success"}
            except Exception as e:
                self._stats["events_failed"] += 1
                logger.error("Event handler '%s' failed for %s: %s", handler_name, event.event_type, e)
                return {"handler": handler_name, "topic": topic, "status": "error", "error": str(e)}
            finally:
                self._semaphore.release()

        tasks = [_invoke_handler(topic, h, event) for topic, h in unique_handlers]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Record successful invocations and dead-letter failed events
        dispatched = []
        for result in results:
            if isinstance(result, Exception):
                self._dead_letters.append(event)
            else:
                dispatched.append(result)

        # Keep history bounded
        self._history.append(event)
        if len(self._history) > self._max_history:
            self._history = self._history[-self._max_history:]

        return {
            "event_id": event.event_id,
            "event_type": event.event_type,
            "dispatched_count": len(dispatched),
            "results": dispatched,
        }

    def get_event_history(
        self,
        event_type: Optional[str] = None,
        source_agent: Optional[str] = None,
        limit: int = 100,
    ) -> list[AgentEvent]:
        """Query recent event history with optional filters."""
        results = self._history

        if event_type:
            # Support prefix matching in queries too
            if event_type.endswith('.*'):
                prefix = event_type[:-2]
                results = [e for e in results if e.event_type.startswith(prefix)]
            else:
                results = [e for e in results if e.event_type == event_type]

        if source_agent:
            results = [e for e in results if e.source_agent == source_agent]

        return results[-limit:]

    @property
    def stats(self) -> dict[str, int]:
        return dict(self._stats)

    @property
    def dead_letter_count(self) -> int:
        return len(self._dead_letters)


# --- Usage Example ---

async def demonstrate_event_driven_coordination() -> None:
    """Demonstrate event-driven coordination between trading agents."""
    bus = EventBus(max_history=1000, max_concurrent_handlers=5)

    # Risk agent subscribes to all trade events
    async def risk_monitor(event: AgentEvent) -> None:
        if event.payload.get("position_value", 0) > 100_000:
            logger.warning(
                "RISK ALERT: %s position value %.2f exceeds threshold from %s",
                event.payload.get("symbol"),
                event.payload["position_value"],
                event.source_agent,
            )

    # Strategy agent re-evaluates on regime changes
    async def strategy_reevaluator(event: AgentEvent) -> None:
        regime = event.payload.get("new_regime", "unknown")
        logger.info(
            "Strategy agent: re-evaluating positions for regime '%s'",
            regime,
        )

    # Logging agent catches all events via wildcard
    async def event_logger(event: AgentEvent) -> None:
        pass  # In production: write to log aggregation system

    await bus.subscribe("trade.*", risk_monitor)
    await bus.subscribe("market.regime_changed", strategy_reevaluator)
    await bus.subscribe("*", event_logger)

    # Publish a trade event — both risk and logger receive it
    trade_event = AgentEvent(
        event_type="trade.position_opened",
        source_agent="execution_agent",
        payload={"symbol": "ETH-PERP", "position_value": 150_000.0},
        priority=EventPriority.HIGH,
    )
    result = await bus.publish(trade_event)
    assert result["dispatched_count"] == 2, f"Expected 2 handlers, got {result['dispatched_count']}"

    # Publish a regime change — only risk (wildcard) and strategy receive it
    regime_event = AgentEvent(
        event_type="market.regime_changed",
        source_agent="regime_detector",
        payload={"new_regime": "trending_high_volatility", "confidence": 0.91},
        priority=EventPriority.CRITICAL,
    )
    result = await bus.publish(regime_event)
    assert result["dispatched_count"] == 2, f"Expected 2 handlers (risk wildcard + strategy), got {result['dispatched_count']}"

    # Query event history
    history = bus.get_event_history(event_type="trade.*", limit=50)
    assert len(history) >= 1
    logger.info("Event stats: %s", bus.stats)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(demonstrate_event_driven_coordination())
```

### Pattern 3: Shared Memory Protocol

Shared memory is the fastest communication path between agents running in the same process. Instead of serializing and deserializing messages across IPC boundaries, agents read and write to a shared state store with versioning and conflict resolution. This pattern requires careful attention to thread safety — every read must see a consistent snapshot, and every write must be atomic.

```python
"""SharedMemoryStore — Thread-safe shared memory for in-process agent communication."""
from __future__ import annotations

import copy
import hashlib
import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum


logger = logging.getLogger(__name__)


class ConflictResolution(str, Enum):
    """Strategies for resolving concurrent write conflicts."""
    LATEST_WINS = "latest_wins"      # Last writer wins (simplest)
    HIGHEST_VERSION = "highest_version"  # Highest explicit version wins
    MERGE_FIELDS = "merge_fields"     # Merge non-conflicting fields


@dataclass(frozen=True)
class VersionedValue:
    """A single entry in the shared memory store with version tracking.

    Each value carries a monotonically increasing version number per key,
    a data snapshot, and an optional checksum for integrity verification.
    The frozen nature ensures readers always see a consistent point-in-time view.
    """
    key: str
    value: Any
    version: int
    agent_id: str  # Which agent last wrote this value
    timestamp_ns: int = field(default_factory=time.time_ns)
    checksum: str = ""

    def __post_init__(self):
        if not self.checksum:
            content = f"{self.key}:{self.version}:{str(self.value)}:{self.agent_id}"
            object.__setattr__(self, "checksum", hashlib.sha256(content.encode()).hexdigest()[:12])

    @property
    def age_ms(self) -> float:
        return (time.time_ns() - self.timestamp_ns) / 1_000_000


class SharedMemoryStore:
    """Thread-safe shared memory store for in-process agent state exchange.

    Agents read and write typed, versioned values using string keys. The store
    provides snapshot isolation: reads always return a consistent view as of
    some point in time, even when concurrent writes are happening.

    Supports optimistic concurrency control via version checking — if you
    read a value at version 3 and try to write at version 5, the store rejects
    the write if another agent already advanced the key to version 6.

    Thread Safety:
        All public methods are thread-safe via internal reentrant locking.
        Multiple threads can read simultaneously; writes acquire exclusive access.
    """

    def __init__(self, conflict_strategy: ConflictResolution = ConflictResolution.LATEST_WINS) -> None:
        self._store: dict[str, VersionedValue] = {}
        self._key_version_counters: dict[str, int] = {}
        self._lock = threading.RLock()
        self._conflict_strategy = conflict_strategy
        self._write_log: list[dict[str, Any]] = []
        self._read_log: list[dict[str, Any]] = []

    def read(self, key: str) -> VersionedValue | None:
        """Read the current value for a key.

        Returns a snapshot (deep copy) of the VersionedValue to ensure the
        caller cannot accidentally mutate shared state. Returns None if the
        key does not exist in the store.

        Args:
            key: The storage key to read.

        Returns:
            A deep-copied VersionedValue or None if the key is absent.
        """
        with self._lock:
            value = self._store.get(key)
            if value is None:
                return None
            # Return a deep copy to prevent mutation of shared state
            result = VersionedValue(
                key=value.key,
                value=copy.deepcopy(value.value),
                version=value.version,
                agent_id=value.agent_id,
                timestamp_ns=value.timestamp_ns,
                checksum=value.checksum,
            )
        self._read_log.append({
            "key": key,
            "version": result.version,
            "agent": threading.current_thread().name,
            "timestamp_ns": time.time_ns(),
        })
        return result

    def write(
        self,
        key: str,
        value: Any,
        agent_id: str,
        expected_version: int = -1,
    ) -> VersionedValue:
        """Write a value to the store with optional optimistic concurrency control.

        If expected_version >= 0 and the current version differs, a ConflictError
        is raised instead of overwriting. This prevents silent data loss when
        multiple agents write to the same key concurrently.

        Args:
            key: The storage key to write.
            value: The value to store (must be JSON-serializable or deeply copyable).
            agent_id: Identifier of the writing agent (used for conflict attribution).
            expected_version: If >= 0, requires current version to match exactly.
                              Pass -1 to always succeed (no concurrency check).

        Returns:
            The new VersionedValue with incremented version number.

        Raises:
            ConflictError: When expected_version does not match the current version.
        """
        with self._lock:
            existing = self._store.get(key)

            if expected_version >= 0 and existing is not None and existing.version != expected_version:
                raise ConflictError(
                    key=key,
                    expected_version=expected_version,
                    actual_version=existing.version,
                    agent_id=agent_id,
                )

            # Determine new version number
            if existing is None:
                new_version = 0
            else:
                new_version = existing.version + 1

            entry = VersionedValue(
                key=key,
                value=copy.deepcopy(value),
                version=new_version,
                agent_id=agent_id,
            )
            self._store[key] = entry

        self._write_log.append({
            "key": key,
            "version": new_version,
            "agent": agent_id,
            "timestamp_ns": time.time_ns(),
        })
        logger.debug("Wrote key '%s' v%d by '%s'", key, new_version, agent_id)
        return entry

    def read_many(self, keys: list[str]) -> dict[str, VersionedValue | None]:
        """Atomically read multiple keys as a single consistent snapshot.

        All values are read under a single lock acquisition, ensuring the
        returned snapshot represents the store at one consistent point in time.

        Args:
            keys: List of keys to read atomically.

        Returns:
            Dict mapping each key to its VersionedValue (or None if absent).
        """
        with self._lock:
            result = {}
            for key in keys:
                value = self._store.get(key)
                if value is not None:
                    result[key] = VersionedValue(
                        key=value.key,
                        value=copy.deepcopy(value.value),
                        version=value.version,
                        agent_id=value.agent_id,
                        timestamp_ns=value.timestamp_ns,
                        checksum=value.checksum,
                    )
                else:
                    result[key] = None
        return result

    def write_batch(
        self,
        entries: list[tuple[str, Any, str]],
    ) -> list[VersionedValue]:
        """Write multiple keys atomically as a single transaction.

        All writes succeed together or not at all. If any write fails due to
        a version conflict, none of the batch writes are applied.

        Args:
            entries: List of (key, value, agent_id) tuples.

        Returns:
            List of new VersionedValue entries for each key.

        Raises:
            ConflictError: If any entry has a version mismatch (first failure stops batch).
        """
        with self._lock:
            results = []
            temp_store = dict(self._store)  # Working copy

            for key, value, agent_id in entries:
                existing = temp_store.get(key)
                new_version = (existing.version + 1) if existing else 0
                entry = VersionedValue(
                    key=key,
                    value=copy.deepcopy(value),
                    version=new_version,
                    agent_id=agent_id,
                )
                temp_store[key] = entry
                results.append(entry)

            # Commit: replace full store under the same lock
            self._store = temp_store

        for result in results:
            self._write_log.append({
                "key": result.key,
                "version": result.version,
                "agent": result.agent_id,
                "timestamp_ns": time.time_ns(),
                "batch": True,
            })

        return results

    def delete(self, key: str, agent_id: str) -> bool:
        """Delete a key from the store. Returns True if the key existed."""
        with self._lock:
            if key in self._store:
                del self._store[key]
                logger.info("Deleted key '%s' by '%s'", key, agent_id)
                return True
            return False

    def get_keys(self, prefix: str = "") -> list[str]:
        """List all keys, optionally filtered by prefix."""
        with self._lock:
            keys = list(self._store.keys())
        if prefix:
            keys = [k for k in keys if k.startswith(prefix)]
        return sorted(keys)

    @property
    def store_snapshot(self) -> dict[str, Any]:
        """Get a complete snapshot of the store as a plain dict (for debugging)."""
        with self._lock:
            return {
                key: {
                    "value": copy.deepcopy(val.value),
                    "version": val.version,
                    "agent_id": val.agent_id,
                }
                for key, val in self._store.items()
            }

    @property
    def stats(self) -> dict[str, int]:
        """Return read/write counters for observability."""
        return {
            "keys_count": len(self._store),
            "total_reads": len(self._read_log),
            "total_writes": len(self._write_log),
        }


class ConflictError(Exception):
    """Raised when a write operation detects a version conflict."""

    def __init__(self, key: str, expected_version: int, actual_version: int, agent_id: str) -> None:
        self.key = key
        self.expected_version = expected_version
        self.actual_version = actual_version
        self.agent_id = agent_id
        super().__init__(
            f"Version conflict on '{key}': agent '{agent_id}' expected v{expected_version} but current is v{actual_version}"
        )


# --- Usage Example ---

def demonstrate_shared_memory() -> None:
    """Demonstrate thread-safe shared memory with concurrent reads and writes."""
    import threading

    store = SharedMemoryStore()

    # Agent 1 writes initial position data
    pos_data = {"symbol": "BTC-PERP", "quantity": 2.5, "avg_entry": 67000.0}
    entry = store.write("positions:BTC-PERP", pos_data, agent_id="portfolio_agent")
    assert entry.version == 0

    # Agent 2 reads the position (gets a snapshot)
    snapshot = store.read("positions:BTC-PERP")
    assert snapshot is not None
    assert snapshot.agent_id == "portfolio_agent"
    assert snapshot.version == 0
    # Mutating the snapshot does NOT affect shared state
    snapshot.value["quantity"] = 999
    assert store.read("positions:BTC-PERP").value["quantity"] == 2.5

    # Agent 1 updates position with version check (optimistic concurrency)
    entry = store.write(
        "positions:BTC-PERP",
        {"symbol": "BTC-PERP", "quantity": 3.0, "avg_entry": 67000.0},
        agent_id="portfolio_agent",
        expected_version=0,
    )
    assert entry.version == 1

    # Agent 2 tries to write with stale version — gets ConflictError
    try:
        store.write(
            "positions:BTC-PERP",
            {"symbol": "BTC-PERP", "quantity": 3.5, "avg_entry": 67000.0},
            agent_id="risk_agent",
            expected_version=0,  # Stale! Current version is 1
        )
    except ConflictError as e:
        logger.info("Expected conflict caught: %s", e)

    # Read multiple keys atomically
    store.write("positions:ETH-PERP", {"symbol": "ETH-PERP", "quantity": 50.0}, agent_id="portfolio_agent")
    multi = store.read_many(["positions:BTC-PERP", "positions:ETH-PERP", "positions:NONEXISTENT"])
    assert len(multi) == 3
    assert multi["positions:ETH-PERP"] is not None
    assert multi["positions:NONEXISTENT"] is None

    # Batch write under single transaction
    store.write_batch([
        ("market_state:btc_price", 67500.0, "market_data_agent"),
        ("market_state:eth_price", 3450.0, "market_data_agent"),
        ("market_state:volatility", 0.032, "risk_agent"),
    ])

    logger.info("Store stats: %s", store.stats)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    demonstrate_shared_memory()
```

### Pattern 4: RPC-Style Agent Calls

RPC-style communication provides synchronous request/response interaction between agents. One agent calls another and waits for a structured result before continuing. This is essential when the caller must make decisions based on the callee's response — querying risk limits before executing a trade, checking availability before reserving resources, or validating data before processing. Every RPC call includes timeouts, configurable retries with exponential backoff, and comprehensive error propagation so failures surface to the caller immediately rather than silently degrading system behavior.

```python
"""RPCAgentBridge — Synchronous request/response communication between agents."""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable, Generic, Optional, TypeVar

logger = logging.getLogger(__name__)


class RPCStatus(str, Enum):
    """Outcome of an RPC call."""
    SUCCESS = "success"
    TIMEOUT = "timeout"
    ERROR = "error"
    REJECTED = "rejected"       # Agent explicitly declined the request
    UNAVAILABLE = "unavailable"  # Target agent not responding


@dataclass(frozen=True)
class RPCRequest:
    """Synchronous request sent from one agent to another.

    Unlike fire-and-forget messages, every RPCRequest carries an explicit
    call_id that ties the subsequent response back to this request. Callers
    await the matching RPCResponse before proceeding.
    """
    call_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    method: str = ""  # Operation name (e.g., "check_risk_limit", "get_position")
    source_agent: str = ""
    target_agent: str = ""
    args: dict[str, Any] = field(default_factory=dict)
    timeout_seconds: float = 30.0
    max_retries: int = 2
    timestamp_ns: int = field(default_factory=time.time_ns)

    @property
    def remaining_timeout_ns(self) -> int:
        """Nanoseconds until this request's deadline expires."""
        elapsed_ns = time.time_ns() - self.timestamp_ns
        deadline_ns = elapsed_ns + (self.timeout_seconds * 1_000_000_000)
        return max(0, deadline_ns - time.time_ns())

    @property
    def is_expired(self) -> bool:
        return time.time_ns() > self.timestamp_ns + (self.timeout_seconds * 1_000_000_000)


@dataclass(frozen=True)
class RPCResponse(Generic[T]):
    """Synchronous response returned by an agent to an RPCRequest.

    Always carries the original call_id so callers can correlate requests
    with responses even when multiple concurrent calls are in flight.
    """
    call_id: str
    status: RPCStatus
    result: Optional[T] = None
    error_message: str = ""
    source_agent: str = ""
    latency_ms: float = 0.0

    @property
    def is_success(self) -> bool:
        return self.status == RPCStatus.SUCCESS

    @property
    def is_recoverable(self) -> bool:
        """Whether the failure might succeed on retry."""
        return self.status in (RPCStatus.TIMEOUT, RPCStatus.UNAVAILABLE)

    def to_dict(self) -> dict[str, Any]:
        return {
            "call_id": self.call_id,
            "status": self.status.value,
            "result": self.result,
            "error_message": self.error_message,
            "source_agent": self.source_agent,
            "latency_ms": round(self.latency_ms, 3),
        }


R = TypeVar("R")


class RPCError(Exception):
    """Raised when an RPC call fails after all retries are exhausted."""

    def __init__(self, call_id: str, status: RPCStatus, error_message: str) -> None:
        self.call_id = call_id
        self.status = status
        self.error_message = error_message
        super().__init__(f"RPC {call_id[:8]}: {status.value} — {error_message}")


class AgentMethod:
    """Wraps an agent's callable method for RPC dispatch."""

    def __init__(self, handler: Callable[..., Awaitable[R] | R]) -> None:
        self.handler = handler

    async def invoke(self, args: dict[str, Any]) -> Any:
        if asyncio.iscoroutinefunction(self.handler):
            return await self.handler(**args)
        else:
            return self.handler(**args)


class RPCAgentBridge(Generic[R]):
    """Handles synchronous RPC-style communication between agents.

    Provides a request/response channel where one agent sends a typed request
    and waits for a response within a configurable timeout. Supports automatic
    retry with exponential backoff for transient failures (timeouts, unavailability).

    Usage:
        bridge = RPCAgentBridge()
        bridge.register_method("check_risk_limit", risk_agent_check)

        response = await bridge.call(
            request=RPCRequest(
                method="check_risk_limit",
                source_agent="execution_agent",
                target_agent="risk_agent",
                args={"symbol": "BTC-PERP", "side": "BUY", "size": 1.0},
                timeout_seconds=5.0,
            )
        )

        if response.is_success:
            execute_trade(response.result)
        else:
            handle_risk_rejection(response.error_message)
    """

    def __init__(self, max_retries: int = 2, base_retry_delay_ms: float = 100.0) -> None:
        self._methods: dict[str, AgentMethod] = {}
        self._max_retries = max_retries
        self._base_retry_delay_ms = base_retry_delay_ms
        self._call_log: list[dict[str, Any]] = []
        self._pending_calls: dict[str, RPCResponse[R]] = {}

    def register_method(self, method_name: str, handler: Callable[..., Awaitable[R] | R]) -> None:
        """Register a callable as an available RPC method.

        The handler must accept keyword arguments matching the 'args' dict
        sent in the RPCRequest. Both sync and async handlers are supported.

        Args:
            method_name: Unique name for this RPC method (used by callers).
            handler: Async or sync callable receiving **kwargs.

        Raises:
            ValueError: If a handler is already registered under this name.
        """
        if method_name in self._methods:
            raise ValueError(f"RPC method '{method_name}' already registered")
        self._methods[method_name] = AgentMethod(handler)
        logger.info("Registered RPC method '%s'", method_name)

    async def call(
        self,
        request: RPCRequest,
    ) -> RPCResponse[R]:
        """Execute a synchronous RPC call with retry and timeout logic.

        Sends the request to the target agent's method handler, awaits the
        response within the configured timeout, and retries up to max_retries
        times for transient failures.

        Args:
            request: The RPCRequest containing method name, arguments, and constraints.

        Returns:
            An RPCResponse with status, result (on success), or error details.

        Raises:
            ValueError: If the requested method is not registered.
            TimeoutError: If all retries are exhausted within the timeout window.
        """
        handler = self._methods.get(request.method)
        if not handler:
            return RPCResponse(
                call_id=request.call_id,
                status=RPCStatus.ERROR,
                error_message=f"Unknown method '{request.method}'",
                source_agent=self.__class__.__name__,
            )

        last_response: Optional[RPCResponse[R]] = None
        attempt = 0

        while attempt <= request.max_retries:
            start = time.monotonic()

            if request.is_expired and attempt > 0:
                return RPCResponse(
                    call_id=request.call_id,
                    status=RPCStatus.TIMEOUT,
                    error_message=f"Request expired after {attempt} retries",
                    source_agent=request.source_agent,
                    latency_ms=(time.monotonic() - start) * 1000,
                )

            try:
                # Invoke the handler with a timeout guard
                result = await asyncio.wait_for(
                    handler.invoke(request.args),
                    timeout=min(request.timeout_seconds, request.remaining_timeout_ns / 1e9),
                )
                latency_ms = (time.monotonic() - start) * 1000

                response = RPCResponse[R](
                    call_id=request.call_id,
                    status=RPCStatus.SUCCESS,
                    result=result,
                    source_agent=request.target_agent,
                    latency_ms=latency_ms,
                )

                self._call_log.append({
                    "call_id": request.call_id,
                    "method": request.method,
                    "source": request.source_agent,
                    "target": request.target_agent,
                    "status": "success",
                    "attempts": attempt + 1,
                    "latency_ms": round(latency_ms, 3),
                })

                return response

            except asyncio.TimeoutError:
                latency_ms = (time.monotonic() - start) * 1000
                last_response = RPCResponse[R](
                    call_id=request.call_id,
                    status=RPCStatus.TIMEOUT,
                    error_message=f"Handler did not respond within timeout",
                    source_agent=request.target_agent,
                    latency_ms=latency_ms,
                )

            except Exception as e:
                latency_ms = (time.monotonic() - start) * 1000
                last_response = RPCResponse[R](
                    call_id=request.call_id,
                    status=RPCStatus.ERROR,
                    error_message=str(e),
                    source_agent=request.target_agent,
                    latency_ms=latency_ms,
                )

            # Determine if we should retry
            attempt += 1
            if attempt > request.max_retries:
                break

            # Exponential backoff with jitter
            delay = self._base_retry_delay_ms * (2 ** (attempt - 1))
            import random
            jitter = random.uniform(0, delay * 0.2)
            await asyncio.sleep((delay + jitter) / 1000)

        # All retries exhausted — return the last error response
        if last_response is None:
            last_response = RPCResponse[R](
                call_id=request.call_id,
                status=RPCStatus.ERROR,
                error_message="Unexpected failure with no captured response",
            )

        self._call_log.append({
            "call_id": request.call_id,
            "method": request.method,
            "source": request.source_agent,
            "target": request.target_agent,
            "status": last_response.status.value,
            "error": last_response.error_message,
            "attempts": attempt,
            "latency_ms": round(last_response.latency_ms, 3),
        })

        return last_response

    @property
    def call_log(self) -> list[dict[str, Any]]:
        return list(self._call_log)

    @property
    def stats(self) -> dict[str, int]:
        successes = sum(1 for entry in self._call_log if entry["status"] == "success")
        failures = len(self._call_log) - successes
        return {
            "total_calls": len(self._call_log),
            "successes": successes,
            "failures": failures,
            "registered_methods": len(self._methods),
        }


# --- Usage Example ---

async def demonstrate_rpc_agent_calls() -> None:
    """Demonstrate RPC-style synchronous communication between risk and execution agents."""

    # Simulated risk agent method
    async def check_risk_limit(symbol: str, side: str, size: float) -> dict[str, Any]:
        """Risk agent validates whether a proposed trade is within limits."""
        await asyncio.sleep(0.05)  # Simulate processing time

        position_value = size * 67_500 if symbol == "BTC-PERP" else size * 3_450
        max_allowed = 100_000.0

        if position_value > max_allowed:
            return {
                "approved": False,
                "reason": f"Position value {position_value:.2f} exceeds max allowed {max_allowed:.2f}",
                "current_exposure": position_value,
                "remaining_capacity": max_allowed - position_value,
            }

        return {
            "approved": True,
            "symbol": symbol,
            "side": side,
            "size": size,
            "position_value": position_value,
            "risk_score": 0.35,
        }

    # Simulated strategy agent method
    async def get_signal(symbol: str) -> dict[str, Any]:
        """Strategy agent returns current trading signal for a symbol."""
        await asyncio.sleep(0.02)
        return {
            "symbol": symbol,
            "signal": "BUY",
            "confidence": 0.82,
            "target_price": 68_200.0,
            "stop_loss": 65_500.0,
        }

    # Create the RPC bridge and register methods
    risk_bridge = RPCAgentBridge[R](max_retries=3, base_retry_delay_ms=50.0)
    risk_bridge.register_method("check_risk_limit", check_risk_limit)
    risk_bridge.register_method("get_signal", get_signal)

    # --- Call 1: Check risk limit for a small trade (should succeed) ---
    request_1 = RPCRequest(
        method="check_risk_limit",
        source_agent="execution_agent",
        target_agent="risk_agent",
        args={"symbol": "BTC-PERP", "side": "BUY", "size": 0.5},
        timeout_seconds=5.0,
    )

    response_1 = await risk_bridge.call(request_1)
    assert response_1.is_success, f"Expected success, got {response_1.status.value}"
    assert response_1.result["approved"] is True
    logger.info("Trade approved: %.2f BTC at %.2f", request_1.args["size"], response_1.result["position_value"])

    # --- Call 2: Check risk limit for an oversized trade (should be rejected) ---
    request_2 = RPCRequest(
        method="check_risk_limit",
        source_agent="execution_agent",
        target_agent="risk_agent",
        args={"symbol": "BTC-PERP", "side": "BUY", "size": 5.0},
        timeout_seconds=5.0,
    )

    response_2 = await risk_bridge.call(request_2)
    assert response_2.is_success
    assert response_2.result["approved"] is False
    logger.info("Trade rejected: %s", response_2.result["reason"])

    # --- Call 3: Unknown method (should return error, no retries) ---
    request_3 = RPCRequest(
        method="unknown_method",
        source_agent="execution_agent",
        target_agent="risk_agent",
        args={},
        timeout_seconds=5.0,
    )

    response_3 = await risk_bridge.call(request_3)
    assert response_3.status == RPCStatus.ERROR
    logger.info("Error (expected): %s", response_3.error_message)

    # Print statistics
    stats = risk_bridge.stats
    logger.info("RPC Bridge stats: total=%d, success=%d, failures=%d, methods=%d",
                stats["total_calls"], stats["successes"], stats["failures"], stats["registered_methods"])


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(demonstrate_rpc_agent_calls())
```

---

## Constraints

### MUST DO
1. **Define every message as a typed dataclass or Pydantic model** — Never use raw dicts for inter-agent data. Type annotations prevent silent runtime errors when agents send unexpected fields or types.
2. **Include correlation_id in every message and event** — Correlation IDs enable end-to-end tracing across the full communication chain. Use them in logs, metrics, and debugging.
3. **Implement timeouts on all synchronous paths (RPC, shared memory write with lock)** — Never allow a single agent to block another indefinitely. Default timeout: 5 seconds for queries, 30 seconds for complex computations.
4. **Add retries with exponential backoff + jitter for transient failures** — Use base delay 100ms, multiplier 2x, max 5 attempts, and add 0–20% jitter to prevent thundering herd on retry storms.
5. **Serialize all shared state before cross-process transfer** — Even within the same process, always deep-copy values when reading from SharedMemoryStore to prevent mutation by multiple agents.
6. **Version all message schemas and reject unknown fields** — Include a `version` field in every message type. When deserializing, validate that the payload version is compatible with the reader's expectations. Reject payloads with unexpected required fields.
7. **Log every sent and received communication event** — Each log entry must contain: correlation_id, source_agent, target_agent, message_type, direction (sent/received), latency_ms, and status (success/error).

### MUST NOT DO
1. **Use untyped dicts for inter-agent payloads** — This is the single most common source of hard-to-debug agent communication bugs. Always use dataclasses or Pydantic models with explicit field types.
2. **Implement fire-and-forget messages without dead-letter queues** — If a message cannot be delivered to any handler, it must go to a dead-letter queue for later investigation, not be silently dropped.
3. **Share mutable state objects directly between agents without deep copying** — Even within the same process, agents should receive copies of shared data to prevent race conditions and unexpected side effects.
4. **Use wildcard subscriptions for event handlers in production systems** — Wildcards (`*` or `event.*`) create hidden coupling where agents react to events they don't explicitly declare interest in, making debugging nearly impossible.
5. **Implement RPC without timeouts** — A synchronous call with no timeout can block an agent forever if the target hangs, crashes, or enters a deadlock. Every RPC call must have both a per-call timeout and a maximum retry duration cap.
6. **Bypass the communication layer with direct object references** — All inter-agent communication must flow through defined protocols (message router, event bus, shared memory, or RPC bridge). Direct references create tight coupling that prevents independent agent evolution.

---

## Output Template

When implementing inter-agent communication for a multi-agent system, produce:

1. **Communication Architecture Overview** — Diagram of agent-to-agent communication paths with the pattern used on each link (message passing / event-driven / shared memory / RPC). Justify each pattern choice based on latency and consistency requirements.

2. **Message Schema Definitions** — Typed dataclass or Pydantic model definitions for every message type exchanged between agents, including required fields, types, defaults, and version numbers. Include serialization/deserialization methods.

3. **Communication Layer Implementation** — The full implementation of the chosen communication primitives (MessageRouter, EventBus, SharedMemoryStore, RPCAgentBridge) with all reliability mechanisms (timeouts, retries, dead-letter queues, circuit breakers).

4. **Reliability Configuration** — Retry policies (base delay, multiplier, max attempts), timeout values per communication type, dead-letter queue handling strategy, and observability instrumentation plan (metrics counters, log fields, trace propagation).

5. **Error Handling Strategy** — How each error class is classified (transient vs permanent), which errors trigger retries vs escalation vs dead-letter routing, and how agents report back to callers when their own downstream dependencies fail.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ai-agent-safety` | Security constraints for inter-agent communication — authentication, authorization, input sanitization, and secure message formatting |
| `multi-agent-patterns` | Higher-level multi-agent orchestration including skill selection, fallback chains, and coordination strategies that build on top of this communication layer |
| `task-decomposition-engine` | Breaks complex tasks into sub-tasks assigned to different agents via the communication patterns defined in this skill |
| `agent-reliability-engineering` | Circuit breakers, graceful degradation, and fault isolation for agent communication paths when downstream agents fail |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Multi-Agent Systems — Wikipedia Overview](https://en.wikipedia.org/wiki/Multi-agent_system)
- [Building Effective Agents — Anthropic Research](https://www.anthropic.com/research/building-effective-agents)
- [LLM Agents Survey — Lilian Weng](https://lilianweng.github.io/posts/2023-06-23-agent/)
- [Async Python Communication Patterns](https://docs.python.org/3/library/asyncio.html)
- [Event-Driven Architecture — Microsoft Learn](https://learn.microsoft.com/en-us/azure/architecture/guide/design-patterns/event-driven-architecture-guide)
