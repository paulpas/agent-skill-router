---
name: cqrs-pattern
description: Separates command (write) model from query (read) model using mediator
  pipelines, outbox pattern for reliable event publishing, and idempotent command
  handlers for systems with asymmetric read/write workloads.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: cqrs, command query responsibility segregation, mediator pattern, outbox
    pattern, idempotent commands, saga pattern, read write separation, event bus
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
  related-skills: event-sourcing, saga-pattern, idempotency-patterns
------
# Command Query Responsibility Segregation (CQRS)

Implements CQRS to separate command (write) model from query (read) model, enabling independent scaling, different consistency models, and clean domain boundaries. Uses mediator pipelines for cross-cutting concerns, the outbox pattern for reliable event publishing, and idempotent command handling for at-least-once delivery guarantees.

## TL;DR Checklist

- [ ] Separate command handlers (write) from query handlers (read) into distinct modules
- [ ] Route commands through a mediator pipeline with logging, tracing, and idempotency interceptors
- [ ] Use the outbox pattern to atomically persist events in the same DB transaction as aggregate state changes
- [ ] Implement idempotent command handlers using UUID-based idempotency keys (Redis-backed with Lua atomicity)
- [ ] Document consistency guarantees explicitly for each read model (strong, eventual, highly eventual)
- [ ] Set up saga orchestration for multi-step business processes spanning multiple aggregates

---

## When to Use

Use this skill when:

- Read/write ratio significantly exceeds 10:1 (e.g., read-heavy user lookups with infrequent mutations)
- Different authorization models are needed for reads versus writes
- Command side has complex domain logic that would bloat query models
- You need event-driven side effects (notifications, analytics indexes, audit trails) from command execution
- Systems require different consistency guarantees for reads and writes

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with balanced read/write ratios (~1:1 to 3:1)
- Early-stage products where the domain model will change rapidly (CQRS adds schema evolution complexity)
- Small teams without distributed systems experience (eventual consistency adds cognitive overhead)
- Systems with no requirement for audit trails or event-driven side effects

---

## Core Workflow

1. **Define Command and Query Interfaces** — Create distinct command objects (immutable dataclasses) for each write operation and query DTOs for read operations. Commands carry intent; queries carry filter criteria.
   **Checkpoint:** Every command must include an idempotency key field (`UUIDv7`) and every query must specify its required consistency level (STRONG, EVENTUAL, or HIGHLY_EVENTUAL).

2. **Set Up Mediator Pipeline** — Configure a request pipeline that processes commands through ordered middleware: logging → tracing/metrics → authorization check → idempotency guard → command handler → result mapper. Queries bypass the write-side middlewares but include caching interceptors.
   **Checkpoint:** Middleware must not depend on query handlers, and command handlers must never import query models directly.

3. **Implement Command Handlers** — Each command maps to exactly one handler that: validates business invariants via domain logic, applies state changes to the aggregate, publishes events (into the outbox), and returns a `Result[T]` type for explicit error handling.
   **Checkpoint:** The handler must never throw exceptions for expected business errors; use Result types instead.

4. **Configure Outbox Publishing** — Write aggregate state and domain events to the database in a single transaction via UnitOfWork. An outbox relay process polls the `outbox_events` table using `SKIP LOCKED` and publishes to the event bus asynchronously.
   **Checkpoint:** The outbox table must have a partial index on `published_at IS NULL` and use `UUIDv7` for time-ordered primary keys.

5. **Build Read Models (Projections)** — Event consumers subscribe to the event bus, process events incrementally with checkpoint persistence, and materialize read models into optimized query stores (PostgreSQL denormalized tables, Elasticsearch for search, Redis for hot data).
   **Checkpoint:** Each projection must implement idempotent event handling using `ON CONFLICT ... DO UPDATE` patterns.

6. **Document Consistency Boundaries** — For every handler, document whether it uses the write model (strong consistency) or read model (eventual consistency), and specify expected projection latency for each query endpoint.
   **Checkpoint:** Commands that require real-time validation must always read from the write model, never from projections.

---

## Implementation Patterns

### Pattern 1: Mediator Pipeline with Cross-Cutting Concerns

```python
from dataclasses import dataclass, field
from typing import Generic, TypeVar, Protocol, runtime_checkable, Any
from uuid import UUID, uuid7
from datetime import datetime, timezone
from enum import Enum


T = TypeVar("T")


class Result(Generic[T]):
    """Explicit result type replacing exceptions for flow control.

    Provides a type-safe way to return success or failure without
    relying on exception-based error paths that can bypass cleanup.
    """

    def __init__(self, success: bool, data: T | None = None, error: "Error" | None = None):
        self._success = success
        self._data = data
        self._error = error

    @classmethod
    def success(cls, data: T) -> "Result[T]":
        """Create a successful result with the provided data."""
        return cls(success=True, data=data)

    @classmethod
    def failure(cls, error: "Error") -> "Result[T]":
        """Create a failed result with the provided error."""
        return cls(success=False, error=error)

    @property
    def is_success(self) -> bool:
        return self._success

    @property
    def data(self) -> T | None:
        return self._data

    @property
    def error(self) -> "Error | None":
        return self._error


@dataclass(frozen=True)
class Error:
    """Represents a structured error with machine-readable code."""
    code: str
    message: str
    details: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Command:
    """Base class for all commands with idempotency support.

    All command subclasses inherit the UUIDv7-based command_id and
    an optional explicit idempotency_key for client-controlled deduplication.
    """
    command_id: UUID = field(default_factory=uuid7)
    handler: str | None = None


@dataclass(frozen=True)
class CreateUser(Command):
    command_id: UUID = field(default_factory=uuid7)
    first_name: str
    last_name: str
    email: str
    idempotency_key: str | None = None

    def get_idempotency_key(self) -> str:
        return self.idempotency_key or str(self.command_id)


class MediatorPipeline:
    """
    Processes commands through a chain of middleware.

    Order matters: logging → tracing → metrics → idempotency → handler → result mapper

    Usage:
        pipeline = MediatorPipeline()
        pipeline.use(logging_middleware)
        pipeline.use(idempotency_middleware)
        pipeline.register_handler(CreateUser, handle_create_user)
        result = await pipeline.send(CreateUser("Jane", "Doe", "jane@example.com"))
    """

    def __init__(self):
        self._middlewares: list[callable] = []
        self._handlers: dict[str, callable] = {}

    def use(self, middleware: callable) -> "MediatorPipeline":
        """Add middleware to the pipeline (appended in order)."""
        self._middlewares.append(middleware)
        return self

    def register_handler(self, command_type: type, handler: callable) -> "MediatorPipeline":
        """Register a command handler by its class name."""
        self._handlers[command_type.__name__] = handler
        return self

    async def send(self, command: Command) -> Result:
        """Execute the full pipeline for a command through all middlewares."""
        # Build the innermost handler call
        async def execute(command):
            handler_name = command.handler or type(command).__name__
            handler = self._handlers.get(handler_name)
            if not handler:
                return Result.failure(Error("HANDLER_NOT_FOUND", f"No handler registered for {handler_name}"))
            return await handler(command)

        # Wrap middlewares from outermost to innermost (reverse order)
        pipeline = execute
        for mw in reversed(self._middlewares):
            previous = pipeline
            async def make_wrapper(mw, prev):
                async def wrapped(cmd):
                    try:
                        return await mw(cmd, prev)
                    except Exception as e:
                        return Result.failure(Error("HANDLER_ERROR", str(e)))
                return wrapped
            pipeline = make_wrapper(mw, previous)

        return await pipeline(command)


# --- Middleware Examples ---

async def idempotency_middleware(
    command: Command,
    next_handler: callable,
    idempotency_store: "IdempotencyStore | None" = None,
) -> Result:
    """Check if this command was already processed before executing."""
    if isinstance(command, CreateUser):
        key = command.get_idempotency_key()
        if await idempotency_store.exists(key):  # type: ignore[name-defined]
            cached = await idempotency_store.get(key)  # type: ignore[name-defined]
            return Result.success(cached)

    result = await next_handler(command)

    if result.is_success and hasattr(command, 'get_idempotency_key'):
        await idempotency_store.record(  # type: ignore[name-defined]
            key=command.get_idempotency_key(),
            value=result._data.to_dict() if hasattr(result._data, 'to_dict') else result._data,
            ttl_seconds=3600,
        )

    return result


async def logging_middleware(command: Command, next_handler: callable) -> Result:
    """Log command execution with correlation ID."""
    import logging
    logger = logging.getLogger(f"cqrs.command.{type(command).__name__}")
    logger.info("Executing command %s (id=%s)", type(command).__name__, command.command_id)

    result = await next_handler(command)

    if result.is_success:
        logger.info("Command %s succeeded", type(command).__name__)
    else:
        logger.warning("Command %s failed: %s", type(command).__name__, result.error.code)

    return result


async def tracing_middleware(command: Command, next_handler: callable) -> Result:
    """Attach correlation ID for distributed tracing."""
    import uuid
    correlation_id = str(uuid.uuid4())

    result = await next_handler(command)
    return result
```

### Pattern 2: Outbox Pattern for Reliable Event Publishing

```python
from sqlalchemy import Table, Column, Integer, String, JSON, DateTime, Index, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
import uuid7


class UnitOfWork:
    """Manages database transactions and the outbox for atomic event persistence.

    Ensures that aggregate state changes and their corresponding domain events
    are persisted in a single transaction. Events are queued in memory and
    written to the outbox table only during commit, guaranteeing they are never
    lost if the transaction rolls back.
    """

    def __init__(self, db_pool):
        self._pool = db_pool
        self._conn = None
        self._outbox_events: list[dict] = []
        self._committed = False

    async def __aenter__(self):
        self._conn = await self._pool.acquire()
        await self._conn.execute("BEGIN")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._committed:
            await self._conn.execute("COMMIT")
        else:
            await self._conn.execute("ROLLBACK")
        await self._pool.release(self._conn)
        return False

    async def commit(self) -> None:
        """Commit both aggregate state changes and outbox events atomically."""
        if self._outbox_events and not self._committed:
            query = text("""
                INSERT INTO qx_outbox_events
                    (id, aggregate_type, aggregate_id, event_type, payload, version, created_at)
                VALUES (:id, :aggregate_type, :aggregate_id, :event_type, :payload, :version, NOW())
            """)

            for evt in self._outbox_events:
                await self._conn.execute(query, {
                    "id": uuid7.uuid7(),
                    "aggregate_type": evt["aggregate_type"],
                    "aggregate_id": evt["aggregate_id"],
                    "event_type": evt["event_type"],
                    "payload": evt["payload"],
                    "version": evt["version"],
                })

        self._committed = True

    def append_outbox_event(
        self,
        aggregate_type: str,
        aggregate_id: UUID,
        event_type: str,
        payload: dict,
        version: int,
    ) -> None:
        """Queue an event for outbox insertion (not yet written to DB)."""
        self._outbox_events.append({
            "aggregate_type": aggregate_type,
            "aggregate_id": aggregate_id,
            "event_type": event_type,
            "payload": payload,
            "version": version,
        })


class OutboxRelay:
    """
    Polls the outbox table and publishes events to the message broker.

    Uses SKIP LOCKED for contention-free multi-instance polling.
    Partial index on published_at IS NULL ensures only unpublish events are scanned.

    Typical deployment: run as a background process or container with a loop
    that polls every 1-5 seconds depending on event volume requirements.
    """

    POLL_QUERY = text("""
        SELECT id, aggregate_type, aggregate_id, event_type, payload
        FROM qx_outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at
        LIMIT :batch_size
        FOR UPDATE SKIP LOCKED
    """)

    MARK_PUBLISHED = text("""
        UPDATE qx_outbox_events
        SET published_at = NOW()
        WHERE id = ANY(:ids)
    """)

    def __init__(self, db_pool, event_publisher, batch_size: int = 100):
        self._pool = db_pool
        self._publisher = event_publisher
        self._batch_size = batch_size

    async def poll_and_publish(self) -> int:
        """Poll outbox and publish to event bus. Returns number of events published."""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(self.POLL_QUERY, {"batch_size": self._batch_size})

            if not rows:
                return 0

            events_to_publish = []
            row_ids = []

            for row in rows:
                event = {
                    "type": row["event_type"],
                    "aggregate_id": row["aggregate_id"],
                    "payload": row["payload"],
                }
                events_to_publish.append(event)
                row_ids.append(row["id"])

            # Publish all events to the message broker
            for event in events_to_publish:
                await self._publisher.publish(event)

            # Mark as published (separate statement but same connection context)
            if row_ids:
                await conn.execute(self.MARK_PUBLISHED, {"ids": row_ids})

            return len(events_to_publish)
```

### Pattern 3: Saga Orchestration for Distributed Transactions

```python
from enum import Enum
from dataclasses import dataclass, field
from typing import Callable, Any
from uuid import UUID


class SagaStatus(Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"


@dataclass
class CommandResult:
    success: bool
    command_name: str
    data: dict = field(default_factory=dict)
    error: str | None = None


class SagaStep:
    """Represents one step in a saga with forward and compensation logic."""

    def __init__(self, event_trigger: str):
        self.event_trigger = event_trigger
        self.forward_handler: Callable | None = None
        self.compensation_handler: Callable | None = None
        self.timeout_minutes: float | None = None

    def on_forward(self, handler: Callable) -> "SagaStep":
        """Register the forward action for this step."""
        self.forward_handler = handler
        return self

    def on_compensate(self, handler: Callable) -> "SagaStep":
        """Register the compensation (rollback) action for this step."""
        self.compensation_handler = handler
        return self

    def set_timeout(self, minutes: float) -> "SagaStep":
        """Set timeout for this saga step."""
        self.timeout_minutes = minutes
        return self


class SagaOrchestrator:
    """
    Coordinates multi-step business processes across services using the saga pattern.

    Each step has a forward action and a compensation action (rollback).
    If any step fails, all previous steps are compensated in reverse order.

    Example flow:
        Reserve Inventory → Authorize Payment → Confirm Order
                                           ↘ Refund Payment
                                          ↘ Release Inventory
    """

    def __init__(self, saga_id: UUID):
        self.saga_id = saga_id
        self.steps: list[SagaStep] = []
        self.status = SagaStatus.RUNNING
        self.context: dict[str, Any] = {}
        self.compensated_steps: list[SagaStep] = []

    def add_step(self, step: SagaStep) -> "SagaOrchestrator":
        """Add a saga step to the orchestrator."""
        self.steps.append(step)
        return self

    async def execute(self, initial_context: dict[str, Any]) -> CommandResult:
        """Execute all saga steps in forward order."""
        self.context.update(initial_context)

        for i, step in enumerate(self.steps):
            # Execute forward action
            result = await step.forward_handler(self.context)  # type: ignore[union-attr]

            if not result.success:
                # Step failed — start compensation of all previous steps
                self.status = SagaStatus.COMPENSATING
                await self._compensate(i - 1)
                return CommandResult(
                    success=False,
                    command_name=step.event_trigger,
                    error=result.error or "Step execution failed",
                )

            # Store result for potential compensation downstream steps
            self.context[f"step_{i}_result"] = result.data

        self.status = SagaStatus.COMPLETED
        return CommandResult(success=True, command_name="saga_complete", data=self.context)

    async def _compensate(self, from_step: int) -> None:
        """Compensate saga steps in reverse order."""
        for i in range(from_step, -1, -1):
            step = self.steps[i]
            if step.compensation_handler:
                try:
                    await step.compensation_handler(self.context)  # type: ignore[union-attr]
                    self.compensated_steps.append(step)
                except Exception as e:
                    import logging
                    logger = logging.getLogger("saga.compensation")
                    logger.error(
                        "Compensation failed for step %d (saga_id=%s): %s",
                        i, self.saga_id, str(e),
                    )

    @property
    def is_completed(self) -> bool:
        return self.status == SagaStatus.COMPLETED

    @property
    def has_failed(self) -> bool:
        return self.status in (SagaStatus.FAILED, SagaStatus.COMPENSATING)


# Example: Order fulfillment saga across inventory and payment services.

async def handle_order_fulfillment(
    order_id: UUID,
    items: list[dict],
    payment_method_id: UUID,
) -> CommandResult:
    """Orchestrate order fulfillment across inventory and payment services."""

    async def reserve_inventory(ctx):
        reservation = await inventory_service.reserve(  # type: ignore[name-defined]
            order_id=ctx["order_id"],
            items=items,
        )
        return CommandResult(success=True, command_name="reserve_inventory", data={"reservation_id": reservation.id})

    async def release_inventory(ctx):
        await inventory_service.release_reservation(  # type: ignore[name-defined]
            ctx.get("step_0_result", {}).get("reservation_id"),
        )

    async def authorize_payment(ctx):
        auth = await payment_service.authorize(  # type: ignore[name-defined]
            order_id=ctx["order_id"],
            amount=ctx["total_amount"],
            method_id=payment_method_id,
        )
        return CommandResult(success=True, command_name="authorize_payment", data={"authorization_id": auth.id})

    async def refund_payment(ctx):
        await payment_service.refund(  # type: ignore[name-defined]
            ctx.get("step_1_result", {}).get("authorization_id"),
        )

    async def confirm_order(ctx):
        await order_service.confirm(  # type: ignore[name-defined]
            order_id=ctx["order_id"],
            reservation_id=ctx.get("step_0_result", {}).get("reservation_id"),
            payment_auth_id=ctx.get("step_1_result", {}).get("authorization_id"),
        )
        return CommandResult(success=True, command_name="confirm_order")

    async def cancel_order(ctx):
        await order_service.cancel(  # type: ignore[name-defined]
            order_id=ctx["order_id"],
            reason="fulfillment_failed",
        )

    # Build saga: inventory → payment → confirm (with compensations)
    saga = SagaOrchestrator(saga_id=uuid7.uuid7())

    saga.add_step(SagaStep("inventory_reserved")) \
        .on_forward(reserve_inventory) \
        .on_compensate(release_inventory) \
        .set_timeout(minutes=5)

    saga.add_step(SagaStep("payment_authorized")) \
        .on_forward(authorize_payment) \
        .on_compensate(refund_payment) \
        .set_timeout(minutes=10)

    saga.add_step(SagaStep("order_confirmed")) \
        .on_forward(confirm_order) \
        .on_compensate(cancel_order)

    initial_ctx = {
        "order_id": order_id,
        "total_amount": sum(item["price"] * item["quantity"] for item in items),
    }

    return await saga.execute(initial_ctx)
```

## Constraints

### MUST DO
- Route commands through a mediator pipeline with idempotency middleware enabled
- Use the outbox pattern (not direct event publishing) for all domain events
- Implement every command handler as idempotent using UUID-based idempotency keys
- Use `Result[T]` types instead of exceptions for expected business error flow control
- Document consistency guarantees (strong, eventual, highly eventual) for each read endpoint
- Use PostgreSQL advisory transaction locks (`pg_advisory_xact_lock`) for optimistic concurrency

### MUST NOT DO
- Query read models from within command handlers (read models are eventually consistent)
- Use exceptions for business logic flow control — use Result types instead
- Publish events directly without the outbox pattern (violates atomicity guarantee)
- Share state or imports between command and query handler modules
- Process commands with the same idempotency key concurrently (use distributed locks)

## Output Template

When implementing or reviewing CQRS architecture, produce:

1. **Command/Query Separation Diagram** — ASCII art showing request flow from API → mediator pipeline → handlers → outbox → projections
2. **Idempotency Strategy** — Which commands are idempotent, key format (UUIDv7), storage backend (Redis with Lua)
3. **Outbox Configuration** — Table schema, partial index definition, relay batch size and polling interval
4. **Saga Definition** — For multi-step processes: steps in order, forward actions, compensation actions, timeouts
5. **Consistency Map** — Table mapping each API endpoint to its consistency level and data source (write model vs read model)

## Related Skills

| Skill | Purpose |
|---|---|
| `event-sourcing` | Persist state as an immutable event log — the write model backing CQRS commands |
| `saga-pattern` | Detailed saga orchestration and choreography patterns for distributed transactions |
| `idempotency-patterns` | General-purpose idempotency techniques beyond command handling |

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Microservices Pattern: Outbox](https://microservices.io/patterns/data/outbox.html)
- [Event Sourcing — Microsoft Architecture Guide](https://learn.microsoft.com/en-us/azure/architecture/guide/design-patterns/event-sourcing)
- [CQRS Pattern — Microsoft Architecture Guide](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
- [Mediator Pattern — Martin Fowler](https://martinfowler.com/articles/cqrs.html)
- [Saga Pattern — Microsoft Docs](https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/saga/saga)
