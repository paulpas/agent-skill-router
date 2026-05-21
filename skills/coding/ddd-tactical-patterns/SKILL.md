---
name: ddd-tactical-patterns
description: Implements DDD tactical patterns including repositories, domain services, specifications, factories, unit of work, and command/query separation for building robust domain models.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: ddd tactical patterns, repository pattern, specification pattern, domain service, aggregate factory, unit of work, command query separation, CQRS within bounded context, composable business rules
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, domain-events, cqrs-pattern
---

# DDD Tactical Patterns

Implements the supporting structural patterns that make DDD domain models practical and testable. Provides repository abstractions for persistence decoupling, specification objects for composable business rules, domain services for cross-aggregate operations, aggregate factories for complex construction, unit of work for transaction coordination, and command/query separation within bounded contexts.

## TL;DR Checklist

- [ ] Define repository interfaces (ABCs) in the domain layer with only `get`, `save`, `list`, `delete` signatures — no SQL or ORM details
- [ ] Implement repositories in infrastructure modules that import persistence frameworks but are never imported by domain code
- [ ] Model business rules as Specification objects with `is_satisfied_by()` methods supporting `AndSpecification`, `OrSpecification`, `NotSpecification` composition
- [ ] Use domain services (not entity methods) only for logic spanning multiple aggregates or requiring infrastructure access — single-aggregate rules belong in the aggregate itself
- [ ] Create aggregate factories when construction requires multiple invariants, external lookups, or conditional state setup that does not fit a simple constructor
- [ ] Coordinate transactions across repositories through a Unit of Work that tracks inserts/updates/deletes and commits atomically
- [ ] Separate command handlers (write model) from query handlers (read model) within each bounded context — never let read queries mutate domain state

---

## When to Use

- You have a repository interface in your domain layer and need the concrete implementation pattern for SQLAlchemy, Django ORM, or plain SQL
- Business rules involve conditions across multiple entities and you want those rules as first-class, testable, composable objects instead of scattered boolean expressions
- An operation requires coordination between two or more aggregates (e.g., "transfer funds from account A to account B") — this is a domain service, not an entity method
- Constructing an aggregate requires fetching data from another source (e.g., creating an `Order` that validates product existence in a catalog) before it can be built
- You need to coordinate save operations across multiple repositories within a single database transaction — the Unit of Work tracks all changes and commits atomically
- A bounded context has complex queries that differ significantly from write models (e.g., read-only dashboards, search endpoints with arbitrary filters)

---

## When NOT to Use

- A simple find-by-id + save is sufficient for a repository — do not add Specification or complex query abstractions when a direct method suffices
- The business rule involves only one aggregate — put it in the aggregate's constructor or a method, not a domain service. Domain services are for cross-aggregate logic only.
- You are building a microservice with separate write and read databases — that requires full CQRS/event sourcing, not just command/query separation within a single context
- A factory would have more conditional branches than the aggregate itself — the aggregate's constructor is probably doing too much; refactor invariants into value objects first

---

## Core Workflow

1. **Define Repository Interfaces in the Domain Layer** — For each aggregate root, declare an ABC with `get_by_id`, `save`, `list`, and optionally `delete`. Use only domain types — never import ORM classes into the interface. **Checkpoint:** Every method signature uses domain entity/value-object types; no `Row`, `Session`, or query builder types leak into the interface.

2. **Implement Repositories in Infrastructure** — Create concrete classes that implement each ABC. These live outside the domain package (e.g., `infra/repositories/`). Import persistence frameworks here only. Map between ORM entities and domain entities using explicit conversion methods. **Checkpoint:** Domain code must be able to import the interface without importing any infrastructure module. Run a dependency graph check — domain packages should have zero imports from infra, db, or external packages (stdlib is fine).

3. **Extract Specifications for Reusable Business Rules** — Identify frequently tested conditions that span entity attributes or multiple entities. Wrap each in a Specification class implementing `is_satisfied_by(entity: T) -> bool`. Compose complex rules using decorator-style wrappers (`AndSpecification`, `OrSpecification`, `NotSpecification`). **Checkpoint:** Each specification is independently testable with at least one passing and one failing assertion per rule.

4. **Identify Domain Service Candidates** — Scan for operations that reference two or more aggregate roots or need infrastructure access (e.g., sending emails, calling external APIs). Move these from controllers to dedicated service classes named after the business capability (`FundTransferService`, `InventoryReservationService`). **Checkpoint:** No domain service should have more than 3–4 public methods. If it does, split by business capability.

5. **Create Aggregate Factories for Complex Construction** — When an aggregate's constructor requires external lookups, conditional validation, or multi-step setup, replace direct instantiation with a Factory class. The factory orchestrates the build process and returns a fully valid aggregate or raises a descriptive exception. **Checkpoint:** Every factory method either returns a complete aggregate or raises — never return `None` on failure.

6. **Wire Unit of Work for Transaction Coordination** — Create a UoW that holds references to all repositories used in a use case, tracks changes via an identity map, and provides atomic `commit()` / `rollback()`. Use as a context manager or explicit begin/commit pattern. **Checkpoint:** A single use-case method should acquire one UoW at the top and never nest UoWs — nesting causes transaction conflicts.

7. **Separate Commands from Queries Within the Bounded Context** — Create distinct handler classes for write operations (`CreateOrderCommandHandler`, `CancelOrderCommandHandler`) and read operations (`GetOrderQueryHandler`, `ListOrdersByCustomerQueryHandler`). Write handlers return domain events or aggregate IDs; query handlers return DTOs or projections. **Checkpoint:** Query handlers must never call `aggregate.save()` or trigger state mutations — verify by code review that no command method is called from a query handler.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Repository Pattern — Persistence Decoupling

The repository provides an in-memory-collection-like interface to aggregates. The interface lives in the domain layer; the implementation lives in infrastructure. This ensures domain logic never depends on persistence technology.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Protocol, Sequence
from uuid import UUID


# ── Domain Layer: Repository Interface (ABC) ────────────────────────────────

class OrderRepository(Protocol):
    """Protocol defining the repository contract for Order aggregates.
    
    Using a Protocol means domain code needs no ABC imports — it depends only
    on duck typing. Infrastructure implementations must satisfy this interface.
    """

    @abstractmethod
    def get_by_id(self, order_id: UUID) -> Order | None:
        """Load an Order by its primary key. Returns None if not found."""

    @abstractmethod
    def save(self, order: Order) -> None:
        """Persist the given Order. Creates or updates as needed."""

    @abstractmethod
    def list_by_customer(self, customer_id: UUID, *, limit: int = 50) -> Sequence[Order]:
        """Return orders for a customer, ordered by creation date descending."""


# ❌ BAD: Repository interface leaks infrastructure types into the domain
class BadOrderRepository(ABC):
    """Uses SQLAlchemy session and Row objects in the interface signature."""

    @abstractmethod
    def get_by_id(self, session, order_id: str) -> "OrderModel":  # ORM model leaked!
        pass  # Infrastructure types in domain — violates dependency rule

    @abstractmethod
    def save(self, session, order: dict) -> None:  # Raw dict instead of Order entity
        pass


# ✅ GOOD: Infrastructure implementation with explicit domain↔ORM mapping
from sqlalchemy import select
from sqlalchemy.orm import Session


class SqlAlchemyOrderRepository:
    """Infrastructure-side repository implementing the OrderRepository protocol."""

    def __init__(self, session_factory) -> None:
        self._session_factory = session_factory

    def get_by_id(self, order_id: UUID) -> Order | None:
        with self._session_factory() as session:
            row = session.execute(
                select(OrderRow).where(OrderRow.id == order_id)
            ).scalar_one_or_none()
            if row is None:
                return None
            return self._map_to_domain(row)

    def save(self, order: Order) -> None:
        with self._session_factory() as session:
            mapped = self._map_from_domain(order)
            existing = session.execute(
                select(OrderRow).where(OrderRow.id == mapped.id)
            ).scalar_one_or_none()
            if existing is None:
                session.add(mapped)
            else:
                for key, value in mapped.__dict__.items():
                    if not key.startswith("_"):
                        setattr(existing, key, value)

    def list_by_customer(self, customer_id: UUID, *, limit: int = 50) -> Sequence[Order]:
        with self._session_factory() as session:
            rows = session.execute(
                select(OrderRow)
                .where(OrderRow.customer_id == customer_id)
                .order_by(OrderRow.created_at.desc())
                .limit(limit)
            ).scalars().all()
            return [self._map_to_domain(row) for row in rows]

    def _map_to_domain(self, row: OrderRow) -> Order:
        """Convert ORM row to domain Order entity."""
        items = [
            OrderItem(item.product_id, item.quantity, Money(item.unit_price, "USD"))
            for item in row.items
        ]
        return Order(
            order_id=row.id,
            customer_email=row.customer_email,
            _items=items,
            _status=OrderStatus(row.status),
        )

    def _map_from_domain(self, order: Order) -> OrderRow:
        """Convert domain Order entity to ORM row for persistence."""
        return OrderRow(
            id=order.order_id,
            customer_email=order.customer_email,
            status=order.status.value,
            created_at=order.created_at,
            items=[OrderItemRow(product_id=i.product_id, quantity=i.quantity, unit_price=float(i.unit_price.amount)) for i in order._items],
        )
```

**Key principles:**
- The interface (Protocol or ABC) must use only domain types — never ORM models, raw dicts, or session objects
- Mapping logic belongs entirely in the infrastructure implementation — domain entities should be plain data carriers with no awareness of how they are persisted
- Use context managers (`with self._session_factory()`) to ensure sessions are always closed, even on exceptions
- For read-heavy queries, return sequences rather than generators to avoid lazy-loading issues outside the session scope

---

### Pattern 2: Specification Pattern — Composable Business Rules

The Specification pattern encapsulates a business rule as an object with an `is_satisfied_by()` method. Specifications can be composed using logical combinators, enabling reusable and testable rule validation without scattered boolean expressions.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import TypeVar
from datetime import date
from dataclasses import dataclass


T = TypeVar("T")


@dataclass(frozen=True)
class Specification(ABC):
    """Abstract base for composable business rule specifications.

    Subclasses implement `is_satisfied_by()` to express a single condition.
    Logical composition is provided by AndSpecification, OrSpecification, and
    NotSpecification wrappers.
    """

    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool:
        """Evaluate whether the candidate satisfies this rule."""

    def __and__(self, other: Specification[T]) -> AndSpecification[T]:
        return AndSpecification(self, other)

    def __or__(self, other: Specification[T]) -> OrSpecification[T]:
        return OrSpecification(self, other)

    def __invert__(self) -> NotSpecification[T]:
        return NotSpecification(self)


@dataclass(frozen=True)
class AndSpecification(Specification[T]):
    """Logical AND composition of two specifications."""
    left: Specification[T]
    right: Specification[T]

    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) and self.right.is_satisfied_by(candidate)


@dataclass(frozen=True)
class OrSpecification(Specification[T]):
    """Logical OR composition of two specifications."""
    left: Specification[T]
    right: Specification[T]

    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) or self.right.is_satisfied_by(candidate)


@dataclass(frozen=True)
class NotSpecification(Specification[T]):
    """Logical NOT composition of a specification."""
    wrapped: Specification[T]

    def is_satisfied_by(self, candidate: T) -> bool:
        return not self.wrapped.is_satisfied_by(candidate)


# ── Concrete Specifications for Order Domain ────────────────────────────────

@dataclass(frozen=True)
class MinTotalSpecification(Specification[Order]):
    """An order is valid when its total meets or exceeds the minimum threshold."""
    min_amount: Money

    def is_satisfied_by(self, candidate: Order) -> bool:
        return candidate.total.amount >= self.min_amount.amount


@dataclass(frozen=True)
class HasShippingAddressSpecification(Specification[Order]):
    """An order must have a shipping address set before confirmation."""
    def is_satisfied_by(self, candidate: Order) -> bool:
        return candidate.ship_to is not None


@dataclass(frozen=True)
class NotCancelledSpecification(Specification[Order]):
    """An order that has not been cancelled."""
    def is_satisfied_by(self, candidate: Order) -> bool:
        return candidate.status != OrderStatus.CANCELLED


# ❌ BAD: Business rules scattered as inline boolean expressions throughout codebase
def process_order(order: Order) -> None:
    """Rules are invisible — buried in conditionals with no way to test or reuse."""
    if order.total.amount >= Decimal("10.00") and order.ship_to is not None \
       and order.status != OrderStatus.CANCELLED:
        order.confirm()  # Rule is a magic boolean expression nobody can reason about
    else:
        raise RuntimeError("Order validation failed")


# ✅ GOOD: Rules are explicit Specification objects — testable, composable, documented
class OrderConfirmationPolicy:
    """Composite policy combining multiple specifications into a single check."""

    def __init__(self) -> None:
        self._rules = (
            MinTotalSpecification(Money(Decimal("0.01"), "USD"))
            & HasShippingAddressSpecification()
            & ~NotCancelledSpecification()  # Actually needs to NOT be cancelled
        )
        # Corrected: we want orders that are NOT cancelled
        self._rules = (
            MinTotalSpecification(Money(Decimal("0.01"), "USD"))
            & HasShippingAddressSpecification()
            & NotSpecification(NotCancelledSpecification())
        )

    def is_confirmable(self, order: Order) -> bool:
        return self._rules.is_satisfied_by(order)


# Usage — clear intent, easy to test individual rules
policy = OrderConfirmationPolicy()
if policy.is_confirmable(order):
    order.confirm()
```

**Key principles:**
- Use `@dataclass(frozen=True)` for specifications so they are immutable and hashable (enabling caching of results)
- Provide `__and__`, `__or__`, `__invert__` magic methods so specifications compose naturally with Python operators (`&`, `|`, `~`)
- Keep each concrete specification focused on a single condition — if it tests multiple unrelated things, split into smaller specifications
- Specifications should be side-effect free — `is_satisfied_by()` must not modify state or trigger external calls

---

### Pattern 3: Domain Service — Cross-Aggregate Operations

Domain services handle operations that span multiple aggregates or require infrastructure access. They coordinate work across aggregate boundaries without placing that logic inside any single entity.

```python
from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from uuid import UUID


# ❌ BAD: Cross-aggregate logic dumped into a controller — violates SRP
def transfer_funds_controller(from_account_id, to_account_id, amount):
    """Mixes HTTP concerns, persistence, and business rules — impossible to unit test."""
    db = get_db_session()
    sender = db.query(Account).get(from_account_id)
    receiver = db.query(Account).get(to_account_id)
    if sender.balance < amount:
        return jsonify({"error": "insufficient funds"}), 400
    sender.balance -= amount
    receiver.balance += amount
    db.commit()
    send_notification(sender.id, "funds debited")   # Infrastructure leak!
    send_notification(receiver.id, "funds credited")
    return jsonify({"status": "done"})


# ✅ GOOD: Domain service isolates cross-aggregate coordination from infrastructure
class FundTransferService:
    """Coordinates fund transfers between accounts — logic spanning two aggregates.

    This is NOT an entity method because it operates on two separate aggregate
    roots (sender and receiver) without belonging to either one.
    """

    MIN_TRANSFER_AMOUNT: Final[Money] = Money(Decimal("0.01"), "USD")

    def __init__(
        self,
        account_repo: OrderRepository,  # Would be AccountRepository in real code
        notification_service: NotificationService,
    ) -> None:
        self._account_repo = account_repo
        self._notification = notification_service

    def transfer(
        self,
        from_account_id: UUID,
        to_account_id: UUID,
        amount: Money,
    ) -> FundTransferResult:
        """Execute a fund transfer. Atomic across both accounts or fails completely."""
        # Guard: validate precondition early
        if amount.amount <= self.MIN_TRANSFER_AMOUNT.amount:
            raise ValueError(
                f"Transfer amount {amount} must exceed minimum of "
                f"{self.MIN_TRANSFER_AMOUNT}"
            )

        sender = self._account_repo.get_by_id(from_account_id)
        receiver = self._account_repo.get_by_id(to_account_id)

        if sender is None:
            raise ValueError(f"Source account {from_account_id} not found")
        if receiver is None:
            raise ValueError(f"Destination account {to_account_id} not found")

        # Delegate invariant checks to the aggregates themselves
        try:
            sender.withdraw(amount)
        except RuntimeError as exc:
            raise InsufficientFundsError(str(exc)) from exc

        # Debit sender, credit receiver — these should be in the same UoW transaction
        self._account_repo.save(sender)
        self._notification.notify_debited(from_account_id, amount)

        try:
            receiver.deposit(amount)
        except Exception as exc:
            # Rollback sender's debit on failure — real code would use UoW rollback
            raise TransferFailedError(f"Crediting failed after debit: {exc}") from exc

        self._account_repo.save(receiver)
        self._notification.notify_credited(to_account_id, amount)

        return FundTransferResult(
            from_account=from_account_id,
            to_account=to_account_id,
            amount=amount,
            executed_at=date.today(),
        )


@dataclass(frozen=True)
class FundTransferResult:
    """Immutable record of a completed transfer."""
    from_account: UUID
    to_account: UUID
    amount: Money
    executed_at: date


class InsufficientFundsError(Exception):
    """Raised when an account lacks sufficient balance for a withdrawal."""


class TransferFailedError(Exception):
    """Raised when the second half of a transfer fails after the first succeeded."""
```

**Key principles:**
- Domain services are the exception, not the rule — only use them when logic cannot belong to any single aggregate
- Name domain services after the business capability they coordinate (`FundTransferService`, `InventoryReservationService`), not their technical role (`AccountService`)
- Inject dependencies (repositories, external services) via constructor — never create them inside service methods
- Each public method should do one coherent thing; if it calls more than 3–4 other domain services, consider splitting by use case
- Prefer raising explicit domain exceptions over returning error codes or result objects for failure cases

---

### Pattern 4: Aggregate Factory — Complex Construction

Aggregate factories handle construction scenarios that require external data lookups, conditional state setup, or multi-step validation that does not fit cleanly into a constructor. The factory guarantees the returned aggregate is fully valid.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID, uuid4


# ❌ BAD: Constructor with too many optional parameters — silent failure via None defaults
class BadOrderFactory:
    """Constructor does everything — validation, external lookups, conditional setup."""

    def __init__(
        self,
        order_id: str | None = None,       # Should be required
        customer_email: str = "",           # No validation
        items: list[dict] | None = None,    # Raw dicts, not domain types
        promo_code: str | None = None,      # Conditional discount logic inside constructor!
        gift_wrap: bool = False,            # Another conditional branch
        customer_tier: str | None = None,   # External data needed for pricing
    ) -> None:
        if promo_code and customer_tier == "gold":
            pass  # Discount logic buried in init — hard to test
        # No validation at all — invalid state is possible


# ✅ GOOD: Dedicated factory with clear construction contract
class OrderFactory(ABC):
    """Abstract factory interface for Order aggregates.

    Concrete factories can be swapped per bounded context or testing scenario.
    Domain code depends on the abstract factory, not concrete implementation details.
    """

    @abstractmethod
    def create_order(
        self,
        customer_email: str,
        items: list[OrderItem],
    ) -> Order:
        """Create a basic order with validated items."""

    @abstractmethod
    def create_promotional_order(
        self,
        customer_email: str,
        items: list[OrderItem],
        promo_code: str,
        customer_tier: str,
    ) -> Order:
        """Create an order with promotional pricing applied.

        Requires external promo code validation and tier-based discount lookup.
        """


class DefaultOrderFactory(OrderFactory):
    """Concrete factory with real-world construction logic."""

    def __init__(
        self,
        product_catalog: ProductCatalog,  # External dependency for item validation
        promo_service: PromoCodeService,  # External dependency for discount codes
    ) -> None:
        self._catalog = product_catalog
        self._promo = promo_service

    def create_order(
        self,
        customer_email: str,
        items: list[OrderItem],
    ) -> Order:
        """Build a validated order with currency normalization."""
        if not customer_email or "@" not in customer_email:
            raise ValueError(f"Invalid customer email: {customer_email!r}")

        # Validate all products exist in catalog before creating the order
        product_ids = [item.product_id for item in items]
        available = self._catalog.get_products(product_ids)
        missing = set(product_ids) - {p.id for p in available}
        if missing:
            raise ProductNotFoundError(
                f"Cannot create order — products not in catalog: {missing}"
            )

        # Normalize currency across all items (all must match or we convert)
        if items:
            base_currency = items[0].unit_price.currency
            if not all(i.unit_price.currency == base_currency for i in items):
                raise ValueError("All items must use the same currency")

        order_id = UUID(hex=uuid4().hex[:32])
        order = Order(order_id=order_id, customer_email=customer_email)

        for item in items:
            order.add_item(item.product_id, item.quantity, item.unit_price)

        # Final consistency check — the factory guarantees a valid aggregate
        violations = order.validate_consistency()
        if violations:
            raise ValueError(f"Order validation failed: {'; '.join(violations)}")

        return order

    def create_promotional_order(
        self,
        customer_email: str,
        items: list[OrderItem],
        promo_code: str,
        customer_tier: str,
    ) -> Order:
        """Create an order with a validated promotional discount applied."""
        # Validate promo code first (external lookup)
        discount = self._promo.validate(promo_code, customer_tier)
        if not discount:
            raise InvalidPromoCodeError(
                f"Promo code '{promo_code}' is invalid for tier '{customer_tier}'"
            )

        # Apply discount to each item — domain logic belongs in the factory,
        # not scattered across the Order entity
        discounted_items = []
        for item in items:
            discounted_price = Money(
                item.unit_price.amount * Decimal(1 - discount.percentage),
                item.unit_price.currency,
            )
            discounted_items.append(OrderItem(item.product_id, item.quantity, discounted_price))

        # Delegate to the base factory for validation and creation
        return self.create_order(customer_email, discounted_items)


class ProductNotFoundError(ValueError):
    """Raised when one or more requested products are not in the catalog."""


class InvalidPromoCodeError(ValueError):
    """Raised when a promo code is invalid for the given customer tier."""
```

**Key principles:**
- The factory guarantees the returned aggregate is valid — if construction fails, raise a descriptive exception rather than returning `None` or a partial object
- External data lookups (catalog checks, promo code validation) belong in the factory, not the constructor. This keeps the aggregate's constructor focused on its own invariants.
- Use an abstract factory interface when you need to swap implementations (e.g., test factories that return mock aggregates without real external calls)
- Complex factories can delegate to simpler ones — `create_promotional_order` validates externally, then delegates to `create_order` for the common construction path

---

### Pattern 5: Unit of Work — Transaction Coordination

The Unit of Work (UoW) maintains a list of objects affected by a business transaction and coordinates writing out changes. It tracks inserts, updates, and deletes across repositories within a single transaction boundary.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from collections import defaultdict
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum, auto
from uuid import UUID


class ChangeType(Enum):
    ADDED = auto()
    UPDATED = auto()
    DELETED = auto()


@dataclass
class EntityChange:
    """Record of a single entity modification tracked by the Unit of Work."""
    entity: object
    change_type: ChangeType
    original_snapshot: dict | None = None  # For optimistic concurrency checks


class UnitOfWork:
    """Coordinates transactions across multiple repositories.

    Tracks all entities accessed during a use case and commits them atomically.
    Supports both context-manager (`with uow:`) and explicit begin/commit usage.
    """

    def __init__(self) -> None:
        self._pending_changes: list[EntityChange] = []
        self._identity_map: dict[tuple[type, UUID], object] = {}
        # Injected repositories — provided by dependency injection at use-case time
        self.order_repo: OrderRepository | None = None
        self.account_repo: AccountRepository | None = None
        self.product_repo: ProductCatalog | None = None

    def register_new(self, entity: object) -> None:
        """Mark an entity as newly created and pending commit."""
        if isinstance(entity, EntityWithId):
            key = (type(entity), entity.id)
            if key not in self._identity_map:
                self._identity_map[key] = entity
                self._pending_changes.append(EntityChange(entity, ChangeType.ADDED))

    def register_dirty(self, entity: object, snapshot: dict | None = None) -> None:
        """Mark an existing entity as modified."""
        if isinstance(entity, EntityWithId):
            key = (type(entity), entity.id)
            self._identity_map[key] = entity
            self._pending_changes.append(
                EntityChange(entity, ChangeType.UPDATED, original_snapshot=snapshot)
            )

    def register_deleted(self, entity: object) -> None:
        """Mark an entity as deleted."""
        if isinstance(entity, EntityWithId):
            key = (type(entity), entity.id)
            self._identity_map[key] = entity
            self._pending_changes.append(EntityChange(entity, ChangeType.DELETED))

    def commit(self) -> int:
        """Flush all pending changes to repositories. Returns count of changed entities."""
        if not self._pending_changes:
            return 0

        # Group changes by repository and flush — in real code, use a transaction
        for change in self._pending_changes:
            entity = change.entity
            repo = self._resolve_repo(entity)
            if repo is None:
                raise RuntimeError(f"No repository registered for entity type {type(entity).__name__}")

            if change.change_type == ChangeType.ADDED:
                repo.save(entity)  # type: ignore[union-attr]
            elif change.change_type == ChangeType.UPDATED:
                repo.save(entity)  # type: ignore[union-attr]
            elif change.change_type == ChangeType.DELETED:
                if hasattr(repo, "delete"):
                    repo.delete(entity.id)  # type: ignore[union-attr]

        count = len(self._pending_changes)
        self._pending_changes.clear()
        return count

    def rollback(self) -> None:
        """Discard all pending changes. No repository is touched."""
        self._pending_changes.clear()

    @contextmanager
    def __call__(self) -> UnitOfWork:
        """Context manager usage: with uow as unit_of_work: ..."""
        try:
            yield self
            self.commit()
        except Exception:
            self.rollback()
            raise

    def _resolve_repo(self, entity: object) -> OrderRepository | AccountRepository | ProductCatalog | None:
        """Route an entity to the correct registered repository by type."""
        if isinstance(entity, Order):
            return self.order_repo
        if isinstance(entity, Account):
            return self.account_repo
        if isinstance(entity, Product):
            return self.product_repo
        return None


class EntityWithId(ABC):
    """Base marker for entities that have a UUID identity, used by UoW."""

    @property
    @abstractmethod
    def id(self) -> UUID:
        """Return the entity's unique identifier."""


# ❌ BAD: No transaction coordination — each save is its own implicit transaction
def bad_transfer(sender_id: UUID, receiver_id: UUID, amount: Money):
    """Each repo.save() commits independently — if second fails, data is inconsistent."""
    sender = account_repo.get_by_id(sender_id)
    sender.withdraw(amount)
    account_repo.save(sender)  # Committed! If next line fails → money lost

    receiver = account_repo.get_by_id(receiver_id)
    receiver.deposit(amount)
    account_repo.save(receiver)


# ✅ GOOD: UoW coordinates both saves within a single transaction
def good_transfer(unit_of_work: UnitOfWork, sender_id: UUID, receiver_id: UUID, amount: Money):
    """Both account changes are committed atomically — or neither is."""
    with unit_of_work as uow:
        sender = uow.account_repo.get_by_id(sender_id)
        receiver = uow.account_repo.get_by_id(receiver_id)

        sender.withdraw(amount)
        uow.register_dirty(sender)

        receiver.deposit(amount)
        uow.register_dirty(receiver)

        # commit() runs on context exit — if any exception occurs, rollback() runs instead
```

**Key principles:**
- Use the Unit of Work as a context manager (`with uow:`) to guarantee atomicity — exceptions automatically trigger rollback
- The identity map prevents duplicate loads within a single UoW session and ensures consistent state references across repositories
- Register entities explicitly when they are modified — do not rely on implicit change detection (which is error-prone)
- Keep the UoW lightweight: it tracks changes, but does not contain business logic. Business rules belong in aggregates and domain services.

---

### Pattern 6: Command/Query Separation Within a Bounded Context

Within a single bounded context, separate command handlers (which mutate state) from query handlers (which only read). This prevents accidental mutations during queries and enables optimized read models.

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from uuid import UUID


# ── Query Domain: DTOs for Read Operations ──────────────────────────────────

@dataclass(frozen=True)
class OrderSummary:
    """Read-only projection — not a domain entity, just data for the UI/API."""
    order_id: UUID
    customer_email: str
    status: str
    total_amount: float
    item_count: int
    created_at: date


@dataclass(frozen=True)
class OrderDetails:
    """Detailed read model including line items — still a DTO, not an entity."""
    order_id: UUID
    customer_email: str
    status: str
    total_amount: float
    items: list[OrderLineItemDTO]
    shipping_address: Address | None


@dataclass(frozen=True)
class OrderLineItemDTO:
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


# ── Command Domain: Write Handlers ──────────────────────────────────────────

class CommandHandler(ABC):
    """Base class for command handlers. All commands return an ID or event record."""
    pass


class CreateOrderCommand(CommandHandler):
    """Command to create a new order with items."""
    customer_email: str
    items: list[OrderItem]


class CancelOrderCommand(CommandHandler):
    """Command to cancel an existing order."""
    order_id: UUID


# ── Query Handlers: Pure Read Operations ────────────────────────────────────

class QueryHandler(ABC):
    """Base class for query handlers. Must never modify domain state."""
    pass


@dataclass
class GetOrderQuery(QueryHandler):
    """Query to retrieve full order details by ID."""
    order_id: UUID


@dataclass
class ListOrdersByCustomerQuery(QueryHandler):
    """Query to list recent orders for a customer with optional status filter."""
    customer_email: str
    status_filter: OrderStatus | None = None
    limit: int = 25


# ✅ GOOD: Dedicated command and query handler classes with clear separation
class CreateOrderCommandHandler:
    """Handles the CreateOrder command — creates and persists a new order."""

    def __init__(self, uow_factory) -> None:
        self._uow_factory = uow_factory  # Callable that returns a new UoW

    def handle(self, command: CreateOrderCommand) -> UUID:
        """Process the create order command. Returns the new order's ID."""
        with self._uow_factory() as uow:
            order = Order(
                order_id=UUID(hex=uuid4().hex[:32]),
                customer_email=command.customer_email,
            )
            for item in command.items:
                order.add_item(item.product_id, item.quantity, item.unit_price)

            # The UoW will commit on success or rollback on exception
            uow.order_repo.save(order)
            return order.order_id


class GetOrderQueryHandler(QueryHandler):
    """Handles the GetOrder query — reads and returns an order as a DTO."""

    def __init__(self, order_repo: OrderRepository) -> None:
        self._repo = order_repo

    def handle(self, query: GetOrderQuery) -> OrderDetails | None:
        """Read-only — no domain mutations, no UoW needed for queries."""
        order = self._repo.get_by_id(query.order_id)
        if order is None:
            return None

        # Map to DTO — this is a read projection, not the entity itself
        items = [
            OrderLineItemDTO(
                product_id=item.product_id,
                product_name=f"Product-{item.product_id}",  # Would come from catalog join
                quantity=item.quantity,
                unit_price=float(item.unit_price.amount),
                line_total=float(item.unit_price.amount * item.quantity),
            )
            for item in order._items
        ]

        return OrderDetails(
            order_id=order.order_id,
            customer_email=order.customer_email,
            status=order.status.value,
            total_amount=float(order.total.amount),
            items=items,
            shipping_address=order.ship_to,
        )


class ListOrdersByCustomerQueryHandler(QueryHandler):
    """Handles the list orders query — returns a paginated summary."""

    def __init__(self, order_repo: OrderRepository) -> None:
        self._repo = order_repo

    def handle(self, query: ListOrdersByCustomerQuery) -> list[OrderSummary]:
        """Read-only query — returns summaries without loading full entities."""
        orders = self._repo.list_by_customer(query.customer_email, limit=query.limit)

        results = []
        for order in orders:
            if query.status_filter is None or order.status == query.status_filter:
                results.append(OrderSummary(
                    order_id=order.order_id,
                    customer_email=order.customer_email,
                    status=order.status.value,
                    total_amount=float(order.total.amount),
                    item_count=len(order._items),
                    created_at=order.created_at,
                ))
        return results


# ❌ BAD: Query handler that mutates state — violates command/query separation
class BadQueryHandler:
    def __init__(self, repo) -> None:
        self._repo = repo

    def get_order(self, order_id):  # This is a query — it should only READ
        order = self._repo.get_by_id(order_id)
        if order and order.status == OrderStatus.DRAFT:
            order.created_at = date.today()  # ❌ Mutation inside a "get" method!
            self._repo.save(order)         # ❌ Persistence call inside a query handler!
        return order
```

**Key principles:**
- Query handlers must never modify domain state or call `repo.save()` — if a read operation needs to update something, it should be its own command
- Command handlers use the Unit of Work for transaction coordination; query handlers do not need a UoW since they only read
- DTOs used by query handlers are frozen dataclasses with no behavior — they exist solely to carry data from the domain layer to the presentation layer
- When the query requires data from multiple sources (e.g., order + product names), consider whether a denormalized read model would be more efficient than joining at query time

---

## Constraints

### MUST DO
- **Place repository interfaces in the domain layer** — use `Protocol` or `ABC` with only domain types in signatures. Infrastructure implementations import persistence frameworks; domain code must never import from infrastructure.
- **Make specifications immutable and composable** — use `@dataclass(frozen=True)` and provide `__and__`, `__or__`, `__invert__` methods so rules compose naturally with `&`, `|`, `~`. Each specification is independently testable.
- **Use domain services only for cross-aggregate logic** — if a method operates on a single aggregate, it belongs in the aggregate as a method or constructor validation. Domain services are the exception for multi-aggregate coordination.
- **Guarantee factory-returned aggregates are valid** — every factory method must either return a complete, validated aggregate or raise an explicit domain exception. Never return `None` on construction failure.
- **Coordinate all saves within a Unit of Work context** — use the UoW as a context manager (`with uow:`) so that exceptions trigger automatic rollback. Never call `repo.save()` outside a UoW for state-changing operations.
- **Keep command handlers and query handlers separate** — create distinct handler classes with distinct method signatures. Query handlers return DTOs; command handlers return IDs or event records.

### MUST NOT DO
- **Implement repository logic in domain entities** — entities should not know about their own persistence. They define what they are; repositories define how they are stored. Never add `save()` methods to aggregate roots.
- **Compose specifications by nesting if-statements** — if you find yourself writing `if rule_a(candidate) and rule_b(candidate):` in multiple places, extract those into Specification objects. Scattered boolean logic is unmaintainable.
- **Let query handlers mutate domain state** — a method named `get`, `list`, `find`, or `query` must never call `save()`, `commit()`, or trigger side effects. If it needs to change state, make it a command handler.
- **Nest Unit of Work instances** — each use-case execution should acquire exactly one UoW at the top level. Nested UoWs cause transaction conflicts and obscure error boundaries.
- **Return ORM entities or raw database rows from repository methods** — always map to domain entities before returning. The presentation layer receives domain types; infrastructure mapping happens at the boundary.

---

## Output Template

When applying this skill, produce:

1. **Repository Interfaces** — Protocol/ABC definitions in domain layer using only domain types, with concrete implementations in an `infra/repositories/` package
2. **Specification Objects** — Composable rule classes with `is_satisfied_by()` method and logical combinators (`&`, `|`, `~`) for complex conditions
3. **Domain Service Classes** — Cross-aggregate coordination classes injected with repository dependencies, named after business capabilities
4. **Aggregate Factory Classes** — Construction orchestrators that validate external preconditions and return fully valid aggregates or raise descriptive exceptions
5. **Unit of Work Implementation** — Context manager coordinating atomic commits across multiple repositories with identity map tracking
6. **Command/Query Handlers** — Separate handler classes for write (command) and read (query) operations, with query handlers returning DTOs and never mutating state

All code must use Python 3.10+ type hints, `from __future__ import annotations`, docstrings on every public method, and explicit domain exceptions rather than error codes or return values. Follow the Dependency Inversion Principle: domain layer defines interfaces (protocols), infrastructure layer implements them.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD tactical building blocks: value objects, entities, aggregate roots, domain events, bounded contexts |
| `domain-events` | Domain event publishing and handling — works alongside repositories to decouple state changes from handlers |
| `cqrs-pattern` | Full CQRS with separate write/read databases and event sourcing — extends the command/query separation within a single context to cross-context architecture |

---

## Further Reading

- *Implementing Domain-Driven Design* by Vaughn Vernon (the Red Book) — detailed pattern implementations including Repository, Specification, Unit of Work, and Domain Service
- *Patterns of Enterprise Application Architecture* by Martin Fowler — the original formalization of Repository, Unit of Work, and Specification patterns
- *Domain Modeling Made Functional* by Scott Wlaschin — functional approach to DDD that treats Specifications as first-class composables
- [DDD Community Repository](https://github.com/ddd-community) — practical examples across multiple languages

> 📖 skill(local cache): domain-driven-design, cqrs-pattern, domain-events
