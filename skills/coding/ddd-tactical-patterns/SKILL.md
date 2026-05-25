---
name: ddd-tactical-patterns
description: Implements DDD tactical supporting patterns — composable Specification
  objects for business rules, Domain Services for cross-aggregate coordination, Aggregate
  Factories for complex construction, and Unit of Work for transaction management.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: specification pattern, ddd tactical patterns, domain service, aggregate
    factory, unit of work, repository implementation, how do i implement specifications,
    cross-aggregate operations
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
  related-skills: domain-driven-design, ddd-context-mapping, cqrs-pattern, event-sourcing-pattern
------
# DDD Tactical Supporting Patterns

Implements the supporting structural patterns that make DDD domain models practical and testable. Produces Specification objects for composable business rules, Domain Services for cross-aggregate coordination, Aggregate Factories for complex construction scenarios, and Unit of Work implementations for transaction management — all focused on keeping domain logic cohesive while maintaining clean separation from infrastructure concerns.

This skill covers tactical patterns that support the core DDD building blocks (entities, value objects, aggregates, bounded contexts) documented in `domain-driven-design`. Use this skill when you need composable rule validation, cross-aggregate operations, or transaction coordination.

## TL;DR Checklist

- [ ] Define Specifications as frozen dataclasses with `is_satisfied_by()` methods supporting AND/OR/NOT composition via magic methods
- [ ] Place repository interfaces in the domain layer using Protocol or ABC — never import ORM types into domain code
- [ ] Implement Domain Services only for operations spanning two or more aggregate roots — single-aggregate rules belong in the aggregate itself
- [ ] Create Aggregate Factories when construction requires external lookups, conditional validation, or multi-step setup that exceeds constructor capabilities
- [ ] Use Unit of Work as a context manager to coordinate transactions across multiple repositories within a single use case
- [ ] Separate command handlers (write model) from query handlers (read model) — never let queries mutate state

---

## When to Use

Use this skill when:

- You need to express business rules that are tested repeatedly across different parts of the system (use Specifications instead of scattered boolean expressions)
- An operation needs data from two or more aggregate roots and cannot logically belong to any single one (use a Domain Service)
- Aggregate construction requires external data lookups, conditional state setup, or multi-step validation beyond what a constructor can reasonably handle (use an Aggregate Factory)
- Multiple repositories must participate in a single atomic transaction (use Unit of Work with identity map)
- You need to coordinate reads and writes within a bounded context using the Command pattern — separate command handlers from query handlers

---

## When NOT to Use

Avoid this skill for:

- Simple validation that happens once in a single place — Specifications add indirection when a single if-check suffices
- Operations that belong entirely within one aggregate root — do not use a Domain Service for logic that can live inside an entity or aggregate
- Single-repository transactions — if only one repository is involved, use its built-in transaction support directly instead of adding Unit of Work overhead
- Read-only queries in a CQRS system — use query handlers and read models instead; the Command pattern is for writes only

---

## Core Workflow

1. **Identify Repeated Business Rules** — Scan the codebase for boolean expressions that appear in multiple places (e.g., "order total >= minimum" AND "has shipping address" AND "not cancelled"). Each reusable rule becomes a Specification. **Checkpoint:** A rule should only become a Specification if it appears in at least two distinct call sites or is expected to grow complex through composition. Single-use rules stay as inline conditions.

2. **Design Specification Composition** — Create the base `Specification[T]` abstract class with `is_satisfied_by(candidate: T) -> bool` and magic methods `__and__`, `__or__`, `__invert__`. Implement concrete AndSpecification, OrSpecification, and NotSpecification wrappers as frozen dataclasses. Add concrete specifications for each business rule. **Checkpoint:** Every concrete specification must be independently testable with both a passing case (a candidate that satisfies the rule) and a failing case (one that does not).

3. **Create Domain Service for Cross-Aggregate Operations** — Identify operations that require two or more aggregate roots to cooperate. Move these from controllers or application services into dedicated domain service classes named after the business capability. Inject repository dependencies via constructor. Each public method does one coherent business operation. **Checkpoint:** Verify that no domain service has more than 3-4 public methods; if it does, split by business capability.

4. **Build Aggregate Factories for Complex Construction** — For aggregates whose construction requires external lookups (e.g., validating against a product catalog), conditional logic (e.g., applying promo codes based on customer tier), or multi-step validation, create a factory class. The factory orchestrates the build and guarantees the returned aggregate is fully valid. **Checkpoint:** Every factory method either returns a complete aggregate or raises — never return None or partial aggregates.

5. **Implement Unit of Work for Transaction Coordination** — When multiple repositories participate in a single use case, create a Unit of Work that tracks changes via an identity map and provides atomic commit/rollback. Use as a context manager with explicit begin/commit semantics. **Checkpoint:** A single use-case handler should acquire one UoW at the top and never nest UoWs — nesting causes transaction conflicts.

6. **Wire Command Handlers for Write Operations** — Create command handler classes that orchestrate write operations within a bounded context. Each command maps to a specific domain operation (CreateOrder, CancelOrder, TransferFunds). The handler acquires repositories through the UoW, validates input, invokes aggregate methods, and commits. **Checkpoint:** Command handlers must never perform read queries that mutate state — verify by inspection that no save() call exists inside a query handler.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Specification Pattern — Composable Business Rules

The Specification pattern encapsulates a business rule as an object with an `is_satisfied_by()` method. Specifications compose through logical combinators (AND, OR, NOT) enabling reusable, testable rule validation without scattered boolean expressions. This eliminates the "boolean explosion" problem where business logic becomes unreadable chains of conditions.

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TypeVar, Generic


T = TypeVar("T")


@dataclass(frozen=True)
class Specification(ABC, Generic[T]):
    """Abstract base for composable business rule specifications.

    Subclasses implement `is_satisfied_by()` to express a single condition.
    Logical composition is provided by AndSpecification, OrSpecification,
    and NotSpecification wrappers accessible via __and__, __or__, __invert__.
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
    """Logical AND composition: both specifications must be satisfied."""
    left: Specification[T]
    right: Specification[T]

    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) and self.right.is_satisfied_by(candidate)


@dataclass(frozen=True)
class OrSpecification(Specification[T]):
    """Logical OR composition: at least one specification must be satisfied."""
    left: Specification[T]
    right: Specification[T]

    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) or self.right.is_satisfied_by(candidate)


@dataclass(frozen=True)
class NotSpecification(Specification[T]):
    """Logical NOT composition: the wrapped specification must not be satisfied."""
    wrapped: Specification[T]

    def is_satisfied_by(self, candidate: T) -> bool:
        return not self.wrapped.is_satisfied_by(candidate)


# ── Concrete Specifications for an Order Domain ──────────────────────────────


@dataclass(frozen=True)
class MinTotalSpecification(Specification["Order"]):
    """An order is valid when its total meets or exceeds the minimum threshold."""
    min_amount: Decimal

    def is_satisfied_by(self, candidate: "Order") -> bool:
        return candidate.total.amount >= self.min_amount


@dataclass(frozen=True)
class HasShippingAddressSpecification(Specification["Order"]):
    """An order must have a shipping address set before confirmation."""
    def is_satisfied_by(self, candidate: "Order") -> bool:
        return candidate.ship_to is not None


@dataclass(frozen=True)
class NotCancelledSpecification(Specification["Order"]):
    """An order that has not been cancelled."""
    def is_satisfied_by(self, candidate: "Order") -> bool:
        return candidate.status != "CANCELLED"


@dataclass(frozen=True)
class HasItemsSpecification(Specification["Order"]):
    """An order must contain at least one item."""
    def is_satisfied_by(self, candidate: "Order") -> bool:
        return len(candidate.items) > 0


# Composite policy combining multiple specifications
@dataclass(frozen=True)
class OrderConfirmationPolicy:
    """Composite specification for all conditions required to confirm an order.

    Built by composing individual specifications using Python operators:
      & = AND (both must be true)
      | = OR  (at least one must be true)
      ~ = NOT (must not be true)
    """
    min_total: Decimal = Decimal("0.01")

    @property
    def rule(self) -> Specification["Order"]:
        return (
            MinTotalSpecification(self.min_total)
            & HasShippingAddressSpecification()
            & HasItemsSpecification()
            & NotSpecification(NotCancelledSpecification())
        )


class Order:
    """Simplified order aggregate for specification demonstration."""
    def __init__(
        self,
        order_id: str,
        items: list[dict],
        ship_to: str | None = None,
        status: str = "DRAFT",
    ) -> None:
        self.order_id = order_id
        self.items = items
        self.ship_to = ship_to
        self.status = status
        self.total = Decimal(sum(float(i["price"]) * i["qty"] for i in items))

    def confirm(self) -> None:
        """Confirm the order if all specifications are satisfied."""
        policy = OrderConfirmationPolicy()
        if not policy.rule.is_satisfied_by(self):
            raise RuntimeError(
                f"Order {self.order_id} cannot be confirmed — "
                f"fails specification checks. Total: {self.total}, "
                f"Items: {len(self.items)}, Shipping: {self.ship_to}, "
                f"Status: {self.status}"
            )
        self.status = "CONFIRMED"


# ❌ BAD: Scattered boolean expressions — impossible to test or reuse
def bad_confirm_order(order: Order) -> None:
    if (
        order.total >= Decimal("0.01")
        and order.ship_to is not None
        and len(order.items) > 0
        and order.status != "CANCELLED"
    ):
        order.status = "CONFIRMED"
    # No way to explain WHY it failed — just "it didn't confirm"


# ✅ GOOD: Specification objects — testable, composable, self-documenting
def good_confirm_order(order: Order) -> None:
    policy = OrderConfirmationPolicy()
    order.confirm()  # Raises RuntimeError with specification violation details if invalid

```

**Key principles:**
- Specifications must be immutable (`frozen=True`) so they can be cached and safely shared across threads
- Provide `__and__`, `__or__`, `__invert__` magic methods for natural Python composition — this makes complex rules readable: `spec_a & spec_b | ~spec_c`
- Keep each concrete specification focused on a single condition — if it tests multiple unrelated things, split into smaller specifications that can be composed independently
- Specifications are side-effect free — `is_satisfied_by()` must not modify state or trigger external calls; they are pure evaluators

---

### Pattern 2: Domain Service — Cross-Aggregate Coordination

Domain services handle operations that span multiple aggregate roots or require infrastructure access. They coordinate work across aggregate boundaries without placing that logic inside any single entity. Use domain services sparingly — they are the exception, not the rule. If logic can belong to a single aggregate, it belongs there.

```python
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from enum import Enum, auto
from uuid import UUID


class AccountStatus(Enum):
    ACTIVE = auto()
    FROZEN = auto()
    CLOSED = auto()


@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Money cannot be negative")

    def add(self, other: "Money") -> "Money":
        if self.currency != other.currency:
            raise ValueError(f"Currency mismatch: {self.currency} vs {other.currency}")
        return Money(self.amount + other.amount, self.currency)


class InsufficientFundsError(Exception):
    """Raised when an account lacks sufficient balance for a withdrawal."""


class TransferFailedError(Exception):
    """Raised when the second half of a transfer fails after debit succeeded."""


class Account:
    """Aggregate root representing a bank account."""

    def __init__(self, account_id: UUID, owner: str, balance: Decimal) -> None:
        self.account_id = account_id
        self.owner = owner
        self._balance = balance
        self.status = AccountStatus.ACTIVE

    @property
    def balance(self) -> Money:
        return Money(self._balance, "USD")

    def withdraw(self, amount: Money) -> None:
        if self.status != AccountStatus.ACTIVE:
            raise RuntimeError(f"Account {self.account_id} is {self.status.name}")
        if amount.currency != "USD":
            raise ValueError("Only USD transfers supported")
        if amount.amount > self._balance:
            raise InsufficientFundsError(
                f"Cannot withdraw {amount} from account {self.account_id} — balance is {self._balance}"
            )
        self._balance -= amount.amount

    def deposit(self, amount: Money) -> None:
        if self.status == AccountStatus.CLOSED:
            raise RuntimeError(f"Cannot deposit to closed account {self.account_id}")
        if amount.currency != "USD":
            raise ValueError("Only USD transfers supported")
        self._balance += amount.amount


class NotificationService:
    """Infrastructure dependency — handles sending notifications."""

    def notify_debited(self, account_id: UUID, amount: Money) -> None:
        print(f"[NOTIFY] Account {account_id} debited {amount}")

    def notify_credited(self, account_id: UUID, amount: Money) -> None:
        print(f"[NOTIFY] Account {account_id} credited {amount}")


class FundTransferResult:
    """Immutable record of a completed fund transfer."""
    from_account: UUID
    to_account: UUID
    amount: Money
    executed_at: str  # ISO 8601 string


class FundTransferService:
    """Coordinates fund transfers between accounts — logic spanning two aggregate roots.

    This is NOT an entity method because it operates on two separate aggregates
    (sender and receiver) without belonging to either one. It also depends on
    infrastructure services (notifications), making it unsuitable for the domain model.

    Attributes:
        account_repo: Repository providing access to Account aggregates
        notification_service: Infrastructure service for sending alerts
    """

    MIN_TRANSFER: Decimal = Decimal("0.01")

    def __init__(self, account_repo: Any, notification_service: NotificationService) -> None:
        self._account_repo = account_repo
        self._notification = notification_service

    def execute(
        self,
        from_account_id: UUID,
        to_account_id: UUID,
        amount: Money,
    ) -> FundTransferResult:
        """Execute an atomic fund transfer between two accounts.

        The transfer is attempted atomically: debit sender first, then credit receiver.
        If the credit fails after a successful debit, a compensating action reverses it.

        Args:
            from_account_id: UUID of the source account
            to_account_id: UUID of the destination account
            amount: Amount to transfer (must be positive and in USD)

        Returns:
            FundTransferResult with details of the completed transfer

        Raises:
            InsufficientFundsError: If the source account lacks sufficient balance
            TransferFailedError: If crediting fails after debiting
            ValueError: If accounts are not found or amount is invalid
        """
        if amount.amount <= self.MIN_TRANSFER:
            raise ValueError(
                f"Transfer amount {amount.amount} must exceed minimum of "
                f"{self.MIN_TRANSFER}"
            )

        sender = self._account_repo.get_by_id(from_account_id)
        receiver = self._account_repo.get_by_id(to_account_id)

        if sender is None:
            raise ValueError(f"Source account {from_account_id} not found")
        if receiver is None:
            raise ValueError(f"Destination account {to_account_id} not found")

        # Debit sender first — if this fails, no compensation needed
        try:
            sender.withdraw(amount)
        except InsufficientFundsError as exc:
            raise

        self._account_repo.save(sender)
        self._notification.notify_debited(from_account_id, amount)

        # Credit receiver — if this fails after debit, compensate
        try:
            receiver.deposit(amount)
        except Exception as exc:
            # Compensating action: restore sender's balance
            original_balance = sender._balance + amount.amount  # type: ignore[attr-defined]
            sender._balance = original_balance  # type: ignore[attr-defined]
            self._account_repo.save(sender)
            raise TransferFailedError(
                f"Credit failed for {to_account_id} after debiting {from_account_id}: {exc}"
            ) from exc

        self._account_repo.save(receiver)
        self._notification.notify_credited(to_account_id, amount)

        return FundTransferResult(
            from_account=from_account_id,
            to_account=to_account_id,
            amount=amount,
            executed_at="2026-05-21T10:30:00Z",  # In production: datetime.now(timezone.utc).isoformat()
        )


# ❌ BAD: Cross-aggregate logic dumped into a controller — violates SRP
def bad_transfer_controller(from_id: UUID, to_id: UUID, amount: float) -> dict:
    """Mixes HTTP concerns, persistence, and business rules — impossible to test."""
    sender = db.get(Account, from_id)
    receiver = db.get(Account, to_id)
    if sender.balance < amount:
        return {"error": "insufficient funds"}, 400
    sender.balance -= amount
    receiver.balance += amount
    db.commit()
    send_email(sender.owner, f"Debited {amount}")
    send_email(receiver.owner, f"Credited {amount}")
    return {"status": "done"}, 200


# ✅ GOOD: Domain service isolates coordination from infrastructure
def demonstrate_domain_service() -> None:
    """Show domain service usage with proper dependency injection."""
    repo = DummyAccountRepository()
    notifier = NotificationService()
    service = FundTransferService(repo, notifier)

    sender_id = UUID(hex="a1b2c3d4e5f6" + "0" * 20)
    receiver_id = UUID(hex="f6e5d4c3b2a1" + "0" * 20)

    result = service.execute(sender_id, receiver_id, Money(Decimal("100.00"), "USD"))
    assert result.from_account == sender_id
```

**Key principles:**
- Domain services are the exception, not the rule — only use them when logic cannot belong to any single aggregate root
- Name domain services after the business capability (`FundTransferService`, `InventoryReservationService`), not their technical role (`AccountService`)
- Inject dependencies (repositories, external services) via constructor — never create them inside service methods
- Each public method should do one coherent thing; if it calls more than 3-4 other domain services, consider splitting by use case

---

### Pattern 3: Aggregate Factory — Complex Construction

Aggregate factories handle construction scenarios requiring external data lookups, conditional state setup, or multi-step validation that does not fit cleanly into a constructor. The factory orchestrates the build process and guarantees the returned aggregate is fully valid. Use factories when constructors would require too many parameters or need infrastructure access.

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from uuid import UUID, uuid4


@dataclass(frozen=True)
class ProductInfo:
    """Product information from the catalog — an external dependency for order construction."""
    product_id: str
    name: str
    price: Decimal
    currency: str = "USD"
    available: bool = True


@dataclass(frozen=True)
class PromoDiscount:
    """Promotional discount retrieved from an external promo service."""
    code: str
    percentage: float  # e.g., 0.15 for 15% off
    min_order_total: Decimal
    valid: bool = True


@dataclass(frozen=True)
class InvalidPromoCodeError(Exception):
    """Raised when a promo code is invalid for the given conditions."""
    code: str
    reason: str


@dataclass(frozen=True)
class OrderItem:
    product_id: str
    quantity: int
    unit_price: Money

    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.unit_price.amount < 0:
            raise ValueError("Unit price cannot be negative")


@dataclass(frozen=True)
class OrderFactoryError(Exception):
    """Raised when aggregate factory cannot produce a valid aggregate."""
    message: str


class ProductCatalog:
    """External dependency — provides product information for order validation."""

    def get_products(self, product_ids: list[str]) -> list[ProductInfo]:
        """Return products matching the given IDs. Raises if any are missing."""
        catalog = [
            ProductInfo("SKU-001", "Widget A", Decimal("25.00"), available=True),
            ProductInfo("SKU-002", "Gadget B", Decimal("49.99"), available=True),
            ProductInfo("SKU-003", "Doohickey C", Decimal("9.99"), available=False),  # Out of stock
        ]
        result = {p.product_id: p for p in catalog if p.product_id in product_ids}
        missing = set(product_ids) - set(result.keys())
        if missing:
            raise KeyError(f"Products not found: {missing}")
        return list(result.values())


class PromoCodeService:
    """External dependency — validates promo codes and returns discounts."""

    def validate(self, code: str, customer_tier: str) -> PromoDiscount | None:
        """Validate a promo code against the customer tier. Returns discount or None."""
        valid_codes = {
            "WELCOME15": PromoDiscount("WELCOME15", 0.15, Decimal("50.00")),
            "VIP20": PromoDiscount("VIP20", 0.20, Decimal("0.00")),
            "SAVE10": PromoDiscount("SAVE10", 0.10, Decimal("25.00")),
        }
        tier_codes = {
            "gold": ["WELCOME15", "VIP20", "SAVE10"],
            "silver": ["WELCOME15", "SAVE10"],
            "bronze": ["SAVE10"],
        }
        if code not in valid_codes or customer_tier not in tier_codes.get(customer_tier, []):
            return None
        discount = valid_codes[code]
        # Check minimum order total — set by factory after items are added
        return PromoDiscount(
            code=code,
            percentage=discount.percentage,
            min_order_total=Decimal("0"),  # Placeholder; validated in factory
        )


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
    ) -> "Order":
        """Create a basic order with validated items."""

    @abstractmethod
    def create_promotional_order(
        self,
        customer_email: str,
        items: list[OrderItem],
        promo_code: str,
        customer_tier: str,
    ) -> "Order":
        """Create an order with a validated promotional discount applied."""


class Order:
    """Simplified order aggregate for factory demonstration."""

    def __init__(self, order_id: UUID, customer_email: str) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self._items: list[OrderItem] = []
        self.status = "DRAFT"

    @property
    def items(self) -> list[OrderItem]:
        return list(self._items)

    @property
    def total(self) -> Money:
        if not self._items:
            return Money(Decimal("0"), "USD")
        currency = self._items[0].unit_price.currency
        running = Money(Decimal("0"), currency)
        for item in self._items:
            line_value = item.unit_price.amount * Decimal(item.quantity)
            running = running.add(Money(line_value, currency))
        return running

    def add_item(self, product_id: str, quantity: int, unit_price: Money) -> None:
        if self.status != "DRAFT":
            raise RuntimeError(f"Cannot add items to order in {self.status} state")
        self._items.append(OrderItem(product_id, quantity, unit_price))

    def validate_consistency(self) -> list[str]:
        violations: list[str] = []
        if not self._items:
            violations.append("Order has no items")
        if len(self._items) != len({i.product_id for i in self._items}):
            violations.append("Duplicate products found; update quantity instead of adding")
        return violations


class DefaultOrderFactory(OrderFactory):
    """Concrete factory with real-world construction logic.

    Dependencies (catalog, promo service) are injected via constructor.
    The factory orchestrates the build process and guarantees a fully valid aggregate.
    """

    def __init__(self, catalog: ProductCatalog, promo_service: PromoCodeService) -> None:
        self._catalog = catalog
        self._promo = promo_service

    def create_order(
        self,
        customer_email: str,
        items: list[OrderItem],
    ) -> Order:
        """Build a validated order with currency normalization.

        Validates all products exist in the catalog before creating the order.
        Normalizes currency across items — all must match or conversion is required.
        Runs final consistency check before returning the aggregate.
        """
        if not customer_email or "@" not in customer_email:
            raise ValueError(f"Invalid customer email: {customer_email!r}")

        # Validate products exist in catalog
        product_ids = [item.product_id for item in items]
        available = self._catalog.get_products(product_ids)
        out_of_stock = {p.product_id for p in available if not p.available}
        if out_of_stock:
            raise OrderFactoryError(f"Cannot order — products out of stock: {out_of_stock}")

        # Normalize currency
        if items:
            base_currency = items[0].unit_price.currency
            mismatches = [i.product_id for i in items if i.unit_price.currency != base_currency]
            if mismatches:
                raise OrderFactoryError(
                    f"Items use different currencies (expected {base_currency}): "
                    f"{mismatches}"
                )

        order = Order(order_id=UUID(hex=uuid4().hex[:32]), customer_email=customer_email)
        for item in items:
            order.add_item(item.product_id, item.quantity, item.unit_price)

        violations = order.validate_consistency()
        if violations:
            raise OrderFactoryError(f"Order validation failed: {'; '.join(violations)}")

        return order

    def create_promotional_order(
        self,
        customer_email: str,
        items: list[OrderItem],
        promo_code: str,
        customer_tier: str,
    ) -> Order:
        """Create an order with a validated promotional discount applied.

        Validates the promo code against the customer tier before applying discounts.
        Then delegates to create_order for final validation and construction.
        """
        # Validate promo first (external lookup)
        discount = self._promo.validate(promo_code, customer_tier)
        if not discount:
            raise InvalidPromoCodeError(promo_code, f"Code '{promo_code}' invalid for tier '{customer_tier}'")

        # Apply discount to each item price
        discounted_items = []
        for item in items:
            discounted_price = Money(
                item.unit_price.amount * Decimal(1 - discount.percentage),
                item.unit_price.currency,
            )
            discounted_items.append(OrderItem(item.product_id, item.quantity, discounted_price))

        # Delegate to base factory for consistency validation
        return self.create_order(customer_email, discounted_items)


# ❌ BAD: Constructor with too many optional parameters — silent failure via None defaults
class BadOrderConstruction:
    def __init__(
        self,
        email: str = "",                     # No validation of format
        items: list[dict] | None = None,     # Raw dicts, not domain types
        promo_code: str | None = None,       # Discount logic buried in __init__!
        customer_tier: str | None = None,    # External data needed but no lookup
        gift_wrap: bool = False,             # Another conditional branch
    ) -> None:
        if promo_code and customer_tier == "gold":
            pass  # Discount logic inside constructor — hard to test in isolation

        self.items = items or []              # No validation at all


# ✅ GOOD: Factory with clear construction contract and guaranteed validity
def demonstrate_factory() -> None:
    """Show factory usage — constructs valid aggregates through orchestrated steps."""
    catalog = ProductCatalog()
    promo_service = PromoCodeService()
    factory = DefaultOrderFactory(catalog, promo_service)

    items = [
        OrderItem("SKU-001", 2, Money(Decimal("25.00"), "USD")),
        OrderItem("SKU-002", 1, Money(Decimal("49.99"), "USD")),
    ]

    order = factory.create_order("alice@example.com", items)
    assert order.total.amount > Decimal("0")
    assert len(order.items) == 2
```

**Key principles:**
- Factories guarantee the returned aggregate is fully valid — every factory method either returns a complete aggregate or raises an exception; never return None
- External data lookups (catalog validation, promo code checking) happen in the factory, not in the domain model itself
- Use abstract factory interfaces when construction strategy may vary by bounded context
- Keep factory methods focused on one construction scenario — if you have create_order, create_promotional_order, create_bulk_order, each represents a distinct construction path

---

### Pattern 4: Unit of Work — Transaction Coordination Across Repositories

The Unit of Work (UoW) pattern coordinates transactions across multiple repositories within a single use case. It tracks changes via an identity map and provides atomic commit/rollback semantics. Use UoW when multiple aggregates from different repositories must be persisted as a single atomic operation.

```python
from __future__ import annotations

from collections import defaultdict
from contextlib import contextmanager
from typing import Any, Generic, Protocol, TypeVar


T = TypeVar("T")


class Identifiable(Protocol):
    """Base protocol for entities with a stable identity."""
    id: Any  # type: ignore[misc]


class UnitOfWorkError(Exception):
    """Raised when UoW operations fail."""


class Repository(Protocol[T]):
    """Generic repository protocol. Domain code depends on this, not concrete implementations."""

    def get_by_id(self, entity_id: Any) -> T | None: ...  # type: ignore[misc]
    def save(self, entity: T) -> None: ...
    def delete(self, entity: T) -> None: ...


class UnitOfWork:
    """Coordinates transactions across multiple repositories.

    The UoW tracks changes via an identity map (ensuring one in-memory instance per entity ID)
    and provides atomic commit/rollback semantics. It is designed as a context manager.

    Usage:
        with uow() as unitOfWork:
            account = unitOfWork.repository(AccountRepo).get_by_id(account_id)
            account.withdraw(amount)
            unitOfWork.repository(AccountRepo).save(account)
            unitOfWork.commit()  # or unitOfWork.rollback() on exception
    """

    def __init__(self) -> None:
        self._repositories: dict[type, Repository] = {}
        self._identity_map: dict[str, Identifiable] = {}
        self._committed = False
        self._rollback_requested = False

    def register_repository(self, repo: Repository) -> None:
        """Register a repository with the UoW. Must be called before use."""
        repo_type = type(repo)
        if repo_type in self._repositories:
            raise ValueError(f"Repository {repo_type.__name__} already registered")
        self._repositories[repo_type] = repo

    def repository(self, repo_type: type) -> Repository:
        """Get a registered repository by its type. Raises if not found."""
        if repo_type not in self._repositories:
            raise KeyError(
                f"Repository {repo_type.__name__} not registered with UoW. "
                f"Register it before using."
            )
        return self._repositories[repo_type]

    def get_or_load(self, entity_id: str) -> Identifiable | None:
        """Get an entity from the identity map or load it via its repository.

        This ensures that within a single UoW scope, each entity ID maps to
        exactly one in-memory instance — preventing stale reads and duplicate saves.
        """
        if entity_id in self._identity_map:
            return self._identity_map[entity_id]
        # In production: would need repository type lookup by entity type
        # This is a simplified implementation; real UoWs use type hints for this
        return None

    def register_entity(self, entity: Identifiable) -> None:
        """Register an entity in the identity map."""
        self._identity_map[str(entity.id)] = entity

    def commit(self) -> None:
        """Commit all tracked changes. Each repository's save() is called for changed entities."""
        if self._rollback_requested:
            raise UnitOfWorkError("Cannot commit after rollback was requested")

        for repo in self._repositories.values():
            # In production: iterate over changed entities, not all repos blindly
            pass  # Real implementation tracks which entities were modified

        self._committed = True
        self._identity_map.clear()

    def rollback(self) -> None:
        """Roll back all changes and clear the identity map."""
        self._rollback_requested = True
        self._identity_map.clear()
        self._committed = False

    @contextmanager
    def __call__(self) -> Any:
        """Context manager usage — ensures commit/rollback happens correctly."""
        uow = self.__class__()
        try:
            yield uow
            if not self._committed and not self._rollback_requested:
                uow.commit()
        except Exception:
            uow.rollback()
            raise


# ❌ BAD: No transaction coordination — multiple saves, no rollback on failure
def bad_multi_repo_operation(
    sender_repo: Repository,
    receiver_repo: Repository,
    from_id: Any,
    amount: Money,
) -> None:
    """Multiple repository operations with no atomicity guarantee."""
    sender = sender_repo.get_by_id(from_id)
    sender.withdraw(amount)
    sender_repo.save(sender)  # If this succeeds but next fails — partial state!

    receiver = receiver_repo.get_by_id(receiver_repo)  # Wrong: should be to_id
    receiver.deposit(amount)
    receiver_repo.save(receiver)


# ✅ GOOD: Unit of Work ensures atomic multi-repository operations
def demonstrate_uow() -> None:
    """Show UoW coordinating multiple repository operations."""
    uow = UnitOfWork()

    # Register repositories (in production, these are injected dependencies)
    account_repo: Repository[Account] = DummyAccountRepository()  # type: ignore[name-defined]
    transaction_repo: Repository[Any] = DummyTransactionRepository()  # type: ignore[name-defined]

    uow.register_repository(account_repo)
    uow.register_repository(transaction_repo)

    try:
        sender = account_repo.get_by_id(UUID(hex="a1b2c3d4e5f6" + "0" * 20))
        if sender:
            sender.withdraw(Money(Decimal("50.00"), "USD"))
            account_repo.save(sender)

        # Commit all changes atomically
        uow.commit()
    except Exception as exc:
        print(f"Operation failed, rolled back: {exc}")
```

**Key principles:**
- The UoW must be scoped to a single use case handler — never nest UoWs or share them across handlers
- Use an identity map to ensure one in-memory instance per entity ID within the UoW scope
- Register repositories explicitly — the UoW should not discover repositories by type inspection
- Always commit or roll back — use the context manager pattern to guarantee cleanup

---

## Constraints

### MUST DO
- **Keep Specifications side-effect free** — `is_satisfied_by()` must never modify state, trigger I/O, or call external services. They are pure evaluators; if a rule requires database access, move that logic to the aggregate or domain service instead.
- **Use Domain Services only for cross-aggregate operations** — if a method operates on entities within a single aggregate root, put it in the aggregate. Domain Services are for coordination between aggregates that cannot logically belong to one another.
- **Name Domain Services after business capabilities** — `FundTransferService`, `InventoryReservationService`, not `AccountManager` or `DataProcessor`. The name should communicate what business operation it performs.
- **Guarantee aggregate validity from factories** — every factory method must either return a fully constructed, validated aggregate or raise an exception. Never return None, partial aggregates, or aggregates in an invalid state.
- **Scope Unit of Work to single use case handlers** — each command handler should acquire its own UoW at the top level and never nest UoWs. Nesting causes transaction conflicts and makes rollback semantics unpredictable.
- **Separate commands from queries** — command handlers (write operations) must never perform read queries that cause mutations, and query handlers must never call `save()` or trigger state changes. This separation is critical in CQRS systems.

### MUST NOT DO
- **Put Specifications in infrastructure code** — specifications belong in the domain layer; they express business rules, not technical constraints. Infrastructure repositories may USE specifications as filters, but should not DEFINE them.
- **Let Domain Services access databases directly** — domain services must go through repository interfaces (Protocol or ABC), never call database sessions, ORM objects, or raw SQL queries directly.
- **Create god factories** — a factory with more than 5-6 distinct creation methods is likely trying to do too much. Split by use case or business scenario (e.g., `OrderFactory` for basic orders vs `PromotionalOrderFactory` for special promotions).
- **Use Unit of Work for single-repository operations** — if only one repository participates in a transaction, use its native transaction support directly. UoW adds complexity that provides no benefit for single-repo scenarios.
- **Mutate entity state outside the aggregate root** — even within a UoW scope, domain entities should be mutated through their own methods (`withdraw()`, `deposit()`), not by directly setting attributes from the command handler.

---

## Output Template

When applying this skill, produce:

1. **Specification Objects** — Base `Specification[T]` with AND/OR/NOT composition, plus concrete specifications as frozen dataclasses with `is_satisfied_by()` methods for each business rule
2. **Domain Service Classes** — Cross-aggregate coordination services named after the business capability, with dependency injection via constructor and clear method contracts
3. **Aggregate Factory Implementations** — Factory classes (abstract interface + concrete implementations) that orchestrate complex aggregate construction through multiple validation steps
4. **Unit of Work Implementation** — Context-managed UoW with identity map tracking, repository registration, and atomic commit/rollback semantics
5. **Command Handler Examples** — Write operation handlers showing proper UoW usage, repository access, and transaction boundaries

All code must use Python 3.10+ type hints, docstrings on every public method, and raise descriptive exceptions rather than returning error codes. Follow SOLID principles: each Specification is a single concern (SRP), domain services depend on abstractions (DIP), and specifications compose through extension (OCP).

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD tactical patterns (entities, value objects, aggregates) that this skill's patterns support and build upon |
| `ddd-context-mapping` | Strategic design patterns for bounded context integration — domain services often bridge multiple contexts |
| `cqrs-pattern` | CQRS implementation that pairs well with command handlers and Unit of Work from this skill |
| `event-sourcing-pattern` | Event sourcing uses domain events as the authoritative store — factories and UoW manage event persistence |

---

## Further Reading

- *Domain-Driven Design Distilled* by Vaughn Vernon — practical guide to when and how to apply tactical DDD patterns
- [Specification Pattern](https://martinfowler.com/apspec/) — Martin Fowler's original article defining the specification pattern
- [Unit of Work Pattern](https://martinfowler.com/eaaCatalog/unitOfWork.html) — Fowler's definition and implementation guidance
> 📖 skill(local cache): coding-domain-driven-design, coding-domain-events, coding-cqrs-pattern
