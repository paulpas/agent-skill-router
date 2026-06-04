---
name: creational-design-patterns
description: Implements GoF creational patterns (Factory Method, Builder, Singleton,
  Abstract Factory, Prototype) to control object creation, manage composition, and
  reduce coupling in Python systems.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: creational patterns, factory method, builder pattern, singleton, abstract
    factory, prototype pattern, object creation, GoF design patterns
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
  related-skills: behavioral-design-patterns, design-patterns-architecture, refactoring-techniques,
    modular-design
---
# Creational Design Patterns

Implements GoF creational patterns to control object creation, manage composition, and reduce coupling. This skill makes the model apply Factory Method for family-independent instantiation, Builder for complex construction sequences, Singleton (with caution) for shared resources, Abstract Factory for related object families, and Prototype for cloning expensive objects — choosing each pattern based on the specific creation bottleneck in the system.

## TL;DR Checklist

- [ ] Identify which creation problem you have: unknown type, complex construction, single instance, related families, or expensive cloning
- [ ] Prefer composition over inheritance — use object composition to vary behavior, not subclass hierarchies
- [ ] Use Factory Method when subclasses decide which concrete class to instantiate; use Abstract Factory when you need families of related objects
- [ ] Use Builder when an object requires a multi-step construction process with many optional parameters
- [ ] Avoid Singleton for shared mutable state — prefer Dependency Injection; allow Singleton only for truly global, immutable resources (config, connection pools)
- [ ] Use Prototype when cloning is cheaper than creating from scratch (deep-copy heavy objects, database-loaded entities)
- [ ] Enforce type safety with `typing.Protocol`, `typing.TypeVar`, and concrete return annotations on all factory methods

---

## When to Use

Use this skill when:

- You have a class hierarchy where the calling code must not depend on concrete types (dependency inversion)
- Object construction involves many optional parameters or a complex setup sequence with validation
- You need to ensure exactly one instance of a resource exists across the application lifecycle (logging, config, connection pool)
- Multiple related object families must be created together and must not mix (payment processors for Stripe vs. PayPal)
- Creating an object is expensive (heavy computation, database load, I/O) and you have similar objects already constructed
- You want to hide creation logic behind a single interface so that adding new product types requires zero changes to calling code

---

## When NOT to Use

Avoid this skill for:

- Simple object construction with no polymorphism — `__init__` is sufficient; patterns add overhead
- When you need multiple independent instances of what might be a "singleton" — use a registry or factory instead
- For configuration data that changes at runtime — Singletons with mutable state cause hidden dependencies and testability problems
- When dependency injection (constructor injection) solves the problem without indirection
- For small scripts or prototypes where pattern overhead outweighs benefits

---

## Core Workflow

1. **Diagnose the creation bottleneck** — Determine whether the problem is unknown concrete types (Factory/Abstract Factory), complex construction (Builder), shared state (Singleton), related families (Abstract Factory), or expensive cloning (Prototype).
   **Checkpoint:** Can you articulate the creation problem in one sentence? If not, refactor first.

2. **Choose the pattern based on the decision tree** — Unknown subtype → Factory Method. Related families → Abstract Factory. Multi-step construction → Builder. Single global instance → Singleton (with DI alternative considered). Expensive clone → Prototype.
   **Checkpoint:** Does the chosen pattern map cleanly to an existing class hierarchy or interface?

3. **Define the abstraction first** — Create `Protocol` interfaces or abstract base classes before implementing concrete creators. This enforces dependency inversion from day one.
   **Checkpoint:** All factory methods return the abstract type, never a concrete implementation.

4. **Implement with guard clauses and validation** — Apply early-exit patterns for invalid creation requests. Validate invariant state in `__post_init__` (dataclass) or constructor body.
   **Checkpoint:** Every code path either returns a valid object or raises a descriptive exception.

5. **Wire the factory into the composition root** — Register concrete creators at application bootstrap. Use dependency injection to inject factories where needed, not global lookups.
   **Checkpoint:** No module imports concrete types directly — only the abstract protocol and the factory interface.

6. **Add Prototype support via `__reduce__` or `copy.deepcopy`** — For patterns that clone, ensure deep copy semantics are explicit for mutable nested structures.
   **Checkpoint:** Cloned objects are fully independent; mutating a clone does not affect the original.

---

## Implementation Patterns

### Pattern 1: Factory Method

The Factory Method pattern defines an interface for creating a single object but lets subclasses decide which concrete class to instantiate. It shifts creation responsibility to subclasses, enabling open/closed compliance when new product types are added.

**When to use:** You have a base class that must delegate instantiation to its subclasses, and you want calling code to remain decoupled from concrete types.

```python
# ❌ BAD — Tight coupling to concrete implementations
class PaymentProcessor:
    def __init__(self) -> None:
        # Hard dependency on specific payment gateway
        self.gateway = StripeGateway(api_key="sk_live_...")

    def process(self, amount: float, currency: str) -> bool:
        return self.gateway.charge(amount, currency)


class StripeGateway:
    def charge(self, amount: float, currency: str) -> bool: ...

class PayPalGateway:
    def charge(self, amount: float, currency: str) -> bool: ...
```

```python
# ✅ GOOD — Factory Method decouples creation from usage
from abc import ABC, abstractmethod
from typing import Protocol


class PaymentGateway(Protocol):
    """Protocol defining the payment gateway contract."""

    def charge(self, amount: float, currency: str) -> bool: ...


class StripeGateway:
    """Concrete implementation for Stripe payments."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def charge(self, amount: float, currency: str) -> bool:
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")
        # Actual Stripe API call would go here
        return True


class PayPalGateway:
    """Concrete implementation for PayPal payments."""

    def __init__(self, client_id: str, client_secret: str) -> None:
        self._client_id = client_id
        self._client_secret = client_secret

    def charge(self, amount: float, currency: str) -> bool:
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")
        # Actual PayPal API call would go here
        return True


class PaymentProcessor:
    """Uses Factory Method to defer gateway instantiation to subclasses."""

    def __init__(self) -> None:
        self._gateway = self._create_gateway()

    @abstractmethod
    def _create_gateway(self) -> PaymentGateway:
        """Factory method — subclasses override to return specific gateway."""
        ...

    def process(self, amount: float, currency: str = "USD") -> bool:
        return self._gateway.charge(amount, currency)


class StripeProcessor(PaymentProcessor):
    def _create_gateway(self) -> PaymentGateway:
        return StripeGateway(api_key="sk_live_...")


class PayPalProcessor(PaymentProcessor):
    def _create_gateway(self) -> PaymentGateway:
        return PayPalGateway(client_id="...", client_secret="...")
```

---

### Pattern 2: Builder

The Builder pattern separates the construction of a complex object from its representation, allowing the same construction process to create different representations. It excels when an object requires many optional parameters, validation steps, or a multi-phase initialization sequence.

**When to use:** An object has 5+ parameters, some optional; construction involves validation chains; or you need multiple valid representations (e.g., debug vs. production HTTP client configuration).

```python
# ❌ BAD — Telescoping constructor with too many parameters
class HttpClient:
    def __init__(
        self, base_url: str, timeout: int = 30, retries: int = 3,
        max_connections: int = 10, ssl_verify: bool = True,
        proxy: str | None = None, user_agent: str = "app/1.0",
        headers: dict[str, str] | None = None, rate_limit: int = 100,
        debug: bool = False, logger: Any = None
    ) -> None:
        # No validation — invalid combinations silently break at runtime
        self.base_url = base_url
        self.timeout = timeout
        self.retries = retries
        # ... 7 more fields with no invariant checks
```

```python
# ✅ GOOD — Builder pattern with fluent API and validation
from dataclasses import dataclass, field


@dataclass(frozen=True)
class HttpClientConfig:
    """Immutable, validated HTTP client configuration."""
    base_url: str
    timeout: int = 30
    retries: int = 3
    max_connections: int = 10
    ssl_verify: bool = True
    proxy: str | None = None
    user_agent: str = "app/1.0"
    headers: dict[str, str] = field(default_factory=dict)
    rate_limit: int = 100
    debug: bool = False

    def __post_init__(self) -> None:
        if not self.base_url.startswith(("http://", "https://")):
            raise ValueError(f"base_url must start with http:// or https://, got {self.base_url}")
        if self.timeout <= 0:
            raise ValueError(f"timeout must be positive, got {self.timeout}")
        if self.retries < 0:
            raise ValueError(f"retries must be non-negative, got {self.retries}")


class HttpClientBuilder:
    """Fluent builder for constructing validated HttpClientConfig instances."""

    def __init__(self, base_url: str) -> None:
        self._config_data: dict = {
            "base_url": base_url,
            "timeout": 30,
            "retries": 3,
            "max_connections": 10,
            "ssl_verify": True,
            "proxy": None,
            "user_agent": "app/1.0",
            "headers": {},
            "rate_limit": 100,
            "debug": False,
        }

    def timeout(self, seconds: int) -> "HttpClientBuilder":
        self._config_data["timeout"] = seconds
        return self

    def retries(self, count: int) -> "HttpClientBuilder":
        self._config_data["retries"] = count
        return self

    def proxy(self, url: str) -> "HttpClientBuilder":
        self._config_data["proxy"] = url
        return self

    def set_header(self, key: str, value: str) -> "HttpClientBuilder":
        self._config_data["headers"][key] = value
        return self

    def debug_mode(self, enabled: bool = True) -> "HttpClientBuilder":
        self._config_data["debug"] = enabled
        return self

    def build(self) -> HttpClientConfig:
        """Returns a validated, immutable configuration object."""
        return HttpClientConfig(**self._config_data)


# Usage — clear, readable construction with validation at build time
config = (
    HttpClientBuilder("https://api.example.com")
    .timeout(15)
    .retries(5)
    .set_header("X-API-Key", "secret")
    .build()
)
```

---

### Pattern 3: Singleton (with Anti-Pattern Warning)

The Singleton pattern ensures a class has only one instance and provides a global point of access. **This is the most abused creational pattern.** In modern Python, it should almost always be replaced by Dependency Injection or module-level state. Use Singleton only for truly immutable, globally-accessed resources where creating multiple instances would cause real problems (e.g., reading a large config file once, a read-only cache of reference data).

**When to use:** Only when you have a genuinely unique, expensive-to-create resource that must be shared across the entire application and DI is impractical. Default to DI.

```python
# ❌ BAD — Naive Singleton with thread-safety issues and testability problems
class DatabaseConnection:
    _instance = None

    def __new__(cls) -> "DatabaseConnection":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # Race condition: two threads can both see _instance as None
            cls._instance._connect()  # Could connect twice
        return cls._instance

    def _connect(self) -> None:
        # No way to inject a mock for testing
        self.pool = create_real_connection_pool(...)


# ❌ BAD — Using a global variable (effectively a Singleton, worse testability)
class UserPreferenceService:
    """Accessing global state directly couples all callers to this module."""
    pass

def get_user_preference(key: str) -> str:
    # Hidden dependency — caller cannot know or mock this
    return _global_cache.get(key, "default")
```

```python
# ✅ GOOD — Dependency Injection is the preferred alternative
from dataclasses import dataclass


@dataclass(frozen=True)
class DatabaseConnection:
    """Immutable connection config — created once by DI container."""
    host: str
    port: int
    max_pool_size: int = 10

    def connect(self) -> Any:
        return create_connection_pool(self.host, self.port, self.max_pool_size)


class Application:
    """Accepts dependencies through the constructor — fully testable."""

    def __init__(self, db_config: DatabaseConnection) -> None:
        self.db = db_config.connect()  # Explicit, mockable dependency

    def query(self, sql: str) -> list[dict]:
        return self.db.execute(sql)


# Composition root — single point of creation
config = DatabaseConnection(host="localhost", port=5432)
app = Application(db_config=config)
```

```python
# ✅ ALRIGHT — Thread-safe Singleton ONLY for read-only, expensive resources
import threading
from typing import Any


class AppConfig:
    """Singleton config loader. Acceptable because it is frozen (immutable)."""

    _instance: "AppConfig | None" = None
    _lock = threading.Lock()
    _loaded = False

    def __new__(cls) -> "AppConfig":
        if cls._instance is None:
            with cls._lock:
                # Double-checked locking — second check avoids unnecessary lock contention
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance.__initialized = False
                    cls._instance = instance
        return cls._instance

    def __init__(self) -> None:
        # Guard against re-initialization from double-checked locking race
        if getattr(self, "__initialized", False):
            return
        self._config: dict[str, Any] = {}
        self._load_config()  # Expensive — reads from disk or remote config service
        object.__setattr__(self, "_frozen", True)  # Mark as immutable
        object.__setattr__(self, "__initialized", True)

    def _load_config(self) -> None:
        # Simulate loading configuration from a file or environment
        self._config = {
            "database_url": "postgresql://localhost/mydb",
            "redis_url": "redis://localhost:6379",
            "debug_mode": False,
        }

    def get(self, key: str) -> Any:
        return self._config.get(key)

    def __repr__(self) -> str:
        return f"AppConfig(config={self._config})"


# Usage — safe because immutable; one read from disk for the entire app lifetime
config = AppConfig()
db_url = config.get("database_url")
```

---

### Pattern 4: Abstract Factory

The Abstract Factory pattern provides an interface for creating families of related or dependent objects without specifying their concrete classes. Unlike Factory Method (which creates one product), Abstract Factory creates a family of products that are designed to work together.

**When to use:** You need to create multiple related objects that must form a coherent set — e.g., UI widgets for different themes, payment processors for different gateways with matching types (gateway + receipt printer + notification sender).

```python
# ❌ BAD — Mixing products from different families creates incompatibility
class ThemeFactory:
    def create_button(self) -> Any: ...
    def create_text_field(self) -> Any: ...


# No guarantee that the button and text field are from the same theme family.
# A light theme button combined with a dark theme text field looks broken.
button = factory.create_button()      # Could be LightButton or DarkButton
text_field = factory.create_text_field()  # Could be either — no coordination
```

```python
# ✅ GOOD — Abstract Factory enforces family coherence
from abc import ABC, abstractmethod
from typing import Protocol


class Button(Protocol):
    def render(self) -> str: ...
    def get_theme_name(self) -> str: ...


class TextField(Protocol):
    def render(self) -> str: ...
    def get_theme_name(self) -> str: ...


class ThemeFactory(ABC):
    """Abstract Factory — creates a family of related UI components."""

    @abstractmethod
    def create_button(self) -> Button: ...

    @abstractmethod
    def create_text_field(self) -> TextField: ...


class LightThemeFactory(ThemeFactory):
    """Creates light-themed UI components."""

    def create_button(self) -> Button:
        return LightButton()

    def create_text_field(self) -> TextField:
        return LightTextField()


class DarkThemeFactory(ThemeFactory):
    """Creates dark-themed UI components."""

    def create_button(self) -> Button:
        return DarkButton()

    def create_text_field(self) -> TextField:
        return DarkTextField()


# Concrete products — all themed consistently
class LightButton:
    def render(self) -> str:
        return "<button class='light-theme'>Click</button>"

    def get_theme_name(self) -> str:
        return "light"


class LightTextField:
    def render(self) -> str:
        return "<input class='light-theme' type='text'>"

    def get_theme_name(self) -> str:
        return "light"


class DarkButton:
    def render(self) -> str:
        return "<button class='dark-theme'>Click</button>"

    def get_theme_name(self) -> str:
        return "dark"


class DarkTextField:
    def render(self) -> str:
        return "<input class='dark-theme' type='text'>"

    def get_theme_name(self) -> str:
        return "dark"


# Usage — entire UI uses one theme family; adding a new theme requires
# only a new factory and its product implementations (open/closed principle)
def render_ui(factory: ThemeFactory) -> dict[str, str]:
    button = factory.create_button()
    text_field = factory.create_text_field()
    assert button.get_theme_name() == text_field.get_theme_name(), \
        "All components must belong to the same theme family"
    return {"button": button.render(), "text_field": text_field.render()}


ui = render_ui(LightThemeFactory())
# ui["button"] -> "<button class='light-theme'>Click</button>"
```

---

### Pattern 5: Prototype

The Prototype pattern creates new objects by copying an existing instance (the prototype) rather than creating them from scratch. It is most valuable when object creation is expensive (heavy database load, complex computation) or when the calling code must not depend on concrete types.

**When to use:** Cloning is cheaper than re-creation; you have many similar objects with slight variations; or you need to hide concrete types behind a clone interface.

```python
# ❌ BAD — Recreating expensive objects instead of cloning
class ReportGenerator:
    def generate_report(self, query_params: dict) -> Report:
        # Expensive: loads entire dataset, aggregates millions of rows
        data = DatabaseLoader().fetch_aggregated(query_params)
        charts = ChartEngine().build_charts(data)
        return Report(data=data, charts=charts)

    def get_similar_report(self, base_params: dict, tweaks: dict) -> Report:
        # Creates entirely new objects even though the difference is tiny
        merged_params = {**base_params, **tweaks}
        return self.generate_report(merged_params)  # Re-fetches everything!
```

```python
# ✅ GOOD — Prototype pattern with deep copy for independent clones
import copy
from dataclasses import dataclass, field


@dataclass
class Report:
    """Heavy report object that is expensive to regenerate."""
    title: str
    query_params: dict
    data_rows: list[dict] = field(default_factory=list)
    charts: list[str] = field(default_factory=list)
    generated_at: float = 0.0

    def clone_with_tweaks(self, tweaks: dict) -> "Report":
        """Create an independent clone with modified parameters — no DB hit."""
        cloned = copy.deepcopy(self)
        cloned.query_params = {**cloned.query_params, **tweaks}
        cloned.title = f"{self.title} (variant: {sorted(tweaks.keys())})"
        return cloned


# Usage — clone the base report, tweak parameters, no database access needed
base_report = Report(
    title="Q4 Sales Summary",
    query_params={"region": "US", "year": 2025},
    data_rows=[{"product": "Widget", "revenue": 15000}],
    charts=["bar_chart_revenue"],
)

eu_report = base_report.clone_with_tweaks({"region": "EU"})
# Independent clone — mutating eu_report.data_rows does not affect base_report

# Verify independence
eu_report.data_rows.append({"product": "Gadget", "revenue": 8000})
assert len(base_report.data_rows) == 1, "Clone must be fully independent"
```

---

## Constraints

### MUST DO
- **Always define the abstraction first** — create `Protocol` interfaces or ABCs before implementing concrete factories
- **Return abstract types from factory methods** — never let a factory method expose its concrete implementation type in the return annotation
- **Validate invariants at construction time** — use `__post_init__` for dataclasses or explicit validation in constructors; fail fast with descriptive errors
- **Use frozen dataclasses for immutable products** — once built, a product object should not mutate unless mutation is the pattern's purpose
- **Prefer DI over Singleton** — inject factories and shared instances through constructors; only use Singleton for read-only global state
- **Apply Builder for 5+ parameter objects** — any constructor with more than four parameters likely needs a Builder

### MUST NOT DO
- **Never return `Any` from factory methods** — use concrete type annotations to enforce compile-time type checking
- **Do not put business logic inside factories** — factories create; they do not perform domain operations like validation of business rules
- **Avoid mutable singletons with runtime configuration changes** — if the "shared" data can change, Singleton hides state mutations and creates bugs
- **Do not use Prototype for simple objects** — `copy.copy()` adds no value for flat dictionaries or small dataclasses; only clone when expensive
- **Never expose factory internals to calling code** — the caller should never know which concrete class was instantiated

---

## Output Template

When this skill is active, your output must contain:

1. **Pattern identification** — State which GoF creational pattern applies and why (one sentence mapping the problem to the pattern's solution)
2. **Protocol/Abstract interface** — Show the type contract first; all code examples must begin with the abstraction
3. **BAD vs. GOOD code pair** — Every pattern must include at least one BAD example showing the coupling/problem and a GOOD example showing the pattern applied
4. **Instantiation call site** — Show how calling code uses the factory/builder/prototype, demonstrating zero knowledge of concrete types
5. **Type annotations** — All functions must have complete `typing` annotations; use `Protocol`, `TypeVar`, and concrete return types

---

## Related Skills

| Skill | Purpose |
|---|---|
| `behavioral-design-patterns` | Covers behavioral patterns (Observer, Strategy, Command) that work alongside creational patterns |
| `design-patterns-architecture` | Higher-level architectural patterns that use creational patterns as building blocks |
| `refactoring-techniques` | How to refactor legacy code with hardcoded instantiation into pattern-based creation |
| `modular-design` | Module organization and dependency management that complements factory-based architectures |
