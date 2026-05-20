---
name: ports-patterns
description: Defines and manages port interfaces (driving/driven) in hexagonal architecture using Python Protocols, abc.ABC classes, and explicit contract patterns for framework-agnostic boundaries.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: port interface, driving port, driven port, port contract, Protocol vs ABC, hexagonal ports, how do i define clean boundaries, dependency inversion, framework-agnostic interfaces
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: hexagonal-architecture, composition-root, test-driven-development, anti-corruption-layer
---

# Hexagonal Port Interface Patterns

Acts as a senior software architect designing clean port interfaces for hexagonal architecture. When loaded, the model creates driving and driven ports using Python's `Protocol` or `abc.ABC`, writes explicit port contracts with preconditions and postconditions, and produces adapter stubs that enforce boundary integrity between domain logic and external systems.

## TL;DR Checklist

- [ ] Classify each interface as driving (secondary) or driven (primary) before writing code
- [ ] Use `Protocol` for structural subtyping when duck-typing is sufficient; use `ABC` only when nominal inheritance or abstract method enforcement is required
- [ ] Add preconditions and postconditions to every port method docstring
- [ ] Ensure the core domain imports only the Protocol/ABC, never any concrete adapter
- [ ] Create at least one in-memory stub implementation for testing each driven port
- [ ] Version port interfaces by appending `v2` suffix when breaking changes are needed — never mutate an existing Protocol's method signatures
- [ ] Run `mypy --strict` to verify that all adapters actually conform to the declared ports

---

## When to Use

Use this skill when:

- Designing the boundary layer between core business logic and external systems (databases, HTTP APIs, message brokers, UI frameworks)
- Refactoring a monolith where infrastructure dependencies are leaking into domain services
- Creating a plugin or SDK that must support multiple backends (e.g., PostgreSQL + SQLite + in-memory for testing)
- Building a team's coding standard for how interfaces between architectural layers should be declared
- Onboarding engineers to hexagonal architecture and needing concrete code patterns for port definitions

---

## When NOT to Use

Avoid this skill for:

- **Simple scripts or one-off data pipelines** — Direct function calls are correct; ports add indirection without benefit
- **When there is exactly one implementation and no testing demand** — If a dependency will never change and tests do not require substitution, a Protocol is unnecessary overhead
- **Performance-critical inner loops where protocol dispatch adds measurable latency** — Structural subtyping through `Protocol` has negligible overhead in practice, but if profiling confirms otherwise, inline the call
- **As a replacement for proper domain modeling** — Ports isolate infrastructure concerns; they do not solve unclear entity boundaries or god objects inside the core

---

## Core Workflow

1. **Catalog external dependencies** — List every I/O boundary your system crosses: databases, HTTP clients, file systems, message queues, third-party APIs, email services, payment gateways. For each dependency, determine whether it is a *driven port* (the core domain needs something from infrastructure) or a *driving port* (external actors call into the system through an interface).
   **Checkpoint:** Every external library listed in `pyproject.toml` under `[project.dependencies]` must map to exactly one port — either as a driven port implementation or as part of the adapter boundary.

2. **Draft the Protocol or ABC** — For each driven port, write the minimal interface using `typing.Protocol` (preferred for structural subtyping) or `abc.ABC` (when you need abstract method enforcement or inheritance chains). Name the protocol from the consumer's perspective: if `OrderService` needs to persist orders, call it `OrderRepository`, not `DatabaseConnection`.
   **Checkpoint:** The Protocol must declare only the methods the core domain actually calls. If a concrete implementation has 20 methods but the consumer only uses 3, the Protocol should have exactly 3 — this is Interface Segregation in practice.

3. **Write preconditions and postconditions** — Add structured docstrings to every port method. Document what must be true before the call (preconditions), what the caller can expect after (postconditions), and any invariants that hold across calls.
   **Checkpoint:** If a precondition cannot be expressed as a type hint, state it explicitly in the docstring. Example: "`order` must not be None — calling code is responsible for validation before invoking this method."

4. **Implement concrete adapters** — Create adapter classes in a separate package (e.g., `adapters/`) that import both the port Protocol and the specific infrastructure library. Each adapter implements exactly one port. Never let an adapter contain logic from two different ports — single responsibility applies to adapters too.
   **Checkpoint:** Run the adapter through mypy against its declared Protocol with `--strict`. Any missing method or type mismatch must be resolved before merging.

5. **Create in-memory stubs for testing** — For each driven port, produce a `FakePortName` class that lives in the test package. Implement it with dictionaries, lists, or mock objects to provide deterministic behavior without touching real infrastructure.
   **Checkpoint:** A unit test that imports a fake adapter and exercises the core domain should pass with zero network calls, zero database connections, and zero file system access.

6. **Wire at composition root** — In `main.py` or a dedicated `bootstrap.py`, import both the port Protocol and all concrete adapters. Construct each adapter and pass it to the core services that depend on it. The composition root is the only file that imports from both layers simultaneously.
   **Checkpoint:** Run a startup smoke test that calls the production bootstrap function and exercises one complete use case end-to-end with real infrastructure.

---

## Implementation Patterns

### Pattern 1: Driving Ports (Protocol-Based, External Actors Calling In)

Driving ports (also called secondary ports) expose use cases to external actors — controllers, CLI commands, scheduled jobs. They define the entry points into your domain. Use `@runtime_checkable` when you want isinstance checks at runtime; omit it for performance-critical paths where only static typing is needed.

```python
from __future__ import annotations
from typing import Protocol, runtime_checkable


@runtime_checkable
class PlaceOrderCommandPort(Protocol):
    """Driving port: defines the interface external actors use to place orders."""

    def execute(
        self,
        user_id: str,
        product_id: str,
        quantity: int,
    ) -> str:
        """Place a new order for the given product.

        Preconditions:
            - user_id must be a non-empty string matching UUID v4 format
            - product_id must reference an active product in the catalog
            - quantity must be a positive integer (>= 1)

        Postconditions:
            - Returns a non-empty order ID string on success
            - Order state transitions to PENDING in the persistence layer
            - Inventory reservation is created if stock is available
        """
        ...


@runtime_checkable
class CancelOrderCommandPort(Protocol):
    """Driving port: defines the interface for cancelling existing orders."""

    def execute(self, order_id: str) -> bool:
        """Cancel an existing order by its ID.

        Preconditions:
            - order_id must belong to an order in PENDING or CONFIRMED state
            - Order must not have already shipped

        Postconditions:
            - Returns True if cancellation succeeded, False if already fulfilled
            - Reserved inventory is released back to available stock
        """
        ...
```

### Pattern 2: Driven Ports (ABC-Based, Interfaces the Domain Needs)

Driven ports (also called primary ports) define what the core domain needs from external systems. These are implemented by infrastructure adapters. Use `abc.ABC` when you want abstract method enforcement or inheritance hierarchies among adapters.

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Sequence


@dataclass(frozen=True)
class Product:
    """Domain entity representing a product in the catalog."""
    id: str
    name: str
    sku: str
    price_cents: int
    in_stock: bool = True


class ProductRepository(ABC):
    """Driven port: defines what the domain needs from product persistence."""

    @abstractmethod
    def get_by_id(self, product_id: str) -> Product | None:
        """Retrieve a product by its unique identifier.

        Precondition:
            - product_id must be a non-empty string

        Postcondition:
            - Returns the Product if found, None if no product matches
        """
        ...

    @abstractmethod
    def get_available_products(self, limit: int = 50) -> Sequence[Product]:
        """Retrieve available products, ordered by creation date descending.

        Precondition:
            - limit must be between 1 and 1000 inclusive

        Postcondition:
            - Returns at most `limit` products where in_stock is True
        """
        ...

    @abstractmethod
    def save(self, product: Product) -> Product:
        """Persist a product to the catalog.

        Precondition:
            - product.id must be non-empty
            - product.price_cents must be non-negative

        Postcondition:
            - Returns the persisted product (may have updated fields like updated_at)
        - If a product with the same ID exists, this performs an upsert
        """
        ...


class StockCheckRepository(ABC):
    """Driven port: defines what the domain needs for inventory operations."""

    @abstractmethod
    def reserve_stock(self, product_id: str, quantity: int) -> bool:
        """Reserve stock for a pending order.

        Precondition:
            - product_id must exist in the catalog
            - quantity must be >= 1

        Postcondition:
            - Returns True if reservation succeeded (stock was available)
            - Returns False if insufficient stock is available
        """
        ...

    @abstractmethod
    def release_reservation(self, product_id: str, quantity: int) -> None:
        """Release a previously made stock reservation.

        Postcondition:
            - Stock count increases by the reserved quantity
        """
        ...
```

### Pattern 3: Protocol vs ABC — Choosing the Right Abstraction

Choosing between `Protocol` and `ABC` is one of the most common port design decisions. Here's a concrete comparison showing when each is appropriate.

```python
# ❌ BAD: Using ABC for every interface, even when structural subtyping would suffice.
# This forces inheritance hierarchies that limit flexibility and make testing harder.
from abc import ABC, abstractmethod


class BadDatabaseClient(ABC):
    """ABC forces subclassing — every new database requires a new class declaration."""

    @abstractmethod
    def query(self, sql: str, params: tuple) -> list[dict]: ...

    @abstractmethod
    def execute(self, sql: str, params: tuple) -> int: ...

    @abstractmethod
    def close(self) -> None: ...


class GoodDatabaseClient:
    """No inheritance required — just implement the methods. Structural subtyping."""
    pass  # Will satisfy any Protocol with these three methods


from typing import Protocol


class DatabaseClient(Protocol):
    """Protocol-based interface — any object with matching signatures satisfies it."""

    def query(self, sql: str, params: tuple) -> list[dict]: ...
    def execute(self, sql: str, params: tuple) -> int: ...
    def close(self) -> None: ...


# ✅ GOOD: SQLAlchemy adapter implements DatabaseClient structurally — no inheritance.
import sqlalchemy as sa


class SQLAlchemyClient:
    """Satisfies DatabaseClient Protocol without inheriting from it."""

    def __init__(self, engine: sa.Engine) -> None:
        self.engine = engine

    def query(self, sql: str, params: tuple) -> list[dict]:
        with self.engine.connect() as conn:
            result = conn.execute(sa.text(sql), params)  # type: ignore[arg-type]
            return [dict(row._mapping) for row in result.fetchall()]

    def execute(self, sql: str, params: tuple) -> int:
        with self.engine.connect() as conn:
            result = conn.execute(sa.text(sql), params)  # type: ignore[arg-type]
            conn.commit()
            return result.rowcount  # type: ignore[attr-defined]

    def close(self) -> None:
        self.engine.dispose()


# ✅ GOOD: In-memory test double satisfies the same Protocol — no inheritance chain needed.
class MemoryClient:
    """Fake implementation for unit tests — satisfies DatabaseClient structurally."""

    def __init__(self) -> None:
        self._tables: dict[str, list[dict]] = {}

    def query(self, sql: str, params: tuple) -> list[dict]:
        return []  # Simplified for illustration

    def execute(self, sql: str, params: tuple) -> int:
        return 1  # Simplified for illustration

    def close(self) -> None:
        pass
```

### Pattern 4: Port Contract Documentation (Preconditions, Postconditions, Invariants)

Every port method should document its contract explicitly. This makes the interface self-documenting and enables static analysis tools to enforce constraints. Use `attrs.define` or `dataclass(frozen=True)` for immutable request/response types.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol


class TransferStatus(Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REVERSED = "reversed"


@dataclass(frozen=True)
class TransferRequest:
    """Immutable request object for the transfer port contract."""
    from_account_id: str
    to_account_id: str
    amount_cents: int
    currency: str = "USD"
    reference: str | None = None

    def __post_init__(self) -> None:
        if self.amount_cents <= 0:
            raise ValueError("Transfer amount must be positive")
        if self.from_account_id == self.to_account_id:
            raise ValueError("Cannot transfer to the same account")


@dataclass(frozen=True)
class TransferResult:
    """Immutable result object returned by the transfer port."""
    transfer_id: str
    status: TransferStatus
    from_account_id: str
    to_account_id: str
    amount_cents: int
    error_message: str | None = None


class TransferPort(Protocol):
    """Port contract for initiating fund transfers.

    Invariants (hold across all calls):
        - transfer_id values are globally unique UUID v4 strings
        - amount_cents is always stored as an integer (no floating point)
        - Status transitions follow: PENDING -> COMPLETED | FAILED -> REVERSED
    """

    def execute_transfer(self, request: TransferRequest) -> TransferResult:
        """Execute a fund transfer between two accounts.

        Preconditions:
            - from_account_id must exist and have sufficient balance
            - to_account_id must exist and be an active account
            - request.currency must match the accounts' currency settings
            - request.amount_cents must not exceed the daily transfer limit (100,000 USD)

        Postconditions:
            - A TransferResult is returned with status COMPLETED on success
            - On failure, returns TransferResult with FAILED status and error_message set
            - Account balances are updated atomically within a database transaction
            - An audit log entry is created for both success and failure cases
        """
        ...

    def get_transfer_status(self, transfer_id: str) -> TransferResult | None:
        """Query the current status of a previously initiated transfer.

        Precondition:
            - transfer_id must be a valid UUID v4 string

        Postcondition:
            - Returns TransferResult with the latest known status
            - Returns None if no transfer with this ID exists in the system
        """
        ...


# ✅ GOOD: Concrete adapter implementing the full port contract.
from uuid import UUID, uuid4


class BankingTransferAdapter:
    """Real-world adapter implementing TransferPort for an external banking API."""

    def __init__(self, api_base_url: str, api_key: str) -> None:
        self._base_url = api_base_url.rstrip("/")
        self._api_key = api_key

    def execute_transfer(self, request: TransferRequest) -> TransferResult:
        # Real adapter would call external banking API here
        transfer_id = str(uuid4())

        try:
            # Simulate API call — production code uses httpx or requests
            response_status = TransferStatus.COMPLETED  # Placeholder for real call
        except ConnectionError as exc:
            return TransferResult(
                transfer_id=transfer_id,
                status=TransferStatus.FAILED,
                from_account_id=request.from_account_id,
                to_account_id=request.to_account_id,
                amount_cents=request.amount_cents,
                error_message=f"Banking API unreachable: {exc}",
            )

        return TransferResult(
            transfer_id=transfer_id,
            status=response_status,
            from_account_id=request.from_account_id,
            to_account_id=request.to_account_id,
            amount_cents=request.amount_cents,
        )

    def get_transfer_status(self, transfer_id: str) -> TransferResult | None:
        # Real adapter would query the banking API for status
        return None  # Placeholder — real implementation queries API
```

### Pattern 5: In-Memory Stub Implementation for Testing

Every driven port should have a fake implementation for unit testing. This isolates domain logic from infrastructure without needing `unittest.mock.MagicMock` — the fake is a first-class class that you can inspect, assert against, and reason about.

```python
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Sequence


@dataclass
class FakeProductRepo:
    """In-memory stub for ProductRepository used exclusively in unit tests."""

    _products: dict[str, Product] = field(default_factory=dict)
    _call_log: list[str] = field(default_factory=list)

    def get_by_id(self, product_id: str) -> Product | None:
        self._call_log.append(f"get_by_id({product_id!r})")
        return self._products.get(product_id)

    def get_available_products(self, limit: int = 50) -> Sequence[Product]:
        self._call_log.append(f"get_available_products(limit={limit})")
        available = [p for p in self._products.values() if p.in_stock]
        return sorted(available, key=lambda p: p.id)[:limit]

    def save(self, product: Product) -> Product:
        self._call_log.append(f"save(product_id={product.id!r})")
        self._products[product.id] = product
        return product

    # ---- Inspection helpers for tests ----
    def called_with(self, product_id: str) -> bool:
        """Check if get_by_id was called with the given ID."""
        return f"get_by_id({product_id!r})" in self._call_log

    def last_action(self) -> str | None:
        """Return the most recent operation performed on this fake."""
        return self._call_log[-1] if self._call_log else None

    def product_count(self) -> int:
        """Return number of products currently stored."""
        return len(self._products)

    def reset(self) -> None:
        """Clear all state — useful between test cases."""
        self._products.clear()
        self._call_log.clear()


@dataclass
class FakeStockCheckRepo:
    """In-memory stub for StockCheckRepository used exclusively in unit tests."""

    _stock_levels: dict[str, int] = field(default_factory=dict)
    _reservations: dict[str, int] = field(default_factory=dict)
    _call_log: list[str] = field(default_factory=list)

    def reserve_stock(self, product_id: str, quantity: int) -> bool:
        self._call_log.append(f"reserve({product_id!r}, qty={quantity})")
        available = self._stock_levels.get(product_id, 0) - self._reservations.get(product_id, 0)
        if available >= quantity:
            self._reservations[product_id] = self._reservations.get(product_id, 0) + quantity
            return True
        return False

    def release_reservation(self, product_id: str, quantity: int) -> None:
        self._call_log.append(f"release({product_id!r}, qty={quantity})")
        current = self._reservations.get(product_id, 0)
        self._reservations[product_id] = max(0, current - quantity)

    # ---- Inspection helpers for tests ----
    def reservation_count(self, product_id: str) -> int:
        return self._reservations.get(product_id, 0)

    def reset(self) -> None:
        self._stock_levels.clear()
        self._reservations.clear()
        self._call_log.clear()
```

---

## Constraints

### MUST DO
- Name every protocol from the consumer's perspective, not the provider's — `OrderRepository` not `DatabaseConnection`, `HttpClient` not `RequestsClient`
- Use `typing.Protocol` (structural subtyping) by default; reserve `abc.ABC` for interfaces requiring abstract method enforcement or inheritance hierarchies
- Declare only the methods the core domain actually uses in a Protocol — Interface Segregation Principle means narrow contracts, not fat ones
- Include precondition/postcondition/invariant documentation in every port method docstring using structured format
- Place Protocol definitions in the core domain layer (`core/ports.py` or `domain/ports.py`) — never inside infrastructure packages
- Create a fake stub implementation for every driven port to enable deterministic unit testing without mocks
- When a protocol requires breaking changes (method removal, signature change), create a new versioned port (`ProductRepositoryV2`) rather than mutating the existing one

### MUST NOT DO
- Import any concrete infrastructure class (`sqlalchemy`, `httpx`, `pymongo`) into the Protocol definition file — ports must be 100% framework-agnostic
- Define more than one unrelated Protocol in a single file — each port deserves its own module for clear boundaries and easy navigation
- Use `isinstance(adapter, SomeProtocol)` at runtime unless you've decorated the Protocol with `@runtime_checkable` and explicitly need that check — static type checking is preferred
- Mix driving and driven ports in the same interface — a driving port exposes use-cases; a driven port declares infrastructure needs. They serve opposite dependency directions.
- Use `**kwargs` or `Any` types in port method signatures — explicit typed parameters are the whole point of Protocol-based interfaces

---

## Output Template

When implementing or reviewing port interfaces, produce:

1. **Port Classification** — For each interface: driving (secondary) vs. driven (primary), and which external system it isolates
2. **Protocol/ABC Definition** — The complete interface with typed signatures and docstrings containing preconditions, postconditions, and invariants
3. **Adapter Implementation** — Concrete class that imports the port Protocol AND the specific infrastructure library
4. **Fake Stub** — In-memory test double for every driven port, with inspection helpers for test assertions
5. **Dependency Direction Verification** — Confirmation that the core domain imports only ports, never concrete adapters

---

## Related Skills

| Skill | Purpose |
|---|---|
| `hexagonal-architecture` | The overarching architecture pattern that uses ports and adapters; this skill defines how to declare the port interfaces themselves |
| `composition-root` | Wires concrete adapters to their declared ports at application startup — the natural next step after defining ports |
| `test-driven-development` | Write port contracts first, then implement adapters against them in a TDD workflow |
| `anti-corruption-layer` | Builds adapter boundaries that translate between external domain models and your internal domain model through ports |
| `dependency-inversion-principle` | The SOLID principle that ports enforce: high-level modules depend on abstractions, not concretions |
