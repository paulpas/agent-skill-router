---
name: builder-pattern
description: Implements the Builder design pattern for constructing complex objects step by step with a fluent API, supporting hierarchical builders and director orchestration.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: builder pattern, fluent interface, object construction, complex object, step-by-step construction, chained method calls, director pattern
  archetypes:
    - tactical
    - generation
  anti_triggers:
    - simple data class
    - trivial initialization
    - single-field objects
  response_profile:
    verbosity: low
    directive_strength: high
    abstraction_level: operational
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: coding-abstract-factory, coding-chain-of-responsibility
---

# Builder Design Pattern

Implements the Builder design pattern to construct complex objects step by step using a fluent API. Separates construction logic from representation, supports hierarchical builders for nested objects, and uses a Director to control the construction algorithm — all while producing immutable results via `dataclasses` with `frozen=True`.

## TL;DR Checklist

- [ ] Define the target class as an immutable dataclass (`frozen=True`)
- [ ] Create a nested Builder with typed methods for every required and optional field
- [ ] Use method chaining — each builder method returns `self`
- [ ] Implement `build()` that validates required fields and raises on missing data
- [ ] Use `copy_builder()` for derived variants instead of creating new builders from scratch
- [ ] Delegate to child builders when constructing nested objects
- [ ] Avoid Builder for objects with fewer than 3–4 parameters (use `__init__` or a simple factory)

---

## When to Use

Use this skill when:

- Constructing an object requires many optional parameters and you want readable construction code instead of telescoping constructors
- The target object is immutable (`frozen=True`) but complex enough that partial construction via `__init__` is error-prone
- You need multiple representations of the same conceptual object (e.g., a `DatabaseConfig` built differently for test, staging, and production)
- A complex object has nested sub-objects that each require their own builder
- You want a fluent API where callers chain meaningful method calls to configure an object incrementally

---

## When NOT to Use

Avoid this skill when:

- The class has 2–3 parameters — use `__init__` or a factory function instead; Builder adds unnecessary indirection
- You are creating a simple data record with no optional fields and no variants — a plain dataclass suffices
- The "builder" only delegates to `__init__` without adding validation or step-by-step control — that is not a real Builder, just an anti-pattern wrapper

---

## Core Workflow

1. **Design the immutable product class** — Define the target as a `dataclass(frozen=True)` with all fields typed. No setters; immutability is enforced by the type system.
   **Checkpoint:** Every field has a Python type annotation; no methods that mutate state exist on the product.

2. **Create the Builder class** — Either nested inside the product or as a sibling module. Each configurable field gets a method named after the field (lowercase) that accepts the value and returns `self`. Track defaults via a private `_kwargs` dict.
   **Checkpoint:** Every required field has a corresponding builder method; optional fields default to `None` in the `_kwargs` dict.

3. **Implement `build()` with validation** — The final method that raises `ValueError` on missing required fields, runs domain-specific assertions (e.g., ranges, non-null constraints), and returns `cls(**self._kwargs)`.
   **Checkpoint:** Validation must reject incomplete builds before the product is instantiated.

4. **(Optional) Add a Director** — If multiple construction algorithms exist (e.g., test config vs production config), create a `Director` class with a `construct()` method that calls the appropriate sequence of builder methods.
   **Checkpoint:** The Director knows *which* steps to call but not *how* the Builder executes them.

5. **(Optional) Add hierarchical builders** — For nested objects, delegate construction to child Builders. The parent Builder collects child results and passes them to the product constructor.
   **Checkpoint:** Child Builder instances must be independent; no shared mutable state between siblings.

---

## Implementation Patterns

### Pattern 1: Basic Builder with Fluent API

The simplest form — a nested Builder on an immutable dataclass with method chaining.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class EmailMessage:
    """An immutable email message."""
    subject: str
    body: str
    from_address: str
    to_addresses: tuple[str, ...] = field(default=tuple())
    cc_addresses: tuple[str, ...] = field(default=tuple())
    priority: str = "normal"  # "low", "normal", "high", "urgent"

    class Builder:
        """Fluent builder for EmailMessage with step-by-step construction."""

        def __init__(self) -> None:
            self._subject: Optional[str] = None
            self._body: Optional[str] = None
            self._from_address: Optional[str] = None
            self._to_addresses: List[str] = []
            self._cc_addresses: List[str] = []
            self._priority: str = "normal"

        def subject(self, value: str) -> "EmailMessage.Builder":
            """Set the email subject line.

            Args:
                value: Non-empty subject string (max 200 characters).

            Returns:
                self for method chaining.
            """
            if not value or not value.strip():
                raise ValueError("Subject must be a non-empty string")
            self._subject = value[:200]
            return self

        def body(self, value: str) -> "EmailMessage.Builder":
            """Set the email body.

            Args:
                value: Non-empty body text.

            Returns:
                self for method chaining.
            """
            if not value or not value.strip():
                raise ValueError("Body must be a non-empty string")
            self._body = value
            return self

        def from_address(self, value: str) -> "EmailMessage.Builder":
            """Set the sender email address.

            Args:
                value: Must contain exactly one '@' symbol.

            Returns:
                self for method chaining.
            """
            if "@" not in value or value.count("@") != 1:
                raise ValueError(f"Invalid from_address: {value!r}")
            self._from_address = value
            return self

        def to(self, address: str) -> "EmailMessage.Builder":
            """Add a recipient email address.

            Args:
                address: Must contain exactly one '@' symbol.

            Returns:
                self for method chaining.
            """
            if "@" not in address or address.count("@") != 1:
                raise ValueError(f"Invalid to_address: {address!r}")
            self._to_addresses.append(address)
            return self

        def cc(self, address: str) -> "EmailMessage.Builder":
            """Add a CC recipient email address.

            Args:
                address: Must contain exactly one '@' symbol.

            Returns:
                self for method chaining.
            """
            if "@" not in address or address.count("@") != 1:
                raise ValueError(f"Invalid cc_address: {address!r}")
            self._cc_addresses.append(address)
            return self

        def priority(self, value: str) -> "EmailMessage.Builder":
            """Set message priority level.

            Args:
                value: Must be one of 'low', 'normal', 'high', 'urgent'.

            Returns:
                self for method chaining.
            """
            valid = {"low", "normal", "high", "urgent"}
            if value not in valid:
                raise ValueError(
                    f"Priority must be one of {sorted(valid)}, got {value!r}"
                )
            self._priority = value
            return self

        def build(self) -> EmailMessage:
            """Construct the immutable EmailMessage.

            Raises:
                ValueError: If any required field is missing or invalid.

            Returns:
                A fully constructed, immutable EmailMessage instance.
            """
            if not self._subject:
                raise ValueError("Missing required field: subject")
            if not self._body:
                raise ValueError("Missing required field: body")
            if not self._from_address:
                raise ValueError("Missing required field: from_address")
            if not self._to_addresses:
                raise ValueError("At least one recipient is required (use .to())")

            return EmailMessage(
                subject=self._subject,
                body=self._body,
                from_address=self._from_address,
                to_addresses=tuple(self._to_addresses),
                cc_addresses=tuple(self._cc_addresses),
                priority=self._priority,
            )


# Usage — fluent, readable, self-documenting:
# message = (EmailMessage.Builder()
#     .subject("Quarterly Report")
#     .body("Please find attached...")
#     .from_address("reports@company.com")
#     .to("alice@company.com")
#     .cc("bob@company.com", "carol@company.com")
#     .priority("high")
#     .build())
```

### Pattern 2: BAD vs. GOOD — When Not to Use Builder

A common mistake is wrapping every class in a Builder regardless of complexity. The SOLID principle of **Single Responsibility** applies to pattern selection too — the Builder's responsibility is managing complex construction, not replacing all initialization.

```python
from __future__ import annotations

from dataclasses import dataclass


# ❌ BAD: Builder for a trivial two-field record adds noise without value
@dataclass(frozen=True)
class Point2D:
    x: float
    y: float

    class Builder:
        """Unnecessary builder — Point2D only has two parameters."""
        def __init__(self) -> None:
            self._x = 0.0
            self._y = 0.0

        def x(self, value: float) -> "Point2D.Builder":
            self._x = value
            return self

        def y(self, value: float) -> "Point2D.Builder":
            self._y = value
            return self

        def build(self) -> Point2D:
            return Point2D(x=self._x, y=self._y)


# Usage is worse than the simple constructor:
# point = (Point2D.Builder().x(1.0).y(2.0).build())  # Unnecessarily verbose

# ✅ GOOD: Use the straightforward dataclass constructor for simple types
point = Point2D(x=1.0, y=2.0)


# ✅ GOOD: Builder is justified when there are many optional fields
@dataclass(frozen=True)
class ReportConfig:
    title: str
    date_range_start: str
    date_range_end: str
    format: str = "pdf"  # "pdf", "csv", "xlsx", "html"
    include_charts: bool = True
    include_footnotes: bool = False
    recipients: tuple[str, ...] = field(default=tuple())
    priority: str = "normal"

    class Builder:
        """Builder justified by 8 fields (2 required + 6 optional)."""

        def __init__(self) -> None:
            self._title: Optional[str] = None
            self._date_range_start: Optional[str] = None
            self._date_range_end: Optional[str] = None
            self._format: str = "pdf"
            self._include_charts: bool = True
            self._include_footnotes: bool = False
            self._recipients: list[str] = []
            self._priority: str = "normal"

        def title(self, value: str) -> "ReportConfig.Builder":
            if not value:
                raise ValueError("Title is required")
            self._title = value
            return self

        def date_range(self, start: str, end: str) -> "ReportConfig.Builder":
            self._date_range_start = start
            self._date_range_end = end
            return self

        def format(self, value: str) -> "ReportConfig.Builder":
            valid = {"pdf", "csv", "xlsx", "html"}
            if value not in valid:
                raise ValueError(f"Format must be one of {sorted(valid)}")
            self._format = value
            return self

        def include_charts(self, value: bool) -> "ReportConfig.Builder":
            self._include_charts = value
            return self

        def recipients(self, *addresses: str) -> "ReportConfig.Builder":
            for addr in addresses:
                if "@" not in addr:
                    raise ValueError(f"Invalid recipient: {addr!r}")
            self._recipients.extend(addresses)
            return self

        def build(self) -> ReportConfig:
            if not self._title:
                raise ValueError("Missing required field: title")
            if not self._date_range_start or not self._date_range_end:
                raise ValueError("date_range() must be called before build()")
            return ReportConfig(
                title=self._title,
                date_range_start=self._date_range_start,
                date_range_end=self._date_range_end,
                format=self._format,
                include_charts=self._include_charts,
                include_footnotes=self._include_footnotes,
                recipients=tuple(self._recipients),
                priority=self._priority,
            )
```

### Pattern 3: Hierarchical Builder with Nested Sub-Objects

When a product contains complex nested objects, each sub-object gets its own Builder. The parent Builder orchestrates construction through delegation. This follows the **Composition over Inheritance** principle — nesting builders naturally mirrors the object graph.

```python
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class DatabaseDriver(Enum):
    postgresql = "postgresql"
    mysql = "mysql"
    sqlite = "sqlite"


@dataclass(frozen=True)
class ConnectionPool:
    """Configuration for a database connection pool."""
    min_size: int = field(default=5)
    max_size: int = field(default=20)
    checkout_timeout_ms: int = field(default=30_000)

    class Builder:
        def __init__(self) -> None:
            self._min_size: int = 5
            self._max_size: int = 20
            self._checkout_timeout_ms: int = 30_000

        def min_size(self, value: int) -> "ConnectionPool.Builder":
            if value < 1:
                raise ValueError("min_size must be >= 1")
            self._min_size = value
            return self

        def max_size(self, value: int) -> "ConnectionPool.Builder":
            if value < 1:
                raise ValueError("max_size must be >= 1")
            if value < self._min_size:
                raise ValueError("max_size must be >= min_size")
            self._max_size = value
            return self

        def checkout_timeout_ms(self, value: int) -> "ConnectionPool.Builder":
            if value < 0:
                raise ValueError("timeout must be >= 0")
            self._checkout_timeout_ms = value
            return self

        def build(self) -> ConnectionPool:
            return ConnectionPool(
                min_size=self._min_size,
                max_size=self._max_size,
                checkout_timeout_ms=self._checkout_timeout_ms,
            )


@dataclass(frozen=True)
class DatabaseConfig:
    """Immutable database configuration with nested connection pool."""
    driver: DatabaseDriver
    host: str
    port: int
    database: str
    username: str
    password: str
    pool: ConnectionPool = field(default_factory=ConnectionPool)
    ssl_enabled: bool = False
    schema: Optional[str] = None

    class Builder:
        """Hierarchical builder that delegates to ConnectionPool.Builder."""

        def __init__(self) -> None:
            self._driver: Optional[DatabaseDriver] = None
            self._host: Optional[str] = None
            self._port: Optional[int] = None
            self._database: Optional[str] = None
            self._username: Optional[str] = None
            self._password: Optional[str] = None
            self._pool_builder: ConnectionPool.Builder = ConnectionPool.Builder()
            self._ssl_enabled: bool = False
            self._schema: Optional[str] = None

        def driver(self, value: DatabaseDriver) -> "DatabaseConfig.Builder":
            self._driver = value
            return self

        def host(self, value: str) -> "DatabaseConfig.Builder":
            if not value:
                raise ValueError("host is required")
            self._host = value
            return self

        def port(self, value: int) -> "DatabaseConfig.Builder":
            if not 1 <= value <= 65535:
                raise ValueError(f"port must be 1-65535, got {value}")
            self._port = value
            return self

        def database(self, value: str) -> "DatabaseConfig.Builder":
            if not value:
                raise ValueError("database is required")
            self._database = value
            return self

        def credentials(
            self, username: str, password: str
        ) -> "DatabaseConfig.Builder":
            if not username or not password:
                raise ValueError("username and password are required")
            self._username = username
            self._password = password
            return self

        # --- Connection pool delegation (hierarchical) ---
        def pool(
            self,
            min_size: int = 5,
            max_size: int = 20,
            checkout_timeout_ms: int = 30_000,
        ) -> "DatabaseConfig.Builder":
            """Configure the nested ConnectionPool via builder delegation.

            Args:
                min_size: Minimum idle connections to maintain.
                max_size: Maximum connections allowed in the pool.
                checkout_timeout_ms: Max ms to wait for a connection from pool.

            Returns:
                self for method chaining.
            """
            self._pool_builder = (
                ConnectionPool.Builder()
                .min_size(min_size)
                .max_size(max_size)
                .checkout_timeout_ms(checkout_timeout_ms)
            )
            return self

        def ssl(self, enabled: bool = True) -> "DatabaseConfig.Builder":
            self._ssl_enabled = enabled
            return self

        def schema(self, value: str) -> "DatabaseConfig.Builder":
            if not value:
                raise ValueError("schema is required when set")
            self._schema = value
            return self

        # --- Build cascades to child builder ---
        def build(self) -> DatabaseConfig:
            """Construct with nested pool built from the child Builder."""
            required_fields = {
                "driver": self._driver,
                "host": self._host,
                "port": self._port,
                "database": self._database,
                "username": self._username,
                "password": self._password,
            }
            for name, val in required_fields.items():
                if val is None:
                    raise ValueError(f"Missing required field: {name}")

            return DatabaseConfig(
                driver=self._driver,
                host=self._host,
                port=self._port,
                database=self._database,
                username=self._username,
                password=self._password,
                pool=self._pool_builder.build(),  # Delegate to child build
                ssl_enabled=self._ssl_enabled,
                schema=self._schema,
            )


# Usage — nested object constructed via delegated builder calls:
# config = (DatabaseConfig.Builder()
#     .driver(DatabaseDriver.postgresql)
#     .host("db.example.com")
#     .port(5432)
#     .database("analytics")
#     .credentials("admin", "secret123")
#     .pool(min_size=10, max_size=50, checkout_timeout_ms=15_000)
#     .ssl(True)
#     .schema("public")
#     .build())
```

### Pattern 4: Director for Controlled Construction Algorithms

Use a `Director` when the same set of builder methods must be called in a specific, repeatable sequence to produce different but related product configurations. The Director encapsulates the construction *algorithm*; the Builder encapsulates the construction *mechanism*.

```python
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class HttpClientConfig:
    """HTTP client configuration with multiple preset variants."""
    base_url: str
    timeout_seconds: int = 30
    max_retries: int = 3
    retry_backoff_base: float = 2.0
    auth_token: Optional[str] = None
    user_agent: str = "HTTPClient/1.0"


class HttpClientConfigBuilder:
    """Standalone builder for HttpClientConfig (not nested, since multiple
    product types may share this builder)."""

    def __init__(self) -> None:
        self._base_url: Optional[str] = None
        self._timeout_seconds: int = 30
        self._max_retries: int = 3
        self._retry_backoff_base: float = 2.0
        self._auth_token: Optional[str] = None
        self._user_agent: str = "HTTPClient/1.0"

    def base_url(self, value: str) -> "HttpClientConfigBuilder":
        if not value.startswith(("http://", "https://")):
            raise ValueError("base_url must start with http:// or https://")
        self._base_url = value
        return self

    def timeout_seconds(self, value: int) -> "HttpClientConfigBuilder":
        if value < 1:
            raise ValueError("timeout_seconds must be >= 1")
        self._timeout_seconds = value
        return self

    def max_retries(self, value: int) -> "HttpClientConfigBuilder":
        if value < 0:
            raise ValueError("max_retries must be >= 0")
        self._max_retries = value
        return self

    def retry_backoff_base(self, value: float) -> "HttpClientConfigBuilder":
        if value < 1.0:
            raise ValueError("retry_backoff_base must be >= 1.0")
        self._retry_backoff_base = value
        return self

    def auth_token(self, value: str) -> "HttpClientConfigBuilder":
        self._auth_token = value
        return self

    def user_agent(self, value: str) -> "HttpClientConfigBuilder":
        if not value:
            raise ValueError("user_agent cannot be empty")
        self._user_agent = value
        return self

    def build(self) -> HttpClientConfig:
        if not self._base_url:
            raise ValueError("Missing required field: base_url")
        return HttpClientConfig(
            base_url=self._base_url,
            timeout_seconds=self._timeout_seconds,
            max_retries=self._max_retries,
            retry_backoff_base=self._retry_backoff_base,
            auth_token=self._auth_token,
            user_agent=self._user_agent,
        )


class Director:
    """Encapsulates construction algorithms for HttpClientConfig.

    A Director knows which builder methods to call and in what order,
    but does not know the implementation details of those calls.
    Different Director subclasses encode different preset configurations.
    """

    def __init__(self, builder: HttpClientConfigBuilder) -> None:
        self._builder = builder

    def configure_production(
        self, base_url: str, auth_token: Optional[str] = None
    ) -> HttpClientConfig:
        """Produce a production-ready HTTP client configuration.

        Args:
            base_url: The target service URL.
            auth_token: Optional bearer token for authenticated endpoints.

        Returns:
            A fully configured HttpClientConfig suitable for production use.
        """
        (
            self._builder.base_url(base_url)
            .timeout_seconds(10)
            .max_retries(3)
            .retry_backoff_base(2.0)
        )
        if auth_token:
            self._builder.auth_token(auth_token)
        self._builder.user_agent("MyApp/Production")
        return self._builder.build()

    def configure_test(
        self, base_url: str
    ) -> HttpClientConfig:
        """Produce a test-friendly HTTP client configuration.

        Args:
            base_url: Test server URL (e.g., http://localhost:8080).

        Returns:
            A fully configured HttpClientConfig for testing.
        """
        return (
            self._builder.base_url(base_url)
            .timeout_seconds(5)
            .max_retries(1)
            .retry_backoff_base(1.0)
            .user_agent("MyApp/Test")
            .build()
        )

    def configure_internal_service(
        self, base_url: str, service_account_token: str
    ) -> HttpClientConfig:
        """Produce a configuration optimized for internal-to-internal calls.

        Args:
            base_url: Internal service URL (e.g., http://payments-service:9090).
            service_account_token: mTLS or token-based auth credential.

        Returns:
            A fully configured HttpClientConfig for inter-service communication.
        """
        return (
            self._builder.base_url(base_url)
            .timeout_seconds(15)
            .max_retries(5)
            .retry_backoff_base(3.0)
            .auth_token(service_account_token)
            .user_agent("MyApp/InternalService")
            .build()
        )


# Usage — Director handles the algorithm, Builder handles the mechanics:
# builder = HttpClientConfigBuilder()
# director = Director(builder)
# prod_config = director.configure_production(
#     "https://api.example.com/v2", auth_token="tok_abc123"
# )
# test_config = director.configure_test("http://localhost:8080")
```

### Pattern 5: copy_builder for Derived Variants

Instead of building from scratch, clone an existing builder and override specific fields. This is valuable when you have a base configuration that needs slight variations (e.g., staging mirrors production with one changed URL).

```python
from __future__ import annotations


class ConfigBuilderWithCopy(HttpClientConfigBuilder):
    """Extends HttpClientConfigBuilder with copy_builder support."""

    def copy_builder(self) -> "ConfigBuilderWithCopy":
        """Create a deep copy of this builder for derived variants.

        Returns:
            A new builder instance with all current field values copied.
            Modifying the copy does not affect the original.
        """
        clone = ConfigBuilderWithCopy()
        clone._base_url = self._base_url
        clone._timeout_seconds = self._timeout_seconds
        clone._max_retries = self._max_retries
        clone._retry_backoff_base = self._retry_backoff_base
        clone._auth_token = self._auth_token
        clone._user_agent = self._user_agent
        return clone

    def production_from_staging(
        self, production_url: str, production_token: str
    ) -> HttpClientConfig:
        """Derive a production config from a staging configuration.

        Only the URL and auth token differ — everything else is shared.

        Args:
            production_url: The production API endpoint.
            production_token: Production bearer token.

        Returns:
            A production-ready HttpClientConfig.
        """
        derived = self.copy_builder()
        derived.base_url(production_url).auth_token(production_token)
        return derived.build()


# Usage — avoid duplicating the entire chain:
# staging_config = (HttpClientConfigBuilder()
#     .base_url("https://staging-api.example.com")
#     .timeout_seconds(10)
#     .max_retries(3)
#     .auth_token("tok_staging_xyz")
#     .user_agent("MyApp/Staging")
#     .build())
#
# prod_config = (ConfigBuilderWithCopy()
#     .production_from_staging("https://api.example.com", "tok_prod_abc"))
```

---

## Constraints

### MUST DO
- Define the target class as a `dataclass(frozen=True)` to enforce immutability at the type level
- Make every builder method return `self` for fluent chaining; never return `None` from builder methods
- Validate all required fields in `build()` and raise `ValueError` with a descriptive message identifying the missing field by name
- Use private `_field` attributes (not public properties) to prevent accidental mutation during construction
- For hierarchical builders, instantiate child builders fresh inside the parent's delegated method — never share mutable state between siblings
- Implement `copy_builder()` on any builder used for variant creation; it must copy all tracked state fields
- Keep builder methods focused: one field per method, no side effects beyond setting internal state
- When a Builder is nested inside the product, ensure Python version supports PEP 681 (`dataclasses.dataclass` with nested class) or use `__future__.annotations` for forward references

### MUST NOT DO
- Use a Builder for classes with fewer than 3–4 total parameters — telescoping constructors or a simple factory are clearer
- Return the builder instance from `build()` — this is the telescoping anti-pattern, not a real Builder
- Mutate shared mutable state (e.g., class-level lists) across builder invocations; each `__init__` call creates independent instances
- Use string-based field access (`self._data[field_name] = value`) when typed attributes are available — it defeats type checking and IDE autocomplete
- Skip validation of optional fields in the setter methods — validate at assignment time, not only at build time
- Expose internal builder state through properties that return mutable containers (lists, dicts) — callers could mutate the builder indirectly
- Create a Director that knows the concrete Builder implementation details — the Director should interact only with the Builder's public interface

---

## Comparison: Builder vs. Alternatives

| Criterion | `__init__` / simple constructor | Factory function | Builder pattern | Abstract Factory |
|---|---|---|---|---|
| Best for | ≤3–4 params, no variants | Single product type, reusable construction logic | Many optional params, multiple valid constructions, fluent API | Families of related products (multiple concrete builders) |
| Readability for complex objects | Poor — long positional arg list | Good — named function call | Excellent — self-documenting method chain | Good — but overkill for single product types |
| Immutability support | Full (pass fully built object) | Full (return new instance) | Full (`frozen=True` dataclass) | Full |
| Incremental construction | No | No | Yes | Partial (via concrete builders) |
| Step-by-step validation | Post-construction only | After full assembly | Per-field at assignment + final in `build()` | Same as Builder |

**Decision heuristic:** If you need 3+ builder methods to make the code readable, use a Builder. If fewer than 3, prefer `__init__` or a factory function.

---

## Related Skills

| Skill | Purpose |
|---|---|
| `coding-abstract-factory` | Use Abstract Factory when you need families of related objects (multiple concrete builder types), rather than step-by-step construction of a single complex object |
| `coding-chain-of-responsibility` | When the Builder pattern's step-by-step validation needs to be distributed across multiple independent validators, chain them via Chain of Responsibility before the final build |

---

## Live References

> Authoritative documentation and references for design patterns and Python best practices relevant to Builder implementation.

- [Python `dataclasses` documentation](https://docs.python.org/3/library/dataclasses.html) — Immutable dataclass with `frozen=True`
- [GoF Design Patterns: Structural Overview](https://en.wikipedia.org/wiki/Builder_pattern) — Wikipedia reference on the Builder pattern from the Gang of Four catalog
- [Effective Python, Item 3: Enforce correctness with __init__ and dataclasses](https://effectivepython.com) — Bertrand Meyer's contract design principles applied to Python
- [Fluent Interface Pattern (Martin Fowler)](https://martinfowler.com/bliki/FluentInterface.html) — Martin Fowler's definitive guide on fluent APIs
- [SOLID Principles — Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle) — Why Builder complexity must be justified
