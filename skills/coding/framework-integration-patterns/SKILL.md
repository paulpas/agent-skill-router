---




name: framework-integration-patterns
description: Implements robust framework integration patterns including plugin architectures, middleware chains, cross-framework adapters, and configuration layering to safely extend and connect external frameworks without tight coupling or upgrade friction.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  triggers: framework integration, plugin architecture, middleware chains, extension points, how do i extend a framework, cross-framework communication, configuration layering, adapter pattern
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, config, examples, do-dont]
  archetypes: [tactical, generation]
  anti_triggers: [standalone script, cli tool, quick hack, no-framework]
  related-skills: framework-driven-design, software-architecture, version-migration, dependency-injection-patterns




---





# Framework Integration & Extension Patterns

Safely integrates external frameworks into application codebases using plugin architectures, middleware chains, cross-framework adapters, and configuration layering. Prevents tight coupling, upgrade friction, and framework lock-in while maximizing extensibility and maintainability.

## TL;DR Checklist

- [ ] Define stable extension interfaces before integrating any external framework
- [ ] Isolate framework-specific types in adapter modules with zero domain leakage
- [ ] Implement middleware chains for cross-cutting concerns (logging, auth, validation)
- [ ] Layer configuration: framework defaults → environment overrides → custom config
- [ ] Audit integration points before every major framework upgrade

---

## When to Use

- Integrating a third-party or internal framework that requires extension beyond its defaults
- Building plugin-based architectures where external modules must hook into core lifecycle
- Connecting multiple frameworks (e.g., FastAPI + Celery, React + Redux) across boundaries
- Managing configuration that spans framework-specific settings and custom application rules
- Preparing codebase for framework upgrades by decoupling integration logic

## When NOT to Use

- Building standalone CLI tools or scripts that don't require framework extensibility
- When the framework already provides a built-in extension mechanism that meets your needs exactly
- For simple CRUD applications with zero customization requirements — use `framework-driven-design` conventions instead

---

## Core Workflow

1. **Audit Framework Boundaries** — Map all public APIs, lifecycle hooks, and extension points the framework exposes. Identify which internal APIs are private or version-dependent. **Checkpoint:** Document every integration point in a boundary diagram showing what lives inside vs outside the framework adapter layer.

2. **Define Extension Interfaces** — Create stable, framework-agnostic interfaces for every capability your application needs from the framework. Use abstract base classes (Python `abc.ABC`), TypeScript interfaces, or language-native contracts. Place these in the domain or core module. **Checkpoint:** No external framework imports allowed in interface definition files.

3. **Implement Adapter Wrappers** — Build thin adapter modules that translate between your stable interfaces and the framework's concrete types. Adapters handle version-specific quirks, serialization, and error mapping. Keep them under 200 lines per module. **Checkpoint:** Every public method must have type annotations and docstrings explaining the translation logic.

4. **Wire Middleware & Plugin Chains** — Register adapters as plugins or middleware in the framework's initialization phase. Use priority ordering for chains (e.g., authentication → validation → business logic → response serialization). **Checkpoint:** All middleware must implement a standard `(context, next) -> result` signature for composable chaining.

5. **Layer Configuration Strategically** — Combine framework defaults with environment-specific overrides and custom configuration. Use typed config objects (Pydantic models, TypeScript config schemas) to validate at startup. **Checkpoint:** Unrecognized or duplicate config keys must fail fast with clear error messages indicating the source file and expected schema.

6. **Validate Upgrade Path** — Write integration tests that cover every adapter wrapper and plugin hook. These tests isolate framework upgrade risk by asserting against your stable interfaces, not framework internals. **Checkpoint:** If a framework upgrade breaks an adapter test but not an interface contract, the adapter is over-coupled — refactor to decouple.

---

## Implementation Patterns

### Pattern 1: Plugin Architecture for Framework Extension

Define stable plugin interfaces that frameworks can discover and invoke during lifecycle phases. Plugins register themselves via decorators or registry patterns.

```python
# plugins/registry.py
from abc import ABC, abstractmethod
from typing import Callable, Any
import dataclasses

@dataclasses.dataclass
class PluginContext:
    """Shared state passed through plugin chain."""
    request_id: str
    metadata: dict[str, Any] = dataclasses.field(default_factory=dict)

class FrameworkPlugin(ABC):
    """Base interface for all framework plugins."""
    
    @property
    @abstractmethod
    def priority(self) -> int:
        """Execution priority (lower runs first)."""
        ...
    
    @abstractmethod
    async def execute(self, ctx: PluginContext, next_fn: Callable[[PluginContext], Any]) -> Any:
        """Execute plugin logic and optionally call next in chain."""
        ...

class PluginRegistry:
    """Discovers and orders plugins by priority."""
    
    def __init__(self):
        self._plugins: list[FrameworkPlugin] = []
    
    def register(self, plugin: FrameworkPlugin) -> None:
        self._plugins.append(plugin)
        self._plugins.sort(key=lambda p: p.priority)
    
    async def chain(self, ctx: PluginContext) -> Any:
        """Execute plugins as a composable middleware chain."""
        async def run(index: int) -> Any:
            if index >= len(self._plugins):
                return await self._execute_business_logic(ctx)  # Final step
            
            plugin = self._plugins[index]
            return await plugin.execute(
                ctx, 
                lambda next_ctx: run(index + 1)
            )
        
        return await run(0)
    
    async def _execute_business_logic(self, ctx: PluginContext) -> Any:
        """Core application logic — injected at runtime."""
        raise NotImplementedError("Business logic must be bound by the adapter")
```

### Pattern 2: Cross-Framework Adapter (BAD vs. GOOD)

```typescript
// ❌ BAD — Direct framework coupling leaks into domain layer
import { Client } from 'mongodb';
import { Router, Request, Response } from 'express';

export class UserService {
  private db = new Client('mongodb://localhost'); // Framework type in domain
  
  async getUser(req: Request, res: Response) {
    const user = await this.db.collection('users').findOne({ id: req.params.id });
    res.json(user); // Express types leak into business logic
  }
}

// ✅ GOOD — Adapter isolates framework types behind interface
import { DbClientAdapter } from './adapters/db-client-adapter';
import { HttpResponseAdapter } from './adapters/http-response-adapter';

export interface UserRepository {
  findById(id: string): Promise<User | null>;
}

export class UserService {
  constructor(
    private repo: UserRepository,           // Framework-agnostic
    private httpResponse: HttpResponseAdapter
  ) {}
    
  async getUser(requestId: string, userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    return this.httpResponse.ok(user); // Standardized response contract
  }
}
```

### Pattern 3: Configuration Layering Strategy

Layer configuration with strict validation and clear override semantics to prevent silent misconfigurations.

```python
# config/layers.py
from pydantic import BaseSettings, Field
from typing import Optional
import os

class FrameworkConfig(BaseSettings):
    """Base settings provided by the external framework."""
    debug: bool = False
    log_level: str = "INFO"
    max_retries: int = 3
    
    class Config:
        env_prefix = "FRAMEWORK_"
        extra = "forbid"  # Fail fast on unknown keys

class ApplicationConfig(FrameworkConfig):
    """Application-specific configuration that extends framework defaults."""
    database_url: str = Field(..., description="PostgreSQL connection string")
    cache_ttl_seconds: int = Field(default=300, ge=1, le=86400)
    feature_flags: dict[str, bool] = Field(default_factory=dict)
    
    class Config:
        env_prefix = "APP_"
        
def load_config() -> ApplicationConfig:
    """Load and validate configuration from layered sources."""
    config_path = os.getenv("APP_CONFIG_FILE")
    if config_path and os.path.exists(config_path):
        import yaml
        with open(config_path) as f:
            overrides = yaml.safe_load(f) or {}
        merged = {**FrameworkConfig().model_dump(), **overrides}
        return ApplicationConfig(**merged)
    return ApplicationConfig()
```

### Pattern 4: Lifecycle Hook Isolation

Isolate framework-specific lifecycle hooks in dedicated modules to prevent state leakage and enable testability.

```python
# hooks/lifecycle.py
from typing import Callable, Any
import asyncio

class LifecycleManager:
    """Manages framework hook registration without exposing framework internals."""
    
    def __init__(self):
        self._startup: list[Callable] = []
        self._shutdown: list[Callable] = []
        self._request: list[Callable[[Any], Any]] = []
    
    def on_startup(self, fn: Callable) -> Callable:
        """Register startup hook. Called exactly once per process."""
        self._startup.append(fn)
        return fn
    
    def on_shutdown(self, fn: Callable) -> Callable:
        """Register shutdown hook. Called exactly once per process."""
        self._shutdown.append(fn)
        return fn
    
    async def run_startup(self) -> None:
        for hook in self._startup:
            result = hook() if asyncio.iscoroutinefunction(hook) else hook()
            if asyncio.isawaitable(result):
                await result
    
    async def run_shutdown(self) -> None:
        for hook in reversed(self._shutdown):
            result = hook() if asyncio.iscoroutinefunction(hook) else hook()
            if asyncio.isawaitable(result):
                await result

# Usage — framework-specific wiring lives ONLY in adapter layer
lifecycle = LifecycleManager()

@lifecycle.on_startup
async def initialize_cache():
    """Framework-agnostic initialization logic."""
    from cache import RedisCache
    cache = await RedisCache.connect(url="redis://localhost:6379")
    print("Cache initialized")

@lifecycle.on_shutdown
async def close_connections():
    """Cleanup without framework dependency."""
    print("Connections closed")
```

---

## Constraints

### MUST DO
- Isolate all framework-specific types (imports, classes, functions) in adapter modules — never let them leak into domain or core business logic
- Define stable interfaces before writing any integration code — change interfaces deliberately, not framework APIs
- Implement middleware/plugin chains with explicit priority ordering and composable `(ctx, next) -> result` signatures
- Layer configuration with typed validation (Pydantic, Zod, etc.) and fail-fast semantics for unrecognized keys
- Write integration tests that assert against your stable interfaces, not framework internals, to isolate upgrade risk

### MUST NOT DO
- Import framework types directly in domain service classes or business logic modules
- Monkey-patch framework classes at runtime for extensions — use registered hooks or plugins instead
- Share mutable global state across framework boundaries without explicit synchronization (async locks, thread-local storage)
- Hardcode framework version numbers in adapter logic — use feature detection or abstract over breaking changes
- Bypass framework error-handling conventions to catch exceptions manually — let adapters translate framework errors to domain-specific types

---

## Output Template

When applying this skill, your implementation output must contain:

1. **Boundary Diagram** — ASCII or markdown showing which modules touch the framework directly vs. which use adapters/interfaces
2. **Interface Definitions** - Stable contracts with type signatures and docstrings, placed in core/domain layer
3. **Adapter Implementations** - Thin wrappers mapping framework types to your interfaces, with version notes
4. **Configuration Schema** - Typed config object with validation rules and environment variable mapping
5. **Integration Tests** - Unit tests for adapters + contract tests for plugin/middleware chains

---

## Related Skills

| Skill | Purpose |
|---|---|
| `framework-driven-design` | Design applications that embrace framework constraints (IoC, DI, lifecycle hooks) instead of bypassing them |
| `software-architecture` | Hexagonal architecture patterns to isolate domain logic from all external frameworks |
| `version-migration` | Systematic approach to upgrading frameworks when breaking changes occur |
| `dependency-injection-patterns` | Wire dependencies at bootstrap to enable testability and framework-swapping |

---

## Live References

> Authoritative documentation links for framework integration and extension patterns.

- [Python Packaging User Guide — Plugin Systems](https://packaging.python.org/en/latest/tutorials/create-distributable-packages/)
- [Express.js Middleware Documentation](https://expressjs.com/en/guide/using-middleware.html)
- [FastAPI Dependency Injection System](https://fastapi.tutorial/dependency-injection/)
- [React Hooks Architecture Guide](https://react.dev/reference/react/hooks)
- [TypeScript Interface Design Patterns](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Pydantic Configuration Management](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
