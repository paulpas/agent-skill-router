---
name: framework-utilization
description: Applies structured learning patterns and ecosystem leverage strategies to maximize a chosen framework's value while avoiding common anti-patterns like fighting conventions, premature optimization, and over-engineering.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: framework utilization, three-pass learning, leverage framework patterns, fight the framework, how do i learn a new framework, framework conventions, framework adoption, framework best practices
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - brainstorming
    - vague ideation
    - code golf
    - over-engineering
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types:
    - code
    - guidance
    - examples
    - do-dont
  related-skills: requirement-driven-selection, dependency-inversion-principle, modular-design,test-driven-development
---

# Framework Utilization and Adoption Patterns

Applies structured learning patterns and ecosystem leverage strategies to maximize a chosen framework's value while avoiding common anti-patterns like fighting conventions, over-engineering, and premature optimization. This skill makes the model guide teams through systematic framework onboarding that respects the framework's design philosophy rather than imposing external patterns onto it. The three-pass learning model (Tutorial Walkthrough → Deconstruction Exercise → Constraint Challenge) ensures real understanding before production use.

## TL;DR Checklist

- [ ] Follow the three-pass learning model: tutorial walkthrough → deconstruction exercise → constraint challenge
- [ ] Identify and map framework conventions first before exploring configuration or escape hatches
- [ ] Target Level 2-3 utilization (convention compliance + extension patterns); avoid Level 4+ unless necessary
- [ ] Audit existing code for "fighting the framework" anti-patterns: custom lifecycle managers, bypassed DI, manual event loops
- [ ] Plan phased deepening: core conventions → plugin system → advanced runtime features
- [ ] Prefer ecosystem packages over home-grown solutions whenever a well-maintained alternative exists

---

## When to Use

Use this skill when:

- A team is adopting a new framework (React, Django, Spring Boot, FastAPI, Rails, Express, etc.) and needs a structured onboarding approach
- Existing code shows signs of "fighting the framework" — custom lifecycle managers, bypassed dependency injection, or manual state management where the framework provides one
- A team has been using a framework superficially (Level 1) and needs to progress deeper without over-engineering
- Evaluating whether an extension point (middleware, hook, decorator, plugin) exists for a required capability before building it from scratch
- Refactoring legacy code to adopt framework conventions incrementally without a full rewrite

---

## When NOT to Use

Avoid this skill for:

- Selecting which framework to use — use `requirement-driven-selection` instead (that covers evaluation criteria and comparison)
- Designing system architecture at the project level — focus on application-layer convention adoption, not cross-service architecture
- Framework benchmarking or performance analysis — this skill is about effective usage patterns, not comparative measurement
- One-off scripts or throwaway prototypes where framework conventions add unnecessary overhead

---

## Core Workflow

1. **Identify Core Conventions** — Enumerate the framework's fundamental conventions (naming, file layout, lifecycle hooks, dependency injection model). Consult official documentation for the canonical structure.
   **Checkpoint:** List at least 5 core conventions before writing any code. If fewer than 3 exist, the framework may be too minimal; fall back to standard library patterns.

2. **Three-Pass Learning** — Execute the three-pass learning model in strict sequence:
   - **Pass 1 (Tutorial Walkthrough):** Follow an official tutorial end-to-end without deviation. Do not optimize, do not refactor, do not add features beyond the tutorial scope.
   - **Pass 2 (Deconstruction Exercise):** Take the tutorial result apart. Remove each framework feature one at a time and observe what breaks. Document which framework mechanisms are required versus optional.
   - **Pass 3 (Constraint Challenge):** Implement the same feature using different constraints — no decorators, no ORM, custom middleware instead of built-in auth. This reveals how deeply conventions are internalized.

3. **Map Extension Points** — For each capability your application needs beyond the tutorial:
   - Check for an official plugin/hook/middleware extension point first
   - Check ecosystem package (npm, pip, cargo, gem) second
   - Build custom implementation only as last resort
   **Checkpoint:** Every extension must be traced to a documented API surface. If no public API exists for your use case, consider whether the feature belongs in your application layer instead of the framework layer.

4. **Implement at Appropriate Level** — Start at Level 2 (convention compliance) and only progress deeper when a demonstrated need exists. Do not jump to Level 4+ features without evidence from production load testing or feature gaps.
   **Checkpoint:** Review each code file — does it use framework-provided patterns? If you wrote more than 30 lines of custom logic for something the framework handles, flag it for refactoring.

5. **Run Convention Audit** — Scan the codebase for fighting-against-conventions anti-patterns (see Implementation Patterns below). Categorize findings by severity:
   - **P0 (breaks framework behavior):** Custom lifecycle managers, bypassed DI containers, manual state management with framework state systems
   - **P1 (reduces maintainability):** Ignoring routing conventions, custom serialization instead of framework serializers
   - **P2 (opportunity for improvement):** Not using built-in middleware patterns, reinventing pagination or validation

---

## Implementation Patterns

### Pattern 1: Three-Pass Learning in Practice

The three-pass model converts tutorial consumption into genuine framework fluency. Each pass targets a different depth of understanding.

```python
"""Pass 3 — Constraint Challenge for FastAPI.
Implement the same CRUD API without FastAPI's built-in features,
revealing which parts were framework-provided vs application logic."""

from typing import List, Optional
import json

# --- Level 1: Minimal HTTP server (no framework) ---
class MinimalCRUDApp:
    """Bare HTTP server mimicking what FastAPI provides automatically."""

    def __init__(self) -> None:
        self._store: dict = {}

    def handle_request(self, method: str, path: str, body: Optional[dict] = None) -> tuple[int, dict]:
        """Route request — manual routing that FastAPI handles via decorators."""
        if method == "GET" and path.startswith("/items/"):
            item_id = path.split("/")[-1]
            item = self._store.get(item_id)
            if item is None:
                return 404, {"detail": "Not found"}
            return 200, item
        if method == "POST" and path == "/items":
            item_id = str(len(self._store))
            self._store[item_id] = body or {}
            return 201, {"id": item_id, **body}
        if method == "GET" and path == "/items":
            return 200, list(self._store.values())
        return 405, {"detail": "Method not allowed"}

# --- What FastAPI provides automatically that we manual-coded above: ---
# - Path parameter extraction from URL patterns
# - HTTP status code inference from return types
# - JSON serialization/deserialization
# - Request body parsing with Pydantic validation
# - OpenAPI schema generation
# - Automatic 404 handling for unmatched routes


"""Pass 2 — Deconstruction: Remove FastAPI features one by one.

Start with a working FastAPI app, then comment out each framework
integration point and observe what breaks. This reveals the dependency
graph between framework mechanisms."""

from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List
import uuid

# Layer 1: Pydantic models (validation + serialization)
class ItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    price: float = Field(..., gt=0)
    tax: Optional[float] = Field(None, ge=0)

class ItemOut(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    price: float
    tax: Optional[float] = None

# Layer 2: Dependency injection (lifecycle + resource management)
class ItemRepository:
    """In-memory store — in production this would be a database session."""

    def __init__(self) -> None:
        self._items: dict[str, dict] = {}

    def get(self, item_id: str) -> Optional[dict]:
        return self._items.get(item_id)

    def create(self, data: dict) -> dict:
        item_id = str(uuid.uuid4())
        self._items[item_id] = {"id": item_id, **data}
        return self._items[item_id]

    def list_all(self) -> List[dict]:
        return list(self._items.values())

async def get_repository() -> ItemRepository:
    """Dependency injection provider — FastAPI manages lifecycle."""
    repo = ItemRepository()
    try:
        yield repo
    finally:
        pass  # Would close DB connections in production


# Layer 3: Router + decorators (routing + middleware ordering)
app = FastAPI(title="Items API")

@app.post("/items", response_model=ItemOut, status_code=201)
async def create_item(
    item_data: ItemCreate,
    repo: ItemRepository = Depends(get_repository),
) -> ItemOut:
    """POST handler — FastAPI handles: route matching, body parsing,
       Pydantic validation, DI injection, response serialization."""
    created = repo.create(item_data.model_dump())
    return ItemOut(**created)

# Deconstruction experiment notes:
# - Remove Depends() → DI breaks; must manually instantiate ItemRepository
# - Remove response_model → validation still works but no auto-openapi/docs
# - Remove Pydantic model → FastAPI passes raw dict; no validation occurs
# - Remove @app.post decorator → route never registered; 404 on all requests
```

### Pattern 2: Convention Mapping — React Hooks vs Class Components

Identifying framework conventions prevents the "write a different language inside X" anti-pattern. This pattern shows how to map conventions in React and contrast convention-compliant vs fighting-against-the-convention code.

```typescript
// === Convention 1: File & naming conventions (React + TypeScript) ===
// Convention: PascalCase components, camelCase hooks, kebab-case file names for routes
// Convention: Co-locate related files: ComponentName.tsx, ComponentName.test.tsx, ComponentName.css

// === Convention 2: Hook rules — called at top level, never conditional ===
// This is React's most critical convention. Violating it causes silent state corruption.

import { useState, useEffect, useCallback, useMemo } from "react";

interface TaskListProps {
    userId: string;
}

interface Task {
    id: string;
    title: string;
    done: boolean;
}

// ✅ GOOD: Hooks called at top level in strict order. Dependencies explicit.
function TaskList({ userId }: TaskListProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
    const [loading, setLoading] = useState<boolean>(false);

    // useCallback with explicit dependency array — prevents stale closures
    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/users/${userId}/tasks`);
            const data: Task[] = await response.json();
            setTasks(data);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // useMemo for expensive derived computation — only recalculates when deps change
    const filteredTasks = useMemo(() => {
        if (filter === "all") return tasks;
        if (filter === "active") return tasks.filter(t => !t.done);
        return tasks.filter(t => t.done);
    }, [tasks, filter]);

    // Effect: only runs when userId changes — NOT on every render
    useEffect(() => {
        fetchTasks();
    }, [userId, fetchTasks]);

    const toggleTask = useCallback((taskId: string) => {
        setTasks(prev =>
            prev.map(task =>
                task.id === taskId ? { ...task, done: !task.done } : task
            )
        );
    }, []);

    if (loading) return <div className="spinner">Loading tasks...</div>;

    return (
        <div>
            <select value={filter} onChange={e => setFilter(e.target.value as typeof filter)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
            </select>
            <ul>
                {filteredTasks.map(task => (
                    <li key={task.id}>
                        <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => toggleTask(task.id)}
                        />
                        <span className={task.done ? "line-through" : ""}>{task.title}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}


// ❌ BAD: Fighting React conventions — manual state management outside hooks
class BadTaskList extends React.Component<TaskListProps, { tasks: Task[], filter: string }> {
    // Manual lifecycle management instead of useEffect
    constructor(props: TaskListProps) {
        super(props);
        this.state = { tasks: [], filter: "all" };
        this.fetchTasks = this.fetchTasks.bind(this);  // Manual bind needed
    }

    async componentDidMount() {
        // Side effect in lifecycle method — harder to test, no cleanup function
        const response = await fetch(`/api/users/${this.props.userId}/tasks`);
        this.setState({ tasks: await response.json() });
    }

    // ❌ No automatic cleanup if component unmounts during fetch
    async fetchTasks() {
        // Manual state updates scattered across methods
        const response = await fetch(`/api/users/${this.state.userId}/tasks`);
        this.setState({ tasks: await response.json() });
    }

    render() {
        // ❌ Computed values recalculated on every render — no useMemo equivalent
        const filteredTasks = this.state.tasks.filter(task => {
            if (this.state.filter === "active") return !task.done;
            if (this.state.filter === "completed") return task.done;
            return true;
        });

        // ❌ Manual event binding, verbose boilerplate, no closures
        return (
            <div>
                <button onClick={this.fetchTasks}>Refresh</button>
                {/* More manual setup... */}
            </div>
        );
    }
}
```

### Pattern 3: Extension Patterns — Middleware, Hooks, and Decorators

Every major framework provides extension points. This pattern demonstrates identifying and using them correctly versus bypassing them with custom implementations.

```python
"""Extension patterns for Python web frameworks (Django middleware / FastAPI middleware / Flask before_request).

Each example shows: ❌ BAD — custom implementation that duplicates framework logic
                     ✅ GOOD — using the framework's built-in extension mechanism"""

# --- Django Middleware Pattern ---

# ❌ BAD: Custom request handler class that bypasses Django's middleware stack
class BypassMiddlewareHandler:
    """This approach creates a separate HTTP handler entirely outside Django's
    request/response lifecycle. Hard to test, no access to Django utilities."""

    def __init__(self, get_response) -> None:
        self.get_response = get_response

    def handle(self, request):
        # ❌ Manual auth extraction — Django already provides request.user
        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return HttpResponse(status=401)

        # ❌ Manual rate limiting — Redis logic duplicated here
        # Would need connection pool, TTL management, etc.
        user_id = extract_user_from_key(api_key)
        if is_rate_limited(user_id):
            return HttpResponse(status=429)

        response = self.get_response(request)
        response["X-Request-Id"] = generate_uuid()  # ❌ After-the-fact header addition
        return response


# ✅ GOOD: Django middleware that plugs into the standard request/response cycle
import time
import uuid
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.http import HttpResponse

class RequestIdMiddleware(MiddlewareMixin):
    """Adds a unique request ID to every request/response. Uses Django's
    middleware stack — runs before and after view logic automatically."""

    def process_request(self, request) -> None:
        # ✅ Hook into the BEFORE phase — runs before view executes
        request.request_id = str(uuid.uuid4())

    def process_response(self, request, response):
        # ✅ Hook into the AFTER phase — guaranteed to run for every response
        response["X-Request-Id"] = getattr(request, "request_id", str(uuid.uuid4()))
        return response


class TimingMiddleware(MiddlewareMixin):
    """Measures request duration. Logs slow requests automatically."""

    def process_request(self, request) -> None:
        request._start_time = time.perf_counter()

    def process_response(self, request, response):
        duration = time.perf_counter() - getattr(request, "_start_time", time.perf_counter())
        if duration > settings.SLOW_REQUEST_THRESHOLD_SECONDS:  # e.g., 2.0
            import logging
            logger = logging.getLogger("django.performance")
            logger.warning(f"Slow request: {request.method} {request.path} took {duration:.3f}s")
        response["X-Request-Duration"] = f"{duration:.4f}"
        return response


# --- FastAPI Dependency Injection Pattern (alternative extension) ---

from fastapi import Request, Depends
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

# ✅ GOOD: FastAPI middleware that uses its async lifecycle properly
class TimingMiddlewareFastAPI(BaseHTTPMiddleware):
    """FastAPI-native timing middleware using the proper ASGI call pattern."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()
        response = await call_next(request)  # ✅ Properly chains to next handler
        duration = time.perf_counter() - start
        response.headers["X-Request-Duration"] = f"{duration:.4f}"
        return response


# --- Python Decorator Pattern (generic, framework-agnostic extension) ---

def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    backoff_factor: float = 2.0,
) -> callable:
    """Framework-agnostic decorator for retrying flaky operations.
    Works as a universal extension pattern applicable across frameworks."""

    def decorator(func: callable) -> callable:
        import functools
        import asyncio

        @functools.wraps(func)  # ✅ Preserves function metadata (name, docstring)
        async def async_wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as exc:
                    if attempt == max_retries:
                        raise
                    delay = base_delay * (backoff_factor ** attempt)
                    await asyncio.sleep(delay)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as exc:
                    if attempt == max_retries:
                        raise
                    delay = base_delay * (backoff_factor ** attempt)
                    time.sleep(delay)

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


# Usage example — applies universally across any framework
@retry_with_backoff(max_retries=3, base_delay=0.5)
async def fetch_external_data(url: str) -> dict:
    """This function works identically whether called from Flask, FastAPI, Django, or standalone."""
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.json()
```

### Pattern 4: Phased Deepening — Level Progression with Code

Framework mastery follows a natural progression. Each level has concrete code that demonstrates the depth of framework integration.

```typescript
/** Level 1 — Barely Using the Framework (Tutorial Phase)
 * Typical after following a tutorial for the first time.
 * Uses framework syntax but applies no conventions. */

// ❌ LEVEL 1: React component that treats JSX as templating sugar
function UserList_L1({ users }: { users: Array<{ id: number; name: string }> }) {
    // ❌ No custom hooks, no context, no memoization
    // ❌ Inline styles (framework convention for performance is CSS modules/tailwind)
    // ❌ Key prop missing — React will warn about this
    return (
        <div>
            <h1>Users</h1>
            {users.map(function(user) {  // ❌ Function expression instead of arrow function
                return (
                    <div style={{border: "1px solid #ccc", padding: "8px"}}>
                        <span>{user.name}</span>
                        {/* No key prop — React optimization anti-pattern */}
                    </div>
                );
            })}
        </div>
    );
}

// ✅ LEVEL 2: Convention-Compliant (After 3-pass learning)
import { useState, useMemo, useCallback } from "react";

interface UserListProps {
    users: Array<{ id: number; name: string }>;
    onUserClick?: (id: number) => void;
}

/** Custom hook encapsulates user filtering logic — framework convention for reusability */
function useFilteredUsers(users: UserListProps["users"], filter: string) {
    return useMemo(() => {
        if (!filter) return users;
        const lower = filter.toLowerCase();
        return users.filter(user => user.name.toLowerCase().includes(lower));
    }, [users, filter]);
}

export function UserList({ users, onUserClick }: UserListProps): JSX.Element {
    const [searchTerm, setSearchTerm] = useState("");
    const filteredUsers = useFilteredUsers(users, searchTerm);

    const handleClick = useCallback((id: number) => {
        onUserClick?.(id);
    }, [onUserClick]);

    return (
        <section className="user-list">
            <h2>Users</h2>
            <input
                type="text"
                placeholder="Filter users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search users"
            />
            <ul role="list">
                {filteredUsers.map(user => (
                    <li key={user.id}>  {/* ✅ Key prop correct — stable, unique identifier */}
                        <button onClick={() => handleClick(user.id)}>
                            {user.name}
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

// ✅ LEVEL 3: Extension Point Usage (Plugin/Context pattern)
import { createContext, useContext } from "react";

/** Context — framework's built-in dependency injection for deep prop drilling */
interface UserContextValue {
    selectedUserId: number | null;
    setSelectedUserId: (id: number | null) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

function useUserContext(): UserContextValue {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUserContext must be used within UserProvider");
    return ctx;
}

/** Higher-level component that provides context — composition over inheritance */
export function UserListWithProvider({ users, onUserClick }: UserListProps): JSX.Element {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const filteredUsers = useFilteredUsers(users, "");

    return (
        <UserContext.Provider value={{ selectedUserId, setSelectedUserId }}>
            <section className="user-list">
                <h2>Users</h2>
                {filteredUsers.map(user => (
                    <li key={user.id}>
                        <button onClick={() => setSelectedUserId(user.id)}>
                            {user.name}
                        </button>
                    </li>
                ))}
            </section>
        </UserContext.Provider>
    );
}

// ✅ LEVEL 4+: Advanced Runtime Integration (React Server Components / Suspense)
import { Suspense } from "react";
import { getUserData, type UserData } from "@/api/users";

/** Server component pattern — data fetching at render time, framework manages caching */
async function UserDetailClient({ userId }: { userId: string }) {
    const userData = await getUserData(userId);
    return (
        <article>
            <h3>{userData.name}</h3>
            <p>{userData.email}</p>
        </article>
    );
}

export function UserDetail({ userId }: { userId: string }): JSX.Element {
    /** Suspense boundary — framework handles loading state automatically */
    return (
        <Suspense fallback={<div className="skeleton" />}>
            <UserDetailClient userId={userId} />
        </Suspense>
    );
}

// Level summary:
// L1 = Framework syntax only, no conventions used
// L2 = Convention compliance — hooks, memoization, accessibility, stable keys
// L3 = Extension patterns — Context for cross-cutting concerns, composition for reuse
// L4+ = Runtime features — Server components, Suspense, streaming SSR, framework-native caching
```

### Pattern 5: Ecosystem Leverage — Package Selection Strategy

The most productive teams maximize reuse. This pattern provides a decision framework for when to use ecosystem packages vs building custom solutions.

```python
"""Ecosystem leverage strategy with concrete implementation examples.
Shows how to evaluate and integrate existing packages versus building from scratch."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class PackageCandidate(Protocol):
    """Criteria for evaluating whether an ecosystem package is worth adopting."""
    name: str
    downloads_monthly: int
    last_updated_days_ago: int
    has_type_stubs: bool
    has_comprehensive_tests: bool


def evaluate_package(candidate: PackageCandidate, need: str) -> tuple[bool, float]:
    """Score a package candidate (0.0 = don't adopt, 1.0 = definitely adopt).

    Scoring criteria:
    - Monthly downloads > 100k: +0.25 (proven adoption)
    - Updated within 90 days: +0.20 (actively maintained)
    - Has type stubs: +0.15 (developer experience)
    - Tests > 80% coverage: +0.15 (quality assurance)
    - Solves the exact need: +0.25 (direct fit)
    """
    score = 0.0

    if candidate.downloads_monthly > 100_000:
        score += 0.25
    elif candidate.downloads_monthly > 10_000:
        score += 0.10

    if candidate.last_updated_days_ago <= 90:
        score += 0.20
    elif candidate.last_updated_days_ago <= 365:
        score += 0.05

    if candidate.has_type_stubs:
        score += 0.15
    if candidate.has_comprehensive_tests:
        score += 0.15

    # Direct need match — highest weight
    score += 0.25

    return (score >= 0.7, round(score, 2))


# === Concrete Ecosystem Examples ===

# Example 1: Date parsing — use dateutil.parser over home-grown regex
from datetime import datetime
from dateutil import parser as dateutil_parser  # ✅ Third-party: battle-tested, handles edge cases

def parse_user_timestamp(raw_input: str) -> datetime:
    """Parse user-supplied timestamps with ecosystem leverage."""
    # ❌ BAD: Home-grown parsing that misses edge cases (RFC 2822, ISO 8601 variants)
    # if "T" in raw_input:
    #     return datetime.fromisoformat(raw_input)
    # elif "/" in raw_input:
    #     return datetime.strptime(raw_input, "%m/%d/%Y")

    # ✅ GOOD: dateutil.parser handles 50+ date formats automatically
    try:
        return dateutil_parser.parse(raw_input)
    except (ValueError, TypeError) as exc:
        raise ValueError(f"Unparseable timestamp: {raw_input!r}") from exc


# Example 2: HTTP client — use httpx over requests for async, or httpx sync for simplicity
import httpx

class APIClient:
    """Framework-agnostic API client leveraging httpx ecosystem."""

    def __init__(self, base_url: str, timeout: float = 30.0) -> None:
        self.base_url = base_url.rstrip("/")
        self._timeout = timeout
        # httpx handles connection pooling, retries (with extension), and both sync/async
        self._client = httpx.Client(base_url=self.base_url, timeout=self._timeout)

    def get(self, path: str, params: dict | None = None) -> dict:
        response = self._client.get(path, params=params)
        response.raise_for_status()
        return response.json()

    def post(self, path: str, data: dict) -> dict:
        response = self._client.post(path, json=data)
        response.raise_for_status()
        return response.json()


# Example 3: Validation — use pydantic over hand-written validators
from pydantic import BaseModel, field_validator, EmailStr

class CreateUserRequest(BaseModel):
    """Leverages Pydantic's built-in validation instead of manual checks."""
    username: str
    email: EmailStr
    age: int

    @field_validator("username")
    @classmethod
    def username_not_reserved(cls, v: str) -> str:
        reserved = {"admin", "root", "system", "null"}
        if v.lower() in reserved:
            raise ValueError(f"Username {v!r} is a reserved name")
        return v


# Example 4: Caching — use functools.lru_cache or cachetools over custom dict cache
from functools import lru_cache
from typing import Any

@lru_cache(maxsize=256)
def get_cached_config(section: str, key: str) -> Any:
    """Framework-agnostic caching using standard library.
    No custom cache implementation needed for simple use cases."""
    # Simulate expensive config loading
    import time
    time.sleep(0.1)  # Pretend this is a DB or file read
    return {"section": section, "key": key}
```

---

## Constraints

### MUST DO

- Follow the three-pass learning model in strict order: tutorial walkthrough, then deconstruction exercise, then constraint challenge — never skip Pass 2
- Map at least 5 core conventions of any new framework before writing application code — consult official documentation, not blog posts
- Start implementation at Level 2 (convention compliance) and only progress to Levels 3-4 when production requirements demand it
- Audit codebase quarterly for "fighting the framework" anti-patterns using the P0/P1/P2 severity scale defined in Core Workflow Step 5
- Prefer ecosystem packages over home-grown solutions — run `evaluate_package()` criteria before building custom implementations
- Use framework-provided extension points (middleware, hooks, decorators, plugins) as the primary mechanism for cross-cutting concerns
- Document which framework features you chose to bypass and why — this becomes part of your team's architectural knowledge

### MUST NOT DO

- Build a custom lifecycle manager that bypasses the framework's built-in lifecycle — every framework has one designed to handle edge cases you cannot anticipate
- Implement manual dependency injection when the framework provides a DI container or injection mechanism (FastAPI Depends, Spring @Autowired, Angular injectable)
- Create custom event loops for frameworks that provide async handling (FastAPI uvloop, Django channels, Express middleware chain)
- Over-engineer with abstraction layers "just in case" — follow YAGNI: abstract only when a real second use case exists
- Ignore framework-provided serializers/deserializers in favor of hand-written JSON encoding/decoding
- Copy-paste code from Stack Overflow or blog posts without understanding which part is framework convention and which part is custom logic

---

## Output Template

When applying this skill, produce the following structured output:

1. **Convention Map** — Enumerated list of at least 5 core conventions for the target framework, with official documentation links
2. **Three-Pass Report** — Summary of what was learned in each pass, especially findings from Pass 2 (deconstruction) about which features are required vs optional
3. **Level Assessment** — Current team/framework utilization level (1-4+) with concrete code evidence for the classification
4. **Anti-Pattern Audit Results** — Table of detected "fighting the framework" issues categorized by P0/P1/P2 severity, each with a refactoring suggestion
5. **Extension Point Map** — For each required capability, show: (a) official extension point used, (b) ecosystem package considered and why accepted/rejected, (c) custom implementation if built as last resort
6. **Deepening Roadmap** — Prioritized list of framework features to adopt next, ordered by impact on productivity vs effort to learn

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `requirement-driven-selection` | Framework selection — use this BEFORE choosing a framework; use this skill AFTER selection |
| `dependency-inversion-principle` | Decouples application logic from framework specifics for easier testing and migration |
| `modular-design` | Complementary to framework adoption — ensures modular architecture within the framework |
| `test-driven-development` | Test-first development works with any framework; apply TDD discipline during three-pass learning |

---

## Live References

> Authoritative documentation links for framework utilization patterns. The model follows markdown links at load time to resolve external references and inline content.

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [React Official Documentation](https://react.dev/)
- [Django Documentation](https://docs.djangoproject.com/)
- [Spring Framework Reference](https://docs.spring.io/spring-framework/reference/)
- [Express.js Guide](https://expressjs.com/)
- [Python Decorator Design Patterns](https://realpython.com/primer-on-python-decorators/)
- [Software Architecture: The Hard Parts](https://softwarearchitectstuff.com/)
