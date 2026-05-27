---
name: solid-principles
description: Implements the five SOLID OOP design principles (SRP, OCP, LSP, ISP, DIP) with Python-specific patterns using Protocols, singledispatch, and explicit dependency injection.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: >-
    SOLID principles, SRP, OCP, LSP, ISP, DIP, single responsibility,
    interface segregation, dependency inversion, typing.Protocol, composition over
    inheritance, how do i design clean oop classes, god class anti-pattern, python oop best practices
  archetypes:
    - tactical
    - educational
  anti_triggers:
    - brainstorming
    - vague ideation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-design-patterns-architecture, coding-refactoring-techniques, coding-code-quality-policies
---

# SOLID Principles — OOP Design Foundation for Python

Implements the five SOLID object-oriented design principles (SRP, OCP, LSP, ISP, DIP) with modern Python patterns. When loaded, this skill makes the model act as a senior Python engineer who applies SOLID principles as diagnostic tools to identify code smells and refactor toward maintainable, extensible designs using Protocols, singledispatch, composition over inheritance, and explicit dependency injection.

## TL;DR Checklist

- [ ] SRP: Every class has exactly one reason to change — extract data access, computation, and orchestration into separate classes
- [ ] OCP: Extend behavior by adding new classes or registry entries, never by editing existing code branches
- [ ] LSP: Subtypes must be substitutable for base types without strengthening preconditions or weakening postconditions
- [ ] ISP: Split fat Protocols/ABCs into focused interfaces; clients depend only on methods they actually use
- [ ] DIP: High-level modules depend on Protocols/ABCs, not concrete implementations; wire at the composition root

---

## When to Use

Use this skill when:

- Refactoring a class that has too many responsibilities (methods spanning data access, computation, I/O, and notifications)
- Adding a new feature requires editing existing code branches with `if isinstance()` chains or long conditionals
- A subclass crashes when used where the base class is expected (LSP violation)
- A Protocol or ABC has 10+ methods but most implementations only use 2–3
- Hardcoded database connections, SMTP servers, or API clients make a class impossible to test without mocking everything
- Writing new code and you want to apply principles proactively instead of refactoring later
- Conducting a code review and spotting "god class" or tight coupling smells

---

## When NOT to Use

Avoid this skill for:

- Simple scripts or one-off data processing notebooks — SOLID overhead is unnecessary for throwaway code
- Performance-critical hot paths where the cost of indirection matters more than extensibility (measure first, then decide)
- Learning basic Python syntax (loops, conditionals, functions) — start with functional patterns before introducing OOP abstractions
- Data migration scripts that run once and modify a database schema

---

## Core Workflow

1. **Identify the Violation** — Read the code and determine which principle is being violated. Look for specific symptoms:
   - SRP: Class has methods for unrelated concerns (database access + business logic + email sending)
   - OCP: Long `if isinstance()` or `match/case` chains that require editing when adding new types
   - LSP: Subclass overrides a method to raise `NotImplementedError` or silently do nothing
   - ISP: Interface/Protocol with 10+ methods where most implementors only need 2–3
   - DIP: Class directly imports and instantiates concrete database, HTTP client, or storage classes
   **Checkpoint:** Name the specific violation before proceeding. If you cannot pinpoint which principle is violated, re-examine the code for multiple overlapping violations.

2. **Extract Abstractions** — For each violation, create the appropriate abstraction:
   - SRP: Split into focused classes — `Repository` (data access), `Calculator` (computation), `Service` (orchestration)
   - OCP: Use registry pattern with dict mapping or `@singledispatchmethod`; replace conditionals with polymorphic dispatch
   - LSP: Replace inheritance with composition or Protocols; ensure subtypes preserve base class preconditions and postconditions
   - ISP: Split monolithic Protocol into orthogonal focused ones (e.g., `Reader` + `Writer` + `Seekable`)
   - DIP: Define a Protocol describing the interface the high-level module needs; inject via constructor
   **Checkpoint:** Every abstraction must be a `Protocol` (structural typing, no inheritance required) or an `ABC` if you need abstract method enforcement. Never use inheritance as your primary extension mechanism in Python — prefer composition and protocols.

3. **Apply Constructor Injection** — Replace hardcoded dependencies with protocol-typed constructor parameters:
   - Every public class must declare its dependencies in `__init__` with type hints using Protocols
   - The composition root (usually `main()` or a factory function) is the ONLY place that wires concrete implementations to abstractions
   - Use `@dataclass(frozen=True)` for value objects and immutable configuration; use mutable dataclasses for entities that change state
   **Checkpoint:** Read the class signature. If you cannot determine all dependencies just from reading `__init__(self, ...)`, the DIP violation is not fixed.

4. **Verify with Tests** — Write tests using real substitutes (in-memory implementations) rather than mocks:
   - Create `InMemory*` classes that implement the same Protocols as your production backends
   - Verify the service works end-to-end without mocking databases, HTTP clients, or message queues
   - Use `AsyncMock(spec=Protocol)` only for external dependencies you cannot easily implement in-memory
   **Checkpoint:** Tests must be able to swap between `InMemory*` and real implementations by passing different constructor arguments — no test-specific code inside the SUT.

5. **Document the Intent** — Add brief comments explaining WHY each abstraction exists:
   - Protocols should have docstrings describing what contract they express (not just repeating method signatures)
   - The composition root should be clearly marked with a comment like `# Composition root` to make dependency wiring visible at a glance
   **Checkpoint:** A new developer reading the Protocol docstring and the composition root should understand the system's architecture in under 2 minutes.

---

## Implementation Patterns / Reference Guide

### Pattern 1: SRP — Single Responsibility Principle

SRP states that a class should have exactly one reason to change. In Python, this means separating data access from computation from orchestration. The most common violation is the "god class" that handles everything.

**Symptoms:**
- Class has methods like `fetch_data()`, `calculate_summary()`, and `send_email()`
- Changing business logic requires modifying database code
- Tests need to mock both a database connection AND an email sender

```python
# ✅ GOOD SRP — three focused classes, each with one reason to change
from dataclasses import dataclass
from datetime import date
from typing import Protocol


@dataclass(frozen=True)
class Transaction:
    id: int
    amount: float
    date: date
    description: str


@dataclass(frozen=True)
class ReportSummary:
    total: float
    average: float
    transaction_count: int
    period_start: date
    period_end: date


# Responsibility 1: Data access only
class TransactionRepository(Protocol):
    async def find_by_date_range(self, start: date, end: date) -> list[Transaction]: ...


# Responsibility 2: Computation only — pure function, no side effects
class ReportCalculator:
    @staticmethod
    def calculate(transactions: list[Transaction]) -> ReportSummary:
        """Compute summary statistics from transactions."""
        if not transactions:
            return ReportSummary(total=0.0, average=0.0, transaction_count=0,
                                 period_start=date.today(), period_end=date.today())
        amounts = [t.amount for t in transactions]
        return ReportSummary(
            total=sum(amounts),
            average=sum(amounts) / len(amounts),
            transaction_count=len(amounts),
            period_start=min(t.date for t in transactions),
            period_end=max(t.date for t in transactions),
        )


# Responsibility 3: Orchestration only — coordinates the other two
class ReportService:
    def __init__(self, repo: TransactionRepository) -> None:
        self._repo = repo

    async def generate(self, start: date, end: date) -> ReportSummary:
        transactions = await self._repo.find_by_date_range(start, end)
        return ReportCalculator.calculate(transactions)
```

### Pattern 2: OCP — Open/Closed Principle

OCP states that software entities should be open for extension but closed for modification. In Python, the modern approach is **composition + Protocols + registry patterns** instead of deep inheritance hierarchies. The #1 OCP violation in Python is long `if isinstance()` chains.

```python
# ❌ BAD OCP — adding a new notification channel requires editing this function
def send_notification(channel: str, recipient: str, message: str) -> bool:
    if channel == "email":
        return send_email(recipient, message)
    elif channel == "sms":
        return send_sms(recipient, message)
    elif channel == "slack":
        return send_slack(recipient, message)
    else:
        raise ValueError(f"Unknown channel: {channel}")


# ✅ GOOD OCP — extend by registering a new channel, no modification needed
from functools import singledispatchmethod
from typing import Protocol


class NotificationChannel(Protocol):
    """Protocol defining what any notification channel must support."""
    async def deliver(self, recipient: str, message: str) -> bool: ...


class EmailChannel:
    async def deliver(self, recipient: str, message: str) -> bool:
        return True


class SMSChannel:
    async def deliver(self, recipient: str, message: str) -> bool:
        return True


class NotificationRouter:
    """Registry-based dispatch — add new channels by registering, never by editing."""

    def __init__(self) -> None:
        self._channels: dict[str, NotificationChannel] = {}

    def register(self, name: str, channel: NotificationChannel) -> None:
        self._channels[name] = channel

    async def notify(self, channel_name: str, recipient: str, message: str) -> bool:
        """Dispatch to the registered channel — closed for modification, open for extension."""
        if channel_name not in self._channels:
            raise ValueError(f"Unknown notification channel: {channel_name}")
        return await self._channels[channel_name].deliver(recipient, message)


# Usage — adding PushChannel requires zero changes to NotificationRouter
router = NotificationRouter()
router.register("email", EmailChannel())
router.register("sms", SMSChannel())
router.register("slack", SlackChannel())
router.register("push", PushChannel())  # New channel — no editing required
```

### Pattern 3: LSP — Liskov Substitution Principle

LSP states that subtypes must be substitutable for their base types without altering correctness. In Python, this means never strengthening preconditions or weakening postconditions. The classic violation is `Square(Rectangle)` where changing width also changes height.

```python
# ❌ BAD LSP — Square inherits Rectangle but breaks its contract
class Rectangle:
    def __init__(self, width: float, height: float) -> None:
        self._width = width
        self._height = height

    @property
    def width(self) -> float:
        return self._width

    @width.setter
    def width(self, value: float) -> None:
        self._width = value


class Square(Rectangle):  # ❌ LSP violation
    @Rectangle.width.setter
    def width(self, value: float) -> None:
        self._width = self._height = value  # Side effect on unrelated property!


def test_area(r: Rectangle) -> float:
    r.width = 10  # If r is a Square, this also changes height to 10
    r.height = 5  # Now height is 5, but width was reset to 5
    return r.area  # Returns 25 instead of expected 50!


# ✅ GOOD LSP — use Protocol + composition; no inheritance hackery
from typing import Protocol


class Shape(Protocol):
    """All shapes support area computation — substitutable via structural typing."""
    def area(self) -> float: ...


class RectangleShape(Shape):
    width: float
    height: float

    def area(self) -> float:
        return self.width * self.height


class SquareShape(Shape):
    side: float

    def area(self) -> float:
        return self.side ** 2


def test_area(shape: Shape) -> None:
    assert isinstance(shape.area(), float)  # ✅ Works for Rectangle and Square equally
```

### Pattern 4: ISP — Interface Segregation Principle

ISP states that clients should not depend on methods they do not use. In Python, split large Protocols into focused, orthogonal ones. A "fat Protocol" with 10+ methods where most implementors only need 2–3 forces unnecessary dependencies.

```python
# ❌ BAD ISP — monolithic protocol forces all implementors to provide unused methods
class DataHandler(Protocol):
    def read(self, path: str) -> bytes: ...
    def write(self, path: str, data: bytes) -> None: ...
    def delete(self, path: str) -> bool: ...
    def compress(self, data: bytes) -> bytes: ...  # Most callers never need this
    def encrypt(self, data: bytes, key: str) -> bytes: ...


class ReadOnlyFileSystem:
    """Forces implementation of write(), delete(), compress(), encrypt() — all raise errors."""
    def read(self, path: str) -> bytes:
        return b"read data"

    def write(self, path: str, data: bytes) -> None:
        raise NotImplementedError("Read-only filesystem")  # Bogus method forced by ISP violation


# ✅ GOOD ISP — focused Protocols that compose naturally
class Reader(Protocol):
    """Only read operations — callers who only read depend only on this."""
    def read(self, path: str) -> bytes: ...
    def exists(self, path: str) -> bool: ...


class Writer(Protocol):
    """Only write operations — callers who only write depend only on this."""
    def write(self, path: str, data: bytes) -> None: ...
    def delete(self, path: str) -> bool: ...


def read_and_process(source: Reader) -> str:
    """Depends only on Reader — swapping implementation won't break this function."""
    data = source.read("data.txt")
    return data.decode("utf-8")


class FullFileSystem:
    """Satisfies all three protocols via structural typing — no interface bloat."""
    def read(self, path: str) -> bytes: ...
    def exists(self, path: str) -> bool: ...
    def write(self, path: str, data: bytes) -> None: ...
    def delete(self, path: str) -> bool: ...
```

### Pattern 5: DIP — Dependency Inversion Principle

DIP states that high-level modules must not depend on low-level modules; both must depend on abstractions. In Python, use Protocols for abstractions and constructor injection with explicit wiring at the composition root. Avoid DI containers in small-to-medium applications.

```python
# ❌ BAD DIP — tight coupling to concrete database
class UserService:
    def __init__(self) -> None:
        self.db = psycopg2.connect("host=localhost dbname=users")  # Hardcoded!

    def get_user(self, user_id: int):
        cursor = self.db.cursor()
        cursor.execute("SELECT id, email FROM users WHERE id = %s", (user_id,))
        return cursor.fetchone()


# ✅ GOOD DIP — depends on Protocol abstraction; concrete impl injected at composition root
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class User:
    id: int
    email: str
    name: str


class UserRepository(Protocol):
    """Abstraction — high-level module depends on this, not on psycopg2."""
    async def get_by_id(self, user_id: int) -> User | None: ...
    async def create(self, email: str, name: str) -> User: ...


class InMemoryUserRepository:
    """Real in-memory implementation — no mocks needed for unit tests."""
    _store: dict[int, User] = {}  # type: ignore[assignment]
    _next_id: int = 1  # type: ignore[assignment]

    async def get_by_id(self, user_id: int) -> User | None:
        return self._store.get(user_id)

    async def create(self, email: str, name: str) -> User:
        user = User(id=self._next_id, email=email, name=name)
        self._store[self._next_id] = user
        self._next_id += 1
        return user


class UserService:
    """No knowledge of how users are stored — depends only on the abstraction."""
    def __init__(self, repo: UserRepository) -> None:  # Constructor injection
        self._repo = repo

    async def get_user(self, user_id: int) -> User | None:
        return await self._repo.get_by_id(user_id)

    async def create_user(self, email: str, name: str) -> User:
        return await self._repo.create(email, name)


# Composition root — the ONLY place that knows about concrete implementations
async def main() -> None:
    repo: UserRepository = InMemoryUserRepository()  # Swappable for tests
    service = UserService(repo)  # Explicit wiring, no magic container
    user = await service.create_user("alice@example.com", "Alice Smith")
```

---

## Constraints

### MUST DO
- Apply each SOLID principle as a diagnostic tool: identify the specific violation before deciding which fix to apply
- Use `typing.Protocol` for structural typing in Python — it creates no inheritance hierarchy and avoids LSP issues entirely
- Replace `if isinstance()` chains with registry patterns or `@singledispatchmethod` when extending behavior
- Inject all dependencies via constructor parameters typed against Protocols, never hardcoded concrete classes
- Keep Protocols small (under 5 methods) — if a Protocol grows beyond 5 methods, split it using the Interface Segregation Principle
- Write tests with real in-memory substitutes before reaching for `AsyncMock(spec=Protocol)`
- Mark the composition root clearly in comments and keep all concrete-to-abstract wiring in one location
- When OCP requires extending existing types, prefer adding new registry entries over editing existing dispatch logic

### MUST NOT DO
- Use inheritance as your primary mechanism for code reuse or extension — composition + Protocols are the Pythonic approach
- Create "god classes" that handle data access, business logic, I/O, and notifications all in one class
- Strengthen preconditions in subclasses (don't require more from callers than the base class does) or weaken postconditions
- Use DI containers (`dependency-injector`, `punq`) for small-to-medium applications — factory functions + explicit injection are preferred
- Apply SOLID principles to simple scripts, notebooks, or one-off data migrations where the indirection cost outweighs benefits
- Create abstractions before there is a demonstrated need — avoid YAGNI alongside KISS
- Use `assert` for user input validation (disabled with `-O` flag); use `raise ValueError/TypeError` for public contracts instead
- Name Protocols with an "I" prefix (`IService`, `IRepository`) — Python conventions omit the interface prefix

---

## Decision Matrix: When to Apply Which Principle

| Code Smell Observed | Likely Violation | Quick Fix |
|---|---|---|
| "This class has too many methods" | SRP | Extract responsibilities into separate classes |
| "Every new feature requires editing old code" | OCP | Registry pattern + `@singledispatchmethod` |
| "My subclass crashes when used as base type" | LSP | Replace inheritance with Protocol or composition |
| "Changing one interface breaks everything" | ISP | Split fat Protocol into focused ones |
| "I can't test without mocking the database" | DIP | Define Protocol, inject via constructor |

---

## Testing Strategies with SOLID Design

```python
# ✅ GOOD: Test with real in-memory substitutes (preferred over mocks)
import pytest


class InMemoryOrderRepository:
    """Real implementation using dict — no mocking, exercises actual code paths."""
    def __init__(self) -> None:
        self._store: dict[int, Order] = {}
        self._next_id: int = 1

    async def save(self, order: Order) -> Order:
        saved = Order(id=self._next_id, **order.__dict__)
        self._store[self._next_id] = saved
        self._next_id += 1
        return saved

    async def get_by_id(self, order_id: int) -> Order | None:
        return self._store.get(order_id)


@pytest.mark.asyncio
async def test_order_service_validates_price() -> None:
    repo = InMemoryOrderRepository()
    notifier = RecordingNotificationService()
    pricing = FakePricingService(expected_total=100.0)

    service = OrderService(repository=repo, notifier=notifier, pricing_service=pricing)
    order = Order(user_id=1, total=100.0, items=[])

    result = await service.process_order(order)

    assert result.success is True


# ✅ GOOD: Use AsyncMock only for external dependencies you cannot implement in-memory
from unittest.mock import AsyncMock, MagicMock


@pytest.mark.asyncio
async def test_order_service_calls_notification() -> None:
    mock_repo = AsyncMock(spec=OrderRepository)
    mock_repo.save.return_value = Order(id=42, user_id=1, total=100.0, items=[])

    mock_notifier = AsyncMock(spec=NotificationService)

    pricing = FakePricingService(expected_total=100.0)
    service = OrderService(repository=mock_repo, notifier=mock_notifier, pricing_service=pricing)

    order = Order(user_id=1, user_email="test@example.com", total=100.0, items=[])
    await service.process_order(order)

    mock_notifier.send.assert_awaited_once()
```

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-design-patterns-architecture` | Broader architecture patterns including microservices, event sourcing, and CQRS |
| `coding-refactoring-techniques` | Specific refactoring operations like Extract Method, Rename Variable, Extract Class |
| `coding-code-quality-policies` | Code review policies, quality gates, CI checks for code standards enforcement |

---

## Live References

> Authoritative documentation links for SOLID principles and Python OOP patterns.

- [PEP 544 — Protocols](https://peps.python.org/pep-0544/) — Structural subtyping specification for `typing.Protocol`
- [Python Data Model Docs](https://docs.python.org/3/reference/datamodel.html) — Protocol, ABC, and descriptor documentation
- [Effective Python 2nd Edition (Brett Slatkin)](https://effectivepython.com/) — Modern Python best practices covering SOLID patterns
- [SOLID Principles Overview](https://en.wikipedia.org/wiki/SOLID) — General reference for all five principles
- [Python `functools.singledispatch`](https://docs.python.org/3/library/functools.html#functools.singledispatchmethod) — Type-based polymorphism for OCP
- [Dependency Injection in Python (Martin Fowler)](https://martinfowler.com/articles/injection.html) — Original IoC/DI reference article
