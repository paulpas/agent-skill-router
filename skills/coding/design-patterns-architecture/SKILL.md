---
name: design-patterns-architecture
description: Implements GoF design patterns and SOLID/DRY/YAGNI principles to architect
  scalable, maintainable, and testable software systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: design patterns, GoF, SOLID, DRY, YAGNI, architecture, creational patterns,
    structural patterns
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
  related-skills: coding/refactoring, coding/code-review, coding/test-driven-development
------
# Architecture & Design Patterns

Senior software architect designing scalable, maintainable systems using GoF design patterns and SOLID/DRY/YAGNI principles. Evaluates architectural tradeoffs, applies the right pattern to the right problem, and enforces composition over inheritance to produce code that is easy to test, extend, and evolve without premature abstraction.

## TL;DR Checklist

- [ ] Identify the specific change point before selecting any pattern — no pattern for pattern's sake
- [ ] Enforce Single Responsibility: each class has exactly one reason to change
- [ ] Apply Open/Closed Principle through interfaces/protocols, not conditional logic
- [ ] Prefer composition (inject dependencies) over inheritance hierarchies
- [ ] Validate against YAGNI: does this abstraction solve a real problem, or is it speculative?

---

## When to Use

Use this skill when:

- Designing new modules or services and needing structural guidance on how to decompose responsibilities
- Refactoring legacy code that is tightly coupled, hard to test, or impossible to extend without modification
- Resolving conditional logic explosions (long if/elif/else chains) that encode algorithm or strategy selection
- Introducing testability into code that directly instantiates its dependencies instead of receiving them
- Evaluating whether a proposed abstraction is warranted or premature (YAGNI check)
- Managing cross-cutting concerns (logging, caching, validation) that scatter across many classes

---

## When NOT to Use

Avoid applying design patterns when:

- Building a simple script, one-off tool, or prototype where no extension is expected (YAGNI applies directly)
- A standard library function or language feature already solves the problem cleanly (e.g., `dict` instead of custom HashMap)
- For data structures that don't require behavioral flexibility — don't over-engineer simple aggregations
- The team lacks the experience to maintain the chosen pattern correctly — a misunderstood pattern is worse than no pattern
- Adding an abstraction without a concrete second use case — YAGNI demands real evidence before complexity

---

## Core Workflow

1. **Analyze Requirements** — Identify what changes, what stays stable, and which abstractions are genuinely needed versus speculative. Map the change points in the system by asking: "What would force me to modify this code?"
   **Checkpoint:** Can the problem be solved without any abstraction? If yes, YAGNI applies — skip the pattern.

2. **Apply SOLID Principles** — Evaluate the design against each principle:
   - **SRP:** Does each class have exactly one reason to change?
   - **OCP:** Can new behavior be added by creating new classes, not modifying existing ones?
   - **LSP:** Will subclasses be fully substitutable for base classes?
   - **ISP:** Are interfaces slim and client-specific?
   - **DIP:** Do high-level modules depend on abstractions, not concretions?
   **Checkpoint:** If more than one principle is violated, restructure before selecting a pattern.

3. **Select a GoF Pattern** — Match the change point to the appropriate GoF category:
   - **Creational** (object creation complexity): Builder, Factory Method, Abstract Factory, Prototype
   - **Structural** (interface composition): Strategy, Adapter, Decorator, Facade, Proxy, Bridge
   - **Behavioral** (communication & state): Observer, Command, State, Mediator
   **Checkpoint:** The pattern must address the actual change point identified in step 1, not a hypothetical future need.

4. **Implement with DRY** — Extract shared behavior into well-named, single-responsibility components. Apply the duplication test: if the same logic appears in two places with only minor differences, it should be abstracted.
   **Checkpoint:** Run the duplication test — no logic should exist in two places that would need identical changes.

5. **Validate with YAGNI** — Review every abstraction and ask: "Is this solving a real problem, or am I guessing about the future?" Remove speculative layers, merge overly-generic abstractions, and prefer concrete types until composition genuinely requires an interface.
   **Checkpoint:** Every class, interface, and pattern has at least one confirmed use case.

---

## Implementation Patterns & Reference Guide

### Pattern 1: Creational — Builder Pattern

The Builder pattern separates complex object construction from its representation. Use it when an object requires many configuration parameters (some optional), construction involves multiple steps, or you need fluent, readable creation that makes every option explicit.

```python
# ❌ BAD — Telescoping constructor with 12 parameters is error-prone and unreadable
class DatabaseConfig:
    def __init__(
        self, host: str, port: int, database: str,
        username: str | None = None, password: str | None = None,
        ssl: bool = False, ssl_cert_path: str | None = None,
        pool_size: int = 10, pool_timeout: int = 30,
        retry_attempts: int = 3, retry_delay: float = 1.0,
        query_timeout: int = 60,
    ):
        self.host = host
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.ssl = ssl
        self.ssl_cert_path = ssl_cert_path
        self.pool_size = pool_size
        self.pool_timeout = pool_timeout
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self.query_timeout = query_timeout


# Calling this is nearly impossible to read:
config = DatabaseConfig("localhost", 5432, "mydb", "admin", "secret",
                        True, "/certs/db.pem", 20, 45, 5, 2.0, 120)
# Which positional arg is pool_timeout? Impossible to tell.
```

```python
# ✅ GOOD — Builder provides fluent, self-documenting construction
from dataclasses import dataclass, field


@dataclass(frozen=True)
class DatabaseConfig:
    """Immutable database configuration."""
    host: str
    port: int
    database: str
    username: str | None = None
    password: str | None = None
    ssl: bool = False
    pool_size: int = 10
    pool_timeout: int = 30
    retry_attempts: int = 3
    query_timeout: int = 60


class DatabaseConfigBuilder:
    """Fluent builder for DatabaseConfig with validation."""

    def __init__(self, host: str, port: int, database: str) -> None:
        self._host = host
        self._port = port
        self._database = database
        self._username: str | None = None
        self._password: str | None = None
        self._ssl: bool = False
        self._pool_size: int = 10
        self._pool_timeout: int = 30
        self._retry_attempts: int = 3
        self._retry_delay: float = 1.0
        self._query_timeout: int = 60

    def with_credentials(self, username: str, password: str) -> "DatabaseConfigBuilder":
        """Set authentication credentials."""
        self._username = username
        self._password = password
        return self

    def enable_ssl(self, enabled: bool = True) -> "DatabaseConfigBuilder":
        """Enable or disable SSL connection."""
        self._ssl = enabled
        return self

    def with_pool(self, size: int = 10, timeout: int = 30) -> "DatabaseConfigBuilder":
        """Configure connection pool settings."""
        if size <= 0:
            raise ValueError("Pool size must be positive")
        if timeout <= 0:
            raise ValueError("Pool timeout must be positive")
        self._pool_size = size
        self._pool_timeout = timeout
        return self

    def with_retries(self, attempts: int = 3, delay: float = 1.0) -> "DatabaseConfigBuilder":
        """Configure retry behavior."""
        if attempts < 0:
            raise ValueError("Retry attempts cannot be negative")
        self._retry_attempts = attempts
        self._retry_delay = delay
        return self

    def with_timeout(self, seconds: int) -> "DatabaseConfigBuilder":
        """Set query timeout in seconds."""
        if seconds <= 0:
            raise ValueError("Query timeout must be positive")
        self._query_timeout = seconds
        return self

    def build(self) -> DatabaseConfig:
        """Create the immutable configuration."""
        return DatabaseConfig(
            host=self._host,
            port=self._port,
            database=self._database,
            username=self._username,
            password=self._password,
            ssl=self._ssl,
            pool_size=self._pool_size,
            pool_timeout=self._pool_timeout,
            retry_attempts=self._retry_attempts,
            query_timeout=self._query_timeout,
        )


# Usage — self-documenting, impossible to misuse:
config = (DatabaseConfigBuilder("localhost", 5432, "mydb")
          .with_credentials("admin", "secret")
          .enable_ssl()
          .with_pool(size=20, timeout=45)
          .with_retries(attempts=5)
          .with_timeout(120)
          .build())
```

**Why this works:** The builder enforces validation at construction time, produces an immutable result, and every option is visible in the call chain — no positional argument guessing. This satisfies SRP (builder handles construction, config holds state) and is individually testable.

---

### Pattern 2: Structural — Strategy Pattern with SOLID OCP

The Strategy pattern encapsulates interchangeable algorithms behind a common interface, replacing conditional branching with polymorphism. It directly implements the Open/Closed Principle: new strategies can be added without modifying the code that uses them.

```python
# ❌ BAD — Conditional logic violates OCP; every new tax rule requires modifying this class
class TaxCalculator:
    def calculate(self, amount: float, region: str) -> float:
        if region == "us_california":
            return amount * 0.0725
        elif region == "us_new_york":
            return amount * 0.08875
        elif region == "eu_germany":
            return amount * 0.19
        elif region == "eu_france":
            return amount * 0.20
        elif region == "uk":
            return amount * 0.20
        elif region == "jp":
            return amount * 0.10
        elif region == "zero_rated":
            return 0.0
        raise ValueError(f"Unknown region: {region}")

    # Adding a new region requires modifying this method — violates OCP.
    # Testing requires covering every branch.
    # Any change to one region's logic risks breaking others.
```

```python
# ✅ GOOD — Strategy pattern makes tax rules open/closed and independently testable
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol


class TaxRule(Protocol):
    """A tax rule that calculates tax for a given amount."""
    def calculate_tax(self, amount: float) -> float: ...


class CaliforniaTaxRule:
    """7.25% tax for California."""
    def calculate_tax(self, amount: float) -> float:
        return round(amount * 0.0725, 2)


class NewYorkTaxRule:
    """8.875% tax for New York."""
    def calculate_tax(self, amount: float) -> float:
        return round(amount * 0.08875, 2)


class GermanyTaxRule:
    """19% VAT for Germany."""
    def calculate_tax(self, amount: float) -> float:
        return round(amount * 0.19, 2)


class ZeroTaxRule:
    """Zero tax for exempt transactions."""
    def calculate_tax(self, amount: float) -> float:
        return 0.0


@dataclass(frozen=True)
class TaxResult:
    """Immutable result of a tax calculation."""
    amount: float
    tax: float
    total: float

    @property
    def effective_rate(self) -> float:
        return self.tax / self.amount if self.amount > 0 else 0.0


class TaxCalculator:
    """Calculates tax by delegating to the configured strategy.
    
    OCP: Adding a new tax rule requires only creating a new class.
    DIP: TaxCalculator depends on TaxRule (abstraction), not concrete implementations.
    """

    def __init__(self, rule: TaxRule) -> None:
        self._rule = rule

    def calculate(self, amount: float) -> TaxResult:
        """Calculate tax using the configured rule."""
        if amount < 0:
            raise ValueError("Amount cannot be negative")
        tax = self._rule.calculate_tax(amount)
        return TaxResult(amount=amount, tax=tax, total=round(amount + tax, 2))


# Usage — each region gets its own calculable, testable strategy:
# calculator = TaxCalculator(CaliforniaTaxRule())
# result = calculator.calculate(100.0)  # TaxResult(amount=100.0, tax=7.25, total=107.25)

# Adding Japan tax — zero changes to TaxCalculator:
class JapanTaxRule:
    """10% consumption tax for Japan."""
    def calculate_tax(self, amount: float) -> float:
        return round(amount * 0.10, 2)

# calculator = TaxCalculator(JapanTaxRule())
```

**Why this works:** Tax rules are now individually unit-testable, the calculator is decoupled from any specific rule, and adding a new region requires exactly zero changes to existing code. DIP is satisfied — `TaxCalculator` depends on `TaxRule` (the abstraction), never on a concrete implementation.

---

### Pattern 3: Behavioral — Observer Pattern

The Observer pattern defines a one-to-many dependency where changes to a subject automatically notify all registered observers. It replaces manual notification chains with a decoupled publish-subscribe mechanism, ensuring no subscriber is ever forgotten.

```python
# ❌ BAD — Manual notification is error-prone; new subscribers are easily missed
class OrderService:
    def __init__(self) -> None:
        self._email_sender = EmailSender()
        self._inventory = InventoryService()
        self._analytics = AnalyticsService()

    def create_order(self, order: "Order") -> None:
        """Creates an order but notifications are implicit and easy to forget."""
        self._save_order(order)
        # These notifications can be forgotten, reordered, or skipped
        self._email_sender.send(order.customer_email, f"Order confirmed: {order.id}")
        self._inventory.reserve(order.items)
        self._analytics.track("order_created", {"order_id": order.id})
```

```python
# ✅ GOOD — Observer ensures all subscribers are notified automatically and reliably
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class Order:
    """Immutable order value object."""
    id: str = field(default_factory=lambda: str(uuid4()))
    customer_email: str = ""
    items: list[str] = field(default_factory=list)


class OrderObserver(ABC):
    """Interface for objects that want to react to order events."""

    @abstractmethod
    def on_order_created(self, order: Order) -> None: ...


class OrderService:
    """Manages orders with automatic notification via Observer pattern.
    
    SRP: OrderService handles order lifecycle; observers handle side effects.
    OCP: New behaviors can be added by registering new observers without modifying this class.
    """

    def __init__(self) -> None:
        self._observers: list[OrderObserver] = []
        self._orders: list[Order] = []

    def subscribe(self, observer: OrderObserver) -> None:
        """Register an observer to receive order events."""
        if observer not in self._observers:
            self._observers.append(observer)

    def unsubscribe(self, observer: OrderObserver) -> None:
        """Remove an observer."""
        self._observers.remove(observer)

    def create_order(self, customer_email: str, items: list[str]) -> Order:
        """Create a new order and notify all subscribers."""
        order = Order(customer_email=customer_email, items=items)
        self._orders.append(order)
        self._notify_order_created(order)
        return order

    def _notify_order_created(self, order: Order) -> None:
        """Notify all observers of the new order."""
        for observer in self._observers:
            observer.on_order_created(order)


class EmailNotifier(OrderObserver):
    """Sends confirmation email when an order is created."""

    def __init__(self, sender: Any) -> None:
        self._sender = sender

    def on_order_created(self, order: Order) -> None:
        self._sender.send(
            order.customer_email,
            f"Order confirmed: {order.id}",
        )


class InventoryReserver(OrderObserver):
    """Reserves inventory items when an order is created."""

    def __init__(self, inventory: Any) -> None:
        self._inventory = inventory

    def on_order_created(self, order: Order) -> None:
        self._inventory.reserve(order.items)


class AnalyticsTracker(OrderObserver):
    """Tracks order creation events for analytics."""

    def __init__(self, tracker: Any) -> None:
        self._tracker = tracker

    def on_order_created(self, order: Order) -> None:
        self._tracker.track("order_created", {"order_id": order.id})


# Usage — subscription is explicit, side effects are decoupled:
# service = OrderService()
# service.subscribe(EmailNotifier(EmailSender()))
# service.subscribe(InventoryReserver(InventoryService()))
# service.subscribe(AnalyticsTracker(AnalyticsService()))
# order = service.create_order("alice@example.com", ["widget", "gadget"])
```

**Why this works:** `OrderService` never imports or knows about `EmailSender`, `InventoryService`, or `AnalyticsService`. New side effects require only creating a new `OrderObserver` subclass and registering it — zero changes to `OrderService`. Each observer is independently testable.

---

## Constraints

### MUST DO

- Apply composition over inheritance: inject dependencies via constructors or setters rather than building deep class hierarchies
- Use Python type hints and docstrings on all public interfaces (classes, methods, protocols) — they are part of the contract
- Enforce Single Responsibility Principle: if a class has two distinct responsibilities, split it before introducing a pattern
- Validate all inputs at boundaries (guard clauses at the top of methods) and fail fast with descriptive errors for invalid state
- Ensure every pattern has a confirmed, concrete problem it solves — never introduce an abstraction without a present use case (YAGNI)

### MUST NOT DO

- Use Singleton as a dependency management pattern — it hides coupling, prevents testing, and creates implicit global state. Use dependency injection instead.
- Build inheritance hierarchies deeper than three levels — each level adds cognitive load and violates LSP when substitutions break
- Create generic base classes or interfaces for hypothetical future needs — YAGNI demands real evidence before adding complexity
- Implement the Decorator pattern merely to add logging or caching that applies universally — use a single wrapper or middleware at the composition root instead
- Replace a simple function or dataclass with a GoF pattern when no behavioral flexibility is required — keep it simple and concrete

---

## Output Template

When applying this skill to review or design code, produce:

1. **Architectural Assessment** — List each SOLID principle and note whether the current design satisfies or violates it, with specific code references
2. **Pattern Analysis** — Identify which GoF patterns (if any) are present, which are missing but warranted, and whether conditional logic should be refactored into strategies
3. **DRY Violation Report** — Enumerate duplicated logic blocks with file locations and recommend extraction targets (function, class, or strategy)
4. **YAGNI Review** — Flag any abstractions that lack a confirmed use case and recommend concrete simplifications
5. **Refactoring Plan** — Prioritized step-by-step plan starting with the highest-impact changes (tight coupling → SRP violations → pattern introduction), each with expected outcome and risk

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding/refactoring` | Provides concrete refactoring techniques (extract method, replace conditional with strategy) to apply when this skill identifies violations |
| `coding/code-review` | Supplies the review methodology and checklists used to validate that design patterns and SOLID principles are correctly applied |
| `coding/test-driven-development` | Ensures every refactored module and pattern implementation is covered by tests, making structural changes safe to make |

---

*Design patterns are tools, not requirements. The best architecture is the simplest one that solves the actual problem today and remains open to the changes you can reasonably anticipate.*
