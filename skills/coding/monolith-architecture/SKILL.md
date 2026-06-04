---
name: monolith-architecture
description: Implements modular monolith patterns (bounded-context layering, hexagonal
  ports, database-per-module, interface-based inter-module communication) to build
  cleanly structured single-deployable applications.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: monolith, monolithic architecture, modular monolith, how do i structure
    a monolith, code organization, layered architecture, hexagonal architecture in
    monolith, single deployable unit
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
  related-skills: microservices-architecture, software-architecture, domain-driven-design,
    architectural-patterns
---
# Monolith Architecture Guide

Senior software architect designing well-structured monolithic applications that are simple to deploy, test, and evolve. Applies modular boundaries, layered architecture, and hexagonal ports-and-adapters within a single codebase to prevent "big ball of mud" anti-pattern while preserving deployment simplicity.

## TL;DR Checklist

- [ ] Organize code by bounded context (domain modules), not by technical layer alone
- [ ] Enforce unidirectional dependencies between internal modules — no circular imports
- [ ] Use explicit interfaces (protocols/ABCs) for all inter-module communication
- [ ] Keep the database shared initially, but design module schemas to be separable later
- [ ] Apply hexagonal architecture inside each domain module (ports at boundary, adapters outside)
- [ ] Define an API gateway / facade that presents a unified external interface per module
- [ ] Write integration tests across module boundaries before adding deployment complexity

---

## When to Use

Use this skill when:

- Starting a new application and you want clean structure without premature microservices
- Refactoring a "big ball of mud" into organized modules within the same codebase
- Your team is small (1–10 engineers) with a single deployment cadence
- You need to ship fast but want the internal architecture ready for eventual decomposition
- You are building an application where operational simplicity (one artifact, one deploy) matters more than independent scaling
- Structuring a legacy monolith so modules can be extracted independently later without rewrite

---

## When NOT to Use

Avoid this approach when:

- **You need independent horizontal scaling per domain** — use microservices (`microservices-architecture`) instead
- **Multiple teams must deploy different parts simultaneously with zero coordination** — bounded context decomposition into services is needed
- **Different domains require entirely different tech stacks** (e.g., real-time streaming + batch analytics) — separate services or modular monolith with strict boundaries
- **The application is a trivial CRUD tool** — use simple layered architecture without complex module structure
- **You have no domain complexity to model** — if there are no distinct business capabilities, modularization adds overhead

---

## Core Workflow

1. **Identify Bounded Contexts** — Map the domain into cohesive modules using event storming or domain story workshops. Each context should own a complete vertical slice of functionality (UI/API → business logic → data access).
   **Checkpoint:** Verify that each module has a single, well-defined responsibility and minimal shared state with other modules. If two concepts always change together, they belong in the same module.

2. **Design Module Boundaries** — For each bounded context, define explicit interfaces (Python ABCs/protocols) that other modules use to interact. These interfaces are the module's public API.
   **Checkpoint:** Run the dependency audit — every import should flow inward toward domain logic. No module imports from a module that is below it in the dependency hierarchy.

3. **Apply Hexagonal Ports Inside Each Module** — Within each module, separate the pure domain logic (entities, value objects, business rules) from infrastructure adapters (HTTP handlers, database repositories, external API clients).
   **Checkpoint:** The domain core must be testable with zero framework dependencies. If you cannot instantiate a service and run its business logic without importing Flask/Django/SQLAlchemy, ports are not properly isolated.

4. **Choose Database Strategy** — Start with a shared database for simplicity. Define module-specific schema prefixes or namespace tables. Each module owns its tables; other modules access data only through the owning module's repository interface.
   **Checkpoint:** If you could extract one module's tables into a separate database without changing any query logic in that module, your boundary is clean enough.

5. **Build Integration Tests at Module Boundaries** — Before separating deployment, verify that inter-module communication works correctly under realistic conditions. Test failure modes: missing dependencies, interface contract changes, cascading errors.
   **Checkpoint:** Every public interface must have at least one integration test that exercises the full path from a consumer module's call through to the provider's response.

---

## Implementation Patterns

### Pattern 1: Module Structure with Bounded Contexts

A modular monolith organizes code by business capability, not by technical layer. Each bounded context is a self-contained package with its own API, domain logic, data access, and optionally its own database schema.

```
myapp/
├── app.py                    # Entry point, dependency injection wiring
├── modules/
│   ├── orders/               # Orders bounded context
│   │   ├── __init__.py       # Public API exports
│   │   ├── api.py            # HTTP handlers (presentation)
│   │   ├── ports.py          # Port interfaces (ABCs for other modules)
│   │   ├── services.py       # Business logic (uses ports)
│   │   ├── models.py         # ORM models or domain entities
│   │   ├── repositories.py   # Data access adapters
│   │   └── events.py         # Domain events published by this module
│   ├── customers/            # Customers bounded context
│   │   ├── __init__.py
│   │   ├── api.py
│   │   ├── ports.py
│   │   ├── services.py
│   │   ├── models.py
│   │   └── repositories.py
│   └── inventory/            # Inventory bounded context
│       ├── __init__.py
│       ├── api.py
│       ├── ports.py
│       ├── services.py
│       ├── models.py
│       └── repositories.py
├── shared/                   # Cross-cutting concerns (logging, config)
│   ├── logging_config.py
│   └── config.py
└── tests/
    ├── integration/          # Tests crossing module boundaries
    └── unit/                 # Isolated unit tests per module
```

**Key principle:** `api.py` → `services.py` → `ports.py` → other modules' `__init__.py`. Dependencies flow inward.

---

### Pattern 2: Anti-Corruption Layer for External Systems

When a monolith must integrate with an external system that has a confusing or unstable domain model, wrap it in an anti-corruption layer (ACL) that translates the foreign vocabulary into your clean internal model.

```python
# ❌ BAD — External system's messy domain leaks into your business logic
from legacy_banking_api import TransactionRecord, BatchEntry

class OrderProcessor:
    """Directly uses external types — tightly coupled to their schema."""
    
    def process_payment(self, order_id: int) -> dict:
        # Business logic polluted with foreign type names and structure
        batch = BatchEntry()
        batch.set_transaction_id(order_id)
        batch.set_amount_cents(1000)  # Magic number, no domain meaning
        result = legacy_banking_api.submit(batch)
        
        if result.get('status') == 'SUCCESS':
            return {'ok': True}
        return {'error': result.get('err_code', 'unknown')}

# ✅ GOOD — Anti-corruption layer translates foreign model to clean domain model
from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum

@dataclass(frozen=True)
class PaymentAmount:
    """Domain value object with semantic meaning."""
    amount_cents: int
    currency: str = "USD"

    @property
    def as_decimal(self) -> float:
        return self.amount_cents / 100.0


class PaymentStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


# Port: our clean interface to the payment domain
class PaymentGatewayPort(ABC):
    """Abstract port for payment processing — implementation independent."""
    
    @abstractmethod
    async def process_payment(self, order_id: int, amount: PaymentAmount) -> PaymentStatus:
        ...


# Adapter: translates legacy API into our clean model
class LegacyBankingPaymentAdapter(PaymentGatewayPort):
    """Anti-corruption adapter wrapping the external banking API."""
    
    async def process_payment(self, order_id: int, amount: PaymentAmount) -> PaymentStatus:
        batch = BatchEntry()
        batch.set_transaction_id(order_id)
        batch.set_amount_cents(amount.amount_cents)
        
        result = await legacy_banking_api.submit(batch)
        
        # Translate foreign status codes to our domain enum
        status_map = {
            'SUCCESS': PaymentStatus.COMPLETED,
            'PENDING': PaymentStatus.PENDING,
            'FAILURE': PaymentStatus.FAILED,
        }
        return status_map.get(result.get('status'), PaymentStatus.FAILED)


# Domain service uses the port — no knowledge of legacy API
class OrderPaymentService:
    def __init__(self, payment_gateway: PaymentGatewayPort):
        self.gateway = payment_gateway
    
    async def pay_order(self, order_id: int, amount_cents: int) -> dict:
        amount = PaymentAmount(amount_cents)
        status = await self.gateway.process_payment(order_id, amount)
        
        if status == PaymentStatus.COMPLETED:
            return {'ok': True, 'status': 'paid'}
        else:
            return {'ok': False, 'error': f'Payment {status.value}'}
```

---

### Pattern 3: Interface-Based Inter-Module Communication

Modules communicate through explicit interfaces (Python ABCs), never by importing each other's implementation. This prevents circular dependencies and makes modules independently testable and extractable.

```python
# ─── orders/modules/customers/ports.py ───
# Port interface that the Orders module uses to read customer data
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class CustomerSummary:
    """Read-only view of customer used by other modules."""
    customer_id: str
    name: str
    email: str
    account_status: str  # 'active', 'suspended', 'closed'


class CustomerRepositoryPort(ABC):
    """Interface for customer lookup — implemented by the Customers module."""
    
    @abstractmethod
    async def get_customer(self, customer_id: str) -> CustomerSummary | None:
        """Return customer summary or None if not found."""
        ...
    
    @abstractmethod
    async def get_active_customers(self, limit: int = 100) -> list[CustomerSummary]:
        """Return active customers — used by order reporting."""
        ...


# ─── orders/modules/orders/services.py ───
# Orders module uses CustomerRepositoryPort — never imports Customers directly

class OrderService:
    """Business logic for order processing."""
    
    def __init__(
        self,
        customer_repo: "CustomerRepositoryPort",  # type: ignore[name-defined]
        inventory_repo: "InventoryRepositoryPort",  # type: ignore[name-defined]
    ):
        self.customer_repo = customer_repo
        self.inventory_repo = inventory_repo
    
    async def create_order(self, customer_id: str, items: list[dict]) -> dict:
        # Inter-module communication through port interface
        customer = await self.customer_repo.get_customer(customer_id)
        if not customer:
            raise ValueError(f"Customer {customer_id} not found")
        if customer.account_status != "active":
            raise RuntimeError(f"Customer {customer_id} account is {customer.account_status}")
        
        # Check inventory through another port
        for item in items:
            available = await self.inventory_repo.check_stock(item["product_id"], item["quantity"])
            if not available:
                raise RuntimeError(f"Insufficient stock for product {item['product_id']}")
        
        # ... create the order in this module's own database
        
        return {"order_id": "ord_123", "customer_id": customer_id, "status": "created"}


# ─── orders/modules/customers/repositories.py (implementation) ───
# The Customers module implements the CustomerRepositoryPort

from orders.modules.customers.ports import CustomerRepositoryPort, CustomerSummary


class PostgresCustomerRepository(CustomerRepositoryPort):
    """Concrete implementation using PostgreSQL."""
    
    def __init__(self, db_session_factory):
        self.db = db_session_factory
    
    async def get_customer(self, customer_id: str) -> CustomerSummary | None:
        # Direct database query — this module owns its data
        session = self.db()
        customer = await session.execute(
            "SELECT id, name, email, status FROM customers WHERE id = :id",
            {"id": customer_id}
        )
        row = customer.fetchone()
        if not row:
            return None
        return CustomerSummary(
            customer_id=row[0], name=row[1], email=row[2], account_status=row[3]
        )
```

---

### Pattern 4: Shared Database with Module Schema Isolation

Start with a single database but enforce module-owned schemas. Each module owns its tables; other modules access data only through the owning module's repository interface. This enables future database-per-module extraction.

```python
# ❌ BAD — God table with cross-module queries, no boundary enforcement
class OrderService:
    def create_order(self, customer_id: str, product_id: str, quantity: int):
        # Directly queries tables from multiple modules — tight coupling
        db.execute("""
            SELECT c.email, i.stock_count 
            FROM customers c, inventory i, products p
            WHERE c.id = :cid AND p.customer_id = c.id AND i.product_id = p.id
        """, {"cid": customer_id})  # Cross-module SQL — violates boundaries
        
        if db.query("SELECT stock_count FROM inventory WHERE product_id = ?", product_id) < quantity:
            raise RuntimeError("Out of stock")


# ✅ GOOD — Each module owns its tables, other modules go through interfaces

# customers/models.py — Customers module owns customer tables
from sqlalchemy import Column, String, Enum
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Customer(Base):
    __tablename__ = "customers"  # Owned by Customers module
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    status = Column(Enum("active", "suspended", "closed"), default="active")

# inventory/models.py — Inventory module owns its tables
class InventoryItem(Base):
    __tablename__ = "inventory"  # Owned by Inventory module
    product_id = Column(String, primary_key=True)
    warehouse_id = Column(String, primary_key=True)
    quantity = Column(Integer, default=0)

# No single model class spans both modules' tables.
# The Orders module never queries inventory directly — it calls the port interface.
```

---

### Pattern 5: API Gateway Facade at Module Boundary

Present a clean, unified external interface per bounded context. Internal implementation details (which module handles what) are hidden behind the facade. This makes individual modules replaceable and eventually extractable as services.

```python
from typing import Protocol
from abc import abstractmethod


class ModuleFacade(Protocol):
    """Each bounded context exposes a single entry point via this protocol."""
    
    @abstractmethod
    def handle_request(self, request: dict) -> dict:
        """Unified request handler — hides internal module structure."""
        ...


class OrdersFacade:
    """API facade for the Orders bounded context.
    
    All external requests go through here. Internally, the facade
    coordinates with CustomerPort, InventoryPort, and OrderService.
    """
    
    def __init__(self, order_service, customer_port, inventory_port):
        self.order_service = order_service
        self.customer_port = customer_port
        self.inventory_port = inventory_port
    
    def handle_request(self, request: dict) -> dict:
        action = request.get("action")
        
        match action:
            case "create_order":
                return self._create_order(request)
            case "cancel_order":
                return self._cancel_order(request)
            case "get_status":
                return self._get_status(request)
            case _:
                return {"error": f"Unknown action: {action}"}
    
    def _create_order(self, request: dict) -> dict:
        # Facade validates and delegates — internal complexity is hidden
        items = request.get("items", [])
        if not items:
            return {"error": "Order must contain at least one item"}
        
        return self.order_service.create_order(
            customer_id=request["customer_id"],
            items=items,
        )


# Registration — central wiring point
# app.py or dependency_injection.py
from orders.facade import OrdersFacade
from customers.repository import PostgresCustomerRepository
from inventory.repository import PostgresInventoryRepository
from orders.service import OrderService

# All modules wired together in one place
customer_repo = PostgresCustomerRepository(db_factory)
inventory_repo = PostgresInventoryRepository(db_factory)
order_service = OrderService(customer_repo, inventory_repo)
orders_facade = OrdersFacade(order_service, customer_repo, inventory_repo)
```

---

### Pattern 6: Domain Events for Loose Coupling Between Modules

When modules need to react to domain changes without direct calls (which create tight coupling), use domain events. The publishing module doesn't know who listens — it just publishes an event. Other modules subscribe through a simple in-process event bus.

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Dict, List


@dataclass(frozen=True)
class DomainEvent:
    """Base class for all domain events — immutable, timestamped."""
    occurred_at: datetime = field(default_factory=datetime.now)

    @property
    def event_name(self) -> str:
        return self.__class__.__name__


# ─── Domain events defined in the module that owns the business change ───

class OrderCreatedEvent(DomainEvent):
    """Published when a new order is successfully created."""
    order_id: str
    customer_id: str
    total_amount: float


class StockReservedEvent(DomainEvent):
    """Published when inventory is reserved for an order."""
    order_id: str
    product_id: str
    reserved_quantity: int


# ─── Simple in-process event bus ───

class InProcessEventBus:
    """Lightweight in-memory event dispatcher within a single process."""
    
    def __init__(self) -> None:
        self._handlers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable[[DomainEvent], None]) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
    
    def publish(self, event: DomainEvent) -> None:
        for handler in self._handlers.get(event.event_name, []):
            handler(event)


# ─── Consumer: Inventory module subscribes to OrderCreatedEvent ───

class InventorySubscriber:
    """Reacting to orders without direct dependency on Orders module."""
    
    def __init__(self, inventory_repo, event_bus: InProcessEventBus):
        # Subscribe at registration time
        event_bus.subscribe("OrderCreatedEvent", self.on_order_created)
        self.repo = inventory_repo
    
    def on_order_created(self, event: OrderCreatedEvent) -> None:
        """Handle order creation by reserving inventory for each item.
        
        Note: this method only receives a plain data event — it has NO
        knowledge of the OrderService, Order models, or any Orders module internals.
        """
        # This would iterate over items; simplified for illustration
        self.repo.reserve_stock(event.order_id)
```

---

## Architecture Decision Matrix

| Decision | Monolith (Single Database) | Modular Monolith (Shared DB) | Microservices (DB per Service) |
|----------|---------------------------|------------------------------|-------------------------------|
| **Deployment** | One artifact, one process | One artifact, one process | Many artifacts, many processes |
| **Dev complexity** | Low | Medium | High |
| **Testing** | In-process, fast | In-process, fast | Requires network, mocks |
| **Data consistency** | ACID transactions across all modules | ACID within each module only | Eventual consistency via events/sagas |
| **Scaling** | Vertical scale only | Vertical scale only | Independent horizontal scaling per service |
| **Team size** | 1–5 engineers | 5–20 engineers (with good boundaries) | 20+ engineers across many teams |
| **When to extract** | N/A — still a monolith | Extract when a module needs independent deployment | Already extracted |

---

## Constraints

### MUST DO

- Keep deployment simplicity as the primary design goal — every added boundary must earn its complexity
- Enforce unidirectional dependencies between modules — run `pipdeptree` or import-linter checks regularly to catch violations
- Use explicit interfaces (protocols/ABCs) for all inter-module communication — never import another module's implementation
- Organize code by bounded context first, technical layer second — each module should have its own api.py, services.py, models.py
- Apply hexagonal architecture within each module: ports define the boundary, adapters implement outside-in
- Define a single API gateway/facade per bounded context to present a unified external interface
- Write integration tests that exercise inter-module communication before considering extraction
- Use domain events for cross-module notifications instead of direct calls when modules are independent

### MUST NOT DO

- Don't start with microservices — let architectural complexity emerge naturally from real operational needs
- Don't create circular dependencies between modules — this is the fastest path to "big ball of mud"
- Don't use a shared ORM model across module boundaries without an adaptation layer — each module owns its data shape
- Don't over-engineer for hypothetical future scale — build only what your current requirements demand
- Don't mix architectural patterns within a single module (e.g., CQRS in one module, layered in another) — enforce consistency
- Don't let framework choice drive your module boundaries — Flask/Django routing should follow domain structure, not the other way around

---

## Output Template

When applying this skill to analyze or design an application architecture, produce:

1. **Domain Analysis** — Identified bounded contexts with responsibilities and invariants for each
2. **Module Structure** — Package layout showing each module's internal files (api.py, services.py, ports.py, models.py, repositories.py)
3. **Dependency Map** — Directional arrows showing which modules depend on which (must be a DAG, no cycles)
4. **Interface Specifications** — ABC/Protocol definitions for every inter-module communication point
5. **Database Strategy** — Schema ownership map with per-module table ownership and shared infrastructure tables
6. **Extraction Readiness Score** — Assessment of how easily each module can be extracted as a service (1–5 scale, 5 = fully decoupled)

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `microservices-architecture` | When a monolith should be decomposed into services instead |
| `software-architecture` | Broader architecture pattern selection and tradeoff analysis |
| `domain-driven-design` | Bounded context mapping, aggregate design, ubiquitous language patterns |
| `architectural-patterns` | Pattern catalog including microservices, CQRS, event-driven, hexagonal |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [Monolith First (Martin Fowler)](https://martinfowler.com/bliki/MonolithFirst.html) — Martin Fowler's argument for starting with a monolith before considering microservices
- [Microservices Patterns: Anti-Patterns (Chris Richardson)](https://microservices.io/patterns/microservices.html) — Chris Richardson's catalog of microservice patterns and common anti-patterns to avoid
- [Modular Monolith Architecture (Allan Kinigstein)](https://modularmonolith.org/) — Reference architecture for building well-structured modular monoliths that can evolve over time
- [The Phoenix Project (Kim et al.)](https://the-phoenix-project.com/) — Novel that illustrates the pain points of monolithic architectures and the case for decomposition
- [DDD Bounded Contexts for Decomposition (Eric Evans)](https://domainlanguage.com/ddd/reference/) — Eric Evans' DDD reference guide for identifying module boundaries in monoliths
