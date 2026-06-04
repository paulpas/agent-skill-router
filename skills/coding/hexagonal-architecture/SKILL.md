---
name: hexagonal-architecture
description: Implements hexagonal (ports and adapters) architecture to isolate core
  business logic from external frameworks, databases, and UI for testable, framework-agnostic
  systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: hexagonal architecture, ports and adapters, clean architecture, dependency
    inversion, core business logic, how do i decouple my code, separate business logic
    from framework
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
  related-skills: test-driven-development, event-driven-architecture
---
# Hexagonal Architecture Implementation Guide

Acts as a senior software architect designing framework-agnostic core domains using ports and adapters. Ensures business rules remain independent of external concerns like databases, UIs, or cloud APIs by strictly enforcing the Dependency Inversion Principle (DIP).

## TL;DR Checklist

- [ ] Define primary (driven) and secondary (driving) ports as pure interfaces/abstract classes
- [ ] Implement core domain logic using only port interfaces, never concrete adapters
- [ ] Build adapter implementations that translate external data into core domain models
- [ ] Wire adapters to ports at the composition root (main/bootstrap entry point)
- [ ] Verify zero direct dependencies from core → infrastructure/framework packages in `pyproject.toml` or import paths

---

## When to Use

Use this skill when:

- Designing new systems where long-term maintainability, testability, and framework agility are priorities
- Refactoring tightly coupled monoliths to separate business rules from I/O frameworks (SQL, HTTP, Message Queues)
- Building plugins, SDKs, or libraries that must support multiple external runtimes or databases
- Migrating legacy codebases off specific cloud providers or third-party APIs to reduce vendor lock-in

---

## When NOT to Use

Avoid this skill for:

- Simple scripts, CLI tools, or throwaway prototypes where architectural overhead outweighs immediate delivery value
- Projects with strict sprint deadlines where rapid iteration beats structural purity (apply hexagonal principles iteratively)
- Teams lacking understanding of dependency inversion — the added indirection confuses juniors without proper onboarding
- Read-heavy CRUD applications where ORM/framework tight coupling causes no practical friction

---

## Core Workflow

1. **Identify Domain Entities & Use Cases** — Extract core business rules and invariants. These form the "hexagon core". Apply DDD bounded contexts to define clear domain boundaries. **Checkpoint:** No imports from `database`, `http`, `aws`, or other external packages allowed in core.
2. **Define Ports (Interfaces)** — Create abstract boundaries using Python `Protocol` or `ABC`. Primary ports expose use cases to external actors (controllers, CLI commands). Secondary ports define requirements for external systems (repositories, message buses).
3. **Implement Core Logic Against Ports** — Code domain services and entities using only port interfaces. Inject dependencies via constructor or method parameters. Apply SOLID principles, especially Single Responsibility and Dependency Inversion. **Checkpoint:** Run static analysis (`mypy`, `ruff`) to verify no external framework imports leak into core.
4. **Build Adapters** — Create concrete implementations for each port. Database adapters handle ORM mapping, HTTP controllers parse requests, MQ handlers deserialize events. Each adapter translates external formats into core domain models and vice versa.
5. **Wire at Composition Root** — Assemble the dependency graph in `main()` or a dedicated bootstrap file. Instantiate all adapters and inject them into core use cases via DI container or factory functions.

---

## Implementation Patterns

### Pattern 1: Defining Ports (Protocol-Based Interfaces)

Use Python's `typing.Protocol` for structural subtyping (duck typing interfaces) to keep ports lightweight and framework-agnostic.

```python
from __future__ import annotations
from typing import Protocol, runtime_checkable
from dataclasses import dataclass

# Secondary Port: Defines what the core needs from infrastructure
@runtime_checkable
class OrderRepositoryPort(Protocol):
    async def save(self, order: Order) -> None: ...
    async def get_by_id(self, order_id: str) -> Order | None: ...

# Primary Port: Exposes use cases to external actors (APIs, CLI, Jobs)
@runtime_checkable
class PlaceOrderPort(Protocol):
    async def execute(self, command: PlaceOrderCommand) -> OrderResult: ...
```

### Pattern 2: Core Use Case (Dependency Inversion in Action)

Core logic depends only on ports. No concrete database or HTTP code here.

```python
from dataclasses import dataclass
from enum import Enum

@dataclass(frozen=True)
class PlaceOrderCommand:
    user_id: str
    product_id: str
    quantity: int

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"

@dataclass
class OrderResult:
    status: OrderStatus
    order_id: str | None = None
    
    @classmethod
    def success(cls, order_id: str) -> "OrderResult":
        return cls(status=OrderStatus.CONFIRMED, order_id=order_id)
        
    @classmethod
    def failure(cls, reason: str) -> "OrderResult":
        return cls(status=OrderStatus.PENDING, order_id=None)

class PlaceOrderUseCase:
    """Core business logic. Depends ONLY on ports."""
    
    def __init__(self, order_repo: OrderRepositoryPort):
        self._order_repo = order_repo

    async def execute(self, cmd: PlaceOrderCommand) -> OrderResult:
        # Business rule: quantity must be positive
        if cmd.quantity <= 0:
            return OrderResult.failure("Quantity must be greater than zero")
            
        # Business rule: validate pricing/stock via external port or internal logic
        # ... apply domain rules ...
        
        order = Order(id=str(uuid4()), user_id=cmd.user_id, status=OrderStatus.PENDING)
        await self._order_repo.save(order)
        return OrderResult.success(order.id)
```

### Pattern 3: Adapter Implementation & BAD vs GOOD Comparison

❌ **BAD**: Core directly imports and uses a concrete ORM or framework. Violates DIP, makes unit testing impossible without mocking entire DB connection.

```python
# ❌ BAD: Direct dependency on SQLALchemy leaks into core domain layer
from sqlalchemy.orm import Session  # Framework leak!

class OrderService:
    def __init__(self):
        self.db = Session()  # Hardcoded infrastructure dependency

    async def save_order(self, order: Order) -> None:
        self.db.add(order)
        self.db.commit()  # Tightly coupled to specific database driver
```

✅ **GOOD**: Core communicates through an abstract port. Adapter handles framework specifics at the edge. Enables pure unit tests and easy swapping of SQL ↔ NoSQL ↔ In-memory.

```python
# ✅ GOOD: Framework-specific adapter implements the port contract
from sqlalchemy.ext.asyncio import AsyncSession
from mycore.domain.ports import OrderRepositoryPort  # Import only from core ports
from mycore.domain.models import Order

class SQLAlchemyOrderAdapter(OrderRepositoryPort):
    def __init__(self, session_factory):  # Injected at composition root
        self._session_factory = session_factory

    async def save(self, order: Order) -> None:
        async with self._session_factory() as session:
            await session.execute(insert(OrderTable).values(
                id=order.id, user_id=order.user_id, status=order.status.value
            ))
            await session.commit()  # Adapter handles transaction lifecycle

    async def get_by_id(self, order_id: str) -> Order | None:
        # Translation from DB row to core domain model happens here
        ...
```

---

## Constraints

### MUST DO
- Enforce strict dependency direction: `Core ← Adapters ← External Systems`. Core never knows about adapters.
- Keep ports free of framework-specific types (no `FastAPI.Request`, no `SQLAlchemy.Model` in interface signatures).
- Use constructor injection for all port dependencies to enable explicit wiring at the composition root.
- Write unit tests against core use cases using in-memory mock implementations of ports.
- Document port contracts clearly with docstrings specifying expected preconditions and postconditions.

### MUST NOT DO
- Let core domain code import `fastapi`, `sqlalchemy`, `boto3`, or other external packages directly.
- Mix persistence queries inside business logic methods — push data access to repository adapters.
- Create "god objects" that implement dozens of ports — split responsibilities across focused adapter classes.
- Bypass dependency injection by calling `get_db()` or `get_current_user()` inside core use cases.

---

## Output Template

When implementing or reviewing hexagonal architecture, produce:

1. **Core Module Structure** — Directory layout showing `core/`, `adapters/`, and `ports/` separation
2. **Port Definitions** — List of `Protocol`/`ABC` interfaces with method signatures
3. **Use Case Implementations** — Domain services that consume ports only
4. **Adapter Registrations** — Composition root wiring diagram showing which concrete adapter satisfies which port
5. **Test Strategy** — How in-memory/port stubs isolate core logic from infrastructure during testing

---

## Related Skills

| Skill                      | Purpose                                                  |
| -------------------------- | -------------------------------------------------------- |
| `test-driven-development`  | Write port contracts first, then implement adapters against them |
| `event-driven-architecture`| Extend hexagonal core with event handlers for async boundaries |
