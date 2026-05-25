---
name: event-driven-architecture
description: Implements event-driven architecture patterns (pub/sub messaging, message
  queues, saga coordination, dead letter queues, outbox pattern, async processing)
  for building decoupled, scalable distributed systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: event-driven architecture, pub/sub messaging, saga pattern, dead letter
    queue, outbox pattern, how do i decouple services, async message processing, distributed
    messaging
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
  related-skills: microservice-resilience-patterns,event-sourcing-pattern,observability-patterns
------
# Event-Driven Architecture Patterns

Implements production-grade event-driven patterns to build decoupled, scalable distributed systems. When loaded, this skill makes the model design and implement pub/sub messaging, message queue consumers, saga coordination for distributed transactions, dead letter queue handling, the outbox pattern for reliable event delivery, and asynchronous processing pipelines with proper error handling and idempotency guarantees.

## TL;DR Checklist

- [ ] Define event schema using a shared interface with type-safe fields and metadata
- [ ] Implement an event bus that decouples publishers from subscribers
- [ ] Add saga orchestration for multi-step distributed transactions with compensating actions
- [ ] Configure dead letter queues for failed message processing with retry policies
- [ ] Use the outbox pattern to guarantee event delivery alongside database writes
- [ ] Ensure all event handlers are idempotent using idempotency keys
- [ ] Implement async processing with bounded concurrency and backpressure

---

## When to Use

Use this skill when:

- Designing a system where components need loose coupling through asynchronous communication
- Building order processing, notification dispatch, or data synchronization workflows that span multiple services
- Migrating from synchronous REST calls between services to an event-driven communication model
- Implementing distributed transactions across service boundaries where two-phase commit is too expensive
- Handling high-throughput data ingestion pipelines that require decoupled producers and consumers
- Adding real-time notification systems, audit logging, or analytics event collection

---

## When NOT to Use

Avoid this skill for:

- **Synchronous immediate consistency required** — use REST/gRPC instead of events when the caller needs an immediate response (use synchronous RPC patterns instead)
- **Simple CRUD applications with no inter-component dependencies** — events add unnecessary complexity and operational overhead to single-service apps
- **Eventual consistency is unacceptable** — if the system cannot tolerate temporary data staleness, event-driven communication will introduce unacceptable lag
- **Team lacks operational experience** — without experience in message broker management, pipeline monitoring, and debugging distributed failures, event-driven systems become unmanageable black holes

---

## Core Workflow

1. **Design the Event Schema** — Define typed event contracts that describe what happened in the domain. Each event must include: a globally unique correlation ID, causation ID linking to the triggering action, a timestamp in UTC ISO 8601 format, and type-safe payload fields. Use JSON schema or protocol buffers for validation. **Checkpoint:** Every event has at least `correlation_id`, `causation_id`, `event_type`, `timestamp_utc`, and `payload` — no arbitrary dict dumping.

2. **Implement the In-Process Event Bus** — Create an in-process pub/sub event bus that decouples domain logic from messaging infrastructure. The bus maintains a registry of event-type-to-handler mappings, dispatches events to all subscribed handlers synchronously (for same-process consistency), and raises `EventDispatchError` when any handler fails unexpectedly. **Checkpoint:** Publisher has zero knowledge of subscriber count or identity — it publishes by event type only.

3. **Set Up Message Queue Producers and Consumers** — For cross-service communication, configure a message broker (RabbitMQ, Kafka, SQS) with typed queues. Implement producers that serialize events to the broker's wire format with headers for routing keys, TTL, and delivery mode. Consumers must acknowledge messages only after successful processing, with configured prefetch counts to implement backpressure. **Checkpoint:** Every consumer has `acknowledge_on_success=True` and a dedicated dead-letter exchange bound to its queue for poison pill isolation.

4. **Orchestrate Sagas for Distributed Transactions** — When a business operation spans multiple services, implement a saga as a sequence of local transactions each followed by a publish event or a compensating action. Choose choreography (event-driven step triggering) for simple flows with 2–3 participants, and orchestration (central coordinator) for complex flows with branches, retries, or human approval steps. **Checkpoint:** Every forward action has a corresponding compensating action registered at saga initialization — no gaps allowed.

5. **Configure Dead Letter Queues** — Create a dead letter exchange/queue that captures messages exceeding the retry limit or failing validation permanently. Implement a DLQ consumer that logs full message context, records failure reason in an observability store, and optionally replays successfully recoverable messages back to the original queue. **Checkpoint:** The DLQ consumer runs independently with its own alerting — never let poison messages block the main processing pipeline.

6. **Implement the Outbox Pattern for Reliable Delivery** — Replace direct event publishing after database writes with a transactional outbox table. The service inserts both the business entity update and the outgoing event into the same database transaction, then a separate poller process publishes events from the outbox to the message broker. **Checkpoint:** Every row in the outbox has a `status` column (pending/published/dead) with exactly-once delivery tracking via `published_at` timestamps.

---

## Implementation Patterns / Reference Guide

### Pattern 1: In-Process Event Bus

A synchronous pub/sub event bus for decoupling components within the same process. The bus maintains a type-safe handler registry and dispatches events to all registered subscribers. This enables clean domain logic without infrastructure coupling.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Callable, TypeVar, Generic
import uuid


class EventType(str, Enum):
    """Strongly-typed event type identifiers."""
    ORDER_CREATED = "order.created"
    ORDER_CANCELLED = "order.cancelled"
    PAYMENT_PROCESSED = "payment.processed"
    PAYMENT_FAILED = "payment.failed"
    INVENTORY_RESERVED = "inventory.reserved"
    SHIPPING_SCHEDULED = "shipping.scheduled"


@dataclass(frozen=True)
class EventMetadata:
    """Immutable metadata attached to every event."""
    correlation_id: str
    causation_id: str
    event_type: EventType
    timestamp_utc: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @classmethod
    def generate(cls, event_type: EventType) -> "EventMetadata":
        """Create fresh metadata for a new event."""
        return cls(
            correlation_id=str(uuid.uuid4()),
            causation_id=str(uuid.uuid4()),
            event_type=event_type,
        )


T = TypeVar("T")


@dataclass(frozen=True)
class Event(Generic[T]):
    """Base event envelope with typed payload."""
    metadata: EventMetadata
    payload: T


class EventHandler(ABC, Generic[T]):
    """Abstract base for all event handlers. Subclasses define the processing logic."""

    @abstractmethod
    def handles(self) -> EventType:
        """Return the event type this handler processes."""
        ...

    @abstractmethod
    async def handle(self, event: Event[T]) -> None:
        """Process a single event. Must be idempotent."""
        ...


class EventBus:
    """In-process pub/sub event bus with type-safe routing.

    Publishers emit events by type without knowledge of subscribers.
    The bus dispatches each event to all matching handlers synchronously.
    """

    def __init__(self) -> None:
        self._handlers: dict[EventType, list[EventHandler[Any]]] = {}

    def subscribe(self, handler: EventHandler[Any]) -> None:
        """Register a handler for its declared event type."""
        event_type = handler.handles()
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def publish(self, event: Event[Any]) -> None:
        """Dispatch an event to all registered handlers for its type.

        Raises DispatchError if any handler raises an unexpected exception.
        Expected exceptions from the handler are caught and logged separately.
        """
        handlers = self._handlers.get(event.metadata.event_type, [])
        dispatch_errors: list[Exception] = []

        for handler in handlers:
            try:
                await handler.handle(event)
            except Exception as exc:
                dispatch_errors.append(exc)
                # Continue dispatching to remaining handlers even if one fails

        if dispatch_errors:
            error_details = "; ".join(str(e) for e in dispatch_errors)
            raise EventBusDispatchError(
                f"{len(dispatch_errors)} handler(s) failed: {error_details}"
            )


class EventBusDispatchError(RuntimeError):
    """Raised when one or more event handlers fail during dispatch."""
    pass
```

---

### Pattern 2: Saga Orchestration (Choreography Style)

A choreographed saga implements distributed transactions by having each service perform a local action and then publish an event that triggers the next step. Each participant must handle its compensating action when notified of a failure upstream.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable


class SagaStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"


@dataclass
class CompensationStep:
    """Represents a compensating (rollback) action for a forward step."""
    name: str
    action: Callable[[dict[str, Any]], None]

    def execute(self, context: dict[str, Any]) -> None:
        """Execute the compensating action with accumulated saga context."""
        self.action(context)


class ChoreographedSaga:
    """Orchestrates a distributed saga through event-driven step triggering.

    Each participant defines forward and compensating actions. When any step
    fails, compensating actions execute in reverse order for all completed steps.

    Example flow (order fulfillment):
      1. OrderService publishes ORDER_CREATED
         -> InventoryService reserves stock (publishes STOCK_RESERVED or STOCK_RESERVATION_FAILED)
         -> PaymentService charges card (publishes PAYMENT_PROCESSED or PAYMENT_FAILED)
         -> ShippingService schedules delivery (publishes SHIPPING_SCHEDULED)
    """

    def __init__(self, saga_id: str) -> None:
        self.saga_id = saga_id
        self.context: dict[str, Any] = {"saga_id": saga_id}
        self.completed_steps: list[CompensationStep] = []

    def _register_compensation(self, name: str, action: Callable[[dict[str, Any]], None]) -> None:
        """Register a compensating action for a completed forward step."""
        self.completed_steps.append(CompensationStep(name=name, action=action))

    def compensate_all(self) -> None:
        """Execute compensating actions in reverse order (last-completed first)."""
        self.completed_steps.reverse()
        errors: list[tuple[str, Exception]] = []

        for step in self.completed_steps:
            try:
                step.execute(self.context)
                print(f"[Saga {self.saga_id}] Compensated: {step.name}")
            except Exception as exc:
                errors.append((step.name, exc))
                print(f"[Saga {self.saga_id}] Compensation FAILED for {step.name}: {exc}")

        if errors:
            failed_names = [name for name, _ in errors]
            raise SagaCompensationError(
                f"{len(errors)} compensations failed: {failed_names}"
            )


class SagaCompensationError(RuntimeError):
    """Raised when one or more compensation actions fail during saga rollback."""
    pass
```

---

### Pattern 3: Outbox Pattern for Reliable Delivery

The outbox pattern guarantees that events are delivered to the message broker only after the associated database transaction commits. This eliminates the classic race condition where a service crashes between the DB write and the event publish.

```python
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class OutboxEntry:
    """Represents an event waiting to be published from the transactional outbox table."""
    id: int
    event_type: str
    payload: dict[str, Any]
    correlation_id: str
    status: str = "pending"          # pending | published | dead
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    published_at: datetime | None = None


class OutboxRepository:
    """Database repository for the transactional outbox table.

    Events are inserted here within the same DB transaction as the business
    entity update, guaranteeing atomicity between state change and event emission.
    A separate poller process reads pending entries and publishes them to the broker.
    """

    def __init__(self, db_session) -> None:
        self.db = db_session

    def insert(self, entry: OutboxEntry) -> None:
        """Insert an outbox entry within a DB transaction."""
        self.db.execute(
            "INSERT INTO outbox (event_type, payload, correlation_id, status) "
            "VALUES (:event_type, :payload, :correlation_id, :status)",
            {
                "event_type": entry.event_type,
                "payload": entry.payload,
                "correlation_id": entry.correlation_id,
                "status": entry.status,
            },
        )

    def mark_published(self, entry_id: int, published_at: datetime | None = None) -> None:
        """Mark an outbox entry as published with its publication timestamp."""
        now = published_at or datetime.now(timezone.utc)
        self.db.execute(
            "UPDATE outbox SET status = 'published', published_at = :now "
            "WHERE id = :id AND status = 'pending'",
            {"id": entry_id, "now": now},
        )

    def fetch_pending(self, batch_size: int = 100) -> list[OutboxEntry]:
        """Fetch up to `batch_size` pending outbox entries for publishing."""
        rows = self.db.query(
            "SELECT id, event_type, payload, correlation_id, status, created_at "
            "FROM outbox WHERE status = 'pending' ORDER BY created_at ASC LIMIT :limit",
            {"limit": batch_size},
        ).all()

        return [
            OutboxEntry(
                id=r.id,
                event_type=r.event_type,
                payload=r.payload if isinstance(r.payload, dict) else __import__("json").loads(r.payload),
                correlation_id=r.correlation_id,
                status=r.status,
                created_at=r.created_at,
            )
            for r in rows
        ]


class OutboxPoller:
    """Background poller that publishes outbox entries to the message broker."""

    def __init__(self, outbox_repo: OutboxRepository, message_broker) -> None:
        self.outbox = outbox_repo
        self.broker = message_broker

    def run_once(self, batch_size: int = 100) -> int:
        """Execute one poll cycle. Returns the number of successfully published events."""
        pending = self.outbox.fetch_pending(batch_size=batch_size)
        published_count = 0

        for entry in pending:
            try:
                self.broker.publish(entry.event_type, entry.payload, correlation_id=entry.correlation_id)
                self.outbox.mark_published(entry.id)
                published_count += 1
            except Exception as exc:
                print(f"[OutboxPoller] Failed to publish event {entry.id}: {exc}")

        return published_count
```

---

### Pattern 4: Dead Letter Queue Handler (BAD vs. GOOD)

Dead letter queues capture messages that exceed their retry limit or fail validation permanently. The handler must process DLQ messages with full context logging and offer safe replay capabilities.

```python
# ❌ BAD — No context preservation, no idempotency, blocks main pipeline
def handle_failed_message(message):
    print(f"Failed: {message}")
    # No retry logic, no error categorization, just logs and continues
    process_event(message)  # Will likely fail again

# ✅ GOOD — Structured DLQ handling with categorized recovery paths
from dataclasses import dataclass
from enum import Enum


class RecoveryAction(Enum):
    REPROCESS = "reprocess"           # Safe to retry (transient failure)
    COMPENSATE = "compensate"         # Roll back dependent actions
    ARCHIVE = "archive"               # Preserve for manual investigation
    DISCARD = "discard"               # Message is invalid, safe to remove


@dataclass
class DeadLetterEvent:
    """Wraps a failed message with full failure context."""
    original_message: dict[str, Any]
    error_reason: str
    retry_count: int
    max_retries: int
    first_failed_at: datetime
    last_attempted_at: datetime


class DeadLetterQueueHandler:
    """Processes messages from the dead letter queue with categorized recovery.

    Messages are classified into one of four recovery paths based on error type:
    - REPROCESS: Transient failures (network timeout, connection refused) can be retried
    - COMPENSATE: Business logic errors require rolling back dependent actions
    - ARCHIVE: Schema mismatches or corrupted payloads need manual review
    - DISCARD: Invalid messages that will never succeed (bad schema, expired TTL)
    """

    def __init__(
        self,
        broker,
        recovery_store,
        max_dlq_retries: int = 3,
    ) -> None:
        self.broker = broker
        self.recovery_store = recovery_store
        self.max_dlq_retries = max_dlq_retries

    def handle(self, failed_message: dict[str, Any], error: Exception) -> RecoveryAction:
        """Classify failure and execute the appropriate recovery action."""
        dlq_event = DeadLetterEvent(
            original_message=failed_message,
            error_reason=str(error),
            retry_count=len(self.recovery_store.get_attempts(failed_message["id"])),
            max_retries=self.max_dlq_retries,
            first_failed_at=datetime.now(timezone.utc),
            last_attempted_at=datetime.now(timezone.utc),
        )

        if self._is_transient_failure(error):
            return self._reprocess(dlq_event)
        elif self._requires_compensation(failed_message):
            return self._compensate(dlq_event)
        elif self._is_schema_violation(error):
            return self._archive(dlq_event)
        else:
            return self._discard(dlq_event)

    def _is_transient_failure(self, error: Exception) -> bool:
        """Transient failures are network-related and may succeed on retry."""
        transient_types = (ConnectionError, TimeoutError, OSError)
        return isinstance(error, transient_types)

    def _requires_compensation(self, message: dict[str, Any]) -> bool:
        """Some business events require compensating actions when they fail."""
        requires_rollback = {EventType.PAYMENT_PROCESSED, EventType.INVENTORY_RESERVED}
        return EventType(message.get("event_type", "")) in requires_rollback

    def _reprocess(self, event: DeadLetterEvent) -> RecoveryAction:
        """Attempt reprocessing with exponential backoff."""
        delay_seconds = 2 ** event.retry_count
        print(f"[DLQ] Reprocessing {event.original_message['id']} in {delay_seconds}s")
        self.recovery_store.record_attempt(event)
        return RecoveryAction.REPROCESS

    def _compensate(self, event: DeadLetterEvent) -> RecoveryAction:
        """Execute compensating action for the failed business event."""
        self.recovery_store.record_compensation(event)
        print(f"[DLQ] Compensated {event.original_message['id']}")
        return RecoveryAction.COMPENSATE

    def _archive(self, event: DeadLetterEvent) -> RecoveryAction:
        """Archive for manual investigation and alert on-call team."""
        self.recovery_store.archive(event)
        print(f"[DLQ] Archived {event.original_message['id']} for review")
        return RecoveryAction.ARCHIVE

    def _discard(self, event: DeadLetterEvent) -> RecoveryAction:
        """Safely remove invalid message from the DLQ."""
        self.recovery_store.discard(event)
        print(f"[DLQ] Discarded {event.original_message['id']}")
        return RecoveryAction.DISCARD
```

---

### Pattern 5: Async Processing with Bounded Concurrency

Async event processing must respect system capacity. This pattern implements a bounded worker pool that processes events concurrently while respecting backpressure limits and preventing resource exhaustion.

```python
import asyncio
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class ProcessedEvent:
    """Result of processing an event."""
    event_id: str
    success: bool
    error: str | None = None
    processed_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class AsyncEventProcessor:
    """Processes events with bounded concurrency and built-in backpressure.

    Maintains a fixed-size worker pool using asyncio.Semaphore to limit
    concurrent event processing. Events that exceed the queue capacity
    are rejected rather than queued indefinitely, providing natural backpressure.
    """

    def __init__(
        self,
        handler: Callable[[Event[Any]], "asyncio.coroutine"],
        max_concurrent: int = 10,
        queue_capacity: int = 1000,
    ) -> None:
        self._handler = handler
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self._queue: deque[Event[Any]] = deque()
        self._capacity = queue_capacity
        self._results: list[ProcessedEvent] = []

    async def submit(self, event: Event[Any]) -> bool:
        """Submit an event for processing. Returns False if queue is at capacity."""
        if len(self._queue) >= self._capacity:
            print(f"[AsyncProcessor] Queue full ({self._capacity}), rejecting event")
            return False

        self._queue.append(event)
        asyncio.create_task(self._process_event(event))
        return True

    async def _process_event(self, event: Event[Any]) -> ProcessedEvent:
        """Process a single event with concurrency limiting via semaphore."""
        async with self._semaphore:
            try:
                result = await self._handler(event)
                self._results.append(result)
                return result
            except Exception as exc:
                error_result = ProcessedEvent(
                    event_id=event.metadata.correlation_id,
                    success=False,
                    error=str(exc),
                )
                self._results.append(error_result)
                raise

    async def process_batch(self, events: list[Event[Any]]) -> list[ProcessedEvent]:
        """Process a batch of events concurrently with bounded parallelism."""
        tasks = [self._process_event(event) for event in events]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        formatted_results: list[ProcessedEvent] = []
        for event, result in zip(events, results):
            if isinstance(result, Exception):
                formatted_results.append(ProcessedEvent(
                    event_id=event.metadata.correlation_id,
                    success=False,
                    error=str(result),
                ))
            else:
                formatted_results.append(result)

        return formatted_results
```

---

## Constraints

### MUST DO
- Define every event with `correlation_id`, `causation_id`, `event_type`, and `timestamp_utc` metadata fields
- Make all event handlers idempotent by checking for duplicate correlation IDs before processing
- Implement the outbox pattern for any service that writes to a database AND publishes events — never publish directly after DB writes
- Configure dead letter queues with explicit retry policies; never let failed messages silently disappear
- Use bounded concurrency in async processors to prevent resource exhaustion under load
- Implement saga compensating actions BEFORE implementing forward steps — if you cannot define the rollback, you should not implement the transaction

### MUST NOT DO
- Publish events directly to a message broker immediately after a database write without using the outbox pattern
- Process DLQ messages in the same pipeline as normal messages — poison pills will block legitimate processing
- Use synchronous RPC calls between services when async messaging is sufficient — events are not appropriate for every inter-service call
- Implement sagas with more than 5 participants without a formal orchestration mechanism (use choreography only for simple flows)
- Allow event handlers to mutate shared state without idempotency guards — concurrent event processing will cause data corruption
- Set queue prefetch to unlimited — always configure prefetch limits to prevent memory exhaustion in slow consumers

---

## Output Template

When implementing or reviewing event-driven architecture, produce:

1. **Event Schema Definition** — List all event types with their payload fields, metadata requirements, and validation rules
2. **Component Dependency Map** — ASCII diagram showing which services publish and subscribe to each event type
3. **Saga Flow** — Step-by-step flow of forward actions and compensating actions for any multi-service transaction
4. **Reliability Analysis** — Confirmation that the outbox pattern is used, dead letter queues are configured, and idempotency guards exist
5. **Concurrency Profile** — Worker pool sizes, queue capacities, and backpressure mechanisms for async processing

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservice-resilience-patterns` | Add circuit breakers, retry logic, and bulkhead isolation to event-driven communication channels |
| `event-sourcing-pattern` | Implement the event store and projection layer that underpins many event-driven systems |
| `observability-patterns` | Add distributed tracing, metrics, and structured logging to monitor event flows across services |

---
