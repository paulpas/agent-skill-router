---
name: interface-segregation-principle
description: Detects fat interfaces that force implementors to provide unused methods
  and refactors them into narrow, client-specific contracts using Python Protocols
  and targeted ABCs.
license: MIT
compatibility: opencode
metadata:
version: "1.0.0"
  domain: coding
  triggers: interface segregation principle, ISP, fat interface, thin interface, client
    specific, Protocol, ABC, unused methods, stub implementation, NotImplementedError,
    duck typing
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
  related-skills: single-responsibility, open-closed-principle, liskov-substitution-principle,
    dependency-inversion-principle
---
# Interface Segregation Principle (ISP)

Identifies fat interfaces that force clients to depend on methods they do not use and refactors them into narrow, client-specific contracts. Applies Python Protocols for structural duck typing, targeted ABCs for nominal typing, and composition patterns to eliminate stub implementations, `NotImplementedError` stubs, and LSP-violating fallback methods.

## TL;DR Checklist

- [ ] Inventory every method on each interface and list which client classes actually call it
- [ ] Group clients by their real usage pattern — no client should implement a method it never invokes
- [ ] Split fat interfaces into one narrow contract per distinct client need (e.g., `StorageReader`, `StorageWriter`)
- [ ] Verify every method on a split interface is called by at least one implementation and used by at least one caller
- [ ] Replace the fat interface reference in each caller with the specific narrow interface(s) they need
- [ ] Remove all stub methods that raise `NotImplementedError` or return `None` as a no-op

---

## When to Use

Use this skill when:

- A class implements an interface but raises `NotImplementedError` or returns `None` for several of its required methods
- An ABC has 5+ abstract methods and most subclasses override only 2–3 of them
- Adding a new implementation requires writing boilerplate stub methods just to satisfy the interface signature
- Reviewing existing code where callers depend on broad interfaces (e.g., `IService`) when they only call one method on them
- Designing a plugin system where plugins have very different capabilities but are forced through a single heavy contract

---

## When NOT to Use

Avoid this skill for:

- **Tiny interfaces with 1–2 methods** — splitting a two-method interface creates more confusion than it solves. Keep small contracts intact.
- **Methods that belong together conceptually** — if all methods on an interface are always used together by every caller, the interface is already segregated. Do not split for the sake of having thin interfaces.
- **Performance-critical inner loops** — introducing many narrow interfaces adds indirection overhead; measure with benchmarks before refactoring hot paths.
- **When a "super interface" is genuinely needed as a type union** — e.g., `Readable & Writable` stored in a single variable is valid ISP usage (composition of interfaces, not segregation failure).

---

## Core Workflow

1. **Inventory all methods on each fat interface** — List every abstract or Protocol method and trace which client classes implement each one. Build a usage matrix: rows are clients, columns are methods, mark with ✓ if the caller invokes it, ✗ if it is stubbed or ignored. **Checkpoint:** Every column with more than one ✗ represents a segmentation opportunity.

2. **Group clients by actual usage pattern** — Analyze which subsets of methods each client truly calls. Clients that call the same subset belong to the same segment (e.g., "readers" call only `read()`, "writers" call only `write()` and `flush()`). **Checkpoint:** If two clients share zero method invocations, they absolutely must be on separate interfaces.

3. **Split into focused interfaces** — Create one narrow interface per distinct client segment. Name each after the behavior it represents (a role, not an entity): `StorageReader` instead of `Storage`, `EmailSender` instead of `NotificationService`. Each interface should have at most 2–4 methods that are always used together. **Checkpoint:** The union of all split interfaces' method sets must equal the original fat interface's method set — no behavior is lost.

4. **Verify no client is forced to implement unused methods** — Walk each split interface: every method on it must be called by at least one implementation AND used by at least one caller upstream. If a method on a new interface has zero callers, merge it back into its parent or remove it. **Checkpoint:** A valid split produces interfaces where `len(methods_per_interface) >= 2` and `≤ 5`, except for trivially single-method interfaces which are acceptable.

5. **Update all callers** — Replace the fat interface reference in each caller with the specific narrow interface(s) they need. Where a caller needs multiple capabilities, use Protocol composition (`Reader & Writer`) rather than inheriting from a fat base class. **Checkpoint:** After refactoring, running `python -m mypy <module>` should show zero errors, and `pytest` should pass — proving behavioral equivalence.

---

## Implementation Patterns

### Pattern 1: Fat Notification Service → Split into Transport-Specific Protocols

A monolithic `NotificationService` interface forces every notifier to implement email, SMS, and push — even when they only support one channel. The fix splits the contract by transport capability.

```python
# ❌ BAD — One fat interface; EmailOnlyNotifier must stub SMS and Push
from abc import ABC, abstractmethod


class NotificationService(ABC):
    """Every implementor must provide all three channels."""

    @abstractmethod
    def send_email(self, to: str, subject: str, body: str) -> bool: ...

    @abstractmethod
    def send_sms(self, phone: str, message: str) -> bool: ...

    @abstractmethod
    def send_push(self, device_token: str, title: str, body: str) -> bool: ...


class EmailOnlyNotifier(NotificationService):
    """LSP-violating stubs for methods this class cannot support."""

    def send_email(self, to: str, subject: str, body: str) -> bool:
        """Actually sends email via SMTP."""
        # smtp = smtplib.SMTP("smtp.example.com")
        # smtp.send_message(...)
        return True

    def send_sms(self, phone: str, message: str) -> bool:
        raise NotImplementedError(
            "EmailOnlyNotifier does not support SMS"  # LSP violation!
        )

    def send_push(self, device_token: str, title: str, body: str) -> bool:
        raise NotImplementedError(
            "EmailOnlyNotifier does not support push notifications"  # LSP violation!
        )


# ✅ GOOD — Narrow Protocols; each client implements only what it needs
from dataclasses import dataclass
from typing import Protocol


@dataclass
class EmailEnvelope:
    to: str
    subject: str
    body: str


@dataclass
class SMSMessage:
    phone: str
    text: str


@dataclass
class PushNotification:
    device_token: str
    title: str
    body: str


# Narrow protocol for email-only clients
class EmailSender(Protocol):
    """Only methods needed by callers who send emails."""

    def send_email(self, envelope: EmailEnvelope) -> bool: ...


# Narrow protocol for SMS-only clients
class SMSSender(Protocol):
    """Only methods needed by callers who send SMS."""

    def send_sms(self, message: SMSMessage) -> bool: ...


# Narrow protocol for push-only clients
class PushNotifier(Protocol):
    """Only methods needed by callers who send push notifications."""

    def send_push(self, notification: PushNotification) -> bool: ...


# Each implementation now is clean — no stubs required
class SMTPEmailSender:
    """Concrete email sender — implements only EmailSender."""

    def __init__(self, host: str = "smtp.example.com") -> None:
        self.host = host

    def send_email(self, envelope: EmailEnvelope) -> bool:
        # smtp = smtplib.SMTP(self.host)
        # ... actual SMTP logic
        return True


class TwilioSMSSender:
    """Concrete SMS sender — implements only SMSSender."""

    def __init__(self, account_sid: str, auth_token: str) -> None:
        self.account_sid = account_sid
        self.auth_token = auth_token

    def send_sms(self, message: SMSMessage) -> bool:
        # client = TwilioRestClient(self.account_sid, self.auth_token)
        # client.messages.create(to=message.phone, from_="+1234567890", body=message.text)
        return True


# High-level service composes narrow transports instead of depending on a fat interface
class NotificationDispatcher:
    """Dispatches notifications by composing narrow protocol-based transports."""

    def __init__(
        self,
        email_sender: EmailSender | None = None,
        sms_sender: SMSSender | None = None,
        push_notifier: PushNotifier | None = None,
    ) -> None:
        self.email_sender = email_sender
        self.sms_sender = sms_sender
        self.push_notifier = push_notifier

    def dispatch_email(self, envelope: EmailEnvelope) -> bool:
        if self.email_sender is None:
            raise RuntimeError("No email transport configured")
        return self.email_sender.send_email(envelope)

    def dispatch_sms(self, message: SMSMessage) -> bool:
        if self.sms_sender is None:
            raise RuntimeError("No SMS transport configured")
        return self.sms_sender.send_sms(message)

    def dispatch_push(self, notification: PushNotification) -> bool:
        if self.push_notifier is None:
            raise RuntimeError("No push transport configured")
        return self.push_notifier.send_push(notification)
```

---

### Pattern 2: Database Access with Unused CRUD → Split into ReadRepository / WriteRepository

A generic `Repository` interface with all CRUD methods forces read-only clients to implement `save()`, `update()`, and `delete()` — or stub them. The fix splits by access direction.

```python
# ❌ BAD — Generic repository forces read-only clients to implement write methods
from abc import ABC, abstractmethod
from typing import Any


class Repository(ABC):
    """Every repository must support full CRUD — even if a client only reads."""

    @abstractmethod
    def find_by_id(self, entity_id: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def find_all(self, limit: int = 100) -> list[dict[str, Any]]: ...

    @abstractmethod
    def save(self, entity: dict[str, Any]) -> int: ...

    @abstractmethod
    def update(self, entity_id: int, changes: dict[str, Any]) -> bool: ...

    @abstractmethod
    def delete(self, entity_id: int) -> bool: ...


class UserAnalyticsRepository(Repository):
    """Read-only analytics — must stub write methods because Repository is too fat."""

    def __init__(self, connection: Any) -> None:
        self.conn = connection

    def find_by_id(self, entity_id: int) -> dict[str, Any] | None:
        cursor = self.conn.execute("SELECT * FROM users WHERE id = ?", (entity_id,))
        return cursor.fetchone()

    def find_all(self, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]

    def save(self, entity: dict[str, Any]) -> int:
        raise NotImplementedError("Analytics repository is read-only")  # Stub!

    def update(self, entity_id: int, changes: dict[str, Any]) -> bool:
        raise NotImplementedError("Analytics repository is read-only")  # Stub!

    def delete(self, entity_id: int) -> bool:
        raise NotImplementedError("Analytics repository is read-only")  # Stub!


# ✅ GOOD — Split by access pattern; each interface serves one direction
from typing import Generic, TypeVar

EntityT = TypeVar("EntityT", bound=dict[str, Any])


class ReadRepository(Generic[EntityT]):
    """Contract for clients that only read from the data store."""

    @abstractmethod
    def find_by_id(self, entity_id: int) -> EntityT | None: ...

    @abstractmethod
    def find_all(self, limit: int = 100) -> list[EntityT]: ...


class WriteRepository(Generic[EntityT]):
    """Contract for clients that only write to the data store."""

    @abstractmethod
    def save(self, entity: EntityT) -> int: ...

    @abstractmethod
    def update(self, entity_id: int, changes: dict[str, Any]) -> bool: ...

    @abstractmethod
    def delete(self, entity_id: int) -> bool: ...


class ReadOnlyRepository(ReadRepository[dict[str, Any]]):
    """Pure read repository — no write methods to stub."""

    def __init__(self, connection: Any) -> None:
        self.conn = connection

    def find_by_id(self, entity_id: int) -> dict[str, Any] | None:
        cursor = self.conn.execute(
            "SELECT id, name, email FROM users WHERE id = ?", (entity_id,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def find_all(self, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self.conn.execute(
            "SELECT id, name, email FROM users ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]


# A client that needs both directions composes them — does not inherit a fat interface
class UserManagementService:
    """Composes ReadRepository + WriteRepository; each injected independently."""

    def __init__(
        self,
        read_repo: ReadRepository[dict[str, Any]],
        write_repo: WriteRepository[dict[str, Any]],
    ) -> None:
        self.read_repo = read_repo
        self.write_repo = write_repo

    def create_user(self, name: str, email: str) -> int:
        user = {"name": name, "email": email}
        return self.write_repo.save(user)

    def get_user(self, user_id: int) -> dict[str, Any] | None:
        return self.read_repo.find_by_id(user_id)

    def deactivate_user(self, user_id: int) -> bool:
        return self.write_repo.update(user_id, {"active": False})

    def remove_user(self, user_id: int) -> bool:
        return self.write_repo.delete(user_id)
```

---

### Pattern 3: Plugin Architecture — Targeted Protocols per Capability

In a plugin system where every plugin implements the same heavy interface but only needs a subset, use targeted Protocols so each plugin declares exactly what it provides.

```python
# ❌ BAD — Heavy PluginBase forces every plugin to implement all lifecycle hooks
from abc import ABC, abstractmethod
from typing import Any


class PluginBase(ABC):
    """All plugins must implement every hook — even if they only react to one event."""

    @abstractmethod
    def on_load(self) -> None: ...

    @abstractmethod
    def on_unload(self) -> None: ...

    @abstractmethod
    def configure(self, config: dict[str, Any]) -> bool: ...

    @abstractmethod
    def handle_request(self, request: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def validate_config(self, config: dict[str, Any]) -> list[str]: ...

    @abstractmethod
    def health_check(self) -> dict[str, Any]: ...


class LoggingPlugin(PluginBase):
    """Logging plugin only needs configure() + handle_request() — stubs the rest."""

    def __init__(self) -> None:
        self.log_file = "app.log"

    def on_load(self) -> None:
        pass  # Stub — no-op

    def on_unload(self) -> None:
        pass  # Stub — no-op

    def configure(self, config: dict[str, Any]) -> bool:
        self.log_file = config.get("log_file", "app.log")
        return True

    def handle_request(self, request: dict[str, Any]) -> dict[str, Any]:
        # ... log the request
        return {"status": "logged"}

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        return []  # Stub — always valid

    def health_check(self) -> dict[str, Any]:
        return {"status": "ok", "log_file": self.log_file}


# ✅ GOOD — Targeted Protocols; each plugin implements only its capability
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


# Protocol for plugins that process requests
class RequestHandler(Protocol):
    """Plugins that handle incoming requests."""

    def handle_request(self, request: dict[str, Any]) -> dict[str, Any]: ...


# Protocol for plugins that provide health status
class HealthProvider(Protocol):
    """Plugins that expose health check endpoints."""

    def health_check(self) -> dict[str, Any]: ...


# Protocol for configurable plugins
class ConfigurablePlugin(Protocol):
    """Plugins that accept configuration."""

    def configure(self, config: dict[str, Any]) -> bool: ...

    def validate_config(self, config: dict[str, Any]) -> list[str]: ...


# Each plugin now only implements what it actually does
@dataclass
class LoggingPlugin:
    """A data class that satisfies RequestHandler + ConfigurableProtocol."""

    log_file: str = "app.log"

    def configure(self, config: dict[str, Any]) -> bool:
        self.log_file = config.get("log_file", "app.log")
        return True

    def validate_config(self, config: dict[str, Any]) -> list[str]:
        errors: list[str] = []
        if not self.log_file.endswith(".log"):
            errors.append(f"Log file must end with .log, got: {self.log_file}")
        return errors

    def handle_request(self, request: dict[str, Any]) -> dict[str, Any]:
        logger.info("Processing request: %s", request.get("action"))
        return {"status": "logged", "request_id": id(request)}


@dataclass
class MetricsPlugin:
    """A data class that satisfies HealthProvider + RequestHandler."""

    endpoint: str = "/metrics"
    metrics: dict[str, float] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        self.metrics: dict[str, float] = {}

    def handle_request(self, request: dict[str, Any]) -> dict[str, Any]:
        action = request.get("action", "unknown")
        self.metrics[action] = self.metrics.get(action, 0) + 1
        return {"status": "recorded", "metric": self.metrics}

    def health_check(self) -> dict[str, Any]:
        return {
            "status": "ok",
            "endpoint": self.endpoint,
            "tracked_actions": list(self.metrics.keys()),
        }


# Plugin registry composes capabilities without a fat base class
class PluginRegistry:
    """Manages plugins by capability protocols — not a single heavy interface."""

    def __init__(self) -> None:
        self._handlers: list[RequestHandler] = []
        self._health_providers: list[HealthProvider] = []
        self._configurables: list[ConfigurablePlugin] = []

    def register(self, plugin: object) -> None:
        """Register a plugin by inspecting which Protocols it satisfies."""
        if isinstance(plugin, RequestHandler):
            self._handlers.append(plugin)  # type: ignore[arg-type]
        if isinstance(plugin, HealthProvider):
            self._health_providers.append(plugin)  # type: ignore[arg-type]
        if isinstance(plugin, ConfigurablePlugin):
            self._configurables.append(plugin)  # type: ignore[arg-type]

    def handle_request(self, request: dict[str, Any]) -> list[dict[str, Any]]:
        """Dispatch to all registered request handlers."""
        return [h.handle_request(request) for h in self._handlers]

    def get_health_status(self) -> list[dict[str, Any]]:
        """Aggregate health from all health provider plugins."""
        return [p.health_check() for p in self._health_providers]

    def configure_all(self, config: dict[str, Any]) -> list[list[str]]:
        """Configure all configurable plugins; return validation errors per plugin."""
        return [p.validate_config(config) for p in self._configurables]
```

---

### Pattern 4: Legacy ABC with 10 Methods → Replace with Specific Protocols

A legacy data pipeline ABC has 10 abstract methods covering ingestion, transformation, validation, output, and monitoring. Different pipeline stages only need 2–3 of them.

```python
# ❌ BAD — Legacy ABC with 10 abstract methods; each stage implements only 2-3
from abc import ABC, abstractmethod
from typing import Any


class DataPipeline(ABC):
    """Every stage must implement all 10 lifecycle methods."""

    @abstractmethod
    def validate_input(self, data: dict[str, Any]) -> bool: ...

    @abstractmethod
    def transform(self, raw_data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def enrich(self, data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def validate_output(self, data: dict[str, Any]) -> bool: ...

    @abstractmethod
    def persist(self, data: dict[str, Any]) -> str: ...

    @abstractmethod
    def notify_success(self, job_id: str) -> None: ...

    @abstractmethod
    def notify_failure(self, job_id: str, error: Exception) -> None: ...

    @abstractmethod
    def get_metrics(self) -> dict[str, float]: ...

    @abstractmethod
    def health_check(self) -> bool: ...

    @abstractmethod
    def shutdown(self) -> None: ...


class CSVIngestionStage(DataPipeline):
    """CSV ingestion only needs validate_input + transform — stubs the other 8."""

    def __init__(self, source_path: str) -> None:
        self.source_path = source_path

    # ── Methods it actually uses ──

    def validate_input(self, data: dict[str, Any]) -> bool:
        """Validate that the CSV file exists and has expected columns."""
        import os
        if not os.path.exists(self.source_path):
            return False
        return True

    def transform(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        """Parse CSV rows into structured records."""
        # csv parsing logic here
        return {"parsed_rows": len(raw_data.get("rows", []))}

    # ── Stub methods (8 stubs!): These are all boilerplate noise ──

    def enrich(self, data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]:
        return data  # Stub — no enrichment needed

    def validate_output(self, data: dict[str, Any]) -> bool:
        return True  # Stub — always passes

    def persist(self, data: dict[str, Any]) -> str:
        raise NotImplementedError("Ingestion stage does not persist")  # Stub!

    def notify_success(self, job_id: str) -> None:
        pass  # Stub

    def notify_failure(self, job_id: str, error: Exception) -> None:
        pass  # Stub

    def get_metrics(self) -> dict[str, float]:
        return {}  # Stub

    def health_check(self) -> bool:
        return True  # Stub

    def shutdown(self) -> None:
        pass  # Stub


# ✅ GOOD — Split into focused Protocols; each stage implements only what it needs
from dataclasses import dataclass, field
from typing import Protocol


class InputValidator(Protocol):
    """Stages that validate incoming data."""

    def validate_input(self, data: dict[str, Any]) -> bool: ...


class DataTransformer(Protocol):
    """Stages that transform raw data into a structured format."""

    def transform(self, raw_data: dict[str, Any]) -> dict[str, Any]: ...


class EnrichmentStage(Protocol):
    """Stages that enrich data with external context."""

    def enrich(self, data: dict[str, Any], context: dict[str, Any]) -> dict[str, Any]: ...


class DataPersister(Protocol):
    """Stages that persist processed data to a store."""

    def validate_output(self, data: dict[str, Any]) -> bool: ...

    def persist(self, data: dict[str, Any]) -> str: ...


class ObservablePipeline(Protocol):
    """Stages that emit metrics and notifications for monitoring."""

    def notify_success(self, job_id: str) -> None: ...

    def notify_failure(self, job_id: str, error: Exception) -> None: ...

    def get_metrics(self) -> dict[str, float]: ...


class ShutdownCapable(Protocol):
    """Stages that need graceful shutdown."""

    def health_check(self) -> bool: ...

    def shutdown(self) -> None: ...


@dataclass
class CSVIngestionStage:
    """Clean stage: implements only InputValidator + DataTransformer. Zero stubs."""

    source_path: str

    def validate_input(self, data: dict[str, Any]) -> bool:
        import os

        if not os.path.exists(self.source_path):
            return False
        return True

    def transform(self, raw_data: dict[str, Any]) -> dict[str, Any]:
        # CSV parsing logic
        return {"parsed_rows": len(raw_data.get("rows", []))}


@dataclass
class DatabasePersistenceStage:
    """Clean stage: implements only DataPersister + ObservablePipeline."""

    connection_string: str = ""
    _metrics: dict[str, float] = field(default_factory=dict)

    def validate_output(self, data: dict[str, Any]) -> bool:
        return "data" in data and isinstance(data["data"], list)

    def persist(self, data: dict[str, Any]) -> str:
        # Database insert logic
        record_id = id(data)
        self._metrics["records_persisted"] = self._metrics.get("records_persisted", 0) + 1
        return str(record_id)

    def notify_success(self, job_id: str) -> None:
        logger.info("Persistence stage completed for job %s", job_id)

    def notify_failure(self, job_id: str, error: Exception) -> None:
        logger.error("Persistence stage failed for job %s: %s", job_id, error)

    def get_metrics(self) -> dict[str, float]:
        return dict(self._metrics)

    def health_check(self) -> bool:
        return bool(self.connection_string)

    def shutdown(self) -> None:
        # Cleanup connections
        pass


# Pipeline orchestrator composes capabilities through Protocols — not a fat ABC
class PipelineOrchestrator:
    """Runs a data pipeline by composing protocol-based stages."""

    def __init__(self, stages: list[object]) -> None:
        self.stages = stages

    def run(self, raw_data: dict[str, Any], job_id: str) -> dict[str, Any]:
        """Execute the pipeline: validate → transform → persist + notify."""
        result: dict[str, Any] = {"status": "unknown", "job_id": job_id}

        # Phase 1: Validate
        for stage in self.stages:
            if isinstance(stage, InputValidator):
                if not stage.validate_input(raw_data):
                    # Find an observable to notify failure
                    for s in self.stages:
                        if isinstance(s, ObservablePipeline):
                            s.notify_failure(job_id, ValueError("Validation failed"))
                    result["status"] = "validation_failed"
                    return result

        # Phase 2: Transform (chain them)
        transformed = raw_data
        for stage in self.stages:
            if isinstance(stage, DataTransformer):
                transformed = stage.transform(transformed)

        # Phase 3: Persist + Notify
        for stage in self.stages:
            if isinstance(stage, DataPersister):
                if stage.validate_output(transformed):
                    record_id = stage.persist(transformed)
                    result["status"] = "persisted"
                    result["record_id"] = record_id
                for s in self.stages:
                    if isinstance(s, ObservablePipeline):
                        s.notify_success(job_id)

        return result
```

---

### Pattern 5: Protocol Composition — When a Client Truly Needs Multiple Capabilities

ISP does not forbid clients from depending on multiple interfaces. The key is that each interface is narrow and focused. Use intersection types (`A & B`) for true multi-capability callers.

```python
# ✅ GOOD — A client that needs both read and write composes via intersection types
from typing import Protocol


class Reader(Protocol):
    """Narrow protocol for reading data."""

    def read(self, key: str) -> bytes | None: ...

    def exists(self, key: str) -> bool: ...


class Writer(Protocol):
    """Narrow protocol for writing data."""

    def write(self, key: str, value: bytes) -> int: ...

    def delete(self, key: str) -> bool: ...


class CacheManager:
    """A client that needs BOTH read and write — uses Protocol composition."""

    def __init__(self, store: Reader & Writer) -> None:  # type: ignore[misc]
        self.store = store

    def get_or_fetch(self, key: str, fetch_func: Callable[[], bytes]) -> bytes:
        """Read from cache; if miss, fetch and write back."""
        data = self.store.read(key)
        if data is not None:
            return data
        data = fetch_func()
        self.store.write(key, data)
        return data


class ReadOnlyCache:
    """Read-only client — depends only on Reader. Zero write methods to implement."""

    def __init__(self, store: Reader) -> None:
        self.store = store

    def lookup(self, key: str) -> bytes | None:
        return self.store.read(key)


class WriteOnlyLogger:
    """Write-only client — depends only on Writer. Zero read methods to implement."""

    def __init__(self, store: Writer) -> None:
        self.store = store

    def log_event(self, event_id: str, payload: bytes) -> None:
        self.store.write(f"events/{event_id}", payload)
```

---

## Constraints

### MUST DO

- Every method on an interface must be called by at least one implementation AND used by at least one client — if a method has zero callers anywhere, it does not belong on any interface
- Prefer Python `Protocol` (structural typing) over ABCs when you need duck-typed behavior — Protocols naturally encourage narrow contracts since they are defined by what they *accept*, not what they *require*
- Name interfaces after the **behavior** or **role** they represent, never after the entity that implements them: use `StorageEngine` (a role) not `UserDatabase` (an entity with an implied owner)
- Keep each interface to 2–5 methods; if splitting produces a 1-method interface, that is acceptable and often ideal
- When a caller needs multiple capabilities, compose narrow interfaces using Protocol intersections or separate constructor parameters — never pull them back into a fat base class
- Use `isinstance(obj, SomeProtocol)` with `typing.Protocol` for runtime type checking when registering plugins or building registries

### MUST NOT DO

- Create "super interfaces" with 5+ methods just to group related functionality together — this is the definition of a fat interface and exactly what ISP forbids
- Implement unused methods as stubs returning `None`, raising `NotImplementedError`, or doing no-op `pass` — these are code smells that signal a split is needed
- Force a new implementation to depend on the entire fat interface when it only needs one method — this creates fragile dependencies where unrelated changes to one method can break all implementors
- Split methods within a single logical operation — if `begin_transaction()`, `commit()`, and `rollback()` always appear together, they belong as a group, not split apart
- Use abstract base classes when Protocols would serve the same purpose — ABCs enforce nominal inheritance which encourages implementing stubs; Protocols enable duck typing which makes partial compliance natural

---

## Output Template

When applying this skill to analyze or refactor code, produce:

1. **Fat Interface Audit** — List each interface found, its method count, and which methods are stubbed by implementations
2. **Usage Matrix** — A table showing clients (rows) vs. methods (columns) with ✓/✗ marks indicating actual usage
3. **Proposed Split** — The narrow interfaces to create, named by behavior/role, with method assignments
4. **Refactored Code** — Full Python code for the split interfaces and updated implementations using `Protocol` or targeted ABCs
5. **Caller Updates** — Updated caller code showing how each now depends on the specific narrow interface(s) it needs

---

## Related Skills

| Skill | Purpose |
|---|---|
| `single-responsibility` | Ensures each class has one reason to change — ISP is its interface-level counterpart |
| `open-closed-principle` | Extending behavior via new implementations; ISP makes those extensions narrow and focused |
| `liskov-substitution-principle` | LSP violations (stub methods, NotImplementedError) are often a symptom of ISP failure |
| `dependency-inversion-principle` | DIP depends on abstractions — ISP ensures those abstractions are narrow, not fat |
| `design-patterns-and-principles` | Broader catalog of patterns where ISP is one tool among many for interface design |

## Live References

> Authoritative documentation links for this domain. The model follows markdown links at load time to resolve external references and inline content.

- [SOLID Principles (Robert C. Martin)](https://web.archive.org/web/20231204195346/https://www.openmymind.net/The-L-Of-SOLID/) — Uncle Bob's original SOLID principles with the ISP chapter
- [Interface Segregation Pattern (Refactoring.Guru)](https://refactoring.guru/design-patterns/interface-segregation) — Refactoring Guru's practical guide to applying the Interface Segregation Principle
- [Go Interface Design Patterns](https://go.dev/tour/methods/3) — Effective Go documentation on idiomatic Go interface design and composition
- [Python ABC (Abstract Base Classes)](https://docs.python.org/3/library/abc.html) — Python's abc module for defining narrow, segregated interfaces programmatically
- [Duck Typing vs Explicit Interfaces (Martin Fowler)](https://martinfowler.com/bliki/DuckTyping.html) — Fowler's comparison of duck typing and explicit interface design approaches
