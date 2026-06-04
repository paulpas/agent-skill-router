---
name: domain-driven-tactical
description: Implements tactical DDD patterns including Entities, Value Objects, Aggregates, Repositories, Domain Events, and Factories with Python dataclasses and strict invariant enforcement.
license: MIT
compatibility: opencode
archetypes:
  - tactical
  - generation
anti_triggers:
  - brainstorming
  - vague ideation
response_profile:
  verbosity: low
  directive_strength: high
  abstraction_level: operational
metadata:
  version: "1.0.0"
  domain: coding
  triggers: value objects, domain entities, aggregates, repositories, domain events, factories, tactical design, invariant enforcement
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-strategic, architecture-microservices
---

# Tactical Domain-Driven Design — Entities, Value Objects & Aggregate Roots

Implements the tactical building blocks of Domain-Driven Design in Python: immutable value objects with semantic equality, entities with identity and lifecycle, aggregates that enforce invariants as a unit, repository interfaces that abstract persistence, domain events for expressing state changes, and factories that encapsulate complex object creation.

## TL;DR Checklist

- [ ] Define Value Objects as frozen dataclasses with semantic equality
- [ ] Define Entities with identity and protected mutation methods
- [ ] Enforce all invariants inside the Aggregate Root — never let child objects violate them
- [ ] Repository interfaces declare query methods, not CRUD operations
- [ ] Domain events are immutable snapshots published after state changes
- [ ] Factories encapsulate creation logic that cannot fit in `__init__`

---

## When to Use

- Implementing a domain model where business rules require strict invariant enforcement
- Designing objects where identity matters (Entities) versus where value matters (Value Objects)
- Building aggregates that must maintain consistency across multiple related objects
- Defining repository contracts for persistence without leaking infrastructure concerns
- Expressing state changes as explicit Domain Events for eventual consistency and audit trails
- Encapsulating complex object creation logic that would clutter constructors

---

## When NOT to Use

- Simple DTOs or data transfer objects with no business logic — use plain Pydantic models or `TypedDict`
- Read-only projections used only for reporting — these do not need aggregate boundaries
- Performance-critical hot paths where the overhead of invariant checking is unacceptable (but consider adding it in non-production builds)
- When your team lacks domain experts to validate invariants — tactical DDD without a well-understood domain produces elaborate abstractions with no business value

---

## Core Workflow

1. **Classify Domain Objects** — For each concept in the domain, decide whether it is an Entity (identity-based, stateful) or a Value Object (value-based, immutable). **Checkpoint:** If two objects with the same data should be interchangeable without tracking them separately, it is a Value Object. If you need to distinguish "Order #42" from "Order #43" even if both have identical line items, it is an Entity.

2. **Define Value Objects** — Create frozen `dataclasses` with semantic equality (`__eq__`) and hashability. Every field that contributes to the object's identity must be included in `__eq__`. **Checkpoint:** Frozen value objects cannot be mutated after creation — any "update" returns a new instance.

3. **Define Entities** — Create classes with a unique identifier (UUID, integer sequence, or domain-specific key). Encapsulate state mutation behind named methods that enforce invariants before modifying state. **Checkpoint:** Every public mutation method must validate preconditions and raise an exception if the invariant is violated — never silently accept invalid state.

4. **Define Aggregates** — Group related entities and value objects into an Aggregate Root. Only the root's methods can modify internal state. Child objects are accessed through the root and cannot be mutated directly from outside. **Checkpoint:** The aggregate boundary is the consistency boundary — all invariants within the group must hold simultaneously after any operation.

5. **Define Repository Interfaces** — Create protocol classes that declare query and persistence methods. The interface lives in the domain layer; implementations live in the infrastructure layer. **Checkpoint:** Repository methods should reflect how the domain queries for objects, not how the database indexes them.

6. **Implement Domain Events** — Define immutable event dataclasses with a timestamp and all state needed by handlers. Publish events through the Aggregate Root after a state change is committed. **Checkpoint:** Events must be idempotent — handlers should guard against processing the same event twice using an event store that tracks published event IDs.

7. **Implement Factories** — Move complex object creation out of constructors into factory methods or dedicated factory classes when the logic cannot fit in a single `__init__` call. **Checkpoint:** A factory is only needed when creation requires knowledge of multiple aggregates, external services, or multi-step validation that does not belong to any single entity's responsibilities.

---

## Implementation Patterns

### Pattern 1: Value Objects — Immutability and Semantic Equality (BAD vs. GOOD)

**❌ BAD — Mutable value objects break the fundamental contract that "same value equals same object" because their identity can drift.**

```python
# ❌ BAD: A mutable Money type allows accidental modification
class BadMoney:
    """Mutable money — changing amount after comparison breaks equality."""

    def __init__(self, amount: float, currency: str = "USD") -> None:
        self.amount = amount          # ← mutable, can be changed externally
        self.currency = currency      # ← also mutable

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, BadMoney):
            return NotImplemented
        return self.amount == other.amount and self.currency == other.currency

    def add(self, other: "BadMoney") -> "BadMoney":
        # Returns a new instance, but the original can still be mutated by callers
        return BadMoney(self.amount + other.amount, self.currency)


# Usage demonstrates the problem:
m1 = BadMoney(100.0, "USD")
m2 = BadMoney(100.0, "USD")
assert m1 == m2  # True — equal values

m1.amount = 99.0  # ← silently changes m1; now they differ even though no one called add()
assert m1 != m2   # True — but m1's identity has been corrupted without its knowledge
```

**✅ GOOD — Frozen dataclasses with semantic equality guarantee immutability and consistent hashing.**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from decimal import Decimal
from typing import ClassVar


@dataclass(frozen=True, order=False)
class Money:
    """Immutable monetary value with currency.

    Uses Decimal for exact arithmetic — never float for money.
    Equality is based on the pair (amount, currency), not object identity.
    Hashable so it can be used as a dict key or in sets.
    """

    amount: Decimal
    currency: str = field(default="USD", hash=True, compare=True)

    # Canonical currencies — prevents typos from creating invalid states
    _VALID_CURRENCIES: ClassVar[frozenset[str]] = frozenset({
        "USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY",
    })

    def __post_init__(self) -> None:
        if self.currency not in self._VALID_CURRENCIES:
            raise ValueError(
                f"Invalid currency '{self.currency}' — must be one of "
                f"{sorted(self._VALID_CURRENCIES)}"
            )

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        # Currency codes are case-insensitive for comparison (ISO 4217 allows both)
        return self.amount == other.amount and self.currency.upper() == other.currency.upper()

    def __hash__(self) -> int:
        return hash((self.amount, self.currency.upper()))

    def add(self, other: Money) -> Money:
        """Add two Money values — currencies must match."""
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add {other.currency} to {self.currency} — "
                "currencies must match for arithmetic operations"
            )
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: Money) -> Money:
        """Subtract another Money value from this one."""
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot subtract {other.currency} from {self.currency}"
            )
        return Money(self.amount - other.amount, self.currency)

    def multiply(self, factor: Decimal) -> Money:
        """Multiply by a scalar factor."""
        if not isinstance(factor, Decimal):
            raise TypeError("Factor must be a Decimal")
        return Money(self.amount * factor, self.currency)

    @classmethod
    def from_cents(cls, cents: int, currency: str = "USD") -> Money:
        """Factory method: create Money from integer cents to avoid float entirely."""
        return cls(Decimal(cents) / Decimal(100), currency)
```

### Pattern 2: Aggregate Root — Invariant Enforcement

**❌ BAD — Child objects can be mutated directly, allowing invariant violations.**

```python
# ❌ BAD: OrderItem can be added to order's items list directly
class BadOrder:
    def __init__(self, customer_id: str) -> None:
        self.customer_id = customer_id
        self.items: list[BadOrderItem] = []  # ← caller can mutate this directly
        self.total = Decimal("0.00")

    def add_item(self, item: BadOrderItem) -> None:
        """Adding an item without enforcing any invariants."""
        self.items.append(item)  # No validation — zero quantity slips through


class BadOrderItem:
    def __init__(self, product_id: str, quantity: int, unit_price: Decimal) -> None:
        # No validation at all — negative quantities accepted
        self.product_id = product_id
        self.quantity = quantity      # ← can be changed externally too
        self.unit_price = unit_price  # ← also mutable
```

**✅ GOOD — The Aggregate Root controls all mutations through named methods with invariant checks.**

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID, uuid4


@dataclass(frozen=True)
class LineItem:
    """Immutable line item within an Order aggregate."""
    product_id: str
    quantity: int
    unit_price: Decimal

    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError(f"Line item quantity must be positive, got {self.quantity}")
        if self.unit_price < 0:
            raise ValueError(f"Unit price must not be negative, got {self.unit_price}")

    @property
    def line_total(self) -> Decimal:
        return self.unit_price * self.quantity


class OrderStatus:
    """Value object for order status — prevents invalid state transitions."""
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

    _TRANSITIONS: dict[str, set[str]] = {
        OrderStatus.DRAFT: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
        OrderStatus.DELIVERED: set(),  # terminal state — no transitions allowed
        OrderStatus.CANCELLED: set(),  # terminal state
    }

    @classmethod
    def is_valid_transition(cls, from_state: str, to_state: str) -> bool:
        return to_state in cls._TRANSITIONS.get(from_state, set())


@dataclass
class Order:
    """Aggregate Root for the Order aggregate.

    All mutations go through this class's methods. Internal state is
    protected by convention (prefixed with _) and enforced by invariant checks.
    Only one method modifies items directly: _add_line_item, which validates
    before appending.
    """

    id: UUID = field(default_factory=uuid4)
    customer_id: str = field(default="")
    _items: list[LineItem] = field(default_factory=list, repr=False)
    _status: str = field(default=OrderStatus.DRAFT, repr=False)
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

    # --- Public mutation methods — all enforce invariants ---

    def set_customer(self, customer_id: str) -> None:
        """Assign a customer to this order. Only valid in DRAFT status."""
        self._enforce_status(OrderStatus.DRAFT, "set_customer")
        if not customer_id or len(customer_id) < 3:
            raise ValueError(f"Customer ID must be at least 3 characters, got '{customer_id}'")
        self.customer_id = customer_id

    def add_line_item(self, product_id: str, quantity: int, unit_price: Decimal) -> None:
        """Add a line item — creates an immutable LineItem and validates the aggregate."""
        self._enforce_status(OrderStatus.DRAFT, "add_line_item")
        # Create the value object (it validates itself in __post_init__)
        item = LineItem(product_id=product_id, quantity=quantity, unit_price=unit_price)
        self._items.append(item)
        self._recalculate_total()

    def confirm(self) -> None:
        """Transition order to confirmed status. Requires a customer assigned."""
        self._enforce_status(OrderStatus.DRAFT, "confirm")
        if not self.customer_id:
            raise ValueError("Cannot confirm an order without a customer assigned")
        if not self._items:
            raise ValueError("Cannot confirm an order with no line items")
        self._status = OrderStatus.CONFIRMED

    def cancel(self) -> None:
        """Cancel the order. Valid from DRAFT or CONFIRMED."""
        valid_from = {OrderStatus.DRAFT, OrderStatus.CONFIRMED}
        if self._status not in valid_from:
            raise ValueError(
                f"Cannot cancel an order in '{self._status}' status — "
                f"only valid from {valid_from}"
            )
        self._status = OrderStatus.CANCELLED

    # --- Read-only accessors (no mutation possible) ---

    @property
    def items(self) -> tuple[LineItem, ...]:
        """Returns a snapshot — callers cannot modify the internal list."""
        return tuple(self._items)

    @property
    def status(self) -> str:
        return self._status

    @property
    def total(self) -> Decimal:
        """Calculated total of all line items."""
        return sum((item.line_total for item in self._items), Decimal("0.00"))

    # --- Private helpers (enforce internal consistency) ---

    def _enforce_status(self, required_status: str, method_name: str) -> None:  # noqa: ARG002
        if self._status != required_status:
            raise ValueError(
                f"Cannot call '{method_name}' — order is in status "
                f"'{self._status}', requires '{required_status}'"
            )

    def _recalculate_total(self) -> None:  # noqa: ARG002
        """Internal method — called after every item addition.

        In a larger aggregate, this would also update cached totals,
        notify internal subscribers of domain events, and revalidate
        any derived invariants.
        """
        pass  # Total is computed on-demand; no caching needed for small orders
```

### Pattern 3: Repository Protocol and Domain Events

**✅ GOOD — Repository interfaces are pure protocols that define domain-level query semantics.**

```python
from __future__ import annotations
from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Generic, Protocol, TypeVar
from uuid import UUID


T_co = TypeVar("T_co", covariant=True)


class RepositoryProtocol(Protocol[T_co]):
    """Base protocol for all repository interfaces.

    Domain code depends on this protocol; infrastructure implements it.
    Methods reflect how the domain queries, not how the database indexes.
    """

    def get_by_id(self, id: UUID) -> T_co | None: ...
    def save(self, entity: T_co) -> None: ...
    def delete(self, entity: T_co) -> None: ...


class OrderRepositoryProtocol(RepositoryProtocol["Order"], Protocol):  # type: ignore[name-defined]
    """Domain-specific repository protocol with query methods the domain needs."""

    def find_by_customer_id(self, customer_id: str) -> Sequence[Order]: ...
    def find_open_orders_for_date(self, date: datetime) -> Sequence[Order]: ...


# --- Domain Events ---

@dataclass(frozen=True)
class OrderCreatedEvent:
    """Immutable snapshot of the order state at creation time."""
    order_id: UUID
    customer_id: str
    item_count: int
    total_amount: Decimal
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True)
class OrderConfirmedEvent:
    order_id: UUID
    confirmed_at: datetime = field(default_factory=lambda: datetime.now(UTC))


@dataclass(frozen=True)
class OrderCancelledEvent:
    order_id: UUID
    cancellation_reason: str
    occurred_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class DomainEventPublisher:
    """Publishes domain events with idempotency support.

    In production, this would persist events to an event store and notify handlers.
    Here it demonstrates the pattern of collecting events on the aggregate
    and flushing them after the unit of work commits.
    """

    def __init__(self) -> None:
        self._published_ids: set[UUID] = set()

    def publish(self, event: OrderCreatedEvent | OrderConfirmedEvent | OrderCancelledEvent) -> None:
        # Idempotency guard — prevent duplicate processing
        if event.occurred_at.timestamp() in self._published_ids:
            return  # Already published; skip silently
        self._published_ids.add(event.occurred_at.timestamp())
        self._dispatch(event)

    def _dispatch(self, event: OrderCreatedEvent | OrderConfirmedEvent | OrderCancelledEvent) -> None:
        """In production, this routes to registered handlers."""
        pass  # Event routing handled by infrastructure layer


class InMemoryOrderRepository:
    """Concrete implementation for demonstration. In production, use SQLAlchemy, DDD-style repository, etc."""

    def __init__(self) -> None:
        self._store: dict[UUID, Order] = {}

    def get_by_id(self, id: UUID) -> Order | None:
        return self._store.get(id)

    def save(self, entity: Order) -> None:
        self._store[entity.id] = entity

    def delete(self, entity: Order) -> None:
        self._store.pop(entity.id, None)

    def find_by_customer_id(self, customer_id: str) -> Sequence[Order]:
        return [
            order for order in self._store.values()
            if order.customer_id == customer_id
        ]

    def find_open_orders_for_date(self, date: datetime) -> Sequence[Order]:
        return [
            order for order in self._store.values()
            if order.status in (OrderStatus.DRAFT, OrderStatus.CONFIRMED)
        ]
```

---

## Constraints

### MUST DO
- Make Value Objects frozen dataclasses with explicit `__eq__` and `__hash__` — they must be safe to use as dictionary keys and set members
- Define a unique identifier for every Entity — even if it is a natural key (e.g., ISO currency code), express it explicitly in the type
- Enforce all domain invariants inside the Aggregate Root's mutation methods — never allow an aggregate to exist in an invalid state, even temporarily
- Declare repository interfaces as `Protocol` classes in the domain layer — implementations must be in the infrastructure layer, never imported by domain code
- Publish domain events as frozen dataclasses that capture a complete snapshot of the relevant state at the moment the event occurred
- Use factory methods or dedicated factory classes when object creation requires knowledge of multiple aggregates, external services, or multi-step validation
- Use `Decimal` (not `float`) for all monetary values to prevent floating-point rounding errors

### MUST NOT DO
- Mutate a Value Object after creation — any "update" must return a new instance; frozen dataclasses enforce this at the language level
- Allow child objects in an Aggregate to be mutated directly from outside — always route modifications through the Aggregate Root's public methods
- Design repositories around database operations (`findByCustomerId`, `deleteWhere`); design them around domain queries (`find_by_customer_id`, `delete`)
- Publish domain events before the unit of work that caused them is committed — an event should never be published for a state change that is later rolled back
- Put persistence logic inside entities or value objects — entities must know nothing about databases, ORMs, or serialization formats
- Use strings as entity IDs in production without a dedicated identifier type (e.g., `OrderID` wrapping `UUID`) — this hides bugs where order IDs and customer IDs are swapped

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-strategic` | Defines the bounded contexts and architecture boundaries within which these tactical patterns operate — strategic design must precede tactical implementation |
| `architecture-microservices` | Guides how aggregates mapped to a single bounded context become independently deployable microservices with their own data stores |

---

## Live References

> Authoritative documentation and reference material for tactical DDD patterns.

- [Domain-Driven Design: Tackling Complexity in the Heart of Software by Eric Evans](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215) — The original definition of Entities, Value Objects, Aggregates, and their boundaries
- [Implementing Domain-Driven Design by Vaughn Vernon ("The Red Book")](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577) — Chapter 8 covers aggregates and consistency boundaries; Chapter 11 covers repositories
- [Udi Dahan — Entities, Value Objects, and Monitors](http://udidahan.com/2015/06/22/entities-value-objects-and-monitors/) — Udi's practical guidance on choosing between entity types
- [Python dataclasses documentation](https://docs.python.org/3/library/dataclasses.html) — Reference for `@dataclass(frozen=True)` and field options like `hash=True`
- [Python typing module — Protocol support (PEP 544)](https://peps.python.org/pep-0544/) — Structured subtyping via Protocol classes for repository interfaces
- [DDD Lite — Vaughn Vernon's simplified DDD](https://www.infoq.com/articles/domain-driven-design-essentials/) — A pragmatic introduction for teams finding full DDD too heavy
- [The CQRS Cookbook — Domain Events pattern](https://cqrs.nu/Faq/) — How domain events enable eventual consistency between read and write models
