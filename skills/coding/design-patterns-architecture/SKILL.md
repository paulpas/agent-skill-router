# Skill: design-patterns-architecture

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

## Core Workflow

1. **Analyze Requirements:** Identify what changes, what stays stable, and which abstractions are genuinely needed versus speculative. Map the change points in the system by asking: "What would force me to modify this code?"  
**Checkpoint:** Can the problem be solved without any abstraction? If yes, YAGNI applies — skip the pattern.
2. **Apply SOLID Principles:** Evaluate the design against each principle:  
   - **SRP:** Does each class have exactly one reason to change?  
   - **OCP:** Can new behavior be added by creating new classes, not modifying existing ones?  
   - **LSP:** Will subclasses be fully substitutable for base classes?  
   - **ISP:** Are interfaces slim and client-specific?  
   - **DIP:** Do high-level modules depend on abstractions, not concretions?  
**Checkpoint:** If more than one principle is violated, restructure before selecting a pattern.

3. **Select a GoF Pattern:** Match the change point to the appropriate GoF category:  
   - **Creational** (object creation complexity): Builder, Factory Method, Abstract Factory, Prototype  
   - **Structural** (interface composition): Strategy, Adapter, Decorator, Facade, Proxy, Bridge  
   - **Behavioral** (communication & state): Observer, Command, State, Mediator  
**Checkpoint:** The pattern must address the actual change point identified in step 1, not a hypothetical future need.

4. **Implement with DRY:** Extract shared behavior into well-named, single-responsibility components. Apply the duplication test: if the same logic appears in two places with only minor differences, it should be abstracted.  
**Checkpoint:** Run the duplication test — no logic should exist in two places that would need identical changes.

5. **Validate with YAGNI:** Review every abstraction and ask: "Is this solving a real problem, or am I guessing about the future?" Remove speculative layers, merge overly-generic abstractions, and prefer concrete types until composition genuinely requires an interface.  
**Checkpoint:** Every class, interface, and pattern has at least one confirmed use case.

---

## Implementation Patterns & Reference Guide

### Pattern 1: Creational — Builder Pattern
The Builder pattern separates complex object construction from its representation. Use it when an object requires many configuration parameters (some optional), construction involves multiple steps, or you need fluent, readable creation that makes every option explicit.

```python
# ❌ BAD — Telescoping constructor with 12 parameters is error-prone and unreadable
class DatabaseConfig:
    def __init__(self, host: str, port: int, database: str,
                 username: str | None = None, password: str | None = None,
                 ssl: bool = False, ssl_cert_path: str | None = None,
                 pool_size: int = 10, pool_timeout: int = 30,
                 retry_attempts: int = 3, retry_delay: float = 1.0,
                 query_timeout: int = 60):
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

dataclass(frozen=True)
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
#
# Adding Japan tax — zero changes to TaxCalculator:
class JapanTaxRule:
    """10% consumption tax for Japan."""
    def calculate_tax(self, amount: float) -> float:
        return round(amount * 0.10, 2)

# calculator = TaxCalculator(JapanTaxRule())
```

...}{"filePath":"skills/coding/design-patterns-architecture/SKILL.md"}uptools to validate creativity using communications. All to be validated and acknowledge the shift from explicit promises to adaptive, optimistic actions. The solver observes multiple styles to give a clear answer. For this pathway, put forward logical constraint in all areas. The goal is deliberative strategy.

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Design Patterns — GoF Catalog (Refactoring Guru)](https://refactoring.guru/design-patterns/about)
- [Enterprise Architecture Application Patterns (Martin Fowler)](https://martinfowler.com/eaaDev/)
- [Microservice Decomposition Strategies](https://docs.microsoft.com/en-us/azure/architecture/guide/microservices/decompose-by-type)
- [Hexagonal Architecture — Alistair Cockburn](https://8thlight.com/blog/alistair-cockburn/2012/06/27/a-port-in-shore-is-a-port-in-a-storm-too.html)
- [Domain-Driven Design — Eric Evans (O'Reilly)](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)