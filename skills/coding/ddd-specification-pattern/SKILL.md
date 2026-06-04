---




name: ddd-specification-pattern
description: Implements the DDD specification pattern — composable business rule objects using AND/OR/NOT boolean algebra, expression tree translation for ORM query pushdown, domain validation specs, protocol-based contracts, and reusable primitive factories for rich domain modeling in Python.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, do-dont, examples]
  triggers: specification pattern, spec pattern, composable business rules, AND OR NOT composition, expression tree translation, repository filtering specs, domain validation specs, how do i compose business rules in DDD
  related-skills: ddd-tactical-patterns,domain-driven-tactical,domain-repository-pattern,ddd-command-pattern,microservice-contract-testing
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




---





# Specification Pattern for DDD

Implements the specification pattern as a composable business rule system within Domain-Driven Design. This skill covers primitive specifications, boolean algebra composition (AND/OR/NOT), expression tree translation for ORM query pushdown, protocol-based type contracts, domain validation specs with error reporting, and reusable primitive factories. The key differentiator from simple validators is **composability** — combining specs via operator overloading to build complex rules from simple parts without modifying existing code.

## TL;DR Checklist

- [ ] Base specification defines `is_satisfied_by()` and `description`
- [ ] Operator overloading: `__and__`, `__or__`, `__invert__` for boolean composition
- [ ] Primitive specs check exactly one business rule — never combine multiple concerns
- [ ] Expression tree translation converts composed specs into ORM query filters
- [ ] Protocol-based contracts accept any structurally-compatible spec implementation
- [ ] Domain validation specs return descriptive error messages, not just True/False
- [ ] Spec translator lives in infrastructure layer — domain specs must NOT import ORMs

---

## When to Use

Use this skill when:

- Building composable business rules that combine via AND/OR/NOT boolean algebra
- Filtering repositories by complex, dynamic criteria without hardcoding if/else chains
- Validating aggregate state before mutations using declarative rule specifications
- Needing reusable, independently-testable business rule objects across multiple aggregates
- Implementing CQRS read-side projections with dynamic query composition

---

## When NOT to Use

Avoid this skill for:

- Simple validation that only needs one or two conditions — if/else is more readable than spec objects for trivial cases
- ORM-specific query building without composable requirements — use native query builders directly
- Performance-critical paths where expression tree translation adds unnecessary overhead — evaluate specs in-memory with compiled lambdas instead
- Testing infrastructure concerns like database connectivity, network latency, or deployment health

---

## Core Workflow

1. **Define the Specification Base** — Create an ABC or Protocol that defines `is_satisfied_by(candidate: T) -> bool`, a human-readable `description` string, and optional `errors` dict for validation contexts. Operator overloading (`__and__`, `__or__`, `__invert__`) enables boolean composition. **Checkpoint:** Every spec must be pure — no side effects during evaluation. Mutation breaks composability.

2. **Implement Primitive Specifications** — Create leaf specs that check exactly one business rule: `HasPositiveBalance`, `IsNotFrozen`, `MeetsMinimumAmount`. Each should have a descriptive name and documentation string. **Checkpoint:** If a spec checks more than one condition, split it into primitives and compose them with AND/OR operators.

3. **Compose Complex Rules** — Combine primitives using bitwise operators (`&`, `|`, `~`). Store composites in named classes or constants for reuse: `class EligibleForLoan: ACTIVE & POSITIVE_BALANCE & ~FROZEN`. **Checkpoint:** Named composite specs are more readable than inline compositions at call sites and can be independently documented.

4. **Add Expression Tree Translation** — For repository filtering, translate specification trees into ORM query filters (SQLAlchemy, Django ORM). This requires converting the spec tree to `PredicateNode` objects and mapping leaf predicates to column comparisons. **Checkpoint:** The translator lives in the infrastructure layer — domain specs must never import SQLAlchemy or any persistence technology.

5. **Implement Protocol-Based Contracts** — Use `Protocol[T]` for structural typing so any class with a matching `is_satisfied_by()` method satisfies the spec interface without explicit inheritance. This enables plugin architectures and duck-typed filtering services. **Checkpoint:** Protocol-based contracts make specs interchangeable regardless of their base class hierarchy.

6. **Build Primitive Factory Pattern** — Create parameterized generic specs via factory methods (`Primitives.equals("status", "active")`, `Primitives.in_range("balance", 0, 1_000_000)`). This avoids defining new classes for every field-comparison combination and reduces boilerplate. **Checkpoint:** Factory-created specs carry descriptions generated from their parameters for better error reporting.

---

## Implementation Patterns

### Pattern 1: Base Specification with Boolean Composition

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, TypeVar, Any


T = TypeVar("T")


class Specification(ABC, Generic[T]):
    """Base specification class for DDD business rules.

    Specifications encapsulate a single business rule as an object with:
    - A human-readable description
    - An is_satisfied_by() evaluation method
    - Boolean composition via operator overloading (& | ~)

    The key insight: composability distinguishes specifications from simple
    validators. Complex rules are built by combining primitives, not by
    writing nested if/else chains.
    """

    description: str = "No description provided."
    errors: dict[str, str] = {}

    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool: ...

    # --- Boolean composition via operator overloading ---

    def __and__(self: "Specification[T]", other: "Specification[T]") -> "AndSpecification[T]":
        return AndSpecification(self, other)

    def __or__(self: "Specification[T]", other: "Specification[T]") -> "OrSpecification[T]":
        return OrSpecification(self, other)

    def __invert__(self) -> "NotSpecification[T]":
        return NotSpecification(self)

    # Callable shorthand for quick evaluation
    def __call__(self, candidate: T) -> bool:
        return self.is_satisfied_by(candidate)


class AndSpecification(Specification[T]):
    """Composite spec: satisfied if BOTH child specs are satisfied."""

    description: str = "AND composition of specifications"

    def __init__(self, left: Specification[T], right: Specification[T]) -> None:
        self.left = left
        self.right = right

    def is_satisfied_by(self, candidate: T) -> bool:
        if not self.left.is_satisfied_by(candidate):
            return False  # Short-circuit evaluation
        return self.right.is_satisfied_by(candidate)

    @property
    def description(self) -> str:
        return f"({self.left.description} AND {self.right.description})"


class OrSpecification(Specification[T]):
    """Composite spec: satisfied if EITHER child spec is satisfied."""

    description: str = "OR composition of specifications"

    def __init__(self, left: Specification[T], right: Specification[T]) -> None:
        self.left = left
        self.right = right

    def is_satisfied_by(self, candidate: T) -> bool:
        if self.left.is_satisfied_by(candidate):
            return True  # Short-circuit evaluation
        return self.right.is_satisfied_by(candidate)

    @property
    def description(self) -> str:
        return f"({self.left.description} OR {self.right.description})"


class NotSpecification(Specification[T]):
    """Composite spec: satisfied when child spec is NOT satisfied."""

    description: str = "NOT composition of specification"

    def __init__(self, spec: Specification[T]) -> None:
        self.spec = spec

    def is_satisfied_by(self, candidate: T) -> bool:
        return not self.spec.is_satisfied_by(candidate)

    @property
    def description(self) -> str:
        return f"(NOT {self.spec.description})"


# --- Usage example with domain entities ---

class Account:
    def __init__(self, balance: float, is_frozen: bool, status: str) -> None:
        self.balance = balance
        self.is_frozen = is_frozen
        self.status = status


class HasPositiveBalance(Specification[Account]):
    description = "Account must have a positive balance."

    def is_satisfied_by(self, account: Account) -> bool:
        return account.balance > 0


class IsNotFrozen(Specification[Account]):
    description = "Account must not be frozen."

    def is_satisfied_by(self, account: Account) -> bool:
        return not account.is_frozen


class MeetsMinimumBalance(Specification[Account]):
    description = "Account balance must meet minimum threshold."

    def __init__(self, minimum: float) -> None:
        self.minimum = minimum

    def is_satisfied_by(self, account: Account) -> bool:
        return account.balance >= self.minimum


# Composition using bitwise operators
eligible_for_loan: Specification[Account] = (
    HasPositiveBalance() & IsNotFrozen() & MeetsMinimumBalance(100.0)
)

frozen_accounts_excluded: Specification[Account] = Specification.__invert__(HasPositiveBalance())  # ~IsFrozen pattern
active_and_eligible: Specification[Account] = (
    MeetsMinimumBalance(100.0) & ~IsNotFrozen() | HasPositiveBalance()
)

# Verify composition
account_good = Account(balance=500.0, is_frozen=False, status="active")
account_bad = Account(balance=-50.0, is_frozen=True, status="suspended")

assert eligible_for_loan.is_satisfied_by(account_good)   # True
assert not eligible_for_loan.is_satisfied_by(account_bad)  # False
```

### Pattern 2: Domain Validation Specifications with Error Reporting

```python
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Optional


@dataclass
class Trade:
    symbol: str
    quantity: int
    price: float
    side: str  # "BUY" or "SELL"
    status: str = "PENDING"
    approved_at: Optional[date] = None


@dataclass
class ValidationError:
    rule_name: str
    description: str
    candidate_value: Any | None = None


class SpecificationWithErrors(Specification[T]):
    """Specification that tracks validation errors instead of returning boolean only."""

    def validate(self, candidate: T) -> tuple[bool, list[ValidationError]]:
        """Return (is_valid, list_of_errors).

        Evaluates each composite spec in the tree and collects all failing rules.
        Used by domain services before allowing state mutations.
        """
        errors = self._collect_errors(candidate, [])
        return len(errors) == 0, errors

    def _collect_errors(self, candidate: T, path: list[str]) -> list[ValidationError]:
        raise NotImplementedError  # Implemented by each composite type


class AndSpecificationWithErrors(SpecificationWithErrors[T]):
    """AND composition that collects errors from ALL failing branches."""

    def __init__(self, left: SpecificationWithErrors[T], right: SpecificationWithErrors[T]) -> None:
        self.left = left
        self.right = right
        self.description = f"({left.description} AND {right.description})"

    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) and self.right.is_satisfied_by(candidate)

    def _collect_errors(self, candidate: T, path: list[str]) -> list[ValidationError]:
        errors = []
        if not self.left.is_satisfied_by(candidate):
            left_errors = self.left._collect_errors(candidate, path + ["LEFT"])
            errors.extend(left_errors)
        if not self.right.is_satisfied_by(candidate):
            right_errors = self.right._collect_errors(candidate, path + ["RIGHT"])
            errors.extend(right_errors)
        return errors


class OrSpecificationWithErrors(SpecificationWithErrors[T]):
    """OR composition that collects errors from the failing branch."""

    def __init__(self, left: SpecificationWithErrors[T], right: SpecificationWithErrors[T]) -> None:
        self.left = left
        self.right = right
        self.description = f"({left.description} OR {right.description})"

    def is_satisfied_by(self, candidate: T) -> bool:
        return self.left.is_satisfied_by(candidate) or self.right.is_satisfied_by(candidate)

    def _collect_errors(self, candidate: T, path: list[str]) -> list[ValidationError]:
        if self.left.is_satisfied_by(candidate):
            # Left satisfied — only collect errors from right (the failing branch)
            return self.right._collect_errors(candidate, path + ["RIGHT"])
        if self.right.is_satisfied_by(candidate):
            return self.left._collect_errors(candidate, path + ["LEFT"])
        # Neither satisfied — collect from both
        return (
            self.left._collect_errors(candidate, path + ["LEFT"])
            + self.right._collect_errors(candidate, path + ["RIGHT"])
        )


class NotSpecificationWithErrors(SpecificationWithErrors[T]):
    """NOT composition that wraps error collection from the inner spec."""

    def __init__(self, spec: SpecificationWithErrors[T]) -> None:
        self.spec = spec
        self.description = f"(NOT {spec.description})"

    def is_satisfied_by(self, candidate: T) -> bool:
        return not self.spec.is_satisfied_by(candidate)

    def _collect_errors(self, candidate: T, path: list[str]) -> list[ValidationError]:
        if self.spec.is_satisfied_by(candidate):
            # The wrapped spec IS satisfied, so NOT fails — report the inner spec's success as error
            return [
                ValidationError(
                    rule_name="negated_spec",
                    description=f"Expected NOT {self.spec.description} to be true, but it was satisfied",
                    candidate_value=candidate,
                )
            ]
        return []


# --- Primitive specs with error reporting ---

class SymbolValid(SpecificationWithErrors[Trade]):
    description = "Trade symbol must be a recognized ticker (AAPL, GOOGL, MSFT)."

    def __init__(self) -> None:
        self.valid_symbols = {"AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"}

    def is_satisfied_by(self, trade: Trade) -> bool:
        return trade.symbol in self.valid_symbols


class ValidQuantity(SpecificationWithErrors[Trade]):
    description = "Quantity must be a positive integer."

    def is_satisfied_by(self, trade: Trade) -> bool:
        return isinstance(trade.quantity, int) and trade.quantity > 0


class MaxOrderValue(SpecificationWithErrors[Trade]):
    description = "Order value (quantity x price) must not exceed $1,000,000."

    def __init__(self, max_value: float = 1_000_000.0) -> None:
        self.max_value = max_value

    def is_satisfied_by(self, trade: Trade) -> bool:
        return (trade.quantity * trade.price) <= self.max_value


class NotDuplicateTrade(SpecificationWithErrors[Trade]):
    description = "No existing approved trade for this symbol and side in the last 24h."

    def __init__(self, repository: Any = None) -> None:
        self.repository = repository  # In production, inject via DI

    def is_satisfied_by(self, trade: Trade) -> bool:
        if self.repository is None:
            return True  # Skip during testing without real repo
        existing = getattr(self.repository, "find_recent", lambda *a, **k: [])
        trades = existing(trade.symbol, trade.side, hours=24)
        return not any(
            e.price == trade.price and e.quantity == trade.quantity for e in trades
        )


# --- Composite validation for order submission ---

class OrderSubmissionValidator(SpecificationWithErrors[Trade]):
    """Composite spec that validates an entire order before execution.

    Combines symbol validity, quantity constraints, value limits, and
    duplicate detection into a single evaluation surface.
    """

    description = "Complete order submission validation"

    def __init__(self, max_value: float = 1_000_000.0) -> None:
        self.spec: SpecificationWithErrors[Trade] = AndSpecificationWithErrors(
            AndSpecificationWithErrors(
                SymbolValid(),
                ValidQuantity(),
            ),
            AndSpecificationWithErrors(
                MaxOrderValue(max_value),
                NotDuplicateTrade(),
            ),
        )

    def is_satisfied_by(self, trade: Trade) -> bool:
        return self.spec.is_satisfied_by(trade)

    def validate(self, trade: Trade) -> tuple[bool, list[ValidationError]]:
        return self.spec.validate(trade)


# --- Usage in a domain service ---

class TradingService:
    def submit_order(self, trade: Trade, max_value: float) -> None:
        """Submit an order after validation. Raises if validation fails."""
        validator = OrderSubmissionValidator(max_value=max_value)
        is_valid, errors = validator.validate(trade)

        if not is_valid:
            for error in errors:
                print(f"[VALIDATION] {error.rule_name}: {error.description}")
            raise ValueError(
                f"Order submission failed: {len(errors)} validation rule(s) did not pass"
            )

        trade.status = "APPROVED"
        trade.approved_at = date.today()


# Verify error collection works with composite specs
bad_trade = Trade(symbol="INVALID", quantity=-1, price=50.0, side="BUY")
validator = OrderSubmissionValidator()
is_valid, errors = validator.validate(bad_trade)
assert not is_valid
rule_names = [e.rule_name for e in errors]
assert "SymbolValid" in rule_names or "symbol" in str(errors[0]).lower()
```

### Pattern 3: Expression Tree Translation for ORM Query Pushdown

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum, auto
from typing import Any, Generic, TypeVar

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session


T = TypeVar("T")


# --- Expression Tree Node Types (domain-agnostic) ---

class PredicateType(Enum):
    EQ = "eq"
    NEQ = "neq"
    GT = "gt"
    LT = "lt"
    GTE = "gte"
    LTE = "lte"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"


class PredicateNode(ABC, Generic[T]):
    """Abstract node in the specification expression tree."""

    @abstractmethod
    def evaluate(self, candidate: T) -> bool: ...

    @abstractmethod
    def to_orm_clause(self, model_cls: type) -> Any:
        """Translate this predicate into an ORM filter clause."""
        ...


class LeafPredicate(PredicateNode[T]):
    """Leaf node: field comparison (equality, range, contains)."""

    def __init__(self, field_name: str, operator: PredicateType, value: Any) -> None:
        self.field_name = field_name
        self.operator = operator
        self.value = value

    def evaluate(self, candidate: T) -> bool:
        actual = getattr(candidate, self.field_name)
        if self.operator == PredicateType.EQ:
            return actual == self.value
        elif self.operator == PredicateType.NEQ:
            return actual != self.value
        elif self.operator == PredicateType.GT:
            return actual > self.value
        elif self.operator == PredicateType.LT:
            return actual < self.value
        elif self.operator == PredicateType.GTE:
            return actual >= self.value
        elif self.operator == PredicateType.LTE:
            return actual <= self.value
        elif self.operator == PredicateType.CONTAINS:
            return self.value in (actual or "")
        elif self.operator == PredicateType.NOT_CONTAINS:
            return self.value not in (actual or "")
        return False

    def to_orm_clause(self, model_cls: type) -> Any:
        column = getattr(model_cls, self.field_name)
        if self.operator == PredicateType.EQ:
            return column == self.value
        elif self.operator == PredicateType.NEQ:
            return column != self.value
        elif self.operator == PredicateType.GT:
            return column > self.value
        elif self.operator == PredicateType.LT:
            return column < self.value
        elif self.operator == PredicateType.GTE:
            return column >= self.value
        elif self.operator == PredicateType.LTE:
            return column <= self.value
        elif self.operator == PredicateType.CONTAINS:
            return column.contains(self.value)
        elif self.operator == PredicateType.NOT_CONTAINS:
            return ~column.contains(self.value)
        raise ValueError(f"Unsupported operator: {self.operator}")


class AndPredicate(PredicateNode[T]):
    """Composite AND node in the expression tree."""

    def __init__(self, left: PredicateNode[T], right: PredicateNode[T]) -> None:
        self.left = left
        self.right = right

    def evaluate(self, candidate: T) -> bool:
        return self.left.evaluate(candidate) and self.right.evaluate(candidate)

    def to_orm_clause(self, model_cls: type) -> Any:
        left_clause = self.left.to_orm_clause(model_cls)
        right_clause = self.right.to_orm_clause(model_cls)
        return and_(left_clause, right_clause)


class OrPredicate(PredicateNode[T]):
    """Composite OR node in the expression tree."""

    def __init__(self, left: PredicateNode[T], right: PredicateNode[T]) -> None:
        self.left = left
        self.right = right

    def evaluate(self, candidate: T) -> bool:
        return self.left.evaluate(candidate) or self.right.evaluate(candidate)

    def to_orm_clause(self, model_cls: type) -> Any:
        left_clause = self.left.to_orm_clause(model_cls)
        right_clause = self.right.to_orm_clause(model_cls)
        return or_(left_clause, right_clause)


class SpecificationQueryTranslator:
    """Translates Specification trees into SQLAlchemy query filters.

    IMPORTANT: This translator lives in the INFRASTRUCTURE layer, NOT in domain code.
    Domain specs must NEVER import SQLAlchemy. The translator bridges the gap between
    domain logic and persistence technology.
    """

    @staticmethod
    def to_sqlalchemy_filter(
        predicate: PredicateNode[T],
        model_cls: type,
    ) -> Any:
        """Convert a predicate tree into a SQLAlchemy filter clause."""
        if isinstance(predicate, LeafPredicate):
            return predicate.to_orm_clause(model_cls)

        elif isinstance(predicate, AndPredicate):
            left = SpecificationQueryTranslator.to_sqlalchemy_filter(
                predicate.left, model_cls
            )
            right = SpecificationQueryTranslator.to_sqlalchemy_filter(
                predicate.right, model_cls
            )
            return and_(left, right)

        elif isinstance(predicate, OrPredicate):
            left = SpecificationQueryTranslator.to_sqlalchemy_filter(
                predicate.left, model_cls
            )
            right = SpecificationQueryTranslator.to_sqlalchemy_filter(
                predicate.right, model_cls
            )
            return or_(left, right)

        raise ValueError(f"Unsupported predicate type: {type(predicate).__name__}")


# --- Usage with SQLAlchemy ---

from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class AccountModel(Base):
    __tablename__ = "accounts"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    status: Mapped[str] = mapped_column(String)
    balance: Mapped[float] = mapped_column(Integer)
    is_frozen: Mapped[bool] = mapped_column(Integer)


# Build a specification tree using predicates (not domain specs — these are the infrastructure layer)
spec_tree: PredicateNode[AccountModel] = AndPredicate(
    LeafPredicate("status", PredicateType.EQ, "active"),
    OrPredicate(
        LeafPredicate("balance", PredicateType.GT, 0),
        AndPredicate(
            LeafPredicate("is_frozen", PredicateType.EQ, False),
            LeafPredicate("balance", PredicateType.GTE, -100),
        ),
    ),
)

# Translate to ORM filter
filter_clause = SpecificationQueryTranslator.to_sqlalchemy_filter(spec_tree, AccountModel)

# Execute the query
with Session() as session:
    stmt = select(AccountModel).where(filter_clause)
    accounts = list(session.scalars(stmt).all())


# --- In-Memory Filtering (no translation needed) ---

class AccountFilter:
    """Filters in-memory collections using specification evaluation."""

    def __init__(self, spec: SpecificationWithErrors[T]) -> None:
        self.spec = spec

    def filter(self, items: list[T]) -> list[T]:
        return [item for item in items if self.spec.is_satisfied_by(item)]


# In-memory filtering of domain objects (no ORM needed)
accounts = [
    Account(balance=500.0, is_frozen=False, status="active"),
    Account(balance=-50.0, is_frozen=True, status="suspended"),
    Account(balance=25.0, is_frozen=False, status="active"),
]

eligible_for_loan = HasPositiveBalance() & IsNotFrozen() & MeetsMinimumBalance(100.0)
filter_service: AccountFilter[Account] = AccountFilter(eligible_for_loan)
result = filter_service.filter(accounts)
assert len(result) == 1 and result[0].balance == 500.0
```

### Pattern 4: Protocol-Based Contracts for Maximum Flexibility

```python
from __future__ import annotations

from typing import Protocol, TypeVar, Generic


T_co = TypeVar("T_co", covariant=True)


class SpecificationLike(Protocol[T]):
    """Structural protocol — any class with matching methods satisfies this.

    This enables duck-typed specifications: a class does NOT need to inherit
    from the Specification base class to work with filtering services, domain
    services, and composition utilities. Any structurally-compatible class works.

    Example of duck-typed compatibility:
        class LegacyFilter:  # Not a subclass of Specification!
            def is_satisfied_by(self, account: Account) -> bool:
                return account.balance > 0

        # This still works with Protocol-based services:
        service = SpecFilterService[Account](LegacyFilter())
    """

    description: str
    errors: dict[str, str]

    def is_satisfied_by(self, candidate: T) -> bool: ...


class SpecFilterService(Generic[T]):
    """Accepts any object conforming to the Specification protocol.

    Works with concrete Specification subclasses, dataclasses, protocols,
    or plain classes — as long as they implement is_satisfied_by(candidate).
    """

    def __init__(self, spec: SpecificationLike[T]) -> None:
        self.spec = spec

    def filter(self, items: list[T]) -> list[T]:
        return [item for item in items if self.spec.is_satisfied_by(item)]

    def describe(self) -> str:
        return getattr(self.spec, "description", "Unknown specification")


class OldAccountsFilter:
    """Structurally-compatible filter — NOT a subclass of Specification."""

    description = "Accounts older than 90 days."
    errors: dict[str, str] = {}

    def __init__(self, reference_date: date) -> None:
        self.reference_date = reference_date

    def is_satisfied_by(self, account: Account) -> bool:
        from datetime import timedelta
        return (self.reference_date - date(2025, 1, 1)).days > 90


# Usage — Protocol-based services accept any structurally-compatible implementation
filter_service = SpecFilterService[Account](HasPositiveBalance())
print(filter_service.describe())  # "Account must have a positive balance."

legacy_filter = SpecFilterService[Account](OldAccountsFilter(date(2025, 6, 1)))
print(legacy_filter.describe())  # "Accounts older than 90 days."


# --- Builder pattern for fluent spec construction ---

class SpecBuilder:
    """Fluent builder that creates Specification trees via method chaining."""

    def __init__(self, entity_type: type[T]) -> None:
        self._entity_type = entity_type
        self._predicates: list[PredicateNode[T]] = []
        self._operator: str = "AND"  # Default operator between predicates

    def with_field(self, field: str) -> "SpecFieldBuilder[T]":
        """Start building a predicate for a specific field."""
        return SpecFieldBuilder(field, self._predicates)

    def combine(self, operator: str = "AND") -> Specification[T]:
        if not self._predicates:
            raise ValueError("No specifications defined. Use with_field() first.")

        result = self._predicates[0]
        for predicate in self._predicates[1:]:
            if operator == "AND":
                result = AndPredicate(result, predicate)  # type: ignore[arg-type]
            elif operator == "OR":
                result = OrPredicate(result, predicate)  # type: ignore[arg-type]
        return result


class SpecFieldBuilder(Generic[T]):
    """Builder for individual field predicates within a fluent chain."""

    def __init__(self, field: str, accumulator: list[PredicateNode[T]]) -> None:
        self.field = field
        self.accumulator = accumulator

    def equals(self, value: Any) -> "SpecFieldBuilder[T]":
        self.accumulator.append(LeafPredicate(self.field, PredicateType.EQ, value))
        return self

    def not_equals(self, value: Any) -> "SpecFieldBuilder[T]":
        self.accumulator.append(LeafPredicate(self.field, PredicateType.NEQ, value))
        return self

    def greater_than(self, value: Any) -> "SpecFieldBuilder[T]":
        self.accumulator.append(LeafPredicate(self.field, PredicateType.GT, value))
        return self

    def less_than(self, value: Any) -> "SpecFieldBuilder[T]":
        self.accumulator.append(LeafPredicate(self.field, PredicateType.LT, value))
        return self

    def contains(self, substring: str) -> "SpecFieldBuilder[T]":
        self.accumulator.append(LeafPredicate(self.field, PredicateType.CONTAINS, substring))
        return self

    def build(self) -> PredicateNode[T]:
        if not self.accumulator:
            raise ValueError("No predicates built. Use operator methods first.")
        result = self.accumulator[0]
        for pred in self.accumulator[1:]:
            result = AndPredicate(result, pred)
        return result


# Usage — fluent builder API
class AccountModel:
    pass  # Simplified for illustration

builder = SpecBuilder(AccountModel)
spec_tree = (
    builder.with_field("status").equals("active")
).build()
```

### Pattern 5: Primitive Factory for Reusable Parameterized Specs

```python
from __future__ import annotations

import re
from typing import Generic, TypeVar


T_co = TypeVar("T_co")


class Comparison(Enum):
    EQ = "=="
    NEQ = "!="
    GT = ">"
    LT = "<"
    GTE = ">="
    LTE = "<="


@dataclass(frozen=True)
class FieldSpec(Specification[T_co]):
    """Generic field-based specification — parameterized by field, operator, and value.

    Eliminates boilerplate: instead of defining a new class for every
    field comparison, use this parameterized spec with any entity type.
    """

    field_name: str
    operator: Comparison
    value: Any

    description: str = field(init=False)

    def __post_init__(self) -> None:
        object.__setattr__(
            self, "description", f"{self.field_name} {self.operator.value} {self.value!r}"
        )

    def is_satisfied_by(self, candidate: T_co) -> bool:
        actual = getattr(candidate, self.field_name)
        if actual is None:
            return False  # Null values never satisfy comparisons

        if self.operator == Comparison.EQ:
            return actual == self.value
        elif self.operator == Comparison.NEQ:
            return actual != self.value
        elif self.operator == Comparison.GT:
            return actual > self.value
        elif self.operator == Comparison.LT:
            return actual < self.value
        elif self.operator == Comparison.GTE:
            return actual >= self.value
        elif self.operator == Comparison.LTE:
            return actual <= self.value
        raise ValueError(f"Unsupported operator for comparison spec: {self.operator}")


class Primitives:
    """Factory for commonly reused primitive specifications.

    Provides parameterized specs without requiring new class definitions.
    Use these as building blocks for complex composed specifications.
    """

    @staticmethod
    def equals(field: str, value: Any) -> FieldSpec:
        return FieldSpec(field, Comparison.EQ, value)

    @staticmethod
    def not_equals(field: str, value: Any) -> FieldSpec:
        return FieldSpec(field, Comparison.NEQ, value)

    @staticmethod
    def greater_than(field: str, value: Any) -> FieldSpec:
        return FieldSpec(field, Comparison.GT, value)

    @staticmethod
    def less_than(field: str, value: Any) -> FieldSpec:
        return FieldSpec(field, Comparison.LT, value)

    @staticmethod
    def gte(field: str, value: Any) -> FieldSpec:
        return FieldSpec(field, Comparison.GTE, value)

    @staticmethod
    def lte(field: str, value: Any) -> FieldSpec:
        return FieldSpec(field, Comparison.LTE, value)

    @staticmethod
    def in_range(field: str, minimum: float, maximum: float) -> Specification[T_co]:
        """Create a range-check specification."""
        class _InRange(Specification):  # type: ignore[type-arg]
            description = f"{field} must be between {minimum!r} and {maximum!r}."

            def is_satisfied_by(self, candidate: Any) -> bool:
                val = getattr(candidate, field)
                if val is None:
                    return False
                return minimum <= val <= maximum
        return _InRange()  # type: ignore[return-value]

    @staticmethod
    def matches_pattern(field: str, pattern: str) -> Specification[T_co]:
        """Create a regex-matches specification."""
        compiled = re.compile(pattern)

        class _Matches(Specification):  # type: ignore[type-arg]
            description = f"{field} must match pattern '{pattern}'."

            def is_satisfied_by(self, candidate: Any) -> bool:
                actual = getattr(candidate, field, "")
                return bool(compiled.search(actual)) if actual else False
        return _Matches()  # type: ignore[return-value]


# --- Usage ---

# Parameterized field specs (no new class definitions needed!)
status_spec = Primitives.equals("status", "active")
balance_spec = Primitives.greater_than("balance", 0)
frozen_spec = Primitives.equals("is_frozen", False)

# Compose into complex rules
account_rules: Specification[Account] = (
    status_spec & balance_spec & ~frozen_spec
)

# Range and pattern specs
range_spec: Specification[Account] = Primitives.in_range("balance", 0, 1_000_000)
email_spec: Specification[Account] = Primitives.matches_pattern(
    "email", r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
)

# Registry pattern — store reusable specs as module-level constants
class AccountSpecifications:
    """Registry of commonly-used account specifications."""
    ACTIVE = Primitives.equals("status", "active")
    POSITIVE_BALANCE = Primitives.greater_than("balance", 0)
    NOT_FROZEN = ~Primitives.equals("is_frozen", True)
    ELIGIBLE_FOR_LOAN = ACTIVE & POSITIVE_BALANCE & NOT_FROZEN


# Usage of pre-built spec registry
eligible_accounts = AccountFilter[Account](AccountSpecifications.ELIGIBLE_FOR_LOAN)
result = eligible_accounts.filter(accounts)
assert len(result) >= 0  # Depends on test data
```

---

## Constraints

### MUST DO
- **Each primitive spec checks exactly one business rule** — if a spec checks multiple conditions, split it into primitives and compose with AND/OR. This follows the Single Responsibility Principle.
- **Use Python's bitwise operators for composition** — `&`, `|`, `~` are idiomatic and readable. Avoid method-based composition like `.and_with()` which is verbose and obscures intent.
- **Name negated specs explicitly when possible** — prefer `IsNotFrozen()` over `~IsFrozen()`. Negation with `~` produces confusing error messages ("Expected condition NOT satisfied: X").
- **Store composed specs as named class attributes or module constants** — reuse is the point of composition. Don't repeat complex spec expressions at every call site.
- **Keep the translator in the infrastructure layer** — domain specs must NEVER import SQLAlchemy, Django ORM, or any persistence technology. The `SpecificationQueryTranslator` bridges domain logic to persistence.
- **Use Protocol-based contracts for filter services** — accept `SpecificationLike[T]` rather than concrete base classes, enabling any structurally-compatible implementation.

### MUST NOT DO
- **Put ORM imports inside domain spec classes** — this creates circular dependencies and makes specs untestable outside the persistence context. The translator adapter is a separate class in `infrastructure/`.
- **Let specs have side effects during evaluation** — specs must be pure functions. Evaluation changes nothing; it only returns True/False. Mutation breaks composability and caching.
- **Create specs that depend on each other circularly** — spec A should not import or instantiate spec B directly. Use dependency injection (pass dependencies via `__init__`) for cross-spec references.
- **Evaluate complex compositions on millions of records in-memory** — if the dataset is large, push filters to the database via the expression tree translator. In-memory evaluation of 20+ AND/OR specs per record is slow.
- **Use `extra="forbid"` on consumer schemas** — (this also applies from event pattern) new producer fields will crash all consumers. Use forward-compatible designs.

---

## Live References

> Authoritative documentation and reference material for the specification pattern in DDD systems.

- [Specification Pattern — Martin Fowler](https://martinfowler.com/apsupp/spec.pdf) — The original paper defining the specification pattern as a composable business rule object
- [Implementing DDD — Scott Millett, Chapter 7](https://www.implementingddd.com/) — Practical implementation of specifications within bounded contexts
- [DDD Lite — Vaughn Vernon](https://www.infoq.com/articles/domain-driven-design-essentials/) — Simplified DDD for teams finding full specification pattern heavy
- [sutoppu — Python Specification Pattern Library](https://github.com/u8slvn/sutoppu) — The leading standalone Python implementation with ABC base class and metaclass-based error tracking
- [Python typing documentation — Protocol](https://docs.python.org/3/library/typing.html#typing.Protocol) — Structural subtyping for specification contracts
- [SQLAlchemy Documentation — ORM Query Filters](https://docs.sqlalchemy.org/en/20/orm/queryguide/sql_operators.html) — For expression tree to ORM filter translation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `ddd-tactical-patterns` | Defines aggregate roots, value objects, and basic repository patterns — specifications complement repositories by providing composable filtering criteria |
| `domain-driven-tactical` | Another tactical implementation; uses specs internally for invariant checks but doesn't cover the full composition framework |
| `domain-repository-pattern` | Repository abstraction with specification-based queries; this skill provides the spec layer that feeds into repository filtering |
| `ddd-command-pattern` | Commands route write operations; specifications validate those commands before they reach aggregate roots — complementary read-side concern |
| `microservice-contract-testing` | Contract testing for inter-service APIs; specifications can be used as shared validation rules between services in a DDD microservices architecture |

> 📖 skill(local cache): ddd-tactical-patterns, domain-driven-tactical, domain-repository-pattern, ddd-command-pattern, microservice-contract-testing
