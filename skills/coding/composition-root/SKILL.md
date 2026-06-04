---
name: composition-root
description: Assembles dependency graphs at a single entry point using constructor
  injection, DI containers, and factory patterns to wire adapters to ports in hexagonal
  and layered architectures.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: composition root, dependency injection wiring, DI container, adapter registration,
    how do i wire my dependencies, service locator anti-pattern, object graph assembly,
    factory pattern, IoC container
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
  - do-dont
  - examples
  related-skills: hexagonal-architecture, ports-patterns, dependency-inversion-principle,
    test-driven-development, error-handling
---
# Composition Root & Dependency Injection Patterns

Acts as a senior software architect designing dependency injection composition roots. When loaded, the model assembles complete object graphs at a single entry point, selects appropriate DI strategies (manual wiring, factory functions, or container libraries), manages object lifecycles (singleton, per-request, transient), and produces concrete bootstrap code that enforces explicit dependency flow without service locator anti-patterns.

## TL;DR Checklist

- [ ] Identify every concrete class that must be instantiated and the interfaces it implements
- [ ] Build a single bootstrap function or module that creates all instances — never instantiate concretions inside business logic
- [ ] Prefer manual factory wiring for small-to-medium apps; reach for DI containers only when wiring complexity becomes unmanageable
- [ ] Use constructor injection exclusively — no property injection, no method injection, no defaults in constructors that hide dependencies
- [ ] Manage object lifecycles explicitly: singleton (shared state), per-request (HTTP scope), transient (new instance each use)
- [ ] Verify the composition root by calling it and exercising a complete use case with real infrastructure
- [ ] Ensure every test has its own bootstrap path that swaps production concretions for fakes

---

## When to Use

Use this skill when:

- Designing application startup code for a new service and needing to wire together core use cases, repository adapters, and external clients
- Refactoring an existing application where concrete classes are instantiated in scattered locations across the codebase (the "new everywhere" anti-pattern)
- Building both production and test bootstrap paths that share the same domain logic but swap different adapter implementations
- Migrating from hard-coded dependencies to explicit dependency injection without introducing a heavy DI framework
- Evaluating whether an application needs a DI container library or if manual wiring suffices based on object graph complexity

---

## When NOT to Use

Avoid this skill for:

- **Scripts and CLI tools with one-shot execution** — A script that reads config, processes data, and exits has no object graph worth assembling
- **Framework-managed applications using built-in DI** — If you're in FastAPI (with `Depends`), Django (with service classes), or similar frameworks that provide their own wiring mechanisms, use the framework's patterns rather than introducing a separate composition root
- **Prototypes and hackathon projects** — The goal is speed; explicit dependency graphs add ceremony that delays delivery
- **When every dependency is truly singleton with no lifecycle concerns** — If you only need one shared instance of each class with no configuration differences between environments, direct imports in a service registry may suffice

---

## Core Workflow

1. **Inventory all concrete dependencies** — List every infrastructure adapter, external client, utility service, and domain service that your application needs at runtime. For each dependency, note: the interface it implements (Protocol or ABC), whether it holds mutable state requiring shared instances, and which other services depend on it.
   **Checkpoint:** Draw a directed graph where nodes are concrete classes and edges represent constructor dependencies. The composition root is the entry point that creates every node in topological order.

2. **Choose a wiring strategy** — Select between three approaches based on object graph complexity: (a) manual factory function — one function returning a fully wired service, suitable for up to ~15 concrete classes; (b) DI container with explicit registration — use `dependency-injector` or a simple dict-based registry for larger apps; (c) per-request scope wiring — required when services have request-scoped state (e.g., HTTP request context). For most applications, manual factory functions are sufficient and preferred.
   **Checkpoint:** If the wiring function exceeds 50 lines of sequential `container.register(...)` calls or nested constructor arguments exceed 5 parameters, consider a DI container library.

3. **Implement the factory function** — Write a single function (commonly named `build_application`, `create_app`, or `bootstrap`) that: imports all concrete classes, instantiates leaf dependencies first (those with no injected dependencies), then builds upward through the dependency graph. Each instantiation passes explicitly constructed arguments — never `None` placeholders or environment-variable lookups inside business logic.
   **Checkpoint:** The factory function's parameter list should accept only configuration values (connection strings, API keys, feature flags). Every internal dependency must be created within the function body.

4. **Create test bootstrap paths** — For each production factory function, create a corresponding test version that substitutes every injected dependency with a fake or mock implementation. Use the same interface types so the calling code is identical between production and test — only the bootstrap differs.
   **Checkpoint:** Call the test bootstrap function and run a complete end-to-end unit test (one use case from external input to domain output). It must execute without any network calls, database connections, or filesystem access.

5. **Wire per-request dependencies** — If your application serves HTTP requests, create a second factory function that runs once per request. This function receives the request context (e.g., `Request` object from FastAPI) and creates request-scoped services like database sessions, current-user resolvers, and request-specific caches. The production root injects this request factory into the relevant adapters.
   **Checkpoint:** Request-scoped services must not leak state across requests — each invocation of the per-request factory creates fresh instances with no shared mutable state from previous requests.

---

## Implementation Patterns

### Pattern 1: Manual Composition Root (Factory Function Wiring)

The simplest and most explicit wiring approach. A single factory function imports all concrete classes, constructs leaf dependencies first, then builds upward through the dependency graph. Ideal for applications up to ~15 concrete classes.

```python
from __future__ import annotations

# --- Domain layer: Protocols (interfaces) ---
from typing import Protocol


class OrderRepository(Protocol):
    """Interface that order service needs from persistence."""

    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...


class NotificationChannel(Protocol):
    """Interface for sending notifications to users."""

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool: ...


class Logger(Protocol):
    """Interface for logging infrastructure calls."""

    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


# --- Infrastructure layer: concrete implementations ---
class PostgresOrderRepo:
    """Persistence adapter backed by PostgreSQL."""

    def __init__(self, connection_string: str, logger: Logger) -> None:
        self._logger = logger
        # Real implementation would create a real database connection here

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        self._logger.info(f"Saving order {order_id} for user {user_id}")
        # Real code: execute INSERT via psycopg2 or SQLAlchemy

    def get(self, order_id: str) -> dict | None:
        self._logger.info(f"Fetching order {order_id}")
        # Real code: execute SELECT via psycopg2 or SQLAlchemy
        return {"id": order_id, "user_id": user_id, "total_cents": total_cents}


class EmailNotificationChannel:
    """Sends order confirmations via SMTP email."""

    def __init__(self, smtp_host: str, smtp_port: int, sender: str, logger: Logger) -> None:
        self._smtp_host = smtp_host
        self._smtp_port = smtp_port
        self._sender = sender
        self._logger = logger

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        self._logger.info(f"Sending confirmation to {user_email} for order {order_id}")
        # Real code: connect to SMTP server and send email
        return True


class ConsoleLogger:
    """Simple logger writing to stdout/stderr."""

    def info(self, message: str) -> None:
        print(f"[INFO] {message}")

    def error(self, message: str) -> None:
        print(f"[ERROR] {message}", flush=True)


# --- Domain layer: services (depend on protocols only) ---
class OrderService:
    """Core business logic for order management."""

    def __init__(self, repo: OrderRepository, notifier: NotificationChannel, logger: Logger) -> None:
        self._repo = repo
        self._notifier = notifier
        self._logger = logger

    def create_order(self, user_id: str, user_email: str, items: list[dict], total_cents: int) -> str:
        """Create a new order with the given items."""
        if not items:
            raise ValueError("Order must contain at least one item")

        order_id = f"ord_{user_id}_{len(items)}"  # Simplified ID generation

        self._repo.save(order_id=order_id, user_id=user_id, total_cents=total_cents)
        self._notifier.send_order_confirmation(user_email, order_id, total_cents)
        self._logger.info(f"Order {order_id} created for user {user_id}")

        return order_id


class ProductService:
    """Core business logic for product catalog."""

    def __init__(self, repo: OrderRepository, logger: Logger) -> None:  # Using same repo as example
        self._repo = repo
        self._logger = logger


# --- Composition Root: single entry point for dependency wiring ---
def build_production_app(
    db_connection_string: str = "postgresql://localhost/orders",
    smtp_host: str = "smtp.gmail.com",
    smtp_port: int = 587,
    email_sender: str = "noreply@example.com",
) -> OrderService:
    """Assemble the complete application object graph for production.

    This is the ONLY place in the application where concrete classes are
    instantiated and imported together. All business logic depends only
    on Protocol interfaces injected through constructors.
    """
    # 1. Leaf dependencies (no injected dependencies of their own)
    logger: Logger = ConsoleLogger()

    # 2. Infrastructure adapters (depend on leaf dependencies)
    repo: OrderRepository = PostgresOrderRepo(connection_string=db_connection_string, logger=logger)
    notifier: NotificationChannel = EmailNotificationChannel(
        smtp_host=smtp_host,
        smtp_port=smtp_port,
        sender=email_sender,
        logger=logger,
    )

    # 3. Domain services (depend on infrastructure adapters via protocols)
    order_service: OrderService = OrderService(repo=repo, notifier=notifier, logger=logger)

    # 4. Return the top-level service — the composition root returns
    #    the entry point of the application, not every individual service
    return order_service


# Usage (in main.py or entry point):
# app = build_production_app(db_connection_string="postgresql://prod-db/orders")
# order_id = app.create_order(user_id="u123", user_email="alice@example.com", items=[{"sku": "A1", "qty": 2}], total_cents=4998)
```

### Pattern 2: DI Container with Explicit Registration (dependency-injector Library)

For applications where manual wiring becomes unwieldy, use a lightweight DI container. The `dependency-injector` library provides explicit registration, lifecycle management, and per-request scoping without magic or hidden dependencies.

```python
from dependency_injector import containers, providers
from dependency_injector.wiring import Provide, inject


# --- Protocol definitions (abbreviated — same as Pattern 1) ---
class OrderRepository(Protocol):
    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...


class NotificationChannel(Protocol):
    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool: ...


class Logger(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


# --- Concrete implementations (abbreviated) ---
class PostgresOrderRepo:
    def __init__(self, connection_string: str, logger: Logger) -> None:
        pass  # Infrastructure details omitted for brevity

    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...


class EmailNotificationChannel:
    def __init__(self, smtp_host: str, smtp_port: int, sender: str, logger: Logger) -> None:
        pass  # Infrastructure details omitted

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        return True


class ConsoleLogger:
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


class OrderService:
    @inject
    def __init__(
        self,
        repo: OrderRepository = Provide["order_repo"],
        notifier: NotificationChannel = Provide["notification_channel"],
        logger: Logger = Provide["logger"],
    ) -> None:
        # Constructor uses dependency-injector wiring annotations
        # For manual testing, pass explicitly:
        #   OrderService(repo=..., notifier=..., logger=...)
        self._repo = repo
        self._notifier = notifier
        self._logger = logger

    def create_order(self, user_id: str, user_email: str, items: list[dict], total_cents: int) -> str:
        if not items:
            raise ValueError("Order must contain at least one item")
        order_id = f"ord_{user_id}_{len(items)}"
        self._repo.save(order_id=order_id, user_id=user_id, total_cents=total_cents)
        self._notifier.send_order_confirmation(user_email, order_id, total_cents)
        return order_id


# --- Container Definition: declarative wiring ---
class AppContainer(containers.DeclarativeContainer):
    """DI container defining the application's dependency graph."""

    # Configuration (external inputs)
    config = providers.Configuration()

    # Leaf dependencies
    logger = providers.Factory(
        ConsoleLogger,
    )

    # Infrastructure adapters
    order_repo = providers.Factory(
        PostgresOrderRepo,
        connection_string=config.db.connection_string,
        logger=logger,
    )

    notification_channel = providers.Factory(
        EmailNotificationChannel,
        smtp_host=config.smtp.host,
        smtp_port=config.smtp.port,
        sender=config.smtp.sender,
        logger=logger,
    )

    # Domain services
    order_service = providers.Factory(
        OrderService,
    )


# --- Usage with container ---
def main() -> None:
    """Bootstrap application using the DI container."""
    container = AppContainer()

    # Override configuration from environment variables in production
    container.config.db.connection_string.from_env("DATABASE_URL")
    container.config.smtp.host.from_env("SMTP_HOST", default="smtp.gmail.com")
    container.config.smtp.port.from_env("SMTP_PORT", as_=int, default=587)
    container.config.smtp.sender.from_env("EMAIL_SENDER", default="noreply@example.com")

    # Wire into FastAPI or Flask middleware for injection support
    # order_service = container.order_service()  # Resolved automatically

    # Or resolve manually (no framework integration needed):
    order_service = container.order_service()
    order_id = order_service.create_order(
        user_id="u123",
        user_email="alice@example.com",
        items=[{"sku": "A1", "qty": 2}],
        total_cents=4998,
    )
    print(f"Created order: {order_id}")

    # Clean shutdown
    container.shutdown()


# --- Test container: swap dependencies for testing ---
class TestContainer(containers.DeclarativeContainer):
    """Test-specific container with fakes injected."""

    config = providers.Configuration()

    logger = providers.Singleton(  # Shared singleton across tests
        ConsoleLogger(),
    )

    order_repo = providers.Factory(
        FakeOrderRepo,  # Hand-written fake implementing OrderRepository
    )

    notification_channel = providers.Factory(
        FakeNotificationChannel,  # Hand-written fake
    )

    order_service = providers.Factory(OrderService)


def run_integration_test() -> None:
    """Demonstrate test wiring with fakes."""
    container = TestContainer()
    try:
        service = container.order_service()
        result = service.create_order(
            user_id="test_user",
            user_email="test@example.com",
            items=[{"sku": "X1", "qty": 1}],
            total_cents=999,
        )
        assert result is not None
    finally:
        container.shutdown()


# --- Fakes for testing (abbreviated) ---
class FakeOrderRepo:
    def __init__(self) -> None:
        self._orders: dict[str, dict] = {}

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        self._orders[order_id] = {"user_id": user_id, "total_cents": total_cents}

    def get(self, order_id: str) -> dict | None:
        return self._orders.get(order_id)


class FakeNotificationChannel:
    def __init__(self) -> None:
        self.sent_messages: list[dict] = []

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        self.sent_messages.append({"to": user_email, "order_id": order_id})
        return True
```

### Pattern 3: Per-Request Scope Wiring (HTTP Request Lifecycle)

In web applications, certain services must be scoped to individual HTTP requests — database sessions, request context data, per-user caches. This pattern creates a factory that runs once per request, ensuring no state leaks between concurrent requests.

```python
from typing import Callable


class DbSession:
    """Represents a database session scoped to a single HTTP request."""

    def __init__(self, connection_string: str) -> None:
        self._connection_string = connection_string
        # Real code: create psycopg2 connection or SQLAlchemy session

    def execute(self, query: str, params: tuple = ()) -> list[dict]:
        """Execute a database query within this request's scope."""
        # Real code: return self.session.execute(query, params).fetchall()
        return []


class RequestContext:
    """Holds data specific to the current HTTP request."""

    def __init__(self, user_id: str | None = None, request_headers: dict[str, str] | None = None) -> None:
        self.user_id = user_id
        self.request_headers = request_headers or {}


class RequestScopedOrderRepo:
    """Order repository that uses a per-request database session."""

    def __init__(self, db_session_factory: Callable[[], DbSession], logger: Logger) -> None:
        self._db_session_factory = db_session_factory
        self._logger = logger

    def get_by_id(self, order_id: str) -> dict | None:
        session = self._db_session_factory()  # Gets the request-scoped session
        results = session.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        return results[0] if results else None

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        session = self._db_session_factory()  # Same request-scoped session
        self._logger.info(f"Saving order {order_id}")
        session.execute(
            "INSERT INTO orders (id, user_id, total_cents) VALUES (%s, %s, %s)",
            (order_id, user_id, total_cents),
        )


class RequestScopedNotificationChannel:
    """Notification channel that tracks sent messages per request."""

    def __init__(self, smtp_host: str, context_getter: Callable[[], RequestContext]) -> None:
        self._smtp_host = smtp_host
        self._context_getter = context_getter

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        ctx = self._context_getter()  # Get current request's context
        # Send email with request-scoped metadata (trace IDs, etc.)
        return True


# --- Composition root with per-request factory ---
class HttpRequestFactory:
    """Creates request-scoped services for each incoming HTTP request.

    This runs ONCE PER REQUEST in middleware or framework handler.
    It ensures database sessions and contexts are properly scoped.
    """

    def __init__(self, db_connection_string: str) -> None:
        self._db_connection_string = db_connection_string

    def create_scope(self, user_id: str | None = None) -> dict:
        """Create a new request scope with all scoped services.

        Returns a dict of scoped services that middleware injects
        into the request context for downstream handlers to use.
        """
        # Request-scoped dependencies created fresh per request
        db_session = DbSession(self._db_connection_string)
        request_context = RequestContext(user_id=user_id)

        # Loggers are typically shared (singleton), not request-scoped
        logger: Logger = ConsoleLogger()

        # Build scoped adapters
        order_repo = RequestScopedOrderRepo(
            db_session_factory=lambda: db_session,
            logger=logger,
        )
        notifier = RequestScopedNotificationChannel(
            smtp_host="smtp.gmail.com",
            context_getter=lambda: request_context,
        )

        return {
            "db_session": db_session,
            "order_repo": order_repo,
            "notification_channel": notifier,
            "request_context": request_context,
        }


# --- Middleware integration example (conceptual) ---
def setup_request_middleware(app):  # type: ignore[no-untyped-def]
    """Attach request-scoped factory as middleware for FastAPI/Flask."""
    http_factory = HttpRequestFactory(
        db_connection_string="postgresql://localhost/orders",
    )

    @app.middleware("http")  # type: ignore[misc, unused-ignore]
    async def request_scope_middleware(request, call_next):  # type: ignore[no-untyped-def]
        user_id = request.headers.get("x-user-id")  # type: ignore[union-attr]
        scope = http_factory.create_scope(user_id=user_id)

        # Inject scoped services into the request (framework-specific)
        # request.state.db_session = scope["db_session"]
        # request.state.order_repo = scope["order_repo"]

        response = await call_next(request)  # type: ignore[no-untyped-call]

        # Cleanup: close database session at end of request
        scope["db_session"].execute("ROLLBACK")  # type: ignore[union-attr]

        return response
```

### Pattern 4: Configuration-Based Assembly (Loading Adapter Selection from Config)

Real applications need to select different adapters based on environment — SQLite for development, PostgreSQL for production. This pattern reads configuration and instantiates the appropriate concrete class while maintaining the same interface contract.

```python
from __future__ import annotations
import os


# --- Protocol definitions ---
class OrderRepository(Protocol):
    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...


class NotificationChannel(Protocol):
    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool: ...


class Logger(Protocol):
    def info(self, message: str) -> None: ...
    def error(self, message: str) -> None: ...


# --- Multiple implementations for the same protocol ---
class PostgresOrderRepo:
    def __init__(self, connection_string: str, logger: Logger) -> None: ...
    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...
    def get(self, order_id: str) -> dict | None: ...


class SQLiteOrderRepo:
    """Development/test adapter backed by SQLite for zero-configuration local runs."""

    def __init__(self, db_path: str = "orders.db", logger: Logger | None = None) -> None:
        self._db_path = db_path
        self._logger = logger or ConsoleLogger()

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        import sqlite3
        with sqlite3.connect(self._db_path) as conn:
            conn.execute(
                "INSERT OR REPLACE INTO orders (id, user_id, total_cents) VALUES (?, ?, ?)",
                (order_id, user_id, total_cents),
            )

    def get(self, order_id: str) -> dict | None:
        import sqlite3
        with sqlite3.connect(self._db_path) as conn:
            row = conn.execute("SELECT id, user_id, total_cents FROM orders WHERE id = ?", (order_id,)).fetchone()
            return {"id": row[0], "user_id": row[1], "total_cents": row[2]} if row else None


class SmtpNotificationChannel:
    """Sends emails via SMTP — used in production and staging."""

    def __init__(self, host: str, port: int = 587, logger: Logger | None = None) -> None:
        self._host = host
        self._port = port
        self._logger = logger or ConsoleLogger()

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        self._logger.info(f"Sending email to {user_email}")
        return True


class FakeNotificationChannel:
    """No-op notification channel used in testing and CI."""

    def __init__(self) -> None:
        self._sent: list[dict] = []

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        self._sent.append({"to": user_email, "order_id": order_id})
        return True


# --- Configuration-based factory resolver ---
def resolve_repo_factory(config: dict) -> tuple[OrderRepository, Logger]:
    """Select and construct the appropriate repository based on environment config.

    This is where environment-specific adapter selection happens — the composition
    root delegates to a resolver that reads config and returns concrete instances.
    """
    logger = ConsoleLogger()
    env = config.get("environment", "development")

    if env == "production":
        repo: OrderRepository = PostgresOrderRepo(
            connection_string=config["database"]["connection_string"],
            logger=logger,
        )
    elif env == "testing":
        # Use SQLite for testing — zero external dependencies
        repo = SQLiteOrderRepo(db_path=":memory:", logger=logger)
    else:
        # Default to SQLite for local development
        repo = SQLiteOrderRepo(db_path=config.get("database", {}).get("path", "orders.db"), logger=logger)

    return repo, logger


def resolve_notifier_factory(config: dict) -> tuple[NotificationChannel, Logger]:
    """Select and construct the appropriate notification channel based on environment config."""
    logger = ConsoleLogger()
    env = config.get("environment", "development")

    if env == "testing":
        notifier: NotificationChannel = FakeNotificationChannel()
    elif env in ("production", "staging"):
        notifier = SmtpNotificationChannel(
            host=config["smtp"]["host"],
            port=config["smtp"].get("port", 587),
            logger=logger,
        )
    else:
        # Development: log notifications instead of sending real emails
        notifier = FakeNotificationChannel()

    return notifier, logger


# --- Application bootstrap with configuration-based assembly ---
def build_app(config: dict | None = None) -> OrderService:  # type: ignore[name-defined]
    """Build the application using environment-specific adapter selection.

    The config dict is read from environment variables or a YAML/JSON file
    and determines which concrete adapters are instantiated for each port.
    """
    if config is None:
        config = {
            "environment": os.getenv("APP_ENV", "development"),
            "database": {
                "connection_string": os.getenv("DATABASE_URL", ""),
                "path": "orders.db",
            },
            "smtp": {
                "host": os.getenv("SMTP_HOST", "localhost"),
                "port": int(os.getenv("SMTP_PORT", "1025")),
            },
        }

    repo, logger = resolve_repo_factory(config)
    notifier, _ = resolve_notifier_factory(config)

    # Ensure OrderService is imported or defined above
    return OrderService(repo=repo, notifier=notifier, logger=logger)


# --- Environment-specific usage ---
def main() -> None:
    """Entry point — configuration comes from environment variables."""
    app = build_app()
    order_id = app.create_order(
        user_id="user_001",
        user_email="alice@example.com",
        items=[{"sku": "WIDGET-A", "qty": 3}],
        total_cents=2997,
    )
    print(f"Order created: {order_id}")


# --- Environment configuration examples ---
PRODUCTION_CONFIG = {
    "environment": "production",
    "database": {"connection_string": "postgresql://prod-server/orders"},
    "smtp": {"host": "smtp.gmail.com", "port": 587},
}

DEVELOPMENT_CONFIG = {
    "environment": "development",
    "database": {"path": "dev_orders.db"},
    "smtp": {"host": "localhost", "port": 1025},
}

TESTING_CONFIG = {
    "environment": "testing",
    "database": {"connection_string": ""},
    "smtp": {"host": "", "port": 0},
}
```

### Pattern 5: Composition Root Testing (Verifying the Dependency Graph)

A composition root is only as good as its testability. This pattern demonstrates how to verify that every dependency in your graph resolves correctly and that test fakes produce deterministic results.

```python
from __future__ import annotations


class FakeOrderRepo:
    """Complete fake implementing OrderRepository for testing."""

    def __init__(self) -> None:
        self._orders: dict[str, dict] = {}
        self.save_calls: list[tuple[str, str, int]] = []
        self.get_calls: list[str] = []

    def save(self, order_id: str, user_id: str, total_cents: int) -> None:
        self.save_calls.append((order_id, user_id, total_cents))
        self._orders[order_id] = {"id": order_id, "user_id": user_id, "total_cents": total_cents}

    def get(self, order_id: str) -> dict | None:
        self.get_calls.append(order_id)
        return self._orders.get(order_id)


class FakeNotificationChannel:
    """Complete fake implementing NotificationChannel for testing."""

    def __init__(self) -> None:
        self.sent_messages: list[dict] = []
        self.send_count: int = 0

    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool:
        self.sent_messages.append({
            "to": user_email,
            "order_id": order_id,
            "total_cents": total_cents,
        })
        self.send_count += 1
        return True


class FakeLogger:
    """Complete fake implementing Logger for testing."""

    def __init__(self) -> None:
        self.info_messages: list[str] = []
        self.error_messages: list[str] = []

    def info(self, message: str) -> None:
        self.info_messages.append(message)

    def error(self, message: str) -> None:
        self.error_messages.append(message)


def build_test_app() -> OrderService:  # type: ignore[name-defined]
    """Test bootstrap — all dependencies are fakes, zero infrastructure.

    This function mirrors the production build_app() but substitutes every
    injected dependency with a Fake implementation. The calling code is
    identical between test and production.
    """
    repo = FakeOrderRepo()
    notifier = FakeNotificationChannel()
    logger = FakeLogger()

    return OrderService(repo=repo, notifier=notifier, logger=logger)


# --- Test examples demonstrating composition root verification ---

def test_order_creation_completes_full_workflow() -> None:
    """Verify that the entire dependency graph resolves and a use case executes.

    This is the smoke test for the composition root: if this fails, something
    in the wiring chain is broken — missing dependency, wrong type, or circular reference.
    """
    app = build_test_app()  # Creates full object graph with fakes

    result_order_id = app.create_order(
        user_id="test_user",
        user_email="tester@example.com",
        items=[{"sku": "A1", "qty": 2}],
        total_cents=4998,
    )

    # Verify persistence layer was called correctly
    assert result_order_id is not None
    assert len(app._repo.save_calls) == 1
    saved = app._repo.save_calls[0]
    assert saved[1] == "test_user"  # user_id
    assert saved[2] == 4998  # total_cents

    # Verify notification was sent
    assert app._notifier.send_count == 1
    assert app._notifier.sent_messages[0]["to"] == "tester@example.com"


def test_invalid_order_rejected_before_persistence() -> None:
    """Verify business logic validation runs before any adapter is called.

    This confirms that the dependency graph wiring doesn't bypass domain rules —
    an empty-order error should be raised without touching the repo or notifier.
    """
    app = build_test_app()

    try:
        app.create_order(
            user_id="test_user",
            user_email="tester@example.com",
            items=[],  # Empty items list — validation should fail
            total_cents=0,
        )
    except ValueError as exc:
        assert "at least one item" in str(exc)
        # Neither persistence nor notification should have been called
        assert app._repo.save_calls == []
        assert app._notifier.send_count == 0


def test_composition_root_resolves_all_dependencies() -> None:
    """Verify the composition root creates a complete, resolvable dependency graph.

    This test ensures no dependency is left unresolved or None at runtime.
    Run this after every structural change to the wiring code.
    """
    app = build_test_app()

    # Every injected dependency must be a concrete instance, not None
    assert isinstance(app._repo, FakeOrderRepo), "Repository was not wired"
    assert isinstance(app._notifier, FakeNotificationChannel), "Notifier was not wired"
    assert isinstance(app._logger, FakeLogger), "Logger was not wired"

    # Each dependency must have its expected interface
    assert hasattr(app._repo, "save"), "Repo missing 'save' method"
    assert hasattr(app._repo, "get"), "Repo missing 'get' method"
    assert hasattr(app._notifier, "send_order_confirmation"), "Notifier missing 'send_order_confirmation'"


def test_graph_isolation_between_test_cases() -> None:
    """Verify that each test case gets a fresh composition root.

    Fakes must not leak state between tests — calling build_test_app()
    multiple times should produce independent object graphs.
    """
    app_1 = build_test_app()
    app_1.create_order("user_a", "a@example.com", [{"sku": "X"}], 100)

    app_2 = build_test_app()  # New graph — must be independent of app_1
    app_2.create_order("user_b", "b@example.com", [{"sku": "Y"}], 200)

    assert len(app_1._repo.save_calls) == 1
    assert len(app_2._repo.save_calls) == 1
    assert app_1._repo.get("user_b") is None  # user_b should not exist in app_1's graph
    assert app_2._repo.get("user_a") is None  # user_a should not exist in app_2's graph

```

## Anti-Patterns

### Anti-Pattern 1: Service Locator (Hidden Dependencies)

The service locator pattern conceals dependencies by allowing any module to query a global registry for its dependencies. This makes the dependency graph invisible to type checkers, reviewers, and static analysis tools.

```python
# ❌ BAD — Service Locator: dependencies hidden behind a global registry.
# No way to tell what OrderService needs without reading its source code.
# Cannot inject fakes in tests without monkey-patching the global container.


class ServiceLocator:
    """Global dependency registry — an anti-pattern."""

    _registry: dict[str, object] = {}

    @classmethod
    def register(cls, name: str, instance: object) -> None:
        cls._registry[name] = instance

    @classmethod
    def get(cls, name: str) -> object:
        if name not in cls._registry:
            raise LookupError(f"Service '{name}' not found in locator")
        return cls._registry[name]


class BadOrderService:
    """OrderService that discovers its dependencies from the global locator."""

    def create_order(self, user_id: str, user_email: str, items: list[dict], total_cents: int) -> str:
        if not items:
            raise ValueError("Items required")

        # ❌ Dependency discovered at runtime via global lookup — invisible to static analysis
        repo = ServiceLocator.get("order_repo")  # Hidden dependency!
        notifier = ServiceLocator.get("notification_channel")  # Hidden dependency!
        logger = ServiceLocator.get("logger")  # Hidden dependency!

        order_id = f"ord_{user_id}"
        repo.save(order_id, user_id, total_cents)  # Type: Any — no static checking!
        notifier.send_order_confirmation(user_email, order_id, total_cents)
        logger.info(f"Order created")
        return order_id


# ✅ GOOD — Constructor injection: all dependencies are explicit and type-checked.

from typing import Protocol


class GoodRepo(Protocol):
    def save(self, order_id: str, user_id: str, total_cents: int) -> None: ...


class GoodNotifier(Protocol):
    def send_order_confirmation(self, user_email: str, order_id: str, total_cents: int) -> bool: ...


class GoodLogger(Protocol):
    def info(self, message: str) -> None: ...


class GoodOrderService:
    """OrderService with explicit constructor injection — all dependencies visible."""

    def __init__(self, repo: GoodRepo, notifier: GoodNotifier, logger: GoodLogger) -> None:
        self._repo = repo
        self._notifier = notifier
        self._logger = logger

    def create_order(self, user_id: str, user_email: str, items: list[dict], total_cents: int) -> str:
        if not items:
            raise ValueError("Items required")

        order_id = f"ord_{user_id}"
        self._repo.save(order_id, user_id, total_cents)  # Type-safe — mypy knows the interface
        self._notifier.send_order_confirmation(user_email, order_id, total_cents)
        self._logger.info(f"Order created")
        return order_id
```

### Anti-Pattern 2: New Everywhere (Scattered Instantiation)

When concrete classes are instantiated throughout the codebase — in constructors, method bodies, and module-level globals — there is no single place to swap implementations. This makes testing impossible without mocking infrastructure.

```python
# ❌ BAD — Concrete instances created at every level of the hierarchy.
# Changing from SQLite to PostgreSQL requires editing dozens of files.


class BadOrderService:
    """Creates its own database connection — tightly coupled and untestable."""

    def __init__(self) -> None:
        # Each service creates its own infrastructure dependency
        import sqlite3
        self._db = sqlite3.connect("orders.db")  # Hardcoded path, hardcoded library

    def create_order(self, user_id: str, items: list[dict]) -> str:
        order_id = f"ord_{user_id}"
        cursor = self._db.cursor()
        cursor.execute(
            "INSERT INTO orders (id, user_id) VALUES (?, ?)",
            (order_id, user_id),
        )
        self._db.commit()
        return order_id


class BadNotificationService:
    """Creates its own HTTP client — cannot be replaced for testing."""

    def __init__(self) -> None:
        import httpx
        # ❌ Concrete class instantiation inside the service constructor
        self._client = httpx.Client(base_url="https://api.example.com")  # Hidden dependency!

    def send(self, email: str, subject: str, body: str) -> bool:
        response = self._client.post("/send", json={"to": email, "subject": subject, "body": body})
        return response.status_code == 200


# ✅ GOOD — A single composition root creates all infrastructure and injects it.

def build_good_app() -> dict[str, object]:
    """One function that assembles the entire dependency graph."""
    import sqlite3

    logger: GoodLogger = ConsoleLogger()
    repo = SQLiteOrderRepo(db="orders.db", logger=logger)
    notifier = HttpNotificationClient(base_url="https://api.example.com", logger=logger)

    service = GoodOrderService(repo=repo, notifier=notifier, logger=logger)

    return {"service": service}


# ✅ GOOD — Tests call the same factory with fakes:
def build_test_app() -> dict[str, object]:
    """Test bootstrap — all real dependencies replaced with fakes."""
    repo = FakeOrderRepo()
    notifier = FakeNotificationChannel()
    logger = FakeLogger()

    service = GoodOrderService(repo=repo, notifier=notifier, logger=logger)
    return {"service": service}
```

---

## Constraints

### MUST DO
- Maintain a single composition root entry point per application — one `build_app()` or `bootstrap()` function that creates the entire object graph
- Use constructor injection exclusively for all dependencies — never property injection, method injection, or module-level globals to hold services
- Accept only configuration values (connection strings, API keys, feature flags) as parameters on the factory function; create all internal dependencies within the function body
- Create a separate test bootstrap path that substitutes every real dependency with a fake implementation while preserving the same interface types
- Name concrete adapter classes consistently: `XxxRepository`, `XxxNotificationChannel`, `XxxHttpClient` — the name should make the port they implement obvious
- Document object lifecycles explicitly: which services are singletons (shared), which are per-request, and which are transient (new instance each time)
- When wiring requires more than ~15 concrete classes or deeply nested dependencies exceeding 5 constructor parameters, introduce a lightweight DI container

### MUST NOT DO
- Use the Service Locator anti-pattern — a global registry that modules query for their dependencies via method calls from within business logic; this conceals the true dependency graph
- Import infrastructure packages (`sqlite3`, `httpx`, `psycopg2`) inside business logic files — all such imports belong exclusively in the composition root and adapter layers
- Use `None` as default constructor arguments to hide dependencies — `def __init__(self, repo: Repo | None = None)` means the dependency is optional when it should be required; use a factory pattern instead
- Create multiple factories scattered across modules — if there are two places that build the application object graph, one of them (usually the test version) will fall out of sync
- Mix production and test wiring in the same function using `if os.getenv("TEST")` branches — the environment check should only exist inside adapter implementations, not in the composition root itself

---

## Output Template

When implementing or reviewing a composition root, produce:

1. **Dependency Inventory** — Table listing every concrete class, its Protocol interface, and its position in the dependency graph (leaf, intermediate, or top-level)
2. **Factory Function Code** — Complete wiring code with all imports, leaf-first instantiation order, and explicit argument passing
3. **Test Bootstrap Function** — The test equivalent that swaps production fakes for real adapters
4. **Per-Request Scope Definition** — If serving HTTP requests, the request-scoped factory with cleanup guarantees
5. **Verification Tests** — At least one integration-style test calling the test bootstrap and exercising a complete use case end-to-end

---

## Related Skills

| Skill | Purpose |
|---|---|
| `hexagonal-architecture` | The overall architecture pattern that composition roots support — ports define boundaries, composition root wires adapters to ports |
| `ports-patterns` | Declares the port interfaces (Protocol/ABC) that the composition root connects concrete adapters to |
| `dependency-inversion-principle` | The SOLID principle this skill enforces structurally: high-level code depends on abstractions injected through constructors |
| `test-driven-development` | Composition roots are testable only when every dependency can be swapped with fakes — TDD workflows depend on clean wiring |
| `error-handling` | Production composition roots must handle startup failures gracefully (e.g., database connection refused at bootstrap) |
