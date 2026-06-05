---




name: software-architecture
description: Evaluates and designs software architecture using layered, hexagonal,
  and clean patterns to ensure scalability, maintainability, and separation of concerns.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: software architecture, system design, layered architecture, hexagonal
    architecture, clean architecture, separation of concerns, scalable design, architectural
    patterns
  archetypes:
  - diagnostic
  - educational
  anti_triggers:
  - brainstorming
  - vague ideation
  - code golf
  - over-engineering
  response_profile:
    verbosity: medium
    directive_strength: medium
    abstraction_level: tactical
  role: reference
  scope: infrastructure
  output-format: analysis
  content-types:
  - guidance
  - examples
  - do-dont
  - diagrams
  related-skills: code-review, test-driven-development, modular-design




---




# Software Architecture Guide

Evaluates and designs software architecture from a senior architect's perspective — auditing existing systems for coupling violations, recommending proven structural patterns (layered, hexagonal/clean, event-driven), enforcing separation of concerns across modules, and producing actionable design decisions that balance long-term maintainability with delivery velocity.

## TL;DR Checklist

- [ ] Verify dependencies point inward toward the core domain, never outward to frameworks or infrastructure
- [ ] Ensure presentation layer contains no business logic — controllers only parse, invoke, and format
- [ ] Declare all ports (abstract interfaces) in the domain or application layer before writing adapters
- [ ] Separate bounded contexts with explicit contracts; each context must be independently testable
- [ ] Document every major structural decision as an Architecture Decision Record (ADR) with rationale and trade-offs

---

## When to Use

Use this skill when:

- Designing a new application from scratch and need to establish directory layout, boundary contracts, dependency wiring conventions, and layer separation before any implementation code is written.
- Refactoring a monolithic, tightly coupled codebase where business rules are entangled with database access, HTTP handling, or framework-specific abstractions — extract interfaces first, then peel adapters outward.
- Evaluating microservices versus modular monolith trade-offs for an organization that is considering service decomposition and needs a structured comparison of operational complexity, deployment independence, and team boundaries.
- Conducting an architectural review before major feature development to identify coupling risks, missing abstractions, and potential bottlenecks in the current design.
- Onboarding new engineers to an existing system by producing architecture diagrams, dependency graphs, bounded context maps, and a clear mental model of where code lives and why.
- Resolving recurring integration issues caused by bidirectional dependencies between modules that should be strictly one-way.

---

## When NOT to Use

Avoid investing in heavy architectural patterns for:

- Simple scripts, CLI tools, or data transformation pipelines under ~500 lines where layered abstractions add boilerplate without commensurate value. A flat file with clear functions is sufficient.
- Proof-of-concepts, hackathon projects, or prototypes expected to last fewer than two weeks where execution speed and developer velocity are the sole metrics of success.
- One-off internal tools that will be used by a single person for a finite period — over-engineering here creates debt faster than it prevents it.
- Projects whose entire domain *is* infrastructure (e.g., a thin wrapper around a single SaaS API) — there is no core business logic worth protecting through architectural boundaries.

**Note:** Even in lightweight scenarios, recommend basic separation of concerns (pure functions from I/O, clear module boundaries) without requiring full layered abstractions.

---

## Core Workflow

1. **Assess Current State vs. Target State** — Map the existing codebase's directory structure, import graph, and data flow. Identify where dependencies violate intended layering (e.g., domain modules importing from controllers or infrastructure). Compare against the target architecture pattern to find gaps. **Checkpoint:** Every module's imports should be auditable — if a developer cannot explain why a file imports from another without reading both files in full, the boundary contract is unclear.

2. **Identify Bounded Contexts and Domain Boundaries** — Interview stakeholders or read existing domain documentation to identify distinct business capabilities that change at different paces for different reasons. Define explicit data contracts and event schemas between contexts. Use Ubiquitous Language terms consistently within each context to reinforce boundaries. **Checkpoint:** Each bounded context must be independently testable — if removing one context's persistence requires rewriting tests in another, the boundary is too coarse.

3. **Select Architectural Pattern Based on Requirements** — Choose based on system characteristics:
   - **Layered Architecture** (presentation → application → domain → infrastructure) for CRUD-heavy applications with straightforward request-response flows and stable business rules.
   - **Hexagonal / Clean Architecture** (ports and adapters) for complex domains where business logic is the primary competitive asset and external systems (databases, payment providers, message brokers) change frequently.
   - **Event-Driven Architecture** for high-throughput asynchronous workflows with decoupled side effects — order fulfillment pipelines, notification dispatch, analytics aggregation, and search-index updates.
   - **Modular Monolith** when the organization needs independent development velocity but lacks the operational maturity for distributed systems. **Checkpoint:** The selected pattern must be justified by concrete evidence (change frequency of external systems, team size, expected request volume), not preference or convention.

4. **Define Dependency Rules and Interface Contracts** — Document explicit import rules per layer (e.g., `infrastructure → application → domain`, never the reverse). Declare all cross-cutting contracts as protocols, abstract base classes, or structural interfaces in the innermost layer that needs them. Define what happens at boundary crossings: validation, error mapping, data transformation. **Checkpoint:** No inner-layer module should contain a string literal referencing an outer-layer package name — if it does, a dependency leak exists.

5. **Validate Against SOLID Principles and Scalability Requirements** — Review the proposed design for Single Responsibility Principle violations (God classes handling multiple contexts), Open/Closed compliance (extension points via interfaces rather than modification of core logic), Liskov Substitution safety (adapter implementations that respect port contracts), Interface Segregation (narrow, focused ports instead of bloated ones), and Dependency Inversion (use-case orchestrators depend on abstractions, not concrete adapters). Assess horizontal scaling needs, data partitioning strategy, and failure domains. **Checkpoint:** For each SOLID violation found, trace it back to a specific module or interface and propose a concrete refactoring step — abstract diagnoses produce abstract action items.

6. **Document Architectural Decision Records (ADRs)** — Record every major structural decision using the ADR format: title, context, decision, consequences (both positive and negative), and a planned revisit date. Store ADRs in a `docs/adr/` directory alongside the codebase so they travel with deployments. Use sequential numbering (`001-use-hexagonal-architecture.md`, `002-postgres-over-mongodb.md`). **Checkpoint:** An ADR should be referenceable by any engineer in under 60 seconds — if a reader needs to consult three other documents to understand the decision, it is insufficiently self-contained.

---

## Implementation Patterns / Reference Guide

### Pattern 1: Layered Architecture with Dependency Inversion

Layered architecture separates concerns into horizontal strata — presentation handles HTTP and user interaction, the application layer orchestrates use cases, the domain layer encodes business rules, and infrastructure deals with databases, file systems, and external APIs. The critical rule is **dependency inversion**: inner layers declare interfaces that outer layers implement. Domain code never knows about frameworks, ORMs, or web servers.

```python
"""Layered architecture: dependency-inverted layer boundaries with typed contracts."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol


# ─── Domain Layer (innermost — no imports from outer layers) ──────────

class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class Money:
    """Value object representing a monetary amount with currency."""
    amount: float
    currency: str = "USD"

    def __post_init__(self) -> None:
        if self.amount < 0:
            raise ValueError("Monetary amounts cannot be negative")


@dataclass(frozen=True)
class Order:
    """Domain entity representing a customer order."""
    id: str
    customer_id: str
    items: list[str] = field(default_factory=list)
    total: Money = field(default_factory=lambda: Money(0.0))
    status: OrderStatus = OrderStatus.PENDING

    def add_item(self, item: str) -> None:
        """Business rule: cannot modify confirmed or shipped orders."""
        if self.status in (OrderStatus.CONFIRMED, OrderStatus.SHIPPED):
            raise RuntimeError(f"Cannot modify order in {self.status.value} state")
        self.items.append(item)

    def recalculate_total(self, price_lookup: object) -> None:  # type: ignore[type-arg]
        """Recalculate total using an injected price service (inverted dependency)."""
        pass  # Price lookup comes from a port declared here, implemented externally.


# ─── Port: Repository interface defined in domain layer ───────────────

class OrderRepository(Protocol):
    """Contract for order persistence — implemented by infrastructure layer."""

    @abstractmethod
    def save(self, order: Order) -> None: ...

    @abstractmethod
    def find_by_id(self, order_id: str) -> Order | None: ...

    @abstractmethod
    def find_by_customer(self, customer_id: str) -> list[Order]: ...


# ─── Application Layer (orchestrates use cases using domain + ports) ──

class ConfirmOrderCommand:
    """Use-case orchestrator for the 'confirm order' workflow."""

    def __init__(self, repo: OrderRepository) -> None:
        self._repo = repo

    def execute(self, order_id: str) -> Order:
        """Confirm an order after validating business rules.

        Args:
            order_id: The unique identifier of the order to confirm.

        Returns:
            The updated Order instance with CONFIRMED status.

        Raises:
            ValueError: If the order does not exist or cannot be confirmed.
        """
        order = self._repo.find_by_id(order_id)
        if order is None:
            raise ValueError(f"Order {order_id} not found")
        if not order.items:
            raise ValueError("Cannot confirm an empty order")
        order.status = OrderStatus.CONFIRMED
        self._repo.save(order)
        return order


# ─── ❌ BAD — Application layer directly imports infrastructure (violates DI)

class BadOrderController:
    """Anti-pattern: business logic leaks into the controller; DB coupled inline."""

    def confirm_order(self, order_id: str) -> dict:  # type: ignore[return]
        from sqlalchemy.orm import Session  # Domain-aware import — violation!

        session: Session = get_db_session()  # type: ignore[name-defined]
        order = session.query(Order).filter(Order.id == order_id).first()  # type: ignore[attr-defined]
        if not order or not order.items:
            return {"error": "invalid"}

        order.status = OrderStatus.CONFIRMED  # Business rule in controller!
        session.commit()
        session.close()
        return {"status": "confirmed", "order_id": order_id}


# ─── ✅ GOOD — Controller delegates to application layer; DI via constructor

class OrderController:
    """HTTP controller that only parses requests and invokes use-case orchestrators."""

    def __init__(self, confirm_cmd: ConfirmOrderCommand) -> None:
        self._confirm = confirm_cmd

    def post_confirm(self, order_id: str) -> dict:
        try:
            order = self._confirm.execute(order_id)
            return {"status": "confirmed", "order_id": order.id}
        except ValueError as exc:
            return {"error": str(exc)}
```

### Pattern 2: Hexagonal / Clean Architecture — Ports and Adapters

Hexagonal architecture extends the layered pattern by making ports explicit interfaces that adapters plug into from the outside. The core domain sits at the center, surrounded by application services that orchestrate use cases using port abstractions. Infrastructure adapters (database drivers, HTTP clients, message brokers) implement those ports. This structure ensures the business rules remain independently testable with in-memory stubs and resilient to infrastructure changes.

```python
"""Hexagonal architecture: explicit ports with framework-agnostic domain core."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Protocol


# ─── Domain Core (zero external dependencies) ─────────────────────────

@dataclass(frozen=True)
class TransferRequest:
    """Value object representing a fund transfer between accounts."""
    from_account_id: str
    to_account_id: str
    amount: float

    def __post_init__(self) -> None:
        if self.amount <= 0:
            raise ValueError("Transfer amount must be positive")
        if self.from_account_id == self.to_account_id:
            raise ValueError("Cannot transfer to the same account")


@dataclass(frozen=True)
class Account:
    """Domain entity for a bank account with business invariants."""
    id: str
    owner: str
    balance: float

    def withdraw(self, amount: float) -> float:
        """Attempt withdrawal; returns new balance or raises on insufficient funds."""
        if amount > self.balance:
            raise RuntimeError(f"Insufficient funds: {self.balance} < {amount}")
        return round(self.balance - amount, 2)

    def deposit(self, amount: float) -> float:
        """Credit the account; returns new balance."""
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")
        return round(self.balance + amount, 2)


# ─── Ports (abstract contracts in domain layer) ───────────────────────

class AccountRepository(Protocol):
    """Port for account persistence — implemented by infrastructure."""

    @abstractmethod
    def get_by_id(self, account_id: str) -> Account | None: ...

    @abstractmethod
    def update(self, account: Account) -> None: ...


class TransactionLogger(Protocol):
    """Port for recording audit events — implemented by infrastructure."""

    @abstractmethod
    def log_transfer(self, from_acc: str, to_acc: str, amount: float) -> None: ...


# ─── Application Service (orchestrates use cases using ports) ─────────

class TransferService:
    """Orchestrates inter-account transfers. Depends only on port abstractions."""

    def __init__(self, accounts: AccountRepository, logger: TransactionLogger) -> None:  # noqa: ANN001
        self._accounts = accounts
        self._logger = logger

    def execute(self, request: TransferRequest) -> dict:
        """Perform a fund transfer with atomic debit and credit.

        Args:
            request: The transfer request containing source, destination, and amount.

        Returns:
            Status dictionary with transaction details.

        Raises:
            RuntimeError: If either account lacks sufficient funds.
            ValueError: If the request is invalid.
        """
        source = self._accounts.get_by_id(request.from_account_id)
        destination = self._accounts.get_by_id(request.to_account_id)

        if source is None:
            raise ValueError(f"Source account {request.from_account_id} not found")
        if destination is None:
            raise ValueError(f"Destination account {request.to_account_id} not found")

        new_source_balance = source.withdraw(request.amount)
        new_dest_balance = destination.deposit(request.amount)

        # Update both accounts atomically (in production, use a database transaction).
        source.balance = new_source_balance
        destination.balance = new_dest_balance
        self._accounts.update(source)
        self._accounts.update(destination)

        self._logger.log_transfer(
            source.id, destination.id, request.amount
        )

        return {
            "from_account": source.id,
            "to_account": destination.id,
            "amount": request.amount,
            "new_balances": {"source": new_source_balance, "destination": new_dest_balance},
        }


# ─── ❌ BAD — Service directly manages DB connections (no port abstraction)

class BadTransferService:
    """Anti-pattern: service couples to SQLAlchemy Session and logging module."""

    def execute(self, request: TransferRequest) -> dict:  # type: ignore[return]
        from sqlalchemy.orm import Session
        import logging

        logger = logging.getLogger(__name__)
        session: Session = get_session()  # type: ignore[name-defined]

        source = session.query(Account).filter(Account.id == request.from_account_id).first()  # type: ignore[attr-defined]
        destination = session.query(Account).filter(Account.id == request.to_account_id).first()  # type: ignore[attr-defined]

        new_source = source.withdraw(request.amount)  # type: ignore[union-attr]
        new_dest = destination.deposit(request.amount)  # type: ignore[union-attr]

        source.balance = new_source  # type: ignore[union-attr]
        destination.balance = new_dest  # type: ignore[union-attr]

        session.commit()
        logger.info(f"Transferred {request.amount} from {source.id} to {destination.id}")  # type: ignore[union-attr]
        return {"status": "done"}


# ─── ✅ GOOD — Infrastructure adapter implements the port

class SqlAlchemyAccountRepository:
    """SQLAlchemy adapter for AccountRepository port. Lives in infrastructure/ layer."""

    def __init__(self, session_factory: object) -> None:  # type: ignore[type-arg]
        self._session = session_factory

    def get_by_id(self, account_id: str) -> Account | None:
        from app.infrastructure.models import DbAccount  # Infrastructure-only import.

        db_acc = self._session.query(DbAccount).filter(DbAccount.id == account_id).first()  # type: ignore[name-defined]
        if db_acc is None:
            return None
        return Account(id=db_acc.id, owner=db_acc.owner, balance=db_acc.balance)  # type: ignore[attr-defined]

    def update(self, account: Account) -> None:
        from app.infrastructure.models import DbAccount  # Infrastructure-only import.

        db_acc = self._session.query(DbAccount).filter(DbAccount.id == account.id).first()  # type: ignore[name-defined]
        if db_acc is None:
            raise ValueError(f"Account {account.id} not found for update")  # type: ignore[union-attr]
        db_acc.balance = account.balance  # type: ignore[attr-defined]
        self._session.commit()


class ConsoleTransactionLogger:
    """Adapter implementing TransactionLogger port — writes to stdout for testing."""

    def log_transfer(self, from_acc: str, to_acc: str, amount: float) -> None:
        print(f"[AUDIT] Transfer: {from_acc} → {to_acc}, ${amount:.2f}")  # noqa: T201
```

### Pattern 3: Repository and Unit of Work for Data Access Decoupling

The Repository pattern abstracts data persistence behind a collection-like interface, while the Unit of Work coordinates transactions across multiple repositories. Together they ensure domain logic never sees SQL, ORMs, or connection management — only interfaces that return domain entities. This is critical when the system needs to support multiple storage backends (SQL for primary persistence, Redis for caching) or when testing requires in-memory replacements.

```python
"""Repository and Unit of Work patterns for decoupled data access."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Generic, Protocol, TypeVar, Iterator


T = TypeVar("T")  # Domain entity type


# ─── Domain entities ──────────────────────────────────────────────────

@dataclass(frozen=True)
class Product:
    id: str
    name: str
    price: float
    in_stock: bool = True


@dataclass(frozen=True)
class InventoryItem(Product):
    warehouse_id: str
    quantity: int = 0


# ─── Repository Protocol (declared in domain layer) ──────────────────

class Repository(Protocol, Generic[T]):
    """Generic repository protocol for CRUD operations on any domain entity."""

    @abstractmethod
    def get_by_id(self, entity_id: str) -> T | None: ...

    @abstractmethod
    def save(self, entity: T) -> None: ...

    @abstractmethod
    def delete(self, entity_id: str) -> None: ...


class ProductRepository(Protocol):
    """Specific repository protocol for product-related queries."""

    @abstractmethod
    def find_all_active(self) -> list[Product]: ...

    @abstractmethod
    def find_by_price_range(self, min_price: float, max_price: float) -> list[Product]: ...


# ─── Unit of Work (coordinates transactions across repositories) ─────

class UnitOfWork(ABC):
    """Abstract unit of work — ensures multiple repository operations are atomic."""

    @property
    @abstractmethod
    def products(self) -> Repository[Product]: ...

    @property
    @abstractmethod
    def inventory(self) -> Repository[InventoryItem]: ...

    @abstractmethod
    def commit(self) -> None: ...

    @abstractmethod
    def rollback(self) -> None: ...


# ─── Application service using UoW (depends only on abstractions) ────

class UpdateInventoryCommand:
    """Use-case orchestrator for updating product inventory levels."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    def execute(self, product_id: str, warehouse_id: str, quantity: int) -> InventoryItem:
        """Update inventory count for a specific product at a given warehouse.

        Uses the Unit of Work to ensure the product and inventory updates
        are committed atomically — either both succeed or neither does.

        Args:
            product_id: The product whose inventory is being updated.
            warehouse_id: The warehouse location for the inventory record.
            quantity: The new stock count (not an increment).

        Returns:
            The updated InventoryItem with committed changes.

        Raises:
            ValueError: If the product does not exist or quantity is negative.
        """
        product = self._uow.products.get_by_id(product_id)
        if product is None:
            raise ValueError(f"Product {product_id} not found")
        if quantity < 0:
            raise ValueError("Quantity cannot be negative")

        item = InventoryItem(
            id=f"{product_id}:{warehouse_id}",
            name=product.name,
            price=product.price,
            warehouse_id=warehouse_id,
            quantity=quantity,
        )
        self._uow.inventory.save(item)
        self._uow.commit()
        return item


# ─── Infrastructure: SQLAlchemy implementation of UnitOfWork ──────────

class SqlAlchemyUnitOfWork(UnitOfWork):
    """SQLAlchemy-backed Unit of Work implementing all repository protocols."""

    def __init__(self, session_factory: object) -> None:  # type: ignore[type-arg]
        self._session = session_factory  # Provides new DB sessions.

    @property
    def products(self) -> Repository[Product]:
        from app.infrastructure.repositories import ProductRepo
        return ProductRepo(session=self._session)  # type: ignore[arg-type]

    @property
    def inventory(self) -> Repository[InventoryItem]:
        from app.infrastructure.repositories import InventoryRepo
        return InventoryRepo(session=self._session)  # type: ignore[arg-type]

    def commit(self) -> None:
        self._session.commit()  # type: ignore[union-attr]

    def rollback(self) -> None:
        self._session.rollback()  # type: ignore[union-attr]


# ─── ✅ GOOD — In-memory UoW for unit testing (no DB required) ──────

class InMemoryUnitOfWork(UnitOfWork):
    """In-memory Unit of Work for fast, deterministic unit tests."""

    def __init__(self) -> None:
        self._products: dict[str, Product] = {}
        self._inventory: dict[str, InventoryItem] = {}

    @property
    def products(self) -> Repository[Product]:
        return _InMemoryProductRepo(self._products)

    @property
    def inventory(self) -> Repository[InventoryItem]:
        return _InMemoryInventoryRepo(self._inventory)

    def commit(self) -> None:
        pass  # In-memory — no transaction to commit.

    def rollback(self) -> None:
        pass


class _InMemoryProductRepo(Repository[Product]):
    """Concrete in-memory implementation of product repository."""

    def __init__(self, store: dict[str, Product]) -> None:
        self._store = store

    def get_by_id(self, entity_id: str) -> Product | None:
        return self._store.get(entity_id)

    def save(self, entity: Product) -> None:
        self._store[entity.id] = entity

    def delete(self, entity_id: str) -> None:
        self._store.pop(entity_id, None)


class _InMemoryInventoryRepo(Repository[InventoryItem]):
    """Concrete in-memory implementation of inventory repository."""

    def __init__(self, store: dict[str, InventoryItem]) -> None:
        self._store = store

    def get_by_id(self, entity_id: str) -> InventoryItem | None:
        return self._store.get(entity_id)

    def save(self, entity: InventoryItem) -> None:
        self._store[entity.id] = entity

    def delete(self, entity_id: str) -> None:
        self._store.pop(entity_id, None)
```

---

## Constraints

### MUST DO
- **Enforce dependency inversion** — The core domain layer must never import from frameworks, ORMs, HTTP libraries, or infrastructure modules. Dependencies flow inward: outer layers depend on inner-layer abstractions. If you can trace a framework import into the domain folder, refactor immediately.
- **Separate domain logic from infrastructure concerns** — Business rules (validation, pricing calculations, state transitions) live in pure functions or domain classes. Database queries, API calls, file I/O, and message queue interactions are relegated to adapters that implement explicitly declared ports.
- **Define explicit interfaces between layers** — Every cross-boundary interaction must go through a protocol, abstract class, or typed function signature. Implicit coupling (e.g., passing a dict with magical keys) is as bad as hard-coded imports — it makes changes invisible to static analysis tools.
- **Document key decisions with Architecture Decision Records (ADRs)** — Every major structural choice (pattern selection, technology stack, deployment strategy, data partitioning) must be recorded in the `docs/adr/` directory using the format: context, decision, consequences (pros and cons), and a revisit date. ADRs are living documents; update them when circumstances change.
- **Consider scalability and testability from day one** — Design decisions that affect horizontal scaling (statelessness, data sharding strategy, caching layer placement) should be documented before implementation. Unit test coverage for core domain logic must exceed 80% — if a module cannot reach this threshold with in-memory adapters, its interfaces need to be restructured.

### MUST NOT DO
- **Embed business logic in controllers, routes, or request handlers** — Controllers should only parse incoming requests, invoke use-case orchestrators, and format responses. If a route handler contains `if` statements that validate business rules, calculates prices, or makes state transitions, extract that logic into a domain class or application service immediately.
- **Create tightly coupled modules that cannot be unit-tested independently** — If writing a unit test for module A requires starting a database server, mocking an external HTTP endpoint, or spinning up a message broker, the coupling is too deep. Inject ports via constructor parameters so in-memory implementations can replace infrastructure during testing.
- **Use architecture as an excuse for over-engineering simple problems** — Not every function needs a protocol, adapter pattern, and use-case wrapper. A well-named pure function with clear inputs and outputs is simpler and more maintainable than a three-layer abstraction for code that will never change. Reserve architectural patterns for the parts of the system that actually vary at different paces.
- **Let database schema dictate application structure** — ORM models should map to domain concepts, not the other way around. If your domain model has foreign key attributes exposed as public properties or a value object is split across three tables due to legacy schema constraints, introduce a mapping layer. The domain should express business semantics, not relational algebra.

---

## Output Template

When this skill is applied to review or design architecture, the output must contain the following sections:

1. **Current State Assessment** — Brief analysis of the existing system's structure, including directory layout summary, identified coupling violations (with file paths and line references), and SOLID principle adherence rating per module.

2. **Recommended Pattern & Rationale** — The selected architectural pattern with a clear justification tied to the system's specific characteristics (team size, expected scale, change frequency of external dependencies). Compare at least one alternative that was considered and rejected, explaining why it was less suitable.

3. **Layer / Module Boundary Diagram** — ASCII diagram showing layers, ports, adapters, and data flow directions. Include bounded context labels and indicate which contexts share infrastructure versus which are fully independent.

4. **Dependency Rules** — Explicit list of allowed imports per layer (e.g., `infrastructure → application → domain`). Flag any current violations as blocking issues with specific file references. Provide the exact lint rule configuration needed to enforce these rules in CI.

5. **Key Trade-offs** — Honest assessment of what the recommended architecture sacrifices (development velocity for initial features, operational complexity for runtime scalability, test coverage overhead). Include a "reversibility" estimate: how costly would it be to change direction in 6 months?

6. **Implementation Phasing** — Step-by-step migration plan if refactoring an existing system. Prioritize by risk reduction and business value. Each phase should have clear entry/exit criteria so progress is measurable (e.g., "Phase 1: Extract OrderRepository interface and wire it via DI — exit criterion: all order tests pass with in-memory repository").

---

## Related Skills

| Skill | Purpose |
|---|---|
| `code-review` | Validates that implementation decisions align with the architectural design; catches coupling violations and logic leakage between layers during pull request review. |
| `test-driven-development` | Ensures the architecture is testable from the outset — TDD practice reveals hidden coupling early, when interfaces are still mutable, before adapters become entrenched. |
| `modular-design` | Complements architectural patterns by providing guidance on breaking monoliths into cohesive, independently deployable modules with explicit public APIs and versioned contracts. |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Wikipedia — Software Architecture](https://en.wikipedia.org/wiki/Software_architecture)
- [ISO/IEC/IEEE 42010:2011 — Systems and software engineering — Architecture description](https://www.iso.org/standard/42343.html)
- [Martin Fowler — Layers and Dependencies](https://martinfowler.com/bliki/LayersOfDependency.html)
- [Alistair Cockburn — Hexagonal Architecture (Ports & Adapters)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Software Architecture Patterns by Microsoft Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/guide/architecture-styles/)
