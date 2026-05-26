---
name: framework-architecture-design
description: Translates framework requirements into concrete architectural decisions including module boundaries, layering strategies, extension point placement, data flow design, and dependency topology that respect the chosen framework's paradigms.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework architecture, architectural layout, module boundaries, layering strategy, how do i structure a framework project, dependency topology, hexagonal architecture
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples, do-dont]
  archetypes:
    - tactical
    - strategic
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Framework Architecture Design

Acts as a senior software architect translating documented framework requirements into concrete architectural decisions. When loaded, the model determines optimal module boundaries, layering strategies, extension point placement, data flow design, configuration hierarchy, and dependency topology — all while respecting the chosen framework's paradigms, conventions, and lifecycle. This is about the structural skeleton of the application: where files live, what they import from what, and how concerns are separated into testable units.

## TL;DR Checklist

- [ ] Map every requirement to a specific directory/module in the proposed structure
- [ ] Draw the dependency topology — which layers may import from which, with explicit unidirectional arrows
- [ ] Place extension points at layer boundaries, never deep inside domain logic
- [ ] Design data flow as a pipeline through layers: presentation → orchestration → domain → infrastructure
- [ ] Configure hierarchy must support per-environment overrides without code changes
- [ ] Validate that each module is independently testable by mocking only its direct dependencies

---

## When to Use

Use this skill when:

- Starting a new project with a documented framework choice (FastAPI v3/Pydantic v2 + PostgreSQL, Spring Boot 3 + JPA, Next.js App Router + Prisma) and you need the directory layout before writing any code
- Refactoring an existing application where module boundaries have blurred — routes call databases directly, services import UI components
- Evaluating whether a modular monolith structure makes sense for a growing service that may later split into microservices
- Designing the architecture of a framework-based project where multiple teams will work on different modules simultaneously
- Building a framework with a multi-tier extension model (e.g., Django apps, Rails engines) and need to decide where plugin hooks belong

---

## When NOT to Use

Avoid this skill for:

- **Selecting which framework to use** — that is a technology decision, not an architectural layout problem
- **Implementing specific code patterns** within modules — use `framework-driven-design` for IoC/DI and lifecycle internals once the architecture exists
- **Integrating external frameworks into your app** — use `framework-integration-patterns` when you need to adapt a third-party framework's types
- **Simple scripts or one-shot CLIs** — applications with no persistence, no HTTP layer, and linear execution need no architecture
- **Microservice decomposition at the system level** — that belongs in `microservices-architecture`, which operates one level above module boundaries

---

## Core Workflow

1. **Inventory Framework Constraints & Conventions** — Document what the framework mandates (directory names it scans automatically, file naming conventions, lifecycle phases), what it recommends, and what it leaves open. For FastAPI: `routers/` is scanned by convention, dependency injection via `Depends()` is idiomatic. For Spring Boot: `@ComponentScan` defaults to `com.example.app`, `application.properties` convention, `src/main/java/com/example/app`. For Rails: MVC directories are mandatory (`app/controllers`, `app/models`, `app/views`), routing DSL in `config/routes.rb`. Apply the **5 Laws of Elegant Defense** (from `code-philosophy`) to ensure data flows naturally through layers — each layer owns its data shape and transforms it only at defined boundaries, never mutating shared state.

   **Checkpoint:** Produce a one-page summary listing framework-mandated vs. framework-optional conventions. Every architectural decision below must respect the mandatory constraints.

2. **Define Layer Boundaries and Dependency Topology** — Draw the directed graph of allowed import relationships. The cardinal rule: dependencies flow in one direction only (from outer layers toward inner core). Presentation imports orchestration, orchestration imports domain, domain imports nothing from infrastructure. Never the reverse. Document this as a visual dependency matrix before writing any code.

   **Checkpoint:** Verify no layer imports its caller. For each module, list exactly which other modules it depends on. A circular import chain indicates a violated boundary.

3. **Design Module Boundaries and Directory Structure** — Decide how to split the application into directories beyond what the framework requires. Apply these heuristics: (a) group by domain capability when business concepts are clearly separable (orders, payments, users); (b) group by technical layer when modules share infrastructure (all services in `services/`, all repositories in `repositories/`); (c) hybrid approach — most production systems use both. Each top-level directory should be a meaningful concern, not an implementation detail.

   **Checkpoint:** Walk through three representative user stories and verify each one touches only the expected modules. If a story requires jumping between unrelated directories, your boundaries need refinement.

4. **Place Extension Points at Layer Boundaries** — Identify where external or future code must hook into the system. Extension points belong at layer interfaces, not inside domain logic. In FastAPI: register custom middleware before routers. In Spring Boot: define `WebMvcConfigurer` beans and `ApplicationRunner` hooks. In Rails: use ActiveSupport::Concern modules that engines can include. Each extension point must have a clear input contract (what data it receives) and output contract (what it returns).

   **Checkpoint:** For each extension point, write the minimal "Hello World" plugin that implements it. If writing a test plugin requires understanding internal module state, the extension point is not at the right boundary.

5. **Design Data Flow Through the Architecture** — Map how data moves from external input to persistence and back. Every piece of data should pass through each layer exactly once, with type transformations happening at defined boundaries. In FastAPI: Pydantic model (request) → service method (domain DTO) → repository method (database row) → Pydantic model (response). Define the exact type at each boundary so layers can be independently tested.

   **Checkpoint:** Trace the data path for one create operation and one read operation end-to-end. Verify that no layer mutates data in a way that corrupts the contract expected by the next layer.

6. **Configure Hierarchy Design** — Establish the configuration loading order, type-safe validation at startup, and environment override semantics. Configuration must flow from: framework defaults → application defaults → environment-specific overrides → runtime flags. Validate all required configuration at bootstrap time and fail with a clear message listing every missing key.

   **Checkpoint:** Run the application with an empty environment (no config files, no env vars) and verify it fails fast with a list of required configuration keys. Then run with minimal valid config and verify it starts.

---

## Implementation Patterns

### Pattern 1: Layered Architecture Layout for FastAPI + Pydantic v2 + PostgreSQL

FastAPI encourages a specific directory layout that respects its async-first, dependency-injection paradigm. This pattern shows a production-grade structure for an order management system.

```
orders-api/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI app factory, middleware ordering
│   ├── config.py                  # Pydantic Settings with env var validation
│   ├── dependencies.py            # Framework DI providers (get_db, get_current_user)
│   │
│   ├── core/                      # Framework-agnostic domain logic
│   │   ├── __init__.py
│   │   ├── security.py            # Password hashing, JWT utilities
│   │   └── exceptions.py          # Domain-specific exception classes
│   │
│   ├── domain/                    # Business rules — zero framework imports
│   │   ├── __init__.py
│   │   ├── models.py              # Pydantic v2 schemas (request/response DTOs)
│   │   ├── repository.py          # Protocol interfaces for data access
│   │   └── services.py            # Use-case orchestration, pure business logic
│   │
│   ├── infrastructure/            # External system adapters
│   │   ├── __init__.py
│   │   ├── database.py            # SQLAlchemy async engine, session factory
│   │   ├── repositories/          # Concrete repository implementations
│   │   │   ├── order_repo.py
│   │   │   └── user_repo.py
│   │   └── external/              # Third-party client adapters
│   │       ├── payment_client.py  # Stripe, PayPal wrapper
│   │       └── email_client.py    # SendGrid, AWS SES wrapper
│   │
│   ├── api/                       # HTTP layer — thin routing only
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── router.py          # APIRouter with version prefix
│   │   │   └── endpoints/
│   │   │       ├── orders.py      # One file per resource domain
│   │   │       ├── users.py
│   │   │       └── health.py
│   │   └── middleware/            # Cross-cutting framework middleware
│   │       ├── auth.py
│   │       ├── logging.py
│   │       └── rate_limiting.py
│   │
│   └── extensions/                # Framework-level extension points for plugins
│       ├── __init__.py
│       ├── registry.py            # Plugin discovery and registration
│       └── hooks.py               # Lifecycle hook definitions
│
├── tests/
│   ├── unit/                      # Domain logic tests (no framework runtime)
│   ├── integration/               # API endpoint tests with test database
│   └── conftest.py                # Pytest fixtures, DI overrides
│
├── alembic/                       # Database migrations (if using SQLAlchemy)
├── pyproject.toml                 # Project configuration
├── Dockerfile
└── .env.example                   # Template for all required environment variables
```

**Dependency topology** (arrows = allowed imports, only downward):

```
api/v1/endpoints/ ──→ api/v1/router.py ──→ core/ ──→ domain/services.py
      │                                              │
      └──────→ api/middleware/  ──→ dependencies.py ──→ infrastructure/database.py
                                                      → infrastructure/repositories/
                                                      → infrastructure/external/
```

**Key rule:** `domain/` imports from NOTHING in `app/`. It only imports standard library and third-party packages. This makes it possible to test domain logic by instantiating service classes directly without any FastAPI runtime.

```python
# app/domain/models.py — Pure Pydantic v2 schemas, zero framework coupling
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class OrderCreate(BaseModel):
    """Schema for incoming order creation requests."""
    user_id: str = Field(..., min_length=1)
    items: list[OrderItem] = Field(..., min_length=1)
    shipping_address_id: str

    model_config = ConfigDict(frozen=True)


class OrderItem(BaseModel):
    sku: str = Field(..., pattern=r"^[A-Z]{2,4}-\d{4,8}$")
    quantity: int = Field(..., gt=0)
    unit_price_cents: int = Field(..., ge=0)


class OrderResponse(BaseModel):
    id: str
    user_id: str
    items: list[OrderItem]
    total_cents: int
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

### Pattern 2: Modular Monolith with Domain-Driven Boundaries

For complex applications where a single flat structure becomes unwieldy, group modules by bounded context (domain capability). This pattern works well for FastAPI, Django, and Rails projects that need clear team ownership boundaries while remaining a single deployable unit.

```
ecommerce-platform/
├── src/
│   ├── main.py              # App factory — wires all domain modules
│   │
│   ├── users/               # Bounded context: user management
│   │   ├── __init__.py
│   │   ├── routes.py        # HTTP endpoints for this context
│   │   ├── service.py       # Use-case orchestration
│   │   ├── repository.py    # Protocol interface (internal contract)
│   │   └── adapter.py       # Concrete DB/external client implementation
│   │
│   ├── orders/              # Bounded context: order lifecycle
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   └── adapter.py
│   │
│   ├── payments/            # Bounded context: payment processing
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── service.py
│   │   ├── repository.py
│   │   └── adapter.py
│   │
│   ├── shared/              # Cross-cutting utilities (shared across contexts)
│   │   ├── __init__.py
│   │   ├── auth.py          # Authentication middleware & guards
│   │   ├── errors.py        # Standardized error responses
│   │   └── events.py        # Domain event pub/sub (optional, for async comms)
│   │
│   └── config/              # Application configuration
│       ├── __init__.py
│       ├── base.py          # Base settings (Pydantic model or Spring @ConfigurationProperties)
│       ├── production.py    # Production overrides
│       └── testing.py       # Test overrides
│
├── tests/
│   ├── users/test_service.py
│   ├── orders/test_service.py
│   └── shared/test_auth.py
```

**Cross-context communication rule:** Contexts communicate through interfaces (protocols), never through direct module imports. This ensures that splitting a context into its own service later requires zero refactoring of the calling code.

```python
# src/orders/service.py — Domain service using Protocol, NOT direct import of payments
from __future__ import annotations

from typing import Protocol


class PaymentProcessor(Protocol):
    """Interface for processing payments. Defined in orders context but implemented by payments context."""
    def charge(self, amount_cents: int, currency: str) -> str: ...


class OrderService:
    """Order domain service — orchestrates use cases using injected protocols."""

    def __init__(self, payment_processor: PaymentProcessor) -> None:
        self._payments = payment_processor  # Protocol type, not concrete class

    async def create_order(self, user_id: str, items: list[dict]) -> str:
        if not items:
            raise ValueError("Order must contain at least one item")

        order_id = f"ord_{user_id}_{len(items)}"
        total = sum(item["qty"] * item["price_cents"] for item in items)

        # Domain logic — pure business rules
        if total > 500_000:  # $5,000 manual review threshold
            status = "pending_review"
        else:
            payment_ref = self._payments.charge(total, "USD")
            status = "confirmed"

        return order_id


# In main.py, the wiring happens at the application root — NOT inside any bounded context module.
def build_app() -> OrderService:
    from src.payments.adapter import StripePaymentAdapter  # Wiring lives ONLY in bootstrap code
    return OrderService(payment_processor=StripePaymentAdapter())
```

### Pattern 3: Extension Point Placement Strategy (BAD vs. GOOD)

Where you place extension points determines how easy it is for plugin authors to extend the system without modifying core code. The critical rule: extension interfaces live at layer boundaries, and their implementations are injected from outside.

```python
# ❌ BAD — Extension hook buried deep inside domain logic, requires understanding internals
class OrderProcessor:
    def process(self, order_id: str) -> dict:
        # ... 50 lines of business logic ...
        
        # This extension point leaks internal state and requires the plugin
        # to know about private methods like _validate_tax_calculation()
        if hasattr(self, '_custom_tax_calculator'):
            custom_result = self._custom_tax_calculator(order_id)
            self.tax_override = custom_result
        
        # More business logic that depends on whether a plugin modified state...
        total = self._calculate_total(order_id)
        
        return {"order": order_id, "total": total, "tax_overridden": True}


# ✅ GOOD — Extension point at the layer boundary with explicit contract
from typing import Protocol, Any

class TaxCalculator(Protocol):
    """Plugin interface for custom tax calculations.
    
    Plugin authors implement this protocol and register it during bootstrap.
    They receive clean inputs and return typed outputs — zero knowledge of
    internal OrderProcessor state is required.
    """
    def calculate_tax(self, order_id: str, base_amount_cents: int) -> int:
        """Return tax amount in cents for the given order.
        
        Args:
            order_id: The order identifier
            base_amount_cents: The pre-tax total in cents
        
        Returns:
            Tax amount in cents (0 = no tax)
        """
        ...


class OrderProcessor:
    """Domain service with clean extension point via protocol injection."""

    def __init__(self, tax_calculator: TaxCalculator | None = None) -> None:
        # Default behavior: standard flat-rate tax
        self._tax_calculator = tax_calculator or FlatRateTaxCalculator(rate=0.08)

    def process(self, order_id: str, base_amount_cents: int) -> dict:
        if base_amount_cents <= 0:
            raise ValueError("Base amount must be positive")

        # Extension point: plugin-provided tax calculation
        tax = self._tax_calculator.calculate_tax(order_id, base_amount_cents)
        total = base_amount_cents + tax

        return {"order": order_id, "total": total, "tax": tax}


class FlatRateTaxCalculator:
    """Default tax calculator — used when no plugin is registered."""

    def __init__(self, rate: float = 0.08) -> None:
        self._rate = rate

    def calculate_tax(self, order_id: str, base_amount_cents: int) -> int:
        return int(base_amount_cents * self._rate)


# Registration at bootstrap — extension lives entirely outside the domain module
def register_extension(app_config: dict) -> None:
    """Called once at application startup to wire in optional extensions."""
    if app_config.get("enable_custom_tax"):
        order_processor = OrderProcessor(
            tax_calculator=CachedTaxCalculator()  # Third-party implementation
        )
    else:
        order_processor = OrderProcessor()  # Uses FlatRateTaxCalculator default
```

### Pattern 4: Configuration Hierarchy for Multi-Environment Deployment

Configuration must follow a strict override hierarchy with type-safe validation. This pattern uses Pydantic Settings for Python/FastAPI, but the principles apply equally to Spring Boot's `@ConfigurationProperties`, Rails' `config/application.yml` + environment variables, and Next.js's `next.config.js` with env vars.

```python
# app/config.py — Type-safe configuration with layered overrides
from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class DatabaseConfig(BaseModel):
    """Database connection settings with validation."""
    host: str = Field(default="localhost", description="PostgreSQL host")
    port: int = Field(default=5432, ge=1, le=65535)
    name: str = Field(default="app_db")
    user: str = Field(default="postgres")
    password: str = Field(default="")
    pool_size: int = Field(default=10, ge=1, le=100)
    max_overflow: int = Field(default=20, ge=0)

    @property
    def url(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.name}"


class CacheConfig(BaseModel):
    """Redis cache settings."""
    host: str = Field(default="localhost")
    port: int = Field(default=6379, ge=1, le=65535)
    db: int = Field(default=0, ge=0, le=15)
    ttl_seconds: int = Field(default=300, ge=1, le=86400)


class APIConfig(BaseModel):
    """Application API settings."""
    debug: bool = Field(default=False)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = Field(default="INFO")
    allowed_hosts: list[str] = Field(default=["localhost"])
    cors_origins: list[str] = Field(default=["http://localhost:3000"])


class Settings(BaseSettings):
    """Top-level application settings — validates ALL required config at import time.
    
    Load order (lowest to highest priority):
      1. Framework defaults (hardcoded in Field defaults)
      2. Application defaults (pydantic model defaults)
      3. .env file (automatically loaded by pydantic-settings)
      4. Environment variables (override .env values)
      5. Command-line arguments (if configured via SettingsConfig)
    """
    database: DatabaseConfig = Field(default_factory=DatabaseConfig)
    cache: CacheConfig = Field(default_factory=CacheConfig)
    api: APIConfig = Field(default_factory=APIConfig)

    # Required per-environment settings — must fail fast if missing
    environment: Literal["development", "staging", "production"] = "development"
    secret_key: str = Field(default="")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="forbid",  # Unknown config keys cause startup failure
    )

    @field_validator("secret_key")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        if not v or len(v) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters. "
                "Generate one with: openssl rand -hex 32"
            )
        return v

    @field_validator("database")
    @classmethod
    def validate_database_connection(cls, v: DatabaseConfig) -> DatabaseConfig:
        if cls.environment == "production" and not v.password:
            raise ValueError("DATABASE password is required in production")
        return v


# Bootstrap validation — fails before any request is served
def get_settings() -> Settings:
    """Load and validate all configuration. Raises on any missing/invalid key."""
    try:
        return Settings()  # type: ignore[call-arg]
    except Exception as exc:
        raise RuntimeError(
            f"Configuration validation failed — application cannot start:\n{exc}"
        ) from exc


# Usage in main.py
settings = get_settings()  # Raises immediately if config is invalid

app = FastAPI(
    title="Orders API",
    debug=settings.api.debug,
)

# Database engine uses validated settings
from sqlalchemy.ext.asyncio import create_async_engine
engine = create_async_engine(settings.database.url, pool_size=settings.database.pool_size)
```

### Pattern 5: Data Flow Design Through Layered Architecture

Define explicit type contracts at every layer boundary so that data transformations happen in one place and layers can be independently tested with deterministic inputs.

```python
# app/domain/models.py — Request DTO (comes from HTTP, goes to service)
from pydantic import BaseModel, Field


class CreateOrderRequest(BaseModel):
    """Validated request from API layer."""
    user_id: str = Field(min_length=1)
    items: list[OrderItemRequest]
    shipping_address: AddressSchema

    def validate_total(self) -> int:
        """Calculate and validate order total at the domain boundary."""
        total = sum(item.quantity * item.unit_price_cents for item in self.items)
        if total <= 0:
            raise ValueError("Order total must be positive")
        return total


class OrderItemRequest(BaseModel):
    sku: str = Field(pattern=r"^[A-Z]{2,4}-\d{4,8}$")
    quantity: int = Field(gt=0)
    unit_price_cents: int = Field(ge=0)


class AddressSchema(BaseModel):
    street: str
    city: str
    state: str
    zip_code: str = Field(pattern=r"^\d{5}(-\d{4})?$")


# app/domain/models.py — Domain entity (internal representation, no Pydantic needed)
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class OrderStatus(Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


@dataclass(frozen=True)
class OrderItem:
    sku: str
    quantity: int
    unit_price_cents: int

    @property
    def line_total_cents(self) -> int:
        return self.quantity * self.unit_price_cents


@dataclass(frozen=True)
class DomainOrder:
    """Immutable domain entity representing an order in the business layer."""
    id: str
    user_id: str
    items: tuple[OrderItem, ...]
    address: AddressSchema
    status: OrderStatus = field(default=OrderStatus.PENDING)
    created_at: datetime = field(default_factory=datetime.utcnow)

    @property
    def total_cents(self) -> int:
        return sum(item.line_total_cents for item in self.items)


# app/domain/services.py — Service method transforms DTO → Domain Entity
from app.domain.models import CreateOrderRequest, DomainOrder, OrderItem, OrderStatus
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.domain.repository import OrderRepository  # Protocol, not concrete


class OrderService:
    """Orchestrates order creation using typed boundaries between layers."""

    def __init__(self, repository: "OrderRepository") -> None:
        self._repo = repository

    async def create_order(self, request: CreateOrderRequest) -> DomainOrder:
        # Layer boundary: DTO → Domain Entity conversion happens in the service
        items = tuple(
            OrderItem(sku=item.sku, quantity=item.quantity, unit_price_cents=item.unit_price_cents)
            for item in request.items
        )

        domain_order = DomainOrder(
            id=f"ord_{request.user_id}_{len(items)}",
            user_id=request.user_id,
            items=items,
            address=request.address,
        )

        # Persist via repository protocol — no knowledge of database implementation
        await self._repo.save(domain_order)
        return domain_order

    async def get_order(self, order_id: str) -> DomainOrder | None:
        """Read path: database row → Domain Entity → returned to caller."""
        return await self._repo.find_by_id(order_id)


# app/api/v1/endpoints/orders.py — API layer: thin routing, no business logic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/", status_code=201)
async def create_order(
    request: CreateOrderRequest,
    service: OrderService = Depends(get_order_service),  # Injected via FastAPI DI
) -> dict:
    """Create a new order. Request enters at the API layer as a Pydantic model."""
    try:
        order = await service.create_order(request)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Response boundary: Domain Entity → response DTO
    return {
        "id": order.id,
        "total_cents": order.total_cents,
        "status": order.status.value,
        "item_count": len(order.items),
    }


@router.get("/{order_id}")
async def get_order(
    order_id: str,
    service: OrderService = Depends(get_order_service),
) -> dict:
    """Get order by ID."""
    order = await service.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "id": order.id,
        "user_id": order.user_id,
        "total_cents": order.total_cents,
        "status": order.status.value,
    }
```

---

## Constraints

### MUST DO
- Draw a dependency topology diagram (ASCII or markdown table) showing which layers may import from which before writing any code — unidirectional flow only (following `code-philosophy`'s Law of Natural Data Flow: data flows down, never up)
- Place every extension point at a layer boundary with an explicit protocol/interface contract that describes inputs and outputs without exposing internal state
- Design each top-level directory as a meaningful concern (domain capability, technical layer, or bounded context) — never name directories after implementation details like "utils" or "helpers"
- Validate ALL configuration at application bootstrap time with type-safe models — fail fast with a complete list of missing keys rather than silent defaults
- Ensure every module is independently testable by mocking only its direct injected dependencies — if testing a service requires starting the full HTTP server, your boundaries are wrong
- Document the data flow for one create and one read operation end-to-end, showing the exact type at each layer boundary

### MUST NOT DO
- Allow inner layers (domain/core) to import from outer layers (api/infrastructure) — this creates circular dependencies and makes testing impossible without framework runtime
- Place extension points as private methods on internal classes — plugins must interact through public protocol interfaces, not by understanding implementation details
- Use a single "services/" directory containing every service class — if the directory has more than 10 files, split it into domain-capability groups
- Load configuration lazily or with magic strings — every required setting must be validated at startup, not accessed via `os.environ.get()` scattered across modules
- Let API handlers contain business logic (validation rules, calculations, state transitions) — routes should be thin entry points that delegate to domain services immediately

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-driven-design` | Once the architecture is designed, use this skill for IoC/DI implementation, lifecycle hooks, and convention-driven behavior within your chosen framework |
| `composition-root` | The composition root pattern implements the dependency wiring at the bootstrap point defined by your architectural design |
| `microservices-architecture` | When a bounded context grows large enough to justify its own service, this skill guides system-level decomposition above the module level |
| `hexagonal-architecture` | Provides the ports-and-adapters theoretical foundation that informed-by-layered architectures follow in practice |
| `domain-driven-strategic` | Helps define the bounded contexts and domain events that drive module boundaries in complex systems |

---

## Live References

> Authoritative documentation links for framework architecture design patterns.

- [FastAPI Project Structure Guidelines](https://fastapi.tiangolo.com/tutorial/bigger-applications/)
- [Python Module Organization Best Practices](https://docs.python-guide.org/writing/structure/)
- [Hexagonal Architecture (Ports & Adapters)](https://alistair.cockburn.uk/hexagonal-architecture/)
- [Clean Architecture — Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Spring Boot Project Structure Conventions](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.build-system.projects)
- [Django Application Architecture — Modular Design](https://docs.djangoproject.com/en/5.1/topics/settings/)
- [Next.js App Router Directory Structure](https://nextjs.org/docs/app/building-your-application/routing)
