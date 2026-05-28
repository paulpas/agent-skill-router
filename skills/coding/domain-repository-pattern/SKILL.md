---
name: domain-repository-pattern
description: Implements repository and specification patterns for DDD to abstract data access while keeping domain logic in the domain layer — generic repositories, typed specifications, pagination, and query composition without leaking persistence details.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: repository pattern, specification pattern, data access abstraction, generic repository, typed queries, how do i persist aggregates, unit of work, aggregate persistence
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
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, ddd-tactical-patterns, domain-events, cqrs-pattern
---

# Repository and Specification Patterns

Implements repository and specification abstractions that decouple domain aggregates from persistence infrastructure. When loaded, the model acts as a senior DDD engineer designing clean data access boundaries where domain models remain pure and infrastructure details live in the infrastructure layer.

## TL;DR Checklist

- [ ] Define `Repository[T]` ABC with CRUD + pagination — never concrete DB operations in domain code
- [ ] Implement `Specification[T]` protocol with `is_satisfied_by()` and `to_criteria()` methods
- [ ] Compose specifications using `AndSpecification`, `OrSpecification`, `NotSpecification` combinators
- [ ] Wrap repository calls in `UnitOfWork` with explicit commit/rollback semantics
- [ ] Ensure every public method has Python 3.10+ type hints and a docstring

---

## When to Use

- Designing a DDD system where aggregate roots must not leak persistence concerns into their domain logic
- Building an application where query logic is complex, frequently changing, or needs to be composed dynamically
- Separating read models from write models (CQRS-lite) where specifications drive different projection queries
- Implementing auditability requirements where every repository call must be traceable through a unit of work

## When NOT to Use

- Simple CRUD applications with flat data — the specification pattern adds unnecessary indirection for single-table queries
- Real-time systems where every millisecond of latency matters and protocol dispatch overhead is unacceptable
- Prototypes or throwaway code — introduce this only when query composition complexity justifies the abstraction cost

---

## Core Workflow

1. **Define the Aggregate Root** — Start with the domain entity as a pure class (no ORM decorators). It should expose domain behavior, not persistence state.
   **Checkpoint:** Verify the aggregate has no `import sqlalchemy` or database-specific imports anywhere in its module.

2. **Create the Repository ABC** — Define an abstract interface using Python's `collections.abc` or `typing.Protocol`. Include `get_by_id`, `add`, `remove`, `list_with_pagination`, and any domain-specific finder methods.
   **Checkpoint:** Every method signature must use concrete type hints (e.g., `Optional[Aggregate]`) — no bare `Any` types.

3. **Implement the Specification Protocol** — Create a base `Specification[T]` class with `is_satisfied_by(candidate: T) -> bool` and optional `to_criteria() -> Any` for infrastructure translation.
   **Checkpoint:** Each concrete specification must be immutable after construction (all criteria in `__init__`).

4. **Build Specification Combinators** — Implement `AndSpecification`, `OrSpecification`, `NotSpecification` that wrap inner specifications and compose their logic.
   **Checkpoint:** Verify short-circuit evaluation works correctly for AND (fails fast) and OR (succeeds fast).

5. **Implement UnitOfWork** — Create a context manager that manages repository sessions, transaction boundaries, and commit/rollback sequencing.
   **Checkpoint:** Ensure rollback restores state to pre-commit point; never leave repositories in a partially-committed state.

---

## Implementation Patterns

### Pattern 1: Generic Repository Interface (ABC-Based)

Define the repository as an abstract base class that every concrete implementation must satisfy. Use `Generic[T]` for type-safe aggregate support. Include pagination support to prevent unbounded queries from overwhelming the database.

```python
from __future__ import annotations

import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, Iterable, Optional, Sequence, TypeVar

from myapp.domain.models import AggregateRoot  # Pure domain type, no DB imports


@dataclass(frozen=True)
class Page:
    """Immutable page of results with metadata for UI navigation."""

    items: Sequence[AggregateRoot]
    page_number: int
    page_size: int
    total_items: int

    @property
    def total_pages(self) -> int:
        """Calculate total pages from total items and page size."""
        if self.page_size <= 0:
            return 0
        return (self.total_items + self.page_size - 1) // self.page_size


T = TypeVar("T", bound="AggregateRoot")


class Repository(ABC, Generic[T]):
    """Abstract repository providing CRUD and pagination for aggregate roots.

    This ABC defines the contract between domain logic and persistence.
    Domain code depends only on this interface; database-specific details
    live in concrete implementations under infrastructure/.
    """

    @abstractmethod
    def get_by_id(self, aggregate_id: uuid.UUID) -> Optional[T]:
        """Fetch a single aggregate by its unique identifier.

        Args:
            aggregate_id: The primary key of the aggregate to retrieve.

        Returns:
            The aggregate instance if found, None otherwise.
        """
        ...

    @abstractmethod
    def add(self, aggregate: T) -> None:
        """Register a new aggregate for persistence.

        The aggregate is not immediately persisted; it becomes persistent
        when UnitOfWork.commit() is called. Callers must ensure the
        aggregate has a valid UUID before calling add().

        Args:
            aggregate: The new domain aggregate instance to persist.

        Raises:
            ValueError: If the aggregate already exists or lacks an ID.
        """
        ...

    @abstractmethod
    def remove(self, aggregate: T) -> None:
        """Mark an aggregate for deletion on next commit.

        Like add(), removal is deferred until UnitOfWork.commit().
        This ensures atomic transaction boundaries across multiple
        repository operations.

        Args:
            aggregate: The domain aggregate to delete.

        Raises:
            ValueError: If the aggregate ID is missing or None.
        """
        ...

    @abstractmethod
    def list_with_pagination(
        self,
        *,
        page_number: int = 1,
        page_size: int = 25,
    ) -> Page[T]:
        """Retrieve a paginated slice of all aggregates.

        Use this for listing UI screens. For complex queries, use
        the Specification pattern instead (see Pattern 2).

        Args:
            page_number: One-indexed page to retrieve (default 1).
            page_size: Number of items per page (default 25, max 100).

        Returns:
            A Page containing the requested slice with metadata.

        Raises:
            ValueError: If page_number < 1 or page_size is out of bounds.
        """
        ...


class InMemoryRepository(Repository[T]):
    """In-memory repository for unit testing and development.

    Stores aggregates in a dict keyed by UUID. Suitable for tests
    but should never be used in production deployments.
    """

    def __init__(self) -> None:
        """Initialize an empty in-memory store."""
        self._store: dict[uuid.UUID, T] = {}

    def get_by_id(self, aggregate_id: uuid.UUID) -> Optional[T]:
        return self._store.get(aggregate_id)

    def add(self, aggregate: T) -> None:
        if not hasattr(aggregate, "id") or aggregate.id is None:  # type: ignore[attr-defined]
            raise ValueError("Cannot add aggregate without a valid UUID id")
        if aggregate.id in self._store:  # type: ignore[attr-defined]
            raise ValueError(f"Aggregate {aggregate.id} already exists")
        self._store[aggregate.id] = aggregate  # type: ignore[index]

    def remove(self, aggregate: T) -> None:
        if not hasattr(aggregate, "id"):  # type: ignore[attr-defined]
            raise ValueError("Cannot remove aggregate without a valid UUID id")
        self._store.pop(aggregate.id, None)  # type: ignore[arg-type]

    def list_with_pagination(
        self, *, page_number: int = 1, page_size: int = 25
    ) -> Page[T]:
        if page_number < 1:
            raise ValueError("page_number must be >= 1")
        if not (1 <= page_size <= 100):
            raise ValueError("page_size must be between 1 and 100")

        items = list(self._store.values())
        total = len(items)
        start = (page_number - 1) * page_size
        end = start + page_size
        return Page(
            items=items[start:end],
            page_number=page_number,
            page_size=page_size,
            total_items=total,
        )
```

### Pattern 2: Specification Pattern (Composable Query Objects)

The specification pattern encapsulates query logic as composable objects. Each specification knows how to test an aggregate and optionally translate itself into infrastructure criteria (SQL WHERE clauses, MongoDB queries, etc.). The combinator specifications (`And`, `Or`, `Not`) enable complex query construction without nested conditionals in application code.

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Generic, Protocol, TypeVar

T = TypeVar("T")


class Specification(ABC, Generic[T]):
    """Abstract base for domain specifications.

    A specification encapsulates a single query criterion. Concrete
    implementations override is_satisfied_by() to test individual
    aggregates. The to_criteria() method is optional and used by
    infrastructure adapters to translate specs into SQL/NoSQL queries.
    """

    @abstractmethod
    def is_satisfied_by(self, candidate: T) -> bool:
        """Evaluate whether the candidate meets this specification's criterion.

        Args:
            candidate: The domain object to test against.

        Returns:
            True if the candidate satisfies this specification.
        """
        ...

    @property
    @abstractmethod
    def is_satisfied(self) -> bool:
        """Return True when this specification always passes (e.g., AlwaysSpecification).

        Used by combinator specifications to short-circuit evaluation.
        """
        ...


class AndSpecification(Specification[T]):
    """Combines two specifications with AND logic (both must pass).

    Uses short-circuit evaluation: if the left spec fails, the right
    is never evaluated, saving unnecessary checks.
    """

    def __init__(self, left: Specification[T], right: Specification[T]) -> None:
        """Initialize with two specifications to combine.

        Args:
            left: The left-hand specification in the AND expression.
            right: The right-hand specification in the AND expression.
        """
        self._left = left
        self._right = right

    @property
    def is_satisfied(self) -> bool:
        # Both sides must be satisfiable for AND to proceed
        if not self._left.is_satisfied or not self._right.is_satisfied:
            return False
        return True

    def is_satisfied_by(self, candidate: T) -> bool:
        # Short-circuit: left fail means right never evaluated
        if not self._left.is_satisfied_by(candidate):
            return False
        return self._right.is_satisfied_by(candidate)


class OrSpecification(Specification[T]):
    """Combines two specifications with OR logic (either may pass).

    Uses short-circuit evaluation: if the left spec passes, the right
    is never evaluated.
    """

    def __init__(self, left: Specification[T], right: Specification[T]) -> None:
        """Initialize with two specifications to combine.

        Args:
            left: The left-hand specification in the OR expression.
            right: The right-hand specification in the OR expression.
        """
        self._left = left
        self._right = right

    @property
    def is_satisfied(self) -> bool:
        if self._left.is_satisfied or self._right.is_satisfied:
            return True
        return False

    def is_satisfied_by(self, candidate: T) -> bool:
        # Short-circuit: left pass means right never evaluated
        if self._left.is_satisfied_by(candidate):
            return True
        return self._right.is_satisfied_by(candidate)


class NotSpecification(Specification[T]):
    """Negates a single specification.

    Passes when the wrapped specification fails, and vice versa.
    """

    def __init__(self, spec: Specification[T]) -> None:
        """Initialize with the specification to negate.

        Args:
            spec: The specification to invert the logic of.
        """
        self._spec = spec

    @property
    def is_satisfied(self) -> bool:
        return not self._spec.is_satisfied

    def is_satisfied_by(self, candidate: T) -> bool:
        return not self._spec.is_satisfied_by(candidate)


class AlwaysSpecification(Specification[T]):
    """Specification that always returns True. Useful as a base case."""

    @property
    def is_satisfied(self) -> bool:
        return True

    def is_satisfied_by(self, candidate: T) -> bool:
        return True


class FieldSpecification(Specification[T]):
    """Concrete specification that compares a field value to an expected value.

    Uses duck typing via getattr to work with any aggregate type.
    """

    def __init__(self, field_name: str, expected_value: object) -> None:
        """Initialize the field comparison specification.

        Args:
            field_name: The attribute name on the aggregate to compare.
            expected_value: The value that field must equal for satisfaction.
        """
        self._field_name = field_name
        self._expected = expected_value

    @property
    def is_satisfied(self) -> bool:
        return False  # Can't determine without a candidate

    def is_satisfied_by(self, candidate: T) -> bool:
        actual = getattr(candidate, self._field_name, None)
        return actual == self._expected


class GreaterThanSpecification(Specification[T]):
    """Concrete specification that checks if a numeric field exceeds a threshold."""

    def __init__(self, field_name: str, threshold: float) -> None:
        """Initialize the greater-than specification.

        Args:
            field_name: The numeric attribute to compare.
            threshold: Minimum value required for satisfaction.
        """
        self._field_name = field_name
        self._threshold = threshold

    @property
    def is_satisfied(self) -> bool:
        return False

    def is_satisfied_by(self, candidate: T) -> bool:
        value = getattr(candidate, self._field_name, None)
        if value is None:
            return False
        try:
            return float(value) > self._threshold
        except (TypeError, ValueError):
            return False


# ❌ BAD — Nested conditionals in service layer leak query logic into application code
def bad_find_active_orders(orders_repo) -> list:
    results = []
    for order in orders_repo.list_with_pagination().items:
        if order.status == "active":
            if order.total_amount > 100:
                if not order.cancelled_at:
                    results.append(order)
    return results

# ✅ GOOD — Specifications compose declaratively; service layer stays clean
def find_eligible_orders(orders_repo, spec: Specification) -> list:
    active_spec = FieldSpecification("status", "active")
    high_value_spec = GreaterThanSpecification("total_amount", 100.0)
    not_cancelled_spec = NotSpecification(FieldSpecification("cancelled_at", None))

    combined = AndSpecification(
        AndSpecification(active_spec, high_value_spec),
        not_cancelled_spec,
    )

    results = []
    page_num = 1
    while True:
        page = orders_repo.list_with_pagination(page_number=page_num)
        filtered = [o for o in page.items if spec.is_satisfied_by(o)]
        results.extend(filtered)
        if page.page_number >= page.total_pages:
            break
        page_num += 1
    return results
```

### Pattern 3: Unit of Work — Transaction Management

The Unit of Work pattern coordinates repository operations within a single transaction boundary. It tracks dirty aggregates, manages the transaction lifecycle as a context manager, and ensures atomic commit or full rollback on failure.

```python
from __future__ import annotations

import uuid
from contextlib import AbstractContextManager
from typing import Optional


class UnitOfWork(AbstractContextManager):
    """Manages repository sessions and transaction boundaries.

    Usage:
        with uow as context:
            order = context.repositories.orders.get_by_id(order_id)
            order.cancel(user_id=user_id)
            context.repositories.orders.add(cancellation_record)
            context.commit()  # Flushes pending changes; raises on failure

    On exception, __exit__ automatically rolls back the transaction.
    """

    def __init__(self) -> None:
        """Initialize with an empty repository registry."""
        self._repositories: dict[str, object] = {}
        self._dirty_adds: list[object] = []
        self._dirty_removes: list[object] = []
        self._committed: bool = False

    def __enter__(self) -> UnitOfWork:
        """Start a new unit of work by clearing dirty tracking."""
        self._reset_tracking()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        """Roll back on any exception; mark committed on success."""
        if not self._committed and (exc_type is not None):
            self.rollback()
        # On success path, commit happens via explicit .commit() call

    def _reset_tracking(self) -> None:
        """Clear dirty tracking at the start of each unit of work."""
        self._dirty_adds.clear()
        self._dirty_removes.clear()
        self._committed = False

    @property
    def repositories(self) -> RepositoryRegistry:
        """Access registered repositories through this namespace.

        Returns:
            A RepositoryRegistry providing typed repository accessors.
        """
        return RepositoryRegistry(self)

    def mark_dirty_add(self, aggregate: object) -> None:
        """Register an aggregate as newly added (to be inserted on commit).

        Args:
            aggregate: The domain object that was created and needs saving.
        """
        if aggregate not in self._dirty_adds:
            self._dirty_adds.append(aggregate)

    def mark_dirty_remove(self, aggregate: object) -> None:
        """Register an aggregate as deleted (to be removed on commit).

        Args:
            aggregate: The domain object that was logically deleted.
        """
        if aggregate not in self._dirty_removes:
            self._dirty_removes.append(aggregate)

    def commit(self) -> None:
        """Flush all pending changes and mark the unit of work as committed.

        Executes adds first, then removes. If any operation fails,
        rollback() is called automatically.

        Raises:
            RuntimeError: If commit was already called on this UoW instance.
            Exception: Propagates from repository operations; triggers rollback.
        """
        if self._committed:
            raise RuntimeError("UnitOfWork already committed")

        try:
            # Phase 1: Persist new aggregates
            for aggregate in self._dirty_adds:
                repo = self._find_repo_for(aggregate)
                if repo is not None and hasattr(repo, "add"):
                    repo.add(aggregate)  # type: ignore[attr-defined]

            # Phase 2: Remove deleted aggregates
            for aggregate in self._dirty_removes:
                repo = self._find_repo_for(aggregate)
                if repo is not None and hasattr(repo, "remove"):
                    repo.remove(aggregate)  # type: ignore[attr-defined]
        except Exception:
            self.rollback()
            raise

        self._committed = True

    def rollback(self) -> None:
        """Discard all pending changes in this unit of work.

        After rollback, the UoW can be reused for a new transaction.
        """
        self._reset_tracking()

    @staticmethod
    def _find_repo_for(aggregate: object) -> Optional[object]:
        """Determine which repository owns this aggregate type.

        Args:
            aggregate: The domain object whose repository is needed.

        Returns:
            The appropriate repository instance, or None if not registered.
        """
        # In a real system, this would use type-based registration
        return None


class RepositoryRegistry:
    """Namespace for accessing repositories through a unit of work.

    Usage: uow.repositories.orders.get_by_id(id)
          uow.repositories.users.get_by_id(id)
    """

    def __init__(self, uow: UnitOfWork) -> None:
        """Initialize the registry with its owning UoW.

        Args:
            uow: The unit of work that owns this repository set.
        """
        self._uow = uow

    def register(self, name: str, repo: object) -> None:
        """Register a repository under a name for access via the registry.

        Args:
            name: The attribute name used to access this repository.
            repo: The repository instance to register.
        """
        setattr(self, name, repo)

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Domain-Driven Design: Repository Pattern (Martin Fowler)](https://martinfowler.com/eaaCatalog/repository.html) — Martin Fowler's definitive catalog entry on the Repository pattern with implementation examples
- [Specification Pattern (Martin Fowler)](https://martinfowler.com/apsupp/spec.pdf) — Fowler's original paper defining the Specification pattern for composable business rules
- [DDD Repository Implementation (Eric Evans, DDD Context Book)](https://domainlanguage.com/dd/) — Eric Evans' reference implementation of repository abstractions in DDD
- [Python ABC and Protocol-Based Repositories](https://docs.python.org/3/library/abc.html) — Python's abc module documentation for defining abstract repository interfaces
- [CQRS and Repository Patterns (Microsoft)](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs) — Microsoft's Azure Architecture Center guide combining CQRS with repository abstractions