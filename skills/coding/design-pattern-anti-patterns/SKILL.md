---




name: design-pattern-anti-patterns
description: Identifies and remediates anti-patterns arising from misuse of GoF design patterns including over-engineering, gold plating, dependency inversion violations, and structural code smells in Python systems.
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: anti-patterns, design pattern abuse, over-engineering, gold plating, YAGNI, premature abstraction, GoF misuse, singleton abuse
  archetypes:
    - diagnostic
    - tactical
  anti_triggers:
    - brainstorming
    - vague ideation
    - feature generation
  response_profile:
    verbosity: medium
    directive_strength: high
    abstraction_level: operational
  role: review
  scope: review
  output-format: analysis
  content-types: [guidance, examples, do-dont]
  related-skills: gof-design-patterns-catalog, design-pattern-selection, structural-behavioral-patterns, code-review




---





# Design Pattern Anti-Patterns & Code Smells

Senior engineer auditing code for design pattern misuse and SOLID principle violations. This skill makes the model recognize when GoF patterns are applied incorrectly — over-engineered, under-justified, or structurally harmful — and provide concrete remediation that collapses unnecessary abstractions while preserving legitimate extensibility points.

## TL;DR Checklist

- [ ] Count GoF patterns per module; more than 3 without clear responsibility separation is a red flag
- [ ] Verify every interface has at least one concrete current consumer (no phantom polymorphism)
- [ ] Check that Factory classes have non-trivial creation logic (simple `__init__` does not justify a factory)
- [ ] Audit Singleton usage — only appropriate for true shared resources with controlled lifecycle
- [ ] Replace inheritance-based Template Method with composition-based Strategy when variation is behavioral
- [ ] Ensure each class has exactly one reason to change (SRP) and no hidden global coupling

---

## When to Use

Use this skill when:

- A codebase feels over-factored — too many interfaces, factories, or wrapper layers for simple operations
- New developers struggle to trace what happens because behavior is split across ten classes instead of one function
- Code reviews repeatedly flag "this could be simpler" comments on specific modules
- A team has adopted design patterns dogmatically without understanding when each pattern earns its keep
- Technical debt audits reveal factories, observers, and decorators layered atop straightforward logic

---

## When NOT to Use

Avoid this skill for:

- Critiquing algorithmic efficiency or data structure choices — use `coding-algorithms` instead
- Evaluating API surface design or HTTP endpoint structure — that is an API architecture concern
- Analyzing runtime behavior issues like memory leaks or race conditions — those are debugging tasks
- Codebases that genuinely require the patterns being critiqued (e.g., a plugin system with 50+ independently loaded modules)

---

## Core Workflow

1. **Scan for pattern overuse** — Count how many GoF patterns are employed in a single module or class hierarchy. If more than three distinct patterns coexist without clear separation of concern, flag for review. Check the number of interfaces defined per implementation class. **Checkpoint:** Does each declared interface have at least one concrete consumer?

2. **Check for YAGNI violations** — Identify abstractions that exist solely for hypothetical future needs: extra interfaces with zero implementations, unused factory classes, phantom strategies that no caller instantiates. Trace every import and constructor argument to verify the abstraction is actually exercised. **Checkpoint:** Is there a concrete current use case justifying this abstraction?

3. **Audit SOLID compliance** — Verify SRP (can you describe what this class does in one sentence without "and"?), LSP (can any subclass replace its parent without changing program behavior?), and DIP (do high-level modules depend on abstractions, not concretions?). Check OCP (can new behaviors be added without modifying existing code?). **Checkpoint:** Can you add a new payment processor or shipping method without touching the core order processing class?

4. **Remediate detected anti-patterns** — Apply the specific remediation strategy for each identified issue: collapse unnecessary hierarchies, inline over-factored methods, replace phantom abstractions with direct calls. Prioritize by severity — fix blocking issues first (hidden coupling, impossible-to-test classes), then nagging issues (unnecessary indirection). **Checkpoint:** Do all existing unit tests pass after the remediation?

---

## Anti-Pattern Catalog

#### Gold Plating

Applying design patterns where simple code would suffice. Creating unnecessary factory layers, strategy interfaces, and observer chains for problems that do not need them. This is the most common GoF-related anti-pattern: the pattern fits a toy example but adds real cost to production code. It inflates complexity without delivering matching benefits.

```python
# ❌ BAD — Gold plating: three layers of indirection for what amounts to loading config from JSON

class ConfigReader:
    """Interface that exists only because someone thought it might be useful."""
    def read(self) -> dict: ...


class JsonConfigReader(ConfigReader):
    def __init__(self, file_path: str) -> None:
        self._path = file_path

    def read(self) -> dict:
        with open(self._path, "r") as f:
            return json.load(f)


class ConfigReaderFactory:
    """Factory that creates exactly one type of reader. Zero flexibility gained."""

    @staticmethod
    def create(file_path: str) -> ConfigReader:
        # Always returns JsonConfigReader — the abstraction adds nothing
        return JsonConfigReader(file_path)


class AppConfig(ConfigReader):
    """Wraps the factory + interface just to follow "patterns" from a tutorial."""

    def __init__(self, path: str) -> None:
        self._reader = ConfigReaderFactory.create(path)

    @property
    def data(self) -> dict:
        return self._reader.read()


def load_app_config(path: str) -> dict:
    """Caller needs to know about AppConfig class instead of just reading a file."""
    app_config = AppConfig(path)
    return app_config.data


# ✅ GOOD — Direct, simple, and does exactly what it says

import json
from pathlib import Path


def load_app_config(file_path: str) -> dict:
    """Load application configuration from a JSON file.

    Args:
        file_path: Absolute or relative path to the configuration file.

    Returns:
        Parsed configuration as a dictionary.

    Raises:
        FileNotFoundError: If the configuration file does not exist.
        json.JSONDecodeError: If the file contains invalid JSON.
    """
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)
```

**Why this is worse:** Gold plating creates 4 classes and 2 factory methods for what should be a single function call. Every future developer must navigate through `AppConfig → ConfigReaderFactory → JsonConfigReader → ConfigReader` to understand how config loads. The "extension point" (adding XML config) was never needed and likely never will be — it was designed for a hypothetical future that may never arrive.

**When this occurs:** Developers who learned design patterns from tutorials or books often apply them reflexively, assuming every problem is the toy example from the pattern documentation. Code reviews that reward "good architectural practices" without scrutinizing actual need amplify this problem.

---

#### Over-Engineering / Over-Abstraction

Designing abstractions for hypothetical future requirements rather than current needs. Too many interface levels, phantom polymorphism, and excessive indirection through patterns when direct calls would work. The code becomes harder to read, harder to debug, and harder to modify correctly because the real logic is buried under layers of indirection.

```python
# ❌ BAD — Over-abstraction: five layers deep for simple email sending

class EmailMessage(Protocol):
    """Abstract message contract that adds no value over a dataclass."""
    @property
    def recipient(self) -> str: ...
    @property
    def subject(self) -> str: ...
    @property
    def body(self) -> str: ...


class MessageBuilder(Protocol):
    """Abstract builder for messages that have no complex construction logic."""
    def build(self) -> EmailMessage: ...


class SimpleMessageBuilder(MessageBuilder):
    """The only implementation — builder pattern overkill for immutable data."""

    def __init__(self, recipient: str, subject: str, body: str) -> None:
        self._recipient = recipient
        self._subject = subject
        self._body = body

    def build(self) -> EmailMessage:
        return EmailData(self._recipient, self._subject, self._body)


class EmailData(EmailMessage):
    def __init__(self, recipient: str, subject: str, body: str) -> None:
        self._recipient = recipient
        self._subject = subject
        self._body = body

    @property
    def recipient(self) -> str: return self._recipient
    @property
    def subject(self) -> str: return self._subject
    @property
    def body(self) -> str: return self._body


class EmailTransport(Protocol):
    """Abstract transport layer for sending messages."""
    def send(self, message: EmailMessage) -> None: ...


class SmtpEmailTransport(EmailTransport):
    """Only email transport ever used — the abstraction prevents testing by hiding SMTP details."""

    def __init__(self, smtp_host: str = "localhost", smtp_port: int = 587) -> None:
        self._smtp_host = smtp_host
        self._smtp_port = smtp_port

    def send(self, message: EmailMessage) -> None:
        # Complex SMTP logic buried here — but we can't test without a real server
        import smtplib
        server = smtplib.SMTP(self._smtp_host, self._smtp_port)
        server.starttls()
        server.send_message(message.body)  # type: ignore[attr-defined]
        server.quit()


class EmailNotificationService:
    """Coordinates builder + transport through the protocol layers."""

    def __init__(self, transport: EmailTransport) -> None:
        self._transport = transport

    def send_welcome_email(self, recipient: str, name: str) -> None:
        builder = SimpleMessageBuilder(recipient, f"Welcome, {name}!", f"Hi {name}, welcome!")
        message = builder.build()
        self._transport.send(message)


# ✅ GOOD — Straightforward function that is easy to read, test, and modify

import smtplib
from dataclasses import dataclass


@dataclass(frozen=True)
class EmailMessage:
    recipient: str
    subject: str
    body: str


def send_welcome_email(recipient: str, name: str, *, smtp_host: str = "localhost") -> None:
    """Send a welcome email to a new user.

    Args:
        recipient: The recipient's email address.
        name: The recipient's display name.
        smtp_host: SMTP server hostname (default: localhost).

    Raises:
        smtplib.SMTPException: If the email cannot be delivered.
    """
    subject = f"Welcome, {name}!"
    body = f"Hi {name}, welcome!"
    message = EmailMessage(recipient, subject, body)

    with smtplib.SMTP(smtp_host, 587) as server:
        server.starttls()
        # In production, authenticate here — but the test can mock smtplib.SMTP directly
        server.sendmail("noreply@example.com", [recipient], f"Subject: {subject}\n\n{body}")
```

**Why this is worse:** The over-abstracted version has 7 classes and 2 protocols for a single email-sending operation. Testing requires either mocking `EmailTransport` or spinning up a test SMTP server. Adding a new message format means creating new concrete builders, transports, and factories — not because the current code lacks flexibility, but because the abstraction was designed for flexibility that doesn't exist yet.

**When this occurs:** Teams working on greenfield projects often design "extensible" systems before they know what needs extension. The result is a framework that solves problems which don't exist while creating real problems with testing and debugging that do.

---

#### Dependency Inversion Violation

High-level modules depending on low-level concrete implementations directly, or the opposite: forcing dependency injection everywhere even for simple utility classes where it adds boilerplate without benefit. DIP should reduce coupling, but inverted incorrectly it either increases coupling or creates DI container bloat.

```python
# ❌ BAD — High-level module depends on low-level concrete class directly

import sqlite3


class DatabaseConnection(sqlite3.Connection):
    """Concrete database connection — hard dependency on SQLite implementation."""

    def __init__(self, db_path: str) -> None:
        super().__init__(db_path)


class UserRepository:
    """User repository is tightly coupled to SQLite. Can't switch to Postgres without rewriting this class."""

    def __init__(self, db_path: str) -> None:
        self._connection = sqlite3.connect(db_path)  # Direct concrete dependency!
        self._create_tables()

    def _create_tables(self) -> None:
        self._connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL
            )
        """)
        self._connection.commit()

    def create_user(self, name: str, email: str) -> int:
        cursor = self._connection.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)", (name, email)
        )
        self._connection.commit()
        return cursor.lastrowid  # type: ignore[return-value]

    def find_by_email(self, email: str) -> dict | None:
        cursor = self._connection.execute(
            "SELECT id, name, email FROM users WHERE email = ?", (email,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": row[1], "email": row[2]}


# ✅ GOOD — High-level module depends on abstraction; low-level modules implement it

from abc import ABC, abstractmethod
import sqlite3
import psycopg2


class UserDatabase(ABC):
    """Abstraction that the high-level business logic depends on."""

    @abstractmethod
    def create_user(self, name: str, email: str) -> int: ...

    @abstractmethod
    def find_by_email(self, email: str) -> dict | None: ...

    @abstractmethod
    def close(self) -> None: ...


class SqliteUserDatabase(UserDatabase):
    """Concrete SQLite implementation — low-level details encapsulated."""

    def __init__(self, db_path: str) -> None:
        self._connection = sqlite3.connect(db_path)
        self._initialize()

    def _initialize(self) -> None:
        self._connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL
            )
        """)
        self._connection.commit()

    def create_user(self, name: str, email: str) -> int:
        cursor = self._connection.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)", (name, email)
        )
        self._connection.commit()
        return cursor.lastrowid  # type: ignore[return-value]

    def find_by_email(self, email: str) -> dict | None:
        cursor = self._connection.execute(
            "SELECT id, name, email FROM users WHERE email = ?", (email,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": row[1], "email": row[2]}

    def close(self) -> None:
        self._connection.close()


class PostgresUserDatabase(UserDatabase):
    """Concrete PostgreSQL implementation — same interface, different storage."""

    def __init__(self, connection_string: str) -> None:
        self._connection = psycopg2.connect(connection_string)
        self._initialize()

    def _initialize(self) -> None:
        self._connection.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL
            )
        """)
        self._connection.commit()

    def create_user(self, name: str, email: str) -> int:
        cursor = self._connection.execute(
            "INSERT INTO users (name, email) VALUES (%s, %s) RETURNING id", (name, email)
        )
        self._connection.commit()
        return cursor.fetchone()[0]  # type: ignore[misc]

    def find_by_email(self, email: str) -> dict | None:
        cursor = self._connection.execute(
            "SELECT id, name, email FROM users WHERE email = %s", (email,)
        )
        row = cursor.fetchone()
        if row is None:
            return None
        return {"id": row[0], "name": row[1], "email": row[2]}

    def close(self) -> None:
        self._connection.close()


class RegistrationService:
    """High-level business logic depends only on the abstraction."""

    def __init__(self, user_db: UserDatabase) -> None:
        self._user_db = user_db  # Injection at composition root, not everywhere

    def register(self, name: str, email: str) -> int:
        """Register a new user. Returns the user ID."""
        existing = self._user_db.find_by_email(email)
        if existing is not None:
            raise ValueError(f"User with email {email} already exists")
        return self._user_db.create_user(name, email)
```

**Why this is worse:** In the BAD version, `UserRepository` embeds SQLite knowledge directly. You cannot unit-test it without a real database file, you cannot swap to PostgreSQL, and every change to the database layer requires modifying business logic. In the DI-overkill variant (not shown), every utility class becomes injectable through a DI container, creating circular dependency issues and making the codebase harder to understand because you must trace through the container configuration to know what dependencies exist.

**When this occurs:** Developers who apply DIP from frameworks like Spring (Java) where DI containers are pervasive often over-apply it in Python, where `__init__` parameters and composition are usually sufficient. The opposite error — ignoring DIP entirely in larger systems — creates tangled dependency graphs that resist testing.

---

#### Singleton Abuse

Using Singleton as a global variable substitute, creating hidden coupling and making testing impossible. Also using it for objects that should be stateless or managed by a DI container. Singletons hide their dependencies, make parallel execution impossible, and turn unit tests into integration tests.

```python
# ❌ BAD — Singleton used as a hidden global state holder

import threading


class MetricsCollector:
    """Singleton disguised as a class with a module-level instance.
    Hidden dependency: any code that calls log_metric() pulls in the entire collector."""

    _instance: "MetricsCollector | None" = None
    _lock = threading.Lock()

    def __new__(cls) -> "MetricsCollector":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._metrics: dict[str, list[float]] = {}
        return cls._instance

    def _ensure_initialized(self) -> None:
        """Double-check that we are the actual instance."""
        if self._instance is not self:
            raise RuntimeError("Use MetricsCollector(), do not subclass")

    def log_metric(self, name: str, value: float) -> None:
        self._ensure_initialized()
        if name not in self._metrics:
            self._metrics[name] = []
        self._metrics[name].append(value)

    def get_average(self, name: str) -> float:
        self._ensure_initialized()
        values = self._metrics.get(name, [])
        if not values:
            return 0.0
        return sum(values) / len(values)


# Module-level convenience functions that hide the coupling entirely
def log_metric(name: str, value: float) -> None:
    MetricsCollector().log_metric(name, value)

def get_average(name: str) -> float:
    return MetricsCollector().get_average(name)


# ❌ Also BAD — Singleton for something that should be stateless

class DateUtils:
    """Stateless utility class turned into a singleton. No state to share."""

    _instance: "DateUtils | None" = None

    def __new__(cls) -> "DateUtils":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def format_date(self, timestamp: float) -> str:
        import datetime
        return datetime.datetime.fromtimestamp(timestamp).isoformat()

    def days_between(self, t1: float, t2: float) -> int:
        import datetime
        delta = abs(datetime.datetime.fromtimestamp(t2) - datetime.datetime.fromtimestamp(t1))
        return delta.days


# ✅ GOOD — Explicit singleton only for genuinely shared resources with lifecycle management

from contextlib import contextmanager
import threading
from typing import ClassVar


class MetricsCollector:
    """Singleton pattern applied correctly: only for a resource that must be shared
    across the application lifetime, with explicit creation and cleanup."""

    _instance: ClassVar["MetricsCollector | None"] = None
    _lock: ClassVar[threading.Lock] = threading.Lock()

    def __new__(cls) -> "MetricsCollector":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._metrics: dict[str, list[float]] = {}
                    instance._initialized = False
                    cls._instance = instance
        return cls._instance

    def initialize(self) -> None:
        """Explicit initialization — visible in the code path."""
        if self._initialized:
            return
        self._metrics.clear()
        self._initialized = True

    def log_metric(self, name: str, value: float) -> None:
        if not self._initialized:
            raise RuntimeError("MetricsCollector not initialized. Call initialize() first.")
        self._metrics.setdefault(name, []).append(value)

    @property
    def metrics(self) -> dict[str, list[float]]:
        return dict(self._metrics)

    def get_average(self, name: str) -> float | None:
        values = self._metrics.get(name)
        if not values:
            return None
        return sum(values) / len(values)


def get_metrics_collector() -> MetricsCollector:
    """Module-level accessor — but callers are expected to call initialize()."""
    instance = MetricsCollector()
    if not instance._initialized:  # type: ignore[attr-defined]
        raise RuntimeError("Call MetricsCollector.initialize() before using metrics")
    return instance


# ✅ GOOD — Stateless utilities as plain functions (no class, no singleton)

from datetime import datetime


def format_date(timestamp: float) -> str:
    """Format an epoch timestamp as ISO 8601 string."""
    return datetime.fromtimestamp(timestamp).isoformat()


def days_between(t1: float, t2: float) -> int:
    """Calculate the absolute number of days between two epoch timestamps."""
    delta = abs(datetime.fromtimestamp(t2) - datetime.fromtimestamp(t1))
    return delta.days
```

**Why this is worse:** The BAD `MetricsCollector` hides its state in a module-level singleton that any code can access through `log_metric()`. Tests run in parallel will corrupt each other's metrics. You cannot inject a fake collector for testing without monkeypatching the module. The stateless `DateUtils` singleton wastes thread synchronization on a class that has no state to protect.

**When this occurs:** Developers migrating from languages/frameworks where singletons are the default sharing mechanism (Java Spring, Laravel) often replicate the pattern in Python. They also create singletons for utility classes by habit rather than necessity.

---

#### Factory Explosion

Creating factory methods, abstract factories, and builder patterns where simple `__init__` or class methods would suffice. Each factory adds indirection without real value when the creation logic is straightforward. The result is a forest of small classes, each responsible for constructing one other class.

```python
# ❌ BAD — Factory explosion for creating database models

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class UserProfile:
    user_id: int
    username: str
    email: str
    display_name: str


class ProfileFactory(ABC):
    """Abstract factory interface — why does creating a dataclass need an interface?"""

    @abstractmethod
    def create_profile(self, user_id: int, username: str, email: str, display_name: str) -> UserProfile:
        ...


class DefaultProfileFactory(ProfileFactory):
    """The only implementation. Abstract factory + concrete factory = two classes for one dataclass."""

    def create_profile(
        self, user_id: int, username: str, email: str, display_name: str
    ) -> UserProfile:
        return UserProfile(user_id, username, email, display_name)


@dataclass
class OrderItem:
    item_id: str
    product_name: str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        return self.quantity * self.unit_price


class OrderItemFactory(ABC):
    @abstractmethod
    def create_order_item(self, item_id: str, product_name: str, quantity: int, unit_price: float) -> OrderItem:
        ...


class DefaultOrderItemFactory(OrderItemFactory):
    """Another factory for another dataclass. The pattern is the product now, not the domain."""

    def create_order_item(
        self, item_id: str, product_name: str, quantity: int, unit_price: float
    ) -> OrderItem:
        if quantity < 1:
            raise ValueError("Quantity must be at least 1")
        return OrderItem(item_id, product_name, quantity, unit_price)


class OrderFactory(ABC):
    @abstractmethod
    def create_order_item(self, item_id: str, product_name: str, quantity: int, unit_price: float) -> OrderItem:
        ...

    @abstractmethod
    def create_profile(
        self, user_id: int, username: str, email: str, display_name: str
    ) -> UserProfile:
        ...


class DefaultOrderFactory(OrderFactory):
    """Abstract factory that combines two unrelated factories. Violates SRP itself."""

    def __init__(self, profile_factory: ProfileFactory | None = None) -> None:
        self._profile_factory = profile_factory or DefaultProfileFactory()
        self._item_factory = DefaultOrderItemFactory()  # No abstraction needed here

    def create_profile(
        self, user_id: int, username: str, email: str, display_name: str
    ) -> UserProfile:
        return self._profile_factory.create_profile(user_id, username, email, display_name)

    def create_order_item(self, item_id: str, product_name: str, quantity: int, unit_price: float) -> OrderItem:
        return self._item_factory.create_order_item(item_id, product_name, quantity, unit_price)


# ✅ GOOD — Factory methods on the domain objects themselves, or just use __init__

from dataclasses import dataclass


@dataclass(frozen=True)
class UserProfile:
    user_id: int
    username: str
    email: str
    display_name: str


@dataclass(frozen=True)
class OrderItem:
    item_id: str
    product_name: str
    quantity: int
    unit_price: float

    def __post_init__(self) -> None:
        if self.quantity < 1:
            raise ValueError("Quantity must be at least 1")

    @property
    def total(self) -> float:
        return self.quantity * self.unit_price


class OrderItemFactory:
    """Class-method factory only used when creation logic is genuinely complex.
    Here it simply delegates to the dataclass constructor — but the class exists
    so we can extend it later without changing call sites."""

    @classmethod
    def create(cls, item_id: str, product_name: str, quantity: int, unit_price: float) -> OrderItem:
        """Create an order item with validation.

        Args:
            item_id: Unique identifier for the line item.
            product_name: Human-readable product name.
            quantity: Number of units (must be >= 1).
            unit_price: Price per unit in the currency's base denomination.

        Returns:
            A validated OrderItem instance.

        Raises:
            ValueError: If quantity is less than 1 or unit_price is negative.
        """
        if unit_price < 0:
            raise ValueError(f"Unit price must be non-negative, got {unit_price}")
        return OrderItem(item_id, product_name, quantity, unit_price)
```

**Why this is worse:** The factory explosion version has 6 classes (2 dataclasses + 4 factories including abstract base classes) for creating what amounts to two dataclass instances. Every call site must import and instantiate a factory instead of just calling `UserProfile(...)`. When you add a third domain class, you need three more factory classes. The pattern becomes self-referential — factories exist to create factories.

**When this occurs:** Teams that learn abstract factory and factory method patterns often apply them uniformly across the codebase, even for objects with trivial construction logic. Abstract Factory is most commonly abused because it looks impressive in architecture diagrams but rarely provides real value outside of creating families of related products (e.g., UI widgets for different platforms).

---

#### Observer Spam

Using Observer pattern everywhere instead of direct method calls for synchronous operations. Turning what should be a single function call into an event-driven callback chain that is hard to debug and trace. Event systems add latency, hide control flow, and make it nearly impossible to follow the execution path in a debugger.

```python
# ❌ BAD — Observer pattern applied to synchronous operations that have nothing to gain from decoupling

from abc import ABC, abstractmethod


class UserEvent(ABC):
    """Abstract event class — adds indirection over simple data classes."""
    @property
    def timestamp(self) -> float: ...


class UserCreatedEvent(UserEvent):
    def __init__(self, user_id: int, username: str) -> None:
        import time
        self._timestamp = time.time()
        self._user_id = user_id
        self._username = username

    @property
    def timestamp(self) -> float: return self._timestamp
    @property
    def user_id(self) -> int: return self._user_id
    @property
    def username(self) -> str: return self._username


class UserEventObserver(ABC):
    """Abstract observer interface for handling user events."""
    @abstractmethod
    def on_user_created(self, event: UserCreatedEvent) -> None: ...


class SendWelcomeEmailObserver(UserEventObserver):
    def on_user_created(self, event: UserCreatedEvent) -> None:
        # This could just be a method call — the observer pattern adds no decoupling benefit here
        self._send_welcome_email(event.user_id, event.username)

    def _send_welcome_email(self, user_id: int, username: str) -> None:
        pass  # Would send email


class UpdateSearchIndexObserver(UserEventObserver):
    def on_user_created(self, event: UserCreatedEvent) -> None:
        # Updating search index is a side effect that should be explicit, not hidden in an observer
        self._index_user(event.user_id, event.username)

    def _index_user(self, user_id: int, username: str) -> None:
        pass  # Would add to search index


class AnalyticsObserver(UserEventObserver):
    def on_user_created(self, event: UserCreatedEvent) -> None:
        # Tracking analytics as an observer makes it invisible in the registration flow
        self._track_signup(event.username)

    def _track_signup(self, username: str) -> None:
        pass  # Would send analytics event


class EventPublisher:
    """Central event hub that every user operation must know about.
    Every caller needs access to the publisher — tight coupling through a different path."""

    def __init__(self) -> None:
        self._observers: list[UserEventObserver] = []

    def register(self, observer: UserEventObserver) -> None:
        self._observers.append(observer)

    def notify_user_created(self, user_id: int, username: str) -> None:
        event = UserCreatedEvent(user_id, username)
        for observer in self._observers:
            observer.on_user_created(event)  # Order of execution matters but is not documented


class UserService:
    """Service class that must know about the event system to notify observers."""

    def __init__(self, publisher: EventPublisher) -> None:
        self._publisher = publisher

    def register_user(self, username: str, email: str) -> int:
        user_id = self._store_user(username, email)
        self._publisher.notify_user_created(user_id, username)  # Hidden side effects!
        return user_id

    def _store_user(self, username: str, email: str) -> int:
        return 42


# ✅ GOOD — Explicit method calls for operations that are part of the same transaction

class UserService:
    """Service with explicit, visible side effects. No hidden observers or event systems."""

    def __init__(self, user_store: "UserStore", email_sender: "EmailSender") -> None:
        self._user_store = user_store
        self._email_sender = email_sender

    def register_user(self, username: str, email: str) -> int:
        """Register a new user with all side effects made explicit.

        Args:
            username: Desired username.
            email: Contact email address.

        Returns:
            The assigned user ID.

        Side effects (all visible here):
            - Persists user to database
            - Sends welcome email
            - Updates search index
            - Tracks analytics event
        """
        # Primary operation: persist the user
        user_id = self._user_store.create(username, email)

        # Explicit side effects — all in one place, visible at a glance
        try:
            self._email_sender.send_welcome_email(user_id, username)
        except EmailDeliveryError as exc:
            # Non-critical side effect failure — log but don't fail registration
            self._log_warning("Welcome email failed", user_id=user_id, error=exc)

        self._search_indexer.index_user(user_id, username)
        self._analytics.track_signup(username)

        return user_id


class UserServiceWithAsyncSideEffects:
    """For genuinely async side effects that should not block registration,
    use explicit async dispatch — not a synchronous observer pattern."""

    def __init__(
        self,
        user_store: "UserStore",
        event_dispatcher: "EventDispatcher",
    ) -> None:
        self._user_store = user_store
        self._event_dispatcher = event_dispatcher  # Async, not hidden — explicitly passed

    async def register_user(self, username: str, email: str) -> int:
        user_id = await self._user_store.create(username, email)

        # Explicit async dispatch of side effects
        events = [
            UserCreatedEvent(user_id, username),
        ]
        await self._event_dispatcher.publish_all(events)

        return user_id
```

**Why this is worse:** The observer version hides all side effects behind an event system. A developer reading `register_user()` cannot tell that email sending, search indexing, and analytics tracking happen — they have to hunt through the codebase for observers registered with the publisher. Debugging a bug requires tracing through asynchronous callback chains where the order of execution depends on registration order.

**When this occurs:** Teams that adopt event-driven architecture too early, before the decoupling benefits outweigh the debugging costs. The Observer pattern is valuable when publish/subscribe semantics are genuinely needed (e.g., third-party integrations firing at unknown times), but it becomes a liability for synchronous operations within a single bounded context.

---

#### Strategy Proliferation

Creating separate strategy classes for variations that could be handled with simple conditionals or a single parameterized method. The Strategy pattern is useful when algorithms are genuinely complex and independently testable, not every branching choice deserves its own class.

```python
# ❌ BAD — One strategy interface per minor variation

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class ShippingCalculation:
    cost: float
    estimated_days: int
    carrier: str


class ShippingStrategy(ABC):
    """Abstract strategy for computing shipping costs."""

    @abstractmethod
    def calculate(self, weight_kg: float, destination: str) -> ShippingCalculation:
        ...


class GroundShippingStrategy(ShippingStrategy):
    def calculate(self, weight_kg: float, destination: str) -> ShippingCalculation:
        base_rate = 5.0
        per_kg = 0.75
        if destination == "international":
            return ShippingCalculation(
                cost=base_rate + (weight_kg * per_kg * 2.5),
                estimated_days=14,
                carrier="USPS Ground",
            )
        return ShippingCalculation(
            cost=base_rate + (weight_kg * per_kg),
            estimated_days=5,
            carrier="FedEx Ground",
        )


class ExpressShippingStrategy(ShippingStrategy):
    def calculate(self, weight_kg: float, destination: str) -> ShippingCalculation:
        base_rate = 15.0
        per_kg = 1.50
        if destination == "international":
            return ShippingCalculation(
                cost=base_rate + (weight_kg * per_kg * 2.0),
                estimated_days=7,
                carrier="FedEx International",
            )
        return ShippingCalculation(
            cost=base_rate + (weight_kg * per_kg),
            estimated_days=2,
            carrier="FedEx Express",
        )


class OvernightShippingStrategy(ShippingStrategy):
    def calculate(self, weight_kg: float, destination: str) -> ShippingCalculation:
        if destination != "domestic":
            raise ValueError("Overnight shipping not available internationally")
        return ShippingCalculation(
            cost=30.0 + (weight_kg * 2.0),
            estimated_days=1,
            carrier="UPS Overnight",
        )


class ShippingCalculator:
    """Must know about all strategy types and their instantiation."""

    def __init__(self) -> None:
        self._strategies = {
            "ground": GroundShippingStrategy(),
            "express": ExpressShippingStrategy(),
            "overnight": OvernightShippingStrategy(),
        }

    def calculate(
        self, method: str, weight_kg: float, destination: str
    ) -> ShippingCalculation:
        strategy = self._strategies[method]
        return strategy.calculate(weight_kg, destination)


# ✅ GOOD — Single function with parameterized logic when algorithms are related and simple

def calculate_shipping(
    method: str,
    weight_kg: float,
    destination: str,
) -> ShippingCalculation:
    """Calculate shipping cost based on method, weight, and destination.

    Args:
        method: One of 'ground', 'express', or 'overnight'.
        weight_kg: Package weight in kilograms.
        destination: Either 'domestic' or 'international'.

    Returns:
        Shipping calculation with cost, estimated delivery days, and carrier.

    Raises:
        ValueError: If method is invalid or overnight requested for international shipping.
    """
    if method not in ("ground", "express", "overnight"):
        raise ValueError(f"Invalid shipping method: {method}")

    if method == "overnight" and destination != "domestic":
        raise ValueError("Overnight shipping is not available for international orders")

    rates = {
        "ground": {"base": 5.0, "per_kg": 0.75, "intl_multiplier": 2.5, "days": 5, "carrier": "FedEx Ground"},
        "express": {"base": 15.0, "per_kg": 1.50, "intl_multiplier": 2.0, "days": 2, "carrier": "FedEx Express"},
        "overnight": {"base": 30.0, "per_kg": 2.0, "days": 1, "carrier": "UPS Overnight"},
    }

    rate_config = rates[method]
    multiplier = rate_config.get("intl_multiplier", 1.0) if destination == "international" else 1.0
    cost = rate_config["base"] + (weight_kg * rate_config["per_kg"] * multiplier)

    return ShippingCalculation(
        cost=round(cost, 2),
        estimated_days=rate_config["days"],
        carrier=rate_config["carrier"],
    )


# When Strategy pattern IS justified — genuinely complex, independently tested algorithms:

from typing import Protocol


class PricingAlgorithm(Protocol):
    """Strategy is appropriate when each algorithm has complex internal logic,
    independent test suites, and may be swapped at runtime based on user configuration."""

    def compute(self, cart_total: float, customer: "Customer") -> float: ...


class FlatRatePricing:
    def compute(self, cart_total: float, customer: "Customer") -> float:
        return cart_total * 1.08  # Standard 8% tax


class VolumeDiscountPricing:
    """Complex calculation with tiered thresholds — strategy pattern justified here."""

    TIER_THRESHOLDS = [(1000.0, 0.92), (500.0, 0.95), (100.0, 0.98)]

    def compute(self, cart_total: float, customer: "Customer") -> float:
        discount_rate = 1.0
        for threshold, rate in self.TIER_THRESHOLDS:
            if cart_total >= threshold:
                discount_rate = rate
                break
        return cart_total * discount_rate


class DynamicPricingService:
    """Runtime strategy selection is justified when the algorithm depends on user configuration."""

    def __init__(self, pricing_algorithm: PricingAlgorithm) -> None:
        self._algorithm = pricing_algorithm

    def get_total(self, cart_total: float, customer: "Customer") -> float:
        return self._algorithm.compute(cart_total, customer)
```

**Why this is worse:** The BAD version has four classes for shipping calculations that are essentially a lookup table plus some arithmetic. Adding a new shipping method requires creating a new class and registering it with the `ShippingCalculator`. Every strategy class contains conditional logic about destination type — defeating the purpose of separating algorithms.

**When Strategy pattern IS justified:** When each variant has genuinely complex internal logic (e.g., the volume discount calculation with tiered thresholds), when different strategies need independent test suites, or when users can select which algorithm to use at runtime. The key signal is: does each strategy have a rich enough body to warrant its own file?

---

#### Decorator Chaining Fatigue

Stacking so many decorator layers that the final object's behavior is impossible to understand by reading any single class. Each decorator adds one line of wrapping but understanding requires following the entire chain. Debugging becomes an exercise in tracing through multiple classes that each do one small thing.

```python
# ❌ BAD — Deeply nested decorators that make behavior opaque

from abc import ABC, abstractmethod


class Image(ABC):
    @abstractmethod
    def render(self, width: int, height: int) -> str: ...
    @abstractmethod
    def format_name(self) -> str: ...


class RealImage(Image):
    def __init__(self, file_path: str) -> None:
        self._file_path = file_path

    def render(self, width: int, height: int) -> str:
        return f"[Image loaded from {self._file_path}: {width}x{height}]"

    def format_name(self) -> str:
        return self._file_path.split("/")[-1]


class CachedImage(Image):
    """Caching decorator — caches rendered images by resolution."""

    def __init__(self, image: Image) -> None:
        self._image = image
        self._cache: dict[tuple[int, int], str] = {}

    def render(self, width: int, height: int) -> str:
        key = (width, height)
        if key not in self._cache:
            self._cache[key] = self._image.render(width, height)
        return self._cache[key]

    def format_name(self) -> str:
        return self._image.format_name()


class ResizedImage(Image):
    """Resizing decorator — scales the image to specified dimensions."""

    def __init__(self, image: Image, target_width: int, target_height: int) -> None:
        self._image = image
        self._width = target_width
        self._height = target_height

    def render(self, width: int, height: int) -> str:
        return f"[{self._width}x{self._height}] " + self._image.render(self._width, self._height)

    def format_name(self) -> str:
        return f"{self._image.format_name()}@{self._width}x{self._height}"


class WatermarkedImage(Image):
    """Watermark decorator — adds overlay text to the rendered image."""

    def __init__(self, image: Image, watermark_text: str = "CONFIDENTIAL") -> None:
        self._image = image
        self._watermark = watermark_text

    def render(self, width: int, height: int) -> str:
        base = self._image.render(width, height)
        return f"{base} + watermark('{self._watermark}')"

    def format_name(self) -> str:
        return f"{self._image.format_name()}+watermark"


class FormattedImage(Image):
    """Format conversion decorator — converts to specified output format."""

    def __init__(self, image: Image, output_format: str) -> None:
        self._image = image
        self._format = output_format

    def render(self, width: int, height: int) -> str:
        return f"[{self._format.upper()}] " + self._image.render(width, height)

    def format_name(self) -> str:
        return f"{self._image.format_name()}.{self._format}"


# Usage: five layers of wrapping — no single place shows the full transformation chain
original = RealImage("photo.jpg")
cached = CachedImage(original)
resized = ResizedImage(cached, 800, 600)
watermarked = WatermarkedImage(resized)
final = FormattedImage(watermarked, "webp")

# How do I know what the final render() call actually does without reading all 5 classes?
print(final.render(800, 600))


# ✅ GOOD — Explicit composition with a single pipeline function

def render_image(
    file_path: str,
    target_width: int = 800,
    target_height: int = 600,
    cache_key: str | None = None,
    watermark: str | None = None,
    output_format: str = "jpeg",
) -> str:
    """Render an image through a configurable pipeline.

    All transformations are explicit in the function signature and body.
    No hidden layering or chain-of-objects to trace through.

    Args:
        file_path: Path to the source image file.
        target_width: Desired output width in pixels.
        target_height: Desired output height in pixels.
        cache_key: If provided, use cached result for identical parameters.
        watermark: Optional text overlay. None means no watermark.
        output_format: Output format (jpeg, png, webp).

    Returns:
        Rendered image representation as a string.
    """
    # Step 1: Load image
    image_data = _load_image(file_path)

    # Step 2: Resize
    resized_data = _resize(image_data, target_width, target_height)

    # Step 3: Cache (if key provided)
    if cache_key and _has_cache(cache_key):
        return _get_cached(cache_key)

    # Step 4: Apply watermark
    final_data = resized_data
    if watermark:
        final_data = _apply_watermark(final_data, watermark)

    # Step 5: Convert format
    rendered = _convert_format(final_data, output_format)

    # Step 6: Cache result
    if cache_key:
        _set_cache(cache_key, rendered)

    return rendered


# ✅ GOOD — Decorator pattern when it actually adds value (logging/monitoring)

import functools
from typing import Callable, TypeVar


T = TypeVar("T")


def timed_operation(func: Callable[..., T]) -> Callable[..., T]:
    """Decorator that logs execution time — this is where decorators add real value."""

    @functools.wraps(func)
    def wrapper(*args: object, **kwargs: object) -> T:
        import time
        start = time.monotonic()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            elapsed = time.monotonic() - start
            logger = __import__("logging").getLogger(__name__)
            logger.info(f"{func.__name__} completed in {elapsed:.3f}s")

    return wrapper


def cached_operation(cache: dict) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Decorator for caching function results by argument tuple."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @functools.wraps(func)
        def wrapper(*args: object, **kwargs: object) -> T:
            key = (args, tuple(sorted(kwargs.items())))
            if key in cache:
                return cache[key]
            result = func(*args, **kwargs)
            cache[key] = result
            return result

        return wrapper

    return decorator
```

**Why this is worse:** The chained-decorator version makes it impossible to understand what `final.render(800, 600)` does without reading all five wrapper classes. Each class adds one transformation but also adds one more layer of delegation. When the rendered output is wrong, you must trace through every decorator in the chain to find which one produced the unexpected behavior.

**When decorators are appropriate:** For cross-cutting concerns like logging, caching, authentication checks, or metrics collection — where the core domain logic stays clean and the decorator adds orthogonal behavior that applies uniformly across many functions.

---

#### Command Object Overkill

Wrapping simple function calls in Command objects for queuing or undo when there is no actual need for those capabilities. Every synchronous call becomes a method invocation plus an object allocation. The Command pattern is useful for undo/redo systems, job queues, or request logging — but not for every operation.

```python
# ❌ BAD — Command objects for simple operations with no queue or undo support

from abc import ABC, abstractmethod


class Command(ABC):
    """Abstract command interface — every operation must be a class."""

    @abstractmethod
    def execute(self) -> None: ...
    @abstractmethod
    def undo(self) -> None: ...  # No undo system exists!


class CreateUserCommand(Command):
    def __init__(self, user_store: object, username: str, email: str) -> None:
        self._user_store = user_store
        self._username = username
        self._email = email
        self._user_id: int | None = None

    def execute(self) -> None:
        self._user_id = self._user_store.create_user(self._username, self._email)

    def undo(self) -> None:
        # Would need to delete the user — but this code path is never used
        if self._user_id:
            raise NotImplementedError("Undo not implemented")


class UpdateUserEmailCommand(Command):
    def __init__(self, user_store: object, user_id: int, new_email: str) -> None:
        self._user_store = user_store
        self._user_id = user_id
        self._new_email = new_email
        self._old_email: str | None = None

    def execute(self) -> None:
        self._old_email = self._user_store.get_user_email(self._user_id)
        self._user_store.update_email(self._user_id, self._new_email)

    def undo(self) -> None:
        # Undo is dead code — the system never calls it
        if self._old_email:
            raise NotImplementedError("Undo not implemented")


class DeleteUserCommand(Command):
    def __init__(self, user_store: object, user_id: int) -> None:
        self._user_store = user_store
        self._user_id = user_id

    def execute(self) -> None:
        self._user_store.delete_user(self._user_id)

    def undo(self) -> None:
        raise NotImplementedError("Cannot undo user deletion")


class CommandQueue:
    """Queuing system that nobody uses — commands are executed immediately."""

    def __init__(self) -> None:
        self._queue: list[Command] = []  # Always empty

    def enqueue(self, command: Command) -> None:
        self._queue.append(command)

    def process_next(self) -> None:
        if not self._queue:
            return  # Always returns immediately
        cmd = self._queue.pop(0)
        cmd.execute()


class UserController:
    """Controller must know about commands instead of just calling service methods."""

    def __init__(self, user_store: object, command_queue: CommandQueue) -> None:
        self._user_store = user_store
        self._command_queue = command_queue  # Queue is never used for anything

    def create_user(self, username: str, email: str) -> int:
        cmd = CreateUserCommand(self._user_store, username, email)
        cmd.execute()  # Why wrap this in a command? Just call the method directly.
        return 1  # Simplified return

    def update_email(self, user_id: int, new_email: str) -> None:
        cmd = UpdateUserEmailCommand(self._user_store, user_id, new_email)
        cmd.execute()


# ✅ GOOD — Simple functions and class methods when no queue or undo is needed

class UserRepository:
    """Simple data access with clear method signatures."""

    def __init__(self, db: object) -> None:
        self._db = db

    def create_user(self, username: str, email: str) -> int:
        """Create a new user and return the assigned ID.

        Args:
            username: Unique login name.
            email: Contact email address (must be unique).

        Returns:
            The new user's database ID.

        Raises:
            ValueError: If email is already registered.
            DatabaseError: If the database write fails.
        """
        if self.exists_by_email(email):
            raise ValueError(f"Email {email} is already registered")
        return self._db.execute(
            "INSERT INTO users (username, email) VALUES (?, ?) RETURNING id",
            (username, email),
        )

    def update_email(self, user_id: int, new_email: str) -> None:
        """Update a user's email address.

        Args:
            user_id: The user to modify.
            new_email: The new email address.

        Raises:
            ValueError: If the new email is already in use.
        """
        if self.exists_by_email(new_email):
            raise ValueError(f"Email {new_email} is already registered")
        self._db.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, user_id))

    def delete_user(self, user_id: int) -> None:
        """Permanently delete a user. Irreversible operation."""
        self._db.execute("DELETE FROM users WHERE id = ?", (user_id,))


# ✅ GOOD — Command pattern is justified when undo/redo or queuing IS needed

from collections import deque


class UndoableCommand:
    """Base class for commands that support undo operations."""

    def __init__(self) -> None:
        self._executed = False

    def execute(self) -> None:
        self._do_execute()
        self._executed = True

    @abstractmethod
    def _do_execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class EditDocumentCommand(UndoableCommand):
    """Document editing command with real undo support — the Command pattern is justified here."""

    def __init__(self, document: "Document", insertion_point: int, text_to_add: str) -> None:
        super().__init__()
        self._document = document
        self._insertion_point = insertion_point
        self._text_to_add = text_to_add
        self._original_content: str = ""

    def _do_execute(self) -> None:
        doc_text = self._document.get_content()
        self._original_content = doc_text
        new_text = doc_text[:self._insertion_point] + self._text_to_add + doc_text[self._insertion_point:]
        self._document.set_content(new_text)

    def undo(self) -> None:
        if not self._executed:
            return
        self._document.set_content(self._original_content)


class UndoManager:
    """The Command pattern is justified when you need to track and replay operations."""

    def __init__(self, max_history: int = 100) -> None:
        self._history: deque[UndoableCommand] = deque(maxlen=max_history)

    def execute(self, command: UndoableCommand) -> None:
        command.execute()
        self._history.append(command)

    def undo(self) -> None:
        if not self._history:
            return
        command = self._history.pop()
        command.undo()
```

**Why this is worse:** The BAD version creates Command objects for operations where there is no undo system, no queue, and no need to log or retry commands. Each operation wraps a simple method call in an extra class plus a `CommandQueue` that always stays empty. The `undo()` methods are all unimplemented dead code.

**When Command pattern IS justified:** For UI edit operations with undo/redo stacks, job queues where tasks may be deferred to background workers, request logging systems, or macro recording features. The key signal is: do you need to store, replay, or defer the operation?

---

#### Template Method Rigidity

Using Template Method pattern (inheritance-based) instead of Strategy pattern (composition-based) when the variation points are behavioral rather than structural. This creates fragile base class problems, makes testing harder, and prevents combining behaviors independently. Python's duck typing and protocols make inheritance-heavy patterns especially unnatural.

```python
# ❌ BAD — Template Method using deep inheritance hierarchy

from abc import ABC, abstractmethod


class DataProcessorPipeline(ABC):
    """Abstract pipeline with template method enforcing a specific processing order."""

    def process(self, raw_data: dict) -> dict:
        """Template method — defines the fixed sequence of operations.
        Subclasses override individual steps but cannot reorder them."""
        validated = self.validate(raw_data)
        transformed = self.transform(validated)
        enriched = self.enrich(transformed)
        return self.finalize(enriched)

    @abstractmethod
    def validate(self, data: dict) -> dict:
        """Validate and sanitize input data."""
        ...

    @abstractmethod
    def transform(self, data: dict) -> dict:
        """Transform validated data into the internal representation."""
        ...

    @abstractmethod
    def enrich(self, data: dict) -> dict:
        """Enrich data with additional information from external sources."""
        ...

    def finalize(self, data: dict) -> dict:
        """Default finalization — shared by all subclasses."""
        return {"status": "processed", "data": data}


class CsvProcessingPipeline(DataProcessorPipeline):
    """CSV-specific processing pipeline — inherits the template method."""

    def validate(self, data: dict) -> dict:
        if "csv_header" not in data:
            raise ValueError("Missing CSV header")
        return data

    def transform(self, data: dict) -> dict:
        rows = data["csv_rows"]
        headers = data["csv_header"]
        return [dict(zip(headers, row)) for row in rows]

    def enrich(self, data: dict) -> dict:
        # CSV enrichment logic — but now this class is stuck with the pipeline template
        enriched = []
        for row in data:
            row["processed_at"] = "now"
            enriched.append(row)
        return enriched


class JsonProcessingPipeline(DataProcessorPipeline):
    """JSON-specific processing pipeline — must follow CSV's processing order even if JSON needs a different one."""

    def validate(self, data: dict) -> dict:
        if not isinstance(data.get("items"), list):
            raise ValueError("Missing items array")
        return data

    def transform(self, data: dict) -> dict:
        return {"records": data["items"], "count": len(data["items"])}

    def enrich(self, data: dict) -> dict:
        for record in data.get("records", []):
            record["format_version"] = 2
        return data


class ApiProcessingPipeline(DataProcessorPipeline):
    """API-specific pipeline — but it needs to skip enrichment and go straight to validation+transform.
    The template method forces it to call enrich() even though API responses don't need enrichment."""

    def validate(self, data: dict) -> dict:
        if "api_response" not in data:
            raise ValueError("Missing response")
        return data["api_response"]

    def transform(self, data: dict) -> dict:
        return {"endpoint": data.get("endpoint"), "payload": data.get("body")}

    def enrich(self, data: dict) -> dict:
        # This does nothing useful for API data, but must exist because of the base class
        return data


# ✅ GOOD — Composition-based approach using Strategy pattern and explicit pipeline steps

from typing import Protocol
from collections.abc import Callable


class ValidationStep(Protocol):
    """Each step is a simple callable — no inheritance required."""
    def __call__(self, data: dict) -> dict: ...


class TransformationStep(Protocol):
    def __call__(self, data: dict) -> dict: ...


class EnrichmentStep(Protocol):
    def __call__(self, data: dict) -> dict: ...


def build_csv_pipeline() -> list[Callable[[dict], dict]]:
    """Build a CSV processing pipeline by composing individual steps."""

    def validate(data: dict) -> dict:
        if "csv_header" not in data:
            raise ValueError("Missing CSV header")
        return data

    def transform(data: dict) -> dict:
        rows = data["csv_rows"]
        headers = data["csv_header"]
        return [dict(zip(headers, row)) for row in rows]

    def enrich(data: list[dict]) -> list[dict]:
        enriched = []
        for row in data:
            row["processed_at"] = "now"
            enriched.append(row)
        return enriched

    return [validate, transform, enrich]


def build_json_pipeline() -> list[Callable[[dict], dict]]:
    """Build a JSON processing pipeline — no enrichment step needed."""

    def validate(data: dict) -> dict:
        if not isinstance(data.get("items"), list):
            raise ValueError("Missing items array")
        return data

    def transform(data: dict) -> dict:
        return {"records": data["items"], "count": len(data["items"])}

    # No enrichment step for JSON — the pipeline is shorter and more focused

    return [validate, transform]


def build_api_pipeline() -> list[Callable[[dict], dict]]:
    """API pipeline skips enrichment entirely — composition lets us choose what to include."""

    def validate(data: dict) -> dict:
        if "api_response" not in data:
            raise ValueError("Missing response")
        return data["api_response"]

    def transform(data: dict) -> dict:
        return {"endpoint": data.get("endpoint"), "payload": data.get("body")}

    return [validate, transform]


class PipelineRunner:
    """Generic pipeline executor — composes any sequence of functions."""

    def __init__(self, steps: list[Callable[[dict], dict]]) -> None:
        self._steps = steps

    def run(self, data: dict) -> dict:
        """Execute all pipeline steps in order."""
        result = data
        for step in self._steps:
            result = step(result)
        return {"status": "processed", "data": result}


# Usage: explicit and composable
csv_pipeline = PipelineRunner(build_csv_pipeline())
json_result = PipelineRunner(build_json_pipeline()).run({"items": [{"id": 1}]})
```

**Why this is worse:** The Template Method version creates a rigid inheritance hierarchy where every subclass must implement `validate`, `transform`, AND `enrich` — even if enrichment doesn't apply. Adding a new processing step requires modifying the abstract base class, breaking all subclasses (LSP violation). API pipelines are forced through an unnecessary enrichment step. Testing requires instantiating concrete pipeline classes that may have complex dependencies in their parent class.

**When Template Method IS appropriate:** When all subclasses genuinely need the same sequence of steps with only minor variations in individual steps, and the base class provides substantial shared implementation. This is rare in Python where protocols and composition provide the same flexibility without inheritance rigidity.

---

## Remediation Strategies

### Strategy 1: Collapse Unnecessary Hierarchies

When a class hierarchy has more than two levels of inheritance or multiple interfaces with single implementations, collapse it into a simpler structure using direct calls, dataclasses, or callable objects.

**How to do it:**
1. List all classes in the hierarchy and their responsibilities
2. For each interface, count how many concrete implementations exist
3. If only one implementation exists, replace the interface with the implementation directly
4. If two levels of inheritance exist and the base class has no meaningful shared behavior, remove the abstraction

```python
# BEFORE: Three-level hierarchy with single implementation at each level

class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...
    @abstractmethod
    def perimeter(self) -> float: ...

class TwoDimensionalShape(Shape):  # No additional behavior — just a marker
    pass

class Circle(TwoDimensionalShape):  # Only concrete implementation
    def __init__(self, radius: float) -> None:
        self._radius = radius

    def area(self) -> float:
        import math
        return math.pi * self._radius ** 2

    def perimeter(self) -> float:
        import math
        return 2 * math.pi * self._radius


# AFTER: Collapse to direct implementation with Protocol if interface is needed elsewhere

from typing import Protocol


class AreaCalculator(Protocol):
    """Keep the Protocol only if other classes need it for type annotations."""
    def area(self) -> float: ...


class Circle:  # No inheritance hierarchy
    def __init__(self, radius: float) -> None:
        self._radius = max(radius, 0)

    @property
    def radius(self) -> float:
        return self._radius

    def area(self) -> float:
        import math
        return math.pi * self._radius ** 2

    def perimeter(self) -> float:
        import math
        return 2 * math.pi * self._radius

    # Protocol compliance is satisfied by duck typing — no inheritance needed
```

### Strategy 2: Inline Over-Factored Methods

When a method's body fits comfortably in the caller and the "factored-out" function exists only to make the class look more organized, inline it. The cost of understanding two functions outweighs the benefit for methods under ~10 lines that do one obvious thing.

```python
# BEFORE: Method split into tiny helper functions with no reuse benefit

class OrderProcessor:
    def process_order(self, order: dict) -> dict:
        validated = self._validate_order(order)
        priced = self._calculate_price(validated)
        taxed = self._apply_tax(priced)
        return {"result": "success", "total": taxed}

    def _validate_order(self, order: dict) -> dict:
        """Validate order — called only once from process_order."""
        if not order.get("items"):
            raise ValueError("Order must contain items")
        if not order.get("customer_id"):
            raise ValueError("Customer ID is required")
        return order

    def _calculate_price(self, order: dict) -> float:
        """Calculate total price — called only once from process_order."""
        total = sum(item["quantity"] * item["price"] for item in order["items"])
        return total

    def _apply_tax(self, subtotal: float) -> float:
        """Apply tax rate — called only once from process_order."""
        return subtotal * 1.08


# AFTER: Single clear method with inline validation logic

class OrderProcessor:
    def process_order(self, order: dict) -> dict:
        """Process an order: validate, calculate price, apply tax.

        Args:
            order: Dictionary containing 'items' and 'customer_id'.

        Returns:
            Result dictionary with order status and total amount.

        Raises:
            ValueError: If the order is missing required fields or contains invalid items.
        """
        # Validate
        if not order.get("items"):
            raise ValueError("Order must contain at least one item")
        if not order.get("customer_id"):
            raise ValueError("Customer ID is required")

        for item in order["items"]:
            if "quantity" not in item or "price" not in item:
                raise ValueError(f"Item missing quantity or price: {item}")
            if item["quantity"] < 1 or item["price"] < 0:
                raise ValueError(f"Invalid item values: {item}")

        # Calculate price and apply tax
        subtotal = sum(item["quantity"] * item["price"] for item in order["items"])
        total = round(subtotal * 1.08, 2)

        return {"result": "success", "total": total, "subtotal": subtotal}
```

### Strategy 3: Replace Phantom Abstractions

Identify interfaces and abstract classes that exist solely because "the pattern requires an abstraction," then replace them with direct usage of the concrete class. An abstraction is only justified when it has multiple implementations OR when it decouples modules with genuinely independent lifecycles.

```python
# BEFORE: Abstract interface with a single implementation — no decoupling benefit

from abc import ABC, abstractmethod


class PaymentGateway(ABC):
    """Payment gateway abstraction — but we only ever use Stripe."""

    @abstractmethod
    def charge(self, amount: float, currency: str, customer_id: str) -> dict:
        """Process a payment charge.

        Returns dict with 'transaction_id', 'status', 'amount'.
        """
        ...


class StripePaymentGateway(PaymentGateway):
    """Only implementation — the abstraction provides zero flexibility."""

    def __init__(self, api_key: str) -> None:
        self._api_key = api_key  # Would configure Stripe client here

    def charge(self, amount: float, currency: str, customer_id: str) -> dict:
        # Actual Stripe API call would go here
        return {
            "transaction_id": f"txn_{customer_id}_{amount}",
            "status": "succeeded",
            "amount": amount,
        }


class PaymentService:
    """Depends on abstraction even though only one implementation exists."""

    def __init__(self, gateway: PaymentGateway) -> None:
        self._gateway = gateway

    def process_payment(self, amount: float, customer_id: str) -> dict:
        return self._gateway.charge(amount, "USD", customer_id)


# AFTER: Depend on the concrete implementation directly — simpler and equally correct

class PaymentService:
    """Directly uses Stripe. If we ever add PayPal, we create a separate service."""

    def __init__(self, api_key: str) -> None:
        # Would initialize Stripe client: stripe.api_key = api_key
        self._api_key = api_key

    def process_payment(self, amount: float, customer_id: str) -> dict:
        """Process a payment via Stripe.

        Args:
            amount: Charge amount in the currency's smallest unit (cents for USD).
            customer_id: Stripe customer ID or new customer identifier.

        Returns:
            Payment result with transaction details.

        Raises:
            stripe.StripeError: If the charge fails on Stripe's side.
        """
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")

        # Actual implementation would call:
        #   stripe.Charge.create(amount=amount, currency="usd", customer=customer_id)
        return {
            "transaction_id": f"txn_{customer_id}_{amount}",
            "status": "succeeded",
            "amount": amount,
        }


# When adding a second payment provider is genuinely planned:

from typing import Protocol


class PaymentProcessor(Protocol):
    """Protocol for when we genuinely have multiple implementations to choose from."""
    def process_payment(self, amount: float, customer_id: str) -> dict: ...


class StripePaymentProcessor:
    def process_payment(self, amount: float, customer_id: str) -> dict:
        return {"transaction_id": f"stripe_{customer_id}", "provider": "stripe"}


class PayPalPaymentProcessor:
    def process_payment(self, amount: float, customer_id: str) -> dict:
        return {"transaction_id": f"paypal_{customer_id}", "provider": "paypal"}
```

---

## Constraints

### MUST DO

- Always prefer a plain function or dataclass over a design pattern when the problem is simple — ask "does this need an interface?" and answer honestly
- Use `typing.Protocol` for structural typing in Python instead of ABC-based abstract base classes unless you need abstract method enforcement
- Verify that every interface has at least one concrete consumer before declaring it — trace imports to prove it
- Limit class hierarchies to a maximum of two levels (interface → implementation); deeper hierarchies almost always indicate over-abstraction
- When composing multiple behaviors, prefer explicit function calls or a pipeline list over decorator chaining beyond three layers
- Write the remediation so that a developer can read one file and understand the full behavior — if understanding requires tracing through five classes, refactor
- Use `__init__` parameters for dependency injection at the composition root; do not inject every utility class through constructor parameters
- Run existing tests after any remediation to confirm behavioral equivalence — if tests break because of the simplification, the abstraction was providing value

### MUST NOT DO

- Create an interface before there are two implementations that genuinely share behavior
- Wrap a single function call in a Command object unless you need undo/redo, queuing, or deferred execution
- Use Singleton for utility classes, configuration loaders, or any stateless object — use module-level functions instead
- Apply the Observer pattern to synchronous operations within a single bounded context where direct calls are visible and debuggable
- Inherit from an abstract base class just to "follow the pattern" when composition would achieve the same result with less rigidity
- Create factory classes for dataclasses or objects whose construction logic fits in a single `__init__` method without branching
- Use Template Method (inheritance) when Strategy (composition) would let you combine and reorder steps independently
- Add another layer of abstraction to "make it extensible" unless there is an actual requirement driving that extension right now
- Design pattern names should never appear in commit messages, code comments, or documentation as justification for their existence — the pattern exists because the problem demands it, not because a book says so

---

## Output Template

When auditing code with this skill active, produce:

1. **Anti-Pattern Detected** — Name the specific anti-pattern from the catalog and point to the exact file path, class name, and line range where it appears
2. **Severity Assessment** — Classify as Low (cosmetic, no testing impact), Medium (slows development, adds debugging overhead), or High (makes code impossible to test or modify) with a one-sentence justification referencing which constraint is violated
3. **Remediation Plan** — Provide the concrete before/after code for the identified anti-pattern. Show the collapsed class, inlined method, or simplified function that replaces the over-engineered version. Include any import changes needed.
4. **Impact Analysis** — State explicitly what behavior stays identical (no functional change), what simplifies (fewer classes, fewer imports), and what testing implications exist (can now mock directly, no longer need fixture setup for injected dependencies)

---

## Related Skills

| Skill | Purpose |
|---|---|
| `gof-design-patterns-catalog` | Complete reference for all 23 GoF patterns to ensure correct application when patterns are genuinely needed |
| `design-pattern-selection` | Helps select the right pattern and avoid over-engineering from the start of a feature |
| `code-review` | General code review process that includes anti-pattern detection as one component |
| `abstraction-design-patterns` | Techniques for designing clean abstractions without over-engineering when real extensibility is needed |

---

## Live References

> Authoritative documentation links for this skill's domain. The model follows markdown links at load time to resolve external references and inline content.

- [Refactoring.Guru — Code Smells](https://refactoring.guru/refactoring/smells) — Visual guide to common code smells, their symptoms, and step-by-step refactoring techniques
- [YAGNI (You Aren't Gonna Need It)](https://martinfowler.com/bliki/Yagni.html) — Martin Fowler on avoiding premature abstraction and the cost of hypothetical extensibility
- [Complexity Creep](https://www.oreilly.com/library/view/extreme-programming-expedited/0201616416/ch03lev1sec19.html) — Kent Beck's guidance on keeping code simple and rejecting unnecessary complexity
- [Composition Over Inheritance](https://en.wikipedia.org/wiki/Composition_over_inheritance) — Why composition provides more flexible, testable alternatives to inheritance-based patterns
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID) — The five object-oriented design principles that underpin all pattern misuse analysis
- [Design Patterns: Elements of Reusable Object-Oriented Software](https://learning.oreilly.com/library/view/design-patterns/9780131126758/) — The original GoF catalog (1994) — read before applying patterns, not after
- [Python typing.Protocol documentation](https://docs.python.org/3/library/typing.html#typing.Protocol) — PEP 544 structural subtyping for Python's approach to interfaces without inheritance
