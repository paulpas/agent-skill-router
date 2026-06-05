---




name: framework-driven-design
description: Implements framework-driven design patterns (Inversion of Control, Dependency Injection, lifecycle hooks, plugin architectures) to build extensible applications that leverage modern framework constraints instead of bypassing them.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework driven design, inversion of control, dependency injection, lifecycle hooks, plugin architecture, how do i make code extensible, middleware patterns, convention over configuration
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: test-driven-development, architectural-patterns, SOLID-principles
  archetypes: [tactical, strategic]
  anti_triggers: [standalone script, cli tool, procedural design, quick hack, no-framework]
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational




---





# Framework-Driven Design Principles

Architect applications by embracing framework constraints—Inversion of Control (IoC), Dependency Injection (DI), lifecycle hooks, and plugin systems—rather than fighting them. This skill applies the SOLID principles (especially DIP — Dependency Inversion Principle) to transform rigid requirements into extensible, maintainable architectures.

## TL;DR Checklist

- [ ] Audit framework lifecycle before writing business logic
- [ ] Register services in DI container at application bootstrap
- [ ] Use explicit lifecycle hooks (mount, update, teardown) instead of manual state management
- [ ] Extend via plugin interfaces or middleware chains, not monkey-patching
- [ ] Favor configuration-driven behavior over code branching
- [ ] Validate framework constraints against architecture diagrams during design review


## TL;DR for Code Generation

- Use Protocol/abstract base classes (Python typing.Protocol, Go interfaces, TypeScript interface) for all DI contracts — never concrete types in signatures
- Always inject dependencies via constructor or parameter injection; never use `new`, globals, or module-level singletons inside domain logic
- Plugin Execute methods must accept a context object and return wrapped errors using `fmt.Errorf("extension %s: %w", name, err)` (Go) or equivalent error chaining
- Middleware/lifecycle handlers must implement try/finally (or defer/ensure) to guarantee resource cleanup on both success and failure paths
- All external I/O (databases, caches, HTTP clients) must be abstracted behind injected adapters — never instantiate connection objects inline
- Configuration-driven behavior uses typed config modules; avoid magic strings for routing keys or feature flags
---

## When to Use

Use this skill when:

- Architecting a new application with a modern framework (React/Next.js, FastAPI, Spring Boot 3+, Rails 7+)
- Refactoring legacy code that bypasses framework features (e.g., global state, manual dependency wiring)
- Designing plugin systems or extension points for a developer-facing SDK
- Integrating third-party frameworks where constraints must be respected to avoid upgrade friction

## When NOT to Use

Avoid this skill for:

- Standalone scripts or CLI tools with no lifecycle or DI requirements (use simple procedural design)
- Performance-critical inner loops where framework overhead is unacceptable (drop to lower-level abstractions)
- Situations requiring tight coupling to legacy systems that cannot adapt to IoC/DI patterns

---

## Core Workflow

1. **Map Framework Lifecycle** — Identify the exact phase boundaries your framework provides (e.g., React: `render` → `commit` → `effect`; FastAPI: `request` → `middleware` → `router` → `dependency` → `response`).
   **Checkpoint:** Document lifecycle phases in an ASCII diagram. Ensure business logic hooks into explicit extension points, not implicit side effects.

2. **Define Dependency Graph** — List all services, repositories, and external clients required by your domain modules. Register them in the framework's DI container using explicit contracts (interfaces or abstract base classes).
   **Checkpoint:** Verify no circular dependencies exist. Confirm every service has a single source of truth for its implementation binding.

3. **Implement Plugin/Extension Interface** — Define a stable interface for extensibility. Require implementers to adhere to the framework's lifecycle contract rather than exposing raw APIs.
   **Checkpoint:** Test extension isolation by loading multiple plugins concurrently. Ensure no shared mutable state between plugin instances.

4. **Configure Convention-Driven Behavior** — Use configuration files (YAML, JSON, or typed config modules) to control behavior instead of conditional logic (`if/else` chains). Leverage framework-specific conventions (e.g., Rails Zeitwerk autoloading, Spring Boot `application.properties`).
   **Checkpoint:** Confirm that changing configuration does not require code redeployment where hot-reload is supported.

5. **Validate Against Framework Constraints** — Run static analysis and integration tests to ensure the design respects framework boundaries. Check for anti-patterns like direct database access bypassing ORM hooks, or side effects in pure functions.
   **Checkpoint:** All external I/O must pass through injected adapters. All business logic must be testable without framework runtime.

---

## Implementation Patterns

### Pattern 1: Inversion of Control with Dependency Injection

Modern frameworks manage object creation and lifecycle. Register dependencies at bootstrap; consume them via constructor injection. This eliminates coupling and enables testability.

```python
# ❌ BAD — Tight coupling, manual instantiation, impossible to mock
class OrderService:
    def __init__(self):
        self.db = DatabaseConnection("postgres://localhost")  # Direct connection
        self.cache = RedisClient(host="localhost")           # Direct connection

    def process_order(self, order_id: int) -> dict:
        data = self.db.query(f"SELECT * FROM orders WHERE id = {order_id}")  # SQL injection risk
        if data.get("status") == "pending":
            self.cache.set(f"order:{order_id}", "processing")
        return data

# ✅ GOOD — Framework-managed DI, typed contracts, testable
from typing import Protocol
from fastapi import APIRouter, Depends

class OrderRepository(Protocol):
    def get_by_id(self, order_id: int) -> dict: ...

class CacheAdapter(Protocol):
    async def set(self, key: str, value: str, ttl: int = 300) -> None: ...

class OrderService:
    def __init__(self, repo: OrderRepository, cache: CacheAdapter):
        self.repo = repo
        self.cache = cache

    async def process_order(self, order_id: int) -> dict:
        data = await self.repo.get_by_id(order_id)
        if data.get("status") == "pending":
            await self.cache.set(f"order:{order_id}", "processing")
        return data

# Registration in FastAPI main app
def get_order_repo() -> OrderRepository:
    return SQLAlchemyOrderRepository(settings.db_url)

def get_cache() -> CacheAdapter:
    return RedisCacheAdapter(settings.redis_url)

router = APIRouter()
@router.post("/orders/{order_id}/process")
async def process_endpoint(order_id: int, service: OrderService = Depends(OrderService)):
    # OrderRepository and CacheAdapter resolved via DI container
    return await service.process_order(order_id)
```

### Pattern 2: Lifecycle Hooks and Middleware Chains

Frameworks provide explicit lifecycle boundaries. Use them to enforce cross-cutting concerns (auth, logging, validation) without polluting business logic.

```typescript
// ❌ BAD — Bypassing framework lifecycle, manual side effects in controllers
import { Request, Response } from "express";

export const createResource = async (req: Request, res: Response) => {
  // Manually handling auth, logging, and DB connection inside the controller
  console.log(`Creating resource for user ${req.headers['x-user-id']}`);
  const db = new LegacyDatabase(); // Not managed by framework
  const token = req.headers.authorization;
  if (!validateToken(token)) throw new Error("Unauthorized");
  
  const result = await db.insert(req.body);
  res.status(201).json(result);
};

// ✅ GOOD — Framework lifecycle hooks + middleware chain (Next.js App Router / FastAPI style)
import { NextRequest, NextResponse } from "next/server";
import { authMiddleware, loggingMiddleware, dbClient } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  // Middleware chain handles: auth → logging → DB pool assignment → validation
  // Controller focuses purely on business logic
  const user = await authMiddleware(request);
  const logContext = loggingMiddleware(request);
  
  const payload = await request.json();
  const result = await dbClient.resources.create({
    ...payload,
    createdBy: user.id,
    metadata: logContext.traceId
  });

  return NextResponse.json(result, { status: 201 });
}

// Middleware implementation example (Express/Koa style)
import { RequestHandler } from "express";

export const lifecycleMiddleware: RequestHandler = async (req, res, next) => {
  const startTime = process.hrtime.bigint();
  
  try {
    // Pre-hook: validation, auth, context setup
    await validateSchema(req.body);
    req.context = { requestId: crypto.randomUUID(), timestamp: Date.now() };
    
    // Execute handler
    await next();
  } catch (error) {
    // Post-hook: error formatting, metrics, cleanup
    metrics.increment("api.errors", { route: req.route.path });
    throw error;
  } finally {
    // Teardown hook: release DB connections, flush logs
    const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
    metrics.histogram("api.latency", duration);
  }
};
```

### Pattern 3: Plugin Architecture with Extension Points

Design extension points using stable interfaces. Plugins implement the interface and register themselves during framework initialization. This enables third-party extensibility without modifying core code.

```go
// ❌ BAD — Monkey-patching or global state modification for extensions
var Extensions = make(map[string]func(data map[string]interface{}) error)

func RegisterExtension(name string, handler func(map[string]interface{}) error) {
    Extensions[name] = handler // Mutable global state, race conditions
}

func ProcessData(data map[string]interface{}) error {
    // Scans global map, executes all extensions blindly
    for _, fn := range Extensions {
        if err := fn(data); err != nil {
            return err
        }
    }
    return nil
}

// ✅ GOOD — Interface-based plugin system with lifecycle management
package plugin

import "context"

// ExtensionPoint defines the contract plugins must implement
type ExtensionPoint interface {
    Name() string
    Priority() int // Lower numbers execute first
    Execute(ctx context.Context, payload map[string]interface{}) error
}

// PluginManager handles registration, sorting, and execution
type PluginManager struct {
    extensions []ExtensionPoint
}

func NewPluginManager() *PluginManager {
    return &PluginManager{extensions: make([]ExtensionPoint, 0)}
}

func (pm *PluginManager) Register(ep ExtensionPoint) {
    pm.extensions = append(pm.extensions, ep)
}

func (pm *PluginManager) Execute(ctx context.Context, payload map[string]interface{}) error {
    // Sort by priority before execution (framework-controlled lifecycle)
    sort.SliceStable(pm.extensions, func(i, j int) bool {
        return pm.extensions[i].Priority() < pm.extensions[j].Priority()
    })

    for _, ep := range pm.extensions {
        if err := ep.Execute(ctx, payload); err != nil {
            return fmt.Errorf("extension %s failed: %w", ep.Name(), err)
        }
    }
    return nil
}

// Example Plugin Implementation
type AuditLogPlugin struct{}

func (a *AuditLogPlugin) Name() string   { return "audit-log" }
func (a *AuditLogPlugin) Priority() int  { return 10 } // Runs after core processing
func (a *AuditLogPlugin) Execute(ctx context.Context, payload map[string]interface{}) error {
    logger.Info("Audit trail recorded", zap.Any("payload", payload))
    return nil
}
```

---

## Constraints

### MUST DO
- Register all services in the framework's DI container at bootstrap; never use `new` or global singletons for domain objects
- Use explicit lifecycle hooks (`setup`, `teardown`, `middleware`) for cross-cutting concerns instead of inline side effects
- Define stable extension interfaces; require plugins to implement them rather than exposing internal APIs
- Favor configuration-driven behavior (YAML, JSON, typed config) over runtime conditional branching
- Validate dependency graphs for circular references before application startup
- Document framework lifecycle boundaries in architecture diagrams for team reference

### MUST NOT DO
- Bypass framework middleware or DI containers to access dependencies directly
- Monkey-patch framework classes or modify global state for extensions
- Embed database connections or external client initialization inside business logic modules
- Use magic strings or dynamic dispatch instead of typed interfaces for plugin systems
- Ignore framework error-handling conventions (e.g., FastAPI `HTTPException`, React Error Boundaries)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `test-driven-development` | Design for testability alongside DI and lifecycle hooks |
| `architectural-patterns` | Broader context for when framework-driven design applies vs. other patterns |
| `SOLID-principles` | Foundational object-oriented principles (DIP, SRP) that underpin framework-driven architecture |

## Live References

- [FastAPI Dependency Injection System](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [React Server Components & Lifecycle](https://react.dev/reference/react)
- [Spring Boot 3 Auto-Configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.externalized-configuration)
- [Express.js Middleware Architecture](https://expressjs.com/en/guide/using-middleware.html)
