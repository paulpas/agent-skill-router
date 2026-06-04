---




name: design-for-testability
description: Implements Design For Testability patterns including dependency injection via Protocols, interface segregation with focused interfaces, pure function boundaries, and composition root factories to enable fast unit tests without infrastructure dependencies.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: design for testability, DfT, dependency injection, test doubles, pure functions, interface segregation, composition root, protocol-based fakes
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: test-driven-development, dependency-inversion-principle, hexagonal-architecture
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




---





# Design For Testability (DfT)

Senior engineer refactoring systems to be inherently testable — extracting pure domain functions, injecting infrastructure through `typing.Protocol` interfaces, building composition roots that wire production and test object graphs identically, and applying interface segregation so test doubles are trivially small.

## TL;DR Checklist

- [ ] Every class that performs I/O has its dependencies injected via Protocol or ABC types, never constructed internally
- [ ] Each injected dependency's Protocol declares only the methods actually called by the consumer (interface segregation)
- [ ] Deterministic domain logic lives in pure functions — no hidden state, no side effects — testable with assert-only
- [ ] A single composition root function creates all real dependencies; a parallel test factory swaps fakes
- [ ] Test doubles implement the same Protocol as production adapters and track calls for verification assertions
- [ ] No module-level globals or static method chains hide dependencies from type checkers and reviewers

---

## When to Use

Use this skill when:

- You are building a production system where modules will be exercised more than 50 times per release cycle, making manual integration testing impractical
- Core business logic has high regression risk (e.g., pricing calculations, order validation) and needs fast, reliable unit tests that run in under a second each
- Your CI/CD pipeline requires test suites that complete in under two minutes — I/O-bound tests with real databases or network calls destroy iteration speed
- A codebase has become hard to test because constructors create their own `sqlite3` connections, `httpx.Client()` instances, or open file handles internally

---

## When NOT to Use

Avoid this skill for:

- Single-script throwaways (one-off data cleanup scripts, ETL one-liners) — the extraction overhead exceeds any testing benefit
- Prototypes that change daily over multiple weeks — DfT introduces structural decisions that become technical debt when the interface itself is in flux
- UI rendering code best validated through visual regression or E2E tests — writing unit fakes for React/Vue components rarely pays off compared to component-level snapshot tests

---

## Core Workflow

1. **Audit current dependencies** — List every external dependency each class creates internally: database connections, HTTP clients, file handles, logging instances, environment variable reads. Walk through `__init__` and method bodies looking for `import` statements followed by instantiation or construction calls.
   **Checkpoint:** Every class that directly creates infrastructure (opens files, connects to DB, makes HTTP requests) must be identified before proceeding.

2. **Extract Protocols / ABCs** — Create minimal `typing.Protocol` classes for each injected dependency. Read the consumer's method bodies and copy only the exact calls being made — if a service calls `repo.save()`, `repo.get()`, and `repo.exists()` on a repository, your Protocol declares exactly those three methods, not every method the real implementation happens to have.
   **Checkpoint:** A Protocol should be implementable by a 5-line fake class. If the fake would exceed 20 lines, the Protocol is too wide.

3. **Rewrite constructors** — Replace internal construction with constructor injection. Change `def __init__(self): self._db = sqlite3.connect(...)` to `def __init__(self, db: DbSession) -> None: self._db = db`. All injected parameters must use Protocol or ABC types. Remove any `import` of the concrete infrastructure class from the domain module.
   **Checkpoint:** The domain module imports zero infrastructure packages. Run `mypy` to verify no leaked concrete type references remain.

4. **Isolate pure functions** — Extract deterministic domain logic into standalone functions that accept inputs and return outputs with zero hidden state, zero side effects. A pure function's output depends only on its inputs — call it twice with the same arguments and get the same result. These need no test doubles at all; feed them lists and assert returns.
   **Checkpoint:** Every isolated pure function has a docstring stating its preconditions and postconditions. Run `pytest` on pure functions alone first — they should complete in milliseconds.

5. **Build composition roots** — Create factory functions for both production (real deps) and test (fake deps) configurations. The production factory imports concrete classes (`PostgresRepo`, `SmtpChannel`) and wires them. The test factory imports only fake implementations that share the same Protocol interface. Both factories return objects of identical structural type so calling code is indistinguishable between environments.
   **Checkpoint:** Call both factories and execute a complete use case — input flows through adapters, domain logic, and back without any real I/O in the test path.

6. **Write test doubles** — Implement minimal fake classes (3–10 lines each) using the Protocols. Each fake stores calls made against it in simple lists or dicts so tests can assert behavior: "the repo.save() was called exactly once with these arguments." Use `contextlib.contextmanager` for fakes that need cleanup semantics.
   **Checkpoint:** Every integration point has at least one test double. Run the full suite — zero real network calls, database connections, or filesystem writes should occur during unit tests.

---

## Implementation Patterns

### Pattern 1: Protocol-Based Dependency Injection

Replace internal infrastructure construction with constructor injection using `typing.Protocol`. The consumer depends only on the Protocol; concrete implementations live in an infrastructure layer and are wired at a single composition root.

```python
from __future__ import annotations
from typing import Protocol


# --- Domain Layer: Protocols (interfaces the domain needs) ---


class OrderRepository(Protocol):
    """Minimal interface for order persistence — only declares methods actually called."""

    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...


class NotificationChannel(Protocol):
    """Minimal interface for sending order confirmations."""

    def send_confirmation(self, email: str, order_id: str, total_cents: int) -> bool: ...


class Logger(Protocol):
    """Minimal logging interface."""

    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


# --- Infrastructure Layer: Concrete implementations ---


class PostgresOrderRepo:
    """Production repository backed by PostgreSQL via psycopg2.

    This class lives in the infrastructure layer and imports real database packages.
    It implements OrderRepository protocol so domain code can depend on it without
    knowing about PostgreSQL at all.
    """

    def __init__(self, connection_string: str, logger: Logger) -> None:
        self._logger = logger
        # Real code: self._conn = psycopg2.connect(connection_string)

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        self._logger.info(f"Saving order {order_id} for user {user_id}")
        # Real code: execute INSERT via self._conn

    def get(self, order_id: str) -> dict | None:
        self._logger.info(f"Fetching order {order_id}")
        # Real code: execute SELECT, return row as dict
        return {"id": order_id, "user_id": user_id, "total_cents": total_cents}


class SmtpNotificationChannel:
    """Production notification channel using SMTP.

    Implements NotificationChannel protocol for email delivery.
    """

    def __init__(self, host: str, port: int = 587, logger: Logger | None = None) -> None:
        self._host = host
        self._port = port
        self._logger = logger or _NullLogger()

    def send_confirmation(self, email: str, order_id: str, total_cents: int) -> bool:
        self._logger.info(f"Sending confirmation to {email} for order {order_id}")
        # Real code: connect to SMTP and send email via smtplib
        return True


class ConsoleLogger:
    """Simple console logger implementing Logger protocol."""

    def info(self, message: str) -> None:
        print(f"[INFO] {message}")

    def error(self, message: str) -> None:
        print(f"[ERROR] {message}", flush=True)


class _NullLogger:
    """No-op logger used when no logger is provided."""

    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


# --- Domain Layer: Service (depends on Protocols only) ---


class OrderService:
    """Core order management business logic.

    Depends exclusively on Protocol interfaces — no imports of sqlite3, httpx,
    psycopg2, or any other infrastructure package. This makes the class inherently
    testable: construct it with fakes and all I/O disappears.
    """

    def __init__(
        self,
        repo: OrderRepository,
        notifier: NotificationChannel,
        logger: Logger,
    ) -> None:
        self._repo = repo
        self._notifier = notifier
        self._logger = logger

    def create_order(self, user_id: str, email: str, items: list[dict], total_cents: int) -> str:
        """Create a new order with the given items.

        Validates input, persists the order, and sends a confirmation notification.
        All side effects flow through injected dependencies.
        """
        if not items:
            raise ValueError("Order must contain at least one item")

        # Deterministic ID generation (could be replaced by a UUID generator Protocol)
        order_id = f"ord_{user_id}_{len(items)}"

        # Side effects are delegated — no infrastructure created here
        self._repo.save(order_id=order_id, user_id=user_id, total_cents=total_cents)
        self._notifier.send_confirmation(email, order_id, total_cents)
        self._logger.info(f"Order {order_id} created for user {user_id}")

        return order_id

    def get_order(self, order_id: str) -> dict | None:
        """Retrieve an existing order by ID."""
        return self._repo.get(order_id)
```

### Pattern 2: Interface Segregation — Small Protocols vs Fat Interfaces

A common mistake is declaring a single "God Protocol" with every method that any consumer might ever need. This forces test doubles to implement methods they will never call, bloating test code and making it harder to see what the real interface contract is.

```python
# ❌ BAD — God Protocol: every consumer gets methods it doesn't use.
# The OrderService only calls save() and get(), but must implement all 8 methods.
# Test doubles become enormous and fragile — changing a method signature in one
# consumer breaks every other consumer's fake.

class GodRepository(Protocol):
    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...
    def delete(self, order_id: str) -> bool: ...
    def list_all(self, page: int, page_size: int) -> list[dict]: ...
    def count(self) -> int: ...
    def exists(self, order_id: str) -> bool: ...
    def bulk_save(self, orders: list[tuple[str, str, int]]) -> int: ...
    def archive(self, older_than_days: int) -> int: ...


class OrderServiceBad:
    """Consumer of GodRepository — only needs save() and get().

    The Protocol declares 8 methods, but this service uses exactly 2.
    Any fake implementing this protocol must stub out all 8 methods,
    even the 6 it never calls.
    """

    def __init__(self, repo: GodRepository, logger: Logger) -> None:
        self._repo = repo
        self._logger = logger

    def create_order(self, user_id: str, email: str, items: list[dict], total_cents: int) -> str:
        if not items:
            raise ValueError("Order must contain at least one item")
        order_id = f"ord_{user_id}_{len(items)}"
        self._repo.save(order_id=order_id, user_id=user_id, total_cents=total_cents)
        return order_id


# ✅ GOOD — Segregated Protocols: each declares only what its consumers need.

class OrderWriteRepo(Protocol):
    """Repository interface for write operations on orders."""

    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...


class OrderReadRepo(Protocol):
    """Repository interface for read operations on orders."""

    def get(self, order_id: str) -> dict | None: ...


class OrderServiceGood:
    """Consumer uses the exact interfaces it needs.

    No God Protocol — if a method isn't in the Protocol, the service can't call it.
    Test doubles implement only 1-2 methods, making them trivially small and correct.
    """

    def __init__(self, write_repo: OrderWriteRepo, read_repo: OrderReadRepo, logger: Logger) -> None:
        self._write = write_repo
        self._read = read_repo
        self._logger = logger

    def create_order(self, user_id: str, email: str, items: list[dict], total_cents: int) -> str:
        if not items:
            raise ValueError("Order must contain at least one item")
        order_id = f"ord_{user_id}_{len(items)}"
        self._write.save(order_id=order_id, user_id=user_id, total_cents=total_cents)
        return order_id

    def get_order(self, order_id: str) -> dict | None:
        return self._read.get(order_id)


# --- Test doubles for segregated interfaces (each is 5-10 lines) ---

class FakeWriteRepo:
    """Test double for OrderWriteRepo — tracks all save calls."""

    def __init__(self) -> None:
        self.save_calls: list[tuple[str, str, int]] = []
        self._store: dict[str, dict] = {}

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        self.save_calls.append((order_id, user_id, total_cents))
        self._store[order_id] = {"id": order_id, "user_id": user_id, "total_cents": total_cents}


class FakeReadRepo:
    """Test double for OrderReadRepo — simple in-memory store."""

    def __init__(self) -> None:
        self._store: dict[str, dict] = {}

    def get(self, order_id: str) -> dict | None:
        return self._store.get(order_id)

    def seed(self, order_id: str, user_id: str, total_cents: int) -> None:
        """Helper for test setup — not part of the Protocol."""
        self._store[order_id] = {"id": order_id, "user_id": user_id, "total_cents": total_cents}
```

### Pattern 3: Pure Function Boundaries

The most reliable way to achieve testability is to separate deterministic domain logic from I/O-bound boundary code. Pure functions have no hidden state and no side effects — they transform inputs into outputs deterministically. Test them first with `assert` statements alone, then build the thin I/O layer on top.

```python
from __future__ import annotations
from typing import NamedTuple


# --- Domain Layer: Pure Functions (zero dependencies, zero imports) ---


class OrderSummary(NamedTuple):
    """Immutable value object representing a completed order's financial summary."""

    order_id: str
    subtotal_cents: int
    tax_cents: int
    discount_cents: int
    total_cents: int
    item_count: int


def calculate_subtotal(items: list[dict]) -> int:
    """Calculate the pre-tax, pre-discount subtotal in cents.

    Each item must have 'price_cents' (integer) and 'quantity' (int >= 1).
    Returns sum of price_cents * quantity for all items.
    Raises ValueError if any item has invalid data.
    """
    subtotal = 0
    for i, item in enumerate(items):
        price = item.get("price_cents")
        qty = item.get("quantity", 1)

        if price is None:
            raise ValueError(f"Item {i}: missing 'price_cents' field")
        if not isinstance(price, int) or price < 0:
            raise ValueError(f"Item {i}: price_cents must be a non-negative integer, got {price}")
        if not isinstance(qty, int) or qty < 1:
            raise ValueError(f"Item {i}: quantity must be an integer >= 1, got {qty}")

        subtotal += price * qty

    return subtotal


def calculate_tax(subtotal_cents: int, tax_rate: float = 0.08) -> int:
    """Calculate tax amount in cents given a subtotal and tax rate.

    Tax is rounded down (truncated) to avoid overcharging customers.
    """
    if not 0 <= tax_rate <= 1:
        raise ValueError(f"tax_rate must be between 0 and 1, got {tax_rate}")

    return int(subtotal_cents * tax_rate)


def apply_discount(
    total_before_discount: int,
    discount_pct: float = 0.0,
    min_order_cents: int = 5000,
) -> tuple[int, str]:
    """Apply a percentage discount if the order meets the minimum threshold.

    Returns a tuple of (discount_amount_cents, reason).
    If the order doesn't qualify, discount_amount is 0 and reason explains why.
    """
    if not 0 <= discount_pct <= 1:
        raise ValueError(f"discount_pct must be between 0 and 1, got {discount_pct}")

    if total_before_discount < min_order_cents:
        return (0, f"order below minimum ${min_order_cents // 100}.00")

    discount = int(total_before_discount * discount_pct)
    return (discount, f"{discount_pct * 100:.0f}% applied")


def build_order_summary(
    order_id: str,
    items: list[dict],
    tax_rate: float = 0.08,
    discount_pct: float = 0.0,
) -> OrderSummary:
    """Build the complete financial summary for an order.

    Composes the pure calculation functions in the correct dependency order:
    subtotal → tax → discount → final total. All deterministic, all testable
    with zero fakes or mocks needed.
    """
    subtotal = calculate_subtotal(items)
    tax = calculate_tax(subtotal, tax_rate)
    discount_amount, _reason = apply_discount(subtotal + tax, discount_pct)

    total = subtotal + tax - discount_amount

    return OrderSummary(
        order_id=order_id,
        subtotal_cents=subtotal,
        tax_cents=tax,
        discount_cents=discount_amount,
        total_cents=total,
        item_count=sum(item.get("quantity", 1) for item in items),
    )


# --- Boundary Layer: I/O operations that compose pure functions ---


class OrderValidator:
    """Validates order inputs before passing to pure functions.

    This boundary class checks business rules but delegates all calculations
    to pure functions, making the domain logic 100% testable.
    """

    MAX_ITEMS = 100
    MIN_TOTAL_CENTS = 100

    def validate(self, items: list[dict]) -> None:
        """Raise ValueError if the order violates business constraints."""
        if not items:
            raise ValueError("Order must contain at least one item")
        if len(items) > self.MAX_ITEMS:
            raise ValueError(f"Order exceeds maximum of {self.MAX_ITEMS} items")

    def check_total(self, total_cents: int) -> None:
        """Ensure the order meets the minimum total requirement."""
        if total_cents < self.MIN_TOTAL_CENTS:
            raise ValueError(
                f"Order total ${total_cents / 100:.2f} is below minimum ${self.MIN_TOTAL_CENTS / 100:.2f}"
            )


# --- Test examples: pure functions tested with zero fakes ---

def test_calculate_subtotal() -> None:
    """Pure function — just assert inputs and outputs."""
    items = [
        {"price_cents": 1500, "quantity": 2},
        {"price_cents": 3000, "quantity": 1},
    ]
    assert calculate_subtotal(items) == 6000


def test_calculate_tax() -> None:
    """Pure function — deterministic rounding behavior."""
    assert calculate_tax(1000, 0.08) == 80   # exact
    assert calculate_tax(1050, 0.08) == 84   # truncation (84.0 → 84)
    assert calculate_tax(999, 0.08) == 79    # truncation (79.92 → 79)


def test_apply_discount_qualifies() -> None:
    """Discount applied when order meets minimum."""
    amount, reason = apply_discount(10000, discount_pct=0.1, min_order_cents=5000)
    assert amount == 1000
    assert "10%" in reason


def test_apply_discount_below_minimum() -> None:
    """No discount when order is below minimum threshold."""
    amount, reason = apply_discount(3000, discount_pct=0.1, min_order_cents=5000)
    assert amount == 0
    assert "below minimum" in reason


def test_build_order_summary_full_flow() -> None:
    """Composed pure functions — full financial calculation pipeline."""
    items = [
        {"price_cents": 2500, "quantity": 3},
        {"price_cents": 1500, "quantity": 1},
    ]
    summary = build_order_summary(
        order_id="ord-123",
        items=items,
        tax_rate=0.08,
        discount_pct=0.1,
    )

    assert summary.order_id == "ord-123"
    assert summary.subtotal_cents == 9000    # 2500*3 + 1500*1
    assert summary.tax_cents == 720          # 9000 * 0.08
    assert summary.discount_cents == 900     # 9000 * 0.1 (applied to subtotal)
    assert summary.total_cents == 9000 + 720 - 900  # 8820
    assert summary.item_count == 4


# --- Boundary: I/O service that composes pure functions with fake-friendly injection ---

from typing import Protocol


class OrderPersistRepo(Protocol):
    def save(self, order_id: str, data: dict) -> None: ...


class OrderNotifier(Protocol):
    def send_confirmation(self, email: str, summary: OrderSummary) -> bool: ...


class OrderBoundaryService:
    """Thin boundary service that validates, computes via pure functions, and persists.

    All business calculations go through pure functions. I/O (persistence, notifications)
    is injected via Protocols so this can be tested with fakes.
    """

    def __init__(
        self,
        repo: OrderPersistRepo,
        notifier: OrderNotifier,
        validator: OrderValidator | None = None,
    ) -> None:
        self._repo = repo
        self._notifier = notifier
        self._validator = validator or OrderValidator()

    def process_order(self, user_email: str, items: list[dict], discount_pct: float = 0.0) -> OrderSummary:
        """Process an order: validate, calculate, persist, notify."""
        # Validate inputs
        self._validator.validate(items)

        # Generate deterministic order ID
        order_id = f"ord_{user_email.split('@')[0]}_{len(items)}"

        # Compose pure functions (zero I/O)
        summary = build_order_summary(
            order_id=order_id,
            items=items,
            tax_rate=0.08,
            discount_pct=discount_pct,
        )

        # Validate business constraints on computed total
        self._validator.check_total(summary.total_cents)

        # Persist (injected — fakeable)
        self._repo.save(order_id, summary._asdict())

        # Notify (injected — fakeable)
        self._notifier.send_confirmation(user_email, summary)

        return summary
```

### Pattern 4: Composition Root Factory — Production vs Test Wiring

A composition root is a single function that imports all concrete classes and assembles the object graph. The same calling code works in production and tests because both use identical Protocol types — only the factory differs.

```python
from __future__ import annotations
import os
import contextlib


# --- Fakes (test doubles implementing the Protocols) ---


class FakeOrderRepo:
    """Complete fake implementing OrderRepository for unit testing.

    Tracks all method calls so tests can assert behavior: how many times
    was save called? With what arguments? What did get return?
    """

    def __init__(self) -> None:
        self._store: dict[str, dict] = {}
        self.save_calls: list[dict] = []
        self.get_calls: list[str] = []

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        self.save_calls.append({
            "order_id": order_id,
            "user_id": user_id,
            "total_cents": total_cents,
        })
        self._store[order_id] = {"id": order_id, "user_id": user_id, "total_cents": total_cents}

    def get(self, order_id: str) -> dict | None:
        self.get_calls.append(order_id)
        return self._store.get(order_id)


class FakeNotificationChannel:
    """Fake notification channel that records all sent messages."""

    def __init__(self) -> None:
        self.sent_messages: list[dict] = []
        self.send_count: int = 0

    def send_confirmation(self, email: str, order_id: str, total_cents: int) -> bool:
        self.sent_messages.append({
            "email": email,
            "order_id": order_id,
            "total_cents": total_cents,
        })
        self.send_count += 1
        return True


class FakeLogger:
    """Fake logger that captures log messages for verification."""

    def __init__(self) -> None:
        self.info_messages: list[str] = []
        self.error_messages: list[str] = []

    def info(self, message: str) -> None:
        self.info_messages.append(message)

    def error(self, message: str) -> None:
        self.error_messages.append(message)


# --- Composition Roots ---


def build_production_app(
    db_connection_string: str | None = None,
    smtp_host: str = "smtp.gmail.com",
    smtp_port: int = 587,
) -> OrderService:
    """Production composition root.

    This is the ONE place in the entire application where concrete infrastructure
    classes are imported and instantiated. All business logic depends only on
    Protocol types injected through constructors.

    Parameters accept configuration values (connection strings, API keys).
    No internal dependencies are created here — they flow through construction.
    """
    # 1. Leaf dependency
    logger = ConsoleLogger()

    # 2. Infrastructure adapters
    connection_string = db_connection_string or os.getenv("DATABASE_URL", "sqlite:///orders.db")
    repo = PostgresOrderRepo(connection_string=connection_string, logger=logger)
    notifier = SmtpNotificationChannel(host=smtp_host, port=smtp_port, logger=logger)

    # 3. Domain service — depends only on Protocols
    service = OrderService(repo=repo, notifier=notifier, logger=logger)

    return service


@contextlib.contextmanager
def build_test_app() -> OrderService:
    """Test composition root (context manager for clean isolation).

    Returns a fully wired service with all dependencies faked.
    The context manager guarantees fake state is reset between tests.

    Usage:
        with build_test_app() as app:
            order_id = app.create_order(...)
            assert len(app._repo.save_calls) == 1
    """
    repo = FakeOrderRepo()
    notifier = FakeNotificationChannel()
    logger = FakeLogger()

    service = OrderService(repo=repo, notifier=notifier, logger=logger)

    try:
        yield service
    finally:
        # Reset fakes for isolation between test cases
        repo.save_calls.clear()
        repo._store.clear()
        notifier.sent_messages.clear()
        notifier.send_count = 0
        logger.info_messages.clear()
        logger.error_messages.clear()


# --- Complete Test Examples ---


def test_order_creation_wires_full_graph() -> None:
    """Verify the composition root creates a complete, working object graph."""
    with build_test_app() as app:
        order_id = app.create_order(
            user_id="alice",
            email="alice@example.com",
            items=[{"price_cents": 2500, "quantity": 2}],
            total_cents=5000,
        )

        # Verify the repo was called correctly
        assert len(app._repo.save_calls) == 1
        call = app._repo.save_calls[0]
        assert call["user_id"] == "alice"
        assert call["total_cents"] == 5000

        # Verify notification was sent
        assert app._notifier.send_count == 1
        msg = app._notifier.sent_messages[0]
        assert msg["email"] == "alice@example.com"

        # Verify logger recorded the event
        assert len(app._logger.info_messages) >= 1
        assert order_id in app._logger.info_messages[0]


def test_get_order_retrieves_from_repo() -> None:
    """Verify read path goes through injected repository."""
    with build_test_app() as app:
        # Seed the fake repo
        app._repo.save("ord-123", "bob", 9999)

        result = app.get_order("ord-123")

        assert result is not None
        assert result["user_id"] == "bob"
        assert len(app._repo.get_calls) == 1


def test_empty_order_raises_before_persistence() -> None:
    """Verify validation happens before any side effects."""
    with build_test_app() as app:
        try:
            app.create_order(
                user_id="charlie",
                email="charlie@example.com",
                items=[],  # Empty — should fail fast
                total_cents=0,
            )
        except ValueError as exc:
            assert "at least one item" in str(exc)

        # Neither persistence nor notification should have fired
        assert app._repo.save_calls == []
        assert app._notifier.send_count == 0
```

---

## Anti-Patterns

| Anti-Pattern | Symptoms | Fix |
|---|---|---|
| **Tight Coupling** — class creates its own infrastructure in `__init__` | `self._db = sqlite3.connect(...)`, `self._client = httpx.Client()`, or any direct import + instantiation inside the class | Extract to a Protocol, add constructor parameter, wire at composition root |
| **Static Methods on Shared State** — `@staticmethod` that reads globals or module-level caches | Module-level `DATABASE = ...`, shared mutable dicts accessed by static methods, no way to inject test data | Replace with pure functions (no state needed) or inject dependencies via constructor |
| **Hidden Dependencies** — class calls a global registry, service locator, or framework container inside method bodies | `Container.get("repo")`, `get_current_user()`, implicit framework resolution that's invisible to type checkers | Make every dependency an explicit constructor parameter typed as Protocol |
| **God Objects / God Classes** — single class with 50+ methods handling DB, HTTP, business logic, and formatting | File exceeds 500 lines, class has no clear single responsibility, adding a feature requires touching unrelated code | Extract protocols for each concern; delegate to smaller, focused classes wired at the composition root |
| **Global Config as Mutable State** — reading env vars or config files inside domain logic instead of passing values through construction | `os.environ["DB_URL"]` called inside a service method, config file read during request processing | Read configuration once at the composition root; pass values as constructor parameters or function arguments |

---

## DfT vs TDD — Clarification

Design for Testability and Test-Driven Development are **orthogonal concerns**:

- **DfT is architectural** — it determines *whether* your code can be tested in isolation. It's about the structure of your classes, how dependencies flow, and where pure functions live. You cannot unit-test a class that creates its own database connection internally, regardless of how many tests you write.

- **TDD is methodological** — it determines *when* you write tests relative to implementation. Write the test first (red), write minimal code to pass it (green), refactor (clean). TDD works beautifully on code that is already DfT-clean, and it's painful on code that isn't.

**The relationship:** DfT enables TDD. Clean architecture makes writing tests-first easy because the interfaces are small, pure functions require zero fakes, and composition roots make test doubles trivial. But you can apply DfT without TDD (write tests after implementation) and you can practice TDD without DfT (but you'll fight the codebase every step).

**Practical rule:** Apply DfT patterns whenever you're about to write a class that performs I/O. Don't wait for a failing test — design for testability proactively, then let TDD guide the implementation of each component.

---

## Constraints

### MUST DO
- Declare every injected dependency as a `typing.Protocol` method signature with typed parameters and return values
- Extract only the methods actually called by the consumer into each Protocol — interface segregation prevents bloated test doubles
- Place pure functions in a module with zero imports other than `typing`, `dataclasses`, `contextlib`, and standard library math utilities
- Build a single production composition root function that imports all concrete infrastructure classes; create a separate test factory with identical calling conventions
- Name fake classes with the `Fake` prefix (e.g., `FakeOrderRepo`) to make them visually distinguishable from production code
- Verify zero real I/O during unit tests by running tests with network disabled (`iptables -A OUTPUT -p tcp --dport 5432 -j DROP`) or database isolated via `:memory:` SQLite

### MUST NOT DO
- Use concrete class types as constructor parameters in domain modules — if a service takes `PostgresOrderRepo` instead of `OrderRepository`, it is not testable without mocking internals
- Import infrastructure packages (`psycopg2`, `httpx`, `sqlite3`, `boto3`) inside business logic files — all such imports belong exclusively in the infrastructure layer and composition root
- Use `None` as a default constructor argument to hide required dependencies — `def __init__(self, repo: Repo | None = None)` means the dependency is optional when it should be required; raise early instead
- Write test doubles that inherit from production classes via `unittest.mock.patch` on real methods — hand-written fakes implementing Protocols are faster, more reliable, and show exactly what interface contract your code depends on

---

## Related Skills

| Skill | Purpose |
|---|---|
| `test-driven-development` | Methodology for writing tests before implementation; complements DfT's architectural approach — together they ensure code is both well-designed and thoroughly verified |
| `dependency-inversion-principle` | SOLID principle that DfT enforces structurally: high-level domain code depends on Protocols injected through constructors, never on concrete infrastructure implementations |
| `hexagonal-architecture` | Broader architectural pattern where ports (Protocols) define boundaries and adapters (concrete classes) implement them — composition roots wire everything together at the center |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Python `typing.Protocol` Documentation](https://docs.python.org/3/library/typing.html#typing.Protocol) — Official Python docs for structural subtyping via Protocols (Python 3.8+)
- [Martin Fowler on Inversion of Control](https://martinfowler.com/articles/injection.html) — Foundational article distinguishing Dependency Injection, Service Locator, and IoC containers
- [Mark Seemann's Dependency Injection Series](https://blog.ploeh.dk/2010/02/03/ServiceLocatorisaGodObject/) — Comprehensive writings on DI anti-patterns and best practices
- [SOLID Principles — Interface Segregation (ISP)](https://en.wikipedia.org/wiki/Interface_segregation_principle) — Wikipedia article explaining why fat interfaces lead to fragile designs
- [Pure Functions — Martin Fowler](https://martinfowler.com/bliki/PureFunction.html) — Definition, properties, and benefits of pure functions in software design
- [Python `typing.NamedTuple` Documentation](https://docs.python.org/3/library/typing.html#typing.NamedTuple) — Immutable value objects ideal for domain model outputs from pure functions
- [Composition Root Pattern — Wikipedia](https://en.wikipedia.org/wiki/Composition_root) — The pattern of centralizing dependency assembly at a single entry point
