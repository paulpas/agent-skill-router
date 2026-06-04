---
name: deduplication-patterns
description: Applies DRY-driven deduplication patterns (extract method, template method, strategy, factory, mixins, memoization, configuration consolidation) to eliminate copy-paste clones, boilerplate, and semantic duplication in codebases.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dry principle, don't repeat yourself, code deduplication, extract method, template method, strategy pattern, boilerplate removal, code reuse pattern
  archetypes:
    - tactical
    - diagnostic
  anti_triggers:
    - brainstorming
    - vague ideation
    - feature planning
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: refactoring-techniques,code-duplication-detection,yagni,dry-principles,single-responsibility
---

# Deduplication Patterns (DRY in Practice)

Applies DRY-driven deduplication patterns to eliminate copy-paste clones, boilerplate, and semantic duplication. This skill teaches how to diagnose the type of repetition present, choose the correct extraction strategy, and refactor safely with behavioral equivalence guarantees. It is grounded in the DRY principle: every piece of knowledge must have a single, unambiguous, authoritative representation within a system.

## TL;DR Checklist

- [ ] Classify duplication as copy-paste clone, boilerplate, or semantic equivalence before choosing a pattern
- [ ] Verify duplicated code changes in more than one feature iteration — do not deduplicate stable, single-use paths
- [ ] Select extraction strategy matching the duplication characteristics (see Pattern Selection Guide)
- [ ] Run the existing test suite after every extraction to confirm behavioral equivalence
- [ ] Prefer composition over inheritance when sharing behavior across classes
- [ ] Extract only when a third caller exists — two callers are a coincidence, three is a pattern
- [ ] Ensure the extracted abstraction has a name that describes intent, not mechanics

---

## When to Use

Use this skill when:

- You find identical or near-identical code blocks in two or more locations that you are already touching
- Multiple functions share the same parameter list structure and compute different parts of the same domain logic
- Subclasses implement the same algorithm skeleton with only a few steps differing
- Object creation logic is duplicated across multiple factories, builders, or services
- Configuration constants, defaults, or thresholds are scattered across files making coordinated changes error-prone
- Multiple callers independently recompute the same expensive result (memoization opportunity)

---

## When NOT to Use

Avoid this skill for:

- **Code touched in only one feature iteration** — premature abstraction creates overhead before you know if the code will persist. Wait until it is needed a third time.
- **Domain concepts that are genuinely different but superficially similar** — e.g., two "calculate total" functions that operate on fundamentally different domains (order totals vs. cart totals) should stay separate until their convergence is proven across multiple feature iterations.
- **Test fixtures and test setup code** — tests benefit from isolation and readability; duplicated setup in tests often aids understandability. Deduplicate production code first.
- **One-off scripts or throwaway prototypes** — the cost of abstraction outweighs its benefit when the code's lifetime is days, not months.
- **Code that would require deep knowledge of a different layer to use the abstraction** — if extracting a function forces callers to pass in dependencies they do not understand, you have over-extracted.

---

## Core Workflow

A six-step diagnostic workflow for applying DRY deduplication safely and effectively.

1. **Scan for duplication clusters.** Search the codebase for blocks sharing >70% token overlap across ≥2 locations. Use tooling: `ctags`/`agrep` for structural clones, or semantic diff tools for boilerplate. **Checkpoint:** You must identify at least 2 locations with meaningful overlap before proceeding.

2. **Classify the duplication type.** Determine whether the duplication is a copy-paste clone (identical code copied verbatim), boilerplate (structurally similar with minor parameter/value variations), or semantic equivalence (same intent, completely different implementation). This classification dictates which pattern to use. **Checkpoint:** Label each cluster as `clone`, `boilerplate`, or `semantic` — do not skip this step.

3. **Assess change frequency.** Examine git history: has the duplicated code been modified in >1 feature iteration or pull request at different locations? If yes, deduplication will prevent future inconsistency. If no (both copies changed identically because someone updated both), defer. **Checkpoint:** Confirm the duplication causes at least one past inconsistency or a plausible future risk before investing in extraction.

4. **Select the extraction strategy.** Use the pattern selection guide below to match the duplication type and context to a specific pattern. Do not apply Extract Function by default — template method, strategy, or factory may be more appropriate. **Checkpoint:** Justify your pattern choice against the duplication classification from Step 2.

5. **Extract and refactor call sites.** Apply the chosen pattern. Extract the common code into the new abstraction. Update all callers to use it. Keep the refactoring in a single atomic commit. **Checkpoint:** The test suite must pass before you proceed — this confirms behavioral equivalence.

6. **Validate with integration scenarios.** Run the full test suite including integration and end-to-end tests. Verify that no regression was introduced at the call-site boundaries (edge cases may behave differently under the new abstraction). **Checkpoint:** All tests pass, including edge-case coverage for each original code path.

---

## Pattern Selection Guide

| Duplication Type | Context | Recommended Pattern |
|---|---|---|
| Copy-paste clone | Same logic in multiple functions | Extract Function/Method |
| Boilerplate with varying branches | Similar logic, different conditions | Strategy Pattern |
| Subclasses with same skeleton | Inheritance hierarchy shares steps | Template Method Pattern |
| Duplicated construction logic | Multiple places create the same object type | Factory Pattern |
| Repeated behavior across unrelated classes | No shared base class | Mixins / Composition |
| Redundant expensive computation | Same function called multiple times | Memoization / Caching Layer |
| Scattered constants and defaults | Configuration spread across files | Configuration Consolidation |
| Repeating parameter lists | Functions with identical argument signatures | Parameter Object / Data Class |

---

## Implementation Patterns

### Pattern 1: Extract Function / Method

The foundational deduplication technique. When two or more functions contain the same sequence of operations, extract them into a named function. This is the first pattern to try — it is the simplest transformation and applies to the widest range of duplication.

**Transformation rule:** Find ≥2 code blocks with identical operations → Extract into a function whose name describes intent → Replace each block with a call to that function → Verify tests pass.

```python
# ❌ BAD: Login validation duplicated in two authentication endpoints
def authenticate_web(user_input: dict) -> tuple[bool, str]:
    username = user_input.get("username", "")
    password = user_input.get("password", "")

    if not username or not password:
        return False, "Missing credentials"
    if len(username) < 3 or len(username) > 64:
        return False, "Invalid username length"
    if len(password) < 8:
        return False, "Password too short"
    # ... authentication logic ...
    return True, "Success"


def authenticate_api(user_input: dict) -> tuple[bool, str]:
    username = user_input.get("username", "")
    password = user_input.get("password", "")

    if not username or not password:
        return False, "Missing credentials"
    if len(username) < 3 or len(username) > 64:
        return False, "Invalid username length"
    if len(password) < 8:
        return False, "Password too short"
    # ... authentication logic ...
    return True, "Success"


# ✅ GOOD: Shared validation extracted into a single function
def validate_credentials(user_input: dict) -> tuple[bool, str]:
    """Validate username and password format according to policy.

    Returns (is_valid, error_message). If valid, error_message is empty.
    """
    username = user_input.get("username", "")
    password = user_input.get("password", "")

    if not username or not password:
        return False, "Missing credentials"
    if len(username) < 3 or len(username) > 64:
        return False, "Invalid username length"
    if len(password) < 8:
        return False, "Password too short"
    return True, ""


def authenticate_web(user_input: dict) -> tuple[bool, str]:
    is_valid, error_msg = validate_credentials(user_input)
    if not is_valid:
        return False, error_msg
    # ... web-specific authentication logic ...
    return True, "Success"


def authenticate_api(user_input: dict) -> tuple[bool, str]:
    is_valid, error_msg = validate_credentials(user_input)
    if not is_valid:
        return False, error_msg
    # ... API-specific authentication logic ...
    return True, "Success"
```

**When to apply:** When you find identical code blocks (or blocks differing only in minor literals) across two or more functions. This is the most common and highest-ROI pattern.

---

### Pattern 2: Parameter Object / Data Class

When multiple functions share an identical (or near-identical) parameter list, bundle those parameters into a single data object. This reduces signature duplication, makes it easy to add new parameters without updating every call site, and improves readability.

**Transformation rule:** Functions with the same N+ parameter types → Create a data class/dict holding those parameters → Replace each function's parameters with the single data object → Update call sites.

```python
# ❌ BAD: Repeated long parameter lists across report generation functions
def generate_sales_report(
    start_date: datetime,
    end_date: datetime,
    region: str,
    currency: str,
    include_taxes: bool,
    format_type: str,
) -> str: ...

def generate_inventory_report(
    start_date: datetime,
    end_date: datetime,
    region: str,
    currency: str,
    include_taxes: bool,
    format_type: str,
) -> str: ...

def generate_shipping_report(
    start_date: datetime,
    end_date: datetime,
    region: str,
    currency: str,
    include_taxes: bool,
    format_type: str,
) -> str: ...


# ✅ GOOD: Shared parameters extracted into a ReportConfig data class
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ReportConfig:
    """Parameters shared across all report generation functions."""
    start_date: datetime
    end_date: datetime
    region: str
    currency: str = "USD"
    include_taxes: bool = False
    format_type: str = "pdf"


def generate_sales_report(config: ReportConfig) -> str:
    """Generate a sales report using the provided configuration."""
    # ... uses config.start_date, config.region, etc. ...
    return f"Sales report for {config.region} ({config.currency})"


def generate_inventory_report(config: ReportConfig) -> str:
    """Generate an inventory report using the provided configuration."""
    return f"Inventory report for {config.region}"


def generate_shipping_report(config: ReportConfig) -> str:
    """Generate a shipping report using the provided configuration."""
    return f"Shipping report for {config.region}"
```

**When to apply:** When 3+ functions share ≥4 identical parameters, or when adding new parameters requires editing every function signature. Also useful when parameters form a coherent domain concept (e.g., filter criteria, query options).

**Cross-language note (TypeScript):** The same principle applies — use an interface or type alias for the parameter object:

```typescript
// ❌ BAD: Repeated long parameter lists
function sendEmail(to: string, subject: string, body: string, cc?: string[], bcc?: string[]): void { ... }
function sendNotification(to: string, subject: string, body: string, cc?: string[], bcc?: string[]): void { ... }

// ✅ GOOD: Parameter object via interface
interface MessageConfig {
  to: string;
  subject: string;
  body: string;
  cc?: string[];
  bcc?: string[];
}

function sendEmail(config: MessageConfig): void { ... }
function sendNotification(config: MessageConfig): void { ... }
```

---

### Pattern 3: Template Method Pattern

When multiple subclasses implement the same algorithm skeleton but differ in one or more steps, extract the skeleton into an abstract base class and defer the varying steps to hook methods. This eliminates duplication in the invariant parts of the algorithm.

**Transformation rule:** Subclasses share the same sequence of operations with a few differing steps → Define the skeleton in an abstract base class → Move common logic to a template method → Make differing steps abstract or overridable hooks → Verify subclass behavior is preserved.

```python
# ❌ BAD: Report generation subclasses duplicate setup and teardown
class SalesReport(Report):
    def generate(self) -> str:
        # Common boilerplate duplicated in every subclass
        self._connect_database()
        self._validate_permissions()
        data = self._fetch_sales_data()
        output = self._format_sales(data)
        self._send_report(output)
        self._disconnect_database()
        return output

    def _fetch_sales_data(self) -> list[dict]: ...
    def _format_sales(self, data: list[dict]) -> str: ...


class InventoryReport(Report):
    def generate(self) -> str:
        # Same boilerplate duplicated again
        self._connect_database()
        self._validate_permissions()
        data = self._fetch_inventory_data()
        output = self._format_inventory(data)
        self._send_report(output)
        self._disconnect_database()
        return output

    def _fetch_inventory_data(self) -> list[dict]: ...
    def _format_inventory(self, data: list[dict]) -> str: ...


class ShippingReport(Report):
    def generate(self) -> str:
        # Same boilerplate yet again
        self._connect_database()
        self._validate_permissions()
        data = self._fetch_shipping_data()
        output = self._format_shipping(data)
        self._send_report(output)
        self._disconnect_database()
        return output

    def _fetch_shipping_data(self) -> list[dict]: ...
    def _format_shipping(self, data: list[dict]) -> str: ...


# ✅ GOOD: Template method extracts the invariant skeleton
from abc import ABC, abstractmethod


class Report(ABC):
    """Abstract base class with the report generation template method."""

    def generate(self) -> str:
        """Template method: defines the fixed algorithm skeleton.

        Subclasses must implement _fetch_data and _format_output.
        """
        self._connect_database()
        try:
            self._validate_permissions()
            data = self._fetch_data()
            output = self._format_output(data)
            self._send_report(output)
            return output
        finally:
            self._disconnect_database()

    def _connect_database(self) -> None: ...  # concrete (same for all)
    def _validate_permissions(self) -> None: ...  # concrete
    def _disconnect_database(self) -> None: ...  # concrete

    @abstractmethod
    def _fetch_data(self) -> list[dict]:
        """Override to fetch domain-specific data."""
        ...

    @abstractmethod
    def _format_output(self, data: list[dict]) -> str:
        """Override to format domain-specific output."""
        ...


class SalesReport(Report):
    def _fetch_data(self) -> list[dict]:
        return self._query_sales_table()

    def _format_output(self, data: list[dict]) -> str:
        return f"Sales Report:\n{self._render_html(data)}"


class InventoryReport(Report):
    def _fetch_data(self) -> list[dict]:
        return self._query_inventory_table()

    def _format_output(self, data: list[dict]) -> str:
        return f"Inventory Report:\n{self._render_html(data)}"
```

**When to apply:** When you have an inheritance hierarchy where multiple subclasses share the same algorithm flow but differ in specific steps. The key signal is: if deleting the boilerplate code from any subclass would leave a minimal override, template method is appropriate.

---

### Pattern 4: Strategy Pattern

When conditional logic (if/else or switch/case) duplicates the same high-level operation with different algorithms for different cases, replace it with interchangeable strategy objects. This eliminates scattered conditional branches and makes new variants addable without modifying existing code.

**Transformation rule:** Multiple if/else branches performing the same high-level operation differently → Define a common strategy interface → Implement each branch as a strategy class → Delegate to the selected strategy → New branches are new strategy classes, not new conditionals.

```python
# ❌ BAD: Pricing logic duplicated across conditional branches
def calculate_discount(order: dict) -> float:
    """Calculate discount based on customer tier using conditional duplication."""
    tier = order.get("customer_tier", "standard")
    subtotal = order.get("subtotal", 0.0)

    if tier == "standard":
        return subtotal * 0.05
    elif tier == "gold":
        # Same structure, different formula — duplicated condition logic
        return subtotal * 0.10
    elif tier == "platinum":
        # More of the same pattern repetition
        return subtotal * 0.15
    elif tier == "vip":
        return subtotal * 0.25
    else:
        raise ValueError(f"Unknown tier: {tier}")


def apply_shipping_rate(order: dict) -> float:
    """Shipping calculation with the same conditional duplication pattern."""
    tier = order.get("customer_tier", "standard")
    weight = order.get("weight_kg", 0.0)

    if tier == "standard":
        return weight * 5.0
    elif tier == "gold":
        # Same conditional structure, different values — boilerplate duplication
        return weight * 4.0
    elif tier == "platinum":
        return weight * 3.0
    elif tier == "vip":
        return weight * 2.0
    else:
        raise ValueError(f"Unknown tier: {tier}")


# ✅ GOOD: Strategy pattern eliminates conditional duplication
from abc import ABC, abstractmethod
from typing import Protocol


class DiscountStrategy(Protocol):
    """Protocol defining the discount calculation interface."""
    def calculate(self, subtotal: float) -> float: ...


class StandardDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.05


class GoldDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.10


class PlatinumDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.15


class VipDiscount:
    def calculate(self, subtotal: float) -> float:
        return subtotal * 0.25


# Mapping replaces the conditional branch entirely
DISCOUNT_STRATEGIES: dict[str, DiscountStrategy] = {
    "standard": StandardDiscount(),
    "gold": GoldDiscount(),
    "platinum": PlatinumDiscount(),
    "vip": VipDiscount(),
}


def calculate_discount(order: dict) -> float:
    """Calculate discount by delegating to the appropriate strategy.

    Adding a new tier only requires adding a new class and a mapping entry —
    no conditional branch modification needed.
    """
    tier = order.get("customer_tier", "standard")
    strategy = DISCOUNT_STRATEGIES.get(tier)
    if strategy is None:
        raise ValueError(f"Unknown tier: {tier}")
    return strategy.calculate(order["subtotal"])


# Shipping can use the same pattern with a different strategy family
class ShippingStrategy(Protocol):
    def calculate(self, weight_kg: float) -> float: ...


class StandardShipping:
    def calculate(self, weight_kg: float) -> float:
        return weight_kg * 5.0


class GoldShipping:
    def calculate(self, weight_kg: float) -> float:
        return weight_kg * 4.0


SHIPPING_STRATEGIES: dict[str, ShippingStrategy] = {
    "standard": StandardShipping(),
    "gold": GoldShipping(),
}
```

**When to apply:** When you have a family of interchangeable algorithms (discount rules, payment processors, notification channels) selected by a discriminator (tier, provider, channel type). Also applies when new variants are expected — the strategy pattern makes addition O(1) with no existing code modification.

---

### Pattern 5: Factory Pattern for Object Creation

When object construction logic is duplicated across multiple locations (with varying arguments or conditional creation), centralize it in a factory method or factory class. This ensures consistent initialization, simplifies testing via mock factories, and makes it easy to swap implementation types.

**Transformation rule:** Multiple places construct the same type with similar logic → Create a factory function or class → Centralize construction logic → Replace all direct instantiation calls with factory calls.

```python
# ❌ BAD: Database connection creation duplicated across services
class ReportService:
    def __init__(self):
        self.db = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="production",
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            connect_timeout=10,
            options="-c statement_timeout=30000",
        )

class AnalyticsService:
    def __init__(self):
        self.db = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="production",
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            connect_timeout=10,
            options="-c statement_timeout=30000",
        )

class ExportService:
    def __init__(self):
        self.db = psycopg2.connect(
            host="localhost",
            port=5432,
            dbname="production",
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            connect_timeout=10,
            options="-c statement_timeout=30000",
        )


# ✅ GOOD: Factory centralizes connection creation logic
from dataclasses import dataclass
import os
import psycopg2
from typing import Optional


@dataclass(frozen=True)
class DatabaseConfig:
    host: str = "localhost"
    port: int = 5432
    dbname: str = "production"
    user_env_var: str = "DB_USER"
    password_env_var: str = "DB_PASSWORD"
    connect_timeout: int = 10
    statement_timeout_ms: int = 30_000


def create_database_connection(config: Optional[DatabaseConfig] = None) -> psycopg2.extensions.connection:
    """Create a database connection with standardized configuration.

    Centralizes connection parameters so that changing the default host,
    timeout settings, or pool behavior requires modification in exactly one place.
    """
    cfg = config or DatabaseConfig()
    return psycopg2.connect(
        host=cfg.host,
        port=cfg.port,
        dbname=cfg.dbname,
        user=os.getenv(cfg.user_env_var),
        password=os.getenv(cfg.password_env_var),
        connect_timeout=cfg.connect_timeout,
        options=f"-c statement_timeout={cfg.statement_timeout_ms}",
    )


class ReportService:
    def __init__(self):
        self.db = create_database_connection()

class AnalyticsService:
    def __init__(self):
        self.db = create_database_connection()

class ExportService:
    def __init__(self):
        self.db = create_database_connection(
            DatabaseConfig(dbname="analytics", statement_timeout_ms=60_000),
        )
```

**When to apply:** When the same object type is constructed in ≥2 places, or when construction logic includes configuration, error handling, or resource management that would need coordinated changes. Factories are especially valuable for objects with non-trivial initialization (database connections, HTTP clients, file handles).

---

### Pattern 6: Mixins / Traits / Composition

When behavior needs to be shared across classes that do not share a common base class, use mixins (Python), traits (Rust), or composition to avoid inheritance-based code duplication. Composition is generally preferred — it avoids the fragility of deep inheritance hierarchies and makes dependencies explicit.

**Transformation rule:** Unrelated classes share methods with identical logic → Extract shared behavior into a mixin class or compose with a helper object → Verify all original behavior is preserved.

```python
# ❌ BAD: Timestamp tracking duplicated across unrelated domain models
class User:
    def __init__(self, name: str):
        self.name = name
        self.created_at: datetime = datetime.now()
        self.updated_at: datetime = datetime.now()

    def save(self) -> None:
        self.updated_at = datetime.now()
        # ... persist to database ...


class Article:
    def __init__(self, title: str, author_id: int):
        self.title = title
        self.author_id = author_id
        self.created_at: datetime = datetime.now()
        self.updated_at: datetime = datetime.now()

    def save(self) -> None:
        self.updated_at = datetime.now()
        # ... persist to database ...


class Order:
    def __init__(self, customer_id: int, total: float):
        self.customer_id = customer_id
        self.total = total
        self.created_at: datetime = datetime.now()
        self.updated_at: datetime = datetime.now()

    def save(self) -> None:
        self.updated_at = datetime.now()
        # ... persist to database ...


# ✅ GOOD: Composition with a TimestampMixin avoids inheritance duplication
from datetime import datetime
from typing import Protocol, runtime_checkable


@runtime_checkable
class Saveable(Protocol):
    """Protocol for objects that can be persisted."""
    def save(self) -> None: ...


class TimestampMixin:
    """Shared timestamp management via composition.

    Mixes into any class by holding a reference and providing
    methods that update timestamps. Classes compose this rather
    than inheriting from it.
    """
    def __init__(self) -> None:
        self.created_at = datetime.now()
        self.updated_at = datetime.now()

    def touch(self) -> None:
        """Update the modified timestamp. Call before each save."""
        self.updated_at = datetime.now()


class User:
    def __init__(self, name: str):
        self.name = name
        self._timestamps = TimestampMixin()

    @property
    def created_at(self) -> datetime:
        return self._timestamps.created_at

    @property
    def updated_at(self) -> datetime:
        return self._timestamps.updated_at

    def save(self) -> None:
        self._timestamps.touch()
        # ... persist to database ...


class Article:
    def __init__(self, title: str, author_id: int):
        self.title = title
        self.author_id = author_id
        self._timestamps = TimestampMixin()

    @property
    def created_at(self) -> datetime:
        return self._timestamps.created_at

    @property
    def updated_at(self) -> datetime:
        return self._timestamps.updated_at

    def save(self) -> None:
        self._timestamps.touch()
        # ... persist to database ...


class Order:
    def __init__(self, customer_id: int, total: float):
        self.customer_id = customer_id
        self.total = total
        self._timestamps = TimestampMixin()

    @property
    def created_at(self) -> datetime:
        return self._timestamps.created_at

    @property
    def updated_at(self) -> datetime:
        return self._timestamps.updated_at

    def save(self) -> None:
        self._timestamps.touch()
        # ... persist to database ...
```

**When to apply:** When 3+ unrelated classes (no shared base class beyond object) share method implementations, or when you need to add cross-cutting behavior (logging, timestamps, audit trails) without forcing a common inheritance hierarchy. Composition over inheritance keeps dependencies explicit and testable.

---

### Pattern 7: Memoization / Caching Layer

When multiple callers independently compute the same expensive result with the same inputs, introduce a memoization or caching layer so the computation runs once and the result is reused. This eliminates redundant CPU cycles and can dramatically reduce latency.

**Transformation rule:** Functions called by multiple callers recompute the same result for identical inputs → Wrap with a memoization decorator or explicit cache → Verify correctness (cache invalidation strategy) → Monitor hit rates.

```python
# ❌ BAD: Expensive computation duplicated across independent callers
def get_product_recommendations(user_id: int, session: DatabaseSession) -> list[dict]:
    """Fetch personalized recommendations — expensive query run independently by each caller."""
    # Load user preferences from multiple joins
    prefs = session.query(UserPreference).filter_by(user_id=user_id).all()
    categories = [p.category_id for p in prefs]
    products = session.query(Product).filter(Product.category_id.in_(categories)).all()
    return [self._rank_product(p, prefs) for p in products[:20]]


def render_user_dashboard(user_id: int, session: DatabaseSession) -> dict:
    """Dashboard also needs recommendations — runs the same expensive query again."""
    recommendations = get_product_recommendations(user_id, session)  # Redundant computation!
    orders = session.query(Order).filter_by(user_id=user_id).limit(5).all()
    return {"recommendations": recommendations, "recent_orders": orders}


def generate_user_email(user_id: int, session: DatabaseSession) -> str:
    """Email generation also needs recommendations — third redundant call."""
    recommendations = get_product_recommendations(user_id, session)  # Again!
    return f"Recommended products for you:\n{format_recommendations(recommendations)}"


# ✅ GOOD: Memoization eliminates redundant computation
from functools import lru_cache
from typing import Any, Callable, TypeVar

T = TypeVar("T")


def memoize(key_func: Callable[..., str] | None = None) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorate a function to cache its results by argument key.

    The cached result is stored in memory for the lifetime of the process.
    Use with functions that are pure (no side effects) and have hashable arguments.

    Args:
        key_func: Optional custom key builder. Defaults to str(args, kwargs).
    """
    cache: dict[str, Any] = {}

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        def wrapper(*args: Any, **kwargs: Any) -> T:
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = str((args, tuple(sorted(kwargs.items()))))

            if cache_key in cache:
                return cache[cache_key]

            result = func(*args, **kwargs)
            cache[cache_key] = result
            return result

        def clear_cache() -> None:
            cache.clear()

        wrapper.clear_cache = clear_cache  # type: ignore[attr-defined]
        wrapper.cache_info = lambda: len(cache)  # type: ignore[attr-defined]
        return wrapper

    return decorator


# Usage: wrap the expensive function — all callers benefit transparently
@memoize()
def get_product_recommendations(user_id: int, session: DatabaseSession | None = None) -> list[dict]:
    """Fetch personalized recommendations with memoization.

    The first call computes and caches the result. Subsequent calls
    within the same process return the cached value instantly.
    """
    if session is None:
        # In a real app, the session would come from dependency injection
        raise ValueError("Session is required for database query")
    prefs = session.query(UserPreference).filter_by(user_id=user_id).all()
    categories = [p.category_id for p in prefs]
    products = session.query(Product).filter(Product.category_id.in_(categories)).all()
    return [self._rank_product(p, prefs) for p in products[:20]]


def render_user_dashboard(user_id: int, session: DatabaseSession) -> dict:
    # First call computes and caches; subsequent calls are O(1) cache lookup
    recommendations = get_product_recommendations(user_id, session)
    orders = session.query(Order).filter_by(user_id=user_id).limit(5).all()
    return {"recommendations": recommendations, "recent_orders": orders}


def generate_user_email(user_id: int, session: DatabaseSession) -> str:
    # Returns instantly from cache — no redundant computation
    recommendations = get_product_recommendations(user_id, session)
    return f"Recommended products for you:\n{format_recommendations(recommendations)}"
```

**When to apply:** When the same expensive function (database query, API call, complex computation) is invoked by multiple callers with the same arguments, and the result does not change between calls. Memoization has zero caller-side changes — it is purely a decorator or wrapper. Always include a cache invalidation strategy for mutable data.

---

### Pattern 8: Configuration Consolidation

When configuration constants, defaults, thresholds, or magic numbers are scattered across multiple files, centralize them in a single configuration module. This makes coordinated changes safe and obvious — change one value, affect all callers.

**Transformation rule:** Magic numbers or hardcoded strings appear in ≥2 files → Create a configuration module (constants class or config dict) → Replace all scattered literals with references to the central module → Verify behavior is unchanged.

```python
# ❌ BAD: Configuration scattered across multiple modules
# api/server.py
from http.server import HTTPServer

SERVER_HOST = "0.0.0.0"
SERVER_PORT = 8080
MAX_REQUEST_SIZE = 10 * 1024 * 1024  # 10 MB — magic number, unclear unit
REQUEST_TIMEOUT = 30  # seconds? milliseconds?
MAX_CONNECTIONS = 100

# workers/processor.py
TIMEOUT = 30           # Same value as REQUEST_TIMEOUT, but no shared constant
BATCH_SIZE = 500       # Magic number with no documentation
RETRY_LIMIT = 3        # Hardcoded in the function body
MAX_CONNECTIONS = 100  # Same value as server.py, but duplicated

# utils/validation.py
MIN_PASSWORD_LENGTH = 8    # Also in auth module
MAX_USERNAME_LENGTH = 64   # Also in auth module
IDLE_TIMEOUT = 900         # 15 minutes — magic number with no unit
```

```python
# ✅ GOOD: Centralized configuration module
from dataclasses import dataclass, field


@dataclass(frozen=True)
class AppConfig:
    """Centralized application configuration.

    All magic numbers and constants are defined here with units documented
    in the attribute docstrings. To change a value, edit exactly one place.
    """
    # Server
    host: str = "0.0.0.0"
    port: int = 8080
    max_request_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    request_timeout_seconds: int = 30

    # Worker processes
    batch_size: int = 500
    retry_limit: int = 3
    max_connections: int = 100

    # Validation rules
    min_password_length: int = 8
    max_username_length: int = 64

    # Session management
    idle_timeout_seconds: int = 900  # 15 minutes


# Default singleton accessible from all modules
config = AppConfig()


# api/server.py — reads from central config
from .config import config as app_config

server = HTTPServer(
    (app_config.host, app_config.port),
    handler=RequestHandler,
)
server.request_queue_size = app_config.max_connections


# workers/processor.py — uses the same constants
from .config import config as app_config

BATCH_SIZE = app_config.batch_size
RETRY_LIMIT = app_config.retry_limit
MAX_CONNECTIONS = app_config.max_connections


# utils/validation.py — no duplicated magic numbers
from .config import config as app_config

def validate_password(password: str) -> bool:
    return len(password) >= app_config.min_password_length
```

**When to apply:** When you find the same constant (or constants with different names but same values) in ≥2 files, or when changing a threshold requires editing multiple files. Configuration consolidation is one of the highest-ROI deduplication patterns because it directly prevents inconsistency bugs during deployment changes.

---

## Constraints

### MUST DO

- **Classify duplication type before choosing a pattern.** Copy-paste clones → Extract Function. Boilerplate with conditions → Strategy. Subclass skeletons → Template Method. Never default to extraction without diagnosis.
- **Run the full test suite after every extraction.** Behavioral equivalence is the only acceptable outcome of a deduplication refactor. If tests break, you have changed semantics, not just structure.
- **Prefer composition over inheritance** for sharing behavior across classes. Mixins and composed helpers avoid the fragility of deep hierarchies and make dependencies explicit.
- **Name the extracted abstraction by intent, not mechanics.** `validate_credentials()` is better than `check_username_and_password()`. The name should describe what the code does at the domain level.
- **Keep the extraction in a single atomic commit.** This makes rollback trivial and gives reviewers clear context for why the change exists.

### MUST NOT DO

- **Extract code touched in only one feature iteration.** If the duplicated code has never been modified independently, it is not yet a pattern — deduplicating premature abstractions creates maintenance cost with no benefit.
- **Create abstractions that serve zero callers beyond the two being deduplicated.** A third caller justifies an abstraction. Two callers are a coincidence. This is the "rule of three" for DRY.
- **Abstract domain concepts that are genuinely different but superficially similar.** If two "calculate total" functions operate on fundamentally different domains (order totals vs. cart totals), they should stay separate until convergence is proven across multiple iterations.
- **Introduce runtime overhead to eliminate compile-time duplication.** Memoization, reflection-based dispatch, or dynamic code generation may eliminate source-level duplication while making the running code slower or less debuggable.
- **Deduplicate test fixtures or test setup code.** Tests benefit from isolation and self-containment. Duplicated setup in tests aids readability; do not apply DRY to testing infrastructure.

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `refactoring-techniques` | Broader refactoring catalog including extraction, renaming, and decomposition beyond deduplication |
| `code-duplication-detection` | Automated detection tooling and metrics for finding duplication clusters in large codebases |
| `yagni` | Complementary principle — prevents over-engineering and premature abstraction that DRY can encourage |
| `dry-principles` | Foundational DRY philosophy and historical context — this skill focuses on practical patterns |
| `single-responsibility` | SRP guides what belongs in an extracted function; a single-responsibility boundary is the natural limit of extraction |

---

## Live References

> Authoritative documentation links for code deduplication and refactoring practices.

- [Refactoring.guru — Extract Method](https://refactoring.com/catalog/extractFunction.html)
- [Martin Fowler, "Replace Inline Code with Function Reference"](https://martinfowler.com/books/refactoring.html)
- [Clean Code Chapter 3: Functions — Rule of Three](https://www.oreilly.com/library/view/clean-code/9780132350884/)
- [Design Patterns: Elements of Reusable Object-Oriented Software (Gamma et al.) — Template Method, Strategy, Factory](https://en.wikipedia.org/wiki/Design_Patterns)
- [DRY Principle — Wikipedia](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)
- [Python `functools.lru_cache` Documentation](https://docs.python.org/3/library/functools.html#functools.lru_cache)
