---
name: framework-extension-design
description: Designs extension points, plugin interfaces, and public API surfaces for frameworks built in-house — defining stable plugin contracts, middleware pipelines, versioned extension APIs, and authoring guides for third-party contributors.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: extension design, plugin interface, middleware pipeline design, how do i make my framework extensible, third-party plugins, extension points, versioned extension APIs
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples, do-dont]
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
---

# Framework Extension Design

Acts as a senior framework architect designing extensibility surfaces for frameworks that YOUR team builds and maintains. When loaded, the model defines stable plugin contracts, middleware pipeline architectures, versioned public APIs, and extension authoring guides — ensuring that third-party contributors can extend the framework without breaking changes, without accessing internal state, and with clear upgrade paths. This is NOT about using extensions in an existing framework like Django or Rails; this is about BUILDING a framework whose primary purpose is to be extended by others.

## TL;DR Checklist

- [ ] Every public extension interface has explicit input/output contracts with typed signatures
- [ ] Extension lifecycle phases (install, activate, execute, teardown) are clearly defined and tested
- [ ] Middleware pipeline uses composable `(context, next) -> result` signature with priority ordering
- [ ] Extension API follows semantic versioning — breaking changes require major version bump
- [ ] Documentation includes a complete "Hello World" plugin that third parties can copy-paste-run
- [ ] Backward compatibility contract is tested via snapshot tests and deprecation warnings

---

## When to Use

Use this skill when:

- Building an internal framework or SDK that your organization's teams will extend with custom plugins
- Designing a public-facing plugin marketplace where third-party developers need stable, well-documented extension points
- Creating a middleware pipeline system where users inject custom handlers at specific lifecycle phases
- Architecting a CLI framework (like `uvicorn`, `pytest`, or `invoke`) that external tools can extend
- Refactoring an existing framework to expose clean extension surfaces instead of requiring monkey-patching

---

## When NOT to Use

Avoid this skill for:

- **Using extensions in your own application** — if you're consuming plugins from a framework like Django, use `framework-driven-design` instead
- **Integrating external frameworks into your codebase** — use `framework-integration-patterns` when adapting third-party libraries
- **Designing the overall project structure** — that belongs in `framework-architecture-design`, which handles directory layout and module boundaries
- **Creating simple callback mechanisms** — if you only need one function to run after an event, a plain Python callable registration is simpler than a full plugin system
- **API versioning for REST endpoints** — use API design patterns for client-facing HTTP APIs; extension design is about framework-level hooks, not resource URLs

---

## Core Workflow

1. **Catalog Extension Surface Areas** — Identify every place in the framework where external code needs to hook in. Categorize each surface into one of four types: (a) **Lifecycle Hooks** — events fired at specific framework phases (boot, request-start, request-end, shutdown); (b) **Middleware/Interceptors** — composable handlers that process requests or data as they pass through the pipeline; (c) **Provider/Service Extension** — custom implementations of framework interfaces (repositories, formatters, validators); (d) **Configuration Extension** — adding new configuration schemas and defaults. For each surface, define what information is available to the extension author and what they can modify or return.

   **Checkpoint:** For every extension surface, write a one-sentence "what this lets plugin authors do" description. If you cannot articulate it without mentioning internal framework details, the surface is leaking implementation concerns.

2. **Design Plugin Interface Contracts** — For each extension type, define the exact interface (Protocol, ABC, or language-native equivalent) that plugins must implement. Every method must have: typed signatures with explicit parameter types, docstrings describing purpose and expected behavior, return type contracts, and documented exception types that may be raised. The interface is the framework's promise to plugin authors — once published in a stable version, it cannot change without a major version bump. Design these interfaces following the **5 Laws of Elegant Defense** (from `code-philosophy`): ensure data flows naturally through extension boundaries (data flow), each layer owns its state (early exit and fail-fast on invalid inputs), and keep interfaces focused so they guide the developer toward correct usage (intentional naming).

   **Checkpoint:** Write three independent plugin implementations from scratch using only the interface definition. If any implementation requires reading internal framework source code, the interface contract is incomplete.

3. **Design Middleware Pipeline Architecture** — Create a composable pipeline where middleware components chain via `(context, next) -> result`. Each middleware receives a context object (immutable during its execution), can modify it before calling `next()`, and can observe or mutate the response after `next()` returns. Support priority ordering, conditional execution, and early termination (short-circuit). The pipeline itself is immutable at runtime — plugins register during framework bootstrap.

   **Checkpoint:** Verify that no middleware can bypass another by observing whether the context object is shared but not mutable between stages. Test with three middleware pieces: one that short-circuits, one that runs after it (should never execute), and one that runs before it (should always execute).

4. **Version Extension APIs with Semantic Versioning** — Establish a clear versioning policy for each extension surface. Minor versions may add new optional methods to interfaces; major versions may change method signatures or remove deprecated methods. Provide deprecation warnings (runtime logging + type-level annotations) at least one major version before removal. Document the exact compatibility matrix: "Plugin built against v2.x works with framework v2.x and v3.x; plugin built against v1.x requires migration to v2."

   **Checkpoint:** Write a migration guide snippet showing how a plugin author updates from interface version N to version N+1, including what code changes are required and what is automatically compatible.

5. **Create Extension Authoring Guide** — Document the complete developer experience for building plugins: installation, registration, testing, debugging, publishing. Include a minimum viable "Hello World" plugin that works out of the box. Document common pitfalls (shared mutable state, blocking calls in async pipelines, missing cleanup) and how to avoid them.

   **Checkpoint:** Give only this guide to an unfamiliar developer. They should be able to build, register, and test a working plugin within one hour without reading the framework's internal source code.

---

## Implementation Patterns

### Pattern 1: Plugin Interface Contract with Lifecycle Management

Define stable plugin interfaces that plugins implement, and a manager that controls their lifecycle from registration through execution to teardown. This pattern works across all languages — shown in Python but the concepts apply identically to TypeScript (interfaces), Go (interfaces), Java (interfaces/abstract classes), and Rust (traits).

```python
# framework/plugins/contract.py — The PUBLIC API surface. Plugin authors import ONLY from here.
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Protocol


class PluginState(Enum):
    """Lifecycle states for a plugin instance."""
    INSTALLED = "installed"       # Plugin is registered but not yet activated
    ACTIVE = "active"             # Plugin has been initialized and is running
    SUSPENDED = "suspended"      # Plugin is paused (can be resumed)
    ERROR = "error"              # Plugin encountered a fatal error


class PluginMetadata(Protocol):
    """Metadata that every plugin must report about itself."""

    @property
    def name(self) -> str: ...
    @property
    def version(self) -> str: ...
    @property
    def description(self) -> str: ...
    @property
    def state(self) -> PluginState: ...


class LifecycleManager(Protocol):
    """Methods available to plugins during their lifecycle."""

    def register_shutdown_hook(self, callback: Any) -> None: ...
    def get_config(self, key: str) -> Any: ...
    def emit_event(self, event_name: str, payload: dict[str, Any]) -> None: ...


class Plugin(ABC):
    """Base class for all framework plugins.

    Plugin authors MUST subclass this and implement the required methods.
    The framework calls lifecycle hooks in strict order:
      on_install() → on_activate() → [runtime] → on_deactivate() → on_uninstall()

    All methods receive a LifecycleManager to interact with the framework
    without accessing internal state directly.
    """

    # Override these in subclasses
    name: str = "unnamed-plugin"
    version: str = "0.0.0"
    description: str = ""

    @property
    def state(self) -> PluginState:
        """Current lifecycle state (managed by the framework, not the plugin)."""
        return self._state  # type: ignore[attr-defined]

    def __init__(self) -> None:
        self._state: PluginState = PluginState.INSTALLED

    # --- Lifecycle Hooks (called by framework in order) ---

    def on_install(self, manager: LifecycleManager) -> None:
        """Called when plugin is first registered.

        Use this to validate configuration, create database tables, or
        perform one-time setup. Raise RuntimeError for fatal errors that
        should prevent the plugin from being installed.
        """
        pass  # Optional override — no-op by default

    def on_activate(self, manager: LifecycleManager) -> None:
        """Called when the framework is starting up and plugins become active.

        Use this to register event listeners, start background threads, or
        initialize connections. Plugins should NOT perform heavy computation here —
        defer work until first use.
        """
        self._state = PluginState.ACTIVE

    def on_deactivate(self, manager: LifecycleManager) -> None:
        """Called when the framework is shutting down.

        Use this to close connections, flush buffers, and release resources.
        Must be idempotent — called once per activation cycle, but plugins
        may be deactivated/activated multiple times.
        """
        self._state = PluginState.INSTALLED

    def on_uninstall(self, manager: LifecycleManager) -> None:
        """Called when the plugin is being removed entirely.

        Clean up everything created in on_install. After this call,
        no references to this plugin instance should remain.
        """
        self._state = PluginState.INSTALLED

    # --- Runtime Hooks (called during normal operation) ---

    def handle_event(self, manager: LifecycleManager, event_name: str, payload: dict[str, Any]) -> Any:
        """Called when a framework event is emitted that this plugin cares about.

        Return value is passed to the next handler in the chain (if applicable).
        Raise an exception to halt the event chain and mark the plugin ERROR.
        """
        return payload


# --- Concrete Example Plugin (from plugin author) ---
class AuditLogPlugin(Plugin):
    """Records all framework events to a structured audit log."""

    name = "audit-log"
    version = "1.2.0"
    description = "Structured event auditing for compliance and debugging"

    def __init__(self, log_backend: str = "stdout") -> None:
        super().__init__()
        self._log_backend = log_backend
        self._events: list[dict[str, Any]] = []

    def on_activate(self, manager: LifecycleManager) -> None:
        super().on_activate(manager)
        # Register for specific events the framework emits
        self._events_config = {
            "request.started": True,
            "request.completed": True,
            "error.occurred": True,
        }

    def handle_event(self, manager: LifecycleManager, event_name: str, payload: dict[str, Any]) -> Any:
        if not self._events_config.get(event_name):
            return payload  # Ignore irrelevant events

        audit_entry = {
            "plugin": self.name,
            "event": event_name,
            "payload": payload,
            "timestamp": manager.get_config("audit.timestamp"),  # type: ignore[union-attr]
        }
        self._events.append(audit_entry)

        if self._log_backend == "stdout":
            print(f"[AUDIT] {event_name}: {payload}")

        return payload


# --- Plugin Discovery and Registration (framework internal, NOT part of public API) ---
class PluginRegistry:
    """Internal framework component that manages plugin lifecycle.

    This class is NOT importable by plugin authors. It uses the Plugin
    protocol to interact with plugins without exposing framework internals.
    """

    def __init__(self) -> None:
        self._plugins: dict[str, Plugin] = {}

    def register(self, plugin: Plugin) -> None:
        if plugin.name in self._plugins:
            raise ValueError(f"Plugin '{plugin.name}' already registered")
        self._plugins[plugin.name] = plugin
        plugin.on_install(FrameworkLifecycleBridge())  # type: ignore[name-defined]

    def activate_all(self) -> None:
        for plugin in self._plugins.values():
            if plugin.state == PluginState.INSTALLED:
                plugin.on_activate(FrameworkLifecycleBridge())  # type: ignore[name-defined]

    def deactivate_all(self) -> None:
        for name, plugin in list(self._plugins.items()):
            if plugin.state == PluginState.ACTIVE:
                plugin.on_deactivate(FrameworkLifecycleBridge())  # type: ignore[name-defined]

    def shutdown(self) -> None:
        self.deactivate_all()
        for name, plugin in list(self._plugins.items()):
            plugin.on_uninstall(FrameworkLifecycleBridge())  # type: ignore[name-defined]
            del self._plugins[name]


class FrameworkLifecycleBridge(LifecycleManager):
    """Bridge between framework internals and the public LifecycleManager interface.

    Plugin authors NEVER see this class — it's injected automatically by the registry.
    It translates calls from the clean protocol into framework-specific operations.
    """

    def register_shutdown_hook(self, callback: Any) -> None:
        import atexit
        atexit.register(callback)

    def get_config(self, key: str) -> Any:
        # Access to a controlled configuration subset only
        return {"audit.timestamp": "2024-01-01T00:00:00Z"}.get(key)  # type: ignore[return-value]

    def emit_event(self, event_name: str, payload: dict[str, Any]) -> None:
        # Internal framework event emission — plugin authors cannot call this directly
        pass  # Implementation details hidden from plugin API
```

### Pattern 2: Middleware Pipeline with Priority and Short-Circuit Support

Middleware pipelines are the most common extension surface in modern frameworks. This pattern provides a composable, type-safe pipeline where middleware can process requests before and after downstream handlers, support priority ordering, and short-circuit when appropriate.

```python
# framework/middleware/pipeline.py — Public API for middleware pipeline design
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable, Protocol


@dataclass(frozen=True)
class MiddlewareContext:
    """Immutable context object passed through the middleware chain.

    Middleware MAY attach metadata to this context using the mutable wrapper.
    The core fields (request, method, path, headers) are immutable — they
    represent the original incoming request and cannot be spoofed by plugins.
    """
    method: str = "GET"
    path: str = "/"
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes | None = None
    _metadata: dict[str, Any] = field(default_factory=dict, repr=False)

    def get(self, key: str, default: Any = None) -> Any:
        """Read metadata attached by previous middleware in the chain."""
        return self._metadata.get(key, default)

    def set(self, key: str, value: Any) -> None:
        """Attach metadata for downstream middleware to read.

        This is the ONLY way middleware communicate with each other through
        the pipeline. Never store data on 'self' — it may be shared across
        requests in connection-pooled environments.
        """
        self._metadata[key] = value


@dataclass(frozen=True)
class MiddlewareResponse:
    """Immutable response object returned by middleware or terminal handler."""
    status_code: int = 200
    headers: dict[str, str] = field(default_factory=dict)
    body: bytes | None = None

    def with_status(self, code: int) -> "MiddlewareResponse":
        """Return a new response with the given status code."""
        return MiddlewareResponse(status_code=code, headers=self.headers, body=self.body)

    def with_body(self, body: bytes) -> "MiddlewareResponse":
        """Return a new response with the given body."""
        return MiddlewareResponse(
            status_code=self.status_code,
            headers=self.headers,
            body=body,
        )


# Public interface that middleware authors implement
class MiddlewareHandler(Protocol):
    """Contract for all middleware handlers in the pipeline.

    Signature: (context, next) -> response
      - context: The request context with attached metadata
      - next: A callable that invokes the next middleware or terminal handler
      - returns: A response object (or None to continue without producing a response)

    The pipeline executes handlers in priority order (lowest number first).
    Each handler can short-circuit by returning a response before calling next().
    """

    def __call__(self, context: MiddlewareContext, next_fn: Callable[[MiddlewareContext], MiddlewareResponse]) -> MiddlewareResponse: ...


class PriorityOrderedMiddleware(ABC):
    """Abstract base that middleware authors SHOULD subclass for priority ordering.

    Override the 'priority' property to control execution order within your
    middleware category. Lower numbers execute first. Default priority is 100.
    """

    @property
    def priority(self) -> int:
        return 100

    @abstractmethod
    async def __call__(self, context: MiddlewareContext, next_fn: Callable[[MiddlewareContext], MiddlewareResponse]) -> MiddlewareResponse:
        ...


# Pipeline engine (internal framework component)
class MiddlewarePipeline:
    """Composable middleware pipeline with priority ordering and short-circuit support.

    Usage by framework bootstrap code:
      pipeline = MiddlewarePipeline()
      pipeline.add(CacheMiddleware())       # priority=10
      pipeline.add(AuthMiddleware())        # priority=20
      pipeline.add(RateLimitMiddleware())   # priority=50
      pipeline.add(MyPluginMiddleware())    # priority=100 (default)
      response = await pipeline.handle(context)  # Executes chain
    """

    def __init__(self) -> None:
        self._handlers: list[tuple[int, MiddlewareHandler]] = []

    def add(self, handler: MiddlewareHandler | PriorityOrderedMiddleware, priority: int = 100) -> None:
        """Add a middleware handler to the pipeline.

        Args:
            handler: The middleware instance. If it has a 'priority' attribute,
                     that value is used; otherwise the explicit priority arg is used.
            priority: Execution order (lower = first). Defaults to 100.
        """
        if hasattr(handler, "priority"):
            actual_priority = handler.priority
        else:
            actual_priority = priority
        self._handlers.append((actual_priority, handler))
        # Re-sort after insertion (small list, O(n log n) is fine)
        self._handlers.sort(key=lambda x: x[0])

    async def handle(self, context: MiddlewareContext) -> MiddlewareResponse:
        """Execute the full middleware chain."""
        if not self._handlers:
            return MiddlewareResponse(status_code=503, body=b"Service unavailable")

        # Build recursive chain — each handler receives a 'next' callable
        async def run(index: int) -> MiddlewareResponse:
            if index >= len(self._handlers):
                return MiddlewareResponse(status_code=404, body=b"Not found")  # Terminal fallback

            priority, handler = self._handlers[index]

            try:
                response = await handler(context, lambda ctx: run(index + 1))
            except Exception as exc:
                # Error middleware catches — logs and returns error response
                return MiddlewareResponse(
                    status_code=500,
                    headers={"content-type": "application/json"},
                    body=f'{{"error": "{type(exc).__name__}: {exc}"}}'.encode(),
                )

            # Short-circuit: if handler returned a response without calling next(),
            # skip remaining handlers in the chain
            if response.status_code != 0 and response.body is not None:
                return response

            return await run(index)  # Ensure we always return from terminal fallback

        return await run(0)


# --- Concrete Middleware Examples ---
class AuthMiddleware(PriorityOrderedMiddleware):
    """Validates authentication tokens from request headers."""

    @property
    def priority(self) -> int:
        return 20  # Runs after caching, before business logic

    async def __call__(self, context: MiddlewareContext, next_fn: Callable[[MiddlewareContext], MiddlewareResponse]) -> MiddlewareResponse:
        # PRE: Validate auth before proceeding
        token = context.headers.get("authorization")
        if not token:
            return MiddlewareResponse(status_code=401, body=b'{"error": "unauthorized"}')

        # Attach authenticated user to context metadata for downstream handlers
        context.set("user_id", "user_123")  # Simplified — real impl validates token
        context.set("roles", ["admin", "editor"])

        # Call next handler in chain
        response = await next_fn(context)

        # POST: Add security headers to every response
        response.headers["x-authenticated"] = "true"
        return response


class RateLimitMiddleware(PriorityOrderedMiddleware):
    """Throttles requests per user. Short-circuits with 429 when limit exceeded."""

    @property
    def priority(self) -> int:
        return 50

    def __init__(self, max_requests: int = 100, window_seconds: int = 60) -> None:
        self._max_requests = max_requests
        self._window_seconds = window_seconds
        # In production: use Redis or in-memory LRU cache with TTL
        self._request_counts: dict[str, list[float]] = {}

    async def __call__(self, context: MiddlewareContext, next_fn: Callable[[MiddlewareContext], MiddlewareResponse]) -> MiddlewareResponse:
        user_id = context.get("user_id")
        if not user_id:
            # Cannot rate-limit unauthenticated requests — skip for now
            return await next_fn(context)

        import time
        now = time.time()
        window_start = now - self._window_seconds

        # Count requests in current window
        if user_id not in self._request_counts:
            self._request_counts[user_id] = []

        self._request_counts[user_id] = [
            t for t in self._request_counts[user_id] if t > window_start
        ]
        count = len(self._request_counts[user_id])

        if count >= self._max_requests:
            return MiddlewareResponse(
                status_code=429,
                headers={"retry-after": str(self._window_seconds)},
                body=b'{"error": "rate limit exceeded"}',
            )

        self._request_counts[user_id].append(now)
        context.set("remaining_requests", self._max_requests - count - 1)

        return await next_fn(context)


class CacheMiddleware(PriorityOrderedMiddleware):
    """Caches GET responses. Skips cache for non-GET methods."""

    @property
    def priority(self) -> int:
        return 10  # First in chain — check cache before anything else

    async def __call__(self, context: MiddlewareContext, next_fn: Callable[[MiddlewareContext], MiddlewareResponse]) -> MiddlewareResponse:
        if context.method != "GET":
            return await next_fn(context)

        cache_key = f"cache:{context.path}"
        cached = self._get_cached(cache_key)  # type: ignore[return-value]
        if cached is not None:
            return cached.with_status(200).with_body(cached.body or b'{}')

        response = await next_fn(context)
        if response.status_code == 200 and response.body:
            self._store_cached(cache_key, response)  # type: ignore[unreachable]

        return response

    def _get_cached(self, key: str) -> MiddlewareResponse | None:
        """Simplified cache lookup — production would use Redis/Memcached."""
        return None

    def _store_cached(self, key: str, response: MiddlewareResponse) -> None:
        """Simplified cache store — production would set TTL and handle eviction."""
        pass
```

### Pattern 3: Versioned Extension API with Deprecation Warnings

Extension APIs evolve. This pattern shows how to version interfaces gracefully using deprecation warnings, backward-compatible additions, and clear migration paths. The pattern uses Python but the same principles apply to every language's type system.

```python
# framework/extensions/v1/contracts.py — V1 public API (deprecated in v2)
from __future__ import annotations

import warnings
from abc import ABC, abstractmethod
from typing import Any


class PluginV1(ABC):
    """V1 plugin interface — DEPRECATED. Use PluginV2 instead.

    Deprecation Notice: This interface will be removed in framework version 4.0.
    Migration Guide: https://docs.example.com/migrations/plugin-v1-to-v2
    """

    @property
    def name(self) -> str:
        return "unnamed"

    @property
    def version(self) -> str:
        return "0.0.0"

    def handle_event(self, event_name: str, payload: dict[str, Any]) -> Any:
        """Handle a framework event.

        WARNING: This method receives raw dicts instead of typed events.
        V2 uses strongly-typed Event objects for better type safety.
        """
        warnings.warn(
            "PluginV1.handle_event is deprecated since framework 3.0. "
            "Use PluginV2.handle_event with typed Event parameter.",
            DeprecationWarning,
            stacklevel=2,
        )
        return payload


# framework/extensions/v2/contracts.py — V2 public API (current stable)
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Protocol


class EventType(Enum):
    """Typed event types that the framework emits to plugins."""
    REQUEST_STARTED = "request.started"
    REQUEST_COMPLETED = "request.completed"
    REQUEST_ERROR = "request.error"
    SHUTDOWN_INITIATED = "system.shutdown"


@dataclass(frozen=True)
class Event:
    """Immutable event object passed to plugin handlers.

    Unlike V1's raw dicts, this provides type-safe access to event data
    and prevents plugins from mutating framework state accidentally.
    """
    type: EventType
    timestamp: datetime = None  # type: ignore[assignment]
    payload: dict[str, Any] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.timestamp is None:
            object.__setattr__(self, "timestamp", datetime.utcnow())
        if self.payload is None:
            object.__setattr__(self, "payload", {})


class LifecycleManagerV2(Protocol):
    """V2 lifecycle manager — provides typed access to framework capabilities."""

    def register_shutdown_hook(self, callback: Any) -> None: ...
    def get_config(self, key: str) -> Any: ...
    def emit_event(self, event_name: str | EventType, payload: dict[str, Any] = None) -> None: ...


class PluginV2(ABC):
    """V2 plugin interface — the current stable API.

    Changes from V1:
      - handle_event receives typed Event objects instead of dicts
      - LifecycleManager is injected via constructor parameter
      - New on_configure() hook for reading plugin-specific config at startup
    """

    @property
    @abstractmethod
    def name(self) -> str: ...

    @property
    @abstractmethod
    def version(self) -> str: ...

    @property
    def supported_event_types(self) -> list[EventType]:
        """Which event types this plugin handles. Override to restrict processing."""
        return list(EventType)  # Default: handle all events

    @abstractmethod
    def __init__(self, manager: LifecycleManagerV2) -> None: ...

    def on_configure(self, manager: LifecycleManagerV2) -> None:
        """Called during plugin activation, before event handling begins.

        Use this to read plugin-specific configuration and perform one-time setup.
        V1 required doing this in handle_event, which was error-prone.
        """
        pass

    def handle_event(self, manager: LifecycleManagerV2, event: Event) -> Any:
        """Handle a typed framework event.

        Args:
            manager: Lifecycle manager for framework interaction
            event: Typed event object with known structure based on EventType

        Returns:
            Optional modification to the event payload (None = no change)
        """
        if event.type not in self.supported_event_types:
            return None
        return None


# --- Backward Compatibility Adapter (internal, NOT public API) ---
class V1ToV2Adapter(PluginV2):
    """Internal adapter that wraps V1 plugins for the V2 pipeline.

    This allows existing V1 plugins to work with framework v3.x without
    requiring immediate migration. New plugin development MUST use V2 directly.
    """

    def __init__(self, legacy_plugin: PluginV1) -> None:
        self._legacy = legacy_plugin
        # Auto-generate metadata from V1 plugin
        self.name = legacy_plugin.name  # type: ignore[attr-defined]
        self.version = legacy_plugin.version  # type: ignore[attr-defined]

    @property
    def supported_event_types(self) -> list[EventType]:
        return list(EventType)

    def handle_event(self, manager: LifecycleManagerV2, event: Event) -> Any:
        # Convert V2 Event → V1 dict format for legacy plugin
        return self._legacy.handle_event(event.type.value, event.payload)  # type: ignore[attr-defined]


# --- Migration guide code snippet (for documentation) ---
"""
MIGRATION GUIDE: PluginV1 → PluginV2

Step 1: Change base class
  BEFORE: class MyPlugin(PluginV1):
  AFTER:  class MyPlugin(PluginV2):

Step 2: Accept LifecycleManager in constructor
  BEFORE: def __init__(self) -> None: ...
  AFTER:  def __init__(self, manager: LifecycleManagerV2) -> None:
              self._manager = manager

Step 3: Migrate handle_event signature
  BEFORE: def handle_event(self, event_name: str, payload: dict[str, Any]) -> Any:
          if event_name == "request.started": ...
  AFTER:  def handle_event(self, manager: LifecycleManagerV2, event: Event) -> Any:
              if event.type == EventType.REQUEST_STARTED: ...

Step 4: Move setup from handle_event to on_configure
  BEFORE (inside handle_event): self._cache = RedisClient(...)
  AFTER (new method):
      def on_configure(self, manager: LifecycleManagerV2) -> None:
          self._cache = RedisClient()
"""


# --- Example V2 Plugin ---
class MetricsPlugin(PluginV2):
    """Collects request metrics using the V2 API."""

    @property
    def name(self) -> str:
        return "metrics-collector"

    @property
    def version(self) -> str:
        return "2.1.0"

    @property
    def supported_event_types(self) -> list[EventType]:
        return [EventType.REQUEST_STARTED, EventType.REQUEST_COMPLETED]

    def __init__(self, manager: LifecycleManagerV2) -> None:
        self._manager = manager
        self._request_counts: dict[str, int] = {"started": 0, "completed": 0}

    def handle_event(self, manager: LifecycleManagerV2, event: Event) -> Any:
        if event.type == EventType.REQUEST_STARTED:
            self._request_counts["started"] += 1
        elif event.type == EventType.REQUEST_COMPLETED:
            self._request_counts["completed"] += 1
            # Emit custom metric via framework telemetry system
            manager.emit_event("custom.metric", {
                "name": "framework.requests_total",
                "value": self._request_counts["completed"],
            })
        return None


# --- Version compatibility checker (internal) ---
def validate_plugin_compatibility(
    plugin: PluginV2,
    framework_version: str,
) -> list[str]:
    """Check if a plugin is compatible with the current framework version.

    Returns a list of issues (empty = fully compatible).
    Each issue describes what needs to change.
    """
    issues: list[str] = []

    # Check major version alignment
    plugin_major = int(plugin.version.split(".")[0]) if "." in plugin.version else 0
    framework_major = int(framework_version.split(".")[0]) if "." in framework_version else 0

    if plugin_major < framework_major - 1:
        issues.append(
            f"Plugin {plugin.name} v{plugin.version} requires migration "
            f"from framework v{plugin_major}.x to v{framework_major}.x. "
            f"See migration guide at https://docs.example.com/migrations/"
        )

    return issues
```

### Pattern 4: Extension Point Discovery and Registration System

Plugins need a reliable way to be discovered, validated, and registered. This pattern shows a plugin registry that supports file-system discovery, metadata validation, dependency resolution, and hot-reload for development mode.

```python
# framework/extensions/discovery.py — Plugin discovery and registration engine
from __future__ import annotations

import importlib
import json
import pkgutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class PluginSpec:
    """Metadata about a discovered plugin, extracted from its entry point file."""
    name: str
    version: str
    description: str = ""
    requires: list[str] = field(default_factory=list)  # Dependency plugin names
    priority: int = 100
    module_path: str = ""          # e.g., "my_plugin.core.MyPlugin"
    file_path: Path = field(default_factory=Path)

    @classmethod
    def from_metadata_file(cls, metadata_path: Path) -> PluginSpec:
        """Load plugin spec from a standard metadata.json in the plugin directory."""
        if not metadata_path.exists():
            raise ValueError(f"Missing required metadata file: {metadata_path}")

        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        return cls(
            name=metadata["name"],
            version=metadata["version"],
            description=metadata.get("description", ""),
            requires=metadata.get("requires", []),
            priority=metadata.get("priority", 100),
            module_path=metadata["module"],
            file_path=metadata_path,
        )

    def validate(self) -> list[str]:
        """Validate that the spec has required fields and sensible values."""
        issues: list[str] = []
        if not self.name or len(self.name) < 3:
            issues.append(f"Plugin name must be at least 3 characters, got: '{self.name}'")
        if "." not in self.module_path:
            issues.append(f"module_path must include module and class: '{self.module_path}'")
        return issues


class PluginDiscoveryService:
    """Scans directories for plugins based on metadata.json files.

    Discovery locations (checked in order, first wins):
      1. System directory: /opt/framework/plugins/
      2. User directory: ~/.config/framework/plugins/
      3. Application directory: ./plugins/
      4. Virtual environment site-packages with entry points

    Supports hot-reload: in development mode, re-scans on every registration call.
    """

    def __init__(self, search_paths: list[Path] | None = None, hot_reload: bool = False) -> None:
        self._search_paths = search_paths or [
            Path("/opt/framework/plugins"),
            Path.home() / ".config/framework/plugins",
            Path("./plugins"),
        ]
        self._hot_reload = hot_reload
        self._cache: dict[str, PluginSpec] = {}

    def discover(self) -> list[PluginSpec]:
        """Scan all configured paths and return valid plugin specs."""
        if not self._hot_reload and self._cache:
            return list(self._cache.values())

        self._cache.clear()
        for path in self._search_paths:
            if not path.exists():
                continue
            for item in sorted(path.iterdir()):
                if not item.is_dir():
                    continue
                metadata_path = item / "metadata.json"
                try:
                    spec = PluginSpec.from_metadata_file(metadata_path)
                    issues = spec.validate()
                    if not issues:
                        self._cache[spec.name] = spec
                    else:
                        print(f"Warning: Plugin '{item.name}' has validation issues: {issues}")  # noqa: T201
                except (json.JSONDecodeError, ValueError) as exc:
                    print(f"Skipping invalid plugin at {item}: {exc}")  # noqa: T201

        return list(self._cache.values())


class PluginRegistry:
    """Resolves dependencies and registers plugins in correct order.

    Dependencies are resolved using topological sort — if plugin A requires
    plugin B, plugin B is always activated before A. Cyclic dependencies
    are detected and reported as errors.
    """

    def __init__(self, discovery: PluginDiscoveryService) -> None:
        self._discovery = discovery
        self._plugins: dict[str, Any] = {}
        self._activation_order: list[str] = []

    def register_all(self) -> list[str]:
        """Discover, validate dependencies, and register all plugins.

        Returns the activation order (list of plugin names in order).
        Raises RuntimeError if any dependency is missing or circular.
        """
        specs = self._discovery.discover()
        if not specs:
            return []

        # Build dependency graph
        graph: dict[str, list[str]] = {}
        for spec in specs:
            graph[spec.name] = spec.requires

        # Topological sort with cycle detection
        order = self._topological_sort(graph, allowed=set(specs))
        if not order:
            raise RuntimeError("Cyclic dependency detected among plugins")

        # Import and instantiate plugins in order
        self._plugins.clear()
        for plugin_name in order:
            spec = next(s for s in specs if s.name == plugin_name)
            try:
                module_path, class_name = spec.module_path.rsplit(".", 1)
                module = importlib.import_module(module_path)
                plugin_class = getattr(module, class_name)
                # Instantiate with framework lifecycle manager
                from framework.extensions.manager import LifecycleManagerV2

                manager = LifecycleManagerV2()  # type: ignore[no-untyped-call]
                instance = plugin_class(manager)
                self._plugins[plugin_name] = instance
            except (ImportError, AttributeError) as exc:
                raise RuntimeError(
                    f"Failed to load plugin '{spec.name}' from {spec.module_path}: {exc}"
                ) from exc

        self._activation_order = order
        return list(order)

    def _topological_sort(
        self, graph: dict[str, list[str]], allowed: set[PluginSpec]
    ) -> list[str]:
        """Topological sort of dependency graph with cycle detection."""
        allowed_names = {s.name for s in allowed}
        visited: set[str] = set()
        temp_visited: set[str] = set()
        result: list[str] = []

        def visit(node: str) -> None:
            if node in temp_visited:
                raise RuntimeError(f"Cyclic dependency detected: {node} → ... → {node}")
            if node in visited:
                return
            temp_visited.add(node)
            for dep in graph.get(node, []):
                if dep not in allowed_names:
                    raise RuntimeError(
                        f"Plugin '{node}' requires '{dep}', which is not installed. "
                        f"Install it before activating this plugin."
                    )
                visit(dep)
            temp_visited.discard(node)
            visited.add(node)
            result.append(node)

        for node in graph:
            if node not in visited:
                visit(node)

        return result

    def get(self, name: str) -> Any | None:
        """Get a registered plugin by name."""
        return self._plugins.get(name)

    def get_by_name_or_error(self, name: str) -> Any:
        """Get a plugin or raise if not found."""
        plugin = self._plugins.get(name)
        if plugin is None:
            available = ", ".join(sorted(self._plugins.keys()))
            raise KeyError(f"Plugin '{name}' not found. Available: {available}")
        return plugin
```

### Pattern 5: Extension Authoring Guide Template with Hello World Plugin

This pattern provides a complete, copy-pasteable extension template that third-party developers can use as their starting point. The template includes project structure, metadata format, implementation, and testing instructions.

```markdown
# Extension Development Guide

## Project Structure

Create your plugin directory with this layout:

```
my-awesome-plugin/
├── metadata.json          # Plugin specification (REQUIRED)
├── pyproject.toml         # Python package configuration
└── my_plugin/
    ├── __init__.py        # Package entry point — exports Plugin class
    └── core.py            # Main implementation
```

## Step 1: Create metadata.json

```json
{
  "name": "my-awesome-plugin",
  "version": "0.1.0",
  "description": "Adds custom request transformation logic",
  "module": "my_plugin.core.MyTransformPlugin",
  "priority": 75,
  "requires": []
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Unique plugin identifier (kebab-case, minimum 3 characters) |
| `version` | Yes | Semantic version string (e.g., "1.2.0") |
| `description` | No | Human-readable description shown in plugin listings |
| `module` | Yes | Fully qualified Python path to the PluginV2 subclass |
| `priority` | No | Middleware execution order (lower = first). Default: 100 |
| `requires` | No | List of other plugin names that must be active first |

## Step 2: Implement Your Plugin

```python
# my_plugin/core.py — Complete Hello World plugin
from __future__ import annotations

from framework.extensions.v2.contracts import (
    Event,
    EventType,
    LifecycleManagerV2,
    PluginV2,
)


class MyTransformPlugin(PluginV2):
    """Simple example: adds a custom header to every request context.

    This is the MINIMUM viable plugin — it works out of the box when
    installed in a plugins directory with valid metadata.json.
    """

    @property
    def name(self) -> str:
        return "my-awesome-plugin"

    @property
    def version(self) -> str:
        return "0.1.0"

    @property
    def supported_event_types(self) -> list[EventType]:
        # Only handle REQUEST_STARTED events (most efficient)
        return [EventType.REQUEST_STARTED]

    def __init__(self, manager: LifecycleManagerV2) -> None:
        super().__init__()  # type: ignore[arg-type]
        self._manager = manager

    def on_configure(self, manager: LifecycleManagerV2) -> None:
        """Read plugin-specific configuration at startup."""
        header_value = manager.get_config("my_plugin.custom_header")
        if header_value:
            self._header_name = f"x-plugin-{header_value}"
        else:
            self._header_name = "x-plugin-transformed"

    def handle_event(self, manager: LifecycleManagerV2, event: Event) -> Any:
        """Add custom header to the request context."""
        # Context metadata is shared across the middleware pipeline
        context = event.payload.get("context")
        if hasattr(context, "set"):
            context.set(self._header_name, "processed-by-my-plugin")

        return None  # No payload modification needed
```

## Step 3: Install and Test

1. Copy your plugin directory into the framework's plugins path:
   ```bash
   cp -r my-awesome-plugin/ /opt/framework/plugins/my-awesome-plugin/
   ```

2. Verify metadata is valid:
   ```bash
   python3 -c "
   import json
   meta = json.load(open('/opt/framework/plugins/my-awesome-plugin/metadata.json'))
   print('Plugin:', meta['name'], 'v' + meta['version'])
   assert meta['module'].count('.') >= 1, 'module must include class name'
   print('✓ Metadata valid')
   "
   ```

3. Restart the framework and check logs for: `Plugin 'my-awesome-plugin' loaded successfully`

4. Send a test request and verify the custom header appears in the context metadata.

## Common Pitfalls to Avoid

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Sharing mutable state on `self` across requests | Data leaks between concurrent requests | Always use `context.set()` to store per-request data |
| Blocking calls in event handlers | Request thread pool exhaustion | Use `async def` and `await` for any I/O |
| Reading framework internals from the plugin source | Breaks on every minor version upgrade | Only interact through the LifecycleManagerV2 interface |
| Forgetting to call `super().__init__()` | Plugin state management fails | Always call super in constructor |
```

---

## Constraints

### MUST DO
- Every public extension interface must have typed method signatures with docstrings describing purpose, parameters, return types, and exceptions — no implicit contracts or "read the source" documentation (design following `code-philosophy`'s 5 Laws of Elegant Defense: data flows naturally through interfaces)
- Middleware pipelines use composable `(context, next) -> response` signatures where context metadata is the ONLY inter-handler communication mechanism — never shared mutable globals
- Extension API versions follow semantic versioning strictly: minor versions may add optional methods, major versions may change method signatures (with deprecation warnings one major version before removal)
- Provide a complete "Hello World" plugin that third-party developers can copy-paste-run without reading any internal framework source code — this is the minimum viable documentation
- Test backward compatibility via snapshot tests: register V1 plugins against a V2 framework using adapters, and assert behavior matches expected outputs
- Document the full dependency resolution order — if Plugin A requires Plugin B, B must activate first. Detect and report cyclic dependencies at registration time with clear error messages

### MUST NOT DO
- Expose internal framework objects (database connections, request/response objects, config dictionaries) directly to plugin authors — always wrap them behind a typed interface like LifecycleManagerV2
- Allow plugins to modify the middleware pipeline after bootstrap — all registrations must happen before the framework starts serving requests, preventing runtime race conditions
- Use string-based event names without type safety — define EventType enums so that typos in event names cause compile-time errors rather than silent failures at runtime
- Ship plugins that depend on global mutable state — shared caches, module-level variables, and process-wide singletons cause data leakage between concurrent requests
- Accept plugins that can bypass other middleware through direct function calls instead of going through the pipeline — all request processing must flow through the ordered chain

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-driven-design` | After designing extension surfaces, use this skill to implement IoC/DI and lifecycle hooks within your framework for internal modules |
| `framework-architecture-design` | Before designing extensions, define the overall module boundaries and layer structure that extensions will plug into |
| `composition-root` | The composition root pattern is where framework bootstrap code wires all discovered plugins into the extension pipeline |
| `hexagonal-architecture` | Extension points ARE ports — this skill provides the theoretical foundation for why extension interfaces should be protocol-based |
| `microservice-resilience-patterns` | When plugins can fail and affect the whole framework, resilience patterns (timeouts, circuit breakers) protect against plugin-induced failures |

---

## Live References

> Authoritative documentation links for framework extension design patterns.

- [Python Protocol Design — Typing Best Practices](https://typing.python.org/en/latest/spec/protocol.html)
- [Plugin Architecture Patterns — Martin Fowler](https://martinfowler.com/articles/nonOpaquePluginArchitecture.html)
- [Middleware Pipeline Patterns (Go Middleware, Express Middleware)](https://github.com/pressly/go-chi/wiki/Middleware)
- [Semantic Versioning for API Design](https://semver.org/)
- [pytest Plugin Architecture — Conftest and Hookspec Design](https://docs.pytest.org/en/latest/reference/hookspec.html)
- [OpenTelemetry SDK Extension Points (Propagators, Instrumentations)](https://opentelemetry.io/docs/specs/otel/extension/)
- [FastAPI Middleware and Dependency Injection Architecture](https://fastapi.tiangolo.com/advanced/middleware/)
