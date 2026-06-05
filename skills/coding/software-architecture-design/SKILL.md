---




name: software-architecture-design
description: Implements production-grade architectural patterns including DDD tactical
  patterns, hexagonal architecture, CQRS, and event sourcing with typed Python implementations.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: software architecture, hexagonal architecture, ddd tactical patterns,
    cqrs pattern, event sourcing, clean architecture, ports and adapters, aggregate root
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: medium
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
  related-skills: software-architecture, ddd-context-mapping, cqrs-pattern, domain-events, microservices-architecture




---





# Modern Software Architecture Design Patterns

Senior software architect implementing production-grade architectural patterns — DDD tactical patterns (Entity, Value Object, Aggregate Root, Repository, Domain Event), Hexagonal Architecture (Ports & Adapters), CQRS with separate command and query models, and Event Sourcing with append-only event stores. This skill makes the model design systems where the domain core is isolated from infrastructure, dependencies flow inward, and every architectural decision enforces clear separation of concerns through typed interfaces and explicit module boundaries.

## TL;DR Checklist

- [ ] Model entities by identity and value objects by their attribute equality — never confuse them
- [ ] Enforce all invariants inside Aggregate Root methods before any persistence call
- [ ] Define ports as abstract protocols/interfaces BEFORE writing adapters or infrastructure code
- [ ] Route dependencies inward: outer layers import inner layer abstractions, never the reverse
- [ ] Separate commands (state-mutating) from queries (read-only) at the API boundary level
- [ ] Store events in an append-only log — never update or delete existing events
- [ ] Add snapshots for aggregates with more than 20 events to avoid replay performance degradation
- [ ] Version all domain events with a schema version and provide migration strategies

---

## When to Use

Use this skill when:

- Designing a new system where business complexity justifies architectural patterns (not CRUD scaffolding)
- Refactoring a monolithic codebase into bounded contexts with clear module boundaries
- Building an event-driven system where state reconstruction from history is required
- Implementing CQRS for systems with heavy read loads that differ fundamentally from write patterns
- Creating domain models where invariants must never be violated (financial systems, inventory, orders)
- Establishing team ownership boundaries through bounded contexts and context maps

---

## When NOT to Use

Avoid this skill for:

- Simple CRUD applications with minimal business logic — layered architecture is sufficient
- Prototypes or MVPs where delivery speed outweighs long-term maintainability
- Systems with fewer than 5 concurrent developers working on the same codebase
- Real-time control systems where latency requirements make event replay impractical
- When team lacks familiarity with DDD concepts — invest in domain modeling workshops first

---

## Core Workflow

1. **Identify Bounded Contexts and Subdomains** — Interview domain experts, extract the ubiquitous language, and classify subdomains as core, supporting, or generic. Each bounded context gets its own module/package boundary.
   **Checkpoint:** Confirm no single concept has conflicting definitions across two proposed contexts. If so, either split them into separate contexts or define a shared kernel with explicit contract rules.

2. **Model the Domain Core** — For each bounded context, identify Entities (identity-based), Value Objects (attribute-based immutability), Aggregate Roots (invariant enforcement boundaries), and Domain Services (logic spanning multiple aggregates). Define these as typed Python classes with full invariant validation in constructors.
   **Checkpoint:** Every aggregate root must have at least one method that enforces a cross-field invariant. If no such method exists, the model is likely missing its core business rules.

3. **Define Ports and Composition Root** — Declare all interfaces (Python `Protocol` or `abc.ABC`) that the domain core depends on for infrastructure services. Create a composition root where concrete adapters are wired together. The domain core must import zero infrastructure code.
   **Checkpoint:** Run `import ast` on all files in the domain package — verify no imports outside the domain package itself.

4. **Implement Write Side (Commands + Event Store)** — Build command handlers that parse input, invoke aggregate root methods to mutate state, publish domain events, and persist through repositories. For event-sourced aggregates, append events to the store rather than writing entity state directly.
   **Checkpoint:** Every successful command must either produce at least one domain event or explicitly return a reason for refusal (no silent failures).

5. **Implement Read Side (Query Handlers)** — Build query handlers that read from optimized projections denormalized for specific query patterns. Projections are derived from domain events and kept separate from the write model.
   **Checkpoint:** Verify each projection is idempotent — replaying the same event stream produces identical results.

6. **Add Cross-Cutting Concerns at Boundaries** — Place authentication, authorization, input validation, and logging in outer adapters that compose with core application services. Never embed these concerns inside domain logic.
   **Checkpoint:** The domain core should be testable by instantiating aggregates directly with no mock objects or external dependencies.

---

## Implementation Patterns

### Pattern 1: DDD Tactical — Entity vs Value Object

Entities are defined by their unique identity and persist across state changes. Value Objects have no identity — two value objects are equal if all their attributes are equal, and they are immutable once created. Confusing these two causes subtle bugs where identity collisions or silent mutations corrupt domain state.

**Key distinction rule:** If you need to answer "which one?" independently of its attributes, it's an Entity. If you only care about "what is it?", it's a Value Object.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Protocol


# --- ENTITY: Identified by a stable UUID, not its attributes ---
@dataclass(frozen=True)
class Money:
    """Value Object: defined entirely by amount and currency. Two Money instances
    with the same amount and currency are interchangeable."""
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if not isinstance(self.amount, Decimal):
            raise TypeError("Money amount must be a Decimal")
        if self.amount < 0:
            raise ValueError(f"Money amount cannot be negative: {self.amount}")
        if len(self.currency) != 3 or not self.currency.isupper():
            raise ValueError(f"Invalid ISO 4217 currency code: '{self.currency}'")

    def add(self, other: Money) -> Money:
        """Returns a new Money — never mutates either operand."""
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add different currencies: {self.currency} vs {other.currency}"
            )
        return Money(amount=self.amount + other.amount, currency=self.currency)

    def subtract(self, other: Money) -> Money:
        diff = self.amount - other.amount
        if diff < 0:
            raise ValueError(
                f"Subtraction would produce negative amount: {self.amount} - {other.amount}"
            )
        return Money(amount=diff, currency=self.currency)


@dataclass(frozen=True)
class OrderId:
    """Value Object representing a unique order identifier.
    
    Using a dedicated type instead of raw string prevents mixing up IDs
    across different entities (Order vs Customer vs Product).
    """
    value: str

    def __post_init__(self) -> None:
        if not self.value or len(self.value) < 8:
            raise ValueError(f"OrderId must be at least 8 characters: '{self.value}'")


@dataclass(frozen=True)
class ProductId:
    """Value Object for product identification."""
    value: str

    def __post_init__(self) -> None:
        if not self.value or len(self.value) < 3:
            raise ValueError(f"ProductId must be at least 3 characters: '{self.value}'")


# --- ENTITY: Has a stable identity that persists across mutations ---
@dataclass(eq=False, repr=False)
class Order:
    """Entity: identified by order_id, not its attributes. An order with the same
    items but a different ID is a completely different entity."""
    order_id: OrderId
    customer_id: OrderId  # Reusing value type for consistency
    items: list[OrderItem] = field(default_factory=list)
    status: str = "PENDING"
    created_at: datetime = field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    def add_item(self, product_id: ProductId, quantity: int, unit_price: Money) -> Order:
        """Add an item to the order. Validates business rules."""
        if quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {quantity}")
        if self.status != "PENDING":
            raise RuntimeError(f"Cannot add items to {self.status} order {self.order_id.value}")

        # Check for duplicate product in same order
        for existing in self.items:
            if existing.product_id == product_id:
                raise ValueError(
                    f"Product {product_id.value} already exists in order {self.order_id.value}"
                )

        self.items.append(OrderItem(product_id=product_id, quantity=quantity, unit_price=unit_price))
        return self  # Return for fluent API pattern

    def get_total(self) -> Money:
        """Calculate order total across all items."""
        if not self.items:
            raise RuntimeError("Cannot calculate total for empty order")
        total = Money(amount=Decimal("0"), currency=self.items[0].unit_price.currency)
        for item in self.items:
            line_total = Money(
                amount=item.unit_price.amount * item.quantity,
                currency=item.unit_price.currency,
            )
            total = total.add(line_total)
        return total

    def __eq__(self, other: object) -> bool:
        """Entities are equal by identity, not by attribute comparison."""
        if not isinstance(other, Order):
            return False
        return self.order_id == other.order_id

    def __hash__(self) -> int:
        return hash(self.order_id)


# --- ❌ BAD: Using raw strings for IDs mixes up entity types and provides no validation ---
@dataclass(eq=False)
class BadOrder:
    order_id: str           # Could be confused with customer_id, product_id
    items: list[dict]       # No type safety, no business logic encapsulation
    status: str = "pending"  # String enum — any value accepted

    def add_item(self, product_id: str, qty: int) -> None:
        # No validation on quantity, no duplicate check, status check missing
        self.items.append({"product_id": product_id, "qty": qty})


# --- ✅ GOOD: Typed IDs (value objects), validated invariants, equality by identity ---
@dataclass(eq=False)
class GoodOrder:
    order_id: OrderId
    customer_id: OrderId
    items: list[OrderItem] = field(default_factory=list)
    status: str = "PENDING"

    def add_item(self, product_id: ProductId, quantity: int, unit_price: Money) -> None:
        if quantity <= 0:
            raise ValueError(f"Quantity must be positive, got {quantity}")
        if self.status != "PENDING":
            raise RuntimeError(f"Cannot modify {self.status} order")
        for existing in self.items:
            if existing.product_id == product_id:
                raise ValueError(f"Duplicate product in order: {product_id.value}")
        self.items.append(OrderItem(product_id=product_id, quantity=quantity, unit_price=unit_price))
```

---

### Pattern 2: DDD Aggregate Root — Invariant Enforcement

An Aggregate Root is the entry point for all operations on a cluster of domain objects. It enforces invariants that span multiple entities within its boundary. The aggregate root controls access to internal objects and guarantees consistency before any state change is persisted.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Protocol


class OrderStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"


@dataclass(frozen=True)
class OrderItem:
    product_id: ProductId
    quantity: int
    unit_price: Money

    @property
    def line_total(self) -> Money:
        return Money(amount=self.unit_price.amount * self.quantity, currency=self.unit_price.currency)


@dataclass(eq=False)
class AggregateOrder:
    """Aggregate Root for the Order aggregate.
    
    All modifications to order state MUST go through this class's methods.
    This guarantees that business invariants are always enforced:
      - Status transitions follow allowed paths only
      - Cancellation requires CONFIRMED status (not yet shipped)
      - Shipping requires at least one item
      - Total never goes below zero
    """
    order_id: OrderId
    customer_id: OrderId
    items: list[OrderItem] = field(default_factory=list)
    _status: str = "PENDING"
    _created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def status(self) -> str:
        return self._status

    # --- State Transitions (enforce allowed paths) ---
    
    def confirm(self) -> AggregateOrder:
        """Transition from PENDING to CONFIRMED.
        
        Invariant: Order must have items and be in PENDING status.
        Returns a new instance (immutable update pattern).
        """
        if self._status != OrderStatus.PENDING.value:
            raise RuntimeError(
                f"Cannot confirm order in '{self._status}' status — "
                f"must be '{OrderStatus.PENDING.value}'"
            )
        if not self.items:
            raise RuntimeError("Cannot confirm an empty order")

        from copy import deepcopy
        new = deepcopy(self)
        new._status = OrderStatus.CONFIRMED.value
        return new

    def ship(self) -> AggregateOrder:
        """Transition from CONFIRMED to SHIPPED.
        
        Invariant: Only confirmed orders can be shipped.
        """
        if self._status != OrderStatus.CONFIRMED.value:
            raise RuntimeError(
                f"Cannot ship order in '{self._status}' status — "
                f"must be '{OrderStatus.CONFIRMED.value}'"
            )
        if not self.items:
            raise RuntimeError("Cannot ship an empty order")

        from copy import deepcopy
        new = deepcopy(self)
        new._status = OrderStatus.SHIPPED.value
        return new

    def cancel(self) -> AggregateOrder:
        """Cancel the order.
        
        Invariant: Only PENDING or CONFIRMED orders can be cancelled.
        Cannot cancel SHIPPED or DELIVERED orders — those require returns.
        """
        if self._status not in (OrderStatus.PENDING.value, OrderStatus.CONFIRMED.value):
            raise RuntimeError(
                f"Cannot cancel order in '{self._status}' status — "
                f"only PENDING or CONFIRMED can be cancelled"
            )

        from copy import deepcopy
        new = deepcopy(self)
        new._status = OrderStatus.CANCELLED.value
        return new

    # --- Query Methods (no state mutation) ---
    
    def get_total(self) -> Money:
        if not self.items:
            raise RuntimeError("Cannot calculate total for empty order")
        total = Money(amount=Decimal("0"), currency=self.items[0].unit_price.currency)
        for item in self.items:
            total = total.add(item.line_total)
        return total

    def can_be_cancelled(self) -> bool:
        """Read-only query — does not mutate state."""
        return self._status in (OrderStatus.PENDING.value, OrderStatus.CONFIRMED.value)

    # --- Cross-Entity Invariant Enforcement ---
    
    def remove_item(self, product_id: ProductId) -> AggregateOrder:
        """Remove an item from the order.
        
        Invariant enforced: After removal, remaining items must still be consistent.
        If no items remain, order reverts to empty state (not cancelled).
        """
        if self._status != OrderStatus.PENDING.value:
            raise RuntimeError(f"Cannot remove items from {self._status} order")

        new_items = [item for item in self.items if item.product_id != product_id]
        if len(new_items) == len(self.items):
            raise ValueError(f"Product {product_id.value} not found in order {self.order_id.value}")

        from copy import deepcopy
        new = deepcopy(self)
        new.items = new_items
        return new


# --- ❌ BAD: No invariant enforcement — any state change is allowed ---
class BadAggregateOrder:
    def __init__(self, order_id: str):
        self.order_id = order_id
        self.status = "PENDING"  # Any string accepted
        self.items = []

    def cancel(self) -> None:
        # No status check — can cancel a SHIPPED or DELIVERED order!
        self.status = "CANCELLED"

    def ship(self) -> None:
        # No status check — can ship an empty or cancelled order!
        self.status = "SHIPPED"


# --- ✅ GOOD: All state transitions validated through the aggregate root ---
def demonstrate_correct_usage() -> None:
    """Example of correct aggregate root usage with invariant enforcement."""
    oid = OrderId(value="ORD-2024-001")
    cid = OrderId(value="CUST-12345")

    order = AggregateOrder(order_id=oid, customer_id=cid)
    order = order.add_item(
        product_id=ProductId(value="PROD-A"),
        quantity=2,
        unit_price=Money(amount=Decimal("29.99"), currency="USD"),
    )
    order = order.add_item(
        product_id=ProductId(value="PROD-B"),
        quantity=1,
        unit_price=Money(amount=Decimal("49.50"), currency="USD"),
    )

    # Invariant: must have items to confirm
    order = order.confirm()  # PENDING → CONFIRMED

    # Invariant: can cancel while confirmed
    cancelled = order.cancel()  # CONFIRMED → CANCELLED (new instance, original unchanged)

    # Try shipping a cancelled order — invariant violation
    try:
        order.ship()  # Raises RuntimeError
    except RuntimeError as e:
        print(f"Invariant prevented: {e}")

    # Total calculation across entities
    total = order.get_total()  # $109.48
```

---

### Pattern 3: Hexagonal Architecture — Ports & Adapters

Hexagonal Architecture (Ports and Adapters) inverts the dependency rule: inner layers never import outer layers. The domain core defines abstract interfaces (ports), and infrastructure implements those interfaces as concrete adapters. This makes the domain testable without any infrastructure dependency.

**Module structure example for a complete hexagonal application:**

```
order_service/
├── domain/                 # Innermost layer — no imports from outside
│   ├── __init__.py
│   ├── entities.py         # Entity and Value Object definitions
│   ├── aggregates.py       # Aggregate Root with invariant enforcement
│   ├── events.py           # Domain event definitions
│   └── ports.py            # Abstract protocol interfaces (ports)
├── application/            # Application services — orchestrates domain + ports
│   ├── __init__.py
│   ├── command_handlers.py # Command handlers for write operations
│   ├── query_handlers.py   # Query handlers for read operations
│   └── service_layer.py    # Use case orchestrations
├── infrastructure/         # Outer layer — imports from inner layers only
│   ├── __init__.py
│   ├── repositories/       # Port implementations for persistence
│   │   ├── order_repo_impl.py
│   │   └── event_store_impl.py
│   ├── messaging/          # Adapter for external message buses
│   │   └── pub_sub_adapter.py
│   └── logging/            # Infrastructure concerns
│       └── audit_logger.py
└── composition_root.py     # Wiring: create adapters, inject into application services
```

**Defining ports (abstract interfaces) in the domain layer:**

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Protocol, Sequence


# --- DOMAIN LAYER: Abstract port definitions (no infrastructure imports) ---

class OrderRepository(Protocol):
    """Port interface for order persistence.
    
    The domain layer depends on THIS ABSTRACTION, not on any specific database.
    Infrastructure code implements this protocol.
    """
    @abstractmethod
    def save(self, order: AggregateOrder) -> None: ...

    @abstractmethod
    def find_by_id(self, order_id: OrderId) -> AggregateOrder | None: ...

    @abstractmethod
    def find_all(self, customer_id: OrderId) -> list[AggregateOrder]: ...


class EventBus(Protocol):
    """Port interface for publishing domain events.
    
    Allows the domain to emit events without knowing about message brokers.
    """
    @abstractmethod
    def publish(self, event: DomainEvent) -> None: ...

    @abstractmethod
    def subscribe(self, event_type: type[DomainEvent], handler) -> None: ...


# --- Infrastructure Port Implementations (outer layer imports inner layer abstractions) ---

class InMemoryOrderRepository:
    """Concrete implementation for development and testing.
    
    Uses in-memory dict — no database dependency. Swappable at composition root.
    """
    def __init__(self) -> None:
        self._store: dict[str, AggregateOrder] = {}

    def save(self, order: AggregateOrder) -> None:
        from copy import deepcopy
        self._store[order.order_id.value] = deepcopy(order)

    def find_by_id(self, order_id: OrderId) -> AggregateOrder | None:
        from copy import deepcopy
        return deepcopy(self._store.get(order_id.value))

    def find_all(self, customer_id: OrderId) -> list[AggregateOrder]:
        results = [
            deepcopy(o) for o in self._store.values()
            if o.customer_id == customer_id
        ]
        return results


class InMemoryEventBus:
    """Concrete implementation that dispatches events to registered handlers synchronously."""
    def __init__(self) -> None:
        self._handlers: dict[type[DomainEvent], list] = {}

    def publish(self, event: DomainEvent) -> None:
        for handler in self._handlers.get(type(event), []):
            handler(event)

    def subscribe(self, event_type: type[DomainEvent], handler) -> None:
        from collections import defaultdict
        if not hasattr(self, '_handlers'):
            self._handlers = {}
        self._handlers.setdefault(event_type, []).append(handler)


# --- ❌ BAD: Tight coupling — infrastructure leaks into domain ---
class BadOrderService:
    """Violates dependency rule: domain code directly depends on SQLite."""
    def __init__(self):
        import sqlite3  # Domain layer must never import framework!
        self.conn = sqlite3.connect("orders.db")

    def save_order(self, order_id: str) -> None:
        # Business logic mixed with SQL — impossible to test without DB
        cursor = self.conn.cursor()
        cursor.execute(
            "INSERT INTO orders (id) VALUES (?)",
            (order_id,)
        )


# --- ✅ GOOD: Domain defines protocol, infrastructure implements it ---
class GoodOrderService:
    """Clean dependency direction: service depends on protocols, not implementations."""
    def __init__(
        self,
        order_repo: OrderRepository,
        event_bus: EventBus,
    ):
        # Dependencies injected — can be swapped for testing or different environments
        self._repo = order_repo
        self._bus = event_bus

    def create_order(self, customer_id: OrderId, items: list[OrderItemData]) -> AggregateOrder:
        """Application service that orchestrates domain operations."""
        from copy import deepcopy

        # Create aggregate (domain logic)
        oid = OrderId(value=f"ORD-{customer_id.value}-{datetime.now(timezone.utc).strftime('%s')}")
        order = AggregateOrder(order_id=oid, customer_id=customer_id)

        for item_data in items:
            money = Money(amount=item_data.unit_price, currency="USD")
            order.add_item(
                product_id=ProductId(value=item_data.product_id),
                quantity=item_data.quantity,
                unit_price=money,
            )

        # Persist through the port (not directly to DB)
        self._repo.save(order)

        return order


@dataclass
class OrderItemData:
    """DTO for input data — exists in application layer, not domain."""
    product_id: str
    quantity: int
    unit_price: Decimal
```

**Composition Root (wiring everything together):**

```python
# composition_root.py — the single entry point that wires all dependencies
from order_service.domain.ports import OrderRepository, EventBus
from order_service.infrastructure.repositories.order_repo_impl import InMemoryOrderRepository
from order_service.infrastructure.messaging.pub_sub_adapter import InMemoryEventBus
from order_service.application.service_layer import GoodOrderService


def build_application() -> GoodOrderService:
    """Composition root: creates all concrete implementations and injects them.
    
    In production, replace InMemory* with PostgreSQL/MQ implementations here.
    The domain code never changes — only the wiring differs per environment.
    """
    # Create infrastructure adapters
    order_repo: OrderRepository = InMemoryOrderRepository()
    event_bus: EventBus = InMemoryEventBus()

    # Wire application services with dependencies injected
    return GoodOrderService(order_repo=order_repo, event_bus=event_bus)


# Usage — the caller never sees concrete implementations
if __name__ == "__main__":
    app = build_application()
    result = app.create_order(
        customer_id=OrderId(value="CUST-001"),
        items=[OrderItemData(product_id="PROD-A", quantity=2, unit_price=Decimal("29.99"))],
    )
    print(f"Created order: {result.order_id.value}")
```

---

### Pattern 4: CQRS — Command Query Responsibility Segregation

CQRS separates the command model (write side with rich domain logic) from the query model (read side optimized for specific query patterns). Commands mutate state through aggregate roots; queries read from denormalized projections that are derived from events. This eliminates the ORM anti-pattern where a single model serves both reads and writes.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Protocol


# --- COMMAND SIDE: Write Model ---

@dataclass(frozen=True)
class PlaceOrderCommand:
    """Immutable command describing an intended action.
    
    Commands describe INTENT — not the resulting state change.
    The command handler validates and executes the intent through the domain model.
    """
    customer_id: str
    items: list[OrderLineItem]
    coupon_code: str | None = None

    def __post_init__(self) -> None:
        if not self.items:
            raise ValueError("Command must include at least one line item")


@dataclass(frozen=True)
class OrderLineItem:
    product_id: str
    quantity: int
    unit_price_cents: int  # Store in cents to avoid floating-point issues

    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.unit_price_cents <= 0:
            raise ValueError("Price must be positive")


@dataclass(frozen=True)
class CommandResult:
    """Result of a command execution — success or failure reason."""
    success: bool
    order_id: str | None = None
    error_message: str | None = None


class ICommandHandler(Protocol):
    """Abstract protocol for command handlers."""
    @abstractmethod
    async def handle(self, command: PlaceOrderCommand) -> CommandResult: ...


# --- QUERY SIDE: Read Model (separate from write model) ---

@dataclass(frozen=True)
class OrderProjection:
    """Denormalized read model optimized for the order list view.
    
    Contains only the fields needed for display — no business logic,
    no invariants to enforce. This is a query-optimized snapshot.
    """
    order_id: str
    customer_id: str
    items_summary: int
    total_cents: int
    status: str
    created_at: datetime

    @property
    def total_dollars(self) -> Decimal:
        return Decimal(self.total_cents) / 100


class IOrderQueryService(Protocol):
    """Abstract protocol for read-side queries."""
    @abstractmethod
    async def get_order_by_id(self, order_id: str) -> OrderProjection | None: ...

    @abstractmethod
    async def get_orders_for_customer(
        self, customer_id: str, limit: int = 50, offset: int = 0
    ) -> list[OrderProjection]: ...

    @abstractmethod
    async def search_orders(
        self, status_filter: str | None = None, date_from: datetime | None = None
    ) -> list[OrderProjection]: ...


# --- Command Handler Implementation ---

class PlaceOrderCommandHandler:
    """Handles the PlaceOrder command: validates, creates aggregate, persists."""

    def __init__(
        self,
        order_repo: OrderRepository,
        event_bus: EventBus,
    ) -> None:
        self._repo = order_repo
        self._bus = event_bus

    async def handle(self, command: PlaceOrderCommand) -> CommandResult:
        # Step 1: Validate command-level constraints (application layer)
        total_cents = sum(item.unit_price_cents * item.quantity for item in command.items)
        if total_cents <= 0:
            return CommandResult(
                success=False, error_message="Order total must be positive"
            )

        # Step 2: Create aggregate and execute domain logic (domain layer)
        oid = OrderId(value=f"ORD-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{hash(command)}")
        order = AggregateOrder(
            order_id=oid,
            customer_id=OrderId(value=command.customer_id),
        )

        try:
            for item in command.items:
                money = Money(amount=Decimal(item.unit_price_cents), currency="USD")
                order.add_item(
                    product_id=ProductId(value=item.product_id),
                    quantity=item.quantity,
                    unit_price=money,
                )
        except (ValueError, RuntimeError) as e:
            return CommandResult(success=False, error_message=str(e))

        # Step 3: Persist through repository port (not direct DB access)
        self._repo.save(order)

        # Step 4: Publish domain event for query model updates
        order_created_event = OrderCreatedEvent(
            order_id=order.order_id.value,
            customer_id=command.customer_id,
            total_cents=total_cents,
            item_count=len(command.items),
        )
        self._bus.publish(order_created_event)

        return CommandResult(success=True, order_id=order.order_id.value)


# --- Query Handler / Projection Builder ---

class OrderProjectionBuilder:
    """Builds denormalized query projections from domain events.
    
    This is the read side of CQRS — separate from command processing.
    Projections are optimized for specific query patterns and updated
    asynchronously from the event bus.
    """
    def __init__(self, projection_store: ProjectionStore) -> None:
        self._store = projection_store

    def handle_event(self, event: OrderCreatedEvent) -> None:
        """Handle a domain event to update the read-side projection."""
        projection = OrderProjection(
            order_id=event.order_id,
            customer_id=event.customer_id,
            items_summary=event.item_count,
            total_cents=event.total_cents,
            status="CONFIRMED",  # Derive from event type
            created_at=event.timestamp,
        )
        self._store.upsert(projection)


# --- ❌ BAD: Single model serving both reads and writes (the ORM anti-pattern) ---
class BadCQRSModel:
    """Single entity used for both commands AND queries — the classic ORM anti-pattern.
    
    Problems:
      - Queries must join across multiple tables to assemble a view
      - Business logic leaks into query results as computed properties
      - Adding a new read-optimized view requires changing the domain model
      - Write validation and read optimization fight for the same structure
    """
    def __init__(self):
        self.conn = sqlite3.connect("app.db")

    def get_order_with_details(self, order_id: str) -> dict:
        # N+1 query problem — joins customer, items, shipping addresses, reviews...
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT o.*, c.name, c.email, 
                   i.product_name, i.quantity, i.price
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            LEFT JOIN order_items i ON i.order_id = o.id
            WHERE o.id = ?
        """, (order_id,))
        rows = cursor.fetchall()
        # Manual object assembly from flat result set — error-prone and slow

    def place_order(self, customer_id: str, items: list[dict]) -> None:
        # Same model handles writes — but with completely different query needs


# --- ✅ GOOD: Separate write commands and read projections ---
class GoodCQRSSystem:
    """CQRS system with clean separation between command and query sides."""

    def __init__(
        self,
        cmd_handler: ICommandHandler,
        query_service: IOrderQueryService,
    ) -> None:
        self._command_handler = cmd_handler
        self._query_service = query_service

    async def place_order(self, command: PlaceOrderCommand) -> CommandResult:
        """Write path: command goes through domain model."""
        return await self._command_handler.handle(command)

    async def get_order(self, order_id: str) -> OrderProjection | None:
        """Read path: query hits optimized projection store."""
        return await self._query_service.get_order_by_id(order_id)

    async def get_customer_orders(
        self, customer_id: str, limit: int = 50
    ) -> list[OrderProjection]:
        """Read path: denormalized projection supports efficient filtering."""
        return await self._query_service.get_orders_for_customer(customer_id, limit=limit)
```

---

### Pattern 5: Event Sourcing — Append-Only Event Store

Event Sourcing stores the complete history of state changes as an immutable sequence of domain events. The current state is reconstructed by replaying events from the beginning (or a snapshot). This provides full auditability, supports time-travel debugging, and naturally enables the query projections used in CQRS.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Protocol, Sequence


# --- Domain Events (immutable, versioned) ---

@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events."""
    event_id: str
    aggregate_id: str
    event_type: str
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    version: int = 1  # Event schema version for migration support

    def serialize(self) -> dict:
        """Serialize event to a dictionary for storage."""
        import json
        data = {
            "event_id": self.event_id,
            "aggregate_id": self.aggregate_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "version": self.version,
        }
        # Add event-specific fields
        for key, value in vars(self).items():
            if key not in data:
                if isinstance(value, (str, int, float, bool)):
                    data[key] = value
                elif isinstance(value, Decimal):
                    data[key] = str(value)  # Avoid JSON float issues
        return json.dumps(data)

    @classmethod
    def deserialize(cls, raw: str | dict, event_class: type[DomainEvent]) -> DomainEvent:
        """Deserialize from storage, handling version migrations."""
        if isinstance(raw, str):
            import json
            data = json.loads(raw)
        else:
            data = raw

        # Version migration logic — handle schema changes over time
        # Version 1 events have 'quantity' field; Version 2 renamed to 'qty'
        if data.get("version", 1) == 1 and "qty" in data:
            data["quantity"] = data.pop("qty")

        return event_class(**{k: v for k, v in data.items() if k != "event_type"})


@dataclass(frozen=True)
class OrderCreatedEvent(DomainEvent):
    """Event: An order was created."""
    customer_id: str
    total_cents: int
    item_count: int

    def __post_init__(self) -> None:
        if not self.customer_id or len(self.customer_id) < 3:
            raise ValueError(f"Invalid customer_id in event: {self.customer_id}")


@dataclass(frozen=True)
class OrderItemAddedEvent(DomainEvent):
    """Event: An item was added to an existing order."""
    product_id: str
    quantity: int
    unit_price_cents: int


@dataclass(frozen=True)
class OrderConfirmedEvent(DomainEvent):
    """Event: The order was confirmed (payment processed)."""
    payment_method: str | None = None


@dataclass(frozen=True)
class OrderCancelledEvent(DomainEvent):
    """Event: The order was cancelled by customer or system."""
    reason: str = ""


# --- Event Store Interface (port) ---

class EventStore(Protocol):
    """Port interface for event persistence.
    
    Events are appended only — never updated or deleted.
    Each aggregate has its own event stream identified by aggregate_id.
    """
    @abstractmethod
    def append(self, aggregate_id: str, events: Sequence[DomainEvent]) -> int:
        """Append events to the stream. Returns new stream version.""" ...

    @abstractmethod
    def load(self, aggregate_id: str) -> list[DomainEvent]:
        """Load all events for an aggregate from the beginning of the stream.""" ...

    @abstractmethod
    def load_with_snapshot(
        self, aggregate_id: str, expected_version: int
    ) -> tuple[list[DomainEvent], dict | None]:
        """Load events with optional snapshot optimization.""" ...


# --- Snapshot (performance optimization) ---

@dataclass(frozen=True)
class Snapshot:
    """Snapshot captures aggregate state at a point in time.
    
    When loading an aggregate, if a snapshot exists near the current version,
    replay only events after the snapshot rather than from the beginning.
    Snapshots should be taken when event count exceeds the threshold (e.g., 20).
    """
    aggregate_id: str
    snapshot_version: int
    state_snapshot: dict  # JSON-serializable aggregate state


class SnapshotStore(Protocol):
    @abstractmethod
    def save(self, snapshot: Snapshot) -> None: ...

    @abstractmethod
    def load(self, aggregate_id: str) -> Snapshot | None: ...


# --- Event-Sourced Aggregate Root ---

@dataclass(eq=False)
class EventSourcedOrder:
    """Aggregate root that reconstructs state from its event history.
    
    Instead of persisting entity state directly, we append domain events to
    an append-only log. To get current state, we replay events through the
    apply_* methods.
    """
    order_id: str = ""
    customer_id: str = ""
    items: list[OrderItemAddedEvent] = field(default_factory=list)  # Event records as items
    status: str = "PENDING"
    total_cents: int = 0
    _version: int = 0

    # --- Reconstructor: rebuild state from events (for loading) ---
    def replay_events(self, events: Sequence[DomainEvent]) -> None:
        """Replay all events to reconstruct aggregate state."""
        self._clear()
        for event in events:
            method_name = f"_apply_{event.event_type.lower().replace(' ', '_')}"
            if hasattr(self, method_name):
                getattr(self, method_name)(event)

    def _clear(self) -> None:
        """Reset to empty state."""
        self.order_id = ""
        self.customer_id = ""
        self.items = []
        self.status = "PENDING"
        self.total_cents = 0
        self._version = 0

    # --- Domain Operations (produce events, don't persist directly) ---

    def create(
        self, customer_id: str, items_data: list[tuple[str, int, int]]
    ) -> Sequence[DomainEvent]:
        """Create a new order. Returns the events to be appended to the store."""
        if not items_data:
            raise ValueError("Cannot create order with no items")

        # Build line items and calculate total
        order_items = []
        total_cents = 0
        for product_id, quantity, unit_price_cents in items_data:
            order_items.append((product_id, quantity, unit_price_cents))
            total_cents += unit_price_cents * quantity

        # Create events (state will be applied after append)
        created_event = OrderCreatedEvent(
            event_id=f"evt-create-{self.order_id}",
            aggregate_id=self.order_id or f"ORD-new-{customer_id[:6]}",
            event_type="OrderCreated",
            customer_id=customer_id,
            total_cents=total_cents,
            item_count=len(items_data),
        )

        events = [created_event]
        for product_id, quantity, unit_price in order_items:
            added_event = OrderItemAddedEvent(
                event_id=f"evt-item-{self.order_id or 'new'}",
                aggregate_id=created_event.aggregate_id,
                event_type="OrderItemAdded",
                product_id=product_id,
                quantity=quantity,
                unit_price_cents=unit_price,
            )
            events.append(added_event)

        # Apply events to this instance
        for event in events:
            self._apply_order_created(event)
            if hasattr(event, 'product_id'):
                self._apply_order_item_added(event)

        return events

    def confirm(self, payment_method: str | None = None) -> Sequence[DomainEvent]:
        """Confirm the order. Returns event to be appended."""
        if self.status != "PENDING":
            raise RuntimeError(f"Cannot confirm order in '{self.status}' status")
        if not self.customer_id:
            raise RuntimeError("Order must have a customer before confirmation")

        confirmed_event = OrderConfirmedEvent(
            event_id=f"evt-confirm-{self.order_id}",
            aggregate_id=self.order_id,
            event_type="OrderConfirmed",
            payment_method=payment_method,
        )

        self._apply_order_confirmed(confirmed_event)
        return [confirmed_event]

    def cancel(self, reason: str = "") -> Sequence[DomainEvent]:
        """Cancel the order. Returns event to be appended."""
        if self.status not in ("PENDING", "CONFIRMED"):
            raise RuntimeError(f"Cannot cancel order in '{self.status}' status")

        cancelled_event = OrderCancelledEvent(
            event_id=f"evt-cancel-{self.order_id}",
            aggregate_id=self.order_id,
            event_type="OrderCancelled",
            reason=reason,
        )

        self._apply_order_cancelled(cancelled_event)
        return [cancelled_event]

    # --- Event Application Methods (state transitions) ---

    def _apply_order_created(self, event: OrderCreatedEvent) -> None:
        if not self.order_id or self.order_id == "":
            self.order_id = f"ORD-{event.aggregate_id}"
        self.customer_id = event.customer_id
        self.total_cents = event.total_cents
        self._version += 1

    def _apply_order_item_added(self, event: OrderItemAddedEvent) -> None:
        self.items.append(event)
        self._version += 1

    def _apply_order_confirmed(self, event: OrderConfirmedEvent) -> None:
        self.status = "CONFIRMED"
        self._version += 1

    def _apply_order_cancelled(self, event: OrderCancelledEvent) -> None:
        self.status = "CANCELLED"
        self._version += 1


# --- Event Store Implementation (PostgreSQL-backed example) ---

class PostgresEventStore:
    """Concrete Event Store using PostgreSQL.
    
    Uses a simple append-only table with optimistic concurrency control.
    In production, use proper transaction isolation and advisory locks.
    """
    def __init__(self, connection_pool) -> None:
        self._pool = connection_pool

    def append(self, aggregate_id: str, events: Sequence[DomainEvent]) -> int:
        """Append events to the aggregate's event stream.
        
        Uses optimistic concurrency: each event carries a version number.
        If the stream has been modified between load and append, the operation fails.
        """
        if not events:
            raise ValueError("Cannot append empty event sequence")

        new_version = len(events)  # Simplified — real impl tracks current stream version
        serialized_events = [e.serialize() for e in events]

        with self._pool.connection() as conn:
            cursor = conn.cursor()
            for i, raw_event in enumerate(serialized_events):
                event_id = events[i].event_id
                # INSERT only — never UPDATE or DELETE
                cursor.execute(
                    """INSERT INTO event_store 
                       (event_id, aggregate_id, event_type, version, data, created_at)
                       VALUES (%s, %s, %s, %s, %s, NOW())""",
                    (event_id, aggregate_id, events[i].event_type, new_version, raw_event),
                )
            conn.commit()

        return new_version + self._get_current_version(aggregate_id)

    def load(self, aggregate_id: str) -> list[DomainEvent]:
        """Load all events for an aggregate in chronological order."""
        with self._pool.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT data, event_type FROM event_store WHERE aggregate_id = %s ORDER BY created_at",
                (aggregate_id,),
            )
            rows = cursor.fetchall()

        # Map event types to their classes for proper deserialization
        event_classes = {
            "OrderCreated": OrderCreatedEvent,
            "OrderItemAdded": OrderItemAddedEvent,
            "OrderConfirmed": OrderConfirmedEvent,
            "OrderCancelled": OrderCancelledEvent,
        }

        events: list[DomainEvent] = []
        for raw_data, event_type in rows:
            cls = event_classes.get(event_type)
            if cls:
                events.append(DomainEvent.deserialize(raw_data, cls))

        return events

    def _get_current_version(self, aggregate_id: str) -> int:
        """Get current stream version from the database."""
        with self._pool.connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COALESCE(MAX(version), 0) FROM event_store WHERE aggregate_id = %s",
                (aggregate_id,),
            )
            return cursor.fetchone()[0]


# --- Snapshot Strategy ---

class DefaultSnapshotStrategy:
    """Takes snapshots when event count exceeds the configured threshold."""

    def __init__(
        self,
        snapshot_store: SnapshotStore,
        threshold: int = 20,
    ) -> None:
        self._snapshot_store = snapshot_store
        self._threshold = threshold

    def should_snapshot(self, current_version: int) -> bool:
        """Determine if a snapshot should be created now."""
        return current_version > 0 and current_version % self._threshold == 0

    def take(
        self, aggregate: EventSourcedOrder
    ) -> Snapshot:
        """Create a snapshot of the aggregate's current state."""
        state = {
            "order_id": aggregate.order_id,
            "customer_id": aggregate.customer_id,
            "status": aggregate.status,
            "total_cents": aggregate.total_cents,
            "item_count": len(aggregate.items),
        }
        snapshot = Snapshot(
            aggregate_id=aggregate.order_id,
            snapshot_version=aggregate._version,
            state_snapshot=state,
        )
        self._snapshot_store.save(snapshot)
        return snapshot


# --- ❌ BAD: Traditional ORM persistence (no event history) ---
class BadOrderPersistence:
    """Direct entity persistence — no audit trail, no time travel.
    
    Problems:
      - Updating an entity overwrites the previous state forever
      - Cannot reconstruct historical order of events
      - Difficult to implement undo or time-travel debugging
      - No natural way to build separate read projections
    """
    def __init__(self, session):
        self._session = session

    def save_order(self, order: object) -> None:
        self._session.merge(order)  # Overwrites previous state!
        self._session.commit()

    def get_order_history(self, order_id: str) -> list:
        # No event history — must reconstruct from audit logs or snapshots


# --- ✅ GOOD: Event-sourced persistence with full history ---
class GoodEventSourcingFlow:
    """Complete event sourcing flow: load → replay → operate → append."""

    def __init__(self, event_store: PostgresEventStore) -> None:
        self._event_store = event_store

    def create_order(self, customer_id: str, items_data: list[tuple[str, int, int]]) -> EventSourcedOrder:
        """Create a new order using event sourcing."""
        aggregate = EventSourcedOrder(order_id=f"ORD-{customer_id[:6]}-001")
        events = aggregate.create(customer_id, items_data)

        # Append events to the append-only log
        self._event_store.append(aggregate.order_id, events)

        return aggregate

    def load_order(self, order_id: str) -> EventSourcedOrder:
        """Load an order by replaying its event history."""
        aggregate = EventSourcedOrder(order_id=order_id)
        events = self._event_store.load(order_id)
        aggregate.replay_events(events)
        return aggregate

    def operate_and_persist(
        self, order_id: str, operation: str, **kwargs
    ) -> Sequence[DomainEvent]:
        """Load → operate → produce events → persist (complete CQRS command flow)."""
        # Step 1: Load from event store (replay history)
        order = self.load_order(order_id)

        # Step 2: Execute operation (produce new events)
        if operation == "confirm":
            events = order.confirm(kwargs.get("payment_method"))
        elif operation == "cancel":
            events = order.cancel(kwargs.get("reason", "Customer requested"))
        else:
            raise ValueError(f"Unknown operation: {operation}")

        # Step 3: Append new events to the store
        self._event_store.append(order_id, events)

        return events


# Demonstrate complete event sourcing workflow
def demonstrate_event_sourcing() -> None:
    """Show a realistic event sourcing flow with snapshot optimization."""
    store = PostgresEventStore(connection_pool=None)  # Would be real pool in production
    es = GoodEventSourcingFlow(store)

    # Create order
    order = es.create_order(
        customer_id="CUST-ABCD1234",
        items_data=[
            ("PROD-A", 2, 2999),   # 2x $29.99 in cents
            ("PROD-B", 1, 4950),   # 1x $49.50 in cents
        ],
    )

    # Order reconstructed from events: 2 items, $109.48 total, PENDING status
    assert order.status == "PENDING"
    assert order.total_cents == 10948
    assert len(order.items) == 3  # Create event + 2 item events

    # Operate: confirm and cancel
    confirmed_events = es.operate_and_persist("ORD-ABCD1234-001", "confirm", payment_method="stripe")
    cancelled_events = es.operate_and_persist("ORD-ABCD1234-001", "cancel", reason="Customer request")

    # Load and verify full history is preserved
    loaded = es.load_order("ORD-ABCD1234-001")
    assert loaded.status == "CANCELLED"  # Final state after all events replayed
```

---

## Constraints

### MUST DO
- Define all port interfaces (abstract protocols) in the domain or application layer BEFORE writing infrastructure adapters
- Enforce every business invariant inside aggregate root methods — never skip validation for performance
- Separate command handlers (write side with full domain logic) from query handlers (read side optimized projections)
- Store events as append-only records — never update, soft-delete, or mask existing event data
- Implement snapshots when aggregates accumulate more than 20 events to avoid replay latency
- Version all domain events with a schema version and implement migration logic in the deserializer
- Inject infrastructure dependencies through constructor injection (composition root pattern)
- Keep the domain package free of imports from application, infrastructure, or framework layers
- Use typed value objects (OrderId, Money, ProductId) instead of raw strings for domain identifiers

### MUST NOT DO
- Import database drivers, ORM frameworks, or message broker libraries inside the domain layer
- Create aggregate root methods that bypass invariant checks to "speed things up"
- Use a single model/entity class for both command operations AND query projections
- Update or delete existing events in the event store — this breaks the append-only guarantee
- Skip snapshot strategy — replaying 100+ events per request causes unacceptable latency at scale
- Mix infrastructure concerns (SQL queries, HTTP calls, file I/O) inside aggregate root methods
- Design ports that are too broad — each port should have exactly one responsibility (SRP)
- Store mutable default arguments in frozen dataclasses or value objects
- Place authentication or authorization logic inside domain entities — handle at the composition boundary

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-architecture` | Broader architectural pattern evaluation — layered, hexagonal, event-driven — for system-level design decisions |
| `ddd-context-mapping` | Strategic DDD: bounded context boundaries, anticorruption layers, customer-supplier relationships across teams |
| `cqrs-pattern` | Focused CQRS implementation with read model projections, command validation, and query optimization patterns |
| `domain-events` | Domain event design conventions: naming, versioning, serialization, idempotent handlers, outbox pattern |
| `microservices-architecture` | Decomposing bounded contexts into independent microservices with service mesh, API gateways, and deployment topology |

---

## Live References

> Authoritative documentation and reference materials for the architectural patterns covered in this skill.

- [Domain-Driven Design: Tactical Design — Martin Fowler](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Hexagonal Architecture (Ports & Adapters) — Alistair Cockburn](http://alistair.cockburn.us/hexagonal-architecture)
- [CQRS Pattern — Microsoft Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/design-patterns/cqrs-pattern)
- [Event Sourcing — Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [Python `typing.Protocol` — PEP 544](https://peps.python.org/pep-0544/)
- [Python Dataclasses — Frozen Instances](https://docs.python.org/3/library/dataclasses.html#frozen-instances)
