---




name: dependency-injection-patterns
description: Implements dependency injection patterns (constructor injection, factory patterns, IoC containers, composition root) with Protocol-based interfaces for loose coupling and testable software architecture.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dependency injection, IoC, inversion of control, composition root, constructor injection, DI container, how do i decouple my classes, test with mock dependencies
  role: implementation
  scope: implementation
  output-format: code
  related-skills: design-for-testability, hexagonal-architecture, strategy-pattern
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




---





# Dependency Injection Patterns

Implements dependency injection (DI) and inversion of control (IoC) to decouple high-level business logic from low-level implementation details. This skill makes the model define narrow Protocol-based interfaces, inject dependencies through constructors, build composition root wiring modules, and create test doubles — producing code that is fully unit-testable without external services.

## TL;DR Checklist

- [ ] Every service depends on a `Protocol` or ABC, never on a concrete implementation
- [ ] All concrete instantiation lives in the composition root (one bootstrap file)
- [ ] Dependencies enter through constructor parameters — no globals, no default arguments, no class attributes holding dependencies
- [ ] Each Protocol declares only the methods the consumer actually uses (narrow interface)
- [ ] Composition root is the sole file importing both domain services and infrastructure packages simultaneously
- [ ] Unit tests substitute every injected dependency with a mock or fake — zero network or disk calls

---

## When to Use

Use this skill when:

- A service class instantiates concrete classes internally (databases, HTTP clients, file systems) making it impossible to test without those services running
- You need to swap implementations (e.g., SQLite → PostgreSQL, live API → mock) without editing business logic
- A bootstrap or startup module has cascading constructor calls across many services and becomes unmaintainable
- You are architecting an application layer (hexagonal / ports-and-adapters) and need the wiring discipline
- A code review flags "tight coupling" between domain logic and infrastructure concerns

## When NOT to Use

Avoid this skill for:

- Simple scripts or CLI tools with a single flow — overhead outweighs benefit
- One-off prototypes where implementation will be thrown away within days
- Framework-managed DI contexts where the framework already provides the container (e.g., FastAPI `Depends`, Django services) — follow the framework's pattern instead of building your own

---

## Core Workflow

1. **Audit concrete imports in business logic** — Scan every high-level module (domain services, application use-cases) for `import` statements referencing low-level packages (`sqlite3`, `httpx`, `boto3`, `redis`). Flag any `ConcreteClass()` construction inside method or constructor bodies. **Checkpoint:** List every violation on a table: file, line, concrete class, dependency it should be replaced with. No business logic file may import an infrastructure package.

2. **Define narrow Protocols from the consumer's perspective** — For each concrete dependency identified, create a `typing.Protocol` that declares only the methods the high-level module calls. Name the Protocol after the responsibility it fulfills (e.g., `OrderRepository`, not `SQLiteConnection`). Use structural subtyping (`Protocol`) when mypy can verify conformance automatically; use `abc.ABC` only when nominal inheritance or abstract method enforcement at runtime is required. **Checkpoint:** Run `mypy --strict` on all Protocol definitions and their claimed implementations — any missing method must be surfaced as a type error.

3. **Extract instantiation points via constructor injection** — Replace every inline `ConcreteClass()` call with a constructor parameter typed as the corresponding Protocol. If a class holds multiple dependencies, accept them all as explicit parameters in a single `__init__` signature. Remove infrastructure imports from business logic files; import only the Protocol definition and domain types. **Checkpoint:** After extraction, grepping for `from infra.` or `import sqlite3` inside service files returns zero results.

4. **Build the composition root** — Create a dedicated bootstrap module (typically `app.py`, `main.py`, or `bootstrap.py`) that is the single place in the entire application importing both high-level services and low-level concrete classes. Wire all dependencies by instantiating concretions first, then passing them to service constructors. For applications with 5+ services, use a dict-based factory registry to keep wiring declarative. **Checkpoint:** The composition root should be importable and callable (e.g., `bootstrap_production()`) without any business logic being executed during import — only definitions and factories are registered.

5. **Write test doubles and verify isolation** — Create fake implementations of every Protocol used by a service under test. For in-memory fakes, use simple dict-backed classes. For mocks, prefer `unittest.mock.MagicMock(spec=ProtocolClass)` over generic mocks. Run each unit test with all dependencies swapped; verify zero external calls via `mock.assert_called()` or equivalent. **Checkpoint:** If a single test must set environment variables to switch between test and production backends, the dependency is not fully injected — it should be passed at construction time instead.

---

## TL;DR for Code Generation

- Inject all dependencies through constructor parameters typed as `Protocol` or `ABC`; never use module-level globals, function defaults, or class attributes to hold dependencies
- Protocols must be narrow — declare only the methods the consumer actually calls; do not expose every method the provider supports
- The composition root is the ONLY file that simultaneously imports infrastructure packages and domain services
- Factory-based IoC containers are appropriate when a service has 5+ dependencies or when dynamic resolution between environments is needed
- All function signatures must include Python type hints with docstrings following Google style (Args, Returns)

---

## Implementation Patterns

### Pattern 1: Constructor Injection with Protocols (BAD vs GOOD)

The most common coupling violation: a service class imports and instantiates a concrete database client directly. The fix extracts a narrow Protocol that declares only the methods the service needs, then injects the implementation at bootstrap time.

```python
# ❌ BAD — OrderService owns its database connection; cannot test without SQLite running.
import sqlite3


class OrderService:
    """Orchestrates order lifecycle but owns its persistence concern."""

    def __init__(self) -> None:
        self.db = sqlite3.connect("orders.db")

    def create_order(self, customer_id: int, items: list[str], total: float) -> int:
        """Create a new order and persist it directly to SQLite."""
        cursor = self.db.cursor()
        cursor.execute(
            "INSERT INTO orders (customer_id, items, total) VALUES (?, ?, ?)",
            (customer_id, str(items), total),
        )
        self.db.commit()
        return cursor.lastrowid

    def get_order(self, order_id: int) -> dict | None:
        """Fetch an order by ID — returns deserialized row or None."""
        if order_id <= 0:
            raise ValueError(f"Invalid order_id: {order_id}")

        cursor = self.db.cursor()
        cursor.execute("SELECT id, customer_id, items, total FROM orders WHERE id = ?", (order_id,))
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "customer_id": row[1], "items": eval(row[2]), "total": row[3]}

    def update_order_total(self, order_id: int, new_total: float) -> bool:
        """Update an existing order's total; returns True if updated."""
        if new_total < 0:
            raise ValueError(f"Total cannot be negative: {new_total}")
        cursor = self.db.cursor()
        cursor.execute("UPDATE orders SET total = ? WHERE id = ?", (new_total, order_id))
        self.db.commit()
        return cursor.rowcount > 0


# ✅ GOOD — OrderService depends on the DataStore Protocol, not SQLite.
from dataclasses import dataclass
from typing import Protocol


class DataStore(Protocol):
    """Abstract contract for order persistence — what OrderService actually needs."""

    def save_order(self, customer_id: int, items: list[str], total: float) -> int: ...
    def get_order(self, order_id: int) -> dict | None: ...
    def update_total(self, order_id: int, new_total: float) -> bool: ...


class SQLiteOrderRepo:
    """Low-level concrete implementation of DataStore backed by SQLite."""

    def __init__(self, db_path: str = "orders.db") -> None:
        self.db_path = db_path
        self._ensure_table()

    def _ensure_table(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS orders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL,
                    items TEXT NOT NULL,
                    total REAL NOT NULL
                )
            """)

    def save_order(self, customer_id: int, items: list[str], total: float) -> int:
        """Persist a new order and return its auto-generated ID."""
        if not items:
            raise ValueError("Order must contain at least one item")
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "INSERT INTO orders (customer_id, items, total) VALUES (?, ?, ?)",
                (customer_id, str(items), total),
            )
            conn.commit()
            return cursor.lastrowid

    def get_order(self, order_id: int) -> dict | None:
        """Retrieve an order by ID, deserializing the items field."""
        if order_id <= 0:
            raise ValueError(f"Invalid order_id: {order_id}")
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT id, customer_id, items, total FROM orders WHERE id = ?",
                (order_id,),
            ).fetchone()
            if row is None:
                return None
            return {"id": row[0], "customer_id": row[1], "items": eval(row[2]), "total": row[3]}

    def update_total(self, order_id: int, new_total: float) -> bool:
        """Update an order's total; returns True if a row was modified."""
        if new_total < 0:
            raise ValueError(f"Total cannot be negative: {new_total}")
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "UPDATE orders SET total = ? WHERE id = ?", (new_total, order_id)
            )
            conn.commit()
            return cursor.rowcount > 0


# High-level service — zero infrastructure imports, only Protocol reference
class OrderServiceV2:
    """Order lifecycle management with dependency-injected persistence."""

    def __init__(self, store: DataStore) -> None:
        self.store = store

    def create_order(self, customer_id: int, items: list[str], total: float) -> int:
        """Create a new order through the injected store."""
        return self.store.save_order(customer_id, items, total)

    def get_order(self, order_id: int) -> dict | None:
        """Fetch an order by ID through the injected store."""
        return self.store.get_order(order_id)

    def update_order_total(self, order_id: int, new_total: float) -> bool:
        """Update an existing order's total through the injected store."""
        return self.store.update_total(order_id, new_total)


# Composition root — single place that imports both concrete and service
def build_application(db_path: str = "orders.db") -> OrderServiceV2:
    """Wire dependencies at application startup. Only this file knows about SQLiteOrderRepo."""
    store: DataStore = SQLiteOrderRepo(db_path=db_path)
    return OrderServiceV2(store=store)
```

### Pattern 2: Composition Root — Wiring Multiple Services

When an application has multiple services depending on shared infrastructure (database, cache, logger), the composition root becomes a single wiring module. This pattern keeps every business logic file unaware of concrete implementations.

```python
"""bootstrap.py — The composition root for the entire application."""

from typing import Protocol


# ---- Protocol definitions (live in domain/protocols.py) ----

class UserRepository(Protocol):
    """Contract for user persistence operations."""
    def get_user(self, user_id: int) -> dict | None: ...
    def save_user(self, user: dict) -> int: ...
    def delete_user(self, user_id: int) -> bool: ...


class CacheBackend(Protocol):
    """Contract for key-value caching."""
    def get(self, key: str) -> object | None: ...
    def set(self, key: str, value: object, ttl_seconds: int = 3600) -> None: ...
    def invalidate(self, key: str) -> bool: ...


class NotificationChannel(Protocol):
    """Contract for sending notifications to users."""
    def send_email(self, to_address: str, subject: str, body: str) -> bool: ...
    def send_sms(self, phone_number: str, message: str) -> bool: ...


class Logger(Protocol):
    """Contract for application logging."""
    def info(self, message: str, **context: object) -> None: ...
    def error(self, message: str, **context: object) -> None: ...
    def warn(self, message: str, **context: object) -> None: ...


# ---- Concrete implementations (live in infra/ packages) ----

class PostgresUserRepo:
    """Concrete user persistence backed by PostgreSQL via psycopg."""

    def __init__(self, connection_url: str, logger: Logger) -> None:
        self.connection_url = connection_url
        self.logger = logger

    def get_user(self, user_id: int) -> dict | None:
        """Fetch a user from PostgreSQL by ID."""
        self.logger.info("Fetching user", user_id=user_id)
        # Actual implementation would use psycopg cursor here
        return {"id": user_id, "name": "Test User", "email": "test@example.com"}

    def save_user(self, user: dict) -> int:
        """Insert or update a user record; returns the user ID."""
        self.logger.info("Saving user", user_id=user.get("id"))
        return user.get("id", 0)

    def delete_user(self, user_id: int) -> bool:
        """Delete a user by ID; returns True if deleted."""
        self.logger.info("Deleting user", user_id=user_id)
        return True


class InMemoryCache:
    """Concrete cache backed by an in-memory dictionary. Safe for tests and dev."""

    def __init__(self) -> None:
        self._store: dict[str, object] = {}

    def get(self, key: str) -> object | None:
        return self._store.get(key)

    def set(self, key: str, value: object, ttl_seconds: int = 3600) -> None:
        self._store[key] = value

    def invalidate(self, key: str) -> bool:
        return self._store.pop(key, None) is not None


class ConsoleLogger:
    """Concrete logger writing structured messages to stdout."""

    def info(self, message: str, **context: object) -> None:
        print(f"[INFO] {message} | {context}", flush=True)

    def error(self, message: str, **context: object) -> None:
        print(f"[ERROR] {message} | {context}", flush=True)

    def warn(self, message: str, **context: object) -> None:
        print(f"[WARN]  {message} | {context}", flush=True)


class EmailNotificationChannel:
    """Concrete notification channel sending email via SMTP."""

    def __init__(self, smtp_host: str = "smtp.example.com", smtp_port: int = 587) -> None:
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port

    def send_email(self, to_address: str, subject: str, body: str) -> bool:
        """Send an email via SMTP."""
        print(f"[SMTP] To: {to_address}, Subject: {subject}")
        return True

    def send_sms(self, phone_number: str, message: str) -> bool:
        """Send an SMS via a provider API."""
        print(f"[SMS]  To: {phone_number}, Message: {message}")
        return True


# ---- High-level services (depend only on Protocols) ----

class UserService:
    """User management with injected dependencies."""

    def __init__(self, user_repo: UserRepository, cache: CacheBackend, logger: Logger) -> None:
        self.user_repo = user_repo
        self.cache = cache
        self.logger = logger

    def get_user(self, user_id: int) -> dict | None:
        """Get a user, using cache with fallback to database."""
        cache_key = f"user:{user_id}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        user = self.user_repo.get_user(user_id)
        if user is not None:
            self.cache.set(cache_key, user, ttl_seconds=900)
        return user

    def register_user(self, name: str, email: str) -> int:
        """Register a new user and invalidate related cache entries."""
        user = {"name": name, "email": email}
        user_id = self.user_repo.save_user(user)
        self.logger.info("User registered", user_id=user_id, email=email)
        return user_id

    def delete_user(self, user_id: int) -> bool:
        """Delete a user and their cached entries."""
        deleted = self.user_repo.delete_user(user_id)
        if deleted:
            self.cache.invalidate(f"user:{user_id}")
            self.logger.info("User deleted", user_id=user_id)
        return deleted


class NotificationService:
    """Notification orchestration with injected channel."""

    def __init__(self, channel: NotificationChannel, logger: Logger) -> None:
        self.channel = channel
        self.logger = logger

    def send_welcome_email(self, to_address: str, name: str) -> bool:
        """Send a welcome email to a new user."""
        subject = f"Welcome {name}!"
        body = f"Hello {name}, welcome aboard."
        return self.channel.send_email(to_address, subject, body)


# ---- Composition Root Functions ----

def bootstrap_production(
    connection_url: str = "postgresql://localhost/app",
) -> dict[str, object]:
    """Build the full application with production-grade concrete implementations.

    Args:
        connection_url: PostgreSQL connection string for user persistence.

    Returns:
        Dict mapping service names to fully-wired instances.
    """
    logger = ConsoleLogger()
    cache = InMemoryCache()
    user_repo = PostgresUserRepo(connection_url=connection_url, logger=logger)
    emailer = EmailNotificationChannel()

    user_service = UserService(user_repo=user_repo, cache=cache, logger=logger)
    notification_service = NotificationService(channel=emailer, logger=logger)

    return {
        "user_service": user_service,
        "notification_service": notification_service,
        "logger": logger,
    }


def bootstrap_test() -> dict[str, object]:
    """Build the application with test doubles for every dependency.

    Returns:
        Dict mapping service names to fully-wired test instances.
    """
    from unittest.mock import MagicMock

    mock_logger = MagicMock(spec=Logger)
    mock_repo = MagicMock(spec=UserRepository)
    mock_cache = InMemoryCache()  # Already in-memory; safe for tests
    mock_channel = MagicMock(spec=NotificationChannel)

    user_service = UserService(user_repo=mock_repo, cache=mock_cache, logger=mock_logger)
    notification_service = NotificationService(channel=mock_channel, logger=mock_logger)

    return {
        "user_service": user_service,
        "notification_service": notification_service,
        "mock_logger": mock_logger,
        "mock_repo": mock_repo,
        "mock_cache": mock_cache,
        "mock_channel": mock_channel,
    }
```

### Pattern 3: IoC Container with Factory Registration

For applications with many services and nested dependencies, a dict-based factory registry keeps wiring declarative. Services can request their own dependencies from the container during construction — the container resolves the full graph.

```python
"""ioc_container.py — Lightweight DI container with factory registration."""

from typing import Any, Callable, TypeVar

T = TypeVar("T")


class Container:
    """Simple dict-based DI container for factory registration and lazy resolution.

    The container holds a mapping from interfaces (Protocol types) to factory callables.
    Factories receive the container itself as their sole argument, allowing nested
    dependency resolution without circular import problems. Instances are cached
    after first resolution so repeated calls return the same object.

    Usage:
        container = Container()
        container.register(Logger, lambda c: ConsoleLogger())
        container.register(UserRepository, lambda c: PostgresUserRepo(c.resolve(Logger)))
        service = container.resolve(UserService)  # Full graph resolved automatically
    """

    def __init__(self) -> None:
        self._factories: dict[type, Callable[..., Any]] = {}
        self._instances: dict[type, Any] = {}

    def register(self, interface: type[T], factory: Callable[..., T]) -> None:
        """Register a factory function for an interface.

        Args:
            interface: The Protocol or ABC type that the factory produces.
            factory: A callable taking the container and returning an instance.
        """
        if interface in self._instances:
            raise RuntimeError(
                f"Cannot re-register {interface.__name__} — already resolved. "
                "Call clear_instances() first or use a different approach."
            )
        self._factories[interface] = factory

    def resolve(self, interface: type[T]) -> T:
        """Resolve an interface to its concrete implementation.

        If the instance has not been created yet, the factory is called and
        the result is cached. Subsequent calls return the same instance.

        Args:
            interface: The Protocol or ABC type to resolve.

        Returns:
            The resolved concrete instance.

        Raises:
            LookupError: If no factory is registered for the requested interface.
        """
        if interface in self._instances:
            return self._instances[interface]  # type: ignore[return-value]

        if interface not in self._factories:
            raise LookupError(
                f"No factory registered for {interface.__name__}. "
                f"Available factories: {[k.__name__ for k in self._factories]}"
            )

        instance = self._factories[interface](self)
        self._instances[interface] = instance
        return instance  # type: ignore[return-value]

    def clear_instances(self) -> None:
        """Remove all cached instances. Factories remain registered."""
        self._instances.clear()


# ---- Example usage with Protocols and services ----

class ConfigStore(Protocol):
    """Contract for application configuration."""
    def get(self, key: str) -> str | None: ...
    def set(self, key: str, value: str) -> None: ...


class ConfigService:
    """Application configuration with injected storage backend."""

    def __init__(self, store: ConfigStore) -> None:
        self.store = store

    def get_setting(self, key: str, default: str | None = None) -> str | None:
        """Get a configuration value, falling back to default."""
        return self.store.get(key) or default

    def update_setting(self, key: str, value: str) -> None:
        """Update a configuration value in the backing store."""
        self.store.set(key, value)


class MemoryConfigStore:
    """Concrete ConfigStore backed by an in-memory dictionary."""

    def __init__(self) -> None:
        self._config: dict[str, str] = {}

    def get(self, key: str) -> str | None:
        return self._config.get(key)

    def set(self, key: str, value: str) -> None:
        self._config[key] = value


def build_config_service(container: Container) -> ConfigService:
    """Factory for ConfigService with its injected ConfigStore."""
    store = container.resolve(ConfigStore)
    return ConfigService(store=store)
```

### Pattern 4: Test Injection — Mocks and Fakes

Properly wired DI code enables writing unit tests that substitute every dependency. This section shows both `MagicMock` approaches and hand-written fake implementations.

```python
"""test_user_service.py — Demonstrating test injection with DI-wired code."""

import unittest
from unittest.mock import MagicMock, call


class TestUserService(unittest.TestCase):
    """Tests for UserService using injected mocks — zero infrastructure calls."""

    def setUp(self) -> None:
        """Create mock dependencies before each test method.

        Each mock uses spec=ProtocolClass to ensure only valid methods are called.
        This catches attribute errors at test time, not production runtime.
        """
        self.mock_logger = MagicMock(spec=UserRepository)  # Will be replaced below
        self.mock_logger = MagicMock()
        self.mock_repo = MagicMock(spec=UserRepository)
        self.mock_cache = MagicMock(spec=CacheBackend)

        # Pre-configure mock return values for the happy path
        self.mock_repo.get_user.return_value = {
            "id": 42,
            "name": "Alice",
            "email": "alice@example.com",
        }

    def test_get_user_returns_from_database_on_cache_miss(self) -> None:
        """When the cache is empty, get_user should fetch from the repository."""
        self.mock_cache.get.return_value = None  # Cache miss

        service = UserService(
            user_repo=self.mock_repo,
            cache=self.mock_cache,
            logger=self.mock_logger,
        )
        result = service.get_user(42)

        # Verify repository was called with correct ID
        self.mock_repo.get_user.assert_called_once_with(42)
        self.assertEqual(result["name"], "Alice")
        self.mock_logger.info.assert_called()

    def test_get_user_returns_from_cache_on_hit(self) -> None:
        """When the cache has data, get_user should return it without hitting DB."""
        cached_value = {"id": 99, "name": "Bob", "email": "bob@example.com"}
        self.mock_cache.get.return_value = cached_value

        service = UserService(
            user_repo=self.mock_repo,
            cache=self.mock_cache,
            logger=self.mock_logger,
        )
        result = service.get_user(99)

        # Verify repository was NOT called (cache hit)
        self.mock_repo.get_user.assert_not_called()
        self.assertEqual(result["id"], 99)
        self.assertEqual(result["name"], "Bob")

    def test_register_user_invalidates_related_cache(self) -> None:
        """When a new user is registered, related cache entries should be invalidated."""
        self.mock_repo.save_user.return_value = 100

        service = UserService(
            user_repo=self.mock_repo,
            cache=self.mock_cache,
            logger=self.mock_logger,
        )
        user_id = service.register_user("Charlie", "charlie@example.com")

        # Verify save was called with correct data
        self.mock_repo.save_user.assert_called_once()
        call_args = self.mock_repo.save_user.call_args[0][0]
        self.assertEqual(call_args["name"], "Charlie")
        self.assertEqual(call_args["email"], "charlie@example.com")
        self.assertEqual(user_id, 100)


class TestUserServiceWithFakes(unittest.TestCase):
    """Tests using hand-written fake implementations instead of mocks."""

    def setUp(self) -> None:
        """Create real but in-memory fake implementations for testing."""
        self.fake_repo = FakeUserRepository()
        self.fake_cache = InMemoryCache()  # Same class used in production bootstrap_test
        self.fake_logger = FakeLogger()

        self.service = UserService(
            user_repo=self.fake_repo,
            cache=self.fake_cache,
            logger=self.fake_logger,
        )

    def test_get_user_warm_cache_cycle(self) -> None:
        """First call hits the fake repo; second call returns from fake cache."""
        # Seed data via repository directly (bypassing service to control state)
        self.fake_repo.save_user({"id": 1, "name": "Diana", "email": "diana@example.com"})

        # First call: should go through the repo
        result_first = self.service.get_user(1)
        self.assertEqual(result_first["name"], "Diana")
        self.assertIn("Saving user", self.fake_logger.messages)

        # Second call: should come from cache (repo was NOT called again)
        repo_call_count = self.fake_repo._call_count
        result_second = self.service.get_user(1)
        self.assertEqual(result_second["name"], "Diana")

        # Verify no additional repository calls happened during the second fetch
        self.assertEqual(self.fake_repo._call_count, repo_call_count)


# ---- Fake implementations for testing ----

class FakeUserRepository:
    """In-memory fake of UserRepository for deterministic testing."""

    def __init__(self) -> None:
        self._users: dict[int, dict] = {}
        self._next_id: int = 1
        self._call_count: int = 0

    def get_user(self, user_id: int) -> dict | None:
        self._call_count += 1
        return self._users.get(user_id)

    def save_user(self, user: dict) -> int:
        """Save a user and assign an auto-increment ID."""
        if "id" not in user:
            user["id"] = self._next_id
            self._next_id += 1
        self._users[user["id"]] = user
        return user["id"]

    def delete_user(self, user_id: int) -> bool:
        return self._users.pop(user_id, None) is not None


class FakeLogger:
    """In-memory logger that records all messages for assertions."""

    def __init__(self) -> None:
        self.messages: list[str] = []

    def info(self, message: str, **context: object) -> None:
        self.messages.append(f"[INFO] {message} | {context}")

    def error(self, message: str, **context: object) -> None:
        self.messages.append(f"[ERROR] {message} | {context}")

    def warn(self, message: str, **context: object) -> None:
        self.messages.append(f"[WARN] {message} | {context}")
```

---

## Constraints

### MUST DO
- Define every dependency as a `Protocol` or ABC in the domain layer (where consumers live), never alongside the concrete implementation files
- Inject all dependencies through constructor parameters with explicit Protocol types; never use module-level globals, function default arguments like `db=None`, or class attributes assigned after construction
- The composition root is the ONLY file in the entire application that imports both infrastructure packages (`sqlite3`, `httpx`, `boto3`) and domain services simultaneously
- Protocols must be narrow — declare only the methods the consumer actually calls; do not expose every method the provider supports (Interface Segregation Principle)
- Use `typing.Protocol` over `abc.ABC` for structural subtyping (duck typing with mypy verification); use `abc.ABC` only when runtime abstract-method enforcement is required
- Every high-level service must have at least one test using mock or fake Protocol implementations — if a test cannot run without the infrastructure, the dependency is not injected
- Factory-based IoC containers accept `container: Container` in their factory callables for nested resolution; they cache resolved instances after first call to ensure singleton semantics

### MUST NOT DO
- Create a "Service Locator" anti-pattern — a global registry that business logic queries via method calls like `container.get(MyDependency)` from within service methods; dependencies must be explicit in constructors
- Use `importlib.import_module` or string-based lazy imports to hide dependencies at runtime — this conceals the true dependency graph from reviewers and type checkers
- Pass `**kwargs` of unknown dependencies through constructor signatures — be explicit about each dependency so type checkers, linters, and human reviewers can verify correctness
- Over-abstraction: creating a Protocol for every class even when only one implementation will ever exist and unit testing does not demand substitution
- Define Protocols inside the low-level implementation files — protocols belong in the domain layer where consumers live; this keeps the abstraction direction correct
- Wire dependencies at module level outside the composition root — all `ConcreteClass()` instantiation must happen inside a single bootstrap function or container factory

---

## Output Template

When applying this skill, produce your response in this structure:

1. **Violation Analysis** — Identify each concrete coupling violation found in the code (file, line, concrete class, suggested Protocol name)
2. **Protocol Definitions** — Show narrow Protocol interfaces with typed signatures and docstrings
3. **Refactored Service Code** — Show the service after constructor injection, with infrastructure imports removed
4. **Composition Root** — Show the bootstrap file wiring all concrete implementations to services
5. **Test Double Examples** — Provide at least one mock-based and one fake-based test example demonstrating isolation

---

## Related Skills

| Skill | Purpose |
|---|---|
| `design-for-testability` | DI is the structural mechanism that makes design-for-testability possible; this skill defines HOW to inject, that skill covers WHAT to design |
| `hexagonal-architecture` | DI implements the port-and-adapter wiring discipline at the code level; hexagonal architecture provides the broader boundary strategy |
| `strategy-pattern` | Strategy pattern handles algorithm polymorphism within a service; DI handles dependency substitution across services — they complement each other |

---

*References: DIP (Dependency Inversion Principle), IoC Container patterns, Composition Root (Martin Fowler), Python `typing.Protocol` documentation.*
