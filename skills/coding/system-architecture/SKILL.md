---
name: system-architecture
description: Implements architectural patterns (hexagonal, layered, event-driven)
  with dependency injection and boundary constraints to build maintainable, scalable
  systems.
license: MIT
compatibility: opencode
metadata:
  version: 1.0.0
  domain: coding
  triggers: system architecture, software design, hexagonal architecture, ports and
    adapters, layered architecture, dependency injection, architectural boundaries,
    event-driven, microservices, monolith design, scalable systems, maintainable code
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
  related-skills: test-driven-development, error-handling, modular-design, api-design
------
# System Architecture Manager

Implements architectural patterns (hexagonal/ports-and-adapters, layered, event-driven) with explicit dependency injection and boundary constraints to produce maintainable, scalable software systems. When loaded, the model enforces architectural integrity by verifying inward dependency flow, selecting appropriate structural patterns based on scale and domain complexity, and generating concrete implementations that isolate external concerns behind pure interfaces.

## TL;DR Checklist

- [ ] Define port interfaces (abstract contracts) before writing any implementation
- [ ] Verify dependency graph flows inward: infrastructure → application → domain
- [ ] Register all adapters in a DI container at system composition root
- [ ] Apply the Dependency Rule — no domain module may import an infrastructure module
- [ ] Enforce cross-cutting concern isolation via decorators or middleware layers

---

## When to Use

Use this skill when:

- Designing a new application from scratch and choosing among architectural styles
- Refactoring a monolithic codebase with tangled dependencies into clean boundaries
- Implementing hexagonal architecture (ports and adapters) to isolate domain logic from external frameworks
- Adding dependency injection to an existing codebase lacking inversion of control
- Introducing event-driven communication between bounded contexts in a DDD system
- Auditing an existing system for architectural drift — infrastructure leaking knowledge into domain models

---

## When NOT to Use

Avoid this skill for:

- Simple scripts or one-off automation tasks where architecture overhead outweighs benefits
- Hot-path performance-critical code (100+ microsecond latency budgets) — keep it flat and direct
- Data science notebooks focused on exploration — use exploratory analysis patterns instead
- When the team lacks understanding of inversion of control — invest in education first, refactor later

---

## Core Workflow

1. **Assess System Scale and Change Frequency** — Determine the complexity profile: how many bounded contexts exist, how often the domain rules change independently from I/O concerns, and whether deployment independence is required. Map this against a decision tree: single team / stable domain → layered; multiple domains / volatile domain → hexagonal; event-requiring coordination → event-driven. **Checkpoint:** Confirm that at least two independent axes of change exist (e.g., database technology could swap while business rules evolve independently).

2. **Define Domain Port Interfaces** — Extract the core domain services into abstract interfaces (`abc.ABC` in Python) that express *what* the system does, not *how*. Each port must have zero dependencies on framework types, ORM classes, or external APIs. Place these ports in the domain module (the innermost layer). **Checkpoint:** Every method signature uses only primitives, `datetime`, dataclasses/Pydantic models defined in-domain, and standard library types — no third-party imports allowed in port files.

3. **Implement Application Services Against Ports** — Build use-case orchestrators that depend on domain ports (inward direction) but not on infrastructure types. Composition root wires concrete adapters at runtime via dependency injection. Apply the Service Locator or Constructor Injection pattern depending on language constraints. **Checkpoint:** Run a static import audit — no application module file may `import` from an infrastructure directory.

4. **Build Infrastructure Adapters** — For each port interface, create exactly one adapter implementation that translates between the external technology (database driver, HTTP framework, message broker) and the domain contract. Adapters must never expose internal persistence structures or framework types outside their module boundary. **Checkpoint:** Each adapter class accepts its dependencies via constructor injection; no `get_database()` global lookups, no service locators inside adapter code.

5. **Wire Composition Root** — Assemble all ports and adapters at a single entry point (typically `main.py` or `app.factory`). The composition root is the only location where concrete types are resolved to their interfaces. Use a DI container library (e.g., dependency-injector, di, or manual registry) to manage object lifecycles. **Checkpoint:** Trace the full request lifecycle — from HTTP handler → application service → domain port → infrastructure adapter — and confirm each hop is an interface-to-implementation call with zero cross-cutting imports.

6. **Enforce Boundary via Static Analysis** — Apply architecture-level linting rules (e.g., `pytest-dependency-graph`, `import-linter`, or custom `pytest` plugins) to verify that inward dependency flow holds across all modules. Add CI gating on import graph violations. **Checkpoint:** The import graph must show strictly layered edges — no lateral or backward edges between layers.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Hexagonal Architecture (Ports & Adapters)

Hexagonal architecture separates the core domain from external concerns (databases, web frameworks, message queues) by defining two kinds of ports: **driving ports** (entry points called by external actors like REST controllers or CLI commands) and **driven ports** (abstractions the domain needs, like repositories). Adapters implement these ports on behalf of the outside world.

The key invariant is the **Dependency Rule**: source code dependencies point inward. Domain code imports nothing but standard library. Application layer imports domain only. Infrastructure imports application interfaces it implements, never vice versa.

```python
"""domain/ports.py — Pure domain port interfaces. Zero external framework imports."""

from __future__ import annotations

import abc
import uuid
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class Order:
    """Domain entity representing a business order."""
    id: uuid.UUID
    customer_id: uuid.UUID
    items: list[dict[str, str]]  # {sku: qty}
    total: Decimal
    status: str
    created_at: datetime

    def is_pending(self) -> bool:
        return self.status == "pending"


class OrderRepositoryPort(abc.ABC):
    """Driven port: the domain needs to persist and query orders.
    
    The domain does not know whether storage is PostgreSQL, MongoDB, or a file.
    """

    @abc.abstractmethod
    def save(self, order: Order) -> Order:
        """Persist an order and return it with server-assigned fields populated."""

    @abc.abstractmethod
    def by_id(self, order_id: uuid.UUID) -> Order | None:
        """Retrieve an order by its unique identifier."""

    @abc.abstractmethod
    def by_customer(self, customer_id: uuid.UUID) -> list[Order]:
        """Find all orders for a given customer."""


class NotificationPort(abc.ABC):
    """Driven port: the domain needs to send notifications without knowing the transport."""

    @abc.abstractmethod
    def send_order_confirmation(self, order: Order, email: str) -> None:
        """Send an order confirmation email/message."""

    @abc.abstractmethod
    def log_event(self, event_type: str, payload: dict) -> None:
        """Record a domain event for auditing and downstream consumers."""


class CreateOrderPort(abc.ABC):
    """Driving port: external actors (HTTP controller, CLI) call this to invoke the use case."""

    @abc.abstractmethod
    def execute(
        self,
        customer_id: uuid.UUID,
        items: list[dict[str, str]],
    ) -> Order:
        """Create a new order and persist it."""
```

---

### Pattern 2: Domain Service with Application Layer Orchestration

The application service orchestrates the use case by coordinating domain ports. It contains no business rules itself — it delegates to domain logic through port interfaces.

```python
"""application/create_order.py — Use-case orchestrator, depends only on domain ports."""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from decimal import Decimal

from ..domain.ports import CreateOrderPort, Order, OrderRepositoryPort, NotificationPort


class CreateOrderService:
    """Orchestrates the 'create order' use case by coordinating domain ports.
    
    Contains no business rules — delegates validation and state transitions
    to domain logic accessed via port interfaces.
    """

    def __init__(
        self,
        repository: OrderRepositoryPort,
        notifier: NotificationPort,
    ) -> None:
        # Constructor injection — dependencies are provided, never looked up globally
        self._repository = repository
        self._notifier = notifier

    def execute(self, customer_id: uuid.UUID, items: list[dict[str, str]]) -> Order:
        """Execute the create-order use case.
        
        Args:
            customer_id: The buyer's unique identifier
            items: List of {sku: quantity} mappings
            
        Returns:
            The persisted order with server-assigned fields populated
            
        Raises:
            ValueError: If items list is empty or contains invalid quantities
        """
        if not items:
            raise ValueError("Order must contain at least one item")

        for item in items:
            if len(item) != 1:
                raise ValueError(f"Each item must have exactly one key (sku), got {item}")
            qty = next(iter(item.values()))
            if not isinstance(qty, int) or qty <= 0:
                raise ValueError(f"Quantity must be a positive integer, got {qty}")

        total = self._calculate_total(items)
        order = Order(
            id=uuid.uuid4(),
            customer_id=customer_id,
            items=items,
            total=total,
            status="pending",
            created_at=datetime.now(timezone.utc),
        )

        # Persist via driven port — application layer doesn't know how
        persisted = self._repository.save(order)

        # Trigger cross-cutting concern via driven port
        self._notifier.send_order_confirmation(persisted, f"{customer_id}@example.com")
        self._notifier.log_event("order.created", asdict(persisted))

        return persisted

    @staticmethod
    def _calculate_total(items: list[dict[str, str]]) -> Decimal:
        """Calculate order total from line items.
        
        In a full system, this would query a pricing service port.
        Placeholder prices for demonstration.
        """
        PRICE_MAP = {"WIDGET-A": Decimal("9.99"), "WIDGET-B": Decimal("14.99")}
        total = Decimal("0")
        for item in items:
            sku, qty = next(iter(item.items()))
            price = PRICE_MAP.get(sku, Decimal("0"))
            total += price * qty
        return total.quantize(Decimal("0.01"))
```

---

### Pattern 3: Infrastructure Adapter Implementing Driven Ports

The adapter bridges external technology to the domain port contract. It depends on frameworks but is fully encapsulated.

```python
"""infrastructure/order_repository.py — PostgreSQL adapter for OrderRepositoryPort."""

from __future__ import annotations

import json
import uuid
from dataclasses import asdict, fields
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Text, Column, Integer, Numeric, String
from sqlalchemy.orm import Session, declarative_base

from ..domain.ports import Order, OrderRepositoryPort


Base = declarative_base()


class _OrderModel(Base):
    """SQLAlchemy ORM mapping — exists ONLY in the infrastructure layer."""
    __tablename__ = "orders"

    id = Column(String(36), primary_key=True)
    customer_id = Column(String(36), nullable=False, index=True)
    items = Column(Text, nullable=False)  # JSON serialized
    total = Column(Numeric(12, 2), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), nullable=False)


class PostgresOrderRepository(OrderRepositoryPort):
    """PostgreSQL adapter that implements the domain's OrderRepositoryPort.
    
    Translates SQLAlchemy ORM objects to/from domain entities.
    The domain has zero awareness of this class's existence.
    """

    def __init__(self, session_factory) -> None:
        # Injected DB session factory — never holds a global reference
        self._session_factory = session_factory

    def save(self, order: Order) -> Order:
        with self._session_factory() as session:
            model = _OrderModel(
                id=str(order.id),
                customer_id=str(order.customer_id),
                items=json.dumps(order.items),
                total=float(order.total),
                status=order.status,
                created_at=order.created_at,
            )
            session.add(model)
            session.commit()
            session.refresh(model)

        # Return the original domain entity (no ORM leakage)
        return order

    def by_id(self, order_id: uuid.UUID) -> Order | None:
        with self._session_factory() as session:
            model = session.query(_OrderModel).filter_by(id=str(order_id)).first()
            if model is None:
                return None
            return self._to_domain(model)

    def by_customer(self, customer_id: uuid.UUID) -> list[Order]:
        with self._session_factory() as session:
            models = session.query(_OrderModel).filter_by(
                customer_id=str(customer_id),
            ).all()
            return [self._to_domain(m) for m in models]

    @staticmethod
    def _to_domain(model: _OrderModel) -> Order:
        """Map ORM model back to domain entity."""
        return Order(
            id=uuid.UUID(model.id),
            customer_id=uuid.UUID(model.customer_id),
            items=json.loads(model.items),
            total=Decimal(str(model.total)),
            status=model.status,
            created_at=model.created_at,
        )
```

---

### Pattern 4: Composition Root with Dependency Injection Wiring

The composition root is the single entry point that wires all interfaces to concrete implementations. It is the only location in the system where dependency resolution happens.

```python
"""app/composition_root.py — DI wiring container. The only place concrete types are assembled."""

from __future__ import annotations

import uuid
from functools import partial

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from application.create_order import CreateOrderService
from domain.ports import CreateOrderPort, OrderRepositoryPort, NotificationPort
from infrastructure.order_repository import PostgresOrderRepository


def build_composition_root(database_url: str = "sqlite:///orders.db") -> dict[str, object]:
    """Build and return the full dependency graph as a named registry.
    
    This is the application's composition root — the single source of truth
    for how all ports map to their concrete adapter implementations.
    
    Args:
        database_url: SQLAlchemy connection string for the target database
        
    Returns:
        Dictionary mapping port interfaces (by qualified name) to concrete instances
    """
    engine = create_engine(database_url)
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    # Infrastructure adapters — each depends on external technology
    repository = PostgresOrderRepository(session_factory)

    # In production, these would be real implementations:
    # - NotificationPort → SendGrid/Mailgun adapter
    # - LogEventPort → Kafka producer or event store
    notifier = _DummyNotifier()

    # Application services — depend only on port interfaces
    create_order = CreateOrderService(repository=repository, notifier=notifier)

    return {
        "OrderRepositoryPort": repository,
        "NotificationPort": notifier,
        "CreateOrderPort": create_order,
    }


class _DummyNotifier(NotificationPort):
    """Stubs for demonstration — replace with real adapter in production."""

    def send_order_confirmation(self, order, email: str) -> None:
        print(f"[NOTIFY] Confirmation for order {order.id} sent to {email}")

    def log_event(self, event_type: str, payload: dict) -> None:
        print(f"[EVENT] {event_type}: {payload}")


# --- HTTP Handler Layer (Presentation — depends on driving port via DI) ---

def create_order_handler(
    request_body: dict,
    create_order_port: CreateOrderPort = None,
) -> dict:
    """HTTP endpoint handler wired through dependency injection.
    
    The handler receives its port from the DI container, not from a global lookup.
    This enables easy testing and framework-swapping.
    """
    if create_order_port is None:
        raise RuntimeError("create_order_port must be injected by DI container")

    customer_id = uuid.UUID(request_body["customer_id"])
    items = request_body["items"]

    order = create_order_port.execute(customer_id=customer_id, items=items)

    return {
        "order_id": str(order.id),
        "status": order.status,
        "total": str(order.total),
    }
```

---

### Pattern 5: Layered Architecture with Clean Separation

A layered architecture separates concerns into horizontal slices (presentation → application → domain → infrastructure). Unlike hexagonal architecture which uses a vertical dependency ring, layered relies on strict import discipline enforced by static analysis.

**Layer hierarchy (outermost to innermost):**
```
┌─────────────────────────────────────┐
│  Presentation Layer (HTTP, CLI)     │ ← entry points, serialization
├─────────────────────────────────────┤
│  Application Layer (Use Cases)      │ ← orchestration, transaction boundaries
├─────────────────────────────────────┤
│  Domain Layer (Entities, Services)  │ ← business rules, invariants (IMMUTABLE)
├─────────────────────────────────────┤
│  Infrastructure Layer               │ ← databases, external APIs, messaging
└─────────────────────────────────────┘
```

Each layer may import only the layer directly below it. No cross-layer imports. No lateral dependencies between sibling modules unless they share a common lower-layer dependency.

---

## Constraints

### MUST DO
- **MUST enforce inward dependency flow** — domain layer imports zero external packages; application imports only domain; infrastructure imports only domain and application interfaces it implements
- **MUST use `abc.ABC` for all port and interface definitions** — never use concrete classes as injection targets in production code
- **MUST apply constructor injection** (never setter injection or global service locators) for all dependency wiring
- **MUST keep domain entities immutable or use value objects** where state mutations require explicit factory methods (`Order.from_draft()`, `Money.usd(10.99)`)
- **MUST register every adapter in the composition root** — no lazy instantiation or on-demand discovery of infrastructure bindings
- **MUST isolate cross-cutting concerns** (logging, metrics, auth, transactions) via decorators, middleware layers, or aspect-like wrappers that sit above domain logic
- **MUST write a BAD vs GOOD example pair** for every new architectural pattern introduced to prevent common anti-patterns

### MUST NOT DO
- **NEVER let infrastructure knowledge leak into domain models** — entities must not contain ORM decorators, database column definitions, or HTTP annotations
- **NEVER use global singletons or module-level state** as service locators (`get_db()`, `get_cache()` at module scope) — these create invisible coupling that static analysis cannot detect
- **NEVER depend on a specific web framework in application code** — Flask, FastAPI, Django imports are forbidden outside the presentation layer; use plain function signatures with port interfaces instead
- **NEVER place business rules in infrastructure adapters** — repository `save()` methods should not contain pricing logic or order validation; those belong in domain services accessed through ports
- **NEVER create circular dependencies between layers** — if layer A imports B and B imports A, you must refactor one into a shared lower-level module or introduce a new port interface
- **NEVER skip composition root wiring** — every `abc.ABC` must have exactly one concrete implementation bound at startup; unbound interfaces cause silent runtime failures

---

## Anti-Patterns (BAD vs GOOD)

### BAD: Infrastructure Knowledge in Domain Model

```python
# ❌ BAD: ORM decorator on domain entity creates direct coupling to SQLAlchemy
from sqlalchemy import Column, String, Integer
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Order(Base):  # Inherits ORM base — domain now knows about database
    __tablename__ = "orders"
    id = Column(String(36), primary_key=True)       # Database schema in domain model
    customer_id = Column(String(36))                 # Coupled to persistence layer
```

### GOOD: Domain Entity Pure, ORM Mapping in Infrastructure

```python
# ✅ GOOD: Domain entity is a pure dataclass with no framework imports
from dataclasses import dataclass
import uuid
from decimal import Decimal

@dataclass(frozen=True)
class Order:
    id: uuid.UUID
    customer_id: uuid.UUID
    total: Decimal
    status: str

# ORM mapping lives exclusively in infrastructure layer (see Pattern 3 above)
```

### BAD: Global Service Locator Pattern

```python
# ❌ BAD: Module-level global state — invisible coupling, untestable
from sqlalchemy import create_engine
_engine = create_engine("postgresql://localhost/orders")

def get_db_session():
    """Global lookup — callers have no way to know this dependency exists."""
    Session = sessionmaker(bind=_engine)
    return Session()
```

### GOOD: Explicit Constructor Injection

```python
# ✅ GOOD: Dependencies declared in constructor — visible, testable, swappable
class OrderService:
    def __init__(self, db_session_factory) -> None:  # Explicit dependency
        self._session_factory = db_session_factory

    def find(self, order_id: uuid.UUID):
        with self._session_factory() as session:  # Uses injected factory
            ...
```

---

## Decision Guide: Choosing an Architecture Pattern

| Scenario | Recommended Pattern | Why |
|----------|-------------------|-----|
| Single team, stable domain, simple CRUD | **Layered** | Lower cognitive overhead; import discipline sufficient |
| Multiple bounded contexts, volatile domain rules | **Hexagonal (Ports & Adapters)** | Domain remains pure while infrastructure swaps freely |
| Real-time event coordination between services | **Event-Driven + CQRS** | Decouples producers from consumers; enables eventual consistency |
| High-frequency trading / sub-millisecond latency | **Flat monolith with modular packages** | Architectural indirection adds unacceptable overhead |
| Long-running saga / distributed transaction | **Event-Driven + Saga Orchestration** | Compensating actions via domain events, not two-phase commit |

---

## Output Template

When this skill is active and tasked with designing or auditing an architecture, produce:

1. **Architecture Style Decision** — Recommended pattern (hexagonal / layered / event-driven) with justification citing the decision guide above
2. **Layer/Boundary Map** — ASCII diagram of module boundaries showing which layers import which, plus list of port interfaces defined at each boundary
3. **Dependency Graph Audit** — Confirmation that inward dependency flow holds: domain → application → presentation (no backward edges)
4. **Port Interface Definitions** — All `abc.ABC` classes with method signatures using only primitives, stdlib types, and domain dataclasses
5. **Composition Root Summary** — List of all registered port-to-adapter bindings with lifecycle notes (singleton vs. per-request vs. transient)
6. **Anti-Pattern Check** — Explicit statement confirming no ORM decorators on entities, no global service locators, no framework imports in application layer

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `test-driven-development` | TDD workflow complements architecture design — define tests against port interfaces before implementing adapters |
| `error-handling` | Architecture-level error handling strategies (fail-fast at boundaries, transaction rollback via decorators) |
| `modular-design` | Granular module decomposition within layers; package-level organization and export contracts |
| `api-design` | REST/gRPC API design fits into the presentation layer of any architecture pattern |

---

*This skill applies SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) as the theoretical foundation for all architectural decisions. The Dependency Rule is an instantiation of DRY applied at the module level: business logic written once in the domain layer, accessed through interfaces rather than duplicated across adapter implementations.*

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — System Architecture](https://en.wikipedia.org/wiki/System_architecture)
- [Wikipedia — Enterprise Architecture](https://en.wikipedia.org/wiki/Enterprise_architecture)
- [Microsoft Azure Architecture Center — Architectural Patterns](https://learn.microsoft.com/en-us/azure/architecture/framework/)
- [Martin Fowler — Hexagonal Architecture (Ports and Adapters)](https://martinfowler.com/bliki/HexagonalArchitecture.html)
- [CNCF — Cloud Native Application Patterns Reference](https://www.cncf.io/blog/2023/04/18/cloud-native-application-patterns/)
