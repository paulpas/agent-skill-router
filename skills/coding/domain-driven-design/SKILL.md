---
name: domain-driven-design
description: Implements Domain-Driven Design patterns (aggregates, value objects,
  entities, bounded contexts, domain events) to model complex business logic and align
  software architecture with domain expertise.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain driven design, ddd, bounded context, aggregate root, entity, value
    object, strategic design, tactical patterns
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
  - do-dont
  - examples
  related-skills: design-patterns-architecture, software-design-principles, event-driven-architecture
------
# Domain-Driven Design Patterns

Implements tactical and strategic DDD patterns to model complex business domains where software structure must reflect domain expertise. Produces value objects, entities, aggregates, domain events, and bounded context boundaries that enforce invariants at the domain layer.

## TL;DR Checklist

- [ ] Identify bounded contexts by separating ubiquitous language from shared infrastructure concerns
- [ ] Model value objects as immutable types with value-based equality (no identity field)
- [ ] Model entities with stable identity, protected through constructor validation and invariant checks
- [ ] Enforce all business invariants inside aggregate root constructors — never allow invalid state
- [ ] Publish domain events as immutable records after state transitions, not before
- [ ] Keep aggregates small (one primary key per transaction) to avoid distributed consistency problems
- [ ] Separate domain layer from infrastructure — no ORM annotations, no SQL strings in domain models

---

## When to Use

- Building systems with complex business rules where data integrity is non-trivial (payments, ordering, scheduling, compliance)
- Aligning software terminology with domain expert vocabulary (ubiquitous language)
- Protecting invariants that span multiple pieces of data (e.g., an order must have at least one item and a valid shipping address)
- Systems where the same concept has different meanings in different contexts (a "customer" means something different in sales vs. support)
- Teams need a shared mental model to reduce miscommunication between developers and domain experts

---

## When NOT to Use

- Simple CRUD applications with no business rules — DDD adds overhead without benefit (use plain ORM models instead)
- Read-heavy reporting systems where data consistency boundaries are irrelevant
- Greenfield projects where the domain is not yet understood — spend time learning the domain before modeling it
- Situations requiring real-time distributed consensus across multiple aggregates — use CQRS or event sourcing patterns first

---

## Core Workflow

1. **Elicit Ubiquitous Language** — Interview domain experts, extract key nouns and verbs, resolve conflicting terminology. **Checkpoint:** Every concept in the model must have a single term agreed upon by all stakeholders. If "order" means two different things to two teams, that is a bounded context boundary.

2. **Identify Bounded Contexts** — Partition the system by responsibility. Each bounded context owns its own models and terminology. Draw context maps showing relationships: `Ours ↔ Theirs`, `Customer ↔ Supplier`, `Conformist`, `Anticorruption Layer`. **Checkpoint:** No concept should appear in two contexts with different semantics without an explicit translation layer.

3. **Model Tactical Elements** — Inside each bounded context, define value objects (immutable, equality by value), entities (identity-based, lifecycle-aware), aggregate roots (consistency boundary), and domain events (state change records). **Checkpoint:** Every aggregate root must have at least one invariant check in its constructor. No aggregate should be larger than a single database transaction can reasonably update.

4. **Enforce Invariants in Constructors** — Every factory method or constructor validates all business rules. Invalid state is impossible to represent. Raise explicit domain exceptions (`ValueError` with descriptive messages) rather than returning error codes. **Checkpoint:** After construction, the object must be guaranteed valid — no getters that return partial/invalid data.

5. **Publish Domain Events After State Changes** — Mutate state first, then record events. Do not modify state based on incoming events in the same transaction unless using CQRS/event sourcing with a proven materialized view pattern. **Checkpoint:** Event handlers must be idempotent and handle out-of-order delivery.

6. **Separate Domain from Infrastructure** — Domain models must never import database drivers, message brokers, or HTTP clients. Use repository interfaces defined in the domain layer, implemented in infrastructure. **Checkpoint:** Run `import` analysis on all domain files — if any import references `sqlalchemy`, `django.db`, `redis`, or network code, refactor immediately.

---

## Implementation Patterns

### Pattern 1: Value Object — Identity by Value, Immutability

Value objects are defined entirely by their attributes. Two value objects with the same attribute values are equal. They are immutable and have no identity field. Use for amounts, dates, addresses, identifiers that carry meaning beyond a database key.

```python
from __future__ import annotations
from dataclasses import dataclass, fields
from decimal import Decimal
from typing import Final


@dataclass(frozen=True, slots=True)
class Money:
    """Immutable monetary value with currency. Equality is based on value, not identity."""
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money cannot represent negative amounts; use a separate Debt type")
        if len(self.currency) != 3 or not self.currency.isalpha():
            raise ValueError(f"Invalid ISO 4217 currency code: {self.currency!r}")

    def add(self, other: Money) -> Money:
        """Return a new Money with the summed amount. Raises on currency mismatch."""
        if self.currency != other.currency:
            raise ValueError(
                f"Cannot add {other.currency} to {self.currency}; currencies must match"
            )
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: Money) -> Money:
        return Money(self.amount - other.amount, self.currency)

    @property
    def is_zero(self) -> bool:
        return self.amount == Decimal("0")


# ❌ BAD: Value object with mutable fields and no equality — treated as identity by reference
class BadMoney:
    def __init__(self, amount: float, currency: str) -> None:
        self.amount = amount       # Mutable — can be changed after creation
        self.currency = currency   # No __eq__ override — two identical amounts are unequal


# ✅ GOOD: Frozen dataclass with value equality and invariant enforcement in constructor
good_usd = Money(Decimal("10.00"), "USD")
good_eur = Money(Decimal("5.00"), "EUR")
assert good_usd == Money(Decimal("10.00"), "USD")   # Value equality holds
```

**Key principles:**
- Use `@dataclass(frozen=True)` or `NamedTuple` to enforce immutability at the type level
- Override `__eq__` and `__hash__` if using a class (dataclasses do this automatically with frozen=True)
- Validate invariants in `__post_init__` — never allow callers to construct an invalid state
- Prefer `Decimal` over `float` for monetary values to avoid floating-point precision errors

---

### Pattern 2: Entity — Identity by ID, Protected Lifecycle

Entities are defined by a stable identity that persists across attribute changes. They have a lifecycle (created → active → archived). Invariants protect the lifecycle transitions. Entities import value objects and other entities as attributes but never expose internal state through mutable accessors.

```python
from __future__ import annotations
from datetime import date
from enum import Enum, auto


class OrderStatus(Enum):
    DRAFT = auto()
    CONFIRMED = auto()
    SHIPPED = auto()
    CANCELLED = auto()
    COMPLETED = auto()


# ❌ BAD: Entity with public mutable state — any code can set status to any value
class BadOrder:
    def __init__(self, order_id: str, customer_email: str) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self.status: OrderStatus = OrderStatus.DRAFT  # Public mutation — no lifecycle control


# ✅ GOOD: Entity with private state and transition-enforcing methods
class Order:
    _VALID_TRANSITIONS: Final[dict[OrderStatus, set[OrderStatus]]] = {
        OrderStatus.DRAFT:       {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
        OrderStatus.CONFIRMED:   {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
        OrderStatus.SHIPPED:     {OrderStatus.COMPLETED},
        OrderStatus.CANCELLED:   set(),
        OrderStatus.COMPLETED:   set(),
    }

    def __init__(self, order_id: str, customer_email: str) -> None:
        if not order_id or len(order_id) < 8:
            raise ValueError(f"Invalid order ID: {order_id!r}")
        if "@" not in customer_email:
            raise ValueError(f"Invalid customer email: {customer_email!r}")

        self._order_id: Final[str] = order_id
        self._customer_email: str = customer_email
        self._status: OrderStatus = OrderStatus.DRAFT
        self._created_at: date = date.today()
        self._items: list[OrderItem] = []

    @property
    def status(self) -> OrderStatus:
        return self._status

    @property
    def order_id(self) -> str:
        return self._order_id

    def add_item(self, product_id: str, quantity: int, unit_price: Money) -> None:
        if self._status != OrderStatus.DRAFT:
            raise RuntimeError(f"Cannot add items to order in {self._status.name} state")
        if quantity <= 0:
            raise ValueError("Item quantity must be positive")
        self._items.append(OrderItem(product_id, quantity, unit_price))

    def confirm(self) -> None:
        """Transition to CONFIRMED. Fails fast if invariant is violated."""
        if not self._items:
            raise RuntimeError("Cannot confirm an order with no items")
        if OrderStatus.CONFIRMED not in self._VALID_TRANSITIONS.get(self._status, set()):
            raise RuntimeError(
                f"Cannot transition from {self._status.name} to CONFIRMED"
            )
        self._status = OrderStatus.CONFIRMED

    def cancel(self) -> None:
        if OrderStatus.CANCELLED not in self._VALID_TRANSITIONS.get(self._status, set()):
            raise RuntimeError(
                f"Cannot cancel order in {self._status.name} state"
            )
        self._status = OrderStatus.CANCELLED

    @property
    def total(self) -> Money:
        if not self._items:
            return Money(Decimal("0"), "USD")
        running_total = Money(Decimal("0"), self._items[0].unit_price.currency)
        for item in self._items:
            line_total = item.unit_price.amount * Decimal(item.quantity)
            running_total = running_total.add(Money(line_total, item.unit_price.currency))
        return running_total
```

**Key principles:**
- Identity is set once at construction and never changes (use `Final` or private attribute)
- State transitions are enforced through explicit methods, not public field assignment
- Domain exceptions carry context about *why* a transition failed
- Use properties for read access; avoid setter methods that bypass validation

---

### Pattern 3: Aggregate Root — Consistency Boundary

The aggregate root is the gatekeeper for all modifications to its contained entities and value objects. All invariants spanning multiple objects are enforced at this boundary. The aggregate root is the only object from the aggregate that external code should reference directly.

```python
from __future__ import annotations
from collections import defaultdict


class OrderItem:
    def __init__(self, product_id: str, quantity: int, unit_price: Money) -> None:
        if quantity <= 0:
            raise ValueError("Quantity must be positive")
        self.product_id = product_id
        self.quantity = quantity
        self.unit_price = unit_price


class OrderAggregateRoot:
    """Aggregate root enforcing cross-field invariants across the order graph."""

    MAX_ITEMS_PER_ORDER: Final[int] = 100
    MIN_TOTAL: Final[Money] = Money(Decimal("0.01"), "USD")

    def __init__(self, order_id: str, customer_email: str) -> None:
        if not order_id:
            raise ValueError("Order ID is required")
        self._order_id = order_id
        self._customer_email = customer_email
        self._items: list[OrderItem] = []
        self._ship_to: Address | None = None

    @property
    def total(self) -> Money:
        if not self._items:
            return Money(Decimal("0"), "USD")
        currency = self._items[0].unit_price.currency
        running_total = Money(Decimal("0"), currency)
        for item in self._items:
            line_value = item.unit_price.amount * Decimal(item.quantity)
            running_total = running_total.add(Money(line_value, currency))
        return running_total

    @property
    def ship_to(self) -> Address | None:
        return self._ship_to

    def set_shipping_address(self, address: Address) -> None:
        """Aggregate invariant: cannot confirm without a shipping address."""
        self._ship_to = address

    def add_item(self, product_id: str, quantity: int, unit_price: Money) -> None:
        if len(self._items) >= self.MAX_ITEMS_PER_ORDER:
            raise RuntimeError(
                f"Order {self._order_id} exceeds maximum of {self.MAX_ITEMS_PER_ORDER} items"
            )
        # Duplicate detection invariant
        for existing in self._items:
            if existing.product_id == product_id:
                raise ValueError(
                    f"Product {product_id} already in order; update quantity instead"
                )
        self._items.append(OrderItem(product_id, quantity, unit_price))

    def remove_item(self, product_id: str) -> None:
        before = len(self._items)
        self._items = [i for i in self._items if i.product_id != product_id]
        if len(self._items) == before:
            raise KeyError(f"No item with product_id {product_id!r} found in order")

    def validate_consistency(self) -> list[str]:
        """Return list of violated invariants. Empty list means the aggregate is valid."""
        violations: list[str] = []

        if not self._items and self._ship_to:
            violations.append("Cannot have shipping address with no items")

        if self.ship_to is None and self._items:
            violations.append("Order has items but no shipping address set")

        if self.total.is_zero and self._items:
            violations.append("Items present but total is zero — check unit prices")

        return violations


# ❌ BAD: Aggregate root that allows invariant-breaking through direct access to children
class BadAggregateRoot:
    def __init__(self) -> None:
        self.items: list[OrderItem] = []  # Public — callers can clear items, set invalid state

    def confirm(self) -> bool:
        return len(self.items) > 0  # No invariant check for shipping address


# ✅ GOOD: Aggregate root that validates all cross-entity invariants before any operation
def create_valid_order() -> OrderAggregateRoot:
    """Factory function that builds a valid aggregate in one shot."""
    order = OrderAggregateRoot("ORD-001234", "alice@example.com")
    order.set_shipping_address(Address("123 Main St", "Springfield", "IL", "62701", "US"))
    order.add_item("SKU-WIDGET-A", 2, Money(Decimal("25.00"), "USD"))
    order.add_item("SKU-GADGET-B", 1, Money(Decimal("49.99"), "USD"))

    violations = order.validate_consistency()
    if violations:
        raise ValueError(f"Aggregate validation failed: {'; '.join(violations)}")

    return order
```

**Key principles:**
- External code interacts with the aggregate only through its root — never reference child entities directly
- Validate all cross-entity invariants before committing state changes
- Keep aggregates small: if you need to lock multiple aggregates for a single transaction, the boundary is wrong
- Use factory functions for complex construction that requires multiple invariant checks

---

### Pattern 4: Domain Events — Decoupling State Changes

Domain events record something meaningful that happened in the domain. They are immutable, named in past tense, and carry enough data to reconstruct what occurred. Publish them after state has been mutated — never before.

```python
from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events. Immutable and named in past tense."""
    occurred_at: datetime = datetime.now()

    @property
    def event_name(self) -> str:
        return self.__class__.__name__


# ❌ BAD: Mutable event with future-tense naming — unclear what happened
class BadOrderEvent:
    def __init__(self, order_id: str, status: str) -> None:
        self.order_id = order_id  # Mutable — can change after creation
        self.status = status      # "confirming" is ambiguous — did it happen or not?
        self.timestamp = datetime.now()


# ✅ GOOD: Immutable event with past-tense naming and clear data capture
@dataclass(frozen=True)
class OrderConfirmed(DomainEvent):
    order_id: str
    customer_email: str
    item_count: int
    total_amount: float


@dataclass(frozen=True)
class ItemAdded(DomainEvent):
    order_id: str
    product_id: str
    quantity: int


class EventPublisher:
    """Decouples aggregate state changes from downstream handlers."""

    def __init__(self) -> None:
        self._handlers: dict[str, list] = defaultdict(list)

    def subscribe(self, event_type: type[DomainEvent], handler) -> None:
        self._handlers[event_type.__name__].append(handler)

    def publish(self, event: DomainEvent) -> None:
        """Dispatch event to all registered handlers."""
        for handler in self._handlers.get(event.event_name, []):
            handler(event)


# ✅ GOOD: Aggregate publishes events after mutation — never before
class OrderWithEvents:
    def __init__(self, order_id: str, customer_email: str, publisher: EventPublisher) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self._publisher = publisher
        self._items: list[OrderItem] = []
        self.status: OrderStatus = OrderStatus.DRAFT

    def confirm(self) -> None:
        if not self._items:
            raise RuntimeError("Cannot confirm order with no items")
        # State change first
        self.status = OrderStatus.CONFIRMED
        # Then publish the event
        self._publisher.publish(OrderConfirmed(
            order_id=self.order_id,
            customer_email=self.customer_email,
            item_count=len(self._items),
            total_amount=float(self.total.amount),
        ))

    def add_item(self, product_id: str, quantity: int, unit_price: Money) -> None:
        self._items.append(OrderItem(product_id, quantity, unit_price))
        self._publisher.publish(ItemAdded(
            order_id=self.order_id,
            product_id=product_id,
            quantity=quantity,
        ))
```

**Key principles:**
- Event names use past tense: `OrderConfirmed` not `OrderConfirming`
- Events carry sufficient data — receivers should not need to query the aggregate to understand what happened
- Publish after mutation, never before — if an exception occurs during publishing, the state change has already happened
- Handlers must be idempotent and tolerate duplicate delivery

---

### Pattern 5: Bounded Context Separation (Strategic Design)

Bounded contexts are structural boundaries where a domain model applies. The same concept can have different models in different contexts. An Anticorruption Layer translates between contexts without letting foreign models pollute your domain.

```python
# --- In the SALES bounded context ---

@dataclass(frozen=True)
class SalesCustomer:
    """Customer as understood by the sales team — focused on relationship value."""
    id: str
    display_name: str
    account_tier: str           # "gold", "silver", "bronze"
    lifetime_value: Money
    preferred_contact_channel: str


# --- In the SUPPORT bounded context ---

@dataclass(frozen=True)
class SupportTicketCustomer:
    """Customer as understood by support — focused on issue resolution."""
    identifier: str             # Same person, different field name
    email: str
    account_tier: str
    open_ticket_count: int      # Sales doesn't care about this
    sla_level: str              # "critical", "standard", "low"


# ❌ BAD: No separation — one model tries to serve all contexts
class BadCustomerModel:
    """Tries to be everything to everyone — becomes bloated and ambiguous."""
    def __init__(self) -> None:
        self.id = ""
        self.display_name = ""
        self.lifetime_value = Decimal("0")
        self.account_tier = ""
        self.preferred_contact_channel = ""
        self.open_ticket_count = 0   # Sales doesn't need this
        self.sla_level = ""           # Support uses a different meaning of "tier"


# ✅ GOOD: Anticorruption Layer translates between contexts without leakage
class SalesToSupportTranslator:
    """Translates a SalesCustomer into the support context's model."""

    @staticmethod
    def translate(sales_customer: SalesCustomer) -> SupportTicketCustomer:
        tier_mapping = {"gold": "critical", "silver": "standard", "bronze": "low"}
        return SupportTicketCustomer(
            identifier=sales_customer.id,          # Not display_name — support needs ID
            email="",                              # Would come from a separate lookup
            account_tier=sales_customer.account_tier,
            open_ticket_count=0,                   # Fetched separately in real impl
            sla_level=tier_mapping.get(
                sales_customer.account_tier, "standard"
            ),
        )

    def is_foreign_model(self, obj: object) -> bool:
        """Detect if an incoming object belongs to a foreign bounded context."""
        return type(obj).__module__.startswith("support.context.") or \
               type(obj).__module__.startswith("sales.context.")
```

**Key principles:**
- Each bounded context has its own model — do not share entities across contexts
- The anticorruption layer must reject foreign types, not silently accept them
- Use `isinstance` or module inspection to detect foreign objects at context boundaries
- Document the context map: which teams own which contexts, and what the relationships are

---

## Constraints

### MUST DO

- **Enforce all invariants in constructors or factory methods** — never allow an aggregate to exist in an invalid state. Validate every required field, every cross-field relationship, and every lifecycle transition.
- **Keep aggregates small** — a single aggregate root should handle one business transaction. If updating one aggregate requires reading or locking another, the boundary is wrong.
- **Separate domain from infrastructure** — domain models must never import persistence frameworks (`sqlalchemy`, `django.db`), messaging libraries, or HTTP clients. Define repository interfaces in the domain layer; implement them in infrastructure.
- **Name entities after domain concepts** — use the exact term domain experts use (e.g., `OrderConfirmation`, not `OrderApprovalEntity`). This is the ubiquitous language principle from Eric Evans' DDD book.
- **Make value objects immutable** — use `frozen=True` dataclasses, `NamedTuple`, or manual `__slots__` + `__hash__`. Immutability prevents accidental mutation and makes reasoning about state transitions easier.
- **Publish domain events after state mutation** — the sequence is always: mutate state → validate invariant → publish event. Never publish before mutating.

### MUST NOT DO

- **Leak persistence details into domain models** — no `@Column`, `@Table`, `@Entity` ORM annotations in domain files, no raw SQL strings, no database session references
- **Use ORM mapping objects as domain entities** — SQLAlchemy `Mapped[Order]` classes with relationship loaders are infrastructure artifacts. Domain entities are plain Python objects with no framework dependencies
- **Put business logic in controllers or service layers** — fat models, thin controllers. If a method lives in a controller that checks permissions AND calculates prices AND validates inventory, it belongs in the domain aggregate
- **Create god aggregates** — an aggregate with 10+ child entities and 50+ methods is a code smell. Split by transaction boundary or use CQRS (separate command and query models)
- **Mutate state based on incoming domain events without CQRS/event sourcing** — in standard architectures, events are outputs, not inputs. Receiving an event to mutate state creates circular dependency and race conditions

---

## Output Template

When applying this skill, produce:

1. **Domain Model Classes** — Value objects (frozen, value-equal), entities (identity + lifecycle methods), aggregate roots (consistency boundary with invariant checks)
2. **Invariant Validation** — Constructor validation + `validate_consistency()` method for cross-field rules
3. **Domain Event Definitions** — Immutable past-tense event records carrying sufficient context
4. **Repository Interfaces** — Abstract base classes in the domain layer (`Repo(ABC)`), not concrete implementations
5. **Bounded Context Boundaries** — Clear module separation with anticorruption translator at context edges

All code must use Python 3.10+ type hints, docstrings on every public method, and raise descriptive exceptions rather than returning error codes. Follow SOLID principles: each aggregate should have a single reason to change (SRP), depend on abstractions for repositories (DIP), and enforce invariants through its interface (OCP).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-patterns-architecture` | Architectural patterns (layered, hexagonal, microservices) that provide container structure for DDD domains |
| `software-design-principles` | SOLID and design principles that guide tactical DDD pattern implementation |
| `event-driven-architecture` | Event-driven systems complement DDD domain events with asynchronous messaging and integration patterns |

---

## Further Reading

- *Domain-Driven Design* by Eric Evans (the blue book) — original definition of bounded contexts, aggregates, and ubiquitous language
- *Implementing Domain-Driven Design* by Vaughn Vernon (the red book) — practical Java examples adapted to Python patterns above
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) — object design principles that DDD tactical patterns naturally enforce

> 📖 skill(local cache): coding-clean-architecture, coding-cqrs-pattern, coding-event-sourcing
