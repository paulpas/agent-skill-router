---
name: decorator-pattern
description: Implements the GoF Decorator pattern for dynamic behavior extension via composition over inheritance in Python using abstract decorators, transparent delegation with __getattr__, and composable wrapper chains.
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
license: MIT
compatibility: opencode
metadata:
  version: "1.0.0"
  domain: coding
  triggers: decorator pattern, object decoration, composition over inheritance, how do i add behavior dynamically, proxy decorator, wrapper pattern, behavioral extension
  role: implementation
  scope: implementation
  output-format: code
  content-types: [code, guidance, do-dont, examples]
  related-skills: adapter-pattern, strategy-pattern, structural-design-patterns, dependency-inversion-principle
---

# Decorator Pattern

Senior Python engineer implementing the GoF Decorator pattern for adding behaviors to objects at runtime via composition rather than inheritance. This skill makes the model distinguish between the OO Decorator pattern (wrapping objects transparently) and Python's native function decorators (`@decorator`), building composable wrapper chains for logging, caching, authentication, and rate limiting.

## TL;DR Checklist

- [ ] Define a Component interface (ABC or Protocol) that both base class and decorators implement
- [ ] Create an abstract Decorator base class that holds a reference to the wrapped component
- [ ] Each concrete decorator adds one specific behavior before/after delegating to the wrapped object
- [ ] Use `__getattr__` for transparent delegation so callers see all methods of the wrapped object
- [ ] Limit decorator chains to 2-4 levels deep; deeper chains indicate SRP violations

---

## When to Use

Use this skill when:

- You need to add behaviors (logging, caching, auth) to individual objects at runtime without affecting others
- Multiple independent cross-cutting concerns need to be composed in different combinations across object instances
- Inheritance would create an explosion of subclasses for every behavior combination (e.g., 5 behaviors × N concrete classes = many subclasses)
- You want to add or remove responsibilities from objects dynamically during their lifetime
- Building middleware-like wrappers around service interfaces without modifying the original implementation

---

## When NOT to Use

Avoid this skill for:

- Simple cross-cutting concerns that apply globally — use Python function decorators or context managers instead
- Adding many small behaviors that would create deeply nested decorator chains (use composition of concerns differently)
- When you need to change an object's class at runtime — use the State pattern instead
- Performance-critical paths where each wrapper level adds measurable overhead (benchmark before applying)

---

## Core Workflow

1. **Define the Component Interface** — Create an ABC or Protocol that declares all operations the component supports. Both the concrete implementation and the decorator base class must implement this interface. **Checkpoint:** The interface must be comprehensive enough that any decorator can delegate all calls through it without missing methods.

2. **Create the Abstract Decorator Base** — Build an abstract class that holds a reference to a Component and delegates all method calls to it. This base handles transparent delegation so concrete decorators only override the methods they want to augment. **Checkpoint:** Use `__getattr__` for delegation to ensure any new method added to the interface automatically passes through.

3. **Implement Concrete Decorators** — Each decorator adds exactly one behavior (logging, caching, authentication, etc.). Override only the methods that need augmentation and call `super().method()` to delegate to the wrapped component. **Checkpoint:** Each decorator must remain independently testable by wrapping a mock component.

4. **Compose Decorator Chains** — Build objects by nesting decorators from inside out: `Logging(Caching(Authenticated(BaseService())))`. The innermost is the real service; each outer layer adds behavior. **Checkpoint:** Keep chains to 2-4 levels deep; deeper chains suggest mixing too many concerns into a single object.

5. **Apply Composition Over Inheritance Principle** — Every time you would create a new subclass for a behavior, prefer a decorator instead. This satisfies the Open/Closed Principle (open for extension, closed for modification). **Checkpoint:** If your class hierarchy grows deeper than 3 levels, convert base behaviors to decorators.

---

## Implementation Patterns

### Pattern 1: ABC-Based Decorator with Transparent Delegation (Core Structure)

This is the canonical OO Decorator pattern using Python's `__getattr__` for transparent delegation, so callers interact with the decorator exactly as if it were the wrapped component.

```python
from abc import ABC, abstractmethod
import time
import functools
from typing import Any


# Component interface — both base class and decorators implement this
class NotificationChannel(ABC):
    """Interface for any notification delivery channel."""

    @abstractmethod
    def send(self, to: str, message: str) -> dict:
        """Send a notification message.

        Args:
            to: Recipient identifier (email, phone, user ID).
            message: The message content to deliver.

        Returns:
            Dict with delivery status and tracking ID.
        """
        ...

    @abstractmethod
    def validate_recipient(self, to: str) -> bool:
        """Check if the recipient is valid for this channel."""
        ...


# Concrete Component
class EmailChannel(NotificationChannel):
    """Real email notification delivery implementation."""

    def __init__(self, smtp_host: str = "localhost", smtp_port: int = 587) -> None:
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port

    def send(self, to: str, message: str) -> dict:
        """Send email via SMTP simulation.

        Args:
            to: Recipient email address.
            message: Email body content.

        Returns:
            Delivery confirmation with tracking ID.
        """
        return {
            "status": "sent",
            "tracking_id": f"email_{hash((to, message))}",
            "channel": "email",
        }

    def validate_recipient(self, to: str) -> bool:
        return "@" in to and "." in to


# Abstract Decorator Base — handles transparent delegation via __getattr__
class NotificationChannelDecorator(NotificationChannel):
    """Abstract decorator that wraps any NotificationChannel.

    Transparent delegation via __getattr__ means callers can call
    any method on the component without knowing it's wrapped.
    Only override send() to add behavior; other methods pass through automatically.
    """

    def __init__(self, wrapped: NotificationChannel) -> None:
        self._wrapped = wrapped

    def __getattr__(self, name: str) -> Any:
        """Transparent delegation — all unhandled attributes pass to wrapped object."""
        return getattr(self._wrapped, name)

    def send(self, to: str, message: str) -> dict:
        raise NotImplementedError("Concrete decorators must override send()")

    def validate_recipient(self, to: str) -> bool:
        """Delegate validation to the wrapped channel."""
        return self._wrapped.validate_recipient(to)


# Concrete Decorators — each adds one concern
class LoggingDecorator(NotificationChannelDecorator):
    """Logs every notification send attempt with timestamp and recipient."""

    def __init__(self, wrapped: NotificationChannel, logger_name: str = "notifications") -> None:
        super().__init__(wrapped)
        self._logger_name = logger_name

    def send(self, to: str, message: str) -> dict:
        """Send with logging augmentation."""
        import logging
        logger = logging.getLogger(self._logger_name)
        logger.info("Sending %s notification to %s", type(self._wrapped).__name__, to)

        result = self._wrapped.send(to, message)

        logger.info(
            "Notification sent via %s: status=%s tracking_id=%s",
            type(self._wrapped).__name__,
            result["status"],
            result.get("tracking_id"),
        )
        return result


class CachingDecorator(NotificationChannelDecorator):
    """Caches send results to prevent duplicate notifications.

    Prevents the same (recipient, message) pair from being sent twice
    within a configurable time window.
    """

    def __init__(
        self,
        wrapped: NotificationChannel,
        ttl_seconds: float = 60.0,
    ) -> None:
        super().__init__(wrapped)
        self._cache: dict[tuple[str, str], dict] = {}
        self._timestamps: dict[tuple[str, str], float] = {}
        self._ttl = ttl_seconds

    def send(self, to: str, message: str) -> dict:
        """Send with deduplication via caching."""
        cache_key = (to, message)
        now = time.time()

        if cache_key in self._cache:
            last_time = self._timestamps.get(cache_key, 0)
            if now - last_time < self._ttl:
                return self._cache[cache_key]  # Return cached result

        result = self._wrapped.send(to, message)
        self._cache[cache_key] = result
        self._timestamps[cache_key] = now
        return result


class AuthenticationDecorator(NotificationChannelDecorator):
    """Requires authentication check before allowing notifications."""

    def __init__(
        self,
        wrapped: NotificationChannel,
        auth_service: Any,  # In production: proper AuthClient type
    ) -> None:
        super().__init__(wrapped)
        self._auth = auth_service

    def send(self, to: str, message: str) -> dict:
        """Send with authentication gating."""
        if not self._auth.is_authenticated():  # type: ignore[union-attr]
            raise PermissionError("Authentication required to send notifications")

        return self._wrapped.send(to, message)


# Usage — compose decorators inside out:
# base = EmailChannel(smtp_host="smtp.example.com")
# channel = LoggingDecorator(
#     CachingDecorator(
#         AuthenticationDecorator(base, auth_service=AuthService())
#     )
# )
# result = channel.send("user@example.com", "Hello!")
```

### Pattern 2: Decorator vs Inheritance — The Combinatorial Explosion (BAD vs. GOOD)

The BAD approach uses inheritance for every behavior combination, creating N × M subclasses. The GOOD approach uses decorators to compose behaviors at runtime with O(1) class count.

```python
# ❌ BAD — Inheritance combinatorial explosion: 3 channels × 2 behaviors = 6 classes
class BaseChannel(ABC):
    @abstractmethod
    def send(self, to: str, message: str) -> dict: ...


class LoggingEmailChannel(BaseChannel):
    """Adds logging on top of email only."""

    def __init__(self, smtp_host: str = "localhost") -> None:
        self.smtp_host = smtp_host

    def send(self, to: str, message: str) -> dict:
        import logging
        logging.getLogger("notifications").info(f"LoggingEmail sending to {to}")
        return {"status": "sent", "channel": "email", "tracking_id": f"log_{hash(to)}"}


class CachedEmailChannel(BaseChannel):
    """Adds caching on top of email only."""

    def __init__(self, smtp_host: str = "localhost") -> None:
        self.smtp_host = smtp_host

    def send(self, to: str, message: str) -> dict:
        return {"status": "sent", "channel": "email", "tracking_id": f"cached_{hash(to)}"}


class LoggedCachedEmailChannel(BaseChannel):
    """Adds BOTH logging and caching on email — one class per combination."""

    def send(self, to: str, message: str) -> dict:
        import logging
        logging.getLogger("notifications").info(f"LoggedCachedEmail sending to {to}")
        return {"status": "sent", "channel": "email", "tracking_id": f"log_cached_{hash(to)}"}


# Now add SMS channel + auth → 3 more classes minimum.
# Growth is exponential, not linear: N channels × B behaviors = potentially N × 2^B classes.


# ✅ GOOD — Decorator approach: 1 interface + 1 decorator base + N concrete decorators = O(N) classes
# No matter how many behaviors you add or remove, the class count stays flat.
# Compose at runtime with any combination:

from typing import Any


class SMSChannel(BaseChannel):
    """SMS notification via Twilio-like API."""

    def __init__(self, api_key: str, from_number: str) -> None:
        self.api_key = api_key
        self.from_number = from_number

    def send(self, to: str, message: str) -> dict:
        return {"status": "sent", "channel": "sms", "tracking_id": f"sms_{hash(to)}"}

    def validate_recipient(self, to: str) -> bool:
        return to.startswith("+") and len(to) >= 10


# Same LoggingDecorator and CachingDecorator from Pattern 1 work on SMS too!
# sms = LoggingDecorator(CachingDecorator(SMSChannel("sk_...", "+1234")))
# result = sms.send("+98765", "SMS message")

# The decorator approach adds zero new classes when combining with a new channel.
# This is the core OCP benefit: open for extension (new decorators), closed for modification (existing code untouched).
```

### Pattern 3: Decorator with Context Manager for Resource Management

Decorators that acquire resources (file handles, DB connections) should support deterministic cleanup via context manager protocol.

```python
from contextlib import contextmanager
from typing import Iterator


class TimedDecorator(NotificationChannelDecorator):
    """Measures and logs the duration of each send operation."""

    def __init__(self, wrapped: NotificationChannel) -> None:
        super().__init__(wrapped)
        self._last_duration_ms: float = 0.0

    @property
    def last_duration_ms(self) -> float:
        """The duration of the most recent send() call in milliseconds."""
        return self._last_duration_ms

    def send(self, to: str, message: str) -> dict:
        """Send with timing measurement."""
        start = time.perf_counter()
        result = self._wrapped.send(to, message)
        elapsed_ms = (time.perf_counter() - start) * 1000
        self._last_duration_ms = round(elapsed_ms, 3)
        import logging
        logging.getLogger("notifications").debug(
            "TimedDecorator: send to %s took %.3fms", to, self._last_duration_ms
        )
        return result


class FileBackedChannel(NotificationChannel):
    """Writes notification payloads to a file for offline processing."""

    def __init__(self, filepath: str) -> None:
        self.filepath = filepath
        self._file = open(filepath, "a", encoding="utf-8")  # noqa: SIM115

    def send(self, to: str, message: str) -> dict:
        """Write notification payload to file."""
        self._file.write(f"{to}\t{message}\n")
        self._file.flush()
        return {"status": "queued", "channel": "file", "filepath": self.filepath}

    def validate_recipient(self, to: str) -> bool:
        return len(to) > 0

    def close(self) -> None:
        """Close the underlying file handle."""
        if not self._file.closed:
            self._file.close()


# Context manager decorator for resource cleanup
@contextmanager
def with_resource_cleanup(component: NotificationChannel) -> Iterator[NotificationChannel]:
    """Context manager that ensures decorated components are cleaned up.

    Wraps a component and guarantees its close() method is called
    when exiting the context, even if an exception occurs.

    Args:
        component: A NotificationChannel possibly holding resources.

    Yields:
        The component for use within the context.
    """
    try:
        yield component
    finally:
        if hasattr(component, "close") and callable(component.close):  # type: ignore[union-attr]
            component.close()  # type: ignore[union-attr]


# Usage — ensures cleanup of file-backed channels:
# with with_resource_cleanup(FileBackedChannel("/tmp/notifications.log")) as channel:
#     timed = TimedDecorator(channel)
#     timed.send("user@example.com", "File notification")
# # File is automatically flushed and closed here
```

---

## Constraints

### MUST DO
- Use `__getattr__` in the decorator base class for transparent delegation to wrapped components
- Apply the Open/Closed Principle: new behaviors are added as new decorator classes, never by modifying existing ones
- Keep each concrete decorator focused on exactly ONE concern (SRP)
- Compose decorators from inside out: `Outer(Middle(Inner(base)))` — innermost is the real component
- Use frozen dataclasses or immutable types for any state passed between decorator layers

### MUST NOT DO
- Nest decorator chains deeper than 4 levels — this indicates mixing too many concerns into one object
- Override methods you do not need to augment — let `__getattr__` handle transparent delegation
- Store mutable shared state in decorator instances (decorators should be stateless or thread-local)
- Use decorators to replace inheritance when behavior is truly static and never changes at runtime
- Forget to type-hint the wrapped component parameter using the Component ABC/Protocol

---

## Related Skills

| Skill | Purpose |
|-------|---------|
| `adapter-pattern` | Use Adapter when you need to make incompatible interfaces work together; use Decorator when you want to add behavior without changing the interface |
| `strategy-pattern` | Use Strategy when you need to swap entire algorithms at runtime; use Decorator when you want to layer multiple independent behaviors on top of a single object |
| `structural-design-patterns` | Broader catalog of GoF structural patterns (Adapter, Bridge, Composite, Facade, Proxy, Flyweight) for understanding where Decorator fits among composition patterns |
| `dependency-inversion-principle` | Decorator depends on the Component abstraction — DIP ensures decorators work with any implementation that satisfies the interface contract |

---

## Live References

> Authoritative documentation links for Python composition and structural design patterns.

- [Python __getattr__ docs](https://docs.python.org/3/reference/datamodel.html#object.__getattr__) — Transparent attribute delegation
- [GoF Decorator Pattern (Refactoring.Guru)](https://refactoring.guru/design-patterns/decorator) — Visual UML and Java examples
- [SOLID Open/Closed Principle](https://en.wikipedia.org/wiki/Open%E2%80%93closed_principle) — The core OO principle decorators fulfill
- [Python typing Protocol](https://docs.python.org/3/library/typing.html#typing.Protocol) — Structural subtyping for decorator contracts
- [Composition Over Inheritance (Martin Fowler)](https://martinfowler.com/bliki/CompositionOverInheritance.html) — Why composition beats inheritance
