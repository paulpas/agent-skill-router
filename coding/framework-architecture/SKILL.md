---
name: framework-architecture
description: Designs framework core architecture using microkernel, hexagonal ports/adapters, dependency injection, and lifecycle management patterns from modern frameworks like FastAPI, NestJS, and Pydantic v2.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework architecture, microkernel pattern, hexagonal architecture, dependency injection, lifecycle management, framework design patterns, plugin system design, configuration systems
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-extensibility, framework-anti-patterns
  anti_triggers: simple script, one-off application, CRUD app, tutorial, learning exercise
  archetypes:
    - strategic
    - tactical
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Framework Architecture Design

Designs robust framework cores using microkernel, hexagonal ports/adapters, dependency injection, and lifecycle management patterns — the same principles that power FastAPI, NestJS, Pydantic v2, and Hono.js.

## TL;DR Checklist

- [ ] Define extension points upfront: hooks, middleware, plugins, interceptors
- [ ] Keep framework core minimal — defer business logic to extensions
- [ ] Use type hints or decorators as first-class API contracts (no manual wiring)
- [ ] Implement async-first lifecycle with explicit startup/shutdown boundaries
- [ ] Enforce configuration via typed settings models with resolution ordering

---

## When to Use

- Building a new application framework or library that others will extend
- Refactoring a monolithic application into a modular, extensible architecture
- Designing internal platform frameworks for team-wide adoption
- Evaluating whether an existing framework's design decisions align with project needs

## When NOT to Use

- For simple scripts or one-off applications (over-engineering)
- When the framework will have fewer than 3 extension points (keep it flat)
- When team lacks familiarity with async patterns and composition over inheritance

---

## Core Workflow

1. **Define Extension Point Contracts** — Specify exactly four types of extension points the framework exposes: hooks (lifecycle callbacks), middleware (request/response chains), plugins/modules (self-contained feature bundles), and interceptors/filters (cross-cutting concerns). **Checkpoint:** Each contract must be independently testable without the full framework running.

2. **Choose Core Architecture Pattern** — Apply one of three proven patterns based on your needs:
   - **Microkernel** for plugin-heavy frameworks (FastAPI Router pattern) — core knows nothing about business logic, only routing contracts
   - **Hexagonal/Ports & Adapters** for domain-driven frameworks (Pydantic validation pipeline pattern) — inward dependency direction through explicit port declarations
   - **Decorator-based** for metadata-driven frameworks (NestJS Module pattern) — compile-time transforms enforce strict scoping
   
   **Checkpoint:** The core must remain functional with zero plugins installed.

3. **Implement Dependency Injection** — Select one of three modern DI patterns:
   - Decorator-based DI via type hints (`Depends()` in FastAPI) — zero runtime overhead for unused dependencies
   - Metadata-based DI via compiler transforms (NestJS `@Injectable()`) — strict module-scoped provider graphs
   - Constructor injection with generic adapters (Pydantic v2 `TypeAdapter`) — no global registry, purely composable
   
   **Checkpoint:** Dependencies flow through explicit parameters or decorators — no globals, no hidden state.

4. **Build Lifecycle Management** — Use an event-driven lifecycle pattern instead of imperative startup:
   ```python
   from contextlib import asynccontextmanager
   
   @asynccontextmanager
   async def framework_lifespan(app):
       # Startup: allocate resources
       db_pool = await create_connection_pool()
       cache = await connect_cache()
       app.state.db = db_pool
       app.state.cache = cache
       
       yield  # Framework runs here, serving requests
       
       # Shutdown: release resources in reverse order
       await cache.disconnect()
       await db_pool.close()
   ```
   
   **Checkpoint:** Each lifecycle event handler is independently testable — mock the event, not the entire system.

5. **Configure Typed Settings** — Use a pydantic-style settings model with explicit resolution ordering (defaults → config file → environment variables → CLI overrides):
   ```python
   from pydantic_settings import BaseSettings, SettingsConfigDict
   
   class FrameworkSettings(BaseSettings):
       host: str = "127.0.0.1"
       port: int = 8000
       debug: bool = False
       log_level: str = "INFO"
       
       model_config = SettingsConfigDict(
           env_prefix="MY_FRAMEWORK_",
           env_file=".env",
           case_sensitive=False,
       )
   ```
   
   **Checkpoint:** All configuration is validated at load time — invalid values fail fast with clear error messages.

---

## Architecture Patterns Reference Guide

### Pattern 1: Microkernel Core (FastAPI/Router Style)

The microkernel pattern separates the minimal framework core from pluggable extensions. The kernel handles only lifecycle, service discovery, and plugin contract enforcement — it knows nothing about business logic.

```python
"""Minimal microkernel — the foundation of a FastAPI-like framework."""

from typing import Callable, Any, Awaitable
from dataclasses import dataclass, field


@dataclass
class RequestContext:
    """Immutable context passed through the framework lifecycle."""
    method: str
    path: str
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes = b""
    state: dict[str, Any] = field(default_factory=dict)


@dataclass
class Response:
    """Framework response envelope."""
    status_code: int = 200
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes = b""


class Microkernel:
    """Minimal core — no routes, no middleware by default.
    
    Extensions attach via decorators (non-invasive).
    The kernel manages route registration, lifecycle events, and request dispatch.
    """
    
    def __init__(self):
        self._routes: list[tuple[str, str, Callable]] = []  # (method, path, handler)
        self._middleware: list[Callable] = []
        self._startup_handlers: list[Callable] = []
        self._shutdown_handlers: list[Callable] = []
    
    def route(self, method: str, path: str):
        """Register a route — returns decorator that attaches handler."""
        def decorator(fn: Callable) -> Callable:
            self._routes.append((method.upper(), path, fn))
            return fn
        return decorator
    
    def use_middleware(self, middleware_fn: Callable) -> None:
        """Add middleware to the request/response chain."""
        self._middleware.append(middleware_fn)
    
    async def startup(self) -> None:
        """Execute all registered startup handlers."""
        for handler in self._startup_handlers:
            if callable(handler):
                result = handler()
                if hasattr(result, '__await__'):
                    await result
    
    async def shutdown(self) -> None:
        """Execute all registered shutdown handlers (in reverse order)."""
        for handler in reversed(self._shutdown_handlers):
            if callable(handler):
                result = handler()
                if hasattr(result, '__await__'):
                    await result


# === Usage Example ===

app = Microkernel()


@app.route("GET", "/health")
async def health_check(ctx: RequestContext) -> Response:
    return Response(status_code=200, body=b'{"status": "ok"}')


@app.route("POST", "/data")
async def create_data(ctx: RequestContext) -> Response:
    # Business logic goes in handlers, NOT in the kernel
    parsed = ctx.body  # Would be decoded by middleware
    return Response(status_code=201, body=b'{"id": "new"}')


# Extensions attach non-invasively via decorators
async def init_resources():
    print("Framework starting up...")

app._startup_handlers.append(init_resources)
```

### Pattern 2: Hexagonal Ports & Adapters (Pydantic Validation Style)

Enforce inward dependency direction through explicit port declarations. The framework defines ports (interfaces), and adapters (implementations) live on the boundary.

```python
"""Hexagonal architecture applied to a validation pipeline."""

from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar
from dataclasses import dataclass

T = TypeVar("T")


# === PORT: Define the interface ===

class ValidatorPort(ABC, Generic[T]):
    """Abstract port — all validators must implement this contract."""
    
    @abstractmethod
    def validate(self, data: Any) -> T:
        """Validate and coerce data. Raises ValueError on failure."""
        ...


# === ADAPTER: Concrete implementations ===

class EmailValidator(ValidatorPort[str]):
    """Adapter: validates email format with type coercion."""
    
    def validate(self, data: Any) -> str:
        value = str(data).strip().lower()
        if '@' not in value or '.' not in value.split('@')[-1]:
            raise ValueError(f"Invalid email: {data!r}")
        return value


class PositiveIntValidator(ValidatorPort[int]):
    """Adapter: validates integer is positive."""
    
    def validate(self, data: Any) -> int:
        value = int(data)
        if value <= 0:
            raise ValueError(f"Expected positive int, got {value}")
        return value


# === PORT: Pipeline interface ===

class ValidationPipeline(ABC):
    """Abstract pipeline port — applies validators in sequence."""
    
    @abstractmethod
    def add_validator(self, validator: ValidatorPort) -> None: ...
    
    @abstractmethod
    def execute(self, data: Any) -> Any: ...


# === ADAPTER: Concrete pipeline ===

class FieldValidationPipeline(ValidationPipeline):
    """Concrete pipeline that applies validators field by field."""
    
    def __init__(self):
        self._validators: dict[str, ValidatorPort] = {}
    
    def add_validator(self, field_name: str, validator: ValidatorPort) -> None:
        self._validators[field_name] = validator
    
    def execute(self, data: dict[str, Any]) -> dict[str, Any]:
        """Validate all declared fields. Fails fast on first error."""
        result = {}
        for field_name, validator in self._validators.items():
            if field_name not in data:
                continue  # Optional field — skip
            result[field_name] = validator.validate(data[field_name])
        return result


# === Usage: Domain logic uses ports, never concrete adapters ===

pipeline = FieldValidationPipeline()
pipeline.add_validator("email", EmailValidator())
pipeline.add_validator("age", PositiveIntValidator())

result = pipeline.execute({"email": "  User@Example.COM  ", "age": 25})
# Result: {"email": "user@example.com", "age": 25}
```

### Pattern 3: Decorator-Based DI (FastAPI Depends Style)

Type-hint driven dependency injection with zero overhead — only instantiates what each handler actually needs.

```python
"""Dependency injection via type hints — no global registry needed."""

import inspect
from typing import Any, Callable, get_type_hints


class DependencyInjector:
    """Resolves dependencies from type hints on handler signatures.
    
    Decorator-based DI is the most lightweight modern pattern:
    - No framework registry or container to manage
    - Dependencies are explicit in the function signature
    - Type hints serve as both documentation and contract
    """
    
    def __init__(self):
        self._providers: dict[type, Callable] = {}
    
    def register(self, dependency_type: type, factory: Callable) -> None:
        """Register a factory for a given type."""
        self._providers[dependency_type] = factory
    
    def resolve(self, fn: Callable) -> dict[str, Any]:
        """Resolve all type-hinted dependencies for a handler.
        
        Returns a dict mapping parameter names to resolved instances.
        Only instantiates what the handler declares — no wasted work.
        """
        hints = get_type_hints(fn)
        resolved = {}
        
        sig = inspect.signature(fn)
        for param_name, param in sig.parameters.items():
            if param.annotation in self._providers:
                factory = self._providers[param.annotation]
                
                # Recursively resolve factory's own dependencies
                if factory is not None:
                    resolved[param_name] = factory()
        
        return resolved


# === Usage Example ===

di = DependencyInjector()


class DatabaseConnection:
    """Represents a database connection — registered as a provider."""
    
    def __init__(self):
        self.connected = True
        print("  → DatabaseConnection created")


class CacheClient:
    """Represents a cache client."""
    
    def __init__(self):
        self.connected = True
        print("  → CacheClient created")


# Register providers
di.register(DatabaseConnection, lambda: DatabaseConnection())
di.register(CacheClient, lambda: CacheClient())


# Handler declares dependencies via type hints — DI framework resolves them
async def get_user(
    user_id: int,
    db: DatabaseConnection,    # ← resolved automatically
    cache: CacheClient,        # ← resolved automatically
) -> dict:
    """This handler only gets the dependencies it needs."""
    if not db.connected or not cache.connected:
        raise RuntimeError("Dependencies not initialized")
    return {"id": user_id, "name": "Alice"}


# Resolve at runtime
deps = di.resolve(get_user)
print(deps)  # {'db': DatabaseConnection(...), 'cache': CacheClient(...)}
```

---

## Anti-Patterns to Avoid

### ❌ God Object Anti-Pattern

Never let a single class or function handle routing, validation, business logic, and I/O:

```python
# BAD: Everything in one view — framework enforces no separation
def handle_request(request):
    if not request.json.get('name'):         # Validation
        return error("missing name")
    user = find_user(request.json['name'])   # Business logic
    db.save(user)                            # I/O
    return jsonify({"id": user.id})          # Formatting

# GOOD: Framework enforces separation of concerns at every layer
@router.post("/users")
async def create_user(
    payload: UserCreateDTO = Body(...),     # Validation via DTO
    db: AsyncSession = Depends(get_db)      # DI for I/O
):
    user = await business_logic.create_user(db, payload)  # Pure domain logic
    return UserResponse.model_validate(user)              # Response formatting
```

### ❌ Hidden State Anti-Pattern

Never store mutable state in globals or singletons that cannot be tested in isolation:

```python
# BAD: Global mutable state — can't mock, can't test concurrently
_db_pool = None  # Fragile singleton

def get_db():
    global _db_pool
    if _db_pool is None:          # Lazy initialization is a hidden side effect
        _db_pool = create_pool()  # Side effect on first call
    return _db_pool

# GOOD: Stateless factory — explicit source, no hidden state
def create_db_pool(dsn: str, pool_size: int) -> Pool:  # Pure function
    return asyncpg.create_pool(dsn=dsn, min_size=1, max_size=pool_size)
```

### ❌ Over-Configuration Anti-Pattern

Never require dozens of config options to do basic operations:

```python
# BAD: 50+ lines of boilerplate for a simple server
config = {
    'debug': False, 'log_level': 'WARNING', 'host': '0.0.0.0',
    'port': 8000, 'workers': 4, 'timeout_keep_alive': 65,
    'access_log': False, # ... 30 more options users never touch
}

# GOOD: Convention over configuration — explicit only when needed
app = FastAPI(title="My API")  # Works immediately
app.add_middleware(CORSMiddleware, allow_origins=["https://myapp.com"])
```

---

## Constraints

### MUST DO
- Keep framework core under 200 lines of code (excluding tests and examples)
- Make every extension point independently testable — no integration required
- Use type hints or decorators as the primary API contract mechanism
- Implement async-first lifecycle with explicit startup/shutdown boundaries
- Validate all configuration at load time — fail fast with clear error messages

### MUST NOT DO
- Store mutable state in global variables or module-level singletons
- Force users to subclass framework classes for basic extension (use composition/decorators)
- Require more than 3 config values to get a minimal working setup
- Block synchronous code paths — always provide `asyncio.run_in_executor` fallbacks
- Let business logic leak into the framework core or middleware chain

---

## Live References

> Authoritative documentation links for framework design patterns.

- [FastAPI Documentation](https://fastapi.tiangolo.com/) — Microkernel + DI patterns
- [Pydantic v2 Documentation](https://docs.pydantic.dev/latest/) — Validation pipeline architecture
- [NestJS Architecture Guide](https://docs.nestjs.com/fundamentals/module) — Decorator-based DI and module graphs
- [Hono.js GitHub](https://github.com/honojs/hono) — Zero-dependency micro-framework patterns
- [Clean Architecture by Robert Martin](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164) — Hexagonal architecture origins
- [Dependency Injection Principles](https://martinfowler.com/articles/injection.html) — DI patterns comparison
