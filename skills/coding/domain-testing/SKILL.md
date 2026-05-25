---
name: domain-testing
description: Verifies DDD domain model correctness through invariant testing of aggregates
  and value objects, specification candidate tests, test double strategies, and domain
  event publishing assertions.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: domain testing, aggregate testing, value object tests, specification patterns,
    ddd unit tests, invariant verification, how do i test domain models, domain layer
    testing
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
  related-skills: domain-driven-design, ddd-tactical-patterns, domain-events
------
# Domain Testing Strategies

Tests DDD domain models to verify invariants hold at construction time, aggregates enforce consistency boundaries, specifications correctly classify candidates, and domain events fire predictably after state transitions. Produces unit tests for value objects, entities, aggregate roots, and domain services with concrete assertion strategies for each pattern.

## TL;DR Checklist

- [ ] Test every value object constructor — valid inputs pass, invalid inputs raise
- [ ] Test aggregate root as a single unit — never test internal entities in isolation
- [ ] For each specification: write one passing candidate test and one failing candidate test
- [ ] Verify domain events are published after mutation, not before, with correct payload data
- [ ] Use stubs for read-only dependencies (repositories returning fixed aggregates), mocks only for side-effect producers (publishers, notification senders)
- [ ] Test invariants at construction time — never test objects that violate invariants because they cannot exist

---

## When to Use

- Writing unit tests for a DDD domain layer with value objects, entities, and aggregate roots
- Verifying that an aggregate enforces its consistency boundary (e.g., order total recalculated after every item change)
- Testing specification implementations against known passing and failing candidates
- Building test suites that verify domain events are published with correct payloads after state mutations
- Setting up test doubles (stubs, mocks) for domain-layer dependencies in a clean architecture

---

## When NOT to Use

- Testing infrastructure layers (database persistence, HTTP clients, message brokers) — use integration tests or separate infrastructure testing skills
- Testing application services that orchestrate multiple aggregates — this is cross-cutting concern testing, not pure domain testing
- Testing presentation/UI layers where domain logic has no presence
- When the codebase uses anemic domain models (plain data carriers with no behavior) — fix the domain model first before writing meaningful tests

---

## Core Workflow

1. **Map Domain Elements to Test Categories** — Identify which elements need which testing strategy: value objects → invariant tests at construction, entities → lifecycle + identity tests, aggregates → whole-unit mutation tests, specifications → passing/failing candidate pairs, domain events → publish-after-mutation verification. **Checkpoint:** Every test must map to exactly one domain element; if a test touches three different aggregates or services, split it.

2. **Write Value Object Tests First** — These are the simplest: construct valid instances, assert equality by value, then construct invalid inputs and assert exceptions. Test edge cases like zero amounts, maximum precision, empty strings for required fields, and currency mismatches. **Checkpoint:** Every public factory method or `__post_init__` validation rule must have at least one test — if a validation branch has no test, the invariant is unverified.

3. **Test Aggregates as Whole Units** — Test every public command (method) on the aggregate root. Assert invariants after each mutation by examining the aggregate's state or published events. Never mock away the aggregate root itself — you are testing its behavior, not isolating it from its children. For methods that span child entities, verify cross-entity consistency (e.g., order total matches sum of item prices). **Checkpoint:** After every method call under test, the aggregate must be in a logically consistent state — either by inspecting internal fields or by verifying published events capture the full state transition.

4. **Write Specification Tests in Pairs** — For each specification class, write two tests: one with an object that must pass and one that must fail. The failing test is equally important — it verifies the rejection logic matches business rules exactly. Use edge cases: boundary values, empty collections, single-element collections, null-or-absent fields. **Checkpoint:** A specification is fully tested when both the positive and negative tests cover every branch in its `is_satisfied_by` method.

5. **Verify Domain Event Publishing** — After a state-changing aggregate method, assert that the correct events were published with the expected data payload. Do not use spies for event publishing unless you need to verify the exact number of publications — stubs or simple list assertions are sufficient. Test both happy-path publishing and error scenarios (what happens if publishing fails mid-stream?). **Checkpoint:** Verify the sequence — state must change first, then events must be recorded. If an event references data not yet mutated, the ordering is wrong.

6. **Select Appropriate Test Doubles** — Use stubs for read-only dependencies (repositories returning pre-constructed aggregates), spies for verifying calls to side-effect producers (event publishers, notification senders), and mocks only when a dependency's return value must be controlled by the test setup. Never mock interfaces that you do not own. **Checkpoint:** Every double must answer one question: "What does this test need from this dependency?" If a double provides more than one behavior, split it.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Value Object Invariant Testing

Value objects are immutable and validate all constraints at construction time. Test every invariant by exercising both valid and invalid paths through the constructor or factory method. Each test must be self-contained — construct the object and assert either success (value equality, attribute access) or failure (specific exception raised).

```python
from __future__ import annotations
from dataclasses import dataclass
from decimal import Decimal
from typing import Final

import pytest


# ── Domain code under test ───────────────────────────────────────────────

@dataclass(frozen=True, slots=True)
class Money:
    """Immutable monetary value. Validates currency is ISO 4217 and amount is non-negative."""
    amount: Decimal
    currency: str

    def __post_init__(self) -> None:
        if self.amount < Decimal("0"):
            raise ValueError(f"Money amount cannot be negative: {self.amount}")
        if len(self.currency) != 3 or not self.currency.isalpha():
            raise ValueError(f"Invalid ISO 4217 currency code: {self.currency!r}")

    def add(self, other: Money) -> Money:
        """Return a new Money with summed amount. Fails on currency mismatch."""
        if self.currency != other.currency:
            raise ValueError(
                f"Currency mismatch: cannot add {other.currency} to {self.currency}"
            )
        return Money(self.amount + other.amount, self.currency)

    def subtract(self, other: Money) -> Money:
        """Return a new Money with the difference. Fails on currency mismatch."""
        if self.currency != other.currency:
            raise ValueError(
                f"Currency mismatch: cannot subtract {other.currency} from {self.currency}"
            )
        return Money(self.amount - other.amount, self.currency)

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Money):
            return NotImplemented
        return self.amount == other.amount and self.currency == other.currency


# ── Tests ────────────────────────────────────────────────────────────────

class TestMoneyInvariants:
    """Every constructor rule must have a test. Validity tests ensure the happy path works;
    invalidity tests prove each guard clause fires independently."""

    def test_valid_usd_amount(self) -> None:
        money = Money(Decimal("99.99"), "USD")
        assert money.amount == Decimal("99.99")
        assert money.currency == "USD"

    def test_zero_amount_is_valid(self) -> None:
        """Zero is a valid amount — it should not trigger the negative check."""
        money = Money(Decimal("0"), "EUR")
        assert money.amount == Decimal("0")

    def test_very_large_amount(self) -> None:
        """Test boundary of large values to catch overflow or precision issues."""
        large = Decimal("999999999.99")
        money = Money(large, "JPY")
        assert money.amount == large

    def test_negative_amount_raises(self) -> None:
        money = Money(Decimal("-1.00"), "USD")
        with pytest.raises(ValueError, match="cannot be negative"):
            Money(Decimal("-0.01"), "USD")

    def test_invalid_currency_length(self) -> None:
        with pytest.raises(ValueError, match="Invalid ISO 4217"):
            Money(Decimal("10"), "US")  # Too short

    def test_invalid_currency_characters(self) -> None:
        with pytest.raises(ValueError, match="Invalid ISO 4217"):
            Money(Decimal("10"), "USD1")  # Contains digit

    def test_equality_by_value_not_identity(self) -> None:
        a = Money(Decimal("50.00"), "USD")
        b = Money(Decimal("50.00"), "USD")
        assert a == b
        assert a is not b  # Different objects, same value

    def test_inequality_on_amount_difference(self) -> None:
        a = Money(Decimal("50.00"), "USD")
        b = Money(Decimal("50.01"), "USD")
        assert a != b

    def test_inequality_on_currency_difference(self) -> None:
        a = Money(Decimal("50.00"), "USD")
        b = Money(Decimal("50.00"), "EUR")
        assert a != b

    def test_add_same_currency_succeeds(self) -> None:
        a = Money(Decimal("10.00"), "USD")
        b = Money(Decimal("25.50"), "USD")
        result = a.add(b)
        assert result == Money(Decimal("35.50"), "USD")

    def test_add_different_currency_raises(self) -> None:
        a = Money(Decimal("10.00"), "USD")
        b = Money(Decimal("25.50"), "EUR")
        with pytest.raises(ValueError, match="Currency mismatch"):
            a.add(b)

    def test_subtract_same_currency_succeeds(self) -> None:
        a = Money(Decimal("100.00"), "USD")
        b = Money(Decimal("25.00"), "USD")
        result = a.subtract(b)
        assert result == Money(Decimal("75.00"), "USD")

    def test_subtract_result_can_be_negative(self) -> None:
        """Subtraction returning negative is allowed — the result constructor validates it."""
        a = Money(Decimal("10.00"), "USD")
        b = Money(Decimal("25.00"), "USD")
        # This should raise because 10 - 25 = -15, which is invalid
        with pytest.raises(ValueError, match="cannot be negative"):
            a.subtract(b)

    def test_immutable_after_creation(self) -> None:
        """Frozen dataclass prevents attribute mutation."""
        money = Money(Decimal("50.00"), "USD")
        with pytest.raises(Exception):  # dataclasses.FrozenInstanceError
            money.amount = Decimal("100.00")
```

**Key principles:**
- Test valid inputs AND invalid inputs — a value object test suite without negative tests is incomplete
- Use `Decimal` for monetary values to avoid floating-point precision issues in assertions
- Each test constructs independently — no shared state, no fixtures that hide bugs
- Assert the exact exception message pattern so you know which guard clause fired

---

### Pattern 2: Aggregate Testing — Whole-Unit Mutation

Aggregates must be tested as complete consistency boundaries. Every public method (command) is a separate test. After each mutation, verify one of two things: (1) the aggregate's internal state reflects the invariant, or (2) published events capture the correct state transition. Never mock the aggregate root — you are testing its behavior, not isolating it from collaborators.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from uuid import UUID, uuid4

import pytest


# ── Domain code under test ───────────────────────────────────────────────

class OrderStatus(Enum):
    DRAFT = auto()
    CONFIRMED = auto()
    CANCELLED = auto()
    SHIPPED = auto()


@dataclass(frozen=True, slots=True)
class OrderItem:
    product_id: str
    quantity: int
    unit_price: float

    @property
    def line_total(self) -> float:
        return self.quantity * self.unit_price

    def __post_init__(self) -> None:
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
        if self.unit_price < 0:
            raise ValueError("Unit price cannot be negative")


class OrderTotalMismatchError(Exception):
    """Raised when recalculated total does not match stored total."""


class Order:
    """Aggregate root for the Order bounded context.

    Invariants:
    - At least one item required before confirmation
    - Total must equal sum of all item line totals at all times
    - Once confirmed, no items may be added or removed
    - A cancelled order cannot be re-confirmed
    """

    def __init__(
        self,
        order_id: UUID,
        customer_email: str,
        publisher: OrderEventPublisher | None = None,
    ) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self._items: list[OrderItem] = []
        self._total: float = 0.0
        self.status: OrderStatus = OrderStatus.DRAFT
        self._publisher = publisher or _NoOpPublisher()

    @property
    def items(self) -> tuple[OrderItem, ...]:
        return tuple(self._items)

    @property
    def total(self) -> float:
        return self._total

    def add_item(
        self, product_id: str, quantity: int, unit_price: float
    ) -> None:
        """Add an item to the order. Only allowed in DRAFT status."""
        if self.status != OrderStatus.DRAFT:
            raise RuntimeError(
                f"Cannot add items to {self.status.name} order {self.order_id}"
            )
        item = OrderItem(product_id, quantity, unit_price)
        self._items.append(item)
        self._recalculate_total()

    def remove_item(self, product_id: str) -> None:
        """Remove an item from the order by product ID. Only allowed in DRAFT status."""
        if self.status != OrderStatus.DRAFT:
            raise RuntimeError(
                f"Cannot remove items from {self.status.name} order {self.order_id}"
            )
        original_count = len(self._items)
        self._items = [i for i in self._items if i.product_id != product_id]
        if len(self._items) == original_count:
            raise ValueError(f"No item with product_id {product_id} found")
        if not self._items:
            raise RuntimeError("Order must have at least one item")
        self._recalculate_total()

    def confirm(self) -> None:
        """Confirm the order. Requires at least one item."""
        if self.status != OrderStatus.DRAFT:
            raise RuntimeError(
                f"Cannot confirm order in {self.status.name} state"
            )
        if not self._items:
            raise RuntimeError("Cannot confirm order with no items")
        previous_status = self.status
        self.status = OrderStatus.CONFIRMED
        self._publisher.publish_order_confirmed(
            order_id=self.order_id,
            customer_email=self.customer_email,
            item_count=len(self._items),
            total_amount=self._total,
        )

    def cancel(self) -> None:
        """Cancel the order. Cannot cancel an already cancelled order."""
        if self.status == OrderStatus.CANCELLED:
            raise RuntimeError("Order is already cancelled")
        previous_status = self.status
        self.status = OrderStatus.CANCELLED
        self._publisher.publish_order_cancelled(
            order_id=self.order_id,
            reason=f"Cancelled from {previous_status.name}",
        )

    def ship(self) -> None:
        """Mark as shipped. Only confirmed orders can be shipped."""
        if self.status != OrderStatus.CONFIRMED:
            raise RuntimeError(f"Cannot ship order in {self.status.name} state")
        self.status = OrderStatus.SHIPPED
        self._publisher.publish_order_shipped(order_id=self.order_id)

    def _recalculate_total(self) -> None:
        """Recalculate total from items. Internal method — always kept in sync."""
        self._total = sum(item.line_total for item in self._items)


class OrderEventPublisher:
    """Interface for publishing order events."""

    def publish_order_confirmed(
        self, order_id: UUID, customer_email: str, item_count: int, total_amount: float
    ) -> None: ...

    def publish_order_cancelled(self, order_id: UUID, reason: str) -> None: ...

    def publish_order_shipped(self, order_id: UUID) -> None: ...


class _NoOpPublisher(OrderEventPublisher):
    """Do-nothing publisher used when no event handling is needed."""

    def publish_order_confirmed(
        self, order_id: UUID, customer_email: str, item_count: int, total_amount: float
    ) -> None:
        pass

    def publish_order_cancelled(self, order_id: UUID, reason: str) -> None:
        pass

    def publish_order_shipped(self, order_id: UUID) -> None:
        pass


# ── Tests using a recording publisher to verify events ───────────────────

@dataclass
class _RecordingPublisher(OrderEventPublisher):
    """Captures all published events for test assertions."""
    events: list[dict] = field(default_factory=list)

    def publish_order_confirmed(
        self, order_id: UUID, customer_email: str, item_count: int, total_amount: float
    ) -> None:
        self.events.append({
            "type": "confirmed",
            "order_id": order_id,
            "customer_email": customer_email,
            "item_count": item_count,
            "total_amount": total_amount,
        })

    def publish_order_cancelled(self, order_id: UUID, reason: str) -> None:
        self.events.append({
            "type": "cancelled",
            "order_id": order_id,
            "reason": reason,
        })

    def publish_order_shipped(self, order_id: UUID) -> None:
        self.events.append({"type": "shipped", "order_id": order_id})


class TestOrderAggregate:
    """Tests for the Order aggregate root.

    Each test exercises one public command and verifies either:
    - The aggregate's state invariant holds after mutation
    - The correct events were published with correct payloads
    """

    def _make_order(
        self,
    ) -> tuple[Order, _RecordingPublisher]:
        """Factory helper — returns order with recording publisher."""
        pub = _RecordingPublisher()
        order = Order(uuid4(), "customer@example.com", pub)
        return order, pub

    # ── add_item tests ──────────────────────────────────────────────────

    def test_add_item_sets_total(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 2, 25.00)
        assert len(order.items) == 1
        assert order.total == 50.00

    def test_add_multiple_items_accumulates_total(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 2, 25.00)
        order.add_item("PROD-002", 3, 10.00)
        assert order.total == 80.00  # (2*25) + (3*10)

    def test_add_item_on_confirmed_order_raises(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        order.confirm()
        with pytest.raises(RuntimeError, match="Cannot add items"):
            order.add_item("PROD-002", 1, 20.00)

    def test_add_item_with_invalid_quantity_raises(self) -> None:
        order, _ = self._make_order()
        with pytest.raises(ValueError, match="Quantity must be positive"):
            order.add_item("PROD-001", 0, 10.00)

    # ── remove_item tests ───────────────────────────────────────────────

    def test_remove_item_updates_total(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 2, 25.00)
        order.add_item("PROD-002", 3, 10.00)
        order.remove_item("PROD-001")
        assert len(order.items) == 1
        assert order.total == 30.00

    def test_remove_item_when_none_exists_raises(self) -> None:
        order, _ = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        with pytest.raises(ValueError, match="No item with product_id"):
            order.remove_item("NONEXISTENT")

    def test_remove_last_item_raises(self) -> None:
        order, _ = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        with pytest.raises(RuntimeError, match="must have at least one item"):
            order.remove_item("PROD-001")

    # ── confirm tests ───────────────────────────────────────────────────

    def test_confirm_publishes_event_with_correct_payload(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 2, 25.00)
        order.confirm()
        assert order.status == OrderStatus.CONFIRMED
        assert len(pub.events) == 1
        event = pub.events[0]
        assert event["type"] == "confirmed"
        assert event["item_count"] == 1
        assert event["total_amount"] == 50.00
        assert event["customer_email"] == "customer@example.com"

    def test_confirm_empty_order_raises(self) -> None:
        order, pub = self._make_order()
        with pytest.raises(RuntimeError, match="no items"):
            order.confirm()
        assert len(pub.events) == 0  # No events should publish on failure

    def test_confirm_already_confirmed_order_raises(self) -> None:
        order, _ = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        order.confirm()
        with pytest.raises(RuntimeError, match="Cannot confirm"):
            order.confirm()

    def test_cancel_publishes_event(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        order.cancel()
        assert order.status == OrderStatus.CANCELLED
        assert len(pub.events) == 1
        assert pub.events[0]["type"] == "cancelled"

    def test_cancel_already_cancelled_raises(self) -> None:
        order, _ = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        order.cancel()
        with pytest.raises(RuntimeError, match="already cancelled"):
            order.cancel()

    def test_ship_confirmed_order_publishes_event(self) -> None:
        order, pub = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        order.confirm()
        order.ship()
        assert order.status == OrderStatus.SHIPPED
        assert len(pub.events) == 2
        assert pub.events[0]["type"] == "confirmed"
        assert pub.events[1]["type"] == "shipped"

    def test_cancelled_order_cannot_be_shipped(self) -> None:
        order, _ = self._make_order()
        order.add_item("PROD-001", 1, 10.00)
        order.cancel()
        with pytest.raises(RuntimeError, match="Cannot ship"):
            order.ship()

    def test_items_are_immutable_tuple(self) -> None:
        """Items property returns a tuple, preventing external mutation."""
        order, _ = self._make_order()
        order.add_item("PROD-001", 2, 25.00)
        with pytest.raises(TypeError):
            order.items[0].quantity = 999
```

**Key principles:**
- Test each public command in isolation — one mutation per test, one assertion group per test
- Use a recording publisher to verify events — it's a simple stub, not a complex mock framework
- Always test failure paths (wrong status, empty collections, invalid inputs)
- Verify event sequence when multiple commands are chained (confirm → ship should produce two events in order)

---

### Pattern 3: Specification Testing — Passing and Failing Candidate Pairs

Specifications define business rules as reusable predicates. Each specification must have at least two tests: one candidate that satisfies the rule, and one that does not. Edge cases go in the failing test — boundary values, empty collections, null/missing fields, zero quantities.

```python
from __future__ import annotations
from dataclasses import dataclass


# ── Domain code under test ───────────────────────────────────────────────

@dataclass(frozen=True)
class OrderForShipping:
    """Read-only view of an order for specification testing."""
    status: str
    item_count: int
    total: float
    has_tracking: bool = False


class LargeOrderSpecification:
    """Orders with total >= $500 require additional review before shipping.

    A "large order" satisfies the specification when total_amount >= 500.00.
    Orders below this threshold do not satisfy it.
    """

    def __init__(self, threshold: float = 500.00) -> None:
        self._threshold = threshold

    def is_satisfied_by(self, candidate: OrderForShipping) -> bool:
        return candidate.total >= self._threshold


class ValidOrderSpecification:
    """An order can be shipped only if it has at least one item and
    a total greater than zero."""

    def is_satisfied_by(self, candidate: OrderForShipping) -> bool:
        if candidate.item_count <= 0:
            return False
        if candidate.total <= 0:
            return False
        return True


class EligibleForExpressSpecification:
    """An order is eligible for express shipping if it has tracking
    information, at least one item, and total is between $10 and $1000."""

    def is_satisfied_by(self, candidate: OrderForShipping) -> bool:
        if not candidate.has_tracking:
            return False
        if candidate.item_count < 1:
            return False
        if candidate.total < 10.00 or candidate.total > 1000.00:
            return False
        return True


# ── Tests ────────────────────────────────────────────────────────────────

class TestLargeOrderSpecification:
    """Each specification test needs a passing AND a failing candidate."""

    def test_passing_candidate_total_equals_threshold(self) -> None:
        spec = LargeOrderSpecification(threshold=500.00)
        order = OrderForShipping(
            status="CONFIRMED", item_count=3, total=500.00
        )
        assert spec.is_satisfied_by(order) is True

    def test_passing_candidate_above_threshold(self) -> None:
        spec = LargeOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=1200.00
        )
        assert spec.is_satisfied_by(order) is True

    def test_failing_candidate_below_threshold(self) -> None:
        spec = LargeOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=499.99
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_zero_total(self) -> None:
        spec = LargeOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=0.00
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_single_penny_below(self) -> None:
        """Boundary edge case — one cent below threshold should fail."""
        spec = LargeOrderSpecification(threshold=500.00)
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=499.99
        )
        assert spec.is_satisfied_by(order) is False


class TestValidOrderSpecification:
    def test_passing_candidate_normal_order(self) -> None:
        spec = ValidOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=2, total=75.00
        )
        assert spec.is_satisfied_by(order) is True

    def test_failing_candidate_no_items(self) -> None:
        spec = ValidOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=0, total=0.00
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_zero_total_with_items(self) -> None:
        """Items exist but total is zero — not a valid order to ship."""
        spec = ValidOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=0.00
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_single_item_minimal_total(self) -> None:
        spec = ValidOrderSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=0.01
        )
        assert spec.is_satisfied_by(order) is True  # Valid — has items and positive total


class TestEligibleForExpressSpecification:
    def test_passing_candidate_within_range(self) -> None:
        spec = EligibleForExpressSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=500.00, has_tracking=True
        )
        assert spec.is_satisfied_by(order) is True

    def test_passing_candidate_exact_lower_boundary(self) -> None:
        spec = EligibleForExpressSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=10.00, has_tracking=True
        )
        assert spec.is_satisfied_by(order) is True

    def test_failing_candidate_no_tracking(self) -> None:
        spec = EligibleForExpressSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=500.00, has_tracking=False
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_over_upper_limit(self) -> None:
        spec = EligibleForExpressSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=1000.01, has_tracking=True
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_below_lower_limit(self) -> None:
        spec = EligibleForExpressSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=1, total=9.99, has_tracking=True
        )
        assert spec.is_satisfied_by(order) is False

    def test_failing_candidate_multiple_conditions_fail(self) -> None:
        """When multiple conditions are violated, the specification still returns False."""
        spec = EligibleForExpressSpecification()
        order = OrderForShipping(
            status="CONFIRMED", item_count=0, total=5.00, has_tracking=False
        )
        assert spec.is_satisfied_by(order) is False
```

**Key principles:**
- Always write both a passing and a failing test per specification — the failing test catches logic errors in rejection paths
- Test boundary values explicitly: threshold equals, one cent below, zero, single item
- For multi-condition specifications, test each condition independently with failing candidates before testing combined failures

---

### Pattern 4: Domain Event Testing — Publish After Mutation

Domain events must be verified to fire after state changes, not before. Use a recording publisher (stub) to capture events and assert both timing (order of mutations vs. events) and payload accuracy. Test the happy path and the failure path (what happens if an event fails to publish?).

```python
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

import pytest


# ── Domain code under test ───────────────────────────────────────────────

@dataclass(frozen=True)
class OrderCreatedEvent:
    order_id: UUID
    customer_email: str
    item_count: int
    total_amount: float
    created_at: datetime = field(default_factory=datetime.now)


@dataclass(frozen=True)
class OrderCancelledEvent:
    order_id: UUID
    reason: str
    cancelled_at: datetime = field(default_factory=datetime.now)


@dataclass
class InMemoryEventStore:
    """In-memory store that records all published events for test assertions."""
    events: list[object] = field(default_factory=list)

    def record(self, event: object) -> None:
        self.events.append(event)

    def clear(self) -> None:
        self.events.clear()

    @property
    def created_events(self) -> list[OrderCreatedEvent]:
        return [e for e in self.events if isinstance(e, OrderCreatedEvent)]

    @property
    def cancelled_events(self) -> list[OrderCancelledEvent]:
        return [e for e in self.events if isinstance(e, OrderCancelledEvent)]


class SimpleOrder:
    """Minimal order that publishes events through a store."""

    def __init__(self, order_id: UUID, customer_email: str, store: InMemoryEventStore) -> None:
        self.order_id = order_id
        self.customer_email = customer_email
        self.status: str = "DRAFT"
        self._store = store

    def confirm(self) -> None:
        if self.status != "DRAFT":
            raise RuntimeError("Order not in draft state")
        # State change FIRST
        self.status = "CONFIRMED"
        # THEN publish event
        self._store.record(OrderCreatedEvent(
            order_id=self.order_id,
            customer_email=self.customer_email,
            item_count=1,
            total_amount=99.99,
        ))

    def cancel(self, reason: str) -> None:
        if self.status == "CANCELLED":
            raise RuntimeError("Already cancelled")
        # State change FIRST
        self.status = "CANCELLED"
        # THEN publish event
        self._store.record(OrderCancelledEvent(
            order_id=self.order_id,
            reason=reason,
        ))


# ── Tests ────────────────────────────────────────────────────────────────

class TestOrderEventPublishing:
    """Verifies events are published AFTER state mutations and contain correct data."""

    def test_event_published_after_status_change(self) -> None:
        store = InMemoryEventStore()
        order = SimpleOrder(UUID("11111111-0000-0000-0000-000000000001"), "a@b.com", store)

        order.confirm()

        # State changed first, then event recorded
        assert order.status == "CONFIRMED"
        assert len(store.created_events) == 1

    def test_event_payload_contains_all_required_data(self) -> None:
        store = InMemoryEventStore()
        order_id = UUID("22222222-0000-0000-0000-000000000002")
        email = "buyer@example.com"
        order = SimpleOrder(order_id, email, store)

        order.confirm()

        event = store.created_events[0]
        assert event.order_id == order_id
        assert event.customer_email == email
        assert event.item_count == 1
        assert event.total_amount == 99.99

    def test_cancel_publishes_correct_event(self) -> None:
        store = InMemoryEventStore()
        order_id = UUID("33333333-0000-0000-0000-000000000003")
        order = SimpleOrder(order_id, "buyer@test.com", store)
        order.confirm()

        order.cancel(reason="Customer requested cancellation")

        assert order.status == "CANCELLED"
        assert len(store.cancelled_events) == 1
        assert store.cancelled_events[0].reason == "Customer requested cancellation"

    def test_no_events_published_on_failed_mutation(self) -> None:
        """If a mutation raises an exception, no events should be recorded."""
        store = InMemoryEventStore()
        order = SimpleOrder(UUID("44444444-0000-0000-0000-000000000004"), "a@b.com", store)

        with pytest.raises(RuntimeError, match="not in draft"):
            order.cancel(reason="early cancel")

        assert len(store.created_events) == 0
        assert len(store.cancelled_events) == 0

    def test_duplicate_cancel_raises_without_publishing(self) -> None:
        store = InMemoryEventStore()
        order = SimpleOrder(UUID("55555555-0000-0000-0000-000000000005"), "a@b.com", store)
        order.confirm()

        order.cancel("first reason")
        initial_count = len(store.cancelled_events)

        with pytest.raises(RuntimeError, match="Already cancelled"):
            order.cancel("second reason")

        # Event count should not increase on the failed call
        assert len(store.cancelled_events) == initial_count
```

**Key principles:**
- Always test the ordering: state change must happen before event recording
- Test that failed mutations do NOT produce events (the guard clause fires before either mutation or publishing)
- Use an in-memory store as a stub — it's simpler than mocking frameworks and fully transparent for inspection
- Assert all fields of published events, not just their count

---

### Pattern 5: Test Double Selection Strategy for DDD

Choosing the right test double type is critical in DDD testing. The wrong choice leads to tests that pass but don't verify behavior. Use this decision guide:

| Dependency Type | Use | Why | Example |
|---|---|---|---|
| Read-only (returns data) | **Stub** | Test needs fixed return values, no verification needed | Repository returning a pre-constructed aggregate |
| Side-effect only (no return value) | **Spy** | Test needs to verify the call happened with correct arguments | Event publisher, notification sender |
| Behavior-controllable | **Mock** | Test setup must determine what the dependency returns | External pricing service returning different rates |
| Owned interface (your code) | **Real implementation** | Never mock interfaces you own — test the real behavior | Specification implementations, value objects |

```python
from __future__ import annotations
from dataclasses import dataclass, field
from uuid import UUID


# ── Domain code under test ───────────────────────────────────────────────

class ProductRepository:
    """Interface for loading products. In production, this talks to a database."""
    def get(self, product_id: UUID) -> Product | None: ...


@dataclass(frozen=True)
class Product:
    product_id: UUID
    name: str
    price: float
    in_stock: bool = True


class OrderPlacingService:
    """Application service that uses a repository and publishes events.

    In production, this depends on a real ProductRepository and a real EventPublisher.
    In tests, we inject controlled doubles.
    """

    def __init__(
        self,
        product_repo: ProductRepository,
        event_publisher: object,
    ) -> None:
        self._product_repo = product_repo
        self._event_publisher = event_publisher

    def place_order(self, customer_id: UUID, product_id: UUID) -> dict:
        """Place an order for a single product.

        Returns a result dict or raises if the product is not found or out of stock.
        Publishes OrderPlacedEvent on success.
        """
        product = self._product_repo.get(product_id)
        if product is None:
            raise ValueError(f"Product {product_id} not found")
        if not product.in_stock:
            raise RuntimeError(f"Product {product.name} is out of stock")

        # Publish event — we only verify this was called, not the internal implementation
        if hasattr(self._event_publisher, "publish"):
            self._event_publisher.publish("OrderPlaced", {
                "customer_id": customer_id,
                "product_id": product_id,
                "product_name": product.name,
                "price": product.price,
            })

        return {
            "status": "placed",
            "product": product.name,
            "price": product.price,
        }


# ── Test doubles ─────────────────────────────────────────────────────────

class ProductNotFound:
    """Stub repository that returns None for any product_id — simulates DB miss."""
    def get(self, product_id: UUID) -> None:
        return None  # type: ignore


class InStockProduct:
    """Stub repository that returns a known in-stock product."""
    def __init__(self, product: Product = None) -> None:
        self._product = product or Product(
            UUID("aaaaaaaa-0000-0000-0000-000000000001"),
            "Widget", 29.99,
            in_stock=True,
        )

    def get(self, product_id: UUID) -> Product:
        return self._product


class OutOfStockProduct:
    """Stub repository that returns a product marked out of stock."""
    def __init__(self, product: Product = None) -> None:
        self._product = product or Product(
            UUID("bbbbbbbb-0000-0000-0000-000000000002"),
            "Gadget", 49.99,
            in_stock=False,
        )

    def get(self, product_id: UUID) -> Product:
        return self._product


class EventSpy:
    """Spy that records all publish calls for test verification."""
    calls: list[tuple[str, dict]] = field(default_factory=list)

    def publish(self, event_name: str, payload: dict) -> None:
        self.calls.append((event_name, payload))


# ── Tests demonstrating double selection ─────────────────────────────────

class TestOrderPlacingServiceDoubles:
    """Demonstrates correct test double selection for each dependency type."""

    def test_product_not_found_uses_stub(self) -> None:
        """Stub: we need the repo to return a specific value (None), no verification."""
        service = OrderPlacingService(
            product_repo=ProductNotFound(),
            event_publisher=EventSpy(),  # Publisher shouldn't be called, spy records nothing
        )

        with pytest.raises(ValueError, match="not found"):
            service.place_order(UUID("cccccccc-0000-0000-0000-000000000003"), UUID("deadbeef-0000-0000-0000-000000000001"))

    def test_out_of_stock_uses_stub(self) -> None:
        """Stub: we need the repo to return an out-of-stock product."""
        service = OrderPlacingService(
            product_repo=OutOfStockProduct(),
            event_publisher=EventSpy(),
        )

        with pytest.raises(RuntimeError, match="out of stock"):
            service.place_order(UUID("cccccccc-0000-0000-0000-000000000003"), UUID("deadbeef-0000-0000-0000-000000000001"))

    def test_successful_order_verifies_event_spy(self) -> None:
        """Spy: we need to verify the publisher was called with correct arguments."""
        spy = EventSpy()
        service = OrderPlacingService(
            product_repo=InStockProduct(),
            event_publisher=spy,
        )

        result = service.place_order(
            UUID("cccccccc-0000-0000-0000-000000000003"),
            UUID("aaaaaaaa-0000-0000-0000-000000000001"),
        )

        assert result["status"] == "placed"
        assert len(spy.calls) == 1
        event_name, payload = spy.calls[0]
        assert event_name == "OrderPlaced"
        assert payload["product_name"] == "Widget"
        assert payload["price"] == 29.99
```

**Key principles:**
- Stubs answer questions ("what data do I return?"), spies remember what happened ("was I called?"), mocks control behavior AND verify interactions
- For DDD testing, stubs and spies cover 90% of cases — reserve mocks for external service dependencies you cannot replace with simple stubs
- Never mock interfaces defined in your own domain layer — test the real implementation instead

---

## Constraints

### MUST DO
- Test value objects by constructing both valid and invalid instances — every guard clause must have a negative test
- Test aggregates as whole units — never mock away internal entities or child collections
- Write specification tests in pairs: one passing candidate, one failing candidate per specification
- Use recording stubs (simple data classes that capture calls/data) instead of complex mocking frameworks
- Verify event publishing happens AFTER state mutation, not before — check the ordering with a timestamp or event log
- Test failure paths explicitly — if a method raises an exception for a specific condition, write a test that asserts that exact exception

### MUST NOT DO
- Mock aggregate roots themselves — you are testing their behavior, not isolating them from collaborators
- Use generic "it should work" tests with no specific assertions — every test must verify at least one invariant or event
- Test internal methods (prefixed with `_`) directly — only test public commands through the aggregate's public interface
- Create test fixtures that share mutable state between tests — each test constructs its own domain objects
- Use `assert True` or empty test bodies as placeholders — every test must make a real assertion
- Mock repositories that you own — stub them with simple classes instead of using unittest.mock.Mock

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Core DDD patterns — value objects, entities, aggregates, bounded contexts |
| `ddd-tactical-patterns` | Supporting patterns — specifications, domain services, factories |
| `domain-events` | Domain event definitions, publishing, handling, and idempotency strategies |

---

## Live References

> Authoritative documentation links for DDD testing patterns.

- [Pytest Documentation](https://docs.pytest.org/) — Python testing framework reference
- [pytest-datafiles](https://github.com/vreinsberg/pytest-datafiles) — Data-driven testing with pytest for specification candidates
- [Martin Fowler: Test Double](http://martinfowler.com/bliki/TestDouble.html) — Comprehensive guide to stubs, mocks, and spies
