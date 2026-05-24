---
name: framework-extensibility
description: Implements middleware chains, hook registries, plugin systems, and router-based extension patterns that allow frameworks to be extended without modifying core code — inspired by FastAPI routers, Hono middleware, and NestJS interceptors.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework extensibility, middleware chain, plugin architecture, hook registry, router extension pattern, interceptor system, cross-cutting concerns, lifecycle hooks
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: framework-architecture, framework-anti-patterns
  anti_triggers: simple application, no extension needs, flat app structure, tutorial
  archetypes:
    - strategic
    - tactical
    - generation
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
---

# Framework Extensibility Systems

Implements middleware chains, hook registries, plugin systems, and router-based extension patterns that allow frameworks to be extended without modifying core code — inspired by FastAPI routers, Hono middleware stacks, NestJS interceptors, and Pydantic v2 validators.

## TL;DR Checklist

- [ ] Design middleware as closures with clear `next()` semantics (entry/exit symmetry)
- [ ] Register hooks with priority ordering for deterministic execution order
- [ ] Make plugins self-contained — each plugin owns its routes, middleware, and dependencies
- [ ] Use router-based extension over inheritance for composition-friendly APIs
- [ ] Ensure short-circuit middleware can exit the chain without calling `next()`

---

## When to Use

- Building extensibility into an application framework or platform
- Designing a plugin architecture where third-party developers will add features
- Implementing cross-cutting concerns (auth, logging, caching) via middleware stacks
- Creating interceptor/filter systems for structured error handling and response transformation

## When NOT to Use

- Simple applications with no extension needs — keep it flat
- When you need synchronous-only execution (hook registries are inherently async in modern frameworks)
- When plugins will have shared mutable state without proper isolation boundaries

---

## Core Workflow

1. **Design the Middleware Chain Architecture** — Define middleware as closures that receive a context object and a `next()` function. Each middleware can:
   - Transform request data before calling `next()`
   - Short-circuit by returning a Response directly (no `next()` call)
   - Transform response after `await next()` completes
   
   ```python
   """Middleware chain — composable, flat, with clear exit semantics."""
   
   from typing import Callable, Awaitable
   
   class Context:
       """Mutable context shared across the middleware chain."""
       
       def __init__(self, request: dict):
           self.request = request
           self.response: dict | None = None
           self._data: dict[str, Any] = {}
       
       def set(self, key: str, value: Any) -> None:
           """Attach data to context for downstream middleware/handlers."""
           self._data[key] = value
       
       def get(self, key: str, default: Any = None) -> Any:
           return self._data.get(key, default)
   
   Middleware = Callable[[Context], Awaitable[dict | None]]
   
   async def run_middleware_chain(
       middlewares: list[Middleware],
       handler: Callable[[Context], Awaitable[dict]],
       request: dict
   ) -> dict:
       """Run middleware chain synchronously — each middleware gets context + next()."""
       
       idx = 0
       async def make_next(current_idx: int) -> Callable[[], Awaitable[dict | None]]:
           async def next_fn() -> dict | None:
               nonlocal idx
               if current_idx < len(middlewares):
                   # Pass control to next middleware in chain
                   return await middlewares[current_idx](context, make_next(current_idx + 1))
               else:
                   # Reached the handler — no more middleware
                   return await handler(context)
           return next_fn
       
       context = Context(request)
       result = await make_next(0)()
       return result or {"status": "processed"}
   ```
   
   **Checkpoint:** Every middleware has clean entry (before `next()`) and exit (after `await next()`) semantics. Short-circuiting must not cause resource leaks.

2. **Implement the Hook Registry** — Create a priority-ordered event system where plugins register callbacks for lifecycle events:

   ```python
   """Hook registry with priority-based execution ordering."""
   
   import asyncio
   import bisect
   from typing import Callable, Any, Awaitable, TypedDict
   
   class HookEntry(TypedDict):
       priority: int
       callback: Callable[..., Awaitable[Any] | Any]
       name: str
   
   class HookRegistry:
       """Thread-safe, priority-ordered hook system.
       
       Plugins register callbacks for named events.
       Higher priority numbers run first (like signal handlers).
       """
       
       def __init__(self):
           self._hooks: dict[str, list[HookEntry]] = {}
       
       def register(
           self, event: str, callback: Callable, priority: int = 0
       ) -> None:
           """Register a callback for an event with execution priority."""
           if event not in self._hooks:
               self._hooks[event] = []
           
           entry: HookEntry = {
               "priority": priority,
               "callback": callback,
               "name": getattr(callback, "__name__", str(callback)),
           }
           
           # Insert by priority — bisect keeps list sorted
           bisect.insort(
               self._hooks[event],
               entry,
               key=lambda e: -e["priority"]  # Higher priority first
           )
       
       async def emit(self, event: str, **kwargs) -> dict[str, Any]:
           """Emit an event to all registered handlers.
           
           Returns a dict mapping handler names to their results.
           Errors in one handler don't prevent others from running.
           """
           results = {}
           for entry in self._hooks.get(event, []):
               try:
                   result = entry["callback"](**kwargs)
                   if asyncio.iscoroutine(result):
                       results[entry["name"]] = await result
                   else:
                       results[entry["name"]] = result
               except Exception as e:
                   results[entry["name"]] = f"ERROR: {e}"
           
           return results
   
   # === Usage: Plugins register hooks for lifecycle events ===
   
   registry = HookRegistry()
   
   # Startup hooks with priority ordering
   async def log_startup():
       print("[HOOK] Framework starting up — logging initialized")
   
   async def connect_database():
       print("[HOOK] Connecting to database...")
       return {"db": "connected"}
   
   registry.register("startup", connect_database, priority=10)    # High priority — runs first
   registry.register("startup", log_startup, priority=50)         # Highest priority — runs first
   
   # Shutdown hooks run in reverse order (cleanup before setup)
   async def close_cache():
       print("[HOOK] Disconnecting cache...")
   
   async def close_database():
       print("[HOOK] Closing database connection...")
   
   registry.register("shutdown", close_database, priority=10)
   registry.register("shutdown", close_cache, priority=5)
   
   # Emit events
   async def run_lifecycle():
       startup_results = await registry.emit("startup")  # log_startup runs first (priority 50)
       print("After startup:", startup_results)
       # ... application runs ...
       shutdown_results = await registry.emit("shutdown")  # reverse order cleanup
   
   asyncio.run(run_lifecycle())
   ```
   
   **Checkpoint:** Hook errors are caught and recorded — one failing hook never blocks the lifecycle.

3. **Build a Plugin System with Lifecycle Awareness** — Each plugin must implement a standardized interface with install, startup, shutdown, and request hooks:

   ```python
   """Plugin system — self-contained feature bundles with lifecycle management."""
   
   from abc import ABC, abstractmethod
   from typing import Any, Protocol
   
   class Plugin(Protocol):
       """All plugins must implement this interface."""
       
       @property
       def name(self) -> str:
           """Unique identifier for the plugin."""
           ...
       
       @property
       def version(self) -> str:
           """Semantic version string."""
           ...
       
       async def on_install(self, config: dict[str, Any]) -> None:
           """Called once when plugin is registered. Initialize resources from config."""
           pass
       
       async def on_startup(self) -> None:
           """Called at application startup — open connections, warm caches."""
           pass
       
       async def on_shutdown(self) -> None:
           """Called at application shutdown — close connections, persist state."""
           pass
   
   class PluginManager:
       """Manages plugin registration, installation, and lifecycle coordination."""
       
       def __init__(self):
           self._plugins: list[Plugin] = []
       
       def register(self, plugin: Plugin, config: dict[str, Any] | None = None) -> None:
           """Register a plugin with optional configuration."""
           if any(p.name == plugin.name for p in self._plugins):
               raise ValueError(f"Plugin '{plugin.name}' already registered")
           
           plugin.on_install(config or {})
           self._plugins.append(plugin)
           print(f"  [PluginManager] Registered plugin: {plugin.name} v{plugin.version}")
       
       async def startup_all(self) -> None:
           """Startup all plugins in registration order."""
           for plugin in self._plugins:
               try:
                   await plugin.on_startup()
               except Exception as e:
                   print(f"  [PluginManager] Startup failed for {plugin.name}: {e}")
       
       async def shutdown_all(self) -> None:
           """Shutdown all plugins in REVERSE registration order (LIFO cleanup)."""
           for plugin in reversed(self._plugins):
               try:
                   await plugin.on_shutdown()
               except Exception as e:
                   print(f"  [PluginManager] Shutdown failed for {plugin.name}: {e}")
   
   # === Concrete Plugin Example ===
   
   class AuthPlugin:
       """Example plugin that adds JWT authentication to the framework."""
       
       @property
       def name(self) -> str:
           return "auth-jwt"
       
       @property
       def version(self) -> str:
           return "1.0.0"
       
       async def on_install(self, config: dict[str, Any]) -> None:
           """Initialize JWT settings from plugin config."""
           self.secret_key = config.get("secret_key", "change-me-in-production")
           self.token_expiry = config.get("token_expiry", 3600)
           print(f"  [AuthPlugin] Initialized with {self.token_expiry}s token expiry")
       
       async def on_startup(self) -> None:
           """Warm up the token verification cache."""
           self._cache: dict[str, Any] = {}
           print("  [AuthPlugin] Token verification cache ready")
       
       async def on_shutdown(self) -> None:
           """Clear cached tokens."""
           self._cache.clear()
           print("  [AuthPlugin] Cache cleared on shutdown")
   
   # === Plugin Registration ===
   
   manager = PluginManager()
   manager.register(AuthPlugin(), config={"secret_key": "super-secret", "token_expiry": 7200})
   
   # Lifecycle management
   import asyncio
   async def main():
       await manager.startup_all()
       # ... app runs ...
       await manager.shutdown_all()
   
   asyncio.run(main())
   ```
   
   **Checkpoint:** Plugins are fully isolated — each plugin owns its state and never accesses another plugin's internals.

4. **Implement Router-Based Extension (FastAPI Pattern)** — The cleanest extensibility pattern: routers are first-class extension units that bundle routes, middleware, and dependencies:

   ```python
   """Router-based extension — self-contained route bundles with their own middleware."""
   
   from typing import Callable, Any
   from dataclasses import dataclass, field
   
   
   @dataclass
   class Route:
       """A single route definition."""
       method: str
       path: str
       handler: Callable
       middleware: list[Callable] = field(default_factory=list)
       tags: list[str] = field(default_factory=list)
   
   
   class Router:
       """Self-contained route bundle — can be registered independently.
       
       Routers are the cleanest extension unit because they:
       - Bundle routes with their own middleware (no shared state)
       - Support prefix mounting for namespacing
       - Can include tags for documentation organization
       - Are trivially testable as standalone units
       """
       
       def __init__(self, prefix: str = "", tags: list[str] | None = None):
           self.prefix = prefix.rstrip("/")
           self.tags = tags or []
           self._routes: list[Route] = []
           self._global_middleware: list[Callable] = []
       
       def add_route(
           self,
           method: str,
           path: str,
           handler: Callable,
           middleware: list[Callable] | None = None,
           tags: list[str] | None = None,
       ) -> None:
           """Register a route with optional per-route middleware and tags."""
           full_path = self.prefix + path
           route = Route(
               method=method.upper(),
               path=full_path,
               handler=handler,
               middleware=middleware or [],
               tags=self.tags + (tags or []),
           )
           self._routes.append(route)
       
       def api_route(self, path: str, **kwargs) -> Callable:
           """Decorator for registering API routes with auto-prefix."""
           def decorator(fn: Callable) -> Callable:
               method = kwargs.pop("methods", ["GET"])[0] if "methods" in kwargs else "GET"
               self.add_route(method, path, fn, **kwargs)
               return fn
           return decorator
   
   
   class Application:
       """Host application that mounts routers as extensions."""
       
       def __init__(self):
           self._routers: list[Router] = []
       
       def include_router(self, router: Router) -> None:
           """Mount a router — all its routes and middleware become part of the app."""
           self._routers.append(router)
       
       @property
       def all_routes(self) -> list[Route]:
           """Flatten all mounted routers into a single route list."""
           routes = []
           for router in self._routers:
               routes.extend(router._routes)
           return routes
   
   
   # === Concrete Example: Feature Module as Router ===
   
   users_router = Router(prefix="/api/v1", tags=["users"])
   
   
   @users_router.api_route("/users", methods=["GET"], tags=["user-listing"])
   async def list_users():
       return {"users": []}
   
   
   @users_router.api_route("/users", methods=["POST"], tags=["user-creation"])
   async def create_user():
       return {"id": "new-user"}
   
   
   # Mount routers in the host application
   app = Application()
   app.include_router(users_router)
   
   # All routes are discoverable
   for route in app.all_routes:
       print(f"  {route.method} {route.path} — tags: {route.tags}")
   # Output:
   #   GET /api/v1/users — tags: ['users', 'user-listing']
   #   POST /api/v1/users — tags: ['users', 'user-creation']
   ```
   
   **Checkpoint:** Routers are independently testable — you can test a router's routes without mounting it in an application.

---

## Extensibility Pattern Comparison

| Pattern | Best For | Complexity | Testability | Framework Examples |
|---------|----------|------------|-------------|-------------------|
| Middleware Chain | Request/response transformation, auth, logging | Low | High (each middleware isolated) | Hono, FastAPI |
| Hook Registry | Lifecycle events, plugin callbacks | Medium | High (events mockable) | FastAPI lifespan |
| Plugin System | Self-contained feature bundles with lifecycle | High | Very high (full isolation) | NestJS modules |
| Router Extension | Route grouping with prefix and tags | Low | Very high (standalone routers) | FastAPI APIRouter |

---

## Anti-Patterns to Avoid

### ❌ Callback Hell / Deep Nesting Anti-Pattern

Don't nest middleware chains through callback indentation — use a flat array with clear `next()` semantics:

```python
# BAD: Deep nesting, state mutations at every level, hard to debug
router.use('/api', (req, res, next) => {
  authMiddleware(req, res, () => {
    corsMiddleware(req, res, () => {
      rateLimitMiddleware(req, res, () => {
        validationMiddleware(req, res, () => {
          handleRequest(req, res);  # 5 layers deep
        });
      });
    });
  });
});

# GOOD: Flat middleware array — each has clean entry/exit
app.use([authMiddleware, corsMiddleware, rateLimitMiddleware, validationMiddleware])
app.post('/api/data', handler)  # Handler at the leaf
```

### ❌ Shared Mutable State Between Plugins

Never let plugins share mutable state without explicit isolation:

```python
# BAD: Plugin writes to shared dict — race conditions in concurrent requests
shared_context = {}

async def plugin_a_on_request():
    shared_context["user"] = await get_current_user()  # Fragile!

async def plugin_b_on_request():
    user = shared_context.get("user")  # Might be from a different request!

# GOOD: Context is per-request, passed through the chain
async def plugin_a_on_request(ctx: Context):
    ctx.set("user", await get_current_user())  # Thread-safe isolation

async def plugin_b_on_request(ctx: Context):
    user = ctx.get("user")  # Guaranteed to be from the current request
```

### ❌ Inheritance-Based Extension

Never force plugin authors to extend base classes — use protocols and composition:

```python
# BAD: Must subclass, hard to compose multiple behaviors
class BasePlugin(ABC):
    def on_install(self, config): ...
    def on_startup(self): ...  # Hard to add new lifecycle phases

class AuthPlugin(BasePlugin):  # Inherits everything — can't mix behaviors
    ...

# GOOD: Protocol-based interface — implement only what you need
class Plugin(Protocol):
    name: str
    version: str
    async def on_install(self, config): pass  # Optional with default
    async def on_startup(self): pass          # Optional with default
```

---

## Constraints

### MUST DO
- Keep middleware simple: each handles exactly one concern (auth, logging, etc.)
- Use priority-based ordering in hook registries — document the order explicitly
- Make plugins self-contained with their own routes, middleware, and state
- Mount routers with a prefix for namespacing — never pollute the root namespace
- Catch and log errors in hooks/plugins — one failure must not break the entire lifecycle

### MUST NOT DO
- Let middleware mutate request data without documenting the change in its contract
- Use global mutable state for cross-plugin communication (use context or event emissions)
- Force developers to subclass framework classes for extension (prefer protocols/decorators)
- Run synchronous blocking code inside async hooks — offload to thread pools
- Mount routers at conflicting paths — validate route uniqueness at registration time

---

## Live References

> Authoritative documentation links for framework extensibility patterns.

- [FastAPI Router Documentation](https://fastapi.tiangolo.com/tutorial/bigger-applications/) — APIRouter and module organization
- [Hono.js Middleware Guide](https://hono.dev/docs/guide/middleware) — Composable middleware with `next()` semantics
- [NestJS Interceptors](https://docs.nestjs.com/interceptors) — Request/response transformation interceptors
- [NestJS Guards and Filters](https://docs.nestjs.com/security/guards) — Authorization guards and exception filters
- [Express.js Middleware](https://expressjs.com/en/guide/using-middleware.html) — Classic middleware chain pattern
- [Python Context Managers for Lifespan](https://peps.python.org/pep-0533/) — PEP 533 async context managers for lifecycle
