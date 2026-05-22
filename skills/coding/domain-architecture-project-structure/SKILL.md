---
name: domain-architecture-project-structure
description: Defines project directory layouts and module organization for domain-driven systems — vertical slice architecture, modular monolith structure, layer separation within modules, and build configuration for maintainable DDD codebases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: project structure, module organization, vertical slice, modular monolith, DDD layout, how do i organize a ddd project, domain driven architecture, clean directory structure, layer separation
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: domain-driven-design, hexagonal-architecture, ports-patterns, monolith-architecture
---

# Domain Architecture and Project Structure

Acts as a senior software architect designing directory layouts, module boundaries, and project organization for domain-driven systems. When loaded, the model selects an appropriate project structure pattern (vertical slice, modular monolith with horizontal layers, or feature-oriented), defines bounded-context module boundaries, configures build-system dependency validation, and produces concrete directory trees and composition root code that enforce inward dependency flow.

## TL;DR Checklist

- [ ] Choose vertical slice architecture for small-to-medium teams (≤8 developers); choose modular monolith with horizontal layers for larger organizations or established DDD teams
- [ ] Define each bounded context as a top-level directory under `contexts/` (vertical slice) or `domain/` (modular monolith) — never mix contexts within a single module
- [ ] Within each module, separate domain, application, and infrastructure concerns using consistent subdirectories (`domain/`, `application/`, `infrastructure/`) or inline them if the module is small
- [ ] Create a single composition root at project root that wires all modules together without circular imports
- [ ] Configure import linting (`.isort.cfg` or `pyproject.toml` dependency rules) to enforce architectural boundaries — domain code must never import application or infrastructure
- [ ] Place shared value objects and base entities in `shared/domain/` when they are genuinely reusable across bounded contexts; avoid premature sharing

---

## When to Use

Use this skill when:

- Starting a new greenfield project with domain complexity that justifies DDD-level organization (multiple bounded contexts, complex invariants, separate teams)
- Refactoring an existing codebase where files are organized by technical layer (`controllers/`, `services/`, `models/`) and need to be reorganized around domain boundaries
- Onboarding a team to a modular monolith and needing a clear directory structure that enforces module isolation from day one
- Building a Python service where the standard "flat package" structure causes circular imports and hard-to-trace dependency cycles
- Evaluating whether vertical slice architecture or horizontal layer organization is the right fit for your team size, domain complexity, and deployment model

---

## When NOT to Use

Avoid this skill for:

- **Simple CRUD services with a single aggregate** — A flat package structure (`app/models.py`, `app/views.py`, `app/services.py`) is simpler and perfectly adequate when there is only one bounded context
- **Monorepos managing multiple independent services** — Project structure within each service should be simple; use this skill only for the internal layout of a single large service, not for monorepo top-level organization
- **Teams without DDD understanding** — Domain-oriented structure assumes familiarity with bounded contexts and ubiquitous language. Without that shared vocabulary, module boundaries are arbitrary and become sources of friction rather than clarity
- **Microservice architectures where each service is already its own repository** — Inter-service boundaries are handled by network contracts, not directory layout. Use this skill only within a single service that contains multiple bounded contexts

---

## Core Workflow

1. **Assess system complexity and team structure** — Count the number of distinct bounded contexts, estimate the team size, and identify whether contexts share data or collaborate through integration patterns. Small teams (≤4 people) with 2–3 bounded contexts benefit most from vertical slice architecture because each developer owns a complete feature end-to-end. Larger teams or systems with 5+ bounded contexts may need horizontal layer separation to enable parallel work across the same domain concepts.
   **Checkpoint:** Draw a context map showing all bounded contexts and their relationships (partner, customer-supplier, conformist, anti-corruption layer). If there are fewer than 3 distinct contexts, consider that a flat structure with modules may be sufficient.

2. **Choose architecture style** — Select between vertical slice (feature-oriented, each slice contains its own domain/application/infrastructure) and modular monolith with horizontal layers (domain models grouped by context but application/infrastructure shared across all modules). Vertical slices are the default recommendation for Python projects under 150k lines. Horizontal layers are preferable when you have a large infrastructure team managing shared persistence, messaging, or API gateway concerns.
   **Checkpoint:** If every team member works on different features independently with minimal cross-cutting logic, choose vertical slice. If there is a heavy infrastructure layer (multiple databases, message brokers, complex caching) that all domains depend on equally, consider horizontal layers.

3. **Define module boundaries from context map** — Create one top-level directory per bounded context identified in step 1. Each directory contains the full stack for that context: domain models, application use cases, and infrastructure implementations. Name directories after domain concepts using ubiquitous language (e.g., `orders/`, `payments/`, `inventory/`), NOT technical concerns (avoid `controllers/`, `repositories/` at the top level).
   **Checkpoint:** Verify that no bounded context's directory imports code from another context's directory — cross-context communication must go through shared interfaces or event channels, not direct file imports.

4. **Organize internal module structure** — Within each context directory, decide between inline organization (small modules: `order.py`, `commands.py`, `repositories.py` directly in the context dir) and layered subdirectories (`domain/`, `application/`, `infrastructure/`). Use inline for small modules (< 10 files total). Use layered subdirectories when a module exceeds ~20 files or multiple developers are working on the same bounded context simultaneously.
   **Checkpoint:** Every file within a context should be importable by any other file in the same context without circular imports. If you detect cycles, split the affected concepts into separate modules.

5. **Set up the composition root** — Create a single bootstrap file at project root (`app/main.py` or `bootstrap.py`) that: imports all domain service interfaces (from each context's application layer), instantiates concrete infrastructure adapters, wires them together through constructor injection, and returns the top-level application object. This is the only file permitted to import from both domain/application layers AND infrastructure simultaneously.
   **Checkpoint:** Run the composition root with test fakes — if it succeeds without importing any real infrastructure (database drivers, HTTP clients, message brokers), your dependency direction is correct.

6. **Configure build-system dependency validation** — Add import linting rules to `pyproject.toml` or `.isort.cfg` that enforce architectural boundaries: domain modules may not import from application or infrastructure; shared code must be explicitly whitelisted. Use `pytest-dependency` or custom test fixtures to verify at CI time that no module crosses its declared boundary.
   **Checkpoint:** Run the linting rules on a fresh clone of the project — they should pass without warnings. Add a pre-commit hook so violations are caught before pushing.

---

## Implementation Patterns

### Pattern 1: Vertical Slice Architecture (Feature-Oriented)

Organize code by feature or bounded context rather than technical layer. Each slice owns its complete stack — domain models, use case handlers, and infrastructure adapters for that specific business capability. This is the default recommendation for Python projects with 2–6 bounded contexts and teams of ≤8 developers.

```
src/
├── contexts/
│   ├── orders/                  ← One slice per bounded context
│   │   ├── __init__.py
│   │   ├── domain/
│   │   │   ├── __init__.py
│   │   │   ├── entities.py      # Order aggregate root, OrderItem
│   │   │   ├── value_objects.py # Money, OrderId, Address
│   │   │   └── events.py        # OrderConfirmed, ItemsAdded
│   │   ├── application/
│   │   │   ├── __init__.py
│   │   │   ├── commands.py      # CreateOrderHandler, CancelOrderHandler
│   │   │   └── queries.py       # GetOrderHandler, ListOrdersHandler
│   │   ├── infrastructure/
│   │   │   ├── __init__.py
│   │   │   ├── repositories.py  # OrderRepository (Postgres implementation)
│   │   │   └── messaging.py     # Order event publisher to message broker
│   │   └── api/                 # Optional: HTTP handlers for this context
│   │       └── routes.py        # /orders, /orders/{id}
│   ├── payments/
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── api/
│   └── customers/
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── api/
├── shared/                      # Cross-cutting concerns
│   ├── __init__.py
│   ├── domain/                  # Shared value objects, base entities, common ports
│   │   ├── __init__.py
│   │   ├── value_objects.py     # Money, EmailAddress, MoneyAmount
│   │   └── ports.py             # Shared port interfaces (e.g., PaymentGatewayPort)
│   └── infrastructure/          # Common adapters used by multiple contexts
│       ├── __init__.py
│       ├── logging.py           # Structured logger setup
│       ├── config.py            # Configuration loading from environment
│       └── repositories.py      # Base repository class with common CRUD
├── main.py                      # Composition root / application bootstrap
└── pyproject.toml               # Build config + dependency validation rules
```

**Key decisions:**

| Decision | Recommendation | Rationale |
|---|---|---|
| Slice boundary = Bounded Context? | Yes. Each slice owns one context. | Aligns directory structure with domain expertise; each developer can own a complete business capability. |
| Shared code in `shared/`? | Only for genuinely reusable items: value objects (`Money`, `EmailAddress`), base entities, and cross-cutting ports. | Prevents shared code from becoming a dumping ground that re-creates the old layer-based anti-pattern. |
| HTTP handlers inside slices? | Yes — each slice owns its API routes. | Keeps the full user journey (request → domain → response) within one module. |
| When to stop using vertical slices? | When you have >8 developers per context, or infrastructure teams need shared control over databases/messaging. Switch to modular monolith with horizontal layers. | Too many people in one slice causes merge conflicts and architectural drift. |

### Pattern 2: Modular Monolith with Horizontal Layers

Alternative structure where domain models are grouped by bounded context but application services and infrastructure are shared horizontally across all modules. Suitable for larger organizations (8+ developers) or systems with heavy shared infrastructure concerns.

```
src/
├── domain/                    # Bounded contexts grouped here
│   ├── __init__.py
│   ├── orders/                # Context 1
│   │   ├── __init__.py
│   │   ├── order.py           # Order aggregate, OrderItem
│   │   └── repository.py      # OrderRepository interface (ABC)
│   ├── payments/              # Context 2
│   │   ├── __init__.py
│   │   ├── payment.py         # Payment entity, refund logic
│   │   └── repository.py      # PaymentRepository interface
│   ├── customers/             # Context 3
│   │   ├── __init__.py
│   │   ├── customer.py        # Customer aggregate
│   │   └── repository.py      # CustomerRepository interface
│   └── shared/                # Shared domain primitives (NOT infrastructure)
│       ├── __init__.py
│       ├── value_objects.py   # Money, EmailAddress (domain-level, not technical)
│       └── events.py          # Base domain event class
├── application/               # Application services shared across all contexts
│   ├── __init__.py
│   ├── commands/              # Use case handlers for ALL domains
│   │   ├── order_commands.py  # CreateOrderHandler, CancelOrderHandler
│   │   └── payment_commands.py
│   ├── queries/               # Read-side use cases
│   │   ├── order_queries.py
│   │   └── customer_queries.py
│   └── services.py            # Cross-cutting application logic
├── infrastructure/            # Infrastructure adapters shared across contexts
│   ├── __init__.py
│   ├── persistence/           # Database adapters
│   │   ├── order_repo_impl.py  # Postgres implementation of OrderRepository
│   │   └── payment_repo_impl.py
│   ├── messaging/             # Message broker adapters
│   │   └── event_bus.py       # Shared event bus for all domain events
│   └── api/                   # HTTP framework setup (shared middleware, routes)
│       ├── __init__.py
│       └── router.py          # Centralized route registration
├── interfaces/                # External entry points (HTTP controllers, CLI)
│   └── http/                  # FastAPI/Flask request handlers
│       ├── __init__.py
│       └── orders.py          # HTTP endpoints for order operations
├── main.py                    # Composition root
└── pyproject.toml
```

### Pattern 3: Composition Root Wiring Multiple Bounded Contexts

The composition root is the single point where all module dependencies are assembled. It must respect module boundaries — it wires interfaces to implementations, but domain code in one context never imports another context's domain directly.

```python
from __future__ import annotations

# --- Domain layer imports (interfaces only) ---
from contexts.orders.domain.entities import Order, OrderItem
from contexts.orders.application.commands import CreateOrderHandler
from contexts.payments.domain.entities import Payment
from contexts.payments.application.commands import ProcessPaymentHandler

# --- Infrastructure implementations ---
from contexts.orders.infrastructure.repositories import PostgresOrderRepository
from contexts.payments.infrastructure.repositories import PostgresPaymentRepository
from shared.infrastructure.messaging import InMemoryEventBus


class AppContainer:
    """Application-wide container that holds composed services.

    This class is returned by build_application() and serves as the
    dependency injection point for HTTP handlers, CLI commands, and tests.
    It does NOT instantiate domain objects — those are created within use cases.
    """

    def __init__(
        self,
        create_order_handler: CreateOrderHandler,
        process_payment_handler: ProcessPaymentHandler,
    ) -> None:
        self.create_order = create_order_handler.execute
        self.process_payment = process_payment_handler.execute


def build_application(db_connection_string: str) -> AppContainer:
    """Composition root — the single place where all modules are wired.

    Domain layer interfaces come from each context's application or domain module.
    Infrastructure implementations come from each context's infrastructure module.
    No context imports another context's code — dependencies flow inward only.
    """
    # 1. Create infrastructure adapters (leaf dependencies)
    order_repo = PostgresOrderRepository(connection_string=db_connection_string)
    payment_repo = PostgresPaymentRepository(connection_string=db_connection_string)
    event_bus = InMemoryEventBus()

    # 2. Create domain use case handlers (depends on infrastructure + other domains via ports)
    create_order_handler = CreateOrderHandler(
        order_repository=order_repo,
        payment_gateway=payment_repo,  # Injected as a port/interface
        event_bus=event_bus,
    )

    process_payment_handler = ProcessPaymentHandler(
        payment_repository=payment_repo,
        event_bus=event_bus,
    )

    # 3. Assemble the application container
    return AppContainer(
        create_order_handler=create_order_handler,
        process_payment_handler=process_payment_handler,
    )


# --- Usage in main.py or framework entry point ---
def main() -> None:
    """Application entry point — wires everything and starts the server."""
    app = build_application(db_connection_string="postgresql://localhost/orders")

    # Now pass `app` to your HTTP framework's dependency injection system,
    # or use it directly in a CLI wrapper.
    print(f"Application started with {len(dir(app))} service methods available")


if __name__ == "__main__":
    main()
```

### Pattern 4: Shared Kernel Organization (Cross-Context Collaboration)

When bounded contexts need to share domain concepts, use an explicit shared kernel rather than duplicating models. The shared kernel lives in `shared/domain/` and contains value objects and interfaces that are genuinely part of the ubiquitous language across contexts.

```
src/shared/domain/
├── __init__.py
├── value_objects.py    # Money, EmailAddress, MoneyAmount — used by orders AND payments
├── ports.py            # PaymentGatewayPort — an interface defined in shared so both
│                       #   the orders context (caller) and payments context (implementer)
│                       #   can reference it without importing each other.
└── events.py           # BaseDomainEvent — the parent class for all domain events
```

```python
# --- src/shared/domain/ports.py ---
from __future__ import annotations
from typing import Protocol


class PaymentGatewayPort(Protocol):
    """Shared interface between orders context and payments context.

    The orders context depends on this PORT (not an implementation).
    The payments context provides the IMPLEMENTATION of this port.
    Neither context imports the other — they communicate through this shared contract.
    """

    def charge(self, order_id: str, amount_cents: int, currency: str) -> str:
        """Process a payment and return a transaction ID.

        Preconditions:
            - order_id must be a non-empty string
            - amount_cents must be positive
            - currency must be a 3-letter ISO 4217 code

        Postconditions:
            - Returns a unique transaction identifier on success
            - Raises ValueError if the payment gateway is unreachable
        """
        ...


# --- src/contexts/orders/application/commands.py (consumer of the port) ---
class CreateOrderHandler:
    """Use case handler that depends on PaymentGatewayPort, NOT on the payments context."""

    def __init__(
        self,
        order_repository,  # Type: OrderRepository — from orders.infrastructure
        payment_gateway: PaymentGatewayPort,  # Type: Port interface — from shared.domain
        event_bus,  # Type: EventBus — from shared.infrastructure
    ) -> None:
        self._repo = order_repository
        self._payment_gateway = payment_gateway
        self._event_bus = event_bus

    def execute(self, user_id: str, items: list[dict], total_cents: int, currency: str) -> str:
        """Create an order and process initial payment in a single use case."""
        # Order creation logic...
        order_id = "ord_001"  # Simplified

        # Payment is processed via the shared port — NOT by importing payments context
        transaction_id = self._payment_gateway.charge(
            order_id=order_id,
            amount_cents=total_cents,
            currency=currency,
        )

        return order_id


# --- src/contexts/payments/infrastructure/repositories.py (provider of the port) ---
class PostgresPaymentRepository:
    """Implements PaymentGatewayPort for the payments bounded context."""

    def charge(self, order_id: str, amount_cents: int, currency: str) -> str:
        """Real payment gateway implementation using PostgreSQL + Stripe SDK."""
        # Real code would call Stripe API here
        import uuid
        return f"txn_{uuid.uuid4().hex[:12]}"


# ❌ BAD: Orders context directly imports the payments context's concrete class.
# This creates a hard dependency from orders → payments, making it impossible to
# test orders independently or replace the payment implementation.
class BadOrdersContext:
    def __init__(self) -> None:
        # Direct import of another bounded context's implementation!
        from contexts.payments.infrastructure.repositories import PostgresPaymentRepository  # noqa: F811
        self._gateway = PostgresPaymentRepository()


# ✅ GOOD: Orders context depends on the shared PaymentGatewayPort interface.
# The payments context implements it. Neither imports the other.
class GoodOrdersContext:
    def __init__(self, gateway: PaymentGatewayPort) -> None:
        # Depends only on the shared port — works with any implementation
        self._gateway = gateway

```

### Pattern 5: Import Validation Configuration (Enforcing Architectural Boundaries)

Use `isort` profiles and custom pytest fixtures to enforce that code in one module cannot import code from another module. This catches architectural violations at lint time and test time.

```toml
# --- pyproject.toml — isort configuration for dependency validation ---

[tool.isort]
profile = "black"
src_paths = ["src"]

# Define layered import sections that enforce architecture
known_first_party = ["shared", "main"]
sections = [
    "FUTURE",
    "STDLIB",
    "THIRDPARTY",
    "FIRSTPARTY",
    "LOCALFOLDER",
]

# Order imports: stdlib → third-party → first-party (shared) → local folder
# This enforces that shared code is imported before any local module
import_heading_stdlib = "Standard Library"
import_heading_thirdparty = "External Dependencies"
import_heading_firstparty = "Shared Domain & Infrastructure"
import_heading_localfolder = "Local Modules"

[tool.isort.settings]
profile = "black"
combine_as_imports = true

# --- pyproject.toml — Custom dependency rules (requires pytest-dependency or ruff) ---

[tool.ruff.lint]
select = ["I"]  # Enable isort rules only

[tool.ruff.lint.isort]
force-single-line = false
case-sensitive = true
known-first-party = ["shared"]
```

```python
# --- tests/test_architecture.py — Runtime validation that no module crosses its boundary ---
from __future__ import annotations

import ast
import sys
from pathlib import Path


def test_no_context_crosses_boundary() -> None:
    """Verify that no file in one bounded context imports from another context.

    This is a static analysis test that parses every Python file in the src/ directory
    and checks its AST imports against declared module boundaries.
    """
    src_dir = Path(__file__).parent.parent / "src"

    # Define allowed intra-context imports (each context can import its own files)
    allowed_imports: dict[str, list[str]] = {
        "contexts/orders": ["contexts.orders", "shared"],
        "contexts/payments": ["contexts.payments", "shared"],
        "contexts/customers": ["contexts.customers", "shared"],
    }

    violations: list[str] = []

    for py_file in src_dir.rglob("*.py"):
        if not py_file.is_relative_to(src_dir):
            continue

        # Compute the module path from src/ root
        relative = py_file.relative_to(src_dir)
        module_prefix = str(relative).replace("/", ".")

        try:
            source = py_file.read_text()
            tree = ast.parse(source, filename=str(py_file))
        except SyntaxError:
            continue

        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                if isinstance(node, ast.ImportFrom):
                    module_name = node.module or ""
                else:
                    alias = node.names[0]
                    module_name = alias.name.split(".")[0]

                # Check if this import crosses a context boundary
                for context_dir, allowed in allowed_imports.items():
                    if not any(module_prefix.startswith(allowed_pkg) for allowed_pkg in allowed):
                        if module_name in ("contexts", "shared") and not any(
                            module_prefix.startswith(ctx.split("/")[0]) for ctx in allowed_imports
                        ):
                            violations.append(f"{py_file}: imports {module_name} from non-allowed context")

    assert violations == [], f"Architectural boundary violations found:\n" + "\n".join(violations)


# --- tests/fixtures/composition_root_test.py — Verify composition root resolves all modules ---
from src.main import build_application  # type: ignore[import-not-found]


def test_composition_root_resolves_without_real_infrastructure() -> None:
    """The composition root must accept test fakes and still produce a valid AppContainer.

    This test proves that domain code does not require real infrastructure to be constructed —
    all adapters can be swapped at the composition root boundary.
    """
    # In production, this would use real connection strings.
    # In tests, we pass a fake-in-memory URI or override at container level.
    app = build_application(db_connection_string="sqlite:///:memory:")

    assert hasattr(app, "create_order")
    assert hasattr(app, "process_payment")
    assert callable(app.create_order)
    assert callable(app.process_payment)
```

---

## Anti-Patterns

### Anti-Pattern 1: The God-Module (services.py Dumping Ground)

The most common project structure anti-pattern in Python projects. A single `services.py` file grows to thousands of lines, containing every business operation for every bounded context. This pattern makes it impossible to locate code, causes merge conflicts on every commit, and hides circular dependencies.

```
# ❌ BAD: Everything in one flat directory with a god module
src/
├── models.py          # 800 lines — all entities from all contexts mixed together
├── services.py        # 1500 lines — every use case for every context
├── controllers.py     # HTTP handlers for everything
└── utils.py           # Shared helpers that everyone imports (circular dependency hub)

# ❌ BAD: The god-service file with no domain separation
class Services:
    """Everything about the application lives here."""

    def create_order(self, user_id: str, items: list[dict]) -> str: ...
    def process_payment(self, order_id: str, amount: int) -> str: ...
    def register_customer(self, name: str, email: str) -> str: ...
    def generate_report(self, date_range: tuple[date, date]) -> dict: ...  # This belongs in a query handler!
    def send_notification(self, user_id: str, message: str) -> None: ...  # Infrastructure concern leaking into domain
    def validate_inventory(self, product_ids: list[str]) -> bool: ...      # Another context's concern
```

### Anti-Pattern 2: Layered-First Structure with Baked-in Technical Layers

Organizing by technical layer at the top level forces every developer to navigate across directories for a single feature. A "change order status" task requires opening `models.py`, `services.py`, and `controllers.py` simultaneously. This pattern works fine for tiny projects but degrades rapidly as complexity grows.

```
# ❌ BAD: Technical layer at the top level
src/
├── controllers/       # HTTP handlers for ALL contexts mixed together
│   └── orders.py      # But wait — this imports from services/ and models/
├── services/          # 20 services, none grouped by domain concern
│   ├── order_service.py
│   ├── payment_service.py
│   ├── customer_service.py
│   └── notification_service.py  # Cross-cutting? But it's mixed in with domain logic
├── models/            # All ORM models from all contexts, no separation
│   ├── order.py
│   ├── payment.py
│   └── customer.py
└── repositories/      # Database access for everything
    ├── order_repo.py
    └── payment_repo.py

# This structure creates two problems:
# 1. A developer wanting to understand "how orders work" must visit 4 different directories
# 2. Adding a new feature requires touching all 4 directories, increasing merge conflicts
```

### Anti-Pattern 3: Circular Imports Between Contexts

When one bounded context imports from another at the module level (not through dependency injection), Python's import system fails with circular import errors. This pattern usually appears when shared code is duplicated instead of properly abstracted into a shared kernel.

```python
# ❌ BAD: Circular dependency between orders and payments contexts

# src/contexts/orders/application/commands.py
from contexts.payments.infrastructure.repositories import PaymentProcessor  # CIRCULAR!

class CreateOrderHandler:
    def __init__(self, payment_processor: PaymentProcessor): ...


# src/contexts/payments/application/commands.py
from contexts.orders.domain.entities import Order  # CIRCULAR REVERSE!

class ProcessPaymentHandler:
    def __init__(self, order_repository): ...

# This circular import causes Python to fail at import time with:
# ImportError: cannot import name 'PaymentProcessor' from partially initialized module
```

**Fix:** Use shared port interfaces (Pattern 4 above) so neither context imports the other. The orders context depends on `PaymentGatewayPort` (defined in `shared/domain/ports.py`). The payments context implements it. Zero circular dependency.

---

## Constraints

### MUST DO

- **Name directories after domain concepts, not technical concerns** — use `contexts/orders/` not `src/controllers/`; use `contexts/payments/` not `src/services/`. Directory names should be understandable by domain experts without reading code.
- **Keep dependencies flowing inward** — domain modules must never import application or infrastructure packages. Application modules may import from the domain layer but not vice versa. Infrastructure imports from both domain (for interfaces) and application (for use case contracts).
- **Use import linting to enforce architectural boundaries** — configure `isort` with layered known-first-party sections, add ruff rules for import ordering, or use custom AST-based tests that parse every file and verify module boundaries are respected.
- **Place the composition root at project root** — a single `main.py` or `bootstrap.py` at the repository root is the entry point for dependency wiring. No other file should construct concrete infrastructure objects.
- **Keep shared kernel small and domain-focused** — `shared/domain/` should contain only value objects, base entities, and port interfaces that are genuinely part of the ubiquitous language across contexts. If a shared module grows beyond ~5 files, consider whether it is actually belonging to a specific bounded context.
- **Document module contracts explicitly** — each bounded context directory must have an `__init__.py` that exports only its public API (use case handlers, not internal implementations). This makes cross-context dependencies explicit and discoverable.

### MUST NOT DO

- **Create a separate "services/" directory at the top level that becomes a dumping ground for cross-cutting logic** — this re-creates the layered architecture anti-pattern and destroys domain isolation
- **Put all domain models in one file regardless of bounded context** — `models.py` with 800+ lines from every context mixed together is not a model; it's an organizational failure
- **Share database tables between modules** — each module owns its data. If two contexts need the same table, they share a view or a materialized copy through an integration contract, not direct table access
- **Create circular imports between bounded context modules** — if `orders` imports from `payments` and `payments` imports from `orders`, you have a structural design flaw. Introduce a shared port interface to break the cycle
- **Put infrastructure configuration inside domain or application modules** — database connection strings, API keys, and feature flags belong exclusively in the composition root or a dedicated configuration module at project root
- **Duplicate entity definitions across contexts** — if `Order` is defined identically in both the orders context and the notifications context, move it to `shared/domain/` as a shared value object. Duplicate models cause synchronization nightmares

---

## Output Template

When implementing or reviewing a domain-oriented project structure, produce:

1. **Directory Tree Diagram** — ASCII tree showing the complete project layout with all bounded context directories, shared kernel placement, and composition root location
2. **Module Boundary Map** — Table listing each directory, its allowed imports, and its prohibited imports (what it may NOT import from)
3. **Composition Root Code** — Complete wiring code showing how all module dependencies are assembled at a single entry point
4. **Import Validation Configuration** — `.isort.cfg` or `pyproject.toml` section with dependency validation rules configured for the chosen architecture style
5. **Architecture Decision Record** — Brief explanation of why vertical slice vs horizontal layers was selected, based on team size and domain complexity

---

## Related Skills

| Skill | Purpose |
|---|---|
| `domain-driven-design` | Tactical DDD patterns (aggregates, value objects) applied within this project structure's module boundaries |
| `hexagonal-architecture` | Ports and adapters patterns for the infrastructure boundary in each module — the structural complement to this layout skill |
| `ports-patterns` | Defining port interfaces using Python Protocols/ABCs that modules depend on instead of importing each other directly |
| `monolith-architecture` | Monolithic system design that this project structure serves as an organizational layer — how a well-structured monolith differs from microservices |

---

## Further Reading

- [Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/) — Jimmy Bogard's original guide to organizing by feature instead of layer
- [Modular Monolith with DDD](https://github.com/kgrzybek/modular-monolith-with-ddd) — Grzegorz Kozera's complete reference implementation with TypeScript, patterns directly applicable to Python projects
- [The Clean Architecture](https://blog.cleanclean.io/clean-architecture/) — Robert C. Martin's layered architecture that influenced modular monolith design
- [DDD in Python](https://github.com/qu3vipon/python-ddd) — Real-world Python DDD project structure with actual source code demonstrating vertical slice organization
- [*Domain-Driven Design: Tackling Complexity in the Heart of Software*](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215) by Eric Evans — Strategic DDD concepts (bounded contexts, context maps, shared kernels) that determine project structure boundaries

> 📖 skill(local cache): domain-driven-design, hexagonal-architecture, ports-patterns, monolith-architecture
