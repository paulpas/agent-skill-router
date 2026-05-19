---
name: framework-utilization
description: Integrates selected frameworks into applications using dependency injection, configuration management, extension mechanisms, lifecycle management, and testable architecture patterns to minimize coupling and maximize maintainability.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework integration, dependency injection, middleware patterns, framework hooks, plugin architecture, framework lifecycle, framework configuration, extension points, framework testing, decouple framework, framework coupling, wire dependencies
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, examples, do-dont]
  related-skills: framework-selection, hexagonal-architecture, pydantic-config, software-design-principles
---

# Framework Integration Patterns

Integrates selected frameworks into applications using dependency injection, configuration management, extension mechanisms, lifecycle management, and testable architecture patterns. This skill minimizes framework coupling while maximizing the benefits of the chosen framework's ecosystem.

## TL;DR Checklist

- [ ] Apply dependency injection to decouple domain logic from framework internals
- [ ] Implement layered configuration with environment overrides and secret management
- [ ] Design extension points (middleware, hooks, plugins) for custom behavior
- [ ] Define explicit lifecycle: startup initialization, graceful shutdown, health checks
- [ ] Write tests using test doubles — no business logic should import framework internals directly
- [ ] Validate integration path before committing to framework-specific patterns

---

## When to Use

- Integrating a newly selected framework into an existing codebase or greenfield project
- Reducing coupling between domain logic and framework-specific APIs
- Designing middleware pipelines, plugin systems, or hook-based extension architectures
- Implementing configuration management for multi-environment deployments (dev, staging, prod)
- Setting up lifecycle management: startup validation, graceful shutdown, health endpoints
- Refactoring legacy code to reduce direct imports of framework classes

## When NOT to Use

- When the framework is simple enough that injection adds unnecessary complexity (use straightforward imports)
- For one-off scripts or throwaway prototypes where maintainability over years is not a concern
- When a framework's native patterns are simpler than an abstraction layer (e.g., Flask's route decorators for small APIs)

---

## Core Workflow

### Step 1: Design Dependency Injection Topology

Before writing integration code, map out which components depend on the framework and which represent pure domain logic. Identify injection points where framework-provided services (database connections, HTTP clients, cache layers) need to be supplied to domain services.

**Key principles:**
- Domain services should never import framework-specific classes directly
- Use Protocol (Python), interfaces (TypeScript), or abstract base classes as the contract between layers
- Framework adapters implement these contracts and are wired at composition root
- Prefer constructor injection over setter injection for required dependencies

**Checkpoint:** Every domain service should be instantiable in unit tests without any framework import. If a test needs to start the web server or import `app`, the dependency boundaries are wrong.

### Step 2: Implement Configuration Management Layer

Framework configuration often varies across environments (dev, staging, production). Create a layered configuration system that resolves values from multiple sources with well-defined precedence.

**Configuration precedence (highest wins):**
1. Process environment variables (e.g., `DATABASE_URL`)
2. File-based config per environment (e.g., `config/dev.yaml`, `config/prod.yaml`)
3. Default configuration values baked into the application
4. Framework defaults (only as last resort — explicitly override to confirm)

For sensitive values (API keys, database passwords), use a secret manager (AWS Secrets Manager, HashiCorp Vault, Kubernetes secrets) injected at runtime rather than stored in config files.

**Checkpoint:** Running the application without environment-specific config files should succeed with defaults but emit warnings for production-required settings. Never fail silently with missing credentials.

### Step 3: Define Extension Mechanisms

Frameworks provide extension points (middleware, hooks, event listeners, plugins). Design these to be framework-agnostic at the domain level by defining your own extension contracts that the framework-specific adapter implements.

**Extension patterns to consider:**
- **Middleware pipeline** — Intercepts requests/responses for cross-cutting concerns (auth, logging, rate limiting)
- **Hook system** — Allows third-party code to inject behavior at specific lifecycle events (e.g., before/after save, on-event)
- **Plugin registry** — Service discovery pattern where plugins register themselves and declare their capabilities
- **Strategy pattern** — Swappable algorithms for domain operations without framework coupling

**Checkpoint:** Each extension point should have a documented interface. External contributors must know how to implement the contract without reading framework source code.

### Step 4: Implement Lifecycle Management

Define explicit startup, runtime, and shutdown phases for framework integration. Proper lifecycle management prevents resource leaks, ensures clean initialization order, and enables graceful degradation.

**Startup phase responsibilities:**
- Validate all configuration (required keys present, types correct)
- Initialize external connections (database pools, cache clients, message queues)
- Register route handlers or event listeners with the framework
- Run database migrations or schema validation if applicable
- Start health check probes and readiness indicators

**Shutdown phase responsibilities:**
- Stop accepting new requests (graceful drain period)
- Flush pending operations (log buffers, message queue consumers, cache writes)
- Close all external connections cleanly
- Release resources (file handles, network connections, memory)

**Checkpoint:** Test shutdown by sending SIGTERM during active request processing. Verify the application completes in-flight requests before exiting, with no data loss or connection errors.

### Step 5: Design Testing Strategy for Framework-Bound Code

Framework code is notoriously hard to test because it requires booting the full framework (database, web server, etc.). Structure your code so that framework-dependent tests are separate from pure unit tests.

**Testing pyramid for framework integration:**
1. **Unit tests (70-80%)** — Test domain logic in isolation using mocked framework interfaces. No framework imports allowed.
2. **Integration tests (15-25%)** — Test framework-specific adapters against a real or in-memory framework instance. Use test containers for databases.
3. **E2E tests (1-5%)** — Full request/response cycles through the web framework with real routing and serialization.

**Key patterns:**
- Use factory functions to create framework instances per test (avoid singleton pollution between tests)
- Mock only at framework boundaries — never mock domain logic
- Use fixtures or parameterized tests for testing multiple configuration scenarios
- Test error paths: network failures, validation errors, authentication failures

### Step 6: Validate Integration Path

Before committing to deep framework integration, validate that the abstraction design holds up against real usage patterns. Build a minimal spike that exercises the full integration path: configuration → startup → request handling → business logic → response serialization → shutdown.

**Validation checklist:**
- Domain logic is testable without starting any framework component
- Configuration changes take effect without code redeployment (hot reload for config only)
- Middleware/hook extension points work with third-party implementations
- Health check endpoint returns accurate status (dependencies up/down)
- Graceful shutdown completes within a bounded time window (< 30 seconds typical)

**Checkpoint:** If the validation spike requires modifying framework internals or bypassing normal abstractions, the design needs revision before production integration.

---

## Implementation Patterns

### Pattern 1: Dependency Injection with Composition Root

This pattern implements a composition root that wires dependencies together at application startup. Domain services receive their dependencies through constructors, enabling testability and framework decoupling.

```python
from dataclasses import dataclass, field
from typing import Protocol, runtime_checkable


# ── Domain Contracts (no framework imports) ──────────────────────

@runtime_checkable
class UserRepository(Protocol):
    """Domain contract for user persistence — independent of any ORM or framework."""
    async def get_by_id(self, user_id: str) -> dict | None: ...
    async def create(self, data: dict) -> str: ...
    async def update(self, user_id: str, fields: dict) -> bool: ...


@runtime_checkable
class EmailService(Protocol):
    """Domain contract for notification delivery — independent of any email provider."""
    async def send_welcome_email(self, to: str, username: str) -> None: ...
    async def send_password_reset(self, to: str, reset_token: str) -> None: ...


@dataclass
class UserService:
    """Pure domain service — no framework imports, fully testable."""
    user_repo: UserRepository
    email_service: EmailService

    async def register_user(self, username: str, email: str) -> dict:
        """Register a new user with validation and welcome notification."""
        if not username or len(username) < 3:
            raise ValueError(f"Username must be at least 3 characters, got '{username}'")

        user_id = await self.user_repo.create({"username": username, "email": email})
        await self.email_service.send_welcome_email(email, username)
        return {"id": user_id, "username": username}


# ── Framework Adapters (import frameworks here) ──────────────────

class SQLAlchemyUserRepository:
    """Adapter: implements UserRepository using SQLAlchemy ORM."""
    from sqlalchemy.ext.asyncio import AsyncSession  # framework import contained in adapter

    def __init__(self, session_factory):
        self._session_factory = session_factory

    async def get_by_id(self, user_id: str) -> dict | None:
        from myapp.models import User  # framework model import contained in adapter
        async with self._session_factory() as session:
            user = await session.get(User, user_id)
            return user.to_dict() if user else None

    async def create(self, data: dict) -> str:
        from myapp.models import User
        async with self._session_factory() as session:
            user = User(username=data["username"], email=data["email"])
            session.add(user)
            await session.commit()
            return user.id

    async def update(self, user_id: str, fields: dict) -> bool:
        from myapp.models import User
        async with self._session_factory() as session:
            user = await session.get(User, user_id)
            if not user:
                return False
            for key, value in fields.items():
                setattr(user, key, value)
            await session.commit()
            return True


class SendGridEmailService:
    """Adapter: implements EmailService using SendGrid API."""

    def __init__(self, api_key: str, from_address: str):
        self._from = from_address  # framework client initialized here
        import sendgrid
        from sendgrid.helpers.mail import Mail
        self._client = sendgrid.SendGridAPIClient(api_key)
        self._Mail = Mail

    async def send_welcome_email(self, to: str, username: str) -> None:
        message = self._Mail(
            from_email=self._from,
            to_emails=to,
            subject="Welcome!",
            html_content=f"<p>Welcome, {username}!</p>",
        )
        await self._client.send(message)

    async def send_password_reset(self, to: str, reset_token: str) -> None:
        message = self._Mail(
            from_email=self._from,
            to_emails=to,
            subject="Password Reset",
            html_content=f'<a href="https://app.example.com/reset/{reset_token}">Reset password</a>',
        )
        await self._client.send(message)


# ── Composition Root — wires everything together at startup ─────

@dataclass
class AppDependencies:
    """Composition root: creates all concrete dependencies and injects them."""
    user_service: UserService
    email_service: EmailService
    user_repo: UserRepository


def create_dependencies(config: dict) -> AppDependencies:
    """Factory function that wires the full dependency graph."""

    # Framework-specific initialization (only happens once at startup)
    session_factory = init_sqlalchemy_session_pool(config["database_url"])
    email_service = SendGridEmailService(
        api_key=config["sendgrid_api_key"],
        from_address=config["from_email"],
    )

    # Domain services receive adapters, not framework internals
    user_repo = SQLAlchemyUserRepository(session_factory)
    user_service = UserService(user_repo=user_repo, email_service=email_service)

    return AppDependencies(
        user_service=user_service,
        email_service=email_service,
        user_repo=user_repo,
    )


def init_sqlalchemy_session_pool(database_url: str):
    """Framework-specific utility — contained in composition root module."""
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

    engine = create_async_engine(database_url, pool_size=10, max_overflow=20)
    return async_sessionmaker(engine, expire_on_commit=False)
```

### Pattern 2: Layered Configuration with Environment Overrides

This pattern implements a layered configuration system with clear precedence rules and validation.

```python
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional


@dataclass
class ConfigLayer:
    """A single layer in the configuration hierarchy."""
    name: str
    values: dict[str, Any]
    source_type: str  # "env", "file", "defaults", "secrets"


class LayeredConfig:
    """
    Multi-layer configuration resolver with well-defined precedence.

    Precedence (highest to lowest):
      1. Environment variables (process.env)
      2. Secrets manager values
      3. Environment-specific config files (config/{env}.yaml)
      4. Default configuration values
    """

    def __init__(self, defaults: dict[str, Any]):
        self._layers: list[ConfigLayer] = [
            ConfigLayer("defaults", defaults, "defaults"),
        ]

    def add_layer(self, layer: ConfigLayer) -> None:
        """Add a configuration layer. Layers added later take precedence."""
        self._layers.append(layer)

    def get(self, key: str, default: Any = None) -> Any:
        """
        Resolve a configuration value by scanning layers from highest to lowest precedence.

        Supports dot notation for nested keys: get("database.pool_size") 
        returns values["database"]["pool_size"].
        """
        parts = key.split(".")
        current_layer_value = default  # fallback: explicit default

        for layer in reversed(self._layers):
            value = self._resolve_nested(layer.values, parts)
            if value is not None:
                current_layer_value = value
                break

        return current_layer_value

    def get_required(self, key: str, type_hint: type | None = None) -> Any:
        """Get a required configuration value, raising if missing."""
        value = self.get(key)
        if value is None:
            raise KeyError(f"Required config key not found: '{key}'")
        if type_hint is not None and not isinstance(value, type_hint):
            raise TypeError(
                f"Config key '{key}' expected {type_hint.__name__}, got {type(value).__name__}"
            )
        return value

    @staticmethod
    def _resolve_nested(data: dict[str, Any], keys: list[str]) -> Any | None:
        """Resolve a nested key from a dict using dot-notation path."""
        current = data
        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current

    def validate(self, required_keys: list[str]) -> list[str]:
        """
        Validate that all required configuration keys are present.

        Returns a list of missing key names (empty if all present).
        """
        missing = [key for key in required_keys if self.get(key) is None]
        return missing


# Example usage:
def build_config(app_env: str = "production") -> LayeredConfig:
    """Build the complete layered configuration from all sources."""

    # Layer 1: Defaults
    defaults = {
        "database": {"host": "localhost", "port": 5432, "pool_size": 5},
        "redis": {"host": "localhost", "port": 6379},
        "logging": {"level": "INFO", "format": "json"},
        "app": {"debug": False, "workers": 4},
    }

    config = LayeredConfig(defaults)

    # Layer 2: Environment-specific file config
    env_config_path = Path(f"config/{app_env}.yaml")
    if env_config_path.exists():
        import yaml
        with open(env_config_path) as f:
            file_config = yaml.safe_load(f)
        config.add_layer(ConfigLayer(app_env, file_config, "file"))

    # Layer 3: Environment variables (highest precedence)
    env_overrides = {}
    for key in ["database__host", "database__port", "redis__host", "app__debug", "logging__level"]:
        env_key = key.replace("__", ".")
        env_value = __import__("os").environ.get(env_key)
        if env_value is not None:
            # Convert string to appropriate type
            try:
                env_value = int(env_value)
            except ValueError:
                pass  # Keep as string for non-numeric values
            env_overrides[env_key] = env_value

    if env_overrides:
        config.add_layer(ConfigLayer("env_vars", env_overrides, "env"))

    return config


# Example: Resolve configuration with precedence
config = build_config("production")
db_host = config.get_required("database.host")  # env var → file → default
db_port = config.get_required("database.port", int)
debug_mode = config.get("app.debug", False)  # Optional key with explicit default
```

### Pattern 3: Extension Points — Middleware Pipeline and Plugin Registry

This pattern implements two extension mechanisms: a middleware pipeline for request/response interception and a plugin registry for modular feature extension.

```python
from abc import ABC, abstractmethod
from typing import Any, Callable, Awaitable, Protocol


# ── Middleware Pipeline Pattern ───────────────────────────────────

class MiddlewareRequest(Protocol):
    """Interface for HTTP request in middleware pipeline."""
    method: str
    path: str
    headers: dict[str, str]
    body: bytes | None


class MiddlewareResponse(Protocol):
    """Interface for HTTP response from handler or downstream middleware."""
    status_code: int
    headers: dict[str, str]
    body: bytes | str


MiddlewareHandler = Callable[
    [MiddlewareRequest], Awaitable[MiddlewareResponse]
]
MiddlewareFactory = Callable[[], MiddlewareHandler]


class MiddlewarePipeline:
    """
    Builds and executes a middleware stack.

    Middlewares are applied in reverse registration order (last registered runs first),
    following the onion model where each layer wraps the next inner layer.
    """

    def __init__(self):
        self._middlewares: list[MiddlewareFactory] = []
        self._handler: MiddlewareHandler | None = None

    def use(self, factory: MiddlewareFactory) -> "MiddlewarePipeline":
        """Register a middleware factory. The last registered runs first (outermost layer)."""
        self._middlewares.append(factory)
        return self

    def on_dispatch(self, handler: MiddlewareHandler) -> None:
        """Set the final request handler — invoked when all middleware has run."""
        self._handler = handler

    async def execute(self, request: MiddlewareRequest) -> MiddlewareResponse:
        """Execute the full middleware pipeline."""
        if not self._handler:
            raise RuntimeError("No request handler set — call on_dispatch() first")

        # Build nested handlers from outer to inner
        current: MiddlewareHandler = self._handler

        for factory in reversed(self._middlewares):
            next_factory = factory()  # Create fresh middleware instance per pipeline build
            old_handler = current
            current = lambda req, handler=old_factory, next_f=next_factory: next_f(
                req, lambda r=req: handler(r)
            )

        return await current(request)


# Middleware implementations — demonstrate extensibility

async def logging_middleware() -> MiddlewareHandler:
    """Middleware that logs every request/response pair."""
    import time

    async def handler(request: MiddlewareRequest, next_handler: Callable) -> MiddlewareResponse:
        start = time.monotonic()
        try:
            response = await next_handler(request)
            elapsed_ms = (time.monotonic() - start) * 1000
            print(f"[{request.method}] {request.path} → {response.status_code} ({elapsed_ms:.1f}ms)")
            return response
        except Exception as e:
            elapsed_ms = (time.monotonic() - start) * 1000
            print(f"[ERROR] {request.method} {request.path} in {elapsed_ms:.1f}ms: {e}")
            raise

    return handler


async def auth_middleware(api_key: str) -> MiddlewareHandler:
    """Middleware that validates API key from request headers."""

    async def handler(request: MiddlewareRequest, next_handler: Callable) -> MiddlewareResponse:
        if request.headers.get("x-api-key") != api_key:
            return _error_response(401, "Unauthorized: invalid or missing API key")
        response = await next_handler(request)
        return response

    return handler


async def cors_middleware(allowed_origins: list[str] | None = None) -> MiddlewareHandler:
    """Middleware that adds CORS headers to responses."""
    default_origins = ["http://localhost:3000"]

    async def handler(request: MiddlewareRequest, next_handler: Callable) -> MiddlewareResponse:
        response = await next_handler(request)
        origins = allowed_origins or default_origins
        response.headers["access-control-allow-origin"] = ", ".join(origins)
        response.headers["access-control-allow-methods"] = "GET, POST, PUT, DELETE"
        return response

    return handler


def _error_response(status_code: int, message: str) -> MiddlewareResponse:
    """Helper to create error responses for middleware."""
    class ErrorResponse:
        status_code = status_code
        headers: dict[str, str] = {"content-type": "application/json"}
        body = message.encode()
    return ErrorResponse()


# ── Plugin Registry Pattern ───────────────────────────────────────

class Plugin(ABC):
    """Base class for application plugins. Plugins extend behavior without modifying core."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier for this plugin."""

    @property
    def priority(self) -> int:
        """Execution order (lower = earlier). Default 100."""
        return 100

    def register(self, registry: "PluginRegistry") -> None:
        """Called during registration to perform one-time setup."""
        pass

    def on_startup(self) -> None:
        """Called when application starts."""
        pass

    def on_shutdown(self) -> None:
        """Called when application shuts down."""
        pass


class PluginRegistry:
    """
    Discovers and manages application plugins.

    Plugins can register hooks, add middleware, or modify configuration during registration.
    Execution order is determined by each plugin's priority attribute.
    """

    def __init__(self):
        self._plugins: dict[str, Plugin] = {}
        self._hooks: dict[str, list[Callable]] = {}

    def register(self, plugin: Plugin) -> None:
        """Register a plugin instance."""
        if plugin.name in self._plugins:
            raise ValueError(f"Plugin '{plugin.name}' already registered")
        self._plugins[plugin.name] = plugin
        plugin.register(self)

    def get_plugin(self, name: str) -> Plugin | None:
        """Retrieve a registered plugin by name."""
        return self._plugins.get(name)

    def on(self, event: str, handler: Callable) -> None:
        """Register an event handler. Multiple handlers can listen to the same event."""
        if event not in self._hooks:
            self._hooks[event] = []
        self._hooks[event].append(handler)

    def emit(self, event: str, **kwargs: Any) -> list[Any]:
        """Dispatch an event to all registered handlers. Returns list of handler results."""
        results = []
        for handler in sorted(
            self._hooks.get(event, []),
            key=lambda h: getattr(h, "_handler_priority", 100),
        ):
            try:
                results.append(handler(**kwargs))
            except Exception as e:
                print(f"[PluginEvent] Error handling event '{event}': {e}")
        return results

    def startup(self) -> None:
        """Start all registered plugins in priority order."""
        for plugin in sorted(self._plugins.values(), key=lambda p: p.priority):
            plugin.on_startup()

    def shutdown(self) -> None:
        """Stop all registered plugins in reverse priority order."""
        for plugin in reversed(sorted(
            self._plugins.values(), key=lambda p: p.priority
        )):
            plugin.on_shutdown()


# Example plugin implementation
class CachePlugin(Plugin):
    """Plugin that adds caching middleware and cache-clearing hooks."""

    @property
    def name(self) -> str:
        return "cache"

    @property
    def priority(self) -> int:
        return 10  # High priority — runs early in startup

    def register(self, registry: PluginRegistry) -> None:
        # Register cache-clearing event handler
        registry.on("invalidate_cache", self._clear_cache)

    def on_startup(self) -> None:
        print(f"[CachePlugin] Initializing cache layer")

    def _clear_cache(self, pattern: str = "*") -> int:
        """Handle cache invalidation event."""
        cleared_count = 0  # In production, would call actual cache client
        return cleared_count
```

### Pattern 4: Lifecycle Management with Graceful Shutdown

This pattern implements structured application lifecycle management with startup validation, health checks, and graceful shutdown.

```python
from dataclasses import dataclass, field
from enum import Enum
import signal
import asyncio
from typing import Callable, Awaitable


class AppState(Enum):
    """Application state machine for lifecycle management."""
    INITIALIZING = "initializing"
    STARTED = "started"
    SHUTTING_DOWN = "shutting_down"
    STOPPED = "stopped"


@dataclass
class HealthStatus:
    """Aggregated health check result."""
    overall: str  # "healthy", "degraded", "unhealthy"
    components: dict[str, str]  # component_name -> status string

    @classmethod
    def all_healthy(cls) -> "HealthStatus":
        return cls(overall="healthy", components={})

    @classmethod
    def degraded(cls, failures: list[str]) -> "HealthStatus":
        affected = ", ".join(f[:50] for f in failures)  # Truncate long names
        return cls(
            overall="degraded" if len(failures) < 3 else "unhealthy",
            components=dict.fromkeys(failures, "failed"),
        )


class LifecycleManager:
    """
    Manages application lifecycle: startup → running → graceful shutdown.

    Provides structured phases with hooks at each transition point.
    Integrates with OS signals for clean termination (SIGTERM, SIGINT).
    """

    def __init__(self, app_name: str = "app", drain_timeout: float = 30.0):
        self._name = app_name
        self._drain_timeout = drain_timeout
        self._state = AppState.INITIALIZING
        self._startup_hooks: list[tuple[str, Callable]] = []
        self._shutdown_hooks: list[tuple[str, Callable]] = []
        self._health_checkers: dict[str, Callable[[], Awaitable[bool]]] = {}

    def add_startup_hook(self, name: str, hook: Callable) -> None:
        """Register a startup hook. Hooks execute in registration order."""
        self._startup_hooks.append((name, hook))

    def add_shutdown_hook(self, name: str, hook: Callable) -> None:
        """Register a shutdown hook. Hooks execute in reverse registration order."""
        self._shutdown_hooks.insert(0, (name, hook))  # Insert at beginning for reverse order

    def add_health_checker(self, name: str, checker: Callable[[], Awaitable[bool]]) -> None:
        """Register a health check function. Returns True if the component is healthy."""
        self._health_checkers[name] = checker

    async def start(self) -> HealthStatus:
        """Run all startup hooks and transition to STARTED state."""
        self._state = AppState.INITIALIZING
        print(f"[{self._name}] Starting up...")

        failures = []
        for name, hook in self._startup_hooks:
            try:
                if asyncio.iscoroutinefunction(hook) or asyncio.isfuture(hook()):
                    await hook()
                else:
                    hook()
                print(f"[{self._name}] ✓ {name}")
            except Exception as e:
                failures.append(name)
                print(f"[{self._name}] ✗ {name}: {e}", flush=True)

        if failures:
            self._state = AppState.STOPPED
            raise RuntimeError(
                f"Startup failed for {len(failures)} component(s): {', '.join(failures)}"
            )

        self._state = AppState.STARTED
        return HealthStatus.all_healthy()

    async def shutdown(self, reason: str = "signal") -> None:
        """Execute all shutdown hooks and transition to STOPPED state."""
        if self._state == AppState.STOPPED:
            return  # Already stopped — idempotent

        self._state = AppState.SHUTTING_DOWN
        print(f"[{self._name}] Shutting down ({reason})...")

        for name, hook in self._shutdown_hooks:
            try:
                if asyncio.iscoroutinefunction(hook) or asyncio.isfuture(hook()):
                    await asyncio.wait_for(hook(), timeout=self._drain_timeout)
                else:
                    hook()
                print(f"[{self._name}] ✓ {name} cleaned up")
            except (asyncio.TimeoutError, Exception) as e:
                print(f"[{self._name}] ⚠ {name}: {e}", flush=True)

        self._state = AppState.STOPPED
        print(f"[{self._name}] Stopped.")

    async def check_health(self) -> HealthStatus:
        """Run all registered health checks and return aggregated status."""
        if not self._health_checkers:
            return HealthStatus.all_healthy()

        failures = []
        for name, checker in self._health_checkers.items():
            try:
                healthy = await checker()
                if not healthy:
                    failures.append(name)
            except Exception:
                failures.append(name)

        return HealthStatus.degraded(failures) if failures else HealthStatus.all_healthy()

    @property
    def state(self) -> AppState:
        return self._state


def setup_signal_handlers(lifecycle: LifecycleManager) -> None:
    """Install OS signal handlers for graceful shutdown."""
    import signal as sig

    async def _handle_signal(signum, frame):
        sig_name = sig.Signals(signum).name
        await lifecycle.shutdown(reason=f"{sig_name} signal")

    # Use asyncio loop for async-safe signal handling
    try:
        loop = asyncio.get_running_loop()
        for signum in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(signum, lambda s=signum: asyncio.create_task(
                _handle_signal(s, None)
            ))
    except NotImplementedError:
        # Fallback for environments without asyncio signal handling
        signal.signal(signal.SIGTERM, lambda s, f: asyncio.create_task(
            _handle_signal(s, f)
        ))


# Example usage — complete lifecycle setup:
async def main():
    lifecycle = LifecycleManager(app_name="notification-service", drain_timeout=30.0)

    # Register startup hooks
    lifecycle.add_startup_hook("database_pool", init_database_pool)
    lifecycle.add_startup_hook("cache_client", init_cache_client)
    lifecycle.add_startup_hook("message_consumer", start_message_consumer)
    lifecycle.add_startup_hook("http_server", start_http_server)

    # Register health checks
    lifecycle.add_health_checker("database", check_db_connection)
    lifecycle.add_health_checker("cache", check_redis_connection)
    lifecycle.add_health_checker("queue_consumer", check_consumer_status)

    # Register shutdown hooks
    lifecycle.add_shutdown_hook("http_server", stop_http_server)
    lifecycle.add_shutdown_hook("message_consumer", drain_message_consumer)
    lifecycle.add_shutdown_hook("cache_client", close_cache_connection)
    lifecycle.add_shutdown_hook("database_pool", close_database_pool)

    # Start application
    health = await lifecycle.start()

    if health.overall != "healthy":
        print(f"Startup incomplete — {health.overall} status")
        return

    # Install signal handlers for graceful shutdown
    setup_signal_handlers(lifecycle)

    # Keep running until shutdown signal
    await keep_running(lifecycle)


async def init_database_pool():
    pass  # Framework-specific: create async SQLAlchemy engine pool


async def check_db_connection() -> bool:
    """Health check: verify database connection is alive."""
    try:
        from sqlalchemy.ext.asyncio import AsyncSession
        from myapp.engine import get_session_factory
        session = await get_session_factory().__anext__()  # Simplified
        await session.execute("SELECT 1")
        return True
    except Exception:
        return False


async def keep_running(lifecycle: LifecycleManager):
    """Keep the application running. Exits when shutdown is triggered."""
    while lifecycle.state != AppState.SHUTTING_DOWN and lifecycle.state != AppState.STOPPED:
        await asyncio.sleep(1)
```

---

## Constraints

### MUST DO
- Apply dependency injection at framework boundaries — domain services must never import framework classes
- Use Protocol interfaces (Python), TypeScript interfaces, or abstract base classes for all adapter contracts
- Implement layered configuration with explicit validation before application startup
- Provide health check endpoints that verify all external dependencies, not just process liveness
- Handle graceful shutdown with a bounded drain timeout — never exit immediately on SIGTERM
- Write unit tests for domain logic without any framework imports; use integration tests for adapters only

### MUST NOT DO
- Do not let framework singletons pollute global state — each test should get a fresh dependency graph
- Do not configure frameworks through inline parameters scattered across route handlers or controllers
- Do not skip shutdown hooks — unflushed buffers and leaked connections cause data corruption over time
- Do not mount middleware directly in application files — use the middleware pipeline pattern for testability
- Do not hardcode environment-specific values (hosts, ports, credentials) — always resolve through configuration layer
- Do not mix framework imports into domain service modules — if a business logic file imports Flask, Django, or Express, refactor

---

## Output Template

When this skill is active, produce:

1. **Dependency Topology** — Diagram (text-based) showing which components depend on the framework and where adapters sit
2. **Configuration Specification** — Table of all configuration keys with defaults, environment override paths, and required values
3. **Extension Point Design** — Documented interfaces for middleware/hook/plugin contracts with example implementations
4. **Lifecycle Plan** — Ordered list of startup hooks, health checks, shutdown hooks, and their dependencies
5. **Testing Strategy** — Breakdown of unit vs integration vs E2E test coverage by component
6. **Integration Spike Report** — Results from the validation spike with any design issues discovered

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-selection` | Predecessor skill — determines which framework to select before this integration work begins |
| `hexagonal-architecture` | Provides the ports-and-adapters architecture pattern that guides where dependency injection boundaries go |
| `pydantic-config` | Provides configuration management patterns specifically for Pydantic-based apps |
| `software-design-principles` | SOLID principles and separation of concerns guidance applicable to framework integration design |

---

## Example: Complete Integration — FastAPI Application

### Project: User Management REST API with FastAPI + SQLAlchemy

The following demonstrates full framework utilization: DI topology, configuration, lifecycle, middleware pipeline, and testing strategy for a FastAPI application.

```python
# ── app/config.py — Configuration Layer ───────────────────────────
from typing import Optional

class AppSettings:
    """Pydantic-settings backed settings with env var auto-loading."""
    database_url: str = "sqlite:///./app.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    debug_mode: bool = False
    log_level: str = "INFO"
    max_connection_pool: int = 10

    # Auto-loads from .env file and environment variables via BaseSettings


# ── app/dependencies.py — Composition Root ────────────────────────
from fastapi import Depends, FastAPI, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

engine = create_async_engine(app_settings.database_url, pool_size=app_settings.max_connection_pool)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db_session() -> AsyncSession:
    """Dependency injection for database session in FastAPI route handlers."""
    async with AsyncSessionLocal() as session:
        yield session


def create_app() -> FastAPI:
    """Composition root — wires dependencies and mounts routes."""

    app = FastAPI(title="User API", version="1.0.0")

    # Register middleware
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"])
    app.add_middleware(RequestTimingMiddleware)
    app.add_middleware(AuthenticationMiddleware, jwt_secret=app_settings.jwt_secret)

    # Health check endpoint (no framework dependency — pure domain check)
    @app.get("/health")
    async def health_check() -> dict:
        return {"status": "healthy", "version": "1.0.0"}

    # Register routers (each router gets injected dependencies)
    app.include_router(user_router, prefix="/users", tags=["users"])

    @app.on_event("shutdown")
    async def shutdown():
        await engine.dispose()  # Graceful connection pool cleanup

    return app
```

### Testing Strategy for This Integration

| Test Category | What It Tests | Framework Import Allowed? | Example |
|---|---|---|---|
| Unit: UserService logic | Registration validation, welcome email trigger | No | `UserService(user_repo_mock, email_mock).register("john", "j@x.com")` |
| Unit: Auth middleware | Token extraction, claim validation | Only the auth interface, not JWT library | `AuthMiddleware(request_with_token).validate()` |
| Integration: DB adapter | SQLAlchemy session management, query correctness | Yes — adapter tests test the adapter | `SQLAlchemyUserRepository(session_factory).get_by_id("abc")` |
| Integration: FastAPI routes | Full request/response with real routing/serialization | Yes — test client | `client.post("/users", json={"username": "j"})` |
| E2E: End-to-end flow | Registration → email → login sequence | Yes — full app boot | `docker-compose up`, run pytest against it |

### Configuration Precedence in Practice

```
Environment variable: DATABASE_URL=postgres://prod/db
  ↓ overrides
Production file config (config/prod.yaml): database.host=prod-db.internal
  ↓ overrides  
Default config: database.host=localhost, database.port=5432
  ↓ overrides
Framework default: PostgreSQL port defaults to 5432 (not used — all explicitly set)

Result: app gets DATABASE_URL from env var → "postgres://prod/db"
```

### Health Check Response Examples

**Healthy:**
```json
{"status": "healthy", "version": "1.0.0"}
```

**Degraded (cache down):**
```json
{
  "status": "degraded",
  "components": {"redis_cache": "failed"},
  "message": "Cache unavailable — falling back to direct queries"
}
```

**Unhealthy (database + queue down):**
```json
{
  "status": "unhealthy",
  "components": {"postgresql": "failed", "rabbitmq": "failed"},
  "message": "Critical dependencies unavailable — returning 503"
}
```
