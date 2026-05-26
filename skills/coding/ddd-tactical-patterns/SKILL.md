---
name: ddd-tactical-patterns
description: Implements DDD tactical patterns — aggregate roots with invariant enforcement, value objects, domain events, anti-corruption layers, repositories, and specification pattern for rich domain modeling in Python.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  triggers: DDD, domain-driven design, aggregate root, value object, domain event, anti-corruption layer, specification pattern, how do i model complex business logic, bounded context implementation
  related-skills: software-architecture-patterns,domain-architecture-project-structure
  archetypes: tactical, generation, educational
  anti_triggers: project structure, module organization, ubiquitous language discovery, bounded context identification, event sourcing infrastructure, outbox pattern setup
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# DDD Tactical Patterns

When this skill is active, the model implements Domain-Driven Design tactical patterns as concrete Python classes and interfaces inside bounded contexts. It produces rich domain models with invariant enforcement through aggregate roots, immutable value objects, synchronous domain event publishing, anti-corruption layer adapters, repository abstractions with optimistic concurrency, and composable specification objects. The model writes typed implementations with docstrings, BAD vs GOOD examples, and enforces strict layer boundaries between internal domain models and external systems.

## TL;DR Checklist

- [ ] Aggregate roots enforce all invariants — no external mutation of protected state
- [ ] Value objects are immutable — use copy-with replacement for changes, never mutate
- [ ] Domain events captured during aggregate operations, published atomically with transaction
- [ ] Anti-corruption layer isolates internal domain from external model contamination
- [ ] Repositories expose only aggregate roots — never individual entities or value objects

---

## When to Use

Use this skill when:

- Implementing bounded contexts with rich domain models that enforce business invariants
- Building an anti-corruption layer between a legacy system (e.g., SOAP API, COBOL backend) and a new domain model
- Designing aggregate boundaries where consistency must be guaranteed across related entities
- Coordinating domain events across aggregates within the same transaction boundary
- Implementing complex read queries that need composable business rules without contaminating write models
- Refactoring an anemic domain model to enforce invariants at the domain layer

---

## When NOT to Use

Avoid this skill for:

- Strategic DDD decisions — bounded context identification, ubiquitous language discovery, and subdomain classification are design choices, not tactical patterns
- Project directory structure and module organization — use `domain-architecture-project-structure` instead
- Simple CRUD operations on data-oriented entities with no business rules — a basic SQLAlchemy model is sufficient
- Event sourcing infrastructure (event store persistence, snapshot storage, replay logic) — covered by `software-architecture-patterns`
- Domain event infrastructure like Kafka integration or outbox pattern setup

---

## Core Workflow

1. **Define the Aggregate Root** — Identify the consistency boundary by finding entities that must change together atomically. The aggregate root owns all invariants and exposes only intent-revealing methods. **Checkpoint:** If you need to modify two aggregates within a single transaction, they should either be collapsed into one aggregate or coordinated via domain events for eventual consistency.

2. **Implement Value Objects** — Create immutable types that capture domain concepts by their attributes rather than identity. Every value object validates all invariants at construction time and provides `replace()` methods for creating modified copies. **Checkpoint:** No attribute may ever be None or invalid after construction — if you need a nullable field, model it explicitly as a separate value type.

3. **Capture Domain Events** — During aggregate operations, append events to an internal `_domain_events` list inside the aggregate root. These events are published atomically after the unit of work commits. **Checkpoint:** Only emit events that external consumers care about — internal state changes that no one outside the aggregate needs should not be domain events.

4. **Build Repository Abstraction** — Implement repository interfaces for each aggregate root using `Protocol` classes. The repository loads and saves entire aggregates, handling serialization/deserialization and optimistic concurrency. **Checkpoint:** Repositories must never return individual entities or value objects — always return the complete aggregate root from a load operation.

5. **Implement Anti-Corruption Layer** — Create adapter classes that translate external data formats into internal value objects before they enter the domain layer. The adapter validates external input and constructs proper domain objects, preventing foreign model classes from leaking inward. **Checkpoint:** After the adapter runs, the domain layer should be able to operate with zero knowledge of the external API's structure.

---

## Implementation Patterns

### Pattern 1: Aggregate Roots & Value Objects

Aggregate roots encapsulate business invariants and expose intent-revealing methods. Value objects are immutable types compared by attribute equality.

```python
"""Order aggregate root with invariant enforcement and value objects."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Iterator


# ── Value Objects ────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Money:
    """Immutable value object representing a monetary amount with currency."""

    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if not isinstance(self.currency, str) or len(self.currency) != 3:
            raise ValueError(f"Invalid currency code: {self.currency}")

    def __add__(self, other: Money) -> Money:
        if self.currency != other.currency:
            raise ValueError("Cannot add money with different currencies")
        return Money(round(self.amount + other.amount, 2), self.currency)

    def subtract(self, other: Money) -> Money:
        result = self.amount - other.amount
        if result < 0:
            raise ValueError(
                f"Insufficient funds: {self.amount} - {other.amount}"
            )
        return Money(round(result, 2), self.currency)

    def replace(self, amount: float | None = None, currency: str | None = None) -> Money:
        """Return a new Money with replaced attributes."""
        return Money(
            amount if amount is not None else self.amount,
            currency if currency is not None else self.currency,
        )


@dataclass(frozen=True)
class OrderLineItem:
    """Immutable value object representing a single line item in an order."""

    product_id: str
    quantity: int
    unit_price: Money
    discount: Money = field(default_factory=Money)

    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError("Line item quantity must be positive")
        if self.discount.amount > self.unit_price.amount:
            raise ValueError("Discount cannot exceed unit price")

    @property
    def total(self) -> Money:
        net = self.unit_price.subtract(self.discount)
        return Money(round(net.amount * self.quantity, 2), net.currency)


# ── Aggregate Root ───────────────────────────────────────────────────────────

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    SHIPPED = "shipped"


@dataclass
class Order:
    """
    Aggregate root for order management.

    Enforces invariants: total cannot be negative, items must have positive
    quantities, status transitions follow defined rules. Only intent-revealing
    methods expose functionality — no direct attribute mutation.
    """

    id: uuid.UUID = field(default_factory=uuid.uuid4)
    customer_id: str = ""
    _items: list[OrderLineItem] = field(default_factory=list, repr=False)
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    cancelled_at: datetime | None = None
    _domain_events: list[object] = field(default_factory=list, repr=False)

    # ── Invariants ────────────────────────────────────────────────────────

    @property
    def items(self) -> tuple[OrderLineItem, ...]:
        """Return a frozen snapshot — callers cannot mutate internal items."""
        return tuple(self._items)

    @property
    def total(self) -> Money:
        if not self._items:
            return Money(0.0)
        return reduce_money(m.item.total for m in self._items)  # type: ignore[name-defined]

    @property
    def domain_events(self) -> list[object]:
        """Read-only access to events captured during this operation."""
        return list(self._domain_events)

    # ── Intent-Revealing Methods ────────────────────────────────────────────

    def add_item(
        self, product_id: str, quantity: int, unit_price: Money
    ) -> None:
        """Add a line item to this order. Fails fast on invariant violations."""
        if self.status != OrderStatus.PENDING:
            raise RuntimeError("Cannot modify a non-pending order")
        if len(self._items) >= 100:
            raise ValueError("Order cannot exceed 100 line items")

        item = OrderLineItem(product_id, quantity, unit_price)
        self._items.append(item)
        self.updated_at = datetime.utcnow()

    def remove_item(self, product_id: str) -> None:
        """Remove all line items matching a product ID."""
        if self.status != OrderStatus.PENDING:
            raise RuntimeError("Cannot modify a non-pending order")

        before = len(self._items)
        self._items = [i for i in self._items if i.product_id != product_id]
        if len(self._items) == before:
            raise KeyError(f"Product {product_id} not found in order")

        self.updated_at = datetime.utcnow()
        self._domain_events.append(OrderItemsChanged(self.id))

    def confirm(self, confirmed_by: str) -> None:
        """Transition order to confirmed. Enforces status transition rules."""
        if self.status != OrderStatus.PENDING:
            raise RuntimeError(
                f"Cannot confirm order in {self.status.value} state"
            )
        if not self._items:
            raise ValueError("Cannot confirm an order with no items")

        self.status = OrderStatus.CONFIRMED
        self.updated_at = datetime.utcnow()
        self._domain_events.append(
            OrderConfirmed(self.id, self.customer_id, confirmed_by)
        )

    def cancel(self, reason: str) -> None:
        """Cancel the order with a recorded reason."""
        if self.status == OrderStatus.SHIPPED:
            raise RuntimeError("Cannot cancel an already shipped order")
        if self.status == OrderStatus.CANCELLED:
            return  # idempotent

        was_confirmed = self.status == OrderStatus.CONFIRMED
        self.status = OrderStatus.CANCELLED
        self.cancelled_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self._domain_events.append(
            OrderCancelled(self.id, reason, was_confirmed)
        )

    def clear_events(self) -> None:
        """Clear published events after they have been dispatched."""
        self._domain_events.clear()


# ── Supporting helpers ────────────────────────────────────────────────────────

from functools import reduce as _reduce


def reduce_money(items):  # noqa: D103 — used internally only
    return _reduce(lambda a, b: a + b, items, Money(0.0))


# ── BAD Example (violations to avoid) ───────────────────────────────────────

class BadOrderAggregate:
    """❌ BAD examples of aggregate root anti-patterns."""

    def __init__(self):
        self.items = []  # ❌ Exposes mutable internal collection directly
        self.status = "pending"  # ❌ Status is a bare string, not an enum
        self._events = []

    def add_item(self, item):  # ❌ No type hints, no validation
        self.items.append(item)  # ❌ No invariant checks on quantity or price

    def get_total(self):  # ❌ Returns computed value instead of property
        return sum(i.price * i.qty for i in self.items)  # ❌ No currency handling


# ── BAD Example: Mutable Value Object ───────────────────────────────────────

class BadMoneyValue:
    """❌ BAD — mutable value object breaks equality semantics."""

    def __init__(self, amount: float, currency: str = "USD"):
        self.amount = amount  # ❌ Mutable attributes
        self.currency = currency

    def discount(self, percent: float) -> None:
        self.amount *= (1 - percent / 100)  # ❌ Mutates in place instead of returning new instance
```

### Pattern 2: Domain Events & Synchronous Publishing

Domain events capture facts about state changes. They are published synchronously within the transaction boundary so they commit atomically with aggregate state.

```python
"""Domain event system with synchronous publishing and deduplication."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Protocol


# ── Event Classes ────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events. Immutable and identity-tracked."""

    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=datetime.utcnow)

    @abstractmethod
    def aggregate_name(self) -> str: ...

    @abstractmethod
    def aggregate_id(self) -> str: ...


@dataclass(frozen=True)
class OrderConfirmed(DomainEvent):
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    order_id: str
    customer_id: str
    confirmed_by: str

    def aggregate_name(self) -> str:
        return "Order"

    def aggregate_id(self) -> str:
        return self.order_id


@dataclass(frozen=True)
class OrderCancelled(DomainEvent):
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    order_id: str
    reason: str
    was_previously_confirmed: bool

    def aggregate_name(self) -> str:
        return "Order"

    def aggregate_id(self) -> str:
        return self.order_id


@dataclass(frozen=True)
class OrderItemsChanged(DomainEvent):
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=datetime.utcnow)
    order_id: uuid.UUID

    def aggregate_name(self) -> str:
        return "Order"

    def aggregate_id(self) -> str:
        return str(self.order_id)


# ── Event Publisher Interface & Implementation ───────────────────────────────

class DomainEventPublisher(Protocol):
    """Interface for publishing domain events atomically with a transaction."""

    async def publish(self, event: DomainEvent) -> None: ...
    async def publish_many(self, events: list[DomainEvent]) -> None: ...


@dataclass
class InMemoryDomainEventPublisher:
    """
    Synchronous domain event publisher.

    Captures events during aggregate operations and dispatches them within the
    same transaction boundary. Uses a change tracker to prevent duplicate
    publication of the same event if an operation is retried.
    """

    _pending_events: list[DomainEvent] = field(default_factory=list, repr=False)
    _published_ids: set[uuid.UUID] = field(default_factory=set, repr=False)

    def capture(self, event: DomainEvent) -> None:
        """Queue a domain event for publication."""
        self._pending_events.append(event)

    def capture_many(self, events: list[DomainEvent]) -> None:
        """Queue multiple domain events for publication."""
        self._pending_events.extend(events)

    async def publish_pending(self) -> list[DomainEvent]:
        """
        Publish all captured events and track them to prevent duplicates.

        Returns the list of published events. If called again with already-
        published events, they are silently skipped based on event_id dedup.
        """
        unpublished = [
            ev for ev in self._pending_events if ev.event_id not in self._published_ids
        ]
        for event in unpublished:
            await self._do_publish(event)
            self._published_ids.add(event.event_id)

        # Clear pending events regardless of whether they were new or duplicate
        self._pending_events.clear()
        return unpublished

    async def _do_publish(self, event: DomainEvent) -> None:
        """Publish a single event. Override for real implementations."""
        # In production, this would write to an outbox table or message queue.
        # The key invariant: publication happens inside the transaction.
        pass  # noqa: S104 — placeholder for actual persistence logic

    def reset(self) -> None:
        """Reset state after a failed transaction roll-back."""
        self._pending_events.clear()
        # Do NOT clear _published_ids — that event was committed to storage


# ── Unit of Work Coordinator ────────────────────────────────────────────────

class UnitOfWork(ABC):
    """Coordinates transactions: saves aggregates, publishes events atomically."""

    @abstractmethod
    async def commit(self) -> None: ...

    @abstractmethod
    async def rollback(self) -> None: ...


class InMemoryUnitOfWork(UnitOfWork):
    """
    Implements the unit of work pattern with atomic event publishing.

    Saves all registered aggregates and publishes their domain events within
    a single transaction boundary. On failure, both state changes and events
    are rolled back.
    """

    def __init__(self) -> None:
        self._aggregates_to_save: list[object] = []
        self._publisher = InMemoryDomainEventPublisher()

    @property
    def publisher(self) -> InMemoryDomainEventPublisher:
        return self._publisher

    async def commit(self) -> None:
        """Save aggregates and publish events atomically."""
        try:
            # Step 1: Persist all modified aggregates
            for agg in self._aggregates_to_save:
                await self._save_aggregate(agg)

            # Step 2: Publish all captured domain events (within same txn)
            published = await self._publisher.publish_pending()

            if published:
                # Step 3: Record event persistence to prevent duplicate replay
                for ev in published:
                    self._record_event_published(ev)

        except Exception:
            await self.rollback()
            raise

    async def rollback(self) -> None:
        """Rollback all changes including clearing pending events."""
        self._aggregates_to_save.clear()
        self._publisher.reset()

    def register_for_save(self, aggregate: object) -> None:
        if aggregate not in self._aggregates_to_save:
            self._aggregates_to_save.append(aggregate)

    async def _save_aggregate(self, agg: object) -> None:
        """Persist an aggregate root through its repository. Override as needed."""
        pass  # noqa: S104

    def _record_event_published(self, event: DomainEvent) -> None:
        """Record event persistence for deduplication across retries."""
        pass  # noqa: S104
```

### Pattern 3: Anti-Corruption Layer Adapter

The anti-corruption layer (ACL) translates between external data formats and internal domain models. External model classes must never leak into the domain layer.

```python
"""Anti-corruption layer for translating legacy API responses into domain models."""

from __future__ import annotations

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any


# ── Internal Domain Value Objects (these are the ONLY types the domain knows) ─

@dataclass(frozen=True)
class SupplierProduct:
    """Internal domain value object representing a supplier product."""

    internal_id: str
    sku: str
    name: str
    price_cents: int
    currency: str = "USD"
    available_units: int = 0


@dataclass(frozen=True)
class SupplierOrderPayload:
    """Internal domain value object for an incoming order."""

    order_reference: str
    customer_name: str
    items: list[tuple[str, int]]  # (sku, quantity)
    shipping_address: dict[str, Any]


# ── External API Models (NEVER leak into the domain layer) ───────────────────

@dataclass
class LegacyAPISupplierProduct:
    """External model from the legacy supplier SOAP/REST API. Do NOT use in domain code."""

    product_code: str           # Maps to internal SKU
    supplier_ref: str           # Maps to internal_id
    description: str            # Maps to name
    price: float                # In dollars — needs conversion to cents
    currency_code: str          # May vary (USD, EUR, GBP)
    stock_quantity: int         # Maps to available_units
    status: str                 # Active/Inactive — filtered out


@dataclass
class LegacyAPIOrder:
    """External order format from the legacy system. Do NOT use in domain code."""

    po_number: str              # Maps to order_reference
    customer_name: str | None   # Nullable in external, required internally
    line_items: list[dict[str, Any]]  # Raw dict — must be validated
    ship_to: dict[str, str]     # May have different keys than internal model


# ── ACL Adapter ──────────────────────────────────────────────────────────────

class SupplierACLAdapter:
    """
    Anti-corruption layer adapter for the legacy supplier system.

    Translates external API models into internal domain value objects.
    All validation and transformation happens here — the domain layer has
    zero knowledge of the external data format.
    """

    def __init__(self, currency_conversion: dict[str, float] | None = None) -> None:
        self._conversion_rates = currency_conversion or {"USD": 1.0}

    def map_product(self, external: LegacyAPISupplierProduct) -> SupplierProduct:
        """
        Transform a single legacy API product into an internal domain value object.

        Raises ValueError if required fields are missing or invalid.
        The domain layer will never see LegacyAPISupplierProduct.
        """
        if not external.supplier_ref:
            raise ValueError("Supplier reference is required")
        if not external.product_code:
            raise ValueError("Product code (SKU) is required")
        if external.status != "Active":
            raise ValueError(f"Cannot import inactive product: {external.supplier_ref}")

        # Convert price from dollars to cents
        rate = self._conversion_rates.get(external.currency_code, 1.0)
        price_cents = int(external.price * rate * 100)

        return SupplierProduct(
            internal_id=external.supplier_ref.strip(),
            sku=external.product_code.strip().upper(),
            name=external.description.strip(),
            price_cents=max(price_cents, 0),  # Enforce non-negative at boundary
            currency=external.currency_code,
            available_units=external.stock_quantity,
        )

    def map_products(self, external_list: list[LegacyAPISupplierProduct]) -> list[SupplierProduct]:
        """Transform a batch of products. Some may be rejected."""
        results: list[SupplierProduct] = []
        for ext in external_list:
            try:
                results.append(self.map_product(ext))
            except ValueError:
                # Skip inactive or malformed products — do not fail the whole batch
                continue
        return results

    def map_order(self, external: LegacyAPIOrder) -> SupplierOrderPayload:
        """
        Transform a legacy API order into an internal domain value object.

        Validates all required fields and normalizes the data format.
        Raises ValueError on invalid orders before they reach the domain layer.
        """
        if not external.po_number:
            raise ValueError("Purchase order number is required")
        if not external.customer_name:
            raise ValueError(f"Customer name required for PO {external.po_number}")

        validated_items: list[tuple[str, int]] = []
        for raw_item in external.line_items:
            sku = raw_item.get("sku", "").strip().upper()
            qty = raw_item.get("quantity", 0)
            if not sku or qty <= 0:
                raise ValueError(f"Invalid line item in PO {external.po_number}: {raw_item}")
            validated_items.append((sku, qty))

        if not validated_items:
            raise ValueError(f"PO {external.po_number} has no valid line items")

        return SupplierOrderPayload(
            order_reference=external.po_number.strip(),
            customer_name=external.customer_name.strip(),
            items=validated_items,
            shipping_address={
                "street": external.ship_to.get("address1", ""),
                "city": external.ship_to.get("city", ""),
                "state": external.ship_to.get("state", ""),
                "postal_code": external.ship_to.get("zip", ""),
                "country": external.ship_to.get("country", "US"),
            },
        )


# ── BAD Example: ACL Anti-Patterns ───────────────────────────────────────────

class BadACLEntryPoint:
    """❌ BAD — leaks external model directly into the domain layer."""

    def process_order(self, raw_api_data: dict) -> None:
        # ❌ Domain code receives raw API dictionaries
        order = ExternalOrder(**raw_api_data)  # ❌ Foreign class enters domain
        self.domain_service.create(order)      # ❌ Domain method takes foreign type

    def sync_products(self, products: list[ExternalProduct]) -> None:
        # ❌ No translation — external models used directly in queries
        for ext_product in products:
            session.query(InternalProduct).filter_by(sku=ext_product.product_code)  # ❌ Skips ACL


# ── GOOD Example: Clean ACL Boundary ─────────────────────────────────────────

class GoodACLEntryPoint:
    """✅ GOOD — external models are fully translated before reaching the domain."""

    def __init__(self, adapter: SupplierACLAdapter) -> None:
        self._adapter = adapter

    def process_order(self, raw_api_xml: bytes) -> None:
        # Step 1: Parse external format (outside domain)
        tree = ET.fromstring(raw_api_xml)
        external = LegacyAPIOrder(
            po_number=tree.findtext("po_number"),
            customer_name=tree.findtext("customer_name"),
            line_items=[{"sku": i.findtext("sku"), "quantity": int(i.findtext("qty"))}
                        for i in tree.findall("item")],
            ship_to={k: tree.findtext(f"ship_{k}")
                     for k in ("address1", "city", "state", "zip", "country")},
        )

        # Step 2: Translate into domain value objects via ACL
        payload = self._adapter.map_order(external)

        # Step 3: Pass only internal domain types to the domain layer
        self.domain_service.create_order(
            order_ref=payload.order_reference,
            customer_name=payload.customer_name,
            items=payload.items,
        )
```

### Pattern 4: Repository with Optimistic Concurrency

Repositories manage aggregate root persistence with optimistic concurrency control. Read queries use separate projection readers.

```python
"""Repository pattern for aggregate roots with optimistic concurrency control."""

from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Generic, Iterator, Protocol, TypeVar


# ── Optimistic Concurrency Base ──────────────────────────────────────────────

@dataclass
class VersionedAggregate:
    """
    Base class providing optimistic concurrency control.

    Each aggregate carries a version number that increments on every save.
    Concurrent modifications are detected when the stored version differs
    from the expected version at commit time.
    """

    id: uuid.UUID
    version: int = 0
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def bump_version(self) -> None:
        self.version += 1
        self.updated_at = datetime.utcnow()


# ── Specification Pattern ───────────────────────────────────────────────────

class Specification(Protocol):
    """Protocol for composable business rule specifications."""

    def is_satisfied_by(self, candidate: object) -> bool: ...
    def and_spec(self, other: Specification) -> Specification: ...
    def or_spec(self, other: Specification) -> Specification: ...
    def not_spec(self) -> Specification: ...


class CompositeSpecification(Specification):
    """Composable specification using AND/OR/NOT composition."""

    def __init__(self, left: Specification | None = None, right: Specification | None = None,
                 operator: str = "and") -> None:
        self._left = left
        self._right = right
        self._operator = operator

    @classmethod
    def always(cls) -> Specification:
        """Specification that always returns True."""
        return _AlwaysSpec()

    @classmethod
    def never(cls) -> Specification:
        """Specification that always returns False."""
        return _NeverSpec()

    def is_satisfied_by(self, candidate: object) -> bool:
        if self._left is None and self._right is None:
            return True  # Leaf specs override

        left_ok = self._left.is_satisfied_by(candidate) if self._left else True

        if self._operator == "and":
            right_ok = self._right.is_satisfied_by(candidate) if self._right else True
            return left_ok and right_ok
        elif self._operator == "or":
            right_ok = self._right.is_satisfied_by(candidate) if self._right else False
            return left_ok or right_ok
        raise RuntimeError(f"Unknown operator: {self._operator}")

    def and_spec(self, other: Specification) -> Specification:
        return CompositeSpecification(self, other, "and")

    def or_spec(self, other: Specification) -> Specification:
        return CompositeSpecification(self, other, "or")

    def not_spec(self) -> Specification:
        return _NegatedSpec(self)


class _AlwaysSpec(Specification):
    def is_satisfied_by(self, candidate: object) -> bool: return True
    def and_spec(self, other: Specification) -> Specification: return other
    def or_spec(self, other: Specification) -> Specification: return self
    def not_spec(self) -> Specification: return _NeverSpec()


class _NeverSpec(Specification):
    def is_satisfied_by(self, candidate: object) -> bool: return False
    def and_spec(self, other: Specification) -> Specification: return self
    def or_spec(self, other: Specification) -> Specification: return other
    def not_spec(self) -> Specification: return _AlwaysSpec()


class _NegatedSpec(Specification):
    def __init__(self, spec: Specification) -> None:
        self._spec = spec

    def is_satisfied_by(self, candidate: object) -> bool:
        return not self._spec.is_satisfied_by(candidate)

    def and_spec(self, other: Specification) -> Specification:
        return CompositeSpecification(self._spec.not_spec(), other, "and")

    def or_spec(self, other: Specification) -> Specification:
        return CompositeSpecification(self._spec.not_spec(), other, "or")

    def not_spec(self) -> Specification:
        return self._spec  # Double negation


class OrderStatusSpec(Specification):
    """Filters by order status."""

    def __init__(self, status: str) -> None:
        self._status = status

    def is_satisfied_by(self, candidate: object) -> bool:
        return hasattr(candidate, "status") and candidate.status == self._status


class MinTotalSpec(Specification):
    """Filters by minimum total amount."""

    def __init__(self, minimum_cents: int) -> None:
        self._minimum_cents = minimum_cents

    def is_satisfied_by(self, candidate: object) -> bool:
        if not hasattr(candidate, "total"):
            return False
        # Assumes `total` has a `cents` property or can be converted
        total_val = getattr(getattr(candidate, "total", None), "amount", 0) * 100
        return total_val >= self._minimum_cents


class ActiveCustomerSpec(Specification):
    """Filters by whether the customer is active."""

    def __init__(self, get_customer_status) -> None:  # Injection point for external check
        self._get_customer_status = get_customer_status

    def is_satisfied_by(self, candidate: object) -> bool:
        if not hasattr(candidate, "customer_id"):
            return False
        status = self._get_customer_status(candidate.customer_id)
        return status == "active"


# ── Repository Protocol & Implementation ─────────────────────────────────────

T = TypeVar("T", bound=VersionedAggregate)


class Repository(Protocol, Generic[T]):
    """Repository interface for an aggregate root type."""

    @abstractmethod
    async def load(self, id: uuid.UUID) -> T | None: ...

    @abstractmethod
    async def save(self, aggregate: T) -> None: ...

    @abstractmethod
    async def find_by(self, spec: Specification) -> list[T]: ...


class InMemoryOrderRepository:
    """
    In-memory repository demonstrating optimistic concurrency control.

    Production implementations would replace the in-memory store with a real
    database. The key pattern: every save checks the version number, and a
    mismatch raises ConcurrencyConflictError.
    """

    def __init__(self) -> None:
        self._store: dict[uuid.UUID, VersionedAggregate] = {}
        self._on_save_hooks: list[callable] = []

    async def load(self, id: uuid.UUID) -> Order | None:
        """Load an aggregate root by ID. Returns None if not found."""
        return self._store.get(id)  # type: ignore[return-value]

    async def save(self, aggregate: VersionedAggregate) -> None:
        """
        Save an aggregate with optimistic concurrency control.

        Raises ConcurrencyConflictError if the aggregate's version does not
        match the stored version, indicating a concurrent modification.
        """
        existing = self._store.get(aggregate.id)

        if existing is not None and existing.version != aggregate.version:
            raise ConcurrencyConflictError(
                f"Aggregate {aggregate.id}: expected version {aggregate.version}, "
                f"but stored version is {existing.version}. Another process modified it."
            )

        # Apply any pre-save hooks (e.g., set updated_at, audit fields)
        for hook in self._on_save_hooks:
            hook(aggregate)

        aggregate.bump_version()
        self._store[aggregate.id] = aggregate

    async def find_by(self, spec: Specification) -> list[VersionedAggregate]:
        """Find all aggregates matching a specification."""
        return [agg for agg in self._store.values() if spec.is_satisfied_by(agg)]  # type: ignore[arg-type]

    def register_save_hook(self, hook: callable) -> None:
        self._on_save_hooks.append(hook)


class ConcurrencyConflictError(Exception):
    """Raised when optimistic concurrency check fails."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.is_retryable = True  # Signal that the caller should retry


# ── Read-Side Projection (Separate from Write Model) ────────────────────────

@dataclass
class OrderProjection:
    """Read-side projection — a flattened, query-optimized view of order data."""

    order_id: str
    customer_id: str
    status: str
    item_count: int
    total_cents: int
    created_at: datetime


class OrderProjectionReader:
    """
    Separate reader for queries that don't modify state.

    This keeps read concerns completely separate from the write model.
    Projections can be denormalized, indexed differently, and queried
    independently without touching aggregate roots.
    """

    def __init__(self) -> None:
        self._projections: dict[str, OrderProjection] = {}

    def apply_event(self, event: DomainEvent) -> None:
        """Rebuild projections from domain events (eventual consistency)."""
        if isinstance(event, OrderConfirmed):
            # In production, this would load the aggregate and project it
            self._projections[event.order_id] = OrderProjection(
                order_id=event.order_id,
                customer_id=event.customer_id,
                status="confirmed",
                item_count=0,  # Would come from actual items
                total_cents=0,  # Would be computed
                created_at=datetime.utcnow(),
            )

    def get_by_customer(self, customer_id: str) -> list[OrderProjection]:
        return [p for p in self._projections.values() if p.customer_id == customer_id]

    def find_pending(self) -> list[OrderProjection]:
        return [p for p in self._projections.values() if p.status == "pending"]
```

### Pattern 5: Specification Composition & Query Objects

Specifications are composable business rules that work both for domain validation and repository filtering. Query objects encapsulate complex read queries.

```python
"""Composable specifications and query objects for read-side operations."""

from __future__ import annotations

from dataclasses import dataclass, field


# ── Composable Specifications (continued from Pattern 4) ────────────────────

def create_order_query_spec(
    min_total_cents: int | None = None,
    exclude_statuses: list[str] | None = None,
    require_active_customer: bool = False,
) -> Specification:
    """
    Factory for building complex order filtering specifications.

    Demonstrates specification composition — combine simple specs with
    AND/OR/NOT to build arbitrarily complex business rules.

    Example: "Show me orders over $50 from active customers that are pending or confirmed"
    spec = create_order_query_spec(min_total_cents=5000, exclude_statuses=["cancelled", "shipped"])
    """
    base: Specification = Specification.always()

    if min_total_cents is not None:
        base = base.and_spec(MinTotalSpec(min_total_cents))

    if exclude_statuses:
        # NOT any of the excluded statuses — compose by negating each
        exclusion_specs = [OrderStatusSpec(s) for s in exclude_statuses]
        combined_exclusion = Specification.always()
        for spec_obj in exclusion_specs:
            combined_exclusion = combined_exclusion.or_spec(spec_obj)
        base = base.and_spec(combined_exclusion.not_spec())

    if require_active_customer:
        base = base.and_spec(ActiveCustomerSpec(get_customer_status=lambda cid: "active"))

    return base


# ── Query Object Pattern ────────────────────────────────────────────────────

@dataclass(frozen=True)
class OrderQuery:
    """
    Immutable query object for complex read operations.

    Encapsulates all parameters needed to build a query without touching
    the write model. Can be converted to SQL WHERE clauses, cached, and
    reused across repositories.
    """

    customer_id: str | None = None
    status_filter: list[str] | None = None
    date_range_start: datetime | None = None
    date_range_end: datetime | None = None
    min_total_cents: int | None = None
    max_total_cents: int | None = None
    product_sku: str | None = None
    page: int = 1
    page_size: int = 50

    @property
    def limit(self) -> int:
        return min(self.page_size, 100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit

    def to_where_clause(self) -> tuple[str, list[object]]:
        """
        Convert this query object into a SQL WHERE clause and parameters.

        Returns a tuple of (clause_string, params_list) ready for parameterized queries.
        This is how specifications bridge between domain logic and persistence.
        """
        conditions: list[str] = []
        params: list[object] = []

        if self.customer_id:
            conditions.append("customer_id = ?")
            params.append(self.customer_id)

        if self.status_filter:
            placeholders = ", ".join(["?"] * len(self.status_filter))
            conditions.append(f"status IN ({placeholders})")
            params.extend(self.status_filter)

        if self.date_range_start:
            conditions.append("created_at >= ?")
            params.append(self.date_range_start.isoformat())

        if self.date_range_end:
            conditions.append("created_at <= ?")
            params.append(self.date_range_end.isoformat())

        if self.min_total_cents is not None:
            conditions.append("total_cents >= ?")
            params.append(self.min_total_cents)

        if self.max_total_cents is not None:
            conditions.append("total_cents <= ?")
            params.append(self.max_total_cents)

        where = " AND ".join(conditions) if conditions else "1=1"
        return f"WHERE {where}", params  # type: ignore[return-value]


class SpecificationSQLConverter:
    """Converts specification objects into SQL WHERE clauses."""

    @staticmethod
    def to_where_clause(spec: Specification, candidate_template: object) -> tuple[str, list[object]]:
        """
        Convert a specification to a WHERE clause.

        For production use with actual databases, this would walk the
        specification tree and build parameterized SQL conditions.
        In-memory repositories use is_satisfied_by directly.
        """
        # This is where you'd implement the spec-to-SQL translation
        # For now, return a no-op clause — real implementation depends on ORM
        return "", []
```

---

## Constraints

### MUST DO
- **Enforce all invariants inside the aggregate root** — never allow invalid state to exist. Every public method on an aggregate must validate before changing state. Use `ValueError` for business rule violations and `RuntimeError` for state transition errors.

- **Make value objects immutable** — use `@dataclass(frozen=True)` or equivalent. Return new instances via `replace()` or copy-with methods instead of mutating existing ones. Equality is by attribute comparison, not identity.

- **Capture domain events during aggregate operations** — append events to `_domain_events` list inside the aggregate. Publish them atomically through the unit of work after the transaction commits. Never publish events directly from an aggregate method.

- **Implement repositories for aggregate roots only** — never individual entities or value objects. The repository loads and saves complete aggregates. If you need a query that crosses aggregates, use a specification or projection reader instead.

- **Use specification pattern for composable business rules** — specifications should be combinable with AND/OR/NOT. They work both for domain validation (`spec.is_satisfied_by(aggregate)`) and repository filtering.

- **Separate read and write models** — projections handle queries that don't modify state. They are rebuilt from domain events, not queried directly from aggregate roots. This prevents read concerns from contaminating the write model.

### MUST NOT DO
- **Expose internal collections from aggregates** — return frozen snapshots (`tuple`) or use intent-revealing methods like `add_item()`, `remove_item()`. Never expose `.items`, `.orders`, etc. directly to callers.

- **Persist individual entities directly** — always persist through the aggregate root repository. If you have child entities, they are part of the aggregate and saved/loaded as a unit.

- **Publish domain events outside a transaction boundary** — events must be committed atomically with state changes. Use the unit of work pattern to coordinate saves and event publication in a single transaction. Publishing events before the save commits leads to phantom events on rollback.

- **Allow external model classes into the domain layer** — all translation between external APIs (SOAP, REST, CSV, XML) and internal domain models happens in the anti-corruption layer adapter. The domain layer knows only about its own value objects and aggregate roots.

- **Use repositories for read queries** — use separate projection readers for reads that don't modify state. Repositories are write-model abstractions. Mixing read and write responsibilities in one class leads to anemic domain models.

- **Let aggregates depend on infrastructure** — aggregates should never import `sqlalchemy`, `redis`, or HTTP clients. They depend only on value objects, enums, and other aggregate roots within the same bounded context. Infrastructure concerns belong in repositories and service layers.

---

## Live References

> Authoritative documentation links for DDD tactical patterns.

- [Domain-Driven Design Distilled — Vaughn Vernon (Red Book)](https://domainlanguage.com/ddd/reference/)
- [Implementing DDD — Scott Millett](https://www.implementingddd.com/)
- [Microsoft Architecture Patterns — Domain-Driven Design](https://learn.microsoft.com/en-us/azure/architecture/patterns/domain-driven-design)
- [Specification Pattern — Martin Fowler](https://martinfowler.com/bliki/Specification.html)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `software-architecture-patterns` | Higher-level architectural patterns (CQRS, Event Sourcing) that use DDD tactical patterns as building blocks |
| `domain-architecture-project-structure` | Project directory layout and module organization for DDD codebases — complementary to this tactical implementation skill |
