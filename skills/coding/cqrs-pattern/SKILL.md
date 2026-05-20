---
name: cqrs-pattern
description: Implements CQRS (Command Query Responsibility Segregation) with separate command handlers for writes, query handlers for reads, projection-based read models, and eventual consistency mechanisms.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: cqrs, command query segregation, write model, read model, projection, separate read write models, how do i separate reads from writes, event sourcing read side, eventual consistency
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, event-sourcing-pattern
---

# Command Query Responsibility Segregation

Implements CQRS (Command Query Responsibility Segregation) to separate write operations from read operations using dedicated command handlers, query handlers, projection-based read models, and eventual consistency mechanisms. When this skill loads, the model designs systems where commands mutate state through a write model while queries read from optimized, denormalized read models — following SOLID principles for single responsibility and clean boundaries.

## TL;DR Checklist

- [ ] Define Command (write) and Query (read) as distinct typed objects with no cross-over
- [ ] Implement separate CommandHandler and QueryHandler interfaces with single-responsibility dispatch
- [ ] Ensure command handlers NEVER query the write model — they only validate, execute, and persist
- [ ] Ensure query handlers NEVER mutate state — they only read from denormalized read models
- [ ] Build projections that derive read models from events or state changes with idempotent transforms
- [ ] Document eventual consistency windows and design UI/workflows accordingly
- [ ] Allow different storage engines for write model (e.g., PostgreSQL) and read model (e.g., Elasticsearch, Redis)
- [ ] Include BAD vs GOOD examples demonstrating the command/query boundary enforcement

---

## When to Use

Use this skill when:

- Designing a system where read and write workloads have fundamentally different access patterns (e.g., heavy analytical reads on order data with infrequent but complex writes)
- Building an event-driven architecture where you need multiple projections from the same set of domain events into different read-optimized views
- The system must scale reads and writes independently — for example, a dashboard serving thousands of queries per second while write throughput is modest
- You are refactoring a monolithic ORM-based service to decouple its command logic (CUD operations) from its query logic (complex aggregations, joins, reporting)
- Building an order management system, inventory tracking platform, or financial ledger where auditability of writes and speed of reads are both critical

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with a single entity type and straightforward queries — the overhead of maintaining two models and projections outweighs the benefits (use `hexagonal-architecture` instead)
- Systems requiring strong consistency between reads and writes with zero staleness tolerance — CQRS introduces eventual consistency windows that cannot be eliminated
- Read-heavy workloads where the read model is trivially derived from the write model without any denormalization — you are not gaining performance or scalability advantages

---

## Core Workflow

1. **Define Command and Query Value Objects** — Create immutable, typed command objects for each write intent (e.g., `CreateOrderCommand`, `UpdateOrderStatusCommand`) and query objects for each read shape (e.g., `GetOrderDetailsQuery`, `ListOrdersByCustomerQuery`). Commands carry data to mutate; queries carry filter/search parameters.
   **Checkpoint:** Every command class has a unique command name/type discriminator, carries only the fields needed for that mutation, and has zero methods beyond data accessors. Every query object specifies its exact return type annotation.

2. **Implement CommandHandler Interface and Registry** — Define a `CommandHandler[T]` protocol with an async `handle(command: T) -> Any` method. Build a `CommandRegistry` that maps command types to handler instances using explicit registration (not introspection). Commands dispatched through the registry are validated before execution.
   **Checkpoint:** The registry uses a type-map lookup (`type_map[command.__class__]`). Attempting to dispatch an unregistered command type raises `UnknownCommandError` — no implicit handlers or magic resolution.

3. **Implement QueryHandler Interface and Registry** — Define a `QueryHandler[T, R]` protocol with an async `handle(query: T) -> R` method. Build a `QueryRegistry` that maps query types to handler instances. Query handlers read exclusively from the read-model repository (not the write model).
   **Checkpoint:** Every query handler's implementation body contains no mutations — no `insert`, `update`, `delete`, or state-altering calls. If a handler must mutate for side-effect purposes, it must be reclassified as a command.

4. **Build Projections from Domain Events** — Implement projection classes that subscribe to domain events and incrementally update the read model. Each projection must be idempotent (processing the same event twice produces the same result) and track processed event IDs. Use a `ProjectionStore` for durability of projection state.
   **Checkpoint:** After replaying events 1 through N, the read model state is identical whether replayed incrementally or in one batch. Verify by comparing final state snapshots.

5. **Wire Eventual Consistency Handling** — Define and document the consistency window between command execution and read model update. Implement a `ConsistencyChecker` that allows callers to optionally wait for a projection to catch up, or to proceed with stale data under documented constraints (e.g., "read-your-writes" session consistency within the same request).
   **Checkpoint:** The system explicitly exposes whether it offers immediate consistency, read-your-writes, or best-effort — and all API contracts document which guarantee applies.

6. **Configure Separate Read/Write Storage Engines** — Assign the write model to a transactional store (e.g., PostgreSQL) with full ACID guarantees. Assign read models to storage optimized for query patterns (e.g., Elasticsearch for full-text search, Redis for low-latency lookups, or a denormalized SQLite view for analytics). Projections bridge between them.
   **Checkpoint:** No code path allows a command handler to write directly to the read-model store or a query handler to access the write-model store — enforce via dependency injection boundaries.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Command Handler Architecture

Commands are immutable value objects representing an intention to change state. Each command is handled by exactly one handler that validates, executes business logic, persists changes to the write model, and emits domain events. The command registry routes commands by type using explicit registration — no introspection, no magic.

```python
"""Command and CommandHandler architecture for CQRS."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any


# ─── Domain Value Objects ──────────────────────────────────────────────────────

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class CreateOrderCommand:
    """Command to create a new order with line items."""
    customer_id: str
    items: list[dict[str, Any]]  # Each dict: {"product_id": str, "quantity": int, "price": float}
    shipping_address_id: str

    def __post_init__(self) -> None:
        if not self.customer_id or len(self.customer_id) < 5:
            raise ValueError("customer_id must be at least 5 characters")
        if not self.items:
            raise ValueError("order must contain at least one line item")
        for item in self.items:
            if item["quantity"] <= 0:
                raise ValueError(f"Invalid quantity {item['quantity']} for product {item.get('product_id')}")
            if item["price"] < 0:
                raise ValueError(f"Invalid price {item['price']} for product {item.get('product_id')}")


@dataclass(frozen=True)
class UpdateOrderStatusCommand:
    """Command to transition an order's status."""
    order_id: str
    new_status: OrderStatus

    def __post_init__(self) -> None:
        if not self.order_id or len(self.order_id) < 5:
            raise ValueError("order_id must be at least 5 characters")


@dataclass(frozen=True)
class CancelOrderCommand:
    """Command to cancel an existing order."""
    order_id: str
    reason: str

    def __post_init__(self) -> None:
        if not self.order_id or len(self.order_id) < 5:
            raise ValueError("order_id must be at least 5 characters")
        if not self.reason or len(self.reason.strip()) < 2:
            raise ValueError("cancellation reason must be at least 2 characters")


# ─── Domain Events (emitted after command execution) ──────────────────────────

@dataclass(frozen=True)
class OrderCreatedEvent:
    order_id: str
    customer_id: str
    total_amount: float
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class OrderStatusChangedEvent:
    order_id: str
    previous_status: OrderStatus
    new_status: OrderStatus
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class OrderCancelledEvent:
    order_id: str
    reason: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Command Handler Protocol ────────────────────────────────────────────────

class CommandHandler(ABC):
    """Base interface for all command handlers.
    
    Each handler processes exactly one command type, enforces business invariants,
    persists changes to the write model, and emits domain events.
    
    Follows SOLID Single Responsibility Principle: each handler owns one write intent.
    """

    @abstractmethod
    async def handle(self, command: Any) -> Any:
        """Process a command and return the result (typically an event or entity ID)."""
        ...


# ─── Command Registry ────────────────────────────────────────────────────────

class UnknownCommandError(Exception):
    """Raised when a command type has no registered handler."""


class CommandRegistry:
    """Explicit type-based routing from commands to handlers.
    
    Uses a direct type-map lookup — no introspection, no magic.
    Unregistered commands fail fast with UnknownCommandError.
    """

    def __init__(self) -> None:
        self._handlers: dict[type, CommandHandler] = {}

    def register(self, command_type: type, handler: CommandHandler) -> None:
        if command_type in self._handlers:
            raise ValueError(f"Command type {command_type.__name__} already registered")
        self._handlers[command_type] = handler

    async def dispatch(self, command: Any) -> Any:
        handler = self._handlers.get(type(command))
        if handler is None:
            raise UnknownCommandError(
                f"No handler registered for command type '{type(command).__name__}'. "
                f"Register it via registry.register({type(command).__name__}, handler)"
            )
        return await handler.handle(command)


# ─── Write Model (Persistent Entity Store — e.g., PostgreSQL) ───────────────

class WriteModelRepository(ABC):
    """Interface for the write model persistence layer.
    
    Commands interact exclusively with this repository. Queries NEVER use it.
    """

    @abstractmethod
    async def save_order(self, order_id: str, customer_id: str, items: list[dict],
                         status: OrderStatus, shipping_address_id: str) -> None:
        ...

    @abstractmethod
    async def update_order_status(self, order_id: str, new_status: OrderStatus) -> OrderStatus:
        ...

    @abstractmethod
    async def get_order(self, order_id: str) -> dict | None:
        ...


# ─── Event Store (emitted events for projection consumers) ────────────────────

class EventBus(ABC):
    """Interface for publishing domain events to all projection subscribers."""

    @abstractmethod
    async def publish(self, event: Any) -> None:
        ...


# ─── Concrete Command Handlers ───────────────────────────────────────────────

class CreateOrderHandler(CommandHandler):
    """Creates a new order after validating all business rules.
    
    Validates customer_id, items (quantity > 0, price >= 0), computes total.
    Persists to write model and emits OrderCreatedEvent.
    """

    def __init__(self, write_repo: WriteModelRepository, event_bus: EventBus) -> None:
        self._write_repo = write_repo
        self._event_bus = event_bus

    async def handle(self, command: CreateOrderCommand) -> str:
        order_id = uuid.uuid4().hex[:12]

        # Validate business rules (guard clause pattern — Law 1: Early Exit)
        total_amount = sum(item["price"] * item["quantity"] for item in command.items)

        if total_amount <= 0:
            raise ValueError("Order total must be positive")

        # Persist to write model only (no querying, no read model mutation)
        await self._write_repo.save_order(
            order_id=order_id,
            customer_id=command.customer_id,
            items=command.items,
            status=OrderStatus.PENDING,
            shipping_address_id=command.shipping_address_id,
        )

        # Emit domain event (projection consumers subscribe to this)
        await self._event_bus.publish(OrderCreatedEvent(
            order_id=order_id,
            customer_id=command.customer_id,
            total_amount=total_amount,
        ))

        return order_id


class UpdateOrderStatusHandler(CommandHandler):
    """Transitions an order to a new status.
    
    Validates the status transition is allowed (e.g., cannot go from SHIPPED to PENDING).
    Persists to write model and emits OrderStatusChangedEvent.
    """

    ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
        OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
        OrderStatus.DELIVERED: set(),  # terminal state
        OrderStatus.CANCELLED: set(),  # terminal state
    }

    def __init__(self, write_repo: WriteModelRepository, event_bus: EventBus) -> None:
        self._write_repo = write_repo
        self._event_bus = event_bus

    async def handle(self, command: UpdateOrderStatusCommand) -> OrderStatusChangedEvent:
        existing = await self._write_repo.get_order(command.order_id)
        if existing is None:
            raise ValueError(f"Order {command.order_id} not found")

        previous_status = OrderStatus(existing["status"])

        # Validate transition
        allowed = self.ALLOWED_TRANSITIONS.get(previous_status, set())
        if command.new_status not in allowed:
            raise ValueError(
                f"Cannot transition from {previous_status.value} to {command.new_status.value}"
            )

        await self._write_repo.update_order_status(command.order_id, command.new_status)

        return OrderStatusChangedEvent(
            order_id=command.order_id,
            previous_status=previous_status,
            new_status=command.new_status,
        )
```

---

### Pattern 2: Query Handler with Denormalized Read Model

Query handlers read exclusively from denormalized read models — never from the write model. Each query handler returns a specific data shape optimized for its consumer (e.g., an order details view, a paginated list view). The read model is pre-joined and pre-aggregated by projections, so queries are fast single-table lookups.

```python
"""Query handlers that read from denormalized read models."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


# ─── Query Value Objects (immutable, typed) ──────────────────────────────────

@dataclass(frozen=True)
class GetOrderDetailsQuery:
    order_id: str


@dataclass(frozen=True)
class ListOrdersByCustomerQuery:
    customer_id: str
    status_filter: OrderStatus | None = None
    page: int = 1
    page_size: int = 20

    def __post_init__(self) -> None:
        if self.page < 1:
            raise ValueError("page must be >= 1")
        if not (1 <= self.page_size <= 100):
            raise ValueError("page_size must be between 1 and 100")


@dataclass(frozen=True)
class SearchOrdersByKeywordQuery:
    keyword: str
    status_filter: OrderStatus | None = None
    page: int = 1
    page_size: int = 20

    def __post_init__(self) -> None:
        if not self.keyword or len(self.keyword.strip()) < 2:
            raise ValueError("keyword must be at least 2 characters")


# ─── Query Result DTOs (what the read model returns) ────────────────────────

@dataclass
class OrderSummary:
    order_id: str
    customer_id: str
    status: OrderStatus
    total_amount: float
    item_count: int
    created_at: datetime


@dataclass
class OrderDetails:
    order_id: str
    customer_id: str
    status: OrderStatus
    items: list[dict[str, Any]]
    total_amount: float
    shipping_address_id: str
    created_at: datetime
    updated_at: datetime | None = None


@dataclass
class PaginatedResult:
    items: list[Any]
    page: int
    page_size: int
    total_count: int

    @property
    def total_pages(self) -> int:
        return (self.total_count + self.page_size - 1) // self.page_size


# ─── Read Model Repository (denormalized, query-optimized store) ──────────────

class ReadModelRepository(ABC):
    """Interface for the read model persistence layer.
    
    Query handlers interact exclusively with this repository.
    This is typically a different storage engine than the write model —
    e.g., Elasticsearch for full-text search, Redis for low-latency lookups,
    or a denormalized SQLite view for reporting.
    """

    @abstractmethod
    async def get_order_details(self, order_id: str) -> OrderDetails | None:
        ...

    @abstractmethod
    async def list_orders(
        self, customer_id: str, status_filter: OrderStatus | None,
        page: int, page_size: int
    ) -> PaginatedResult:
        ...

    @abstractmethod
    async def search_orders(
        self, keyword: str, status_filter: OrderStatus | None,
        page: int, page_size: int
    ) -> PaginatedResult:
        ...


# ─── Query Handler Protocol ──────────────────────────────────────────────────

class QueryHandler(ABC):
    """Base interface for all query handlers.
    
    Each handler processes exactly one query type and returns data from the read model.
    Query handlers MUST NEVER mutate state — they are pure reads.
    
    Follows SOLID Single Responsibility Principle: each handler owns one read shape.
    """

    @abstractmethod
    async def handle(self, query: Any) -> Any:
        ...


class QueryRegistry:
    """Explicit type-based routing from queries to handlers."""

    def __init__(self) -> None:
        self._handlers: dict[type, QueryHandler] = {}

    def register(self, query_type: type, handler: QueryHandler) -> None:
        if query_type in self._handlers:
            raise ValueError(f"Query type {query_type.__name__} already registered")
        self._handlers[query_type] = handler

    async def dispatch(self, query: Any) -> Any:
        handler = self._handlers.get(type(query))
        if handler is None:
            raise UnknownCommandError(  # Reuse for consistency
                f"No handler registered for query type '{type(query).__name__}'."
            )
        return await handler.handle(query)


# ─── Concrete Query Handlers ─────────────────────────────────────────────────

class GetOrderDetailsQueryHandler(QueryHandler):
    """Retrieves full order details from the denormalized read model.
    
    Reads only — no mutation, no write model access. Returns pre-joined data
    populated by projections.
    """

    def __init__(self, read_repo: ReadModelRepository) -> None:
        self._read_repo = read_repo

    async def handle(self, query: GetOrderDetailsQuery) -> OrderDetails | None:
        return await self._read_repo.get_order_details(query.order_id)


class ListOrdersByCustomerQueryHandler(QueryHandler):
    """Returns a paginated list of orders for a given customer.
    
    Optionally filters by status. Uses the denormalized read model directly —
    no joins, no aggregation at query time.
    """

    def __init__(self, read_repo: ReadModelRepository) -> None:
        self._read_repo = read_repo

    async def handle(self, query: ListOrdersByCustomerQuery) -> PaginatedResult:
        return await self._read_repo.list_orders(
            customer_id=query.customer_id,
            status_filter=query.status_filter,
            page=query.page,
            page_size=query.page_size,
        )


# ─── BAD vs. GOOD: Query Handler — Enforcing the Read/Write Boundary ─────────

class BadQueryHandler(QueryHandler):
    """❌ BAD: This query handler mutates state by calling the write model.
    
    Violation of CQRS boundary — a query should only READ from the read model,
    never touch the write model or mutate any state."""

    def __init__(self, write_repo: WriteModelRepository) -> None:  # Wrong dependency!
        self._write_repo = write_repo

    async def handle(self, query: GetOrderDetailsQuery) -> Any:
        order = await self._write_repo.get_order(query.order_id)
        
        # ❌ BAD: Query handler is incrementing a "view_count" — this is state mutation!
        if order:
            views = order.get("view_count", 0) + 1
            await self._write_repo.update_order_view_count(order["id"], views)
        
        return order


class GoodQueryHandler(QueryHandler):
    """✅ GOOD: This query handler reads only from the read model.
    
    If you need to track view counts, do so via a command (e.g., RecordOrderViewCommand)
    or through a separate analytics projection that is decoupled from the query layer."""

    def __init__(self, read_repo: ReadModelRepository):  # Correct dependency — read model only
        self._read_repo = read_repo

    async def handle(self, query: GetOrderDetailsQuery) -> OrderDetails | None:
        result = await self._read_repo.get_order_details(query.order_id)
        
        # ✅ GOOD: Pure read. No mutation whatsoever. If views need tracking,
        # that's a separate command or analytics pipeline concern.
        return result
```

---

### Pattern 3: Projection Builder — Deriving Read Models from Events

Projections subscribe to domain events and incrementally update the denormalized read model. Each projection is idempotent (processing the same event twice produces identical state) and tracks processed event IDs for exactly-once semantics. The `ProjectionRunner` manages replay of events from a given point, enabling the read model to be rebuilt at any time.

```python
"""Projection builders that derive denormalized read models from domain events."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


logger = logging.getLogger(__name__)


# ─── Domain Events (shared with command handlers) ────────────────────────────

@dataclass(frozen=True)
class OrderCreatedEvent:
    order_id: str
    customer_id: str
    total_amount: float
    item_count: int
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class OrderStatusChangedEvent:
    order_id: str
    previous_status: str  # string for portability across stores
    new_status: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass(frozen=True)
class OrderCancelledEvent:
    order_id: str
    reason: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


# ─── Projection Store (tracks processed event IDs for idempotency) ───────────

class ProjectionStore(ABC):
    """Durable store that tracks which events each projection has processed.
    
    Enables exactly-once semantics and safe replay of projections from any point.
    """

    @abstractmethod
    async def get_last_processed_event_id(self, projection_name: str) -> str | None:
        """Return the event ID of the last event processed by this projection."""
        ...

    @abstractmethod
    async def save_processed_event(self, projection_name: str, event_id: str) -> None:
        """Mark an event as processed by this projection."""
        ...


class InMemoryProjectionStore(ProjectionStore):
    """In-memory implementation for testing and development."""

    def __init__(self) -> None:
        self._state: dict[str, str] = {}

    async def get_last_processed_event_id(self, projection_name: str) -> str | None:
        return self._state.get(projection_name)

    async def save_processed_event(self, projection_name: str, event_id: str) -> None:
        self._state[projection_name] = event_id


# ─── Read Model Store (denormalized store for queries) ────────────────────────

class DenormalizedStore(ABC):
    """Interface for the denormalized read model store.
    
    Typically implemented with Elasticsearch, Redis, or a denormalized SQL view —
    whichever best fits the query access patterns.
    """

    @abstractmethod
    async def upsert_order_summary(self, summary: dict[str, Any]) -> None:
        ...

    @abstractmethod
    async def remove_order(self, order_id: str) -> None:
        ...


class InMemoryDenormalizedStore(DenormalizedStore):
    """In-memory denormalized store for testing."""

    def __init__(self) -> None:
        self._orders: dict[str, dict[str, Any]] = {}

    async def upsert_order_summary(self, summary: dict[str, Any]) -> None:
        order_id = summary["order_id"]
        if order_id in self._orders:
            self._orders[order_id].update(summary)
        else:
            self._orders[order_id] = dict(summary)

    async def remove_order(self, order_id: str) -> None:
        self._orders.pop(order_id, None)


# ─── Projection Base Class ───────────────────────────────────────────────────

class Projection(ABC):
    """Base class for all projections.
    
    Each projection implements handlers for the domain events it cares about,
    updating the denormalized read model incrementally and idempotently.
    
    Idempotency is critical: processing event E twice must yield the same final
    read model state as processing it once. This is achieved by tracking processed
    event IDs in ProjectionStore.
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this projection (used in projection store)."""
        ...

    @abstractmethod
    async def handle_order_created(self, event: OrderCreatedEvent) -> None:
        """Handle the OrderCreated event to update the read model."""
        ...

    @abstractmethod
    async def handle_status_changed(self, event: OrderStatusChangedEvent) -> None:
        """Handle status transition events."""
        ...

    @abstractmethod
    async def handle_order_cancelled(self, event: OrderCancelledEvent) -> None:
        """Handle order cancellation events."""
        ...


# ─── Concrete Projection: Order Summary Projection ──────────────────────────

class OrderSummaryProjection(Projection):
    """Derives a denormalized OrderSummary read model from domain events.
    
    This projection maintains a flat, pre-joined view of each order including
    customer_id, status, total_amount, item_count — all ready for fast queries
    without joins or aggregations.
    
    Idempotency: Each event is processed exactly once (tracked via ProjectionStore).
    If the same event is replayed, the projection re-applies the same state update,
    producing an identical result.
    """

    def __init__(self, store: DenormalizedStore, proj_store: ProjectionStore) -> None:
        self._store = store
        self._proj_store = proj_store

    @property
    def name(self) -> str:
        return "order_summary_projection"

    async def handle_order_created(self, event: OrderCreatedEvent) -> None:
        """Create a new order summary in the read model."""
        summary = {
            "order_id": event.order_id,
            "customer_id": event.customer_id,
            "status": "pending",
            "total_amount": event.total_amount,
            "item_count": event.item_count,
            "created_at": event.occurred_at.isoformat(),
            "updated_at": event.occurred_at.isoformat(),
        }
        await self._store.upsert_order_summary(summary)
        logger.info("Projection: created order summary for %s", event.order_id)

    async def handle_status_changed(self, event: OrderStatusChangedEvent) -> None:
        """Update the status field on an existing order summary."""
        existing = await self._get_order_summary(event.order_id)
        if existing is None:
            logger.warning(
                "Projection: no order summary found for %s — skipping status change",
                event.order_id,
            )
            return

        existing["status"] = event.new_status
        existing["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self._store.upsert_order_summary(existing)
        logger.info(
            "Projection: updated order %s status from %s to %s",
            event.order_id, event.previous_status, event.new_status,
        )

    async def handle_order_cancelled(self, event: OrderCancelledEvent) -> None:
        """Update an order summary to reflect cancellation."""
        existing = await self._get_order_summary(event.order_id)
        if existing is None:
            logger.warning("Projection: no order summary found for cancelled order %s", event.order_id)
            return

        existing["status"] = "cancelled"
        existing["updated_at"] = datetime.now(timezone.utc).isoformat()
        await self._store.upsert_order_summary(existing)
        logger.info("Projection: cancelled order %s (reason: %s)", event.order_id, event.reason)

    async def _get_order_summary(self, order_id: str) -> dict[str, Any] | None:
        """Retrieve a single order summary from the denormalized store."""
        # In production this would be a targeted read (e.g., Redis GET, ES get)
        for key in self._store._orders:  # type: ignore[attr-defined] — InMemory impl
            if key == order_id:
                return dict(self._store._orders[key])
        return None


# ─── Projection Runner — Manages Event Processing with Exactly-Once Semantics ─

@dataclass
class Envelope:
    """Wraps an event with a unique ID and metadata for projection consumers."""
    event_id: str
    event: Any


class ProjectionRunner:
    """Manages processing of events through all registered projections.
    
    Tracks which events each projection has processed, enabling:
    - Exactly-once semantics via idempotent event handling
    - Safe replay from any point (e.g., after a projection bug fix)
    - Ordered event delivery (events are always processed in sequence order)
    """

    def __init__(self, projections: list[Projection], store_factory=None) -> None:
        self._projections = projections
        self._store_factory = store_factory or InMemoryProjectionStore

    async def process_event(self, envelope: Envelope) -> None:
        """Process a single event through all registered projections."""
        for projection in self._projections:
            proj_store = self._store_factory()
            last_id = await proj_store.get_last_processed_event_id(projection.name)

            # Skip already-processed events (idempotency enforcement)
            if last_id == envelope.event_id:
                continue

            # Route event to appropriate handler based on type
            if isinstance(envelope.event, OrderCreatedEvent):
                await projection.handle_order_created(envelope.event)
            elif isinstance(envelope.event, OrderStatusChangedEvent):
                await projection.handle_status_changed(envelope.event)
            elif isinstance(envelope.event, OrderCancelledEvent):
                await projection.handle_order_cancelled(envelope.event)
            else:
                logger.warning("Unknown event type %s for projection %s",
                             type(envelope.event).__name__, projection.name)

            # Mark as processed — this is the idempotency anchor
            await proj_store.save_processed_event(projection.name, envelope.event_id)

    async def replay_from(self, projection_name: str, events: list[Envelope]) -> None:
        """Replay a sequence of events for a single projection from scratch.
        
        Useful for rebuilding the read model after a bug fix in projection logic.
        Clears projection state before replaying all events.
        """
        proj_store = self._store_factory()
        await proj_store.save_processed_event(projection_name, "__REPLAY__")  # Clear marker

        for envelope in events:
            await self.process_event(envelope)

    @property
    def projections(self) -> list[Projection]:
        return list(self._projections)


# ─── Usage Example: Wiring Everything Together ────────────────────────────────

async def demo_cqrs_flow() -> None:
    """Demonstrate the complete CQRS flow: command → event → projection → query."""
    
    # --- Setup write model dependencies ---
    write_repo: WriteModelRepository = InMemoryWriteModel()  # type: ignore[name-defined]
    event_bus: EventBus = SimpleEventBus()  # type: ignore[name-defined]

    # --- Setup read model dependencies ---
    denormalized_store = InMemoryDenormalizedStore()
    projection_store = InMemoryProjectionStore()

    # --- Register projections ---
    order_proj = OrderSummaryProjection(denormalized_store, projection_store)
    runner = ProjectionRunner([order_proj])

    # --- Event bus that feeds the projection runner ---
    class FeedableEventBus(EventBus):
        async def publish(self, event: Any) -> None:
            envelope = Envelope(event_id=uuid.uuid4().hex[:16], event=event)
            await runner.process_event(envelope)

    feedable_bus = FeedableEventBus()

    # --- Register command handlers ---
    registry = CommandRegistry()
    registry.register(CreateOrderCommand, CreateOrderHandler(write_repo, feedable_bus))
    registry.register(UpdateOrderStatusCommand, UpdateOrderStatusHandler(write_repo, feedable_bus))
    registry.register(CancelOrderCommand, lambda cmd: None)  # Placeholder for brevity

    # --- Execute commands and verify projections update the read model ---
    create_cmd = CreateOrderCommand(
        customer_id="cust-12345",
        items=[{"product_id": "prod-001", "quantity": 2, "price": 29.99}],
        shipping_address_id="addr-001",
    )
    order_id = await registry.dispatch(create_cmd)
    print(f"Order created: {order_id}")

    # Read from denormalized store (projection has already updated it)
    summary_list = list(denormalized_store._orders.values())  # type: ignore[attr-defined]
    for summary in summary_list:
        print(f"Read model — Order {summary['order_id']}: status={summary['status']}, "
              f"total=${summary['total_amount']:.2f}")

    # --- Register query handlers ---
    read_repo = InMemoryReadModel(denormalized_store)  # type: ignore[name-defined]
    query_registry = QueryRegistry()
    query_registry.register(GetOrderDetailsQuery, GetOrderDetailsQueryHandler(read_repo))
    query_registry.register(ListOrdersByCustomerQuery, ListOrdersByCustomerQueryHandler(read_repo))

    query_result = await query_registry.dispatch(
        GetOrderDetailsQuery(order_id=order_id)
    )
    print(f"Query result: {query_result}")


# ─── In-Memory Stubs for Demo Purposes ────────────────────────────────────────

class InMemoryWriteModel(WriteModelRepository):
    def __init__(self) -> None:
        self._orders: dict[str, dict] = {}

    async def save_order(self, order_id: str, customer_id: str, items: list[dict],
                         status: OrderStatus, shipping_address_id: str) -> None:
        self._orders[order_id] = {
            "order_id": order_id, "customer_id": customer_id, "items": items,
            "status": status.value, "shipping_address_id": shipping_address_id,
        }

    async def update_order_status(self, order_id: str, new_status: OrderStatus) -> OrderStatus:
        if order_id in self._orders:
            self._orders[order_id]["status"] = new_status.value
            return new_status
        raise ValueError(f"Order {order_id} not found")

    async def get_order(self, order_id: str) -> dict | None:
        return self._orders.get(order_id)


class SimpleEventBus(EventBus):
    async def publish(self, event: Any) -> None:
        pass  # In production, this would fan-out to all subscribers


class InMemoryReadModel(ReadModelRepository):
    def __init__(self, denormalized_store: DenormalizedStore) -> None:
        self._store = denormalized_store

    async def get_order_details(self, order_id: str) -> OrderDetails | None:
        summaries = list(self._store._orders.values())  # type: ignore[attr-defined]
        for s in summaries:
            if s["order_id"] == order_id:
                return OrderDetails(
                    order_id=s["order_id"], customer_id=s["customer_id"],
                    status=OrderStatus(s["status"]), total_amount=s["total_amount"],
                    items=[], shipping_address_id="", created_at=datetime.now(),
                )
        return None

    async def list_orders(self, customer_id: str, status_filter: OrderStatus | None,
                          page: int, page_size: int) -> PaginatedResult:
        items = [s for s in self._store._orders.values()  # type: ignore[attr-defined]
                 if s["customer_id"] == customer_id]
        if status_filter:
            items = [i for i in items if i["status"] == status_filter.value]
        start = (page - 1) * page_size
        end = start + page_size
        return PaginatedResult(items=items[start:end], page=page, page_size=page_size,
                               total_count=len(items))

    async def search_orders(self, keyword: str, status_filter: OrderStatus | None,
                            page: int, page_size: int) -> PaginatedResult:
        items = [s for s in self._store._orders.values()  # type: ignore[attr-defined]
                 if keyword.lower() in str(s)]
        if status_filter:
            items = [i for i in items if i["status"] == status_filter.value]
        start = (page - 1) * page_size
        end = start + page_size
        return PaginatedResult(items=items[start:end], page=page, page_size=page_size,
                               total_count=len(items))


if __name__ == "__main__":
    import asyncio
    asyncio.run(demo_cqrs_flow())

```

---

### BAD vs. GOOD: CQRS Boundary Enforcement

The most common CQRS anti-pattern is blurring the command/query boundary. Below are concrete examples showing correct enforcement.

```python
# ❌ BAD: Command handler that also queries — violates Single Responsibility
class BadCreateOrderHandler(CommandHandler):
    def __init__(self, write_repo: WriteModelRepository, read_repo: ReadModelRepository) -> None:
        self._write_repo = write_repo
        self._read_repo = read_repo  # ❌ BAD: Command handler should not access the read model

    async def handle(self, command: CreateOrderCommand) -> str:
        # ❌ BAD: Querying existing orders during a write operation
        existing_orders = await self._read_repo.list_orders(
            customer_id=command.customer_id, status_filter=None, page=1, page_size=100
        )
        
        # ❌ BAD: Computing business logic based on read-model data within command handler
        if len(existing_orders.items) >= 50:
            raise ValueError("Customer has too many orders")

        order_id = uuid.uuid4().hex[:12]
        await self._write_repo.save_order(order_id, ...)
        return order_id


# ✅ GOOD: Command handler with pure write-side logic
class GoodCreateOrderHandler(CommandHandler):
    def __init__(self, write_repo: WriteModelRepository, event_bus: EventBus) -> None:
        self._write_repo = write_repo
        self._event_bus = event_bus

    async def handle(self, command: CreateOrderCommand) -> str:
        # ✅ GOOD: Validation uses only the command input data
        total_amount = sum(item["price"] * item["quantity"] for item in command.items)
        
        if total_amount <= 0:
            raise ValueError("Order total must be positive")

        # ✅ GOOD: Persist only to write model — no read model access
        order_id = uuid.uuid4().hex[:12]
        await self._write_repo.save_order(
            order_id=order_id, customer_id=command.customer_id,
            items=command.items, status=OrderStatus.PENDING,
            shipping_address_id=command.shipping_address_id,
        )

        # ✅ GOOD: Emit event for projection consumers — the query side picks it up
        await self._event_bus.publish(OrderCreatedEvent(
            order_id=order_id, customer_id=command.customer_id,
            total_amount=total_amount, item_count=len(command.items),
        ))
        return order_id


# ❌ BAD: Projection that mutates the write model instead of the read model
class BadProjection(Projection):
    @property
    def name(self) -> str:
        return "bad_projection"

    async def handle_order_created(self, event: OrderCreatedEvent) -> None:
        # ❌ BAD: Writing to the write model from a projection!
        await self._write_repo.save_order(...)  # Projections must ONLY update read models


# ✅ GOOD: Projection that updates only the denormalized read model
class GoodProjection(Projection):
    @property
    def name(self) -> str:
        return "good_projection"

    def __init__(self, denormalized_store: DenormalizedStore, proj_store: ProjectionStore) -> None:
        self._store = denormalized_store
        self._proj_store = proj_store

    async def handle_order_created(self, event: OrderCreatedEvent) -> None:
        # ✅ GOOD: Updates only the denormalized read model
        summary = {
            "order_id": event.order_id,
            "customer_id": event.customer_id,
            "status": "pending",
            "total_amount": event.total_amount,
            "item_count": event.item_count,
            "created_at": event.occurred_at.isoformat(),
        }
        await self._store.upsert_order_summary(summary)
```

---

## Constraints

### MUST DO
- Enforce strict separation: command handlers write only to the write model; query handlers read only from the read model — never mix concerns
- Use immutable typed dataclasses for all Command and Query objects with validation in `__post_init__` (parse at boundaries, trust internally)
- Implement explicit type-based registries (`CommandRegistry`, `QueryRegistry`) that fail fast with descriptive errors for unregistered handlers
- Make every projection idempotent: processing the same event twice must yield identical read model state — track processed event IDs in a `ProjectionStore`
- Document the eventual consistency guarantee per API endpoint (immediate, read-your-writes, or best-effort) so callers know what staleness to expect
- Use different storage engines for write and read models when access patterns differ significantly (e.g., PostgreSQL for writes, Elasticsearch for search)
- Provide BAD vs GOOD examples demonstrating correct boundary enforcement in every implementation
- Reference SOLID Single Responsibility Principle: each command handler owns one mutation; each query handler returns one data shape

### MUST NOT DO
- Never let a command handler read from the write model's operational store — if it needs historical data, use a snapshot or projection, not live queries
- Never let a query handler mutate any state (no `INSERT`, `UPDATE`, `DELETE` anywhere in its execution path) — use a command for that instead
- Never implement implicit handler resolution via class name matching, module scanning, or magic — all handlers must be explicitly registered with type mappings
- Never allow projections to write back to the write model — projections update read models only; bidirectional writes break CQRS boundaries entirely
- Never assume strong consistency between a command's execution and its visibility in query results — design workflows to handle staleness (e.g., retry loops, optimistic UI)
- Never use generic placeholder types like `dict` or `Any` for command/query return values without explicit DTOs — typed signatures prevent accidental data shape drift
- Never skip projection idempotency tracking — replaying events without exactly-once guarantees produces duplicate entries and corrupt read model state

---

## Output Template

When implementing CQRS, produce the following artifacts in order:

1. **Domain Event Definitions** — All domain events that will drive projections, with typed dataclasses and an `occurred_at` timestamp
2. **Command Objects** — Immutable, validated command classes for each write intent (one per mutation)
3. **Query Objects** — Immutable query classes specifying input parameters and the exact return type
4. **Write Model Repository** — Interface plus concrete implementation for the write side (transactional store)
5. **Read Model Repository** — Interface for the denormalized, query-optimized store
6. **Command Handlers** — One handler per command, each with typed signature, guard clauses, and event emission
7. **Query Handlers** — One handler per query shape, each reading only from the read model
8. **Projection Classes** — At least one projection deriving a denormalized view from events, with idempotency tracking
9. **Consistency Contract** — A documented statement of which endpoints offer immediate vs. eventual consistency

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Provides the foundational DDD concepts (bounded contexts, aggregates, domain events) that CQRS builds upon |
| `event-sourcing-pattern` | Complements CQRS by using an event log as the authoritative write model — projections derive state from replaying events |