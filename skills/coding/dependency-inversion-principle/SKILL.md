---
name: dependency-inversion-principle
description: Refactors tightly coupled modules depending on concrete classes into decoupled designs using dependency injection, Python Protocols, factory registration, and inversion containers for testable architecture.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: dependency inversion principle, DIP, dependency injection, inversion of control, IoC, loose coupling, high level low level abstraction, constructor injection, factory pattern, testable architecture
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: single-responsibility, open-closed-principle, liskov-substitution-principle, interface-segregation-principle, hexagonal-architecture
---

# Dependency Inversion Principle (DIP)

Refactors tightly coupled systems where high-level business modules import and instantiate low-level concrete classes into decoupled architectures using dependency injection, Protocol-based abstractions, and factory registration. Ensures high-level policy code depends only on interfaces/protocols, while low-level details (databases, HTTP clients, file systems) implement those contracts — making the direction of dependencies invert from "outward" to "inward."

## TL;DR Checklist

- [ ] Trace all `import` statements in high-level modules — no concrete class references allowed
- [ ] Define a Protocol or ABC for every external dependency the business logic needs
- [ ] Move every `ConcreteClass()` instantiation out of business logic into the composition root
- [ ] Inject dependencies through constructor parameters (never globals, never function defaults)
- [ ] Build a single bootstrap module that wires all concrete implementations together
- [ ] Verify tests can substitute any dependency with a mock without touching business logic

---

## When to Use

Use this skill when:

- A business service class directly imports and instantiates `DatabaseConnection`, `SMTPClient`, or `Filesystem` objects in its constructor or methods
- Refactoring legacy code where the test suite cannot exercise individual components because they are hard-wired to production infrastructure (live databases, real payment gateways)
- Adding a second implementation for an existing dependency (e.g., switching from SQLite to PostgreSQL, or adding a Redis cache layer) would require editing dozens of business logic files
- Designing a new service from scratch and wanting to guarantee testability by construction rather than retrofitting mocks later
- Evaluating a codebase's architecture against the "dependency direction" criterion — if arrows point from high-level policy to low-level detail, inversion is needed

---

## When NOT to Use

Avoid this skill for:

- **Simple scripts and one-shot utilities** — A script that reads a config file and prints data has no business logic layer to invert. Direct imports are correct here.
- **Inner loops in performance-critical code** — Indirection through protocols adds negligible overhead, but if profiling shows the indirection is the bottleneck (extremely rare), inline the call.
- **When only one concrete implementation will ever exist and test isolation is irrelevant** — DIP's value is testability and substitutability; if neither matters, the abstraction costs more than it saves.
- **As a replacement for proper encapsulation** — DIP does not mean every class needs a Protocol interface. Only extract interfaces when two or more implementations are plausible or testing demands substitution.

---

## Core Workflow

1. **Trace import dependencies** — Audit high-level modules (business logic, domain services) to find `import` statements that pull in low-level concrete classes from infrastructure packages (`db.connection`, `http.client`, `os.path`). Build a dependency map showing which business functions instantiate which concretions directly.
   **Checkpoint:** Every direct `from infra.database import SQLiteConnection` inside a service file is a violation that must be addressed.

2. **Create the abstraction layer** — For each concrete dependency identified, define a `Protocol` (structural subtyping) or `ABC` (nominal subtyping). The Protocol should declare only the methods the high-level module actually calls — not every method the concrete class provides. Name the protocol from the consumer's perspective: if `OrderService` needs to persist orders, call it `OrderRepository`, not `DatabaseConnection`.
   **Checkpoint:** Run `mypy --strict` against the Protocol; any concrete implementation that claims conformance but is missing a required method must be flagged.

3. **Extract instantiation points** — Find every location where a concrete class is constructed inside business logic (constructor bodies, method bodies, module-level globals). Replace each with a constructor parameter typed as the corresponding Protocol/ABC. If a function creates multiple dependencies, accept them all as explicit parameters.
   **Checkpoint:** After extraction, the high-level module should contain zero imports from infrastructure packages — only import its own domain types and the Protocol definitions.

4. **Build the composition root** — Create a dedicated bootstrap file (commonly `app.py`, `main.py`, or `bootstrap.py`) that is the single place in the application responsible for wiring concrete implementations together. This module imports both low-level concretions and high-level services, constructs each concretion, then passes them to service constructors. Use a dict-based factory registry for large applications where dynamic resolution is needed.
   **Checkpoint:** The composition root should be the only file that imports from infrastructure packages and business logic simultaneously.

5. **Verify testability** — Write at least one unit test for each high-level service using mock Protocol implementations (e.g., `unittest.mock.MagicMock(spec=DataStore)` or a hand-written `FakeDataStore`). Verify the test runs without any network calls, database connections, or file system access.
   **Checkpoint:** If a test must configure environment variables to switch between test and production backends, you have not fully inlined the dependency — it should be injected at construction time.

---

## Implementation Patterns

### Pattern 1: Direct Database Import in Business Logic → Inject DataStore Protocol

The most common DIP violation: a service class imports a database connection class and instantiates it directly. The fix creates a narrow `DataStore` Protocol that declares only the methods the service needs, then injects an implementation at bootstrap time.

```python
# ❌ BAD — OrderService directly imports and instantiates a concrete database client.
# Cannot test without SQLite running; cannot switch to PostgreSQL without editing this file.
import sqlite3


class OrderService:
    """Orchestrates order lifecycle but owns its persistence concern."""

    def __init__(self):
        # High-level module depends on low-level detail directly
        self.db = sqlite3.connect("orders.db")

    def create_order(self, customer_id: int, items: list[str], total: float) -> int:
        """Create a new order and persist it."""
        cursor = self.db.cursor()
        cursor.execute(
            "INSERT INTO orders (customer_id, items, total) VALUES (?, ?, ?)",
            (customer_id, str(items), total),
        )
        self.db.commit()
        return cursor.lastrowid

    def get_order(self, order_id: int) -> dict | None:
        """Fetch an order by ID."""
        cursor = self.db.cursor()
        cursor.execute("SELECT * FROM orders WHERE id = ?", (order_id,))
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "customer_id": row[1], "items": eval(row[2]), "total": row[3]}


# ✅ GOOD — OrderService depends on the DataStore Protocol, not SQLite.
from dataclasses import dataclass
from typing import Protocol


class DataStore(Protocol):
    """Abstract contract for order persistence — what OrderService actually needs."""

    def save_order(self, customer_id: int, items: list[str], total: float) -> int: ...
    def get_order(self, order_id: int) -> dict | None: ...


class SQLiteOrderRepo:
    """Low-level concrete implementation of DataStore backed by SQLite."""

    def __init__(self, db_path: str = "orders.db") -> None:
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
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
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute(
                "INSERT INTO orders (customer_id, items, total) VALUES (?, ?, ?)",
                (customer_id, str(items), total),
            )
            conn.commit()
            return cursor.lastrowid

    def get_order(self, order_id: int) -> dict | None:
        with sqlite3.connect(self.db_path) as conn:
            row = conn.execute(
                "SELECT id, customer_id, items, total FROM orders WHERE id = ?",
                (order_id,),
            ).fetchone()
            if row is None:
                return None
            return {"id": row[0], "customer_id": row[1], "items": eval(row[2]), "total": row[3]}


# High-level service — no database import, only a Protocol reference
class OrderServiceV2:
    """Order lifecycle management with dependency-injected persistence."""

    def __init__(self, store: DataStore) -> None:
        self.store = store

    def create_order(self, customer_id: int, items: list[str], total: float) -> int:
        return self.store.save_order(customer_id, items, total)

    def get_order(self, order_id: int) -> dict | None:
        return self.store.get_order(order_id)


# Composition root — only place that imports both concrete and service
def build_application(db_path: str = "orders.db") -> OrderServiceV2:
    """Wire dependencies at application startup."""
    store: DataStore = SQLiteOrderRepo(db_path=db_path)
    return OrderServiceV2(store=store)
```

---

### Pattern 2: Hardcoded HTTP Client in Service Layer → Inject HttpClient Protocol

Business services often hardcode `requests.post()` or `httpx.Client()` calls inside their methods. Inverting this through an HTTP client Protocol enables swapping between live API clients and mock responses during testing.

```python
# ❌ BAD — PaymentService directly uses the requests library, coupling
# business logic to a specific HTTP client and making integration testing mandatory.
import requests


class PaymentService:
    """Processes payments but hardcodes an HTTP client."""

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key
        self._base_url = "https://api.payment-provider.com/v1"

    def charge(self, customer_id: str, amount_cents: int, currency: str = "usd") -> dict:
        """Charge a customer via the payment gateway — tightly coupled to requests."""
        url = f"{self._base_url}/charges"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"customer": customer_id, "amount": amount_cents, "currency": currency}

        response = requests.post(url, json=payload, headers=headers, timeout=10)  # Concrete HTTP call
        response.raise_for_status()
        return response.json()

    def refund(self, charge_id: str, amount_cents: int | None = None) -> dict:
        """Refund a previous charge — same hardcoded coupling."""
        url = f"{self._base_url}/charges/{charge_id}/refunds"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {"amount": amount_cents} if amount_cents else {}

        response = requests.post(url, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()


# ✅ GOOD — PaymentService depends on an HTTP Transport Protocol, not requests.
from typing import Any, Protocol


class HttpClient(Protocol):
    """Abstract contract for any HTTP client the service needs to call external APIs."""

    def post(self, url: str, json: dict | None = None, headers: dict[str, str] | None = None, timeout: int = 10) -> dict: ...


class LiveHttpClient:
    """Concrete HTTP client that delegates to requests behind the Protocol abstraction."""

    def __init__(self, base_url: str, api_key: str) -> None:
        self.base_url = base_url
        self.api_key = api_key

    def post(self, url: str, json: dict | None = None, headers: dict[str, str] | None = None, timeout: int = 10) -> dict:
        full_headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        if headers:
            full_headers.update(headers)

        response = requests.post(url, json=json, headers=full_headers, timeout=timeout)
        response.raise_for_status()
        return response.json()


class MockHttpClient:
    """Fake HTTP client for unit testing — no network calls."""

    def __init__(self, responses: dict[str, dict] | None = None) -> None:
        self.responses: dict[str, dict] = responses or {}
        self.request_log: list[dict] = []

    def post(self, url: str, json: dict | None = None, headers: dict[str, str] | None = None, timeout: int = 10) -> dict:
        self.request_log.append({"method": "POST", "url": url, "json": json})

        # Match response by extracting the endpoint path
        for pattern, response in self.responses.items():
            if pattern in url:
                return response

        raise requests.HTTPError(f"No mock response configured for: {url}")


class PaymentServiceV2:
    """Payment processing with dependency-injected HTTP transport."""

    def __init__(self, client: HttpClient) -> None:
        self.client = client

    def charge(self, customer_id: str, amount_cents: int, currency: str = "usd") -> dict:
        response = self.client.post(
            f"{self.base_url}/charges",
            json={"customer": customer_id, "amount": amount_cents, "currency": currency},
        )
        return response

    def refund(self, charge_id: str, amount_cents: int | None = None) -> dict:
        url = f"{self.base_url}/charges/{charge_id}/refunds"
        payload = {"amount": amount_cents} if amount_cents else {}
        return self.client.post(url, json=payload)


# Composition root selects the appropriate HTTP client
def build_payment_service(mode: str = "production") -> PaymentServiceV2:
    """Build payment service with either live or mock transport."""
    base_url = "https://api.payment-provider.com/v1"
    api_key = "sk_live_abc123" if mode == "production" else "sk_test_xyz789"

    if mode == "testing":
        client: HttpClient = MockHttpClient(responses={
            "/charges": {"id": "ch_mock123", "status": "succeeded"},
            "/refunds": {"id": "re_mock456", "status": "refunded"},
        })
    else:
        client = LiveHttpClient(base_url=base_url, api_key=api_key)

    return PaymentServiceV2(client=client)
```

---

### Pattern 3: Filesystem Operations Scattered Through Domain Classes → Inject FileSystem Protocol

Domain classes that call `open()`, `os.path.exists()`, or `pathlib.Path.write_text()` directly are impossible to unit test deterministically. Extracting a `FileSystem` Protocol abstracts away the I/O layer.

```python
# ❌ BAD — ReportGenerator reads and writes files directly in domain methods.
# Cannot test report generation without creating real files on disk.
import json
import os
from pathlib import Path
from datetime import date


class ReportGenerator:
    """Generates monthly reports but couples to the real file system."""

    def __init__(self, output_dir: str = "/var/reports") -> None:
        self.output_dir = Path(output_dir)

    def generate_monthly_report(self, month: str, data: dict) -> Path:
        """Generate and save a monthly report — directly uses pathlib."""
        filename = f"report_{month}.json"
        filepath = self.output_dir / filename

        # Direct file system operations inside domain logic
        if not self.output_dir.exists():
            self.output_dir.mkdir(parents=True, exist_ok=True)

        content = json.dumps({
            "month": month,
            "generated_at": date.today().isoformat(),
            "data": data,
        }, indent=2)

        filepath.write_text(content)  # Tight coupling to real disk I/O
        return filepath

    def load_previous_report(self, month: str) -> dict | None:
        """Load a previous report — more direct file system calls."""
        filepath = self.output_dir / f"report_{month}.json"
        if not filepath.exists():
            return None
        content = filepath.read_text()  # Tight coupling to real disk I/O
        return json.loads(content)


# ✅ GOOD — ReportGenerator depends on FileSystem Protocol, enabling in-memory test doubles.
from typing import IO, Any, Mapping, Protocol


class FileSystem(Protocol):
    """Abstract contract for file system operations the report generator needs."""

    def read_text(self, path: str) -> str: ...
    def write_text(self, path: str, content: str) -> None: ...
    def exists(self, path: str) -> bool: ...


class RealFileSystem:
    """Concrete FileSystem backed by the actual operating system."""

    def read_text(self, path: str) -> str:
        return Path(path).read_text(encoding="utf-8")

    def write_text(self, path: str, content: str) -> None:
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(content, encoding="utf-8")

    def exists(self, path: str) -> bool:
        return Path(path).exists()


class InMemoryFileSystem:
    """Fake file system for testing — stores content in memory dictionaries."""

    def __init__(self) -> None:
        self._files: dict[str, str] = {}
        self._dirs: set[str] = {"/"}

    def read_text(self, path: str) -> str:
        if path not in self._files:
            raise FileNotFoundError(f"File not found: {path}")
        return self._files[path]

    def write_text(self, path: str, content: str) -> None:
        self._dirs.add(str(Path(path).parent))
        self._files[path] = content

    def exists(self, path: str) -> bool:
        return path in self._files


class ReportGeneratorV2:
    """Report generation with injected file system — fully testable."""

    def __init__(self, fs: FileSystem, output_dir: str = "/reports") -> None:
        self.fs = fs
        self.output_dir = output_dir.rstrip("/")

    def generate_monthly_report(self, month: str, data: dict) -> str:
        """Generate and save a monthly report — uses abstracted file system."""
        filename = f"report_{month}.json"
        filepath = f"{self.output_dir}/{filename}"

        content = json.dumps({
            "month": month,
            "generated_at": date.today().isoformat(),
            "data": data,
        }, indent=2)

        self.fs.write_text(filepath, content)
        return filepath

    def load_previous_report(self, month: str) -> dict | None:
        """Load a previous report — uses abstracted file system."""
        filepath = f"{self.output_dir}/report_{month}.json"
        if not self.fs.exists(filepath):
            return None
        content = self.fs.read_text(filepath)
        return json.loads(content)
```

---

### Pattern 4: Multiple Concrete Dependencies Causing Complex Instantiation Cascades → Factory/Dict-Based DI Registration

When a service depends on five or more injected dependencies, the bootstrap code becomes unwieldy. A factory registry pattern with named registrations keeps wiring declarative and easy to extend without creating circular import problems.

```python
# ❌ BAD — Every new service requires updating multiple files with
# cascading constructor calls that are hard to trace and test.
class Application:
    """Tightly coupled bootstrap — every dependency creates a cascade."""

    def __init__(self):
        self.db = Database("postgresql://localhost/app")
        self.cache = RedisCache(host="redis://localhost")
        self.emailer = SMTPClient(host="smtp.company.com", port=587)
        self.payment = PaymentGateway(api_key="sk_live_abc")
        self.logger = FileLogger(path="/var/log/app.log")

        # Service construction cascades through dependencies
        self.order_service = OrderService(
            db=self.db,
            cache=self.cache,
            logger=self.logger,
        )
        self.notification_service = NotificationService(
            emailer=self.emailer,
            db=self.db,
            logger=self.logger,
        )
        self.payment_processor = PaymentProcessor(
            payment=self.payment,
            db=self.db,
            cache=self.cache,
            logger=self.logger,
            notification=self.notification_service,  # Service depends on another service
        )


# ✅ GOOD — Factory registry keeps wiring declarative in a single bootstrap module.
from typing import Callable, TypeVar

T = TypeVar("T")


class Container:
    """Simple dict-based DI container for factory registration and resolution."""

    def __init__(self) -> None:
        self._factories: dict[type, Callable] = {}
        self._instances: dict[type, Any] = {}

    def register(self, interface: type[T], factory: Callable[..., T]) -> None:
        """Register a factory function for an interface. Called at bootstrap."""
        self._factories[interface] = factory

    def resolve(self, interface: type[T]) -> T:
        """Resolve an interface to its concrete implementation."""
        if interface not in self._instances:
            if interface not in self._factories:
                raise LookupError(f"No factory registered for {interface.__name__}")
            self._instances[interface] = self._factories[interface](self)
        return self._instances[interface]  # type: ignore


# --- Protocol definitions (same as patterns above, abbreviated) ---
class UserRepository(Protocol):
    def get_user(self, user_id: int) -> dict | None: ...
    def save_user(self, user: dict) -> None: ...


class CacheBackend(Protocol):
    def get(self, key: str) -> Any | None: ...
    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None: ...


class NotificationChannel(Protocol):
    def send(self, to: str, subject: str, body: str) -> bool: ...


# --- Concrete implementations ---
class PostgresUserRepo:
    """Concrete user persistence backed by PostgreSQL."""

    def __init__(self, container: Container) -> None:
        # Nested dependency: repo needs its own logger
        self.logger = container.resolve(Logger)

    def get_user(self, user_id: int) -> dict | None:
        self.logger.info(f"Fetching user {user_id}")
        return {"id": user_id, "name": "Test User", "email": "test@example.com"}

    def save_user(self, user: dict) -> None:
        self.logger.info(f"Saving user {user['id']}")


class InMemoryCache:
    """Concrete cache backed by an in-memory dictionary."""

    def get(self, key: str) -> Any | None:
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> None:
        pass


class EmailChannel:
    """Concrete notification channel sending via SMTP."""

    def __init__(self, host: str = "smtp.example.com", port: int = 587) -> None:
        self.host = host
        self.port = port

    def send(self, to: str, subject: str, body: str) -> bool:
        return True


class ConsoleLogger:
    """Concrete logger writing to stdout."""

    def info(self, message: str) -> None:
        print(f"[INFO] {message}")

    def error(self, message: str) -> None:
        print(f"[ERROR] {message}", flush=True)


# --- High-level services (depend on Protocols only) ---
class UserService:
    """User management with injected dependencies."""

    def __init__(self, user_repo: UserRepository, cache: CacheBackend, logger: Logger) -> None:
        self.user_repo = user_repo
        self.cache = cache
        self.logger = logger

    def get_user(self, user_id: int) -> dict | None:
        cache_key = f"user:{user_id}"
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        user = self.user_repo.get_user(user_id)
        if user is not None:
            self.cache.set(cache_key, user)
        return user


class NotificationService:
    """Notification orchestration with injected channel."""

    def __init__(self, channel: NotificationChannel, logger: Logger) -> None:
        self.channel = channel
        self.logger = logger

    def send_welcome(self, to: str, name: str) -> bool:
        return self.channel.send(to, f"Welcome {name}!", f"Hello {name}, welcome aboard.")


# --- Composition Root (single place for wiring) ---
class Logger(Protocol):
    """Protocol for logging — services depend on this, concrete loggers implement it."""
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


def bootstrap_production() -> Container:
    """Production wiring — resolves all dependencies in a single place."""
    container = Container()

    # Register factories (callable that takes the container for nested resolution)
    container.register(Logger, lambda c: ConsoleLogger())
    container.register(UserRepository, lambda c: PostgresUserRepo(container))
    container.register(CacheBackend, lambda c: InMemoryCache())
    container.register(NotificationChannel, lambda c: EmailChannel())

    # Register services that depend on the above
    container.register(UserService, lambda c: UserService(
        user_repo=c.resolve(UserRepository),
        cache=c.resolve(CacheBackend),
        logger=c.resolve(Logger),
    ))
    container.register(NotificationService, lambda c: NotificationService(
        channel=c.resolve(NotificationChannel),
        logger=c.resolve(Logger),
    ))

    return container


def bootstrap_test() -> Container:
    """Testing wiring — swap all concrete implementations with fakes."""
    container = Container()

    from unittest.mock import MagicMock

    container.register(Logger, lambda c: MagicMock())  # No-op logger
    container.register(UserRepository, lambda c: MagicMock(get_user=lambda uid: {"id": uid, "name": "Mock"}, save_user=lambda u: None))
    container.register(CacheBackend, lambda c: InMemoryCache())  # Already in-memory, safe for tests
    container.register(NotificationChannel, lambda c: MagicMock(send=lambda t, s, b: True))

    container.register(UserService, lambda c: UserService(
        user_repo=c.resolve(UserRepository),
        cache=c.resolve(CacheBackend),
        logger=c.resolve(Logger),
    ))

    return container
```

---

## Constraints

### MUST DO

- High-level modules must never import or reference low-level concrete classes — only Protocol definitions, ABCs, or abstract base classes
- All dependency injection must go through constructor parameters; never use module-level globals, function default arguments, or class-level attributes to hold dependencies
- The composition root (bootstrap file) is the ONLY place in the application that creates concrete class instances and imports from infrastructure packages simultaneously
- Protocol definitions should be narrow — declare only the methods the consumer actually uses, not every method the provider supports
- Use `typing.Protocol` over `abc.ABC` when you need structural subtyping (duck typing with mypy support); use ABCs when nominal inheritance is required
- Every high-level service must have at least one test that substitutes all injected dependencies with mock or fake implementations

### MUST NOT DO

- Use `importlib.import_module` or string-based lazy imports to avoid explicit dependencies at runtime — this hides dependencies rather than declaring them
- Create a "Service Locator" pattern — a global registry that modules query for their dependencies via method calls like `container.get(MyDependency)` from within business logic; this conceals the true dependency graph
- Pass `**kwargs` of unknown dependencies through constructor signatures — be explicit about each dependency so type checkers and reviewers can verify correctness
- Define Protocols inside the low-level implementation files — protocols belong in the domain layer where consumers live, not alongside the concrete implementations
- Over-abstraction: creating a Protocol for every class even when only one implementation will ever exist and testing does not demand substitution

---

## Related Skills

| Skill | Purpose |
|---|---|
| `single-responsibility` | DIP pairs with SRP — once dependencies are inverted, each service naturally has a single reason to change |
| `open-closed-principle` | Inverted dependencies enable OCP: add new implementations (new database drivers, new payment gateways) without modifying existing high-level code |
| `liskov-substitution-principle` | Protocol-based DIP ensures all implementations honor the same contract, making LSP violations detectable by type checkers |
| `interface-segregation-principle` | Narrow Protocols avoid fat interfaces — each consumer defines only the methods it needs |
| `hexagonal-architecture` | DIP is the structural foundation of hexagonal/ports-and-adapters architecture: business logic at the center depends on ports, adapters implement those ports |
